const { Target } = require('./target')
const { Module } = require('module')
const { Pool } = require('nanoresource-pool')
const messages = require('./messages')
const varint = require('varint')
const rimraf = require('rimraf')
const Batch = require('batch')
const magic = require('./magic')
const ready = require('nanoresource-ready')
const path = require('path')
const raf = require('random-access-file')
const ncc = require('@zeit/ncc')
const vm = require('vm')

// quick util
const errback = (p, cb) => void p.then((r) => cb(null, r), cb).catch(cb)
const noop = () => void 0

/**
 * Default extension for compiler target output file names.
 * @private
 */
const DEFAULT_OUTPUT_EXTNAME = '.out'

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
   * Waits for compiler to be ready and calls `callback(err)` upon
   * success or error
   * @param {Function} ready
   */
  ready(callback) {
   ready(this, callback)
  }

  /**
   * Creates and returns a new compile target that is added to
   * compiler pool. The target will be compiled when `
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
   * assets that should live with the compiled objects on disk.
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
        const extname = path.extname(filename)
        const basename = path.basename(filename)
        const targetName = path.resolve(target.output)
          .replace(path.join(path.resolve(this.cwd), path.sep), '')

        batch.push((next) => {
          // assume target is on disk for now
          errback(ncc(filename, {
            sourceMap: opts.map || false,
            externals: opts.externals || [],
            cache: opts.cache || false,
            v8cache: false, // we'll do this manually
            minify: false, // if `true` this can break cached builds
            quiet: false !== opts.quiet, // @TODO: `false` in "debug"
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
                permissions: 438 // 0666
              })
            }

            if (result.map) {
              assets.set(targetName + '.map', {
                source: Buffer.from(result.map),
                permissions: 438 // 0666
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

            // borrowed from: https://github.com/OsamaAbbas/bytenode/blob/master/index.js#L56
            const length = cache.slice(8, 12).reduce((y, x, i) => y += x * Math.pow(256, i), 0)
            const versions = messages.Versions.encode(process.versions)

            objects.set(targetName, Buffer.concat([
              // header
              magic.OBJECT_BYTES,
              Buffer.from(varint.encode(versions.length)),
              versions,
              // body
              Buffer.from(varint.encode(length)),
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

      for (const [ filename, object ] of objects) {
        writes.push((next) => {
          rimraf(filename, (err) => {
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
