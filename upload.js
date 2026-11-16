export const config = {
  api: {
    bodyParser: false, // Vercel'in dosya boyutu sınırını esnetmek için gerekli
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const PROXY_URL = process.env.PROXY_URL;
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

    if (!PROXY_URL || !GITHUB_TOKEN) {
      return res.status(500).json({ error: 'Sunucu ayarları eksik (PROXY_URL veya GITHUB_TOKEN).' });
    }

    // URL'den videoId'yi alıyoruz
    const videoId = req.query.videoId;

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID eksik.' });
    }

    // 1. Adım: GitHub'da yeni bir Release oluştur
    const releaseRes = await fetch(`https://api.github.com/repos/scptr1155-gif/video-star/releases`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${GITHUB_TOKEN}`, 
        'Accept': 'application/vnd.github+json' 
      },
      body: JSON.stringify({ tag_name: `auto-${videoId}`, name: `Video ${videoId}` })
    });

    if (!releaseRes.ok) {
      const errorData = await releaseRes.json();
      throw new Error(`GitHub Release oluşturulamadı: ${errorData.message}`);
    }
    const releaseData = await releaseRes.json();

    // 2. Adım: Videoyu Cloudflare Proxy üzerinden GitHub'a fırlat (Boyut sınırı yok)
    const uploadUrl = `${PROXY_URL}/upload?tag=${releaseData.tag_name}&id=${videoId}`;
    
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`
      },
      body: req, // Vercel'e gelen dosya akışını doğrudan proxy'ye gönderiyoruz
      duplex: 'half'
    });

    if (!uploadRes.ok) throw new Error('Proxy yüklemesi başarısız oldu.');

    // 3. Adım: Arka plandaki robotu tetikle (Videoyu vid.link klasörüne taşıması için)
    await fetch(`https://api.github.com/repos/scptr1155-gif/video-star/dispatches`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${GITHUB_TOKEN}`, 
        'Accept': 'application/vnd.github+json' 
      },
      body: JSON.stringify({
        event_type: 'move_video_to_folder',
        client_payload: { video_id: videoId, tag_name: releaseData.tag_name }
      })
    });

    res.status(200).json({ success: true, message: 'Video başarıyla yüklendi.' });

  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
}
