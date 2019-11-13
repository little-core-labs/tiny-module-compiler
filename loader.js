const { Module } = require('module')
const { Target } = require('./target')
const { Pool } = require('nanoresource-pool')
const messages = require('./messages')
const varint = require('varint')
const TinyBox = require('tinybox')
const Batch = require('batch')
const magic = require('./magic')
const path = require('path')
const raf = require('random-access-file')
const v8 = require('v8')
const vm = require('vm')

// @TODO
v8.setFlagsFromString('--no-lazy')

/**
 * @param {Module} mod
 */
function makeRequireFunction(mod) {
  const extensions = Module._extensions
  const cache = Module._cache
  const main = process.mainModule

  Object.assign(resolve, {
    paths
  })

  return Object.assign(requireFunction, {
    extensions,
    resolve,
    cache,
    main,
  })

  // https://github.com/zertosh/v8-compile-cache/blob/master/v8-compile-cache.js#L160
  function requireFunction(id) {
    return mod.require(id)
  }

  // https://github.com/zertosh/v8-compile-cache/blob/master/v8-compile-cache.js#L165
  function resolve(request, options) {
    return Module._resolveFilename(request, mod, false, options)
  }

  // https://github.com/zertosh/v8-compile-cache/blob/master/v8-compile-cache.js#L173
  function paths(request) {
    return Module._resolveLookupPaths(request, mod, true)
  }
}

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

    const dirname = path.dirname(filename)
    const target = this.resource(filename, opts)
    const paths = Module._nodeModulePaths(filename)

    const contextModule = new Module(filename)
    const contextRequire = 'function' === typeof Module.createRequireFromPath
      ? Module.createRequireFromPath(filename)
      : makeRequireFunction(contextModule)

    Object.assign(contextModule, {
      filename,
      paths
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
        const script = new vm.Script(Module.wrap(buffer), { filename })
        const init = script.runInThisContext()
        if ('function' === typeof init) {
          init(
            contextModule.exports,
            contextRequire,
            contextModule,
            filename,
            dirname,
            process,
            global,
            Buffer)

          contextModule.loaded = true
        }

        return callback(null, contextModule.exports, contextModule.loaded)
      } catch (err) {
        if (false === err instanceof SyntaxError) {
          return callback(err)
        }
      }

      // try as archive
      const archive = new TinyBox(raf(filename))
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
      const stub = '"' + "\u200b".repeat(size - 2) + '"'
      const cachedData = buffer.slice(varint.decode.bytes)

      try {
        const script = new vm.Script(stub, { filename, cachedData })
        const init = script.runInThisContext()
        if ('function' === typeof init) {
          init(
            contextModule.exports,
            contextRequire,
            contextModule,
            filename,
            dirname,
            process,
            global,
            Buffer)

          contextModule.loaded = true
        }

        done(null, contextModule.exports, contextModule.loaded)
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
