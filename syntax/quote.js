/**
 * quote compiles to a form that evaluates to its only literal argument. So
 *
 *   (quote (1 2 3))
 *
 * compiles to
 *
 *   (#<native-funtion-foo>)
 *
 * Where #<native-function-foo> is a compile-time generated function that always
 * returns the list '(1 2 3).
 */
ccc.PrimitiveTransformers["quote"] = new ccc.Transformer(function(environment, form) {
  form = form.cdr();
  if (form.constructor !== ccc.Pair)
    throw new Error("quote: Bad form");
  if (form.cdr() !== ccc.nil)
    throw new Error("quote: Bad form");

  var datum = form.car();
  return new ccc.Pair(
    new ccc.NativeFunction(function(environment, continuation, args) {
        return function() {
          return continuation(datum);
        };
      }, 'quote'),
    ccc.nil);
});
