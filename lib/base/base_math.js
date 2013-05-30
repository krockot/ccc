(function() {
  var requireNumber = function(value, index, who) {
    if (value.constructor !== ccc.Number)
      throw new Error(who + ": Argument " + index + " is not a number");
  };

  ccc.lib.base.addSimpleFunctions({
    // Sum 0 or more numeric arguments.
    "+": function() {
      var sum = 0;
      Array.prototype.forEach.call(arguments, function(value, index) {
        requireNumber(value, index, "+");
        sum += value.value_;
      });
      return new ccc.Number(sum);
    },

    // Multiply 0 or more numeric arguments.
    "*": function() {
      var product = 1;
      Array.prototype.forEach.call(arguments, function(value, index) {
        requireNumber(value, index, "*");
        product *= value.value_;
      });
      return new ccc.Number(product);
    },

    // Subtract 1 or more numeric arguments from the first numeric argument.
    // If only one argument is given, its additive inverse is returned.
    "-": function() {
      var sum;
      if (arguments.length === 0)
        throw new Error("-: Not enough arguments applied");
      requireNumber(arguments[0], 0, "-");
      if (arguments.length === 1)
        return new ccc.Number(-arguments[0].value_);
      else
        sum = arguments[0].value_;
      Array.prototype.slice.call(arguments, 1).forEach(function(value, index) {
        requireNumber(value, index + 1, "-");
        sum -= value.value_;
      });
      return new ccc.Number(sum);
    },

    // Divide 1 or more numeric arguments into the first numeric argument.
    // If only one argument is given, its multiplicative inverse is returned.
    "/": function() {
      var product;
      if (arguments.length === 0)
        throw new Error("/: Not enough arguments applied");
      requireNumber(arguments[0], 0, "/");
      if (arguments.length === 1)
        return new ccc.Number(1 / arguments[0].value_);
      else
        product = arguments[0].value_;
      Array.prototype.slice.call(arguments, 1).forEach(function(value, index) {
        requireNumber(value, index + 1, "/");
        product /= value.value_;
      });
      return new ccc.Number(product);
    },
  });
}());
