define(["require", "exports", "module"], function(require, exports, module) {

  var ReParse = require('ReParse');

  function byte() {
    return this.match(/[\x00-\xff]/);
  }

  function parseBytesAsInt(bytes) {
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
});