import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    try {
        const filePath = path.join(process.cwd(), 'executions.json');

        let data = { totalExecutions: 0, lastUpdated: null };
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            data = JSON.parse(content);
        } catch (e) {
            // File tidak ada
        }

        const lastUpdatedDate = new Date(data.lastUpdated || new Date());
        const wibTime = new Date(lastUpdatedDate.getTime() + (7 * 60 * 60 * 1000));

        const hours = String(wibTime.getUTCHours()).padStart(2, '0');
        const minutes = String(wibTime.getUTCMinutes()).padStart(2, '0');
        const seconds = String(wibTime.getUTCSeconds()).padStart(2, '0');
        const milliseconds = String(wibTime.getUTCMilliseconds()).padStart(3, '0');
        const timeStr = `${hours}:${minutes}:${seconds}.${milliseconds}`;

        const hour = wibTime.getUTCHours();
        let timeOfDay = '';
        if (hour >= 5 && hour < 11) timeOfDay = 'Pagi';
        else if (hour >= 11 && hour < 15) timeOfDay = 'Siang';
        else if (hour >= 15 && hour < 18) timeOfDay = 'Sore';
        else timeOfDay = 'Malam';

        const day = String(wibTime.getUTCDate()).padStart(2, '0');
        const month = String(wibTime.getUTCMonth() + 1).padStart(2, '0');
        const year = wibTime.getUTCFullYear();
        const dateStr = `${day}-${month}-${year}`;

        return res.status(200).json({
            totalExecute: data.totalExecutions,
            lastUpdate: `${timeStr} (${timeOfDay})`,
            fullDate: dateStr
        });
    } catch (err) {
        console.error('Stats error:', err);
        return res.status(500).json({ error: err.message });
    }
                                                                 }
