// ==============================================================================
// ប្រព័ន្ធគ្រប់គ្រង និងបូកស្រង់ពិន្ទុនៃការប្រឡង គ.ក.ប ២០២៧ (PEC21 - ខេត្តតាកែវ)
// Client-Side Application Engine
// ==============================================================================

let currentUser = null;
let allDistricts = [];
let allCommunes = [];
let allPollingStations = [];
let currentCandidates = [];
let appSettings = {};
let allLoadedUsers = [];
let currentUserSubtab = 'admins';

const ROLES_ORDER = ['ប្រធាន', 'អនុប្រធាន', 'លេខាធិការ', 'សមាជិកទី១', 'សមាជិកទី២', 'សមាជិកទី៣'];
const ROLE_CODES = {
  'ប្រធាន': 'a',
  'អនុប្រធាន': 'b',
  'លេខាធិការ': 'c',
  'សមាជិកទី១': 'd',
  'សមាជិកទី២': 'e',
  'សមាជិកទី៣': 'f'
};

// ==============================================================================
// INITIALIZATION & AUTHENTICATION
// ==============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkAuthStatus();
});

async function checkAuthStatus() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      showAppShell();
      await loadInitialData();
      if (currentUser.mustChangePassword) {
        openChangePasswordModal(true);
      }
    } else {
      showLoginScreen();
    }
  } catch (err) {
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('loginSection').style.display = 'flex';
  document.getElementById('appShell').style.display = 'none';
}

function showAppShell() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('appShell').style.display = 'block';

  // Render header profile
  document.getElementById('userFullName').textContent = currentUser.fullName || currentUser.username;
  document.getElementById('userRoleTag').textContent = `${currentUser.role} ${currentUser.district !== 'all' ? '(' + currentUser.district + ')' : ''}`;

  // Role permissions UI adjustments
  const usersNav = document.getElementById('tabUsersNav');
  const settingsNav = document.getElementById('tabSettingsNav');

  if (currentUser.role === 'Commune') {
    if (usersNav) usersNav.style.display = 'none';
    if (settingsNav) settingsNav.style.display = 'none';
    const filterBar = document.getElementById('stationFilterBar');
    if (filterBar) filterBar.style.display = 'none';
  } else if (currentUser.role === 'Trainer') {
    if (usersNav) {
      usersNav.style.display = 'inline-flex';
      usersNav.innerHTML = `👥 គណនីឃុំក្នុង ${currentUser.district}`;
    }
    if (settingsNav) settingsNav.style.display = 'none';
  } else {
    if (usersNav) usersNav.style.display = 'inline-flex';
    if (settingsNav) settingsNav.style.display = 'inline-flex';
  }
}

function setupEventListeners() {
  // Login Form
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errBox = document.getElementById('loginError');
    errBox.style.display = 'none';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        showAppShell();
        await loadInitialData();
        if (currentUser.mustChangePassword) {
          openChangePasswordModal(true);
        }
      } else {
        errBox.textContent = data.message || 'Login failed';
        errBox.style.display = 'block';
      }
    } catch (err) {
      errBox.textContent = 'Network error: ' + err.message;
      errBox.style.display = 'block';
    }
  });

  // Logout
  document.getElementById('btnLogout').addEventListener('click', async () => {
    if (confirm('តើលោកអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធមែនទេ?')) {
      await fetch('/api/logout', { method: 'POST' });
      currentUser = null;
      showLoginScreen();
    }
  });

  // Cloud / Storage Badge Info
  const cloudBadge = document.getElementById('cloudStatusBadge');
  if (cloudBadge) {
    cloudBadge.addEventListener('click', () => {
      const isLocal = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.port === '3027';
      if (isLocal) {
        alert('💻 ប្រព័ន្ធកំពុងដំណើរការលើម៉ាស៊ីនផ្ទាល់ (Localhost:3027)\n\n• ប្រភេទផ្ទុកទិន្នន័យ៖ Storage: Local Database (ផ្ទុកលើកុំព្យូទ័រនេះ)\n• ប្រសិនបើលោកអ្នកចង់ប្រើប្រាស់ Online សូមចូលទៅកាន់៖ https://pec21-takeo.onrender.com');
      } else {
        alert('🌐 ប្រព័ន្ធកំពុងដំណើរការលើ Online Cloud (Render)\n\n• ប្រភេទផ្ទុកទិន្នន័យ៖ Storage: Online Database\n• ដើម្បីប្រើប្រាស់ Storage: Local Database សូមបើកកម្មវិធីតាមរយៈ http://localhost:3027 នៅលើកុំព្យូទ័រផ្ទាល់។');
      }
    });
  }

  // Tab Navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');

      if (targetId === 'tabDashboard') loadDashboardStats();
      if (targetId === 'tabPollingStations') renderPollingStationsTable();
      if (targetId === 'tabScoring') renderScoringView();
      if (targetId === 'tabReports') {
        syncScoringStationToReports();
        renderReportPreview();
      }
      if (targetId === 'tabUsers') loadUsersList();
      if (targetId === 'tabSettings') loadSettingsForm();
    });
  });

  // Station Change on Scoring Page
  document.getElementById('scoringStationSelect').addEventListener('change', () => {
    renderScoringTableForActiveStation();
  });

  // Station Change on Reports Page
  document.getElementById('reportStationSelect').addEventListener('change', () => {
    renderReportPreview();
  });
  document.getElementById('reportTypeSelect').addEventListener('change', () => {
    renderReportPreview();
  });

  // Direct Print Button
  document.getElementById('btnDirectPrint').addEventListener('click', () => {
    window.print();
  });

  // Save Batch Scores
  document.getElementById('btnSaveBatchScores').addEventListener('click', async () => {
    await saveBatchScores();
  });

  // Excel Export
  const btnExport = document.getElementById('btnExportExcel');
  if (btnExport) btnExport.addEventListener('click', exportCurrentStationToExcel);

  // Excel Import Trigger & File Input
  const btnImport = document.getElementById('btnImportExcel');
  const fileInput = document.getElementById('excelFileInput');
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', () => {
      const stationId = document.getElementById('scoringStationSelect').value;
      if (!stationId) {
        alert('សូមជ្រើសរើសការិយាល័យបោះឆ្នោតជាមុនសិន!');
        return;
      }
      fileInput.value = '';
      fileInput.click();
    });
    fileInput.addEventListener('change', handleExcelFileUpload);
  }

  // Confirm Excel Import
  const btnConfirmImport = document.getElementById('btnConfirmExcelImport');
  if (btnConfirmImport) {
    btnConfirmImport.addEventListener('click', confirmAndSaveExcelImport);
  }

  // Download Blank Template
  const btnTemplate = document.getElementById('btnDownloadTemplate');
  if (btnTemplate) btnTemplate.addEventListener('click', downloadBlankExcelTemplate);

  // Modal Triggers
  document.getElementById('btnOpenAddStationModal').addEventListener('click', () => {
    openStationModal();
  });
  document.getElementById('btnOpenAddCandidateModal').addEventListener('click', () => {
    openCandidateModal();
  });
  document.getElementById('btnProfileModal').addEventListener('click', () => {
    openChangePasswordModal(false);
  });

  // Forms Submissions
  document.getElementById('formStation').addEventListener('submit', handleStationSubmit);
  document.getElementById('formCandidate').addEventListener('submit', handleCandidateSubmit);
  document.getElementById('formChangePassword').addEventListener('submit', handleChangePasswordSubmit);

  // Settings Save & Google Sync
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  if (btnSaveSettings) btnSaveSettings.addEventListener('click', handleSaveSettings);

  const btnManualSync = document.getElementById('btnManualGoogleSync');
  if (btnManualSync) btnManualSync.addEventListener('click', handleManualGoogleSync);

  // Logo Upload & Reset Listeners
  const headerBrandLogo = document.getElementById('headerBrandLogo');
  const quickLogoInput = document.getElementById('quickLogoUploadInput');
  if (headerBrandLogo && quickLogoInput) {
    headerBrandLogo.addEventListener('click', () => quickLogoInput.click());
    quickLogoInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleLogoUpload(e.target.files[0]);
      }
    });
  }

  const settingLogoFileInput = document.getElementById('settingLogoFileInput');
  if (settingLogoFileInput) {
    settingLogoFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleLogoUpload(e.target.files[0]);
      }
    });
  }

  const btnResetLogoDefault = document.getElementById('btnResetLogoDefault');
  if (btnResetLogoDefault) {
    btnResetLogoDefault.addEventListener('click', handleResetLogoDefault);
  }

  // Delete All Stations Button
  const btnDeleteAllStations = document.getElementById('btnDeleteAllStations');
  if (btnDeleteAllStations) {
    btnDeleteAllStations.addEventListener('click', async () => {
      if (!allPollingStations.length) {
        alert('គ្មានការិយាល័យបោះឆ្នោតសម្រាប់លុបឡើយ!');
        return;
      }
      const confirmMsg = '⚠️ តើលោកអ្នកពិតជាចង់លុបការិយាល័យបោះឆ្នោតទាំងអស់មែនទេ?\n\n(ទិន្នន័យបេក្ខជនទាំងអស់ដែលនៅក្នុងការិយាល័យទាំងនោះក៏នឹងត្រូវលុបចេញផងដែរ)';
      if (!confirm(confirmMsg)) return;

      btnDeleteAllStations.disabled = true;
      btnDeleteAllStations.textContent = 'កំពុងលុប...';
      try {
        const res = await fetch('/api/polling-stations/delete-all', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert(data.message || 'បានលុបការិយាល័យទាំងអស់ដោយជោគជ័យ!');
          await loadInitialData();
          renderPollingStationsTable();
        } else {
          alert(data.message || 'មិនអាចលុបបានឡើយ');
        }
      } catch (err) {
        alert('កំហុសប្រព័ន្ធ ៖ ' + err.message);
      } finally {
        btnDeleteAllStations.disabled = false;
        btnDeleteAllStations.textContent = '🗑️ លុបការិយាល័យទាំងអស់';
      }
    });
  }

  // Reset All Data Button (Complete Clean Reset)
  const btnResetAll = document.getElementById('btnResetAllData');
  if (btnResetAll) {
    btnResetAll.addEventListener('click', async () => {
      const confirmMsg = '⚠️ តើលោកអ្នកពិតជាចង់ Reset សម្អាតទិន្នន័យទាំងអស់ (ការិយាល័យបោះឆ្នោត និងពិន្ទុបេក្ខជន) ឱ្យទទេស្អាតមែនទេ?\n\nសកម្មភាពនេះនឹងលុបការិយាល័យ និងបេក្ខជនទាំងអស់ចេញពីប្រព័ន្ធ រហូតទាល់តែលោកអ្នកបង្កើតថ្មី ឬចុចបង្កើតឡើងវិញ!';
      if (!confirm(confirmMsg)) return;

      btnResetAll.disabled = true;
      btnResetAll.textContent = 'កំពុង Reset...';
      try {
        const res = await fetch('/api/system/reset-all-data', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          alert(data.message || 'បាន Reset សម្អាតទិន្នន័យទាំងអស់ជោគជ័យ!');
          await loadInitialData();
          renderPollingStationsTable();
          loadDashboardStats();
        } else {
          alert(data.message || 'មិនអាច Reset បានឡើយ');
        }
      } catch (err) {
        alert('កំហុសប្រព័ន្ធ ៖ ' + err.message);
      } finally {
        btnResetAll.disabled = false;
        btnResetAll.textContent = '🗑️ Reset សម្អាតទិន្នន័យទាំងអស់ឱ្យទទេស្អាត (Reset All Data)';
      }
    });
  }

  // Score modal auto helpers
  document.getElementById('candFormDegreeSelect').addEventListener('change', (e) => {
    const val = parseFloat(e.target.value) || 0;
    document.getElementById('candFormScoreDegree').value = val;
  });
  document.getElementById('candFormExpSelect').addEventListener('change', (e) => {
    const val = parseFloat(e.target.value) || 0;
    document.getElementById('candFormScoreExp').value = val;
  });

  // Auto-pad 4 digits for station code input
  const codeInput = document.getElementById('stationFormCode');
  if (codeInput) {
    codeInput.addEventListener('blur', () => {
      const v = codeInput.value.trim();
      if (v) {
        const num = parseInt(v);
        const padded = !isNaN(num) ? String(num).padStart(4, '0') : v.padStart(4, '0');
        codeInput.value = padded;
        const nameInput = document.getElementById('stationFormName');
        if (nameInput && (!nameInput.value || nameInput.value.startsWith('ការិយាល័យ'))) {
          nameInput.value = `ការិយាល័យ ${padded}`;
        }
      }
    });
  }

  // Filter Buttons & Dynamic Filters for Polling Stations
  const btnFilterStations = document.getElementById('btnFilterStations');
  if (btnFilterStations) {
    btnFilterStations.addEventListener('click', () => {
      renderPollingStationsTable();
    });
  }

  const filterDistSelect = document.getElementById('filterStationDistrict');
  const filterComSelect = document.getElementById('filterStationCommune');
  const searchStationKw = document.getElementById('searchStationKeyword');

  if (filterDistSelect) {
    filterDistSelect.addEventListener('change', () => {
      // Dynamically filter commune options
      const selDist = filterDistSelect.value;
      if (filterComSelect) {
        filterComSelect.innerHTML = '<option value="">-- គ្រប់ឃុំ-សង្កាត់ --</option>';
        const relevantComs = selDist ? allCommunes.filter(c => c.district === selDist) : allCommunes;
        relevantComs.forEach(c => {
          filterComSelect.innerHTML += `<option value="${c.code}">${c.name} (${c.code})</option>`;
        });
      }
      renderPollingStationsTable();
    });
  }

  if (filterComSelect) {
    filterComSelect.addEventListener('change', () => {
      renderPollingStationsTable();
    });
  }

  if (searchStationKw) {
    searchStationKw.addEventListener('input', () => {
      renderPollingStationsTable();
    });
  }

  const btnBatchCreate = document.getElementById('btnBatchCreateCommuneStations');
  if (btnBatchCreate) {
    btnBatchCreate.addEventListener('click', () => {
      batchCreateForSelectedCommune();
    });
  }

  const btnBatchCreateAll = document.getElementById('btnBatchCreateAllStations');
  if (btnBatchCreateAll) {
    btnBatchCreateAll.addEventListener('click', async () => {
      if (!confirm('តើលោកអ្នកពិតជាចង់បង្កើត/ស្តារការិយាល័យបោះឆ្នោតទាំងអស់ទាំង ១,៦០៣ ការិយាល័យក្នុងខេត្តតាកែវមែនទេ?')) {
        return;
      }
      try {
        btnBatchCreateAll.disabled = true;
        btnBatchCreateAll.textContent = 'កំពុងដំណើរការ...';
        const res = await fetch('/api/polling-stations/batch-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ all: true })
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          const psRes = await fetch('/api/polling-stations').then(r => r.json());
          allPollingStations = psRes.pollingStations || [];
          populateStationSelectors();
          renderPollingStationsTable();
        } else {
          alert('កំហុស៖ ' + data.message);
        }
      } catch (e) {
        alert('Network error: ' + e.message);
      } finally {
        btnBatchCreateAll.disabled = false;
        btnBatchCreateAll.textContent = '🌐 បង្កើតគ្រប់ការិយាល័យ (១,៦០៣)';
      }
    });
  }

  // User Management Subtabs (Admins, Trainers, Communes)
  document.querySelectorAll('.user-subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.user-subtab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentUserSubtab = btn.getAttribute('data-usertab');
      renderUsersTable();
    });
  });

  // User Search input
  const searchUserInput = document.getElementById('searchUserText');
  if (searchUserInput) {
    searchUserInput.addEventListener('input', () => {
      renderUsersTable();
    });
  }

  // User District filter
  const filterUserDist = document.getElementById('filterUserDistrict');
  if (filterUserDist) {
    filterUserDist.addEventListener('change', () => {
      renderUsersTable();
    });
  }

  // User Filter reset
  const btnResetUserFilter = document.getElementById('btnResetUserFilter');
  if (btnResetUserFilter) {
    btnResetUserFilter.addEventListener('click', () => {
      if (searchUserInput) searchUserInput.value = '';
      if (filterUserDist) filterUserDist.value = '';
      renderUsersTable();
    });
  }
}

// ==============================================================================
// DATA LOADING
// ==============================================================================

async function loadInitialData() {
  try {
    // 1. Districts & Communes
    const [distRes, comRes, psRes] = await Promise.all([
      fetch('/api/districts').then(r => r.json()),
      fetch('/api/communes').then(r => r.json()),
      fetch('/api/polling-stations').then(r => r.json())
    ]);

    allDistricts = distRes.districts || [];
    allCommunes = comRes.communes || [];
    allPollingStations = psRes.pollingStations || [];

    populateFilterDropdowns();
    populateStationSelectors();
    await loadDashboardStats();
    await checkCloudStatus();
  } catch (err) {
    console.error('Error loading initial data:', err);
  }
}

// Universal helpers to convert numbers to Khmer digits & distinguish ស្រុក vs ក្រុង, ឃុំ vs សង្កាត់
function toKhmerNum(num) {
  if (num === null || num === undefined || num === '') return '';
  const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  return String(num).replace(/[0-9]/g, d => khmerDigits[parseInt(d, 10)]);
}

function getDistrictPrefix(districtName) {
  if (!districtName) return '';
  const clean = String(districtName).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
  if (clean === 'ដូនកែវ') {
    return 'ក្រុងដូនកែវ';
  }
  return `ស្រុក${clean}`;
}

function getCommunePrefix(communeName, districtName) {
  if (!communeName) return '';
  const clean = String(communeName).trim().replace(/^(ឃុំ|សង្កាត់)\s*/, '');
  const distClean = districtName ? String(districtName).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '') : '';
  if (distClean === 'ដូនកែវ') {
    return `សង្កាត់${clean}`;
  }
  return `ឃុំ${clean}`;
}

function populateFilterDropdowns() {
  const distSelect = document.getElementById('filterStationDistrict');
  const comSelect = document.getElementById('filterStationCommune');
  const formComSelect = document.getElementById('stationFormCommune');

  if (distSelect) {
    distSelect.innerHTML = '<option value="">-- គ្រប់ក្រុង-ស្រុក --</option>';
    allDistricts.forEach(d => {
      const cleanName = String(d.name).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      distSelect.innerHTML += `<option value="${cleanName}">${getDistrictPrefix(cleanName)}</option>`;
    });
  }

  if (comSelect) {
    comSelect.innerHTML = '<option value="">-- គ្រប់ឃុំ-សង្កាត់ --</option>';
    allCommunes.forEach(c => {
      const label = `${getCommunePrefix(c.name, c.district)} (${c.code})`;
      comSelect.innerHTML += `<option value="${c.code}">${label}</option>`;
    });
  }

  if (formComSelect) {
    formComSelect.innerHTML = '';
    allCommunes.forEach(c => {
      const label = `${getCommunePrefix(c.name, c.district)} (${c.code})`;
      formComSelect.innerHTML += `<option value="${c.code}">${label}</option>`;
    });
  }
}

function populateStationSelectors() {
  if (!allPollingStations.length) {
    const reportSelect = document.getElementById('reportStationSelect');
    if (reportSelect) reportSelect.innerHTML = '<option value="">-- គ្មានការិយាល័យបោះឆ្នោត --</option>';
    return;
  }

  // 1. Initialize dedicated 4-Part Scoring Selector Bar (District, Commune, Code [Select/Type], Location)
  initScoringSelectorBar();

  // 2. Initialize dedicated 4-Part Report Selector Bar & 5 Sheets Tabs
  initReportSelectorBar();

  renderReportPreview();
}

function initScoringSelectorBar() {
  const distSelect = document.getElementById('scoringDistrictFilter');
  const comSelect = document.getElementById('scoringCommuneFilter');
  const distLabel = document.getElementById('scoringDistrictLabel');
  const comLabel = document.getElementById('scoringCommuneLabel');
  const codeInput = document.getElementById('scoringCodeInput');
  const codeSelect = document.getElementById('scoringCodeSelect');
  const codeDatalist = document.getElementById('scoringCodeDatalist');
  const locSelect = document.getElementById('scoringLocationSelect');

  if (!distSelect || !comSelect) return;

  // 1. Populate Districts
  const rawDistNames = allDistricts.length 
    ? allDistricts.map(d => d.name) 
    : [...new Set(allPollingStations.map(p => p.district))].filter(Boolean);

  const distNames = [...new Set(rawDistNames.map(n => String(n).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '')))];

  distSelect.innerHTML = '<option value="">-- ជ្រើសរើសក្រុង/ស្រុក --</option>';
  distNames.forEach(name => {
    const label = getDistrictPrefix(name);
    distSelect.innerHTML += `<option value="${name}">${label}</option>`;
  });

  // Handle role restrictions for Trainer / Commune
  if (currentUser) {
    if (currentUser.role === 'Trainer' && currentUser.district && currentUser.district !== 'all') {
      const cleanUserDist = String(currentUser.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      distSelect.value = cleanUserDist;
      distSelect.disabled = true;
    } else if (currentUser.role === 'Commune' && currentUser.district && currentUser.district !== 'all') {
      const cleanUserDist = String(currentUser.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      distSelect.value = cleanUserDist;
      distSelect.disabled = true;
    }
  }

  // Populate datalist with ALL station codes in province so user can type ANY code
  if (codeDatalist) {
    codeDatalist.innerHTML = '';
    allPollingStations.forEach(ps => {
      const c4 = String(ps.code || '').padStart(4, '0');
      const opt = document.createElement('option');
      opt.value = c4;
      opt.label = `${ps.name} - ${ps.location || ''} (${getCommunePrefix(ps.communeName, ps.district)})`;
      codeDatalist.appendChild(opt);
    });
  }

  // Event Listeners
  distSelect.onchange = () => {
    updateScoringCommunes(true);
  };

  comSelect.onchange = () => {
    updateScoringStationsForCommune(true);
  };

  if (codeSelect) {
    codeSelect.onchange = () => {
      const stId = codeSelect.value;
      if (stId) setScoringStationById(stId, 'codeSelect');
    };
  }

  if (locSelect) {
    locSelect.onchange = () => {
      const stId = locSelect.value;
      if (stId) setScoringStationById(stId, 'locSelect');
    };
  }

  const handleCodeTyping = () => {
    const rawVal = (codeInput.value || '').trim();
    if (!rawVal) return;
    const num = parseInt(rawVal, 10);
    if (isNaN(num)) return;
    const c4 = String(num).padStart(4, '0');

    // 1. Try matching within current commune
    const curComCode = comSelect.value;
    const comStations = allPollingStations.filter(p => String(p.communeCode).padStart(3, '0') === String(curComCode).padStart(3, '0'));
    let matched = comStations.find(p => String(p.code).padStart(4, '0') === c4 || String(p.displayCode).padStart(4, '0') === c4 || parseInt(p.code, 10) === num);

    // 2. If not found in current commune, search whole province
    if (!matched) {
      matched = allPollingStations.find(p => String(p.code).padStart(4, '0') === c4 || String(p.displayCode).padStart(4, '0') === c4 || parseInt(p.code, 10) === num);
      if (matched) {
        if (currentUser && currentUser.role === 'Commune' && String(matched.communeCode).padStart(3, '0') !== String(currentUser.communeCode).padStart(3, '0')) {
          alert(`ការិយាល័យកូដ ${c4} ស្ថិតនៅ${getCommunePrefix(matched.communeName, matched.district)}! គណនីរបស់អ្នកមានសិទ្ធិតែក្នុង${getCommunePrefix(currentUser.communeName, currentUser.district)} ប៉ុណ្ណោះ។`);
          return;
        }
        if (currentUser && currentUser.role === 'Trainer' && matched.district !== currentUser.district) {
          alert(`ការិយាល័យកូដ ${c4} ស្ថិតនៅ${getDistrictPrefix(matched.district)}!`);
          return;
        }
        // Auto-switch district and commune
        const cleanMatchedDist = String(matched.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
        distSelect.value = cleanMatchedDist;
        updateScoringCommunes(false, matched.communeCode);
      }
    }

    if (matched) {
      setScoringStationById(matched.id, 'codeInput');
    } else {
      alert(`រកមិនឃើញការិយាល័យបោះឆ្នោតដែលមានលេខកូដ ${rawVal} ឡើយ!`);
    }
  };

  if (codeInput) {
    codeInput.onchange = handleCodeTyping;
    codeInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCodeTyping();
      }
    };
  }

  // If no district is selected, select the first one
  if (!distSelect.value && distNames.length) {
    const firstClean = String(distNames[0]).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
    distSelect.value = firstClean;
  }

  updateScoringCommunes(true);
}

function updateScoringCommunes(autoSelectFirst = true, targetCommuneCode = null) {
  const distSelect = document.getElementById('scoringDistrictFilter');
  const comSelect = document.getElementById('scoringCommuneFilter');
  const distLabel = document.getElementById('scoringDistrictLabel');
  const comLabel = document.getElementById('scoringCommuneLabel');
  if (!distSelect || !comSelect) return;

  const selDist = distSelect.value;
  const isKrong = selDist === 'ដូនកែវ';

  // Update dynamic labels
  if (distLabel) {
    distLabel.textContent = isKrong ? '🏛️ ក្រុង (Krong / City)' : '🏛️ ស្រុក (District)';
  }
  if (comLabel) {
    comLabel.textContent = isKrong ? '🏘️ សង្កាត់ (Sangkat)' : '🏘️ ឃុំ (Commune)';
  }

  let matchingCommunes = allCommunes.filter(c => {
    const cDist = String(c.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
    return cDist === selDist;
  });

  if (!matchingCommunes.length && allPollingStations.length) {
    const cMap = {};
    allPollingStations.filter(p => {
      const pDist = String(p.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      return pDist === selDist;
    }).forEach(p => {
      const code = String(p.communeCode).padStart(3, '0');
      if (!cMap[code]) cMap[code] = { code, name: p.communeName, district: p.district };
    });
    matchingCommunes = Object.values(cMap);
  }

  comSelect.innerHTML = isKrong ? '<option value="">-- ជ្រើសរើសសង្កាត់ --</option>' : '<option value="">-- ជ្រើសរើសឃុំ --</option>';
  matchingCommunes.forEach(c => {
    const code = String(c.code).padStart(3, '0');
    const label = `${getCommunePrefix(c.name, selDist)} (${code})`;
    comSelect.innerHTML += `<option value="${code}">${label}</option>`;
  });

  if (currentUser && currentUser.role === 'Commune') {
    comSelect.value = String(currentUser.communeCode).padStart(3, '0');
    comSelect.disabled = true;
  } else if (targetCommuneCode) {
    comSelect.value = String(targetCommuneCode).padStart(3, '0');
  } else if (matchingCommunes.length && autoSelectFirst) {
    comSelect.selectedIndex = matchingCommunes.length ? 1 : 0;
  }

  updateScoringStationsForCommune(autoSelectFirst);
}

function updateScoringStationsForCommune(autoSelectFirst = true, targetStationId = null) {
  const comSelect = document.getElementById('scoringCommuneFilter');
  const codeSelect = document.getElementById('scoringCodeSelect');
  const locSelect = document.getElementById('scoringLocationSelect');
  const codeInput = document.getElementById('scoringCodeInput');
  const hiddenStation = document.getElementById('scoringStationSelect');

  if (!comSelect || !codeSelect || !locSelect) return;

  const selComCode = comSelect.value;
  const stations = allPollingStations.filter(p => String(p.communeCode).padStart(3, '0') === String(selComCode).padStart(3, '0'));

  // Sort by code ascending
  stations.sort((a, b) => (parseInt(a.code, 10) || 0) - (parseInt(b.code, 10) || 0));

  codeSelect.innerHTML = '';
  locSelect.innerHTML = '';

  if (!stations.length) {
    codeSelect.innerHTML = '<option value="">-- គ្មាន --</option>';
    locSelect.innerHTML = '<option value="">-- គ្មានការិយាល័យក្នុងទីតាំងនេះ --</option>';
    if (codeInput) codeInput.value = '';
    if (hiddenStation) hiddenStation.value = '';
    renderScoringTableForActiveStation();
    return;
  }

  stations.forEach(ps => {
    const c4 = String(ps.code || '').padStart(4, '0');
    codeSelect.innerHTML += `<option value="${ps.id}">${c4}</option>`;
    const locText = ps.location ? ` - ${ps.location}` : '';
    locSelect.innerHTML += `<option value="${ps.id}">${ps.name} [${c4}]${locText}</option>`;
  });

  let selectedStation = null;
  if (targetStationId) {
    selectedStation = stations.find(p => p.id === targetStationId);
  }
  if (!selectedStation && autoSelectFirst) {
    selectedStation = stations[0];
  }

  if (selectedStation) {
    setScoringStationById(selectedStation.id, 'init');
  }
}

function setScoringStationById(stationId, source = '') {
  const ps = allPollingStations.find(p => p.id === stationId);
  if (!ps) return;

  const distSelect = document.getElementById('scoringDistrictFilter');
  const comSelect = document.getElementById('scoringCommuneFilter');
  const codeInput = document.getElementById('scoringCodeInput');
  const codeSelect = document.getElementById('scoringCodeSelect');
  const locSelect = document.getElementById('scoringLocationSelect');
  const hiddenStation = document.getElementById('scoringStationSelect');
  const infoSpan = document.getElementById('activeStationInfo');

  const c4 = String(ps.code || '').padStart(4, '0');
  const cleanDist = String(ps.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');

  // Synchronize inputs
  if (distSelect && distSelect.value !== cleanDist) {
    distSelect.value = cleanDist;
  }
  const comCode3 = String(ps.communeCode).padStart(3, '0');
  if (comSelect && comSelect.value !== comCode3) {
    comSelect.value = comCode3;
  }
  if (source !== 'codeInput' && codeInput) {
    codeInput.value = c4;
  }
  if (source !== 'codeSelect' && codeSelect) {
    codeSelect.value = ps.id;
  }
  if (source !== 'locSelect' && locSelect) {
    locSelect.value = ps.id;
  }
  if (hiddenStation) {
    hiddenStation.value = ps.id;
  }

  if (infoSpan) {
    const distPrefix = getDistrictPrefix(ps.district);
    const comPrefix = getCommunePrefix(ps.communeName, ps.district);
    infoSpan.textContent = `📍 ${distPrefix} | ${comPrefix} | ${ps.name} [កូដ: ${c4}] | ទីតាំង: ${ps.location || 'គ្មាន'}`;
  }

  renderScoringTableForActiveStation();
}

async function checkCloudStatus() {
  const badge = document.getElementById('cloudStatusText');
  const pulse = document.getElementById('pulseDot');
  const badgeContainer = document.getElementById('cloudStatusBadge');
  if (!badge) return;

  const isLocal = window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' || 
                  window.location.port === '3027';

  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success && data.settings) {
      appSettings = data.settings;
      updateAppLogos(appSettings.logoUrl);
      if (appSettings.googleSheetUrl) {
        badge.textContent = isLocal ? 'Google Sheets: Synced' : 'Storage: Google Sheets';
        if (badgeContainer) badgeContainer.title = 'ទិន្នន័យបានភ្ជាប់ជាមួយ Google Sheets Cloud រួចរាល់';
        if (pulse) {
          pulse.className = 'pulse-dot';
          pulse.style.backgroundColor = '#06b6d4';
          pulse.style.boxShadow = '0 0 8px #06b6d4';
        }
      } else if (!isLocal) {
        badge.textContent = 'Storage: Online Database';
        if (badgeContainer) badgeContainer.title = 'ប្រព័ន្ធកំពុងដំណើរការលើ Cloud Online (pec21-takeo.onrender.com)';
        if (pulse) {
          pulse.className = 'pulse-dot';
          pulse.style.backgroundColor = '#10b981';
          pulse.style.boxShadow = '0 0 8px #10b981';
        }
      } else {
        badge.textContent = 'Storage: Local Database';
        if (badgeContainer) badgeContainer.title = 'ប្រព័ន្ធកំពុងដំណើរការលើម៉ាស៊ីនផ្ទាល់ (Localhost:3027)';
        if (pulse) {
          pulse.className = 'pulse-dot';
          pulse.style.backgroundColor = '#22c55e';
          pulse.style.boxShadow = '0 0 8px #22c55e';
        }
      }
    }
  } catch (e) {
    if (!isLocal) {
      badge.textContent = 'Storage: Online Database';
      if (pulse) {
        pulse.className = 'pulse-dot';
        pulse.style.backgroundColor = '#10b981';
        pulse.style.boxShadow = '0 0 8px #10b981';
      }
    } else {
      badge.textContent = 'Storage: Offline';
      if (pulse) {
        pulse.className = 'pulse-dot';
        pulse.style.backgroundColor = '#ef4444';
        pulse.style.boxShadow = '0 0 8px #ef4444';
      }
    }
  }
}

// ==============================================================================
// TAB 1: DASHBOARD
// ==============================================================================

async function loadDashboardStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (!data.success) return;

    const s = data.stats;
    document.getElementById('dashTotalCandidates').textContent = s.totalCandidates.toLocaleString();
    document.getElementById('dashTotalStations').textContent = s.totalPollingStations.toLocaleString();
    document.getElementById('dashTotalPassed').textContent = s.totalPassed.toLocaleString();
    document.getElementById('dashTotalReserve').textContent = s.totalReserve.toLocaleString();
    document.getElementById('dashTotalAbsent').textContent = s.totalAbsent.toLocaleString();

    const tbody = document.getElementById('districtStatsTableBody');
    tbody.innerHTML = '';

    s.byDistrict.forEach((d, idx) => {
      tbody.innerHTML += `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: 600;">${d.district}</td>
          <td style="text-align: center;">${d.pollingStationCount}</td>
          <td style="text-align: center; font-weight: 700;">${d.candidateCount}</td>
          <td style="text-align: center;"><span class="badge badge-passed">${d.passedCount}</span></td>
          <td style="text-align: center;"><span class="badge badge-reserve">${d.reserveCount}</span></td>
          <td style="text-align: center;"><span class="badge badge-absent">${d.absentCount}</span></td>
        </tr>
      `;
    });
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

// ==============================================================================
// TAB 2: POLLING STATIONS (Commune Creates Multiple Stations Dynamically)
// ==============================================================================

// Function to batch create / restore official stations for a commune
async function batchCreateForSelectedCommune(forcedCommuneCode = null) {
  let comCode = forcedCommuneCode || document.getElementById('filterStationCommune')?.value;
  if (!comCode && currentUser.role === 'Commune') {
    comCode = currentUser.communeCode;
  }

  if (!comCode) {
    alert('សូមជ្រើសរើសឃុំ-សង្កាត់ជាមុនសិន!');
    return;
  }

  const paddedCom = String(comCode).padStart(3, '0');
  const comObj = allCommunes.find(c => String(c.code).padStart(3, '0') === paddedCom);
  const comName = comObj ? comObj.name : comCode;

  if (!confirm(`តើលោកអ្នកពិតជាចង់បង្កើត/ទាញយកការិយាល័យបោះឆ្នោតទាំងអស់ក្នុងឃុំ «${comName}» ដោយស្វ័យប្រវត្តិតាមស្ថិតិផ្លូវការមែនទេ?`)) {
    return;
  }

  try {
    const res = await fetch('/api/polling-stations/batch-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ communeCode: paddedCom })
    });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      // Reload polling stations
      const psRes = await fetch('/api/polling-stations').then(r => r.json());
      allPollingStations = psRes.pollingStations || [];
      populateStationSelectors();
      renderPollingStationsTable();
    } else {
      alert('កំហុស៖ ' + data.message);
    }
  } catch (err) {
    alert('Network error: ' + err.message);
  }
}
window.batchCreateForSelectedCommune = batchCreateForSelectedCommune;

function renderPollingStationsTable() {
  const tbody = document.getElementById('pollingStationsTableBody');
  tbody.innerHTML = '';

  const filterDist = document.getElementById('filterStationDistrict')?.value;
  const filterCom = document.getElementById('filterStationCommune')?.value;
  const searchKw = document.getElementById('searchStationKeyword')?.value?.trim()?.toLowerCase();

  let filtered = allPollingStations;
  if (filterDist) filtered = filtered.filter(p => p.district === filterDist);
  if (filterCom) {
    const paddedCom = String(filterCom).padStart(3, '0');
    filtered = filtered.filter(p => String(p.communeCode).padStart(3, '0') === paddedCom);
  }
  if (searchKw) {
    filtered = filtered.filter(p => 
      String(p.code || '').includes(searchKw) || 
      (p.location && p.location.toLowerCase().includes(searchKw)) || 
      (p.name && p.name.toLowerCase().includes(searchKw)) ||
      (p.communeName && p.communeName.toLowerCase().includes(searchKw))
    );
  }

  // Counter badge
  const countSpan = document.getElementById('stationCountBadge');
  if (countSpan) {
    countSpan.textContent = `(សរុប ${filtered.length.toLocaleString()} / ${allPollingStations.length.toLocaleString()} ការិយាល័យ)`;
  }

  if (!filtered.length) {
    if (filterCom) {
      const paddedCom = String(filterCom).padStart(3, '0');
      const comObj = allCommunes.find(c => String(c.code).padStart(3, '0') === paddedCom);
      const comName = comObj ? comObj.name : filterCom;
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 36px 16px;">
            <p style="font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">
              🏛️ មិនទាន់ឃើញមានការិយាល័យបោះឆ្នោតក្នុងឃុំ <strong>${comName}</strong> ឡើយ។
            </p>
            <p style="font-size: 13.5px; color: #64748b; margin-bottom: 16px;">
              លោកអ្នកអាចចុចប៊ូតុងខាងក្រោម ដើម្បីបង្កើតការិយាល័យបោះឆ្នោតទាំងអស់ក្នុងឃុំនេះដោយស្វ័យប្រវត្តិតាមស្ថិតិផ្លូវការ ៖
            </p>
            <button class="btn btn-success" onclick="batchCreateForSelectedCommune('${paddedCom}')" style="font-size: 14px; font-weight: 700; padding: 10px 24px; box-shadow: 0 4px 6px -1px rgba(22, 101, 52, 0.2);">
              ⚡ ចុចទីនេះដើម្បីបង្កើតការិយាល័យទាំងអស់ក្នុងឃុំ${comName} ភ្លាមៗ (Auto-Create Stations)
            </button>
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">រកមិនឃើញការិយាល័យបោះឆ្នោតតាមលក្ខខណ្ឌស្វែងរកនេះឡើយ។</td></tr>';
    }
    return;
  }

  // Display limit when unfiltered to maintain snappy UI rendering
  const isFiltered = Boolean(filterDist || filterCom || searchKw);
  const displayLimit = isFiltered ? 500 : 150;
  const displayList = filtered.slice(0, displayLimit);

  displayList.forEach(ps => {
    const comLabel = getCommunePrefix(ps.communeName, ps.district);
    const distLabel = getDistrictPrefix(ps.district);
    tbody.innerHTML += `
      <tr>
        <td style="text-align: center; font-weight: 700;">${String(ps.code || '').padStart(4, '0')}</td>
        <td style="font-weight: 600; color: var(--primary);">${ps.name}</td>
        <td>${comLabel}</td>
        <td>${distLabel}</td>
        <td>${ps.location || '---'}</td>
        <td style="text-align: center;"><span class="badge badge-passed">${ps.candidateCount || 0} នាក់</span></td>
        <td style="text-align: center; white-space: nowrap;">
          <div class="table-actions-nowrap" style="display: inline-flex; flex-direction: row; flex-wrap: nowrap; gap: 4px; align-items: center; justify-content: center;">
            <button class="btn btn-secondary btn-sm" onclick="selectStationForScoring('${ps.id}')" title="បញ្ចូលពិន្ទុ" style="white-space: nowrap; padding: 4px 8px; font-weight: 600;">📝 ពិន្ទុ</button>
            <button class="btn btn-secondary btn-sm" onclick="editStation('${ps.id}')" title="កែប្រែ" style="padding: 4px 8px;">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteStation('${ps.id}')" title="លុប" style="padding: 4px 8px;">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  });

  if (filtered.length > displayLimit) {
    tbody.innerHTML += `
      <tr style="background: #f8fafc; font-style: italic; color: #64748b; text-align: center;">
        <td colspan="7" style="padding: 12px;">
          ℹ️ បង្ហាញ ${displayLimit} ក្នុងចំណោម ${filtered.length.toLocaleString()} ការិយាល័យ។ សូមប្រើប្រអប់ស្វែងរក ឬជ្រើសរើសតម្រងក្រុង-ស្រុក/ឃុំ-សង្កាត់ ដើម្បីមើលចំការិយាល័យដែលត្រូវការ។
        </td>
      </tr>
    `;
  }
}

function openStationModal(station = null) {
  const modal = document.getElementById('modalStation');
  const title = document.getElementById('modalStationTitle');
  const formId = document.getElementById('stationFormId');
  const formCode = document.getElementById('stationFormCode');
  const formName = document.getElementById('stationFormName');
  const formLoc = document.getElementById('stationFormLocation');
  const formDate = document.getElementById('stationFormDate');
  const formTime = document.getElementById('stationFormTime');
  const formPlace = document.getElementById('stationFormPlace');
  const comGroup = document.getElementById('stationFormCommuneGroup');

  if (currentUser.role === 'Commune') {
    comGroup.style.display = 'none';
  } else {
    comGroup.style.display = 'block';
  }

  if (station) {
    title.textContent = 'កែប្រែព័ត៌មានការិយាល័យ';
    formId.value = station.id;
    formCode.value = String(station.code || '').padStart(4, '0');
    formName.value = station.name;
    formLoc.value = station.location || '';
    formDate.value = station.interviewDate || '09-07-2027';
    formTime.value = station.interviewTime || '០៧:០០ ព្រឹក';
    formPlace.value = station.interviewPlace || '';
    document.getElementById('stationFormCommune').value = station.communeCode;
  } else {
    title.textContent = 'បង្កើតការិយាល័យបោះឆ្នោតថ្មី';
    formId.value = '';
    // Suggest next 4-digit code
    const existingCount = allPollingStations.length + 1;
    const formattedCode = String(existingCount).padStart(4, '0');
    formCode.value = formattedCode;
    formName.value = `ការិយាល័យ ${formattedCode}`;
    formLoc.value = '';
    formDate.value = '09-07-2027';
    formTime.value = '០៧:០០ ព្រឹក';
    formPlace.value = currentUser.communeName ? `សាលាឃុំ${currentUser.communeName}` : '';
  }

  modal.classList.add('active');
}

async function handleStationSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('stationFormId').value;
  const payload = {
    code: document.getElementById('stationFormCode').value.trim(),
    name: document.getElementById('stationFormName').value.trim(),
    location: document.getElementById('stationFormLocation').value.trim(),
    interviewDate: document.getElementById('stationFormDate').value.trim(),
    interviewTime: document.getElementById('stationFormTime').value.trim(),
    interviewPlace: document.getElementById('stationFormPlace').value.trim(),
    communeCode: document.getElementById('stationFormCommune').value
  };

  const method = id ? 'PUT' : 'POST';
  const endpoint = id ? `/api/polling-stations/${id}` : '/api/polling-stations';

  try {
    const res = await fetch(endpoint, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modalStation');
      // Reload polling stations
      const psRes = await fetch('/api/polling-stations').then(r => r.json());
      allPollingStations = psRes.pollingStations || [];
      populateStationSelectors();
      renderPollingStationsTable();
      alert(data.message || 'ជោគជ័យ!');
    } else {
      alert('កំហុស៖ ' + data.message);
    }
  } catch (err) {
    alert('Network error: ' + err.message);
  }
}

window.editStation = function(id) {
  const ps = allPollingStations.find(p => p.id === id);
  if (ps) openStationModal(ps);
};

window.deleteStation = async function(id) {
  const ps = allPollingStations.find(p => p.id === id);
  if (!ps) return;
  if (confirm(`តើលោកអ្នកពិតជាចង់លុប "${ps.name}" និងទិន្នន័យបេក្ខជនទាំងអស់មែនទេ?`)) {
    try {
      const res = await fetch(`/api/polling-stations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        allPollingStations = allPollingStations.filter(p => p.id !== id);
        populateStationSelectors();
        renderPollingStationsTable();
        alert('បានលុបការិយាល័យជោគជ័យ!');
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert(e.message);
    }
  }
};

window.selectStationForScoring = function(stationId) {
  const ps = allPollingStations.find(p => p.id === stationId);
  if (!ps) return;

  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelector('[data-tab="tabScoring"]').classList.add('active');
  document.getElementById('tabScoring').classList.add('active');

  const distSelect = document.getElementById('scoringDistrictFilter');
  if (distSelect) distSelect.value = ps.district;
  updateScoringCommunes(false, ps.communeCode);
  updateScoringStationsForCommune(false, ps.id);
  setScoringStationById(ps.id, 'external');
};

window.onCandidateNameKeyDown = function(e, input) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const allNameInputs = Array.from(document.querySelectorAll('#scoringTableBody tr[data-cand-id] .cand-name'));
    const currentIndex = allNameInputs.indexOf(input);
    if (currentIndex !== -1 && currentIndex + 1 < allNameInputs.length) {
      allNameInputs[currentIndex + 1].focus();
      allNameInputs[currentIndex + 1].select();
    }
  }
};

// ==============================================================================
// TAB 3: CANDIDATE SCORING & LIVE RANKING TABLE
// ==============================================================================

async function renderScoringTableForActiveStation() {
  const stationId = document.getElementById('scoringStationSelect').value;
  const tbody = document.getElementById('scoringTableBody');
  const infoSpan = document.getElementById('activeStationInfo');
  const countBadge = document.getElementById('stationCandidateCountBadge');

  if (!stationId) {
    tbody.innerHTML = '<tr><td colspan="15" style="text-align: center; padding: 25px; color: var(--text-muted); font-size: 14px;">សូមជ្រើសរើសការិយាល័យបោះឆ្នោត</td></tr>';
    if (infoSpan) infoSpan.textContent = '';
    if (countBadge) countBadge.textContent = '';
    return;
  }

  const ps = allPollingStations.find(p => p.id === stationId);
  if (ps && infoSpan) {
    const c4 = String(ps.code || '').padStart(4, '0');
    const distPrefix = getDistrictPrefix(ps.district);
    const comPrefix = getCommunePrefix(ps.communeName, ps.district);
    infoSpan.textContent = `📍 ${distPrefix} | ${comPrefix} | ${ps.name} [កូដ: ${c4}] | ទីតាំង: ${ps.location || 'គ្មាន'}`;
  }

  try {
    const res = await fetch(`/api/candidates?pollingStationId=${stationId}`);
    const data = await res.json();
    currentCandidates = data.candidates || [];

    if (countBadge) {
      const filledCount = currentCandidates.filter(c => c.name && c.name.trim()).length;
      countBadge.textContent = `👥 បេក្ខជនក្នុងប្រព័ន្ធ ៖ ${filledCount} / ១៨ នាក់`;
    }

    tbody.innerHTML = '';

    // Render grouped by the 6 roles matching Excel structure
    ROLES_ORDER.forEach(roleName => {
      const roleCode = ROLE_CODES[roleName];
      tbody.innerHTML += `
        <tr class="excel-position-banner">
          <td colspan="15">
            📋 មុខតំណែង ៖ <strong>${roleName}</strong>
          </td>
        </tr>
      `;

      // 3 candidates per position slot (1 to 3)
      for (let order = 1; order <= 3; order++) {
        const slotCode = `${roleCode}${order}`;
        let cand = currentCandidates.find(c => c.role === roleName && c.orderInRole === order);

        if (!cand) {
          // Placeholder slot matching official 18 slots
          cand = {
            id: `temp_${stationId}_${slotCode}`,
            pollingStationId: stationId,
            role: roleName,
            roleCode: roleCode,
            orderInRole: order,
            name: '',
            gender: 'ប',
            dob: '',
            phone: '',
            degree: '',
            scoreDegree: 0,
            experience: '',
            scoreExp: 0,
            scoreShortlist: 0,
            scoreInterview: '',
            scoreTotal: '',
            rank: order,
            status: ''
          };
          currentCandidates.push(cand);
        }

        const isAbsent = cand.scoreInterview === 'អវត្តមាន' || cand.status === 'អវត្តមាន';
        let badgeHtml = '<span class="badge badge-reserve">---</span>';
        if (cand.status === 'A-ជាប់') badgeHtml = '<span class="badge badge-passed">A-ជាប់</span>';
        else if (cand.status === 'B-បម្រុង') badgeHtml = '<span class="badge badge-reserve">B-បម្រុង</span>';
        else if (cand.status === 'C-បម្រុងបន្ទាប់') badgeHtml = '<span class="badge badge-reserve2">C-បម្រុងបន្ទាប់</span>';
        else if (cand.status === 'អវត្តមាន') badgeHtml = '<span class="badge badge-absent">អវត្តមាន</span>';

        tbody.innerHTML += `
          <tr data-cand-id="${cand.id}" data-role="${roleName}" data-order="${order}">
            <td class="excel-col-order">${order}</td>
            <td>
              <input type="text" class="excel-cell-input cand-name" value="${cand.name || ''}" placeholder="បញ្ចូលគោត្តនាម-នាម" onchange="onCandidateRowChange(this)" onkeydown="onCandidateNameKeyDown(event, this)">
            </td>
            <td style="text-align: center;">
              <select class="excel-cell-select cand-gender" onchange="onCandidateRowChange(this)">
                <option value="ប" ${cand.gender === 'ប' ? 'selected' : ''}>ប</option>
                <option value="ស" ${cand.gender === 'ស' ? 'selected' : ''}>ស</option>
              </select>
            </td>
            <td>
              <input type="text" class="excel-cell-input cand-dob" value="${cand.dob || ''}" placeholder="DD-MM-YYYY" style="text-align: center;" onchange="onCandidateRowChange(this)">
            </td>
            <td>
              <input type="text" class="excel-cell-input cand-phone" value="${cand.phone || ''}" placeholder="012..." onchange="onCandidateRowChange(this)">
            </td>
            <td>
              <input type="text" list="degreePresets" class="excel-cell-input cand-degree" value="${cand.degree || ''}" placeholder="ជ្រើសរើស/វាយបញ្ចូល" onchange="onCandidateRowChange(this)">
            </td>
            <td>
              <input type="number" class="excel-cell-input cand-score-degree" value="${cand.scoreDegree || 0}" min="0" max="20" step="0.5" style="text-align: center;" onchange="onCandidateRowChange(this)">
            </td>
            <td>
              <input type="text" list="expPresets" class="excel-cell-input cand-exp" value="${cand.experience || ''}" placeholder="ជ្រើសរើស/វាយបញ្ចូល" onchange="onCandidateRowChange(this)">
            </td>
            <td>
              <input type="number" class="excel-cell-input cand-score-exp" value="${cand.scoreExp || 0}" min="0" max="20" step="0.5" style="text-align: center;" onchange="onCandidateRowChange(this)">
            </td>
            <td class="excel-calc-shortlist cand-shortlist-display">
              ${cand.scoreShortlist || 0}
            </td>
            <td>
              <input type="text" list="interviewPresets" class="excel-cell-input cand-interview" value="${cand.scoreInterview !== undefined ? cand.scoreInterview : ''}" placeholder="0-20 ឬ អវត្តមាន" style="text-align: center; font-weight: 700;" onchange="onCandidateRowChange(this)">
            </td>
            <td class="excel-calc-total cand-total-display">
              ${cand.scoreTotal !== undefined && cand.scoreTotal !== null && cand.scoreTotal !== '' ? cand.scoreTotal : '---'}
            </td>
            <td class="excel-calc-rank cand-rank-display">
              ${cand.rank || order}
            </td>
            <td class="excel-calc-status cand-status-display">
              ${badgeHtml}
            </td>
            <td style="text-align: center;">
              <button class="btn btn-danger btn-sm" style="padding: 2px 7px; font-size: 11px;" onclick="clearCandidateRow(this)" title="លុបទិន្នន័យជួរដេក">❌</button>
            </td>
          </tr>
        `;
      }
    });

  } catch (err) {
    console.error('Error rendering scoring table:', err);
  }
}

window.onCandidateRowChange = function(inputElem) {
  const tr = inputElem.closest('tr');
  const candId = tr.getAttribute('data-cand-id');
  const roleName = tr.getAttribute('data-role');
  const order = parseInt(tr.getAttribute('data-order')) || 1;

  const degInput = tr.querySelector('.cand-degree');
  const degScoreInput = tr.querySelector('.cand-score-degree');
  const expInput = tr.querySelector('.cand-exp');
  const expScoreInput = tr.querySelector('.cand-score-exp');

  // Auto preset score when typing / selecting Degree
  if (inputElem === degInput) {
    const val = degInput.value.trim();
    if (val.includes('បរិញ្ញាបត្រ')) degScoreInput.value = 12;
    else if (val.includes('ជាន់ខ្ពស់')) degScoreInput.value = 8;
    else if (val.includes('បាក់ឌុប')) degScoreInput.value = 5;
    else if (val.includes('ក្រោម') || val.includes('គ្មាន')) degScoreInput.value = 0;
  }

  // Auto preset score when typing / selecting Experience
  if (inputElem === expInput) {
    const val = expInput.value.trim();
    if (val.includes('២ដង') || val.includes('2ដង') || val.includes('2 ដង')) expScoreInput.value = 12;
    else if (val.includes('១ដង') || val.includes('1ដង') || val.includes('1 ដង')) expScoreInput.value = 8;
    else if (val.includes('ស្ទង់មតិ')) expScoreInput.value = 4;
    else if (val.includes('គ្មាន')) expScoreInput.value = 0;
  }

  const name = tr.querySelector('.cand-name').value.trim();
  const gender = tr.querySelector('.cand-gender').value;
  const dob = tr.querySelector('.cand-dob').value.trim();
  const phone = tr.querySelector('.cand-phone').value.trim();
  const degree = degInput.value.trim();
  const scoreDeg = parseFloat(degScoreInput.value) || 0;
  const exp = expInput.value.trim();
  const scoreExp = parseFloat(expScoreInput.value) || 0;
  const interviewRaw = tr.querySelector('.cand-interview').value.trim();

  const shortlist = scoreDeg + scoreExp;
  tr.querySelector('.cand-shortlist-display').textContent = shortlist;

  let total = shortlist;
  let isAbsent = false;
  if (interviewRaw.includes('អវត្តមាន')) {
    isAbsent = true;
    total = 'អវត្តមាន';
  } else {
    const interviewNum = parseFloat(interviewRaw);
    if (!isNaN(interviewNum)) {
      total = shortlist + interviewNum;
    }
  }

  tr.querySelector('.cand-total-display').textContent = total;

  // Update in memory array
  let cand = currentCandidates.find(c => c.id === candId);
  if (cand) {
    cand.name = name;
    cand.gender = gender;
    cand.dob = dob;
    cand.phone = phone;
    cand.degree = degree;
    cand.scoreDegree = scoreDeg;
    cand.experience = exp;
    cand.scoreExp = scoreExp;
    cand.scoreShortlist = shortlist;
    cand.scoreInterview = isAbsent ? 'អវត្តមាន' : (interviewRaw || '');
    cand.scoreTotal = total;
  }

  // Recalculate rank for this role in UI
  recalculateUIRanksForRole(roleName);
};

function recalculateUIRanksForRole(roleName) {
  const rows = Array.from(document.querySelectorAll(`tr[data-role="${roleName}"]`));
  const rowData = rows.map(r => {
    const name = r.querySelector('.cand-name').value.trim();
    const totalText = r.querySelector('.cand-total-display').textContent.trim();
    const isAbsent = totalText === 'អវត្តមាន';
    const totalNum = parseFloat(totalText) || 0;
    return { row: r, hasName: !!name, isAbsent, totalNum };
  });

  // Filter with name
  const activeRows = rowData.filter(d => d.hasName);
  activeRows.sort((a, b) => {
    if (a.isAbsent && !b.isAbsent) return 1;
    if (!a.isAbsent && b.isAbsent) return -1;
    return b.totalNum - a.totalNum;
  });

  activeRows.forEach((d, idx) => {
    const rankElem = d.row.querySelector('.cand-rank-display');
    const statusElem = d.row.querySelector('.cand-status-display');
    if (d.isAbsent) {
      rankElem.textContent = activeRows.length;
      statusElem.innerHTML = '<span class="badge badge-absent">អវត្តមាន</span>';
    } else {
      const r = idx + 1;
      rankElem.textContent = r;
      if (r === 1) statusElem.innerHTML = '<span class="badge badge-passed">A-ជាប់</span>';
      else if (r === 2) statusElem.innerHTML = '<span class="badge badge-reserve">B-បម្រុង</span>';
      else if (r === 3) statusElem.innerHTML = '<span class="badge badge-reserve2">C-បម្រុងបន្ទាប់</span>';
      else statusElem.innerHTML = `<span class="badge badge-reserve">បម្រុង ${r-1}</span>`;
    }
  });
}

window.clearCandidateRow = function(btn) {
  const tr = btn.closest('tr');
  if (confirm('តើលោកអ្នកពិតជាចង់លុបទិន្នន័យបេក្ខជនក្នុងជួរនេះមែនទេ?')) {
    tr.querySelector('.cand-name').value = '';
    tr.querySelector('.cand-dob').value = '';
    tr.querySelector('.cand-phone').value = '';
    tr.querySelector('.cand-degree').value = '';
    tr.querySelector('.cand-score-degree').value = 0;
    tr.querySelector('.cand-exp').value = '';
    tr.querySelector('.cand-score-exp').value = 0;
    tr.querySelector('.cand-shortlist-display').textContent = 0;
    tr.querySelector('.cand-interview').value = '';
    tr.querySelector('.cand-total-display').textContent = '---';
    tr.querySelector('.cand-status-display').innerHTML = '<span class="badge badge-reserve">---</span>';

    onCandidateRowChange(tr.querySelector('.cand-name'));
  }
};

async function saveBatchScores() {
  const stationId = document.getElementById('scoringStationSelect').value;
  if (!stationId) return alert('សូមជ្រើសរើស ឬវាយលេខកូដការិយាល័យជាមុនសិន!');

  const rows = document.querySelectorAll('#scoringTableBody tr[data-cand-id]');
  const candidatesPayload = [];

  rows.forEach(tr => {
    const candId = tr.getAttribute('data-cand-id');
    const roleName = tr.getAttribute('data-role');
    const order = parseInt(tr.getAttribute('data-order')) || 1;
    const nameInput = tr.querySelector('.cand-name');
    const name = nameInput ? nameInput.value.trim() : '';

    candidatesPayload.push({
      id: candId.startsWith('temp_') ? undefined : candId,
      pollingStationId: stationId,
      role: roleName,
      orderInRole: order,
      name: name,
      gender: tr.querySelector('.cand-gender') ? tr.querySelector('.cand-gender').value : 'ប',
      dob: tr.querySelector('.cand-dob') ? tr.querySelector('.cand-dob').value.trim() : '',
      phone: tr.querySelector('.cand-phone') ? tr.querySelector('.cand-phone').value.trim() : '',
      degree: tr.querySelector('.cand-degree') ? tr.querySelector('.cand-degree').value.trim() : '',
      scoreDegree: parseFloat(tr.querySelector('.cand-score-degree')?.value) || 0,
      experience: tr.querySelector('.cand-exp') ? tr.querySelector('.cand-exp').value.trim() : '',
      scoreExp: parseFloat(tr.querySelector('.cand-score-exp')?.value) || 0,
      scoreInterview: tr.querySelector('.cand-interview') ? tr.querySelector('.cand-interview').value.trim() : ''
    });
  });

  const saveBtn = document.getElementById('btnSaveBatchScores');
  const originalText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '⏳ កំពុងរក្សាទុក...';

  try {
    const res = await fetch('/api/candidates/batch-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollingStationId: stationId, candidates: candidatesPayload })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || 'រក្សាទុកមិនបានជោគជ័យ');

    saveBtn.innerHTML = '✅ បានរក្សាទុកជោគជ័យ!';
    setTimeout(() => {
      saveBtn.innerHTML = originalText;
    }, 2500);

    await renderScoringTableForActiveStation();
    await checkCloudStatus();
  } catch (err) {
    alert('មានបញ្ហាក្នុងការរក្សាទុក៖ ' + err.message);
    saveBtn.innerHTML = originalText;
  } finally {
    saveBtn.disabled = false;
  }
}

// ==============================================================================
// EXCEL IMPORT & EXPORT ENGINE (SheetJS Integration)
// ==============================================================================

let pendingImportCandidates = [];

// Helper to convert Excel serial dates (e.g. 31188) or JS dates to DD-MM-YYYY
function formatExcelDate(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    try {
      if (typeof XLSX !== 'undefined' && XLSX.SSF) {
        const parsed = XLSX.SSF.parse_date_code(val);
        if (parsed && parsed.y) {
          const d = String(parsed.d).padStart(2, '0');
          const m = String(parsed.m).padStart(2, '0');
          return `${d}-${m}-${parsed.y}`;
        }
      }
    } catch (e) {}
    // Fallback formula
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const d = String(date.getUTCDate()).padStart(2, '0');
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      return `${d}-${m}-${date.getUTCFullYear()}`;
    }
  }
  if (val instanceof Date) {
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    return `${d}-${m}-${val.getFullYear()}`;
  }
  return String(val).trim().replace(/\//g, '-');
}

// 1. Export Current Polling Station Candidates to Excel (.xlsx)
function exportCurrentStationToExcel() {
  if (typeof XLSX === 'undefined') {
    alert('កំពុងទាញយកបណ្ណាល័យ Excel សូមរង់ចាំបន្តិច ឬ Refresh ទំព័រឡើងវិញ!');
    return;
  }

  const stationId = document.getElementById('scoringStationSelect').value;
  if (!stationId) {
    alert('សូមជ្រើសរើសការិយាល័យបោះឆ្នោតជាមុនសិន!');
    return;
  }

  const ps = allPollingStations.find(p => p.id === stationId);
  const stCode = ps ? ps.code : '0001';
  const comName = ps ? ps.communeName : 'ឃុំ';
  const mandate = (appSettings && appSettings.mandateTitle) || 'សម្រាប់ការបោះឆ្នោតជ្រើសតាំងតំណាងរាស្ត្រ នីតិកាលទី៨ ឆ្នាំ២០២៧';

  // --- PRIMARY SHEET: តារាងបញ្ចូលពិន្ទុ គ.ក.ប (Matches Form 14 columns exactly) ---
  const formAOA = [
    [null, null, null, null, null, "ព្រះរាជាណាចក្រកម្ពុជា"],
    [null, null, null, null, null, "ជាតិ  សាសនា  ព្រះមហាក្សត្រ"],
    [],
    ["គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត"],
    ["គណៈកម្មការរៀបចំការបោះឆ្នោត ខេត្តតាកែវ"],
    ["គណៈកម្មការសម្ភាសន៍ជ្រើសរើស គ.ក.ប"],
    [`ឃុំ${comName}`],
    [],
    [null, null, null, "តារាងបញ្ចូលពិន្ទុ និងបូកស្រង់លទ្ធផលបេក្ខជន គ.ក.ប"],
    [null, null, null, mandate],
    [null, null, null, null, null, null, null, null, null, null, "លេខកូដការិយាល័យ ៖", stCode],
    // Tier 1 Header (Row index 11):
    ["ល.រ", "ព័ត៌មានបេក្ខជន", null, null, null, "តារាងសម្រាំងបេក្ខជន", null, null, null, null, "សម្ភាសន៍ (0-20)", "លទ្ធផលបូកស្រង់", null, null],
    // Tier 2 Header (Row index 12):
    [null, "គោត្តនាម-នាម", "ភេទ", "ថ្ងៃ ខែ ឆ្នាំកំណើត", "លេខទូរសព្ទ", "កម្រិតសញ្ញាបត្រ", "ពិន្ទុ", "បទពិសោធន៍", "ពិន្ទុ", "សរុបសម្រាំង", null, "សរុបពិន្ទុ", "ចំណាត់ថ្នាក់", "និទ្ទេស"]
  ];

  const formMerges = [
    { s: { r: 0, c: 4 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 4 }, e: { r: 1, c: 9 } },
    { s: { r: 8, c: 2 }, e: { r: 8, c: 11 } },
    { s: { r: 9, c: 2 }, e: { r: 9, c: 11 } },
    { s: { r: 11, c: 0 }, e: { r: 12, c: 0 } },  // ល.រ (Rowspan 2)
    { s: { r: 11, c: 1 }, e: { r: 11, c: 4 } },  // ព័ត៌មានបេក្ខជន (Colspan 4)
    { s: { r: 11, c: 5 }, e: { r: 11, c: 9 } },  // តារាងសម្រាំងបេក្ខជន (Colspan 5)
    { s: { r: 11, c: 10 }, e: { r: 12, c: 10 } }, // សម្ភាសន៍ (Rowspan 2)
    { s: { r: 11, c: 11 }, e: { r: 11, c: 13 } }  // លទ្ធផលបូកស្រង់ (Colspan 3)
  ];

  // --- SHEET 2: SortList ---
  const sortListAOA = [
    [null, null, null, "ព្រះរាជាណាចក្រកម្ពុជា"],
    [null, null, null, "ជាតិ  សាសនា  ព្រះមហាក្សត្រ"],
    [],
    [null, null, null, "គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត"],
    [null, null, null, "គណៈកម្មការរៀបចំការបោះឆ្នោត ខេត្តតាកែវ"],
    [null, null, null, "គណៈកម្មការសម្ភាសន៍ជ្រើសរើស គ.ក.ប"],
    [null, null, null, `ឃុំ${comName}`],
    [],
    [null, null, null, "តារាងសម្រាំងបេក្ខជនសម្រាប់ការសម្ភាសន៍ជ្រើសរើស គ.ក.ប"],
    [null, null, null, mandate],
    [null, null, null, null, null, null, null, "លេខកូដការិយាល័យ ៖", stCode],
    ["កូដ", "មុខតំណែង", "ល.រ", "ល.រ", "គោត្តនាម-នាម", "ភេទ", "ថ្ងៃ ខែ ឆ្នាំកំណើត", "កម្រិតសញ្ញាបត្រ", "ពិន្ទុ", "បទពិសោធន៍", "ពិន្ទុ", "សរុបពិន្ទុ", "លេខទូរសព្ទ"]
  ];

  // --- SHEET 3: បញ្ចូលពិន្ទុ (Scoring) ---
  const scoreAOA = [
    [null, "ព្រះរាជាណាចក្រកម្ពុជា"],
    [null, "ជាតិ  សាសនា  ព្រះមហាក្សត្រ"],
    [],
    [null, "គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត"],
    [null, "គណៈកម្មការរៀបចំការបោះឆ្នោត ខេត្តតាកែវ"],
    [null, "គណៈកម្មការសម្ភាសន៍ជ្រើសរើស គ.ក.ប"],
    [null, `ឃុំ${comName}`],
    [],
    [null, "តារាងស្រង់ពិន្ទុនៃការជ្រើសរើស គ.ក.ប"],
    [null, mandate],
    [null, null, null, null, null, null, "លេខកូដការិយាល័យ ៖", stCode],
    ["កូដ", "ល.រ", "គោត្តនាម-នាម", "ភេទ", "ថ្ងៃ ខែ ឆ្នាំកំណើត", "ពិន្ទុសម្រាំង", "ពិន្ទុសម្ភាសន៍", "សរុបពិន្ទុ", "ផ្សេងៗ"]
  ];

  // --- SHEET 4: លទ្ធផលតាមលំដាប់ (Ranked Results) ---
  const resultsAOA = [
    [null, null, null, "ព្រះរាជាណាចក្រកម្ពុជា"],
    [null, null, null, "ជាតិ សាសនា ព្រះមហាក្សត្រ"],
    [],
    [null, null, null, "គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត"],
    [null, null, null, "គណៈកម្មការរៀបចំការបោះឆ្នោត ខេត្តតាកែវ"],
    [null, null, null, "គណៈកម្មការសម្ភាសន៍ជ្រើសរើស គ.ក.ប"],
    [null, null, null, `ឃុំ${comName}`],
    [],
    [null, null, null, "លទ្ធផលនៃការសម្ភាសន៍ជ្រើសរើស គ.ក.ប"],
    [null, null, null, mandate],
    [null, null, null, null, null, null, null, "លេខកូដការិយាល័យ ៖", stCode],
    ["កូដ", "មុខតំណែង", "ល.រ", "គោត្តនាម-នាម", "ភេទ", "ថ្ងៃ ខែ ឆ្នាំកំណើត", "សរុបពិន្ទុ", "ចំណាត់ថ្នាក់", "និទ្ទេស", "ផ្សេងៗ"]
  ];

  ROLES_ORDER.forEach(roleName => {
    const roleCode = ROLE_CODES[roleName];

    // Form Banner Row (No role codes like (កូដ: a))
    const formBannerRow = formAOA.length;
    formAOA.push([`📋 មុខតំណែង ៖ ${roleName}`]);
    formMerges.push({ s: { r: formBannerRow, c: 0 }, e: { r: formBannerRow, c: 13 } });

    // Legacy Banner rows
    sortListAOA.push([`--`, `-`, `-`, `- មុខតំណែង ៖ ${roleName}`]);
    scoreAOA.push([`-`, `- មុខតំណែង ៖ ${roleName}`]);
    resultsAOA.push([`--`, `-`, `-`, `- មុខតំណែង ៖ ${roleName}`]);

    for (let ord = 1; ord <= 3; ord++) {
      const slotCode = `${roleCode}${ord}`;
      const cand = currentCandidates.find(c => c.role === roleName && c.orderInRole === ord) || {};
      const degScore = cand.scoreDegree !== undefined && cand.scoreDegree !== '' ? parseFloat(cand.scoreDegree) || 0 : 0;
      const expScore = cand.scoreExp !== undefined && cand.scoreExp !== '' ? parseFloat(cand.scoreExp) || 0 : 0;
      const shortlistScore = cand.scoreShortlist !== undefined && cand.scoreShortlist !== '' ? cand.scoreShortlist : (degScore + expScore);

      // Unified Form row matching UI table exactly
      formAOA.push([
        ord,
        cand.name || '',
        cand.gender || '',
        cand.dob || '',
        cand.phone || '',
        cand.degree || '',
        degScore,
        cand.experience || '',
        expScore,
        shortlistScore,
        cand.scoreInterview !== undefined ? cand.scoreInterview : '',
        cand.scoreTotal !== undefined ? cand.scoreTotal : '',
        cand.rank || ord,
        cand.status || ''
      ]);

      sortListAOA.push([
        slotCode,
        roleCode,
        ord,
        ord,
        cand.name || '',
        cand.gender || '',
        cand.dob || '',
        cand.degree || '',
        cand.scoreDegree || 0,
        cand.experience || '',
        cand.scoreExp || 0,
        cand.scoreShortlist || 0,
        cand.phone || ''
      ]);

      scoreAOA.push([
        slotCode,
        ord,
        cand.name || '',
        cand.gender || '',
        cand.dob || '',
        cand.scoreShortlist || 0,
        cand.scoreInterview !== undefined ? cand.scoreInterview : '',
        cand.scoreTotal !== undefined ? cand.scoreTotal : '',
        ''
      ]);

      resultsAOA.push([
        slotCode,
        roleName,
        ord,
        cand.name || '',
        cand.gender || '',
        cand.dob || '',
        cand.scoreTotal !== undefined ? cand.scoreTotal : '',
        cand.rank || ord,
        cand.status || '',
        ''
      ]);
    }
  });

  const wb = XLSX.utils.book_new();

  const wsForm = XLSX.utils.aoa_to_sheet(formAOA);
  wsForm['!merges'] = formMerges;
  wsForm['!cols'] = [
    { wch: 6 },   // 0: ល.រ
    { wch: 22 },  // 1: គោត្តនាម-នាម
    { wch: 6 },   // 2: ភេទ
    { wch: 15 },  // 3: ថ្ងៃ ខែ ឆ្នាំកំណើត
    { wch: 15 },  // 4: លេខទូរសព្ទ
    { wch: 18 },  // 5: កម្រិតសញ្ញាបត្រ
    { wch: 8 },   // 6: ពិន្ទុ
    { wch: 20 },  // 7: បទពិសោធន៍
    { wch: 8 },   // 8: ពិន្ទុ
    { wch: 14 },  // 9: សរុបសម្រាំង
    { wch: 16 },  // 10: សម្ភាសន៍ (0-20)
    { wch: 12 },  // 11: សរុបពិន្ទុ
    { wch: 12 },  // 12: ចំណាត់ថ្នាក់
    { wch: 16 }   // 13: និទ្ទេស
  ];

  const wsSort = XLSX.utils.aoa_to_sheet(sortListAOA);
  const wsScore = XLSX.utils.aoa_to_sheet(scoreAOA);
  const wsResult = XLSX.utils.aoa_to_sheet(resultsAOA);

  wsSort['!cols'] = [
    { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 },
    { wch: 22 }, { wch: 6 }, { wch: 14 }, { wch: 18 },
    { wch: 8 }, { wch: 18 }, { wch: 8 }, { wch: 12 }, { wch: 15 }
  ];
  wsScore['!cols'] = [
    { wch: 6 }, { wch: 6 }, { wch: 22 }, { wch: 6 },
    { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 10 }
  ];
  wsResult['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 6 }, { wch: 22 },
    { wch: 6 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 }
  ];

  // Primary sheet is the unified 14-column Form table
  XLSX.utils.book_append_sheet(wb, wsForm, "តារាងបញ្ចូលពិន្ទុ គ.ក.ប");
  XLSX.utils.book_append_sheet(wb, wsSort, "SortList");
  XLSX.utils.book_append_sheet(wb, wsScore, "បញ្ចូលពិន្ទុ");
  XLSX.utils.book_append_sheet(wb, wsResult, "លទ្ធផលតាមលំដាប់");

  const fileName = `គកប_២០២៧_ការិយាល័យ_${stCode}_ឃុំ${comName}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// 2. Download Blank Excel Template (Matches 14-column Form exactly)
function downloadBlankExcelTemplate() {
  if (typeof XLSX === 'undefined') {
    alert('កំពុងទាញយកបណ្ណាល័យ Excel សូមរង់ចាំបន្តិច!');
    return;
  }

  const templateAOA = [
    [null, null, null, null, null, "ព្រះរាជាណាចក្រកម្ពុជា"],
    [null, null, null, null, null, "ជាតិ  សាសនា  ព្រះមហាក្សត្រ"],
    [],
    ["គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត"],
    ["គណៈកម្មការរៀបចំការបោះឆ្នោត ខេត្តតាកែវ"],
    ["គណៈកម្មការសម្ភាសន៍ជ្រើសរើស គ.ក.ប"],
    [],
    [null, null, null, "គំរូតារាងបញ្ចូលពិន្ទុ និងបូកស្រង់លទ្ធផលបេក្ខជន គ.ក.ប (Template)"],
    [null, null, null, "(សូមបំពេញព័ត៌មានបេក្ខជនតាមជួរដេកនីមួយៗ ហើយអាច Import ចូលក្នុងប្រព័ន្ធវិញបាន)"],
    [],
    // Tier 1 Header:
    ["ល.រ", "ព័ត៌មានបេក្ខជន", null, null, null, "តារាងសម្រាំងបេក្ខជន", null, null, null, null, "សម្ភាសន៍ (0-20)", "លទ្ធផលបូកស្រង់", null, null],
    // Tier 2 Header:
    [null, "គោត្តនាម-នាម", "ភេទ", "ថ្ងៃ ខែ ឆ្នាំកំណើត", "លេខទូរសព្ទ", "កម្រិតសញ្ញាបត្រ", "ពិន្ទុ", "បទពិសោធន៍", "ពិន្ទុ", "សរុបសម្រាំង", null, "សរុបពិន្ទុ", "ចំណាត់ថ្នាក់", "និទ្ទេស"]
  ];

  const templateMerges = [
    { s: { r: 0, c: 4 }, e: { r: 0, c: 9 } },
    { s: { r: 1, c: 4 }, e: { r: 1, c: 9 } },
    { s: { r: 7, c: 2 }, e: { r: 7, c: 11 } },
    { s: { r: 8, c: 2 }, e: { r: 8, c: 11 } },
    { s: { r: 10, c: 0 }, e: { r: 11, c: 0 } },  // ល.រ
    { s: { r: 10, c: 1 }, e: { r: 10, c: 4 } },  // ព័ត៌មានបេក្ខជន
    { s: { r: 10, c: 5 }, e: { r: 10, c: 9 } },  // តារាងសម្រាំងបេក្ខជន
    { s: { r: 10, c: 10 }, e: { r: 11, c: 10 } }, // សម្ភាសន៍
    { s: { r: 10, c: 11 }, e: { r: 10, c: 13 } }  // លទ្ធផលបូកស្រង់
  ];

  ROLES_ORDER.forEach(roleName => {
    const bannerRowIdx = templateAOA.length;
    templateAOA.push([`📋 មុខតំណែង ៖ ${roleName}`]);
    templateMerges.push({ s: { r: bannerRowIdx, c: 0 }, e: { r: bannerRowIdx, c: 13 } });

    for (let ord = 1; ord <= 3; ord++) {
      templateAOA.push([
        ord,
        '',
        'ប',
        '',
        '',
        'បាក់ឌុប',
        5,
        'ការិយាល័យ១ដង',
        8,
        13,
        '',
        '',
        ord,
        ''
      ]);
    }
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(templateAOA);
  ws['!merges'] = templateMerges;
  ws['!cols'] = [
    { wch: 6 },   // 0: ល.រ
    { wch: 22 },  // 1: គោត្តនាម-នាម
    { wch: 6 },   // 2: ភេទ
    { wch: 15 },  // 3: ថ្ងៃ ខែ ឆ្នាំកំណើត
    { wch: 15 },  // 4: លេខទូរសព្ទ
    { wch: 18 },  // 5: កម្រិតសញ្ញាបត្រ
    { wch: 8 },   // 6: ពិន្ទុ
    { wch: 20 },  // 7: បទពិសោធន៍
    { wch: 8 },   // 8: ពិន្ទុ
    { wch: 14 },  // 9: សរុបសម្រាំង
    { wch: 16 },  // 10: សម្ភាសន៍ (0-20)
    { wch: 12 },  // 11: សរុបពិន្ទុ
    { wch: 12 },  // 12: ចំណាត់ថ្នាក់
    { wch: 16 }   // 13: និទ្ទេស
  ];

  XLSX.utils.book_append_sheet(wb, ws, "តារាងបញ្ចូលពិន្ទុ គ.ក.ប");
  XLSX.writeFile(wb, "គំរូ_តារាងបញ្ចូលពិន្ទុ_គកប_២០២៧.xlsx");
}

// 3. Handle File Upload (Import .xlsx or .xlsm)
function handleExcelFileUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (typeof XLSX === 'undefined') {
    alert('មិនទាន់ដំណើរការបណ្ណាល័យ XLSX សូម Refresh ទំព័រ!');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = evt.target.result;
      const wb = XLSX.read(data, { type: 'binary', cellDates: true });
      const candidates = parseCandidatesFromWorkbook(wb);

      if (!candidates || candidates.length === 0) {
        alert('រកមិនឃើញទិន្នន័យបេក្ខជនក្នុងឯកសារនេះឡើយ! សូមប្រាកដថាឯកសារមានតារាងបញ្ចូលពិន្ទុ គ.ក.ប ឬ សន្លឹក SortList/បញ្ចូលពិន្ទុ។');
        return;
      }

      pendingImportCandidates = candidates;

      // Populate preview modal
      const summaryElem = document.getElementById('excelImportSummary');
      const countElem = document.getElementById('excelImportCount');
      const tbody = document.getElementById('excelImportPreviewBody');

      countElem.textContent = candidates.length;
      summaryElem.innerHTML = `
        📁 <strong>ឯកសារ ៖</strong> ${file.name} &nbsp;|&nbsp; 
        🎯 <strong>បេក្ខជនរកឃើញ ៖</strong> ${candidates.length} នាក់ &nbsp;|&nbsp; 
        🏛️ <strong>ការិយាល័យគោលដៅ ៖</strong> ${document.getElementById('activeStationInfo').textContent || 'ការិយាល័យដែលបានជ្រើស'}
      `;

      tbody.innerHTML = '';
      candidates.forEach(c => {
        const shortlist = (c.scoreDegree || 0) + (c.scoreExp || 0);
        tbody.innerHTML += `
          <tr>
            <td style="text-align: center; font-weight: 700;">${c.orderInRole || 1}</td>
            <td style="font-weight: 600;">${c.role}</td>
            <td style="font-weight: 600; color: #1e3a8a;">${c.name}</td>
            <td style="text-align: center;">${c.gender}</td>
            <td style="text-align: center;">${c.dob}</td>
            <td>${c.phone || '---'}</td>
            <td>${c.degree || ''} (${c.scoreDegree}ពិន្ទុ)</td>
            <td style="text-align: center; font-weight: 700; color: #15803d; background: #f0fdf4;">${shortlist}</td>
            <td style="text-align: center; font-weight: 700; color: #92400e; background: #fef3c7;">${c.scoreInterview || '---'}</td>
          </tr>
        `;
      });

      openModal('modalExcelImport');
    } catch (err) {
      console.error('Error reading Excel file:', err);
      alert('កំហុសក្នុងការអានឯកសារ Excel ៖ ' + err.message);
    }
  };

  reader.readAsBinaryString(file);
}

// 4. Parser function that handles both the 14-column Form layout and legacy គ.ក.ប 2027.xlsm
function parseCandidatesFromWorkbook(wb) {
  // Check roles in order so 'អនុប្រធាន' is checked BEFORE 'ប្រធាន'
  const CHECK_ROLES = [
    { name: 'អនុប្រធាន', code: 'b' },
    { name: 'លេខាធិការ', code: 'c' },
    { name: 'សមាជិកទី១', code: 'd' },
    { name: 'សមាជិកទី២', code: 'e' },
    { name: 'សមាជិកទី៣', code: 'f' },
    { name: 'ប្រធាន', code: 'a' }
  ];

  let extracted = [];

  // PRIORITY 1: Look for Form table layout with មុខតំណែង banners
  for (const sheetName of wb.SheetNames) {
    const sNameLower = sheetName.toLowerCase();
    // Skip legacy SortList or separate scoring sheet in Priority 1
    if (sNameLower.includes('sort') || sNameLower.includes('short') || (sheetName.includes('បញ្ចូលពិន្ទុ') && !sheetName.includes('តារាង'))) {
      continue;
    }

    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
    if (!rows || rows.length < 5) continue;

    let currentRole = null;
    let currentRoleCode = 'a';
    const sheetCandidates = [];

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rowStr = row.map(cell => String(cell || '').trim()).join(' ');

      // Check if this row is a position banner
      if (rowStr.includes('មុខតំណែង')) {
        for (const rInfo of CHECK_ROLES) {
          if (rowStr.includes(rInfo.name)) {
            currentRole = rInfo.name;
            currentRoleCode = rInfo.code;
            break;
          }
        }
        continue;
      }

      // If within a role section and row starts with order 1..3
      if (currentRole) {
        const col0Val = String(row[0] || '').trim();
        const ordNum = parseInt(col0Val, 10);
        if (ordNum >= 1 && ordNum <= 3) {
          const candName = String(row[1] || '').trim();
          if (candName) {
            sheetCandidates.push({
              slotCode: `${currentRoleCode}${ordNum}`,
              role: currentRole,
              roleCode: currentRoleCode,
              orderInRole: ordNum,
              name: candName,
              gender: String(row[2] || 'ប').trim() === 'ស' ? 'ស' : 'ប',
              dob: formatExcelDate(row[3]),
              phone: String(row[4] || '').trim(),
              degree: String(row[5] || '').trim(),
              scoreDegree: parseFloat(row[6]) || 0,
              experience: String(row[7] || '').trim(),
              scoreExp: parseFloat(row[8]) || 0,
              scoreInterview: row[10] !== undefined && row[10] !== null ? String(row[10]).trim() : ''
            });
          }
        }
      }
    }

    if (sheetCandidates.length > 0) {
      extracted = sheetCandidates;
      break;
    }
  }

  // PRIORITY 2: Legacy SortList / បញ្ចូលពិន្ទុ format (from original គ.ក.ប 2027.xlsm)
  if (extracted.length === 0) {
    const roles = [
      { name: 'ប្រធាន', code: 'a' },
      { name: 'អនុប្រធាន', code: 'b' },
      { name: 'លេខាធិការ', code: 'c' },
      { name: 'សមាជិកទី១', code: 'd' },
      { name: 'សមាជិកទី២', code: 'e' },
      { name: 'សមាជិកទី៣', code: 'f' }
    ];

    const sortSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('sort') || n.toLowerCase().includes('short'));
    const scoreSheetName = wb.SheetNames.find(n => n.includes('បញ្ចូលពិន្ទុ') || n.toLowerCase().includes('score'));
    const noticeSheetName = wb.SheetNames.find(n => n.includes('ជូនដំណឹង') || n.toLowerCase().includes('notice'));

    const sortSheet = sortSheetName ? wb.Sheets[sortSheetName] : null;
    const scoreSheet = scoreSheetName ? wb.Sheets[scoreSheetName] : null;
    const noticeSheet = noticeSheetName ? wb.Sheets[noticeSheetName] : null;

    if (sortSheet) {
      const sortRows = XLSX.utils.sheet_to_json(sortSheet, { header: 1, raw: false });
      const scoreRows = scoreSheet ? XLSX.utils.sheet_to_json(scoreSheet, { header: 1, raw: false }) : [];
      const noticeRows = noticeSheet ? XLSX.utils.sheet_to_json(noticeSheet, { header: 1, raw: false }) : [];

      roles.forEach(role => {
        for (let ord = 1; ord <= 3; ord++) {
          const slotCode = `${role.code}${ord}`;

          let candName = '', gender = 'ប', dob = '', phone = '', degree = '', scoreDegree = 0, exp = '', scoreExp = 0, scoreInterview = '';

          // Search SortList
          for (let r = 0; r < sortRows.length; r++) {
            const row = sortRows[r];
            if (!row) continue;
            if (row[0] === slotCode || (row[1] === role.code && String(row[2]) === String(ord))) {
              candName = (row[4] || row[3] || '').trim();
              gender = (row[5] || 'ប').trim();
              dob = formatExcelDate(row[6]);
              degree = (row[7] || '').trim();
              scoreDegree = parseFloat(row[8]) || 0;
              exp = (row[9] || '').trim();
              scoreExp = parseFloat(row[10]) || 0;
              phone = (row[12] || '').trim();
              break;
            }
          }

          // Search ជូនដំណឹង for phone
          if (!phone) {
            for (let r = 0; r < noticeRows.length; r++) {
              const row = noticeRows[r];
              if (!row) continue;
              if (row[0] === slotCode && row[5]) {
                phone = String(row[5]).trim();
                break;
              }
            }
          }

          // Search បញ្ចូលពិន្ទុ for interview score
          for (let r = 0; r < scoreRows.length; r++) {
            const row = scoreRows[r];
            if (!row) continue;
            if (row[0] === slotCode) {
              scoreInterview = (row[6] !== undefined ? String(row[6]) : '').trim();
              break;
            }
          }

          if (candName) {
            extracted.push({
              slotCode,
              role: role.name,
              roleCode: role.code,
              orderInRole: ord,
              name: candName,
              gender: gender === 'ស' ? 'ស' : 'ប',
              dob: dob,
              phone: phone,
              degree: degree,
              scoreDegree: scoreDegree,
              experience: exp,
              scoreExp: scoreExp,
              scoreInterview: scoreInterview
            });
          }
        }
      });
    }
  }

  // PRIORITY 3: Generic fallback scanning for header columns
  if (extracted.length === 0 && wb.SheetNames.length > 0) {
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false });
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(15, rows.length); i++) {
      const r = rows[i] || [];
      if (r.some(c => typeof c === 'string' && (c.includes('ឈ្មោះ') || c.includes('គោត្តនាម')))) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx !== -1) {
      const header = rows[headerRowIdx];
      const nameCol = header.findIndex(c => String(c).includes('ឈ្មោះ') || String(c).includes('គោត្តនាម'));
      const genderCol = header.findIndex(c => String(c).includes('ភេទ'));
      const dobCol = header.findIndex(c => String(c).includes('កំណើត'));
      const phoneCol = header.findIndex(c => String(c).includes('ទូរសព្ទ'));
      const roleCol = header.findIndex(c => String(c).includes('មុខតំណែង'));
      const slotCol = header.findIndex(c => String(c).includes('កូដ'));
      const degreeCol = header.findIndex(c => String(c).includes('សញ្ញាបត្រ'));
      const expCol = header.findIndex(c => String(c).includes('ពិសោធន៍'));
      const interviewCol = header.findIndex(c => String(c).includes('សម្ភាសន៍'));

      let currentRole = 'ប្រធាន';
      let currentOrder = 1;

      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        const name = (row[nameCol] || '').trim();
        if (!name) continue;

        let role = (roleCol !== -1 && row[roleCol]) ? String(row[roleCol]).trim() : currentRole;
        let slot = (slotCol !== -1 && row[slotCol]) ? String(row[slotCol]).trim() : '';

        extracted.push({
          slotCode: slot || `a${currentOrder}`,
          role: role,
          roleCode: ROLE_CODES[role] || 'a',
          orderInRole: currentOrder,
          name: name,
          gender: (genderCol !== -1 && row[genderCol]) ? String(row[genderCol]).trim() : 'ប',
          dob: (dobCol !== -1) ? formatExcelDate(row[dobCol]) : '',
          phone: (phoneCol !== -1 && row[phoneCol]) ? String(row[phoneCol]).trim() : '',
          degree: (degreeCol !== -1 && row[degreeCol]) ? String(row[degreeCol]).trim() : '',
          scoreDegree: (degreeCol !== -1 && row[degreeCol + 1]) ? parseFloat(row[degreeCol + 1]) || 0 : 0,
          experience: (expCol !== -1 && row[expCol]) ? String(row[expCol]).trim() : '',
          scoreExp: (expCol !== -1 && row[expCol + 1]) ? parseFloat(row[expCol + 1]) || 0 : 0,
          scoreInterview: (interviewCol !== -1 && row[interviewCol]) ? String(row[interviewCol]).trim() : ''
        });

        currentOrder++;
      }
    }
  }

  return extracted;
}

// 5. Confirm and Apply Excel Import to Current Station
async function confirmAndSaveExcelImport() {
  const stationId = document.getElementById('scoringStationSelect').value;
  if (!stationId) {
    alert('សូមជ្រើសរើសការិយាល័យបោះឆ្នោតជាមុនសិន!');
    return;
  }

  if (!pendingImportCandidates || pendingImportCandidates.length === 0) {
    alert('គ្មានទិន្នន័យសម្រាប់បញ្ចូលឡើយ!');
    return;
  }

  const btnConfirm = document.getElementById('btnConfirmExcelImport');
  btnConfirm.disabled = true;
  btnConfirm.textContent = 'កំពុងរក្សាទុក...';

  try {
    for (const item of pendingImportCandidates) {
      const payload = {
        pollingStationId: stationId,
        role: item.role,
        roleCode: item.roleCode,
        orderInRole: item.orderInRole,
        name: item.name,
        gender: item.gender,
        dob: item.dob,
        phone: item.phone,
        degree: item.degree,
        scoreDegree: item.scoreDegree,
        experience: item.experience,
        scoreExp: item.scoreExp,
        scoreInterview: item.scoreInterview
      };

      await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    closeModal('modalExcelImport');
    alert(`🎉 ជោគជ័យ! បាន Import បេក្ខជនចំនួន ${pendingImportCandidates.length} នាក់ និងរក្សាទុកក្នុងប្រព័ន្ធរួចរាល់!`);
    await renderScoringTableForActiveStation();
    await checkCloudStatus();
  } catch (err) {
    console.error('Error importing candidates:', err);
    alert('កំហុសក្នុងការរក្សាទុកទិន្នន័យ ៖ ' + err.message);
  } finally {
    btnConfirm.disabled = false;
    btnConfirm.textContent = '✅ យល់ព្រមបញ្ចូលទិន្នន័យ (Import Now)';
  }
}

// ==============================================================================
// TAB 4: OFFICIAL REPORTS & PRINT (The 5 Excel sheets matching layout 100%)
// ==============================================================================

function initReportSelectorBar() {
  const distSelect = document.getElementById('reportDistrictFilter');
  const comSelect = document.getElementById('reportCommuneFilter');
  const codeInput = document.getElementById('reportCodeInput');
  const codeSelect = document.getElementById('reportCodeSelect');
  const codeDatalist = document.getElementById('reportCodeDatalist');
  const locSelect = document.getElementById('reportLocationSelect');

  if (!distSelect || !comSelect) return;

  // 1. Populate Districts
  const rawDistNames = allDistricts.length 
    ? allDistricts.map(d => d.name) 
    : [...new Set(allPollingStations.map(p => p.district))].filter(Boolean);

  const distNames = [...new Set(rawDistNames.map(n => String(n).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '')))];

  distSelect.innerHTML = '<option value="">-- ជ្រើសរើសក្រុង/ស្រុក --</option>';
  distNames.forEach(name => {
    const label = getDistrictPrefix(name);
    distSelect.innerHTML += `<option value="${name}">${label}</option>`;
  });

  // Handle role restrictions for Trainer / Commune
  if (currentUser) {
    if (currentUser.role === 'Trainer' && currentUser.district && currentUser.district !== 'all') {
      const cleanUserDist = String(currentUser.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      distSelect.value = cleanUserDist;
      distSelect.disabled = true;
    } else if (currentUser.role === 'Commune' && currentUser.district && currentUser.district !== 'all') {
      const cleanUserDist = String(currentUser.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      distSelect.value = cleanUserDist;
      distSelect.disabled = true;
    }
  }

  // Populate datalist with ALL station codes in province
  if (codeDatalist) {
    codeDatalist.innerHTML = '';
    allPollingStations.forEach(ps => {
      const c4 = String(ps.code || '').padStart(4, '0');
      const opt = document.createElement('option');
      opt.value = c4;
      opt.label = `${ps.name} - ${ps.location || ''} (${getCommunePrefix(ps.communeName, ps.district)})`;
      codeDatalist.appendChild(opt);
    });
  }

  // Event Listeners for Filters
  distSelect.onchange = () => {
    updateReportCommunes(true);
  };

  comSelect.onchange = () => {
    updateReportStationsForCommune(true);
  };

  if (codeSelect) {
    codeSelect.onchange = () => {
      const stId = codeSelect.value;
      if (stId) setReportStationById(stId, 'codeSelect');
    };
  }

  if (locSelect) {
    locSelect.onchange = () => {
      const stId = locSelect.value;
      if (stId) setReportStationById(stId, 'locSelect');
    };
  }

  const handleReportCodeTyping = () => {
    const rawVal = (codeInput.value || '').trim();
    if (!rawVal) return;
    const num = parseInt(rawVal, 10);
    if (isNaN(num)) return;
    const c4 = String(num).padStart(4, '0');

    // 1. Try matching within current commune
    const curComCode = comSelect.value;
    const comStations = allPollingStations.filter(p => String(p.communeCode).padStart(3, '0') === String(curComCode).padStart(3, '0'));
    let matched = comStations.find(p => String(p.code).padStart(4, '0') === c4 || String(p.displayCode).padStart(4, '0') === c4 || parseInt(p.code, 10) === num);

    // 2. If not found in current commune, search whole province
    if (!matched) {
      matched = allPollingStations.find(p => String(p.code).padStart(4, '0') === c4 || String(p.displayCode).padStart(4, '0') === c4 || parseInt(p.code, 10) === num);
      if (matched) {
        if (currentUser && currentUser.role === 'Commune' && String(matched.communeCode).padStart(3, '0') !== String(currentUser.communeCode).padStart(3, '0')) {
          alert(`ការិយាល័យកូដ ${c4} ស្ថិតនៅ${getCommunePrefix(matched.communeName, matched.district)}! គណនីរបស់អ្នកមានសិទ្ធិតែក្នុង${getCommunePrefix(currentUser.communeName, currentUser.district)} ប៉ុណ្ណោះ។`);
          return;
        }
        if (currentUser && currentUser.role === 'Trainer' && matched.district !== currentUser.district) {
          alert(`ការិយាល័យកូដ ${c4} ស្ថិតនៅ${getDistrictPrefix(matched.district)}!`);
          return;
        }
        const cleanMatchedDist = String(matched.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
        distSelect.value = cleanMatchedDist;
        updateReportCommunes(false, matched.communeCode);
      }
    }

    if (matched) {
      setReportStationById(matched.id, 'codeInput');
    } else {
      alert(`រកមិនឃើញការិយាល័យបោះឆ្នោតដែលមានលេខកូដ ${rawVal} ឡើយ!`);
    }
  };

  if (codeInput) {
    codeInput.onchange = handleReportCodeTyping;
    codeInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleReportCodeTyping();
      }
    };
  }

  // Setup 5 Sheet Tabs clicks
  document.querySelectorAll('#reportTabsBar .excel-sheet-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('#reportTabsBar .excel-sheet-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const repType = tab.getAttribute('data-report');
      document.getElementById('reportTypeSelect').value = repType;
      
      const titleEl = document.getElementById('activeReportSheetTitle');
      if (titleEl) {
        const titles = {
          'sortlist': '📋 សន្លឹក ១ ៖ តារាងសម្រាំងបេក្ខជនសម្រាប់ការសម្ភាសន៍ (SortList)',
          'notice': '📢 សន្លឹក ២ ៖ សេចក្តីជូនដំណឹងបេក្ខជនសម្ភាសន៍ (Notice)',
          'attendance': '✍️ សន្លឹក ៣ ៖ បញ្ជីវត្តមានសម្ភាសន៍ជ្រើសរើស គ.ក.ប (Attendance)',
          'scoresheet': '📝 សន្លឹក ៤ ៖ តារាងស្រង់ពិន្ទុនៃការជ្រើសរើស គ.ក.ប (Score Sheet)',
          'results': '🏆 សន្លឹក ៥ ៖ លទ្ធផលនៃការសម្ភាសន៍ជ្រើសរើស គ.ក.ប តាមលំដាប់ពិន្ទុ (Ranked Results)'
        };
        titleEl.textContent = titles[repType] || '';
      }

      renderReportPreview();
    };
  });

  // Setup toggle hide empty rows
  const btnToggleEmpty = document.getElementById('btnToggleEmptyRows');
  if (btnToggleEmpty) {
    btnToggleEmpty.onclick = () => {
      const container = document.getElementById('printContainer');
      const isHidden = container.classList.toggle('hide-empty-rows');
      const label = document.getElementById('toggleEmptyRowsText');
      if (label) {
        label.textContent = isHidden ? 'បង្ហាញគ្រប់ជួរដេក' : 'លាក់ជួរដេកទទេ';
      }
    };
  }

  // Setup Export Excel for Current Report
  const btnExportReportExcel = document.getElementById('btnExportCurrentReportExcel');
  if (btnExportReportExcel) {
    btnExportReportExcel.onclick = exportCurrentReportToExcel;
  }

  // If no district selected, select first
  if (!distSelect.value && distNames.length) {
    const firstClean = String(distNames[0]).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
    distSelect.value = firstClean;
  }

  updateReportCommunes(true);
}

function updateReportCommunes(autoSelectFirst = true, targetCommuneCode = null) {
  const distSelect = document.getElementById('reportDistrictFilter');
  const comSelect = document.getElementById('reportCommuneFilter');
  const distLabel = document.getElementById('reportDistrictLabel');
  const comLabel = document.getElementById('reportCommuneLabel');
  if (!distSelect || !comSelect) return;

  const selDist = distSelect.value;
  const isKrong = selDist === 'ដូនកែវ';

  if (distLabel) {
    distLabel.innerHTML = isKrong ? '🏛️ ក្រុង (City / District)' : '🏛️ ស្រុក (District)';
  }
  if (comLabel) {
    comLabel.innerHTML = isKrong ? '🏘️ សង្កាត់ (Sangkat / Commune)' : '🏘️ ឃុំ (Commune)';
  }

  comSelect.innerHTML = '';

  const matchedStations = allPollingStations.filter(p => {
    const cleanDist = String(p.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
    return cleanDist === selDist;
  });

  const communeMap = new Map();
  matchedStations.forEach(p => {
    const code = String(p.communeCode || '').padStart(3, '0');
    if (!communeMap.has(code)) {
      communeMap.set(code, {
        code: code,
        name: p.communeName,
        district: p.district
      });
    }
  });

  let distCommunes = Array.from(communeMap.values());
  if (!distCommunes.length) {
    distCommunes = allCommunes.filter(c => {
      const cleanDist = String(c.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      return cleanDist === selDist;
    });
  }

  distCommunes.sort((a, b) => parseInt(a.code, 10) - parseInt(b.code, 10));

  if (!distCommunes.length) {
    comSelect.innerHTML = '<option value="">-- គ្មានឃុំ/សង្កាត់ --</option>';
    updateReportStationsForCommune(false);
    return;
  }

  distCommunes.forEach(c => {
    const prefix = getCommunePrefix(c.name, c.district);
    comSelect.innerHTML += `<option value="${c.code}">${prefix} (${c.code})</option>`;
  });

  if (currentUser && currentUser.role === 'Commune' && currentUser.communeCode) {
    const cleanCode = String(currentUser.communeCode).padStart(3, '0');
    comSelect.value = cleanCode;
    comSelect.disabled = true;
  } else if (targetCommuneCode) {
    comSelect.value = String(targetCommuneCode).padStart(3, '0');
  } else if (autoSelectFirst && distCommunes.length) {
    comSelect.value = distCommunes[0].code;
  }

  updateReportStationsForCommune(autoSelectFirst);
}

function updateReportStationsForCommune(autoSelectFirst = true, targetStationId = null) {
  const comSelect = document.getElementById('reportCommuneFilter');
  const codeSelect = document.getElementById('reportCodeSelect');
  const codeInput = document.getElementById('reportCodeInput');
  const locSelect = document.getElementById('reportLocationSelect');
  const hiddenStation = document.getElementById('reportStationSelect');

  if (!comSelect || !codeSelect || !locSelect) return;

  const selCommuneCode = comSelect.value;
  codeSelect.innerHTML = '';
  locSelect.innerHTML = '';

  const stations = allPollingStations.filter(p => {
    return String(p.communeCode).padStart(3, '0') === String(selCommuneCode).padStart(3, '0');
  });

  stations.sort((a, b) => {
    const ca = parseInt(a.code, 10) || 0;
    const cb = parseInt(b.code, 10) || 0;
    return ca - cb;
  });

  if (!stations.length) {
    codeSelect.innerHTML = '<option value="">-- គ្មាន --</option>';
    locSelect.innerHTML = '<option value="">-- គ្មានការិយាល័យក្នុងទីតាំងនេះ --</option>';
    if (codeInput) codeInput.value = '';
    if (hiddenStation) hiddenStation.value = '';
    renderReportPreview();
    return;
  }

  stations.forEach(ps => {
    const c4 = String(ps.code || '').padStart(4, '0');
    codeSelect.innerHTML += `<option value="${ps.id}">${c4}</option>`;
    const locText = ps.location ? ` - ${ps.location}` : '';
    locSelect.innerHTML += `<option value="${ps.id}">${ps.name} [${c4}]${locText}</option>`;
  });

  let selectedStation = null;
  if (targetStationId) {
    selectedStation = stations.find(p => p.id === targetStationId);
  }
  if (!selectedStation && autoSelectFirst) {
    selectedStation = stations[0];
  }

  if (selectedStation) {
    setReportStationById(selectedStation.id, 'init');
  }
}

function setReportStationById(stationId, source = '') {
  const ps = allPollingStations.find(p => p.id === stationId);
  if (!ps) return;

  const distSelect = document.getElementById('reportDistrictFilter');
  const comSelect = document.getElementById('reportCommuneFilter');
  const codeInput = document.getElementById('reportCodeInput');
  const codeSelect = document.getElementById('reportCodeSelect');
  const locSelect = document.getElementById('reportLocationSelect');
  const hiddenStation = document.getElementById('reportStationSelect');
  const infoSpan = document.getElementById('reportActiveStationInfo');

  const c4 = String(ps.code || '').padStart(4, '0');
  const cleanDist = String(ps.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');

  if (distSelect && distSelect.value !== cleanDist) {
    distSelect.value = cleanDist;
  }
  const comCode3 = String(ps.communeCode).padStart(3, '0');
  if (comSelect && comSelect.value !== comCode3) {
    comSelect.value = comCode3;
  }
  if (source !== 'codeInput' && codeInput) {
    codeInput.value = c4;
  }
  if (source !== 'codeSelect' && codeSelect) {
    codeSelect.value = ps.id;
  }
  if (source !== 'locSelect' && locSelect) {
    locSelect.value = ps.id;
  }
  if (hiddenStation) {
    hiddenStation.value = ps.id;
  }

  if (infoSpan) {
    const distPrefix = getDistrictPrefix(ps.district);
    const comPrefix = getCommunePrefix(ps.communeName, ps.district);
    infoSpan.textContent = `📍 ${distPrefix} | ${comPrefix} | ${ps.name} [កូដ: ${c4}] | ទីតាំង: ${ps.location || 'គ្មាន'}`;
  }

  renderReportPreview();
}

function syncScoringStationToReports() {
  const scoringStationId = document.getElementById('scoringStationSelect') ? document.getElementById('scoringStationSelect').value : null;
  if (scoringStationId) {
    const ps = allPollingStations.find(p => p.id === scoringStationId);
    if (ps) {
      const cleanDist = String(ps.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      const distSelect = document.getElementById('reportDistrictFilter');
      if (distSelect) distSelect.value = cleanDist;
      updateReportCommunes(false, ps.communeCode);
      updateReportStationsForCommune(false, ps.id);
    }
  }
}

// ==============================================================================
// TAB 4: REPORT HEADER HELPERS & LOGO CONTROLS (Box 1, Box 2, Box 3 & Logo)
// ==============================================================================

function getReportLogoConfig() {
  let cfg = { size: 72, x: 0, y: 0 };
  try {
    const saved = localStorage.getItem('report_logo_config');
    if (saved) cfg = Object.assign(cfg, JSON.parse(saved));
  } catch (e) {}
  return cfg;
}

function saveReportLogoConfig(cfg) {
  try {
    localStorage.setItem('report_logo_config', JSON.stringify(cfg));
  } catch (e) {}
}

function buildReportLetterheadHtml(ps) {
  const psCodeFormatted = String(ps.code || '').padStart(4, '0');
  const psCodeKhmer = toKhmerNum(psCodeFormatted);
  const communePrefix = getCommunePrefix(ps.communeName, ps.district);
  const communeCodeKhmer = toKhmerNum(String(ps.communeCode || '').padStart(3, '0'));
  const provinceTitle = ps.province || 'គណៈកម្មការរៀបចំការបោះឆ្នោត ខេត្តតាកែវ';
  const committeeTitle = ps.committeeName || 'គណៈកម្មការសម្ភាសន៍ជ្រើសរើស គ.ក.ប';
  const logoCfg = getReportLogoConfig();
  const currentLogoUrl = appSettings.logoUrl || 'img/nec_logo.jpg';

  return `
    <div class="letterhead" style="width: 100%; margin-bottom: 12px;">
      <table style="width: 100%; border: none !important; border-collapse: collapse;">
        <tr>
          <!-- Column 1 (35%): Logo on Top, Box 1 (Left Institution Header) Situated Underneath Logo, Left-Aligned -->
          <td style="width: 35%; border: none !important; vertical-align: top; padding: 0; text-align: left;">
            <div style="display: flex; flex-direction: column; align-items: flex-start; text-align: left; width: 100%;">
              <!-- Logo Container with Toolbar -->
              <div class="report-logo-wrapper" style="display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 6px;">
                <div id="reportLogoContainer" style="display: inline-block; transform: translate(${logoCfg.x}px, ${logoCfg.y}px); cursor: grab;" title="ចុចដើម្បីប្តូរ Logo ឬអូសរំកិលទីតាំង">
                  <img id="reportLogoImg" src="${currentLogoUrl}" alt="NEC Logo" style="width: ${logoCfg.size}px; height: ${logoCfg.size}px; object-fit: contain; border-radius: 50%; display: block;">
                  <input type="file" id="reportLogoFileInput" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" style="display: none;">
                </div>
                <!-- Interactive Controls (Hidden in Print) -->
                <div class="report-logo-toolbar no-print" style="margin-top: 5px; display: flex; align-items: center; gap: 4px; font-size: 11px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 2px 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.08); width: fit-content;">
                  <button type="button" id="btnUploadReportLogo" class="btn btn-secondary btn-xs" style="padding: 1px 5px; font-size: 10px; border-radius: 4px;" title="បញ្ចូល Logo ថ្មី">📷 ប្តូរ</button>
                  <span style="color: #cbd5e1;">|</span>
                  <span title="ពង្រីក/បង្រួម Logo">🔍</span>
                  <input type="range" id="reportLogoSizeSlider" min="40" max="130" value="${logoCfg.size}" style="width: 50px; height: 12px; cursor: pointer;" title="ទំហំ Logo: ${logoCfg.size}px">
                  <span style="color: #cbd5e1;">|</span>
                  <span title="រំកិល ឆ្វេង-ស្តាំ">↔️</span>
                  <input type="range" id="reportLogoXSlider" min="-80" max="80" value="${logoCfg.x}" style="width: 40px; height: 12px; cursor: pointer;" title="រំកិល ឆ្វេង/ស្តាំ">
                  <span title="រំកិល លើ-ក្រោម">↕️</span>
                  <input type="range" id="reportLogoYSlider" min="-40" max="60" value="${logoCfg.y}" style="width: 40px; height: 12px; cursor: pointer;" title="រំកិល លើ/ក្រោម">
                  <button type="button" id="btnResetReportLogo" class="btn btn-secondary btn-xs" style="padding: 0 4px; font-size: 10px; border-radius: 3px;" title="កំណត់ឡើងវិញ (Reset)">↺</button>
                </div>
              </div>
              <!-- Box 1 (Left Institution Header): Left-aligned, Font Khmer OS Muol Light, Size: 10pt -->
              <div class="report-inst-header-box" contenteditable="true" spellcheck="false" title="ប្រអប់ទី១ ៖ អាចកែសម្រួលអត្ថបទបាន">
                <div>គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត</div>
                <div>គណៈកម្មការរៀបចំការបោះឆ្នោត ខេត្តតាកែវ</div>
                <div>${committeeTitle}</div>
                <div>${communePrefix}(${communeCodeKhmer})</div>
              </div>
            </div>
          </td>
          <!-- Column 2 (30%): Box 2 (Kingdom Header: Khmer OS Muol Light Size 12pt, Tacteing Single Symbol - Centered on A4 Paper) -->
          <td style="width: 30%; border: none !important; vertical-align: top; text-align: center; padding: 0;">
            <div class="report-kingdom-header-box" style="padding-top: 6px; white-space: nowrap;">
              <div class="report-kingdom-title">ព្រះរាជាណាចក្រកម្ពុជា</div>
              <div class="report-kingdom-title">ជាតិ  សាសនា  ព្រះមហាក្សត្រ</div>
              <div class="report-tacteing-emblem" contenteditable="true" spellcheck="false" title="និមិត្តសញ្ញា Font Tacteing (Size: 18pt) - អាចកែសម្រួលបាន">5</div>
            </div>
          </td>
          <!-- Column 3 (35%): Right Spacer to balance Box 2 in the exact center of A4 paper -->
          <td style="width: 35%; border: none !important; vertical-align: top; padding: 0;"></td>
        </tr>
      </table>
    </div>
  `;
}

function buildReportTitleBoxHtml(ps, titleText, customSubHtml) {
  const psCodeFormatted = String(ps.code || '').padStart(4, '0');
  const psCodeKhmer = toKhmerNum(psCodeFormatted);
  const mandateText = appSettings.mandateTitle || 'សម្រាប់ការបោះឆ្នោតជ្រើសរើសក្រុមប្រឹក្សាឃុំ សង្កាត់ អណត្តិទី៧ ឆ្នាំ២០២៧';

  const subHtml = customSubHtml || `<div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; color: #000; text-align: center;">${mandateText}</div>`;

  return `
    <div class="report-title-section report-title-box" contenteditable="true" spellcheck="false" style="text-align: center; margin: 10px 0 12px 0;" title="ប្រអប់ទី៣ ៖ ចំណងជើងអាចកែសម្រួលបាន">
      <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; color: #000; margin-bottom: 4px; text-align: center;">${titleText}</div>
      ${subHtml}
      <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; margin-top: 6px; color: #000; text-align: center;">លេខកូដការិយាល័យ ៖ ${psCodeKhmer}</div>
    </div>
  `;
}

function setupReportLogoInteractions() {
  const logoContainer = document.getElementById('reportLogoContainer');
  const logoImg = document.getElementById('reportLogoImg');
  const fileInput = document.getElementById('reportLogoFileInput');
  const btnUpload = document.getElementById('btnUploadReportLogo');
  const sizeSlider = document.getElementById('reportLogoSizeSlider');
  const xSlider = document.getElementById('reportLogoXSlider');
  const ySlider = document.getElementById('reportLogoYSlider');
  const btnReset = document.getElementById('btnResetReportLogo');

  if (!logoContainer || !logoImg) return;

  const cfg = getReportLogoConfig();

  const applyConfig = () => {
    logoImg.style.width = `${cfg.size}px`;
    logoImg.style.height = `${cfg.size}px`;
    logoContainer.style.transform = `translate(${cfg.x}px, ${cfg.y}px)`;
    if (sizeSlider) sizeSlider.value = cfg.size;
    if (xSlider) xSlider.value = cfg.x;
    if (ySlider) ySlider.value = cfg.y;
    saveReportLogoConfig(cfg);
  };

  if (btnUpload && fileInput) {
    btnUpload.onclick = (e) => {
      e.stopPropagation();
      fileInput.click();
    };
  }

  logoImg.onclick = () => {
    if (!logoContainer.dataset.wasDragged && fileInput) {
      fileInput.click();
    }
    delete logoContainer.dataset.wasDragged;
  };

  if (fileInput) {
    fileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        handleLogoUpload(file);
      }
    };
  }

  if (sizeSlider) {
    sizeSlider.oninput = (e) => {
      cfg.size = parseInt(e.target.value, 10) || 72;
      applyConfig();
    };
  }

  if (xSlider) {
    xSlider.oninput = (e) => {
      cfg.x = parseInt(e.target.value, 10) || 0;
      applyConfig();
    };
  }

  if (ySlider) {
    ySlider.oninput = (e) => {
      cfg.y = parseInt(e.target.value, 10) || 0;
      applyConfig();
    };
  }

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialCfgX = 0;
  let initialCfgY = 0;

  logoContainer.onmousedown = (e) => {
    if (e.target.tagName === 'INPUT') return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    initialCfgX = cfg.x;
    initialCfgY = cfg.y;
    logoContainer.style.cursor = 'grabbing';
    e.preventDefault();
  };

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      logoContainer.dataset.wasDragged = 'true';
    }
    cfg.x = Math.max(-60, Math.min(100, initialCfgX + dx));
    cfg.y = Math.max(-40, Math.min(80, initialCfgY + dy));
    applyConfig();
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      logoContainer.style.cursor = 'grab';
    }
  });

  if (btnReset) {
    btnReset.onclick = (e) => {
      e.stopPropagation();
      cfg.size = 72;
      cfg.x = 0;
      cfg.y = 0;
      applyConfig();
    };
  }
}

async function renderReportPreview() {
  const stationId = document.getElementById('reportStationSelect').value;
  const reportType = document.getElementById('reportTypeSelect').value;
  const container = document.getElementById('printContainer');

  if (!stationId) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">សូមជ្រើសរើសការិយាល័យបោះឆ្នោតដើម្បីពិនិត្យ និងបោះពុម្ពរបាយការណ៍</div>';
    return;
  }

  const ps = allPollingStations.find(p => p.id === stationId);
  if (!ps) return;

  const psCodeFormatted = String(ps.code || '').padStart(4, '0');
  const psCodeKhmer = toKhmerNum(psCodeFormatted);
  const communePrefix = getCommunePrefix(ps.communeName, ps.district);
  const communeCodeKhmer = toKhmerNum(String(ps.communeCode || '').padStart(3, '0'));
  const mandateText = appSettings.mandateTitle || 'សម្រាប់ការបោះឆ្នោតជ្រើសរើសក្រុមប្រឹក្សាឃុំ សង្កាត់ អណត្តិទី៧ ឆ្នាំ២០២៧';
  const provinceTitle = ps.province || 'គណៈកម្មការរៀបចំការបោះឆ្នោត ខេត្តតាកែវ';
  const committeeTitle = ps.committeeName || 'គណៈកម្មការសម្ភាសន៍ជ្រើសរើស គ.ក.ប';

  // Fetch candidates for this station
  let cList = [];
  try {
    const res = await fetch(`/api/candidates?pollingStationId=${stationId}`);
    const data = await res.json();
    cList = data.candidates || [];
  } catch (err) {
    console.error('Error fetching candidates for report:', err);
  }

  // Group candidates by role
  const roleGroups = {};
  ROLES_ORDER.forEach(r => roleGroups[r] = []);
  cList.forEach(c => {
    if (roleGroups[c.role]) roleGroups[c.role].push(c);
  });

  let reportContentHtml = '';

  // ----------------------------------------------------------------------------
  // SHEET 1: SortList (តារាងសម្រាំងបេក្ខជនសម្រាប់ការសម្ភាសន៍ជ្រើសរើស គ.ក.ប)
  // ----------------------------------------------------------------------------
  if (reportType === 'sortlist') {
    let rowsHtml = '';
    ROLES_ORDER.forEach(role => {
      rowsHtml += `
        <tr class="category-row">
          <td colspan="10" style="font-weight: 700; background: #fff; padding: 5px 8px; border: 1px solid #000;">
            - មុខតំណែង ៖ ${role}
          </td>
        </tr>
      `;
      const items = roleGroups[role] || [];
      for (let i = 1; i <= 3; i++) {
        const c = items.find(x => x.orderInRole === i);
        const isEmpty = !c || !c.name;
        const khmerIdx = toKhmerNum(i);
        const dobKhmer = c && c.dob ? toKhmerNum(c.dob) : '';
        const scoreDeg = c && c.scoreDegree !== undefined && c.scoreDegree !== '' ? c.scoreDegree : '';
        const scoreExp = c && c.scoreExp !== undefined && c.scoreExp !== '' ? c.scoreExp : '';
        const scoreTot = c && c.scoreShortlist !== undefined && c.scoreShortlist !== '' ? c.scoreShortlist : '';

        rowsHtml += `
          <tr class="${isEmpty ? 'empty-candidate-row' : ''}">
            <td class="center" style="width: 38px;">${khmerIdx}</td>
            <td style="font-weight: 600; min-width: 160px;">${c ? (c.name || '') : ''}</td>
            <td class="center" style="width: 42px;">${c ? (c.gender || '') : ''}</td>
            <td class="center" style="width: 105px;">${dobKhmer}</td>
            <td>${c ? (c.degree || '') : ''}</td>
            <td class="center" style="width: 40px;">${scoreDeg}</td>
            <td>${c ? (c.experience || '') : ''}</td>
            <td class="center" style="width: 40px;">${scoreExp}</td>
            <td class="center" style="font-weight: 700; width: 65px;">${scoreTot}</td>
            <td style="width: 70px;">${c ? (c.notes || '') : ''}</td>
          </tr>
        `;
      }
    });

    reportContentHtml = `
      <div class="print-paper-sheet">
        ${buildReportLetterheadHtml(ps)}
        ${buildReportTitleBoxHtml(ps, 'តារាងសម្រាំងបេក្ខជនសម្រាប់ការសម្ភាសន៍ជ្រើសរើស គ.ក.ប')}
        <table class="official-print-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 38px; vertical-align: middle;">ល.រ</th>
              <th rowspan="2" style="min-width: 160px; vertical-align: middle;">គោត្តនាម-នាម</th>
              <th rowspan="2" style="width: 42px; vertical-align: middle;">ភេទ</th>
              <th rowspan="2" style="width: 105px; vertical-align: middle;">ថ្ងៃ ខែ ឆ្នាំកំណើត</th>
              <th colspan="2" style="text-align: center;">កម្រិតសញ្ញាបត្រ</th>
              <th colspan="2" style="text-align: center;">បទពិសោធន៍</th>
              <th rowspan="2" style="width: 65px; vertical-align: middle;">សរុបពិន្ទុ</th>
              <th rowspan="2" style="width: 70px; vertical-align: middle;">ផ្សេងៗ</th>
            </tr>
            <tr>
              <th style="font-size: 8.5pt; font-weight: normal; text-align: left; padding: 4px 6px; line-height: 1.35; width: 220px;">
                -សញ្ញាបត្រទុតិយភូមិ ឬបទពិសោធន៍ស្រដៀងមុខតំណែង ចាប់ពី១ឆ្នាំឡើង ដល់២ឆ្នាំ/និង=៥ពិន្ទុ<br>
                -សញ្ញាបត្រខ្ពស់ជាង ឬបទពិសោធន៍ស្រដៀងមុខតំណែង ចាប់ពី២ឆ្នាំឡើង ឡើង =៨ពិន្ទុ
              </th>
              <th style="width: 40px; vertical-align: middle;">ពិន្ទុ</th>
              <th style="font-size: 8pt; font-weight: normal; text-align: left; padding: 4px 6px; line-height: 1.3; width: 240px;">
                - បទពិសោធន៍ស្របមុខតំណែង និងមានសញ្ញាបត្រ<br>
                - ១ឆ្នាំ/និង ដល់២ឆ្នាំ/និង = ៤ពិន្ទុ, ៣ឆ្នាំ/និង ដល់៤ឆ្នាំ/និង= ៨ពិន្ទុ<br>
                ៥ឆ្នាំ/និងឡើង = ១២ពិន្ទុ<br>
                + បទពិសោធន៍ស្របមុខតំណែង និងគ្មានសញ្ញាបត្រ<br>
                - ២ឆ្នាំ/និង ដល់៣ឆ្នាំ/និង = ៤ពិន្ទុ, ៤ឆ្នាំ/និង ដល់៥ឆ្នាំ/និង= ៨ពិន្ទុ<br>
                ៦ឆ្នាំ/និងឡើង = ១២ពិន្ទុ<br>
                + សមាជិកទី១,សមាជិកទី២,សមាជិកទី៣<br>
                - ២ឆ្នាំ=៥ពិន្ទុ ,ចាប់ពី៣ឆ្នាំឡើង=១២ពិន្ទុ
              </th>
              <th style="width: 40px; vertical-align: middle;">ពិន្ទុ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        ${getOfficialSignatureBlock(ps)}
      </div>
    `;
  }

  // ----------------------------------------------------------------------------
  // SHEET 2: ជូនដំណឹង (សេចក្តីជូនដំណឹងបេក្ខជនសម្ភាសន៍)
  // ----------------------------------------------------------------------------
  else if (reportType === 'notice') {
    let rowsHtml = '';
    ROLES_ORDER.forEach(role => {
      rowsHtml += `
        <tr class="category-row">
          <td colspan="6" style="font-weight: 700; background: #fff; padding: 5px 8px; border: 1px solid #000;">
            - មុខតំណែង ៖ ${role}
          </td>
        </tr>
      `;
      const items = roleGroups[role] || [];
      for (let i = 1; i <= 3; i++) {
        const c = items.find(x => x.orderInRole === i);
        const isEmpty = !c || !c.name;
        const khmerIdx = toKhmerNum(i);
        const dobKhmer = c && c.dob ? toKhmerNum(c.dob) : '';

        rowsHtml += `
          <tr class="${isEmpty ? 'empty-candidate-row' : ''}">
            <td class="center" style="width: 45px;">${khmerIdx}</td>
            <td style="font-weight: 600; min-width: 180px;">${c ? (c.name || '') : ''}</td>
            <td class="center" style="width: 50px;">${c ? (c.gender || '') : ''}</td>
            <td class="center" style="width: 120px;">${dobKhmer}</td>
            <td class="center" style="width: 130px; font-weight: 600;">${c ? (c.phone || '') : ''}</td>
            <td style="width: 90px;">${c ? (c.notes || '') : ''}</td>
          </tr>
        `;
      }
    });

    const interviewPlace = ps.interviewPlace || `សាលា${communePrefix}`;
    const interviewDate = ps.interviewDate || '០៩ ខែកក្កដា ឆ្នាំ២០២៧';
    const interviewTime = ps.interviewTime || '០៧:០០ ព្រឹក';

    const noticeSubHtml = `
      <div style="font-size: 11pt; line-height: 1.75; color: #000; font-family: var(--font-body) !important; text-align: center;">
        បេក្ខជនដែលបានដាក់ពាក្យសុំចូលបម្រើការងារជាមន្ត្រី គ.ក.ប ដូចមានរាយនាមខាងក្រោម ត្រូវមកធ្វើសម្ភាសន៍<br>
        នៅ<strong>${interviewPlace}</strong> នាថ្ងៃទី<strong>${interviewDate}</strong> វេលាម៉ោង <strong>${interviewTime}</strong> តទៅ។
      </div>
    `;

    reportContentHtml = `
      <div class="print-paper-sheet">
        ${buildReportLetterheadHtml(ps)}
        ${buildReportTitleBoxHtml(ps, 'សេចក្ដីជូនដំណឹង', noticeSubHtml)}
        <table class="official-print-table">
          <thead>
            <tr>
              <th style="width: 45px;">ល.រ</th>
              <th style="min-width: 180px;">គោត្តនាម-នាម</th>
              <th style="width: 50px;">ភេទ</th>
              <th style="width: 120px;">ថ្ងៃ ខែ ឆ្នាំកំណើត</th>
              <th style="width: 130px;">លេខទូរសព្ទ</th>
              <th style="width: 90px;">ផ្សេងៗ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        ${getOfficialSignatureBlock(ps)}
      </div>
    `;
  }

  // ----------------------------------------------------------------------------
  // SHEET 3: បញ្ជីវត្តមាន (បញ្ជីវត្តមានសម្ភាសន៍)
  // ----------------------------------------------------------------------------
  else if (reportType === 'attendance') {
    let rowsHtml = '';
    ROLES_ORDER.forEach(role => {
      rowsHtml += `
        <tr class="category-row">
          <td colspan="7" style="font-weight: 700; background: #fff; padding: 5px 8px; border: 1px solid #000;">
            - មុខតំណែង ៖ ${role}
          </td>
        </tr>
      `;
      const items = roleGroups[role] || [];
      for (let i = 1; i <= 3; i++) {
        const c = items.find(x => x.orderInRole === i);
        const isEmpty = !c || !c.name;
        const khmerIdx = toKhmerNum(i);
        const dobKhmer = c && c.dob ? toKhmerNum(c.dob) : '';

        rowsHtml += `
          <tr class="${isEmpty ? 'empty-candidate-row' : ''}" style="height: 36px;">
            <td class="center" style="width: 45px;">${khmerIdx}</td>
            <td style="font-weight: 600; min-width: 180px;">${c ? (c.name || '') : ''}</td>
            <td class="center" style="width: 50px;">${c ? (c.gender || '') : ''}</td>
            <td class="center" style="width: 120px;">${dobKhmer}</td>
            <td style="width: 130px;"></td>
            <td style="width: 130px;"></td>
            <td style="width: 90px;">${c ? (c.notes || '') : ''}</td>
          </tr>
        `;
      }
    });

    reportContentHtml = `
      <div class="print-paper-sheet">
        ${buildReportLetterheadHtml(ps)}
        ${buildReportTitleBoxHtml(ps, 'បញ្ជីវត្តមានសម្ភាសន៍ ជ្រើសរើស គ.ក.ប')}
        <table class="official-print-table">
          <thead>
            <tr>
              <th style="width: 45px;">ល.រ</th>
              <th style="min-width: 180px;">គោត្តនាម-នាម</th>
              <th style="width: 50px;">ភេទ</th>
              <th style="width: 120px;">ថ្ងៃ ខែ ឆ្នាំកំណើត</th>
              <th style="width: 130px;">ហត្ថលេខាចូល</th>
              <th style="width: 130px;">ហត្ថលេខាចេញ</th>
              <th style="width: 90px;">ផ្សេងៗ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        ${getOfficialSignatureBlock(ps)}
      </div>
    `;
  }

  // ----------------------------------------------------------------------------
  // SHEET 4: បញ្ចូលពិន្ទុ (តារាងស្រង់ពិន្ទុនៃការជ្រើសរើស គ.ក.ប)
  // ----------------------------------------------------------------------------
  else if (reportType === 'scoresheet') {
    let rowsHtml = '';
    ROLES_ORDER.forEach(role => {
      rowsHtml += `
        <tr class="category-row">
          <td colspan="8" style="font-weight: 700; background: #fff; padding: 5px 8px; border: 1px solid #000;">
            - មុខតំណែង ៖ ${role}
          </td>
        </tr>
      `;
      const items = roleGroups[role] || [];
      for (let i = 1; i <= 3; i++) {
        const c = items.find(x => x.orderInRole === i);
        const isEmpty = !c || !c.name;
        const khmerIdx = toKhmerNum(i);
        const dobKhmer = c && c.dob ? toKhmerNum(c.dob) : '';
        const isAbsent = c && (c.scoreInterview === 'អវត្តមាន' || c.scoreTotal === 'អវត្តមាន');

        let scoreShortlistHtml = '';
        let scoreInterviewHtml = '';
        let scoreTotalHtml = '';

        if (c && c.name) {
          if (isAbsent) {
            scoreShortlistHtml = `<td class="center" style="width: 95px; font-weight: 600;">${c.scoreShortlist !== undefined && c.scoreShortlist !== '' ? Number(c.scoreShortlist).toFixed(2) : '0.00'}</td>`;
            scoreInterviewHtml = `<td class="center official-absent-cell" style="width: 110px;">អវត្តមាន</td>`;
            scoreTotalHtml = `<td class="center official-absent-cell" style="width: 95px;">អវត្តមាន</td>`;
          } else {
            const sShort = c.scoreShortlist !== undefined && c.scoreShortlist !== '' ? Number(c.scoreShortlist).toFixed(2) : '';
            const sInt = c.scoreInterview !== undefined && c.scoreInterview !== '' ? Number(c.scoreInterview).toFixed(2) : '';
            const sTot = c.scoreTotal !== undefined && c.scoreTotal !== '' ? Number(c.scoreTotal).toFixed(2) : '';
            scoreShortlistHtml = `<td class="center" style="width: 95px; font-weight: 600;">${sShort}</td>`;
            scoreInterviewHtml = `<td class="center" style="width: 110px; font-weight: 600;">${sInt}</td>`;
            scoreTotalHtml = `<td class="center" style="width: 95px; font-weight: 700;">${sTot}</td>`;
          }
        } else {
          scoreShortlistHtml = `<td class="center" style="width: 95px;"></td>`;
          scoreInterviewHtml = `<td class="center" style="width: 110px;"></td>`;
          scoreTotalHtml = `<td class="center" style="width: 95px;"></td>`;
        }

        rowsHtml += `
          <tr class="${isEmpty ? 'empty-candidate-row' : ''} ${isAbsent ? 'absent-row' : ''}">
            <td class="center" style="width: 45px;">${khmerIdx}</td>
            <td style="font-weight: 600; min-width: 180px;">${c ? (c.name || '') : ''}</td>
            <td class="center" style="width: 50px;">${c ? (c.gender || '') : ''}</td>
            <td class="center" style="width: 120px;">${dobKhmer}</td>
            ${scoreShortlistHtml}
            ${scoreInterviewHtml}
            ${scoreTotalHtml}
            <td style="width: 90px;">${c ? (c.notes || '') : ''}</td>
          </tr>
        `;
      }
    });

    reportContentHtml = `
      <div class="print-paper-sheet">
        ${buildReportLetterheadHtml(ps)}
        ${buildReportTitleBoxHtml(ps, 'តារាងស្រង់ពិន្ទុនៃការជ្រើសរើស គ.ក.ប')}
        <table class="official-print-table">
          <thead>
            <tr>
              <th style="width: 45px;">ល.រ</th>
              <th style="min-width: 180px;">គោត្តនាម-នាម</th>
              <th style="width: 50px;">ភេទ</th>
              <th style="width: 120px;">ថ្ងៃ ខែ ឆ្នាំកំណើត</th>
              <th style="width: 95px;">ពិន្ទុសម្រាំង</th>
              <th style="width: 110px;">ពិន្ទុសម្ភាសន៍</th>
              <th style="width: 95px;">សរុបពិន្ទុ</th>
              <th style="width: 90px;">ផ្សេងៗ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        ${getOfficialSignatureBlock(ps)}
      </div>
    `;
  }

  // ----------------------------------------------------------------------------
  // SHEET 5: លទ្ធផលតាមលំដាប់ (Ranked official result notice for public posting)
  // ----------------------------------------------------------------------------
  else if (reportType === 'results') {
    let rowsHtml = '';
    ROLES_ORDER.forEach(role => {
      rowsHtml += `
        <tr class="category-row">
          <td colspan="7" style="font-weight: 700; background: #fff; padding: 5px 8px; border: 1px solid #000;">
            - មុខតំណែង ៖ ${role}
          </td>
        </tr>
      `;
      const items = roleGroups[role] || [];
      // Strictly sort by rank / score, absent candidates placed last
      const present = items.filter(c => c && c.name && c.scoreTotal !== 'អវត្តមាន' && c.scoreInterview !== 'អវត្តមាន');
      const absent = items.filter(c => c && c.name && (c.scoreTotal === 'អវត្តមាន' || c.scoreInterview === 'អវត្តមាន'));

      present.sort((a, b) => {
        if (a.rank && b.rank) return a.rank - b.rank;
        const at = parseFloat(a.scoreTotal) || 0;
        const bt = parseFloat(b.scoreTotal) || 0;
        return bt - at;
      });

      const sortedCandidates = [...present, ...absent];

      for (let i = 1; i <= 3; i++) {
        const c = sortedCandidates[i - 1];
        const isEmpty = !c || !c.name;
        const khmerIdx = toKhmerNum(i);
        const dobKhmer = c && c.dob ? toKhmerNum(c.dob) : '';
        const isAbsent = c && (c.scoreInterview === 'អវត្តមាន' || c.scoreTotal === 'អវត្តមាន');

        let scoreTotalHtml = '';
        let statusHtml = '';

        if (c && c.name) {
          if (isAbsent) {
            scoreTotalHtml = `<td class="center official-absent-cell" style="width: 95px;">អវត្តមាន</td>`;
            statusHtml = `<td class="center official-absent-cell" style="width: 110px;">អវត្តមាន</td>`;
          } else {
            const sTot = c.scoreTotal !== undefined && c.scoreTotal !== '' ? Number(c.scoreTotal).toFixed(2) : '';
            scoreTotalHtml = `<td class="center" style="width: 95px; font-weight: 700;">${sTot}</td>`;
            if (c.status === 'A-ជាប់') {
              statusHtml = `<td class="center" style="width: 110px; font-weight: 700; color: #15803d;">A-ជាប់</td>`;
            } else if (c.status === 'B-បម្រុង') {
              statusHtml = `<td class="center" style="width: 110px; font-weight: 700; color: #1e40af;">B-បម្រុង</td>`;
            } else if (c.status === 'C-បម្រុង') {
              statusHtml = `<td class="center" style="width: 110px; font-weight: 700; color: #6b21a8;">C-បម្រុង</td>`;
            } else {
              statusHtml = `<td class="center" style="width: 110px; font-weight: 600;">${c.status || ''}</td>`;
            }
          }
        } else {
          scoreTotalHtml = `<td class="center" style="width: 95px;"></td>`;
          statusHtml = `<td class="center" style="width: 110px;"></td>`;
        }

        rowsHtml += `
          <tr class="${isEmpty ? 'empty-candidate-row' : ''} ${isAbsent ? 'absent-row' : ''}">
            <td class="center" style="width: 45px;">${khmerIdx}</td>
            <td style="font-weight: 600; min-width: 180px;">${c ? (c.name || '') : ''}</td>
            <td class="center" style="width: 50px;">${c ? (c.gender || '') : ''}</td>
            <td class="center" style="width: 120px;">${dobKhmer}</td>
            ${scoreTotalHtml}
            ${statusHtml}
            <td style="width: 90px;">${c ? (c.notes || '') : ''}</td>
          </tr>
        `;
      }
    });

    reportContentHtml = `
      <div class="print-paper-sheet">
        ${buildReportLetterheadHtml(ps)}
        ${buildReportTitleBoxHtml(ps, 'លទ្ធផលនៃការសម្ភាសន៍ជ្រើសរើស គ.ក.ប')}
        <table class="official-print-table">
          <thead>
            <tr>
              <th style="width: 45px;">ល.រ</th>
              <th style="min-width: 180px;">គោត្តនាម-នាម</th>
              <th style="width: 50px;">ភេទ</th>
              <th style="width: 120px;">ថ្ងៃ ខែ ឆ្នាំកំណើត</th>
              <th style="width: 95px;">សរុបពិន្ទុ</th>
              <th style="width: 110px;">និទ្ទេស</th>
              <th style="width: 90px;">ផ្សេងៗ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        ${getOfficialSignatureBlock(ps)}
      </div>
    `;
  }

  container.innerHTML = reportContentHtml;
  setupReportLogoInteractions();
}

function getOfficialSignatureBlock(ps) {
  return `
    <div class="signature-section" style="margin-top: 25px; width: 100%; display: flex; justify-content: space-between; page-break-inside: avoid;">
      <div class="signature-box" style="text-align: center; width: 45%;">
        <div style="font-size: 11pt; margin-bottom: 6px; color: #000;">បានឃើញ និងឯកភាព</div>
        <div style="font-weight: 700; font-size: 11pt; margin-bottom: 65px; color: #000;">ប្រធានគណៈកម្មការរៀបចំការបោះឆ្នោតខេត្តតាកែវ</div>
      </div>
      <div class="signature-box" style="text-align: center; width: 45%;">
        <div style="font-size: 11pt; margin-bottom: 6px; color: #000;">ថ្ងៃទី....... ខែ....... ឆ្នាំ២០២៧</div>
        <div style="font-weight: 700; font-size: 11pt; margin-bottom: 65px; color: #000;">គណៈកម្មការសម្ភាសន៍ជ្រើសរើស គ.ក.ប</div>
      </div>
    </div>
  `;
}

function exportCurrentReportToExcel() {
  const table = document.querySelector('#printContainer table.official-print-table');
  if (!table) {
    alert('មិនទាន់មានទិន្នន័យតារាងសម្រាប់ Export ឡើយ!');
    return;
  }
  const stationId = document.getElementById('reportStationSelect').value;
  const ps = allPollingStations.find(p => p.id === stationId);
  const code4 = ps ? String(ps.code || '').padStart(4, '0') : '0000';
  const reportType = document.getElementById('reportTypeSelect').value;

  const sheetNamesMap = {
    'sortlist': 'SortList',
    'notice': 'ជូនដំណឹង',
    'attendance': 'បញ្ជីវត្តមាន',
    'scoresheet': 'បញ្ចូលពិន្ទុ',
    'results': 'លទ្ធផលតាមលំដាប់'
  };
  const sheetName = sheetNamesMap[reportType] || 'Report';

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table, { raw: true });
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `គ.ក.ប_2027_${sheetName}_កូដ_${code4}.xlsx`);
}

// ==============================================================================
// TAB 5: USER MANAGEMENT (Trainer Manages Communes within District)
// ==============================================================================

async function loadUsersList() {
  const title = document.getElementById('usersTabHeaderTitle');
  const scopeBadge = document.getElementById('userScopeNotice');
  const btnSubtabAdmins = document.getElementById('btnSubtabAdmins');
  const btnSubtabTrainers = document.getElementById('btnSubtabTrainers');
  const btnSubtabCommunes = document.getElementById('btnSubtabCommunes');
  const districtFilterGroup = document.getElementById('userDistrictFilterGroup');

  // Populate district dropdown once
  const filterDistSelect = document.getElementById('filterUserDistrict');
  if (filterDistSelect && filterDistSelect.options.length <= 1 && allDistricts.length) {
    allDistricts.forEach(d => {
      filterDistSelect.innerHTML += `<option value="${d.name}">${getDistrictPrefix(d.name)}</option>`;
    });
  }

  if (currentUser.role === 'Trainer') {
    title.textContent = `👥 គណនីឃុំ-សង្កាត់ក្នុង ${getDistrictPrefix(currentUser.district)} (ចំនួន ${allCommunes.length} ឃុំ)`;
    scopeBadge.textContent = `ដែនសមត្ថកិច្ច៖ ${getDistrictPrefix(currentUser.district)}`;
    if (btnSubtabAdmins) btnSubtabAdmins.style.display = 'none';
    if (btnSubtabTrainers) btnSubtabTrainers.style.display = 'none';
    if (districtFilterGroup) districtFilterGroup.style.display = 'none';
    currentUserSubtab = 'communes';
    document.querySelectorAll('.user-subtab-btn').forEach(b => b.classList.remove('active'));
    if (btnSubtabCommunes) btnSubtabCommunes.classList.add('active');
  } else {
    title.textContent = '👥 គ្រប់គ្រងគណនីអ្នកប្រើប្រាស់';
    scopeBadge.textContent = 'ដែនសមត្ថកិច្ច៖ ទូទាំងខេត្ត';
    if (btnSubtabAdmins) btnSubtabAdmins.style.display = 'inline-flex';
    if (btnSubtabTrainers) btnSubtabTrainers.style.display = 'inline-flex';
    if (btnSubtabCommunes) btnSubtabCommunes.style.display = 'inline-flex';
    if (districtFilterGroup) districtFilterGroup.style.display = 'block';
  }

  try {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (!data.success) return;

    allLoadedUsers = data.users || [];

    // Count badges
    const adminCount = allLoadedUsers.filter(u => u.role === 'SuperAdmin' || u.role === 'Admin' || u.role === 'PEC21').length;
    const trainerCount = allLoadedUsers.filter(u => u.role === 'Trainer').length;
    const communeCount = allLoadedUsers.filter(u => u.role === 'Commune').length;

    if (document.getElementById('badgeCountAdmins')) document.getElementById('badgeCountAdmins').textContent = adminCount;
    if (document.getElementById('badgeCountTrainers')) document.getElementById('badgeCountTrainers').textContent = trainerCount;
    if (document.getElementById('badgeCountCommunes')) document.getElementById('badgeCountCommunes').textContent = communeCount;

    renderUsersTable();
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  const searchText = (document.getElementById('searchUserText')?.value || '').trim().toLowerCase();
  const filterDistrict = document.getElementById('filterUserDistrict')?.value || '';

  // Filter by subtab
  let list = [];
  if (currentUserSubtab === 'admins') {
    list = allLoadedUsers.filter(u => u.role === 'SuperAdmin' || u.role === 'Admin' || u.role === 'PEC21');
  } else if (currentUserSubtab === 'trainers') {
    list = allLoadedUsers.filter(u => u.role === 'Trainer');
  } else if (currentUserSubtab === 'communes') {
    list = allLoadedUsers.filter(u => u.role === 'Commune');
  } else {
    list = allLoadedUsers;
  }

  // Filter by District dropdown
  if (filterDistrict) {
    const cleanDist = filterDistrict.replace(/^(ស្រុក|ក្រុង)\s*/, '').trim();
    list = list.filter(u => (u.district || '').replace(/^(ស្រុក|ក្រុង)\s*/, '').trim() === cleanDist);
  }

  // Filter by Search text
  if (searchText) {
    list = list.filter(u => {
      const un = (u.username || '').toLowerCase();
      const fn = (u.fullName || '').toLowerCase();
      const cn = (u.communeName || '').toLowerCase();
      const dt = (u.district || '').toLowerCase();
      const cc = (u.communeCode || '').toLowerCase();
      return un.includes(searchText) || fn.includes(searchText) || cn.includes(searchText) || dt.includes(searchText) || cc.includes(searchText);
    });
  }

  tbody.innerHTML = '';
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">មិនមានគណនីត្រូវនឹងលក្ខខណ្ឌស្វែងរកឡើយ</td></tr>';
    return;
  }

  list.forEach((u, idx) => {
    let statusBadge = '<span class="badge badge-passed">ដំណើរការ</span>';
    if (!u.active) statusBadge = '<span class="badge badge-absent">ផ្អាក</span>';
    else if (u.mustChangePassword) statusBadge = '<span class="badge badge-reserve">រង់ចាំប្តូរលេខសម្ងាត់</span>';

    // Format District
    let districtDisplay = 'ទូទាំងខេត្ត';
    if (u.district && u.district !== 'all') {
      districtDisplay = getDistrictPrefix(u.district);
    }

    // Format Commune
    let communeDisplay = 'គ្រប់ឃុំ-សង្កាត់';
    if (u.communeCode && u.communeCode !== 'all') {
      communeDisplay = getCommunePrefix(u.communeName || u.communeCode, u.district);
    }

    // Format Full Name / Title cleanly
    let nameDisplay = u.fullName || '';
    if (u.role === 'Commune') {
      const cCode = String(u.communeCode || '').padStart(3, '0');
      nameDisplay = `គប.ឃស ${u.communeName} (${cCode})`;
    } else if (u.role === 'Trainer') {
      if (u.username === 'PEC2101T001' && u.fullName && !u.fullName.includes('គប.ឃស') && !u.fullName.includes('\ufffd') && !u.fullName.startsWith('PEC21')) {
        nameDisplay = u.fullName; // ញ៉ែម សុផាត
      } else {
        const dLabel = getDistrictPrefix(u.district);
        const tCode = u.username.includes('T') ? 'T001' : 'R001';
        nameDisplay = `គ្រូប្រចាំ ${dLabel} (${tCode})`;
      }
    } else if (u.role === 'SuperAdmin') {
      nameDisplay = 'អភិបាលជាន់ខ្ពស់ (SuperAdmin)';
    } else if (u.role === 'Admin') {
      nameDisplay = 'អ្នកគ្រប់គ្រងទូទៅ (Admin PEC21)';
    } else if (u.role === 'PEC21') {
      nameDisplay = 'គ.ខ.ប លេខ ២១ ខេត្តតាកែវ (PEC21)';
    }

    // Format Role Badge
    let roleBadge = `<span class="badge badge-reserve">${u.role}</span>`;
    if (u.role === 'SuperAdmin') roleBadge = `<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-weight:700;">SuperAdmin</span>`;
    else if (u.role === 'Admin') roleBadge = `<span class="badge" style="background:#e0e7ff; color:#3730a3; border:1px solid #c7d2fe; font-weight:700;">Admin</span>`;
    else if (u.role === 'PEC21') roleBadge = `<span class="badge" style="background:#dbeafe; color:#1e40af; border:1px solid #bfdbfe; font-weight:700;">PEC21</span>`;
    else if (u.role === 'Trainer') roleBadge = `<span class="badge" style="background:#f3e8ff; color:#7e22ce; border:1px solid #e9d5ff; font-weight:700;">គ្រូបង្គោល</span>`;
    else if (u.role === 'Commune') roleBadge = `<span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; font-weight:700;">គប.ឃស</span>`;

    tbody.innerHTML += `
      <tr>
        <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
        <td style="font-weight: 700; color: var(--primary);">${u.username}</td>
        <td style="font-weight: 600;">${nameDisplay}</td>
        <td>${roleBadge}</td>
        <td>${districtDisplay}</td>
        <td>${communeDisplay}</td>
        <td style="text-align: center;">${statusBadge}</td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm" onclick="resetUserPassword('${u.id}', '${u.username}')" style="font-size: 12px; padding: 4px 10px;">
            🔄 Reset
          </button>
        </td>
      </tr>
    `;
  });
}

window.resetUserPassword = async function(id, username) {
  if (confirm(`តើលោកអ្នកពិតជាចង់ Reset លេខសម្ងាត់របស់គណនី "${username}" ទៅជា "pec21" មែនទេ?`)) {
    try {
      const res = await fetch(`/api/users/${id}/reset`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadUsersList();
      } else {
        alert('កំហុស៖ ' + data.message);
      }
    } catch (e) {
      alert(e.message);
    }
  }
};

// ==============================================================================
// TAB 6: SETTINGS & GOOGLE SHEETS & LOGO MANAGEMENT
// ==============================================================================

function updateAppLogos(url) {
  const logoSrc = url || 'img/nec_logo.jpg';
  const headerImg = document.getElementById('headerLogoImg');
  const loginImg = document.getElementById('loginLogoImg');
  const previewImg = document.getElementById('settingLogoPreview');
  const logoHidden = document.getElementById('settingLogoUrl');
  const reportLogoImg = document.getElementById('reportLogoImg');
  if (headerImg) headerImg.src = logoSrc;
  if (loginImg) loginImg.src = logoSrc;
  if (previewImg) previewImg.src = logoSrc;
  if (reportLogoImg) reportLogoImg.src = logoSrc;
  if (logoHidden) logoHidden.value = url || '';
}

async function handleLogoUpload(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('សូមជ្រើសរើសឯកសាររូបភាព (PNG, JPG, SVG)!');
    return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    const rawDataUrl = e.target.result;
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const maxDim = 256;
      let w = img.width;
      let h = img.height;
      if (w > h) {
        if (w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        }
      } else {
        if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const optimizedDataUrl = canvas.toDataURL('image/png', 0.9);

      updateAppLogos(optimizedDataUrl);
      appSettings.logoUrl = optimizedDataUrl;

      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...appSettings, logoUrl: optimizedDataUrl })
        });
        alert('✅ បានផ្លាស់ប្តូររូបសញ្ញា Logo ជោគជ័យ!');
      } catch (err) {
        console.error('Failed to auto-save logo:', err);
      }
    };
    img.src = rawDataUrl;
  };
  reader.readAsDataURL(file);
}

async function handleResetLogoDefault() {
  if (confirm('តើលោកអ្នកពិតជាចង់កំណត់ប្រើប្រាស់ Logo គ.ជ.ប ដើមវិញមែនទេ?')) {
    updateAppLogos('img/nec_logo.jpg');
    appSettings.logoUrl = '';
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...appSettings, logoUrl: '' })
      });
      alert('✅ បានកំណត់ប្រើប្រាស់ Logo គ.ជ.ប ដើមជោគជ័យ!');
    } catch (err) {
      console.error(err);
    }
  }
}

async function loadSettingsForm() {
  try {
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.port === '3027';
    const notice = document.getElementById('storageEnvironmentNotice');
    if (notice) {
      if (isLocal) {
        notice.style.background = '#f0fdf4';
        notice.style.borderColor = '#bbf7d0';
        notice.style.color = '#166534';
        notice.innerHTML = '💻 <strong>របៀបដំណើរការ៖ Localhost:3027</strong> — កំពុងប្រើប្រាស់ <strong>Storage: Local Database</strong> (ទិន្នន័យត្រូវបានរក្សាទុកនៅលើកុំព្យូទ័រនេះផ្ទាល់)';
      } else {
        notice.style.background = '#eff6ff';
        notice.style.borderColor = '#bfdbfe';
        notice.style.color = '#1e40af';
        notice.innerHTML = '🌐 <strong>របៀបដំណើរការ៖ Online Cloud</strong> — កំពុងប្រើប្រាស់ <strong>Storage: Online Database</strong> (Render)។<br><span style="font-size:12px;opacity:0.9;">💡 ប្រសិនបើលោកអ្នកចង់ប្រើប្រាស់ <strong>Storage: Local Database</strong> សូមបើកកម្មវិធីតាមរយៈ <code>http://localhost:3027</code> នៅលើកុំព្យូទ័រផ្ទាល់។</span>';
      }
    }

    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success && data.settings) {
      const s = data.settings;
      document.getElementById('settingGoogleSheetUrl').value = s.googleSheetUrl || '';
      document.getElementById('settingPecName').value = s.pecName || '';
      document.getElementById('settingMandate').value = s.mandateTitle || '';
      updateAppLogos(s.logoUrl);
    }
  } catch (e) {
    console.error(e);
  }
}

async function handleSaveSettings() {
  const urlInput = document.getElementById('settingGoogleSheetUrl');
  let rawUrl = urlInput ? urlInput.value.trim() : '';
  
  if (rawUrl && rawUrl.includes('script.google.com/macros/s/') && !rawUrl.endsWith('/exec')) {
    rawUrl = rawUrl.replace(/\/+$/, '') + '/exec';
    if (urlInput) urlInput.value = rawUrl;
  }

  const payload = {
    googleSheetUrl: rawUrl,
    pecName: document.getElementById('settingPecName').value.trim(),
    mandateTitle: document.getElementById('settingMandate').value.trim(),
    logoUrl: document.getElementById('settingLogoUrl')?.value || ''
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ បានរក្សាទុកការកំណត់ជោគជ័យ!');
      await checkCloudStatus();
    } else {
      alert('កំហុស៖ ' + data.message);
    }
  } catch (e) {
    alert(e.message);
  }
}

async function handleManualGoogleSync() {
  const btn = document.getElementById('btnManualGoogleSync');
  const urlInput = document.getElementById('settingGoogleSheetUrl');
  let currentUrl = urlInput ? urlInput.value.trim() : '';

  if (!currentUrl) {
    alert('⚠️ សូមបញ្ចូល Google Apps Script Web App URL ក្នុងប្រអប់ Settings ជាមុនសិន!');
    if (urlInput) urlInput.focus();
    return;
  }

  // Auto-correct missing /exec
  if (currentUrl.includes('script.google.com/macros/s/') && !currentUrl.endsWith('/exec')) {
    currentUrl = currentUrl.replace(/\/+$/, '') + '/exec';
    if (urlInput) urlInput.value = currentUrl;
  }

  btn.disabled = true;
  btn.textContent = 'កំពុង Sync...';

  try {
    // 1. Auto-save current URL to settings first
    const pecName = document.getElementById('settingPecName')?.value.trim() || '';
    const mandateTitle = document.getElementById('settingMandate')?.value.trim() || '';
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        googleSheetUrl: currentUrl,
        pecName: pecName,
        mandateTitle: mandateTitle
      })
    });

    // 2. Perform sync with currentUrl
    const res = await fetch('/api/sync-google-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentUrl })
    });
    const data = await res.json();
    if (data.success) {
      alert('✅ បានធ្វើសមកាលកម្មទិន្នន័យទៅកាន់ Google Sheets រួចរាល់ដោយជោគជ័យ!');
      await checkCloudStatus();
    } else {
      alert('❌ ' + data.message + (data.error ? '\n\nមូលហេតុ៖ ' + data.error : ''));
    }
  } catch (e) {
    alert('Network error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '⚡ ធ្វើសមកាលកម្មភ្លាមៗ (Sync Google Sheets Now)';
  }
}

// ==============================================================================
// PASSWORD & PROFILE MODAL
// ==============================================================================

function openChangePasswordModal(isForced = false) {
  const modal = document.getElementById('modalPassword');
  const alertBox = document.getElementById('mustChangeAlert');
  const closeBtn = document.getElementById('btnClosePasswordModal');
  const oldPwGroup = document.getElementById('oldPasswordGroup');

  if (isForced) {
    alertBox.style.display = 'block';
    closeBtn.style.display = 'none';
    oldPwGroup.style.display = 'none'; // Initial activation does not require old password
  } else {
    alertBox.style.display = 'none';
    closeBtn.style.display = 'block';
    oldPwGroup.style.display = 'block';
  }

  document.getElementById('pwFullName').value = currentUser.fullName || '';
  document.getElementById('pwPhone').value = currentUser.phone || '';
  document.getElementById('pwEmail').value = currentUser.email || '';
  document.getElementById('pwNew').value = '';
  document.getElementById('pwConfirm').value = '';

  modal.classList.add('active');
}

async function handleChangePasswordSubmit(e) {
  e.preventDefault();
  const oldPw = document.getElementById('pwOld').value;
  const newPw = document.getElementById('pwNew').value;
  const confirmPw = document.getElementById('pwConfirm').value;
  const fullName = document.getElementById('pwFullName').value.trim();
  const phone = document.getElementById('pwPhone').value.trim();
  const email = document.getElementById('pwEmail').value.trim();
  const errBox = document.getElementById('pwError');

  errBox.style.display = 'none';

  if (newPw !== confirmPw) {
    errBox.textContent = 'លេខសម្ងាត់ថ្មី និងការបញ្ជាក់មិនដូចគ្នាឡើយ!';
    errBox.style.display = 'block';
    return;
  }

  try {
    const res = await fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oldPassword: oldPw,
        newPassword: newPw,
        fullName: fullName,
        phone: phone,
        email: email
      })
    });
    const data = await res.json();
    if (data.success) {
      alert('ផ្លាស់ប្តូរលេខសម្ងាត់ជោគជ័យ!');
      closeModal('modalPassword');
      currentUser.mustChangePassword = false;
      currentUser.isActivated = true;
      if (fullName) currentUser.fullName = fullName;
      document.getElementById('userFullName').textContent = currentUser.fullName;
    } else {
      errBox.textContent = data.message;
      errBox.style.display = 'block';
    }
  } catch (err) {
    errBox.textContent = 'Error: ' + err.message;
    errBox.style.display = 'block';
  }
}

// ==============================================================================
// CANDIDATE MODAL (Add Single Candidate)
// ==============================================================================

function openCandidateModal() {
  const stationId = document.getElementById('scoringStationSelect').value;
  if (!stationId) return alert('សូមជ្រើសរើសការិយាល័យជាមុនសិន');

  document.getElementById('candFormStationId').value = stationId;
  document.getElementById('candFormName').value = '';
  document.getElementById('candFormDob').value = '';
  document.getElementById('candFormPhone').value = '';
  document.getElementById('candFormDegreeSelect').value = '0';
  document.getElementById('candFormScoreDegree').value = '0';
  document.getElementById('candFormExpSelect').value = '0';
  document.getElementById('candFormScoreExp').value = '0';
  document.getElementById('candFormScoreInterview').value = '';

  document.getElementById('modalCandidate').classList.add('active');
}

async function handleCandidateSubmit(e) {
  e.preventDefault();
  const stationId = document.getElementById('candFormStationId').value;
  const degreeOpt = document.getElementById('candFormDegreeSelect').selectedOptions[0];
  const expOpt = document.getElementById('candFormExpSelect').selectedOptions[0];

  const payload = {
    pollingStationId: stationId,
    role: document.getElementById('candFormRole').value,
    orderInRole: parseInt(document.getElementById('candFormOrder').value) || 1,
    name: document.getElementById('candFormName').value.trim(),
    gender: document.getElementById('candFormGender').value,
    dob: document.getElementById('candFormDob').value.trim(),
    phone: document.getElementById('candFormPhone').value.trim(),
    degree: degreeOpt.getAttribute('data-name') || '',
    scoreDegree: parseFloat(document.getElementById('candFormScoreDegree').value) || 0,
    experience: expOpt.getAttribute('data-name') || '',
    scoreExp: parseFloat(document.getElementById('candFormScoreExp').value) || 0,
    scoreInterview: document.getElementById('candFormScoreInterview').value.trim()
  };

  try {
    const res = await fetch('/api/candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      closeModal('modalCandidate');
      alert('បានបន្ថែមបេក្ខជនជោគជ័យ!');
      await renderScoringTableForActiveStation();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert(err.message);
  }
}

// Modal Utility
window.closeModal = function(modalId) {
  document.getElementById(modalId).classList.remove('active');
};
