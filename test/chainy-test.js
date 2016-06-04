/* eslint no-var:0, max-params:0, no-unused-vars:0, prefer-rest-params:0, no-unused-expressions:0 */

// Import
var expect = require('chai').expect,
	joe = require('joe')

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
		expect(err && err.message).to.contain('frozen')
	})

	it('should pass when attempting to extend a child class', function () {
		function extension (value, newVaue) {}

		var chain = Chainy.subclass()
			.addExtension('myutility', 'utility', extension)
			.addExtension('myaction', 'action', extension)
			.create()

		expect(chain.myutility, 'utility by name').to.equal(extension)
		expect(chain.myaction, 'action by name').to.be.a('function')
	})

	it('should handle aliases correctly', function () {
		function extension (value, newVaue) {}

		var chain = Chainy.subclass()
			.addExtension('myutility', ['myUtility'], 'utility', extension)
			.addExtension('myaction', ['myAction'], 'action', extension)
			.create()

		expect(chain.myutility, 'utility by name').to.equal(extension)
		expect(chain.myUtility, 'utility by alias').to.equal(extension)
		expect(chain.myaction, 'action by name').to.be.a('function')
		expect(chain.myAction, 'action by alias').to.be.a('function')
	})

	it('should handle errors gracefully', function (next) {
		var chain = Chainy.create()
			.addExtension('myoops', 'action', function () {
				throw new Error('deliberate failure')
			})
			.myoops()
			.done(function (err, chainData) {
				expect(chain).to.equal(this)
				expect(err.message).to.equal('deliberate failure')
				expect(chainData).to.equal(null)
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
				expect(chain).to.equal(this)
				expect(err).to.equal(null)
				expect(chainData).to.equal('some data')
				expect(chainData).to.equal(this.data)
				return next()
			})
	})

	it('should not attempt to require the done method', function (next) {
		var chain = Chainy
			.subclass().subclass().subclass().require('done')
			.create().require('done')
			.done(function (err) {
				expect(chain).to.equal(this)
				expect(err).to.equal(null)
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
		expect(firstAdd).to.be.a('function')
		expect(firstAdd).to.equal(secondAdd) // strict
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
				expect(chainData, 'orig data is correct').to.equal('SOME DATA')
				return chainData.toLowerCase() // convert back to lowercase
			})

			.myCapitalize()
			.action(function (chainData) {
				expect(chainData, 'alias data is correct').to.equal('SOME DATA')
				// no return value, so let's check that the chain data remains upper case
			})

			.done(function (err, chainData) {
				expect(err, 'no error').to.equal(null)
				expect(chainData, 'data is correct').to.equal('SOME DATA')
				expect(chainData, 'callback data is this.data').to.equal(this.data)

				expect(child).to.equal(this)
				expect(child.parent, 'child parent is the parent chain instance').to.equal(parent)
				expect(parent.parent, 'parent parent doens\'t exist').to.equal(null)
				// expect(child.klass, 'child klass is the subclass').to.equal(subclass)
				// expect(parent.klass, 'parent klass is the subclass').to.equal(subclass)
				return next()
			})
	})

	it('should work with special arguments', function (next) {
		Chainy.subclass()  // class
			.addExtension('set', 'action', function (value, newValue) {
				return newValue
			})
			.addExtension('myinject', 'action', function (a, b, c, next) {
				try {
					expect(a).to.equal(1)
					expect(b).to.deep.equal([2, 3, 4])
					expect(c).to.equal(5)
				}
				catch (err) {
					err.message = 'myinject failed: ' + err.message
					throw err
				}
				next()
			})
			.addExtension('myinjectexpanded', 'action', function (a, b, c, d, e, next) {
				try {
					expect(a).to.equal(1)
					expect(b).to.equal(2)
					expect(c).to.equal(3)
					expect(d).to.equal(4)
					expect(e).to.equal(5)
				}
				catch (err) {
					err.message = 'myinjectexpanded failed: ' + err.message
					throw err
				}
				next()
			})
			.addExtension('myalwaysexpanded', {
				type: 'action',
				taskOptions: {
					args: [1, Chainy.injectExpandedChainDataAsArguments, 5]
				}
			}, function (a, b, c, d, e, next) {
				try {
					expect(a).to.equal(1)
					expect(b).to.equal(2)
					expect(c).to.equal(3)
					expect(d).to.equal(4)
					expect(e).to.equal(5)
				}
				catch (err) {
					err.message = 'myalwaysexpanded failed: ' + err.message
					throw err
				}
				next()
			})
			.addExtension('myalwaysexpandedoverwrite', {
				type: 'action',
				taskOptions: {
					args: [1, Chainy.injectExpandedChainDataAsArguments, 5]
				}
			}, function (a, b, c, d, e, next) {
				try {
					expect(a).to.equal(1)
					expect(b).to.deep.equal([2, 3, 4])
					expect(c).to.equal(5)
				}
				catch (err) {
					err.message = 'myalwaysexpandedoverwrite failed: ' + err.message
					throw err
				}
				next()
			})

			.create()  // instance
			.set([2, 3, 4])
			.action('myinject', {args: [1, Chainy.injectChainDataAsArgument, 5]})
			.action('myinjectexpanded', {args: [1, Chainy.injectExpandedChainDataAsArguments, 5]})
			.myalwaysexpanded(1, 5)
			.action('myalwaysexpandedoverwrite', {args: [1, Chainy.injectChainDataAsArgument, 5]})
			.done(next)
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
					expect(err).to.exist
					next()
				})
			})
			// work this time
			.myliefixed(1)
			.action(function (value) {
				expect(value).to.equal(1)
			})
			.done(next)
	})

	// TODO: add tests for different require argument conventions, array, string, split string
})
