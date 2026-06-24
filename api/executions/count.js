export default async function handler(req, res) {
    const API_KEY = "NdraawzOnTop";
    const authHeader = req.headers['authorization'];

    try {
        // GET: bisa tanpa auth (hanya baca)
        if (req.method === 'GET') {
            const kvUrl = process.env.KV_REST_API_URL;
            const kvToken = process.env.KV_REST_API_TOKEN;

            if (!kvUrl || !kvToken) {
                if (!global.execCount) global.execCount = 0;
                return res.status(200).json({ 
                    total: global.execCount,
                    lastUpdate: new Date().toISOString()
                });
            }

            const getRes = await fetch(`${kvUrl}/get/exec_count`, {
                headers: { 'Authorization': `Bearer ${kvToken}` }
            });

            let count = 0;
            if (getRes.ok) {
                const result = await getRes.json();
                if (result.result) count = parseInt(result.result);
            }

            return res.status(200).json({ 
                total: count,
                lastUpdate: new Date().toISOString()
            });
        }

        // POST: perlu auth
        if (req.method === 'POST') {
            if (authHeader !== `Bearer ${API_KEY}`) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const kvUrl = process.env.KV_REST_API_URL;
            const kvToken = process.env.KV_REST_API_TOKEN;

            if (!kvUrl || !kvToken) {
                if (!global.execCount) global.execCount = 0;
                global.execCount += 1;
                return res.status(200).json({ 
                    total: global.execCount,
                    lastUpdate: new Date().toISOString()
                });
            }

            const getRes = await fetch(`${kvUrl}/get/exec_count`, {
                headers: { 'Authorization': `Bearer ${kvToken}` }
            });

            let count = 0;
            if (getRes.ok) {
                const result = await getRes.json();
                if (result.result) count = parseInt(result.result);
            }

            count += 1;

            await fetch(`${kvUrl}/set/exec_count/${count}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${kvToken}` }
            });

            return res.status(200).json({ 
                total: count,
                lastUpdate: new Date().toISOString()
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
                    }
