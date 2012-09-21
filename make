#!/bin/bash

pegjs --track-line-and-column scheme.pegjs
sed -i "s/module\\.exports/Ccc.Parser/" scheme.js
cat runtime.js scheme.js keywords.js > ccc.js
rm -f scheme.js
yui-compressor ccc.js -o ccc.min.js

