import assert from "node:assert/strict"
import { createServer } from "node:http"
import { spawn } from "node:child_process"
import { mkdtemp, open, readFile } from "node:fs/promises"
import { tmpdir, networkInterfaces } from "node:os"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import { setTimeout as delay } from "node:timers/promises"

const directory = await mkdtemp(join(tmpdir(), "nuxt-performance-"))
const log = await open(join(directory, "server.log"), "w")
const requests = []
let contentVersion = 1
const payloadRequestCount = () => requests.filter(request => request.path !== "/api/v1/posts/content-version").length
let unavailable = false
let sessionRevoked = false
let articleTitle = "SSR 集成验证文章"
const code = Array.from({ length: 30 }, (_, i) => `const value${i} = ${i}`).join("\n")
const posts = Array.from({ length: 525 }, (_, i) => ({
  id: i + 1, uuid: `fixture-${i + 1}`, title: `${articleTitle} ${i + 1}`,
  cover: "/blog.webp", description: "受控数据，仅用于验证。", author: "测试作者",
  category: { id: i % 2 + 1, name: i % 2 ? "生活" : "技术" }, tags: [{ id: i % 3 + 1, name: i % 3 ? "其他" : "Nuxt" }],
  publish_time: "2026-10-10T09:00:00Z", is_top: false, is_hide: false, views: 10,
  content: `## 示例章节\n\n正文内容。\n\n\`\`\`js\n${code}\n\`\`\`\n\n## 第二章节\n\n更多内容。`
}))
const sessionToken = `fixture.${Buffer.from(JSON.stringify({ user_uuid: "fixture-user" })).toString("base64url")}.verified-by-fixture`
const categories = Array.from({ length: 205 }, (_, i) => ({ id: i + 1, name: i === 0 ? "技术" : `分类${i + 1}` }))
const backend = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost")
  requests.push({ method: req.method, path: url.pathname, query: url.search })
  res.setHeader("content-type", "application/json")
  if (unavailable) { res.statusCode = 503; res.end(JSON.stringify({ code: 503 })); return }
  let data
  if (url.pathname === "/api/v1/posts/content-version") {
    res.end(JSON.stringify({ code: 200, data: `00000000-0000-4000-8000-000000000001:${contentVersion}` })); return
  }
  if (url.pathname === "/api/v1/posts/fixture-2/prevnext") {
    res.end(JSON.stringify({ code: 200, data: { prevArticle: { uuid: "fixture-1", title: "Previous article" }, nextArticle: { uuid: "fixture-3", title: "Next article" } } })); return
  }
  if (url.pathname === "/api/v1/posts/fixture-1/view" && req.method === "POST") {
    res.end(JSON.stringify({ code: 200, data: { views: 11 } })); return
  }
  if (url.pathname === "/api/v1/auth/logout" && req.method === "POST") {
    if (req.headers.cookie === `access_token=${sessionToken}-legacyLogout`) {
      res.statusCode = 404; res.end(JSON.stringify({ code: 404 })); return
    }
    if (req.headers.cookie !== `access_token=${sessionToken}`) {
      res.statusCode = 401; res.end(JSON.stringify({ code: 401 })); return
    }
    sessionRevoked = true
    res.end(JSON.stringify({ code: 200, data: { revoked: true } })); return
  }
  if (url.pathname === "/api/v1/users/fixture-user") {
    if (req.headers.cookie === `access_token=${sessionToken}-business401`) {
      res.end(JSON.stringify({ code: 401, data: null })); return
    }
    if (req.headers.cookie === `access_token=${sessionToken}-badjson`) {
      res.end("not-json"); return
    }
    if (sessionRevoked || req.headers.cookie !== `access_token=${sessionToken}`) {
      res.statusCode = 401; res.end(JSON.stringify({ code: 401 })); return
    }
    res.end(JSON.stringify({ code: 200, data: { id: 1, uuid: "fixture-user", user_name: "测试用户", pass_word: "must-not-leak" } })); return
  }
  if (req.method !== "GET") {
    let body = ""
    for await (const chunk of req) body += chunk
    if (req.headers.authorization !== "Bearer fixture-admin") {
      res.statusCode = 401; res.end(JSON.stringify({ code: 401 })); return
    }
    assert.deepEqual(JSON.parse(body), { title: "更新后的文章" })
    articleTitle = "更新后的文章"
    contentVersion++
    posts[0].title = articleTitle
    data = posts[0]
  } else if (url.pathname === "/api/v1/posts") {
    const page = Number(url.searchParams.get("page")) || 1
    const limit = Number(url.searchParams.get("limit")) || 12
    const filtered = posts.filter(post => (!url.searchParams.has("category") || String(post.category.id) === url.searchParams.get("category"))
      && (!url.searchParams.has("tag") || post.tags.some(tag => String(tag.id) === url.searchParams.get("tag"))))
    data = { data: filtered.slice((page - 1) * limit, page * limit), pagination: { total: filtered.length, page, limit } }
  } else if (url.pathname === "/api/v1/tags/count") data = [{ id: 1, name: "Nuxt", count: posts.length }]
  else if (url.pathname === "/api/v1/categories") {
    const page = Number(url.searchParams.get("page")) || 1
    const limit = Number(url.searchParams.get("limit")) || 10
    data = { data: categories.slice((page - 1) * limit, page * limit), pagination: { total: categories.length, page, limit } }
  }
  else if (url.pathname === "/api/v1/posts/uploadTime") data = [["2026-10-10", 5]]
  else if (url.pathname.endsWith("/prevnext")) {
    if (url.pathname.includes("fixture-2/")) { res.statusCode = 404; res.end(JSON.stringify({ code: 404 })); return }
    data = { prev: null, next: { uuid: "fixture-2", title: posts[1].title } }
  }
  else if (url.pathname.startsWith("/api/v1/posts/")) {
    data = url.pathname.endsWith("/fixture-private")
      ? { ...posts[0], uuid: "fixture-private", title: "TOP-SECRET-DRAFT", is_publish: false }
      : posts.find(post => post.uuid === url.pathname.split("/").at(-1))
    if (!data) { res.statusCode = 404; res.end(JSON.stringify({ code: 404 })); return }
  } else { res.statusCode = 404; res.end(JSON.stringify({ code: 404 })); return }
  res.end(JSON.stringify({ code: 200, message: "ok", data }))
})
await new Promise(resolve => backend.listen(0, "127.0.0.1", resolve))
const reservation = createServer()
await new Promise(resolve => reservation.listen(0, "127.0.0.1", resolve))
const port = reservation.address().port
await new Promise(resolve => reservation.close(resolve))
const base = `http://127.0.0.1:${port}`
const child = spawn(process.execPath, [".output/server/index.mjs"], {
  env: { ...process.env, NODE_ENV: "production", HOST: "127.0.0.1", PORT: String(port), NITRO_HOST: "127.0.0.1", NITRO_PORT: String(port), NUXT_API_BASE: `http://fixture-backend.invalid:${backend.address().port}/api`, NUXT_API_RESOLVE_ADDRESS: "127.0.0.1", NUXT_API_NETWORK_INTERFACE: Object.entries(networkInterfaces()).find(([, addresses]) => addresses?.some(address => address.family === "IPv4" && address.address === "127.0.0.1"))?.[0] || "" },
  stdio: ["ignore", log.fd, log.fd]
})
const json = async path => {
  const response = await fetch(base + path)
  assert.equal(response.status, 200, `${path}: ${await response.clone().text()}`)
  return response.json()
}
try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error("Production server exited")
    if (await fetch(base + "/api/health").then(res => res.ok).catch(() => false)) { ready = true; break }
    await delay(100)
  }
  assert.ok(ready, "Production server did not start")
  assert.equal((await fetch(base + "/api/auth/session")).status, 401)
  const session = await fetch(base + "/api/auth/session", { headers: { cookie: `access_token=${sessionToken}` } })
  assert.equal(session.status, 200)
  assert.match(session.headers.get("cache-control"), /no-store/)
  assert.deepEqual((await session.json()).data, { id: 1, uuid: "fixture-user", user_name: "测试用户" })
  assert.equal((await fetch(base + "/api/auth/session", { headers: { cookie: `access_token=${sessionToken}-business401` } })).status, 401)
  assert.equal((await fetch(base + "/api/auth/session", { headers: { cookie: `access_token=${sessionToken}-badjson` } })).status, 502)
  const forged = sessionToken + "forged"
  assert.equal((await fetch(base + "/api/auth/session", { headers: { cookie: `access_token=${forged}` } })).status, 401)
  assert.equal((await fetch(base + "/api/auth/logout", { method: "POST", headers: { origin: "https://foreign.invalid" } })).status, 403)
  const logout = await fetch(base + "/api/auth/logout", { method: "POST", headers: { origin: base } })
  assert.equal(logout.status, 200)
  assert.match(logout.headers.get("set-cookie"), /access_token=;/)
  assert.match(logout.headers.get("set-cookie"), /HttpOnly/i)
  const legacyLogout = await fetch(base + "/api/auth/logout", { method: "POST", headers: { origin: base, cookie: `access_token=${sessionToken}-legacyLogout` } })
  assert.equal(legacyLogout.status, 200)
  assert.equal((await legacyLogout.json()).data.revoked, false)
  const revokedLogout = await fetch(base + "/api/auth/logout", { method: "POST", headers: { origin: base, cookie: `access_token=${sessionToken}` } })
  assert.equal(revokedLogout.status, 200)
  assert.equal((await revokedLogout.json()).data.revoked, true)
  assert.equal((await fetch(base + "/api/auth/session", { headers: { cookie: `access_token=${sessionToken}` } })).status, 401)
  const first = await json("/api/public/posts?page=1&limit=12")
  assert.equal(first.data.data.length, 12)
  assert.ok(first.data.data.every(post => !("content" in post)), "List must omit Markdown")
  const calls = payloadRequestCount()
  await json("/api/public/posts?page=1&limit=12")
  assert.equal(payloadRequestCount(), calls, "Repeated request must reuse cache")
  const article = await json("/api/public/articles/fixture-1")
  assert.ok(article.data.ast.body.children.length)
  assert.ok(!("content" in article.data.article))
  assert.ok(!requests.some(req => req.query.includes("limit=200")), "Article must not fetch 200 posts")
  const articleCalls = payloadRequestCount()
  await json("/api/public/articles/fixture-1")
  assert.equal(payloadRequestCount(), articleCalls, "Article and AST must reuse cache")
  const privateArticle = await fetch(base + "/api/public/articles/fixture-private")
  assert.equal(privateArticle.status, 502)
  assert.ok(!(await privateArticle.text()).includes("TOP-SECRET-DRAFT"))
  const counted = await fetch(base + "/api/v1/posts/fixture-1/view", { method: "POST" })
  assert.equal(counted.status, 200)
  const afterCounter = payloadRequestCount()
  await json("/api/public/articles/fixture-1")
  assert.equal(payloadRequestCount(), afterCounter, "View counters must not invalidate article AST cache")
  const html = await fetch(base + "/article/fixture-1").then(res => res.text())
  assert.match(html, /SSR 集成验证文章/)
  assert.match(html, /<pre[ >]/)
  assert.match(html, /展开剩余/)
  assert.ok(!html.includes("<ProsePre"), "Code component must resolve")
  assert.equal((await fetch(base + "/article/missing")).status, 404)
  assert.equal((await fetch(base + "/tag/missing")).status, 404)
  assert.equal((await fetch(base + "/blog/not-a-page")).status, 404)
  assert.equal((await fetch(base + "/api/public/posts?category=invalid")).status, 400)
  const filtered = await json("/api/public/posts?page=2&limit=9&category=1&tag=1")
  assert.equal(filtered.data.pagination.total, 88)
  assert.equal(filtered.data.data[0].uuid, "fixture-55")
  const filteredHtml = await fetch(base + "/blog/2?category=1&tag=1").then(res => res.text())
  assert.match(filteredHtml, /href="\/article\/fixture-55"/)
  assert.match(filteredHtml, /href="\/blog\/3\?category=1&amp;tag=1"/)
  assert.equal((await fetch(base + "/blog/1?category=invalid")).status, 404)
  const emptyHtml = await fetch(base + "/blog/1?category=99").then(res => res.text())
  assert.match(emptyHtml, /当前筛选条件下没有文章/)
  const nextTagPage = await json("/api/public/posts?page=2&limit=100&tag=1")
  assert.equal(nextTagPage.data.pagination.total, 175)
  assert.equal(nextTagPage.data.data.length, 75)
  assert.equal(nextTagPage.data.data[0].uuid, "fixture-301")
  assert.equal((await json("/api/public/categories")).data.length, 205, "Public category options must include every page")
  const archive = await json("/api/public/archives")
  assert.equal(archive.data.data.length, 525, "Archive must include all pages")
  const fallback = await json("/api/public/articles/fixture-2")
  assert.equal(fallback.data.neighbors.prev.uuid, "fixture-1")
  assert.equal(fallback.data.neighbors.next.uuid, "fixture-3")
  const sitemap = await json("/api/__sitemap__/urls")
  assert.equal(sitemap.filter(item => item.loc.startsWith("/article/")).length, 525)
  assert.ok(sitemap.some(item => item.loc === "/blog/59"))
  const foreignMutation = await fetch(base + "/api/v1/posts/fixture-1", { method: "PUT", body: JSON.stringify({ title: "更新后的文章" }), headers: { authorization: "Bearer fixture-admin", origin: "https://foreign.invalid", "content-type": "application/json" } })
  assert.equal(foreignMutation.status, 403)
  const denied = await fetch(base + "/api/v1/posts/fixture-1", { method: "PUT", body: JSON.stringify({ title: "更新后的文章" }), headers: { "content-type": "application/json" } })
  assert.equal(denied.status, 401, "Proxy must preserve backend authorization failure")
  const beforeDeniedRead = payloadRequestCount()
  await json("/api/public/articles/fixture-1")
  assert.equal(payloadRequestCount(), beforeDeniedRead, "Failed mutation must not invalidate cache")
  const edited = await fetch(base + "/api/v1/posts/fixture-1", { method: "PUT", body: JSON.stringify({ title: "更新后的文章" }), headers: { authorization: "Bearer fixture-admin", "content-type": "application/json" } })
  assert.equal(edited.status, 200)
  assert.equal((await json("/api/public/articles/fixture-1")).data.article.title, "更新后的文章", "Successful mutation must invalidate article cache")
  assert.equal((await json("/api/public/posts?page=1&limit=12")).data.data[0].title, "更新后的文章", "Successful mutation must invalidate list cache")
  const pages = []
  for (const path of ["/", "/blog/1", "/blog/2", "/tag/Nuxt", "/archives", "/timeline", "/article/fixture-1"]) {
    const response = await fetch(base + path)
    assert.equal(response.status, 200, path)
    const body = await response.text()
    const assets = [...new Set([...body.matchAll(/(?:href|src)="(\/_nuxt\/[^"?]+\.js)"/g)].map(match => match[1]))]
    const buffers = await Promise.all(assets.map(asset => readFile(join(".output/public", asset))))
    pages.push({ path, bytes: Buffer.byteLength(body), initialJsKiB: Math.round(buffers.reduce((sum, buffer) => sum + buffer.length, 0) / 102.4) / 10, gzipJsKiB: Math.round(buffers.reduce((sum, buffer) => sum + gzipSync(buffer).length, 0) / 102.4) / 10 })
    if (path === "/tag/Nuxt" || path === "/timeline") assert.ok(body.includes("加载更多"), "Long feeds must expose pagination")
    if (path === "/blog/2") assert.ok(body.includes("fixture-10"), "Page two must contain different posts")
  }
  const actualNeighbors = await json("/api/public/articles/fixture-2")
  assert.equal(actualNeighbors.data.neighbors.prev.uuid, "fixture-1")
  assert.equal(actualNeighbors.data.neighbors.next.uuid, "fixture-3")
  unavailable = true
  assert.equal((await fetch(base + "/api/ready")).status, 502, "Readiness must fail if backend is unavailable")
  const failure = await fetch(base + "/api/public/posts?page=99&limit=12")
  assert.equal(failure.status, 502)
  assert.equal((await fetch(base + "/blog/99")).status, 503, "SSR backend failure must not produce empty 200")
  unavailable = false
  assert.equal((await fetch(base + "/api/public/posts?page=99&limit=12")).status, 200, "Failures must not be cached")
  console.log(JSON.stringify({ result: "passed", checks: ["real backend neighbor field mapping", "backend-validated session and HttpOnly logout", "SSR content and code components", "404", "error status", "summary payload", "data and AST cache", "mutation invalidation", "proxy authorization and body", "scoped network overrides", "missing neighbors endpoint fallback", "525-post archive and sitemap", "pagination and combined filters", "readiness"], pages, logs: directory }, null, 2))
} catch (error) {
  console.error((await readFile(join(directory, "server.log"), "utf8")).slice(-5000))
  throw error
} finally {
  if (process.env.PERFORMANCE_KEEP_SERVER === "1") {
    console.log(`Browser verification server: ${base}`)
    await new Promise(resolve => process.once("SIGTERM", resolve))
  }
  child.kill("SIGTERM")
  await new Promise(resolve => { if (child.exitCode !== null) resolve(); else child.once("exit", resolve) })
  await new Promise(resolve => backend.close(resolve))
  await log.close()
}
