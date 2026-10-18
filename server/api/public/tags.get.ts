export default defineEventHandler(async event => ({ code: 200, data: await publicTags(event) }))
