/**
 * Character data type.
 *
 * A Char is a single integer value representing a Unicode codepoint.
 */
ccc.Char = function(charCode) {
  this.charCode_ = charCode;
};

ccc.Char.prototype = { __proto__: ccc.Object.prototype };
ccc.Char.prototype.constructor = ccc.Char;

ccc.Char.prototype.toString = function() {
  var hexCode = this.charCode_.toString(16);
  return "#<char:" + "0000".substr(hexCode.length) + hexCode + ">";
};

ccc.Char.prototype.toSource = function() {
  var hexCode = this.charCode_.toString(16);
  return "#\\u" + "0000".substr(hexCode.length) + hexCode;
};

ccc.Char.prototype.eq = function(other) {
  return this.charCode_ === other.charCode_;
};

