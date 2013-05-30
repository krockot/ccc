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
}());