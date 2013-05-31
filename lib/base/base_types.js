(function() {
  var simplePredicate = function(fn) {
    return function(value) {
      return fn(value) ? ccc.t : ccc.f;
    };
  };

  var simpleTypePredicate = function(type) {
    return function(value) {
      return value.constructor === type ? ccc.t : ccc.f;
    };
  };

  var equalityPredicate = function(comparator) {
    return function() {
      var result = true;
      if (arguments.length < 2)
        return ccc.t;
      var first = arguments[0];
      for (var i = 1; i < arguments.length && result; ++i)
        result = result && comparator(first, arguments[i]);
      return result ? ccc.t : ccc.f;
    };
  };

  ccc.lib.base.addSimpleFunctions({
    // Test for Boolean type
    "boolean?": simpleTypePredicate(ccc.Boolean),

    // Test for numeric type
    "number?": simpleTypePredicate(ccc.Number),

    // Test for string type
    "string?": simpleTypePredicate(ccc.String),

    // Test for char type
    "char?": simpleTypePredicate(ccc.Char),

    // Test for symbol type
    "symbol?": simpleTypePredicate(ccc.Symbol),

    // Test for pair type
    "pair?": simpleTypePredicate(ccc.Pair),

    // Test for vector type
    "vector?": simpleTypePredicate(ccc.Vector),

    // Test for empty list
    "null?": simplePredicate(function(value) { return value === ccc.nil }),

    // Test for applicable object
    "procedure?": simplePredicate(function(value) { return value.apply instanceof Function }),

    // Strictest equality test
    "eq?": equalityPredicate(function(a, b) { return a.eq(b); }),

    // Potentially relaxed equality test
    "eqv?": equalityPredicate(function(a, b) { return a.eqv(b); }),

    // Most relaxed equality test, with support for vector and list recursion.
    "equal?": equalityPredicate(function(a, b) { return a.equal(b); }),

    // Boolean negation. Returns #t if argument is #f; return #f otherwise.
    "not": simplePredicate(function(value) { return value === ccc.f }),
  });
}());
