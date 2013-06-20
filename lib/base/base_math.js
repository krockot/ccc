(function() {
  var simpleMathWrapper = function(name, fn) {
    return {
      name: name,
      requiredArgs: ["number"],
      impl: function(number) {
        return new ccc.Number(fn(number.value_));
      }
    };
  };

  var orderingPredicate = function(name, comparator) {
    return {
      name: name,
      optionalArgs: "number",
      impl: function(args) {
        args = args.toArray();
        var previous = args[0];
        for (var i = 1; i < args.length; ++i) {
          if (!comparator(previous.value_, args[i].value_))
            return ccc.f;
          previous = args[i];
        }
        return ccc.t;
      }
    };
  };

  ccc.lib.base.registerEntries([
    {
      name: "+",
      optionalArgs: "number",
      impl: function(args) {
        var sum = 0;
        args.toArray().forEach(function(value) { sum += value.value_; });
        return new ccc.Number(sum);
      }
    },

    {
      name: "*",
      optionalArgs: "number",
      impl: function(args) {
        var product = 1;
        args.toArray().forEach(function(value) { product *= value.value_; });
        return new ccc.Number(product);
      }
    },

    {
      name: "-",
      requiredArgs: ["number"],
      optionalArgs: "number",
      impl: function(first, args) {
        first = first.value_;
        if (args === ccc.nil)
          return new ccc.Number(-first);
        args.forEach(function(value) { first -= value.value_; });
        return new ccc.Number(first);
      }
    },

    {
      name: "/",
      requiredArgs: ["number"],
      optionalArgs: "number",
      impl: function(first, args) {
        first = first.value_;
        if (args === ccc.nil)
          return new ccc.Number(1 / first);
        args.forEach(function(value) { first /= value.value_; });
        return new ccc.Number(first);
      }
    },

    {
      name: "integer?",
      requiredArgs: ["number"],
      impl: function(number) {
        return (number.value_ === number.value_|0) ? ccc.t : ccc.f;
      }
    },

    {
      name: "zero?",
      requiredArgs: ["number"],
      impl: function(number) {
        return number.value_ === 0 ? ccc.t : ccc.f;
      }
    },

    {
      name: "positive?",
      requiredArgs: ["number"],
      impl: function(number) {
        return number.value_ > 0 ? ccc.t : ccc.f;
      }
    },

    {
      name: "negative?",
      requiredArgs: ["number"],
      impl: function(number) {
        return number.value_ < 0 ? ccc.t : ccc.f;
      }
    },

    {
      name: "even?",
      requiredArgs: ["number"],
      impl: function(number) {
        return number.value_ % 2 === 0 ? ccc.t : ccc.f;
      }
    },

    {
      name: "odd?",
      requiredArgs: ["number"],
      impl: function(number) {
        return number.value_ % 2 === 1 ? ccc.t : ccc.f;
      }
    },

    {
      name: "max",
      requiredArgs: ["number"],
      optionalArgs: "number",
      impl: function(number, rest) {
        var numbers = rest.toArray().concat(number);
        var max = Math.max.apply(Math,
          numbers.map(function(n) { return n.value_; }));
        return new ccc.Number(max);
      }
    },

    {
      name: "min",
      requiredArgs: ["number"],
      optionalArgs: "number",
      impl: function(number, rest) {
        var numbers = rest.toArray().concat(number);
        var max = Math.min.apply(Math,
          numbers.map(function(n) { return n.value_; }));
        return new ccc.Number(max);
      }
    },

    {
      name: "modulo",
      requiredArgs: ["number", "number"],
      impl: function(dividend, divisor) {
        return new ccc.Number(dividend.value_ % divisor.value_);
      }
    },

    simpleMathWrapper("abs", Math.abs),
    simpleMathWrapper("floor", Math.floor),
    simpleMathWrapper("ceiling", Math.ceil),
    simpleMathWrapper("exp", Math.exp),
    simpleMathWrapper("log", Math.log),
    simpleMathWrapper("sin", Math.sin),
    simpleMathWrapper("cos", Math.cos),
    simpleMathWrapper("tan", Math.tan),
    simpleMathWrapper("asin", Math.asin),
    simpleMathWrapper("acos", Math.acos),
    simpleMathWrapper("sqrt", Math.sqrt),

    {
      name: "expt",
      requiredArgs: ["number", "number"],
      impl: function(base, exponent) {
        return new ccc.Number(Math.pow(base, exponent));
      }
    },

    {
      name: "atan",
      requiredArgs: ["number"],
      optionalArgs: ["number"],
      impl: function(r, x) {
        if (x === ccc.unspecified)
          return Math.atan(r.value_);
        return Math.atan2(r.value_, x.value_);
      }
    },

    orderingPredicate("=", function(a, b) { return a === b; }),
    orderingPredicate("<", function(a, b) { return a < b; }),
    orderingPredicate(">", function(a, b) { return a > b; }),
    orderingPredicate("<=", function(a, b) { return a <= b; }),
    orderingPredicate(">=", function(a, b) { return a >= b; }),
  ]);
}());

