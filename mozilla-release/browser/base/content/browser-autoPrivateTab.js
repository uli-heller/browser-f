// Coyright Cliqz GmbH, 2015.

const uriFixup = Cc["@mozilla.org/docshell/urifixup;1"]
    .getService(Ci.nsIURIFixup);

const AutoPrivateTab = {
  init: function APT_init() {
    const bf = {};
    Cu.import("resource://gre/modules/BloomFilter.jsm", bf);

    const [size, nHashes] = bf.calculateFilterProperties(1000, 0.0001);
    this._filter = new bf.BloomFilter(size, nHashes);

    const domains = [
        'xvideos.com',
        'pornhub.com',
        'wikipedia.org'
    ];
    for (let domain of domains) {
      this._filter.add(domain);
    }
    // TODO: load bloom filter data
  },

  handleTabNavigation: function APT_handleTabNavigation(uri, tab_browser) {
    const [pm, domain] = this._shouldLoadURIInPrivateMode(uri)
    if (!pm)
      return;

    tab_browser.loadContext.usePrivateBrowsing = true;
    const tab = gBrowser.getTabForBrowser(tab_browser)
    if (tab)
      tab.private = true;
    setTimeout(
      this._addOrUpdateNotification.bind(this, tab_browser, domain),
      1000);
  },

  /**
   * @param {nsIURI or string} uri - a URL to check.
   * @return {[boolean, string]} pair with the following values:
   *   whether a particular URL is unwelcome in normal mode,
   *   extracted domain name (may be absent).
   */
  _shouldLoadURIInPrivateMode: function APT__shouldLoadURIInPrivateMode(uri) {
    var spec;
    try {
      if (uri instanceof Ci.nsIURI) {
        spec = uri.spec;
      }
      else {
        spec = uri;
        uri = uriFixup.createFixupURI(spec, uriFixup.FIXUP_FLAG_NONE);
      }

      if (!uri.schemeIs("http") && !uri.schemeIs("https"))
        return [false, undefined];

      const host = uri.host.replace(/^www\./i, '');
      const pm = !this._whiteList.has(host) && this._filter.test(host);
      return [pm, host];
    }
    catch (e) {
      Cu.reportError("Could not check spec: " + spec + ". Error:\n" + e);
      return [false, undefined];
    }
  },

  _addOrUpdateNotification: function APT__addOrUpdateNotification(
      tab_browser, domain) {
    const notificationBox = gBrowser.getNotificationBox();
    const notification = notificationBox.getNotificationWithValue(
        this._consts.AUTO_PRIVATE_TAB_NOTIFICATION);
    if (notification) {
      notificationBox.removeNotification(notification);
    }
    const buttons = [
    {
      label: "Reload in normal mode",
      accessKey: "R",
      popup: null,
      callback: (notification, descr) => {
          this._reloadTabAsNormal(tab_browser);
      }
    },
    {
      label: "Always load in normal mode",
      accessKey: "A",
      popup: null,
      callback: (notification, descr) => {
        this._reloadTabAsNormal(tab_browser);
        this._whiteList.add(domain);
      }
    }];

    notificationBox.appendNotification(
        domain + " is better viewed in private mode",
        this._consts.AUTO_PRIVATE_TAB_NOTIFICATION,
        "chrome://browser/skin/privatebrowsing-mask.png",
        notificationBox.PRIORITY_INFO_HIGH,
        buttons);
  },

  _reloadTabAsNormal: function APT__reloadTabAsNormal(tab_browser) {
    tab_browser.loadContext.usePrivateBrowsing = false;
    const tab = gBrowser.getTabForBrowser(tab_browser)
    if (tab)
      tab.private = false;
    tab_browser.reload();
  },

  _consts: {
    AUTO_PRIVATE_TAB_NOTIFICATION: "auto-private-tab"
  },
  _filter: null,
  // List of domains which should be loaded in normal mode.
  _whiteList: new Set()
};
