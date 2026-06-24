export default async function handler(req, res) {
    const API_KEY = "NdraawzOnTop";
    const authHeader = req.headers['authorization'];

    // Function format angka
    function formatNumber(num) {
        if (num >= 1000000000000) { // Triliun
            return (num / 1000000000000).toFixed(3).replace(/\.?0+$/, '') + 'T';
        }
        if (num >= 1000000000) { // Miliar
            return (num / 1000000000).toFixed(3).replace(/\.?0+$/, '') + 'B';
        }
        if (num >= 1000000) { // Juta
            return (num / 1000000).toFixed(3).replace(/\.?0+$/, '') + 'M';
        }
        if (num >= 1000) { // Ribu
            return (num / 1000).toFixed(3).replace(/\.?0+$/, '') + 'K';
        }
        return num.toString();
    }

    try {
        // GET: bisa tanpa auth (hanya baca)
        if (req.method === 'GET') {
            const kvUrl = process.env.KV_REST_API_URL;
            const kvToken = process.env.KV_REST_API_TOKEN;

            if (!kvUrl || !kvToken) {
                if (!global.execCount) global.execCount = 0;
                if (!global.lastUpdate) global.lastUpdate = new Date().toISOString();
            }

            // Convert ke WIB
            const now = new Date();
            const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));

            const lastUpdatedDate = new Date(global.lastUpdate || now);
            const wibLastTime = new Date(lastUpdatedDate.getTime() + (7 * 60 * 60 * 1000));

            // Format waktu
            function formatWIB(wibDate) {
                const hours = String(wibDate.getUTCHours()).padStart(2, '0');
                const minutes = String(wibDate.getUTCMinutes()).padStart(2, '0');
                const seconds = String(wibDate.getUTCSeconds()).padStart(2, '0');
                
                const day = wibDate.getUTCDate();
                const month = wibDate.getUTCMonth();
                const year = wibDate.getUTCFullYear();
                
                const monthNames = ['januari', 'februari', 'maret', 'april', 'mei', 'juni',
                                   'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
                
                const timeStr = `${hours}.${minutes}.${seconds}`;
                const hour = wibDate.getUTCHours();
                let timeOfDay = '';
                if (hour >= 5 && hour < 11) timeOfDay = 'Pagi';
                else if (hour >= 11 && hour < 15) timeOfDay = 'Siang';
                else if (hour >= 15 && hour < 18) timeOfDay = 'Sore';
                else timeOfDay = 'Malam';
                
                const dateStr = `${day} ${monthNames[month]} ${year}`;
                
                return `${dateStr} ${timeStr} (${timeOfDay})`;
            }

            return res.status(200).json({
                totalExecute: formatNumber(global.execCount || 0),
                totalExecuteRaw: global.execCount || 0,
                fullDateTime: formatWIB(wibTime),
                lastExecute: formatWIB(wibLastTime)
            });
        }

        // POST: perlu auth - NAMBAH
        if (req.method === 'POST') {
            if (authHeader !== `Bearer ${API_KEY}`) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const amount = parseInt(req.query.amount) || 1;

            const kvUrl = process.env.KV_REST_API_URL;
            const kvToken = process.env.KV_REST_API_TOKEN;

            if (!kvUrl || !kvToken) {
                if (!global.execCount) global.execCount = 0;
                global.execCount += amount;
                global.lastUpdate = new Date().toISOString();
                
                return res.status(200).json({ 
                    total: formatNumber(global.execCount),
                    totalRaw: global.execCount,
                    action: 'incremented',
                    added: amount
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

            count += amount;

            await fetch(`${kvUrl}/set/exec_count/${count}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${kvToken}` }
            });

            global.execCount = count;
            global.lastUpdate = new Date().toISOString();

            return res.status(200).json({ 
                total: formatNumber(count),
                totalRaw: count,
                action: 'incremented',
                added: amount
            });
        }

        // DELETE: perlu auth - KURANGIN
        if (req.method === 'DELETE') {
            if (authHeader !== `Bearer ${API_KEY}`) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const amount = parseInt(req.query.amount) || 1;

            const kvUrl = process.env.KV_REST_API_URL;
            const kvToken = process.env.KV_REST_API_TOKEN;

            if (!kvUrl || !kvToken) {
                if (!global.execCount) global.execCount = 0;
                global.execCount = Math.max(0, global.execCount - amount);
                global.lastUpdate = new Date().toISOString();
                
                return res.status(200).json({ 
                    total: formatNumber(global.execCount),
                    totalRaw: global.execCount,
                    action: 'decremented',
                    removed: amount
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

            count = Math.max(0, count - amount);

            await fetch(`${kvUrl}/set/exec_count/${count}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${kvToken}` }
            });

            global.execCount = count;
            global.lastUpdate = new Date().toISOString();

            return res.status(200).json({ 
                total: formatNumber(count),
                totalRaw: count,
                action: 'decremented',
                removed: amount
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
                                                      }
