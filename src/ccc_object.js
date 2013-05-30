/**
 * Object base type.
 *
 * This is the prototype for any first-class runtime object. It provides some
 * sane defaults for methods that many types simply shouldn't need to implement
 * on their own.
 */
ccc.Object = function() {};

ccc.Object.prototype.toSource = function() { return this.toString(); };

// Identity function
ccc.Object.prototype.compile = function(environment) { return this; };

// Identity evaluator
ccc.Object.prototype.eval = function(environment, continuation) {
  return function() {
    return continuation(this);
  }.bind(this);
};

// Identity equality
ccc.Object.prototype.eq = function(other) {
  return this === other;
};

// Fallback to this.eq
ccc.Object.prototype.eqv = function(other) {
  return this.eq(other);
};

// Fallback to this.equal
ccc.Object.prototype.equal = function(other) {
  return this.eqv(other);
};


