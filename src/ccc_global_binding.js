/**
 * Global binding object.
 *
 * Any symbol that cannot be resolved at compile time is compiled to one of
 * these. When a GlobalBinding is evaluated at run-time, it attempts to lookup
 * its symbol binding in the current environment. It is a run-time error if
 * no such binding exists at the time.
 */
ccc.GlobalBinding = function(name) {
  this.name_ = name;
};

ccc.GlobalBinding.prototype = { __proto__: ccc.Object.prototype };
ccc.GlobalBinding.prototype.constructor = ccc.GlobalBinding;

ccc.GlobalBinding.prototype.toString = function() {
  return "#<global-binding:" + this.name_ + ">";
};

ccc.GlobalBinding.prototype.eval = function(environment, continuation) {
  return function() {
    var location = environment.lookup(this.name_);
    if (!location)
      throw new Error("Unbound variable: " + this.name_);
    return continuation(location.value_);
  }.bind(this);
};

