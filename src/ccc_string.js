/**
 * String data type.
 */
ccc.String = function(value) {
  this.value_ = value;
};

ccc.String.prototype = { __proto__: ccc.Object.prototype };
ccc.String.prototype.constructor = ccc.String;

ccc.String.prototype.sanitizedValue_ = function() {
  return this.value_.
    replace("\n", "\\n");
};

ccc.String.prototype.toString = function() {
  return '"' + this.sanitizedValue_() + '"';
};

ccc.String.prototype.eq = function(other) {
  return this.value_ === other.value_;
};

