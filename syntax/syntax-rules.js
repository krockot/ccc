/**
 * syntax-rules generates a dynamic Transformer object at compile-time to be
 * bound using either define-syntax, let-syntax, or letrec-syntax.
 *
 * Any free symbols within a rule expansion form are bound at compile-time
 * according to the environment of their parent syntax-rules form.
 */
(function() {
  ccc.PrimitiveTransformers["syntax-rules"] = new ccc.Transformer(function(environment, form) {
    var fail = function() { throw new Error("syntax-rules: Bad form"); };
    var expectPair = function(object) { if (object.constructor !== ccc.Pair) fail(); };

    expectPair(form);

    // Extract a validated list of literal symbols for the rule set
    var literalsList = form.car();
    if (literalsList !== ccc.nil && literalsList.constructor !== ccc.Pair)
      fail();
    var literals = [];
    if (literalsList !== ccc.nil)
      literalsList.forEach(
        function(symbol) {
          if (symbol.constructor !== ccc.Symbol)
            fail();
          if (symbol.name === '...')
            fail();
          literals.push(symbol);
        },
        fail);

    var rules = [];
    var rulesList = form.cdr();
    expectPair(rulesList);
    rulesList.forEach(
      function(rule) {
        expectPair(rule);
        var pattern = rule.car();
        expectPair(pattern);
        rule = rule.cdr();
        if (rule === ccc.nil)
          fail();
        if (rule.cdr() !== ccc.nil)
          fail();
        rules.push({ pattern: pattern, template: rule.car() });
      },
      fail);

    return new ccc.Transformer(function(environment, form) {
      return ccc.nil;
    });
  });
}());
