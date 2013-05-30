/**
 * lib.window provides DOM window manipulation tools.
 *
 * This is really just a toy library for now.
 */
ccc.lib.window = new ccc.Library("window");

ccc.lib.window.addSimpleFunctions({
  "set-title": function(title) {
    if (title.constructor !== ccc.String)
      throw new Error("set-title: Expected string; received " + title);
    window.document.title = title.value_;
  },
});
