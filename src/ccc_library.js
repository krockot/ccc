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
 * Adds a NativeFunction object to the library.
 *
 * There is almost never a good reason to use this interface directly.
 * See Library.register instead.
 */
ccc.Library.prototype.addNativeFunction = function(name, nativeFunction) {
  this.entries_[name] = new ccc.NativeFunction(nativeFunction, this.name_ + ":" + name);
};

/**
 * Adds a NativeFunction object to the library using a general-purpose boilerplate
 * call wrapper.
 *
 * If the given function lists no argument names, it is assumed to take 0 or more arguments;
 * no arity checking is done by the wrapper function and the implementation can access
 * arguments dynamically through standard function |arguments|.
 *
 * If the given function does list argument names, it is assumed to take exactly that many
 * arguments. Arity checking is done by the wrapper function and an exception is thrown
 * if there is a mismatch when called. If there is no mismatch, the named arguments
 * will be properly bound to the caller's argument values.
 *
 * If the given function returns no value, the wrapper will return ccc.unspecified.
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

/**
 * registerEntry takes an object with the following fields:
 *
 * |name| - (Required). Name of the procedure to register in the library.
 * |impl| - (Required). Implementation of the procedure.
 * |requiredArgs| - (Optional). Type and arity specification for the argument list
 * |optionalArgs| - (Optional). Type and arity specification for optional arguments
 * |customContinuation| - (Optional). Signifies that |impl| returns a new program
 *                        continuation rather than a simple value. Defaults to false.
 *
 * |requiredArgs| must be an array of strings if provided. Each string is a case-insensitive
 * type constraint to be enforced by the native function wrapper on the argument corresponding
 * to the string's array position. For example, if requiredArgs is given as ["string", "symbol"],
 * this signifies that the function requires at least 2 arguments; the first one must be a string
 * and the second a symbol.
 *
 * |optionalArgs| may also be provided. If it is an array of type names (like requiredArgs),
 * then the procedure takes between requiredArgs.length and (requiredArgs.length + optionalArgs.length)
 * arguments, inclusive. All arguments provided by the caller are type-checked.
 *
 * |optionalArgs| may also be a simple type string, signifying that the procedure can take
 * any number of arguments beyond those specified by requiredArgs. If this form is used,
 * |impl| will receive as its final argument a proper list of all arguments not captured
 * by requiredArgs. Elements in the list will be type-checked according to the value of
 * |optionalArgs|.
 */
(function() {
  var typePredicates = {
    ANY: function() { return true; },
    BOOLEAN: function(value) { return value.constructor === ccc.Boolean; },
    INTEGER: function(value) { return value.constructor === ccc.Number && (value.value_|0) === value.value_; },
    NUMBER: function(value) { return value.constructor === ccc.Number; },
    CHAR: function(value) { return value.constructor === ccc.Char; },
    STRING: function(value) { return value.constructor === ccc.String; },
    SYMBOL: function(value) { return value.constructor === ccc.Symbol; },
    VECTOR: function(value) { return value.constructor === ccc.Vector; },
    PAIR: function(value) { return value.constructor === ccc.Pair; },
    PAIR_OR_NIL: function(value) { return value === ccc.nil || value.constructor === ccc.Pair; },
    LIST: function(value) { return value === ccc.nil || (value.constructor === ccc.Pair && value.isList()); },
  };

  var sanitizeArgTypes = function(typeList) {
    if (!typeList)
      return [];
    if (typeList instanceof Array)
      return typeList.map(function(type) { return type.toUpperCase(); });
    return typeList.toUpperCase();
  };

  ccc.Library.prototype.registerEntries = function(entries) {
    entries.forEach(ccc.Library.prototype.registerEntry.bind(this));
  };

  ccc.Library.prototype.registerEntry = function(entry) {
    var name = entry.name;
    entry.requiredArgs = sanitizeArgTypes(entry.requiredArgs);
    entry.optionalArgs = sanitizeArgTypes(entry.optionalArgs);
    this.addNativeFunction(name, function(environment, continuation, args) {
      var tail = args;
      var appliedArgs = [];
      // Type-check any fixed arguments
      entry.requiredArgs.forEach(function(type, index) {
        if (tail.constructor !== ccc.Pair)
          throw new Error(name + ": Not enough arguments");
        var value = tail.car();
        var pred = typePredicates[type];
        if (!pred(value))
          throw new Error(name + ": Wrong type for argument " + index);
        appliedArgs.push(value);
        tail = tail.cdr();
      });
      // Type-check optional arguments if present; otherwise use #? in their place
      if (entry.optionalArgs instanceof Array) {
        entry.optionalArgs.forEach(function(type) {
          if (tail.constructor !== ccc.Pair)
            appliedArgs.push(ccc.unspecified);
          else {
            var value = tail.car();
            var pred = typePredicates[type];
            if (!pred(value))
              throw new Error(name + ": Wrong type for argument " + appliedArgs.length);
            appliedArgs.push(value);
            tail = tail.cdr();
          }
        });
      } else {
        // Pass tail as last argument if optionalArgs is a typespec.
        // If the typespec is anything but ANY, do type-checking on item in the list
        appliedArgs.push(tail);
        if (tail !== ccc.nil && entry.optionalArgs !== "ANY") {
          var argIndex = appliedArgs.length;
          var pred = typePredicates[entry.optionalArgs];
          tail.forEach(function(value) {
            if (!pred(value))
              throw new Error(name + ": Wrong type for argument " + argIndex);
            argIndex += 1;
          });
        }
        tail = ccc.nil;
      }

      if (tail !== ccc.nil)
        throw new Error(name + ": Too many arguments");

      var thisArg = { environment: environment, continuation: continuation };
      var result = entry.impl.apply(thisArg, appliedArgs);
      if (entry.customContinuation)
        return result;
      if (result === undefined)
        result = ccc.unspecified;
      return continuation(result);
    });
  };
}());

