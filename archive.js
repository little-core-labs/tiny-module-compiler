const { Archiver } = require('./archiver')

/**
 * Archives `objects` into `target` where `opts` is passed directly
 * to the `Archiver` constructor and `callback(err)` is called upon success
 * or error.
 * @param {String} target
 * @param {Array|Map} objects
 * @param {?(Object)} opts
 * @param {?(Object)} opts.storage
 * @param {?(Boolean)} opts.truncate
 * @param {?(Number)} opts.concurrency
 * @param {Function} callback
 */
function archive(target, objects, opts, callback) {
  if ('function' === typeof opts) {
    callback = opts
  }

  if (!opts || 'object' !== typeof opts) {
    opts = {}
  }

  const archiver = new Archiver()

  archiver.ready(() => {
    archiver.archive(target, objects, opts, callback)
  })
}

/**
 * Module exports.
 */
module.exports = {
  archive
}
