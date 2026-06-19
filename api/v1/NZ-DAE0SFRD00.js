const https = require('https');

const SETTINGS = {
    TOTAL_LAYERS: 5,
    MIN_WAIT: 112, 
    MAX_WAIT: 119, 
    SESSION_EXPIRY: 10000, 
    KEY_LIFETIME: 5000,   
    PLAIN_TEXT_URL: "https://pastefy.app/cMzbfLvJ/raw",
    REAL_SCRIPT_URL: "https://pastefy.app/CoG7X467/raw",
    LOGGER_SCRIPT_URL: "https://raw.githubusercontent.com/xvndr4wz/loader-api/refs/heads/main/scripts/NdraawzHubBF.lua"
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

function makeSession(ownerIp, stepSequence, currentIndex, startTime) {
    const now = Date.now();
    const rand = Math.random().toString(36).substring(2, 6);
    const newSessionID = rand.padEnd(4, 'x');
    const nextKey = Math.random().toString(36).substring(2, 8);
    const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;

    sessions[newSessionID] = {
        ownerIP: ownerIp,
        stepSequence: stepSequence,
        currentIndex: currentIndex,
        nextKey: nextKey,
        lastTime: now,
        startTime: startTime || now,
        keyCreatedAt: now,
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
        // ========== VALIDASI HANDSHAKE ==========
        if (currentStep > 0) {
            const session = sessions[id];
            
            if (!session || session.ownerIP !== cleanIp) {
                const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
                return res.status(getRandomError()).send(plainResp || "SECURITY : BANNED ACCESS!");
            }
            
            const expectedStep = session.stepSequence[session.currentIndex];
            if (currentStep !== expectedStep) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            
            if (session.used === true) {
                blacklist[cleanIp] = true;
                await sendSecurityLogToLogJs("🚫 **REPLAY ATTACK** - Mencoba akses ulang link mati", cleanIp, "replay_attack");
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            
            const sessionDuration = now - session.startTime;
            const keyDuration = now - session.keyCreatedAt;
            if (sessionDuration > SETTINGS.SESSION_EXPIRY || keyDuration > SETTINGS.KEY_LIFETIME) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            
            if (session.nextKey !== key) {
                delete sessions[id];
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }
            
            const timeSinceLastRequest = now - session.lastTime;
            if (timeSinceLastRequest < session.requiredWait) {
                blacklist[cleanIp] = true;
                delete sessions[id];
                await sendSecurityLogToLogJs("🚫 **DETECT BOT** - Timing violation", cleanIp, "bot_detect");
                return res.status(getRandomError()).send("SECURITY : BANNED ACCESS!");
            }

            session.used = true;
        }
        
        // ========== STEP 0: INIT SESSION ==========
        if (currentStep === 0) {
            let sequence = [];
            while (sequence.length < SETTINGS.TOTAL_LAYERS) {
                let r = Math.floor(Math.random() * 300) + 1;
                if (!sequence.includes(r)) sequence.push(r);
            }

            // currentIndex: 0 → layer pertama akan dicek di index 0
            const { newSessionID, nextKey, waitTime } = makeSession(cleanIp, sequence, 0);

            const firstStep = sequence[0];
            const nextUrl = "https://" + host + currentPath + "?" + firstStep + "." + newSessionID + "." + nextKey;
            const luaScript = "task.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()";
            return res.status(200).send(luaScript);
        }

        // ========== AMBIL SESSION & INDEX SAAT INI ==========
        const session = sessions[id];
        const idx = session.currentIndex; // index SEKARANG sebelum apapun

        /*
         * Mapping index ke layer (TOTAL_LAYERS = 5):
         * idx 0 → layer 1 → redirect biasa (next idx 1)
         * idx 1 → layer 2 → redirect biasa (next idx 2)
         * idx 2 → layer 3 → redirect biasa (next idx 3)  ← batas: TOTAL_LAYERS - 3 = 2
         * idx 3 → layer 4 → logger + redirect           ← TOTAL_LAYERS - 2 = 3
         * idx 4 → layer 5 → main script                 ← TOTAL_LAYERS - 1 = 4
         */

        // ========== LAYER TERAKHIR: MAIN SCRIPT ==========
        if (idx === SETTINGS.TOTAL_LAYERS - 1) {
            const mainScript = await fetchRaw(SETTINGS.REAL_SCRIPT_URL);
            delete sessions[id];
            return res.status(200).send(mainScript || '');
        }

        // ========== LAYER LOGGER: LOAD LOGGER + REDIRECT KE LAYER TERAKHIR ==========
        if (idx === SETTINGS.TOTAL_LAYERS - 2) {
            const nextIndex = idx + 1;
            const { newSessionID, nextKey, waitTime } = makeSession(
                session.ownerIP, session.stepSequence, nextIndex, session.startTime
            );
            delete sessions[id];

            const loggerScript = await fetchRaw(SETTINGS.LOGGER_SCRIPT_URL);
            const nextStepNumber = session.stepSequence[nextIndex];
            const nextUrl = "https://" + host + currentPath + "?" + nextStepNumber + "." + newSessionID + "." + nextKey;
            const luaScript = (loggerScript || '') + "\ntask.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()";
            return res.status(200).send(luaScript);
        }

        // ========== LAYER BIASA: REDIRECT ==========
        // idx 0, 1, 2 (semua < TOTAL_LAYERS - 2)
        const nextIndex = idx + 1;
        const { newSessionID, nextKey, waitTime } = makeSession(
            session.ownerIP, session.stepSequence, nextIndex, session.startTime
        );
        delete sessions[id];

        const nextStepNumber = session.stepSequence[nextIndex];
        const nextUrl = "https://" + host + currentPath + "?" + nextStepNumber + "." + newSessionID + "." + nextKey;
        const luaScript = "task.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()";
        return res.status(200).send(luaScript);

    } catch (err) {
        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(getRandomError()).send(plainResp || "SECURITY : BANNED ACCESS!");
    }
};
