ccc.Number = function(value) {
  this.value_ = value;
};

ccc.Number.prototype.toString = function() {
  return "#<number:" + this.value_.toString() + ">";
};

ccc.Number.prototype.toSource = function() {
  return this.value_.toString();
};
