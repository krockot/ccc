/**
 * Lambda forms compile to a native function which, when applied, will return
 * a new Closure object to capture the calling environment along with leixcal
 * bindings corresponding to named arguments.
 *
 * The entire body is captured and compiled within the new lexical environment,
 * so that a compiled lambda appears externally as a black-box 0-argument
 * call (#<native-function-to-generate-a-closure>).
 */
ccc.PrimitiveTransformers["\u03bb"] =
ccc.PrimitiveTransformers["lambda"] = new ccc.Transformer(function(environment, form) {
  form = form.cdr();
  if (form.constructor !== ccc.Pair)
    throw new Error("lambda: Bad form");

  var argsForm = form.car();
  var body = form.cdr();
  if (body.constructor !== ccc.Pair)
    throw new Error("lambda: Bad form");

  var newEnvironment = new ccc.Environment(environment);
  var namedArgBindings = [];
  var argsTailBinding = ccc.nil;
  if (argsForm.constructor === ccc.Symbol) {
    argsTailBinding = newEnvironment.bindLexical(argsForm.name);
  } else if (argsForm.constructor === ccc.Pair) {
    var bindNamedArg = function(symbol) {
      if (symbol.constructor !== ccc.Symbol)
        throw new Error("lambda: Bad form");
      namedArgBindings.push(newEnvironment.bindLexical(symbol.name));
    };
    var bindArgsTail = function(symbol) {
      if (symbol.constructor !== ccc.Symbol)
        throw new Error("lambda: Bad form");
      argsTailBinding = newEnvironment.bindLexical(symbol.name);
    }
    argsForm.forEach(bindNamedArg, bindArgsTail);
  } else if (argsForm !== ccc.nil) {
    throw new Error("lambda: Bad form");
  }

  var compiledBody = [];
  body.forEach(
    function (form) { compiledBody.push(form.compile(newEnvironment)); },
    function () { throw new Error("lambda: Bad form"); });

  return new ccc.Pair(
    new ccc.NativeFunction(function(environment, continuation, args) {
        return function() {
          return continuation(new ccc.Closure(environment, compiledBody, namedArgBindings, argsTailBinding));
        };
      }, 'make-closure'),
    ccc.nil);
});
