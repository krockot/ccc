/**
 * Syntax pattern.
 *
 * This encapsulates the definition and behavior of a single syntax pattern
 * from a set of syntax rules.
 *
 * Patterns are used to recognize well-formed macro forms and capture data from
 * them.
 */
ccc.Pattern = function(form, literals) {
  this.form_ = form;
};

ccc.Pattern.prototype = { __proto__: ccc.Object.prototype };
ccc.Pattern.prototype.constructor = ccc.Pattern;

ccc.Pattern.prototype.toString = function() {
  return "#<pattern:" + this.form_.toString + ">";
};

ccc.Pattern.prototype.toSource = function() {
  return "(syntax-pattern " + this.form_.toSource() + ")";
};

(function() {
  // Merge two disjoint sets of captures.
  var mergeCaptures = function(c1, c2) {
    for (var k in c2) {
      if (c2.hasOwnProperty(k)) {
        if (c1.hasOwnProperty(k))
          throw new Error("syntax-pattern: Duplicate symbol use");
        c1[k] = c2[k];
      }
    }
    return c1;
  };

  // Append a new set of captures to an existing set.
  var appendCaptures = function(c1, c2) {
    for (var k in c2) {
      if (c2.hasOwnProperty(k)) {
        if (!c1.hasOwnProperty(k))
          throw new Error("Unexpected error");
        c1[k].append(c2[k]);
      }
    }
  };

  // Promote all captures in the set to rank N+1
  var promoteCaptures = function(captures) {
    for (var k in captures) {
      if (captures.hasOwnProperty(k)) {
        captures[k].promote();
      }
    }
    return captures;
  };

  // Is a pair precisely of the form (datum . (... . ()))
  var isEllipsis = function(pair) {
    var tail = pair.cdr();
    if (tail.constructor !== ccc.Pair)
      return false;
    if (tail.car().constructor !== ccc.Symbol)
      return false;
    if (tail.car().name !== "...")
      return false;
    if (tail.cdr() !== ccc.nil)
      throw new Error("syntax-pattern: Invalid ellipsis placement");
    return true;
  };

  // Match a subpattern against an empty form. This is used to generate
  // empty captures from ellipsis patterns.
  var matchEmptyForm = function(pattern, environment, literals) {
    if (pattern.constructor === ccc.Pair) {
      if (isEllipsis(pattern))
        return promoteCaptures(matchEmptyForm(pattern.car(), environment, literals));
      return mergeCaptures(
        matchEmptyForm(pattern.car(), environment, literals),
        matchEmptyForm(pattern.cdr(), environment, literals));
    } else if (pattern.constructor === ccc.Symbol) {
      return matchSymbol(pattern, environment, literals, null);
    }
    return {};
  };

  var matchSymbol = function(symbol, environment, literals, form) {
    // If we need to match a literal symbol, match only if the current form is
    // a symbol of the same name with no active lexical binding.
    if (literals.hasOwnProperty(symbol.name)) {
      if (form.constructor !== ccc.Symbol)
        return false;
      var binding = environment.lookup(form.name);
      if (binding && binding.constructor === ccc.LexicalBinding)
        return false;
      if (form.name === symbol.name)
        return {};
      return false;
    }
    // If not matching a literal symbol, match anything.
    var result = {};
    result[symbol.name] = new ccc.Capture(form, 1);
    return result;
  };

  var matchValue = function(value, environment, literals, form) {
    if (value.constructor === form.constructor && value.eq(form))
      return {};
    return false;
  };

  var matchPair = function(pair, environment, literals, form) {
    var captures;
    var head = pair.car();
    var tail = pair.cdr();

    // This subpattern is a pair of the form (datum ...); match datum 0 or more times.
    if (isEllipsis(pair)) {
      if (form === ccc.nil)
        return matchEmptyForm(head, environment, literals);
      while (form.constructor === ccc.Pair) {
        // Repeat the head match for each remaining list element,
        // accumulating higher-order captures.
        var newCaptures = matchSubpattern(head, environment, literals, form.car());
        if (!newCaptures)
          return false;
        if (captures)
          appendCaptures(captures, newCaptures);
        else
          captures = promoteCaptures(newCaptures);
        form = form.cdr();
      }
      // Ellipsis cannot match an improper list
      if (form !== ccc.nil)
        return false;
      return captures;
    }

    if (form.constructor !== ccc.Pair)
      return false;

    var headCaptures = matchSubpattern(head, environment, literals, form.car());
    var tailCaptures = matchSubpattern(tail, environment, literals, form.cdr());
    if (!headCaptures || !tailCaptures)
      return false;
    return mergeCaptures(headCaptures, tailCaptures);
  };

  var matchVector = function(vector, environment, literals, form) {
    // TODO
    throw new Error("Vector patterns not yet implemented");
  };

  var matchSubpattern = function(subpattern, environment, literals, form) {
    if (subpattern.constructor === ccc.Pair) {
      return matchPair(subpattern, environment, literals, form);
    } else if (subpattern.constructor === ccc.Vector) {
      return matchVector(subpattern, environment, literals, form);
    } else if (subpattern.constructor === ccc.Symbol) {
      return matchSymbol(subpattern, environment, literals, form);
    } else {
      return matchValue(subpattern, environment, literals, form);
    }
  };

  ccc.Pattern.prototype.match = function(environment, literals, form) {
    return matchSubpattern(this.form_.cdr(), environment, literals, form.cdr());
  };
}());

