var FlickrTag  = require('./flickrTag'),
    APIKey     = hexo.config.flickr_api_key || false,
    flickrTags = [];


hexo.extend.filter.register('pre', function (data, callback) {
    if(!flickrTags.length) {
        return callback(null, data);
    }

    var flickr = new FlickrTag(),
        tags   = flickrTags;

    flickrTags = [];
    flickr.getPhotos(tags, data, function (data) {
        return callback(null, data);
    });
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
        flickrTags.push(args);
        return '<flickr_' + flickrTags.length - 1 + '>';
    } else {
        return '';
    }
});

