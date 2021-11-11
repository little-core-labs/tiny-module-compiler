const messages = require('./messages')
const TinyBox = require('tinybox')
const mkdirp = require('mkdirp')
const Batch = require('batch')
const path = require('path')
const raf = require('random-access-file')
const fs = require('fs')

// quick util
const noop = () => void 0

/**
 * Mask applied to `entry.mode` to get permissions value.
 * @private
 */
const FS_STAT_MODE_MASK = 0x1ff // 0777


/**
 * Unpacks `target` archive to disk or optionally, a given
 * `random-access-storage` instance where `target` is path to
 * an archive on the file system or a `random-access-storage`
 * instance containing the archive data.
 * @param {String|Object} target
 * @param {?(Object)} opts
 * @param {?(String)} opts.output
 * @param {?(Function)} opts.storage
 * @param {?(Number)} opts.concurrency
 * @param {Function} callback
 */
function unpack(target, opts, callback) {
  if ('function' === typeof opts) {
    callback = opts
  }

  if (!opts || 'object' !== typeof opts) {
    opts = {}
  }

  // istanbul ignore next
  if ('function' !== typeof callback) {
    callback = noop
  }

  const archive = new TinyBox(target)

  archive.get('index', onindex)

  function onindex(err, result) {
    // istanbul ignore next
    if (err) {
      return callback(err)
    } else if (!result || !result.value) {
      return callback(null, [])
    }

    const index = messages.Archive.Index.decode(result.value)
    const batch = new Batch().concurrency(opts.concurrency || Infinity)

    for (const entry of index.entries) {
      onentry(entry)
    }

    return batch.end(onend)

    function onend(err) {
      // istanbul ignore next
      if (err) { return callback(err) }
      callback(null, index.entries)
    }

    function onentry(entry) {
      batch.push((next) => {
        archive.get(entry.filename, (err, result) => {
          const output = opts.output || process.cwd()
          const filename = path.resolve(output, entry.filename)
          // istanbul ignore next
          if (err) { return next(err) }
          const { buffer, mode } = messages.Archive.Entry.decode(result.value)
          const hasCustomStorage = 'function' === typeof opts.storage

          if (!hasCustomStorage) {
            const dirname = path.dirname(filename)
            const promise = mkdirp(dirname)
            promise.catch((err) => next(err))
            return promise.then(() => {
              write(raf(filename), buffer, (err) => {
                // istanbul ignore next
                if (err) { return next(err) }
                fs.chmod(filename, mode & FS_STAT_MODE_MASK, next)
              })
            })
          }

          write(opts.storage(entry.filename), buffer, next)
        })
      })
    }

    function write(storage, value, done) {
      storage.write(0, value, (err) => {
        storage.close()
        done(err)
      })
    }
  }
}

/**
 * Module exports.
 */
module.exports = {
  unpack
}
