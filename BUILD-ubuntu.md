Build CLIQZ on Ubuntu-14.04
===========================

This is a description of my persoal way to build CLIQZ
on a recent version of Ubuntu Linux, version 14.04 64bit.

Prerequisites
-------------

Make sure your operating system is uptodate and the scanning of your
installation repos works without an error message:

``` sh
sudo apt-get update
# Verify: No error message shows up
sudo apt-get upgrade
sudo apt-get dist-upgrade
```

Download And Unpack
-------------------

1. Download [browser-f-master.tar.gz](https://github.com/uli-heller/browser-f/archive/master.tar.gz)
   (or [from upstream](https://github.com/cliqz-oss/browser-f/archive/master.tar.gz))
2. Unpack: `gzip -cd browser-f-master.tar.gz|tar xf -`

Install Dependencies
--------------------

```
cd browser-f-master
./mozilla-release/mach bootstrap
```

Build
-----

```
cd browser-f-master
./magic_build_and_package.sh`
```

This takes more than an hour on my NUC. Once the build completes,
the binary package is located in "obj/dist/CLiQZ*tar.bz2".

Issues
------

### Bootstrap Failure

For me, the command `.../mach bootstrap` initially failed with an error message,
due to an
[error with the google chrome deb repo](http://www.omgubuntu.co.uk/2016/03/fix-failed-to-fetch-google-chrome-apt-error-ubuntu).
I fixed it by modifying the file /etc/apt/sources.list.d/google-chrome.list:

``` diff
< deb http://dl.google.com/linux/chrome/deb/ stable main
---
> deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main
```

Links
-----

* [Mozilla Build Instructions](https://developer.mozilla.org/en-US/docs/Mozilla/Developer_guide/Build_Instructions/Simple_Firefox_build)
* [How To Fix The Chrome Apt Error](http://www.omgubuntu.co.uk/2016/03/fix-failed-to-fetch-google-chrome-apt-error-ubuntu)
