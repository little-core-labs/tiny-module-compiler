const test = require('tape')

const tmc = require('../')

test('tmc = require("tiny-module-compiler")', (t) => {
  t.equal('object', tmc && typeof tmc, 'exports')
  t.equal('function', typeof tmc.archive, 'tmc.archive')
  t.equal('function', typeof tmc.compile, 'tmc.compile')
  t.equal('function', typeof tmc.load, 'tmc.load')
  t.end()
})
