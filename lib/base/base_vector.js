(function() {
  var requireInteger = function(value, index, who) {
    if (value.constructor !== ccc.Number || value.value_ !== (value.value_|0))
      throw new Error(who + ": Argument " + index + " is not an integer");
  };

  var requireVector = function(value, index, who) {
    if (value.constructor !== ccc.Vector)
      throw new Error(who + ": Argument " + index + "is not a vector");
  };

  ccc.lib.base.addSimpleFunctions({
    "make-vector": function() {
      var args = Array.prototype.slice.call(arguments);
      if (args.length === 0)
        throw new Error("make-vector: Expected 1 or 2 argments; received 0");
      if (args.length > 2)
        throw new Error("make-vector: Expected 1 or 2 arguments; received " + args.length);
      var value = args.length === 2 ? args[1] : ccc.unspecified;
      var elements = [];
      requireInteger(args[0], 0, "make-vector");
      for (var i = 0; i < args[0].value_; ++i)
        elements[i] = value;
      return new ccc.Vector(elements);
    },

    "vector": function() {
      var args = Array.prototype.slice.call(arguments);
      return new ccc.Vector(args);
    },

    "vector-length": function(vector) {
      requireVector(vector, 0, "vector-length");
      return new ccc.Number(vector.elements_.length);
    },

    "vector-ref": function(vector, index) {
      requireVector(vector, 0, "vector-ref");
      requireInteger(index, 1, "vector-ref");
      if (index < 0 || index >= vector.elements_.length)
        throw new Error("vector-ref: Index out of bounds");
      return vector.elements_[index];
    },

    "vector-set!": function(vector, index, object) {
      requireVector(vector, 0, "vector-ref");
      requireInteger(index, 1, "vector-ref");
      if (index < 0 || index >= vector.elements_.length)
        throw new Error("vector-ref: Index out of bounds");
      vector.elements_[index] = object;
    },

    "vector->list": function(vector) {
      requireVector(vector, 0, "vector->list");
      return ccc.Pair.makeList.apply(null, vector.elements_);
    },

    "list->vector": function(list) {
      if (list !== ccc.nil && list.constructor !== ccc.Pair)
        throw new Error("list->vector: Argument 0 is not a list");
      var elements = [];
      list.forEach(
        function(value) { elements.push(value); },
        function() { throw new Error("list->vector: Argument 0 is not a proper list"); });
      return new ccc.Vector(elements);
    },

    "vector-fill!": function(vector, object) {
      requireVector(vector, 0, "vector-fill!");
      for (var i = 0; i < vector.elements_.length; ++i)
        vector.elements_[i] = object;
    },
  });
}());
