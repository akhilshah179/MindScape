// Per-key async mutex. Serialises read-modify-write sequences for the same key
// (a user's profile, a contest) within this process. Cross-process safety comes from
// DynamoDB conditional writes in the callers.
const chains = new Map()

export async function withLock(key, fn) {
  const prev = chains.get(key) || Promise.resolve()
  let release
  const current = new Promise(r => { release = r })
  const tail = prev.then(() => current)
  chains.set(key, tail)
  await prev
  try {
    return await fn()
  } finally {
    release()
    if (chains.get(key) === tail) chains.delete(key)
  }
}
