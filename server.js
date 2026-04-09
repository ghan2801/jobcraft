import express from 'express'
import fetch from 'node-fetch'
import * as dotenv from 'dotenv'
dotenv.config()

const app = express()
app.use(express.json())

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

app.listen(3000, () => console.log('Proxy running on port 3000'))