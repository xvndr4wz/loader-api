export default async function handler(req, res) {
    const API_KEY = "NdraawzOnTop";
    const authHeader = req.headers['authorization'];

    // Validasi API key
    if (authHeader !== `Bearer ${API_KEY}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const kvUrl = process.env.KV_REST_API_URL;
        const kvToken = process.env.KV_REST_API_TOKEN;

        if (!kvUrl || !kvToken) {
            // Fallback: simpan di memory (reset setiap deploy)
            if (!global.execCount) global.execCount = 0;
            global.execCount += 1;
            return res.status(200).json({ 
                total: global.execCount,
                lastUpdate: new Date().toISOString()
            });
        }

        // Ambil data dari KV
        const getRes = await fetch(`${kvUrl}/get/exec_count`, {
            headers: { 'Authorization': `Bearer ${kvToken}` }
        });

        let count = 0;
        if (getRes.ok) {
            const result = await getRes.json();
            if (result.result) count = parseInt(result.result);
        }

        count += 1;

        // Simpan ke KV
        await fetch(`${kvUrl}/set/exec_count/${count}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${kvToken}` }
        });

        return res.status(200).json({ 
            total: count,
            lastUpdate: new Date().toISOString()
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
    }
