ccc.Pair = function(car, cdr) {
  this.car_ = car;
  this.cdr_ = cdr;
};

ccc.Pair.prototype.toString = function() {
  return "#<pair:" + this.car_.toString() + " . " + this.cdr_.toString() + ">";
};

ccc.Pair.prototype.toSource = function() {
  return "(" + this.sourcify_() + ")";
};

ccc.Pair.prototype.sourcify_ = function() {
  var str = this.car_.toSource();
  if (this.cdr_.constructor === ccc.Pair)
    str += " " + this.cdr_.sourcify_();
  else if (this.cdr_ !== ccc.nil)
    str += " . " + this.cdr_.toSource();
  return str;
};

ccc.Pair.makeList = function(/* ... */) {
  var list = ccc.nil;
  for (var i = arguments.length - 1; i >= 0; --i)
    list = new ccc.Pair(arguments[i], list);
  return list;
};
