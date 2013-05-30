/**
 * Boolean data type.
 *
 * The only two instances of this type should be ccc.t and ccc.f, which correspond
 * to true (#t) and false (#f) value types. This allows boolean values to be reliably
 * compared using only object identity.
 */
ccc.Bool = function(true_or_false) {
  this.value_ = !!true_or_false;
};

ccc.Bool.prototype = { __proto__: ccc.Object.prototype };
ccc.Bool.prototype.constructor = ccc.Bool;

ccc.Bool.prototype.toString = function() {
  return "#<bool:" + this.value_.toString() + ">";
};

ccc.Bool.prototype.toSource = function() {
  return this.value_ ? "#t" : "#f";
};

ccc.t = new ccc.Bool(true);
ccc.f = new ccc.Bool(false);

