const test = require('tape')

const magic = require('../magic')

test('magic.TMCO', (t) => {
  t.equal(true, Buffer.isBuffer(magic.TMCO), 'isBuffer(TMCO)')
  t.equal(4, magic.TMCO.length, 'TMCO.length')

  t.end()
})
