const { compile, archive, unpack } = require('../')

const messages = require('../messages')
const path = require('path')
const ram = require('random-access-memory')

const filename = path.resolve(__dirname, 'fixtures', 'hello.js')

compile(filename, { storage: ram }, (err, objects) => {
  const storage = ram()
  archive('<virtual>', objects, { storage }, (err) => {
    const entry = ram()
    unpack(storage, { storage: () => entry }, (err, entries) => {
      console.log(err, entries)
      console.log(storage)
    })
  })
})
