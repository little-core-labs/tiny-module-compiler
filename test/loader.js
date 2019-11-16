const path = require('path')
const test = require('tape')
const ram = require('random-access-memory')

const { Archiver } = require('../archiver')
const { Compiler } = require('../compiler')
const { Loader } = require('../loader')

test('loader = new Loader()', (t) => {
  const loader = new Loader()
  t.ok(loader.cache instanceof Map, 'loader.cache')
  t.end()
})

test('loader = new Loader(opts) - custom cache', (t) => {
  const cache = new Map()
  const loader = new Loader({ cache })
  t.equal(cache, loader.cache, 'loader.cache')
  t.end()
})

test('loader.ready(callback)', (t) => {
  const loader = new Loader()
  loader.ready(() => {
    t.pass('callback()')
    t.end()
  })
})

test('loader.load(filename, callback) - source module', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const loader = new Loader()
  loader.load(filename, (err, exports) => {
    t.error(err)
    t.equal('object', exports && typeof exports, 'exports')
    t.equal('function', typeof exports.hello, 'exports.hello')
    t.equal('hello', exports.hello(), 'exports.hello()')
    t.end()
  })
})

test('loader.load(filename, callback) - compiled module', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out'
  const compiler = new Compiler()
  const loader = new Loader()
  compiler.target(filename)
  compiler.compile((err, objects) => {
    loader.load(destname, (err, exports) => {
      t.error(err)
      t.equal('object', exports && typeof exports, 'exports')
      t.equal('function', typeof exports.hello, 'exports.hello')
      t.equal('hello', exports.hello(), 'exports.hello()')
      t.end()
    })
  })
})

test('loader.load(filename, callback) - compiled module (cached)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out'
  const compiler = new Compiler()
  const loader = new Loader()
  compiler.target(filename)
  compiler.compile((err, objects) => {
    loader.load(destname, (err, exports) => {
      t.error(err)
      t.equal(true, loader.cache.has(path.resolve(destname)), 'loader.cache.has(destname)')
      loader.load(destname, (err, exports) => {
        t.error(err)
        t.end()
      })
    })
  })
})

test('loader.load(filename, callback) - does not exist', (t) => {
  const filename = 'does-not-exist.js'
  const loader = new Loader()
  loader.load(filename, (err, exports) => {
    t.ok(err && 'ENOENT' === err.code, 'ENOENT === err.code')
    t.end()
  })
})

test('loader.load(filename, callback) - archive', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out'
  const archiver = new Archiver()
  const compiler = new Compiler()
  const storage = ram()
  const loader = new Loader()

  storage.open(() => {
    compiler.target(filename)
    compiler.compile((err, objects) => {
      archiver.archive(filename + '.a', objects, { storage }, (err) => {
        loader.load(filename + '.a', { storage }, (err, ar) => {
          t.error(err)
          const exports = ar[destname]
          t.equal('object', exports && typeof exports, 'exports')
          t.equal('function', typeof exports.hello, 'exports.hello')
          t.equal('hello', exports.hello(), 'exports.hello()')
          t.end()
        })
      })
    })
  })
})

test('loader.load(filename, opts, callback) - error on empty archive', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out'
  const archiver = new Archiver()
  const compiler = new Compiler()
  const storage = ram(Buffer.alloc(64))
  const loader = new Loader()

  storage.open(() => {
    loader.load(filename + '.a', { storage }, (err, ar) => {
      t.ok(err, 'callback(err)',)
      t.end()
    })
  })
})

test('loader.load(filename, opts, callback) - syntax error (source)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'syntax-error.js')
  const loader = new Loader()
  loader.load(filename, (err, exports) => {
    t.ok(err && err instanceof SyntaxError, 'callback(err == SyntaxError)')
    t.end()
  })
})

test('loader.load(filename, opts, callback) - thrown error (source)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'throw-error.js')
  const loader = new Loader()
  loader.load(filename, (err, exports) => {
    t.ok(err && err instanceof Error, 'callback(err)')
    t.end()
  })
})

test('loader.load(filename, opts, callback) - thrown error (compiled)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'throw-error.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out'
  const compiler = new Compiler()
  const loader = new Loader()
  compiler.target(filename)
  compiler.compile((err, objects) => {
    loader.load(destname, (err, exports) => {
      t.ok(err && err instanceof Error, 'callback(err)')
      t.end()
    })
  })
})
