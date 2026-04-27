export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  
    try {
      const { url } = req.body
  
      if (!url || !url.startsWith('http')) {
        return res.status(400).json({ 
          error: 'Invalid URL' 
        })
      }
  
      // Try multiple user agents
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
      }
  
      const response = await fetch(url, { 
        headers,
        redirect: 'follow',
      })
  
      if (!response.ok) {
        return res.status(400).json({ 
          error: `Site returned ${response.status}. Please paste the JD text manually.`
        })
      }
  
      const html = await response.text()
  
      // Remove unwanted elements
      const cleaned = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
  
      if (cleaned.length < 200) {
        return res.status(400).json({
          error: 'Could not extract text from this page. Please paste the JD text manually.'
        })
      }
  
      // Take most relevant portion
      const text = cleaned.slice(0, 5000)
  
      return res.status(200).json({ text })
  
    } catch (error) {
      return res.status(500).json({ 
        error: 'Could not fetch this URL. Please paste the JD text manually.'
      })
    }
  }