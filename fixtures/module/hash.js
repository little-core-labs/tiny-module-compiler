const sodium = require('sodium-universal')
exports.hash = (input) => {
  const buffer = Buffer.alloc(sodium.crypto_generichash_BYTES)
  sodium.crypto_generichash(buffer, Buffer.from(input))
  return buffer
}
