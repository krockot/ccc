/**
 * define-syntax binds a top-level keyword symbol to syntax transformer.
 */
ccc.PrimitiveTransformers["define-syntax"] = new ccc.Transformer(function(environment, form) {
  if (form.constructor !== ccc.Pair)
    throw new Error("define-syntax: Bad form");

  throw new Error("define-syntax: NYI");
});
