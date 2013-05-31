/**
 * Pair data type.
 *
 * The bread and butter and knife and cow and universe. It's a pair!
 * It's a thing that holds exactly two things.
 */
ccc.Pair = function(car, cdr) {
  this.car_ = car;
  this.cdr_ = cdr;
};

ccc.Pair.prototype = { __proto__: ccc.Object.prototype };
ccc.Pair.prototype.constructor = ccc.Pair;

ccc.Pair.prototype.toString = function() {
  return "#<pair:" + this.car_.toString() + " . " + this.cdr_.toString() + ">";
};

ccc.Pair.prototype.toSource = function() {
  return "(" + this.sourcify_() + ")";
};

// Lazy recursive stringification without the outer parens so that stringification
// with the outer parens can use lazy recursive stringification...
ccc.Pair.prototype.sourcify_ = function() {
  var str = this.car_.toSource();
  if (this.cdr_.constructor === ccc.Pair)
    str += " " + this.cdr_.sourcify_();
  else if (this.cdr_ !== ccc.nil)
    str += " . " + this.cdr_.toSource();
  return str;
};

// Takes any number of arguments and outputs a proper list of the argument
// sequence, or ccc.nil if none were given.
ccc.Pair.makeList = function(/* ... */) {
  var list = ccc.nil;
  for (var i = arguments.length - 1; i >= 0; --i)
    list = new ccc.Pair(arguments[i], list);
  return list;
};

// Create an improper list from an array and a tail object
ccc.Pair.makeImproperList = function(items, tail) {
  var list = tail;
  for (var i = items.length - 1; i >= 0; --i)
    list = new ccc.Pair(items[i], list);
  return list;
};

// Generates an Array object from a proper list. Throws an error if called
// on an improper list.
ccc.Pair.prototype.toArray = function() {
  var array = [];
  var pair = this;
  while (pair.constructor === ccc.Pair) {
    array.push(pair.car_);
    pair = pair.cdr_;
  }
  if (pair !== ccc.nil)
    throw new Error("Cannot convert improper list to an array");
  return array;
};

// Returns true iff this is a proper list
ccc.Pair.prototype.isList = function() {
  var pair = this;
  while (pair.constructor === ccc.Pair)
    pair = pair.cdr_;
  if (pair === ccc.nil)
    return true;
  return false;
};

// Evaluates a function over each element in a list. If the list is improper,
// the second (optional) function is called with the non-nil tail value.
ccc.Pair.prototype.forEach = function(fn, opt_tailFn) {
  var pair = this;
  while (pair.constructor === ccc.Pair) {
    fn(pair.car_, pair);
    pair = pair.cdr_;
  }
  if (pair.constructor !== ccc.Nil && opt_tailFn)
    opt_tailFn(pair);
};

ccc.Pair.prototype.car = function() {
  return this.car_;
};

ccc.Pair.prototype.cdr = function() {
  return this.cdr_;
};

ccc.Pair.prototype.withCar = function(newCar) {
  return new ccc.Pair(newCar, this.cdr_);
};

ccc.Pair.prototype.compileElements_ = function(environment) {
  var head = this.car_.compile(environment);
  if (this.cdr_.constructor === ccc.Pair)
    return new ccc.Pair(head, this.cdr_.compileElements_(environment));
  return new ccc.Pair(head, this.cdr_.compile(environment));
};

/**
 * Pair (list) compilation attempts to perform macro expansion if the head
 * is bound to a syntax transformer. If expansion happens, compilation recurses
 * on the resulting form.
 *
 * If the list is not to be expaned, individual list elements are compiled in order.
 */
ccc.Pair.prototype.compile = function(environment) {
  if (this.car_.constructor === ccc.Symbol && !environment.lookup(this.car_.name)) {
    var transformer = environment.lookupSyntax(this.car_.name);
    if (transformer) {
      var newForm = transformer.transform(environment, this.cdr_);
      return newForm.compile(environment);
    }
  }
  return this.compileElements_(environment);
};

/**
 * Pair evaluation is function application.
 *
 * Through a series of generated continuation steps, this will:
 *   - Evaluate car and ensure that it is applicable (throw if not)
 *   - Evaluate and accumulate argument 1
 *   - ...
 *   - Evaluate and accumulate argument N
 *   - Apply the accumulated list of arguments to the applicable car object.
 */
ccc.Pair.prototype.eval = function(environment, continuation) {
  return function() {
    return this.car_.eval(environment, function(callee) {
      if (!callee.apply) {
        throw new Error("Object " + this.car_.toString() + " is not applicable");
      }

      var argsForm = this.cdr_;
      var argEvaluator = function(argsRemaining, args) {
        if (argsRemaining === ccc.nil) {
          var argsList = ccc.Pair.makeList.apply(null, args);
          return callee.apply(environment, continuation, argsList);
        }
        if (argsRemaining.constructor !== ccc.Pair)
          throw new Error("Invalid argument list: " + argsForm.toSource());
        var head = argsRemaining.car_;
        return head.eval(environment, function(value) {
          return argEvaluator(argsRemaining.cdr_, args.concat(value));
        });
      };

      return argEvaluator(argsForm, []);
    }.bind(this));
  }.bind(this);
};

// Recursive equality test. Does not detect cyclical lists.
// Cyclical lists will block forever.
ccc.Pair.prototype.equal = function(other) {
  var a = this, b = other;
  while (a.constructor === ccc.Pair && b.constructor === ccc.Pair) {
    if (a.constructor !== b.constructor || !a.car_.equal(b.car_))
      return false;
    a = a.cdr_; b = b.cdr_;
  }
  if (a.constructor !== b.constructor || !a.equal(b))
    return false;
  return true;
};
