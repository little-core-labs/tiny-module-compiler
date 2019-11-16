const test = require('tape')

const magic = require('../magic')

test('magic.OBJECT_BYTES', (t) => {
  t.equal(true, Buffer.isBuffer(magic.OBJECT_BYTES), 'isBuffer(OBJECT_BYTES)')
  t.equal(4, magic.OBJECT_BYTES.length, 'OBJECT_BYTES.length')

  t.end()
})
