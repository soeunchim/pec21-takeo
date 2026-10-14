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
      if (targetId === 'tabReports') renderReportPreview();
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

function populateFilterDropdowns() {
  const distSelect = document.getElementById('filterStationDistrict');
  const comSelect = document.getElementById('filterStationCommune');
  const formComSelect = document.getElementById('stationFormCommune');

  if (distSelect) {
    distSelect.innerHTML = '<option value="">-- គ្រប់ក្រុង-ស្រុក --</option>';
    allDistricts.forEach(d => {
      distSelect.innerHTML += `<option value="${d.name}">${d.name}</option>`;
    });
  }

  if (comSelect) {
    comSelect.innerHTML = '<option value="">-- គ្រប់ឃុំ-សង្កាត់ --</option>';
    allCommunes.forEach(c => {
      comSelect.innerHTML += `<option value="${c.code}">${c.name} (${c.code})</option>`;
    });
  }

  if (formComSelect) {
    formComSelect.innerHTML = '';
    allCommunes.forEach(c => {
      formComSelect.innerHTML += `<option value="${c.code}">${c.fullName || c.name + ' (' + c.code + ')'}</option>`;
    });
  }
}

function populateStationSelectors() {
  const scoringSelect = document.getElementById('scoringStationSelect');
  const reportSelect = document.getElementById('reportStationSelect');

  scoringSelect.innerHTML = '';
  reportSelect.innerHTML = '';

  if (!allPollingStations.length) {
    scoringSelect.innerHTML = '<option value="">-- គ្មានការិយាល័យបោះឆ្នោត --</option>';
    reportSelect.innerHTML = '<option value="">-- គ្មានការិយាល័យបោះឆ្នោត --</option>';
    return;
  }

  // Group stations by Commune for clean UX
  const grouped = {};
  allPollingStations.forEach(ps => {
    const key = `ឃុំ${ps.communeName} (${ps.district})`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ps);
  });

  let html = '';
  for (const [groupName, stations] of Object.entries(grouped)) {
    html += `<optgroup label="${groupName}">`;
    stations.forEach(ps => {
      const code4 = String(ps.code || '').padStart(4, '0');
      const locStr = ps.location ? ` - ${ps.location}` : '';
      html += `<option value="${ps.id}">${ps.name} [កូដ: ${code4}]${locStr}</option>`;
    });
    html += `</optgroup>`;
  }

  scoringSelect.innerHTML = html;
  reportSelect.innerHTML = html;

  renderScoringTableForActiveStation();
  renderReportPreview();
}

async function checkCloudStatus() {
  const badge = document.getElementById('cloudStatusText');
  const pulse = document.getElementById('pulseDot');
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success && data.settings) {
      appSettings = data.settings;
      if (appSettings.googleSheetUrl) {
        badge.textContent = 'Google Sheets: Synced';
        pulse.classList.remove('syncing');
      } else {
        badge.textContent = 'Storage: Local Database';
      }
    }
  } catch (e) {
    badge.textContent = 'Storage: Offline';
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
          <td colspan="8" style="text-align: center; padding: 36px 16px;">
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
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">រកមិនឃើញការិយាល័យបោះឆ្នោតតាមលក្ខខណ្ឌស្វែងរកនេះឡើយ។</td></tr>';
    }
    return;
  }

  // Display limit when unfiltered to maintain snappy UI rendering
  const isFiltered = Boolean(filterDist || filterCom || searchKw);
  const displayLimit = isFiltered ? 500 : 150;
  const displayList = filtered.slice(0, displayLimit);

  displayList.forEach(ps => {
    tbody.innerHTML += `
      <tr>
        <td style="text-align: center; font-weight: 700;">${String(ps.code || '').padStart(4, '0')}</td>
        <td style="font-weight: 600; color: var(--primary);">${ps.name}</td>
        <td>ឃុំ${ps.communeName}</td>
        <td>${ps.district}</td>
        <td>${ps.location || '---'}</td>
        <td style="text-align: center;">${ps.interviewDate || '09-07-2027'} (${ps.interviewTime || '07:00'})</td>
        <td style="text-align: center;"><span class="badge badge-passed">${ps.candidateCount || 0} នាក់</span></td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm" onclick="selectStationForScoring('${ps.id}')">📝 ពិន្ទុ</button>
          <button class="btn btn-secondary btn-sm" onclick="editStation('${ps.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStation('${ps.id}')">🗑️</button>
        </td>
      </tr>
    `;
  });

  if (filtered.length > displayLimit) {
    tbody.innerHTML += `
      <tr style="background: #f8fafc; font-style: italic; color: #64748b; text-align: center;">
        <td colspan="8" style="padding: 12px;">
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
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelector('[data-tab="tabScoring"]').classList.add('active');
  document.getElementById('tabScoring').classList.add('active');

  document.getElementById('scoringStationSelect').value = stationId;
  renderScoringTableForActiveStation();
};

// ==============================================================================
// TAB 3: CANDIDATE SCORING & LIVE RANKING TABLE
// ==============================================================================

async function renderScoringTableForActiveStation() {
  const stationId = document.getElementById('scoringStationSelect').value;
  const tbody = document.getElementById('scoringTableBody');
  const infoSpan = document.getElementById('activeStationInfo');

  if (!stationId) {
    tbody.innerHTML = '<tr><td colspan="15" style="text-align: center; padding: 25px; color: var(--text-muted); font-size: 14px;">សូមជ្រើសរើសការិយាល័យបោះឆ្នោត</td></tr>';
    infoSpan.textContent = '';
    return;
  }

  const ps = allPollingStations.find(p => p.id === stationId);
  if (ps) {
    infoSpan.textContent = `📍 ${ps.district} / ឃុំ${ps.communeName} / លេខកូដការិយាល័យ ៖ ${ps.code}`;
  }

  try {
    const res = await fetch(`/api/candidates?pollingStationId=${stationId}`);
    const data = await res.json();
    currentCandidates = data.candidates || [];

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
              <input type="text" class="excel-cell-input cand-name" value="${cand.name || ''}" placeholder="បញ្ចូលគោត្តនាម-នាម" onchange="onCandidateRowChange(this)">
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
  if (!stationId) return alert('សូមជ្រើសរើសការិយាល័យ');

  const rows = document.querySelectorAll('#scoringTableBody tr[data-cand-id]');
  const candidatesPayload = [];

  rows.forEach(tr => {
    const candId = tr.getAttribute('data-cand-id');
    const roleName = tr.getAttribute('data-role');
    const order = parseInt(tr.getAttribute('data-order')) || 1;
    const name = tr.querySelector('.cand-name').value.trim();

    // Only save rows that have candidate names or were existing
    if (name) {
      candidatesPayload.push({
        id: candId.startsWith('temp_') ? undefined : candId,
        pollingStationId: stationId,
        role: roleName,
        orderInRole: order,
        name: name,
        gender: tr.querySelector('.cand-gender').value,
        dob: tr.querySelector('.cand-dob').value.trim(),
        phone: tr.querySelector('.cand-phone').value.trim(),
        degree: tr.querySelector('.cand-degree').value.trim(),
        scoreDegree: parseFloat(tr.querySelector('.cand-score-degree').value) || 0,
        experience: tr.querySelector('.cand-exp').value.trim(),
        scoreExp: parseFloat(tr.querySelector('.cand-score-exp').value) || 0,
        scoreInterview: tr.querySelector('.cand-interview').value.trim()
      });
    }
  });

  const saveBtn = document.getElementById('btnSaveBatchScores');
  saveBtn.disabled = true;
  saveBtn.textContent = 'កំពុងរក្សាទុក...';

  try {
    // Upsert each candidate
    for (const cand of candidatesPayload) {
      await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cand)
      });
    }

    alert('បានរក្សាទុកពិន្ទុ និងគណនាចំណាត់ថ្នាក់ដោយជោគជ័យ!');
    await renderScoringTableForActiveStation();
    await checkCloudStatus();
  } catch (err) {
    alert('Error saving scores: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 រក្សាទុកពិន្ទុទាំងអស់ (Save All Scores)';
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
// TAB 4: OFFICIAL REPORTS & PRINT (The 5 Excel sheets matching layout)
// ==============================================================================

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

  // Fetch candidates for this station
  const res = await fetch(`/api/candidates?pollingStationId=${stationId}`);
  const data = await res.json();
  const cList = data.candidates || [];

  // Group candidates by role
  const roleGroups = {};
  ROLES_ORDER.forEach(r => roleGroups[r] = []);
  cList.forEach(c => {
    if (roleGroups[c.role]) roleGroups[c.role].push(c);
  });

  // Common Header Template
  const headerHtml = `
    <div class="letterhead">
      <table class="letterhead-table">
        <tr>
          <td style="width: 48%;">
            <div class="khmer-agency">គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត</div>
            <div class="khmer-agency">${ps.province || 'គណៈកម្មការរៀបចំការបោះឆ្នោត ខេត្តតាកែវ'}</div>
            <div class="khmer-agency">${ps.committeeName || 'គណៈកម្មការសម្ភាសន៍ជ្រើសរើស គ.ក.ប'}</div>
            <div style="font-weight: 700; margin-top: 4px;">ឃុំ${ps.communeName}(${ps.communeCode})</div>
          </td>
          <td style="width: 52%; text-align: center;">
            <div class="khmer-national">ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div class="khmer-motto">ជាតិ  សាសនា  ព្រះមហាក្សត្រ</div>
            <div style="font-size: 18px; margin-top: -4px;">***</div>
          </td>
        </tr>
      </table>
    </div>
  `;

  let reportContentHtml = '';

  // ----------------------------------------------------------------------------
  // SHEET 1: SortList (តារាងសម្រាំងបេក្ខជន)
  // ----------------------------------------------------------------------------
  if (reportType === 'sortlist') {
    let rowsHtml = '';
    ROLES_ORDER.forEach(role => {
      rowsHtml += `<tr class="category-row"><td colspan="10"> - មុខតំណែង ៖ ${role}</td></tr>`;
      const items = roleGroups[role] || [];
      for (let i = 1; i <= 3; i++) {
        const c = items.find(x => x.orderInRole === i);
        rowsHtml += `
          <tr>
            <td class="center">${i}</td>
            <td style="font-weight: 600;">${c ? c.name : ''}</td>
            <td class="center">${c ? c.gender : ''}</td>
            <td class="center">${c ? c.dob : ''}</td>
            <td>${c ? c.degree : ''}</td>
            <td class="center">${c ? (c.scoreDegree || 0) : ''}</td>
            <td>${c ? c.experience : ''}</td>
            <td class="center">${c ? (c.scoreExp || 0) : ''}</td>
            <td class="center" style="font-weight: 700;">${c ? (c.scoreShortlist || 0) : ''}</td>
            <td>${c ? (c.notes || '') : ''}</td>
          </tr>
        `;
      }
    });

    reportContentHtml = `
      <div class="print-page">
        ${headerHtml}
        <div class="report-title-section">
          <div class="report-main-title">តារាង​សម្រាំង​បេក្ខជន​សម្រាប់​ការ​សម្ភាសន៍​ជ្រើសរើស​​ គ.ក.ប</div>
          <div class="report-sub-title">${ps.mandate || 'សម្រាប់ការបោះឆ្នោតជ្រើសតាំងតំណាងរាស្ត្រ នីតិកាលទី៨ ឆ្នាំ២០២៧'}</div>
        </div>
        <div class="report-info-row">
          <span></span>
          <span style="font-weight: 700;">លេខ​កូដ​ការិយាល័យ ៖ ${psCodeFormatted}</span>
        </div>
        <table class="official-print-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 40px;">ល.រ</th>
              <th rowspan="2">គោត្តនាម-នាម</th>
              <th rowspan="2" style="width: 45px;">ភេទ</th>
              <th rowspan="2" style="width: 95px;">ថ្ងៃ ខែ ឆ្នាំកំណើត</th>
              <th colspan="2">កម្រិតសញ្ញាបត្រ</th>
              <th colspan="2">បទពិសោធន៍</th>
              <th rowspan="2" style="width: 75px;">សរុបពិន្ទុ</th>
              <th rowspan="2" style="width: 70px;">ផ្សេងៗ</th>
            </tr>
            <tr>
              <th>សញ្ញាបត្រ</th>
              <th style="width: 50px;">ពិន្ទុ</th>
              <th>បទពិសោធ</th>
              <th style="width: 50px;">ពិន្ទុ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        ${getSignatureSection(ps)}
      </div>
    `;
  }

  // ----------------------------------------------------------------------------
  // SHEET 2: ជូនដំណឹង (សេចក្តីជូនដំណឹងបេក្ខជនសម្ភាសន៍)
  // ----------------------------------------------------------------------------
  else if (reportType === 'notice') {
    let rowsHtml = '';
    ROLES_ORDER.forEach(role => {
      rowsHtml += `<tr class="category-row"><td colspan="6"> - មុខតំណែង ៖ ${role}</td></tr>`;
      const items = roleGroups[role] || [];
      for (let i = 1; i <= 3; i++) {
        const c = items.find(x => x.orderInRole === i);
        rowsHtml += `
          <tr>
            <td class="center">${i}</td>
            <td style="font-weight: 600;">${c ? c.name : ''}</td>
            <td class="center">${c ? c.gender : ''}</td>
            <td class="center">${c ? c.dob : ''}</td>
            <td class="center">${c ? (c.phone || '') : ''}</td>
            <td>${c ? (c.notes || '') : ''}</td>
          </tr>
        `;
      }
    });

    reportContentHtml = `
      <div class="print-page">
        ${headerHtml}
        <div class="report-title-section">
          <div class="report-main-title">សេចក្ដីជូនដំណឹង</div>
          <div style="font-size: 11pt; margin-top: 6px;">
            បេក្ខជនដែលបានដាក់ពាក្យសុំចូលបម្រើការងារជាមន្ត្រី គ.ក.ប ដូចមានរាយនាមខាងក្រោម ត្រូវមកធ្វើសម្ភាសន៍<br>
            នៅ <strong>${ps.interviewPlace || 'សាលាឃុំ' + ps.communeName}</strong> នាថ្ងៃទី <strong>${ps.interviewDate || '09-07-2027'}</strong> វេលាម៉ោង <strong>${ps.interviewTime || '០៧:០០ ព្រឹក'}</strong> តទៅ។
          </div>
        </div>
        <div class="report-info-row">
          <span></span>
          <span style="font-weight: 700;">លេខ​កូដ​ការិយាល័យ ៖ ${psCodeFormatted}</span>
        </div>
        <table class="official-print-table">
          <thead>
            <tr>
              <th style="width: 45px;">ល.រ</th>
              <th>គោត្តនាម-នាម</th>
              <th style="width: 50px;">ភេទ</th>
              <th style="width: 120px;">ថ្ងៃ ខែ ឆ្នាំកំណើត</th>
              <th style="width: 120px;">លេខទូរសព្ទ</th>
              <th style="width: 100px;">ផ្សេងៗ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        ${getSignatureSection(ps)}
      </div>
    `;
  }

  // ----------------------------------------------------------------------------
  // SHEET 3: បញ្ជីវត្តមាន (បញ្ជីវត្តមានសម្ភាសន៍)
  // ----------------------------------------------------------------------------
  else if (reportType === 'attendance') {
    let rowsHtml = '';
    ROLES_ORDER.forEach(role => {
      rowsHtml += `<tr class="category-row"><td colspan="7"> - មុខតំណែង ៖ ${role}</td></tr>`;
      const items = roleGroups[role] || [];
      for (let i = 1; i <= 3; i++) {
        const c = items.find(x => x.orderInRole === i);
        rowsHtml += `
          <tr>
            <td class="center">${i}</td>
            <td style="font-weight: 600;">${c ? c.name : ''}</td>
            <td class="center">${c ? c.gender : ''}</td>
            <td class="center">${c ? c.dob : ''}</td>
            <td style="height: 32px;"></td>
            <td></td>
            <td></td>
          </tr>
        `;
      }
    });

    reportContentHtml = `
      <div class="print-page">
        ${headerHtml}
        <div class="report-title-section">
          <div class="report-main-title">បញ្ជីវត្តមានសម្ភាសន៍ ជ្រើសរើស គ.ក.ប</div>
          <div class="report-sub-title">${ps.mandate || 'សម្រាប់ការបោះឆ្នោតជ្រើសតាំងតំណាងរាស្ត្រ នីតិកាលទី៨ ឆ្នាំ២០២៧'}</div>
        </div>
        <div class="report-info-row">
          <span></span>
          <span style="font-weight: 700;">លេខ​កូដ​ការិយាល័យ ៖ ${psCodeFormatted}</span>
        </div>
        <table class="official-print-table">
          <thead>
            <tr>
              <th style="width: 45px;">ល.រ</th>
              <th>គោត្តនាម-នាម</th>
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
        ${getSignatureSection(ps)}
      </div>
    `;
  }

  // ----------------------------------------------------------------------------
  // SHEET 4: បញ្ចូលពិន្ទុ (តារាងស្រង់ពិន្ទុនៃការជ្រើសរើស គ.ក.ប)
  // ----------------------------------------------------------------------------
  else if (reportType === 'scoresheet') {
    let rowsHtml = '';
    ROLES_ORDER.forEach(role => {
      rowsHtml += `<tr class="category-row"><td colspan="8"> - មុខតំណែង ៖ ${role}</td></tr>`;
      const items = roleGroups[role] || [];
      for (let i = 1; i <= 3; i++) {
        const c = items.find(x => x.orderInRole === i);
        rowsHtml += `
          <tr>
            <td class="center">${i}</td>
            <td style="font-weight: 600;">${c ? c.name : ''}</td>
            <td class="center">${c ? c.gender : ''}</td>
            <td class="center">${c ? c.dob : ''}</td>
            <td class="center" style="font-weight: 600;">${c ? (c.scoreShortlist || 0) : ''}</td>
            <td class="center" style="font-weight: 600;">${c ? (c.scoreInterview !== undefined ? c.scoreInterview : '') : ''}</td>
            <td class="center" style="font-weight: 700;">${c ? (c.scoreTotal !== undefined ? c.scoreTotal : '') : ''}</td>
            <td>${c ? (c.notes || '') : ''}</td>
          </tr>
        `;
      }
    });

    reportContentHtml = `
      <div class="print-page">
        ${headerHtml}
        <div class="report-title-section">
          <div class="report-main-title">តារាងស្រង់ពិន្ទុនៃការជ្រើសរើស គ.ក.ប</div>
          <div class="report-sub-title">${ps.mandate || 'សម្រាប់ការបោះឆ្នោតជ្រើសតាំងតំណាងរាស្ត្រ នីតិកាលទី៨ ឆ្នាំ២០២៧'}</div>
        </div>
        <div class="report-info-row">
          <span></span>
          <span style="font-weight: 700;">លេខ​កូដ​ការិយាល័យ ៖ ${psCodeFormatted}</span>
        </div>
        <table class="official-print-table">
          <thead>
            <tr>
              <th style="width: 45px;">ល.រ</th>
              <th>គោត្តនាម-នាម</th>
              <th style="width: 50px;">ភេទ</th>
              <th style="width: 120px;">ថ្ងៃ ខែ ឆ្នាំកំណើត</th>
              <th style="width: 95px;">ពិន្ទុសម្រាំង</th>
              <th style="width: 110px;">ពិន្ទុសម្ភាសន៍</th>
              <th style="width: 95px;">សរុបពិន្ទុ</th>
              <th style="width: 100px;">ផ្សេងៗ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        ${getSignatureSection(ps)}
      </div>
    `;
  }

  // ----------------------------------------------------------------------------
  // SHEET 5: លទ្ធផលតាមលំដាប់ (Ranked official result notice for public posting)
  // ----------------------------------------------------------------------------
  else if (reportType === 'results') {
    let rowsHtml = '';
    ROLES_ORDER.forEach(role => {
      rowsHtml += `<tr class="category-row"><td colspan="7"> - មុខតំណែង ៖ ${role}</td></tr>`;
      const items = roleGroups[role] || [];
      // Sort strictly by rank: Rank 1 first, then 2, then 3, absent last
      const sorted = [...items].sort((a, b) => {
        const aAbs = a.scoreTotal === 'អវត្តមាន';
        const bAbs = b.scoreTotal === 'អវត្តមាន';
        if (aAbs && !bAbs) return 1;
        if (!aAbs && bAbs) return -1;
        return (a.rank || 0) - (b.rank || 0);
      });

      for (let i = 1; i <= 3; i++) {
        const c = sorted[i - 1];
        rowsHtml += `
          <tr>
            <td class="center">${i}</td>
            <td style="font-weight: 600;">${c ? c.name : ''}</td>
            <td class="center">${c ? c.gender : ''}</td>
            <td class="center">${c ? c.dob : ''}</td>
            <td class="center" style="font-weight: 700;">${c ? (c.scoreTotal !== undefined ? c.scoreTotal : '') : ''}</td>
            <td class="center" style="font-weight: 700; color: ${c && c.status === 'A-ជាប់' ? '#15803d' : '#000'};">
              ${c ? c.status : ''}
            </td>
            <td>${c ? (c.notes || '') : ''}</td>
          </tr>
        `;
      }
    });

    reportContentHtml = `
      <div class="print-page">
        ${headerHtml}
        <div class="report-title-section">
          <div class="report-main-title">លទ្ធផលនៃការសម្ភាសន៍ជ្រើសរើស គ.ក.ប</div>
          <div class="report-sub-title">${ps.mandate || 'សម្រាប់ការបោះឆ្នោតជ្រើសតាំងតំណាងរាស្ត្រ នីតិកាលទី៨ ឆ្នាំ២០២៧'}</div>
        </div>
        <div class="report-info-row">
          <span></span>
          <span style="font-weight: 700;">លេខ​កូដ​ការិយាល័យ ៖ ${psCodeFormatted}</span>
        </div>
        <table class="official-print-table">
          <thead>
            <tr>
              <th style="width: 45px;">ល.រ</th>
              <th>គោត្តនាម-នាម</th>
              <th style="width: 50px;">ភេទ</th>
              <th style="width: 120px;">ថ្ងៃ ខែ ឆ្នាំកំណើត</th>
              <th style="width: 95px;">សរុបពិន្ទុ</th>
              <th style="width: 120px;">និទ្ទេស</th>
              <th style="width: 100px;">ផ្សេងៗ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        ${getSignatureSection(ps)}
      </div>
    `;
  }

  container.innerHTML = reportContentHtml;
}

function getSignatureSection(ps) {
  return `
    <div class="signature-section">
      <div class="signature-box">
        <div class="date-line">បានឃើញ និងឯកភាព</div>
        <div class="role-line">ប្រធានគណៈកម្មការរៀបចំការបោះឆ្នោតខេត្តតាកែវ</div>
      </div>
      <div class="signature-box">
        <div class="date-line">ថ្ងៃទី....... ខែ....... ឆ្នាំ២០២៧</div>
        <div class="role-line">គណៈកម្មការសម្ភាសន៍ជ្រើសរើស គ.ក.ប</div>
      </div>
    </div>
  `;
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
      filterDistSelect.innerHTML += `<option value="${d.name}">${d.name}</option>`;
    });
  }

  if (currentUser.role === 'Trainer') {
    title.textContent = `👥 គណនីឃុំ-សង្កាត់ក្នុង ${currentUser.district} (ចំនួន ${allCommunes.length} ឃុំ)`;
    scopeBadge.textContent = `ដែនសមត្ថកិច្ច៖ ${currentUser.district}`;
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
    list = list.filter(u => u.district === filterDistrict);
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

    tbody.innerHTML += `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-weight: 700; color: var(--primary);">${u.username}</td>
        <td>${u.fullName || '---'}</td>
        <td><span class="badge badge-reserve">${u.role}</span></td>
        <td>${u.district || 'all'}</td>
        <td>${u.communeName || (u.communeCode !== 'all' ? u.communeCode : 'all')}</td>
        <td style="text-align: center;">${statusBadge}</td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm" onclick="resetUserPassword('${u.id}', '${u.username}')">
            🔄 Reset Password
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
// TAB 6: SETTINGS & GOOGLE SHEETS
// ==============================================================================

async function loadSettingsForm() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success && data.settings) {
      const s = data.settings;
      document.getElementById('settingGoogleSheetUrl').value = s.googleSheetUrl || '';
      document.getElementById('settingPecName').value = s.pecName || '';
      document.getElementById('settingMandate').value = s.mandateTitle || '';
    }
  } catch (e) {
    console.error(e);
  }
}

async function handleSaveSettings() {
  const payload = {
    googleSheetUrl: document.getElementById('settingGoogleSheetUrl').value.trim(),
    pecName: document.getElementById('settingPecName').value.trim(),
    mandateTitle: document.getElementById('settingMandate').value.trim()
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert('បានរក្សាទុកការកំណត់ជោគជ័យ!');
      await checkCloudStatus();
    } else {
      alert(data.message);
    }
  } catch (e) {
    alert(e.message);
  }
}

async function handleManualGoogleSync() {
  const btn = document.getElementById('btnManualGoogleSync');
  btn.disabled = true;
  btn.textContent = 'កំពុង Sync...';

  try {
    const res = await fetch('/api/sync-google-sheet', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert('បានធ្វើសមកាលកម្មទិន្នន័យទៅកាន់ Google Sheets រួចរាល់ដោយជោគជ័យ!');
      await checkCloudStatus();
    } else {
      alert('កំហុស៖ ' + data.message + (data.error ? '\n' + data.error : ''));
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
