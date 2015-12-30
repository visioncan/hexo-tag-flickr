'use strict';

var https = require('https');
var Promise = require('bluebird');
var hexoUtil = require('hexo-util');
var tagUtil = require('./flickrTagUtil');
var APIKey = hexo.config.flickr_api_key || false;


/**
 * promise Flickr API request
 * @param  {Array} tagArgs Tag args ex: ['15905712665', 'z']
 * @resolve {Object} image attrs
 */
var promiseRequest = function (tagArgs) {
  if (!APIKey) {
    throw new Error('flickr_api_key configuration is required');
  }

  var tag = tagUtil.convertAttr(tagArgs);

  return new Promise(function (resolve, reject) {
    var url = 'https://api.flickr.com/services/rest/?method=flickr.photos.getInfo' +
      '&api_key=' + APIKey +
      '&photo_id=' + tag.id +
      '&format=json' +
      '&nojsoncallback=1';

    https.get(url, function (res) {
      var data = '';

      res.on('data', function (chunk) {
        data += chunk;
      });

      res.on('end', function () {
        var json = JSON.parse(data);
        if (json.stat === 'ok') {
          resolve(tagUtil.imgFormat(tag, json));
        } else {
          return reject('Flickr Tag Error: ' + tag.id + ' ' +  json.message);
        }
      });

    }).on('error', function (e) {
      return reject('Fetch Flickr API error: ' + e);
    });
  });

};


/**
 * Filckr tag
 *
 * Syntax:
 * ```
 * {% flickr [class1,class2,classN] photo_id [size] %}
 * ```
 */
hexo.extend.tag.register('flickr', function (args, content) {

  return promiseRequest(args).then(function (imgAttr) {
    return hexoUtil.htmlTag('img', imgAttr);
  }, function (err) {
    hexo.log.err(err);
  });

}, {async: true});


/**
 * For gallery post
 *
 * Syntax:
 * ```
 * photos:
 * - flickr photo_id [size]
 * - flickr photo_id [size]
 * ```
 */
hexo.extend.filter.register('pre', function(data) {
  if (!data.photos) return data;

  return Promise.map(data.photos, function(photo) {
    var photoTag = photo.split(' ');
    if (photoTag[0] !== 'flickr') {
      return photo;
    }

    var tagArgs = photoTag.slice(1);

    return promiseRequest(tagArgs).then(function (imgAttr) {
      if (imgAttr.alt) return imgAttr.src + ' "' + imgAttr.alt + '"';
      return imgAttr.src;
    }, function (err) {
      hexo.log.err(err);
    });
  }).then(function (results) {
    data.photos = results;
    return data;
  });

});



