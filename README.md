<img src="https://github.com/little-core-labs/tiny-module-compiler/blob/master/assets/cover.png" alt="tiny module compiler" />

**_Compile, archive, and load compiled modules leveraging v8 cached data._**

<a name="toc"></a>
## Table of Contents

* [**Status**](#status)
* [**Installation**](#installation)
* [**Abstract**](#abstract)
* [**Basic Usage**](#usage)
* [**API**](#api)
  * [`compile(target[, opts], callback)`](#api-compile)
  * [`archive(target, objects[, opts], callback)`](#api-archive)
  * [`load(target[, opts], callback)`](#api-load)
  * [`unpack(target[, opts], callback)`](#api-unpack)
  * [Class: `Compiler`](#api-class-compiler)
    * [Constructor: `new Compiler([opts])`](#api-class-compiler-constructor)
    * [Accessor: `compiler.targets`](#api-class-compiler-targets)
    * [`compiler.ready(callback)`](#api-class-compiler-ready)
    * [`compiler.target(filename[, opts], callback)`](#api-class-compiler-target)
    * [`compiler.compile([opts], callback)`](#api-class-compiler-target)
  * [Class: `Archiver`](#api-class-archiver)
    * [Constructor: `new Archiver([opts])`](#api-class-archiver-constructor)
    * [`archiver.ready(callback)`](#api-class-archiver-ready)
    * [`archiver.archive(filename, objects[, opts], callback)`](#api-class-archiver-archive)
  * [Class: `Loader`](#api-class-loader)
    * [Constructor: `new Loader([opts])`](#api-class-loader-constructor)
    * [`loader.ready(callback)`](#api-class-loader-ready)
    * [`loader.load(filename[, opts], callback)`](#api-class-loader-load)
  * [Class: `Target`](#api-class-target)
    * [Constructor: `new Target(filename[, opts])`](#api-class-target-constructor)
    * [Accessor: `target.fd`](#api-class-target-fd)
    * [`target.stat(callback)`](#api-class-target-stat)
    * [`target.read(offset, size, callback)`](#api-class-target-read)
    * [`target.ready(callback)`](#api-class-target-ready)
* [**Command Line Interface**](#cli)
  * [**The `tmc` Command**](#cli-tmc)
  * [**Compiling Modules**](#cli-compiling)
  * [**Archiving Compiled Modules**](#cli-archiving-modules)
  * [**Copying Relocated Assets**](#cli-copying-assets)
  * [**Archiving Relocated Assets**](#cli-archiving-assets)
  * [**Unpacking Archives**](#cli-unpacking)
* [**See Also**](#see-also)
* [**Prior Art**](#prior-art)
* [**License**](#license)

<a name="status"></a>
## Status

> **Development/Testing/Documentation**

> [![Actions Status](https://github.com/little-core-labs/tiny-module-compiler/workflows/Node%20CI/badge.svg)](https://github.com/little-core-labs/tiny-module-compiler/actions)

<a name="installation"></a>
## Installation

```sh
$ npm install tiny-module-compiler
```

<a name="abstract"></a>
## Abstract

> TODO

<a name="usage"></a>
## Basic Usage

```js
const tmc = require('tiny-module-compiler')

const targets = '*.js'
const archiveName = 'modules.a'

// compile module targets into compiled module objects
tmc.compile(targets, (err, objects) => {
  // archive objects into file specified by `archiveName`
  tmc.archive(archiveName, objects, (err) => {
    tmc.load(archiveName, (err, archive) => {
      // `archive` contains a mapping of compiled module object
      // filenames to loaded exports
    })
  })
})
```

## API

> TODO

<a name="api-compile"></a>
### `compile(target[, opts], callback)`

> TODO

<a name="api-archive"></a>
### `archive(target, objects[, opts], callback)`

> TODO

<a name="api-load"></a>
### `load(target[, opts], callback)`

> TODO

<a name="api-unpack"></a>
### `unpack(target[, opts], callback)`

> TODO

<a name="api-class-compiler"></a>
### Class: `Compiler`

> TODO

<a name="api-class-compiler-constructor"></a>
#### Constructor: `new Compiler([opts])`

> TODO

<a name="api-class-compiler-targets"></a>
#### Accessor: `compiler.targets`

> TODO

<a name="api-class-compiler-ready"></a>
#### `compiler.ready(callback)`

> TODO

<a name="api-class-compiler-target"></a>
#### `compiler.target(filename[, opts], callback)`

> TODO

<a name="api-class-compiler-compile"></a>
#### `compiler.compile([opts], callback)`

> TODO

<a name="api-class-archiver"></a>
### Class: `Archiver`

> TODO

<a name="api-class-archiver-constructor"></a>
#### Constructor: `new Archiver([opts])`

> TODO

<a name="api-class-archiver-ready"></a>
#### `archiver.ready(callback)`

> TODO

<a name="api-class-archiver-archive"></a>
#### `archiver.archive(filename, objects[, opts], callback)`]

> TODO

<a name="api-class-loader"></a>
### Class: `Loader`

> TODO

<a name="api-class-loader-constructor"></a>
#### Constructor: `new Loader([opts])`

> TODO

<a name="api-class-loader-ready"></a>
#### `loader.ready(callback)`

> TODO

<a name="api-class-loader-load"></a>
#### `loader.load(filename[, opts], callback)`

> TODO

<a name="api-class-target"></a>
### Class: `Target`

> TODO

<a name="api-class-target-constructor"></a>
#### Constructor: `new Target(filename[, opts])`

> TODO

<a name="api-class-target-fd"></a>
#### Accessor: `target.fd`

> TODO

<a name="api-class-target-stat"></a>
#### `target.stat(callback)`

> TODO

<a name="api-class-target-read"></a>
#### `target.read(offset, size, callback)`

> TODO

<a name="api-class-target-ready"></a>
#### `target.ready(callback)`

> TODO

<a name="cli"></a>
### Command Line Interface

> TODO

<a name="cli-tmc"></a>
#### The `tmc` Command

> TODO

<a name="cli-compiling"></a>
#### Compiling Modules

> TODO

<a name="cli-archiving-modules"></a>
#### Archiving Compiled Modules

> TODO

<a name="cli-copying-assets"></a>
#### Copying Relocated Assets

> TODO

<a name="cli-archiving-assets"></a>
#### Archiving Relocated Assets

> TODO

<a name="cli-unpacking"></a>
#### Unpacking Archives

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
