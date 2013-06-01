/**
 * Conditional form.
 *
 * This form compiles to a single 0-argument native function call.
 *
 * The conditional expression, the consequent, and the optional
 * alternate forms are compiled and held internally.
 *
 * When called, the native function evaluates the compiled conditional
 * expression and then continues by evaluating either the consequent or
 * the alternate appropriately.
 */
ccc.PrimitiveTransformers["if"] = new ccc.Transformer(function(environment, form) {
  if (form.constructor !== ccc.Pair)
    throw new Error("if: Bad form");

  var condition = form.car();
  var consequent = form.cdr();
  if (consequent === ccc.nil || consequent.constructor !== ccc.Pair)
    throw new Error("if: Bad form");

  var alternate = consequent.cdr();
  consequent = consequent.car();

  if (alternate === ccc.nil) {
    alternate = ccc.unspecified;
  } else if (alternate.constructor === ccc.Pair) {
    if (alternate.cdr() !== ccc.nil)
      throw new Error("if: Bad form");
    alternate = alternate.car();
  } else {
    throw new Error("if: Bad form");
  }

  condition = condition.compile(environment);
  consequent = consequent.compile(environment);
  alternate = alternate.compile(environment);

  return new ccc.Pair(
    new ccc.NativeFunction(function(environment, continuation, args) {
      return function() {
        return condition.eval(environment, function(value) {
          if (value !== ccc.f)
            return consequent.eval(environment, continuation);
          return alternate.eval(environment, continuation);
        });
      };
    }, 'if'),
    ccc.nil);
});
