/**
 * Syntax variable capture.
 *
 * Encapsulates the capture of macro use data to temporary bindings used by
 * the template expansion process.
 *
 * A rank 1 Capture emits a single value when expanded. A rank N > 1 Capture
 * expands to an Enumerator over 0 or more rank N-1 Captures.
 */
ccc.Capture = function(data, rank) {
  this.data_ = data;
  this.rank_ = rank;
};

ccc.Capture.prototype = { __proto__: ccc.Object.prototype };
ccc.Capture.prototype.constructor = ccc.Capture;

ccc.Capture.prototype.toString = function() {
  return "#<capture:" + this.data_.toString() + ">";
};

ccc.Capture.prototype.toSource = function() {
  return "(syntax-capture " + this.data_.toSource() + ")";
};

ccc.Capture.prototype.promote = function() {
  this.data_ = [new ccc.Capture(this.data_, this.rank_)];
  this.data_.toSource = function() {
    return "(enum " +
      this.map(function(d) { return d.toSource() }).join(", ") +
      ")";
  };
  this.rank_ += 1;
};

ccc.Capture.prototype.append = function(data) {
  if (this.data_ instanceof Array) {
    this.data_.push(data);
  } else {
    throw new Error("Unexpected error: Attempted to append to single-valued Capture.");
  }
};

ccc.Capture.prototype.expand = function() {
  if (this.rank_ === 1)
    return this.data_;
  return new ccc.Enumerator(this.data_);
};
