/**
 * Lexical closure object.
 *
 * A Closure is used to capture an environment in which lexical bindings may
 * be established at compile time.
 *
 * Closure objects are generated at run-time by a special native function application
 * that replaces lambda forms at compile-time.
 */
ccc.Closure = function(environment, compiledBody, namedArgBindings, argsTailBinding) {
  this.capturedEnvironment_ = environment;
  this.compiledBody_ = compiledBody;
  this.namedArgBindings_ = namedArgBindings;
  this.argsTailBinding_ = argsTailBinding;
};

ccc.Closure.prototype = { __proto__: ccc.Object.prototype };
ccc.Closure.prototype.constructor = ccc.Closure;

ccc.Closure.prototype.toString = function() {
  return "#<closure>";
};

/**
 * Apply a list of arguments to the closure.
 *
 * This will augment the captured environment with local bindings to the applied
 * argument values.
 *
 * The compiled closure body is then evaluated, and any compiled lexical bindings
 * therein will resolve to their corresponding local bindings within the context of
 * the call environment.
 *
 * The tail element of the compiled body is evaluated with the original
 * callee's continuation.
 */
ccc.Closure.prototype.apply = function(environment, continuation, args) {
  var callEnvironment = new ccc.Environment(this.capturedEnvironment_);

  // Bind all named arguments to first values
  for (var i = 0; i < this.namedArgBindings_.length; ++i) {
    if (args.constructor !== ccc.Pair)
      throw new Error("Too few arguments applied to closure");
    callEnvironment.bindLocal(this.namedArgBindings_[i], args.car());
    args = args.cdr();
  }

  // Bind any remaining arguments to the tail binding, if any
  if (args !== ccc.nil && this.argsTailBinding_ === ccc.nil)
    throw new Error("Too many arguments applied to closure");
  if (this.argsTailBinding_ !== ccc.nil)
    callEnvironment.bindLocal(this.argsTailBinding_, args);

  // Step through with each compiled form continuing to the next one.
  // The final form continues to our own caller's continuation.
  var evalForms = function(forms) {
    if (forms.length === 1)
      return forms[0].eval(callEnvironment, continuation);
    return forms[0].eval(callEnvironment, function() {
      return evalForms(forms.slice(1));
    });
  };
  return evalForms(this.compiledBody_.slice());
};

