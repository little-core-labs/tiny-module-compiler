const path = require('path')
const test = require('tape')

const { compile, import: _import } = require('../')

test('load(target, callback) - source module', async (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const { hello } = await _import(filename)
  t.equal('function', typeof hello, 'hello')
  t.equal('hello', hello(), 'hello()')
})

test('load(target, callback) - compiled module', async (t) => {
  const filename = path.resolve(__dirname, 'fixtures', 'simple.js')
  const destname = filename.replace(process.cwd() + path.sep, '') + '.out'

  await new Promise((resolve, reject) => compile(filename, (err) => {
    if (err) { return reject(err) }
    resolve()
  }))

  const { hello } = await _import(destname)

  t.equal('function', typeof hello, 'hello')
  t.equal('hello', hello(), 'hello()')
})
