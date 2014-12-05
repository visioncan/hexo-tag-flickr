var FlickrTag  = require('./flickrTag'),
    APIKey     = hexo.config.flickr_api_key || false;

hexo.extend.filter.register('before_post_render', function (data, callback) {
  if (!data.photos) return callback();

  var flickr_photos = [],
      flickrPhotos = function() {
      flickr_photos = data.photos.filter(function(photo) {
          return photo.split(' ')[0] == 'flickr';
      });

      if (flickr_photos.length === 0) return callback(null, data);

      flickr_photos.forEach(function(photo, ndx) {
          FlickrTag.postCounter.push(0);
          FlickrTag.add(photo.split(' ').slice(1));

          var postIndex = FlickrTag.postCounter.length - 1,
              idx = FlickrTag.length() - 1;

          FlickrTag.httpGet(idx, postIndex, function(_idx, jsonData) {
              data.photos[ndx] = FlickrTag.srcFormat(_idx, jsonData);
              flickrPhotos();
          });
      });
  };

  flickrPhotos();
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
