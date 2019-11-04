const { Module } = require('module')
const { Target } = require('./target')
const { Pool } = require('nanoresource-pool')
const messages = require('./messages')
const TinyBox = require('tinybox')
const varint = require('varint')
const Batch = require('batch')
const magic = require('./magic')
const path = require('path')
const ram = require('random-access-memory')
const v8 = require('v8')
const vm = require('vm')

// @TODO
v8.setFlagsFromString('--no-lazy')

/**
 * @TODO
 * @class
 * @extends Pool
 */
class Loader extends Pool {

  /**
   * `Loader` class constructor.
   * @param {?(Object)} opts
   */
  constructor(opts) {
    if (!opts || 'object' !== typeof opts) {
      opts = {}
    }

    super(Target)
  }

  /**
   * Waits for loader to be ready and calls `callback(err)` upon
   * success or error
   * @param {Function} ready
   */
  ready(callback) {
    return ready(this, callback)
  }

  /**
   * @param {String} filename
   * @param {?(Object)} opts
   * @param {?(Object)} opts.global
   * @param {?(Object)} opts.module
   * @param {?(Object)} opts.module.parent
   * @param {Function} callback
   * @return {Target}
   */
  load(filename, opts, callback) {
    if ('function' === typeof opts) {
      callback = opts
      opts = {}
    }

    if (!opts || 'object' !== typeof opts) {
      opts = {}
    }

    filename = path.resolve(filename)

    const target = this.resource(filename, opts)
    const dirname = path.dirname(filename)

    const contextRequire = Module.createRequireFromPath(
      path.join(dirname, 'node_modules')
    )

    const context = Object.assign({ }, global)

    // globals
    Object.assign(context, opts.global, { console, Buffer, process })
    Object.assign(context, {
      module: new Module(
        filename,
        opts.module && opts.module.parent || new Module('', null))
    })

    Object.assign(context.module, {
      filename,
      require: contextRequire,
    })

    target.ready(onopen)

    return target

    function onopen(err) {
      if (err) { return callback(err) }
      target.stat(onstat)
    }

    function onstat(err, stats) {
      if (err) { return callback(err) }
      target.read(0, stats.size, onread)
    }

    function onread(err, buffer) {
      if (err) { return callback(err) }
      const head = buffer.slice(0, 4)

      if (0 === Buffer.compare(head, magic.OBJECT_BYTES)) {
        return onbuffer(buffer, callback)
      }

      // try as regular script
      try {
        const script = new vm.Script(String(buffer), { filename })
        script.runInNewContext(context)
        context.module.loaded = true
        callback(null, context.module.exports)
      } catch (err) {
        void err
      }

      // try as archive
      const archive = new TinyBox(ram(buffer))
      archive.get('index', (err, result) => {
        if (err) {
          return callback(new Error('Unknown file type loaded.'))
        }

        if (result && result.value) {
          const { index } = messages.Archive.decode(result.value)
          if (index && index.entries) {
            const batch = new Batch()
            for (const entry of index.entries) {
              batch.push((next) => {
                archive.get(entry.filename, (err, result) => {
                  if (err) { return next(err) }
                  onbuffer(result.value, (err, result) => {
                    if (err) { return next(err) }
                    next(null, { [entry.filename]: result })
                  })
                })
              })
            }

            batch.end((err, results) => {
              if (err) { return callback(err) }
              if (Array.isArray(results)) {
                callback(null, Object.assign({}, ...results))
              } else {
                callback(null, null)
              }
            })
          }
        }
      })
    }

    function onbuffer(buffer, done) {
      buffer = buffer.slice(4)

      const size = varint.decode(buffer)
      const stub = '"' + "\u000b".repeat(size - 2) + '"'
      const cachedData = buffer.slice(varint.decode.bytes)
      const script = new vm.Script(stub, { cachedData })

      try {
        const init = script.runInNewContext(context)
        if ('function' === typeof init) {
          init(
            context.module.exports,
            context.module.require,
            context.module,
            filename,
            dirname)

          context.module.loaded = true
        }

        done(null, context.module.exports, context.module.loaded)
      } catch (err) {
        return done(err)
      }
    }
  }
}

/**
 * Module exports.
 */
module.exports = {
  Loader
}
