/**
 * The Nil data type.
 *
 * There is only one instance of this object: ccc.nil. It represents the empty list.
 */
ccc.Nil = function() {};

ccc.Nil.prototype = { __proto__: ccc.Object.prototype };
ccc.Nil.prototype.constructor = ccc.Nil;

ccc.Nil.prototype.toString = function() {
  return "#<nil>";
};

ccc.Nil.prototype.toSource = function() {
  return "()";
};

/**
 * This exists for great convenience in places where some object is guaranteed
 * to be either a proper list or ccc.nil, and we want to convert to a representative
 * Array object. Native functions often find themselves in this situation.
 */
ccc.Nil.prototype.toArray = function() {
  return [];
};

// There can^H^H^Hshould be only one.
ccc.nil = new ccc.Nil();
