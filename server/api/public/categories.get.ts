export default defineEventHandler(async event => ({ code: 200, data: await publicCategories(event) }))
