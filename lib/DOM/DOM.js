/**
 * lib.DOM provides sandboxed DOM manipulation procedures.
 */
ccc.lib.DOM = new ccc.Library("DOM");

ccc.lib.DOM.registerEntries([
  {
    name: "append-child",
    requiredArgs: ["any", "any"],
    impl: function(root, child) {
      if (root.constructor !== ccc.NativeObject || child.constructor !== ccc.NativeObject) {
        throw new Error("append-child: Invalid object");
      }
      root.object_.appendChild(child.object_);
      return child;
    },
  },
]);
