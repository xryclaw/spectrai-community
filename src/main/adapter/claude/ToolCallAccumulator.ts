import { v4 as uuidv4 } from 'uuid'

export interface ParsedToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

/**
 * Tool 调用累加器：从 Claude assistant content block 中提取 tool_use。
 * 输入：SDK assistant message（任意结构，仅读取 message.content[]）
 * 输出：规范化 tool call 列表（id/name/input）
 */
export class ToolCallAccumulator {
  parse(msg: any): ParsedToolCall[] {
    const content = msg?.message?.content
    if (!Array.isArray(content)) return []

    const toolCalls: ParsedToolCall[] = []
    for (const block of content) {
      if (block?.type !== 'tool_use') continue
      toolCalls.push({
        id: block.id || uuidv4(),
        name: block.name || 'unknown',
        input: (block.input || {}) as Record<string, unknown>,
      })
    }
    return toolCalls
  }
}
