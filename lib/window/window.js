/**
 * lib.window provides browser window and DOM manipulation procedures.
 */
ccc.lib.window = new ccc.Library("window");

ccc.lib.window.registerEntries([
  {
    name: "set-title",
    requiredArgs: ["string"],
    impl: function(title) {
      window.document.title = title.value_;
    }
  },
]);
