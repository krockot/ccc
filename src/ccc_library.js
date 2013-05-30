/**
 * Native function library.
 *
 * This provides some convenient interface for establishing named bindings to
 * native function implementations for import into a program environment.
 *
 * Library objects can be imported into a live Environment using the environment's
 * importLibrary method.
 */
ccc.Library = function(name) {
  this.name_ = name;
  this.entries_ = {};
};

ccc.Library.prototype = { __proto__: ccc.Object.prototype };
ccc.Library.prototype.constructor = ccc.Library;

ccc.Library.prototype.name = function() {
  return this.name_;
};

ccc.Library.prototype.entries = function() {
  return this.entries_;
};

/**
 * Adds a NativeFunction object to the library. This is useful when you know what
 * you are doing and addSimpleFunction just doesn't cut it. All library entries
 * are ultimately native functions, but the majority of entries can be built
 * using the simpler (and aptly named) addSimpleFunction approach.
 *
 * Examples of when this method is needed instead:
 *  - Performing arity dispatch
 *  - Supporting arity other than fixed-N or 0-or-more.
 *  - Avoiding the overhead of an implicit args list-to-array conversion
 *  - Returning to a continuation other than the one provided by your caller
 */
ccc.Library.prototype.addNativeFunction = function(name, nativeFunction) {
  this.entries_[name] = new ccc.NativeFunction(nativeFunction, this.name_ + ":" + name);
};

/**
 * Calls addNativeFunction for each key-value pair in the argument object.
 */
ccc.Library.prototype.addNativeFunctions = function(entries) {
  for (var name in entries) {
    if (entries.hasOwnProperty(name)) {
      this.addNativeFunction(name, entries[name]);
    }
  }
};

/**
 * Adds a NativeFunction object to the library using a general-purpose boilerplate
 * call wrapper.
 *
 * Rather than providing a function which has a lot of low-level responsibility,
 * you simply provide a function which optionally takes named arguments and which
 * optionally returns some kind of ccc Object.
 *
 * If your function lists no argument names, it is assumed to take 0 or more arguments;
 * no arity checking is done by the wrapper function and you can do whatever you like
 * with the standard function |arguments| array-ish.
 *
 * If your function does list argument names, it is assumed to take exactly that many
 * arguments. Arity checking is done by the wrapper function and an exception is thrown
 * if there is a mismatch when called. If there is no mismatch, your named arguments
 * are properly bound to the caller's argument values.
 *
 * If your function returns no value, it will implicitly behave as if it returned
 * the ccc.unspecified value.
 */
ccc.Library.prototype.addSimpleFunction = function(name, fn) {
  this.entries_[name] = new ccc.NativeFunction(function(environment, continuation, args) {
    args = args.toArray();
    if (fn.length > 0 && args.length !== fn.length)
      throw new Error(name + ": Wrong number of arguments. Expected " + fn.length + "; received " + args.length);
    var result = fn.apply(null, args);
    if (result === undefined)
      result = ccc.unspecified;
    return continuation(result);
  }, this.name_ + ":" + name);
};

/**
 * Calls addSimpleFunction for each key-value pair in the argument object.
 */
ccc.Library.prototype.addSimpleFunctions = function(entries) {
  for (var name in entries) {
    if (entries.hasOwnProperty(name)) {
      this.addSimpleFunction(name, entries[name]);
    }
  }
};