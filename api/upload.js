export const config = { api: { bodyParser: false } }; // Vercel'in kendi boyut sınırını esnetmek için gerekli

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  try {
    // Vercel ortam değişkenlerinden gizli bilgileri alıyoruz
    const PROXY_URL = process.env.PROXY_URL; 
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const videoId = req.query.videoId || req.body.videoId; // FormData'dan gelen ID (Basitleştirilmiş)

    // 1. Adım: GitHub'da Release oluştur
    const createReleaseRes = await fetch(`https://api.github.com/repos/scptr1155-gif/video-star/releases`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' },
      body: JSON.stringify({ tag_name: `auto-${videoId}`, name: `Video ${videoId}` })
    });

    if (!createReleaseRes.ok) throw new Error('Release failed');
    const releaseData = await createReleaseRes.json();

    // 2. Adım: Videoyu Cloudflare Proxy üzerinden yükle (Büyük dosyalar için en iyi yöntem)
    // Not: Vercel boyut sınırına takılmamak için videoyu doğrudan proxy'ye yönlendiriyoruz.
    const proxyUploadUrl = `${PROXY_URL}/upload?tag=${releaseData.tag_name}&id=${videoId}`;
    
    const uploadRes = await fetch(proxyUploadUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` },
      body: req, // Gelen dosya akışını doğrudan Cloudflare'a gönder
      duplex: 'half' // Node.js stream uyumluluğu için
    });

    if (!uploadRes.ok) throw new Error('Upload failed');

    res.status(200).json({ success: true, message: 'Uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
