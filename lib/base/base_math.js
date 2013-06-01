(function() {
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
  ]);
  ccc.lib.base.addSimpleFunctions({
    // Is it an integer?
    "integer?": function(number) {
      if (number.constructor === ccc.Number && number.value_ === (number.value_ | 0))
        return ccc.t;
      return ccc.f;
    },

    // Is a number zero?
    "zero?": function(number) {
      requireNumber(number, 0, "zero?");
      return number.value_ === 0 ? ccc.t : ccc.f;
    },

    // Is a number positive?
    "positive?": function(number) {
      requireNumber(number, 0, "positive?");
      return number.value_ > 0 ? ccc.t : ccc.f;
    },

    // Is a number negative?
    "negative?": function(number) {
      requireNumber(number, 0, "negative?");
      return number.value_ < 0 ? ccc.t : ccc.f;
    },

    // Is a number an even integer?
    "even?": function(number) {
      requireNumber(number, 0, "even?");
      return number.value_ % 2 === 0 ? ccc.t : ccc.f;
    },

    // Is a number an odd integer?
    "odd?": function(number) {
      requireNumber(number, 0, "odd?");
      return number.value_ % 2 === 1 ? ccc.t : ccc.f;
    },

    // Return the maximum argument value
    "max": function() {
      var args = Array.prototype.slice.call(arguments);
      if (args.length === 0)
        throw new Error("max: Expected at least 1 argument");
      var max = args[0];
      requireNumber(max, 0, "max");
      args.slice(1).forEach(function(value, index) {
        requireNumber(value, index + 1, "max");
        if (value.value_ > max.value_)
          max = value;
      });
      return max;
    },

    // Return the minimum argument value
    "min": function() {
      var args = Array.prototype.slice.call(arguments);
      if (args.length === 0)
        throw new Error("min: Expected at least 1 argument");
      var min = args[0];
      requireNumber(min, 0, "min");
      args.slice(1).forEach(function(value, index) {
        requireNumber(value, index + 1, "min");
        if (value.value_ < min.value_)
          min = value;
      });
      return min;
    },

    // Compute a % b
    "modulo": function(a, b) {
      requireNumber(a, 0, "modulo");
      requireNumber(b, 1, "modulo");
      return new ccc.Number(a.value_ % b.value_);
    },
  });

  var wrapMathFunction = function(fn, name) {
    ccc.lib.base.addSimpleFunction(name, function() {
      var args = Array.prototype.slice.call(arguments);
      if (args.length !== fn.length)
        throw new Error(name + ": Expected exactly " + fn.length + " arguments");
      var nativeArgs = args.map(function(value, index) {
        requireNumber(value, index, name);
        return value.value_;
      });
      return new ccc.Number(fn.apply(null, nativeArgs));
    });
  };

  wrapMathFunction(Math.abs, "abs");
  wrapMathFunction(Math.floor, "floor");
  wrapMathFunction(Math.ceil, "ceiling");
  wrapMathFunction(Math.exp, "exp");
  wrapMathFunction(Math.log, "log");
  wrapMathFunction(Math.sin, "sin");
  wrapMathFunction(Math.cos, "cos");
  wrapMathFunction(Math.tan, "tan");
  wrapMathFunction(Math.asin, "asin");
  wrapMathFunction(Math.acos, "acos");
  wrapMathFunction(Math.sqrt, "sqrt");
  wrapMathFunction(Math.pow, "expt");

  ccc.lib.base.addSimpleFunction("atan", function() {
    var args = Array.prototype.slice.call(arguments);
    if (args.length < 1 || args.length > 2)
      throw new Error("atan: Expected 1 or 2 arguments");
    requireNumber(args[0], 0, "atan");
    if (args.length === 1)
      return new ccc.Number(Math.atan(args[0].value_));
    requireNumber(args[1], 1, "atan");
    return new ccc.Number(Math.atan2(args[0].value_, args[1].value_));
  });

  var addComparisonPredicate = function(name, comparator) {
    ccc.lib.base.addSimpleFunction(name, function() {
      var args = Array.prototype.slice.call(arguments);
      if (args.length < 2)
        return ccc.t;
      var previous = args[0];
      requireNumber(previous, 0, name);
      for (var i = 1; i < args.length; ++i) {
        requireNumber(args[i], i, name);
        if (!comparator(previous.value_, args[i].value_))
          return ccc.f;
        previous = args[i];
      }
      return ccc.t;
    });
  };

  addComparisonPredicate("=", function(a, b) { return a === b; });
  addComparisonPredicate("<", function(a, b) { return a < b; });
  addComparisonPredicate(">", function(a, b) { return a > b; });
  addComparisonPredicate("<=", function(a, b) { return a <= b; });
  addComparisonPredicate(">=", function(a, b) { return a >= b; });
}());

