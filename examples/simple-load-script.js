const { load } = require('../')
const path = require('path')

const target = path.resolve(__dirname, 'fixtures', 'hello.js')
load(target, (err, exports) => {
  exports.hello()
})
