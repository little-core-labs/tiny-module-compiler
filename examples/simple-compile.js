const { compile } = require('../')

compile(__filename, (err, objects) => {
  console.log(objects)
})
