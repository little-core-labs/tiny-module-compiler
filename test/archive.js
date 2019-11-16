const TinyBox = require('tinybox')
const path = require('path')
const test = require('tape')
const ram = require('random-access-memory')
const fs = require('fs')

const { compile, archive } = require('../')

test('archive(target, objects, callback)', (t) => {
  const source = path.join(__dirname, 'fixtures', '{with-assets,simple}.js')
  const target = path.join(__dirname, 'fixtures', 'with-assets+simple.a')
  compile(source, { storage: ram },(err, objects) => {
    archive(target, objects, (err) => {
      t.error(err, 'callback(err)')
      fs.access(target, (err) => {
        t.pass('')
        t.end()
      })
    })
  })
})

test('archive(target, objects, callback) - custom storage', (t) => {
  const storage = ram()
  const source = path.join(__dirname, 'fixtures', '{with-assets,simple}.js')
  const box = new TinyBox(storage)
  compile(source, { storage: ram }, (err, objects) => {
    archive('<virtual>', objects, { storage }, (err) => {
      t.error(err)
      box.get('index', (err, result) => {
        t.ok(result, 'index')
        t.end()
      })
    })
  })
})
