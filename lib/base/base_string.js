(function() {
  var requireString = function(value, index, who) {
    if (value.constructor !== ccc.String)
      throw new Error(who + ": Argument " + index + " is not a string");
  };

  var requireNumber = function(value, index, who) {
    if (value.constructor !== ccc.Number)
      throw new Error(who + ": Argument " + index + " is not a number");
  };

  ccc.lib.base.addSimpleFunctions({
    // Create symbol named from a string
    "string->symbol": function(string) {
      requireString(string, 0, "string->symbol");
      return new ccc.Symbol(string.value_);
    },

    // Get symbol name as a string
    "symbol->string": function(symbol) {
      if (symbol.constructor !== ccc.Symbol)
        throw new Error("symbol->string: Expected symbol; received " + symbol);
      return new ccc.String(symbol.name);
    },

    // Stringify a numeric value
    "number->string": function() {
      var args = Array.prototype.slice.call(arguments);
      var base = 10;
      if (args.length < 1 || args.length > 2)
        throw new Error("number->string: Expected 1 or 2 arguments");
      requireNumber(args[0], 0, "number->string");
      if (args.length === 2) {
        requireNumber(args[1], 1, "number->string");
        base = args[1].value_;
      }
      return new ccc.String(args[0].value_.toString(base));
    },

    // Parse a numeric string using very lazy parseInt semantics
    "string->number": function() {
      var args = Array.prototype.slice.call(arguments);
      var base = 10;
      if (args.length < 1 || args.length > 2)
        throw new Error("string->number: Expected 1 or 2 arguments");
      if (args[0].constructor !== ccc.String)
        throw new Error("string->number: Argument 0 is not a string");
      if (args.length === 2) {
        requireNumber(args[1], 1, "string->number");
        base = args[1].value_;
      }
      return new ccc.Number(parseInt(args[0].value_, base));
    },
  });
}());
