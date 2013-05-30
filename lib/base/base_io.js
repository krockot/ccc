// display simply writes badly formatted data to the JS console
ccc.lib.base.addSimpleFunction("display", function(value) {
  console.log(value.toSource());
});
