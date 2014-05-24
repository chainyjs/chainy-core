(function(){
	"use strict";

	// TaskGroup
	var taskgroup = require('taskgroup'), Task = taskgroup.Task, TaskGroup = taskgroup.TaskGroup

	// Buid our chain while passing some options to the taskgroup constructor for our runner
	// Also export it
	// opts = {name: 'a name for our instance, useful for debugging'}
	var Chainy = module.exports = function(opts){
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

	// Extensions that have been added
	// extensions = {name1: extension1, name2: extension2}
	Chainy.extensions = Chainy.prototype.extensions = null

	// Helper to fetch the an extension in our or any of our parents
	Chainy.getExtension = Chainy.prototype.getExtension = function(name){
		return (
			( this.extensions && this.extensions[name] ) ||
			( this.klass && this.klass.getExtension(name) ) ||
			( this.parent && this.parent.getExtension(name) ) ||
			null
		)
	}

	// Helper to add an extension to our chain instance or prototype
	// Acceptable signatures: (name, extension), (name, type, extension)
	Chainy.addExtension = Chainy.prototype.addExtension = function(name, type, extension){
		// Do not let the user extend a base chainy class
		if ( Object.isFrozen && Object.isFrozen(this) === true ) {
			throw new Error(
				"You have tried to extend a chainy class that has been frozen.\n"+
				"This is usually to avoid polluting a base chainy class.\n"+
				"Instead call `.subclass()` before your extensions are added.\n"+
				"E.g. `require('chainy').require('set')` becomes `require('chainy').subclass().require('set')`"
			)
		}

		// Check if we already have this extension
		// If we have it, and we are different, continue
		// If we have it, and it is the same, break
		if ( this.getExtension(name) === extension ) {
			return this
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

		// If the extension type is action, taskify it
		if ( extension.extensionType === 'action' ) {
			// Add to the prototype if we are a class,
			// otherwise add to the instance if we are an instance of a class
			(this.prototype || this)[name] = function(){
				var me = this;
				var args = Array.prototype.slice.call(arguments)
				var task = Task.create({
					name: name,
					method: extension.bind(this),
					args: args
					/*
					args: [this.data].concat(args),
					next: function(err, data){
						// error handling is done by the runner
						// all we have to do is apply if there was a value
						if ( typeof data !== 'undefined' ) {
							me.data = data
						}
					}
					*/
				})
				this.runner.addTask(task)
				return this
			}
		}

		// If the extension type is utility, don't do anything special to it
		else if ( extension.extensionType === 'utility' ) {
			// Add to the class and/or instance
			this[name] = extension
			// Add to the class prototype as well if applicable
			if ( this.prototype != null )  this.prototype[name] = extension
		}

		// If the extension type is custom, let it figure out how to add itself to us
		else if ( extension.extensionType === 'custom' ) {
			(extension.setupExtension || extension)(this)
		}

		// Unknown extension type
		else {
			throw new Error('Unknown extension type')
		}

		// Add the plugin
		if ( this.extensions === null )  this.extensions = {}
		this.extensions[name] = extension

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

		// Support the list of plugins being our list of arguments
		var plugins = Array.prototype.slice.call(arguments)

		// Support the first argument being an array
		if ( Array.isArray(plugins[0]) ) {
			plugins = plugins.concat(plugins[0]).slice(1)
		}

		// Support the first argument being a space seperated string list
		else {
			plugins = plugins.concat(plugins[0].split(' ')).slice(1)
		}

		// Cycle through the plugins
		plugins.forEach(function(pluginName){
			var plugin = null;

			// Check that there are no special characters in the plugin name
			// as such things will be very confusing to the user
			if ( /^[a-z]/.test(pluginName) === false )  throw new Error('Plugin names may only contain lowercase letters')

			// Check if the extension or method already exists
			// We care about checking for methods here, as we don't want to require things like `done`
			if ( me.getExtension(pluginName) != null || me[pluginName] || (me.prototype != null && me.prototype[pluginName]) )  return true

			// Require our plugin package
			try {
				var pluginPackageName = 'chainy-plugin-'+pluginName;
				plugin = require(pluginPackageName)
			}
			catch (err) {
				// plugin is not installed, if spawnSync exists, install it
				var fs, ps, fail = true;
				try {
					fs = require('fs')
					ps = require('child_process')
				}
				catch ( err ) {
					// in browser land
				}
				if ( ps && ps.spawnSync && fs.existsSync(process.cwd()+'/package.json') === true ) {
					console.log('Attempting to automatically install the missing plugin: '+pluginName)
					var result = ps.spawnSync('npm', ['install', '--save', pluginPackageName], {cwd: process.cwd()})
					if ( !result.error ) {
						try {
							plugin = require(process.cwd()+'/node_modules/'+pluginPackageName)
							console.log('Automatic install successful')
							fail = false
						} catch (err) {}
					}
				}
				if ( fail === true ) {
					throw new Error(
						'Failed to require the plugin: '+pluginName+'\n'+
						'You may need to install it manually: npm install --save '+pluginPackageName
					)
				}
			}

			// Add the plugin to the chain
			me.addExtension(pluginName, plugin)
		})

		// Chain
		return this
	}

	// Freeze chainy
	Chainy.freeze()
})()