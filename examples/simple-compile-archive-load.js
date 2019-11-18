const { compile, archive, load } = require('../')
const path = require('path')

const filenames = path.resolve(__dirname, 'fixtures', 'module', '*.js')
compile(filenames, (err, objects) => {
  const names = [ ...objects.keys() ].map((name) => path.basename(name))
  const target = names.join('+') + '.a'
  archive(target, objects, (err) => {
    load(target, (err, ar) => {
      console.log(ar)
    })
  })
})
