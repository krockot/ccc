// call-with-current-continuation
ccc.lib.base.addNativeFunction("call/cc", function(environment, continuation, args) {
  args = args.toArray();
  if (args.length !== 1)
    throw new Error("call/cc: Exactly 1 argument expected.");
  if (!(args[0].apply instanceof Function))
    throw new Error("call/cc: Object " + args[0] + " is not applicable.");
  return args[0].apply(environment, continuation, ccc.Pair.makeList(new ccc.Continuation(continuation)));
});

ccc.lib.base.addNativeFunction("apply", function(environment, continuation, args) {
  args = args.toArray();
  if (args.length !== 2)
    throw new Error("apply: Exactly 2 arguments expected");
  var fn = args[0];
  if (!(fn.apply instanceof Function))
    throw new Error("apply: Object " + fn + " is not applicable.");
  args = args[1];
  if (args !== ccc.nil && (args.constructor !== ccc.Pair || !args.isList()))
    throw new Error("apply: Argument 1 is not a list");
  return fn.apply(environment, continuation, args);
});
