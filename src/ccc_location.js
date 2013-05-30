/**
 * Value location object.
 *
 * Location is essentially used to box value references. Any global or local
 * bindings stored in an environment are stored as Location objects which hold
 * some currently assigned value.
 */
ccc.Location = function(name, value) {
  this.name_ = name;
  this.value_ = value || ccc.unspecified;
};

ccc.Location.prototype = { __proto__: ccc.Object.prototype };
ccc.Location.prototype.constructor = ccc.Location;

ccc.Location.prototype.toString = function() {
  return "#<location:" + this.name_ + ">";
};

ccc.Location.prototype.eval = function(environment, continuation) {
  return function() {
    return continuation(this.value_);
  }.bind(this);
};

