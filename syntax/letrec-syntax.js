/**
 * letrec-syntax binds one or more keyword symbols to syntax transformers within
 * a newly derived enviornment.
 *
 * The bound syntax is visible to forms compiled within the letrec-syntax body
 * as well as within the transformer specification bodies themselves.
 */
ccc.PrimitiveTransformers["letrec-syntax"] = new ccc.Transformer(function(environment, form) {
  var fail = function() { throw new Error("letrec-syntax: Bad form"); };
  var expectPair = function(object) { if (object.constructor !== ccc.Pair) fail(); };

  expectPair(form);
  var bindingsForm = form.car();
  expectPair(bindingsForm);
  var body = form.cdr();
  expectPair(body);

  // Extend the body's environment with syntax bindings
  var newEnvironment = new ccc.Environment(environment);
  bindingsForm.forEach(
    function(binding) {
      expectPair(binding);
      expectPair(binding.cdr());
      if (binding.cdr().cdr() !== ccc.nil)
        fail();
      var symbol = binding.car();
      if (symbol.constructor !== ccc.Symbol)
        fail();
      var transformerSpec = binding.cdr().car();
      expectPair(transformerSpec);
      var transformer = transformerSpec.compile(newEnvironment);
      if (transformer.constructor !== ccc.Transformer)
        fail();
      newEnvironment.bindSyntax(symbol.name, transformer);
    },
    function() { fail(); });

  // Compile the body in the extended environment
  var compiledBody = [];
  body.forEach(
    function (form) { compiledBody.push(form.compile(newEnvironment)); },
    function () { fail(); });

  // Return a call to a run-time generated closure that encapsulates this
  // compiled body.
  return new ccc.Pair(new ccc.Pair(
    new ccc.NativeFunction(function(environment, continuation, args) {
        return function() {
          return continuation(new ccc.Closure(environment, compiledBody, [], []));
        };
      }, 'make-closure'),
    ccc.nil), ccc.nil);
});
