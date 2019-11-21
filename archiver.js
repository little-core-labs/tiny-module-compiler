const Resource = require('nanoresource')
const messages = require('./messages')
const TinyBox = require('tinybox')
const rimraf = require('rimraf')
const ready = require('nanoresource-ready')
const Batch = require('batch')
const raf = require('random-access-file')
const fs = require('fs')

/**
 * Default file permissions for inputs.
 * @private
 */
const DEFAULT_INPUT_PERMISSIONS = 438 // 0666

/**
 * Mask applied to `DEFAULT_INPUT_PERMISSIONS` for default mode.
 * @private
 */
const FS_STAT_MODE_MASK = 0x1ff // 0777

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
   * with given inputs calling `callback(err)` upon success
   * or error.
   * @param {String} filename
   * @param {Array|Map} inputs
   * @param {?(Object)} opts
   * @param {?(Object)} opts.storage
   * @param {?(Boolean)} opts.truncate
   * @param {?(Number)} opts.concurrency
   * @param {Function} callback
   */
  archive(filename, inputs, opts, callback) {
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
      if (Array.isArray(inputs)) {
        if (Array.isArray(inputs[0])) {
          inputs = new Map(inputs)
        } else {
          inputs = new Map(inputs.map((input) => [input, null]))
        }
      }

      const filenames = [ ...inputs.keys() ]
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

      for (const [ inputPath, inputBuffer ] of inputs) {
        batch.push((next) => {
          if (Buffer.isBuffer(inputBuffer)) {
            if (opts.storage) {
              const entry = messages.Archive.Entry.encode({
                mode: (DEFAULT_INPUT_PERMISSIONS|FS_STAT_MODE_MASK),
                size: inputBuffer.length,
                buffer: inputBuffer
              })

              box.put(inputPath, entry, next)
            } else {
              fs.stat(inputPath, (err, stats) => {
                const entry = messages.Archive.Entry.encode({
                  mode: stats.mode,
                  size: stats.size,
                  buffer: inputBuffer
                })

                box.put(inputPath, entry, next)
              })
            }
          } else {
            // `inputBuffer` could be a `random-access-storage` instance
            const file = inputBuffer && inputBuffer.stat && inputBuffer.read
              ? inputBuffer
              : raf(inputPath)

            file.stat((err, stats) => {
              // istanbul ignore next
              if (err) { return next(err) }

              // istanbul ignore next
              const {
                size = 0,
                mode = (DEFAULT_INPUT_PERMISSIONS|FS_STAT_MODE_MASK)
              } = stats

              file.read(0, size, (err, buffer) => {
                // istanbul ignore next
                if (err) { return next(err) }

                const entry = messages.Archive.Entry.encode({
                  mode,
                  size,
                  buffer
                })

                box.put(inputPath, entry, (err) => {
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
