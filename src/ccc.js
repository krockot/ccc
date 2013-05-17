ccc = {};

'strict';

ccc.Unspecified = function() {};

ccc.Unspecified.prototype.toString = function() {
  return "#<unspecified>";
};

ccc.Unspecified.prototype.toSource = function() {
  return "#?";
};

ccc.unspecified = new ccc.Unspecified();

ccc.Nil = function() {};

ccc.Nil.prototype.toString = function() {
  return "#<nil>";
};

ccc.Nil.prototype.toSource = function() {
  return "()";
};

ccc.nil = new ccc.Nil();
