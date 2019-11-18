const { compile, archive, unpack } = require('../')

const messages = require('../messages')
const path = require('path')

const filename = path.resolve(__dirname, 'fixtures', 'hello.js')
const target = filename + '.a'

compile(filename, (err, objects) => {
  archive(target, objects, (err) => {
    unpack(target, (err, entries) => {
      console.log(err, entries)
    })
  })
})
