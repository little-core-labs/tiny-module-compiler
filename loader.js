const { Module } = require('module')
const { Target } = require('./target')
const { Pool } = require('nanoresource-pool')
const messages = require('./messages')
const uint64be = require('uint64be')
const TinyBox = require('tinybox')
const isUTF8 = require('isutf8')
const varint = require('varint')
const semver = require('semver')
const debug = require('debug')('tiny-module-compiler:loader')
const ready = require('nanoresource-ready')
const Batch = require('batch')
const magic = require('./magic')
const path = require('path')
const raf = require('random-access-file')
const v8 = require('v8')
const vm = require('vm')

// quick util
const noop = () => void 0

// Turn off lazy compilation in `v8`
// see: https://stackoverflow.com/questions/21534565/what-does-the-node-js-nolazy-flag-mean
v8.setFlagsFromString('--no-lazy')

/**
 * Custom function to construct a `require()` function when
 * the `Module.createRequireFromPath()` function is not available.
 * @private
 * @param {Module} mod
 * @return {Function}
 */
// istanbul ignore next
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
 * The `Loader` class represents an abstraction for loading compiled
 * module objects and JavaScript sources as node modules.
 * @public
 * @class
 * @extends Pool
 */
class Loader extends Pool {

  /**
   * `Loader` class constructor.
   * @param {?(Object)} opts
   * @param {?(Map)} opts.cache
   */
  constructor(opts) {
    if (!opts || 'object' !== typeof opts) {
      opts = {}
    }

    super(Target)

    this.cache = opts.cache || new Map()
  }

  /**
   * Waits for loader to be ready and calling `callback()` when it is.
   * @param {Function} ready
   */
  ready(callback) {
    return ready(this, callback)
  }

  /**
   * Loads a compiled module object or JavaScript source module
   * specified at filename calling `callback(err, exports)` upon success
   * or error. Success loads will cache resulting module for subsequent
   * requests to load the module.
   * @param {String} filename
   * @param {?(Object)} opts
   * @param {?(Object)} opts.storage
   * @param {Function} callback
   * @return {Target}
   */
  load(filename, opts, callback) {
    const { cache } = this

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

    filename = path.resolve(filename)

    if (cache.has(filename)) {
      return process.nextTick(callback, null, cache.get(filename).exports, true)
    }

    const dirname = path.dirname(filename)
    const target = this.resource(filename, opts)
    const paths = Module._nodeModulePaths(filename)

    const contextModule = new Module(filename)

    // istanbul ignore next
    const createRequireFromPath = Module.createRequire || Module.createRequireFromPath
    const contextRequire = 'function' === typeof createRequireFromPath
      ? createRequireFromPath(filename)
      : makeRequireFunction(contextModule)

    Object.assign(contextModule, {
      filename,
      paths
    })

    target.open(onopen)

    return target

    function onopen(err) {
      if (err) { return callback(err) }
      target.stat(onstat)
    }

    function onstat(err, stats) {
      // istanbul ignore next
      if (err) { return callback(err) }
      target.read(0, stats.size, onread)
    }

    function onread(err, buffer) {
      // istanbul ignore next
      if (err) { return callback(err) }

      const head = buffer.slice(0, 4)
      let error = null

      if (0 === Buffer.compare(head, magic.TMCO)) {
        return onbuffer(buffer, callback)
      }

      do {
        if (isUTF8(buffer)) {
          try {
            new vm.Script(buffer, { filename })
          } catch (err) {
            if (!(/invalid/i.test(err.message) && err instanceof SyntaxError)) {
              error = err
            }
            break
          }

          // try as regular script
          const wrap = Module.wrap(buffer)
          const script = new vm.Script(wrap, { filename })
          const init = script.runInThisContext()

          try {
            init(
              contextModule.exports,
              contextRequire,
              contextModule,
              filename,
              dirname,
              process,
              global,
              Buffer)
          } catch (err) {
            return callback(err)
          }

          contextModule.loaded = true
          cache.set(filename, contextModule)

          return callback(null, contextModule.exports, contextModule.loaded)
        }
      } while (0)

      // try as archive
      const archive = new TinyBox(opts.storage || raf(filename))
      archive.get('index', (err, result) => {
        // istanbul ignore next
        if (err) { return callback(err) }

        if (!result) {
          return callback(error || new Error('Invalid or Empty archive.'))
        }

        const index = messages.Archive.Index.decode(result.value)
        const batch = new Batch()

        for (const entry of index.entries) {
          batch.push((next) => {
            archive.get(entry.filename, (err, result) => {
              // istanbul ignore next
              if (err) { return next(err) }
              let buffer = entry.result

              try {
                const decoded = messages.Archive.Entry.decode(result.value)
                buffer = decoded.buffer
              } catch (err) {
                // istanbul ignore next
                void err
              }

              onbuffer(buffer, (err, result) => {
                // istanbul ignore next
                if (err) { return next(err) }
                next(null, { [entry.filename]: result })
              })
            })
          })
        }

        // istanbul ignore next
        batch.end((err, results) => {
          if (err) { return callback(err) }
          if (Array.isArray(results)) {
            callback(null, Object.assign({}, ...results))
          } else {
            callback(null, null)
          }
        })
      })
    }

    function onbuffer(buffer, done) {
      buffer = buffer.slice(4) // TMCO magic bytes

      const versionsLength = varint.decode(buffer)
      buffer = buffer.slice(varint.decode.bytes)

      const versions = messages.Versions.decode(buffer.slice(0, versionsLength))
      buffer = buffer.slice(messages.Versions.decode.bytes)

      const optionsLength = varint.decode(buffer)
      buffer = buffer.slice(varint.decode.bytes)

      const options = messages.Options.decode(buffer.slice(0, optionsLength))
      buffer = buffer.slice(messages.Options.decode.bytes)

      const sourceHash = varint.decode(buffer)
      buffer = buffer.slice(varint.decode.bytes)

      const cacheLength = varint.decode(buffer)
      buffer = buffer.slice(varint.decode.bytes)

      const ourV8Version = semver.parse(process.versions.v8, { loose: true })
      const theirV8Version = semver.parse(versions.v8, { loose: true })
      const compareV8Version = (v) => ourV8Version[v] === theirV8Version[v]

      // istanbul ignore next
      if (
        !compareV8Version('major') ||
        !compareV8Version('minor') ||
        !compareV8Version('patch')
      ) {
        return done(new Error(
          `v8 version mismatch. ` +
          `Expecting: "${versions.v8}". ` +
          `Got: "${process.versions.v8}".`
        ))
      }

      // ensure versions in header match running process
      for (const name in versions) {
        if ('v8' === name) { continue }
        // istanbul ignore next
        if (versions[name] !== process.versions[name]) {
          debug(
            `${name} version mismatch. ` +
            `Expecting: "${versions[name]}". ` +
            `Got: "${process.versions[name]}".`
          )
        }
      }

      const size = sourceHash

      // "\u200b" means zero width space as used in `bytenode`
      const stub = '"' + "\u200b".repeat(size - 2) + '"'
      const cachedData = buffer.slice()

      try {
        const script = new vm.Script(stub, { filename, cachedData })
        const init = script.runInThisContext()

        // istanbul ignore next
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
          cache.set(filename, contextModule)
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
