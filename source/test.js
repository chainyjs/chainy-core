/* eslint no-var:0, max-params:0, no-unused-vars:0, prefer-rest-params:0, no-unused-expressions:0 */

// Import
var assert = require('assert-helpers')
var joe = require('joe')

// Test Chainy
joe.describe('chainy', function (describe, it) {
	var Chainy = require('../')

	it('should fail when attempting to extend the base class', function () {
		var err = null
		try {
			Chainy.addExtension('test', 'action', function () {})
		}
		catch (_err) {
			err = _err
		}
		assert.errorEqual(err, 'frozen')
	})

	it('should pass when attempting to extend a child class', function () {
		function extension (value, newVaue) {}

		var chain = Chainy.subclass()
			.addExtension('myutility', 'utility', extension)
			.addExtension('myaction', 'action', extension)
			.create()

		assert.equal(chain.myutility, extension, 'utility by name')
		assert.equal(typeof chain.myaction, 'function', 'action by name')
	})

	it('should handle aliases correctly', function () {
		function extension (value, newVaue) {}

		var chain = Chainy.subclass()
			.addExtension('myutility', ['myUtility'], 'utility', extension)
			.addExtension('myaction', ['myAction'], 'action', extension)
			.create()

		assert.equal(chain.myutility, extension, 'utility by name')
		assert.equal(chain.myUtility, extension, 'utility by alias')
		assert.equal(typeof chain.myaction, 'function', 'action by name')
		assert.equal(typeof chain.myAction, 'function', 'action by alias')
	})

	it('should handle errors gracefully', function (next) {
		var chain = Chainy.create()
			.addExtension('myoops', 'action', function () {
				throw new Error('deliberate failure')
			})
			.myoops()
			.done(function (err, chainData) {
				assert.equal(chain, this, 'done this')
				assert.errorEqual(err, 'deliberate failure', 'done error')
				assert.equal(chainData, null, 'done chain data')
				return next()
			})
	})

	it('should work well', function (next) {
		var chain = Chainy.create()
			.addExtension('myset', 'action', function (value, newValue) {
				return newValue
			})
			.myset('some data')
			.done(function (err, chainData) {
				assert.equal(chain, this)
				assert.errorEqual(err, null)
				assert.equal(chainData, 'some data')
				assert.equal(chainData, this.data)
				return next()
			})
	})

	it('should not attempt to require the done method', function (next) {
		var chain = Chainy
			.subclass().subclass().subclass().require('done')
			.create().require('done')
			.done(function (err) {
				assert.equal(chain, this)
				assert.errorEqual(err, null)
				return next()
			})
	})

	it('should not add an extension twice', function () {
		function extension (data) {
			this.data = data
		}
		var chain = Chainy.create()
		chain.addExtension('myset', 'action', extension)
		var firstAdd = chain.myset
		chain.addExtension('myset', 'action', extension)
		var secondAdd = chain.myset
		assert.equal(typeof firstAdd, 'function')
		assert.equal(firstAdd, secondAdd) // strict
	})

	it('should work with special arguments', function (next) {
		Chainy.create()  // instance
			.addExtension('set', 'action', function (value, newValue) {
				return newValue
			})
			.addExtension('myinject', 'action', function (a, b, c, next) {
				assert.equal(a, 1, 'myinject a')
				assert.deepEqual(b, [2, 3, 4], 'myinject b')
				assert.equal(c, 5, 'myinject c')
				next()
			})
			.addExtension('myinjectexpanded', 'action', function (a, b, c, d, e, next) {
				assert.equal(a, 1, 'myinjectexpanded a')
				assert.equal(b, 2, 'myinjectexpanded b')
				assert.equal(c, 3, 'myinjectexpanded c')
				assert.equal(d, 4, 'myinjectexpanded d')
				assert.equal(e, 5, 'myinjectexpanded e')
				next()
			})
			.addExtension('myalwaysexpanded', {
				type: 'action',
				taskOptions: {
					args: [1, Chainy.injectExpandedChainDataAsArguments, 5]
				}
			}, function (a, b, c, d, e, next) {
				assert.equal(a, 1, 'myalwaysexpanded a')
				assert.equal(b, 2, 'myalwaysexpanded b')
				assert.equal(c, 3, 'myalwaysexpanded c')
				assert.equal(d, 4, 'myalwaysexpanded d')
				assert.equal(e, 5, 'myalwaysexpanded e')
				next()
			})
			.addExtension('myalwaysexpandedoverwrite', {
				type: 'action',
				taskOptions: {
					args: [1, Chainy.injectExpandedChainDataAsArguments, 5]
				}
			}, function (a, b, c, d, e, next) {
				assert.equal(a, 1, 'myalwaysexpandedoverwrite a')
				assert.deepEqual(b, [2, 3, 4], 'myalwaysexpandedoverwrite b')
				assert.equal(c, 5, 'myalwaysexpandedoverwrite c')
				next()
			})

			.set([2, 3, 4])
			.action('myinject', {args: [1, Chainy.injectChainDataAsArgument, 5]})
			.action('myinjectexpanded', {args: [1, Chainy.injectExpandedChainDataAsArguments, 5]})
			.myalwaysexpanded(1, 5)
			.action('myalwaysexpandedoverwrite', {args: [1, Chainy.injectChainDataAsArgument, 5]})
			.done(next)
	})

	it('should inherit parent plugins', function (next) {
		var subclass = Chainy.subclass()  // class
			.addExtension('myset', 'action', function (value, newValue) {
				return newValue
			})
		var parent = subclass.create()  // instance
			.addExtension('mycapitalize', ['myCapitalize'], 'action', function (value) {
				return String(value).toUpperCase()
			})
		var child = parent.create()  // instance
			.myset('some data')
			.mycapitalize()
			.action(function (chainData) {
				assert.equal(chainData, 'SOME DATA', 'orig data is correct')
				return chainData.toLowerCase() // convert back to lowercase
			})

			.myCapitalize()
			.action(function (chainData) {
				assert.equal(chainData, 'SOME DATA', 'alias data is correct')
				// no return value, so let's check that the chain data remains upper case
			})

			.done(function (err, chainData) {
				assert.errorEqual(err, null, 'no error')
				assert.equal(chainData, 'SOME DATA', 'data is correct')
				assert.equal(chainData, this.data, 'callback data is this.data')

				assert.equal(child, this)
				assert.equal(child.parent, parent, 'child parent is the parent chain instance')
				assert.equal(parent.parent, null,  'parent parent doens\'t exist')
				assert.equal(child.klass, subclass, 'child klass is the subclass')
				assert.equal(parent.klass, subclass, 'parent klass is the subclass')
				return next()
			})
	})

	it('should work with lying function lengths', function (next) {
		Chainy.subclass()  // class
			.addExtension('mylie', 'action', function () {
				arguments[2](null, arguments[1])
			})
			.addExtension('myliefixed', {
				type: 'action',
				taskOptions: {
					ambi: false
				}
			}, function () {
				arguments[2](null, arguments[1])
			})

			.create()  // instance

			// detect failure
			.action(function (value, next) {
				this.create().mylie(1).done(function (err) {
					assert.errorEqual(err, 'arguments[2] is not a function')
					next()
				})
			})

			// work this time
			.myliefixed(1)
			.action(function (value) {
				assert.equal(value, 1)
			})
			.done(next)
	})

	// TODO: add tests for different require argument conventions, array, string, split string
})
