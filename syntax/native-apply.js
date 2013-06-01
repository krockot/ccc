/**
 * Native function call.
 *
 * Takes a symbol or list of symbols and attempts to resolve a qualified name
 * within the native window object.
 *
 * The qualified object will be called as a function with inputs automatically
 * coerced into equivalent native types.
 *
 * The function's return value will be mapped to an appropriate Object type if
 * possible.
 */
ccc.PrimitiveTransformers["native-apply"] = new ccc.Transformer(function(environment, form) {
  if (form.constructor !== ccc.Pair)
    throw new Error("native-apply: Bad form");

  var name = form.car();
  return form.withCar(new ccc.NativeFunction(function(environment, continuation, args) {
    args = args.toArray();
    return function() {
      var fn = ccc.libutil.resolveNativeName(name);
      args = args.map(ccc.libutil.objectToNativeValue);
      var result = ccc.libutil.objectFromNativeValue(fn.value.apply(fn.object, args));
      return continuation(result);
    };
  }, 'native-apply'));
});
