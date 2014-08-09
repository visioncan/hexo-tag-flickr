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
    escapeTagName = 'hexoflickrescape',
    rPhotoId = /\d{5,}/,
    rTagInContent = /hexoflickrescape(\d+)/g,
    rPhotoSize = /^[sqtmnzcbo\-]$/,
    rLinkBool = /^[01]|true|false$/;

var FlickrTag = function () {
    this.flickrStorage = {};
    this.flickrTags = [];
    this.postCounter = [];
};

FlickrTag.instance = null;
FlickrTag.getInstance = function () {
    if (this.instance === null) {
        this.instance = new FlickrTag();
    }
    return this.instance;
};

module.exports = FlickrTag.getInstance();

FlickrTag.prototype.add = function (tag) {
    this.flickrTags.push(this.convertAttr(tag));
};

FlickrTag.prototype.length = function () {
    return this.flickrTags.length;
};

/**
 * Replace flickr tag in post content
 * Use `postCounter` to store every post and its flickr tag fetch counts as value
 *
 * @param  {Object}   data
 * @param  {Function} callback
 */
FlickrTag.prototype.replacePhotos = function (data, callback) {
    this.postCounter.push(0);
    var i         = 0,
        _this     = this,
        postIndex = this.postCounter.length - 1,
        tagsInContent = data.content.match(rTagInContent);

    while (i < tagsInContent.length) {
        var idx      = tagsInContent[i].replace(escapeTagName, ''),
            flickrID = _this.flickrTags[idx].id;

        if (_this.flickrStorage.hasOwnProperty(flickrID)) {
            data.content = data.content.replace( '<img data-tag="' + escapeTagName + idx +'">',
                _this.imgFormat(idx, _this.flickrStorage[flickrID])
            );

            _this.postCounter[postIndex] ++;

            if (_this.postCounter[postIndex] === tagsInContent.length) {
                if (_this.sumOfPostCounter() === _this.flickrTags.length) {
                    _this.flickrTags = [];
                    _this.postCounter = [];
                }
                callback(data);
            }

        } else {
            _this.httpGet(idx, postIndex, function (idx, jsondata) {
                _this.flickrStorage[_this.flickrTags[idx].id] = jsondata;

                data.content = data.content.replace( '<img data-tag="' + escapeTagName + idx +'">',
                    _this.imgFormat(idx, jsondata)
                );

                // console.log(util.format('http got photo at post %s(%d) tag: %d', data.title, postIndex, _this.postCounter[postIndex]));

                if (_this.postCounter[postIndex] === tagsInContent.length) {
                    if (_this.sumOfPostCounter() === _this.flickrTags.length) {
                        _this.flickrTags = [];
                        _this.postCounter = [];
                    }
                    callback(data);
                }
            });
        }
        i++;
    }
};

/**
 * Sum array PostCounter's value
 *
 * @return {Number}
 */
FlickrTag.prototype.sumOfPostCounter = function () {
    var sum = this.postCounter.reduce(function (p, c) { return p + c; }, 0);
    return sum;
};

/**
 * Check post has flickr tag or not
 *
 * @param  {Object}  data Post contents
 * @return {Boolean}
 */
FlickrTag.prototype.hasFlickrTag = function (data) {
    return data.content.indexOf(escapeTagName) !== -1;
};

/**
 * Flickr api http request
 *
 * @param  {number} index      The index of flickr tag want to request
 * @param  {Function} callback Run callback when fetch end
 */
FlickrTag.prototype.httpGet = function (idx, postIndex, callback) {
    var _this = this;
    var photoId = this.flickrTags[idx].id;
    var url = APIURL +
        "&method=flickr.photos.getInfo" +
        "&api_key=" + APIKey +
        "&photo_id=" + photoId +
        "&format=json" +
        "&nojsoncallback=1";

    https.get(url, function (res) {
        var data = '';

        res.on('data', function (chunk) {
            data += chunk;
        });

        res.on('end', function () {
            var result = JSON.parse(data);
            if (result.stat === 'ok') {
                _this.postCounter[postIndex] ++;
                callback(idx, JSON.parse(data));
            } else {
                hexo.log.err('Flickr Tag Error: ' + photoId + ' ' +  result.message);
            }
        });
    }).on('error', function (e) {
        hexo.log.err('Fetch Flickr API error: ' + e);
    });
};

/**
* Format flickr image url and return html tag
*
* @param  {number} index    The index of flickr tag
* @param  {object} jsonData Result from flickr api
* @return {string} Html tag for output
*/
FlickrTag.prototype.imgFormat = function (idx, jsonData) {
    var secret = '',
        format = '',
        size,
        photoSize,
        imgAttr = {};

    var tagObj = this.flickrTags[idx];

    switch (tagObj.size) {
        case 'o':
            if (typeof(jsonData.photo.originalsecret) !== 'undefined') {
                secret = jsonData.photo.originalsecret;
                format = jsonData.photo.originalformat;
            } else {
                hexo.log.err('Can not access the Flickr id '+ tagObj.id +' original size');
            }
            size = '_' + tagObj.size;
            break;
        case '-':
            secret = jsonData.photo.secret;
            format = 'jpg';
            size = '';
            break;
        default:
            secret = jsonData.photo.secret;
            format = 'jpg';
            size = '_' + tagObj.size;
    }

    imgAttr.src = util.format(URL_PATTERN,
        jsonData.photo.farm,
        jsonData.photo.server,
        jsonData.photo.id,
        secret,
        size,
        format
    );

    photoSize = PHOTO_SIZE[tagObj.size];
    for (var key in photoSize) {
        imgAttr[key] = photoSize[key];
    }

    imgAttr.class = tagObj.classes.join(' ');
    imgAttr.alt = this.htmlEscape(jsonData.photo.title._content);

    return htmlTag('img', imgAttr);
};

/**
 * Covert tag args to object with default value
 *
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
 *
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
