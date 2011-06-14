require({
  packagePaths: {
    ".packages": ["ReParse"]
  },
  "packages": ["ltparser"]
});

require(["ReParse", "ltparser/common", "ltparser/gif", "handler"], function(ReParse, ltparser, gif, handler) {

  document.getElementById('input').onchange = function(){ handler.handleFiles(this.files) };

  function parse(data) {
    return (new ReParse.reparse(data, true)).start(value);
  }

  function value() {
    return this.choice(literal, string, number, array, object);
  }

  function object() {
    return this.between(/^\{/, /^\}/, members).reduce(function(obj, pair) {
      obj[pair[1]] = pair[3];
      return obj;
    }, {});
  }

  function members() {
    return this.sepBy(pair, /^,/);
  }

  function pair() {
    return this.seq(string, /^:/, value);
  }

  function array() {
    return this.between(/^\[/, /^\]/, elements);
  }

  function elements() {
    return this.sepBy(value, /^,/);
  }

  var LITERAL = { 'true': true, 'false': false, 'null': null };
  function literal() {
    return LITERAL[this.match(/^(true|false|null)/)];
  }

  var STRING = { '"': 34, '\\': 92, '/': 47, 'b': 8, 'f': 12, 'n': 10, 'r': 13, 't': 9};
  function string() {
    var chars = this.match(/^"((?:\\["\\/bfnrt]|\\u[0-9a-fA-F]{4}|[^"\\])*)"/);
    return chars.replace(/\\(["\\/bfnrt])|\\u([0-9a-fA-F]{4})/g, function(_, $1, $2) {
      return String.fromCharCode($1 ? STRING[$1] : parseInt($2, 16));
    });
  }

  function number() {
    return parseFloat(this.match(/^\-?\d+(?:\.\d+)?(?:[eE][\+\-]?\d+)?/));
  }

  var input = '{"a": [1, "foo", [], {"foo": 1, "bar": [1, 2, 3]}] }';

  console.log(parse(input));
});