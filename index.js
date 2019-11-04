const { Archiver } = require('./archiver')
const { Compiler } = require('./compiler')
const { Loader } = require('./loader')
const assert = require('nanoassert')
const Batch = require('batch')
const multi = require('multi-random-access')
const path = require('path')
const glob = require('glob')
const fs = require('fs')

// quick util
const noop = () => void 0

/**
 * @TODO
 * @param {String} target
 * @param {Array|Map} objects
 * @param {?(Object)} opts
 * @param {Function} callback
*/
function archive(target, objects, opts, callback) {
  if ('function' === typeof opts) {
    callback = opts
    opts = {}
  }

  if (!opts || 'object' !== typeof opts) {
    opts = {}
  }

  const archiver = new Archiver(opts)
  archiver.archive(target, objects, callback)
}

/**
 * Compile a target or targets into a self contained compiled
 * module object. Input can be an array or a string. String inputs be use
 * `glob` syntax to target several files based on a pattern. Code is compiled
 * with `ncc` and stored on disk in v8 cache binary format with header
 * metadata. This function will call `callback(err, objects)` upon success
 * or error. Compiled module objects are made aware to the caller by a
 * `Map` instance given in the `callback` * function.
 * @param {String|Array} target
 * @param {?(Object)} opts
 * @param {Function} callback
 * @return {Compiler}
 */
function compile(target, opts, callback) {
  if ('function' === typeof opts) {
    callback = opts
    opts = {}
  }

  if (!opts || 'object' !== typeof opts) {
    opts = {}
  }

  opts = Object.assign({ cwd: process.cwd() }, opts) // copy

  assert('function' === typeof callback, 'Callback must be a function.')

  const compiler = new Compiler(opts)

  compiler.ready(onready)

  return compiler

  function onready(err) {
    if (err) { return callback(err) }
    if (Array.isArray(target)) {
      onfiles(null, target)
    } else {
      glob(target, opts, onfiles)
    }
  }

  function onfiles(err, files) {
    if (err) { return callback(err) }
    if (!files || 0 === files.length) {
      return callback(new Error('Target does not exist.'))
    }

    const batch = new Batch()

    for (const file of files) {
      try {
        const pathspec = require.resolve(path.resolve(opts.cwd, file))
        const copts = Object.assign({}, opts)
        if (copts.output && files.length > 1) {
          copts.output = path.join(copts.output, path.basename(pathspec))
        }
        batch.push((next) => compiler.target(pathspec, copts).open(next))
      } catch (err) {
        return callback(err)
      }
    }

    batch.end((err) => {
      if (err) { return callback(err) }
      compiler.compile(opts, callback)
    })
  }
}

/**
 * @TODO
 * @param {String} target
 * @param {?(Object)} opts
 * @param {Function} callback
 * @return {Target}
 */
function load(target, opts, callback) {
  if ('function' === typeof opts) {
    callback = opts
    opts = {}
  }

  if (!opts || 'object' !== typeof opts) {
    opts = {}
  }

  opts = Object.assign({ cwd: process.cwd() }, opts) // copy

  assert('function' === typeof callback, 'Callback must be a function.')

  const loader = new Loader(opts)
  return loader.load(target, callback)
}

/**
 * Module exports.
 */
module.exports = {
  archive,
  compile,
  load,
}
