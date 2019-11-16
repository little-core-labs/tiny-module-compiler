const Resource = require('nanoresource')
const assert = require('nanoassert')
const ready = require('nanoresource-ready')
const raf = require('random-access-file')

/**
 * The `Target` class represents a `nanoresource` to a target file
 * backed by `random-access-storage` instance.
 * @class
 * @extends Resource
 */
class Target extends Resource {

  /**
   * `Target` class constructor.
   * @param {String} filename
   * @param {?(Object)} opts
   * @param {?(Function|Object)} opts.storage
   */
  constructor(filename, opts) {
    if (!opts || 'object' !== typeof opts) {
      opts = {}
    }

    super(opts)

    assert(filename && 'string' === typeof filename,
      'Filename must be a string.')

    this.filename = filename
    this.shouldCloseStorage = false

    if ('function' === typeof opts.storage) {
      this.storage = opts.storage(this.filename, opts)
    } else if (opts.storage && 'object' === typeof opts.storage) {
      this.storage = opts.storage
    } else {
      this.storage = raf(this.filename, opts)
      this.shouldCloseStorage = true
    }
  }

  /**
   * The active file descriptor for the target resource. Will be `null`
   * if not opened.
   * @accessor
   */
  get fd() {
    return this.storage.fd || null
  }

  /**
   * Implements `_open(callback)` for `nanoresource`. Will open a file
   * descriptor for at the targets filename and set it on the instance.
   * @param {Function} callback
   */
  _open(callback) {
    // istanbul ignore next
    if (this.storage.opened) {
      return process.nextTick(callback, null)
    }

    this.storage.open(callback)
  }

  /**
   * Implements `_close(callback)` for `nanoresource`. Will close the
   * underlying file descriptor for at the target.
   * @param {Function} callback
   */
  _close(callback) {
    if (!this.shouldCloseStorage) {
      return process.nextTick(callback, null)
    }

    // istanbul ignore next
    if (this.storage.closed) {
      return process.nextTick(callback, null)
    }

    this.storage.close(callback)
  }

  /**
   * Queries for stats from the underlying target storage.
   * @param {Function} callback
   */
  stat(callback) {
    this.storage.stat(callback)
  }

  /**
   * Reads data from the underlying target storage at a specified
   * offset and size.
   * @param {Number} offset
   * @param {Number} size
   * @param {Function} callback
   */
  read(offset, size, callback) {
    this.storage.read(offset, size, callback)
  }

  /**
   * Waits for compiler to be ready and calls `callback(err)` upon
   * success or error
   * @param {Function} ready
   */
  ready(callback) {
    ready(this, callback)
  }
}

/**
 * Module exports.
 */
module.exports = {
  Target
}
