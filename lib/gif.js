// http://www.w3.org/Graphics/GIF/spec-gif89a.txt

define(["require", "exports", "module"], function(require, exports, module) {

  var ReParse = require('ReParse');

  var FLAG_GLOBAL_COLOR_TABLE = 0x80;
  var FLAG_COLOR_RESOLUTION = 0x70;
  var FLAG_SORT = 0x8;
  var FLAG_GLOBAL_COLOR_TABLE_SIZE = 0x7;

  var FLAG_DISPOSAL_METHOD = 0x1c;
  var FLAG_USER_INPUT = 0x2;
  var FLAG_TRANSPARENT_COLOR = 0x1;

  var FLAG_LOCAL_COLOR_TABLE = 0x80;
  var FLAG_INTERLACE = 0x40;
  var FLAG_LCT_SORTED = 0x20;
  var FLAG_LCT_SIZE = 0x7;

  // helpers

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

  // parser

  exports.parse = function(data) {
    return (new ReParse.reparse(data, false)).start(gif);
  }

  function gif() {
    var g = this.seq(header, logical_screen);
    var d = this.endBy(data, trailer);
    return {"gif": {"header": g[1], "logical screen": g[2], "data": d}};
  }

  function header() {
    var hdr = this.seq(signature, version);
    return {"signature": hdr[1], "version": hdr[2]};
  }

  function signature() {
    return this.match(/GIF/);
  }

  function version() {
    return this.match(/8[79]a/);
  }

  function logical_screen() {
    var lsd = this.produce(logical_screen_descriptor);
    var gct = null;
    if (lsd["packed fields"]["global color table flag"] == true) {
      var global_color_table = get_global_color_table(lsd["packed fields"]["global color table size"]);
      gct = this.produce(global_color_table);
    }
    return {"logical screen descriptor": lsd, "global color table": gct};
  }

  function logical_screen_descriptor() {
    var lsd = this.seq(logical_screen_width, logical_screen_height, lsd_packed_fields, background_color_index, pixel_aspect_ratio);
    return { "logical screen width": lsd[1], 
             "logical screen height": lsd[2],
             "packed fields": lsd[3], 
             "background color index": lsd[4], 
             "pixel aspect ratio": lsd[5]};
  }

  function logical_screen_width() {
    return parseBytesAsInt(this.count(byte, 2));
  }

  function logical_screen_height() {
    return parseBytesAsInt(this.count(byte, 2));
  }

  function lsd_packed_fields() {
    var fields = this.produce(byte).charCodeAt(0)
    var gct = new Boolean(fields & FLAG_GLOBAL_COLOR_TABLE);
    var cres = (fields & FLAG_COLOR_RESOLUTION) >> 6;
    var sort = new Boolean(fields & FLAG_SORT);
    var gctsize = (fields & FLAG_GLOBAL_COLOR_TABLE_SIZE);
    return {"global color table flag": gct, "color resolution": cres, "sort flag": sort, "global color table size": gctsize};
  }

  function background_color_index() {
    return this.produce(byte);
  }

  function pixel_aspect_ratio() {
    return this.produce(byte);
  }

  function get_global_color_table(gct_size) {
    return function() { 
      return this.count(byte, 3*Math.pow(2,gct_size+1));
    }
  }

  function data() {
    return this.choice(graphic_block, special_purpose_block);
  }

  function graphic_block() {
    var gce = this.maybe(graphic_control_extension);
    var grb = this.produce(graphic_rendering_block);
    return {"graphic block": {"graphic control extension": gce, "graphic rendering block": grb}};
  }

  function graphic_control_extension() {
    var gce = this.seq(extension_introducer, graphic_control_label, gce_block_size, gce_packed_fields, delay_time, transparent_color_index, gce_block_terminator);
    return {"packed fields": gce[4], "delay_time": gce[5], "transparent color index": gce[6]};
  }

  function extension_introducer() {
    return this.match(/\x21/);
  }

  function graphic_control_label() {
    return this.match(/\xf9/);
  }

  function gce_block_size() {
    return this.match(/\x04/);
  }

  function gce_packed_fields() {
    var fields = this.produce(byte);
    var dm = (fields & FLAG_DISPOSAL_METHOD) >> 2;
    var ui = new Boolean(fields & FLAG_USER_INPUT);
    var tc = new Boolean(fields & FLAG_TRANSPARENT_COLOR);
    return {"disposal method": dm, "user input": ui, "transparency flag": tc};
  }

  function delay_time() {
    return parseBytesAsInt(this.count(byte, 2));
  }

  function transparent_color_index() {
    return this.produce(byte);
  }

  function gce_block_terminator() {
    return this.match(/\x00/);
  }

  function graphic_rendering_block() {
    return this.choice(table_based_image, plain_text_extension);
  }

  function table_based_image() {
    var id = this.produce(image_descriptor);
    var lctsize = id["packed fields"]["local color table size"];
    var lct = null;
    if (id["packed fields"]["local color table"] == true) {
      console.log("getting local color table");
      var local_color_table = get_local_color_table(lctsize);
      lct = this.produce(local_color_table);
    }
    var idat = this.produce(image_data);
    return {"table based image": {"image descriptor": id, "local color table": lct, "image data": idat}};
  }

  function image_descriptor() {
    var id = this.seq(image_separator, image_left_position, image_top_position, image_width, image_height, im_packed_fields);
    return {"image separator": id[1], "image left position": id[2], "image top position": id[3], "image width": id[4], "image height": id[5], "packed fields": id[6]};
  }

  function image_separator() {
    return this.match(/\x2c/);
  }

  function image_left_position() {
    return parseBytesAsInt(this.count(byte, 2));
  }

  function image_top_position() {
    return parseBytesAsInt(this.count(byte, 2));
  }

  function image_width() {
    return parseBytesAsInt(this.count(byte, 2));
  }

  function image_height() {
    return parseBytesAsInt(this.count(byte, 2));
  }

  function im_packed_fields() {
    var fields = this.produce(byte).charCodeAt(0);
    var lct = new Boolean(fields & FLAG_LOCAL_COLOR_TABLE);
    var interlace = new Boolean(fields & FLAG_INTERLACE);
    var sort = new Boolean(fields & FLAG_LCT_SORTED);
    var lct_size = fields & FLAG_LCT_SIZE;
    return {"local color table": lct, "interlaced": interlace, "sorted": sort, "local color table size": lct_size};
  }

  function get_local_color_table(lct_size) {
    return function() {
      return this.count(byte, 3*Math.pow(2, lct_size+1));
    }
  }

  function image_data() {
    var lzw = this.produce(lzw_minimum_code_size);
    var d = this.endBy(data_subblock, block_terminator);
    return {"lzw minimum code size": lzw, "data sub-blocks": d};
  }

  function lzw_minimum_code_size() {
    return (0xff & this.produce(byte));
  }

  function data_subblock() {
    var bs = this.produce(data_subblock_size);
    var data_values = get_data_values(bs);
    var dv = this.produce(data_values);
    return {"block size": bs, "data values": dv};
  }

  function data_subblock_size() {
    var sz = this.match(/[\x01-\xff]/).charCodeAt(0);
    return sz;
  }

  function get_data_values(block_size) {
    return function() {
      return this.count(byte, block_size);
    }
  }

  function block_terminator() {
    return this.match(/\x00/);
  }

  function plain_text_extension() {
    var pte = this.seq(extension_introducer, 
		       plain_text_label, 
		       pte_block_size, 
	               text_grid_left_position, 
 		       text_grid_top_position, 
	 	       text_grid_width, 
		       text_grid_height, 
		       character_cell_width, 
		       character_cell_height, 
		       text_foreground_color_index, 
		       text_background_color_index, 
		       this.many(data_subblock), 
		       block_terminator);
    return {"plain text extension": {"text grid left position": pte[4], 
				     "text grid top position": pte[5], 
				     "text grid width": pte[6], 
				     "text grid height": pte[7], 
				     "character cell width": pte[8], 
				     "character cell height": pte[9], 
				     "text foreground color index": pte[10], 
				     "text background color index": pte[11], 
				     "plain text data": pte[12] }
	   };
  }

  function plain_text_label() {
    return this.match(/\x01/);
  }

  function pte_block_size() {
    return this.match(/\x0c/);
  }

  function text_grid_left_position() {
    return parseBytesAsInt(this.count(byte, 2));
  }

  function text_grid_top_position() {
    return parseBytesAsInt(this.count(byte, 2));
  }

  function text_grid_width() {
    return parseBytesAsInt(this.count(byte, 2));
  }

  function text_grid_height() {
    return parseBytesAsInt(this.count(byte, 2));
  }

  function character_cell_width() {
    return (0xff & this.produce(byte));
  }

  function character_cell_height() {
    return (0xff & this.produce(byte));
  }

  function text_foreground_color_index() {
    return (0xff & this.produce(byte));
  }
  
  function text_background_color_index() {
    return (0xff & this.produce(byte));
  }

  function special_purpose_block() {
    return this.choice(application_extension, comment_extension);
  }

  function application_extension() {
    var ae = this.seq(extension_introducer, app_label, app_block_size, app_identifier, app_auth_code, this.many(data_subblock), block_terminator);
    return {"application extension": {"application identifier": ae[4], "application authentication code": ae[5], "application data": ae[6]}};
  }

  function app_label() {
    return this.match(/\xff/);
  }

  function app_block_size() {
    return this.match(/\x0b/);
  }

  function app_identifier() {
    return this.count(byte, 8);
  }

  function app_auth_code() {
    return this.count(byte, 3);
  }

  function comment_extension() {
    var ce = this.seq(extension_introducer, comment_label, this.many(data_subblock), block_terminator);
    return {"comment extension": {"comment data": ce[3]}};
  }

  function comment_label() {
    return this.match(/\xfe/);
  }

  function trailer() {
    return this.match(/\x3b/);
  }

});