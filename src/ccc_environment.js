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
    this.topLevel_ = false;
  } else {
    this.initToplevel_();
    this.nextLocal_ = 0;
    this.topLevel_ = true;
  }
};

ccc.Environment.prototype = { __proto__: ccc.Object.prototype };
ccc.Environment.prototype.constructor = ccc.Environment;

ccc.Environment.prototype.toString = function() {
  return "#<environment>";
};

ccc.Environment.prototype.isTopLevel = function() {
  return this.topLevel_;
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
 * to a specific lexical binding within the environment. When a lexical
 * binding is evaluated at run-time, it resolves to the active local binding
 * associated with its compiler-assigned ID.
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
ccc.Environment.prototype.evalForm = function(form, opt_receiver, opt_onError) {
  try {
    var compiledForm = form.compile(this);

    var terminate = function(value) {
      if (opt_receiver)
        opt_receiver(value);
    };

    var continuation = compiledForm.eval(this, terminate);
    var timeslice = function() {
      try {
        var cyclesPerSlice = 1000;
        while (cyclesPerSlice-- > 0 && continuation)
          continuation = continuation();
        if (continuation) {
          setTimeout(timeslice, 0);
        }
      } catch(e) {
        if (opt_onError)
          opt_onError(e);
      }
    };
    timeslice();
  } catch(e) {
    if (opt_onError)
      opt_onError(e);
  }
};

/**
 * Asynchronously continue a program from a given continuation.
 */
ccc.Environment.prototype.continueProgram = function(continuation) {
  var timeslice = function() {
    var cyclesPerSlice = 1000;
    while (cyclesPerSlice-- > 0 && continuation)
      continuation = continuation();
    if (continuation) {
      setTimeout(timeslice, 0);
    }
  };
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
ccc.Environment.prototype.evalProgram = function(forms, opt_valueReceiver, opt_onError) {
  if (forms.length === 0)
    throw new Error("Empty program?");

  forms = forms.slice();
  var evalNextForm = function() {
    var form = forms.shift();
    this.evalForm(form, function (value) {
      if (forms.length > 0) {
        if (opt_valueReceiver)
          opt_valueReceiver(value, false);
        evalNextForm();
      } else if (opt_valueReceiver) {
        opt_valueReceiver(value, true);
      }
    }, opt_onError);
  }.bind(this);

  evalNextForm();
};

