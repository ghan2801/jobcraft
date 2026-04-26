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

app.listen(3000, () => console.log('Proxy running on port 3000'))