ccc.Symbol = function(name) {
  this.name = name;
};

ccc.Symbol.prototype.toString = function() {
  return "#<symbol:" + this.name + ">";
};

ccc.Symbol.prototype.toSource = function() {
  return this.name;
};

