ccc.lib.base.registerEntry({
  name: "display",
  requiredArgs: ["any"],
  impl: function(value) { console.log(value.toSource()); }
});

