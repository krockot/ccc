/**
 * syntax-rules generates a dynamic Transformer object at compile-time to be
 * bound using either define-syntax, let-syntax, or letrec-syntax.
 *
 * Any free symbols within a rule expansion form are bound at compile-time
 * according to the environment of their parent syntax-rules form.
 */
ccc.PrimitiveTransformers["syntax-rules"] = new ccc.Transformer(function(environment, form) {
  if (form.constructor !== ccc.Pair)
    throw new Error("syntax-rules: Bad form");

  throw new Error("syntax-rules: NYI");
});
