ccc.libutil = {};

ccc.libutil.objectToNativeValue = function(object) {
  var fail = function() {
    throw new Error("Unable to convert object " + object + " to native value");
  };
  if (object === ccc.unspecified)
    return undefined;
  if (object === ccc.nil)
    return null;
  if (object === ccc.t)
    return true;
  if (object === ccc.f)
    return false;
  if (object.constructor === ccc.Number)
    return object.value_;
  if (object.constructor === ccc.String)
    return object.value_;
  if (object.constructor === ccc.Symbol)
    return object.name;
  if (object.constructor === ccc.Vector)
    return object.elements_.map(ccc.libutil.objectToNativeValue);
  if (object.constructor === ccc.Pair) {
    var value = {};
    object.forEach(
      function(pair) {
        if (pair.constructor !== ccc.Pair)
          fail();
        if (pair.cdr().constructor !== ccc.Pair)
          fail();
        if (pair.cdr().cdr() !== ccc.nil)
          fail();
        value[ccc.libutil.objectToNativeValue(pair.car())] =
          ccc.libutil.objectToNativeValue(pair.cdr().car());
      },
      function() { fail(); });
    return value;
  }
  fail();
};

ccc.libutil.objectFromNativeValue = function(value, ignoreObjects) {
 if (value === undefined)
    return ccc.unspecified;
  if (value === null)
    return ccc.nil;
  if (value === true)
    return ccc.t;
  if (value === false)
    return ccc.f;
  if (+value === value)
    return new ccc.Number(value);
  if ("" + value === value)
    return new ccc.String(value);
  if (value instanceof Array) {
    if (ignoreObjects)
      return ccc.unspecified;
    var fromNativeValue = function(value) {
      return ccc.libutil.objectFromNativeValue(value, true);
    };
    return new ccc.Vector(value.map(fromNativeValue));
  }
  if (value instanceof Object) {
    if (ignoreObjects)
      return ccc.unspecified;
    var entries = [];
    for (var key in value) {
      if (value.hasOwnProperty(key)) {
        var entryValue = ccc.libutil.objectFromNativeValue(value[key], true);
        if (entryValue !== undefined)
          entries.push(ccc.Pair.makeList(new ccc.Symbol(key), entryValue));
      }
    }
    return ccc.Pair.makeList.apply(null, entries);
  }
  throw new Error("Unable to convert native value " + value + " to object");
};

ccc.libutil.resolveNativeName = function(name) {
  if (name.constructor === ccc.Symbol)
    return { object: window, value: window[name.name] };
  else if(name.constructor === ccc.Pair) {
    var names = name.toArray().map(function(object) { return object.toString() });
    var object = window;
    var value = window;
    while (value instanceof Object && names.length > 0) {
      object = value;
      value = value[names.shift()];
    }
    if (names.length === 0)
      return { object: object, value: value };
  }
  throw new Error("Unable to resolve native object name: " + name.toSource());
};
