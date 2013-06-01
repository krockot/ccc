(function() {
  ccc.lib.base.registerEntries([
    {
      name: "make-vector",
      requiredArgs: ["integer"],
      optionalArgs: ["any"],
      impl: function(size, fill) {
        var elements = [];
        for (var i = 0; i < size.value_; ++i)
          elements[i] = fill;
        return new ccc.Vector(elements);
      }
    },

    {
      name: "vector",
      optionalArgs: "any",
      impl: function(args) { return new ccc.Vector(args.toArray()); }
    },

    {
      name: "vector-length",
      requiredArgs: ["vector"],
      impl: function(vector) { return new ccc.Number(vector.elements_.length); }
    },

    {
      name: "vector-ref",
      requiredArgs: ["vector", "integer"],
      impl: function(vector, index) {
        index = index.value_;
        if (index < 0 || index >= vector.elements_.length)
          throw new Error("vector-ref: Index out of bounds");
        return vector.elements_[index];
      },
    },

    {
      name: "vector-set!",
      requiredArgs: ["vector", "integer", "any"],
      impl: function(vector, index, object) {
        index = index.value_;
        if (index < 0 || index >= vector.elements_.length)
          throw new Error("vector-set!: Index out of bounds");
        vector.elements_[index] = object;
      }
    },

    {
      name: "vector->list",
      requiredArgs: ["vector"],
      impl: function(vector) {
        return ccc.Pair.makeList.apply(null, vector.elements_);
      }
    },

    {
      name: "list->vector",
      requiredArgs: ["list"],
      impl: function(list) {
        var elements = [];
        if (list !== ccc.nil)
          list.forEach(function(value) { elements.push(value); });
        return new ccc.Vector(elements);
      }
    },

    {
      name: "vector-fill!",
      requiredArgs: ["vector", "any"],
      impl: function(vector, object) {
        for (var i = 0; i < vector.elements_.length; ++i)
          vector.elements_[i] = object;
      }
    },
  ]);
}());
