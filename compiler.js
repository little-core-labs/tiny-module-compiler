const { Target } = require('./target')
const { Module } = require('module')
const { Pool } = require('nanoresource-pool')
const messages = require('./messages')
const varint = require('varint')
const rimraf = require('rimraf')
const Batch = require('batch')
const debug = require('debug')('tiny-module-compiler:compiler')
const magic = require('./magic')
const ready = require('nanoresource-ready')
const path = require('path')
const raf = require('random-access-file')
const ncc = require('@vercel/ncc')
const vm = require('vm')

// quick util
const noopback = (...args) => void args.pop()(null)
const errback = (p, cb) => void p.then((r) => cb(null, r), cb).catch(cb)
const noop = () => void 0

/**
 * Default extension for compiler target output file names.
 * @private
 */
const DEFAULT_OUTPUT_EXTNAME = '.out'

/**
 * Default file permissions for assets.
 * @private
 */
const DEFAULT_ASSET_PERMISSIONS = 438 // 0666

/**
 * The `Compiler` class represents a container of compile targets
 * that can be compiled into a single binary file containing
 * v8 cache data and header information about the compiled output.
 * @public
 * @class
 * @extends Pool
 */
class Compiler extends Pool {

  /**
   * `Compiler` class constructor.
   * @param {?(Object)} opts
   * @param {?(String)} opts.cwd
   */
  constructor(opts) {
    if (!opts || 'object' !== typeof opts) {
      opts = {}
    }

    super(Target)
    this.cwd = opts.cwd || process.cwd()
  }

  /**
   * All opened targets in the compiler.
   * @accessor
   */
  get targets() {
    return this.list()
  }

  /**
   * Waits for compiler to be ready and calls `callback()` upon
   * success.
   * @param {Function} ready
   */
  ready(callback) {
   ready(this, callback)
  }

  /**
   * Creates and returns a new compile target that is added to
   * compiler pool. The target will be compiled when `compiler.compile()`
   * is called.
   * @param {String} filename
   * @param {?(Object)} opts
   * @param {?(String)} opts.output
   * @param {?(Object)} opts.storage
   * @param {?(Boolean)} [opts.autoOpen = true]
   * @param {?(Function)} callback
   * @return {Target}
   */
  target(filename, opts, callback) {
    if ('function' === typeof opts) {
      callback = opts
      opts = {}
    }

    if (!opts || 'object' !== typeof opts) {
      opts = {}
    }

    if ('function' !== typeof callback) {
      callback = noop
    }

    const target = Object.assign(this.resource(filename, opts), {
      output: opts.output || (filename + DEFAULT_OUTPUT_EXTNAME)
    })

    if (false !== opts.autoOpen) {
      target.open((err) => {
        callback(err, target)
      })
    }

    return target
  }

  /**
   * Compiles all pending compile targets calling
   * `callback(err, objects, assets)` upon success or error. Callback
   * will be given a `Map` of compiled objects and a `Map` of extracted
   * assets that should live with the compiled objects on the file system.
   * @param {?(Object)} opts
   * @param {?(Boolean)} opts.map
   * @param {?(Boolean)} opts.cache
   * @param {?(Boolean)} opts.debug
   * @param {?(Boolean)} opts.quiet
   * @param {?(Array<String>)} opts.externals
   * @param {Function} callback
   */
  compile(opts, callback) {
    if ('function' === typeof opts) {
      callback = opts
      opts = {}
    }

    // istanbul ignore next
    if (!opts || 'object' !== typeof opts) {
      opts = {}
    }

    const { targets } = this
    const objects = new Map()
    const assets = new Map()
    const writes = new Batch()
    const batch = new Batch()

    try {
      for (const target of targets) {
        const { filename } = target
        const basename = path.basename(filename)
        const targetName = path.resolve(target.output)
          .replace(path.join(path.resolve(this.cwd), path.sep), '')

        const shouldOptimize = (opts.minify || opts.optimize)

        batch.push((next) => {
          debug('compile', filename)
          // assume target is on the file system for now
          errback(ncc(filename, {
            sourceMap: opts.map || false,
            externals: opts.externals || [],
            cache: opts.cache || false,
            v8cache: false, // we'll do this manually
            minify: shouldOptimize,
            quiet: false !== opts.quiet
          }), (err, result) => {
            // istanbul ignore next
            if (err) { return next(err) }
            for (const name in result.assets) {
              assets.set(
                path.dirname(targetName) + path.sep + name,
                result.assets[name])
            }

            if (opts.debug) {
              assets.set(targetName + '.debug.compiled.js', {
                source: Buffer.from(result.code),
                permissions: DEFAULT_ASSET_PERMISSIONS
              })
            }

            if (result.map) {
              assets.set(targetName + '.map', {
                source: Buffer.from(result.map),
                permissions: DEFAULT_ASSET_PERMISSIONS
              })
            }

            const src = Buffer.from(Module.wrap(result.code))
            const script = new vm.Script(src.toString(), {
              produceCachedData: true,
              filename: basename
            })

            // istanbul ignore next
            const cache = 'function' === typeof script.createCachedData
              ? script.createCachedData()
              : script.cachedData

            // istanbul ignore next
            if (!cache) {
              return next(new Error('Unable to capture compiled cached data.'))
            }

            // read `uint32_t` from the "source hash" part of the serialized cache data:
            // borrowed from: https://github.com/OsamaAbbas/bytenode/blob/master/index.js#L56
            // read from: https://github.com/v8/v8/blob/master/src/snapshot/code-serializer.h#L93
            const sourceHash = cache.slice(8, 12).reduce((y, x, i) => y += x * Math.pow(256, i), 0)
            const versions = messages.Versions.encode(process.versions)

            const options = messages.Options.encode({
              filename: path.basename(filename),
              optimized: shouldOptimize,
              externals: opts.externals,
              assets: Array.from(assets.keys()),
            })

            objects.set(targetName, Buffer.concat([
              // header (4 bytes)
              magic.TMCO,

              // versions
              Buffer.from(varint.encode(versions.length)),
              versions,

              // options
              Buffer.from(varint.encode(options.length)),
              options,

              // source hash
              Buffer.from(varint.encode(sourceHash)),

              // cache
              Buffer.from(varint.encode(cache.length)),
              cache
            ]))

            target.close(next)
          })
        })
      }
    } catch (err) {
      return callback(err)
    }

    batch.end((err) => {
      // istanbul ignore next
      if (err) { return callback(err) }

      for (let [ filename, object ] of objects) {
        filename = path.resolve(this.cwd, filename)
        writes.push((next) => {
          const rm = opts.storage ? noopback : rimraf
          rm(filename, (err) => {
            // istanbul ignore next
            if (err) { return callback(err) }

            const output = 'function' === typeof opts.storage
              ? opts.storage(filename)
              : raf(filename)

            output.write(0, object, (err) => {
              next(err)

              if ('function' !== typeof opts.storage) {
                output.close()
              }
            })
          })
        })
      }

      writes.end((err) => {
        callback(err, objects, assets)
      })
    })
  }
}

/**
 * Module exports.
 */
module.exports = {
  Compiler
}
