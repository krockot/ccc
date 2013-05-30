/**
 * Continuation object.
 *
 * This captures a continuation function as a first-class object that can be
 * evaluated and applied by the runtime.
 *
 * A proper continuation function is 1-argument function which returns
 * a continuation generator.
 *
 * A continuation generator is a 0-argument function which returns a
 * continuation function (NOT a Continuation instance!)
 */
ccc.Continuation = function(fn) {
  this.fn_ = fn;
};

ccc.Continuation.prototype = { __proto__: ccc.Object.prototype };
ccc.Continuation.prototype.constructor = ccc.Continuation;

ccc.Continuation.prototype.toString = function() {
  return "#<continuation>";
};

ccc.Continuation.prototype.apply = function(environment, continuation, args) {
  if (args === ccc.nil || args.cdr() !== ccc.nil)
    throw new Error("Wrong number of args given to continuation");
  return function() {
    return this.fn_(args.car());
  }.bind(this);
};

