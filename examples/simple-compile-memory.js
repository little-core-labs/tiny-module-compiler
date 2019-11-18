const { compile } = require('../')
const ram = require('random-access-memory')

const storage = ram()
compile(__filename, { storage: () => storage }, (err, objects) => {
  console.log(objects)
})
