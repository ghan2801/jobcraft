import express from 'express'
import fetch from 'node-fetch'
import * as dotenv from 'dotenv'
dotenv.config()

const app = express()
app.use(express.json())

// Existing proxy endpoint
app.post('/api/proxy', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.VITE_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    })
    const data = await response.json()
    res.status(response.status).json(data)
  } catch (error) {
    res.status(500).json({ error: 'Proxy error' })
  }
})

// NEW: Search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.VITE_SERPER_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, num: 5 })
    })
    const data = await response.json()
    const results = data.organic?.map(r => ({
      title: r.title,
      url: r.link,
      description: r.snippet
    })) || []
    res.status(200).json({ results })
  } catch (error) {
    res.status(500).json({ error: 'Search failed' })
  }
})

app.post('/api/fetchjd', async (req, res) => {
    try {
      const { url } = req.body
      if (!url || !url.startsWith('http')) {
        return res.status(400).json({ error: 'Invalid URL' })
      }
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; JobCraft/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        }
      })
      const html = await response.text()
      const cleaned = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      const text = cleaned.slice(0, 6000)
      res.status(200).json({ text })
    } catch (error) {
      res.status(500).json({ error: 'Failed: ' + error.message })
    }
  })

app.listen(3000, () => console.log('Proxy running on port 3000'))