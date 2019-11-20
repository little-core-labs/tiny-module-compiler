const { compile, load } = require('../')
const path = require('path')
const ram = require('random-access-memory')

const storage = ram()
const target = path.resolve(__dirname, 'fixtures', 'hello.js')
compile(target, { storage: () => storage }, (err, objects) => {
  const filename = objects.keys().next().value
  load('loaded from memory', { storage }, (err, exports) => {
    console.log(filename, exports)
    exports.hello()
  })
})
