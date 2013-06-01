ccc.lib.base.registerEntries([
  {
    name: "call/cc",
    requiredArgs: ["procedure"],
    customContinuation: true,
    impl: function(proc) {
      var args = new ccc.Pair(new ccc.Continuation(this.continuation), ccc.nil);
      return proc.apply(this.environment, this.continuation, args);
    },
  },

  {
    name: "apply",
    requiredArgs: ["procedure"],
    optionalArgs: "any",
    customContinuation: true,
    impl: function(proc, args) {
      if (args === ccc.nil)
        throw new Error("apply: Not enough arguments");
      args = args.toArray();
      var tail = args[args.length - 1];
      if (tail !== ccc.nil && (tail.constructor !== ccc.Pair || !tail.isList()))
        throw new Error("apply: Wrong type for argument " + (args.length - 1));

      var firstArgs = args.slice(0, args.length - 1);
      for (var i = firstArgs.length - 1; i >= 0; --i)
        tail = new ccc.Pair(firstArgs[i], tail);

      return proc.apply(this.environment, this.continuation, tail);
    }
  },

  {
    name: "map",
    requiredArgs: ["procedure"],
    optionalArgs: "pair_or_nil",
    customContinuation: true,
    impl: function(proc, args) {
      if (args === ccc.nil)
        throw new Error("map: Not enough arguments");
      var lists = args.toArray();
      var environment = this.environment;
      var continuation = this.continuation;
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
        return proc.apply(environment, next, ccc.Pair.makeList.apply(null, args));
      };
      return doMap(lists, []);
    }
  },

  {
    name: "for-each",
    requiredArgs: ["procedure"],
    optionalArgs: "pair_or_nil",
    customContinuation: true,
    impl: function(proc, args) {
      if (args === ccc.nil)
        throw new Error("for-each: Not enough arguments");
      var lists = args.toArray();
      var environment = this.environment;
      var continuation = this.continuation;
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
        return proc.apply(environment, next, ccc.Pair.makeList.apply(null, args));
      };
      return doIteration(lists);
    }
  },
]);
