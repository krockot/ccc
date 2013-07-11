(function() {
  var charComparator = function(name, comparator) {
    return {
      name: name,
      requiredArgs: ["char", "char"],
      impl: function(char1, char2) {
        return comparator(char1.charCode_, char2.charCode_) ? ccc.t : ccc.f;
      }
    };
  };

  var charComparatorCI = function(name, comparator) {
    return {
      name: name,
      requiredArgs: ["char", "char"],
      impl: function(char1, char2) {
        var code1 = String.fromCharCode(char1.charCode_).toLocaleLowerCase().charCodeAt(0);
        var code2 = String.fromCharCode(char2.charCode_).toLocaleLowerCase().charCodeAt(0);
        return comparator(code1, code2) ? ccc.t : ccc.f;
      }
    };
  };

  var charClassPredicate = function(name, expr) {
    return {
      name: name,
      requiredArgs: ["char"],
      impl: function(c) {
        requireChar(c, 0, name);
        return String.fromCharCode(c.charCode_).match(expr) ? ccc.t : ccc.f;
      }
    };
  };

  ccc.lib.base.registerEntries([
    charComparator("char=?", function(a, b) { return a === b; }),
    charComparator("char<?", function(a, b) { return a < b; }),
    charComparator("char>?", function(a, b) { return a > b; }),
    charComparator("char<=?", function(a, b) { return a <= b; }),
    charComparator("char>=?", function(a, b) { return a >= b; }),

    charComparatorCI("char-ci=?", function(a, b) { return a === b; }),
    charComparatorCI("char-ci<?", function(a, b) { return a < b; }),
    charComparatorCI("char-ci>?", function(a, b) { return a > b; }),
    charComparatorCI("char-ci<=?", function(a, b) { return a <= b; }),
    charComparatorCI("char-ci>=?", function(a, b) { return a >= b; }),

    charClassPredicate("char-alphabetic?", /[a-zA-Z]/),
    charClassPredicate("char-numeric?", /[0-9]/),
    charClassPredicate("char-whitespace?", /\s/),
    charClassPredicate("char-upper-case?", /[A-Z]/),
    charClassPredicate("char-lower-case?", /[a-z]/),

    {
      name: "char->integer",
      requiredArgs: ["char"],
      impl: function(c) { return new ccc.Number(c.charCode_); }
    },

    {
      name: "integer->char",
      requiredArgs: ["integer"],
      impl: function(n) { return new ccc.Char(n.value_); }
    },

    {
      name: "char-upcase",
      requiredArgs: ["char"],
      impl: function(c) {
        return new ccc.Char(String.fromCharCode(c.charCode_).toLocaleUpperCase().charCodeAt(0));
      }
    },

    {
      name: "char-downcase",
      requiredArgs: ["char"],
      impl: function(c) {
        return new ccc.Char(String.fromCharCode(c.charCode_).toLocaleLowerCase().charCodeAt(0));
      }
    },
  ]);
}());

