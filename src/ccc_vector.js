ccc.Vector = function(elements) {
  this.elements_ = elements;
};

ccc.Vector.prototype.toString = function() {
  return "#<vector:" + this.elements_.toString() + ">";
};

ccc.Vector.prototype.toSource = function() {
  return "#(" + this.elements_.map(function(e) { return e.toSource(); }).join(" ") + ")";
};

