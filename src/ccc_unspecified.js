/**
 * The Unspecified data type.
 *
 * It's not really a data type. More like an un-data type or a data un-type.
 * The embodiment of meaninglessness.
 *
 * There should only ever be one instance of this: ccc.unspecified.
 */
ccc.Unspecified = function() {};

ccc.Unspecified.prototype = { __proto__: ccc.Object.prototype };
ccc.Unspecified.prototype.constructor = ccc.Unspecified;

ccc.Unspecified.prototype.toString = function() {
  return "#<unspecified>";
};

ccc.Unspecified.prototype.toSource = function() {
  return "#?";
};

ccc.unspecified = new ccc.Unspecified();

