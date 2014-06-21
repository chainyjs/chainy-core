"use strict";
// TaskGroup
var taskgroup = require('taskgroup'), Task = taskgroup.Task, TaskGroup = taskgroup.TaskGroup

// Build our chain while passing some options to the taskgroup constructor for our runner
// Also export it
// opts = {name: 'a name for our instance, useful for debugging'}
var Chainy = module.exports = function(runnerOpts){
	// Create our runner with the passed options and run it
	this.runner = TaskGroup.create(runnerOpts).run()
}

// The data of this chain
Chainy.prototype.data = null

// The TaskGroup runner for this chain
Chainy.prototype.runner = null

// Parent chain if this is a fork
Chainy.prototype.parent = null

// Completion/error promise
Chainy.prototype.done = function(handler){
	var chain = this;
	this.runner.done(function(err){
		handler.apply(chain, [err, chain.data])
	})
	return this
}

// Helper to create a new chainy instance
Chainy.create = function(opts){
	var child = new this(opts)
	child.klass = this
	return child
}

// Create a child of this chain
Chainy.prototype.create = function(opts){
	var child = this.klass.create(opts)
	child.klass = this.klass
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


// Create an action task from the given method and options
// Options are forwarded onto {Task}, we also add the following:
//   :prependResultToArguments - A {Boolean} of whether or not we should prepend the chain's data as the first argument of the method, can also be set to `'all`' to prepend each item in a an array of chain's data as the first arguments
//   :setArgumentsAsResult - A {Boolean} of whether or not we should update the chain's data with the result arguments
Chainy.prototype.createActionTask = function(method, opts){
	if ( opts == null )  opts = {}
	if ( opts.prependResultToArguments == null )  opts.prependResultToArguments = true
	if ( opts.setArgumentsAsResult == null )  opts.setArgumentsAsResult = true

	var chain = this
	var task = this.runner.createTask(method.bind(chain), opts)

	if ( opts.prependResultToArguments ) {
		task.once('started', function(){
			if ( opts.prependResultToArguments === 'all' && Array.isArray(chain.data) ) {
				task.config.args = chain.data.concat(task.config.args || [])
			}
			else {
				task.config.args = [chain.data].concat(task.config.args || [])
			}
		})
	}

	task.done(function(err, data){
		if (err || arguments.length <= 1 || opts.setArgumentsAsResult === false) {
			// error, or only error argument, or do not apply
			// in which case, do not update the chain data
		} else if (arguments.length === 2) {
			// no error, and data specified
			// update the chain data with the data argument
			chain.data = data
		} else {
			// no error, and multiple arguments specified
			// update the chain data with the multiple data arguments
			data = Array.prototype.slice.call(arguments, 1)
			chain.data = data
		}
	})

	return task
}

// Create an action task and add it to our runner queue
Chainy.prototype.action = function(){
	// Forward
	var args = Array.prototype.slice.call(arguments)
	var task = this.createActionTask.apply(this, args)

	// Add
	this.runner.addTask(task)

	// Chain
	return this
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
	return this
}

// Extensions that have been added
// extensions = {name1: extension1, name2: extension2}
Chainy.extensions = Chainy.prototype.extensions = null

// Helper to fetch the an extension in our or any of our parents
Chainy.getExtension = Chainy.prototype.getExtension = function(name){
	return (
		( this.extensions && this.extensions[name] ) ||
		( this.klass && this.klass.getExtension(name) ) ||
		null
	)
}

// Helper to add an extension to our chain instance and/or prototype
// Same as underscore's mixin
Chainy.mixin = Chainy.prototype.mixin = function(key, value){
	// Support (many) signature
	if ( arguments.length === 1 ) {
		Object.keys(arguments[0]).forEach(function(key){
			var value = arguments[0][key]
			this.mixin(key, value)
		})
		return this
	}

	// Add to the class and/or instance
	this[key] = value

	// Add to the class prototype as well if applicable
	if ( this.prototype != null )  this.prototype[key] = value

	// Chain
	return this
}

// Helper to add an extension to our chain instance or prototype
// Acceptable signatures: (extensions), (name, extension), (name, type, extension)
// We do not default the extension type, it must be specified
// either via the type argument, or via extension.extensionType
// this is to ensure forward compatibility
Chainy.addExtensions = Chainy.prototype.addExtensions = function(extensions){
	var me = this;
	if ( Array.isArray(extensions) ) {
		extensions.forEach(function(value){
			me.addExtension(value)
		})
	} else {
		Object.keys(extensions).forEach(function(key){
			var value = extensions[key]
			me.addExtension(key, value)
		})
	}
	return this
}
Chainy.addExtension = Chainy.prototype.addExtension = function(){
	// Do not let the user extend a base chainy class
	if ( Object.isFrozen && Object.isFrozen(this) === true ) {
		throw new Error(
			"You have tried to extend a chainy class that has been frozen.\n"+
			"This is usually to avoid polluting a base chainy class.\n"+
			"Instead call `.subclass()` before your extensions are added.\n"+
			"E.g. `require('chainy').require('set')` becomes `require('chainy').subclass().require('set')`"
		)
	}

	// Support different arguments formats
	var extension = {}
	var args = Array.prototype.slice.call(arguments)
	args.forEach(function(arg,index){
		if ( typeof arg === 'string' ) {
			if ( index === 0 ) {
				extension.name = arg
			} else {
				extension.type = arg
			}
		} else if ( typeof arg === 'function' ) {
			extension.method = arg
			// support v0 API
			if ( arg.extensionType != null )  extension.type = arg.extensionType
		} else if ( typeof arg === 'object' ) {
			Object.keys(arg).forEach(function(key){
				var value = arg[key]
				extension[key] = value
			})
		}
	})

	// Check if we already have this extension
	// If we have it, and we are different, continue
	// If we have it, and it is the same, break
	if ( (this.getExtension(extension.name) || {}).method === extension.method ) {
		return this
	}

	// If the extension type is action, taskify it
	if ( extension.type === 'action' ) {
		// Support action options
		if ( extension.actionOptions == null )  extension.actionOptions = {}

		// Add to the prototype if we are a class,
		// otherwise add to the instance if we are an instance of a class
		var where = (this.prototype || this)
		where[extension.name] = function(){
			if ( extension.actionOptions.args == null )  extension.actionOptions.args = Array.prototype.slice.call(arguments)
			return this.action(extension.method, extension.actionOptions)
		}
	}

	// If the extension type is utility, don't do anything special to it
	else if ( extension.type === 'utility' ) {
		this.mixin(extension.name, extension.method)
	}

	// If the extension type is custom, let it figure out how to add itself to us
	else if ( extension.type === 'custom' ) {
		extension.method(this)
	}

	// Unknown extension type
	else {
		console.log(extension, args)
		throw new Error('Unknown extension type for extension: '+extension.name)
	}

	// Save the extension
	if ( this.extensions === null )  this.extensions = {}
	this.extensions[extension.name] = extension

	// Chain
	return this
}

// Helper to require a package name
// Here to allow chainy extensions to extend it
Chainy.requirePluginPackage = Chainy.prototype.requirePluginPackage = function(packageName){
	return require(packageName)
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
		var plugin = null

		// Check that there are no special characters in the plugin name
		// as such things will be very confusing to the user
		if ( /^[a-z]/.test(pluginName) === false )  throw new Error('Plugin names may only contain lowercase letters')

		// Check if the extension or method already exists
		// We care about checking for methods here, as we don't want to require things like `done`
		if ( me.getExtension(pluginName) != null || me[pluginName] || (me.prototype != null && me.prototype[pluginName]) )  return true

		// Require our plugin package
		plugin = me.requirePluginPackage('chainy-plugin-'+pluginName)

		// Add the plugin to the chain
		me.addExtension(pluginName, plugin)
	})

	// Chain
	return this
}

// Freeze chainy
Chainy.freeze()