const path = require('path')
const test = require('tape')

const { compile } = require('../compile')

test('compile(target, callback)', (t) => {
  const target = path.join(__dirname, 'fixtures', '{with-assets,simple}.js')
  compile(target, (err, objects) => {
    t.error(err)
    t.equal(2, objects.size, 'objects.size')
    t.equal(true,
      objects.has(path.join('test', 'fixtures', 'simple.js.out')), 'simple.js.out')
    t.equal(true,
      objects.has(path.join('test', 'fixtures', 'with-assets.js.out')), 'simple.js.out')
    t.end()
  })
})

test('compile(target, opts, callback) - custom cwd', (t) => {
  const target = path.join(__dirname, 'fixtures', '{with-assets,simple}.js')
  compile(target, { cwd: path.join(__dirname, 'fixtures') }, (err, objects) => {
    t.error(err)
    t.equal(2, objects.size, 'objects.size')
    t.equal(true, objects.has('simple.js.out'), 'simple.js.out')
    t.equal(true, objects.has('with-assets.js.out'), 'simple.js.out')
    t.end()
  })
})

test('compile(target, opts, callback) - custom output', (t) => {
  return t.end()
  const target = path.join(__dirname, 'fixtures', '{with-assets,simple}.js')
  compile(target, { output: path.join(__dirname, 'fixtures', 'build') }, (err, objects) => {
    t.error(err)
    console.log(objects)
    t.equal(2, objects.size, 'objects.size')
    //t.equal(true, objects.has('simple.js.out'), 'simple.js.out')
    //t.equal(true, objects.has('with-assets.js.out'), 'simple.js.out')
    t.end()
  })
})
