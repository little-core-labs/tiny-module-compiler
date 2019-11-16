const path = require('path')
const fs = require('fs')

const file = fs.readFileSync(path.resolve(__dirname, 'file'))

module.exports = {
  file
}
