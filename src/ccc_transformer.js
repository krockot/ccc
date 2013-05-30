/**
 * Syntax transformer object.
 *
 * All keyword bindings must be bound to a Transformer object.
 * Transformers are constructed over a function argument.
 *
 * When a transformer is applied during list compilation, this function
 * is called with the current compilation environment and the tail of the
 * list to be transformed.
 *
 * The function returns a new Object with which to replace the original list.
 */
ccc.Transformer = function(transform) {
  this.transform_ = transform;
};

ccc.Transformer.prototype = { __proto__: ccc.Object.prototype };
ccc.Transformer.prototype.constructor = ccc.Transformer;

ccc.Transformer.prototype.toString = function() {
  return "#<transformer>";
};

ccc.Transformer.prototype.transform = function(environment, form) {
  return this.transform_(environment, form);
};

