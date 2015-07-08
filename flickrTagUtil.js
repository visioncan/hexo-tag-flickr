'use strict';

var util = require('util');
var hexoUtil = require('hexo-util');
var rPhotoId = /\d{5,}/;
var rPhotoSize = /^[sqtmnzcbo\-]$/;
var IMG_URL_PATTERN = 'https://farm%s.staticflickr.com/%s/%s_%s%s.%s';
var PHOTO_SIZE = {
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
};
var flickrTagUtil = {
  convertAttr: function (args) {
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
    }
    return attrs;
  },

  imgFormat: function (tag, jsonData) {
    var secret = '',
      format = '',
      size,
      photoSize,
      imgAttr = {};

    switch (tag.size) {
      case 'o':
        if (typeof(jsonData.photo.originalsecret) !== 'undefined') {
          secret = jsonData.photo.originalsecret;
          format = jsonData.photo.originalformat;
        } else {
          hexo.log.err('Can not access the Flickr id '+ tag.id +' original size');
        }
        size = '_' + tag.size;
        break;

      case '-':
        secret = jsonData.photo.secret;
        format = 'jpg';
        size = '';
        break;

      default:
        secret = jsonData.photo.secret;
        format = 'jpg';
        size = '_' + tag.size;
    }

    imgAttr.src = util.format(IMG_URL_PATTERN,
      jsonData.photo.farm,
      jsonData.photo.server,
      jsonData.photo.id,
      secret,
      size,
      format
    );

    photoSize = PHOTO_SIZE[tag.size];
    for (var key in photoSize) {
        imgAttr[key] = photoSize[key];
    }

    imgAttr.class = tag.classes.join(' ');
    imgAttr.alt = hexoUtil.escapeHTML(jsonData.photo.title._content);

    return imgAttr;
  }
};

module.exports = flickrTagUtil;
