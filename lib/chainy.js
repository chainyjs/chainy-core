"use strict";
// Imports
var extendOnClass = require('extendonclass').extendOnClass
var taskgroup = require('taskgroup'), Task = taskgroup.Task, TaskGroup = taskgroup.TaskGroup

// Public: Create a new chainy instance, aka create a new chain
// opts - An {Object} of optional options you can provide our chain, accepts:
//   :name - Public: An optional {String} to use as the name for our chain and it's runner taskgroup
//   :taskgroupOptions - Internal: An {Object} of options to provide our runner taskgroup
var Chainy = module.exports = function(opts){
	if ( opts == null )  opts = {}
	if ( opts.taskgroupOptions == null )  opts.taskgroupOptions = {}
	opts.taskgroupOptions.name = opts.name

	// Create our runner with the passed options and run it
	this.runner = TaskGroup.create(opts.taskgroupOptions).run()
}

// Internal: The data of this chain
Chainy.prototype.data = null

// Internal: The TaskGroup runner for this chain
Chainy.prototype.runner = null

// Internal: Parent chain if this is a fork
Chainy.prototype.parent = null

// Public: Completion/error promise
//
// handler - A {Function} to call when our chain errors or completes, accepts (err, data)
Chainy.prototype.done = function(handler){
	var chain = this;
	this.runner.done(function(err){
		handler.apply(chain, [err, chain.data])
	})
	return this
}

// Public: Helper to create a new chainy instance
//
// opts - An {Object} of options sent to the {Chainy} constructor
Chainy.create = function(opts){
	var child = new this(opts)
	child.klass = this
	return child
}

// Public: Create a child of this chain
//
// opts - An {Object} of options sent to the {Chainy} constructor
Chainy.prototype.create = function(opts){
	var child = this.klass.create(opts)
	child.klass = this.klass
	child.parent = this
	child.addExtensions(this.extensions)
	return child
}

// Public: Clone the chain
// Creates a child of this chain and deep clones the data into it
//
// opts - An {Object} of options sent to the {Chainy} constructor
Chainy.prototype.clone = function(opts){
	var child = this.create(opts)
	child.data = JSON.parse(JSON.stringify(this.data))
	return child
}


// Public: Creates a {Task} to be used as Chainy action
//
// method - The {Function} to use for the method of the action
// opts - An {Object} of {Task} options, with the following chainy added options:
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

// Public: Create an action task and add it to our runner queue
//
// arguments - Forwarded onto {::createActionTask}
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

// Public: Helper to help javascript users create a subclass, works like Backbone.Model.extend
Chainy.subclass = extendOnClass

// Public: Helper to freeze a class
//
// Will not work in old browsers:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze#Browser_compatibility
//
// Examples
// 
//   module.exports = require('chainy').subclass().require('common').freeze()
Chainy.freeze = function(){
	if ( Object.freeze ) {
		Object.freeze(this)
	}
	return this
}

// Internal: Extensions that have been added
// extensions = {name1: extension1, name2: extension2}
Chainy.extensions = Chainy.prototype.extensions = null

// Public: Helper to fetch the an extension in our or any of our parents
//
// name - The {String} name of the extension to fetch
Chainy.getExtension = Chainy.prototype.getExtension = function(name){
	return (
		( this.extensions && this.extensions[name] ) ||
		( this.klass && this.klass.getExtension(name) ) ||
		null
	)
}

// Public: Helper to add an extension to our chain instance and/or prototype
// Same as underscore's mixin
Chainy.mixin = Chainy.prototype.mixin = function(key, value){
	// Prepare
	var me = this

	// Support (many) signature
	if ( arguments.length === 1 ) {
		Object.keys(arguments[0]).forEach(function(key){
			var value = arguments[0][key]
			me.mixin(key, value)
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

// Public: Helper to add extensions to our chain instance of prototype
//
// extensions - Either an {Object} or {Array} of extensions, if object, extnesions should be hashed by their name, if an array, they should be extension objects
Chainy.addExtensions = Chainy.prototype.addExtensions = function(extensions){
	var me = this;
	if ( Array.isArray(extensions) ) {
		extensions.forEach(function(value){
			me.addExtension(value)
		})
	} else if ( extensions ) {
		Object.keys(extensions).forEach(function(key){
			var value = extensions[key]
			me.addExtension(key, value)
		})
	}
	return this
}

// Public: Helper to add an extension to our chain instance or prototype
//
// Supports multiple signatures:
// - (name, type, method, options)
//   useful for adding inline extensions
// - (name, method), method.extensionType = type, method.extensionOptions = {}
//   useful for simpler api, plus having generic modules becoming chainy compatible
// - ({name, method, type, actionOptions}), actionOptions = {args, ...}
//   useful for explicit and robust additions by just using extensionOptions
// 
// We do not default the extension type, it must be specified either via the type argument,
// or via extension.extensionType, this is to ensure forward compatibility to avoid default changes
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

	// Support the different argument formats
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
			// Support simpler API
			if ( arg.extensionType != null )  extension.type = arg.extensionType
			if ( arg.extensionOptions != null )  args.push(arg.extensionOptions)
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
		// Add to the prototype if we are a class,
		// otherwise add to the instance if we are an instance of a class
		var where = (this.prototype || this)
		where[extension.name] = function(){
			// avoid bad referencing by copying the generic actionOptions into a situation specific one
			var actionOptions = {}
			actionOptions.args = Array.prototype.slice.call(arguments)
			actionOptions.name = 'action for '+extension.name+': '+Math.random()
			Object.keys(extension.actionOptions || {}).forEach(function(key){
				var value = extension.actionOptions[key]
				actionOptions[key] = value
			})
			return this.action(extension.method, actionOptions)
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
		var err = new Error('Unknown extension type for extension: '+extension.name)
		throw err
	}

	// Save the extension
	if ( this.extensions === null )  this.extensions = {}
	this.extensions[extension.name] = extension

	// Chain
	return this
}

// Internal: Helper to require a plugin
// Here to allow chainy extensions to extend it
// Internal status as we are still deciding the functionality for this, it may break in minor revisions
//
// pluginName - The {String} name of the plugin we want to require, e.g. `set`
//
// Returns the required package for the plugin
Chainy.requirePlugin = Chainy.prototype.requirePlugin = function(pluginName){
	var pluginPackageName = 'chainy-plugin-'+pluginName
	var plugin = null
	try {
		plugin = require(pluginPackageName)
	} catch (err) {
		throw this.getRequirePluginError(pluginName)
	}
	return plugin
}

// Internal: Generate an error for requiring a plugin
// Internal status as we are still deciding the functionality for this, it may break in minor revisions
//
// pluginName - The {String} name of the plugin we want to display a require error for, e.g. `set`
//
// Returns the {Error} instance
Chainy.getRequirePluginError = Chainy.prototype.getRequirePluginError = function(pluginName){
	var pluginPackageName = 'chainy-plugin-'+pluginName
	var err = new Error(
		'Failed to require the plugin: '+pluginName+'\n'+
		'You may need to install it manually: npm install --save '+pluginPackageName
	)
	return err
}

// Public: Helper to require plugins into our chain instance or prototype
//
// Supports a few different signatures
// - (plugins), where plugins is a {String} of plugin names (space seperated)
// - (plugins), where plugins is an {Array} of plugin names
// - (arguments), where each argument is a plugin name
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
		plugin = me.requirePlugin(pluginName)

		// Add the plugin to the chain
		// also include support for module.exports.extension = {}, abilities
		// for keeping generic modules backwards compatible
		me.addExtension(pluginName, (plugin.extension || plugin))
	})

	// Chain
	return this
}

// Freeze chainy
Chainy.freeze()