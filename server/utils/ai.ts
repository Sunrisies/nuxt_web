import type { H3Event } from "h3"

interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface AICompletionResponse {
  choices: {
    message: {
      content?: string
      reasoning?: string
    }
    finish_reason?: string
  }[]
}

interface AIStreamChunk {
  choices: {
    delta?: {
      content?: string
      reasoning?: string
      reasoning_content?: string
    }
    finish_reason?: string | null
  }[]
}

export function getAIConfig(event: H3Event) {
  const config = useRuntimeConfig(event)
  const apiBase = config.aiApiBase
  const apiKey = config.aiApiKey
  const model = config.aiModel || "sensenova-6.8-flash-lite"

  if (!apiBase || !apiKey) {
    throw createError({
      statusCode: 500,
      message: "AI 服务未配置"
    })
  }

  return { apiBase, apiKey, model }
}

/**
 * 在最后一条 user 消息末尾追加“只返回 JSON”的约束。
 */
export function withJsonInstruction(messages: ChatMessage[]): ChatMessage[] {
  const enhancedMessages = [...messages]
  const lastMessage = enhancedMessages[enhancedMessages.length - 1]
  if (lastMessage && lastMessage.role === "user") {
    enhancedMessages[enhancedMessages.length - 1] = {
      ...lastMessage,
      content: `${lastMessage.content}\n\n重要：请只返回纯 JSON 格式的数据，不要包含任何其他文字说明或 markdown 代码块标记。直接返回 JSON 对象。`
    }
  }
  return enhancedMessages
}

/**
 * 去掉模型输出里常见的 Markdown 标记，避免把 **加粗**、``` 代码块、列表符号
 * 直接显示到页面上，也避免把这些标记写进数据库。
 */
export function cleanAIText(input: unknown): string {
  if (typeof input !== "string") return ""
  return input
    .replace(/```[a-zA-Z]*\n?/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** 单行版本：用于标题、描述这类不允许换行的字段。 */
export function cleanAITextLine(input: unknown): string {
  return cleanAIText(input).replace(/\s*\n+\s*/g, " ").trim()
}

/**
 * 从模型输出中尽力解析出 JSON 对象（兼容纯 JSON、代码块、带前后缀等情况）。
 */
export function parseAIJson<T>(content: string): T {
  console.log("[AI Service] 原始返回:", content.substring(0, 300))

  const strategies: Array<() => T> = [
    () => JSON.parse(content) as T,
    () => {
      const m = content.match(/```json\s*([\s\S]*?)\s*```/)
      if (!m) throw new Error("no json block")
      return JSON.parse(m[1]) as T
    },
    () => {
      const m = content.match(/```\s*([\s\S]*?)\s*```/)
      if (!m) throw new Error("no code block")
      return JSON.parse(m[1]) as T
    },
    () => {
      const s = content.indexOf("{")
      const e = content.lastIndexOf("}")
      if (s === -1 || e <= s) throw new Error("no braces")
      return JSON.parse(content.slice(s, e + 1)) as T
    }
  ]

  for (let i = 0; i < strategies.length; i++) {
    try {
      const r = strategies[i]()
      if (r && typeof r === "object") {
        console.log(`[AI Service] JSON 解析成功（策略 ${i + 1}）`)
        return r
      }
    } catch {
      console.log(`[AI Service] 策略 ${i + 1} 失败`)
    }
  }

  console.error("[AI Service] 所有解析策略失败，原始内容:", content)
  throw createError({
    statusCode: 500,
    message: "AI 返回数据格式错误，请重试"
  })
}

export async function callAI(
  event: H3Event,
  messages: ChatMessage[],
  options: {
    temperature?: number
    maxTokens?: number
    responseFormat?: { type: "json_object" }
  } = {}
): Promise<string> {
  const { apiBase, apiKey, model } = getAIConfig(event)

  try {
    const response = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        ...(options.responseFormat && { response_format: options.responseFormat })
      }),
      signal: AbortSignal.timeout(120000) // 增加到 120 秒
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AI API 请求失败: ${response.status} ${errorText}`)
    }

    const data = await response.json() as AICompletionResponse
    const choice = data.choices[0]
    const message = choice?.message

    // 优先使用 content 字段（正式返回内容），fallback 到 reasoning（思考过程）
    let content = ""
    if (message?.content && message.content.trim()) {
      content = message.content
    } else if (message?.reasoning && message.reasoning.trim()) {
      content = message.reasoning
    }

    if (!content) {
      console.error("[AI Service] AI 返回内容为空, 完整响应:", JSON.stringify(data).substring(0, 500))
      throw new Error("AI 返回内容为空")
    }

    console.log(`[AI Service] 调用成功, 使用字段: ${message?.content?.trim() ? 'content' : 'reasoning'}, 长度: ${content.length}`)
    return content
  } catch (error) {
    console.error("[AI Service] 调用失败:", error)
    throw createError({
      statusCode: 500,
      message: "AI 服务调用失败"
    })
  }
}

export async function callAIJSON<T>(
  event: H3Event,
  messages: ChatMessage[],
  options: {
    temperature?: number
    maxTokens?: number
  } = {}
): Promise<T> {
  const content = await callAI(event, withJsonInstruction(messages), {
    ...options,
    maxTokens: options.maxTokens ?? 4000
  })

  return parseAIJson<T>(content)
}

export interface AIStreamOptions {
  temperature?: number
  maxTokens?: number
  responseFormat?: { type: "json_object" }
  /** 每收到一个增量片段时回调，用于把内容实时转发给前端 */
  onDelta?: (text: string, kind: "content" | "reasoning") => void | Promise<void>
}

/**
 * 以流式方式调用 AI，逐段回调增量文本，最终返回完整文本。
 * 返回的内容已把 reasoning（思考过程）与 content 区分开：优先返回 content，
 * 只有模型仅返回 reasoning 时才回退到 reasoning。
 */
export async function callAIStream(
  event: H3Event,
  messages: ChatMessage[],
  options: AIStreamOptions = {}
): Promise<string> {
  const { apiBase, apiKey, model } = getAIConfig(event)

  let response: Response
  try {
    response = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2000,
        stream: true,
        ...(options.responseFormat && { response_format: options.responseFormat })
      }),
      signal: AbortSignal.timeout(300000)
    })
  } catch (error) {
    console.error("[AI Service] 流式请求失败:", error)
    throw createError({ statusCode: 500, message: "AI 服务调用失败" })
  }

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[AI Service] 流式请求失败: ${response.status} ${errorText}`)
    throw createError({ statusCode: 500, message: "AI 服务调用失败" })
  }

  if (!response.body) {
    throw createError({ statusCode: 500, message: "AI 流式响应为空" })
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let content = ""
  let reasoning = ""

  const handleLine = async (line: string) => {
    const trimmed = line.trim()
    if (!trimmed || !trimmed.startsWith("data:")) return
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === "[DONE]") return

    let chunk: AIStreamChunk
    try {
      chunk = JSON.parse(payload) as AIStreamChunk
    } catch {
      return
    }

    const delta = chunk.choices?.[0]?.delta
    if (!delta) return

    const c = typeof delta.content === "string" ? delta.content : ""
    const r = typeof delta.reasoning_content === "string"
      ? delta.reasoning_content
      : typeof delta.reasoning === "string" ? delta.reasoning : ""

    if (c) {
      content += c
      await options.onDelta?.(c, "content")
    } else if (r) {
      reasoning += r
      await options.onDelta?.(r, "reasoning")
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      let idx: number
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).replace(/\r$/, "")
        buffer = buffer.slice(idx + 1)
        await handleLine(line)
      }
    }

    buffer += decoder.decode()
    if (buffer.trim()) await handleLine(buffer)
  } finally {
    reader.releaseLock()
  }

  const finalContent = content.trim() ? content : reasoning
  if (!finalContent) {
    console.error("[AI Service] 流式返回内容为空")
    throw createError({ statusCode: 500, message: "AI 返回内容为空" })
  }

  console.log(`[AI Service] 流式调用完成, 使用字段: ${content.trim() ? "content" : "reasoning"}, 长度: ${finalContent.length}`)
  return finalContent
}

/**
 * 流式调用并解析 JSON，增量文本通过 onDelta 实时回调。
 */
export async function streamAIJSON<T>(
  event: H3Event,
  messages: ChatMessage[],
  options: AIStreamOptions = {}
): Promise<T> {
  const content = await callAIStream(event, withJsonInstruction(messages), {
    ...options,
    maxTokens: options.maxTokens ?? 4000
  })
  return parseAIJson<T>(content)
}
