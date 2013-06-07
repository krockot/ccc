/**
 * define-syntax binds a top-level keyword symbol to syntax transformer.
 */
ccc.PrimitiveTransformers["define-syntax"] = new ccc.Transformer(function(environment, form) {
  var fail = function() { throw new Error("define-syntax: Bad form"); };

  if (!environment.isTopLevel())
    throw new Error("define-syntax: Invalid outside of top-level environment");

  form = form.cdr();
  if (form.constructor !== ccc.Pair)
    fail();

  var symbol = form.car();
  if (symbol.constructor !== ccc.Symbol)
    fail();

  form = form.cdr();
  var transformerSpec = form.car();
  if (form.cdr() !== ccc.nil)
    fail();

  var transformer = transformerSpec.compile(environment);
  if (transformer.constructor !== ccc.Transformer)
    fail();

  environment.bindSyntax(symbol.name, transformer);
  return ccc.unspecified;
});
