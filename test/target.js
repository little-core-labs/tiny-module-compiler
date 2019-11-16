const path = require('path')
const test = require('tape')
const raf = require('random-access-file')
const fs = require('fs')

const { Target } = require('../target')

test('target = new Target(filename)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const target = new Target(filename)

  t.equal(filename, target.filename, 'target.filename')
  t.ok(target.storage && 'object' === typeof target.storage, 'target.storage')
  t.equal(null, target.fd, 'target.fd')
  t.equal(false, target.opened, 'target.opened')
  t.equal(false, target.closed, 'target.closed')

  t.end()
})

test('target = new Target(filename, opts) - storage factory', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const target = new Target(filename, {
    storage(file) {
      t.equal(filename, file, 'storage(filename)')
    }
  })

  t.plan(1)
  t.end()
})

test('target = new Target(filename, opts) - storage instance', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const storage = raf(filename)
  const target = new Target(filename, { storage })
  t.equal(storage, target.storage, 'target.storage')
  t.end()
})

test('target.open(callback)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const target = new Target(filename)

  target.open((err) => {
    t.error(err, 'callback(err = null)')
    t.equal(true, target.opened, 'target.opened')
    t.equal('number', typeof target.fd, 'target.fd')
    t.end()
  })
})

test('target.close(callback)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const target = new Target(filename)

  target.open((err) => {
    target.close((err) => {
      t.error(err, 'callback(err = null)')
      t.equal(true, target.closed, 'target.closed')
      t.end()
    })
  })
})

test('target.stat(callback)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const target = new Target(filename)

  target.open((err) => {
    fs.stat(filename, (err, stats) => {
      const { size } = stats
      target.stat((err, stats) => {
        t.error(err, 'callback(err = null)')
        t.ok(!err && stats && 'object' === typeof stats, 'stats')
        t.equal(size, stats.size, 'stats.size')
        target.close((err) => {
          t.end()
        })
      })
    })
  })
})

test('target.ready(callback)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const target = new Target(filename)

  target.ready(() => {
    t.pass('callback()')
    t.equal(true, target.opened, 'target.opened')
    target.close((err) => {
      t.end()
    })
  })
})

test('target.read(offset, size, callback)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const target = new Target(filename)
  const buffer = Buffer.alloc(4)
  const fd = fs.openSync(filename)

  target.ready(() => {
    fs.read(fd, buffer, 0, 4, 0, (err) => {
      target.read(0, 4, (err, buf) => {
        t.error(err, 'callback(err = null)')
        t.equal(0, Buffer.compare(buf, buffer), 'buffer')
        fs.closeSync(fd)
        target.close((err) => {
          t.end()
        })
      })
    })
  })
})
