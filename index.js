var FlickrTag  = require('./flickrTag'),
    APIKey     = hexo.config.flickr_api_key || false;

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