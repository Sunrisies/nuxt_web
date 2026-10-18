import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { createHash, randomUUID } from 'node:crypto'
import vm from 'node:vm'

const source = stripTypeScriptTypes((await readFile(new URL('../server/utils/public-content.ts', import.meta.url), 'utf8')).replace(/^import .*$/gm, '').replace(/export /g, ''), { mode: 'transform' })
let revision = `${randomUUID()}:1`
let unavailable = false
let calls = 0
function instance() {
  const cache = new Map()
  const context = vm.createContext({
    createHash, randomUUID,
    backendBase: () => 'http://local-backend/api',
    backendData: async (_event, path) => { assert.equal(path, '/v1/posts/content-version'); calls++; if (unavailable) throw new Error('Backend unavailable'); return revision },
    useStorage: () => ({ getItem: async key => cache.get(key), setItem: async (key, value) => cache.set(key, value), getKeys: async prefix => [...cache.keys()].filter(key => key.startsWith(prefix)), removeItem: async key => cache.delete(key) }),
    defineCachedFunction: (_fn, options) => (...args) => options.getKey(...args),
    createError: details => Object.assign(new Error(details.statusMessage), details),
  })
  vm.runInContext(source + '\nglobalThis.api = { publicPosts, publicTags }', context)
  return { api: context.api, cache }
}
const first = instance()
const second = instance()
const event = () => ({ context: {} })
const request = event()
const oldKey = await first.api.publicPosts(request, { page: 1, limit: 12 })
await first.api.publicTags(request)
assert.equal(calls, 1, 'A request should read authoritative revision only once')
assert.equal(await first.api.publicPosts(event(), { page: 1, limit: 12 }), oldKey)
const secondOldKey = await second.api.publicPosts(event(), { page: 1, limit: 12 })
first.cache.set('blog:article:old', 'old cached article')
revision = `${revision.split(':')[0]}:2`
assert.notEqual(await first.api.publicPosts(event(), { page: 1, limit: 12 }), oldKey)
assert.equal(first.cache.has('blog:article:old'), false)
assert.notEqual(await second.api.publicPosts(event(), { page: 1, limit: 12 }), secondOldKey, 'Independent instances must see the database revision')
unavailable = true
await assert.rejects(first.api.publicPosts(event(), { page: 1, limit: 12 }), /Backend unavailable/, 'Cannot serve a cached key when authority is unavailable')
unavailable = false
revision = 'invalid'
await assert.rejects(first.api.publicPosts(event(), { page: 1, limit: 12 }), error => error.statusCode === 502)
console.log('Passed: authoritative cache version, request memoization, independent instances, stale-key cleanup and fail-closed authority errors')
