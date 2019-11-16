const TinyBox = require('tinybox')
const path = require('path')
const test = require('tape')
const ram = require('random-access-memory')
const raf = require('random-access-file')

const { Compiler } = require('../compiler')
const { Archiver } = require('../archiver')
const messages = require('../messages')

test('archiver = new Archiver()', (t) => {
  const archiver = new Archiver()
  t.equal('function', typeof archiver.storage, 'archiver.storage')
  t.end()
})

test('archiver = new Archiver(opts) - custom storage', (t) => {
  const storage = ram
  const archiver = new Archiver({ storage })
  t.equal(ram, archiver.storage, 'archiver.storage')
  t.end()
})

test('archiver.ready(callback)', (t) => {
  const archiver = new Archiver()
  archiver.ready(() => {
    t.pass('callback()')
    t.end()
  })
})

test('archiver.archive(filename, objects, callback)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out'
  const archiver = new Archiver()
  const compiler = new Compiler()
  const box = new TinyBox(filename + '.a')

  archiver.ready(() => {
    compiler.target(filename)
    compiler.compile((err, objects) => {
      archiver.archive(filename + '.a', objects, (err) => {
        t.error(err)

        box.get('versions', (err, result) => {
          const versions = messages.Versions.decode(result.value)

          t.equal(process.versions.v8, versions.v8, 'versions.v8')
          t.equal(process.versions.uv, versions.uv, 'versions.uv')
          t.equal(process.versions.node, versions.node, 'versions.node')

          box.get('index', (err, result) => {
            const index = messages.Archive.Index.decode(result.value)

            t.equal(1, index.size, 'index.size')
            t.ok(Array.isArray(index.entries), 'index.entries')
            t.equal(1, index.entries.length, 'index.entries.length')

            const entry = index.entries[0]
            t.equal('number', !isNaN(entry.id) && typeof entry.id, 'entry.id')
            t.equal(destname, entry.filename)
            t.end()
          })
        })
      })
    })
  })
})

test('archiver.archive(filename, objects, callback) - from paths', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out'
  const archiver = new Archiver()
  const compiler = new Compiler()
  const box = new TinyBox(filename + '.a')

  archiver.ready(() => {
    compiler.target(filename)
    compiler.compile((err, objects) => {
      archiver.archive(filename + '.a', Array.from(objects.keys()), (err) => {
        t.error(err)
        box.get('index', (err, result) => {
          const index = messages.Archive.Index.decode(result.value)
          const entry = index.entries[0]

          t.equal(destname, entry.filename)
          t.end()
        })
      })
    })
  })
})

test('archiver.archive(filename, objects, callback) - from storages', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out'
  const archiver = new Archiver()
  const compiler = new Compiler()
  const box = new TinyBox(filename + '.a')

  archiver.ready(() => {
    compiler.target(filename)
    compiler.compile((err, objects) => {
      objects = Array.from(objects.entries()).map((entry) => [
        entry[0],
        ram(entry[1])
      ])

      archiver.archive(filename + '.a', objects, (err) => {
        t.error(err)
        box.get('index', (err, result) => {
          const index = messages.Archive.Index.decode(result.value)
          const entry = index.entries[0]

          t.equal(destname, entry.filename)
          t.end()
        })
      })
    })
  })
})

test('archiver.archive(filename, objects, callback) - from custom storage', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out'
  const archiver = new Archiver()
  const compiler = new Compiler()
  const storage = ram()
  const box = new TinyBox(storage)

  archiver.ready(() => {
    compiler.target(filename)
    compiler.compile((err, objects) => {
      archiver.archive(filename + '.a', objects, { storage }, (err) => {
        t.error(err)

        box.get('versions', (err, result) => {
          const versions = messages.Versions.decode(result.value)

          t.equal(process.versions.v8, versions.v8, 'versions.v8')
          t.equal(process.versions.uv, versions.uv, 'versions.uv')
          t.equal(process.versions.node, versions.node, 'versions.node')

          box.get('index', (err, result) => {
            const index = messages.Archive.Index.decode(result.value)

            t.equal(1, index.size, 'index.size')
            t.ok(Array.isArray(index.entries), 'index.entries')
            t.equal(1, index.entries.length, 'index.entries.length')

            const entry = index.entries[0]
            t.equal('number', !isNaN(entry.id) && typeof entry.id, 'entry.id')
            t.equal(destname, entry.filename)
            t.end()
          })
        })
      })
    })
  })
})
