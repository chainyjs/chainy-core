(function(){
	"use strict";

	// Import
	var expect = require('chai').expect,
		joe = require('joe')

	// Test Chainy
	joe.describe('chainy', function(describe,it){
		var Chainy = require('../')

		it("should fail when attempting to extend the base class", function(){
			var err;
			try {
				Chainy.addExtension('test', 'action', function(){})
			}
			catch (_err) {
				err = _err;
			}
			expect(err && err.message).to.contain('frozen')
		})

		it("should pass when attempting to extend a child class", function(){
			var extension = function(){}
			var MyChainy = Chainy.subclass().addExtension('test', 'utility', extension)
			expect(MyChainy.prototype.test).to.equal(extension)
		})

		it("should handle errors gracefully", function(next){
			Chainy.create()
				.addExtension('oops', 'action', function(){
					throw new Error('deliberate failure')
				})
				.oops()
				.done(function(err, chainData){
					expect(err.message).to.equal('deliberate failure')
					expect(chainData).to.equal(null)
					return next()
				})
		})

		it("should work well", function(next){
			Chainy.create()
				.addExtension('set', 'action', function(data){
					this.data = data
				})
				.set('some data')
				.done(function(err, chainData){
					expect(err).to.equal(null)
					expect(chainData).to.equal('some data')
					expect(chainData).to.equal(this.data)
					return next()
				})
		})

		it("should not attempt to require the done method", function(next){
			Chainy.subclass().subclass().subclass().require('done')
				.create().require('done')
				.done(function(err, chainData){
					expect(err).to.equal(null)
					return next()
				})
		})

		it("should not add an extension twice", function(){
			var extension = function(data){
				this.data = data
			}
			var chain = Chainy.create()
			chain.addExtension('set', 'action', extension)
			var firstAdd = chain.set
			chain.addExtension('set', 'action', extension)
			var secondAdd = chain.set
			expect(firstAdd).to.be.a('function')
			expect(firstAdd).to.equal(secondAdd) // strict
		})

		it("should inherit parent plugins", function(next){
			var subclass = Chainy.subclass()  // class
				.addExtension('set', 'action', function(data){
					this.data = data
				})
			var parent = subclass.create()  // instance
				.addExtension('capitalize', 'action', function(){
					this.data = String(this.data).toUpperCase()
				})
			var child = parent.create()  // instance
				.set('some data')
				.capitalize()
				.done(function(err, chainData){
					expect(child.parent, "child parent is the parent chain instance").to.equal(parent)
					expect(parent.parent, "parent parent doens't exist").to.equal(null)
					//expect(child.klass, "child klass is the subclass").to.equal(subclass)
					//expect(parent.klass, "parent klass is the subclass").to.equal(subclass)
					expect(err).to.equal(null)
					expect(chainData, 'callback data is this.data').to.equal(this.data)
					expect(chainData, 'data is correct').to.equal('SOME DATA')
					return next()
				})
		})

		// TODO:
		// Add tests for different require argument conventions, array, string, split string
	});
})()