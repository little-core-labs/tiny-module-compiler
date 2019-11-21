const Resource = require('nanoresource')
const messages = require('./messages')
const TinyBox = require('tinybox')
const rimraf = require('rimraf')
const ready = require('nanoresource-ready')
const Batch = require('batch')
const raf = require('random-access-file')
const fs = require('fs')

/**
 * The `Archiver` class represents an abstraction for storing
 * compiled objects into a `TinyBox`
 * @class
 * @extends Resource
 */
class Archiver extends Resource {

  /**
   * `Archiver` class constructor.
   * @param {?(Object)} opts
   * @param {?(Function)} opts.storage
   */
  constructor(opts) {
    if (!opts || 'object' !== typeof opts) {
      opts = {}
    }

    super()

    if ('function' === typeof opts.storage) {
      this.storage = opts.storage
    } else {
      this.storage = raf
    }
  }

  /**
   * Waits for archiver to be ready and calling `callback()`
   * when it is.
   * @param {Function} ready
   */
  ready(callback) {
    ready(this, callback)
  }

  /**
   * Creates a named archive specified at `filename`
   * with given objects calling `callback(err)` upon success
   * or error.
   * @param {String} filename
   * @param {Array|Map} objects
   * @param {?(Object)} opts
   * @param {?(Object)} opts.storage
   * @param {?(Boolean)} opts.truncate
   * @param {?(Number)} opts.concurrency
   * @param {Function} callback
   */
  archive(filename, objects, opts, callback) {
    if ('function' === typeof opts) {
      callback = opts
      opts = {}
    }

    // istanbul ignore next
    if (!opts || 'object' !== typeof opts) {
      opts = {}
    }

    const steps = new Batch().concurrency(1)

    if (!opts.storage && false !== opts.truncate) {
      steps.push((done) => {
        fs.access(filename, (err) => {
          // istanbul ignore next
          if (err) { return done(null) }
          rimraf(filename, done)
        })
      })
    }

    steps.push((done) => {
      if (Array.isArray(objects)) {
        if (Array.isArray(objects[0])) {
          objects = new Map(objects)
        } else {
          objects = new Map(objects.map((object) => [object, null]))
        }
      }

      const filenames = [ ...objects.keys() ]
      const entries = filenames.sort().map((filename, id) => ({ id, filename }))
      const storage = opts.storage || this.storage(filename)
      const batch = new Batch().concurrency(opts.concurrency || Infinity)
      const box = new TinyBox(storage)

      const versions = messages.Versions.encode(process.versions)

      batch.push((next) => box.put('versions', versions, next))
      batch.push((next) => {
        box.get('index', (err, result) => {
          const prev = result && result.value
            ? messages.Archive.Index.decode(result.value)
            : null

          let size = entries.length

          if (prev && prev.entries) {
            const existing = new Set(filenames)
            for (const entry of prev.entries) {
              if (!existing.has(entry.filename)) {
                entries.unshift(entry)
                size++
              }
            }
          }

          let i = 0
          for (const entry of entries) {
            entry.id = i++
          }

          const index = messages.Archive.Index.encode({ size, entries })

          box.put('index', index, next)
        })
      })

      for (const [ objectPath, objectBuffer ] of objects) {
        batch.push((next) => {
          if (Buffer.isBuffer(objectBuffer)) {
            box.put(objectPath, objectBuffer, next)
          } else {
            // `objectBuffer` could be a `random-access-storage` instance
            const file = objectBuffer && objectBuffer.stat && objectBuffer.read
              ? objectBuffer
              : raf(objectPath)

            file.stat((err, stats) => {
              // istanbul ignore next
              if (err) { return next(err) }
              file.read(0, stats.size, (err, buffer) => {
                // istanbul ignore next
                if (err) { return next(err) }
                box.put(objectPath, buffer, (err) => {
                  // istanbul ignore next
                  if (err) { return next(err) }
                  file.close(next)
                })
              })
            })
          }
        })
      }

      batch.end((err) => {
        // istanbul ignore next
        if (err) { return done(err) }
        if (!opts.storage) {
          storage.close(done)
        } else {
          process.nextTick(done, null)
        }
      })
    })

    steps.end(callback)
  }
}

/**
 * Module exports.
 */
module.exports = {
  Archiver
}
