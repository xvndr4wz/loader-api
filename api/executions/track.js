import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const filePath = path.join(process.cwd(), 'executions.json');

        let data = { totalExecutions: 0, lastUpdated: null };
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            data = JSON.parse(content);
        } catch (e) {
            // File tidak ada, buat baru
        }

        data.totalExecutions += 1;
        data.lastUpdated = new Date().toISOString();

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        return res.status(200).json({ ok: true, total: data.totalExecutions });
    } catch (err) {
        console.error('Track error:', err);
        return res.status(500).json({ error: err.message });
    }
}
