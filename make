#!/bin/bash

SCRIPT=$0
ROOTNAME=$(dirname $SCRIPT)
ROOT=$(readlink -f $ROOTNAME)

LIB_DIR=$ROOT/lib
BASE_LIB_DIR=$LIB_DIR/base

cd $BASE_LIB_DIR
node make_keywords.js

cd $ROOT
if [ parser/ccc.pegjs -nt parser/ccc.js ]; then
  pegjs -e ccc.Parser --allowed-start-rules start,datum parser/ccc.pegjs
fi

cat $(cat sources.list) > ccc.js

yui-compressor ccc.js -o ccc.min.js

