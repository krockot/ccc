#!/usr/bin/env node
fs = require('fs')
fs.readFile('keywords.scm', 'utf8', function(err, data) {
  var keywords = JSON.stringify(data.replace(/\s+/g, " "));
  fs.writeFile("base_keywords.js", "ccc.lib.base.keywords = " + keywords + ";");
});
