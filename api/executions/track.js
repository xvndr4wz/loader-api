export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(process.cwd(), 'executions.json');

        let data = { totalExecutions: 0, lastUpdated: null };
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            data = JSON.parse(content);
        }

        data.totalExecutions += 1;
        data.lastUpdated = new Date().toISOString();

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        return res.status(200).json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
