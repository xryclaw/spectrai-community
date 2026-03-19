import { SpectralError } from '../../errors/SpectralError'
import { ToolCallAccumulator, type ParsedToolCall } from './ToolCallAccumulator'

export interface ParsedAssistantMessage {
  text: string
  thinking: string
  toolUses: ParsedToolCall[]
}

/**
 * Claude stream 消息解析器（纯函数化，便于单测和复用）。
 */
export class StreamParser {
  private readonly toolAccumulator = new ToolCallAccumulator()

  parseAssistantMessage(msg: any): ParsedAssistantMessage {
    const content = msg?.message?.content
    if (!Array.isArray(content)) {
      throw new SpectralError('Invalid assistant message content', {
        code: 'INVALID_STATE',
        details: { contentType: typeof content },
      })
    }

    let text = ''
    let thinking = ''

    for (const block of content) {
      switch (block?.type) {
        case 'text':
          text += block.text || ''
          break
        case 'thinking':
          thinking += block.thinking || ''
          break
        default:
          break
      }
    }

    return {
      text,
      thinking,
      toolUses: this.toolAccumulator.parse(msg),
    }
  }

  parseStreamDelta(msg: any): { textDelta?: string; thinkingDelta?: string } {
    const event = msg?.event
    if (!event || event.type !== 'content_block_delta') return {}

    const delta = event.delta
    if (!delta) return {}

    if (delta.type === 'text_delta' && delta.text) {
      return { textDelta: delta.text as string }
    }

    if (delta.type === 'thinking_delta' && delta.thinking) {
      return { thinkingDelta: delta.thinking as string }
    }

    return {}
  }
}
