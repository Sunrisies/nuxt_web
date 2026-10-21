import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { execFileSync } from 'node:child_process'

const directory = process.env.LOCAL_DEPLOY_DIR || join(homedir(), 'Desktop/project/local-acceptance')
const base = 'http://127.0.0.1:39158'
const env = Object.fromEntries((await readFile(join(directory, '.env'), 'utf8')).split('\n').filter(line => line.includes('=')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)] }))
assert.equal(new URL(env.NUXT_API_BASE).hostname, '127.0.0.1', 'Only isolated loopback deployments may be tested')
assert.equal(new URL(env.DATABASE_URL).pathname, '/server_acceptance')
const result = { time: new Date().toISOString(), base, runtimeHeap: env.NODE_OPTIONS || 'Node default', functional: {}, load: [] }
let cookie = ''
async function request(path, method = 'GET', body, authenticated = false, headers = {}) {
  const response = await fetch(base + path, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(authenticated ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) })
  const text = await response.text()
  let data; try { data = JSON.parse(text) } catch { data = text }
  return { status: response.status, data, headers: response.headers }
}
async function expect(path, method, body, status, authenticated = true) {
  const response = await request(path, method, body, authenticated)
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(response.data)}`)
  return response.data
}
await expect('/api/ready', 'GET', undefined, 200, false)
const archiveIds = []
let archiveTotal = 0
for (let page = 1; ; page++) {
  const list = (await expect(`/api/public/posts?page=${page}&limit=100`, 'GET', undefined, 200, false)).data
  archiveTotal = list.pagination.total
  archiveIds.push(...list.data.map(post => post.uuid))
  if (page * 100 >= archiveTotal) break
}
assert.equal(archiveIds.length, archiveTotal)
assert.equal(new Set(archiveIds).size, archiveTotal, 'Equal timestamps must not duplicate or omit articles')
result.functional.completePagination = { total: archiveTotal, unique: new Set(archiveIds).size }
const adjacent = (await expect('/api/public/articles/00000000-0000-4000-8000-000000000200', 'GET', undefined, 200, false)).data.neighbors
assert.equal(adjacent.prev.uuid, '00000000-0000-4000-8000-000000000199')
assert.equal(adjacent.next.uuid, '00000000-0000-4000-8000-000000000201')
result.functional.equalTimestampNeighbors = true
const login = await request('/api/v1/auth/login', 'POST', { login_type: 'password', account: 'local_admin', password: env.LOCAL_ADMIN_PASSWORD })
assert.equal(login.status, 200, 'Real password login must work')
cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).find(value => value.startsWith('access_token='))
assert(cookie)
result.functional.passwordLogin = true
const session = await expect('/api/auth/session', 'GET', undefined, 200)
assert.deepEqual(Object.keys(session.data).sort(), ['id', 'user_name', 'uuid'])
result.functional.sessionSanitized = true
async function uploadDrop(name, type, content, authenticated = false) {
  const form = new FormData()
  form.append('file', new Blob([content], { type }), name)
  const response = await fetch(`${base}/api/v1/drop/file`, {
    method: 'POST',
    headers: authenticated ? { cookie } : {},
    body: form,
    signal: AbortSignal.timeout(15000),
  })
  const body = await response.json()
  return { status: response.status, data: body.data, response }
}
const anonymousText = await uploadDrop('anonymous-note.txt', 'text/plain', 'anonymous text delivery')
assert.equal(anonymousText.status, 200)
assert.match(anonymousText.data.code, /^\d{8}$/)
const anonymousMedia = await uploadDrop('private-image.png', 'image/png', Uint8Array.from([137, 80, 78, 71]), false)
assert.equal(anonymousMedia.status, 415, 'Anonymous uploads must reject images')
for (const [name, type, content] of [
  ['logged-in-image.png', 'image/png', Uint8Array.from([137, 80, 78, 71])],
  ['logged-in-audio.mp3', 'audio/mpeg', Uint8Array.from([73, 68, 51])],
  ['logged-in-video.mp4', 'video/mp4', Uint8Array.from([0, 0, 0, 24, 102, 116, 121, 112])],
]) {
  const uploaded = await uploadDrop(name, type, content, true)
  assert.equal(uploaded.status, 200, `Authenticated ${type} upload must succeed`)
  assert.match(uploaded.data.code, /^\d{8}$/)
  const downloaded = await fetch(`${base}/api/v1/drop/${uploaded.data.code}`)
  assert.equal(downloaded.status, 200)
  assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()), new Uint8Array(content))
}
result.functional.anonymousTextAndAuthenticatedMediaDrops = { anonymousTextCode: anonymousText.data.code.length, authenticatedMediaTypes: ['image/png', 'audio/mpeg', 'video/mp4'], anonymousMediaRejected: true }
const directApi = env.NUXT_API_BASE.replace(/\/api\/?$/, '')
const pickupAttempts = []
for (let attempt = 0; attempt < 31; attempt++) {
  const response = await fetch(`${directApi}/api/v1/drop/00000000`, {
    headers: { 'x-forwarded-for': '203.0.113.207' },
    signal: AbortSignal.timeout(15000),
  })
  pickupAttempts.push(response.status)
  await response.arrayBuffer()
}
assert.equal(pickupAttempts.filter(status => status === 404).length, 30)
assert.equal(pickupAttempts.at(-1), 429, 'Pickup code guesses must be throttled')
result.functional.pickupBruteForceLimit = { attempts: pickupAttempts.length, blocked: true }
const stamp = Date.now()
const category = (await expect('/api/v1/categories', 'POST', { name: `验收分类${stamp}` }, 200)).data
const tag = (await expect('/api/v1/tags', 'POST', { name: `验收标签${stamp}` }, 200)).data
const post = (await expect('/api/v1/posts', 'POST', { title: `验收文章${stamp}`, content: '<p>HTML source</p>', markdowncontent: '## Markdown source\n\nLocal acceptance', category_id: category.id, tag_ids: [tag.id], status: 0, featured: false }, 200)).data
await expect(`/api/public/articles/${post.uuid}`, 'GET', undefined, 404, false)
const detail = (await expect(`/api/v1/posts/${post.uuid}`, 'GET', undefined, 200)).data
assert.equal(detail.htmlcontent, '<p>HTML source</p>')
assert.equal(detail.markdowncontent, '## Markdown source\n\nLocal acceptance')
await expect(`/api/v1/posts/${post.uuid}`, 'PUT', { title: `已发布${stamp}`, status: 1, featured: true }, 200)
await expect(`/api/public/articles/${post.uuid}`, 'GET', undefined, 200, false)
await expect(`/api/v1/categories/${category.id}`, 'DELETE', undefined, 409)
result.functional.articleCrudAndDraftIsolation = true
const viewRounds = []
for (let round = 0; round < 5; round++) {
  const responses = await Promise.all(Array.from({ length: 40 }, () => request(`/api/v1/posts/${post.uuid}/view`, 'POST')))
  assert(responses.every(response => response.status === 200), 'All duplicate concurrent views must succeed')
  viewRounds.push({ requests: 40, successful: 40 })
}
const viewed = (await expect(`/api/v1/posts/${post.uuid}`, 'GET', undefined, 200)).data
assert.equal(viewed.views, 200, 'Every article opening must increment the view count, including same-IP repeat visits')
result.functional.concurrentViews = { rounds: viewRounds, finalCount: viewed.views }
const uniqueViewLatencies = []
for (let round = 0; round < 5; round++) {
  const statuses = await Promise.all(Array.from({ length: 40 }, async (_, i) => {
    const before = performance.now()
    const response = await fetch(`${env.NUXT_API_BASE}/v1/posts/${post.uuid}/view`, { method: 'POST', headers: { 'x-forwarded-for': `198.51.100.${round * 40 + i + 1}` }, signal: AbortSignal.timeout(15000) })
    await response.text(); uniqueViewLatencies.push(performance.now() - before); return response.status
  }))
  assert(statuses.every(status => status === 200), 'Distinct concurrent views must succeed')
}
const uniqueViewed = (await expect(`/api/v1/posts/${post.uuid}`, 'GET', undefined, 200)).data
assert.equal(uniqueViewed.views, 400, 'Distinct concurrent visitors must not lose increments')
uniqueViewLatencies.sort((a, b) => a - b)
result.functional.distinctConcurrentViews = { requests: 200, successful: 200, finalCount: uniqueViewed.views, p95ms: Math.round(uniqueViewLatencies[Math.ceil(uniqueViewLatencies.length * .95) - 1]) }
await expect(`/api/v1/posts/${post.uuid}`, 'DELETE', undefined, 200)
await expect(`/api/v1/tags/${tag.id}`, 'DELETE', undefined, 200)
await expect(`/api/v1/categories/${category.id}`, 'DELETE', undefined, 200)
const link = (await expect('/api/v1/links', 'POST', { name: `验收链接${stamp}`, url: 'https://example.invalid/local', category: '本地验收', icon: 'https://example.invalid/icon.png', tags: [] }, 200)).data
await expect(`/api/v1/links/${link.id}`, 'PUT', { name: `已更新${stamp}`, url: 'https://example.invalid/updated', category: '本地验收', icon_url: 'https://example.invalid/updated.png', tags: [] }, 200)
await expect(`/api/v1/links/${link.id}`, 'DELETE', undefined, 200)
result.functional.taxonomyAndLinkCrud = true
const foreign = await request('/api/auth/logout', 'POST', undefined, true, { origin: 'https://foreign.invalid' })
assert.equal(foreign.status, 403)
const logout = await expect('/api/auth/logout', 'POST', undefined, 200)
assert.equal(logout.data.revoked, true)
await expect('/api/auth/session', 'GET', undefined, 401)
result.functional.logoutRevokesCopiedCookie = true

if (process.env.LOCAL_FUNCTIONAL_ONLY === '1') { console.log('Local functional acceptance passed'); process.exit(0) }

const routes = ['/', '/blog/1', '/tag/Nuxt', '/timeline', '/archives', '/article/00000000-0000-4000-8000-000000000001', '/api/public/posts?page=1&limit=12']
for (const path of routes) await expect(path, 'GET', undefined, 200, false)
const processIds = JSON.parse(await readFile(join(directory, 'pids.json'), 'utf8'))
function resources() {
  const snapshot = {}
  for (const [name, pid] of Object.entries(processIds)) {
    try {
      const [rss, cpu] = execFileSync('ps', ['-p', String(pid), '-o', 'rss=', '-o', '%cpu='], { encoding: 'utf8' }).trim().split(/\s+/).map(Number)
      snapshot[name] = { rssMiB: +(rss / 1024).toFixed(1), cpuPercent: cpu }
    } catch { snapshot[name] = { unavailable: true } }
  }
  return snapshot
}
result.resourcesBeforeLoad = resources()
for (const { concurrency, seconds, phase } of [1, 10, 30, 60].map(concurrency => ({ concurrency, seconds: 8, phase: 'ramp' })).concat([{ concurrency: 30, seconds: 120, phase: 'sustained' }])) {
  const latencies = []; const statuses = {}; const errorDetails = []; let failures = 0; let bytes = 0; let counter = 0
  const started = performance.now(); const deadline = started + seconds * 1000
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (performance.now() < deadline && failures < 20) {
      const path = routes[counter++ % routes.length]; const before = performance.now()
      try {
        const response = await fetch(base + path, { signal: AbortSignal.timeout(10000) })
        const body = await response.arrayBuffer(); bytes += body.byteLength
        statuses[response.status] = (statuses[response.status] || 0) + 1
        if (response.status !== 200) {
          failures++
          if (errorDetails.length < 20) errorDetails.push({ path, status: response.status, body: new TextDecoder().decode(body.slice(0, 500)) })
        }
      } catch (error) {
        failures++; statuses.network = (statuses.network || 0) + 1
        if (errorDetails.length < 20) errorDetails.push({ path, error: String(error) })
      }
      latencies.push(performance.now() - before)
    }
  }))
  latencies.sort((a, b) => a - b)
  const elapsed = performance.now() - started
  const percentile = p => Math.round(latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * p) - 1)])
  const row = { phase, concurrency, requests: latencies.length, durationSeconds: +(elapsed / 1000).toFixed(2), rps: +(latencies.length / (elapsed / 1000)).toFixed(1), p50ms: percentile(.5), p95ms: percentile(.95), p99ms: percentile(.99), failures, statuses, errorDetails, bytes }
  row.resourcesAfter = resources(); result.load.push(row); console.log(JSON.stringify(row))
  if (failures) {
    await writeFile(join(directory, 'results/http-and-load-failed.json'), JSON.stringify(result, null, 2))
    throw new Error('Pressure stage failed; stopped before sending further load')
  }
}
const attempts = await Promise.all(Array.from({ length: 40 }, (_, i) => request('/api/v1/auth/login', 'POST', { login_type: 'password', account: `nonexistent_${stamp}`, password: 'invalid-password' }, false, { 'x-forwarded-for': `198.51.100.${i + 1}` })))
const counts = attempts.reduce((counts, response) => { counts[response.status] = (counts[response.status] || 0) + 1; return counts }, {})
assert.equal(counts[404], 10, 'Account quota must atomically admit exactly 10 attempts')
assert.equal(counts[429], 30)
assert(attempts.filter(r => r.status === 429).every(r => r.headers.get('retry-after') === '300'))
result.functional.loginRateLimit = counts
await mkdir(join(directory, 'results'), { recursive: true })
await writeFile(join(directory, 'results/http-and-load.json'), JSON.stringify(result, null, 2))
console.log('Local functional acceptance passed; report saved.')
assert(result.load.every(row => row.failures === 0), 'Pressure test had failed requests')
