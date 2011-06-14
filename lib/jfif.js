define(["require", "exports", "module"], function(require, exports, module) {

  var ReParse = require('ReParse');

  exports.foo = function() {
    console.log("foo");
  }

  tmpvars = {};

  exports.parse = function(data) {
    return (new ReParse.reparse(data, false)).start(jfif);
  }

  function jfif() {
    return this.seq(header);
    //return this.seq(header, segments, sos, /*something*/, eoi);
  }

  function header() {
    return this.seq(soi, app0, len, id, version, units, Xdensity, Ydensity, Xthumbnail, Ythumbnail, thumbnail);
  }

  function soi() {
    return this.match(/\xff\xd8/);
  }

  function app0() {
    return this.match(/\xff\xe0/);
  }

  function byte() {
    return this.match(/[\x00-\xff]/);
  }

  function _parseBytesAsInt(bytes) {
    var str = bytes.join('');
    var arr = [];
    for (i=0; i<str.length; ++i) {
      b = str.charCodeAt(i).toString(16);
      if (b.length < 2) {
        b = '0'+b;
      }
      arr.push(b);
    }
    return parseInt('0x'+arr.join(''));
  }

  function len() {
    var bytes = this.count(byte, 2);
    return _parseBytesAsInt(bytes);
  }

  function id() {
    return this.match(/JFIF\x00/);
  }

  function _v10() {
    return this.match(/\x01\x00/);
  }

  function _v11() {
    return this.match(/\x01\x01/);
  }

  function _v12() {
    return this.match(/\x01\x02/);
  }

  function version() {
    return this.choice(_v10, _v11, _v12);
  }

  function units() {
    switch(parseInt('0x'+this.match(/[\x00-\x02]/).charCodeAt(0))) {
      case 0:
        return "none";
      case 1:
        return "dots per inch";
      case 2:
        return "dots per cm";
      default:
        return this.fail(this.input);
    }    
  }

  function Xdensity() {
    var bytes = this.count(byte, 2);
    return _parseBytesAsInt(bytes);
  }

  function Ydensity() {
    var bytes = this.count(byte, 2);
    return _parseBytesAsInt(bytes);
  }

  function Xthumbnail() {
    tmpvars.xthumb = _parseBytesAsInt(this.count(byte, 1));
    return tmpvars.xthumb;
  }

  function Ythumbnail() {
    tmpvars.ythumb = _parseBytesAsInt(this.count(byte, 1));
    return tmpvars.ythumb;
  }

  function thumbnail() {
    return this.count(byte, 3*tmpvars.xthumb*tmpvars.ythumb);
  }

  function segments() {
    return this.many1(choice());
  }

  function dqt() {
    var tag = this.match(/\xff\xdb/);
    var c = _parseBytesAsInt(this.count(byte, 2));
    var data = this.count(byte, c-2);
    return [tag, c, data.join('')];
  }

  function sof0() {
    var tag = this.match(/\xff\xc0/);
    var c = _parseBytesAsInt(this.count(byte, 2));
    var data = this.count(byte, c-2);
    return [tag, c, data.join('')];
  }

  function dht() {
    var tag = this.match(/\xff\xc4/);
    var c = _parseBytesAsInt(this.count(byte, 2));
    var data = this.count(byte, c-2);
    return [tag, c, data.join('')];
  }

  function sos() {
    var tag = this.match(/\xff\xda/);
    var c = _parseBytesAsInt(this.count(byte, 2));
    var data = this.count(byte, c-2);
    return [tag, c, data.join('')];
  }

  function eoi() {
    return this.match(/\xff\xd9/);
  }

});
