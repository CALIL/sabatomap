var Buffer, _validate;

_validate = function(beacons) {
  var b, i, len;
  for (i = 0, len = beacons.length; i < len; i++) {
    b = beacons[i];
    if ((b.major == null) || (b.minor == null) || (b.uuid == null) || (b.rssi == null)) {
      return false;
    }
    if ((typeof b.major !== 'number') || (typeof b.minor !== 'number') || (typeof b.rssi !== 'number') || (typeof b.uuid !== 'string')) {
      return false;
    }
  }
  return true;
};

Buffer = (function() {
  function Buffer(length, verify) {
    this.length = length;
    this.verify = verify != null ? verify : true;
    this.buffer = [];
  }

  Buffer.prototype.push = function(beacons) {
    if (this.verify && !_validate(beacons)) {
      throw new Error('Invalid Beacons.');
    }
    if (this.buffer.length >= this.length) {
      this.buffer.shift();
    }
    return this.buffer.push(beacons);
  };

  Buffer.prototype.last = function(size) {
    if (size > 0) {
      return this.buffer.slice(-1 * size);
    }
    return [];
  };

  Buffer.prototype.clear = function() {
    this.buffer.length = 0;
  };

  Buffer.prototype.size = function() {
    return this.buffer.length;
  };

  return Buffer;

})();

if (typeof exports !== 'undefined') {
  module.exports = Buffer;
} else {
  this.BeaconsBuffer = Buffer;
}
