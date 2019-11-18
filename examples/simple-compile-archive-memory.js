const { compile, archive } = require('../')
const messages = require('../messages')
const TinyBox = require('tinybox')
const path = require('path')
const ram = require('random-access-memory')

const filename = path.resolve(__dirname, 'fixtures', 'hello.js')
const target = filename + '.a'
const storages = {
  object: ram(),
  archive: ram()
}

compile(filename, { storage: () => storages.object }, (err, objects) => {
  archive(target, objects, { storage: storages.archive }, (err) => {
    const ar = new TinyBox(storages.archive)
    ar.get('index', (err, result) => {
      const index = messages.Archive.Index.decode(result.value)
      console.log(index)
    })
  })
})
