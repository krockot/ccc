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

