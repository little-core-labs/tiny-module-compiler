const { Archiver } = require('./archiver')

/**
 * Archives `objects` into `target` where `opts` is passed directly
 * to the `Archiver` constructor and `callback(err)` is called upon success
 * or error.
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

  archiver.ready(() => {
    archiver.archive(target, objects, callback)
  })
}

/**
 * Module exports.
 */
module.exports = {
  archive
}
