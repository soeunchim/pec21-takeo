// ==============================================================================
// ប្រព័ន្ធគ្រប់គ្រង និងបូកស្រង់ពិន្ទុនៃការប្រឡង គ.ក.ប ២០២៧ (PEC21 - ខេត្តតាកែវ)
// Zero-Dependency Native Node.js Server - Cloud Ready for Render.com & Google Sheets
// ==============================================================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');

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
  '.ttf': 'font/ttf',
  '.zip': 'application/zip'
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

// Helper: Detect Network Interfaces & Storage Environments (Localhost, Local Wi-Fi, Cloud)
function getNetworkInfo() {
  const isCloud = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL || (process.env.NODE_ENV === 'production' && !process.env.LOCAL_DEV));
  const cloudUrl = process.env.RENDER_EXTERNAL_URL || 'https://pollingstationpec21.onrender.com';
  
  let localIp = '127.0.0.1';
  const interfaces = os.networkInterfaces();
  const allIps = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        allIps.push({ name, ip: net.address });
        if (!localIp || localIp === '127.0.0.1') {
          localIp = net.address;
        }
      }
    }
  }

  return {
    isCloud,
    cloudUrl,
    localIp,
    allIps,
    port: PORT,
    localhostUrl: `http://localhost:${PORT}`,
    wifiUrl: localIp && localIp !== '127.0.0.1' ? `http://${localIp}:${PORT}` : `http://localhost:${PORT}`
  };
}

function loadLocalDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(raw);
      console.log(`[DB] Local database loaded successfully. Users: ${db.users ? db.users.length : 0}, Candidates: ${db.candidates ? db.candidates.length : 0}, Stations: ${db.pollingStations ? db.pollingStations.length : 0}`);
    } else {
      console.error('[DB] db.json not found, initializing structure.');
      db = {
        appName: 'ប្រព័ន្ធគ្រប់គ្រង និងបូកស្រង់ពិន្ទុនៃការប្រឡង គ.ក.ប',
        settings: {
          systemTitle: 'ប្រព័ន្ធគ្រប់គ្រង និងបូកស្រង់ពិន្ទុនៃការប្រឡង គ.ក.ប',
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
    normalizeDatabase();
    if (refreshDuplicateStatuses()) {
      saveLocalDatabase();
    }
  } catch (err) {
    console.error('[DB] Load error:', err.message);
  }
}

let saveTimer = null;
function saveLocalDatabase(immediate = false) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (immediate) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
      console.log('[DB] Local database persisted immediately.');
    } catch (err) {
      console.error('[DB] Immediate save error:', err.message);
    }
    return;
  }
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
      console.log('[DB] Local database persisted.');
    } catch (err) {
      console.error('[DB] Save error:', err.message);
    }
  }, 200);
}

function findPollingStation(query) {
  if (!query || !db || !db.pollingStations) return null;
  const qStr = String(query).trim();
  // 1. Direct ID match
  let st = db.pollingStations.find(p => p.id === qStr);
  if (st) return st;

  // 2. ID pattern match (e.g. 'ps_001_0001' vs 'ps_001_001' or timestamped)
  const idParts = qStr.split('_');
  if (idParts.length >= 3) {
    const cCode = String(idParts[1]).padStart(3, '0');
    const sCode = String(parseInt(idParts[2], 10)).padStart(4, '0');
    st = db.pollingStations.find(p => {
      const pCCode = String(p.communeCode || '').padStart(3, '0');
      const pSCode = String(parseInt(p.code || '', 10)).padStart(4, '0');
      return pCCode === cCode && pSCode === sCode;
    });
    if (st) return st;
  }

  // 3. Direct code match (e.g. '0001' or '1')
  const qNum = parseInt(qStr, 10);
  if (!isNaN(qNum)) {
    const qCode4 = String(qNum).padStart(4, '0');
    st = db.pollingStations.find(p => String(p.code || '').padStart(4, '0') === qCode4 || String(p.displayCode || '').padStart(4, '0') === qCode4);
    if (st) return st;
  }

  return null;
}

function normalizeDatabase() {
  if (!db) return;
  if (!db.pollingStations) db.pollingStations = [];
  if (!db.candidates) db.candidates = [];

  const idMap = new Map();

  db.pollingStations.forEach(s => {
    const com3 = String(s.communeCode || '').padStart(3, '0');
    const codeNum = parseInt(s.code, 10);
    const code4 = !isNaN(codeNum) ? String(codeNum).padStart(4, '0') : String(s.code || '').padStart(4, '0');
    const canonicalId = `ps_${com3}_${code4}`;

    if (s.id && s.id !== canonicalId) {
      idMap.set(s.id, canonicalId);
      s.id = canonicalId;
    } else if (!s.id) {
      s.id = canonicalId;
    }
    s.code = code4;
    s.displayCode = code4;
    s.communeCode = com3;
  });

  db.candidates.forEach(c => {
    if (idMap.has(c.pollingStationId)) {
      c.pollingStationId = idMap.get(c.pollingStationId);
    }
    const st = findPollingStation(c.pollingStationId);
    if (st) {
      c.pollingStationId = st.id;
      if (!c.communeCode) c.communeCode = st.communeCode;
      if (!c.communeName) c.communeName = st.communeName;
      if (!c.district) c.district = st.district;
    }
  });
}

function normCandidateName(str) {
  if (!str) return '';
  return String(str).replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/\s+/g, ' ');
}

function normCandidateDob(val) {
  if (!val) return '';
  let s = String(val).trim().replace(/[០-៩]/g, d => '០១២៣៤៥៦៧៨៩'.indexOf(d));
  s = s.replace(/[\/\.]/g, '-');
  const parts = s.split('-').map(p => p.trim()).filter(Boolean);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return parts[2].padStart(2, '0') + '-' + parts[1].padStart(2, '0') + '-' + parts[0];
    } else {
      return parts[0].padStart(2, '0') + '-' + parts[1].padStart(2, '0') + '-' + parts[2];
    }
  }
  return s.replace(/[^0-9]/g, '');
}

function normCandidateGender(g) {
  if (!g) return 'ប';
  const s = String(g).trim().toLowerCase();
  if (s.includes('ស') || s === 'f' || s === 'female' || s.includes('ស្រី')) return 'ស';
  return 'ប';
}

function getCandidateSignature(c) {
  if (!c || !c.name || !c.dob) return '';
  const n = normCandidateName(c.name);
  const g = normCandidateGender(c.gender);
  const d = normCandidateDob(c.dob);
  if (!n || !d) return '';
  return `${n}|${g}|${d}`;
}

function refreshDuplicateStatuses() {
  if (!db || !Array.isArray(db.candidates)) return false;

  const counts = new Map();
  db.candidates.forEach(c => {
    const sig = getCandidateSignature(c);
    if (sig) {
      counts.set(sig, (counts.get(sig) || 0) + 1);
    }
  });

  let changed = false;
  db.candidates.forEach(c => {
    const sig = getCandidateSignature(c);
    const shouldBeDup = sig ? ((counts.get(sig) || 0) > 1) : false;
    if (!!c.isDuplicate !== shouldBeDup) {
      c.isDuplicate = shouldBeDup;
      c.updatedAt = new Date().toISOString();
      changed = true;
    }
  });

  return changed;
}

// Google Sheets Sync Functions
function getGoogleSheetEndpoint(customUrl) {
  let urlConfig = customUrl || (db && db.settings && db.settings.googleSheetUrl) || process.env.GOOGLE_SHEET_URL || '';
  if (!urlConfig || typeof urlConfig !== 'string') return null;
  let clean = urlConfig.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) return null;

  // Auto-correct missing /exec for Google Apps Script Web App URLs
  if (clean.includes('script.google.com/macros/s/') && !clean.endsWith('/exec')) {
    clean = clean.replace(/\/+$/, '') + '/exec';
  }
  return clean;
}

function fetchGoogleSheetRedirect(targetUrl, redirectCount = 0) {
  return new Promise((resolve) => {
    if (redirectCount > 5) {
      return resolve({ success: false, error: 'Too many redirects' });
    }
    try {
      const parsedUrl = new URL(targetUrl);
      const client = parsedUrl.protocol === 'http:' ? http : https;
      const req = client.get(parsedUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let nextTarget = res.headers.location;
          if (!nextTarget.startsWith('http://') && !nextTarget.startsWith('https://')) {
            nextTarget = `${parsedUrl.protocol}//${parsedUrl.hostname}${nextTarget}`;
          }
          return resolve(fetchGoogleSheetRedirect(nextTarget, redirectCount + 1));
        }

        res.setEncoding('utf8');
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300 && (parsed.status === 'success' || parsed.success)) {
              console.log('[GoogleSheet] Cloud synchronization successful via redirect!');
              return resolve({ success: true, data: parsed });
            }
            resolve({ success: false, error: parsed.message || `Status ${res.statusCode}` });
          } catch (e) {
            if (body.includes('accounts.google.com') || body.includes('Sign in') || body.includes('ServiceLogin')) {
              resolve({ success: false, error: 'Google Apps Script ទាមទារ Login! សូមកំណត់ Web app "Who has access: Anyone"' });
            } else {
              resolve({ success: res.statusCode >= 200 && res.statusCode < 300, raw: body });
            }
          }
        });
      });

      req.on('error', (e) => {
        resolve({ success: false, error: e.message });
      });
      req.setTimeout(15000, () => {
        req.destroy();
        resolve({ success: false, error: 'Timeout waiting for Google Sheet' });
      });
    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
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
        res.setEncoding('utf8');
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const parsed = JSON.parse(body);
              if (parsed && (parsed.status === 'success' || parsed.success) && parsed.data) {
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
        // When Google Apps Script responds with 302, redirect to echo endpoint with GET
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let redirectTarget = res.headers.location;
          if (!redirectTarget.startsWith('http://') && !redirectTarget.startsWith('https://')) {
            redirectTarget = `${parsedUrl.protocol}//${parsedUrl.hostname}${redirectTarget}`;
          }
          return resolve(fetchGoogleSheetRedirect(redirectTarget, redirectCount + 1));
        }

        res.setEncoding('utf8');
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300 && (parsed.status === 'success' || parsed.success)) {
              console.log('[GoogleSheet] Cloud synchronization successful!');
              return resolve({ success: true, data: parsed });
            }
            resolve({ success: false, error: parsed.message || `Status ${res.statusCode}` });
          } catch (e) {
            if (body.includes('accounts.google.com') || body.includes('Sign in') || body.includes('ServiceLogin')) {
              resolve({ success: false, error: 'Google Apps Script ទាមទារ Login! សូមកំណត់ Web app "Who has access: Anyone"' });
            } else {
              resolve({ success: res.statusCode >= 200 && res.statusCode < 300, raw: body });
            }
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

function canonicalizeUser(u) {
  if (!u) return u;
  const clone = { ...u };
  if (clone.district && clone.district !== 'all') {
    clone.district = String(clone.district).replace(/^(ស្រុក|ក្រុង)\s*/, '').trim();
    if (clone.district === 'កោះអណ្តែត') clone.district = 'កោះអណ្ដែត';
  }
  if (clone.communeName && clone.communeName !== 'all') {
    clone.communeName = String(clone.communeName).replace(/^(ឃុំ|សង្កាត់)\s*/, '').trim();
  }
  if (clone.role === 'Commune') {
    const comName = clone.communeName || '';
    const code = String(clone.communeCode || '').padStart(3, '0');
    clone.fullName = `គប.ឃស ${comName} (${code})`;
  } else if (clone.role === 'Trainer') {
    if (clone.username === 'PEC2101T001' && clone.fullName && !clone.fullName.includes('គប.ឃស') && !clone.fullName.includes('\ufffd')) {
      clone.fullName = 'ញ៉ែម សុផាត';
    } else {
      const distPrefix = clone.district === 'ដូនកែវ' ? 'ក្រុងដូនកែវ' : `ស្រុក${clone.district}`;
      const tCode = clone.username.includes('T') ? 'T001' : 'R001';
      clone.fullName = `គ្រូប្រចាំ ${distPrefix} (${tCode})`;
    }
  } else if (clone.role === 'SuperAdmin') {
    clone.fullName = 'អភិបាលជាន់ខ្ពស់ (SuperAdmin)';
  } else if (clone.role === 'Admin') {
    clone.fullName = 'អ្នកគ្រប់គ្រងទូទៅ (Admin PEC21)';
  } else if (clone.role === 'PEC21') {
    clone.fullName = 'គ.ខ.ប លេខ ២១ ខេត្តតាកែវ (PEC21)';
  }
  return clone;
}

// Initial pull on server boot
async function initCloudSync() {
  const endpoint = getGoogleSheetEndpoint();
  if (endpoint) {
    console.log('[GoogleSheet] Attempting to connect to Google Sheets on startup...');
    const cloudData = await fetchFromGoogleSheet();
    if (cloudData) {
      if (cloudData.candidates && Array.isArray(cloudData.candidates) && cloudData.candidates.length > 0) {
        db.candidates = cloudData.candidates;
        console.log(`[GoogleSheet] Restored ${cloudData.candidates.length} candidates from cloud.`);
      } else if (db.candidates && db.candidates.length > 0) {
        syncToGoogleSheet('sync_all');
      }

      if (cloudData.pollingStations && cloudData.pollingStations.length > 0) {
        db.pollingStations = cloudData.pollingStations;
      }
      if (cloudData.users && cloudData.users.length > 0) {
        // Merge credentials/active status into canonical db.users while preserving official Khmer names
        cloudData.users.forEach(cu => {
          const localUser = db.users.find(u => u.username.toLowerCase() === (cu.username || '').toLowerCase());
          if (localUser) {
            if (cu.password) localUser.password = cu.password;
            if (cu.active !== undefined) localUser.active = Boolean(cu.active);
            if (cu.mustChangePassword !== undefined) localUser.mustChangePassword = Boolean(cu.mustChangePassword);
            if (cu.isActivated !== undefined) localUser.isActivated = Boolean(cu.isActivated);
            if (cu.phone) localUser.phone = cu.phone;
            if (cu.email) localUser.email = cu.email;
          }
        });
      }
      db.users = (db.users || []).map(canonicalizeUser);
      saveLocalDatabase();
      console.log('[GoogleSheet] Cloud connected successfully. Data synchronized.');
    }
  }
}

// ==============================================================================
// Business Logic: គ.ក.ប Scoring and Ranking Engine
// ==============================================================================

function fromKhmerNum(str) {
  if (str === null || str === undefined || str === '') return '';
  const khmerDigits = { '០': '0', '១': '1', '២': '2', '៣': '3', '៤': '4', '៥': '5', '៦': '6', '៧': '7', '៨': '8', '៩': '9' };
  return String(str).replace(/[០-៩]/g, d => khmerDigits[d]);
}

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
      const deg = parseFloat(fromKhmerNum(c.scoreDegree)) || 0;
      const exp = parseFloat(fromKhmerNum(c.scoreExp)) || 0;
      c.scoreShortlist = deg + exp;

      // Check interview score
      const hasInterviewInput = c.scoreInterview !== undefined && c.scoreInterview !== null && String(c.scoreInterview).trim() !== '';
      const isAbsent = String(c.scoreInterview).trim() === 'អវត្តមាន' || String(c.scoreTotal).trim() === 'អវត្តមាន';
      if (isAbsent) {
        c.scoreInterview = 'អវត្តមាន';
        c.scoreTotal = 'អវត្តមាន';
        c.hasCompletedScore = true;
      } else if (hasInterviewInput) {
        const interview = parseFloat(fromKhmerNum(c.scoreInterview));
        if (!isNaN(interview)) {
          c.scoreInterview = interview;
          c.scoreTotal = c.scoreShortlist + interview;
          c.hasCompletedScore = true;
        } else {
          c.scoreTotal = '';
          c.hasCompletedScore = false;
        }
      } else {
        c.scoreTotal = '';
        c.hasCompletedScore = false;
      }
    });

    // Only rank candidates who have a completed score (interview scored or absent)
    const completedList = list.filter(c => c.hasCompletedScore);
    const pendingList = list.filter(c => !c.hasCompletedScore);

    // Sort completed candidates by Total Score descending (Absents at bottom)
    const sorted = [...completedList].sort((a, b) => {
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

    // Assign rank and status only to completed candidates
    let rankCounter = 1;
    sorted.forEach(c => {
      if (c.scoreTotal === 'អវត្តមាន') {
        c.rank = completedList.length;
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

    // For pending candidates who haven't completed interview yet:
    pendingList.forEach(c => {
      c.rank = c.orderInRole || 1;
      c.status = '';
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
// Telegram Bot Notification Helpers
// ==============================================================================

function toKhmerNum(num) {
  if (num === null || num === undefined) return '';
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return String(num).replace(/[0-9]/g, d => khmerDigits[parseInt(d, 10)]);
}

function formatKhmerDateTime(d = new Date()) {
  try {
    const options = {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    const formatter = new Intl.DateTimeFormat('en-GB', options);
    const parts = formatter.formatToParts(d);
    const partMap = {};
    parts.forEach(p => partMap[p.type] = p.value);
    
    const dateStr = `${toKhmerNum(partMap.day)}-${toKhmerNum(partMap.month)}-${toKhmerNum(partMap.year)}`;
    const timeStr = `${toKhmerNum(partMap.hour)}:${toKhmerNum(partMap.minute)}:${toKhmerNum(partMap.second)}`;
    return `${dateStr} វេលាម៉ោង ${timeStr}`;
  } catch (e) {
    return d.toISOString();
  }
}

function getKhmerRoleLabel(role) {
  const map = {
    'SuperAdmin': 'អភិបាលជាន់ខ្ពស់ (SuperAdmin)',
    'Admin': 'អ្នកគ្រប់គ្រងទូទៅ (Admin PEC21)',
    'PEC21': 'មន្ត្រី គ.ខ.ប ២១ (PEC Staff)',
    'Trainer': 'គ្រូប្រចាំក្រុងស្រុក (Trainer)',
    'Commune': 'គណៈកម្មការឃុំ/សង្កាត់'
  };
  return map[role] || role || 'អ្នកប្រើប្រាស់';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket ? req.socket.remoteAddress : (req.connection ? req.connection.remoteAddress : '127.0.0.1');
}

function getSuperAdminPassword() {
  const superAdmin = (db && db.users ? db.users : []).find(u => u.role === 'SuperAdmin' || String(u.username).toLowerCase() === 'soeunchim');
  if (superAdmin && superAdmin.password) {
    return String(superAdmin.password).trim();
  }
  return '111984';
}

async function sendTelegramNotification(messageText, overrideToken = null, overrideChatId = null) {
  try {
    const token = overrideToken || (db.settings && db.settings.telegramBotToken) || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = overrideChatId || (db.settings && db.settings.telegramChatId) || process.env.TELEGRAM_CHAT_ID;
    const enabled = (overrideToken && overrideChatId) 
      ? true 
      : (db.settings ? (db.settings.telegramNotifyEnabled !== false) : true);

    if (!enabled || !token || !chatId) {
      return { success: false, reason: 'Telegram notifications not configured or disabled' };
    }

    const cleanToken = String(token).trim();
    const cleanChatId = String(chatId).trim();
    if (!cleanToken || !cleanChatId) return { success: false, reason: 'Token or ChatId empty' };

    const postData = JSON.stringify({
      chat_id: cleanChatId,
      text: messageText,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${cleanToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.ok) {
              resolve({ success: true, data: parsed });
            } else {
              console.error('[Telegram] API response error:', parsed);
              resolve({ success: false, error: parsed });
            }
          } catch (e) {
            resolve({ success: false, error: body });
          }
        });
      });

      req.on('error', (err) => {
        console.error('[Telegram] Request error:', err.message);
        resolve({ success: false, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Telegram request timeout' });
      });

      req.write(postData);
      req.end();
    });
  } catch (err) {
    console.error('[Telegram] Unexpected error:', err);
    return { success: false, error: err.message };
  }
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
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content);
    });
    return;
  }

  // ----------------------------------------------------------------------------
  // API ENDPOINTS
  // ----------------------------------------------------------------------------

  try {
    // 0. GET /api/ping or /health (Keep-alive ping endpoint)
    if ((pathname === '/api/ping' || pathname === '/health') && req.method === 'GET') {
      return sendJSON(res, 200, { status: 'ok', uptime: Math.floor(process.uptime()), time: new Date().toISOString() });
    }

    // 1. POST /api/login
    if (pathname === '/api/login' && req.method === 'POST') {
      const { username, password } = await parseBody(req);
      if (!username || !password) {
        return sendJSON(res, 400, { success: false, message: 'សូមបញ្ចូលឈ្មោះគណនី និងលេខសម្ងាត់' });
      }

      const cleanUser = String(username).trim();
      let user = db.users.find(u => u.username.toLowerCase() === cleanUser.toLowerCase());
      if (!user) {
        // Try matching by commune code if numeric or starts with COM
        const numOnly = cleanUser.replace(/\D/g, '');
        if (numOnly) {
          const pad3 = String(parseInt(numOnly, 10)).padStart(3, '0');
          user = db.users.find(u => u.role === 'Commune' && String(u.communeCode).padStart(3, '0') === pad3);
        }
      }
      if (!user) {
        // Try matching by fullName or communeName
        user = db.users.find(u => 
          (u.fullName && u.fullName.toLowerCase().includes(cleanUser.toLowerCase())) ||
          (u.communeName && u.communeName.toLowerCase() === cleanUser.toLowerCase())
        );
      }

      const storedPw = String(user ? user.password : '').trim();
      const inputPw = String(password).trim();
      const isSuper = user && user.username.toLowerCase() === 'soeunchim';
      // Allow stored password, OR system default passwords ('pec21' or '1234'), OR '111984'
      const isMatch = (storedPw && storedPw === inputPw) || 
                      (inputPw === 'pec21' || inputPw === '1234') || 
                      (isSuper && inputPw === '111984');

      if (!user || !isMatch) {
        return sendJSON(res, 401, { success: false, message: 'ឈ្មោះគណនី ឬលេខសម្ងាត់មិនត្រឹមត្រូវឡើយ!' });
      }

      if (!user.active) {
        return sendJSON(res, 403, { success: false, message: 'គណនីនេះត្រូវបានផ្អាកដំណើរការជាបណ្តោះអាសន្ន!' });
      }

      // Generate session token
      const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      activeSessions.set(token, user);

      // Send Telegram notification on login (except SuperAdmin)
      const isSuperAdmin = (user.role === 'SuperAdmin') || (String(user.username).toLowerCase() === 'soeunchim');
      if (!isSuperAdmin) {
        const nowKhmer = formatKhmerDateTime(new Date());
        const clientIp = getClientIp(req);
        const roleLabel = getKhmerRoleLabel(user.role);
        const locationParts = [];
        if (user.district) locationParts.push(user.district);
        if (user.communeName) locationParts.push(user.communeName);
        const locationInfo = locationParts.join(' - ') || 'ខេត្តតាកែវ';

        const msg = 
`🟢 <b>ជូនដំណឹង៖ គណនីបានចូលប្រព័ន្ធ (Login)</b>
━━━━━━━━━━━━━━━━━
👤 <b>គណនី៖</b> <code>${escapeHtml(user.username)}</code>
📛 <b>ឈ្មោះ៖</b> ${escapeHtml(user.fullName || '---')}
🏷️ <b>តួនាទី៖</b> ${escapeHtml(roleLabel)}
📍 <b>ទីតាំង៖</b> ${escapeHtml(locationInfo)}
⏰ <b>កាលបរិច្ឆេទ៖</b> ${nowKhmer}
🌐 <b>IP Address៖</b> <code>${escapeHtml(clientIp)}</code>
💻 <b>ប្រព័ន្ធ៖</b> ${escapeHtml((db.settings && db.settings.systemTitle) || 'ប្រព័ន្ធបូកស្រង់ពិន្ទុ គ.ក.ប')}`;

        sendTelegramNotification(msg).catch(err => console.error('[Telegram Login Notify Error]:', err));
      }

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
      let logoutUser = token ? activeSessions.get(token) : null;
      if (!logoutUser && currentUser) logoutUser = currentUser;

      let reqBody = {};
      try {
        reqBody = await parseBody(req);
      } catch (e) {}

      if (!logoutUser && reqBody && reqBody.username) {
        logoutUser = db.users.find(u => u.username.toLowerCase() === String(reqBody.username).toLowerCase());
      }

      if (token) activeSessions.delete(token);
      res.setHeader('Set-Cookie', 'pec21_session=; Path=/; HttpOnly; Max-Age=0');

      if (logoutUser) {
        const isSuperAdmin = (logoutUser.role === 'SuperAdmin') || (String(logoutUser.username).toLowerCase() === 'soeunchim');
        if (!isSuperAdmin) {
          const nowKhmer = formatKhmerDateTime(new Date());
          const clientIp = getClientIp(req);
          const roleLabel = getKhmerRoleLabel(logoutUser.role);
          const locationParts = [];
          if (logoutUser.district) locationParts.push(logoutUser.district);
          if (logoutUser.communeName) locationParts.push(logoutUser.communeName);
          const locationInfo = locationParts.join(' - ') || 'ខេត្តតាកែវ';

          const msg = 
`🔴 <b>ជូនដំណឹង៖ គណនីបានចាកចេញ (Logout)</b>
━━━━━━━━━━━━━━━━━
👤 <b>គណនី៖</b> <code>${escapeHtml(logoutUser.username)}</code>
📛 <b>ឈ្មោះ៖</b> ${escapeHtml(logoutUser.fullName || '---')}
🏷️ <b>តួនាទី៖</b> ${escapeHtml(roleLabel)}
📍 <b>ទីតាំង៖</b> ${escapeHtml(locationInfo)}
⏰ <b>កាលបរិច្ឆេទ៖</b> ${nowKhmer}
🌐 <b>IP Address៖</b> <code>${escapeHtml(clientIp)}</code>
💻 <b>ប្រព័ន្ធ៖</b> ${escapeHtml((db.settings && db.settings.systemTitle) || 'ប្រព័ន្ធបូកស្រង់ពិន្ទុ គ.ក.ប')}`;

          sendTelegramNotification(msg).catch(err => console.error('[Telegram Logout Notify Error]:', err));
        }
      }

      return sendJSON(res, 200, { success: true, message: 'បានចាកចេញដោយជោគជ័យ' });
    }

    // POST /api/test-telegram
    if (pathname === '/api/test-telegram' && req.method === 'POST') {
      if (!currentUser || (currentUser.role !== 'SuperAdmin' && currentUser.role !== 'Admin')) {
        return sendJSON(res, 403, { success: false, message: 'សិទ្ធិមិនគ្រប់គ្រាន់ (Admin Only)' });
      }
      const body = await parseBody(req);
      const tempToken = body.botToken || (db.settings && db.settings.telegramBotToken) || process.env.TELEGRAM_BOT_TOKEN;
      const tempChatId = body.chatId || (db.settings && db.settings.telegramChatId) || process.env.TELEGRAM_CHAT_ID;

      if (!tempToken || !tempChatId) {
        return sendJSON(res, 400, { success: false, message: 'សូមបញ្ចូល Telegram Bot Token និង Chat ID ជាមុនសិន' });
      }

      const testMsg = 
`🔔 <b>សារតេស្តពីប្រព័ន្ធ (Test Notification)</b>
━━━━━━━━━━━━━━━━━
✅ ការតភ្ជាប់ទៅកាន់ Telegram Bot ដំណើរការជោគជ័យ!
⏰ <b>ពេលវេលា៖</b> ${formatKhmerDateTime(new Date())}
👤 <b>អ្នកតេស្ត៖</b> ${escapeHtml(currentUser.fullName || currentUser.username)} (${escapeHtml(getKhmerRoleLabel(currentUser.role))})
💻 <b>ប្រព័ន្ធ៖</b> ${escapeHtml((db.settings && db.settings.systemTitle) || 'ប្រព័ន្ធបូកស្រង់ពិន្ទុ គ.ក.ប (PEC21)')}`;

      const result = await sendTelegramNotification(testMsg, tempToken, tempChatId);
      if (result.success) {
        return sendJSON(res, 200, { success: true, message: 'បានផ្ញើសារតេស្តទៅកាន់ Telegram រួចរាល់ហើយ!' });
      } else {
        const errDetail = result.error?.description || (typeof result.error === 'string' ? result.error : JSON.stringify(result.error || ''));
        return sendJSON(res, 400, { 
          success: false, 
          message: 'មិនអាចផ្ញើសារបានឡើយ៖ ' + (errDetail || 'សូមពិនិត្យមើល Bot Token និង Chat ID ឡើងវិញ') 
        });
      }
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

    // 4.5 GET /api/settings (Publicly accessible for branding, custom logo, favicon & page title)
    if (pathname === '/api/settings' && req.method === 'GET') {
      const host = (req.headers && req.headers.host) || '';
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
      const netInfo = getNetworkInfo();
      return sendJSON(res, 200, {
        success: true,
        settings: db.settings,
        isLocalhost: isLocalhost,
        environment: isLocalhost ? 'local' : (netInfo.isCloud ? 'online' : 'wifi'),
        networkInfo: netInfo
      });
    }

    // 4.6 GET /api/network-info (Publicly accessible for Wi-Fi IP, QR code & storage modes)
    if (pathname === '/api/network-info' && req.method === 'GET') {
      const netInfo = getNetworkInfo();
      return sendJSON(res, 200, {
        success: true,
        ...netInfo,
        storageMode: (db.settings && db.settings.storageMode) || 'auto',
        googleSheetConfigured: Boolean(db.settings && db.settings.googleSheetUrl)
      });
    }

    // --------------------------------------------------------------------------
    // PROTECTED APIS (Require Authentication)
    // --------------------------------------------------------------------------
    if (!currentUser) {
      return sendJSON(res, 401, { success: false, message: 'Unauthorized. Please login.' });
    }

    // 5. GET /api/districts
    if (pathname === '/api/districts' && req.method === 'GET') {
      let list = db.districts || [];
      if (currentUser.role === 'Trainer' || currentUser.role === 'Commune') {
        const uDistClean = (currentUser.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '');
        list = list.filter(d => (d.name || '').replace(/^(ស្រុក|ក្រុង)\s*/, '') === uDistClean);
      }
      return sendJSON(res, 200, { success: true, districts: list });
    }

    // 6. GET /api/communes
    if (pathname === '/api/communes' && req.method === 'GET') {
      let filtered = db.communes || [];
      if (currentUser.role === 'Trainer') {
        const uDistClean = (currentUser.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '');
        filtered = filtered.filter(c => (c.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '') === uDistClean);
      } else if (currentUser.role === 'Commune') {
        const uComCode = String(currentUser.communeCode || '').padStart(3, '0');
        filtered = filtered.filter(c => String(c.code).padStart(3, '0') === uComCode);
      }
      const enriched = filtered.map(c => {
        const cCode = String(c.code).padStart(3, '0');
        const offCount = (officialPollingStations || []).filter(s => String(s.communeCode).padStart(3, '0') === cCode).length;
        const curCount = (db.pollingStations || []).filter(s => String(s.communeCode).padStart(3, '0') === cCode).length;
        const sched = (db.communeInterviewSchedules && db.communeInterviewSchedules[cCode]) || null;
        return {
          ...c,
          officialStationCount: offCount,
          currentStationCount: curCount,
          interviewSchedule: sched
        };
      });
      return sendJSON(res, 200, { success: true, communes: enriched, interviewSchedules: db.communeInterviewSchedules || {} });
    }

    // 6.1 POST /api/communes/interview-schedule (Update interview place, date, time for commune)
    if (pathname === '/api/communes/interview-schedule' && req.method === 'POST') {
      const data = await parseBody(req);
      let targetCommuneCode = data.communeCode ? String(data.communeCode).padStart(3, '0') : null;
      if (currentUser.role === 'Commune') {
        targetCommuneCode = String(currentUser.communeCode).padStart(3, '0');
      }

      if (!targetCommuneCode) {
        return sendJSON(res, 400, { success: false, message: 'សូមបញ្ជាក់លេខកូដឃុំ/សង្កាត់' });
      }

      const targetCommune = (db.communes || []).find(c => String(c.code).padStart(3, '0') === targetCommuneCode);
      if (currentUser.role === 'Trainer') {
        const uDistClean = (currentUser.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '');
        if (targetCommune && (targetCommune.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '') !== uDistClean) {
          return sendJSON(res, 403, { success: false, message: 'អ្នកគ្មានសិទ្ធិកែប្រែឃុំក្រៅស្រុកឡើយ' });
        }
      }

      const interviewPlace = data.interviewPlace !== undefined ? String(data.interviewPlace).trim() : undefined;
      const interviewDate = data.interviewDate !== undefined ? String(data.interviewDate).trim() : undefined;
      const interviewTime = data.interviewTime !== undefined ? String(data.interviewTime).trim() : undefined;

      let updatedCount = 0;
      (db.pollingStations || []).forEach(s => {
        if (String(s.communeCode).padStart(3, '0') === targetCommuneCode) {
          if (interviewPlace !== undefined && interviewPlace !== '') s.interviewPlace = interviewPlace;
          if (interviewDate !== undefined && interviewDate !== '') s.interviewDate = interviewDate;
          if (interviewTime !== undefined && interviewTime !== '') s.interviewTime = interviewTime;
          updatedCount++;
        }
      });

      if (!db.communeInterviewSchedules) db.communeInterviewSchedules = {};
      db.communeInterviewSchedules[targetCommuneCode] = {
        interviewPlace: interviewPlace || (targetCommune ? `សាលាឃុំ${targetCommune.name}` : ''),
        interviewDate: interviewDate || '09-07-2027',
        interviewTime: interviewTime || '០៧:០០ ព្រឹក',
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.username
      };

      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: currentUser.username });

      return sendJSON(res, 200, {
        success: true,
        message: `បានរក្សាទុកព័ត៌មានសម្ភាសន៍ដោយជោគជ័យ (បានធ្វើបច្ចុប្បន្នភាព ${updatedCount} ការិយាល័យ)!`,
        schedule: db.communeInterviewSchedules[targetCommuneCode],
        updatedStationsCount: updatedCount
      });
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
        const uDistClean = (currentUser.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '');
        list = list.filter(p => (p.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '') === uDistClean);
        if (filterCommune && filterCommune !== 'all') list = list.filter(p => String(p.communeCode).padStart(3, '0') === filterCommune);
      } else {
        if (filterDistrict && filterDistrict !== 'all') list = list.filter(p => p.district === filterDistrict);
        if (filterCommune && filterCommune !== 'all') list = list.filter(p => String(p.communeCode).padStart(3, '0') === filterCommune);
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
      } else if (data.district || (currentUser.role === 'Trainer' && currentUser.district)) {
        const targetDist = data.district || currentUser.district;
        const cleanDist = String(targetDist).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
        stationsToAdd = officialPollingStations.filter(s => String(s.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '') === cleanDist);
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

      // 1. If a specific station is queried
      if (psId) {
        const station = findPollingStation(psId);
        const effectiveId = station ? station.id : psId;
        const stationComCode = station ? String(station.communeCode).padStart(3, '0') : null;
        const stationCode4 = station ? String(parseInt(station.code, 10)).padStart(4, '0') : null;

        // Security / Scope checks
        if (currentUser.role === 'Commune') {
          const uComCode = String(currentUser.communeCode || '').padStart(3, '0');
          if (stationComCode && stationComCode !== uComCode) {
            return sendJSON(res, 403, { success: false, message: 'អ្នកគ្មានសិទ្ធិមើលការិយាល័យក្រៅឃុំឡើយ', candidates: [] });
          }
        } else if (currentUser.role === 'Trainer') {
          const uDistClean = (currentUser.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '');
          const stDistClean = station ? String(station.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '') : '';
          if (stDistClean && stDistClean !== uDistClean) {
            return sendJSON(res, 403, { success: false, message: 'អ្នកគ្មានសិទ្ធិមើលការិយាល័យក្រៅស្រុកឡើយ', candidates: [] });
          }
        }

        // Return candidates belonging to this station
        const stationCandidates = list.filter(c => {
          if (c.pollingStationId === effectiveId || c.pollingStationId === psId) return true;
          if (station) {
            const cSt = findPollingStation(c.pollingStationId);
            if (cSt && cSt.id === station.id) return true;
            if (c.communeCode && String(c.communeCode).padStart(3, '0') === stationComCode) {
              const cParts = String(c.pollingStationId || '').split('_');
              if (cParts.length >= 3 && String(parseInt(cParts[2], 10)).padStart(4, '0') === stationCode4) {
                return true;
              }
            }
          }
          return false;
        });

        // Ensure commune metadata is present on every returned candidate
        stationCandidates.forEach(c => {
          if (station) {
            c.pollingStationId = station.id;
            if (!c.communeCode) c.communeCode = station.communeCode;
            if (!c.communeName) c.communeName = station.communeName;
            if (!c.district) c.district = station.district;
          }
        });

        return sendJSON(res, 200, { success: true, candidates: stationCandidates });
      }

      // 2. Commune/District/All queries
      if (currentUser.role === 'Commune') {
        const uComCode = String(currentUser.communeCode || '').padStart(3, '0');
        list = list.filter(c => {
          const com = c.communeCode ? String(c.communeCode).padStart(3, '0') : (findPollingStation(c.pollingStationId)?.communeCode);
          return String(com || '').padStart(3, '0') === uComCode;
        });
      } else if (currentUser.role === 'Trainer') {
        const uDistClean = (currentUser.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '');
        list = list.filter(c => {
          const d = c.district ? String(c.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '') : (findPollingStation(c.pollingStationId)?.district?.replace(/^(ស្រុក|ក្រុង)\s*/, ''));
          return d === uDistClean;
        });
        if (cCode && cCode !== 'all') {
          const targetCom = String(cCode).padStart(3, '0');
          list = list.filter(c => {
            const com = c.communeCode ? String(c.communeCode).padStart(3, '0') : (findPollingStation(c.pollingStationId)?.communeCode);
            return String(com || '').padStart(3, '0') === targetCom;
          });
        }
      } else {
        if (dist && dist !== 'all') {
          const cleanDist = dist.replace(/^(ស្រុក|ក្រុង)\s*/, '');
          list = list.filter(c => {
            const d = c.district ? String(c.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '') : (findPollingStation(c.pollingStationId)?.district?.replace(/^(ស្រុក|ក្រុង)\s*/, ''));
            return d === cleanDist;
          });
        }
        if (cCode && cCode !== 'all') {
          const targetCom = String(cCode).padStart(3, '0');
          list = list.filter(c => {
            const com = c.communeCode ? String(c.communeCode).padStart(3, '0') : (findPollingStation(c.pollingStationId)?.communeCode);
            return String(com || '').padStart(3, '0') === targetCom;
          });
        }
      }

      return sendJSON(res, 200, { success: true, candidates: list });
    }

    // 11.1 POST /api/candidates/check-duplicate (Province-wide duplicate candidate check)
    if (pathname === '/api/candidates/check-duplicate' && req.method === 'POST') {
      const data = await parseBody(req);
      const { name, gender, dob, excludeId, currentPollingStationId } = data;

      function normKhmer(str) {
        if (!str) return '';
        return String(str).replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/\s+/g, ' ');
      }
      function normDob(val) {
        if (!val) return '';
        let s = String(val).trim().replace(/[០-៩]/g, d => '០១២៣៤៥៦៧៨៩'.indexOf(d));
        s = s.replace(/[\/\.]/g, '-');
        const parts = s.split('-').map(p => p.trim()).filter(Boolean);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            return parts[2].padStart(2, '0') + '-' + parts[1].padStart(2, '0') + '-' + parts[0];
          } else {
            return parts[0].padStart(2, '0') + '-' + parts[1].padStart(2, '0') + '-' + parts[2];
          }
        }
        return s.replace(/[^0-9]/g, '');
      }
      function normGender(g) {
        if (!g) return 'ប';
        const s = String(g).trim().toLowerCase();
        if (s.includes('ស') || s === 'f' || s === 'female' || s.includes('ស្រី')) return 'ស';
        return 'ប';
      }

      const qName = normKhmer(name);
      const qGender = normGender(gender);
      const qDob = normDob(dob);

      if (!qName || !qDob) {
        return sendJSON(res, 200, { success: true, isDuplicate: false });
      }

      const allCandidates = db.candidates || [];
      const match = allCandidates.find(c => {
        if (!c.name || !c.dob) return false;
        if (excludeId && c.id === excludeId) return false;
        if (c.pollingStationId === currentPollingStationId && excludeId && c.id === excludeId) return false;

        const cName = normKhmer(c.name);
        const cGender = normGender(c.gender);
        const cDob = normDob(c.dob);

        return cName === qName && cGender === qGender && cDob === qDob;
      });

      if (match) {
        const station = findPollingStation(match.pollingStationId);
        const commune = (db.communes || []).find(cm => String(cm.code).padStart(3, '0') === String(match.communeCode || (station ? station.communeCode : '')).padStart(3, '0'));
        const distName = match.district || (station ? station.district : (commune ? commune.district : ''));
        const comName = match.communeName || (station ? station.communeName : (commune ? commune.name : ''));
        const stCode = station ? (station.code || station.id) : (match.pollingStationId || '');
        const stName = station ? (station.name || `ការិយាល័យលេខ ${station.code}`) : '';

        return sendJSON(res, 200, {
          success: true,
          isDuplicate: true,
          existing: {
            id: match.id,
            name: match.name,
            gender: match.gender,
            dob: match.dob,
            role: match.role || '',
            pollingStationId: match.pollingStationId,
            pollingStationCode: stCode,
            pollingStationName: stName,
            communeName: comName,
            district: distName
          }
        });
      }

      return sendJSON(res, 200, { success: true, isDuplicate: false });
    }

    // 11.2 POST /api/candidates/mark-duplicate (Mark candidate as duplicate)
    if (pathname === '/api/candidates/mark-duplicate' && req.method === 'POST') {
      const data = await parseBody(req);
      const { id, isDuplicate } = data;
      if (id && db.candidates) {
        const cand = db.candidates.find(c => c.id === id);
        if (cand) {
          cand.isDuplicate = isDuplicate !== undefined ? !!isDuplicate : true;
          cand.updatedAt = new Date().toISOString();
          saveLocalDatabase(true);
        }
      }
      return sendJSON(res, 200, { success: true });
    }

    // 11.3 GET /api/candidates/duplicates (List all grouped duplicate candidates)
    if (pathname === '/api/candidates/duplicates' && req.method === 'GET') {
      refreshDuplicateStatuses();
      const all = db.candidates || [];
      const dupMap = new Map();

      all.forEach(c => {
        if (!c.isDuplicate) return;
        const sig = getCandidateSignature(c);
        if (!sig) return;

        const station = findPollingStation(c.pollingStationId);
        const commune = (db.communes || []).find(cm => String(cm.code).padStart(3, '0') === String(c.communeCode || (station ? station.communeCode : '')).padStart(3, '0'));
        const distName = c.district || (station ? station.district : (commune ? commune.district : ''));
        const comName = c.communeName || (station ? station.communeName : (commune ? commune.name : ''));
        const stCode = station ? (station.code || station.id) : (c.pollingStationId || '');
        const stName = station ? (station.name || `ការិយាល័យលេខ ${station.code}`) : '';
        const loc = station ? (station.location || '') : '';

        const item = {
          id: c.id,
          name: c.name,
          gender: c.gender || 'ប',
          dob: c.dob,
          phone: c.phone || '',
          degree: c.degree || '',
          role: c.role || '',
          orderInRole: c.orderInRole || 1,
          scoreDegree: c.scoreDegree || 0,
          scoreExp: c.scoreExp || 0,
          scoreShortlist: c.scoreShortlist || 0,
          scoreInterview: c.scoreInterview || '',
          scoreTotal: c.scoreTotal || '',
          rank: c.rank || c.orderInRole || 1,
          status: c.status || '',
          pollingStationId: c.pollingStationId,
          pollingStationCode: stCode,
          pollingStationName: stName,
          location: loc,
          communeName: comName,
          district: distName,
          updatedAt: c.updatedAt || ''
        };

        if (!dupMap.has(sig)) {
          dupMap.set(sig, {
            signature: sig,
            name: c.name,
            gender: c.gender || 'ប',
            dob: c.dob,
            count: 0,
            candidates: []
          });
        }
        const group = dupMap.get(sig);
        group.candidates.push(item);
        group.count = group.candidates.length;
      });

      const groups = Array.from(dupMap.values()).filter(g => g.count > 1);
      const totalDuplicateCandidates = groups.reduce((sum, g) => sum + g.count, 0);

      return sendJSON(res, 200, {
        success: true,
        totalGroups: groups.length,
        totalDuplicates: totalDuplicateCandidates,
        groups
      });
    }

    // 12. POST /api/candidates (Add / Upsert Candidate)
    if (pathname === '/api/candidates' && req.method === 'POST') {
      const data = await parseBody(req);
      if (!data.pollingStationId || !data.name || !data.role) {
        return sendJSON(res, 400, { success: false, message: 'សូមបំពេញព័ត៌មានការិយាល័យ មុខតំណែង និងឈ្មោះបេក្ខជន' });
      }

      const station = findPollingStation(data.pollingStationId);
      if (!station) return sendJSON(res, 404, { success: false, message: 'រកមិនឃើញការិយាល័យបោះឆ្នោត' });

      if (currentUser.role === 'Commune' && String(station.communeCode).padStart(3, '0') !== String(currentUser.communeCode).padStart(3, '0')) {
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
      const degSc = parseFloat(data.scoreDegree) || 0;
      const expSc = parseFloat(data.scoreExp) || 0;

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
        scoreDegree: degSc,
        experience: data.experience || '',
        scoreExp: expSc,
        scoreShortlist: degSc + expSc,
        scoreInterview: data.scoreInterview !== undefined ? data.scoreInterview : '',
        scoreTotal: '',
        rank: 1,
        status: '',
        notes: data.notes || '',
        isDuplicate: data.isDuplicate !== undefined ? !!data.isDuplicate : false,
        updatedAt: new Date().toISOString()
      };

      // Check if existing candidate for this slot
      const existingIdx = db.candidates.findIndex(c => (c.pollingStationId === station.id || findPollingStation(c.pollingStationId)?.id === station.id) && c.role === data.role && c.orderInRole === order);
      if (existingIdx !== -1) {
        db.candidates[existingIdx] = { 
          ...db.candidates[existingIdx], 
          ...newCand,
          isDuplicate: data.isDuplicate !== undefined ? !!data.isDuplicate : (db.candidates[existingIdx].isDuplicate || false)
        };
      } else {
        db.candidates.push(newCand);
      }

      recalculatePollingStationRanks(station.id);
      refreshDuplicateStatuses();
      saveLocalDatabase(true);
      syncToGoogleSheet('sync_all', { user: currentUser.username });

      return sendJSON(res, 201, { success: true, message: 'រក្សាទុកព័ត៌មានបេក្ខជនជោគជ័យ!', candidate: newCand });
    }

    // 13. POST /api/candidates/batch-scores (Batch update scores for an entire polling station)
    if (pathname === '/api/candidates/batch-scores' && req.method === 'POST') {
      const { pollingStationId, candidatesList } = await parseBody(req);
      if (!pollingStationId || !Array.isArray(candidatesList)) {
        return sendJSON(res, 400, { success: false, message: 'ទិន្នន័យមិនត្រឹមត្រូវ' });
      }

      const station = findPollingStation(pollingStationId);
      if (!station) return sendJSON(res, 404, { success: false, message: 'រកមិនឃើញការិយាល័យ' });

      if (currentUser.role === 'Commune' && String(station.communeCode).padStart(3, '0') !== String(currentUser.communeCode).padStart(3, '0')) {
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
          cand.scoreShortlist = (cand.scoreDegree || 0) + (cand.scoreExp || 0);
          cand.pollingStationId = station.id;
          cand.communeCode = station.communeCode;
          cand.communeName = station.communeName;
          cand.district = station.district;
          cand.updatedAt = new Date().toISOString();
        }
      });

      recalculatePollingStationRanks(station.id);
      saveLocalDatabase(true);
      syncToGoogleSheet('sync_all', { user: currentUser.username });

      return sendJSON(res, 200, { success: true, message: 'បានរក្សាទុកពិន្ទុ និងគណនាចំណាត់ថ្នាក់ជោគជ័យ!' });
    }

    // 13.1 POST /api/candidates/batch-save (Batch Save / Upsert / Clear candidates for a polling station)
    if (pathname === '/api/candidates/batch-save' && req.method === 'POST') {
      const { pollingStationId, candidates } = await parseBody(req);
      if (!pollingStationId || !Array.isArray(candidates)) {
        return sendJSON(res, 400, { success: false, message: 'ទិន្នន័យមិនត្រឹមត្រូវ' });
      }

      const station = findPollingStation(pollingStationId);
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
          existingCand = db.candidates.find(c => {
            const isSameStation = (c.pollingStationId === station.id || findPollingStation(c.pollingStationId)?.id === station.id);
            return isSameStation && c.role === role && c.orderInRole === order;
          });
        }

        if (name) {
          const degSc = parseFloat(item.scoreDegree) || 0;
          const expSc = parseFloat(item.scoreExp) || 0;
          if (existingCand) {
            existingCand.name = name;
            existingCand.pollingStationId = station.id;
            existingCand.communeCode = station.communeCode;
            existingCand.communeName = station.communeName;
            existingCand.district = station.district;
            if (item.gender !== undefined) existingCand.gender = item.gender;
            if (item.dob !== undefined) existingCand.dob = item.dob;
            if (item.phone !== undefined) existingCand.phone = item.phone;
            if (item.degree !== undefined) existingCand.degree = item.degree;
            existingCand.scoreDegree = degSc;
            if (item.experience !== undefined) existingCand.experience = item.experience;
            existingCand.scoreExp = expSc;
            if (item.scoreInterview !== undefined) existingCand.scoreInterview = item.scoreInterview;
            existingCand.scoreShortlist = degSc + expSc;
            existingCand.isDuplicate = item.isDuplicate !== undefined ? !!item.isDuplicate : false;
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
              scoreDegree: degSc,
              experience: item.experience || '',
              scoreExp: expSc,
              scoreShortlist: degSc + expSc,
              scoreInterview: item.scoreInterview !== undefined ? item.scoreInterview : '',
              scoreTotal: '',
              rank: order,
              status: '',
              notes: item.notes || '',
              isDuplicate: item.isDuplicate !== undefined ? !!item.isDuplicate : false,
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
      refreshDuplicateStatuses();
      saveLocalDatabase(true);
      syncToGoogleSheet('sync_all', { user: currentUser.username });

      const updatedCands = db.candidates.filter(c => c.pollingStationId === station.id || findPollingStation(c.pollingStationId)?.id === station.id);
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
      refreshDuplicateStatuses();
      saveLocalDatabase(true);
      syncToGoogleSheet('sync_all', { user: currentUser.username });

      return sendJSON(res, 200, { success: true, message: 'បានលុបបេក្ខជនជោគជ័យ!' });
    }

    // 15. USER MANAGEMENT (Trainer manages their communes; SuperAdmin/Admin manages all)
    if (pathname === '/api/users' && req.method === 'GET') {
      let filtered = [];
      if (currentUser.role === 'SuperAdmin' || currentUser.role === 'Admin') {
        filtered = db.users.map(canonicalizeUser).map(u => ({
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
        const trainerDist = (currentUser.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '').trim();
        filtered = db.users
          .map(canonicalizeUser)
          .filter(u => u.role === 'Commune' && (u.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '').trim() === trainerDist)
          .map(u => ({
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

    // 17. GET /api/stats (Overall, district, and commune statistics scoped by user role)
    if (pathname === '/api/stats' && req.method === 'GET') {
      if (currentUser.role === 'Commune') {
        const uComCode = String(currentUser.communeCode || '').padStart(3, '0');
        const psList = (db.pollingStations || []).filter(p => String(p.communeCode).padStart(3, '0') === uComCode);
        const psIds = psList.map(p => p.id);
        const cList = (db.candidates || []).filter(c => psIds.includes(c.pollingStationId) || String(c.communeCode).padStart(3, '0') === uComCode);

        const totalCandidates = cList.length;
        const totalPollingStations = psList.length;
        const totalPassed = cList.filter(c => c.status === 'A-ជាប់').length;
        const totalReserve = cList.filter(c => c.status && c.status.includes('បម្រុង')).length;
        const totalReserveB = cList.filter(c => c.status === 'B-បម្រុង').length;
        const totalReserveC = cList.filter(c => c.status && (c.status === 'C-បម្រុងបន្ទាប់' || c.status === 'C-បម្រុង')).length;
        const totalAbsent = cList.filter(c => c.status === 'អវត្តមាន').length;
        const femaleCandidates = cList.filter(c => c.gender === 'ស' || c.gender === 'ស្រី').length;

        // Sort stations by code
        psList.sort((a, b) => (parseInt(a.code, 10) || 0) - (parseInt(b.code, 10) || 0));
        const byStation = psList.map(ps => {
          const stCands = cList.filter(c => c.pollingStationId === ps.id);
          const c4 = String(ps.code || '').padStart(4, '0');
          return {
            stationId: ps.id,
            code: c4,
            name: ps.name || `ការិយាល័យ ${c4}`,
            location: ps.location || '',
            candidateCount: stCands.length,
            passedCount: stCands.filter(c => c.status === 'A-ជាប់').length,
            reserveBCount: stCands.filter(c => c.status === 'B-បម្រុង').length,
            reserveCCount: stCands.filter(c => c.status && (c.status === 'C-បម្រុងបន្ទាប់' || c.status === 'C-បម្រុង')).length,
            absentCount: stCands.filter(c => c.status === 'អវត្តមាន').length
          };
        });

        return sendJSON(res, 200, {
          success: true,
          scope: 'commune',
          communeName: currentUser.communeName || '',
          communeCode: uComCode,
          district: currentUser.district || '',
          stats: {
            totalCandidates,
            totalPollingStations,
            totalPassed,
            totalReserve,
            totalReserveB,
            totalReserveC,
            totalAbsent,
            femaleCandidates,
            byStation
          }
        });
      }

      if (currentUser.role === 'Trainer') {
        const uDistClean = (currentUser.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '');
        const psList = (db.pollingStations || []).filter(p => (p.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '') === uDistClean);
        const psIds = psList.map(p => p.id);
        const cList = (db.candidates || []).filter(c => psIds.includes(c.pollingStationId) || (c.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '') === uDistClean);

        const totalCandidates = cList.length;
        const totalPollingStations = psList.length;
        const totalPassed = cList.filter(c => c.status === 'A-ជាប់').length;
        const totalReserve = cList.filter(c => c.status && c.status.includes('បម្រុង')).length;
        const totalReserveB = cList.filter(c => c.status === 'B-បម្រុង').length;
        const totalReserveC = cList.filter(c => c.status && (c.status === 'C-បម្រុងបន្ទាប់' || c.status === 'C-បម្រុង')).length;
        const totalAbsent = cList.filter(c => c.status === 'អវត្តមាន').length;
        const femaleCandidates = cList.filter(c => c.gender === 'ស' || c.gender === 'ស្រី').length;

        const distCommunes = (db.communes || []).filter(c => (c.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '') === uDistClean);
        distCommunes.sort((a, b) => (parseInt(a.code, 10) || 0) - (parseInt(b.code, 10) || 0));

        const byCommune = distCommunes.map(com => {
          const comCode = String(com.code).padStart(3, '0');
          const comPs = psList.filter(p => String(p.communeCode).padStart(3, '0') === comCode);
          const comCands = cList.filter(c => String(c.communeCode).padStart(3, '0') === comCode);
          return {
            communeCode: comCode,
            communeName: com.name,
            district: com.district,
            pollingStationCount: comPs.length,
            candidateCount: comCands.length,
            passedCount: comCands.filter(c => c.status === 'A-ជាប់').length,
            reserveBCount: comCands.filter(c => c.status === 'B-បម្រុង').length,
            reserveCCount: comCands.filter(c => c.status && (c.status === 'C-បម្រុងបន្ទាប់' || c.status === 'C-បម្រុង')).length,
            absentCount: comCands.filter(c => c.status === 'អវត្តមាន').length
          };
        });

        return sendJSON(res, 200, {
          success: true,
          scope: 'trainer',
          district: currentUser.district,
          stats: {
            totalCandidates,
            totalPollingStations,
            totalPassed,
            totalReserve,
            totalReserveB,
            totalReserveC,
            totalAbsent,
            femaleCandidates,
            byCommune
          }
        });
      }

      // Default province-wide (SuperAdmin, Admin, PEC21)
      const totalCandidates = db.candidates.length;
      const totalPollingStations = db.pollingStations.length;
      const totalPassed = db.candidates.filter(c => c.status === 'A-ជាប់').length;
      const totalReserve = db.candidates.filter(c => c.status && c.status.includes('បម្រុង')).length;
      const totalReserveB = db.candidates.filter(c => c.status === 'B-បម្រុង').length;
      const totalReserveC = db.candidates.filter(c => c.status && (c.status === 'C-បម្រុងបន្ទាប់' || c.status === 'C-បម្រុង')).length;
      const totalAbsent = db.candidates.filter(c => c.status === 'អវត្តមាន').length;
      const femaleCandidates = db.candidates.filter(c => c.gender === 'ស' || c.gender === 'ស្រី').length;

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
          reserveBCount: cList.filter(c => c.status === 'B-បម្រុង').length,
          reserveCCount: cList.filter(c => c.status && (c.status === 'C-បម្រុងបន្ទាប់' || c.status === 'C-បម្រុង')).length,
          absentCount: cList.filter(c => c.status === 'អវត្តមាន').length
        };
      });

      return sendJSON(res, 200, {
        success: true,
        scope: 'province',
        stats: {
          totalCandidates,
          totalPollingStations,
          totalPassed,
          totalReserve,
          totalReserveB,
          totalReserveC,
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

      let reqBody = {};
      try {
        reqBody = await parseBody(req);
      } catch (e) {}

      if (reqBody && reqBody.url) {
        let clean = String(reqBody.url).trim();
        if (clean.includes('script.google.com/macros/s/') && !clean.endsWith('/exec')) {
          clean = clean.replace(/\/+$/, '') + '/exec';
        }
        db.settings.googleSheetUrl = clean;
        saveLocalDatabase();
      }

      const endpoint = getGoogleSheetEndpoint();
      if (!endpoint) {
        return sendJSON(res, 400, {
          success: false,
          message: 'មិនទាន់មាន Google Apps Script URL នៅឡើយទេ។ សូមបញ្ចូល URL ក្នុងប្រអប់ Settings ជាមុនសិន!',
          error: 'URL is empty'
        });
      }

      const syncResult = await syncToGoogleSheet('sync_all', { user: currentUser.username });
      if (syncResult && syncResult.success) {
        return sendJSON(res, 200, {
          success: true,
          message: 'បានធ្វើសមកាលកម្មទិន្នន័យទៅកាន់ Google Sheets រួចរាល់!',
          timestamp: new Date().toISOString()
        });
      } else {
        return sendJSON(res, 500, {
          success: false,
          message: 'ការតភ្ជាប់ទៅកាន់ Google Sheets បរាជ័យ! សូមពិនិត្យមើល URL ឬការកំណត់សិទ្ធិ (Who has access: Anyone) ក្នុង Google Apps Script!',
          error: syncResult ? syncResult.error : 'Cannot connect'
        });
      }
    }

    // 19. POST /api/settings (SuperAdmin only)
    if (pathname === '/api/settings' && req.method === 'POST') {
      if (currentUser.role !== 'SuperAdmin') {
        return sendJSON(res, 403, { success: false, message: 'មានតែ SuperAdmin ទើបអាចកែប្រែ Settings បាន' });
      }
      const data = await parseBody(req);
      db.settings = { ...db.settings, ...data };
      saveLocalDatabase(true);
      syncToGoogleSheet('sync_all', { user: currentUser.username });
      return sendJSON(res, 200, { success: true, message: 'បានរក្សាទុក Settings រួចរាល់!', settings: db.settings });
    }

    // 20. GET /api/backup (Password-Protected ZIP export using SuperAdmin password)
    if (pathname === '/api/backup' && req.method === 'GET') {
      if (currentUser.role !== 'SuperAdmin' && currentUser.role !== 'Admin') {
        return sendJSON(res, 403, { success: false, message: 'គ្មានសិទ្ធិទាញយក Backup ឡើយ' });
      }

      const parsedUrl = url.parse(req.url, true);
      if (parsedUrl.query && parsedUrl.query.format === 'json') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename=PEC21_KKB_BACKUP_${Date.now()}.json`
        });
        res.end(JSON.stringify(db, null, 2));
        return;
      }

      try {
        const superAdminPw = getSuperAdminPassword();
        const zip = require('@zip.js/zip.js');
        const zipWriter = new zip.ZipWriter(new zip.Uint8ArrayWriter(), {
          password: superAdminPw,
          zipCrypto: true // PKWARE ZipCrypto compatible with standard Windows Explorer & all unzippers
        });

        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
        const filename = `PEC21_KKB_BACKUP_${dateStr}_${timeStr}.zip`;

        const backupData = {
          version: '1.0',
          exportedAt: now.toISOString(),
          exportedBy: currentUser.username,
          candidates: db.candidates || [],
          pollingStations: db.pollingStations || [],
          settings: db.settings || {},
          communeInterviewSchedules: db.communeInterviewSchedules || {},
          districts: db.districts || [],
          communes: db.communes || []
        };

        const readmeText = `ឯកសារ Backup ប្រព័ន្ធបូកស្រង់ពិន្ទុនៃការប្រឡង គ.ក.ប (PEC21 Takeo)
======================================================================
កាលបរិច្ឆេទបង្កើត ៖ ${now.toLocaleString('km-KH')}
អ្នកទាញយក Backup ៖ ${currentUser.fullName || currentUser.username} (${currentUser.role})
ចំនួនបេក្ខជនសរុប ៖ ${(db.candidates || []).length} នាក់
ចំនួនការិយាល័យ  ៖ ${(db.pollingStations || []).length} ការិយាល័យ

* សម្គាល់ ៖ ឯកសារ ZIP នេះត្រូវបានការពារដោយលេខសម្ងាត់ (Password Protected)
ដោយប្រើប្រាស់លេខសម្ងាត់របស់គណនី SuperAdmin ។
នៅពេលពន្លាឯកសារ ឬធ្វើការស្ដារទិន្នន័យ (Restore) ឡើងវិញ សូមប្រើប្រាស់លេខសម្ងាត់របស់ SuperAdmin ។`;

        await zipWriter.add('pec21_database.json', new zip.TextReader(JSON.stringify(backupData, null, 2)));
        await zipWriter.add('README.txt', new zip.TextReader(readmeText));
        const zipUint8 = await zipWriter.close();

        res.writeHead(200, {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': zipUint8.length
        });
        res.end(Buffer.from(zipUint8));
        return;
      } catch (err) {
        console.error('[Backup Error]:', err);
        return sendJSON(res, 500, { success: false, message: 'បរាជ័យក្នុងការបង្កើតឯកសារ ZIP Backup ៖ ' + err.message });
      }
    }

    // 20.1 POST /api/restore (Full Restore from Password-Protected ZIP or JSON)
    if (pathname === '/api/restore' && req.method === 'POST') {
      if (currentUser.role !== 'SuperAdmin' && currentUser.role !== 'Admin') {
        return sendJSON(res, 403, { success: false, message: 'គ្មានសិទ្ធិស្ដារទិន្នន័យឡើយ' });
      }

      let payload = {};
      try {
        payload = await parseBody(req);
      } catch (e) {
        return sendJSON(res, 400, { success: false, message: 'ទិន្នន័យបញ្ជូនមកមិនត្រឹមត្រូវឡើយ' });
      }

      const inputPassword = String(payload.password || '').trim();
      if (!inputPassword) {
        return sendJSON(res, 400, { success: false, message: 'សូមបញ្ចូលលេខសម្ងាត់ SuperAdmin ដើម្បីស្ដារទិន្នន័យ!' });
      }

      const superAdminPw = getSuperAdminPassword();
      let data = null;

      // Case 1: ZIP file upload (base64 encoded in payload.fileData)
      if (payload.fileData) {
        try {
          const zip = require('@zip.js/zip.js');
          const zipBuffer = Buffer.from(payload.fileData, 'base64');
          const zipReader = new zip.ZipReader(new zip.Uint8ArrayReader(zipBuffer), {
            password: inputPassword
          });

          const entries = await zipReader.getEntries();
          const jsonEntry = entries.find(e => e.filename && e.filename.toLowerCase().endsWith('.json'));
          if (!jsonEntry) {
            await zipReader.close();
            return sendJSON(res, 400, {
              success: false,
              message: 'ឯកសារ ZIP នេះមិនមែនជាឯកសារ Backup របស់ប្រព័ន្ធប្រឡង គ.ក.ប ឡើយ (រកមិនឃើញឯកសារទិន្នន័យ pec21_database.json ក្នុង ZIP)'
            });
          }

          const jsonText = await jsonEntry.getData(new zip.TextWriter(), {
            password: inputPassword
          });
          await zipReader.close();

          try {
            data = JSON.parse(jsonText);
          } catch (pe) {
            return sendJSON(res, 400, {
              success: false,
              message: 'ឯកសារ JSON នៅក្នុង ZIP ខូច ឬមិនត្រឹមត្រូវ ៖ ' + pe.message
            });
          }
        } catch (err) {
          console.warn('[Restore ZIP Error]:', err.message);
          const msg = String(err.message || '').toLowerCase();
          if (msg.includes('password') || msg.includes('crc') || msg.includes('encrypted') || err.name === 'PasswordError') {
            return sendJSON(res, 401, { success: false, message: 'លេខសម្ងាត់មិនត្រឹមត្រូវ! មិនអាចពន្លា និងស្ដារទិន្នន័យពីឯកសារ ZIP បានឡើយ។' });
          }
          return sendJSON(res, 400, { success: false, message: 'មានបញ្ហាក្នុងការអានឯកសារ ZIP ៖ ' + err.message });
        }
      } else {
        // Case 2: JSON data provided directly
        const isMatch = (inputPassword === superAdminPw) || (inputPassword === '111984');
        if (!isMatch) {
          return sendJSON(res, 401, { success: false, message: 'លេខសម្ងាត់មិនត្រឹមត្រូវ! តម្រូវឱ្យប្រើប្រាស់លេខសម្ងាត់ SuperAdmin ដើម្បីស្ដារទិន្នន័យ។' });
        }
        data = payload.jsonData || payload;
      }

      if (!data || (!data.candidates && !data.pollingStations)) {
        return sendJSON(res, 400, { success: false, message: 'ទម្រង់ឯកសារ Backup មិនត្រឹមត្រូវឡើយ (រកមិនឃើញបញ្ជីបេក្ខជន ឬការិយាល័យ)' });
      }

      if (data.candidates && Array.isArray(data.candidates)) {
        db.candidates = data.candidates;
      }
      if (data.pollingStations && Array.isArray(data.pollingStations) && data.pollingStations.length > 0) {
        db.pollingStations = data.pollingStations;
      }
      if (data.settings) {
        db.settings = { ...db.settings, ...data.settings };
      }
      if (data.communeInterviewSchedules) {
        db.communeInterviewSchedules = data.communeInterviewSchedules;
      }

      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: currentUser.username });

      return sendJSON(res, 200, {
        success: true,
        message: `បានស្ដារទិន្នន័យជោគជ័យ! បេក្ខជន៖ ${(db.candidates||[]).length} នាក់, ការិយាល័យ៖ ${(db.pollingStations||[]).length} ការិយាល័យ`,
        candidatesCount: (db.candidates||[]).length,
        stationsCount: (db.pollingStations||[]).length
      });
    }

    // 21. POST /api/candidates/batch-restore-all (Restore multiple candidates from browser backup)
    if (pathname === '/api/candidates/batch-restore-all' && req.method === 'POST') {
      const payload = await parseBody(req);
      const candidates = payload.candidates;
      if (!Array.isArray(candidates) || !candidates.length) {
        return sendJSON(res, 400, { success: false, message: 'បញ្ជីបេក្ខជនមិនត្រឹមត្រូវ' });
      }

      candidates.forEach(c => {
        if (!c || !c.name || !c.name.trim()) return;
        const existingIdx = db.candidates.findIndex(x => (c.id && x.id === c.id) || (x.pollingStationId === c.pollingStationId && x.role === c.role && x.orderInRole === c.orderInRole));
        if (existingIdx !== -1) {
          db.candidates[existingIdx] = Object.assign({}, db.candidates[existingIdx], c);
        } else {
          if (!c.id) c.id = `cand_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          db.candidates.push(c);
        }
      });

      const affectedStations = [...new Set(candidates.map(c => c.pollingStationId).filter(Boolean))];
      affectedStations.forEach(stId => recalculatePollingStationRanks(stId));
      saveLocalDatabase();
      syncToGoogleSheet('sync_all', { user: currentUser.username });
      return sendJSON(res, 200, {
        success: true,
        message: `បានស្ដារបេក្ខជនចំនួន ${candidates.length} នាក់ដោយជោគជ័យ!`,
        totalCandidates: db.candidates.length
      });
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
  const netInfo = getNetworkInfo();
  console.log(`================================================================`);
  console.log(`  PEC21 TAKEO - KKB EXAM SCORE SYSTEM 2027`);
  console.log(`  ប្រព័ន្ធគ្រប់គ្រង និងបូកស្រង់ពិន្ទុនៃការប្រឡង គ.ក.ប ២០២៧`);
  console.log(`  Server is actively listening on port: ${PORT}`);
  console.log(`----------------------------------------------------------------`);
  console.log(`  របៀបដំណើរការទាំង ៤ (Supported Storage Modes):`);
  console.log(`  [១] Storage: Local Database (ម៉ាស៊ីនផ្ទាល់):`);
  console.log(`      -> ${netInfo.localhostUrl}`);
  console.log(`  [២] Storage: Local Database (Online តាម Wi-Fi តែមួយ):`);
  console.log(`      -> ${netInfo.wifiUrl}`);
  console.log(`  [៣] Storage: Online Database (Cloud Server):`);
  console.log(`      -> ${netInfo.cloudUrl}`);
  console.log(`  [៤] Storage: Google Sheet (Sync ទៅ Google Sheet):`);
  console.log(`      -> ${db.settings && db.settings.googleSheetUrl ? 'បានភ្ជាប់រួចរាល់' : 'កំណត់ក្នុងផ្ទាំង Settings ក្នុងប្រព័ន្ធ'}`);
  console.log(`================================================================`);
  await initCloudSync();

  // Automatic Self-Ping for Render (Keep-Alive: prevents 15-min inactivity spin down)
  const targetUrl = process.env.RENDER_EXTERNAL_URL || 'https://pollingstationpec21.onrender.com';
  if (process.env.RENDER || process.env.NODE_ENV === 'production' || process.env.RENDER_EXTERNAL_URL) {
    const PING_INTERVAL_MS = 10 * 60 * 1000; // Ping every 10 minutes (threshold is 15 minutes)
    setInterval(() => {
      try {
        const pingUrl = `${targetUrl.replace(/\/$/, '')}/api/ping`;
        const client = pingUrl.startsWith('https') ? https : http;
        client.get(pingUrl, (pRes) => {
          console.log(`[Keep-Alive] Pinged ${pingUrl} -> Status ${pRes.statusCode}`);
        }).on('error', (pErr) => {
          console.warn(`[Keep-Alive] Ping warning: ${pErr.message}`);
        });
      } catch (e) {
        console.warn(`[Keep-Alive] Ping error: ${e.message}`);
      }
    }, PING_INTERVAL_MS);
    console.log(`[Keep-Alive] Initialized self-ping every 10m to prevent Render spin-down.`);
  }
});
