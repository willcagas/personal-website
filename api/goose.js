export default async function handler(req, res) {
  const isUp = req.query.action === 'up';
  
  // Notice the trailing slash, essential for counterapi
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
