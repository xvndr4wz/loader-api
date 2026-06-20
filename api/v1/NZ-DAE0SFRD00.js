const https = require('https');

const SETTINGS = {
    TOTAL_LAYERS: 6,
    MIN_WAIT: 112, 
    MAX_WAIT: 119, 
    PLAIN_TEXT_URL: "https://pastefy.app/cMzbfLvJ/raw",
    REAL_SCRIPT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader-api/refs/heads/main/scripts/NdraawzHubBF.lua",
    LOGGER_SCRIPT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader-api/refs/heads/main/api/logger/logscript.lua"
};

let sessions = {}; 
let blacklist = {}; 

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
        const req = https.request('https://api-ndraawz.vercel.app/api/logger/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
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
    const newSessionID = Math.random().toString(36).substring(2, 6).padEnd(4, 'x');
    const nextKey = Math.random().toString(36).substring(2, 8);
    const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

    sessions[newSessionID] = {
        ownerIP: ownerIp,
        stepSequence: stepSequence,
        currentIndex: currentIndex,
        nextKey: nextKey,
        lastTime: now,
        requiredWait: waitTime,
        used: false
    };

    return { newSessionID, nextKey, waitTime };
}

module.exports = async function(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    
    const now = Date.now();
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    const cleanIp = ip.replace('::ffff:', '');
    
    const isRoblox = agent.includes("Roblox") && 
                     (req.headers['roblox-id'] || req.headers['x-roblox-place-id'] || agent.includes("RobloxApp"));
    const isDiscord = agent.includes("Discordbot");
    
    if (!isRoblox || isDiscord || blacklist[cleanIp] === true) {
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
        // ========== STEP 0: INIT ==========
        if (currentStep === 0) {
            let sequence = [];
            while (sequence.length < SETTINGS.TOTAL_LAYERS) {
                let r = Math.floor(Math.random() * 300) + 1;
                if (!sequence.includes(r)) sequence.push(r);
            }

            const { newSessionID, nextKey, waitTime } = makeSession(cleanIp, sequence, 0);
            const nextUrl = "https://" + host + currentPath + "?" + sequence[0] + "." + newSessionID + "." + nextKey;
            const luaScript = "task.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()";
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
            blacklist[cleanIp] = true;
            await sendSecurityLogToLogJs("🚫 **REPLAY ATTACK** - Mencoba akses ulang link mati", cleanIp, "replay_attack");
            delete sessions[id];
            return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
        }

        if (session.nextKey !== key) {
            delete sessions[id];
            return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
        }

        if ((now - session.lastTime) < session.requiredWait) {
            blacklist[cleanIp] = true;
            delete sessions[id];
            await sendSecurityLogToLogJs("🚫 **DETECT BOT** - Timing violation", cleanIp, "bot_detect");
            return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
        }

        const idx = session.currentIndex;
        session.used = true;

        // idx 0 sampai TOTAL_LAYERS-1
        // contoh TOTAL_LAYERS=6:
        // idx 0,1,2,3 → redirect biasa
        // idx 4        → logger (atas loadstring, bawah logger)
        // idx 5        → main script

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
            const { newSessionID, nextKey, waitTime } = makeSession(
                session.ownerIP, session.stepSequence, nextIdx
            );
            delete sessions[id];

            const loggerScript = await fetchRaw(SETTINGS.LOGGER_SCRIPT_URL);
            const nextUrl = "https://" + host + currentPath + "?" + nextStepNumber + "." + newSessionID + "." + nextKey;

            // loadstring PALING ATAS, logger di bawah
            const luaScript = "task.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()\n" +
                              (loggerScript || '');
            return res.status(200).send(luaScript);
        }

        // ========== LAYER BIASA (idx 0 sampai TOTAL_LAYERS-3): REDIRECT ==========
        const nextIndex = idx + 1;
        const nextStepNumber = session.stepSequence[nextIndex];
        const { newSessionID, nextKey, waitTime } = makeSession(
            session.ownerIP, session.stepSequence, nextIndex
        );
        delete sessions[id];

        const nextUrl = "https://" + host + currentPath + "?" + nextStepNumber + "." + newSessionID + "." + nextKey;
        const luaScript = "task.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()";
        return res.status(200).send(luaScript);

    } catch (err) {
        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(getRandomError()).send(plainResp || "SECURITY : BANNED ACCESS!");
    }
};
