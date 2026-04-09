export default async function handler(req, res) {
  const isUp = req.query.action === 'up';
  
  // 1. Basic Origin/Referer validation (Soft protection)
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const isAllowedOrigin = 
    origin.includes('wcagas.com') || 
    origin.includes('localhost') || 
    origin.includes('127.0.0.1') ||
    referer.includes('wcagas.com') ||
    referer.includes('localhost');

  if (!isAllowedOrigin && process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: "Unauthorized origin" });
  }

  // 2. Custom header validation (Harder for bots to guess)
  // We only require this for incrementing 'up' to prevent most automated spam
  if (isUp && req.headers['x-requested-with'] !== 'pet-the-goose') {
    return res.status(403).json({ error: "Missing security handshake" });
  }

  // 3. Upstream URL is now hidden from the client
  const url = isUp 
    ? 'https://api.counterapi.dev/v1/willcagas/pet-the-goose/up/'
    : 'https://api.counterapi.dev/v1/willcagas/pet-the-goose/';
    
  try {
    const response = await fetch(url);
    if (!response.ok) {
        return res.status(response.status).json({ error: "Upstream error" });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch goose API" });
  }
}
