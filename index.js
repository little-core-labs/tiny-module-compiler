const { archive } = require('./archive')
const { compile } = require('./compile')
const { unpack } = require('./unpack')
const { load } = require('./load')

/**
 * Module exports.
 */
module.exports = Object.create({
  archive,
  compile,
  unpack,
  load,

  /**
   * Imports a module at path returning its exports object.
   * @param {String} pathspec
   * @param {?(Object)} opts
   * @param {?(Map)} opts.cache
   * @param {?(String)} opts.cwd
   * @param {?(Object)} opts.storage
   * @param {Function} callback
   * @return {Object}
   */
  async import(pathspec, opts) {
    return await new Promise((resolve, reject) => {
      try {
        const target = load(pathspec, opts, (err, exports) => {
          // istanbul ignore next
          if (err) {
            // istanbul ignore next
            return reject(err)
          }

          // istanbul ignore next
          Object.defineProperty(exports, '__target__', {
            enumerable: false,
            get: () => target
          })

          resolve(exports)
        })
      } catch (err) {
        // istanbul ignore next
        return reject(err)
      }
    })
  }
})
