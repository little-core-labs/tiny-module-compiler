tiny-module-compiler
====================

> Compile, archive, and load compiled modules leveraging v8 cached data.

<a name="installation"></a>
## Installation

```sh
$ npm install tiny-module-compiler
```

<a name="status"></a>
## Status

> **Development/Testing/Documentation**

> [![Actions Status](https://github.com/little-core-labs/tiny-module-compiler/workflows/Node%20CI/badge.svg)](https://github.com/little-core-labs/tiny-module-compiler/actions)

## Supported Node Version

Currently `node10` has full support from this module. `node12` is known
to have some issues when loading compiled modules.

<a name="usage"></a>
## Usage

```js
const tmc = require('tiny-module-compiler')

// compile modules into compiled module objects
tmc.compile('*.js', (err, objects) => {
  // archive objects into flat file
  tmc.archive('module.a', objects, (err) => {
    tmc.load('module.a', (err, archive) => {
      // `archive` contains a mapping of compiled module object
      // filenames to loaded exports
    })
  })
})
```

### Command Line

```sh
$ tmc -c *.js -o build/ -x sodium-native --debug --source-map
$ tmc -a build/module.a build/*.js
```

```js
const tmc = require('tiny-module-compiler')

tmc.load('build/module.a', (err, archive) => {
  // `archive` is an object that maps a compiled module filename
  // to its module's exports
  console.log(archive)
})
```

## API

### `archive(target, objects[, opts], callback)`

> TODO

### `compile(target[, opts], callback)`

Compile a target or targets into a self contained compiled
module object. Input can be an array or a string. String inputs be use
[`glob`][glob] syntax to target several files based on a pattern. Code
is compiled with [`ncc`][ncc] and stored on disk in
[v8 cache binary](https://nodejs.org/api/vm.html#vm_script_createcacheddata)
format with header metadata. This function will call `callback(err, objects)`
upon success or error. Compiled module objects are made aware to the caller
by a `Map` instance given in the `callback` * function.

```js
compile('{left,right}.js', (err, objects) => {
  console.log(objects.get('left.js.out')) // Buffer
  console.log(objects.get('right.js.out')) // Buffer
})
```

### `load(target[, opts], callback)`

> TODO

### Compiled Module Format

> TODO

### Compiled Module Archive

> TODO

## See Also

- [tinybox][tinybox]
- [@zeit/ncc][ncc]
- [glob][glob]

## Prior Art

- https://github.com/zeit/ncc
- https://github.com/OsamaAbbas/bytenode
- https://github.com/zertosh/v8-compile-cache

## License

MIT


[ncc]: https://github.com/zeit/ncc
[glob]: https://github.com/isaacs/node-glob
[tinybox]: https://github.com/hyperdivision/tinybox
