# History

## v1.5.1 2016 June 4
- Updated internal conventions
- Updated dependencies

## v1.5.0 2014 August 3
- `chain.action(method, taskOptions)` can now receive an extension name as the method, allowing you to change the behaviour of an existing extension by configuring the options for its execution
- Removed the internal `prependResultToArguments` task option, and added the public `args` task option. Use `Chainy.injectChainDataAsArgument` and `Chainy.injectExpandedChainDataAsArguments` as special argument items that do what their names suggest.
- Updated dependencies

## v1.4.0 2014 July 28
- A few changes about how extension inheritance works to make it simpler and more robust
	- Extensions are now explicitly added to each child class and child instance (instead of implicitly inherited from the prototype tree)
	- Extensions are now only instantiated by default on child instances, instead of both child instances and child classes as before
	- Extensions are no longer added to the prototype of a child class by default
	- Where extensions are added can be changed by setting the `applyTo` extension option to include where you would like the extension to apply to, valid options are `['instance', 'class', 'prototype']`, default option is `['instance']`
- Class and instance trees are now more robust (especially class trees)
- `mixin` method now supports `options` argument that accepts the `applyTo` property, defaults to `['instance', 'class', 'prototype']` to maintain backwards compatible behaviour
- Now throws an error when a class prototype method is being overwritten by an extension
	- If you desire to overwrite a class prototype method, then use the `custom` extension type, and perform the overwrite manually by using the `mixin` method (see the `autoinstall` plugin for an example of this)
- Now works when `chainy-core` is npm linked
 	- This is done by now using the parent module's lookup paths, instead of the chainy module's lookup paths
- Failed requires now provides more information about why the require could have failed
- Notes
	- Use `var chain = Chainy.create()` instead of `var chain = new Chainy()`
	- Use `Chainy.subclass(...)` instead of `class MyChainy extends Chainy`
	- This is because the `create` and `subclass` methods perform some operations to maintain the tree (required for extension inheritance) that cannot be replicated via the native counterparts. If this is an issue for you, then let us know via the GitHub Issue tracker.

## v1.3.2 2014 July 28
- Support use case where `aliases` option is a string instead of an array

## v1.3.1 2014 June 27
- Fixed `method.extensionOptions` parsing (never actually worked)

## v1.3.0 2014 June 27
- Added support for the extension option: `aliases`
- Fixed undefined action results over-writing chain data, undefined action results are discarded

## v1.2.0 2014 June 25
- Added `klass` and `parent` options to `Chainy.create(opts)`
	- Useful for creating standalone action plugins that have sub chains:

		``` javascript
		this.create() // ...
		// becomes
		require('chainy-core').create({parent:this}) // ...
		```

- Added `Chainy.isChainyInstance(chain)` method

## v1.1.0 2014 June 23
- Added tomdoc inline documentation, indicating what is internal and public methods, properties, and options
- Changed some of the internal functionality
- Plugins can now also do `module.exports.extension = {method, type, ...}`, which is useful for existing modules that want to become chainy extensions, or similar situations where the top level export is not a chainy plugin method
- Plugins can now also do `module.exports.extensionOptions = {}`, which is useful when the top level export is a chainy plugin, but you also want to customise other options of it than just the `extensionType`
- Fixed mixin helper

## v1.0.0 2014 June 21
- API is now mature for public use, enjoy!

## v0.4.0 2014 May 21
- Utilities are now also added to directly to classes, instead of just their prototypes
- Support the first argument being a space separated string list of plugins
- Only allow lowercase letters in plugin names

## v0.1.0 2014 May 8
- Initial working release
