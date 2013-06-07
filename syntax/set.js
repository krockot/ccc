/**
 * set! mutates the value stored at a symbol's bound location. The symbol's binding
 * is captured at compile time and may be an unresolved GlobalBinding, a resolved
 * global variable Location, or a resolved LexicalBinding.
 *
 * The resulting generated native function completes the binding resolution
 * at run-time if necessary and updates the value stored at the bound location
 * with its first and only argument.
 *
 * It is a fatal error if the binding cannot be resolved at run-time.
 */
ccc.PrimitiveTransformers["set!"] = new ccc.Transformer(function(environment, form) {
  form = form.cdr();
  if (form.constructor !== ccc.Pair)
    throw new Error("set!: Bad form");

  var symbol = form.car();
  if (symbol.constructor !== ccc.Symbol)
    throw new Error("set!: Bad form");

  var rest = form.cdr();
  if (rest.constructor !== ccc.Pair)
    throw new Error("set!: Bad form");

  if (rest.cdr() !== ccc.nil)
    throw new Error("set!: Bad form");

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
