export default async function handler(req, res) {
  const GITHUB_USER = 'scptr1155-gif';
  const GITHUB_REPO = 'video-star';
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // Vercel'de tanımlanacak

  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/videos/vid.link?t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'GitHub API error' });
    }

    const files = await response.json();
    // Sadece mp4 dosyalarını dön
    const videos = files.filter(f => f.name.endsWith('.mp4'));
    res.status(200).json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
