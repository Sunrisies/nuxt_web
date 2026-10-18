import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { stripTypeScriptTypes } from "node:module"
import vm from "node:vm"

const ref = value => ({ value })
const computed = fn => ({ get value() { return fn() } })
async function load(path, context, exposure, vue = false) {
  let source = await readFile(path, "utf8")
  if (vue) source = source.split('<script setup lang="ts">')[1].split('</script>')[0]
  source = source.replace(/^import .*$/gm, '').replaceAll('import.meta.client', 'true')
  source = stripTypeScriptTypes(source, { mode: 'transform' }).replace(/^export /gm, '')
  vm.runInContext(`${source}\nglobalThis.subject = ${exposure}`, context)
  return context.subject
}
const requests = []
const notices = []
let detailFailed = false
let mounted
const adminRoute = { query: {} }
const detail = { uuid: 'article-id', title: 'Original', content: '# Markdown', markdowncontent: '# Markdown', htmlcontent: '<h1>HTML</h1>', is_hide: true, is_top: true, category: { id: 1 }, tags: [{ id: 2 }] }
const admin = vm.createContext({ ref, computed, reactive: value => value, definePageMeta() {}, useRoute: () => adminRoute, useRouter: () => ({ replace() {} }), watch() {}, onMounted(callback) { mounted = callback }, useToast: () => ({ add: notice => notices.push(notice) }), formatChineseDateTime: value => value, allAdminItems: async () => [], requestErrorMessage: (_, fallback) => fallback, console,
  http: async request => {
    requests.push(request)
    if (request.url === '/v1/posts/article-id' && !request.method) {
      if (detailFailed) throw new Error('Unavailable')
      return detail
    }
    return { data: [], pagination: { total: 0, limit: 10 } }
  }
})
await load('app/utils/article-editor.ts', admin, '({articleDraftError, insertArticleImage, isArticleImageUrl})')
const editor = await load('app/pages/admin/posts/index.vue', admin, '{openEdit, savePost, closeForm, postForm, showFormModal}', true)
await editor.openEdit({ uuid: 'article-id', title: 'List summary' })
assert.equal(editor.postForm.markdowncontent, '# Markdown')
assert.equal(editor.postForm.content, '<h1>HTML</h1>')
assert.equal(editor.postForm.status, 2)
await editor.savePost()
const mutation = requests.find(request => request.method === 'PUT')
assert.equal(mutation.body.markdowncontent, '# Markdown')
assert.equal(mutation.body.content, '<h1>HTML</h1>')
assert.equal(mutation.body.status, 2)
assert.equal(mutation.body.featured, true)
delete detail.htmlcontent
await editor.openEdit({ uuid: 'article-id' })
await editor.savePost()
assert.ok(!('content' in requests.filter(request => request.method === 'PUT').at(-1).body))
adminRoute.query.edit = 'article-id'
await mounted()
assert.equal(editor.showFormModal.value, true)
editor.closeForm()
detailFailed = true
await editor.openEdit({ uuid: 'article-id' })
assert.equal(editor.showFormModal.value, false)
assert.equal(notices.at(-1).color, 'error')

let stored = 'channel-token'
let failure = { status: 401 }
const clipboard = vm.createContext({ console, Date, FormData, localStorage: { getItem: () => stored, removeItem: () => { stored = null }, setItem: (_, value) => { stored = value } }, $fetch: async () => { throw failure } })
const clip = await load('app/composables/useClipboard.ts', clipboard, '{fetchClipboardList, deleteClipboardEntry}')
assert.equal(await clip.fetchClipboardList(1, 10), null)
assert.equal(stored, null)
stored = 'channel-token'
failure = { status: 503 }
assert.equal(await clip.deleteClipboardEntry('entry-id'), false)
assert.equal(stored, 'channel-token')

let key = 'first-tag'
let reset
let next = { data: [{ uuid: 'second' }], pagination: { total: 2 } }
const feedContext = vm.createContext({ ref, computed, watch: (_, callback) => { reset = callback }, onScopeDispose() {}, AbortController, Set, Error, http: async () => next })
const createFeed = await load('app/composables/post-feed.ts', feedContext, 'usePostFeed')
const first = ref({ data: [{ uuid: 'first' }], pagination: { total: 2 } })
const feed = createFeed(first, () => ({}), () => key)
await feed.loadMore()
assert.equal(feed.posts.value.length, 2)
assert.equal(feed.hasMore.value, false)
key = 'another-tag'; reset()
next = { data: [{ uuid: 'first' }], pagination: { total: 2 } }
await feed.loadMore()
assert.equal(feed.error.value, true)
assert.equal(feed.posts.value.length, 1)
let resolve
next = new Promise(done => { resolve = done })
const pending = feed.loadMore()
key = 'third-tag'; reset()
resolve({ data: [{ uuid: 'stale-result' }], pagination: { total: 2 } })
await pending
assert.equal(feed.posts.value.length, 1)
assert.equal(feed.loading.value, false)
let forbidden = false
const sessionNotices = []
const sessionStates = new Map()
const sessionContext = vm.createContext({ computed, createError: props => Object.assign(new Error(props.message), props), useState: (key, create) => {
  if (!sessionStates.has(key)) sessionStates.set(key, ref(create()))
  return sessionStates.get(key)
}, useToast: () => ({ add: value => sessionNotices.push(value) }), localStorage: { removeItem() {} },
http: async request => { if (forbidden) throw { status: 403 }; return request.url === '/auth/session' ? { id: 1, uuid: 'admin', user_name: 'Admin' } : { revoked: false } } })
const createSession = await load('app/composables/admin-session.ts', sessionContext, 'useAdminSession')
const session = createSession()
assert.equal(await session.check(), true)
await session.logout()
assert.equal(session.loggedIn.value, false)
assert.equal(sessionNotices.at(-1).color, 'warning')
forbidden = true
assert.equal(await session.check(), false)
await assert.rejects(session.check({ throwOnForbidden: true }), /没有后台管理权限/)
const optionsContext = vm.createContext({ Set, Error, Number, http: async request => ({ data: [{ id: request.query.page }], pagination: { total: 2 } }) })
const allItems = await load('app/composables/admin-items.ts', optionsContext, 'allAdminItems')
assert.equal((await allItems('/v1/categories')).length, 2)
const linkRequests = []
const linkContext = vm.createContext({ ref, computed, reactive: value => value, definePageMeta() {}, onMounted() {}, useToast: () => ({ add() {} }), console, requestErrorMessage: (_, fallback) => fallback, formatChineseDateTime: value => value,
http: async request => { linkRequests.push(request); return { data: [], pagination: { total: 0, limit: 10 } } } })
const linksEditor = await load('app/pages/admin/links.vue', linkContext, '{openEdit,save,form}', true)
linksEditor.openEdit({ id: 7, name: 'Example', url: 'https://example.com', icon_url: 'https://example.com/icon.png', category: 'Existing category' })
assert.equal(linksEditor.form.icon, 'https://example.com/icon.png')
await linksEditor.save()
const linkUpdate = linkRequests.find(request => request.method === 'PUT')
assert.equal(linkUpdate.body.icon_url, 'https://example.com/icon.png')
assert.equal(linkUpdate.body.category, 'Existing category')
assert.ok(!('icon' in linkUpdate.body))
console.log('Passed: full article edit/deep link, legacy HTML preservation, Markdown/HTML separation, hidden status, failed detail guard, clipboard expiry/offline distinction, pagination and stale response isolation')
