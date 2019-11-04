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
 * @TODO
 * @param {String} target
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
        batch.push((next) => compiler.target(pathspec, opts).open(next))
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
