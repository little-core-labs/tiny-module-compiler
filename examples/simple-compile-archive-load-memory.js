const { compile, archive, load } = require('../')
const path = require('path')
const ram = require('random-access-memory')

const filenames = path.resolve(__dirname, 'fixtures', '*.js')
const storages = {
  create(name) {
    return (storages[name] = ram())
  }
}

compile(filenames, { storage: storages.create }, (err, objects) => {
  const names = [ ...objects.keys() ].map((name) => path.basename(name))
  const target = names.join('+') + '.a'
  const storage = storages.create(target)
  archive(target, objects, { storage }, (err) => {
    load(target, { storage: storages[target] }, (err, ar) => {
      console.log(ar)
    })
  })
})
