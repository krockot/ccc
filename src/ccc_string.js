ccc.String = function(value) {
  this.value_ = value;
};

ccc.String.prototype.sanitizedValue_ = function() {
  return this.value_.
    replace("\n", "\\n");
};

ccc.String.prototype.toString = function() {
  return "#<string:" + this.sanitizedValue_() + ">";
};

ccc.String.prototype.toSource = function() {
  return '"' + this.sanitizedValue_() + '"';
};
