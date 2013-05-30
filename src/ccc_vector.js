/**
 * Vector data type
 */
ccc.Vector = function(elements) {
  this.elements_ = elements;
};

ccc.Vector.prototype = { __proto__: ccc.Object.prototype };
ccc.Vector.prototype.constructor = ccc.Vector;

ccc.Vector.prototype.toString = function() {
  return "#<vector:" + this.elements_.toString() + ">";
};

ccc.Vector.prototype.toSource = function() {
  return "#(" + this.elements_.map(function(e) { return e.toSource(); }).join(" ") + ")";
};

// Recursive element-wise equality test
ccc.Vector.prototype.equal = function(other) {
  if (this.elements_.length !== other.elements_.length)
    return false;
  for (var i = 0; i < this.elements_.length; ++i) {
    if (!this.elements_[i].equal(other.elements_[i]))
      return false;
  }
  return true;
};

