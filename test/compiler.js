const path = require('path')
const test = require('tape')
const ram = require('random-access-memory')
const raf = require('random-access-file')
const fs = require('fs')

const { Compiler } = require('../compiler')
const { Target } = require('../target')

test('compiler = new Compiler()', (t) => {
  const compiler = new Compiler()
  t.ok(Array.isArray(compiler.targets), 'compiler.targets')
  t.end()
})

test('compiler = new Compiler(opts)', (t) => {
  const cwd = __dirname
  const compiler = new Compiler({ cwd })
  t.equal(__dirname, compiler.cwd, 'compiler.cwd')
  t.end()
})

test('compiler.ready(callback)', (t) => {
  const compiler = new Compiler()
  compiler.ready(() => {
    t.pass('callback()')
    t.end()
  })
})

test('compiler.target(filename)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const compiler = new Compiler()
  const target = compiler.target(filename)

  t.ok(target instanceof Target, 'target.constructor')
  t.equal(filename, target.filename, 'target.filename')
  t.equal(filename + '.out', target.output, 'target.output')
  t.end()
})

test('compiler.target(filename, opts)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const storage = raf(filename)
  const compiler = new Compiler()
  const target = compiler.target(filename, { storage })

  t.ok(target instanceof Target, 'target.constructor')
  t.equal(filename, target.filename, 'target.filename')
  t.equal(storage, target.storage, 'target.storage')
  t.end()
})

test('compiler.target(filename, callback)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const compiler = new Compiler()

  compiler.target(filename, (err, target) => {
    t.error(err, 'callback(err = null)')
    t.ok(target instanceof Target, 'target.constructor')
    t.end()
  })
})

test('compiler.target(filename, opts, callback)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const storage = raf(filename)
  const compiler = new Compiler()
  compiler.target(filename, { storage }, (err, target) => {
    t.error(err, 'callback(err = null)')
    t.ok(target instanceof Target, 'target.constructor')
    t.equal(storage, target.storage, 'target.storage')
    t.end()
  })
})

test('compiler.target(filename, opts) - autoOpen = false', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const compiler = new Compiler()
  const target = compiler.target(filename, { autoOpen: false })

  target.open((err) => {
    t.error(err, 'callback(err = null)')
    t.end()
  })
})

test('compiler.compile(callback)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out'
  const compiler = new Compiler()

  compiler.target(filename).ready(() => {
    compiler.compile((err, objects) => {
      t.error(err, 'callback(err = null)')
      t.ok(objects instanceof Map, 'objects')
      const buffer = objects.get(destname)
      t.equal(1, objects.size, 'objects.size')
      t.ok(objects.has(destname), 'objects has destination entry')
      t.ok(Buffer.isBuffer(buffer), 'entry is buffer')
      t.end()
    })
  })
})

test('compiler.compile(callback) - with assets', (t) => {
  const assetname = path.resolve(__dirname, 'fixtures', 'file')
    .replace(process.cwd() + path.sep, '')
  const filename = path.resolve(__dirname, 'fixtures', 'with-assets.js')
  const compiler = new Compiler()

  compiler.target(filename).ready(() => {
    compiler.compile((err, objects, assets) => {
      t.ok(assets instanceof Map, 'assets')
      const asset = assets.get(assetname)
      const { source, permissions } = asset
      t.equal(1, assets.size, 'assets.size')
      t.ok(Buffer.isBuffer(source), 'asset.source is buffer')
      t.equal('number', typeof permissions, 'asset.permissions is number')
      t.end()
    })
  })
})

test('compiler.compile(callback, opts) - with map', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out.map'
  const compiler = new Compiler()

  compiler.target(filename).ready(() => {
    compiler.compile({ map: true }, (err, objects, assets) => {
      t.ok(assets instanceof Map, 'assets')
      const asset = assets.get(destname)
      const { source, permissions } = asset
      t.equal(2, assets.size, 'assets.size')
      t.ok(Buffer.isBuffer(source), 'asset.source is buffer')
      t.equal('number', typeof permissions, 'asset.permissions is number')
      t.end()
    })
  })
})

test('compiler.compile(callback, opts) - with debug', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out.debug.compiled.js'
  const compiler = new Compiler()

  compiler.target(filename).ready(() => {
    compiler.compile({ debug: true }, (err, objects, assets) => {
      t.ok(assets instanceof Map, 'assets')
      const asset = assets.get(destname)
      const { source, permissions } = asset
      t.equal(1, assets.size, 'assets.size')
      t.ok(Buffer.isBuffer(source), 'asset.source is buffer')
      t.equal('number', typeof permissions, 'asset.permissions is number')
      t.end()
    })
  })
})

test('compiler.compile(opts, callback) - custom storage', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out'
  const compiler = new Compiler()
  const storage = ram()

  compiler.target(filename).ready(() => {
    compiler.compile({ storage: () => storage }, (err, objects) => {
      t.error(err, 'callback(err = null)')
      const buffer = objects.get(destname)
      t.ok(0 === Buffer.compare(storage.toBuffer(), buffer))
      t.end()
    })
  })
})

test('compiler.compile(opts, callback) - custom cwd', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out'
  const compiler = new Compiler({ cwd: path.join(__dirname, 'fixtures') })
  const storage = ram()

  compiler.target(filename).ready(() => {
    compiler.compile((err, objects) => {
      t.error(err, 'callback(err = null)')
      t.equal(1, objects.size, 'objects.size')
      t.equal(true, objects.has('simple.js.out'), 'simple.js.out')
      t.end()
    })
  })
})

test('compiler.compile(opts, callback) - custom output', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out'
  const compiler = new Compiler()
  const storage = ram()

  compiler
    .target(filename, { output: path.join(__dirname, 'fixtures', 'build', 'simple.js') })
    .ready(() => {
      compiler.compile((err, objects) => {
        t.error(err, 'callback(err = null)')
        t.equal(1, objects.size, 'objects.size')
        t.equal(true,
          objects.has(path.join('test', 'fixtures', 'build', 'simple.js')), 'simple.js')
        t.end()
      })
    })
})

test('compiler.compile(opts, callback) - bad output', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const compiler = new Compiler()

  compiler.target(filename, { output: {} }).ready(() => {
    compiler.compile((err) => {
      t.ok(err)
      t.end()
    })
  })
})
