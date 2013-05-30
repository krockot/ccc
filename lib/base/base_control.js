// call-with-current-continuation
ccc.lib.base.addNativeFunction("call/cc", function(environment, continuation, args) {
  args = args.toArray();
  if (args.length !== 1)
    throw new Error("call/cc: Exactly 1 argument expected.");
  if (!(args[0].apply instanceof Function))
    throw new Error("call/cc: Object " + args[0] + " is not applicable.");
  return args[0].apply(environment, continuation, ccc.Pair.makeList(new ccc.Continuation(continuation)));
});
