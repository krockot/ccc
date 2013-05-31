(function() {
  var requireString = function(value, index, who) {
    if (value.constructor !== ccc.String)
      throw new Error(who + ": Argument " + index + " is not a string");
  };

  var requireChar = function(value, index, who) {
    if (value.constructor !== ccc.Char)
      throw new Error(who + ": Argument " + index + " is not a character");
  };

  var requireNumber = function(value, index, who) {
    if (value.constructor !== ccc.Number)
      throw new Error(who + ": Argument " + index + " is not a number");
  };

  ccc.lib.base.addSimpleFunctions({
    // Create a string of repeated characters
    "make-string": function(count, ch) {
      requireNumber(count, 0, "make-string");
      requireChar(ch, 1, "make-string");
      return new ccc.String((Array(count.value_ + 1)).join(String.fromCharCode(ch.charCode_)));
    },

    "string": function() {
      var chars = Array.prototype.slice.call(arguments);
      var string = "";
      chars.forEach(function(c, index) {
        requireChar(c, index, "string");
        string += String.fromCharCode(c.charCode_);
      });
      return new ccc.String(string);
    },

    "string-length": function(string) {
      requireString(string, 0, "string-length");
      return new ccc.Number(string.value_.length);
    },

    "string-ref": function(string, index) {
      requireString(string, 0, "string-ref");
      requireNumber(index, 1, "string-ref");
      index = index.value_ | 0;
      if (index < 0 || index >= string.value_.length)
        throw new Error("string-ref: Index out of bounds");
      return new ccc.Char(string.value_.charCodeAt(index));
    },

    "string-set!": function(string, index, ch) {
      requireString(string, 0, "string-set!");
      requireNumber(index, 1, "string-set!");
      requireChar(ch, 2, "string-set!");
      index = index.value_ | 0;
      if (index < 0 || index >= string.value_.length)
        throw new Error("string-set!: Index out of bounds");
      string.value_ = string.value_.substr(0, index) +
                      String.fromCharCode(ch.charCode_) +
                      string.value_.substr(index + 1);
    },

    "substring": function(string, start, end) {
      requireString(string, 0, "substring");
      requireNumber(start, 1, "substring");
      requireNumber(end, 1, "substring");
      if (start > end)
        throw new Error("substring: Invalid range");
      if (end > string.value_.length)
        throw new Error("substring: Index out of range");
      return new ccc.String(string.value_.substring(start, end));
    },

    "string-append": function() {
      var args = Array.prototype.slice.call(arguments);
      var string = "";
      args.forEach(function(arg, index) {
        requireString(arg, index, "string-append");
        string += arg.value_;
      });
      return new ccc.String(string);
    },

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

    "string->list": function(string) {
      requireString(string, 0, "string->list");
      var chars = [];
      for (var i = 0; i < string.value_.length; ++i)
        chars.push(new ccc.Char(string.value_.charCodeAt(i)));
      return ccc.Pair.makeList.apply(null, chars);
    },

    "list->string": function(list) {
      if (list !== ccc.nil && list.constructor !== ccc.Pair)
        throw new Error("list->string: Argument 0 is not a list");
      var string = "";
      list.forEach(
        function(ch) {
          if (ch.constructor !== ccc.Char)
            throw new Error("list->string: Expected list of characters");
          string += String.fromCharCode(ch.charCode_);
        },
        function() { throw new Error("list->string: Argument 0 is not a proper list"); });
      return new ccc.String(string);
    },

    "string-copy": function(string) {
      requireString(string, 0, "string-copy");
      return new ccc.String(string.value_);
    },

    "string-fill!": function(string, ch) {
      requireString(string, 0, "string-fill!");
      requireChar(ch, 1, "string-fill!");
      string.value_ = (Array(string.value_.length + 1)).join(String.fromCharCode(ch.charCode_));
    },
  });

  var addStringComparator = function(name, comparator) {
    ccc.lib.base.addSimpleFunction(name, function(string1, string2) {
      requireString(string1, 0, name);
      requireString(string2, 1, name);
      return comparator(string1.value_, string2.value_) ? ccc.t : ccc.f;
    });
  };

  addStringComparator("string=?", function(a, b) { return a === b; });
  addStringComparator("string<?", function(a, b) { return a < b; });
  addStringComparator("string>?", function(a, b) { return a > b; });
  addStringComparator("string<=?", function(a, b) { return a <= b; });
  addStringComparator("string>=?", function(a, b) { return a >= b; });

  var addCIStringComparator = function(name, comparator) {
    ccc.lib.base.addSimpleFunction(name, function(string1, string2) {
      requireString(string1, 0, name);
      requireString(string2, 1, name);
      return comparator(string1.value_.toLocaleLowerCase(), string2.value_.toLocaleLowerCase()) ? ccc.t : ccc.f;
    });
  };

  addCIStringComparator("string-ci=?", function(a, b) { return a === b; });
  addCIStringComparator("string-ci<?", function(a, b) { return a < b; });
  addCIStringComparator("string-ci>?", function(a, b) { return a > b; });
  addCIStringComparator("string-ci<=?", function(a, b) { return a <= b; });
  addCIStringComparator("string-ci>=?", function(a, b) { return a >= b; });
}());
