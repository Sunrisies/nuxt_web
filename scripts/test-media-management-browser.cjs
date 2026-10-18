const fs = require('node:fs')
const assert = require('node:assert/strict')
const { join } = require('node:path')
const { homedir } = require('node:os')
const root = process.env.LOCAL_DEPLOY_DIR || join(homedir(), 'Desktop/project/local-acceptance')
const { chromium } = require(join(root, '.tools/node_modules/playwright-core'))
const env = Object.fromEntries(fs.readFileSync(join(root, '.env'), 'utf8').split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))
assert.equal(new URL(env.DATABASE_URL).pathname, '/server_acceptance')
assert.equal(new URL(env.NUXT_API_BASE).hostname, '127.0.0.1')
const base = 'http://127.0.0.1:39158'
;(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  const result = { time: new Date().toISOString(), checks: {}, errors: [] }
  let page, post, image
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    page = await context.newPage()
    page.on('pageerror', e => result.errors.push(e.message))
    const api = (path, method = 'GET', body) => page.evaluate(async ({ path, method, body }) => {
      const r = await fetch('/api/v1' + path, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
      return { status: r.status, body: await r.json() }
    }, { path, method, body })
    for (const path of ['/images', '/images/1']) assert.equal((await fetch(base + '/api/v1' + path)).status, 401)
    result.checks.metadataRequiresAdmin = true
    await page.goto(base + '/admin/login')
    await page.getByPlaceholder('请输入账号').fill('local_admin')
    await page.getByPlaceholder('请输入密码').fill(env.LOCAL_ADMIN_PASSWORD)
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await page.waitForURL('**/admin/dashboard')
    await page.goto(base + '/admin/images', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: '图片管理', exact: true }).waitFor()
    const filename = 'media-verification-' + Date.now() + '.png'
    const upload = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith('/images/upload'))
    await page.locator('input[aria-label="上传图片文件"]').setInputFiles({ name: filename, mimeType: 'image/png', buffer: fs.readFileSync(join(root, 'results/authoring-fixture.png')) })
    const uploaded = await upload
    assert.equal(uploaded.status(), 200)
    image = (await uploaded.json()).data
    result.image = { id: image.id, filename: image.filename, key: image.key }
    const card = page.getByRole('article', { name: filename, exact: true })
    await card.waitFor()
    await card.locator('img').scrollIntoViewIfNeeded()
    await page.waitForFunction(name => [...document.images].some(i => i.alt === name && i.complete && i.naturalWidth > 0), filename)
    result.checks.uploadAndThumbnail = true
    const categories = (await api('/categories?limit=100')).body.data.data
    const tags = (await api('/tags?limit=100')).body.data.data
    const title = '媒体管理验收 %_ ' + Date.now()
    const created = await api('/posts', 'POST', { title, markdowncontent: `# 测试\n\n![图片](${image.url})`, content: '', summary: '仅供本地管理流程验收，测试结束后移除。', cover_image: image.url, category_id: categories[0].id, tag_ids: [tags[0].id], status: 0, featured: false })
    assert.equal(created.status, 200)
    post = created.body.data
    result.postUuid = post.uuid
    for (const status of [0, 1, 2]) {
      assert.equal((await api('/posts/' + post.uuid, 'PUT', { status })).status, 200)
      const detail = await api('/images/' + image.id)
      assert.equal(detail.body.data.reference_count, 1)
      assert.equal(detail.body.data.references[0].status, status)
      assert(detail.body.data.references[0].body && detail.body.data.references[0].cover)
      assert.equal((await api('/images/' + image.id, 'DELETE')).status, 409)
      const filtered = await api('/posts?search=' + encodeURIComponent(title) + '&category=' + categories[0].id + '&tag=' + tags[0].id + '&status=' + status)
      assert.equal(filtered.status, 200)
      assert.equal(filtered.body.data.pagination.total, 1)
      assert.equal(filtered.body.data.data[0].uuid, post.uuid)
      if (status === 1) {
        const anon = await browser.newContext()
        const publicPage = await anon.newPage()
        await publicPage.goto(base + '/article/' + post.uuid, { waitUntil: 'domcontentloaded' })
        await publicPage.getByRole('heading', { name: title, exact: true }).waitFor()
        await publicPage.locator('article img').last().scrollIntoViewIfNeeded()
        await publicPage.waitForFunction(() => [...document.querySelectorAll('article img')].some(i => i.alt === '图片' && i.complete && i.naturalWidth > 0))
        await anon.close()
        result.checks.publishedCloudImageVisible = true
      }
    }
    result.checks.allStatesProtectedAndCombinedFilters = true
    assert.equal((await api('/posts?status=5')).status, 422)
    assert.equal((await api('/images?page=0')).status, 400)
    result.checks.invalidFiltersRejected = true
    await page.getByRole('textbox', { name: '图片文件名搜索' }).fill(filename)
    const searched = page.waitForResponse(r => r.url().includes('/api/v1/images?') && r.request().method() === 'GET')
    await page.getByRole('button', { name: '搜索', exact: true }).click()
    await searched
    await page.waitForTimeout(300)
    await card.getByRole('button', { name: '删除', exact: true }).waitFor()
    assert.equal(await card.getByRole('button', { name: '删除', exact: true }).isDisabled(), true)
    await card.getByRole('button', { name: '详情与引用', exact: true }).click()
    const dialog = page.getByRole('dialog')
    const editLink = dialog.getByRole('link', { name: title, exact: true })
    await editLink.waitFor()
    await page.waitForTimeout(600)
    await page.screenshot({ path: join(root, 'results/media-references-desktop.png') })
    await editLink.click()
    await page.waitForURL('**/admin/posts/' + post.uuid + '/edit')
    await page.getByRole('textbox', { name: '文章标题', exact: true }).waitFor()
    await page.waitForFunction(expected => document.querySelector('input[aria-label="文章标题"]')?.value === expected, title)
    assert.equal(await page.getByRole('textbox', { name: '文章标题', exact: true }).inputValue(), title)
    await page.getByRole('link', { name: '返回文章列表', exact: true }).click()
    await page.getByRole('textbox', { name: '搜索文章标题' }).fill(title)
    await page.getByRole('combobox', { name: '筛选文章状态', exact: true }).click()
    await page.getByRole('option', { name: '已下线', exact: true }).click()
    const filteredRequest = page.waitForResponse(r => r.url().includes('/api/v1/posts?') && r.url().includes('status=2'))
    await page.getByRole('button', { name: '筛选', exact: true }).click()
    await page.waitForURL(url => url.searchParams.get('search') === title && url.searchParams.get('status') === '2')
    assert.equal((await filteredRequest).status(), 200)
    await page.getByRole('row').filter({ hasText: title }).waitFor()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByRole('textbox', { name: '搜索文章标题' }).waitFor()
    assert.equal(await page.getByRole('textbox', { name: '搜索文章标题' }).inputValue(), title)
    await page.getByRole('row').filter({ hasText: title }).getByText('已下线', { exact: true }).waitFor()
    await page.screenshot({ path: join(root, 'results/posts-filter-desktop.png') })
    result.checks.referenceDeepLinkAndFilterPersistence = true
    // Cover-only references must still block deletion.
    assert.equal((await api('/posts/' + post.uuid, 'PUT', { content: '', markdowncontent: '正文已移除图片' })).status, 200)
    assert.equal((await api('/images/' + image.id, 'DELETE')).status, 409)
    assert.equal((await api('/posts/' + post.uuid, 'PUT', { cover_image: '' })).status, 200)
    await page.goto(base + '/admin/images?search=' + encodeURIComponent(filename), { waitUntil: 'domcontentloaded' })
    await card.getByRole('button', { name: '删除', exact: true }).waitFor()
    assert.equal(await card.getByRole('button', { name: '删除', exact: true }).isEnabled(), true)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(1200)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false)
    await page.screenshot({ path: join(root, 'results/media-management-mobile.png'), fullPage: true })
    result.checks.mobileNoOverflow = true
    await card.getByRole('button', { name: '删除', exact: true }).click()
    const deleted = page.waitForResponse(r => r.request().method() === 'DELETE' && r.url().endsWith('/images/' + image.id))
    await page.getByRole('dialog').getByRole('button', { name: '确认删除', exact: true }).click()
    assert.equal((await deleted).status(), 200)
    await card.waitFor({ state: 'hidden' })
    assert.equal((await api('/images/' + image.id)).status, 404)
    const stale = await api('/posts/' + post.uuid, 'PUT', { markdowncontent: `![deleted](${image.url})` })
    assert.equal(stale.status, 409)
    result.checks.unreferencedDeleteAndStaleSaveRejected = true
    assert.deepEqual(result.errors, [])
    assert.equal((await api('/posts/' + post.uuid, 'DELETE')).status, 200)
    post = null
  } finally {
    // Never delete existing content or media: only the IDs created by this run are touched.
    if (page && post) await page.evaluate(async uuid => { await fetch('/api/v1/posts/' + uuid, { method: 'DELETE' }) }, post.uuid).catch(() => {})
    if (page && image) result.cleanupImageStatus = await page.evaluate(async id => (await fetch('/api/v1/images/' + id, { method: 'DELETE' })).status, image.id).catch(() => 'request failed')
    await browser.close()
    fs.writeFileSync(join(root, 'results/media-management.json'), JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result, null, 2))
  }
})().catch(e => { console.error(e); process.exitCode = 1 })
