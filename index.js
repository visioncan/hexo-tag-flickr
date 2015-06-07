'use strict';

var https = require('https');
var Promise = require('bluebird');
var tagUtil = require('./flickrTagUtil');
var APIKey = hexo.config.flickr_api_key || false;

/**
 * Filckr tag
 *
 * Syntax:
 * {% flickr [class1,class2,classN] photo_id [size] %}
 */
var tagRegister = function (args, content) {
  if (!APIKey) {
    throw new Error('flickr_api_key configuration is required');
  }

  var tag = tagUtil.convertAttr(args);

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
        var result = JSON.parse(data);
        if (result.stat === 'ok') {
          resolve(tagUtil.imgFormat(tag, result));
        } else {
          hexo.log.err('Flickr Tag: Error: ' + tag.id + ' ' +  result.message);
        }
      });
    }).on('error', function (e) {
      hexo.log.err('Fetch Flickr API error: ' + e);
      return reject(e);
    });
  });
};

hexo.extend.tag.register('flickr', tagRegister, {async: true});
