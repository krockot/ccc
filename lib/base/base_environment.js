ccc.lib.base.registerEntries([
  {
    name: 'this-environment',
    impl: function() {
      return this.environment;
    }
  },

  {
    name: 'new-environment',
    customContinuation: true,
    impl: function() {
      var newEnvironment = new ccc.Environment();
      var stdlib = ccc.Parser.parse(ccc.lib.base.keywords);
      newEnvironment.importLibrary(ccc.lib.base);
      newEnvironment.evalProgram(stdlib, function(value, isFinal) {
        if (isFinal)
          this.environment.continueProgram(function() {
            return this.continuation(newEnvironment);
          }.bind(this));
      }.bind(this), function(error) {
        throw error;
      });
    }
  },

  {
    name: 'eval',
    requiredArgs: ['string'],
    optionalArgs: ['any'],
    customContinuation: true,
    impl: function(code, environment) {
      code = code.value_;
      if (environment === ccc.unspecified) {
        environment = new ccc.Environment();
        environment.importLibrary(ccc.lib.base);
        code = ccc.lib.base.keywords + code;
      }
      if (environment.constructor !== ccc.Environment)
        throw new Error("eval: Wrong type for argument 1");
      var forms = ccc.Parser.parse(code);
      environment.evalProgram(forms, function(value, isFinal) {
        if (isFinal)
          this.environment.continueProgram(function() {
            return this.continuation(value);
          }.bind(this));
      }.bind(this), function(error) {
        throw error;
      });
    }
  }
]);

