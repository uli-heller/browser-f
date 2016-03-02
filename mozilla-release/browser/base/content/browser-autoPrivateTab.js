// Coyright Cliqz GmbH, 2015.

const AutoPrivateTab = {
  init: function APT_init() {
    // TODO: load bloom filter data
  },

  shouldLoadURIInPrivateMode: function (uri /*nsIURI or string*/) {
    if (!(uri instanceof Ci.nsIURI))
      uri = Services.io.newURI(uri, null, null);
    const host = uri.host.replace(/^www\./i, '');
    return this._filter.has(host);
  },

  _filter: new Set([
    'xvideos.com',
    'pornhub.com',
    'wikipedia.org'
  ])
};
