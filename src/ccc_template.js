/**
 * Syntax template.
 *
 * This encapsulates the definition and behavior of a single syntax template
 * from a set of syntax rules.
 *
 * Templates are expanded over the result of a successful pattern match in
 * a macro use.
 */
ccc.Template = function(form) {
  this.form_ = form;
};

ccc.Template.prototype = { __proto__: ccc.Object.prototype };
ccc.Template.prototype.constructor = ccc.Template;

ccc.Template.prototype.toString = function() {
  return "#<template:" + this.form_.toString + ">";
};

ccc.Template.prototype.toSource = function() {
  return "(syntax-template " + this.form_.toSource() + ")";
};

(function() {
  // Is a pair of the form (datum . (... . <whatever>))
  var isEllipsis = function(pair) {
    var tail = pair.cdr();
    if (tail.constructor !== ccc.Pair)
      return false;
    if (tail.car().constructor !== ccc.Symbol)
      return false;
    if (tail.car().name !== "...")
      return false;
    return true;
  };
  
  var collectEnumerators = function(object) {
    if (object instanceof ccc.Enumerator) {
      return [object];
    } else if (object instanceof ccc.Pair) {
      return collectEnumerators(object.car()).concat(collectEnumerators(object.cdr()));
    } else {
      return [];
    }
  };
  
  var generateNext = function(object) {
    if (object instanceof ccc.Enumerator) {
      if (!object.hasMore())
        return false;
      return object.getNext();
    } else if (object instanceof ccc.Pair) {
      var head = generateNext(object.car());
      var tail = generateNext(object.cdr());
      if (head && tail)
        return new ccc.Pair(head, tail);
      return false;
    } else {
      return object;
    }
  };

  var expandSymbol = function(symbol, environment, captures, depth) {
    if (!captures.hasOwnProperty(symbol.name))
      return symbol;
    return captures[symbol.name].expand();
  };

  var expandPair = function(pair, environment, captures, depth, ignoreEllipsis) {
    if (isEllipsis(pair) && !ignoreEllipsis) {
      var items = [];
      var enumerable = expandTemplate(pair.car(), environment, captures, depth + 1, true);
      if (enumerable === null)
        return ccc.nil;
      var enumerators = collectEnumerators(enumerable);
      while (true) {
        var next = generateNext(enumerable);
        if (!next) {
          var hasMore = false;
          enumerators.forEach(function(e) { hasMore = hasMore || e.hasMore(); });
          if (hasMore) {
            throw new Error("Template expansion length mismatch");
          }
          var list = ccc.Pair.makeList.apply(null, items);
          var nextList = expandTemplate(pair.cdr().cdr(), environment, captures, depth);
          if (list === ccc.nil) {
            list = nextList;
          } else if (nextList === null) {
            list.append(ccc.nil);
          } else if (nextList !== ccc.nil) {
            list.append(nextList);
          }
          return expandTemplate(list, environment, captures, depth);
        }
        items.push(next);
      }
    }

    var head = expandTemplate(pair.car(), environment, captures, depth);
    var tail = expandTemplate(pair.cdr(), environment, captures, depth);
    if (head === null) {
      if (tail === null)
        return ccc.nil;
      return tail;
    } else if (tail === null) {
      return new ccc.Pair(head, ccc.nil);
    } else {
      return new ccc.Pair(head, tail);
    }
  };

  var expandVector = function(vector, environment, captures, depth) {
    throw new Error("Vector templates not yet implemented");
  };

  var expandTemplate = function(template, environment, captures, depth, ignoreEllipsis) {
    if (template.constructor === ccc.Pair)
      return expandPair(template, environment, captures, depth, ignoreEllipsis);
    if (template.constructor === ccc.Vector)
      return expandVector(template, environment, captures, depth, ignoreEllipsis);
    if (template.constructor === ccc.Symbol)
      return expandSymbol(template, environment, captures, depth, ignoreEllipsis);
    if (template.constructor === ccc.Capture)
      return template.expand();
    return template;
  };

  ccc.Template.prototype.expand = function(environment, captures) {
    return expandTemplate(this.form_, environment, captures, 1);
  };
}());

