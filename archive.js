const { Archiver } = require('./archiver')

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
 * Module exports.
 */
module.exports = {
  archive
}
