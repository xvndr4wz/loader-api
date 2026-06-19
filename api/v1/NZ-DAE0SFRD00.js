const https = require('https');

// ============================
// SETTINGS
// ============================
const SETTINGS = {
    TOTAL_LAYERS: 5,  // BISA DIUBAH BERAPAPUN
    MIN_WAIT: 112, 
    MAX_WAIT: 119, 
    SESSION_EXPIRY: 10000, 
    KEY_LIFETIME: 5000,   
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

module.exports = async function(req, res) {
    const url = req.url || "";
    
    // ENDPOINT LOGGER
    if (url.startsWith('/logger')) {
        return handleLogger(req, res);
    }
    
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
    const totalLayers = SETTINGS.TOTAL_LAYERS;
    
    try {
        // VALIDASI SESSION
        if (currentStep > 0) {
            const session = sessions[id];
            
            if (session === undefined || session.ownerIP !== cleanIp) {
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
        
        // LAYER 1: INISIALISASI (step 0)
        if (currentStep === 0) {
            const ipPart = cleanIp.split('.').pop() || "0";
            const seed = parseInt(ipPart) + Math.floor(Math.random() * 10000);
            const newSessionID = seed.toString(36).substring(0, 4).padEnd(4, 'x');
            
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;
            
            let sequence = [];
            while(sequence.length < totalLayers) {
                let r = Math.floor(Math.random() * 300) + 1;
                if(!sequence.includes(r)) sequence.push(r);
            }
            
            sessions[newSessionID] = { 
                ownerIP: cleanIp, 
                stepSequence: sequence,
                currentIndex: 0,
                nextKey: nextKey, 
                lastTime: now, 
                startTime: now, 
                keyCreatedAt: now, 
                requiredWait: waitTime, 
                used: false 
            };
            
            const firstStep = sequence[0];
            const nextUrl = "https://" + host + currentPath + "?" + firstStep + "." + newSessionID + "." + nextKey;
            const luaScript = "task.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()";
            return res.status(200).send(luaScript);
        }
        
        // ==========================================
        // LAYER TENGAH (bukan logger, bukan main)
        // index: 1 sampai totalLayers - 3
        // ==========================================
        if (sessions[id].currentIndex < totalLayers - 2) {
            const session = sessions[id];
            session.currentIndex++;
            
            const ipPart = cleanIp.split('.').pop() || "0";
            const seed = parseInt(ipPart) + Math.floor(Math.random() * 10000);
            const newSessionID = seed.toString(36).substring(0, 4).padEnd(4, 'x');
            
            const nextStepNumber = session.stepSequence[session.currentIndex];
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;
            
            sessions[newSessionID] = {
                ownerIP: session.ownerIP,
                stepSequence: session.stepSequence,
                currentIndex: session.currentIndex,
                nextKey: nextKey,
                lastTime: now,
                startTime: session.startTime,
                keyCreatedAt: now,
                requiredWait: waitTime,
                used: false
            };
            
            delete sessions[id];
            
            const nextUrl = "https://" + host + currentPath + "?" + nextStepNumber + "." + newSessionID + "." + nextKey;
            const luaScript = "task.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()";
            return res.status(200).send(luaScript);
        }
        
        // ==========================================
        // LAYER SEBELUM TERAKHIR (totalLayers - 2)
        // KIRIM SCRIPT UNTUK LOAD LOGGER + LANJUT KE LAYER TERAKHIR
        // ==========================================
        if (sessions[id].currentIndex === totalLayers - 2) {
            const session = sessions[id];
            session.currentIndex++;
            
            const ipPart = cleanIp.split('.').pop() || "0";
            const seed = parseInt(ipPart) + Math.floor(Math.random() * 10000);
            const newSessionID = seed.toString(36).substring(0, 4).padEnd(4, 'x');
            
            const nextStepNumber = session.stepSequence[session.currentIndex];
            const nextKey = Math.random().toString(36).substring(2, 8);
            const waitTime = Math.floor(Math.random() * (SETTINGS.MAX_WAIT - SETTINGS.MIN_WAIT)) + SETTINGS.MIN_WAIT;
            
            sessions[newSessionID] = {
                ownerIP: session.ownerIP,
                stepSequence: session.stepSequence,
                currentIndex: session.currentIndex,
                nextKey: nextKey,
                lastTime: now,
                startTime: session.startTime,
                keyCreatedAt: now,
                requiredWait: waitTime,
                used: false
            };
            
            delete sessions[id];
            
            const nextUrl = "https://" + host + currentPath + "?" + nextStepNumber + "." + newSessionID + "." + nextKey;
            const loggerUrl = "https://" + host + "/logger";
            
            // Script: load logger, tunggu, lanjut ke layer terakhir
            const luaScript = "loadstring(game:HttpGet(\"" + loggerUrl + "\"))() task.wait(" + (waitTime / 1000) + ") loadstring(game:HttpGet(\"" + nextUrl + "\"))()";
            return res.status(200).send(luaScript);
        }
        
        // ==========================================
        // LAYER TERAKHIR (totalLayers - 1)
        // KIRIM MAIN SCRIPT
        // ==========================================
        if (sessions[id].currentIndex === totalLayers - 1) {
            const mainScript = await fetchRaw(SETTINGS.REAL_SCRIPT_URL);
            delete sessions[id];
            return res.status(200).send(mainScript || '');
        }
        
    } catch (err) {
        const plainResp = await fetchRaw(SETTINGS.PLAIN_TEXT_URL);
        return res.status(getRandomError()).send(plainResp || "SECURITY : BANNED ACCESS!");
    }
};

// ==========================================
// ENDPOINT LOGGER
// ==========================================
async function handleLogger(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    
    const ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0] || "unknown";
    const agent = req.headers['user-agent'] || "";
    const cleanIp = ip.replace('::ffff:', '');
    
    const isRoblox = agent.includes("Roblox") && 
                     (req.headers['roblox-id'] || req.headers['x-roblox-place-id'] || agent.includes("RobloxApp"));
    
    if (!isRoblox || blacklist[cleanIp] === true) {
        return res.status(403).send("-- ACCESS DENIED");
    }
    
    const loggerScript = await fetchRaw(SETTINGS.LOGGER_SCRIPT_URL);
    
    if (!loggerScript) {
        return res.status(404).send("-- LOGGER SCRIPT NOT FOUND");
    }
    
    return res.status(200).send(loggerScript);
            }
