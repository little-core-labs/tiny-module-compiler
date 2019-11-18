const path = require('path')
const test = require('tape')
const ram = require('random-access-memory')

const { compile, archive, unpack } = require('../')

test('unpack(target, callback)', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const target = filename + '.a'
  const cwd = process.cwd()
  compile(filename, (err, objects) => {
    archive(target, objects, (err) => {
      unpack(target, (err, entries) => {
        t.error(err)
        t.ok(Array.isArray(entries), 'entries')
        t.equal(entries.length, 1, 'entries.length')
        t.equal(entries[0].filename,
          filename.replace(cwd + path.sep, '') + '.out')
        t.end()
      })
    })
  })
})

test('unpack(target, callback) - from storage', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const storage = ram()
  const target = filename + '.a'
  const cwd = process.cwd()
  compile(filename, { storag: ram }, (err, objects) => {
    archive(target, objects, { storage }, (err) => {
      unpack(storage, { storage: ram }, (err, entries) => {
        t.error(err)
        t.ok(Array.isArray(entries), 'entries')
        t.equal(entries.length, 1, 'entries.length')
        t.equal(entries[0].filename,
          filename.replace(cwd + path.sep, '') + '.out')
        t.end()
      })
    })
  })
})
