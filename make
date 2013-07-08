#!/bin/bash

pushd lib/base
node make_keywords.js
popd

if [ parser/ccc.pegjs -nt parser/ccc.js ]; then
  pegjs -e ccc.Parser --allowed-start-rules start,datum parser/ccc.pegjs
fi

cat $(cat sources.list) > ccc.js

yui-compressor ccc.js -o ccc.min.js

