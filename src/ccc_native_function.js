/**
 * Native function object.
 *
 * NativeFunction is constructed of a function and a display name.
 *
 * The function is called when the NativeFunction object is applied at runtime.
 * The function receives three arguments: the |environment| of the call site,
 * the |continuation |of the call site, and a proper list containing the
 * applied |arguments| (or ccc.nil if there were none).
 *
 * The function is responsible for returning some meaningful continuation
 * generator (a 0-argument function which returns a 1-argument continuation
 * function). Failure to do so results in immediate program termination.
 *
 * The most common use case is to simply return a value to the caller. To do this,
 * you can simply take the continuation you receive and:
 *
 * return continuation(yourReturnValue);
 */
ccc.NativeFunction = function(fn, name) {
  this.fn_ = fn;
  this.name_ = name || "(anonymous)";
};

ccc.NativeFunction.prototype = { __proto__: ccc.Object.prototype };
ccc.NativeFunction.prototype.constructor = ccc.NativeFunction;

ccc.NativeFunction.prototype.toString = function() {
  return "#<native-function:" + this.name_ + ">";
};

ccc.NativeFunction.prototype.apply = function(environment, continuation, args) {
  return this.fn_(environment, continuation, args);
};

