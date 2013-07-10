(function() {
  var stringComparator = function(name, comparator) {
    return {
      name: name,
      requiredArgs: ["string", "string"],
      impl: function(string1, string2) {
        return comparator(string1.value_, string2.value_) ? ccc.t : ccc.f;
      }
    };
  };

  var stringCIComparator = function(name, comparator) {
    return {
      name: name,
      requiredArgs: ["string", "string"],
      impl: function(string1, string2) {
        return comparator(string1.value_.toLocaleLowerCase(), string2.value_.toLocaleLowerCase()) ? ccc.t : ccc.f;
      }
    };
  };

  var stringFromChar = function(ch) {
    return String.fromCharCode(ch.charCode_);
  };

  ccc.lib.base.registerEntries([
    {
      name: "make-string",
      requiredArgs: ["integer"],
      optionalArgs: ["char"],
      impl: function(count, ch) {
        if (ch === ccc.unspecified)
          ch = new ccc.Char(0);
        return new ccc.String((Array(count.value_ + 1)).join(stringFromChar(ch)));
      }
    },

    {
      name: "string",
      optionalArgs: "char",
      impl: function(chars) {
        var string = "";
        if (chars !== ccc.nil)
          chars.forEach(function(c) { string += stringFromChar(c); });
        return new ccc.String(string);
      },
    },

    {
      name: "string-length",
      requiredArgs: ["string"],
      impl: function(string) { return new ccc.Number(string.value_.length); }
    },

    {
      name: "string-ref",
      requiredArgs: ["string", "integer"],
      impl: function(string, index) {
        index = index.value_;
        if (index < 0 || index >= string.value_.length)
          throw new Error("string-ref: Index out of bounds");
        return new ccc.Char(string.value_.charCodeAt(index));
      }
    },

    {
      name: "string-set!",
      requiredArgs: ["string", "integer", "char"],
      impl: function(string, index, ch) {
        index = index.value_;
        if (index < 0 || index >= string.value_.length)
          throw new Error("string-set!: Index out of bounds");
        string.value_ = string.value_.substr(0, index) +
          stringFromChar(ch) + string.value_.substr(index + 1);
      }
    },

    {
      name: "substring",
      requiredArgs: ["string", "integer", "integer"],
      impl: function(string, start, end) {
        start = start.value_;
        end = end.value_;
        if (start > end)
          throw new Error("substring: Invalid index range");
        if (end > string.value_.length)
          throw new Error("substring: Index out of bounds");
        return new ccc.String(string.value_.substring(start, end));
      }
    },

    {
      name: "string-append",
      optionalArgs: "string",
      impl: function(list) {
        var string = "";
        if (list === ccc.nil)
          return new ccc.String("");
        list.forEach(function(s) { string += s.value_; });
        return new ccc.String(string);
      },
    },

    {
      name: "string->symbol",
      requiredArgs: ["string"],
      impl: function(string) { return new ccc.Symbol(string.value_); }
    },

    {
      name: "symbol->string",
      requiredArgs: ["symbol"],
      impl: function(symbol) { return new ccc.String(symbol.name); }
    },

    {
      name: "number->string",
      requiredArgs: ["number"],
      optionalArgs: ["integer"],
      impl: function(number, radix) {
        radix = (radix === ccc.unspecified) ? 10 : radix.value_;
        return new ccc.String(number.value_.toString(radix));
      }
    },

    {
      name: "string->number",
      requiredArgs: ["string"],
      optionalArgs: ["integer"],
      impl: function(string, radix) {
        radix = (radix === ccc.unspecified) ? 10 : radix.value_;
        if (radix === 10)
          return new ccc.Number(parseFloat(string.value_));
        return new ccc.Number(parseInt(string.value_, radix));
      }
    },

    {
      name: "string->list",
      requiredArgs: ["string"],
      impl: function(string) {
        var chars = [];
        for (var i = 0; i < string.value_.length; ++i)
          chars.push(new ccc.Char(string.value_.charCodeAt(i)));
        return ccc.Pair.makeList.apply(null, chars);
      },
    },

    {
      name: "list->string",
      requiredArgs: ["list"],
      impl: function(list) {
        var string = "";
        if (list !== ccc.nil)
          list.forEach(function(c) { string += stringFromChar(c); });
        return new ccc.String(string);
      },
    },

    {
      name: "string-copy",
      requiredArgs: ["string"],
      impl: function(string) { return new ccc.String(string.value_); }
    },

    {
      name: "string-fill!",
      requiredArgs: ["string", "char"],
      impl: function(string, ch) {
        string.value_ = (Array(string.value_.length + 1)).join(stringFromChar(ch));
      }
    },

    {
      name: "stringify",
      requiredArgs: ["any"],
      impl: function(object) {
        return new ccc.String(object.toSource());
      }
    },

    stringComparator("string=?", function(a, b) { return a === b; }),
    stringComparator("string<?", function(a, b) { return a < b; }),
    stringComparator("string>?", function(a, b) { return a > b; }),
    stringComparator("string<=?", function(a, b) { return a <= b; }),
    stringComparator("string>=?", function(a, b) { return a >= b; }),

    stringCIComparator("string-ci=?", function(a, b) { return a === b; }),
    stringCIComparator("string-ci<?", function(a, b) { return a < b; }),
    stringCIComparator("string-ci>?", function(a, b) { return a > b; }),
    stringCIComparator("string-ci<=?", function(a, b) { return a <= b; }),
    stringCIComparator("string-ci>=?", function(a, b) { return a >= b; }),
  ]);
}());
