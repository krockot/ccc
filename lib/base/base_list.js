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
  });
}());
