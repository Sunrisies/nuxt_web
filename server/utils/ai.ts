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
  // 在消息末尾添加 JSON 格式要求
  const enhancedMessages = [...messages]
  const lastMessage = enhancedMessages[enhancedMessages.length - 1]
  if (lastMessage && lastMessage.role === "user") {
    enhancedMessages[enhancedMessages.length - 1] = {
      ...lastMessage,
      content: `${lastMessage.content}\n\n重要：请只返回纯 JSON 格式的数据，不要包含任何其他文字说明或 markdown 代码块标记。直接返回 JSON 对象。`
    }
  }

  const content = await callAI(event, enhancedMessages, {
    ...options,
    maxTokens: options.maxTokens ?? 4000
  })

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
