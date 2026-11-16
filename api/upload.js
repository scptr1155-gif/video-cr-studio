export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const PROXY_URL = process.env.PROXY_URL;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const videoId = req.query.videoId;

    if (!videoId) return res.status(400).json({ error: 'Video ID eksik.' });

    // 1. GitHub'da Release oluştur
    const releaseRes = await fetch(`https://api.github.com/repos/scptr1155-gif/video-star/releases`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' },
      body: JSON.stringify({ tag_name: `auto-${videoId}`, name: `Video ${videoId}` })
    });

    if (!releaseRes.ok) throw new Error('GitHub Release oluşturulamadı.');
    const releaseData = await releaseRes.json();

    // 2. Tarayıcıya doğrudan Proxy'ye yükleme izni ver (Presigned URL mantığı)
    // Tarayıcı bu URL'e PUT isteği atacak.
    const uploadUrl = `${PROXY_URL}/upload?tag=${releaseData.tag_name}&id=${videoId}`;
    
    res.status(200).json({ 
      success: true, 
      uploadUrl: uploadUrl,
      authToken: GITHUB_TOKEN // Tarayıcının Proxy'ye kendini tanıtması için
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
