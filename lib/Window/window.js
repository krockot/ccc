/**
 * lib.window provides browser window manipulation procedures.
 */
ccc.lib.Window = new ccc.Library("Window");

ccc.lib.Window.registerEntries([
  {
    name: "set-title",
    requiredArgs: ["string"],
    impl: function(title) {
      window.document.title = title.value_;
    }
  },
]);
