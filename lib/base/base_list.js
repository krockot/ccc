(function() {
  var listSearch = function(name, predicate) {
    return {
      name: name,
      requiredArgs: ["any", "pair_or_nil"],
      impl: function(object, list) {
        if (list === ccc.nil)
          return ccc.f;
        while (list.constructor === ccc.Pair) {
          var result = predicate(object, list);
          if (result)
            return result;
          list = list.cdr();
        }
        if (list !== ccc.nil)
          throw new Error(name + ": Argument 1 is not a proper list");
        return ccc.f;
      }
    };
  };

  ccc.lib.base.registerEntries([
    {
      name: "car",
      requiredArgs: ["pair"],
      impl: function(pair) { return pair.car(); }
    },

    {
      name: "cdr",
      requiredArgs: ["pair"],
      impl: function(pair) { return pair.cdr(); }
    },

    {
      name: "cons",
      requiredArgs: ["any", "any"],
      impl: function(car, cdr) { return new ccc.Pair(car, cdr); }
    },

    {
      name: "list",
      optionalArgs: "any",
      impl: function(args) { return args; }
    },

    {
      name: "set-car!",
      requiredArgs: ["pair", "any"],
      impl: function(pair, value) { pair.car_ = value; }
    },

    {
      name: "set-cdr!",
      requiredArgs: ["pair", "any"],
      impl: function(pair, value) { pair.cdr_ = value; }
    },

    {
      name: "length",
      requiredArgs: ["pair_or_nil"],
      impl: function(list) {
        if (list === ccc.nil)
          return new ccc.Number(0);
        var count = 0;
        list.forEach(
          function() { ++count },
          function() { throw new Error("length: Expected proper list"); });
        return new ccc.Number(count);
      }
    },

    {
      name: "append",
      optionalArgs: "any",
      impl: function(args) {
        if (args.length === 0)
          return ccc.nil;
        args = args.toArray();
        var tail = args[args.length - 1];
        for (var i = args.length - 2; i >= 0; --i) {
          var list = args[i], items = [];
          if (list === ccc.nil)
            continue;
          if (list.constructor !== ccc.Pair)
            throw new Error("append: Argument: " + i + " is not a list");
          list.forEach(
              function(value) { items.push(value); },
              function() { throw new Error("append: Argument " + i + " is not a proper list"); });
          while (items.length > 0) {
            tail = new ccc.Pair(items.pop(), tail);
          }
        }
        return tail;
      }
    },

    // Reverse a list
    {
      name: "reverse",
      requiredArgs: ["pair_or_nil"],
      impl: function(list) {
        if (list === ccc.nil)
          return ccc.nil;
        var reversed = ccc.nil;
        list.forEach(
            function(value) { reversed = new ccc.Pair(value, reversed); },
            function() { throw new Error("reverse: Argument 0 is not a proper list"); });
        return reversed;
      }
    },

    // Skip the first k elements of a list
    {
      name: "list-tail",
      requiredArgs: ["pair_or_nil", "integer"],
      impl: function(list, k) {
        k = k.value_;
        while (k > 0) {
          if (list.constructor !== ccc.Pair)
            throw new Error("list-tail: Wrong argument type");
          list = list.cdr();
          --k;
        }
        return list;
      }
    },

    // Compute the k-th element of a list
    {
      name: "list-ref",
      requiredArgs: ["pair", "integer"],
      impl: function(list, k) {
        if (k.value_ < 0)
          throw new Error("list-ref: Index out of bounds");
        k = k.value_;
        while (k > 0) {
          if (list.constructor !== ccc.Pair)
            throw new Error("list-ref: Index out of bounds");
          list = list.cdr();
          --k;
        }
        if (list.constructor !== ccc.Pair)
          throw new Error("list-ref: Index out of bounds");
        return list.car();
      }
    },

    listSearch("memq", function(object, list) {
      if (object.eq(list.car()))
        return list;
      return false;
    }),

    listSearch("memv", function(object, list) {
      if (object.eqv(list.car()))
        return list;
      return false;
    }),

    listSearch("member", function(object, list) {
      if (object.equal(list.car()))
        return list;
      return false;
    }),

    listSearch("assq", function(object, alist) {
      var pair = alist.car();
      if (pair.constructor !== ccc.Pair)
        throw new Error("assq: Argument 1 is not an association list");
      if (object.eq(pair.car()))
        return pair;
      return false;
    }),

    listSearch("assv", function(object, alist) {
      var pair = alist.car();
      if (pair.constructor !== ccc.Pair)
        throw new Error("assv: Argument 1 is not an association list");
      if (object.eqv(pair.car()))
        return pair;
      return false;
    }),

    listSearch("assoc", function(object, alist) {
      var pair = alist.car();
      if (pair.constructor !== ccc.Pair)
        throw new Error("assoc: Argument 1 is not an association list");
      if (object.equal(pair.car()))
        return pair;
      return false;
    }),
  ]);

  var makeListAccessor = function(combo) {
    var name = "c" + combo + "r";
    var fnMap = { a: ccc.Pair.prototype.car, d: ccc.Pair.prototype.cdr };
    var fns = combo.split("").map(function(which) { return fnMap[which]; });
    fns.reverse();
    ccc.lib.base.addSimpleFunction(name, function(list) {
      fns.forEach(function(fn) {
        if (list.constructor !== ccc.Pair)
          throw new Error(name + ": Pair expected");
        list = fn.apply(list);
      });
      return list;
    });
  };

  ["aa", "ad", "da", "dd", "aaa", "aad", "ada", "add", "daa", "dad", "dda", "ddd",
   "aaaa", "aaad", "aada", "aadd", "adaa", "adad", "adda", "addd", "daaa", "daad",
   "dada", "dadd", "ddaa", "ddad", "ddda", "dddd"].forEach(makeListAccessor);
}());

