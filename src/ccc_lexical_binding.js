/**
 * Lexical binding object.
 *
 * This is used to capture compile-time bindings to named closure arguments.
 * Each lexical binding is constructed with an ID that is unique to its
 * owning environment. Appropriate symbols within a closure body are replaced
 * with their corresponding argument's lexical binding at compile time.
 */
ccc.LexicalBinding = function(name, id) {
  this.name_ = name;
  this.id_ = id;
};

ccc.LexicalBinding.prototype = { __proto__: ccc.Object.prototype };
ccc.LexicalBinding.prototype.constructor = ccc.LexicalBinding;

ccc.LexicalBinding.prototype.toString = function() {
  return "#<binding:" + this.name_ + ">";
};

ccc.LexicalBinding.prototype.eval = function(environment, continuation) {
  return function() {
    return continuation(environment.lookupLocal(this.id_).value_);
  }.bind(this);
};

