/**
 * This is the set of primitive library syntax transformers that are built into
 * top-level environments. The general strategy for implementing library syntax
 * is to replace the input form with a call to a native black-box function that
 * Does The Right Thing to the environment when applied.
 */
ccc.PrimitiveTransformers = {};

// Simply return the quoted data when applied
ccc.PrimitiveTransformers["quote"] = new ccc.Transformer(function(environment, form) {
  var datum = form.car();
  return new ccc.Pair(
    new ccc.NativeFunction(function(environment, continuation, args) {
        return function() {
          return continuation(datum);
        };
      }, 'quote'),
    ccc.nil);
});

/**
 * Bind the given symbol name. The symbol name is captured at compile time,
 * so e.g., (define x (some expression)) compiles to
 *
 * (#<native-function-which-binds-x-to-arg1-value> (some expression))
 */
ccc.PrimitiveTransformers["define"] = new ccc.Transformer(function(environment, form) {
  if (form.constructor !== ccc.Pair)
    throw new Error("Invalid form for 'define: not enough arguments");

  var symbol = form.car();
  if (symbol.constructor === ccc.Pair) {
    var args = symbol.cdr();
    var body = form.cdr();
    symbol = symbol.car();
    return ccc.Pair.makeList(
      new ccc.Symbol("define"),
      symbol,
      new ccc.Pair(new ccc.Symbol("lambda"), new ccc.Pair(args, body)));
  }

  if (symbol.constructor !== ccc.Symbol)
    throw new Error("Invalid form for 'define: symbol expected as first argument");

  var rest = form.cdr();
  if (rest.constructor !== ccc.Pair)
    throw new Error("Invalid form for 'define");

  if (rest.cdr() !== ccc.nil)
    throw new Error("Invalid form for 'define: too many arguments");

  return form.withCar(new ccc.NativeFunction(function(environment, continuation, args) {
    return function() {
      var location = environment.lookup(symbol.name);
      if (!location || location.constructor !== ccc.Location)
        environment.bindGlobal(symbol.name, args.car());
      else
        location.value_ = args.car();
      return continuation(ccc.unspecified);
    };
  }, 'bind-variable'));
});


/**
 * Mutate the value stored at a symbol's bound location. The symbol's binding
 * is captured at compile time and may be an unresolved GlobalBinding, a resolved
 * global variable Location, or a resolved LexicalBinding.
 *
 * The resulting run-time native function completes the binding resolution
 * if necessary and modifies the value stored at the bound location.
 */
ccc.PrimitiveTransformers["set!"] = new ccc.Transformer(function(environment, form) {
  if (form.constructor !== ccc.Pair)
    throw new Error("Invalid form for 'set!: not enough arguments");

  var symbol = form.car();
  if (symbol.constructor !== ccc.Symbol)
    throw new Error("Invalid form for 'set!: symbol expected as first argument");

  var rest = form.cdr();
  if (rest.constructor !== ccc.Pair)
    throw new Error("Invalid form for 'set!");

  if (rest.cdr() !== ccc.nil)
    throw new Error("Invalid form for 'set!: too many arguments");

  var binding = symbol.compile(environment);
  return form.withCar(new ccc.NativeFunction(function(environment, continuation, args) {
    return function() {
      var location = binding;
      if (binding.constructor === ccc.LexicalBinding)
        location = environment.lookupLocal(binding.id_);
      else if (binding.constructor === ccc.GlobalBinding)
        location = environment.lookup(binding.name_);
      if (!location)
        throw new Error("Unbound variable: " + symbol.name);
      location.value_ = args.car();
      return continuation(ccc.unspecified);
    };
  }, 'set-variable'));
});

/**
 * Lambda forms compile to a native function which, when applied, will return
 * a new Closure object to capture the calling environment along with leixcal
 * bindings corresponding to named arguments. The entire body is captured and
 * compiled within the new lexical environment, so that a compiled lambda
 * appears externally as (#<native-function-to-generate-a-closure>).
 */
ccc.PrimitiveTransformers["lambda"] = new ccc.Transformer(function(environment, form) {
  if (form.constructor !== ccc.Pair)
    throw new Error("Bad lambda body: " + form.toString());

  var argsForm = form.car();
  var body = form.cdr();
  if (body.constructor !== ccc.Pair)
    throw new Error("Bad lambda body: " + form.toString());

  var newEnvironment = new ccc.Environment(environment);
  var namedArgBindings = [];
  var argsTailBinding = ccc.nil;
  if (argsForm.constructor === ccc.Symbol) {
    argsTailBinding = newEnvironment.bindLexical(argsForm.name);
  } else if (argsForm.constructor === ccc.Pair) {
    var bindNamedArg = function(symbol) {
      if (symbol.constructor !== ccc.Symbol)
        throw new Error("Invalid args form");
      namedArgBindings.push(newEnvironment.bindLexical(symbol.name));
    };
    var bindArgsTail = function(symbol) {
      if (symbol.constructor !== ccc.Symbol)
        throw new Error("Invalid args form");
      argsTailBinding = newEnvironment.bindLexical(symbol.name);
    }
    argsForm.forEach(bindNamedArg, bindArgsTail);
  } else if (argsForm !== ccc.nil) {
    throw new Error("Invalid args form");
  }

  var compiledBody = [];
  body.forEach(function (form) {
      compiledBody.push(form.compile(newEnvironment));
    },
    function () {
      throw new Error("Invalid lambda body")
    });

  return new ccc.Pair(
    new ccc.NativeFunction(function(environment, continuation, args) {
        return function() {
          return continuation(new ccc.Closure(environment, compiledBody, namedArgBindings, argsTailBinding));
        };
      }, 'make-closure'),
    ccc.nil);
});

/**
 * Conditional. Like lambda, this form compiles to a single 0-argument native
 * function call. The conditional expression, the consequent, and the optional
 * alternate forms are compiled and held internally. When applied, the native
 * function evaluates the compiled conditional expression and then proceeds
 * by evaluating either the consequent or the alternate. */
ccc.PrimitiveTransformers["if"] = new ccc.Transformer(function(environment, form) {
  if (form.constructor !== ccc.Pair)
    throw new Error("Bad 'if form");

  var condition = form.car();
  var consequent = form.cdr();
  if (consequent === ccc.nil || consequent.constructor !== ccc.Pair)
    throw new Error("Bad 'if form");

  var alternate = consequent.cdr();
  consequent = consequent.car();

  if (alternate === ccc.nil) {
    alternate = ccc.unspecified;
  } else if (alternate.constructor === ccc.Pair) {
    if (alternate.cdr() !== ccc.nil)
      throw new Error("Bad 'if form");
    alternate = alternate.car();
  } else {
    throw new Error("Bad 'if form");
  }

  condition = condition.compile(environment);
  consequent = consequent.compile(environment);
  alternate = alternate.compile(environment);

  return new ccc.Pair(
    new ccc.NativeFunction(function(environment, continuation, args) {
      return function() {
        return condition.eval(environment, function(value) {
          if (value !== ccc.f)
            return consequent.eval(environment, continuation);
          return alternate.eval(environment, continuation);
        });
      };
    }, 'if'),
    ccc.nil);
});
