const { Loader } = require('./loader')
const assert = require('nanoassert')

/**
 * Load module specified at `target` calling `callback(null, exports)` if the
 * target is a node module, `callback(null, archive)` if the target is an
 * archive, or `callback(err)` if an error occurs.
 * @param {String} target
 * @param {?(Object)} opts
 * @param {?(Map)} opts.cache
 * @param {?(String)} opts.cwd
 * @param {?(Object)} opts.storage
 * @param {Function} callback
 * @return {Target}
 */
function load(target, opts, callback) {
  if ('function' === typeof opts) {
    callback = opts
  }

  if (!opts || 'object' !== typeof opts) {
    opts = {}
  }

  opts = Object.assign({ cwd: process.cwd() }, opts) // copy

  assert('function' === typeof callback, 'Callback must be a function.')

  const loader = new Loader(opts)
  return loader.load(target, opts, callback)
}

/**
 * Module exports.
 */
module.exports = {
  load
}
