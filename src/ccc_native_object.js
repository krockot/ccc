/**
 * Native object.
 */
ccc.NativeObject = function(object) {
  this.object_ = object;
};

ccc.NativeObject.prototype = { __proto__: ccc.Object.prototype };
ccc.NativeObject.prototype.constructor = ccc.NativeObject;

ccc.NativeObject.prototype.toString = function() {
  return "#<native-object:" + this.object_ + ">";
};

ccc.NativeObject.prototype.get = function(names) {
  var object = this.object_;
  var parentObject = object;
  while (names.constructor === ccc.Pair) {
    parentObject = object;
    object = object[names.car().name];
    names = names.cdr();
  }
  if (names.constructor === ccc.Symbol) {
    parentObject = object;
    object = object[names.name];
  }
  return { parentObject: parentObject, object: object };
};

ccc.NativeObject.prototype.set = function(names, value) {
  var object = this.object_;
  var tail = '';
  while (names.constructor === ccc.Pair) {
    if (names.cdr() !== ccc.nil)
      object = object[names.car().name];
    else
      tail = names.car().name;
    names = names.cdr();
  }
  if (names.constructor === ccc.Symbol) {
    tail = names.name;
  }
  object[tail] = value;
};

ccc.NativeObject.prototype.apply = function(environment, continuation, args) {
  return function() {
    var op = args.car();
    if (op === ccc.nil)
      op = "apply";
    else if (op.constructor === ccc.Symbol)
      op = op.name;
    else if (op.constructor === ccc.String)
      op = op.value_;
    var names = args.cdr();
    if (names.constructor === ccc.Pair)
      names = names.car();
    var property = this.get(names);
    var propertyObject = property.parentObject;
    var propertyValue = property.object;
    if (op === "apply") {
      args = args.cdr().cdr().toArray();
      args = args.map(function(o) { return ccc.libutil.objectToNativeValue(o, environment); });
      return continuation(ccc.libutil.objectFromNativeValue(propertyValue.apply(propertyObject, args)));
    } else if (op === "get") {
      return continuation(ccc.libutil.objectFromNativeValue(propertyValue));
    } else if (op === "set") {
      this.set(names, ccc.libutil.objectToNativeValue(args.cdr().cdr().car(), environment));
      return continuation(ccc.unspecified);
    } else if (op == "list") {
      return continuation(ccc.Pair.makeList.apply(null,
        Array.prototype.slice.call(this.object_).
          map(function(o) { return ccc.libutil.objectFromNativeValue(o); })));
    } else {
      throw new Error("Invalid native object application");
    }
  }.bind(this);
};

