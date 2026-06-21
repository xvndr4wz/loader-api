const https = require('https');

const SETTINGS = {
    TOTAL_LAYERS: 5,
    RATE_LIMIT_MS: 10000,
    RATE_LIMIT_MAX: 3,
    PLAIN_TEXT_URL: "https://pastefy.app/cMzbfLvJ/raw",
    REAL_SCRIPT_URL: "https://pastefy.app/CoG7X467/raw",
    LOGGER_SCRIPT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader-api/refs/heads/main/api/logger/logscript.lua"
};

let sessions = {}; 
let rateLimits = {}; // { ip: { count, firstRequestAt } }

function fetchRaw(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data));
        }).on('error', () => resolve(null));
    });
}

function getRandomError() {
    const errorCodes = [400, 401, 403, 404, 500, 502, 503];
    return errorCodes[Math.floor(Math.random() * errorCodes.length)];
}

async function sendSecurityLogToLogJs(message, ip, type) {
    const data = JSON.stringify({ 
        type: "security",
        securityType: type,
        message: message,
        ip: ip
    });
    return new Promise((resolve) => {
        const url = new URL('https://api-ndraawz.vercel.app/api/logger/log');
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            res.resume();
            resolve(true);
        });
        req.on('error', () => resolve(false));
        req.write(data);
        req.end();
    });
}

function makeSession(ownerIp, stepSequence, currentIndex) {
    const now = Date.now();
    const ipPart = ownerIp.split('.').pop() || "0";
    const seed = parseInt(ipPart) + Math.floor(Math.random() * 10000);
    const newSessionID = seed.toString(36).substring(0, 4).padEnd(4, 'x');
    const nextKey = Math.random().toString(36).substring(2, 8);

    sessions[newSessionID] = {
        ownerIP: ownerIp,
        stepSequence: stepSequence,
        currentIndex: currentIndex,
        nextKey: nextKey,
        lastTime: now,
        used: false
    };

    return { newSessionID, nextKey };
}

// Auto cleanup setiap 5 menit
setInterval(() => {
    const now = Date.now();
    for (const id in sessions) {
        if (now - sessions[id].lastTime > 300000) delete sessions[id];
    }
    for (const ip in rateLimits) {
        if (now - rateLimits[ip].firstRequestAt > SETTINGS.RATE_LIMIT_MS) delete rateLimits[ip];
    }
}, 300000);

module.exports = async function(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    const cleanIp = ip.replace('::ffff:', '');
    
    const isRoblox = agent.includes("Roblox") && 
                     (req.headers['roblox-id'] || req.headers['x-roblox-place-id'] || agent.includes("RobloxApp"));
    const isDiscord = agent.includes("Discordbot");
    
    if (!isRoblox || isDiscord) {
        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(getRandomError()).send(plainResp || "SECURITY : BANNED ACCESS!");
    }
    
    const urlParts = req.url.split('?');
    const queryString = urlParts[1] || "";
    const params = queryString.split('.');
    
    const step = params[0]; 
    const id = params[1];   
    const key = params[2];  
    
    const currentStep = parseInt(step) || 0;
    const host = req.headers.host;
    const currentPath = urlParts[0];
    
    try {
        // ========== STEP 0: RATE LIMIT + INIT SESSION ==========
        if (currentStep === 0) {
            const rateData = rateLimits[cleanIp];

            if (rateData) {
                const elapsed = now - rateData.firstRequestAt;
                const sisaCooldown = Math.ceil((SETTINGS.RATE_LIMIT_MS - elapsed) / 1000);

                if (elapsed < SETTINGS.RATE_LIMIT_MS) {
                    rateData.count++;

                    if (rateData.count > SETTINGS.RATE_LIMIT_MAX) {
                        // Sudah melebihi batas, kirim log
                        await sendSecurityLogToLogJs(
                            `🚨 **SPAM DETECTED**\n` +
                            `📡 **IP:** \`${cleanIp}\`\n` +
                            `🔢 **Load ke:** ${rateData.count}x (maks ${SETTINGS.RATE_LIMIT_MAX}x per ${SETTINGS.RATE_LIMIT_MS / 1000} detik)\n` +
                            `⏳ **Sisa cooldown:** ${sisaCooldown} detik lagi`,
                            cleanIp,
                            "spam_detect"
                        );
                        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
                        return res.status(getRandomError()).send(plainResp || "SECURITY : BANNED ACCESS!");
                    }
                } else {
                    // Reset karena sudah lewat cooldown
                    rateLimits[cleanIp] = { count: 1, firstRequestAt: now };
                }
            } else {
                // Request pertama
                rateLimits[cleanIp] = { count: 1, firstRequestAt: now };
            }

            let sequence = [];
            while (sequence.length < SETTINGS.TOTAL_LAYERS) {
                let r = Math.floor(Math.random() * 300) + 1;
                if (!sequence.includes(r)) sequence.push(r);
            }

            const { newSessionID, nextKey } = makeSession(cleanIp, sequence, 0);
            const nextUrl = "https://" + host + currentPath + "?" + sequence[0] + "." + newSessionID + "." + nextKey;
            const luaScript = "loadstring(game:HttpGet(\"" + nextUrl + "\"))()";
            return res.status(200).send(luaScript);
        }

        // ========== VALIDASI HANDSHAKE ==========
        const session = sessions[id];

        if (!session || session.ownerIP !== cleanIp) {
            const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
            return res.status(getRandomError()).send(plainResp || "SECURITY : BANNED ACCESS!");
        }

        if (currentStep !== session.stepSequence[session.currentIndex]) {
            delete sessions[id];
            return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
        }

        if (session.used === true) {
            await sendSecurityLogToLogJs(
                `🚫 **REPLAY ATTACK DETECTED**\n` +
                `📡 **IP:** \`${cleanIp}\`\n` +
                `⚠️ Mencoba mengakses link yang sudah mati`,
                cleanIp,
                "replay_attack"
            );
            delete sessions[id];
            return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
        }

        if (session.nextKey !== key) {
            delete sessions[id];
            return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
        }

        session.used = true;

        const idx = session.currentIndex;

        // ========== LAYER TERAKHIR (idx = TOTAL_LAYERS-1): MAIN SCRIPT ==========
        if (idx === SETTINGS.TOTAL_LAYERS - 1) {
            const mainScript = await fetchRaw(SETTINGS.REAL_SCRIPT_URL);
            delete sessions[id];
            return res.status(200).send(mainScript || '');
        }

        // ========== LAYER SEBELUM TERAKHIR (idx = TOTAL_LAYERS-2): LOGGER + LOADSTRING ==========
        if (idx === SETTINGS.TOTAL_LAYERS - 2) {
            const nextIdx = SETTINGS.TOTAL_LAYERS - 1;
            const nextStepNumber = session.stepSequence[nextIdx];
            const { newSessionID, nextKey } = makeSession(session.ownerIP, session.stepSequence, nextIdx);
            delete sessions[id];

            const loggerScript = await fetchRaw(SETTINGS.LOGGER_SCRIPT_URL);
            const nextUrl = "https://" + host + currentPath + "?" + nextStepNumber + "." + newSessionID + "." + nextKey;

            const luaScript = "loadstring(game:HttpGet(\"" + nextUrl + "\"))()\n" +
                              (loggerScript || '');
            return res.status(200).send(luaScript);
        }

        // ========== LAYER BIASA: REDIRECT ==========
        const nextIdx = idx + 1;
        const nextStepNumber = session.stepSequence[nextIdx];
        const { newSessionID, nextKey } = makeSession(session.ownerIP, session.stepSequence, nextIdx);
        delete sessions[id];

        const nextUrl = "https://" + host + currentPath + "?" + nextStepNumber + "." + newSessionID + "." + nextKey;
        const luaScript = "loadstring(game:HttpGet(\"" + nextUrl + "\"))()";
        return res.status(200).send(luaScript);

    } catch (err) {
        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(getRandomError()).send(plainResp || "SECURITY : BANNED ACCESS!");
    }
};
