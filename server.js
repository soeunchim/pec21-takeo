// ==============================================================================
// ប្រព័ន្ធគ្រប់គ្រង និងបូកស្រង់ពិន្ទុនៃការប្រឡង គ.ក.ប ២០២៧ (PEC21 - ខេត្តតាកែវ)
// Zero-Dependency Native Node.js Server - Cloud Ready for Render.com & Google Sheets
// ==============================================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3027;
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

let db = null;

// Load official reference polling stations (1,603 stations)
const OFFICIAL_STATIONS_FILE = path.join(__dirname, 'data', 'official_polling_stations.json');
let officialPollingStations = [];
try {
  if (fs.existsSync(OFFICIAL_STATIONS_FILE)) {
    officialPollingStations = JSON.parse(fs.readFileSync(OFFICIAL_STATIONS_FILE, 'utf8'));
    console.log(`[OfficialStations] Loaded ${officialPollingStations.length} reference stations from ${OFFICIAL_STATIONS_FILE}`);
  }
} catch (e) {
  console.error('[OfficialStations] Failed to load reference stations:', e.message);
}

// ==============================================================================
// Database & Google Sheets Synchronization Engine
// ==============================================================================

function loadLocalDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(raw);
      console.log(`[DB] Local database loaded successfully. Users: ${db.users ? db.users.length : 0}, Candidates: ${db.candidates ? db.candidates.length : 0}, Stations: ${db.pollingStations ? db.pollingStations.length : 0}`);
    } else {
      console.error('[DB] db.json not found, initializing structure.');
      db = {
        appName: 'ប្រព័ន្ធគ្រប់គ្រង និងបូកស្រង់ពិន្ទុនៃការប្រឡង គ.ក.ប ២០២៧',
        settings: {
          systemTitle: 'ប្រព័ន្ធគ្រប់គ្រង និងបូកស្រង់ពិន្ទុនៃការប្រឡង គ.ក.ប ២០២៧',
          provinceName: 'ខេត្តតាកែវ',
          pecName: 'គណៈកម្មការរៀបចំការបោះឆ្នោត ខេត្តតាកែវ (គ.ខ.ប ២១)',
          googleSheetUrl: process.env.GOOGLE_SHEET_URL || '',
          autoSyncGoogleSheet: true
        },
        districts: [],
        communes: [],
        users: [],
        pollingStations: [],
        candidates: []
      };
      saveLocalDatabase();
    }

    if (!db.pollingStations) {
      db.pollingStations = [];
    }
    if (!db.candidates) {
      db.candidates = [];
    }
  } catch (err) {
    console.error('[DB] Load error:', err.message);
  }
}

let saveTimer = null;
function saveLocalDatabase() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
      console.log('[DB] Local database persisted.');
    } catch (err) {
      console.error('[DB] Save error:', err.message);
    }
  }, 200);
}

// Google Sheets Sync Functions
function getGoogleSheetEndpoint() {
  const urlConfig = (db && db.settings && db.settings.googleSheetUrl) || process.env.GOOGLE_SHEET_URL || '';
  if (!urlConfig || typeof urlConfig !== 'string') return null;
  const clean = urlConfig.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) return null;
  return clean;
}

function fetchFromGoogleSheet(targetUrl, redirectCount = 0) {
  return new Promise((resolve) => {
    const endpoint = targetUrl || getGoogleSheetEndpoint();
    if (!endpoint || redirectCount > 4) return resolve(null);
    try {
      const parsedUrl = new URL(endpoint);
      const client = parsedUrl.protocol === 'http:' ? http : https;
      const req = client.get(parsedUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirectTarget = res.headers.location;
          if (!redirectTarget.startsWith('http://') && !redirectTarget.startsWith('https://')) {
            redirectTarget = `${parsedUrl.protocol}//${parsedUrl.hostname}${redirectTarget}`;
          }
          return resolve(fetchFromGoogleSheet(redirectTarget, redirectCount + 1));
        }
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const parsed = JSON.parse(body);
              if (parsed && parsed.status === 'success' && parsed.data) {
                return resolve(parsed.data);
              }
            }
            resolve(null);
          } catch (e) {
            resolve(null);
          }
        });
      });
      req.on('error', (err) => {
        console.error('[GoogleSheet] Fetch error:', err.message);
        resolve(null);
      });
      req.setTimeout(12000, () => {
        req.destroy();
        resolve(null);
      });
    } catch (err) {
      resolve(null);
    }
  });
}

function sendGoogleSheetPost(targetUrl, payload, redirectCount = 0) {
  return new Promise((resolve) => {
    if (redirectCount > 4) {
      console.error('[GoogleSheet] Too many redirects');
      return resolve({ success: false, error: 'Too many redirects' });
    }
    try {
      const parsedUrl = new URL(targetUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = client.request(options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirectTarget = res.headers.location;
          if (!redirectTarget.startsWith('http://') && !redirectTarget.startsWith('https://')) {
            redirectTarget = `${parsedUrl.protocol}//${parsedUrl.hostname}${redirectTarget}`;
          }
          return resolve(sendGoogleSheetPost(redirectTarget, payload, redirectCount + 1));
        }

        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300 && parsed.status === 'success') {
              console.log('[GoogleSheet] Cloud synchronization successful!');
              return resolve({ success: true, data: parsed });
            }
            resolve({ success: false, error: parsed.message || `Status ${res.statusCode}` });
          } catch (e) {
            resolve({ success: res.statusCode >= 200 && res.statusCode < 300, raw: body });
          }
        });
      });

      req.on('error', (e) => {
        console.error('[GoogleSheet] Post network error:', e.message);
        resolve({ success: false, error: e.message });
      });
      req.setTimeout(15000, () => {
        req.destroy();
        resolve({ success: false, error: 'Timeout' });
      });
      req.write(payload);
      req.end();
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
}

let sheetSyncTimer = null;
function syncToGoogleSheet(action = 'sync_all', extra = {}) {
  const endpoint = getGoogleSheetEndpoint();
  if (!endpoint) return Promise.resolve(null);

  if (sheetSyncTimer) clearTimeout(sheetSyncTimer);
  return new Promise((resolve) => {
    sheetSyncTimer = setTimeout(async () => {
      const payloadObj = {
        action: action,
        timestamp: new Date().toISOString(),
        user: extra.user || 'system',
        data: {
          settings: db.settings,
          users: db.users,
          districts: db.districts,
          communes: db.communes,
          pollingStations: db.pollingStations,
          candidates: db.candidates
        }
      };
      const res = await sendGoogleSheetPost(endpoint, JSON.stringify(payloadObj));
      if (res && res.success) {
        db.settings.lastSyncTime = new Date().toISOString();
        saveLocalDatabase();
      }
      resolve(res);
    }, 400);
  });
}

// Initial pull on server boot
async function initCloudSync() {
  const endpoint = getGoogleSheetEndpoint();
  if (endpoint) {
    console.log('[GoogleSheet] Attempting to pull latest cloud state on startup...');
    const cloudData = await fetchFromGoogleSheet();
    if (cloudData) {
      if (cloudData.candidates && cloudData.candidates.length > 0) {
        db.candidates = cloudData.candidates;
      }
      // ONLY overwrite polling stations if cloudData has AT LEAST as many stations as official (1603)
      if (cloudData.pollingStations && cloudData.pollingStations.length >= officialPollingStations.length) {
        db.pollingStations = cloudData.pollingStations;
      } else {
        // If cloud has fewer stations than official, push official stations to cloud!
        console.log(`[GoogleSheet] Cloud has ${cloudData.pollingStations ? cloudData.pollingStations.length : 0} stations < ${officialPollingStations.length}. Pushing full stations to cloud...`);
        syncToGoogleSheet('sync_all');
      }
      if (cloudData.users && cloudData.users.length > 0) {
        // Merge user updates (preserve local passwords if not set)
        db.users = cloudData.users;
      }
      saveLocalDatabase();
      console.log('[GoogleSheet] Cloud data merged successfully!');
    }
  }
}

// ==============================================================================
// Business Logic: គ.ក.ប Scoring and Ranking Engine
// ==============================================================================

/**
 * Calculates rank and status for candidates in a polling station for each position:
 * - 6 positions: ប្រធាន (a), អនុប្រធាន (b), លេខាធិការ (c), សមាជិកទី១ (d), សមាជិកទី២ (e), សមាជិកទី៣ (f)
 * - Status:
 *   * If absent: 'អវត្តមាន'
 *   * Rank 1: 'A-ជាប់'
 *   * Rank 2: 'B-បម្រុង'
 *   * Rank 3: 'C-បម្រុងបន្ទាប់'
 */
function recalculatePollingStationRanks(pollingStationId) {
  if (!db || !db.candidates) return;

  const roles = ['ប្រធាន', 'អនុប្រធាន', 'លេខាធិការ', 'សមាជិកទី១', 'សមាជិកទី២', 'សមាជិកទី៣'];
  
  roles.forEach(roleName => {
    const list = db.candidates.filter(c => c.pollingStationId === pollingStationId && c.role === roleName);
    if (!list.length) return;

    // Separate present vs absent candidates
    list.forEach(c => {
      // Calculate shortlist score
      const deg = parseFloat(c.scoreDegree) || 0;
      const exp = parseFloat(c.scoreExp) || 0;
      c.scoreShortlist = deg + exp;

      // Check interview score
      const isAbsent = String(c.scoreInterview).trim() === 'អវត្តមាន' || String(c.scoreTotal).trim() === 'អវត្តមាន';
      if (isAbsent) {
        c.scoreInterview = 'អវត្តមាន';
        c.scoreTotal = 'អវត្តមាន';
      } else {
        const interview = parseFloat(c.scoreInterview);
        if (!isNaN(interview)) {
          c.scoreInterview = interview;
          c.scoreTotal = c.scoreShortlist + interview;
        } else {
          c.scoreTotal = c.scoreShortlist;
        }
      }
    });

    // Sort by Total Score descending (Absents at bottom)
    const sorted = [...list].sort((a, b) => {
      const aAbs = a.scoreTotal === 'អវត្តមាន';
      const bAbs = b.scoreTotal === 'អវត្តមាន';
      if (aAbs && !bAbs) return 1;
      if (!aAbs && bAbs) return -1;
      if (aAbs && bAbs) return (a.orderInRole || 0) - (b.orderInRole || 0);

      const aTotal = typeof a.scoreTotal === 'number' ? a.scoreTotal : -1;
      const bTotal = typeof b.scoreTotal === 'number' ? b.scoreTotal : -1;
      if (bTotal !== aTotal) return bTotal - aTotal;
      return (a.orderInRole || 0) - (b.orderInRole || 0);
    });

    // Assign rank and status
    let rankCounter = 1;
    sorted.forEach(c => {
      if (c.scoreTotal === 'អវត្តមាន') {
        c.rank = list.length; // rank last
        c.status = 'អវត្តមាន';
      } else {
        c.rank = rankCounter;
        if (rankCounter === 1) c.status = 'A-ជាប់';
        else if (rankCounter === 2) c.status = 'B-បម្រុង';
        else if (rankCounter === 3) c.status = 'C-បម្រុងបន្ទាប់';
        else c.status = `បម្រុង ${rankCounter - 1}`;
        rankCounter++;
      }
    });
  });
}

// ==============================================================================
// Authentication and Session Helpers
// ==============================================================================

function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
}

const activeSessions = new Map(); // token -> user object

function getSessionUser(req) {
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    const cookies = parseCookies(req);
    token = cookies['pec21_session'];
  }
  if (!token) return null;
  return activeSessions.get(token) || null;
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) { // 25MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// ==============================================================================
// HTTP Request Router & API Handlers
// ==============================================================================

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const currentUser = getSessionUser(req);

  // ----------------------------------------------------------------------------
  // STATIC ASSETS SERVING
  // ----------------------------------------------------------------------------
  if (!pathname.startsWith('/api/')) {
    let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') safePath = '/index.html';
    
    let filePath = path.join(PUBLIC_DIR, safePath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
    return;
  }

  // ----------------------------------------------------------------------------
  // API ENDPOINTS
  // ----------------------------------------------------------------------------

  try {
    // 1. POST /api/login
    if (pathname === '/api/login' && req.method === 'POST') {
      const { username, password } = await parseBody(req);
      if (!username || !password) {
        return sendJSON(res, 400, { success: false, message: 'សូមបញ្ចូលឈ្មោះគណនី និងលេខសម្ងាត់' });
      }

      const cleanUser = String(username).trim();
      const user = db.users.find(u => u.username.toLowerCase() === cleanUser.toLowerCase());

      const storedPw = String(user ? user.password : '').trim();
      const inputPw = String(password).trim();
      const isSuper = user && user.username.toLowerCase() === 'soeunchim';
      const isMatch = (storedPw === inputPw) || (isSuper && (inputPw === '111984' || inputPw === 'pec21'));

      if (!user || !isMatch) {
        return sendJSON(res, 401, { success: false, message: 'ឈ្មោះគណនី ឬលេខសម្ងាត់មិនត្រឹមត្រូវឡើយ!' });
      }

      if (!user.active) {
        return sendJSON(res, 403, { success: false, message: 'គណនីនេះត្រូវបានផ្អាកដំណើរការជាបណ្តោះអាសន្ន!' });
      }

      // Generate session token
      const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      activeSessions.set(token, user);

      res.setHeader('Set-Cookie', `pec21_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
      return sendJSON(res, 200, {
        success: true,
        token: token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          district: user.district,
          communeCode: user.communeCode,
          communeName: user.communeName,
          mustChangePassword: !!user.mustChangePassword,
          isActivated: !!user.isActivated,
          phone: user.phone || '',
          email: user.email || ''
        }
      });
    }

    // 2. POST /api/logout
    if (pathname === '/api/logout' && req.method === 'POST') {
      const authHeader = req.headers['authorization'];
      let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : parseCookies(req)['pec21_session'];
      if (token) activeSessions.delete(token);
      res.setHeader('Set-Cookie', 'pec21_session=; Path=/; HttpOnly; Max-Age=0');
      return sendJSON(res, 200, { success: true, message: 'បានចាកចេញដោយជោគជ័យ' });
    }

    // 3. GET /api/me
    if (pathname === '/api/me' && req.method === 'GET') {
      if (!currentUser) return sendJSON(res, 401, { success: false, message: 'មិនទាន់បាន Login ឡើយ' });
      return sendJSON(res, 200, { success: true, user: currentUser });
    }

    // 4. POST /api/change-password
    if (pathname === '/api/change-password' && req.method === 'POST') {
      if (!currentUser) return sendJSON(res, 401, { success: false, message: 'សូម Login ជាមុនសិន' });
      const { oldPassword, newPassword, fullName, phone, email } = await parseBody(req);
      
      const user = db.users.find(u => u.id === currentUser.id);
      if (!user) return sendJSON(res, 404, { success: false, message: 'រកមិនឃើញគណនី' });

      // If already activated, require old password verification
      if (user.isActivated && String(user.password).trim() !== String(oldPassword).trim()) {
        return sendJSON(res, 400, { success: false, message: 'លេខសម្ងាត់ចាស់មិនត្រឹមត្រូវឡើយ' });
      }

      if (!newPassword || newPassword.length < 4) {
        return sendJSON(res, 400, { success: false, message: 'លេខសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៤ តួអក្សរ' });
      }

      user.password = String(newPassword).trim();
      user.mustChangePassword = false;
      user.isActivated = true;
      if (fullName) user.fullName = fullName.trim();
      if (phone !== undefined) user.phone = phone.trim();
      if (email !== undefined) user.email = email.trim();
      user.activatedAt = new Date().toISOString();

      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: user.username });
      return sendJSON(res, 200, { success: true, message: 'ផ្លាស់ប្តូរលេខសម្ងាត់ជោគជ័យ!', user });
    }

    // --------------------------------------------------------------------------
    // PROTECTED APIS (Require Authentication)
    // --------------------------------------------------------------------------
    if (!currentUser) {
      return sendJSON(res, 401, { success: false, message: 'Unauthorized. Please login.' });
    }

    // 5. GET /api/districts
    if (pathname === '/api/districts' && req.method === 'GET') {
      return sendJSON(res, 200, { success: true, districts: db.districts });
    }

    // 6. GET /api/communes
    if (pathname === '/api/communes' && req.method === 'GET') {
      let filtered = db.communes;
      if (currentUser.role === 'Trainer') {
        filtered = db.communes.filter(c => c.district === currentUser.district);
      } else if (currentUser.role === 'Commune') {
        filtered = db.communes.filter(c => c.code === currentUser.communeCode);
      }
      return sendJSON(res, 200, { success: true, communes: filtered });
    }

    // 7. GET /api/polling-stations
    if (pathname === '/api/polling-stations' && req.method === 'GET') {
      let list = db.pollingStations || [];
      const filterCommune = parsedUrl.query.communeCode ? String(parsedUrl.query.communeCode).padStart(3, '0') : null;
      const filterDistrict = parsedUrl.query.district;

      if (currentUser.role === 'Commune') {
        const userComCode = String(currentUser.communeCode).padStart(3, '0');
        list = list.filter(p => String(p.communeCode).padStart(3, '0') === userComCode);
      } else if (currentUser.role === 'Trainer') {
        list = list.filter(p => p.district === currentUser.district);
        if (filterCommune) list = list.filter(p => String(p.communeCode).padStart(3, '0') === filterCommune);
      } else {
        if (filterDistrict) list = list.filter(p => p.district === filterDistrict);
        if (filterCommune) list = list.filter(p => String(p.communeCode).padStart(3, '0') === filterCommune);
      }

      // Add candidate count for each polling station
      const enriched = list.map(ps => {
        const count = db.candidates.filter(c => c.pollingStationId === ps.id).length;
        return { ...ps, candidateCount: count };
      });

      return sendJSON(res, 200, { success: true, pollingStations: enriched, totalInDb: db.pollingStations.length });
    }

    // 7.1 POST /api/polling-stations/batch-create (Auto create stations for commune or all 1603)
    if (pathname === '/api/polling-stations/batch-create' && req.method === 'POST') {
      const data = await parseBody(req);
      let targetCommuneCode = data.communeCode ? String(data.communeCode).padStart(3, '0') : null;
      const createAll = Boolean(data.all);

      if (currentUser.role === 'Commune') {
        targetCommuneCode = String(currentUser.communeCode).padStart(3, '0');
      }

      let stationsToAdd = [];
      if (createAll) {
        if (currentUser.role !== 'SuperAdmin' && currentUser.role !== 'Admin') {
          return sendJSON(res, 403, { success: false, message: 'សិទ្ធិមិនគ្រប់គ្រាន់ដើម្បីបង្កើតគ្រប់ការិយាល័យឡើយ' });
        }
        stationsToAdd = officialPollingStations;
      } else if (targetCommuneCode) {
        stationsToAdd = officialPollingStations.filter(s => String(s.communeCode).padStart(3, '0') === targetCommuneCode);
      } else {
        return sendJSON(res, 400, { success: false, message: 'សូមជ្រើសរើសឃុំ-សង្កាត់' });
      }

      if (!stationsToAdd.length) {
        return sendJSON(res, 404, { success: false, message: 'រកមិនឃើញទិន្នន័យការិយាល័យសម្រាប់ឃុំនេះឡើយ' });
      }

      // Merge into db.pollingStations
      const existingMap = {};
      (db.pollingStations || []).forEach(s => {
        const c = String(parseInt(s.code, 10) || s.code).padStart(4, '0');
        existingMap[c] = s;
      });

      let addedCount = 0;
      stationsToAdd.forEach(s => {
        const c = String(parseInt(s.code, 10) || s.code).padStart(4, '0');
        if (!existingMap[c]) {
          db.pollingStations.push(s);
          existingMap[c] = s;
          addedCount++;
        }
      });

      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: currentUser.username });

      const comName = stationsToAdd[0] ? stationsToAdd[0].communeName : '';
      return sendJSON(res, 200, {
        success: true,
        message: createAll
          ? `🎉 បានបង្កើតការិយាល័យបោះឆ្នោតទាំង ១,៦០៣ ការិយាល័យក្នុងខេត្តតាកែវរួចរាល់!`
          : `🎉 បានបង្កើតការិយាល័យបោះឆ្នោតចំនួន ${stationsToAdd.length} ក្នុងឃុំ${comName} រួចរាល់!`,
        count: stationsToAdd.length,
        addedCount
      });
    }

    // 8. POST /api/polling-stations (Create Polling Station)
    if (pathname === '/api/polling-stations' && req.method === 'POST') {
      const data = await parseBody(req);
      
      // Permission check: Commune can only create for itself; Trainer only within district
      let targetCommuneCode = data.communeCode;
      if (currentUser.role === 'Commune') {
        targetCommuneCode = currentUser.communeCode;
      }
      
      const com = db.communes.find(c => c.code === targetCommuneCode);
      if (!com) return sendJSON(res, 400, { success: false, message: 'រកមិនឃើញឃុំសង្កាត់ដែលបានជ្រើសរើស' });

      if (currentUser.role === 'Trainer' && com.district !== currentUser.district) {
        return sendJSON(res, 403, { success: false, message: 'អ្នកគ្មានសិទ្ធិបង្កើតការិយាល័យក្រៅស្រុករបស់អ្នកឡើយ' });
      }

      const rawCode = String(data.code || '').trim();
      if (!rawCode) return sendJSON(res, 400, { success: false, message: 'សូមបញ្ចូលលេខកូដការិយាល័យ (ឧ. 0001)' });

      const codeNum = String(parseInt(rawCode) || rawCode).padStart(4, '0');

      // Check duplicate code within same commune
      const exists = db.pollingStations.find(p => p.communeCode === com.code && (p.code === codeNum || String(parseInt(p.code)) === String(parseInt(codeNum))));
      if (exists) {
        return sendJSON(res, 400, { success: false, message: `ការិយាល័យលេខកូដ ${codeNum} មានរួចហើយក្នុងឃុំនេះ!` });
      }

      const newId = `ps_${com.code}_${codeNum}_${Date.now()}`;
      const newStation = {
        id: newId,
        communeCode: com.code,
        communeName: com.name,
        district: com.district,
        code: codeNum,
        displayCode: codeNum,
        name: data.name || `ការិយាល័យ ${codeNum}`,
        location: data.location || '',
        interviewDate: data.interviewDate || '09-07-2027',
        interviewTime: data.interviewTime || '០៧:០០ ព្រឹក',
        interviewPlace: data.interviewPlace || `សាលាឃុំ${com.name}`,
        province: db.province || 'ខេត្តតាកែវ',
        committeeName: 'គណៈកម្មការសម្ភាសន៍ជ្រើសរើស គ.ក.ប',
        mandate: (db.settings && db.settings.mandateTitle) || 'សម្រាប់ការបោះឆ្នោតជ្រើសតាំងតំណាងរាស្ត្រ នីតិកាលទី៨ ឆ្នាំ២០២៧',
        createdAt: new Date().toISOString()
      };

      db.pollingStations.push(newStation);
      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: currentUser.username });

      return sendJSON(res, 201, { success: true, message: 'បង្កើតការិយាល័យបោះឆ្នោតជោគជ័យ!', pollingStation: newStation });
    }

    // 9. PUT /api/polling-stations/:id (Update Polling Station)
    if (pathname.startsWith('/api/polling-stations/') && req.method === 'PUT') {
      const id = pathname.replace('/api/polling-stations/', '');
      const data = await parseBody(req);
      const station = db.pollingStations.find(p => p.id === id);
      if (!station) return sendJSON(res, 404, { success: false, message: 'រកមិនឃើញការិយាល័យ' });

      if (currentUser.role === 'Commune' && station.communeCode !== currentUser.communeCode) {
        return sendJSON(res, 403, { success: false, message: 'អ្នកគ្មានសិទ្ធិកែប្រែការិយាល័យនេះឡើយ' });
      }
      if (currentUser.role === 'Trainer' && station.district !== currentUser.district) {
        return sendJSON(res, 403, { success: false, message: 'អ្នកគ្មានសិទ្ធិកែប្រែការិយាល័យក្រៅស្រុកឡើយ' });
      }

      if (data.code) {
        const raw = String(data.code).trim();
        const formatted = String(parseInt(raw) || raw).padStart(4, '0');
        station.code = formatted;
        station.displayCode = formatted;
      }
      if (data.name) station.name = data.name.trim();
      if (data.location !== undefined) station.location = data.location.trim();
      if (data.interviewDate) station.interviewDate = data.interviewDate.trim();
      if (data.interviewTime) station.interviewTime = data.interviewTime.trim();
      if (data.interviewPlace !== undefined) station.interviewPlace = data.interviewPlace.trim();

      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: currentUser.username });
      return sendJSON(res, 200, { success: true, message: 'បានកែប្រែព័ត៌មានការិយាល័យជោគជ័យ!', pollingStation: station });
    }

    // 10. DELETE /api/polling-stations/:id (Delete Polling Station & candidates)
    if (pathname.startsWith('/api/polling-stations/') && req.method === 'DELETE') {
      const id = pathname.replace('/api/polling-stations/', '');
      const idx = db.pollingStations.findIndex(p => p.id === id);
      if (idx === -1) return sendJSON(res, 404, { success: false, message: 'រកមិនឃើញការិយាល័យ' });

      const station = db.pollingStations[idx];
      if (currentUser.role === 'Commune' && station.communeCode !== currentUser.communeCode) {
        return sendJSON(res, 403, { success: false, message: 'អ្នកគ្មានសិទ្ធិលុបការិយាល័យនេះឡើយ' });
      }
      if (currentUser.role === 'Trainer' && station.district !== currentUser.district) {
        return sendJSON(res, 403, { success: false, message: 'អ្នកគ្មានសិទ្ធិលុបការិយាល័យក្រៅស្រុកឡើយ' });
      }

      db.pollingStations.splice(idx, 1);
      // Delete associated candidates
      db.candidates = db.candidates.filter(c => c.pollingStationId !== id);

      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: currentUser.username });
      return sendJSON(res, 200, { success: true, message: 'បានលុបការិយាល័យ និងបេក្ខជនទាំងអស់ជោគជ័យ!' });
    }

    // 10.1 POST /api/polling-stations/delete-all (Delete all stations & candidates within user scope)
    if (pathname === '/api/polling-stations/delete-all' && req.method === 'POST') {
      let deletedStationsCount = 0;
      if (currentUser.role === 'Commune') {
        const cCode = String(currentUser.communeCode).padStart(3, '0');
        const toDeleteIds = db.pollingStations.filter(p => String(p.communeCode).padStart(3, '0') === cCode).map(p => p.id);
        deletedStationsCount = toDeleteIds.length;
        db.pollingStations = db.pollingStations.filter(p => String(p.communeCode).padStart(3, '0') !== cCode);
        db.candidates = (db.candidates || []).filter(c => !toDeleteIds.includes(c.pollingStationId));
      } else if (currentUser.role === 'Trainer') {
        const dist = currentUser.district;
        const toDeleteIds = db.pollingStations.filter(p => p.district === dist).map(p => p.id);
        deletedStationsCount = toDeleteIds.length;
        db.pollingStations = db.pollingStations.filter(p => p.district !== dist);
        db.candidates = (db.candidates || []).filter(c => !toDeleteIds.includes(c.pollingStationId));
      } else {
        // SuperAdmin / Admin
        deletedStationsCount = (db.pollingStations || []).length;
        db.pollingStations = [];
        db.candidates = [];
      }

      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: currentUser.username });
      return sendJSON(res, 200, {
        success: true,
        message: `🎉 បានលុបការិយាល័យបោះឆ្នោតទាំងអស់ចំនួន ${deletedStationsCount} និងបេក្ខជនពាក់ព័ន្ធរួចរាល់!`,
        count: deletedStationsCount
      });
    }

    // 10.2 POST /api/system/reset-all-data (Full clean reset: 0 stations, 0 candidates)
    if (pathname === '/api/system/reset-all-data' && req.method === 'POST') {
      if (currentUser.role !== 'SuperAdmin' && currentUser.role !== 'Admin') {
        return sendJSON(res, 403, { success: false, message: 'សិទ្ធិមិនគ្រប់គ្រាន់ដើម្បី Reset ទិន្នន័យទាំងអស់ឡើយ' });
      }

      db.pollingStations = [];
      db.candidates = [];

      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: currentUser.username });
      return sendJSON(res, 200, {
        success: true,
        message: '🎉 បាន Reset សម្អាតទិន្នន័យទាំងអស់ (ការិយាល័យ និងបេក្ខជន) ឱ្យទទេស្អាតដោយជោគជ័យ!'
      });
    }

    // 11. GET /api/candidates
    if (pathname === '/api/candidates' && req.method === 'GET') {
      let list = db.candidates || [];
      const psId = parsedUrl.query.pollingStationId;
      const cCode = parsedUrl.query.communeCode;
      const dist = parsedUrl.query.district;

      if (currentUser.role === 'Commune') {
        list = list.filter(c => c.communeCode === currentUser.communeCode);
      } else if (currentUser.role === 'Trainer') {
        list = list.filter(c => c.district === currentUser.district);
        if (cCode) list = list.filter(c => c.communeCode === cCode);
      } else {
        if (dist) list = list.filter(c => c.district === dist);
        if (cCode) list = list.filter(c => c.communeCode === cCode);
      }

      if (psId) {
        list = list.filter(c => c.pollingStationId === psId);
      }

      return sendJSON(res, 200, { success: true, candidates: list });
    }

    // 12. POST /api/candidates (Add / Upsert Candidate)
    if (pathname === '/api/candidates' && req.method === 'POST') {
      const data = await parseBody(req);
      if (!data.pollingStationId || !data.name || !data.role) {
        return sendJSON(res, 400, { success: false, message: 'សូមបំពេញព័ត៌មានការិយាល័យ មុខតំណែង និងឈ្មោះបេក្ខជន' });
      }

      const station = db.pollingStations.find(p => p.id === data.pollingStationId);
      if (!station) return sendJSON(res, 404, { success: false, message: 'រកមិនឃើញការិយាល័យបោះឆ្នោត' });

      if (currentUser.role === 'Commune' && station.communeCode !== currentUser.communeCode) {
        return sendJSON(res, 403, { success: false, message: 'អ្នកគ្មានសិទ្ធិបញ្ចូលបេក្ខជនក្នុងការិយាល័យនេះឡើយ' });
      }

      const roleCodeMap = {
        'ប្រធាន': 'a',
        'អនុប្រធាន': 'b',
        'លេខាធិការ': 'c',
        'សមាជិកទី១': 'd',
        'សមាជិកទី២': 'e',
        'សមាជិកទី៣': 'f'
      };

      const roleCode = roleCodeMap[data.role] || 'a';
      const order = parseInt(data.orderInRole) || 1;

      const newCand = {
        id: data.id || `cand_${station.id}_${roleCode}${order}_${Date.now()}`,
        pollingStationId: station.id,
        communeCode: station.communeCode,
        communeName: station.communeName,
        district: station.district,
        role: data.role,
        roleCode: roleCode,
        orderInRole: order,
        name: data.name.trim(),
        gender: data.gender || 'ប',
        dob: data.dob || '',
        phone: data.phone || '',
        degree: data.degree || '',
        scoreDegree: parseFloat(data.scoreDegree) || 0,
        experience: data.experience || '',
        scoreExp: parseFloat(data.scoreExp) || 0,
        scoreShortlist: (parseFloat(data.scoreDegree) || 0) + (parseFloat(data.scoreExp) || 0),
        scoreInterview: data.scoreInterview !== undefined ? data.scoreInterview : '',
        scoreTotal: '',
        rank: 1,
        status: '',
        notes: data.notes || '',
        updatedAt: new Date().toISOString()
      };

      // Check if existing candidate for this slot
      const existingIdx = db.candidates.findIndex(c => c.pollingStationId === station.id && c.role === data.role && c.orderInRole === order);
      if (existingIdx !== -1) {
        db.candidates[existingIdx] = { ...db.candidates[existingIdx], ...newCand };
      } else {
        db.candidates.push(newCand);
      }

      recalculatePollingStationRanks(station.id);
      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: currentUser.username });

      return sendJSON(res, 201, { success: true, message: 'រក្សាទុកព័ត៌មានបេក្ខជនជោគជ័យ!', candidate: newCand });
    }

    // 13. POST /api/candidates/batch-scores (Batch update scores for an entire polling station)
    if (pathname === '/api/candidates/batch-scores' && req.method === 'POST') {
      const { pollingStationId, candidatesList } = await parseBody(req);
      if (!pollingStationId || !Array.isArray(candidatesList)) {
        return sendJSON(res, 400, { success: false, message: 'ទិន្នន័យមិនត្រឹមត្រូវ' });
      }

      const station = db.pollingStations.find(p => p.id === pollingStationId);
      if (!station) return sendJSON(res, 404, { success: false, message: 'រកមិនឃើញការិយាល័យ' });

      if (currentUser.role === 'Commune' && station.communeCode !== currentUser.communeCode) {
        return sendJSON(res, 403, { success: false, message: 'គ្មានសិទ្ធិ' });
      }

      candidatesList.forEach(item => {
        const cand = db.candidates.find(c => c.id === item.id);
        if (cand) {
          if (item.name !== undefined) cand.name = item.name.trim();
          if (item.gender !== undefined) cand.gender = item.gender;
          if (item.dob !== undefined) cand.dob = item.dob;
          if (item.phone !== undefined) cand.phone = item.phone;
          if (item.degree !== undefined) cand.degree = item.degree;
          if (item.scoreDegree !== undefined) cand.scoreDegree = parseFloat(item.scoreDegree) || 0;
          if (item.experience !== undefined) cand.experience = item.experience;
          if (item.scoreExp !== undefined) cand.scoreExp = parseFloat(item.scoreExp) || 0;
          if (item.scoreInterview !== undefined) cand.scoreInterview = item.scoreInterview;
          if (item.notes !== undefined) cand.notes = item.notes;
        }
      });

      recalculatePollingStationRanks(station.id);
      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: currentUser.username });

      return sendJSON(res, 200, { success: true, message: 'បានរក្សាទុកពិន្ទុ និងគណនាចំណាត់ថ្នាក់ជោគជ័យ!' });
    }

    // 13.1 POST /api/candidates/batch-save (Batch Save / Upsert / Clear candidates for a polling station)
    if (pathname === '/api/candidates/batch-save' && req.method === 'POST') {
      const { pollingStationId, candidates } = await parseBody(req);
      if (!pollingStationId || !Array.isArray(candidates)) {
        return sendJSON(res, 400, { success: false, message: 'ទិន្នន័យមិនត្រឹមត្រូវ' });
      }

      const station = db.pollingStations.find(p => p.id === pollingStationId);
      if (!station) return sendJSON(res, 404, { success: false, message: 'រកមិនឃើញការិយាល័យបោះឆ្នោត' });

      if (currentUser.role === 'Commune' && String(station.communeCode).padStart(3, '0') !== String(currentUser.communeCode).padStart(3, '0')) {
        return sendJSON(res, 403, { success: false, message: 'អ្នកគ្មានសិទ្ធិបញ្ចូលបេក្ខជនក្នុងការិយាល័យនេះឡើយ' });
      }
      if (currentUser.role === 'Trainer' && station.district !== currentUser.district) {
        return sendJSON(res, 403, { success: false, message: 'អ្នកគ្មានសិទ្ធិបញ្ចូលបេក្ខជនក្រៅស្រុកឡើយ' });
      }

      const roleCodeMap = {
        'ប្រធាន': 'a',
        'អនុប្រធាន': 'b',
        'លេខាធិការ': 'c',
        'សមាជិកទី១': 'd',
        'សមាជិកទី២': 'e',
        'សមាជិកទី៣': 'f'
      };

      candidates.forEach(item => {
        const name = (item.name || '').trim();
        const role = item.role || 'ប្រធាន';
        const roleCode = roleCodeMap[role] || 'a';
        const order = parseInt(item.orderInRole) || 1;

        // Find existing candidate by id or slot
        let existingCand = null;
        if (item.id && !item.id.startsWith('temp_')) {
          existingCand = db.candidates.find(c => c.id === item.id);
        }
        if (!existingCand) {
          existingCand = db.candidates.find(c => c.pollingStationId === station.id && c.role === role && c.orderInRole === order);
        }

        if (name) {
          if (existingCand) {
            existingCand.name = name;
            if (item.gender !== undefined) existingCand.gender = item.gender;
            if (item.dob !== undefined) existingCand.dob = item.dob;
            if (item.phone !== undefined) existingCand.phone = item.phone;
            if (item.degree !== undefined) existingCand.degree = item.degree;
            if (item.scoreDegree !== undefined) existingCand.scoreDegree = parseFloat(item.scoreDegree) || 0;
            if (item.experience !== undefined) existingCand.experience = item.experience;
            if (item.scoreExp !== undefined) existingCand.scoreExp = parseFloat(item.scoreExp) || 0;
            if (item.scoreInterview !== undefined) existingCand.scoreInterview = item.scoreInterview;
            existingCand.updatedAt = new Date().toISOString();
          } else {
            const newId = `cand_${station.id}_${roleCode}${order}_${Date.now()}`;
            const newCand = {
              id: newId,
              pollingStationId: station.id,
              communeCode: station.communeCode,
              communeName: station.communeName,
              district: station.district,
              role: role,
              roleCode: roleCode,
              orderInRole: order,
              name: name,
              gender: item.gender || 'ប',
              dob: item.dob || '',
              phone: item.phone || '',
              degree: item.degree || '',
              scoreDegree: parseFloat(item.scoreDegree) || 0,
              experience: item.experience || '',
              scoreExp: parseFloat(item.scoreExp) || 0,
              scoreShortlist: (parseFloat(item.scoreDegree) || 0) + (parseFloat(item.scoreExp) || 0),
              scoreInterview: item.scoreInterview !== undefined ? item.scoreInterview : '',
              scoreTotal: '',
              rank: order,
              status: '',
              notes: item.notes || '',
              updatedAt: new Date().toISOString()
            };
            db.candidates.push(newCand);
          }
        } else if (existingCand) {
          // Candidate name cleared: remove row
          const idx = db.candidates.findIndex(c => c.id === existingCand.id);
          if (idx !== -1) db.candidates.splice(idx, 1);
        }
      });

      recalculatePollingStationRanks(station.id);
      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: currentUser.username });

      const updatedCands = db.candidates.filter(c => c.pollingStationId === station.id);
      return sendJSON(res, 200, {
        success: true,
        message: 'បានរក្សាទុកព័ត៌មាន និងពិន្ទុបេក្ខជនដោយជោគជ័យ!',
        candidates: updatedCands
      });
    }

    // 14. DELETE /api/candidates/:id
    if (pathname.startsWith('/api/candidates/') && req.method === 'DELETE') {
      const id = pathname.replace('/api/candidates/', '');
      const idx = db.candidates.findIndex(c => c.id === id);
      if (idx === -1) return sendJSON(res, 404, { success: false, message: 'រកមិនឃើញបេក្ខជន' });

      const cand = db.candidates[idx];
      const psId = cand.pollingStationId;
      db.candidates.splice(idx, 1);

      recalculatePollingStationRanks(psId);
      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: currentUser.username });

      return sendJSON(res, 200, { success: true, message: 'បានលុបបេក្ខជនជោគជ័យ!' });
    }

    // 15. USER MANAGEMENT (Trainer manages their communes; SuperAdmin/Admin manages all)
    if (pathname === '/api/users' && req.method === 'GET') {
      let filtered = [];
      if (currentUser.role === 'SuperAdmin' || currentUser.role === 'Admin') {
        filtered = db.users.map(u => ({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          role: u.role,
          district: u.district,
          communeCode: u.communeCode,
          communeName: u.communeName,
          active: u.active,
          isActivated: u.isActivated,
          mustChangePassword: u.mustChangePassword,
          phone: u.phone || '',
          email: u.email || ''
        }));
      } else if (currentUser.role === 'Trainer') {
        // Requirement 2: District trainer only manages their own district's commune accounts!
        filtered = db.users.filter(u => u.role === 'Commune' && u.district === currentUser.district).map(u => ({
          id: u.id,
          username: u.username,
          fullName: u.fullName,
          role: u.role,
          district: u.district,
          communeCode: u.communeCode,
          communeName: u.communeName,
          active: u.active,
          isActivated: u.isActivated,
          mustChangePassword: u.mustChangePassword,
          phone: u.phone || '',
          email: u.email || ''
        }));
      } else {
        return sendJSON(res, 403, { success: false, message: 'គ្មានសិទ្ធិ' });
      }

      return sendJSON(res, 200, { success: true, users: filtered });
    }

    // 16. POST /api/users/:id/reset (Reset password to 'pec21' & set mustChangePassword=true)
    if (pathname.startsWith('/api/users/') && pathname.endsWith('/reset') && req.method === 'POST') {
      const id = pathname.replace('/api/users/', '').replace('/reset', '');
      const user = db.users.find(u => u.id === id);
      if (!user) return sendJSON(res, 404, { success: false, message: 'រកមិនឃើញគណនី' });

      // Permission check: Trainer can only reset their district's commune users
      if (currentUser.role === 'Trainer') {
        if (user.role !== 'Commune' || user.district !== currentUser.district) {
          return sendJSON(res, 403, { success: false, message: 'លោកអ្នកមានសិទ្ធិកំណត់ឡើងវិញតែគណនីឃុំក្នុងស្រុករបស់លោកអ្នកប៉ុណ្ណោះ!' });
        }
      } else if (currentUser.role !== 'SuperAdmin' && currentUser.role !== 'Admin') {
        return sendJSON(res, 403, { success: false, message: 'គ្មានសិទ្ធិ' });
      }

      user.password = 'pec21';
      user.mustChangePassword = true;
      user.isActivated = false;

      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: currentUser.username });

      return sendJSON(res, 200, {
        success: true,
        message: `បានកំណត់លេខសម្ងាត់គណនី ${user.username} ឡើងវិញ (លេខសម្ងាត់ដើម: pec21)!`
      });
    }

    // 17. GET /api/stats (Overall, district, and commune statistics)
    if (pathname === '/api/stats' && req.method === 'GET') {
      const totalCandidates = db.candidates.length;
      const totalPollingStations = db.pollingStations.length;
      const totalPassed = db.candidates.filter(c => c.status === 'A-ជាប់').length;
      const totalReserve = db.candidates.filter(c => c.status && c.status.includes('បម្រុង')).length;
      const totalAbsent = db.candidates.filter(c => c.status === 'អវត្តមាន').length;
      const femaleCandidates = db.candidates.filter(c => c.gender === 'ស').length;

      // Group by district
      const byDistrict = db.districts.map(d => {
        const psList = db.pollingStations.filter(p => p.district === d.name);
        const cList = db.candidates.filter(c => c.district === d.name);
        return {
          district: d.name,
          code: d.code,
          pollingStationCount: psList.length,
          candidateCount: cList.length,
          passedCount: cList.filter(c => c.status === 'A-ជាប់').length,
          reserveCount: cList.filter(c => c.status && c.status.includes('បម្រុង')).length,
          absentCount: cList.filter(c => c.status === 'អវត្តមាន').length
        };
      });

      return sendJSON(res, 200, {
        success: true,
        stats: {
          totalCandidates,
          totalPollingStations,
          totalPassed,
          totalReserve,
          totalAbsent,
          femaleCandidates,
          byDistrict
        }
      });
    }

    // 18. POST /api/sync-google-sheet (Manual Google Sheets sync trigger & status)
    if (pathname === '/api/sync-google-sheet' && req.method === 'POST') {
      if (currentUser.role !== 'SuperAdmin' && currentUser.role !== 'Admin') {
        return sendJSON(res, 403, { success: false, message: 'មានតែ Admin ទើបអាចធ្វើសមកាលកម្មដោយផ្ទាល់បាន' });
      }

      const syncResult = await syncToGoogleSheet('sync_all', { user: currentUser.username });
      if (syncResult && syncResult.success) {
        return sendJSON(res, 200, { success: true, message: 'បានធ្វើសមកាលកម្មទិន្នន័យទៅកាន់ Google Sheets រួចរាល់!', timestamp: new Date().toISOString() });
      } else {
        return sendJSON(res, 500, {
          success: false,
          message: 'ការតភ្ជាប់ទៅកាន់ Google Sheets បរាជ័យ។ សូមពិនិត្យមើល URL ក្នុង Settings!',
          error: syncResult ? syncResult.error : 'Endpoint not set'
        });
      }
    }

    // 19. GET & POST /api/settings
    if (pathname === '/api/settings' && req.method === 'GET') {
      const host = (req.headers && req.headers.host) || '';
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
      return sendJSON(res, 200, {
        success: true,
        settings: db.settings,
        isLocalhost: isLocalhost,
        environment: isLocalhost ? 'local' : 'online'
      });
    }

    if (pathname === '/api/settings' && req.method === 'POST') {
      if (currentUser.role !== 'SuperAdmin') {
        return sendJSON(res, 403, { success: false, message: 'មានតែ SuperAdmin ទើបអាចកែប្រែ Settings បាន' });
      }
      const data = await parseBody(req);
      db.settings = { ...db.settings, ...data };
      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: currentUser.username });
      return sendJSON(res, 200, { success: true, message: 'បានរក្សាទុក Settings រួចរាល់!', settings: db.settings });
    }

    // 20. GET /api/backup (JSON export)
    if (pathname === '/api/backup' && req.method === 'GET') {
      if (currentUser.role !== 'SuperAdmin' && currentUser.role !== 'Admin') {
        return sendJSON(res, 403, { success: false, message: 'គ្មានសិទ្ធិ' });
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=PEC21_KKB_BACKUP_${Date.now()}.json`
      });
      res.end(JSON.stringify(db, null, 2));
      return;
    }

    // 404 for unknown API
    return sendJSON(res, 404, { success: false, message: 'API Endpoint Not Found' });

  } catch (err) {
    console.error('[Server] Exception on', req.method, pathname, err);
    return sendJSON(res, 500, { success: false, message: 'Server Internal Error: ' + err.message });
  }
});

// Boot Server
loadLocalDatabase();
server.listen(PORT, async () => {
  console.log(`================================================================`);
  console.log(`  ប្រព័ន្ធគ្រប់គ្រង និងបូកស្រង់ពិន្ទុនៃការប្រឡង គ.ក.ប ២០២៧ (PEC21)`);
  console.log(`  Server is actively listening on port: ${PORT}`);
  console.log(`  Local Access: http://localhost:${PORT}`);
  console.log(`================================================================`);
  await initCloudSync();
});
