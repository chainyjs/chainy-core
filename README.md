
<!-- TITLE/ -->

# Chainy Core

<!-- /TITLE -->


<!-- BADGES/ -->

[![Build Status](http://img.shields.io/travis-ci/chainyjs/chainy-core.png?branch=master)](http://travis-ci.org/chainyjs/chainy-core "Check this project's build status on TravisCI")
[![NPM version](http://badge.fury.io/js/chainy-core.png)](https://npmjs.org/package/chainy-core "View this project on NPM")
[![Dependency Status](https://david-dm.org/chainyjs/chainy-core.png?theme=shields.io)](https://david-dm.org/chainyjs/chainy-core)
[![Development Dependency Status](https://david-dm.org/chainyjs/chainy-core/dev-status.png?theme=shields.io)](https://david-dm.org/chainyjs/chainy-core#info=devDependencies)<br/>
[![Gittip donate button](http://img.shields.io/gittip/bevry.png)](https://www.gittip.com/bevry/ "Donate weekly to this project using Gittip")
[![Flattr donate button](http://img.shields.io/flattr/donate.png?color=yellow)](http://flattr.com/thing/344188/balupton-on-Flattr "Donate monthly to this project using Flattr")
[![PayPayl donate button](http://img.shields.io/paypal/donate.png?color=yellow)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=QB8GQPZAH84N6 "Donate once-off to this project using Paypal")
[![BitCoin donate button](http://img.shields.io/bitcoin/donate.png?color=yellow)](https://coinbase.com/checkouts/9ef59f5479eec1d97d63382c9ebcb93a "Donate once-off to this project using BitCoin")
[![Wishlist browse button](http://img.shields.io/wishlist/browse.png?color=yellow)](http://amzn.com/w/2F8TXKSNAFG4V "Buy an item on our wishlist for us")

<!-- /BADGES -->


<!-- DESCRIPTION/ -->

Perhaps the most awesome way of interacting with data using a chainable API

<!-- /DESCRIPTION -->


<!-- INSTALL/ -->

## Install

### [NPM](http://npmjs.org/)
- Use: `require('chainy-core')`
- Install: `npm install --save chainy-core`

### [Browserify](http://browserify.org/)
- Use: `require('chainy-core')`
- Install: `npm install --save chainy-core`
- CDN URL: `//wzrd.in/bundle/chainy-core@1.3.0`

### [Ender](http://ender.jit.su/)
- Use: `require('chainy-core')`
- Install: `ender add chainy-core`

<!-- /INSTALL -->


## Usage

[Find the complete documentation for Chainy at the wiki](https://github.com/chainyjs/chainy/wiki)

``` javascript
// chainy install set map swap
var Chainy = require('chainy-core').subclass().require('set', 'map', 'swap')
Chainy.create()
	.set(['some', 'data'])
	.map(function(item, next){
		return next(null, item.toUpperCase())
	})
	.swap(function(item, next){
		return next(null, item.join(' ')+'!')
	})
	.done(function(err, result){
		if (err)  throw err
		console.log('result:', result)  // result: SOME DATA!
	})
```


<!-- HISTORY/ -->

## History
[Discover the change history by heading on over to the `HISTORY.md` file.](https://github.com/chainyjs/chainy-core/blob/master/HISTORY.md#files)

<!-- /HISTORY -->


<!-- CONTRIBUTE/ -->

## Contribute

[Discover how you can contribute by heading on over to the `CONTRIBUTING.md` file.](https://github.com/chainyjs/chainy-core/blob/master/CONTRIBUTING.md#files)

<!-- /CONTRIBUTE -->


<!-- BACKERS/ -->

## Backers

### Maintainers

These amazing people are maintaining this project:

- Benjamin Lupton <b@lupton.cc> (https://github.com/balupton)

### Sponsors

No sponsors yet! Will you be the first?

[![Gittip donate button](http://img.shields.io/gittip/bevry.png)](https://www.gittip.com/bevry/ "Donate weekly to this project using Gittip")
[![Flattr donate button](http://img.shields.io/flattr/donate.png?color=yellow)](http://flattr.com/thing/344188/balupton-on-Flattr "Donate monthly to this project using Flattr")
[![PayPayl donate button](http://img.shields.io/paypal/donate.png?color=yellow)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=QB8GQPZAH84N6 "Donate once-off to this project using Paypal")
[![BitCoin donate button](http://img.shields.io/bitcoin/donate.png?color=yellow)](https://coinbase.com/checkouts/9ef59f5479eec1d97d63382c9ebcb93a "Donate once-off to this project using BitCoin")
[![Wishlist browse button](http://img.shields.io/wishlist/browse.png?color=yellow)](http://amzn.com/w/2F8TXKSNAFG4V "Buy an item on our wishlist for us")

### Contributors

These amazing people have contributed code to this project:

- [Benjamin Lupton](https://github.com/balupton) <b@lupton.cc> — [view contributions](https://github.com/chainyjs/chainy-core/commits?author=balupton)

[Become a contributor!](https://github.com/chainyjs/chainy-core/blob/master/CONTRIBUTING.md#files)

<!-- /BACKERS -->


<!-- LICENSE/ -->

## License

Licensed under the incredibly [permissive](http://en.wikipedia.org/wiki/Permissive_free_software_licence) [MIT license](http://creativecommons.org/licenses/MIT/)

Copyright &copy; 2014+ Bevry Pty Ltd <us@bevry.me> (http://bevry.me)

<!-- /LICENSE -->


