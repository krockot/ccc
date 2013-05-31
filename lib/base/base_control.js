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
  if (args.length < 2)
    throw new Error("apply: At least 2 arguments expected");
  var fn = args[0];
  if (!(fn.apply instanceof Function))
    throw new Error("apply: Object " + fn + " is not applicable.");

  var tail = args[args.length - 1];
  if (tail !== ccc.nil && (tail.constructor !== ccc.Pair || !tail.isList()))
    throw new Error("apply: Argument " + (args.length - 1) + " is not a list");

  var firstArgs = args.slice(1, args.length - 1);
  for (var i = firstArgs.length - 1; i >= 0; --i)
    tail = new ccc.Pair(firstArgs[i], tail);

  return fn.apply(environment, continuation, tail);
});

ccc.lib.base.addNativeFunction("map", function(environment, continuation, args) {
  args = args.toArray();
  if (args.length < 2)
    throw new Error("map: At least 2 arguments expected; received " + args.length);

  var fn = args[0];
  if (!(fn.apply instanceof Function))
    throw new Error("map: Object " + fn + " is not applicable");

  var lists = args.slice(1);
  lists.forEach(function(value, index) {
    if (value !== ccc.nil && value.constructor !== ccc.Pair)
      throw new Error("map: Argument " + (index + 1) + " is not a list");
  });

  var doMap = function(lists, result) {
    var args = [];
    for (var i = 0; i < lists.length; ++i) {
      if (lists[i] === ccc.nil)
        return continuation(ccc.Pair.makeList.apply(null, result));
      args.push(lists[i].car_);
    }
    var next = function(value) {
      return doMap(lists.map(function(list) { return list.cdr_; }), result.concat(value));
    };
    return fn.apply(environment, next, ccc.Pair.makeList.apply(null, args));
  };

  return doMap(lists, []);
});

ccc.lib.base.addNativeFunction("for-each", function(environment, continuation, args) {
  args = args.toArray();
  if (args.length < 2)
    throw new Error("for-each: At least 2 arguments expected; received " + args.length);

  var fn = args[0];
  if (!(fn.apply instanceof Function))
    throw new Error("for-each: Object " + fn + " is not applicable");

  var lists = args.slice(1);
  lists.forEach(function(value, index) {
    if (value !== ccc.nil && value.constructor !== ccc.Pair)
      throw new Error("for-each: Argument " + (index + 1) + " is not a list");
  });

  var doIteration = function(lists) {
    var args = [];
    for (var i = 0; i < lists.length; ++i) {
      if (lists[i] === ccc.nil)
        return continuation(ccc.unspecified);
      args.push(lists[i].car_);
    }
    var next = function(value) {
      return doIteration(lists.map(function(list) { return list.cdr_; }));
    };
    return fn.apply(environment, next, ccc.Pair.makeList.apply(null, args));
  };

  return doIteration(lists);
});

