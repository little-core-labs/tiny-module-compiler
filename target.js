const Resource = require('nanoresource')
const assert = require('nanoassert')
const ready = require('nanoresource-ready')
const raf = require('random-access-file')

/**
 * The `Target` class represents a `nanoresource` to a target file
 * backed by `random-access-storage`.
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

    if ('function' === typeof opts.storage) {
      this.storage = opts.storage(this.filename, opts)
    } else if (opts.storage && 'object' === typeof opts.storage) {
      this.storage = opts.storage
    } else {
      this.storage = raf(this.filename, opts)
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
    this.storage = raf(this.filename)
    this.storage.open(callback)
  }

  /**
   * Implements `_close(callback)` for `nanoresource`. Will close the
   * underlying file descriptor for at the target.
   * @param {Function} callback
   */
  _close(callback) {
    this.storage.close(calback)
  }

  /**
   * @param {Function} callback
   */
  stat(callback) {
    this.storage.stat(callback)
  }

  /**
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
