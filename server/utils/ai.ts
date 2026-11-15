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
      signal: AbortSignal.timeout(60000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AI API 请求失败: ${response.status} ${errorText}`)
    }

    const data = await response.json() as AICompletionResponse
    const message = data.choices[0]?.message
    // 某些模型可能将内容放在 reasoning 字段
    const content = message?.content || message?.reasoning || ""

    if (!content) {
      throw new Error("AI 返回内容为空")
    }

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

  console.log("[AI Service] 返回内容:", content.substring(0, 500))

  try {
    // 尝试直接解析
    return JSON.parse(content) as T
  } catch {
    // 尝试从 markdown 代码块中提取
    const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]) as T
      } catch {
        console.error("[AI Service] 代码块 JSON 解析失败")
      }
    }

    // 尝试提取第一个 JSON 对象
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T
      } catch {
        console.error("[AI Service] JSON 对象提取失败")
      }
    }

    console.error("[AI Service] 无法解析 AI 返回内容:", content)
    throw createError({
      statusCode: 500,
      message: "AI 返回数据格式错误，请重试"
    })
  }
}
