# History

## v1.2.0 June 25, 2014
- Added `klass` and `parent` options to `Chainy.create(opts)`
	- Useful for creating standalone action plugins that have sub chains:

		``` javascript
		this.create() // ...
		// becomes
		require('chainy-core').create({parent:this}) // ...
		```

- Added `Chainy.isChainyInstance(chain)` method

## v1.1.0 June 23, 2014
- Added tomdoc inline documentation, indicating what is internal and public methods, properties, and options
- Changed some of the internal functionality
- Plugins can now also do `module.exports.extension = {method, type, ...}`, which is useful for existing modules that want to become chainy extensions, or similar situations where the top level export is not a chainy plugin method
- Plugins can now also do `module.exports.extensionOptions = {}`, which is useful when the top level export is a chainy plugin, but you also want to customise other options of it than just the `extensionType`
- Fixed mixin helper

## v1.0.0 June 21, 2014
- API is now mature for public use, enjoy!

## v0.4.0 May 21, 2014
- Utilities are now also added to directly to classes, instead of just their prototypes
- Support the first argument being a space separated string list of plugins
- Only allow lowercase letters in plugin names

## v0.1.0 May 8, 2014
- Initial working release
