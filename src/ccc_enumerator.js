/**
 * Capture enumerator.
 *
 * A rank N > 1 Capture expands to an Enumerator of rank N-1 values.
 */
ccc.Enumerator = function(values) {
  this.values_ = values.slice();
  this.index_ = 0;
};

ccc.Enumerator.prototype = { __proto__: ccc.Object.prototype };
ccc.Enumerator.prototype.constructor = ccc.Enumerator;

ccc.Enumerator.prototype.hasMore = function() {
  return this.index_ < this.values_.length;
};

ccc.Enumerator.prototype.getNext = function() {
  var object = this.values_[this.index_];
  this.index_ += 1;
  return object;
};
