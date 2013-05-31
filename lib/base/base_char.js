(function() {
  var requireNumber = function(value, index, who) {
    if (value.constructor !== ccc.Number)
      throw new Error(who + ": Argument " + index + " is not a number");
  }

  var requireChar = function(value, index, who) {
    if (value.constructor !== ccc.Char)
      throw new Error(who + ": Argument " + index + " is not a character");
  }

  var addCharComparator = function(name, comparator) {
    ccc.lib.base.addSimpleFunction(name, function(char1, char2) {
      requireChar(char1, 0, name);
      requireChar(char2, 1, name);
      return comparator(char1.charCode_, char2.charCode_) ? ccc.t : ccc.f;
    });
  };

  addCharComparator("char=?", function(a, b) { return a === b; });
  addCharComparator("char<?", function(a, b) { return a < b; });
  addCharComparator("char>?", function(a, b) { return a > b; });
  addCharComparator("char<=?", function(a, b) { return a <= b; });
  addCharComparator("char>=?", function(a, b) { return a >= b; });

  var addCICharComparator = function(name, comparator) {
    ccc.lib.base.addSimpleFunction(name, function(char1, char2) {
      requireChar(char1, 0, name);
      requireChar(char2, 1, name);
      var code1 = String.fromCharCode(char1.charCode_).toLocaleLowerCase().charCodeAt(0);
      var code2 = String.fromCharCode(char2.charCode_).toLocaleLowerCase().charCodeAt(0);
      return comparator(code1, code2) ? ccc.t : ccc.f;
    });
  };

  addCICharComparator("char-ci=?", function(a, b) { return a === b; });
  addCICharComparator("char-ci<?", function(a, b) { return a < b; });
  addCICharComparator("char-ci>?", function(a, b) { return a > b; });
  addCICharComparator("char-ci<=?", function(a, b) { return a <= b; });
  addCICharComparator("char-ci>=?", function(a, b) { return a >= b; });

  var addCharClassPredicate = function(name, expr) {
    ccc.lib.base.addSimpleFunction(name, function(c) {
      requireChar(c, 0, name);
      return String.fromCharCode(c.charCode_).match(expr) ? ccc.t : ccc.f;
    });
  };

  addCharClassPredicate("char-alphabetic?", /[a-zA-Z]/);
  addCharClassPredicate("char-numeric?", /[0-9]/);
  addCharClassPredicate("char-whitespace?", /[ \t\f\r\n\v\xa0\u2000-\u200b\u2028\u2029\u202f\u3000]/);
  addCharClassPredicate("char-upper-case?", /[A-Z]/);
  addCharClassPredicate("char-lower-case?", /[a-z]/);

  ccc.lib.base.addSimpleFunctions({
    "char->integer": function(c) {
      requireChar(c, 0, "char->integer");
      return new ccc.Number(c.charCode_);
    },

    "integer->char": function(n) {
      requireNumber(n, 0, "integer->char");
      if ((n.value_ | 0) !== n.value_)
        throw new Error("integer->char: Expected integer");
      return new ccc.Char(n.value_);
    },

    "char-upcase": function(c) {
      requireChar(c, 0, "char-upcase");
      return new ccc.Char(String.fromCharCode(c.charCode_).toLocaleUpperCase().charCodeAt(0));
    },

    "char-downcase": function(c) {
      requireChar(c, 0, "char-downcase");
      return new ccc.Char(String.fromCharCode(c.charCode_).toLocaleLowerCase().charCodeAt(0));
    },
  });
}());
