ccc.Char = function(charCode) {
  this.charCode_ = charCode;
};

ccc.Char.prototype.toString = function() {
  var hexCode = this.charCode_.toString(16);
  return "#<char:" + "0000".substr(hexCode.length) + hexCode + ">";
};

ccc.Char.prototype.toSource = function() {
  var hexCode = this.charCode_.toString(16);
  return "#\\u" + "0000".substr(hexCode.length) + hexCode;
};

