/* eslint no-var:0, new-cap:0, prefer-rest-params:0, default-case:0 */

// Imports
var util = require('util')
var csextends = require('csextends')
var TaskGroup = require('taskgroup').TaskGroup
var taskgroupRunEventName = TaskGroup.subclass ? 'started' : 'pending'  // TaskGroup v4 and v5 compatibility

// Public: Create a new chainy instance, aka create a new chain
//
// opts - An {Object} of optional options you can provide our chain, accepts:
//   :name - Public: An optional {String} to use as the name for our chain and it's runner taskgroup
//   :taskgroupOptions - Internal: An {Object} of options to provide our runner taskgroup
var Chainy = module.exports = function (opts) {
	// Prepare options
	if ( opts == null )  opts = {}
	if ( opts.taskgroupOptions == null )  opts.taskgroupOptions = {}
	opts.taskgroupOptions.name = opts.name

	// Create our runner with the passed options and run it
	this.runner = TaskGroup.create(opts.taskgroupOptions).run()

	// Prepare our extensions
	this.extensions = {}

	// Add our class extensions
	this.addExtensions(this.klass.extensions)

	// Parent extensions will be added by the parent's .create() method
	// as this.parent will not be defined yet
}

// Public: Special type for argument insertion that can't be recreated by a malicious user
Chainy.injectChainDataAsArgument = 'injectChainDataAsArgument: ' + Math.random()
Chainy.injectExpandedChainDataAsArguments = 'injectExpandedChainDataAsArguments: ' + Math.random()

// Internal: Extensions that have been added
// extensions = {name1: extension1, name2: extension2}
Chainy.extensions = {}

// Internal: Our parent class
Chainy.prototype.klass = Chainy

// Internal: The data of this chain
Chainy.prototype.data = null

// Internal: The TaskGroup runner for this chain
Chainy.prototype.runner = null

// Internal: Parent chain if this is a fork
Chainy.prototype.parent = null

// Public: Completion/error promise
//
// handler - A {Function} to call when our chain errors or completes, accepts (err, data)
Chainy.prototype.done = function (handler) {
	var chain = this
	this.runner.done(function (err) {
		handler.apply(chain, [err, chain.data])
	})
	return this
}

// Public: Helper to create a new chainy instance
//
// opts - An {Object} of options sent to the {Chainy} constructor, with these custom options
//   :parent - A {Chainy} instance that we would like to create a sub chain on
//   :klass - A {Chainy} class that we would like to create a sub chain on
Chainy.create = function (opts) {
	if ( opts == null )  opts = {}
	var child, klass, parent

	// Create a sub chain from a parent instance
	if ( opts.parent && Chainy.isChainyInstance(opts.parent) ) {
		// prevent recursive loops
		parent = opts.parent
		delete opts.parent

		// create
		child = parent.create(opts)
	}

	// Create a orphan chain from a custom klass
	else if ( opts.klass ) {
		// prevent recursive loops
		klass = opts.klass
		delete opts.klass

		// create
		child = new klass(opts)
	}

	// Create a orphan chain from our klass
	else {
		// prepare
		klass = this

		// create
		child = new klass(opts)
	}

	// Complete
	return child
}

// Public: Helper to help javascript users create a subclass, works like Backbone.Model.extend
Chainy.subclass = function () {
	var parentKlass = this
	var args = Array.prototype.slice.call(arguments)
	var childKlass = csextends.apply(parentKlass, args)

	// Keep a trail of parent klasses
	// no real purpose for this at this stage considering the restructing of extensions to not use prototype
	childKlass.klass = parentKlass

	// Ensure that our klass exists at the time of instantiation so the constructor can add parent extensions
	childKlass.prototype.klass = childKlass

	// Add our parent klass extensions to our child class
	childKlass.addExtensions(parentKlass.extensions)

	// Return the child class
	return childKlass
}

// Public: Create a child of this chain
//
// opts - An {Object} of options sent to the {Chainy} constructor
Chainy.prototype.create = function (opts) {
	var parent = this
	var child = parent.klass.create(opts)
	child.parent = parent
	child.addExtensions(parent.extensions)
	return child
}

// Public: Clone the chain
// Creates a child of this chain and deep clones the data into it
//
// opts - An {Object} of options sent to the {Chainy} constructor
Chainy.prototype.clone = function (opts) {
	var parent = this
	var child = parent.create(opts)
	child.data = JSON.parse(JSON.stringify(parent.data))
	return child
}


// Internal: Creates a {Task} to be used as Chainy action
//
// method - Either a {Function} for the method, or a {String} of an extensions name to use its method
// opts - An {Object} of {Task} options, with the following chainy added options:
//   :args - An {Array} of arguments to be passed to the method, you can use `Chainy.injectChainDataAsArgument` and `Chainy.injectExpandedChainDataAsArguments` to perform special operations
//   :setArgumentsAsResult - A {Boolean} of whether or not we should update the chain's data with the result arguments, defaults to `true`
Chainy.prototype.createChainTask = function (method, opts) {
	// Prepare
	var chain = this
	if ( opts == null )  opts = {}

	// Support extensions
	if ( typeof method === 'string' ) {
		// Get the extension
		var extension = this.getExtension(method)

		// Apply new defaults
		method = extension.method
		if ( opts.name == null ) {
			opts.name = 'chain task for the extension ' + extension.name + ': ' + Math.random()
		}
		Object.keys(extension.taskOptions).forEach(function (key) {
			if ( opts[key] == null ) {
				opts[key] = extension.taskOptions[key]
			}
		})
	}

	// Set standard defaults
	if ( opts.setArgumentsAsResult == null )  opts.setArgumentsAsResult = true

	// Ensure args is an array if it exists
	if ( opts.args && !Array.isArray(opts.args) )  opts.args = [opts.args]

	// Alert of deprecation
	if ( opts.prependResultToArguments != null ) {
		throw new Error('The internal `prependResultToArguments` property is deprecated in favour of the new `args` option.')
	}

	// Create the task
	var task = this.runner.createTask(method.bind(chain), opts)

	// Handle prepending arguments
	if ( opts.args ) {
		var injectNormalIndex = opts.args.indexOf(Chainy.injectChainDataAsArgument)
		var injectExpandedIndex = opts.args.indexOf(Chainy.injectExpandedChainDataAsArguments)
		if ( injectNormalIndex !== -1 || injectExpandedIndex !== -1 ) {
			task.once(taskgroupRunEventName, function () {
				var data = chain.data
				if ( injectNormalIndex !== -1 ) {
					task.config.args =
						task.config.args.slice(0, injectNormalIndex)
						.concat([data])
						.concat(task.config.args.slice(injectNormalIndex + 1))
				}
				if ( injectExpandedIndex !== -1 ) {
					if ( !Array.isArray(data) )  data = [data]
					task.config.args =
						task.config.args.slice(0, injectExpandedIndex)
						.concat(data)
						.concat(task.config.args.slice(injectExpandedIndex + 1))
				}
			})
		}
	}

	// Handle result as arguments
	if ( opts.setArgumentsAsResult ) {
		task.done(function (err) {
			// Don't trust the normal task arguments, as they can send us multiple arguments, but be undefined`
			var allArguments = Array.prototype.slice.call(arguments)
			var dataArguments = allArguments.slice(1).filter(function (arg) {
				return typeof arg !== 'undefined'
			})

			// Handle appropriatly
			if (err || dataArguments.length === 0 ) {
				// error, or only error argument, or do not apply
				// in which case, do not update the chain data
				// error is handled by the runner
			}
			else if (dataArguments.length === 1) {
				// no error, and data specified
				// update the chain data with the data argument
				chain.data = dataArguments[0]
			}
			else {
				// no error, and multiple arguments specified
				// update the chain data with the multiple data arguments
				chain.data = dataArguments
			}
		})
	}

	// Return the task
	return task
}

// Public: Create an action task and add it to our runner queue
//
// method - Either a {Function} for the method, or a {String} of an extensions name to use its method
// opts - An {Object} of {Task} options
Chainy.prototype.action = function (method, opts) {
	// Prepare options
	if ( opts == null )  opts = {}
	if ( opts.args == null )  opts.args = [Chainy.injectChainDataAsArgument]

	// Create the task with the options
	var task = this.createChainTask(method, opts)

	// Add the task to the chain for future execution
	this.runner.addTask(task)

	// Chain
	return this
}


// Helpers
// This sections contains things that added to directly to the class
// rather than just to the classes prototype

// Public: Helper to determine if the passed argument is a actually a Chainy instance
Chainy.isChainyInstance = function (chain) {
	return chain instanceof Chainy
}

// Public: Helper to freeze a class
//
// Will not work in old browsers:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze#Browser_compatibility
//
// Examples
//
//   module.exports = require('chainy').subclass().require('common').freeze()
Chainy.freeze = function () {
	if ( Object.freeze ) {
		Object.freeze(this)
	}
	return this
}

// Public: Helper to fetch the an extension in our or any of our parents
//
// name - The {String} name of the extension to fetch
Chainy.getExtension = Chainy.prototype.getExtension = function (name) {
	return (
		( this.extensions && this.extensions[name] ) ||
		null
	)
}

// Public: Helper to add an extension to our chain instance and/or prototype
// Same as underscore's mixin (without the options argument)
Chainy.mixin = Chainy.prototype.mixin = function (key, value, opts) {
	// Prepare
	var me = this
	if ( opts == null )  opts = {}
	if ( opts.applyTo == null )  opts.applyTo = ['instance', 'class', 'prototype']

	// Support (many) signature
	if ( arguments.length === 1 ) {
		Object.keys(arguments[0]).forEach(function (key) {
			var value = arguments[0][key]
			me.mixin(key, value, opts)
		})
		return this
	}

	// Add to the instance
	if ( opts.applyTo.indexOf('instance') !== -1 && this.prototype == null ) {
		this[key] = value
	}

	// Add to the class
	if ( opts.applyTo.indexOf('class') !== -1 && this.prototype != null ) {
		this[key] = value
	}

	// Add to the class prototype as well if applicable
	if ( opts.applyTo.indexOf('prototype') !== -1 && this.prototype != null ) {
		this.prototype[key] = value
	}

	// Chain
	return this
}

// Public: Helper to add extensions to our chain instance of prototype
//
// extensions - Either an {Object} or {Array} of extensions, if object, extnesions should be hashed by their name, if an array, they should be extension objects
Chainy.addExtensions = Chainy.prototype.addExtensions = function (extensions) {
	var me = this
	if ( Array.isArray(extensions) ) {
		extensions.forEach(function (value) {
			me.addExtension(value)
		})
	}
	else if ( extensions ) {
		Object.keys(extensions).forEach(function (key) {
			var value = extensions[key]
			me.addExtension(key, value)
		})
	}
	return this
}

// Public: Helper to add an extension to our chain instance or prototype
//
// Supports multiple signatures:
// - (name, type, method, aliases, options)
//   useful for adding inline extensions
// - (name, method), method.extensionType = type, method.extensionOptions = {}
//   useful for simpler api, plus having generic modules becoming chainy compatible
// - (extensionOptions)
//   useful for explicit and robust additions by just using extensionOptions
//
// Extension options are:
// - name - (required) A {String} for the name of our extension
// - method - (required) A {Function} for what our extension will do
// - type - (required) A {String} for the type of our extension, out of `action`, `utility`, and `custom`
// - aliases - An {Array} of {String}s for other name combinations, when stripped of special chars, and lowercase, must be the same as name
// - taskOptions - An {Object} of task options, forwarded onto {::action}
//
// We do not default the extension type, it must be specified either via the type argument,
// or via extension.extensionType, this is to ensure forward compatibility to avoid default changes
Chainy.addExtension = Chainy.prototype.addExtension = function () {
	// Prepare
	var me = this
	var isChainyInstance = typeof this.prototype === 'undefined'
	var isChainyClass = !isChainyInstance

	// Do not let the user extend a base chainy class
	if ( Object.isFrozen && Object.isFrozen(this) === true ) {
		throw new Error(
			'You have tried to extend a chainy class that has been frozen.\n' +
			'This is usually to avoid polluting a base chainy class.\n' +
			'Instead call `.subclass()` before your extensions are added.\n' +
			"E.g. `require('chainy').require('set')` becomes `require('chainy').subclass().require('set')`"
		)
	}

	// Support the different argument formats
	var extension = {}
	var args = Array.prototype.slice.call(arguments)
	var argParser = null
	args.forEach(argParser = function (arg, index) {
		// Name or type
		if ( typeof arg === 'string' ) {
			if ( index === 0 ) {
				extension.name = arg
			}
			else {
				extension.type = arg
			}

		// Method
		}
		else if ( typeof arg === 'function' ) {
			extension.method = arg
			// Support simpler API
			if ( arg.extensionType != null )  extension.type = arg.extensionType
			if ( arg.extensionOptions != null )  argParser(arg.extensionOptions, index)

		// Aliases
		}
		else if ( Array.isArray(arg) ) {
			extension.aliases = arg

		// Options
		}
		else if ( typeof arg === 'object' ) {
			Object.keys(arg).forEach(function (key) {
				var value = arg[key]
				extension[key] = value
			})
		}
	})

	// Check the extension type is valid
	if ( ['action', 'utility', 'custom'].indexOf(extension.type) === -1 ) {
		throw new Error('Unknown extension type for extension: ' + extension.name)
	}

	// Check that there are no special characters in the name
	if ( me.getValidExtensionName(extension.name) !== extension.name ) {
		throw me.getInvalidExtensionNameError(extension.name)
	}

	// Check if we already have this extension
	// If we have it, and we are different, continue
	// If we have it, and it is the same, break
	var oldExtension = this.getExtension(extension.name)
	if ( (oldExtension || {}).method === extension.method ) {
		return this
	}

	// Filter out any aliases that are not equivalant to the name
	if ( extension.aliases == null )  extension.aliases = []
	else if ( !Array.isArray(extension.aliases) )  extension.aliases = [extension.aliases]
	extension.aliases.filter(function (alias) {
		var aliasName = me.getValidExtensionName(alias)
		if ( aliasName === extension.name ) {
			return true
		}
		else {
			throw me.getInvalidExtensionAliasError(alias, extension.name)
			// return false
		}
	})

	// Set where this extension should apply
	// valid options are: instance, class, prototype
	if ( extension.applyTo == null )  extension.applyTo = ['instance']
	else if ( !Array.isArray(extension.applyTo) )  extension.applyTo = [extension.applyTo]

	// Default some properties
	if ( extension.taskOptions == null ) {
		if ( extension.actionOptions != null ) {  // b/c compat
			extension.taskOptions = extension.actionOptions
			delete extension.actionOptions
		}
		else {
			extension.taskOptions = {}
		}
	}

	// Does this extension apply to us?
	var applies = false
	extension.applyTo.forEach(function (applyTo) {
		switch (applyTo) {
			case 'instance':
				if ( isChainyInstance )  applies = true
				return false

			case 'class':
			case 'prototype':
				if ( isChainyClass )  applies = true
				return false
		}
	})

	if ( applies ) {
		// Check we're not doing something silly
		if ( this[extension.name] && !oldExtension ) {
			var err = new Error('The extension "' + extension.name + '" would overwrite a standard method and would cause unexpected results.')
			throw err
		}

		// Inject the extension
		switch ( extension.type ) {
			// We inject it
			case 'action':
			case 'utility':
				if ( !extension.mixinMethod ) {
					switch ( extension.type ) {
						case 'action':
							extension.mixinMethod = extension.mixinMethod || function () {
								var taskOptions = {}
								taskOptions.args = extension.taskOptions.args || [Chainy.injectChainDataAsArgument].concat(
									Array.prototype.slice.call(arguments)
								)
								return this.action(extension.name, taskOptions)
							}
							break

						case 'utility':
							extension.mixinMethod = extension.method
							break
					}
				}

				this.mixin(extension.name, extension.mixinMethod, extension)
				extension.aliases.forEach(function (alias) {
					me.mixin(alias, extension.mixinMethod, extension)
				})
				break

			// It injects itself
			case 'custom':
				extension.method(this)
				break
		}
	}

	// Add the extension
	this.extensions[extension.name] = extension

	// Chain
	return this
}

// Internal: Helper to require a plugin
// Here to allow chainy extensions to extend it
// Internal status as we are still deciding the functionality for this, it may break in minor revisions
//
// pluginName - The {String} name of the plugin we want to require, e.g. `glob`
//
// Returns the required result of the required package
// TODO: Update this to handle generic packages too
Chainy.requirePlugin = Chainy.prototype.requirePlugin = function (pluginName) {
	var result = null

	try {
		// use our parent module paths in the require search
		// this is necessary as chainy does the require inside chainy
		// rather than inside the parent module
		// so the require paths will be of chainy, rather than the parent module
		var paths = module.paths
		module.paths = module.parent.paths
		result = require('chainy-plugin-' + pluginName)
		module.paths = paths
	}
	catch (err) {
		throw this.getRequirePluginError(pluginName, err)
	}

	return result
}

// Internal: Generate an error for requiring a plugin
// Internal status as we are still deciding the functionality for this, it may break in minor revisions
//
// pluginName - The {String} name of the plugin we want to display a require error for, e.g. `glob`
//
// Returns the {Error} instance
Chainy.getRequirePluginError = Chainy.prototype.getRequirePluginError = function (pluginName, actualError) {
	var message =
		'Failed to require the plugin: ' + pluginName + '\n' +
		'You may need to manually install it using: chainy install ' + pluginName

	if ( actualError ) {
		message += '\n' +
			'Paths that we scanned are:\n' + util.inspect(module.parent.paths, null, '  ') + '\n' +
			'The original error was:\n' + actualError.stack + '\n'
	}

	var humanError = new Error(message)
	return humanError
}

// Internal: Get Valid Extension Name
// TODO: update this so that it created a valid extension name and alias for us
// e.g. lodash.filter => lodashFilter, filter, lodashfilter
// e.g. john-smith => johnSmith, johnsmith
// e.g. JSONStream => JSONStream, jsonstream
Chainy.getValidExtensionName = Chainy.prototype.getValidExtensionName = function (name) {
	return name.toLowerCase().replace(/[^a-z]/g, '')
}

// Internal: Get Valid Extension Name Error
Chainy.getInvalidExtensionNameError = Chainy.prototype.getInvalidExtensionNameError = function (name) {
	var err = new Error(
		'The extension name ' + name + ' is invalid: names may only contain lowercase letters\n' +
		'You may however use the aliases array option to add aliases for the extension name that can be more complicated.'
	)
	return err
}

// Internal: Get Valid Extension Alias Error
Chainy.getInvalidExtensionAliasError = Chainy.prototype.getInvalidExtensionAliasError = function (alias, name) {
	var err = new Error(
		'The extension alias ' + alias + ' is invalid: aliases when stripped of non-alpha characters and lowercased must be equivalant to the extension\'s name: ' + name
	)
	return err
}

// Public: Helper to require plugins into our chain instance or prototype
//
// Supports a few different signatures
// - (plugins), where plugins is a {String} of plugin names (space seperated)
// - (plugins), where plugins is an {Array} of plugin names
// - (arguments), where each argument is a plugin name
Chainy.require = Chainy.prototype.require = function () {
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
	plugins.forEach(function (pluginName) {
		var plugin = null

		// Check that there are no special characters in the name
		if ( me.getValidExtensionName(pluginName) !== pluginName ) {
			var err = me.getInvalidExtensionNameError(pluginName)
			throw err
		}

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
