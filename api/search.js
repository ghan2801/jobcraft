export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    try {
      const { query } = req.body;
  
      const response = await fetch(
        'https://google.serper.dev/search',
        {
          method: 'POST',
          headers: {
            'X-API-KEY': process.env.VITE_SERPER_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            q: query,
            num: 5
          })
        }
      );
  
      const data = await response.json();
  
      const results = data.organic?.map(r => ({
        title: r.title,
        url: r.link,
        description: r.snippet
      })) || [];
  
      return res.status(200).json({ results });
    } catch (error) {
      return res.status(500).json({ error: 'Search failed' });
    }
  }