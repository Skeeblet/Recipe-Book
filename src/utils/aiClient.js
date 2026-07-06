export class MissingApiKeyError extends Error {
  constructor() {
    super('Add your Gemini API key in Profile → Account to use this feature. Gemini has a free tier — get a key at aistudio.google.com.')
    this.name = 'MissingApiKeyError'
  }
}

const UNEXPECTED_MSG = 'The AI returned something unexpected. Try again or use a different source.'

export async function callAI(prompt, settings, imageBase64 = null, signal = null) {
  const { aiModel, aiApiKey } = settings || {}
  if (!aiApiKey) throw new MissingApiKeyError()

  const isClaude = aiModel === 'claude-sonnet'
  let res
  try {
    if (isClaude) {
      const content = [{ type: 'text', text: prompt }]
      if (imageBase64) {
        content.unshift({
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
        })
      }
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': aiApiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
          messages: [{ role: 'user', content }],
        }),
        signal,
      })
    } else {
      // Default: Gemini 1.5 Flash. New-format AI Studio keys (AQ. prefix) use
      // Bearer auth; legacy AIza keys keep the ?key= query parameter.
      const isNewKeyFormat = aiApiKey.startsWith('AQ.')
      const parts = [{ text: prompt }]
      if (imageBase64) {
        parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageBase64 } })
      }
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent${isNewKeyFormat ? '' : `?key=${aiApiKey}`}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(isNewKeyFormat && { Authorization: `Bearer ${aiApiKey}` }),
          },
          body: JSON.stringify({ contents: [{ parts }] }),
          signal,
        }
      )
    }
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new Error("Couldn't reach the AI service. Check your connection and try again.")
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Your API key doesn't seem to be valid — check Profile → Account.")
    }
    if (res.status === 429) {
      throw new Error('The AI service is rate-limiting — wait a minute and try again.')
    }
    throw new Error('The AI service returned an error. Try again in a moment.')
  }

  const data = await res.json()
  const text = isClaude
    ? data.content?.[0]?.text
    : data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error(UNEXPECTED_MSG)
  return text
}

export function extractJson(text) {
  const cleaned = String(text).replace(/```(?:json)?/gi, '')
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(UNEXPECTED_MSG)
  try {
    return JSON.parse(match[0])
  } catch {
    throw new Error(UNEXPECTED_MSG)
  }
}
