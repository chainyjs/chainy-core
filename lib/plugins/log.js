/**
Log Plugin
Logs the current data of the chain to stdout

``` javascript
Chainy.create()
	.set("some data").log()  // "some data"
```
*/
module.exports = function(){
	console.log(this.data)
}