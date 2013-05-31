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
 * The most common use case is to simply return a value to the caller. To do this,
 * an implementation should return the result of calling the received continuation
 * with the desired return value, i.e.:
 *
 * return continuation(returnValue);
 *
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

