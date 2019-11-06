const { compile, archive, load } = require('./')

compile('fixtures/module/*.js', (err, objects) => {
  if (err) { return onfatal(err) }

  archive('fixtures/module/module.a', objects, (err) => {
    if (err) { return onfatal(err) }
    load('fixtures/module/module.a', (err, ar) => {
      if (err) { return onfatal(err) }
    })
  })
})

function onfatal(err) {
  console.error(err.stack || err)
  process.exit(1)
}
