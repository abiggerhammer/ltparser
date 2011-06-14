define(['ltparser/gif'], function(gif) {

  function loaded(evt) {
    var fileString = evt.target.result;
    var result = [];
    for (i=0; i<fileString.length; ++i) {
      b = fileString.charCodeAt(i).toString(16);
      if (b.length < 2) {
        b = '0'+b;
      }
      result.push(b);
    }
    console.log(result.join(' '));
    var short = fileString.substring(0, 799);
    var p = gif.parse(fileString);
    for (var i in p) {
      console.log(i, p[i]);
    }
  }

  /* Stuff in this return block is what actually gets exposed as part of the API. */  
  return {
    handleFiles: function(files) {
      var reader = new FileReader();
      for (var i=0; i<files.length; ++i) {
	console.log(files[i].name);
	reader.readAsBinaryString(files[i]);
	reader.onload = loaded;
      } 
    }
  }

});