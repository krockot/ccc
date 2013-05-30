/**
 * Number data type.
 *
 * It wraps a number object. Yep.
 */
ccc.Number = function(value) {
  this.value_ = value;
};

ccc.Number.prototype = { __proto__: ccc.Object.prototype };
ccc.Number.prototype.constructor = ccc.Number;

ccc.Number.prototype.toString = function() {
  return this.value_.toString();
};

ccc.Number.prototype.eq = function(other) {
  return this.value_ === other.value_;
};

