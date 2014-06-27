"use strict";
// Import
var expect = require('chai').expect,
	joe = require('joe')

// Test Chainy
joe.describe('chainy', function(describe,it){
	var Chainy = require('../')

	it("should fail when attempting to extend the base class", function(){
		var err = null
		try {
			Chainy.addExtension('test', 'action', function(){})
		}
		catch (_err) {
			err = _err
		}
		expect(err && err.message).to.contain('frozen')
	})

	it("should pass when attempting to extend a child class", function(){
		var extension = function(value, newVaue){}
		
		var MyChainy = Chainy.subclass()
			.addExtension('myutility', 'utility', extension)
			.addExtension('myaction', 'action', extension)
		
		expect(MyChainy.prototype.myutility, 'utility by name').to.equal(extension)
		expect(MyChainy.prototype.myaction, 'action by name').to.be.a('function')
	})

	it("should handle aliases correctly", function(){
		var extension = function(value, newVaue){}
		
		var MyChainy = Chainy.subclass()
			.addExtension('myutility', ['myUtility'], 'utility', extension)
			.addExtension('myaction', ['myAction'], 'action', extension)

		expect(MyChainy.prototype.myutility, 'utility by name').to.equal(extension)
		expect(MyChainy.prototype.myUtility, 'utility by alias').to.equal(extension)
		expect(MyChainy.prototype.myaction, 'action by name').to.be.a('function')
		expect(MyChainy.prototype.myAction, 'action by alias').to.be.a('function')
	})

	it("should handle errors gracefully", function(next){
		var chain = Chainy.create()
			.addExtension('myoops', 'action', function(){
				throw new Error('deliberate failure')
			})
			.myoops()
			.done(function(err, chainData){
				expect(chain).to.equal(this)
				expect(err.message).to.equal('deliberate failure')
				expect(chainData).to.equal(null)
				return next()
			})
	})

	it("should work well", function(next){
		var chain = Chainy.create()
			.addExtension('myset', 'action', function(value, newValue){
				return newValue
			})
			.myset('some data')
			.done(function(err, chainData){
				expect(chain).to.equal(this)
				expect(err).to.equal(null)
				expect(chainData).to.equal('some data')
				expect(chainData).to.equal(this.data)
				return next()
			})
	})

	it("should not attempt to require the done method", function(next){
		var chain = Chainy
			.subclass().subclass().subclass().require('done')
			.create().require('done')
			.done(function(err){
				expect(chain).to.equal(this)
				expect(err).to.equal(null)
				return next()
			})
	})

	it("should not add an extension twice", function(){
		var extension = function(data){
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

	it("should inherit parent plugins", function(next){
		var subclass = Chainy.subclass()  // class
			.addExtension('myset', 'action', function(value, newValue){
				return newValue
			})
		var parent = subclass.create()  // instance
			.addExtension('mycapitalize', ['myCapitalize'], 'action', function(value){
				return String(value).toUpperCase()
			})
		var child = parent.create()  // instance
			.myset('some data')
			.mycapitalize()
			.action(function(chainData){
				expect(chainData, 'data is correct').to.equal('SOME DATA')
				return chainData.toLowerCase() // convert back to lowercase
			})

			.myCapitalize()
			.action(function(chainData){
				expect(chainData, 'data is correct').to.equal('SOME DATA')
				// no return value, so let's check that the chain data remains upper case
			})

			.done(function(err, chainData){
				expect(err, 'no error').to.equal(null)
				expect(chainData, 'data is correct').to.equal('SOME DATA')
				expect(chainData, 'callback data is this.data').to.equal(this.data)

				expect(child).to.equal(this)
				expect(child.parent, "child parent is the parent chain instance").to.equal(parent)
				expect(parent.parent, "parent parent doens't exist").to.equal(null)
				//expect(child.klass, "child klass is the subclass").to.equal(subclass)
				//expect(parent.klass, "parent klass is the subclass").to.equal(subclass)
				return next()
			})
	})

	// TODO:
	// Add tests for different require argument conventions, array, string, split string
})