// Copyright Cliqz GmbH, 2016.

"use strict";

this.EXPORTED_SYMBOLS = [ "BloomFilter", "calculateFilterProperties" ];

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

//XPCOMUtils.defineLazyModuleGetter(this, "CommonUtils",
//    "resource://services-common/utils.js");
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

// Returns a pair of numbers suitable for initialization of a |BloomFilter|
// instance: size of
// |nElements| is the expected number of stored elements.
// |falseRate| is the desired false positive test rate (0..1).
function calculateFilterProperties(nElements, falseRate) {
  let m = -1.0 * nElements * Math.log(falseRate) / Math.LN2 / Math.LN2;
  m = Math.floor(m * 1.1);
  let k = Math.floor(m / nElements * Math.LN2);
  return [Math.floor(m / 32), k];
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

  let m = this.m = size * 32;  // 32 bits for each element
  this.k = nHashes;

  let kbytes = 1 << Math.ceil(
      Math.log(Math.ceil(Math.log(m) / Math.LN2 / 8)) /
      Math.LN2);
  // Choose data type:
  let arrayClass = {
    1: Uint8Array,
    2: Uint16Array
  }[kbytes] || Uint32Array;

  // Put the elements into their bucket.
  let buckets = this.buckets = new Int32Array(size);
  for (let i = 0; i < size; i++) {
    buckets[i] = elements[i];
  }
  // Stores location for each hash function.
  this._locations = new arrayClass(new ArrayBuffer(kbytes * nHashes));
}

BloomFilter.prototype.locations = function(a, b) {
  // we use 2 hash values to generate k hash values
  var k = this.k,
      m = this.m,
      r = this._locations;
  a = parseInt(a, 16);
  b = parseInt(b, 16);
  var x = a % m;

  for (var i = 0; i < k; ++i) {
    r[i] = x < 0 ? (x + m) : x;
    x = (x + b) % m;
  }
  return r;
};

BloomFilter.prototype.test = function(a, b) {
  // since MD5 will be calculated before hand,
  // we allow using hash value as input to

  var l = this.locations(a, b),
      k = this.k,
      buckets = this.buckets;
  for (var i = 0; i < k; ++i) {
    var bk = l[i];
    if ((buckets[Math.floor(bk / 32)] & (1 << (bk % 32))) === 0) {
      return false;
    }
  }
  return true;
};

BloomFilter.prototype.testSingle = function(x) {
  var md5Hex = md5string(x);
  var a = md5Hex.substring(0, 8),
      b = md5Hex.substring(8, 16);
  return this.test(a, b);
};

BloomFilter.prototype.add = function(a, b) {
  // Maybe used to add local safeKey to bloom filter
  var l = this.locations(a, b),
      k = this.k,
      buckets = this.buckets;
  for (var i = 0; i < k; ++i) {
    buckets[Math.floor(l[i] / 32)] |= 1 << (l[i] % 32);
  }
};

BloomFilter.prototype.addSingle = function(x) {
  var md5Hex = md5string(x);
  var a = md5Hex.substring(0, 8),
      b = md5Hex.substring(8, 16);
  return this.add(a, b);
};

BloomFilter.prototype.update = function(a) {
  // update the bloom filter, used in minor revison for every 10 min
  var m = a.length * 32,  // 32 bit for each element
      n = a.length,
      i = -1;
  m = n * 32;
  if (this.m !== m) {
    throw new Error('Bloom filter can only be updated with same length');
  }
  while (++i < n) {
    this.buckets[i] |= a[i];
  }
};
