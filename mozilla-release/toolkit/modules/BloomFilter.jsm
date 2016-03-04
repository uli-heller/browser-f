// Copyright Cliqz GmbH, 2016.

"use strict";

this.EXPORTED_SYMBOLS = [ "BloomFilter", "calculateFilterProperties" ];

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyGetter(this, "utf8Converter", function() {
  let converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
      .createInstance(Ci.nsIScriptableUnicodeConverter);
  converter.charset = "UTF-8";
  return converter;
});

const md5Hasher = Cc["@mozilla.org/security/hash;1"]
    .createInstance(Ci.nsICryptoHash);

function md5string(input /* string */) {
  let toHexString = charCode => ("0" + charCode.toString(16)).slice(-2);

  const bytes = utf8Converter.convertToByteArray(input);
  md5Hasher.init(md5Hasher.MD5);
  md5Hasher.update(bytes, bytes.length);
  const binDigest = md5Hasher.finish(false);
  const result = [toHexString(binDigest.charCodeAt(i)) for (i in binDigest)]
      .join("").toLowerCase();
  return result;
}

const BITS_PER_BUCKET = 32;

// Returns a pair of numbers suitable for initialization of a |BloomFilter|
// instance: size of
// |nElements| is the expected number of stored elements.
// |falseRate| is the desired false positive test rate (0..1).
function calculateFilterProperties(nElements, falseRate) {
  let m = -1.0 * nElements * Math.log(falseRate) / Math.LN2 / Math.LN2;
  m = Math.floor(m * 1.1);
  let k = Math.floor(m / nElements * Math.LN2);
  return [Math.floor(m / BITS_PER_BUCKET), k];
}

// |elementsOrSize| is either an array with initial values (numbers), or a
// size for internal storage. You can calculate it, and |nHashes| using
// |calculateFilterProperties|.
function BloomFilter(elementsOrSize, nHashes) {
  let elements = [];
  let size = 0;
  if (typeof elementsOrSize === 'number') {
    size = elementsOrSize;
    for (let i = 0; i < size; i++) {
      elements.push(0);
    }
  }
  else {
    elements = elementsOrSize;
    size = elements.length;
  }

  let m = this.m = size * BITS_PER_BUCKET;
  this.k = nHashes;

  // Put the elements into their bucket.
  let buckets = this.buckets = new Int32Array(size);
  for (let i = 0; i < size; i++) {
    buckets[i] = elements[i];
  }
}

BloomFilter.prototype.update = function(a) {
  var m = a.length * BITS_PER_BUCKET,
      n = a.length,
      i = -1;
  m = n * BITS_PER_BUCKET;
  if (this.m !== m) {
    throw new Error('Bloom filter can only be updated with same length');
  }
  while (++i < n) {
    this.buckets[i] |= a[i];
  }
};

BloomFilter.prototype.test = function(x) {
  const [a, b] = this._a_b(x);
  return this._test(a, b);
};

BloomFilter.prototype.add = function(x) {
  const [a, b] = this._a_b(x);
  return this._add(a, b);
};

// Checks whether a value represented by its subhashes |a| and |b| is present in
// current filter set.
// |a| and |b| must be numbers.
BloomFilter.prototype._test = function(a, b) {
  const buckets = this.buckets;
  for (let bitIndex of this._bitIndexes(a, b)) {
    const bucketIndex = Math.floor(bitIndex / BITS_PER_BUCKET);
    const bucketBitIndex = 1 << (bitIndex % BITS_PER_BUCKET);
    if ((buckets[bucketIndex] & bucketBitIndex) === 0) {
      return false;
    }
  }
  return true;
};

// Puts a value represented by its subhashes |a| and |b| into filter set.
// |a| and |b| must be numbers.
BloomFilter.prototype._add = function(a, b) {
  const buckets = this.buckets;
  for (let bitIndex of this._bitIndexes(a, b)) {
    const bucketIndex = Math.floor(bitIndex / BITS_PER_BUCKET);
    const bucketBitIndex = 1 << (bitIndex % BITS_PER_BUCKET);
    buckets[bucketIndex] |= bucketBitIndex;
  }
};

BloomFilter.prototype._a_b = function(x) {
  const md5Hex = md5string(x);
  const a = parseInt(md5Hex.substring(0, 8), 16);
  const b = parseInt(md5Hex.substring(8, 16), 16);
  return [a, b];
}

// For a pair of given subhashes of a value yields a series of bit indexes to
// read or write to.
// |a| and |b| must be numbers.
BloomFilter.prototype._bitIndexes = function(a, b) {
  const k = this.k;
  const m = this.m;
  let x = a % m;

  for (let i = 0; i < k; ++i) {
    yield (x < 0 ? x + m : x);
    x = (x + b) % m;
  }
};
