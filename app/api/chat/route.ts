import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { messages, model, provider, apiKeys, filesContent } = await req.json()

    // 1. Pick API key in priority: Gemini -> OpenRouter -> Groq
    const geminiKey = apiKeys?.gemini || process.env.GEMINI_API_KEY
    const openRouterKey = apiKeys?.openrouter || process.env.OPENROUTER_API_KEY
    const groqKey = apiKeys?.groq || process.env.GROQ_API_KEY

    let selectedProvider = provider
    let apiKey = ''

    // If user wants Gemini main
    if (geminiKey) {
      selectedProvider = 'gemini'
      apiKey = geminiKey
    } else if (openRouterKey) {
      selectedProvider = 'openrouter'
      apiKey = openRouterKey
    } else if (groqKey) {
      selectedProvider = 'groq'
      apiKey = groqKey
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Connect an OpenRouter, Groq, or Gemini API key in Settings first. Then I can plan and build with your key.' }, { status: 400 })
    }

    // Build system prompt with file list (not full content to save tokens)
    const fileList = filesContent? Object.keys(filesContent).join('\n') : 'No files'
    const systemPrompt = `You are Nexa AI code builder.
You CAN modify files. To modify/create a file use format:
FILE: path/to/file.ext
\`\`\`language
content
\`\`\`

Current project files:
${fileList}

Always provide file modifications using FILE: syntax.`

    const finalMessages = [
      { role: 'system', content: systemPrompt },
     ...messages
    ]

    let responseText = ''

    if (selectedProvider === 'gemini') {
      // Gemini direct API
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: finalMessages.filter((m: any) => m.role!== 'system').map((m: any) => ({
            role: m.role === 'assistant'? 'model' : 'user',
            parts: [{ text: (m.content || '') + (m.role === 'user'? '\n\n' + systemPrompt : '') }]
          })),
          generationConfig: { maxOutputTokens: 4096, temperature: 0.7 }
        })
      })
      const data = await geminiRes.json()
      if (!geminiRes.ok) throw new Error(data.error?.message || 'Gemini error')
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } else if (selectedProvider === 'openrouter') {
      const openRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model || 'google/gemini-2.0-flash-exp:free', messages: finalMessages, max_tokens: 4096, temperature: 0.7 })
      })
      const data = await openRes.json()
      if (!openRes.ok) throw new Error(data.error?.message || 'OpenRouter error')
      responseText = data.choices?.[0]?.message?.content || ''
    } else {
      // Groq fallback
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model || 'llama-3.3-70b-versatile', messages: finalMessages, max_tokens: 4096 })
      })
      const data = await groqRes.json()
      if (!groqRes.ok) throw new Error(data.error?.message || 'Groq error')
      responseText = data.choices?.[0]?.message?.content || ''
    }

    return NextResponse.json({ content: responseText, provider: selectedProvider })

  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
