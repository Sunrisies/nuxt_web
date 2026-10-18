import { lookup } from "node:dns"
import { isIP, type LookupFunction } from "node:net"
import { networkInterfaces } from "node:os"
import type { H3Event } from "h3"
import { Agent } from "undici"
import { backendBase } from "./backend"

let connection: { key: string, agent: Agent } | undefined

// 仅后端请求使用该连接池，不修改全局 fetch、系统 DNS 或代理设置。
export function backendDispatcher(event: H3Event) {
  const config = useRuntimeConfig(event)
  const resolveAddress = process.env.NUXT_API_RESOLVE_ADDRESS || config.apiResolveAddress
  const interfaceName = process.env.NUXT_API_NETWORK_INTERFACE || config.apiNetworkInterface
  if (!resolveAddress && !interfaceName) {
    if (connection) void connection.agent.close().catch(() => {})
    connection = undefined
    return undefined
  }

  const family = resolveAddress ? isIP(resolveAddress) : 4
  if (!family) throw createError({ statusCode: 500, statusMessage: "Invalid API resolve address" })
  const localAddress = interfaceName
    ? networkInterfaces()[interfaceName]?.find(item => item.family === (family === 6 ? "IPv6" : "IPv4"))?.address
    : undefined
  if (interfaceName && !localAddress) {
    throw createError({ statusCode: 500, statusMessage: "API network interface is unavailable" })
  }
  const hostname = new URL(backendBase(event)).hostname
  const key = JSON.stringify([hostname, resolveAddress, localAddress])
  if (connection?.key === key) return connection.agent

  const resolve: LookupFunction = (host, options, callback) => {
    if (resolveAddress && host === hostname) {
      if (options.all) callback(null, [{ address: resolveAddress, family }])
      else callback(null, resolveAddress, family)
    } else {
      lookup(host, options, callback)
    }
  }
  const agent = new Agent({ localAddress, connect: { lookup: resolve, family, timeout: Number(config.apiTimeout) } })
  if (connection) void connection.agent.close().catch(() => {})
  connection = { key, agent }
  return agent
}

export function backendFetch(event: H3Event): typeof globalThis.fetch {
  const dispatcher = backendDispatcher(event)
  return (input, init) => {
    const options = dispatcher ? { ...init, dispatcher } : init
    return globalThis.fetch(input, options)
  }
}
