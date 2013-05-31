(function() {
  var requirePair = function(value, index, who) {
    if (value.constructor !== ccc.Pair)
      throw new Error(who + ": Argument " + index + " is not a pair.");
  };

  ccc.lib.base.addSimpleFunctions({
    // Return the first element of a pair
    "car": function(pair) {
      requirePair(pair, 0, "car");
      return pair.car();
    },

    // Return the second element of a pair
    "cdr": function(pair) {
      requirePair(pair, 0, "cdr");
      return pair.cdr();
    },

    // Construct a new pair from two arguments
    "cons": function(car, cdr) {
      return new ccc.Pair(car, cdr);
    },

    // Construct a list from arguments
    "list": function() {
      return ccc.Pair.makeList.apply(null, Array.prototype.slice.call(arguments));
    },

    // Change the car of a pair
    "set-car!": function(pair, value) {
      requirePair(pair, 0, "set-car!");
      pair.car_ = value;
    },

    // Change the cdr of a pair
    "set-cdr!": function(pair, value) {
      requirePair(pair, 0, "set-cdr!");
      pair.cdr_ = value;
    },

    // Determine the length of a proper list
    "length": function(list) {
      if (list === ccc.nil)
        return new ccc.Number(0);
      var count = 0;
      requirePair(list, 0, "length");
      list.forEach(
        function() { ++count },
        function() { throw new Error("length: Expected proper list"); });
      return new ccc.Number(count);
    },

    // Concatenate lists
    "append": function() {
      var args = Array.prototype.slice.call(arguments);
      var tail = args.length > 0 ? args[args.length - 1] : ccc.nil;
      for (var i = args.length - 2; i >= 0; --i) {
        var list = args[i];
        var items = [];
        if (list === ccc.nil)
          continue;
        requirePair(list, i, "append");
        list.forEach(
          function(value) { items.push(value); },
          function() { throw new Error("append: Argument " + i + " is not a proper list"); });
        while (items.length > 0) {
          tail = new ccc.Pair(items.pop(), tail);
        }
      }
      return tail;
    },

    // Reverse a list
    "reverse": function(list) {
      var reversed = ccc.nil;
      if (list === ccc.nil)
        return ccc.nil;
      requirePair(list, 0, "reverse");
      list.forEach(
          function(value) { reversed = new ccc.Pair(value, reversed); },
          function() { throw new Error("reverse: Expected proper list") });
      return reversed;
    },

    // Skip the first k elements of a list
    "list-tail": function(list, k) {
      if (k.constructor !== ccc.Number)
        throw new Error("list-tail: Argument 1 is not a number");
      if (k.value_ < 1)
        return list;
      k = k.value_;
      while (k > 0) {
        if (list.constructor !== ccc.Pair)
          throw new Error("list-tail: Wrong argument type");
        list = list.cdr();
        --k;
      }
      return list;
    },

    // Compute the k-th element of a list
    "list-ref": function(list, k) {
      if (k.constructor !== ccc.Number || k.value_ < 0)
        throw new Error("list-ref: Invalid index");
      k = k.value_;
      while (k > 0) {
        if (list.constructor !== ccc.Pair)
          throw new Error("list-ref: Wrong argument type");
        list = list.cdr();
        --k;
      }
      if (list.constructor !== ccc.Pair)
        throw new Error("list-ref: Wrong argument type");
      return list.car();
    },

    // List membership test over 'eq?
    "memq": function(object, list) {
      if (list === ccc.nil)
        return ccc.f;
      requirePair(list, 1, "memq");
      while (list.constructor === ccc.Pair) {
        if (object.eq(list.car()))
          return list;
        list = list.cdr();
      }
      if (list !== ccc.nil)
        throw new Error("memq: Improper list");
      return ccc.f;
    },

    // List membership test over 'eqv?
    "memv": function(object, list) {
      if (list === ccc.nil)
        return ccc.f;
      requirePair(list, 1, "memv");
      while (list.constructor === ccc.Pair) {
        if (object.eqv(list.car()))
          return list;
        list = list.cdr();
      }
      if (list !== ccc.nil)
        throw new Error("memv: Improper list");
      return ccc.f;
    },

    // List membership test over 'equal?
    "member": function(object, list) {
      if (list === ccc.nil)
        return ccc.f;
      requirePair(list, 1, "member");
      while (list.constructor === ccc.Pair) {
        if (object.equal(list.car()))
          return list;
        list = list.cdr();
      }
      if (list !== ccc.nil)
        throw new Error("member: Improper list");
      return ccc.f;
    },

    // Association list membership test with eq
    "assq": function(object, alist) {
      if (alist === ccc.nil)
        return ccc.f;
      requirePair(alist, 1, "assq");
      while (alist.constructor === ccc.Pair) {
        var pair = alist.car();
        if (pair.constructor !== ccc.Pair)
          throw new Error("assq: Invalid association list");
        if (object.eq(pair.car()))
          return pair;
        alist = alist.cdr();
      }
      if (alist !== ccc.nil)
        throw new Error("assq: Invalid association list");
      return ccc.f;
    },

    // Association list membership test with eqv
    "assv": function(object, alist) {
      if (alist === ccc.nil)
        return ccc.f;
      requirePair(alist, 1, "assv");
      while (alist.constructor === ccc.Pair) {
        var pair = alist.car();
        if (pair.constructor !== ccc.Pair)
          throw new Error("assv: Invalid association list");
        if (object.eqv(pair.car()))
          return pair;
        alist = alist.cdr();
      }
      if (alist !== ccc.nil)
        throw new Error("assv: Invalid association list");
      return ccc.f;
    },

    // Association list membership test with equal
    "assoc": function(object, alist) {
      if (alist === ccc.nil)
        return ccc.f;
      requirePair(alist, 1, "assoc");
      while (alist.constructor === ccc.Pair) {
        var pair = alist.car();
        if (pair.constructor !== ccc.Pair)
          throw new Error("assoc: Invalid association list");
        if (object.equal(pair.car()))
          return pair;
        alist = alist.cdr();
      }
      if (alist !== ccc.nil)
        throw new Error("assoc: Invalid association list");
      return ccc.f;
    },
  });

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
   "dada", "dadd", "ddaa", "ddad", "ddda", "dddd"].
     forEach(makeListAccessor);
}());

