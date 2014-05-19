(function(){
	"use strict";

	// TaskGroup
	var taskgroup = require('taskgroup'), Task = taskgroup.Task, TaskGroup = taskgroup.TaskGroup

	// Buid our chain while passing some options to the taskgroup constructor for our runner
	// Also export it
	// opts = {name: 'a name for our instance, useful for debugging'}
	var Chainy = module.exports = function(opts){
		// Prepare properties
		this.extensions = {}

		// Extract available options
		if ( opts == null )  opts = {}
		var runnerOpts = {
			name: opts.name
		}

		// Create our runner with the passed options and run it
		this.runner = TaskGroup.create(runnerOpts).run()
			// Also, bind our default error handler
			// to ensure that errors are caught if the user doesn't catch them
			.once('error', this.defaultErrorHandler)
			.once('complete', this.defaultErrorHandler)
	}

	// Extensions that have been added
	// extensions = {name1: extension1, name2: extension2}
	Chainy.prototype.extensions = null

	// The data of this chain
	Chainy.prototype.data = null

	// The TaskGroup runner for this chain
	Chainy.prototype.runner = null

	// Parent chain if this is a fork
	Chainy.prototype.parent = null

	// By default throw the error if present if no other completion callback has been set
	Chainy.prototype.defaultErrorHandler = function(err){
		if (err)  {
			console.log(err.stack || err)
			throw err
		}
		return this
	}

	// Apply a listener to the runner
	Chainy.prototype.on = function(){
		var args = Array.prototype.slice.call(arguments)
		this.runner.on.apply(this.runner, args)
		return this
	}

	// Remove a listener from the runner
	Chainy.prototype.off = function(){
		var args = Array.prototype.slice.call(arguments)
		this.runner.removeListener.apply(this.runner, args)
		return this
	}

	// Fire the passed callback once all tasks have fired on the chain
	// or when an error occurs that haults execution of the rest of the tasks
	// note: does not catch uncaught errors, for that, use .on('error', function(err){})
	// next(err, data)
	Chainy.prototype.done = function(handler){
		var chain = this

		var wrappedHandler = function(err){
			// ensure the done handler is ever only fired once and once only regardless of which event fires
			chain
				.off('error', wrappedHandler)
				.off('complete', wrappedHandler)

			// fire our user handler
			return handler.apply(chain, [err, chain.data])
		}

		chain
			// remove the default handler
			.off('error', this.defaultErrorHandler)
			.off('complete', this.defaultErrorHandler)

			// add our wrapped handler
			.on('error', wrappedHandler)
			.on('complete', wrappedHandler)

		return this
	}

	// Helper to create a new chainy instance
	Chainy.create = function(opts){
		var child = new this(opts)
		child.klass = this
		return child
	}

	// Create a child of this chain
	// NOTE: This will not copy over any plugins loaded on the parent
	// TODO: It should copy them over
	Chainy.prototype.create = function(opts){
		var child = this.klass.create(opts)
		child.klass = this
		child.parent = this
		child.addExtensions(this.extensions)
		return child
	}

	// Clone the chain
	// Creates a child of this chain and deep clones the data into it
	Chainy.prototype.clone = function(opts){
		var child = this.create(opts)
		child.data = JSON.parse(JSON.stringify(this.data))
		return child
	}


	// Helpers
	// This sections contains things that added to directly to the class
	// rather than just to the classes prototype

	// Helper to help javascript users create a subclass
	Chainy.subclass = require('extendonclass').extendOnClass

	// Helper to freeze a class
	//
	// Will not work in old browsers:
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze#Browser_compatibility
	//
	// E.g.
	// module.exports = require('chainy').subclass().require('common').freeze()
	Chainy.freeze = function(){
		if ( Object.freeze ) {
			Object.freeze(this)
		}
		return this;
	}

	// Helper to add an extension to our chain instance or prototype
	// Acceptable signatures: (name, extension), (name, type, extension)
	Chainy.addExtension = Chainy.prototype.addExtension = function(name, type, extension){
		var where = (this.prototype || this)

		// TODO: Don't add the plugin if it has already been added
		// ^ only advantage of this is performance benefits
		// ^ as well as benefits for custom extensions

		// Do not let the user extend a base chainy class
		if ( Object.isFrozen && Object.isFrozen(this) === true ) {
			throw new Error(
				"You have tried to extend a chainy class that has been frozen.\n"+
				"This is usually to avoid polluting a base chainy class.\n"+
				"Instead call `.subclass()` before your extensions are added.\n"+
				"E.g. `require('chainy').require('set')` becomes `require('chainy').subclass().require('set')`"
			)
		}

		// `type` has not been specified, so `type` is actually the `extension` argument
		if ( arguments.length === 2 ) {
			extension = type
			type = undefined
		}

		// `type` has been specified so apply it
		else if ( arguments.length === 3 ) {
			extension.extensionType = type
		}

		// Default extensionType
		if ( extension.extensionType == null )  {
			if ( typeof extension.setupExtension === 'function' ) {
				extension.extensionType = 'custom'
			}
			else {
				extension.extensionType = 'action'
			}
		}

		// If the extension type is action, taskify it, and add it to our chain
		if ( extension.extensionType === 'action' ) {
			where[name] = function(){
				var args = Array.prototype.slice.call(arguments)
				var task = Task.create({
					name: name,
					args: args,
					method: extension.bind(this)
				})
				this.runner.addTask(task)
				return this
			}
		}

		// If the extension type is utility, add it directly to our chain
		else if ( extension.extensionType === 'utility' ) {
			where[name] = extension
		}

		// If the extension type is custom, let it figure out how to add itself to us
		else if ( extension.extensionType === 'custom' ) {
			(extension.setupExtension || extension)(this)
		}

		// Unknown extension type
		else {
			throw new Error('Unknown extension type')
		}

		// Add the plugin if this is a chain instance
		// TODO: Why is this only for chain instances?
		if ( where === this ) {
			this.extensions[name] = extension
		}

		// Chain
		return this
	}

	// Helper to add multiple extensions to our chain instance or prototype
	// extensions = {name1: extension1, name2: extension2}
	Chainy.addExtensions = Chainy.prototype.addExtensions = function(extensions){
		var key, value;
		for ( key in extensions ) {
			if ( extensions.hasOwnProperty(key) === true ) {
				value = extensions[key]
				this.addExtension(key, value)
			}
		}
		return this
	}

	// Helper to require plugins into our chain instance or prototype
	Chainy.require = Chainy.prototype.require = function(){
		var me = this
		var plugins = Array.prototype.slice.call(arguments)
		if ( Array.isArray(plugins[0]) ) {
			plugins = plugins.concat(plugins[0]).slice(1)
		}
		plugins.forEach(function(pluginName){
			var plugin = null;

			// Filter out helper and class methods that are confused with extensions
			// and extensions that we have already loaded
			if ( (me.prototype || me)[pluginName] != null )  return true

			// Require our plugin package
			plugin = require('chainy-plugin-'+pluginName)

			// Add the plugin to the chain
			me.addExtension(pluginName, plugin)
		})
		return this
	}

	// Freeze chainy
	Chainy.freeze()
})()