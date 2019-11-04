const { Target } = require('./target')
const { Pool } = require('nanoresource-pool')
const messages = require('./messages')
const TinyBox = require('tinybox')
const rimraf = require('rimraf')
const Batch = require('batch')
const raf = require('random-access-file')

/**
 * @TODO
 * @class
 * @extends Pool
 */
class Archiver extends Pool {

  /**
   * `Archiver` class constructor.
   * @param {?(Object)} opts
   */
  constructor(opts) {
    if (!opts || 'object' !== typeof opts) {
      opts = {}
    }

    super(Target)
  }

  /**
   * Waits for compiler to be ready and calls `callback(err)` upon
   * success or error
   * @param {Function} ready
   */
  ready(callback) {
    ready(this, callback)
  }

  /**
   * @TODO
   * @param {String} target
   * @param {Array|Map} objects
   * @param {?(Object)} opts
   * @param {Function} callback
   */
  archive(filename, objects, opts, callback) {
    if ('function' === typeof opts) {
      callback = opts
      opts = {}
    }

    if (!opts || 'object' !== typeof opts) {
      opts = {}
    }

    rimraf(filename, (err) => {
      if (err) { return callback(err) }

      if (Array.isArray(objects)) {
        objects = new Map(objects.map((object) => [object, null]))
      }

      const filenames = [ ...objects.keys() ]
      const entries = filenames.map((filename, id) => ({ id, filename }))
      const target = this.resource(filename, opts)
      const batch = new Batch()
      const index = messages.Archive.encode({
        index: { size: entries.length, entries }
      })

      target.box = new TinyBox(filename)
      batch.push((next) => target.box.put('index', index, next))

      for (const [ objectPath, objectBuffer ] of objects) {
        batch.push((next) => {
          if (objectBuffer) {
            target.box.put(objectPath, objectBuffer, next)
          } else {
            const file = raf(objectPath)
            file.stat((err, stats) => {
              if (err) { return next(err) }
              file.read(0, stats.size, (err, buffer) => {
                if (err) { return next(err) }
                target.box.put(objectPath, buffer, (err) => {
                  if (err) { return next(err) }
                  file.close(next)
                })
              })
            })
          }
        })
      }

      batch.end(callback)
    })
  }
}

/**
 * Module exports.
 */
module.exports = {
  Archiver
}
