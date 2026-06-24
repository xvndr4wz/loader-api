import fs from 'fs';
import path from 'path';

const API_KEY = "NdraawzOnTop";
const DATA_FILE = path.join(process.cwd(), 'executions.json');

function formatNumber(num) {
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(3).replace(/\.?0+$/, '') + 'T';
    if (num >= 1000000000) return (num / 1000000000).toFixed(3).replace(/\.?0+$/, '') + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(3).replace(/\.?0+$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(3).replace(/\.?0+$/, '') + 'K';
    return num.toString();
}

function readData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) {}
    return { execCount: 0, lastUpdate: new Date().toISOString() };
}

function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function formatWIB(date) {
    const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    const hours = String(wibDate.getUTCHours()).padStart(2, '0');
    const minutes = String(wibDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(wibDate.getUTCSeconds()).padStart(2, '0');
    const day = wibDate.getUTCDate();
    const month = wibDate.getUTCMonth();
    const year = wibDate.getUTCFullYear();
    const monthNames = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
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

export default async function handler(req, res) {
    const authHeader = req.headers['authorization'];

    try {
        if (req.method === 'GET') {
            const data = readData();
            const now = new Date();
            return res.status(200).json({
                totalExecute: formatNumber(data.execCount),
                totalExecuteRaw: data.execCount,
                fullDateTime: formatWIB(now),
                lastExecute: formatWIB(new Date(data.lastUpdate))
            });
        }

        if (req.method === 'POST') {
            if (authHeader !== `Bearer ${API_KEY}`) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const amount = parseInt(req.query.amount) || 1;
            const data = readData();
            data.execCount += amount;
            data.lastUpdate = new Date().toISOString();
            writeData(data);

            return res.status(200).json({
                total: formatNumber(data.execCount),
                totalRaw: data.execCount,
                action: 'incremented',
                added: amount
            });
        }

        if (req.method === 'DELETE') {
            if (authHeader !== `Bearer ${API_KEY}`) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const amount = parseInt(req.query.amount) || 1;
            const data = readData();
            data.execCount = Math.max(0, data.execCount - amount);
            data.lastUpdate = new Date().toISOString();
            writeData(data);

            return res.status(200).json({
                total: formatNumber(data.execCount),
                totalRaw: data.execCount,
                action: 'decremented',
                removed: amount
            });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
                                                             }
