<img src="https://github.com/little-core-labs/tiny-module-compiler/blob/master/assets/cover.png" alt="tiny module compiler" />

**_Compile, archive, unpack, and load compiled modules leveraging v8 cached data._**

<a name="toc"></a>
## Table of Contents

* [**Status**](#status)
* [**Installation**](#installation)
* [**Abstract**](#abstract)
* [**Basic Usage**](#usage)
* [**API**](#api)
  * [`compile(target[, options], callback)`](#api-compile)
  * [`archive(target, objects[, options], callback)`](#api-archive)
  * [`load(target[, options], callback)`](#api-load)
  * [`unpack(target[, options], callback)`](#api-unpack)
  * [Class: `Compiler`](#api-class-compiler)
    * [Constructor: `new Compiler([options])`](#api-class-compiler-constructor)
    * [Accessor: `compiler.targets`](#api-class-compiler-targets)
    * [`compiler.ready(callback)`](#api-class-compiler-ready)
    * [`compiler.target(filename[, options], callback)`](#api-class-compiler-target)
    * [`compiler.compile([options], callback)`](#api-class-compiler-target)
  * [Class: `Archiver`](#api-class-archiver)
    * [Constructor: `new Archiver([options])`](#api-class-archiver-constructor)
    * [`archiver.ready(callback)`](#api-class-archiver-ready)
    * [`archiver.archive(filename, objects[, options], callback)`](#api-class-archiver-archive)
  * [Class: `Loader`](#api-class-loader)
    * [Constructor: `new Loader([options])`](#api-class-loader-constructor)
    * [`loader.ready(callback)`](#api-class-loader-ready)
    * [`loader.load(filename[, options], callback)`](#api-class-loader-load)
  * [Class: `Target`](#api-class-target)
    * [Constructor: `new Target(filename[, options])`](#api-class-target-constructor)
    * [Accessor: `target.fd`](#api-class-target-fd)
    * [`target.stat(callback)`](#api-class-target-stat)
    * [`target.read(offset, size, callback)`](#api-class-target-read)
    * [`target.ready(callback)`](#api-class-target-ready)
* [**Command Line Interface**](#cli)
  * [**The `tmc(1)` Command**](#cli-tmc)
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
v8 cache data format exposed by the [`vm`](https://nodejs.org/api/vm.html)
API. Compiled module objects can be archived into a single file based on the
[TinyBox][tinybox] file format and then unpacked later to the file
system.

This toolkit allows for the compilation of an entire project into a single
compiled binary object file. Multiple binary object files and various
assets (`*.node`, `*.so`, etc) can be packaged into an archive and
unpacked to file system for later use making it suitable as a delivery
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
### `compile(target[, options], callback)`

Compiles a file specified at `target`. The default behavior is to write
the output to a file of the same name as `target` with `.out` appended
to the end. This behaviour can be configured by specifying an
`options.output` option or `options.storage` as a custom
[random-access-storage][ras] _factory function_.

The value of `options` is optional and can be:

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
### `archive(target, inputs[, options], callback)`

Archives the entries found in a given `inputs` `Map` into `target`. The
default behaviour is to enumerate the entries in `inputs` and write them
to a [TinyBox][tinybox] instance specified at `target` where the keys
and values of the entries are "put" into the TinyBox storage that lives
on the file system. This behaviour can be configured by specifying
`options.storage` as a custom [random-access-storage][ras] _instance_.

The value of `options` is optional and can be:

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
### `load(target[, options], callback)`

Loads the exports from a module or the entries in archive specified at
`target`. The default behaviour is to load the contents of the file
specified at `target` as a compiled module and call `callback(err,
exports)` upon success or error with the module exports. If `target` is
a path to an archive represented by a [TinyBox][tinybox], then the
entries are loaded and `callback(err, archive)` is called upon success
or error. The storage of the compiled module or archive can be
explicitly set by specifying `options.storage` as a custom
[random-access-storage][ras] _instance_.

The value of `options` is optional and can be:

```js
{
  // custom 'random-access-storage' compliant object
  storage: require('random-access-file')(target),

  // custom cache `Map` store for loaded modules
  cache: new Map(),

  // current working directory to load module in
  cwd: process.cwd()
}
```

#### Example

##### Simple Compile and Load

A simple compilation and load example that compiles a target input file to an
output file and then loads the exports.

***file.js:***

```js
module.exports = {
  hello() {
    return 'world'
  }
}
```

***compile-and-load.js:***

```js
const { compile, load } = require('tiny-module-compiler')

// compile this file
const target = 'file.js'
const output = target + '.out'
compile(target, { output }, (err) => {
  // `target` compiled to `output`
  load(output, (err, exports) => {
    // `exports` points to `module.exports` in `output`
    console.log(exports.hello()) // 'world'
  })
})
```

##### Simple Compile and Load in Memory

A simple compilation and load example that compiles a target input file to an
in memory storage and then loads the exports from it.

***file.js:***

```js
module.exports = {
  hello() {
    return 'world'
  }
}
```

***compile-and-load-in-memory.js:***

```js
const { compile, load } = require('tiny-module-compiler')
const ram = require('random-access-memory')

// compile this file
const target = 'file.js'
const storage = ram()
compile(target, { storage: () => storage }, (err) => {
  // `target` compiled to `storage`
  load('loaded from memory', { storage }, (err, exports) => {
    // `exports` points to `module.exports` in `output`
    console.log(exports.hello()) // 'world'
  })
})
```

<a name="api-unpack"></a>
### `unpack(target[, options], callback)`

Unpacks `target` archive entries. The default behaviour is to enumerate
the entries in the archive specified at `target` and copy them to the
file system. This behaviour can be configured by specifying a `options.storage`
[random-access-storage][ras] _factory function_ to provide custom
storage for the archive entries. If `target` is a [random-access-storage][ras]
instance, it will be used instead of reading from the file system.

The value of `options` is optional and can be:

```js
{
  // output path for default storage
  output: process.cwd(),

  // custom storage factory function to return
  // 'random-access-storage' compliant object
  storage(filename) {
    return require('random-access-file')(filename)
  }
}
```

#### Example

##### Simple Unpack

A simple example to unpack an archive's entries to file system.

```js
const { unpack } = require('tiny-module-compiler')

const archive = '/path/to/archive'
unpack(archive, (err, entries) => {
  // `archive` entries unpacked to file system
  console.log(entries) // array of unpacked file names
})
```

##### Simple Unpack in Memory

A simple example to unpack an archive's entries to an in memory file
store.

```js
const { unpack } = require('tiny-module-compiler')
const ram = require('random-access-memory'

const archive = '/path/to/archive'
const files = new Map()

unpack(archive, { storage: createStorage }, (err, entries) => {
  // `archive` entries unpacked to file system
  console.log(entries) // array of unpacked file names
  for (const entry of entries) {
    console.log(files[entry.filename])
  }
})

function createStorage(filename) {
  return files.set(filename, ram()).get(filename)
}
```

<a name="api-class-compiler"></a>
### Class: `Compiler`

* Extends: [`nanoresource-pool`][nanoresource-pool]

The `Compiler` class represents a container of compile targets
that can be compiled into a single binary file containing
v8 cache data and header information about the compiled output.

<a name="api-class-compiler-constructor"></a>
#### Constructor: `new Compiler([options])`

Creates a new [`Compiler`](#api-class-compiler) instance where `options`
can be:

```js
{
  // current working directory for compilation
  cwd: process.cwd()
}
```

##### Example

```js
const compiler = new Compiler()
```

<a name="api-class-compiler-targets"></a>
#### Accessor: `compiler.targets`

* `Array<String>`

All opened targets in the compiler.

##### Example

```js
for (const target of compiler.targets) {
  // handle opened `target`
}
```

<a name="api-class-compiler-ready"></a>
#### `compiler.ready(callback)`

Waits for compiler to be ready and calls `callback()` upon success.

##### Example

```js
compiler.ready(() => {
  // `compiler` is opened and ready
})
```

<a name="api-class-compiler-target"></a>
#### `compiler.target(filename[, options], callback)`

Creates and returns a new compile [target](#api-class-target) that is added
to compiler pool calling `callback(err, target)` when the target resource
is opened or an error occurs. The target will be compiled when
[`compiler.compiler()`](#api-class-compiler-compile) is called.

The value of `options` can be:

```js
{
  // the default output for a compilation target
  output: target + '.out',

  // custom storage factory function to return
  // 'random-access-storage' compliant object
  storage(filename) {
    return require('random-access-file')(filename)
  }
}
```

##### Example

```js
compiler.target('/path/to/file.js', (err, target) => {
  // `target` is an opened `nanoresource`
})
```

<a name="api-class-compiler-compile"></a>
#### `compiler.compile([options], callback)`

Compiles all pending compile [targets](#api-class-compiler-target) calling
`callback(err, objects, assets)` upon success or error. Callback will be
given a `Map` of compiled objects and a `Map` of extracted assets that
should live with the compiled objects on the file system.

The value of `options` can be:

```js
{
  // if `true`, will produce a source map stored in the `assets` map
  map: false,

  // if `false`, `ncc` will produce verbose output
  quiet: true,

  // if `true`, will use `ncc` cache for faster builds
  cache: false,

  // if `true`, will produce compiled javascript source debug output
  debug: false,

  // if `true`, will minify compiled javascript source before creating binary
  optimize: false,

  // an array of external modules that should _not_ be compiled
  externals: [],
}
```

##### Example

```js
compiler.compile({ externals: ['sodium-native'] }, (err, objects, assets) => {
  // `objects` is a `Map` mapping file names to compiled module objects
  // `assets` is a `Map` mapping file names to assets that should be copied
})
```

<a name="api-class-archiver"></a>
### Class: `Archiver`

* Extends: [`nanoresource`][nanoresource]

The `Archiver` class represents an abstraction for storing
compiled objects into a [TinyBox][tinybox]

<a name="api-class-archiver-constructor"></a>
#### Constructor: `new Archiver([options])`

Creates a new [`Archiver`](#api-class-archiver) instance where `options`
can be:

```js
{
  // default custom storage factory function to return
  // 'random-access-storage' compliant object used in
  // `archiver.archive()` calls. This storage can be overloaded
  // by supplying a storage factory function to `archiver.archive()`
  storage(filename) {
    return require('random-access-file')(filename)
  }
}
```

##### Example

```js
const ram = require('random-access-memory')

// in memory archiver
const archiver = new Archiver({ storage: ram })
```

<a name="api-class-archiver-ready"></a>
#### `archiver.ready(callback)`

Waits for archiver to be ready and calling `callback()` when it is.

##### Example

```js
archiver.ready(() => {
  // `archiver` is opened and ready
})
```

<a name="api-class-archiver-archive"></a>
#### `archiver.archive(filename, inputs[, options], callback)`]

Archives the entries found in a given `inputs` `Map` into `target`. The
underlying storage for `filename` can be given by `options.storage` or a
new one is created by the `storage` factory function given to the
[`Archiver`](#api-class-archiver-constructor) class constructor.
`callback(err)` is called upon success or error.

The value of `options` can be:

```js
{
  // custom 'random-access-storage' compliant object
  // where `inputs` are archived to
  storage: require('random-access-file')(filename)
}
```

##### Example

```js
const extend = require('map-extend')

compiler.compile((err, objects, assets) => {
  // merge `objects` and `assets` and archive
  archiver.archive('/path/to/archive', extend(objects, assets), (err) => {
    // inputs should be archived
  })
```

<a name="api-class-loader"></a>
### Class: `Loader`

* Extends: [`nanoresource-pool`][nanoresource-pool]

The `Loader` class represents an abstraction for loading compiled
module objects and JavaScript sources as node modules.

<a name="api-class-loader-constructor"></a>
#### Constructor: `new Loader([options])`

Creates a new [`Loader`](#api-class-loader) instance where `options`
can be:

```js
{
  // custom cache `Map` store for loaded modules
  cache: new Map()
}
```

<a name="api-class-loader-ready"></a>
#### `loader.ready(callback)`

Waits for loader to be ready and calling `callback()` when it is.

##### Example

```js
loader.ready(() => {
  // `loader` is opened and ready
})
```

<a name="api-class-loader-load"></a>
#### `loader.load(filename[, options], callback)`

Loads a compiled module object or JavaScript source module
specified at filename calling `callback(err, exports)` upon success
or error. Success loads will cache resulting module for subsequent
requests to load the module.

The value of `options` can be:

```js
{
  // custom 'random-access-storage' compliant object
  // where module is loaded from
  storage: require('random-access-file')(filename)
}
```

##### Example

```js
loader.load('/path/to/compiled/module.js', (err, exports) => {
  // `exports` points to `module.exports` of loaded module
})
```

<a name="api-class-target"></a>
### Class: `Target`

* Extends: [`nanoresource`][nanoresource]

The `Target` class represents a [`nanoresource`][nanoresource] to a target
file backed by a [`random-access-storage`][ras] instance.

<a name="api-class-target-constructor"></a>
#### Constructor: `new Target(filename[, options])`

Creates a new [`Target`](#api-class-target) instance where `filename`
is the name of the target file and `options` can be:

```js
{
  // custom 'random-access-storage' compliant object
  // where file is loaded from
  storage: require('random-access-file')(filename)
}
```

***Note:*** _This class is intended for internal and advanced use. You
will most likely not use this directly._

##### Example

```js
const target = new Target('/path/to/file.js')
```

<a name="api-class-target-fd"></a>
#### Accessor: `target.fd`

* `?(Number)`

The active file descriptor for the target resource. Will be `null`
if not opened.

<a name="api-class-target-stat"></a>
#### `target.stat(callback)`

Queries for stats from the underlying target storage calling
`callback(err, stats)` upon success or error.

##### Example

```js
target.stat((err, stats) => {
  console.log(stats.size)
})
```

<a name="api-class-target-read"></a>
#### `target.read(offset, size, callback)`

Reads data from the underlying target storage at a specified `offset` and
`size` calling `callback(err, buffer)` upon success or error.

##### Example

```js
taret.read(32, 64, (err, buffer) => {
  console.log(buffer)
})
```

<a name="api-class-target-ready"></a>
#### `target.ready(callback)`

Waits for loader to be ready and calling `callback()` when it is.

##### Example

```js
target.ready(() => {
  // `target` is opened and ready
})
```

<a name="cli"></a>
### Command Line Interface

The `tiny-module-compiler` exposes a command line interface through the
`tmc` command that is suitable for compiling, archiving, and unpacking
compiled modules and their assets.

This section describes the command line interface and a few workflows
for making the best use of the `tmc` command.

<a name="cli-tmc"></a>
#### The `tmc(1)` Command

The `tmc` command has a command line signature of the following:

```sh
tmc [-hV] [-acu] [-vCDMO] [options] ...input
```

Where `options` can be:

```sh
  -a, --archive             If present, will archive input into "tinybox" format
  -c, --compile             If present, will compile input into header prefixed v8 cached data
  -C, --copy-assets         If present, will copy assets to directory of output (default: true)
  -D, --debug               If present, will enable debug output (DEBUG=tiny-module-compiler)
  -e, --external <module>   Specifies an external dependency that will be linked at runtime
  -h, --help                If present, will print this message
  -M, --source-map          If present, a source map will be generated
  -o, --output <path>       If present, will change the output path. Assumes directory if multiple inputs given
  -O, --optimize            If present, will optimize output by minifying JavaScript source prior to compilation
  -u, --unpack              If present, will treat input as an archive and will unpack files to path specified by '--output'
  -v, --verbose             If present, will emit verbose output to stdout/stderr
  -V, --version             If present, will print the version number
  -x                        An alias for '--external'
```

<a name="cli-compiling"></a>
#### Compiling Modules

The simplest use of the `tmc` command is to compile a single file. By
default, the `-c` (or `--compile`) is assumed if `-a` (or
`--archive`) and `-u` (or `--unpack`) flags are **not present**.

```sh
$ tmc file.js ## will write ./file.js.out
```

The output of the compiled file can be configured using the `-o` (or `--output`)
flag to set the output name.

```sh
$ tmc file.js -o file.compiled.js
```

If multiple inputs were given, then the output
value will be a directory and the original file names are preserved.

```sh
$ tmc *.js -o build/
```

<a name="cli-archiving-modules"></a>
#### Archiving Compiled Modules

After compiling modules it may be useful to archive them into a single
file. This is often beneficial if the compiled module contained static
assets that need to live on the file system alongside the compiled
module file during runtime.

The `tmc` command makes it easy to specify a number of files that
should be added to an archive by making use of the `-a` (or `--archive`)
flag to indicate that inputs should be archived.

```sh
$ tmc -a modules.archive *.compiled.js ## archives all `*.compiled.js` files into `modules.archive`
```

Any asset can be added to an archive as well.

```sh
$ tmc -a modules.archive *.node ## archives all `*.node` files into `modules.archive`
```

The `modules.archive` file contains an index of entries added to it by
file name. The archive can be [unpacked](#cli-unpacking) using the `tmc`
command as well.

<a name="cli-unpacking"></a>
#### Unpacking Archives

Compiled modules and their assets living in an archive can be easily
unpacked to the file system. The `tmc` command makes it easy to unpack
entries in an archive.

```sh
$ tmc -u modules.archive
```

The output of the entries can be specified with the `-o` (or `--output`)
flag.

```sh
$ tmc -u modules.archive -o build/
```

## See Also

- [nanoresource-pool][nanoresource-pool]
- [nanoresource][nanoresource]
- [tinybox][tinybox]
- [@zeit/ncc][ncc]
- [glob][glob]

## Prior Art

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
[nanoresource]: https://github.com/mafintosh/nanoresource
[nanoresource-pool]: https://github.com/little-core-labs/nanoresource-pool
