const { Compiler } = require('./compiler')
const assert = require('nanoassert')
const Batch = require('batch')
const path = require('path')
const glob = require('glob')

/**
 * Compiles the glob result of `target`
 * @param {String|Array} target
 * @param {?(Object)} opts
 * @param {?(String)} opts.cwd
 * @param {?(String)} opts.output
 * @param {?(Object)} opts.storage
 * @param {?(Boolean)} opts.autoOpen
 * @param {Function} callback
 * @return {Compiler}
 */
function compile(target, opts, callback) {
  if ('function' === typeof opts) {
    callback = opts
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
    // istanbul ignore next
    if (err) { return callback(err) }
    if (Array.isArray(target)) {
      onfiles(null, target)
    } else {
      try {
        glob(target, opts, onfiles)
      } catch (err) {
        return callback(err)
      }
    }
  }

  function onfiles(err, files) {
    // istanbul ignore next
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
        } else if (opts.storage && !copts.output) {
          copts.output = pathspec
        }
        batch.push((next) => compiler.target(pathspec, copts).open(next))
      } catch (err) {
        // istanbul ignore next
        return callback(err)
      }
    }

    batch.end((err) => {
      // istanbul ignore next
      if (err) { return callback(err) }
      compiler.compile(opts, callback)
    })
  }
}

/**
 * Module exports.
 */
module.exports = {
  compile
}
