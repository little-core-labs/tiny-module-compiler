const { Loader } = require('./loader')
const assert = require('nanoassert')

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
  load
}
