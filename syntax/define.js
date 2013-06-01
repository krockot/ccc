/**
 * Define binds the given symbol name to a new location at runtime and assigns
 * the given value to that location. The symbol name is captured at compile
 * time, so
 *
 *   (define x (some expression))
 *
 * compiles to
 *
 *   (#<native-function-which-binds-x-to-arg1-value> (some expression))
 */
ccc.PrimitiveTransformers["define"] = new ccc.Transformer(function(environment, form) {
  if (form.constructor !== ccc.Pair)
    throw new Error("define: Bad form");

  // Transform the special (define (f . x) . y) form into a canonical
  // (define f (lambda x . y)) form.
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
    throw new Error("define: Bad form");

  var rest = form.cdr();
  if (rest.constructor !== ccc.Pair)
    throw new Error("define: Bad form");

  if (rest.cdr() !== ccc.nil)
    throw new Error("define: Bad form");

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
