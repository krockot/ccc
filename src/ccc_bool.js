ccc.Bool = function(true_or_false) {
  this.value_ = !!true_or_false;
};

ccc.Bool.prototype.toString = function() {
  return "#<bool:" + this.value_.toString() + ">";
};

ccc.Bool.prototype.toSource = function() {
  return this.value_ ? "#t" : "#f";
};

ccc.t = new ccc.Bool(true);
ccc.f = new ccc.Bool(false);
