const { compile, load } = require('../')
const path = require('path')

const target = path.resolve(__dirname, 'fixtures', 'module', 'hello.js')
compile(target, (err, objects) => {
  const filename = objects.keys().next().value
  load(filename, (err, exports) => {
    console.log(filename, exports)
    exports.hello()
  })
})
