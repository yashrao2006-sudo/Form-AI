import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT } from '@/lib/systemPrompt'
import type { FormSchema, Message } from '@/lib/types'

const anthropic = new Anthropic()

// Each line in the response stream is one of these JSON shapes:
// {"type":"text_delta","content":"..."}  — streaming text chunk
// {"type":"schema","schema":{...}}       — parsed form schema (emitted once, after full response)
// {"type":"done"}                        — end of stream

export async function POST(request: Request) {
  const body = await request.json()
  const { messages } = body as { messages: Message[] }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'messages array required' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let fullText = ''

      try {
        const anthropicStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        })

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const text = event.delta.text
            fullText += text
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: 'text_delta', content: text }) + '\n'
              )
            )
          }
        }

        // After the full response, extract and emit any embedded schema
        const schemaMatch = fullText.match(
          /<FORM_SCHEMA>([\s\S]*?)<\/FORM_SCHEMA>/
        )
        if (schemaMatch) {
          try {
            const schema = JSON.parse(schemaMatch[1].trim()) as FormSchema
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type: 'schema', schema }) + '\n'
              )
            )
          } catch {
            // Malformed JSON in schema block — ignore, don't crash the stream
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: 'error', message }) + '\n'
          )
        )
      } finally {
        controller.enqueue(
          encoder.encode(JSON.stringify({ type: 'done' }) + '\n')
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
    },
  })
}
