const path = require('path')
const test = require('tape')
const ram = require('random-access-memory')

const { compile, archive, load } = require('../')

test('load(target, callback) - source module', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  load(filename, (err, exports) => {
    t.error(err)
    t.equal('object', exports && typeof exports, 'exports')
    t.equal('function', typeof exports.hello, 'exports.hello')
    t.equal('hello', exports.hello(), 'exports.hello()')
    t.end()
  })
})

test('load(target, callback) - compiled module', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out'
  compile(filename, (err) => {
    load(destname, (err, exports) => {
      t.error(err)
      t.equal('object', exports && typeof exports, 'exports')
      t.equal('function', typeof exports.hello, 'exports.hello')
      t.equal('hello', exports.hello(), 'exports.hello()')
      t.end()
    })
  })
})

test('load(target, callback) - compiled module from storage', (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const storage = ram()
  compile(filename, { storage: () => storage }, (err) => {
    load('<virtual>', { storage }, (err, exports) => {
      t.error(err)
      t.equal('object', exports && typeof exports, 'exports')
      t.equal('function', typeof exports.hello, 'exports.hello')
      t.equal('hello', exports.hello(), 'exports.hello()')
      t.end()
    })
  })
})
