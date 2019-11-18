const { compile, archive, load } = require('../')
const path = require('path')
const ram = require('random-access-memory')

const filenames = path.resolve(__dirname, 'fixtures', 'module', '*.js')
const storages = { }

compile(filenames, { storage: (filename) => (storages[filename] = ram()) }, (err, objects) => {
  const names = [ ...objects.keys() ].map((name) => path.basename(name))
  const target = names.join('+') + '.a'
  archive(target, objects, { storage: (storages[target] = ram()) }, (err) => {
    load(target, { storage: storages[target] }, (err, ar) => {
      console.log(ar)
    })
  })
})
