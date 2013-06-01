/**
 * letrec-syntax binds one or more keyword symbols to syntax transformers within
 * a newly derived enviornment.
 *
 * The bound syntax is only visible to forms compiled within the
 * letrec-syntax body.
 *
 * Unlike let-syntax, each keyword binding established within a letrec-syntax
 * form is visible to all syntax rules within the form.
 */
ccc.PrimitiveTransformers["letrec-syntax"] = new ccc.Transformer(function(environment, form) {
  if (form.constructor !== ccc.Pair)
    throw new Error("letrec-syntax: Bad form");

  throw new Error("letrec-syntax: NYI");
});
