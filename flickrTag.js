var https       = require('https'),
    util        = require('util'),
    htmlTag     = hexo.util.html_tag,
    APIKey      = hexo.config.flickr_api_key || false,
    APIURL      = 'https://api.flickr.com/services/rest/?',
    URL_PATTERN = 'http://farm%s.staticflickr.com/%s/%s_%s%s.%s',
    PHOTO_SIZE = {
        's': { width: 75, height: 75 },
        'q': { width: 150, height: 150 },
        't': { width: 100 },
        'm': { width: 240 },
        'n': { width: 320 },
        '-': { width: 500 },
        'z': { width: 640 },
        'c': { width: 800 },
        'b': { width: 1024 },
        'o': {}
    },
    rPhotoId = /(\d+){5,}/,
    rPhotoSize = /^[sqtmnzcbo\-]$/,
    rLinkBool = /^[01]|true|false$/;


var FlickrTag = function () {
    this.flickrTags = [];
    this.completedCounter = 0;
};

module.exports = FlickrTag;

FlickrTag.prototype.getPhotos = function (tags, data, allComplete) {
    var i    = 0,
        self = this;

    while (i < tags.length) {
        this.flickrTags[i] = this.convertAttr(tags[i]);

        this.httpGet(i, function (idx, jsondata) {
            data.content = data.content.replace( '<hexoescape>' + idx + '</hexoescape>',
                self.imgFormat(idx, jsondata)
            );

            if (self.completedCounter === self.flickrTags.length) {
                allComplete(data);
            }
        });

        i++;
    }
};


/**
 * Flickr api http request
 * @param  {number} index      The index of flickr tag want to request
 * @param  {Function} callback Run callback when fetch end
 */
FlickrTag.prototype.httpGet = function (index, callback) {
    var self = this;
    var photoId = this.flickrTags[index].id;
    var url = APIURL +
        "&method=flickr.photos.getInfo" +
        "&api_key=" + APIKey +
        "&photo_id=" + photoId +
        "&format=json" +
        "&nojsoncallback=1";

    https.get(url, function(res) {
        var data = '';

        res.on('data', function(chunk) {
            data += chunk;
        });

        res.on('end', function() {
            self.completedCounter ++;
            callback(index, JSON.parse(data));
        });
    }).on('error', function(e) {
        throw new Error('fetch flickr API error: ' + e);
    });
};


/**
 * format flickr image url and generate html tag
 * @param  {number} index    The index of flickr tag
 * @param  {object} jsonData Result from flickr api
 * @return {string} Html tag for output
 */
FlickrTag.prototype.imgFormat = function (index, jsonData) {
    var secret,
        format,
        size,
        photoSize,
        flickrTags   = this.flickrTags,
        imgAttr = {};

    switch (flickrTags[index].size) {
        case 'o':
            secret = jsonData.photo.originalsecret;
            format = jsonData.photo.originalformat;
            size = '_' + flickrTags[index].size;
            break;
        case '-':
            secret = jsonData.photo.secret;
            format = 'jpg';
            size = '';
            break;
        default:
            secret = jsonData.photo.secret;
            format = 'jpg';
            size = '_' + flickrTags[index].size;
    }

    imgAttr.src = util.format(URL_PATTERN,
        jsonData.photo.farm,
        jsonData.photo.server,
        jsonData.photo.id,
        secret,
        size,
        format
    );

    photoSize = PHOTO_SIZE[flickrTags[index].size];
    for (var key in photoSize) {
        imgAttr[key] = photoSize[key];
    }

    imgAttr.class = flickrTags[index].classes.join(' ');
    imgAttr.alt = this.htmlEscape(jsonData.photo.title._content);

    return htmlTag('img', imgAttr);
};


/**
 * covert tag args to object with default value
 * @param {array} args Tag args.
 * @return {object} Tag attrs object.
 */
FlickrTag.prototype.convertAttr = function (args) {
    var attrs = {
        classes: [],
        id: '',
        size: '-',
        isWithLink: false
    };

    for (var i = 0; i < args.length; i++) {
        var item = args[i];

        if (rPhotoId.test(item)) {
            attrs.id = item;
            break;
        } else {
            attrs.classes.push(item);
        }
    }

    args = args.slice(i + 1);

    if (args.length){
        if (rPhotoSize.test(args[0])) {
            attrs.size = args.shift();
        }

        // TODO: with link
        /*
        if (rLinkBool.test(args[0])) {
            attrs.isWithLink = args[0] === 'true' || args[0] === '1';
        }*/
    }
    return attrs;
};

/**
 * Replace string to HTML encode if img tag's alt attribute sting with &,",',<,>
 * @param  {string} str string form img tag's alt 
 * @return {string}     HTML encode string
 */
FlickrTag.prototype.htmlEscape = function (str) {
    return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
};
