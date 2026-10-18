const assert = require('node:assert/strict')
const fs = require('node:fs')
const root = '/Users/zhuzhongqian/Desktop/project/local-acceptance'
const { chromium } = require(root + '/.tools/node_modules/playwright-core')
const base = 'http://127.0.0.1:39158'
const uuid = '75b40922-bdb7-4317-bd96-eece690c9743'
;(async () => {
  const detail = await (await fetch(base + '/api/v1/posts/' + uuid)).json()
  assert.equal(detail.data.author_avatar, '/api/v1/users/default-avatar.webp?v=3')
  assert.notEqual(detail.data.author_avatar, detail.data.cover)
  const publicData = await (await fetch(base + '/api/public/articles/' + uuid)).json()
  assert.equal(publicData.data.article.author_avatar, detail.data.author_avatar)
  const svg = await fetch(base + detail.data.author_avatar)
  assert.equal(svg.status, 200)
  assert(svg.headers.get('content-type').startsWith('image/webp'))
  assert.equal(svg.headers.get('x-content-type-options'), 'nosniff')
  assert([401, 403].includes((await fetch(base + '/api/v1/users')).status))
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base + '/article/' + uuid, { waitUntil: 'domcontentloaded' })
    const avatar = page.getByAltText(detail.data.author + ' 的头像', { exact: true })
    await avatar.waitFor()
    await page.waitForFunction(() => [...document.images].some(i => i.alt.endsWith(' 的头像') && i.complete && i.naturalWidth > 0))
    assert((await avatar.getAttribute('src')).includes('/users/default-avatar.webp'))
    await page.screenshot({ path: root + '/results/author-avatar-article-cat.png' })
    await page.goto(base + detail.data.author_avatar, { waitUntil: 'domcontentloaded' })
    await page.locator('img').first().screenshot({ path: root + '/results/default-author-avatar-cat.png' })
    assert.deepEqual(errors, [])
    const result = { defaultAvatar: true, separateFromCover: true, publicPayload: true, imageLoaded: true, userMetadataProtected: true, errors }
    fs.writeFileSync(root + '/results/author-avatar-cat.json', JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result, null, 2))
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
