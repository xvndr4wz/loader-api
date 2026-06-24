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
                const milliseconds = String(wibDate.getUTCMilliseconds()).padStart(3, '0');
                
                const day = wibDate.getUTCDate();
                const month = wibDate.getUTCMonth();
                const year = wibDate.getUTCFullYear();
                
                const monthNames = ['januari', 'februari', 'maret', 'april', 'mei', 'juni',
                                   'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
                
                const timeStr = `${hours}:${minutes}:${seconds}.${milliseconds}`;
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
                totalExecute: global.execCount || 0,
                fullDateTime: formatWIB(wibTime),
                lastExecute: formatWIB(wibLastTime)
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
                global.lastUpdate = new Date().toISOString();
                
                return res.status(200).json({ 
                    total: global.execCount,
                    status: 'updated'
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

            global.execCount = count;
            global.lastUpdate = new Date().toISOString();

            return res.status(200).json({ 
                total: count,
                status: 'updated'
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
                }
