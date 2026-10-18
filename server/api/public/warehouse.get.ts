export default defineEventHandler(async event => ({ code: 200, data: await publicWarehouse(event) }))
