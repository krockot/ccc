(function() {
  var simplePredicate = function(name, fn) {
    return {
      name: name,
      requiredArgs: ["any"],
      impl: function(value) {
        return fn(value) ? ccc.t : ccc.f;
      }
    };
  };

  var simpleTypePredicate = function(name, type) {
    return {
      name: name,
      requiredArgs: ["any"],
      impl: function(value) {
        return value.constructor === type ? ccc.t : ccc.f;
      }
    };
  };

  var equalityPredicate = function(name, comparator) {
    return {
      name: name,
      optionalArgs: "any",
      impl: function(args) {
        if (args === ccc.nil)
          return ccc.t;
        var first = args.car_;
        for (args = args.cdr_; args !== ccc.nil; args = args.cdr_) {
          if (!comparator(first, args.car_))
            return ccc.f;
        }
        return ccc.t;
      }
    };
  };

  ccc.lib.base.registerEntries([
    simpleTypePredicate("boolean?", ccc.Boolean),
    simpleTypePredicate("number?", ccc.Number),
    simpleTypePredicate("string?", ccc.String),
    simpleTypePredicate("char?", ccc.Char),
    simpleTypePredicate("symbol?", ccc.Symbol),
    simpleTypePredicate("pair?", ccc.Pair),
    simpleTypePredicate("vector?", ccc.Vector),

    simplePredicate("null?", function(value) { return value === ccc.nil; }),
    simplePredicate("procedure?", function(value) { return value.apply instanceof Function; }),

    equalityPredicate("eq?", function(a, b) { return a.eq(b); }),
    equalityPredicate("eqv?", function(a, b) { return a.eqv(b); }),
    equalityPredicate("equal?", function(a, b) { return a.equal(b); }),

    simplePredicate("not", function(value) { return value === ccc.f }),
  ]);
}());

