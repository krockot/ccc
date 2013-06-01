/**
 * let-syntax binds one or more keyword symbols to syntax transformers within
 * a newly derived enviornment.
 *
 * The bound syntax is only visible to forms compiled within the
 * let-syntax body.
 */
ccc.PrimitiveTransformers["let-syntax"] = new ccc.Transformer(function(environment, form) {
  if (form.constructor !== ccc.Pair)
    throw new Error("let-syntax: Bad form");

  throw new Error("let-syntax: NYI");
});
