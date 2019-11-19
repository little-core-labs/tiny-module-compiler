<img src="https://github.com/little-core-labs/tiny-module-compiler/blob/master/assets/cover.png" alt="tiny module compiler" />

**_Compile, archive, unpack, and load compiled modules leveraging v8 cached data._**

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
* [**Constraints**](#constraints)
  * [**v8 Version**](#constraints-v8-version)
  * [`Function.prototype.toString()`](#constraints-function-to-string)
* [**See Also**](#see-also)
* [**Prior Art**](#prior-art)
* [**License**](#license)

<a name="status"></a>
## Status

> **Stable/Documentation**

> [![Actions Status](https://github.com/little-core-labs/tiny-module-compiler/workflows/Node%20CI/badge.svg)](https://github.com/little-core-labs/tiny-module-compiler/actions)

<a name="installation"></a>
## Installation

```sh
$ npm install tiny-module-compiler
```

<a name="abstract"></a>
## Abstract

The `tiny-module-compiler` module is small toolkit for compiling
JavaScript CommonJs modules into standalone binaries that leverage that
v8 cache data format exposed by the [`vm`](https://nodejs.org/api/vm.html) API.
Compiled module objects can be archived into a single file based on the
[TinyBox][tinybox] file format and then unpacked later to disk.

This toolkit allows for the compilation of an entire project into a single
compiled binary object file. Multiple binary object files and various
assets (`*.node`, `*.so`, etc) can be packaged into an archive and
unpacked to disk for later use making it suitable as a delivery
mechanism.

Compiled modules objects can be loaded and executed but must be in a
runtime that uses the same [version of v8](#constraints-v8-version).

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

The `tiny-module-compiler` module exports a public API described in this
section.

<a name="api-compile"></a>
### `compile(target[, opts], callback)`

Compiles a file specified at `target`. The default behavior is to write
the output to a file of the same name as `target` with `.out` appended
to the end. This behaviour can be configured by specifying an
`opts.output` option or `opts.storage` as a custom
[random-access-storage][ras] _factory function_.

The value of `opts` is optional and can be:

```js
{
  // current working directory for compilation
  cwd: process.cwd(),

  // output filename (single file compilation) or directory (multiple files)
  output: target + '.out',

  // custom storage factory function to return
  // 'random-access-storage' compliant object
  storage(filename) {
    return require('random-access-file')(filename)
  }
}
```

#### Examples

##### Simple Compilation

A simple compilation example that compiles a target input file to an
output file.

```js
const { compile } = require('tiny-module-compiler')

// compile this file
const target = __filename
const output = __filename + '.out'
compile(target, { output }, (err) => {
  // `target` compiled to `output`
})
```

##### Simple Compilation to Memory

A simple compilation example that compiles a target input file to an in
memory `random-access-memory` storage.

```js
const { compile } = require('tiny-module-compiler')
const ram = require('random-access-memory')

// compile this file
const target = __filename
const storage = ram()
compile(target, { storage: () => storage }, (err) => {
  // `target` compiled and written to `storage`
})
```

<a name="api-archive"></a>
### `archive(target, inputs[, opts], callback)`

Archives the entries found in a given `inputs` `Map` into `target`. The
default behaviour is to enumerate the entries in `inputs` and write them
to a [TinyBox][tinybox] instance specified at `target` where the keys
and values of the entries are "put" into the TinyBox storage that lives
on disk. This behaviour can be configured by specifying `opts.storage`
as a custom [random-access-storage][ras] _instance_.

The value of `opts` is optional and can be:

```js
{
  // custom 'random-access-storage' compliant object
  storage: require('random-access-file')(target)
}
```

#### Examples

##### Simple Archive

A simple example that archives the compiled objects of a compiled file.

```js
const { compile, archive } = require('tiny-module-compiler')

// compile this file
const target = __filename

compile(target, (err, objects) => {
  archive(__filename + '.a', objects, (err) => {
    // `target` is compiled and then archived
  })
})
```

##### Simple Archive in Memory

A simple example that archives the compiled objects of a compiled file
into an in memory `random-access-memory` storage.

```js
const { compile, archive } = require('tiny-module-compiler')
const ram = require('random-access-memory')

// compile this file
const target = __filename
compile(target, { storage: ram }, (err) => {
  const storage = ram()
  archive(__filename + '.a', objects, { storage}, (err) => {
    // `target` is compiled and then archived
    // `storage` contains archived objects
  })
})
```

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
- https://github.com/v8/v8/blob/master/src/snapshot/code-serializer.h
- https://hackernoon.com/how-to-compile-node-js-code-using-bytenode-11dcba856fa9

## License

MIT


[ras]: https://github.com/random-access-storage/random-access-storage
[ncc]: https://github.com/zeit/ncc
[glob]: https://github.com/isaacs/node-glob
[tinybox]: https://github.com/hyperdivision/tinybox
