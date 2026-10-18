import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
const source = stripTypeScriptTypes(await readFile('app/utils/article-editor.ts', 'utf8'), { mode: 'transform' })
const { articleDraftError, isArticleImageUrl, insertArticleImage } = await import(`data:text/javascript,${encodeURIComponent(source)}`)
const valid = { title: '文章', summary: '', markdowncontent: '# 正文', category_id: 1, tag_ids: [1], cover_image: '' }
assert.equal(articleDraftError(valid), '')
assert.match(articleDraftError({ ...valid, title: '  ' }), /标题/)
assert.match(articleDraftError({ ...valid, markdowncontent: '  ' }), /正文/)
assert.match(articleDraftError({ ...valid, category_id: null }), /分类/)
assert.match(articleDraftError({ ...valid, tag_ids: [] }), /标签/)
for (const url of ['javascript:alert(1)', 'data:image/svg+xml,evil', '//foreign.invalid/image', '/image\\evil', 'https://example.invalid/\nimage']) assert.equal(isArticleImageUrl(url), false)
for (const url of ['/api/v1/images/file/file.webp', 'https://example.invalid/image.png']) assert.equal(isArticleImageUrl(url), true)
const image = insertArticleImage('前文后文', 2, 2, 'https://example.invalid/image(1).png', '危险]([标题')
assert.equal(image.value.slice(0, 2), '前文')
assert.equal(image.value.slice(image.cursor), '后文')
assert(image.value.includes('image%281%29.png'))
assert(!image.value.includes('危险]('))
assert.throws(() => insertArticleImage('', 0, 0, 'javascript:evil', '图'), /无效/)
console.log('Passed: article metadata validation, safe image URLs, cursor insertion and Markdown escaping')
const providerSource = stripTypeScriptTypes(await readFile('app/providers/article-images.ts', 'utf8'), { mode: 'transform' })
  .replace('"@nuxt/image/runtime/providers/ipx"', JSON.stringify(import.meta.resolve('@nuxt/image/runtime/providers/ipx')))
const provider = (await import(`data:text/javascript,${encodeURIComponent(providerSource)}`)).default()
const media = '/api/v1/images/file/00000000-0000-4000-8000-000000000001.webp'
const context = { options: { nuxt: { baseURL: '/' } } }
assert.equal(provider.getImage(media, { modifiers: {} }, context).url, media)
assert.equal(provider.getImage('/api/v1/users/default-avatar.webp?v=3', { modifiers: { width: 20, height: 20 } }, context).url, '/api/v1/users/default-avatar.webp?v=3')
assert.equal(provider.getImage('/blog.webp', { modifiers: {} }, context).url, '/_ipx/_/blog.webp')
console.log('Passed: uploaded API images bypass filesystem IPX; static images retain IPX')
