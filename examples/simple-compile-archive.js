const { compile, archive } = require('../')
const messages = require('../messages')
const TinyBox = require('tinybox')
const path = require('path')

const filename = path.resolve(__dirname, 'fixtures', 'module', 'hello.js')
const target = filename + '.a'

compile(filename, (err, objects) => {
  archive(target, objects, (err) => {
    const ar = new TinyBox(target)
    ar.get('index', (err, result) => {
      const index = messages.Archive.Index.decode(result.value)
      console.log(index)
    })
  })
})
