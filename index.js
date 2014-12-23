var FlickrTag  = require('./flickrTag'),
    async      = require('async'),
    APIKey     = hexo.config.flickr_api_key || false;

hexo.extend.filter.register('before_post_render', function (data, callback) {
  if (!data.photos) return callback(null, data);

  var postIndex = -1,
      idx = - 1,
      flickrHttpGet = function(photo, mapCallback) {
          if (photo.split(' ')[0] != 'flickr') {
              mapCallback(null, photo);
          }

          FlickrTag.postCounter.push(0);
          FlickrTag.add(photo.split(' ').slice(1));

          postIndex = FlickrTag.postCounter.length - 1;
          idx = FlickrTag.length() - 1;

          FlickrTag.httpGet(idx, postIndex, function(_idx, jsonData) {
              mapCallback(null, FlickrTag.srcFormat(_idx, jsonData));
          });
      }

    async.map(data.photos, flickrHttpGet, function(err, results) {
        data.photos = results;
        callback(null, data);
    });
});

hexo.extend.filter.register('after_post_render', function (data, callback) {
    if (FlickrTag.hasFlickrTag(data)) {
        FlickrTag.replacePhotos(data, function (data) {
            return callback(null, data);
        });
    } else {
        return callback(null, data);
    }
});

/**
 * Filckr tag
 *
 * Syntax:
 * {% flickr [class1,class2,classN] photo_id [size] %}
 */
hexo.extend.tag.register('flickr', function (args, content) {
    if (!APIKey) {
        throw new Error('flickr_api_key configuration is required');
    }

    if (args[0] !== '') {
        FlickrTag.add(args);
        return '<img data-tag="hexoflickrescape' + (FlickrTag.length() - 1) + '">';
    } else {
        return '';
    }
});
