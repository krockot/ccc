ccc = {};
ccc.lib = {};
/**
 * Object base type.
 *
 * This is the prototype for any first-class runtime object. It provides some
 * sane defaults for methods that many types simply shouldn't need to implement
 * on their own.
 */
ccc.Object = function() {};

ccc.Object.prototype.toSource = function() { return this.toString(); };

// Identity function
ccc.Object.prototype.compile = function(environment) { return this; };

// Identity evaluator
ccc.Object.prototype.eval = function(environment, continuation) {
  return function() {
    return continuation(this);
  }.bind(this);
};

// Identity equality
ccc.Object.prototype.eq = function(other) {
  return this === other;
};

// Fallback to this.eq
ccc.Object.prototype.eqv = function(other) {
  return this.eq(other);
};

// Fallback to this.equal
ccc.Object.prototype.equal = function(other) {
  return this.eqv(other);
};


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
/**
 * Boolean data type.
 *
 * The only two instances of this type should be ccc.t and ccc.f, which correspond
 * to true (#t) and false (#f) value types. This allows boolean values to be reliably
 * compared using only object identity.
 */
ccc.Bool = function(true_or_false) {
  this.value_ = !!true_or_false;
};

ccc.Bool.prototype = { __proto__: ccc.Object.prototype };
ccc.Bool.prototype.constructor = ccc.Bool;

ccc.Bool.prototype.toString = function() {
  return "#<bool:" + this.value_.toString() + ">";
};

ccc.Bool.prototype.toSource = function() {
  return this.value_ ? "#t" : "#f";
};

ccc.t = new ccc.Bool(true);
ccc.f = new ccc.Bool(false);

/**
 * Number data type.
 *
 * It wraps a number object. Yep.
 */
ccc.Number = function(value) {
  this.value_ = value;
};

ccc.Number.prototype = { __proto__: ccc.Object.prototype };
ccc.Number.prototype.constructor = ccc.Number;

ccc.Number.prototype.toString = function() {
  return this.value_.toString();
};

ccc.Number.prototype.eq = function(other) {
  return this.value_ === other.value_;
};

/**
 * Character data type.
 *
 * A Char is a single integer value representing a Unicode codepoint.
 */
ccc.Char = function(charCode) {
  this.charCode_ = charCode;
};

ccc.Char.prototype = { __proto__: ccc.Object.prototype };
ccc.Char.prototype.constructor = ccc.Char;

ccc.Char.prototype.toString = function() {
  var hexCode = this.charCode_.toString(16);
  return "#<char:" + "0000".substr(hexCode.length) + hexCode + ">";
};

ccc.Char.prototype.toSource = function() {
  var hexCode = this.charCode_.toString(16);
  return "#\\u" + "0000".substr(hexCode.length) + hexCode;
};

ccc.Char.prototype.eq = function(other) {
  return this.charCode_ === other.charCode_;
};

/**
 * String data type.
 */
ccc.String = function(value) {
  this.value_ = value;
};

ccc.String.prototype = { __proto__: ccc.Object.prototype };
ccc.String.prototype.constructor = ccc.String;

ccc.String.prototype.sanitizedValue_ = function() {
  return this.value_.
    replace("\n", "\\n");
};

ccc.String.prototype.toString = function() {
  return '"' + this.sanitizedValue_() + '"';
};

ccc.String.prototype.eq = function(other) {
  return this.value_ === other.value_;
};

/**
 * Symbol data type.
 *
 * Symbol are essentially strings with special contextual meaning.
 */
ccc.Symbol = function(name) {
  this.name = name;
};

ccc.Symbol.prototype = { __proto__: ccc.Object.prototype };
ccc.Symbol.prototype.constructor = ccc.Symbol;

ccc.Symbol.prototype.toString = function() {
  if (this.name.match(/[ \t\n\r\f\v()[\]\|;#"]/))
    return "|" + this.name.replace("|", "\\|").replace("\n", "\\n") + "|";
  return this.name;
};

/**
 * Compilation attempts to resolve symbol names in the current environment.
 * If a symbol fails to resolve, it is instead compiled to a GlobalBinding
 * object which will perform dynamic symbol lookup by name at run-time.
 */
ccc.Symbol.prototype.compile = function(environment) {
  var binding = environment.lookup(this.name);
  if (binding)
    return binding;
  return new ccc.GlobalBinding(this.name);
};

ccc.Symbol.prototype.eq = function(other) {
  return this.name === other.name;
};

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
    fn(pair.car_);
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
 * Once expansion is finished, individual list elements are compiled in order.
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
/**
 * Vector data type
 */
ccc.Vector = function(elements) {
  this.elements_ = elements;
};

ccc.Vector.prototype = { __proto__: ccc.Object.prototype };
ccc.Vector.prototype.constructor = ccc.Vector;

ccc.Vector.prototype.toString = function() {
  return "#<vector:" + this.elements_.toString() + ">";
};

ccc.Vector.prototype.toSource = function() {
  return "#(" + this.elements_.map(function(e) { return e.toSource(); }).join(" ") + ")";
};

// Recursive element-wise equality test
ccc.Vector.prototype.equal = function(other) {
  if (this.elements_.length !== other.elements_.length)
    return false;
  for (var i = 0; i < this.elements_.length; ++i) {
    if (!this.elements_[i].equal(other.elements_[i]))
      return false;
  }
  return true;
};

/**
 * Runtime environment object.
 *
 * The Environment houses all active syntax, variable, lexical, and stack-local
 * bindings. Environments may inherit from other environments and fall back on
 * them when resolving bindings.
 *
 * A parsed program must be evaluated within the context of some environment;
 * during the course of compilation and evaluation, lambda closures may create
 * additional sub-environments to be bound and used internally during evaluation.
 *
 * Environments may be augmented by importing ccc.Library objects - collections
 * of native function calls to be bound to global identifiers with optional
 * prefixes.
 *
 * A top-level environment (constructed with no arguments) will contain
 * standard library syntax bindings as well as the contents of the "base" library
 * bound globally with no prefix.
 */
ccc.Environment = function(opt_parent) {
  this.syntaxBindings_ = {};
  this.globalBindings_ = {};
  this.lexicalBindings_ = {};
  this.localBindings_ = {};
  if (opt_parent) {
    this.parent_ = opt_parent;
    this.nextLocal_ = opt_parent.nextLocal_;
  } else {
    this.initToplevel_();
    this.nextLocal_ = 0;
  }
};

ccc.Environment.prototype = { __proto__: ccc.Object.prototype };
ccc.Environment.prototype.constructor = ccc.Environment;

ccc.Environment.prototype.toString = function() {
  return "#<environment>";
};

ccc.Environment.prototype.initToplevel_ = function() {
  var primitives = ccc.PrimitiveTransformers;
  for (var k in primitives) {
    if (primitives.hasOwnProperty(k)) {
      this.bindSyntax(k, primitives[k]);
    }
  }
};

/**
 * Resolve a symbol name to a syntax binding if it exists.
 */
ccc.Environment.prototype.lookupSyntax = function(name) {
  if (this.syntaxBindings_.hasOwnProperty(name))
    return this.syntaxBindings_[name];
  if (this.parent_)
    return this.parent_.lookupSyntax(name);
  return null;
};

/**
 * Resolve a symbol name to a lexical (higher priority) or global binding
 * if one exists.
 */
ccc.Environment.prototype.lookup = function(name) {
  if (this.lexicalBindings_.hasOwnProperty(name))
    return this.lexicalBindings_[name];
  if (this.globalBindings_.hasOwnProperty(name))
    return this.globalBindings_[name];
  if (this.parent_)
    return this.parent_.lookup(name);
  return null;
};

/**
 * Resolve a local binding id to its binding location. Unique local binding IDs
 * are generated when symbols are bound lexically and each unique ID corresponds
 * is assigned to specific lexical binding within the environment. When lexical
 * bindings are evaluated at run-time, they resolve to the active local binding
 * associated with their assigned ID.
 */
ccc.Environment.prototype.lookupLocal = function(id) {
  if (this.localBindings_.hasOwnProperty(id))
    return this.localBindings_[id];
  if (this.parent_)
    return this.parent_.lookupLocal(id);
  return null;
};

/**
 * Bind a symbol name to a Transformer object.
 */
ccc.Environment.prototype.bindSyntax = function(name, transformer) {
  this.syntaxBindings_[name] = transformer;
  return transformer;
};

/**
 * Bind a symbol name to a fresh location in the set of global bindings.
 */
ccc.Environment.prototype.bindGlobal = function(name, value) {
  var location = new ccc.Location(name, value);
  this.globalBindings_[name] = location;
  return location;
};

/**
 * Bind a symbol name to a lexical binding object with a local binding ID that
 * is unique to this environment.
 */
ccc.Environment.prototype.bindLexical = function(name) {
  var binding = new ccc.LexicalBinding(name, ++this.nextLocal_);
  this.lexicalBindings_[name] = binding;
  return binding;
};

/**
 * Bind a lexical binding's corresponding local binding to a value stored
 * in a fresh location.
 */
ccc.Environment.prototype.bindLocal = function(binding, value) {
  this.localBindings_[binding.id_] = new ccc.Location(binding.name_, value);
};

/**
 * Import a Library into the environment. Libraries consist of a series of
 * named native function entries. Importing a library binds these native
 * functions to symbols in the environment, optionally prefixing each name
 * with a library-wide prefix.
 */
ccc.Environment.prototype.importLibrary = function(library, prefix) {
  if (prefix === undefined)
    prefix = ""
  else
    prefix = prefix + ":";
  var entries = library.entries();
  for (var name in entries) {
    if (entries.hasOwnProperty(name)) {
      this.bindGlobal(prefix + name, entries[name]);
    }
  }
};

/**
 * Asynchronously compile and evaluate a single parsed form.
 * Any ccc.Object-prototyped object may be evaluated by this method.
 * When evaluation is complete, opt_receiver is called with the resulting
 * value.
 */
ccc.Environment.prototype.evalForm = function(form, opt_receiver) {
  var compiledForm = form.compile(this);

  var terminate = function(value) {
    if (opt_receiver)
      opt_receiver(value);
  };

  var continuation = compiledForm.eval(this, terminate);
  var timeslice = function() {
    var cyclesPerSlice = 1000;
    while (cyclesPerSlice-- > 0 && continuation)
      continuation = continuation();
    if (continuation) {
      setTimeout(timeslice, 0);
    }
  }
  timeslice();
};

/**
 * Asynchronously compile and evaluate a sequence of parsed forms.
 * Upon completion of each evaluated form, opt_valueReceiver is called with the
 * resulting value as the first argument, and false as the second argument to
 * indicate that the program has not terminated.
 *
 * Upon completion of all evaluated forms, opt_valueReceiver is again called
 * with the resulting value of the final form's evaluation as the first argument,
 * and true as the second argument to indicate that the program has terminated.
 */
ccc.Environment.prototype.evalProgram = function(forms, opt_valueReceiver) {
  if (forms.length === 0)
    throw new Error("Empty program?");

  forms = forms.slice();
  var evalNextForm = function() {
    var form = forms.shift();
    this.evalForm(form, function (value) {
      if (opt_valueReceiver)
        opt_valueReceiver(value, false);
      if (forms.length > 0)
        evalNextForm();
      else if (opt_valueReceiver)
        opt_valueReceiver(value, true);
    });
  }.bind(this);

  evalNextForm();
};

/**
 * Value location object.
 *
 * Location is essentially used to box value references. Any global or local
 * bindings stored in an environment are stored as Location objects which hold
 * some currently assigned value.
 */
ccc.Location = function(name, value) {
  this.name_ = name;
  this.value_ = value || ccc.unspecified;
};

ccc.Location.prototype = { __proto__: ccc.Object.prototype };
ccc.Location.prototype.constructor = ccc.Location;

ccc.Location.prototype.toString = function() {
  return "#<location:" + this.name_ + ">";
};

ccc.Location.prototype.eval = function(environment, continuation) {
  return function() {
    return continuation(this.value_);
  }.bind(this);
};

/**
 * Global binding object.
 *
 * Any symbol that cannot be resolved at compile time is compiled to one of
 * these. When a GlobalBinding is evaluated at run-time, it attempts to lookup
 * its symbol binding in the current environment. It is a run-time error if
 * no such binding exists at the time.
 */
ccc.GlobalBinding = function(name) {
  this.name_ = name;
};

ccc.GlobalBinding.prototype = { __proto__: ccc.Object.prototype };
ccc.GlobalBinding.prototype.constructor = ccc.GlobalBinding;

ccc.GlobalBinding.prototype.toString = function() {
  return "#<global-binding:" + this.name_ + ">";
};

ccc.GlobalBinding.prototype.eval = function(environment, continuation) {
  return function() {
    var location = environment.lookup(this.name_);
    if (!location)
      throw new Error("Unbound variable: " + this.name_);
    return continuation(location.value_);
  }.bind(this);
};

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

/**
 * Native function object.
 *
 * NativeFunction is constructed of a function and a display name.
 *
 * The function is called when the NativeFunction object is applied at runtime.
 * The function receives three arguments: the |environment| of the call site,
 * the |continuation |of the call site, and a proper list containing the
 * applied |arguments| (or ccc.nil if there were none).
 *
 * The function is responsible for returning some meaningful continuation
 * generator (a 0-argument function which returns a 1-argument continuation
 * function). Failure to do so results in immediate program termination.
 *
 * The most common use case is to simply return a value to the caller. To do this,
 * you can simply take the continuation you receive and:
 *
 * return continuation(yourReturnValue);
 */
ccc.NativeFunction = function(fn, name) {
  this.fn_ = fn;
  this.name_ = name || "(anonymous)";
};

ccc.NativeFunction.prototype = { __proto__: ccc.Object.prototype };
ccc.NativeFunction.prototype.constructor = ccc.NativeFunction;

ccc.NativeFunction.prototype.toString = function() {
  return "#<native-function:" + this.name_ + ">";
};

ccc.NativeFunction.prototype.apply = function(environment, continuation, args) {
  return this.fn_(environment, continuation, args);
};

/**
 * Lexical closure object.
 *
 * A Closure is used to capture an environment in which lexical bindings may
 * be established at compile time.
 *
 * Closure objects are generated at run-time by a special native function application
 * that replaces lambda forms at compile-time.
 */
ccc.Closure = function(environment, compiledBody, namedArgBindings, argsTailBinding) {
  this.capturedEnvironment_ = environment;
  this.compiledBody_ = compiledBody;
  this.namedArgBindings_ = namedArgBindings;
  this.argsTailBinding_ = argsTailBinding;
};

ccc.Closure.prototype = { __proto__: ccc.Object.prototype };
ccc.Closure.prototype.constructor = ccc.Closure;

ccc.Closure.prototype.toString = function() {
  return "#<closure>";
};

/**
 * Apply a list of arguments to the closure.
 *
 * This will augment the captured environment with local bindings to the applied
 * argument values.
 *
 * The compiled closure body is then evaluated, and any compiled lexical bindings
 * therein will resolve to their corresponding local bindings within the context of
 * the call environment.
 *
 * The tail element of the compiled body is evaluated with the original
 * callee's continuation.
 */
ccc.Closure.prototype.apply = function(environment, continuation, args) {
  var callEnvironment = new ccc.Environment(this.capturedEnvironment_);

  // Bind all named arguments to first values
  for (var i = 0; i < this.namedArgBindings_.length; ++i) {
    if (args.constructor !== ccc.Pair)
      throw new Error("Too few arguments applied to closure");
    callEnvironment.bindLocal(this.namedArgBindings_[i], args.car());
    args = args.cdr();
  }

  // Bind any remaining arguments to the tail binding, if any
  if (args !== ccc.nil && this.argsTailBinding_ === ccc.nil)
    throw new Error("Too many arguments applied to closure");
  if (this.argsTailBinding_ !== ccc.nil)
    callEnvironment.bindLocal(this.argsTailBinding_, args);

  // Step through with each compiled form continuing to the next one.
  // The final form continues to our own caller's continuation.
  var evalForms = function(forms) {
    if (forms.length === 1)
      return forms[0].eval(callEnvironment, continuation);
    return forms[0].eval(callEnvironment, function() {
      return evalForms(forms.slice(1));
    });
  };
  return evalForms(this.compiledBody_.slice());
};

/**
 * Continuation object.
 *
 * This captures a continuation function as a first-class object that can be
 * evaluated and applied by the runtime.
 *
 * A proper continuation function is 1-argument function which returns
 * a continuation generator.
 *
 * A continuation generator is a 0-argument function which returns a
 * continuation function (NOT a Continuation instance!)
 */
ccc.Continuation = function(fn) {
  this.fn_ = fn;
};

ccc.Continuation.prototype = { __proto__: ccc.Object.prototype };
ccc.Continuation.prototype.constructor = ccc.Continuation;

ccc.Continuation.prototype.toString = function() {
  return "#<continuation>";
};

ccc.Continuation.prototype.apply = function(environment, continuation, args) {
  if (args === ccc.nil || args.cdr() !== ccc.nil)
    throw new Error("Wrong number of args given to continuation");
  return function() {
    return this.fn_(args.car());
  }.bind(this);
};

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

/**
 * This is the set of primitive library syntax transformers that are built into
 * top-level environments. The general strategy for implementing library syntax
 * is to replace the input form with a call to a native black-box function that
 * Does The Right Thing to the environment when applied.
 */
ccc.PrimitiveTransformers = {};

// Simply return the quoted data when applied
ccc.PrimitiveTransformers["quote"] = new ccc.Transformer(function(environment, form) {
  var datum = form.car();
  return new ccc.Pair(
    new ccc.NativeFunction(function(environment, continuation, args) {
        return function() {
          return continuation(datum);
        };
      }, 'quote'),
    ccc.nil);
});

/**
 * Bind the given symbol name. The symbol name is captured at compile time,
 * so e.g., (define x (some expression)) compiles to
 *
 * (#<native-function-which-binds-x-to-arg1-value> (some expression))
 */
ccc.PrimitiveTransformers["define"] = new ccc.Transformer(function(environment, form) {
  if (form.constructor !== ccc.Pair)
    throw new Error("Invalid form for 'define: not enough arguments");

  var symbol = form.car();
  if (symbol.constructor === ccc.Pair) {
    var args = symbol.cdr();
    var body = form.cdr();
    symbol = symbol.car();
    return ccc.Pair.makeList(
      new ccc.Symbol("define"),
      symbol,
      new ccc.Pair(new ccc.Symbol("lambda"), new ccc.Pair(args, body)));
  }

  if (symbol.constructor !== ccc.Symbol)
    throw new Error("Invalid form for 'define: symbol expected as first argument");

  var rest = form.cdr();
  if (rest.constructor !== ccc.Pair)
    throw new Error("Invalid form for 'define");

  if (rest.cdr() !== ccc.nil)
    throw new Error("Invalid form for 'define: too many arguments");

  return form.withCar(new ccc.NativeFunction(function(environment, continuation, args) {
    return function() {
      var location = environment.lookup(symbol.name);
      if (!location || location.constructor !== ccc.Location)
        environment.bindGlobal(symbol.name, args.car());
      else
        location.value_ = args.car();
      return continuation(ccc.unspecified);
    };
  }, 'bind-variable'));
});


/**
 * Mutate the value stored at a symbol's bound location. The symbol's binding
 * is captured at compile time and may be an unresolved GlobalBinding, a resolved
 * global variable Location, or a resolved LexicalBinding.
 *
 * The resulting run-time native function completes the binding resolution
 * if necessary and modifies the value stored at the bound location.
 */
ccc.PrimitiveTransformers["set!"] = new ccc.Transformer(function(environment, form) {
  if (form.constructor !== ccc.Pair)
    throw new Error("Invalid form for 'set!: not enough arguments");

  var symbol = form.car();
  if (symbol.constructor !== ccc.Symbol)
    throw new Error("Invalid form for 'set!: symbol expected as first argument");

  var rest = form.cdr();
  if (rest.constructor !== ccc.Pair)
    throw new Error("Invalid form for 'set!");

  if (rest.cdr() !== ccc.nil)
    throw new Error("Invalid form for 'set!: too many arguments");

  var binding = symbol.compile(environment);
  return form.withCar(new ccc.NativeFunction(function(environment, continuation, args) {
    return function() {
      var location = binding;
      if (binding.constructor === ccc.LexicalBinding)
        location = environment.lookupLocal(binding.id_);
      else if (binding.constructor === ccc.GlobalBinding)
        location = environment.lookup(binding.name_);
      if (!location)
        throw new Error("Unbound variable: " + symbol.name);
      location.value_ = args.car();
      return continuation(ccc.unspecified);
    };
  }, 'set-variable'));
});

/**
 * Lambda forms compile to a native function which, when applied, will return
 * a new Closure object to capture the calling environment along with leixcal
 * bindings corresponding to named arguments. The entire body is captured and
 * compiled within the new lexical environment, so that a compiled lambda
 * appears externally as (#<native-function-to-generate-a-closure>).
 */
ccc.PrimitiveTransformers["lambda"] = new ccc.Transformer(function(environment, form) {
  if (form.constructor !== ccc.Pair)
    throw new Error("Bad lambda body: " + form.toString());

  var argsForm = form.car();
  var body = form.cdr();
  if (body.constructor !== ccc.Pair)
    throw new Error("Bad lambda body: " + form.toString());

  var newEnvironment = new ccc.Environment(environment);
  var namedArgBindings = [];
  var argsTailBinding = ccc.nil;
  if (argsForm.constructor === ccc.Symbol) {
    argsTailBinding = newEnvironment.bindLexical(argsForm.name);
  } else if (argsForm.constructor === ccc.Pair) {
    var bindNamedArg = function(symbol) {
      if (symbol.constructor !== ccc.Symbol)
        throw new Error("Invalid args form");
      namedArgBindings.push(newEnvironment.bindLexical(symbol.name));
    };
    var bindArgsTail = function(symbol) {
      if (symbol.constructor !== ccc.Symbol)
        throw new Error("Invalid args form");
      argsTailBinding = newEnvironment.bindLexical(symbol.name);
    }
    argsForm.forEach(bindNamedArg, bindArgsTail);
  } else if (argsForm !== ccc.nil) {
    throw new Error("Invalid args form");
  }

  var compiledBody = [];
  body.forEach(function (form) {
      compiledBody.push(form.compile(newEnvironment));
    },
    function () {
      throw new Error("Invalid lambda body")
    });

  return new ccc.Pair(
    new ccc.NativeFunction(function(environment, continuation, args) {
        return function() {
          return continuation(new ccc.Closure(environment, compiledBody, namedArgBindings, argsTailBinding));
        };
      }, 'make-closure'),
    ccc.nil);
});

/**
 * Conditional. Like lambda, this form compiles to a single 0-argument native
 * function call. The conditional expression, the consequent, and the optional
 * alternate forms are compiled and held internally. When applied, the native
 * function evaluates the compiled conditional expression and then proceeds
 * by evaluating either the consequent or the alternate. */
ccc.PrimitiveTransformers["if"] = new ccc.Transformer(function(environment, form) {
  if (form.constructor !== ccc.Pair)
    throw new Error("Bad 'if form");

  var condition = form.car();
  var consequent = form.cdr();
  if (consequent === ccc.nil || consequent.constructor !== ccc.Pair)
    throw new Error("Bad 'if form");

  var alternate = consequent.cdr();
  consequent = consequent.car();

  if (alternate === ccc.nil) {
    alternate = ccc.unspecified;
  } else if (alternate.constructor === ccc.Pair) {
    if (alternate.cdr() !== ccc.nil)
      throw new Error("Bad 'if form");
    alternate = alternate.car();
  } else {
    throw new Error("Bad 'if form");
  }

  condition = condition.compile(environment);
  consequent = consequent.compile(environment);
  alternate = alternate.compile(environment);

  return new ccc.Pair(
    new ccc.NativeFunction(function(environment, continuation, args) {
      return function() {
        return condition.eval(environment, function(value) {
          if (value !== ccc.f)
            return consequent.eval(environment, continuation);
          return alternate.eval(environment, continuation);
        });
      };
    }, 'if'),
    ccc.nil);
});
/**
 * Native function library.
 *
 * This provides some convenient interface for establishing named bindings to
 * native function implementations for import into a program environment.
 *
 * Library objects can be imported into a live Environment using the environment's
 * importLibrary method.
 */
ccc.Library = function(name) {
  this.name_ = name;
  this.entries_ = {};
};

ccc.Library.prototype = { __proto__: ccc.Object.prototype };
ccc.Library.prototype.constructor = ccc.Library;

ccc.Library.prototype.name = function() {
  return this.name_;
};

ccc.Library.prototype.entries = function() {
  return this.entries_;
};

/**
 * Adds a NativeFunction object to the library. This is useful when you know what
 * you are doing and addSimpleFunction just doesn't cut it. All library entries
 * are ultimately native functions, but the majority of entries can be built
 * using the simpler (and aptly named) addSimpleFunction approach.
 *
 * Examples of when this method is needed instead:
 *  - Performing arity dispatch
 *  - Supporting arity other than fixed-N or 0-or-more.
 *  - Avoiding the overhead of an implicit args list-to-array conversion
 *  - Returning to a continuation other than the one provided by your caller
 */
ccc.Library.prototype.addNativeFunction = function(name, nativeFunction) {
  this.entries_[name] = new ccc.NativeFunction(nativeFunction, this.name_ + ":" + name);
};

/**
 * Calls addNativeFunction for each key-value pair in the argument object.
 */
ccc.Library.prototype.addNativeFunctions = function(entries) {
  for (var name in entries) {
    if (entries.hasOwnProperty(name)) {
      this.addNativeFunction(name, entries[name]);
    }
  }
};

/**
 * Adds a NativeFunction object to the library using a general-purpose boilerplate
 * call wrapper.
 *
 * Rather than providing a function which has a lot of low-level responsibility,
 * you simply provide a function which optionally takes named arguments and which
 * optionally returns some kind of ccc Object.
 *
 * If your function lists no argument names, it is assumed to take 0 or more arguments;
 * no arity checking is done by the wrapper function and you can do whatever you like
 * with the standard function |arguments| array-ish.
 *
 * If your function does list argument names, it is assumed to take exactly that many
 * arguments. Arity checking is done by the wrapper function and an exception is thrown
 * if there is a mismatch when called. If there is no mismatch, your named arguments
 * are properly bound to the caller's argument values.
 *
 * If your function returns no value, it will implicitly behave as if it returned
 * the ccc.unspecified value.
 */
ccc.Library.prototype.addSimpleFunction = function(name, fn) {
  this.entries_[name] = new ccc.NativeFunction(function(environment, continuation, args) {
    args = args.toArray();
    if (fn.length > 0 && args.length !== fn.length)
      throw new Error(name + ": Wrong number of arguments. Expected " + fn.length + "; received " + args.length);
    var result = fn.apply(null, args);
    if (result === undefined)
      result = ccc.unspecified;
    return continuation(result);
  }, this.name_ + ":" + name);
};

/**
 * Calls addSimpleFunction for each key-value pair in the argument object.
 */
ccc.Library.prototype.addSimpleFunctions = function(entries) {
  for (var name in entries) {
    if (entries.hasOwnProperty(name)) {
      this.addSimpleFunction(name, entries[name]);
    }
  }
};
ccc.Parser = (function() {
  /*
   * Generated by PEG.js 0.7.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(expected, found, offset, line, column) {
    function buildMessage(expected, found) {
      function stringEscape(s) {
        function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

        return s
          .replace(/\\/g,   '\\\\')
          .replace(/"/g,    '\\"')
          .replace(/\x08/g, '\\b')
          .replace(/\t/g,   '\\t')
          .replace(/\n/g,   '\\n')
          .replace(/\f/g,   '\\f')
          .replace(/\r/g,   '\\r')
          .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
          .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
          .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
          .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
      }

      var expectedDesc, foundDesc;

      switch (expected.length) {
        case 0:
          expectedDesc = "end of input";
          break;

        case 1:
          expectedDesc = expected[0];
          break;

        default:
          expectedDesc = expected.slice(0, -1).join(", ")
            + " or "
            + expected[expected.length - 1];
      }

      foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

      return "Expected " + expectedDesc + " but " + foundDesc + " found.";
    }

    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
    this.message  = buildMessage(expected, found);
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$startRuleFunctions = { start: peg$parsestart, datum: peg$parsedatum },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = null,
        peg$c1 = function(p) { return p; },
        peg$c2 = /^[ \t\f\r\n\x0B\xA0\u2000-\u200B\u2028\u2029\u202F\u3000]/,
        peg$c3 = "[ \\t\\f\\r\\n\\x0B\\xA0\\u2000-\\u200B\\u2028\\u2029\\u202F\\u3000]",
        peg$c4 = [],
        peg$c5 = function() { return ''; },
        peg$c6 = "",
        peg$c7 = /^[ "\t\f\r\n();[\]|]/,
        peg$c8 = "[ \"\\t\\f\\r\\n();[\\]|]",
        peg$c9 = "any character",
        peg$c10 = ";",
        peg$c11 = "\";\"",
        peg$c12 = /^[^\n\r]/,
        peg$c13 = "[^\\n\\r]",
        peg$c14 = /^[\n\r]/,
        peg$c15 = "[\\n\\r]",
        peg$c16 = "#;",
        peg$c17 = "\"#;\"",
        peg$c18 = "\u03BB",
        peg$c19 = "\"\\u03BB\"",
        peg$c20 = function() {
            return new ccc.Symbol("lambda");
          },
        peg$c21 = function(i, j) {
            return new ccc.Symbol(i + j.join(""));
          },
        peg$c22 = function(i) {
            return new ccc.Symbol(i);
          },
        peg$c23 = /^[!$%&*\/:<=>?\^_~a-z0-9]/i,
        peg$c24 = "[!$%&*\\/:<=>?\\^_~a-z0-9]i",
        peg$c25 = /^[\x80-\uFFFF]/,
        peg$c26 = "[\\x80-\\uFFFF]",
        peg$c27 = function(c) { return c; },
        peg$c28 = /^[0-9]/,
        peg$c29 = "[0-9]",
        peg$c30 = /^[0-9a-f]/i,
        peg$c31 = "[0-9a-f]i",
        peg$c32 = "+",
        peg$c33 = "\"+\"",
        peg$c34 = "-",
        peg$c35 = "\"-\"",
        peg$c36 = ".",
        peg$c37 = "\".\"",
        peg$c38 = "@",
        peg$c39 = "\"@\"",
        peg$c40 = "...",
        peg$c41 = "\"...\"",
        peg$c42 = "#t",
        peg$c43 = "\"#t\"",
        peg$c44 = function() { return ccc.t; },
        peg$c45 = "#f",
        peg$c46 = "\"#f\"",
        peg$c47 = function() { return ccc.f; },
        peg$c48 = "#\\space",
        peg$c49 = "\"#\\\\space\"",
        peg$c50 = function() { return new ccc.Char(32); },
        peg$c51 = "#\\newline",
        peg$c52 = "\"#\\\\newline\"",
        peg$c53 = function() { return new ccc.Char(10); },
        peg$c54 = "#\\x",
        peg$c55 = "\"#\\\\x\"",
        peg$c56 = function(a, b) {
            return new ccc.Char(parseInt(a + b, 16));
          },
        peg$c57 = "#\\u",
        peg$c58 = "\"#\\\\u\"",
        peg$c59 = function(a, b, c, d) {
            return new ccc.Char(parseInt(a + b + c + d, 16));
          },
        peg$c60 = "#\\",
        peg$c61 = "\"#\\\\\"",
        peg$c62 = function(c) { return new ccc.Char(c.charCodeAt(0)); },
        peg$c63 = "\"",
        peg$c64 = "\"\\\"\"",
        peg$c65 = function(chars) {
            return new ccc.String(chars.join(""));
          },
        peg$c66 = "\\\\",
        peg$c67 = "\"\\\\\\\\\"",
        peg$c68 = function() { return "\\"; },
        peg$c69 = "\\n",
        peg$c70 = "\"\\\\n\"",
        peg$c71 = function() { return "\n"; },
        peg$c72 = "\\t",
        peg$c73 = "\"\\\\t\"",
        peg$c74 = function() { return "\t"; },
        peg$c75 = "\\f",
        peg$c76 = "\"\\\\f\"",
        peg$c77 = function() { return "\f"; },
        peg$c78 = "\\r",
        peg$c79 = "\"\\\\r\"",
        peg$c80 = function() { return "\r"; },
        peg$c81 = "\\'",
        peg$c82 = "\"\\\\'\"",
        peg$c83 = function() { return "'"; },
        peg$c84 = "\\\"",
        peg$c85 = "\"\\\\\\\"\"",
        peg$c86 = function() { return "\""; },
        peg$c87 = "\\x",
        peg$c88 = "\"\\\\x\"",
        peg$c89 = function(a, b) {
            return String.fromCharCode(parseInt(a + b, 16));
          },
        peg$c90 = "\\u",
        peg$c91 = "\"\\\\u\"",
        peg$c92 = function(a, b, c, d) {
            return String.fromCharCode(parseInt(a + b + c + d, 16));
          },
        peg$c93 = /^[^"\\]/,
        peg$c94 = "[^\"\\\\]",
        peg$c95 = "|",
        peg$c96 = "\"|\"",
        peg$c97 = function(chars) {
            return new ccc.Symbol(chars.join(""));
          },
        peg$c98 = /^[^|\\]/,
        peg$c99 = "[^|\\\\]",
        peg$c100 = "\\|",
        peg$c101 = "\"\\\\|\"",
        peg$c102 = function() { return "|"; },
        peg$c103 = "(",
        peg$c104 = "\"(\"",
        peg$c105 = ")",
        peg$c106 = "\")\"",
        peg$c107 = function() { return ccc.nil; },
        peg$c108 = "[",
        peg$c109 = "\"[\"",
        peg$c110 = "]",
        peg$c111 = "\"]\"",
        peg$c112 = "#?",
        peg$c113 = "\"#?\"",
        peg$c114 = function() { return ccc.unspecified; },
        peg$c115 = "#b",
        peg$c116 = "\"#b\"",
        peg$c117 = /^[\-+]/,
        peg$c118 = "[\\-+]",
        peg$c119 = /^[01]/,
        peg$c120 = "[01]",
        peg$c121 = function(sign, digits) {
            return new ccc.Number(parseInt(sign + digits.join(""), 2));
          },
        peg$c122 = "#o",
        peg$c123 = "\"#o\"",
        peg$c124 = /^[0-7]/,
        peg$c125 = "[0-7]",
        peg$c126 = function(sign, digits) {
            return new ccc.Number(parseInt(sign + digits.join(""), 8));
          },
        peg$c127 = "#x",
        peg$c128 = "\"#x\"",
        peg$c129 = function(sign, digits) {
            return new ccc.Number(parseInt(sign + digits.join(""), 16));
          },
        peg$c130 = /^[eE]/,
        peg$c131 = "[eE]",
        peg$c132 = function(e, s, d) { return e + s + d.join(""); },
        peg$c133 = "#d",
        peg$c134 = "\"#d\"",
        peg$c135 = function(sign, intPart, fracPart, suffix) {
            return new ccc.Number(parseFloat(sign + intPart.join("") + "." + fracPart.join("") + suffix));
          },
        peg$c136 = function(sign, digits, suffix) {
            return new ccc.Number(parseFloat(sign + digits.join("") + suffix));
          },
        peg$c137 = function(car, cdr) {
            return new ccc.Pair(car, cdr);
          },
        peg$c138 = function(car) {
            return new ccc.Pair(car, ccc.nil);
          },
        peg$c139 = function(data) {
            return data;
          },
        peg$c140 = ",@",
        peg$c141 = "\",@\"",
        peg$c142 = function(datum) {
            return ccc.Pair.makeList(new ccc.Symbol('unquote-splicing'), datum);
          },
        peg$c143 = "'",
        peg$c144 = "\"'\"",
        peg$c145 = function(datum) {
            return ccc.Pair.makeList(new ccc.Symbol('quote'), datum);
          },
        peg$c146 = "`",
        peg$c147 = "\"`\"",
        peg$c148 = function(datum) {
            return ccc.Pair.makeList(new ccc.Symbol('quasiquote'), datum);
          },
        peg$c149 = ",",
        peg$c150 = "\",\"",
        peg$c151 = function(datum) {
            return ccc.Pair.makeList(new ccc.Symbol('unquote'), datum);
          },
        peg$c152 = "#(",
        peg$c153 = "\"#(\"",
        peg$c154 = function(elements) {
            return new ccc.Vector(elements.map(function(e) { return e[0]; }));
          },
        peg$c155 = "#[",
        peg$c156 = "\"#[\"",
        peg$c157 = function(data) {
            return data.map(function(e) { return e[0] });
          },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$cleanupExpected(expected) {
      var i = 0;

      expected.sort();

      while (i < expected.length) {
        if (expected[i - 1] === expected[i]) {
          expected.splice(i, 1);
        } else {
          i++;
        }
      }
    }

    function peg$parsestart() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== null) {
        s2 = peg$parseprogram();
        if (s2 !== null) {
          s3 = peg$parse__();
          if (s3 !== null) {
            peg$reportedPos = s0;
            s1 = peg$c1(s2);
            if (s1 === null) {
              peg$currPos = s0;
              s0 = s1;
            } else {
              s0 = s1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsespace() {
      var s0;

      if (peg$c2.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c3); }
      }

      return s0;
    }

    function peg$parsenothing() {
      var s0;

      s0 = peg$parsespace();
      if (s0 === null) {
        s0 = peg$parsecomment();
      }

      return s0;
    }

    function peg$parse__() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsenothing();
      while (s2 !== null) {
        s1.push(s2);
        s2 = peg$parsenothing();
      }
      if (s1 !== null) {
        peg$reportedPos = s0;
        s1 = peg$c5();
      }
      if (s1 === null) {
        peg$currPos = s0;
        s0 = s1;
      } else {
        s0 = s1;
      }

      return s0;
    }

    function peg$parseDL() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (peg$c7.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c8); }
      }
      peg$silentFails--;
      if (s2 !== null) {
        peg$currPos = s1;
        s1 = peg$c6;
      } else {
        s1 = peg$c0;
      }
      if (s1 !== null) {
        s2 = peg$parse__();
        if (s2 !== null) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === null) {
        s0 = peg$currPos;
        peg$silentFails++;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c9); }
        }
        peg$silentFails--;
        if (s1 === null) {
          s0 = peg$c6;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parsecomment() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 59) {
        s1 = peg$c10;
        peg$currPos++;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c11); }
      }
      if (s1 !== null) {
        s2 = [];
        if (peg$c12.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c13); }
        }
        while (s3 !== null) {
          s2.push(s3);
          if (peg$c12.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c13); }
          }
        }
        if (s2 !== null) {
          if (peg$c14.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c15); }
          }
          if (s3 === null) {
            s3 = peg$c6;
          }
          if (s3 !== null) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === null) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c16) {
          s1 = peg$c16;
          peg$currPos += 2;
        } else {
          s1 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c17); }
        }
        if (s1 !== null) {
          s2 = peg$parse__();
          if (s2 !== null) {
            s3 = peg$parsedatum();
            if (s3 !== null) {
              s1 = [s1, s2, s3];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parsesymbol() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 955) {
        s1 = peg$c18;
        peg$currPos++;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c19); }
      }
      if (s1 !== null) {
        s2 = peg$parseDL();
        if (s2 !== null) {
          peg$reportedPos = s0;
          s1 = peg$c20();
          if (s1 === null) {
            peg$currPos = s0;
            s0 = s1;
          } else {
            s0 = s1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === null) {
        s0 = peg$currPos;
        s1 = peg$parseinitial();
        if (s1 !== null) {
          s2 = [];
          s3 = peg$parsesubsequent();
          while (s3 !== null) {
            s2.push(s3);
            s3 = peg$parsesubsequent();
          }
          if (s2 !== null) {
            s3 = peg$parseDL();
            if (s3 !== null) {
              peg$reportedPos = s0;
              s1 = peg$c21(s1,s2);
              if (s1 === null) {
                peg$currPos = s0;
                s0 = s1;
              } else {
                s0 = s1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === null) {
          s0 = peg$currPos;
          s1 = peg$parsepeculiar_identifier();
          if (s1 !== null) {
            s2 = peg$parseDL();
            if (s2 !== null) {
              peg$reportedPos = s0;
              s1 = peg$c22(s1);
              if (s1 === null) {
                peg$currPos = s0;
                s0 = s1;
              } else {
                s0 = s1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
          if (s0 === null) {
            s0 = peg$parsequoted_symbol();
          }
        }
      }

      return s0;
    }

    function peg$parseinitial() {
      var s0, s1, s2;

      if (peg$c23.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c24); }
      }
      if (s0 === null) {
        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        s2 = peg$parsespace();
        peg$silentFails--;
        if (s2 === null) {
          s1 = peg$c6;
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== null) {
          if (peg$c25.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c26); }
          }
          if (s2 !== null) {
            peg$reportedPos = s0;
            s1 = peg$c27(s2);
            if (s1 === null) {
              peg$currPos = s0;
              s0 = s1;
            } else {
              s0 = s1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parsesubsequent() {
      var s0;

      s0 = peg$parseinitial();
      if (s0 === null) {
        s0 = peg$parsedigit();
        if (s0 === null) {
          s0 = peg$parsespecial_subsequent();
        }
      }

      return s0;
    }

    function peg$parsedigit() {
      var s0;

      if (peg$c28.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c29); }
      }

      return s0;
    }

    function peg$parsehexdigit() {
      var s0;

      if (peg$c30.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c31); }
      }

      return s0;
    }

    function peg$parsespecial_subsequent() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 43) {
        s0 = peg$c32;
        peg$currPos++;
      } else {
        s0 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c33); }
      }
      if (s0 === null) {
        if (input.charCodeAt(peg$currPos) === 45) {
          s0 = peg$c34;
          peg$currPos++;
        } else {
          s0 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c35); }
        }
        if (s0 === null) {
          if (input.charCodeAt(peg$currPos) === 46) {
            s0 = peg$c36;
            peg$currPos++;
          } else {
            s0 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c37); }
          }
          if (s0 === null) {
            if (input.charCodeAt(peg$currPos) === 64) {
              s0 = peg$c38;
              peg$currPos++;
            } else {
              s0 = null;
              if (peg$silentFails === 0) { peg$fail(peg$c39); }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsepeculiar_identifier() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 43) {
        s0 = peg$c32;
        peg$currPos++;
      } else {
        s0 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c33); }
      }
      if (s0 === null) {
        if (input.charCodeAt(peg$currPos) === 45) {
          s0 = peg$c34;
          peg$currPos++;
        } else {
          s0 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c35); }
        }
        if (s0 === null) {
          if (input.substr(peg$currPos, 3) === peg$c40) {
            s0 = peg$c40;
            peg$currPos += 3;
          } else {
            s0 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c41); }
          }
        }
      }

      return s0;
    }

    function peg$parseboolean() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2).toLowerCase() === peg$c42) {
        s1 = input.substr(peg$currPos, 2);
        peg$currPos += 2;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c43); }
      }
      if (s1 !== null) {
        s2 = peg$parseDL();
        if (s2 !== null) {
          peg$reportedPos = s0;
          s1 = peg$c44();
          if (s1 === null) {
            peg$currPos = s0;
            s0 = s1;
          } else {
            s0 = s1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === null) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2).toLowerCase() === peg$c45) {
          s1 = input.substr(peg$currPos, 2);
          peg$currPos += 2;
        } else {
          s1 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c46); }
        }
        if (s1 !== null) {
          s2 = peg$parseDL();
          if (s2 !== null) {
            peg$reportedPos = s0;
            s1 = peg$c47();
            if (s1 === null) {
              peg$currPos = s0;
              s0 = s1;
            } else {
              s0 = s1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parsecharacter() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 7).toLowerCase() === peg$c48) {
        s1 = input.substr(peg$currPos, 7);
        peg$currPos += 7;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c49); }
      }
      if (s1 !== null) {
        s2 = peg$parseDL();
        if (s2 !== null) {
          peg$reportedPos = s0;
          s1 = peg$c50();
          if (s1 === null) {
            peg$currPos = s0;
            s0 = s1;
          } else {
            s0 = s1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === null) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 9).toLowerCase() === peg$c51) {
          s1 = input.substr(peg$currPos, 9);
          peg$currPos += 9;
        } else {
          s1 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c52); }
        }
        if (s1 !== null) {
          s2 = peg$parseDL();
          if (s2 !== null) {
            peg$reportedPos = s0;
            s1 = peg$c53();
            if (s1 === null) {
              peg$currPos = s0;
              s0 = s1;
            } else {
              s0 = s1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === null) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 3).toLowerCase() === peg$c54) {
            s1 = input.substr(peg$currPos, 3);
            peg$currPos += 3;
          } else {
            s1 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c55); }
          }
          if (s1 !== null) {
            s2 = peg$parsehexdigit();
            if (s2 !== null) {
              s3 = peg$parsehexdigit();
              if (s3 !== null) {
                s4 = peg$parseDL();
                if (s4 !== null) {
                  peg$reportedPos = s0;
                  s1 = peg$c56(s2,s3);
                  if (s1 === null) {
                    peg$currPos = s0;
                    s0 = s1;
                  } else {
                    s0 = s1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
          if (s0 === null) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 3).toLowerCase() === peg$c57) {
              s1 = input.substr(peg$currPos, 3);
              peg$currPos += 3;
            } else {
              s1 = null;
              if (peg$silentFails === 0) { peg$fail(peg$c58); }
            }
            if (s1 !== null) {
              s2 = peg$parsehexdigit();
              if (s2 !== null) {
                s3 = peg$parsehexdigit();
                if (s3 !== null) {
                  s4 = peg$parsehexdigit();
                  if (s4 !== null) {
                    s5 = peg$parsehexdigit();
                    if (s5 !== null) {
                      s6 = peg$parseDL();
                      if (s6 !== null) {
                        peg$reportedPos = s0;
                        s1 = peg$c59(s2,s3,s4,s5);
                        if (s1 === null) {
                          peg$currPos = s0;
                          s0 = s1;
                        } else {
                          s0 = s1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
            if (s0 === null) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 2) === peg$c60) {
                s1 = peg$c60;
                peg$currPos += 2;
              } else {
                s1 = null;
                if (peg$silentFails === 0) { peg$fail(peg$c61); }
              }
              if (s1 !== null) {
                if (input.length > peg$currPos) {
                  s2 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s2 = null;
                  if (peg$silentFails === 0) { peg$fail(peg$c9); }
                }
                if (s2 !== null) {
                  s3 = peg$parseDL();
                  if (s3 !== null) {
                    peg$reportedPos = s0;
                    s1 = peg$c62(s2);
                    if (s1 === null) {
                      peg$currPos = s0;
                      s0 = s1;
                    } else {
                      s0 = s1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsestring() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 34) {
        s1 = peg$c63;
        peg$currPos++;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c64); }
      }
      if (s1 !== null) {
        s2 = [];
        s3 = peg$parsestring_element();
        while (s3 !== null) {
          s2.push(s3);
          s3 = peg$parsestring_element();
        }
        if (s2 !== null) {
          if (input.charCodeAt(peg$currPos) === 34) {
            s3 = peg$c63;
            peg$currPos++;
          } else {
            s3 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c64); }
          }
          if (s3 !== null) {
            peg$reportedPos = s0;
            s1 = peg$c65(s2);
            if (s1 === null) {
              peg$currPos = s0;
              s0 = s1;
            } else {
              s0 = s1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseescape_sequence() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c66) {
        s1 = peg$c66;
        peg$currPos += 2;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c67); }
      }
      if (s1 !== null) {
        peg$reportedPos = s0;
        s1 = peg$c68();
      }
      if (s1 === null) {
        peg$currPos = s0;
        s0 = s1;
      } else {
        s0 = s1;
      }
      if (s0 === null) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c69) {
          s1 = peg$c69;
          peg$currPos += 2;
        } else {
          s1 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c70); }
        }
        if (s1 !== null) {
          peg$reportedPos = s0;
          s1 = peg$c71();
        }
        if (s1 === null) {
          peg$currPos = s0;
          s0 = s1;
        } else {
          s0 = s1;
        }
        if (s0 === null) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 2) === peg$c72) {
            s1 = peg$c72;
            peg$currPos += 2;
          } else {
            s1 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c73); }
          }
          if (s1 !== null) {
            peg$reportedPos = s0;
            s1 = peg$c74();
          }
          if (s1 === null) {
            peg$currPos = s0;
            s0 = s1;
          } else {
            s0 = s1;
          }
          if (s0 === null) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c75) {
              s1 = peg$c75;
              peg$currPos += 2;
            } else {
              s1 = null;
              if (peg$silentFails === 0) { peg$fail(peg$c76); }
            }
            if (s1 !== null) {
              peg$reportedPos = s0;
              s1 = peg$c77();
            }
            if (s1 === null) {
              peg$currPos = s0;
              s0 = s1;
            } else {
              s0 = s1;
            }
            if (s0 === null) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 2) === peg$c78) {
                s1 = peg$c78;
                peg$currPos += 2;
              } else {
                s1 = null;
                if (peg$silentFails === 0) { peg$fail(peg$c79); }
              }
              if (s1 !== null) {
                peg$reportedPos = s0;
                s1 = peg$c80();
              }
              if (s1 === null) {
                peg$currPos = s0;
                s0 = s1;
              } else {
                s0 = s1;
              }
              if (s0 === null) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 2) === peg$c81) {
                  s1 = peg$c81;
                  peg$currPos += 2;
                } else {
                  s1 = null;
                  if (peg$silentFails === 0) { peg$fail(peg$c82); }
                }
                if (s1 !== null) {
                  peg$reportedPos = s0;
                  s1 = peg$c83();
                }
                if (s1 === null) {
                  peg$currPos = s0;
                  s0 = s1;
                } else {
                  s0 = s1;
                }
                if (s0 === null) {
                  s0 = peg$currPos;
                  if (input.substr(peg$currPos, 2) === peg$c84) {
                    s1 = peg$c84;
                    peg$currPos += 2;
                  } else {
                    s1 = null;
                    if (peg$silentFails === 0) { peg$fail(peg$c85); }
                  }
                  if (s1 !== null) {
                    peg$reportedPos = s0;
                    s1 = peg$c86();
                  }
                  if (s1 === null) {
                    peg$currPos = s0;
                    s0 = s1;
                  } else {
                    s0 = s1;
                  }
                  if (s0 === null) {
                    s0 = peg$currPos;
                    if (input.substr(peg$currPos, 2) === peg$c87) {
                      s1 = peg$c87;
                      peg$currPos += 2;
                    } else {
                      s1 = null;
                      if (peg$silentFails === 0) { peg$fail(peg$c88); }
                    }
                    if (s1 !== null) {
                      s2 = peg$parsehexdigit();
                      if (s2 !== null) {
                        s3 = peg$parsehexdigit();
                        if (s3 !== null) {
                          peg$reportedPos = s0;
                          s1 = peg$c89(s2,s3);
                          if (s1 === null) {
                            peg$currPos = s0;
                            s0 = s1;
                          } else {
                            s0 = s1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                    if (s0 === null) {
                      s0 = peg$currPos;
                      if (input.substr(peg$currPos, 2) === peg$c90) {
                        s1 = peg$c90;
                        peg$currPos += 2;
                      } else {
                        s1 = null;
                        if (peg$silentFails === 0) { peg$fail(peg$c91); }
                      }
                      if (s1 !== null) {
                        s2 = peg$parsehexdigit();
                        if (s2 !== null) {
                          s3 = peg$parsehexdigit();
                          if (s3 !== null) {
                            s4 = peg$parsehexdigit();
                            if (s4 !== null) {
                              s5 = peg$parsehexdigit();
                              if (s5 !== null) {
                                peg$reportedPos = s0;
                                s1 = peg$c92(s2,s3,s4,s5);
                                if (s1 === null) {
                                  peg$currPos = s0;
                                  s0 = s1;
                                } else {
                                  s0 = s1;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c0;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c0;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c0;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsestring_element() {
      var s0;

      if (peg$c93.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c94); }
      }
      if (s0 === null) {
        s0 = peg$parseescape_sequence();
      }

      return s0;
    }

    function peg$parsequoted_symbol() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 124) {
        s1 = peg$c95;
        peg$currPos++;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c96); }
      }
      if (s1 !== null) {
        s2 = [];
        s3 = peg$parsesymbol_element();
        if (s3 !== null) {
          while (s3 !== null) {
            s2.push(s3);
            s3 = peg$parsesymbol_element();
          }
        } else {
          s2 = peg$c0;
        }
        if (s2 !== null) {
          if (input.charCodeAt(peg$currPos) === 124) {
            s3 = peg$c95;
            peg$currPos++;
          } else {
            s3 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c96); }
          }
          if (s3 !== null) {
            peg$reportedPos = s0;
            s1 = peg$c97(s2);
            if (s1 === null) {
              peg$currPos = s0;
              s0 = s1;
            } else {
              s0 = s1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsesymbol_element() {
      var s0, s1;

      if (peg$c98.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c99); }
      }
      if (s0 === null) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c100) {
          s1 = peg$c100;
          peg$currPos += 2;
        } else {
          s1 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c101); }
        }
        if (s1 !== null) {
          peg$reportedPos = s0;
          s1 = peg$c102();
        }
        if (s1 === null) {
          peg$currPos = s0;
          s0 = s1;
        } else {
          s0 = s1;
        }
        if (s0 === null) {
          s0 = peg$parseescape_sequence();
        }
      }

      return s0;
    }

    function peg$parsenull_value() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 40) {
        s1 = peg$c103;
        peg$currPos++;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c104); }
      }
      if (s1 !== null) {
        s2 = peg$parse__();
        if (s2 !== null) {
          if (input.charCodeAt(peg$currPos) === 41) {
            s3 = peg$c105;
            peg$currPos++;
          } else {
            s3 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c106); }
          }
          if (s3 !== null) {
            peg$reportedPos = s0;
            s1 = peg$c107();
            if (s1 === null) {
              peg$currPos = s0;
              s0 = s1;
            } else {
              s0 = s1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === null) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 91) {
          s1 = peg$c108;
          peg$currPos++;
        } else {
          s1 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c109); }
        }
        if (s1 !== null) {
          s2 = peg$parse__();
          if (s2 !== null) {
            if (input.charCodeAt(peg$currPos) === 93) {
              s3 = peg$c110;
              peg$currPos++;
            } else {
              s3 = null;
              if (peg$silentFails === 0) { peg$fail(peg$c111); }
            }
            if (s3 !== null) {
              peg$reportedPos = s0;
              s1 = peg$c107();
              if (s1 === null) {
                peg$currPos = s0;
                s0 = s1;
              } else {
                s0 = s1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parseunspecific() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c112) {
        s1 = peg$c112;
        peg$currPos += 2;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c113); }
      }
      if (s1 !== null) {
        peg$reportedPos = s0;
        s1 = peg$c114();
      }
      if (s1 === null) {
        peg$currPos = s0;
        s0 = s1;
      } else {
        s0 = s1;
      }

      return s0;
    }

    function peg$parsenumber() {
      var s0;

      s0 = peg$parsenum_2();
      if (s0 === null) {
        s0 = peg$parsenum_8();
        if (s0 === null) {
          s0 = peg$parsenum_16();
          if (s0 === null) {
            s0 = peg$parsenum_10();
          }
        }
      }

      return s0;
    }

    function peg$parsenum_2() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2).toLowerCase() === peg$c115) {
        s1 = input.substr(peg$currPos, 2);
        peg$currPos += 2;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c116); }
      }
      if (s1 !== null) {
        if (peg$c117.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c118); }
        }
        if (s2 === null) {
          s2 = peg$c6;
        }
        if (s2 !== null) {
          s3 = [];
          if (peg$c119.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c120); }
          }
          if (s4 !== null) {
            while (s4 !== null) {
              s3.push(s4);
              if (peg$c119.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s4 = null;
                if (peg$silentFails === 0) { peg$fail(peg$c120); }
              }
            }
          } else {
            s3 = peg$c0;
          }
          if (s3 !== null) {
            s4 = peg$parseDL();
            if (s4 !== null) {
              peg$reportedPos = s0;
              s1 = peg$c121(s2,s3);
              if (s1 === null) {
                peg$currPos = s0;
                s0 = s1;
              } else {
                s0 = s1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsenum_8() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2).toLowerCase() === peg$c122) {
        s1 = input.substr(peg$currPos, 2);
        peg$currPos += 2;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c123); }
      }
      if (s1 !== null) {
        if (peg$c117.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c118); }
        }
        if (s2 === null) {
          s2 = peg$c6;
        }
        if (s2 !== null) {
          s3 = [];
          if (peg$c124.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c125); }
          }
          if (s4 !== null) {
            while (s4 !== null) {
              s3.push(s4);
              if (peg$c124.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s4 = null;
                if (peg$silentFails === 0) { peg$fail(peg$c125); }
              }
            }
          } else {
            s3 = peg$c0;
          }
          if (s3 !== null) {
            s4 = peg$parseDL();
            if (s4 !== null) {
              peg$reportedPos = s0;
              s1 = peg$c126(s2,s3);
              if (s1 === null) {
                peg$currPos = s0;
                s0 = s1;
              } else {
                s0 = s1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsenum_16() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2).toLowerCase() === peg$c127) {
        s1 = input.substr(peg$currPos, 2);
        peg$currPos += 2;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c128); }
      }
      if (s1 !== null) {
        if (peg$c117.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c118); }
        }
        if (s2 === null) {
          s2 = peg$c6;
        }
        if (s2 !== null) {
          s3 = [];
          s4 = peg$parsehexdigit();
          if (s4 !== null) {
            while (s4 !== null) {
              s3.push(s4);
              s4 = peg$parsehexdigit();
            }
          } else {
            s3 = peg$c0;
          }
          if (s3 !== null) {
            s4 = peg$parseDL();
            if (s4 !== null) {
              peg$reportedPos = s0;
              s1 = peg$c129(s2,s3);
              if (s1 === null) {
                peg$currPos = s0;
                s0 = s1;
              } else {
                s0 = s1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsesuffix() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (peg$c130.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c131); }
      }
      if (s1 !== null) {
        if (peg$c117.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c118); }
        }
        if (s2 === null) {
          s2 = peg$c6;
        }
        if (s2 !== null) {
          s3 = [];
          s4 = peg$parsedigit();
          if (s4 !== null) {
            while (s4 !== null) {
              s3.push(s4);
              s4 = peg$parsedigit();
            }
          } else {
            s3 = peg$c0;
          }
          if (s3 !== null) {
            peg$reportedPos = s0;
            s1 = peg$c132(s1,s2,s3);
            if (s1 === null) {
              peg$currPos = s0;
              s0 = s1;
            } else {
              s0 = s1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parsenum_10() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2).toLowerCase() === peg$c133) {
        s1 = input.substr(peg$currPos, 2);
        peg$currPos += 2;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c134); }
      }
      if (s1 === null) {
        s1 = peg$c6;
      }
      if (s1 !== null) {
        if (peg$c117.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c118); }
        }
        if (s2 === null) {
          s2 = peg$c6;
        }
        if (s2 !== null) {
          s3 = [];
          s4 = peg$parsedigit();
          while (s4 !== null) {
            s3.push(s4);
            s4 = peg$parsedigit();
          }
          if (s3 !== null) {
            if (input.charCodeAt(peg$currPos) === 46) {
              s4 = peg$c36;
              peg$currPos++;
            } else {
              s4 = null;
              if (peg$silentFails === 0) { peg$fail(peg$c37); }
            }
            if (s4 !== null) {
              s5 = [];
              s6 = peg$parsedigit();
              if (s6 !== null) {
                while (s6 !== null) {
                  s5.push(s6);
                  s6 = peg$parsedigit();
                }
              } else {
                s5 = peg$c0;
              }
              if (s5 !== null) {
                s6 = peg$parsesuffix();
                if (s6 === null) {
                  s6 = peg$c6;
                }
                if (s6 !== null) {
                  s7 = peg$parseDL();
                  if (s7 !== null) {
                    peg$reportedPos = s0;
                    s1 = peg$c135(s2,s3,s5,s6);
                    if (s1 === null) {
                      peg$currPos = s0;
                      s0 = s1;
                    } else {
                      s0 = s1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === null) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2).toLowerCase() === peg$c133) {
          s1 = input.substr(peg$currPos, 2);
          peg$currPos += 2;
        } else {
          s1 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c134); }
        }
        if (s1 === null) {
          s1 = peg$c6;
        }
        if (s1 !== null) {
          if (peg$c117.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c118); }
          }
          if (s2 === null) {
            s2 = peg$c6;
          }
          if (s2 !== null) {
            s3 = [];
            s4 = peg$parsedigit();
            if (s4 !== null) {
              while (s4 !== null) {
                s3.push(s4);
                s4 = peg$parsedigit();
              }
            } else {
              s3 = peg$c0;
            }
            if (s3 !== null) {
              if (input.charCodeAt(peg$currPos) === 46) {
                s4 = peg$c36;
                peg$currPos++;
              } else {
                s4 = null;
                if (peg$silentFails === 0) { peg$fail(peg$c37); }
              }
              if (s4 !== null) {
                s5 = [];
                s6 = peg$parsedigit();
                while (s6 !== null) {
                  s5.push(s6);
                  s6 = peg$parsedigit();
                }
                if (s5 !== null) {
                  s6 = peg$parsesuffix();
                  if (s6 === null) {
                    s6 = peg$c6;
                  }
                  if (s6 !== null) {
                    s7 = peg$parseDL();
                    if (s7 !== null) {
                      peg$reportedPos = s0;
                      s1 = peg$c135(s2,s3,s5,s6);
                      if (s1 === null) {
                        peg$currPos = s0;
                        s0 = s1;
                      } else {
                        s0 = s1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === null) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 2).toLowerCase() === peg$c133) {
            s1 = input.substr(peg$currPos, 2);
            peg$currPos += 2;
          } else {
            s1 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c134); }
          }
          if (s1 === null) {
            s1 = peg$c6;
          }
          if (s1 !== null) {
            if (peg$c117.test(input.charAt(peg$currPos))) {
              s2 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s2 = null;
              if (peg$silentFails === 0) { peg$fail(peg$c118); }
            }
            if (s2 === null) {
              s2 = peg$c6;
            }
            if (s2 !== null) {
              s3 = [];
              s4 = peg$parsedigit();
              if (s4 !== null) {
                while (s4 !== null) {
                  s3.push(s4);
                  s4 = peg$parsedigit();
                }
              } else {
                s3 = peg$c0;
              }
              if (s3 !== null) {
                s4 = peg$parsesuffix();
                if (s4 === null) {
                  s4 = peg$c6;
                }
                if (s4 !== null) {
                  s5 = peg$parseDL();
                  if (s5 !== null) {
                    peg$reportedPos = s0;
                    s1 = peg$c136(s2,s3,s4);
                    if (s1 === null) {
                      peg$currPos = s0;
                      s0 = s1;
                    } else {
                      s0 = s1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        }
      }

      return s0;
    }

    function peg$parsedatum() {
      var s0;

      s0 = peg$parsesimple_datum();
      if (s0 === null) {
        s0 = peg$parsecompound_datum();
      }

      return s0;
    }

    function peg$parsesimple_datum() {
      var s0;

      s0 = peg$parseboolean();
      if (s0 === null) {
        s0 = peg$parsenumber();
        if (s0 === null) {
          s0 = peg$parsecharacter();
          if (s0 === null) {
            s0 = peg$parsestring();
            if (s0 === null) {
              s0 = peg$parsesymbol();
              if (s0 === null) {
                s0 = peg$parsenull_value();
                if (s0 === null) {
                  s0 = peg$parseunspecific();
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsecompound_datum() {
      var s0;

      s0 = peg$parselist();
      if (s0 === null) {
        s0 = peg$parsevector();
      }

      return s0;
    }

    function peg$parsepair() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parsedatum();
      if (s1 !== null) {
        s2 = peg$parse__();
        if (s2 !== null) {
          if (input.charCodeAt(peg$currPos) === 46) {
            s3 = peg$c36;
            peg$currPos++;
          } else {
            s3 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c37); }
          }
          if (s3 !== null) {
            s4 = peg$parse__();
            if (s4 !== null) {
              s5 = peg$parsedatum();
              if (s5 !== null) {
                peg$reportedPos = s0;
                s1 = peg$c137(s1,s5);
                if (s1 === null) {
                  peg$currPos = s0;
                  s0 = s1;
                } else {
                  s0 = s1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === null) {
        s0 = peg$currPos;
        s1 = peg$parsedatum();
        if (s1 !== null) {
          s2 = peg$parse__();
          if (s2 !== null) {
            s3 = peg$parsepair();
            if (s3 !== null) {
              peg$reportedPos = s0;
              s1 = peg$c137(s1,s3);
              if (s1 === null) {
                peg$currPos = s0;
                s0 = s1;
              } else {
                s0 = s1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === null) {
          s0 = peg$currPos;
          s1 = peg$parsedatum();
          if (s1 !== null) {
            peg$reportedPos = s0;
            s1 = peg$c138(s1);
          }
          if (s1 === null) {
            peg$currPos = s0;
            s0 = s1;
          } else {
            s0 = s1;
          }
        }
      }

      return s0;
    }

    function peg$parselist() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 40) {
        s1 = peg$c103;
        peg$currPos++;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c104); }
      }
      if (s1 !== null) {
        s2 = peg$parse__();
        if (s2 !== null) {
          s3 = peg$parsepair();
          if (s3 !== null) {
            s4 = peg$parse__();
            if (s4 !== null) {
              if (input.charCodeAt(peg$currPos) === 41) {
                s5 = peg$c105;
                peg$currPos++;
              } else {
                s5 = null;
                if (peg$silentFails === 0) { peg$fail(peg$c106); }
              }
              if (s5 !== null) {
                peg$reportedPos = s0;
                s1 = peg$c139(s3);
                if (s1 === null) {
                  peg$currPos = s0;
                  s0 = s1;
                } else {
                  s0 = s1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === null) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 91) {
          s1 = peg$c108;
          peg$currPos++;
        } else {
          s1 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c109); }
        }
        if (s1 !== null) {
          s2 = peg$parse__();
          if (s2 !== null) {
            s3 = peg$parsepair();
            if (s3 !== null) {
              s4 = peg$parse__();
              if (s4 !== null) {
                if (input.charCodeAt(peg$currPos) === 93) {
                  s5 = peg$c110;
                  peg$currPos++;
                } else {
                  s5 = null;
                  if (peg$silentFails === 0) { peg$fail(peg$c111); }
                }
                if (s5 !== null) {
                  peg$reportedPos = s0;
                  s1 = peg$c139(s3);
                  if (s1 === null) {
                    peg$currPos = s0;
                    s0 = s1;
                  } else {
                    s0 = s1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === null) {
          s0 = peg$parseabbreviation();
        }
      }

      return s0;
    }

    function peg$parseabbreviation() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c140) {
        s1 = peg$c140;
        peg$currPos += 2;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c141); }
      }
      if (s1 !== null) {
        s2 = peg$parse__();
        if (s2 !== null) {
          s3 = peg$parsedatum();
          if (s3 !== null) {
            peg$reportedPos = s0;
            s1 = peg$c142(s3);
            if (s1 === null) {
              peg$currPos = s0;
              s0 = s1;
            } else {
              s0 = s1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === null) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 39) {
          s1 = peg$c143;
          peg$currPos++;
        } else {
          s1 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c144); }
        }
        if (s1 !== null) {
          s2 = peg$parse__();
          if (s2 !== null) {
            s3 = peg$parsedatum();
            if (s3 !== null) {
              peg$reportedPos = s0;
              s1 = peg$c145(s3);
              if (s1 === null) {
                peg$currPos = s0;
                s0 = s1;
              } else {
                s0 = s1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === null) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 96) {
            s1 = peg$c146;
            peg$currPos++;
          } else {
            s1 = null;
            if (peg$silentFails === 0) { peg$fail(peg$c147); }
          }
          if (s1 !== null) {
            s2 = peg$parse__();
            if (s2 !== null) {
              s3 = peg$parsedatum();
              if (s3 !== null) {
                peg$reportedPos = s0;
                s1 = peg$c148(s3);
                if (s1 === null) {
                  peg$currPos = s0;
                  s0 = s1;
                } else {
                  s0 = s1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
          if (s0 === null) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 44) {
              s1 = peg$c149;
              peg$currPos++;
            } else {
              s1 = null;
              if (peg$silentFails === 0) { peg$fail(peg$c150); }
            }
            if (s1 !== null) {
              s2 = peg$parse__();
              if (s2 !== null) {
                s3 = peg$parsedatum();
                if (s3 !== null) {
                  peg$reportedPos = s0;
                  s1 = peg$c151(s3);
                  if (s1 === null) {
                    peg$currPos = s0;
                    s0 = s1;
                  } else {
                    s0 = s1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          }
        }
      }

      return s0;
    }

    function peg$parsevector() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c152) {
        s1 = peg$c152;
        peg$currPos += 2;
      } else {
        s1 = null;
        if (peg$silentFails === 0) { peg$fail(peg$c153); }
      }
      if (s1 !== null) {
        s2 = peg$parse__();
        if (s2 !== null) {
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$parsedatum();
          if (s5 !== null) {
            s6 = peg$parse__();
            if (s6 !== null) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$c0;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$c0;
          }
          while (s4 !== null) {
            s3.push(s4);
            s4 = peg$currPos;
            s5 = peg$parsedatum();
            if (s5 !== null) {
              s6 = peg$parse__();
              if (s6 !== null) {
                s5 = [s5, s6];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$c0;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$c0;
            }
          }
          if (s3 !== null) {
            if (input.charCodeAt(peg$currPos) === 41) {
              s4 = peg$c105;
              peg$currPos++;
            } else {
              s4 = null;
              if (peg$silentFails === 0) { peg$fail(peg$c106); }
            }
            if (s4 !== null) {
              peg$reportedPos = s0;
              s1 = peg$c154(s3);
              if (s1 === null) {
                peg$currPos = s0;
                s0 = s1;
              } else {
                s0 = s1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === null) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c155) {
          s1 = peg$c155;
          peg$currPos += 2;
        } else {
          s1 = null;
          if (peg$silentFails === 0) { peg$fail(peg$c156); }
        }
        if (s1 !== null) {
          s2 = peg$parse__();
          if (s2 !== null) {
            s3 = [];
            s4 = peg$currPos;
            s5 = peg$parsedatum();
            if (s5 !== null) {
              s6 = peg$parse__();
              if (s6 !== null) {
                s5 = [s5, s6];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$c0;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$c0;
            }
            while (s4 !== null) {
              s3.push(s4);
              s4 = peg$currPos;
              s5 = peg$parsedatum();
              if (s5 !== null) {
                s6 = peg$parse__();
                if (s6 !== null) {
                  s5 = [s5, s6];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$c0;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$c0;
              }
            }
            if (s3 !== null) {
              if (input.charCodeAt(peg$currPos) === 93) {
                s4 = peg$c110;
                peg$currPos++;
              } else {
                s4 = null;
                if (peg$silentFails === 0) { peg$fail(peg$c111); }
              }
              if (s4 !== null) {
                peg$reportedPos = s0;
                s1 = peg$c154(s3);
                if (s1 === null) {
                  peg$currPos = s0;
                  s0 = s1;
                } else {
                  s0 = s1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parseprogram() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$currPos;
      s3 = peg$parsedatum();
      if (s3 !== null) {
        s4 = peg$parse__();
        if (s4 !== null) {
          s3 = [s3, s4];
          s2 = s3;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$c0;
      }
      while (s2 !== null) {
        s1.push(s2);
        s2 = peg$currPos;
        s3 = peg$parsedatum();
        if (s3 !== null) {
          s4 = peg$parse__();
          if (s4 !== null) {
            s3 = [s3, s4];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
      }
      if (s1 !== null) {
        peg$reportedPos = s0;
        s1 = peg$c157(s1);
      }
      if (s1 === null) {
        peg$currPos = s0;
        s0 = s1;
      } else {
        s0 = s1;
      }

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== null && peg$currPos === input.length) {
      return peg$result;
    } else {
      peg$cleanupExpected(peg$maxFailExpected);
      peg$reportedPos = Math.max(peg$currPos, peg$maxFailPos);

      throw new SyntaxError(
        peg$maxFailExpected,
        peg$reportedPos < input.length ? input.charAt(peg$reportedPos) : null,
        peg$reportedPos,
        peg$computePosDetails(peg$reportedPos).line,
        peg$computePosDetails(peg$reportedPos).column
      );
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse      : parse
  };
})();
/**
 * lib.base contains some useful subset of the standard Scheme library.
 */

ccc.lib.base = new ccc.Library("base");

(function() {
  // Get a raw string object from either a Symbol or String
  var stringFromName = function(value) {
    if (value.constructor === ccc.String)
      return value.value_;
    if (value.constructor === ccc.Symbol)
      return value.name;
    throw new Error("load: Names and prefixes must be symbols or strings");
  };

  /**
   * Load 1 or more libraries into the current environment.
   * Each argument is a library spec.
   * If a library spec is a symbol or string, the library of that name is
   * loaded with the same name as its prefix.
   * If a library spec is a pair, the library of the name in car is loaded using
   * the name in cdr as the prefix.
   *
   * Examples:
   *
   * (load 'window)           ; Load ccc.lib.window into the current environment with prefix "window:" on its symbols.
   * (load 'window 'hashmap)  ; Load ccc.lib.window and ccc.lib.hashmap
   * (load '(window . win))   ; Load ccc.lib.window but use "win:" as its symbol prefix
   */
  ccc.lib.base.addNativeFunction("load", function(environment, continuation, args) {
    args = args.toArray();
    if (args.length < 1)
      throw new Error("load: Expected at least 1 argument; received 0.");
    for (var i = 0; i < args.length; ++i) {
      var arg = args[i];
      var name, prefix;
      if (arg.constructor === ccc.Pair) {
        name = stringFromName(arg.car());
        prefix = stringFromName(arg.cdr());
      }
      else {
        name = stringFromName(arg);
        prefix = name;
      }
      var library = ccc.lib[name];
      if (!library || library.constructor !== ccc.Library)
        throw new Error("load: Unknown library '" + name);
      environment.importLibrary(library, prefix);
    }
    return continuation(ccc.unspecified);
  });
}());(function() {
  var requireNumber = function(value, index, who) {
    if (value.constructor !== ccc.Number)
      throw new Error(who + ": Argument " + index + " is not a number");
  };

  ccc.lib.base.addSimpleFunctions({
    // Sum 0 or more numeric arguments.
    "+": function() {
      var sum = 0;
      Array.prototype.forEach.call(arguments, function(value, index) {
        requireNumber(value, index, "+");
        sum += value.value_;
      });
      return new ccc.Number(sum);
    },

    // Multiply 0 or more numeric arguments.
    "*": function() {
      var product = 1;
      Array.prototype.forEach.call(arguments, function(value, index) {
        requireNumber(value, index, "*");
        product *= value.value_;
      });
      return new ccc.Number(product);
    },

    // Subtract 1 or more numeric arguments from the first numeric argument.
    // If only one argument is given, its additive inverse is returned.
    "-": function() {
      var sum;
      if (arguments.length === 0)
        throw new Error("-: Not enough arguments applied");
      requireNumber(arguments[0], 0, "-");
      if (arguments.length === 1)
        return new ccc.Number(-arguments[0].value_);
      else
        sum = arguments[0].value_;
      Array.prototype.slice.call(arguments, 1).forEach(function(value, index) {
        requireNumber(value, index + 1, "-");
        sum -= value.value_;
      });
      return new ccc.Number(sum);
    },

    // Divide 1 or more numeric arguments into the first numeric argument.
    // If only one argument is given, its multiplicative inverse is returned.
    "/": function() {
      var product;
      if (arguments.length === 0)
        throw new Error("/: Not enough arguments applied");
      requireNumber(arguments[0], 0, "/");
      if (arguments.length === 1)
        return new ccc.Number(1 / arguments[0].value_);
      else
        product = arguments[0].value_;
      Array.prototype.slice.call(arguments, 1).forEach(function(value, index) {
        requireNumber(value, index + 1, "/");
        product /= value.value_;
      });
      return new ccc.Number(product);
    },
  });
}());
(function() {
  var simplePredicate = function(fn) {
    return function(value) {
      return fn(value) ? ccc.t : ccc.f;
    };
  };

  var simpleTypePredicate = function(type) {
    return function(value) {
      return value.constructor === type ? ccc.t : ccc.f;
    };
  };

  var equalityPredicate = function(comparator) {
    return function() {
      var result = true;
      if (arguments.length < 2)
        return ccc.t;
      var first = arguments[0];
      for (var i = 1; i < arguments.length && result; ++i)
        result = result && comparator(first, arguments[i]);
      return result ? ccc.t : ccc.f;
    };
  };

  ccc.lib.base.addSimpleFunctions({
    // Test for Boolean type
    "boolean?": simpleTypePredicate(ccc.Boolean),

    // Test for numeric type
    "number?": simpleTypePredicate(ccc.Number),

    // Test for string type
    "string?": simpleTypePredicate(ccc.String),

    // Test for char type
    "char?": simpleTypePredicate(ccc.Char),

    // Test for symbol type
    "symbol?": simpleTypePredicate(ccc.Symbol),

    // Test for pair type
    "pair?": simpleTypePredicate(ccc.Pair),

    // Test for vector type
    "vector?": simpleTypePredicate(ccc.Vector),

    // Test for empty list
    "null?": simplePredicate(function(value) { return value === ccc.nil }),

    // Test for applicable object
    "procedure?": simplePredicate(function(value) { return value.apply instanceof Function }),

    // Strictest equality test
    "eq?": equalityPredicate(function(a, b) { return a.eq(b); }),

    // Potentially relaxed equality test
    "eqv?": equalityPredicate(function(a, b) { return a.eqv(b); }),

    // Most relaxed equality test, with support for vector and list recursion.
    "equal?": equalityPredicate(function(a, b) { return a.equal(b); }),

    // Stringify a numeric value
    "number->string": function(number) {
      if (number.constructor !== ccc.Number)
        throw new Error("number->string: Expected a number; received " + number);
      return new ccc.String(number.value_.toString());
    },
  });
}());
(function() {
  var requirePair = function(value, index, who) {
    if (value.constructor !== ccc.Pair)
      throw new Error(who + ": Argument " + index + " is not a pair.");
  };

  ccc.lib.base.addSimpleFunctions({
    // Return the first element of a pair
    "car": function(pair) {
      requirePair(pair, 0, "car");
      return pair.car();
    },

    // Return the second element of a pair
    "cdr": function(pair) {
      requirePair(pair, 0, "cdr");
      return pair.cdr();
    },

    // Construct a new pair from two arguments
    "cons": function(car, cdr) {
      return new ccc.Pair(car, cdr);
    },

    // Construct a list from arguments
    "list": function() {
      return ccc.Pair.makeList.apply(null, Array.prototype.slice.call(arguments));
    },
  });
}());
// call-with-current-continuation
ccc.lib.base.addNativeFunction("call/cc", function(environment, continuation, args) {
  args = args.toArray();
  if (args.length !== 1)
    throw new Error("call/cc: Exactly 1 argument expected.");
  if (!(args[0].apply instanceof Function))
    throw new Error("call/cc: Object " + args[0] + " is not applicable.");
  return args[0].apply(environment, continuation, ccc.Pair.makeList(new ccc.Continuation(continuation)));
});

ccc.lib.base.addNativeFunction("apply", function(environment, continuation, args) {
  args = args.toArray();
  if (args.length !== 2)
    throw new Error("apply: Exactly 2 arguments expected");
  var fn = args[0];
  if (!(fn.apply instanceof Function))
    throw new Error("apply: Object " + fn + " is not applicable.");
  args = args[1];
  if (args !== ccc.nil && (args.constructor !== ccc.Pair || !args.isList()))
    throw new Error("apply: Argument 1 is not a list");
  return fn.apply(environment, continuation, args);
});
// display simply writes badly formatted data to the JS console
ccc.lib.base.addSimpleFunction("display", function(value) {
  console.log(value.toSource());
});
/**
 * lib.window provides DOM window manipulation tools.
 *
 * This is really just a toy library for now.
 */
ccc.lib.window = new ccc.Library("window");

ccc.lib.window.addSimpleFunctions({
  "set-title": function(title) {
    if (title.constructor !== ccc.String)
      throw new Error("set-title: Expected string; received " + title);
    window.document.title = title.value_;
  },
});
