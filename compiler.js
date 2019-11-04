const { Target } = require('./target')
const { Module } = require('module')
const { Pool } = require('nanoresource-pool')
const varint = require('varint')
const rimraf = require('rimraf')
const Batch = require('batch')
const magic = require('./magic')
const ready = require('nanoresource-ready')
const path = require('path')
const raf = require('random-access-file')
const ram = require('random-access-memory')
const ncc = require('@zeit/ncc')
const vm = require('vm')

// quick util
const errback = (p, cb) => void p.then((r) => cb(null, r), cb).catch(cb)

/**
 * @TODO
 * @class
 * @extends Pool
 */
class Compiler extends Pool {

  /**
   * `Compiler` class constructor.
   * @param {?(Object)} opts
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
   * @TODO
   * @param {String} filename
   * @param {?(Object)} opts
   * @return {Target}
   */
  target(filename, opts) {
    if (!opts || 'object' !== typeof opts) {
      opts = {}
    }

    return Object.assign(this.resource(filename, opts), {
      output: opts.output || filename + '.out'
    })
  }

  /**
   * @TODO
   * @param {?(Object)} opts
   * @param {Function} callback
   */
  compile(opts, callback) {
    if ('function' === typeof opts) {
      callback = opts
      opts = {}
    }

    if (!opts || 'object' !== typeof opts) {
      opts = {}
    }

    const { targets } = this
    const objects = new Map()
    const writes = new Batch()
    const batch = new Batch()

    for (const target of targets) {
      const { filename } = target
      const extname = path.extname(filename)
      const basename = path.basename(filename)
      const targetName = path.resolve(target.output)
        .replace(path.join(path.resolve(this.cwd), path.sep), '')

      batch.push((next) => {
        // assume target is on disk for now
        errback(ncc(filename, {
          sourceMap: false, // @TODO: unsupported for now
          externals: opts.externals || [],
          filename: basename,
          v8cache: false, // we'll do this manually
          minify: false, // if `true` this can break cached builds
          quiet: false !== opts.quiet, // @TODO: `false` in "debug"
        }), (err, result) => {
          if (err) { return next(err) }

          const src = Buffer.from(Module.wrap(result.code))
          const size = Buffer.from(varint.encode(src.length))
          const script = new vm.Script(src.toString(), { filename: basename })
          const cache = script.createCachedData()

          objects.set(targetName, Buffer.concat([
            magic.OBJECT_BYTES, size, cache
          ]))

          next(null)
        })
      })
    }

    batch.end((err) => {
      if (err) { return callback(err) }

      for (const [ filename, object ] of objects) {
        writes.push((next) => {
          rimraf(filename, (err) => {
            if (err) { return callback(err) }
            const output = raf(filename)
            output.write(0, object, (err) => {
              if (err) {
                output.close(() => next(err))
              } else {
                output.close(next)
              }
            })
          })
        })
      }

      writes.end((err) => {
        if (err) { return callback(err) }
        callback(null, objects)
      })
    })
  }
}

/**
 * Module exports.
 */
module.exports = {
  Compiler,
}
