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
// MODERN ELEGANT POPUP SYSTEM (Replaces native browser alert & confirm)
// ==============================================================================

const _nativeAlert = typeof window !== 'undefined' ? window.alert.bind(window) : null;
const _nativeConfirm = typeof window !== 'undefined' ? window.confirm.bind(window) : null;

let modernPopupResolver = null;

function ensureModernPopupDOM() {
  let overlay = document.getElementById('modernPopupOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modernPopupOverlay';
    overlay.className = 'modern-popup-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="modern-popup-card">
        <div class="modern-popup-icon-wrapper" id="modernPopupIcon"></div>
        <h3 class="modern-popup-title" id="modernPopupTitle">សេចក្តីជូនដំណឹង</h3>
        <div class="modern-popup-message" id="modernPopupMessage"></div>
        <div class="modern-popup-actions" id="modernPopupActions">
          <button type="button" class="modern-popup-btn modern-popup-btn-cancel" id="btnModernPopupCancel">
            បោះបង់
          </button>
          <button type="button" class="modern-popup-btn modern-popup-btn-confirm" id="btnModernPopupConfirm">
            យល់ព្រម
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  } else if (overlay.parentElement !== document.body) {
    document.body.appendChild(overlay);
  }
  return overlay;
}

function closeModernPopup(result = false) {
  const overlay = document.getElementById('modernPopupOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.cssText = 'display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; z-index: -1 !important;';
    const cardEl = overlay.querySelector('.modern-popup-card');
    if (cardEl) cardEl.classList.remove('wide-card');
  }
  if (modernPopupResolver) {
    const resolver = modernPopupResolver;
    modernPopupResolver = null;
    resolver(result);
  }
}

function showModernPopup({
  title = 'សេចក្តីជូនដំណឹង',
  message = '',
  type = 'info',
  icon = '',
  showCancel = false,
  confirmText = 'យល់ព្រម',
  cancelText = 'បោះបង់',
  isDanger = false,
  cancelIsDanger = false,
  isWide = false
}) {
  return new Promise((resolve) => {
    try {
      const overlay = ensureModernPopupDOM();
      const titleEl = document.getElementById('modernPopupTitle');
      const msgEl = document.getElementById('modernPopupMessage');
      const iconEl = document.getElementById('modernPopupIcon');
      const btnCancel = document.getElementById('btnModernPopupCancel');
      const btnConfirm = document.getElementById('btnModernPopupConfirm');

      if (!overlay || !titleEl || !msgEl || !iconEl || !btnConfirm || !btnCancel) {
        if (showCancel && _nativeConfirm) {
          return resolve(_nativeConfirm(message));
        }
        if (!showCancel && _nativeAlert) {
          _nativeAlert(message);
        }
        return resolve(true);
      }

      const cardEl = overlay.querySelector('.modern-popup-card');
      if (cardEl) {
        if (isWide) {
          cardEl.classList.add('wide-card');
        } else {
          cardEl.classList.remove('wide-card');
        }
      }

      if (modernPopupResolver) {
        modernPopupResolver(false);
        modernPopupResolver = null;
      }
      modernPopupResolver = resolve;

      titleEl.textContent = title;
      if (typeof message === 'string' && message.includes('<') && message.includes('>')) {
        msgEl.innerHTML = message;
      } else {
        msgEl.textContent = message;
      }

      // Reset styles
      iconEl.className = 'modern-popup-icon-wrapper';
      btnConfirm.className = 'modern-popup-btn modern-popup-btn-confirm';
      btnCancel.className = 'modern-popup-btn modern-popup-btn-cancel';
      if (cancelIsDanger) {
        btnCancel.classList.add('btn-danger-cancel');
      }

      let resolvedType = type;
      let resolvedIcon = icon;

      if (!resolvedIcon) {
        const msgStr = String(message || '');
        if (resolvedType === 'success' || msgStr.includes('ជោគជ័យ') || msgStr.includes('✅') || msgStr.includes('រួចរាល់')) {
          resolvedType = 'success';
          resolvedIcon = '✅';
        } else if (resolvedType === 'danger' || isDanger || msgStr.includes('លុប') || msgStr.includes('បរាជ័យ') || msgStr.includes('❌') || msgStr.includes('គ្រោះថ្នាក់')) {
          resolvedType = 'danger';
          resolvedIcon = (isDanger || msgStr.includes('លុប')) ? '🗑️' : '❌';
        } else if (resolvedType === 'warning' || msgStr.includes('⚠️') || msgStr.includes('សូមប្រយ័ត្ន') || msgStr.includes('មិនទាន់បាន')) {
          resolvedType = 'warning';
          resolvedIcon = '⚠️';
        } else if (resolvedType === 'question' || showCancel) {
          resolvedType = 'question';
          resolvedIcon = '❓';
        } else if (msgStr.includes('💻')) {
          resolvedType = 'info';
          resolvedIcon = '💻';
        } else if (msgStr.includes('🌐')) {
          resolvedType = 'info';
          resolvedIcon = '🌐';
        } else {
          resolvedType = 'info';
          resolvedIcon = 'ℹ️';
        }
      }

      iconEl.classList.add(`icon-${resolvedType}`);
      iconEl.textContent = resolvedIcon;

      if (isDanger || resolvedType === 'danger') {
        btnConfirm.classList.add('btn-danger-confirm');
      }

      btnConfirm.textContent = confirmText;
      btnCancel.textContent = cancelText;
      btnCancel.style.display = showCancel ? 'inline-flex' : 'none';

      // Direct immediate event binding
      btnConfirm.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        closeModernPopup(true);
      };
      btnCancel.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        closeModernPopup(false);
      };
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          e.preventDefault();
          if (!cancelIsDanger && !isWide) {
            closeModernPopup(false);
          }
        }
      };

      // Show immediately directly in body with top-level z-index
      overlay.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; background: rgba(15, 23, 42, 0.75) !important; backdrop-filter: blur(6px) !important; -webkit-backdrop-filter: blur(6px) !important; z-index: 2147483647 !important; display: flex !important; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; align-items: center !important; justify-content: center !important; padding: 20px !important; box-sizing: border-box !important;';
      overlay.classList.add('active');

      setTimeout(() => {
        try { btnConfirm.focus(); } catch (err) {}
      }, 30);
    } catch (err) {
      console.error('Error showing modern popup:', err);
      if (showCancel && _nativeConfirm) {
        return resolve(_nativeConfirm(message));
      }
      if (!showCancel && _nativeAlert) {
        _nativeAlert(message);
      }
      return resolve(true);
    }
  });
}

function showModernAlert(message, options = {}) {
  const opts = typeof options === 'string' ? { title: options } : (options || {});
  return showModernPopup({
    title: opts.title || 'សេចក្តីជូនដំណឹង',
    message: String(message || ''),
    type: opts.type || 'info',
    icon: opts.icon,
    showCancel: false,
    confirmText: opts.confirmText || 'យល់ព្រម',
    isDanger: opts.isDanger || false
  });
}

function showModernConfirm(message, options = {}) {
  const opts = typeof options === 'string' ? { title: options } : (options || {});
  return showModernPopup({
    title: opts.title || 'បញ្ជាក់ការយល់ព្រម',
    message: String(message || ''),
    type: opts.type || 'question',
    icon: opts.icon,
    showCancel: true,
    confirmText: opts.confirmText || 'យល់ព្រម',
    cancelText: opts.cancelText || 'បោះបង់',
    isDanger: opts.isDanger || opts.type === 'danger' || false
  });
}

// Override native window.alert to automatically use Modern Popup
window.alert = function(msg, opts) {
  return showModernAlert(msg, opts);
};

function initModernPopupEvents() {
  ensureModernPopupDOM();

  window.addEventListener('keydown', (e) => {
    const ov = document.getElementById('modernPopupOverlay');
    if (ov && (ov.classList.contains('active') || ov.style.display === 'flex')) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModernPopup(false);
      } else if (e.key === 'Enter') {
        const active = document.activeElement;
        if (active && active.id === 'btnModernPopupCancel') {
          e.preventDefault();
          closeModernPopup(false);
        } else {
          e.preventDefault();
          closeModernPopup(true);
        }
      }
    }
  });
}

// ==============================================================================
// INITIALIZATION & AUTHENTICATION
// ==============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  setReportTableRowPadding(getReportTableRowPadding());
  initModernPopupEvents();
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

  // Render header profile with Khmer role names
  const roleDisplayNames = {
    'Trainer': 'គ្រូប្រចាំក្រុងស្រុក',
    'Commune': 'ឃុំសង្កាត់',
    'SuperAdmin': 'SuperAdmin',
    'Admin': 'Admin',
    'PEC21': 'PEC21'
  };
  const displayRole = roleDisplayNames[currentUser.role] || currentUser.role;
  document.getElementById('userFullName').textContent = currentUser.fullName || currentUser.username;
  document.getElementById('userRoleTag').textContent = `${displayRole} ${currentUser.district !== 'all' ? '(' + currentUser.district + ')' : ''}`;

  // Role permissions UI adjustments
  const stationsNav = document.querySelector('[data-tab="tabPollingStations"]');
  const usersNav = document.getElementById('tabUsersNav');
  const settingsNav = document.getElementById('tabSettingsNav');

  const btnDeleteAll = document.getElementById('btnDeleteAllStations');
  const btnBatchAll = document.getElementById('btnBatchCreateAllStations');
  const btnAddStation = document.getElementById('btnOpenAddStationModal');
  const btnBatchCommune = document.getElementById('btnBatchCreateCommuneStations');

  if (currentUser.role === 'Commune') {
    if (stationsNav) stationsNav.style.display = 'none';
    if (usersNav) usersNav.style.display = 'none';
    if (settingsNav) settingsNav.style.display = 'none';
    const filterBar = document.getElementById('stationFilterBar');
    if (filterBar) filterBar.style.display = 'none';
    if (btnDeleteAll) btnDeleteAll.style.display = 'none';
    if (btnBatchAll) btnBatchAll.style.display = 'none';
    if (btnAddStation) btnAddStation.style.display = 'none';
    if (btnBatchCommune) btnBatchCommune.style.display = 'none';
  } else if (currentUser.role === 'Trainer') {
    if (stationsNav) stationsNav.style.display = 'inline-flex';
    if (usersNav) {
      usersNav.style.display = 'inline-flex';
      usersNav.innerHTML = `👥 គណនីឃុំក្នុង ${currentUser.district}`;
    }
    if (settingsNav) settingsNav.style.display = 'none';
    // Hide crossed-out buttons for Trainer
    if (btnDeleteAll) btnDeleteAll.style.display = 'none';
    if (btnBatchAll) btnBatchAll.style.display = 'none';
    if (btnAddStation) btnAddStation.style.display = 'none';
    if (btnBatchCommune) btnBatchCommune.style.display = 'inline-flex';
  } else {
    if (stationsNav) stationsNav.style.display = 'inline-flex';
    if (usersNav) usersNav.style.display = 'inline-flex';
    if (settingsNav) settingsNav.style.display = 'inline-flex';
    if (btnDeleteAll) btnDeleteAll.style.display = 'inline-flex';
    if (btnBatchAll) btnBatchAll.style.display = 'inline-flex';
    if (btnAddStation) btnAddStation.style.display = 'inline-flex';
    if (btnBatchCommune) btnBatchCommune.style.display = 'inline-flex';
  }
  updateDuplicateBadgeCount();
}

window.handleLoginSubmit = async function(e) {
  if (e) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
  }
  const uInput = document.getElementById('loginUsername');
  const pInput = document.getElementById('loginPassword');
  const errBox = document.getElementById('loginError');
  const btnSubmit = document.getElementById('btnLoginSubmit');

  if (errBox) errBox.style.display = 'none';

  const username = uInput ? uInput.value.trim() : '';
  const password = pInput ? pInput.value.trim() : '';

  if (!username || !password) {
    if (errBox) {
      errBox.textContent = 'សូមបញ្ចូលឈ្មោះគណនី និងលេខសម្ងាត់!';
      errBox.style.display = 'block';
    }
    return false;
  }

  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'កំពុងចូលប្រព័ន្ធ...';
  }

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
      try {
        await loadInitialData();
      } catch (loadErr) {
        console.warn('Initial data load warning:', loadErr);
      }
      if (currentUser.mustChangePassword) {
        openChangePasswordModal(true);
      }
    } else {
      if (errBox) {
        errBox.textContent = data.message || 'Login failed';
        errBox.style.display = 'block';
      }
    }
  } catch (err) {
    if (errBox) {
      errBox.textContent = 'Network error: ' + err.message;
      errBox.style.display = 'block';
    }
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'ចូលប្រព័ន្ធ (Sign In)';
    }
  }
  return false;
};

function setupEventListeners() {
  // Login Form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', window.handleLoginSubmit);
  }

  // Logout
  document.getElementById('btnLogout').addEventListener('click', async () => {
    const ok = await showModernConfirm('តើលោកអ្នកពិតជាចង់ចាកចេញពីប្រព័ន្ធមែនទេ?', {
      title: 'បញ្ជាក់ការចាកចេញ',
      confirmText: 'ចាកចេញ',
      cancelText: 'បោះបង់',
      type: 'warning',
      icon: '🚪'
    });
    if (ok) {
      const u = currentUser ? currentUser.username : '';
      await fetch('/api/logout', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u })
      });
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
      if (targetId === 'tabScoring') renderScoringTableForActiveStation();
      if (targetId === 'tabDuplicates') loadDuplicateCandidatesList();
      if (targetId === 'tabStatistics') loadStatisticsPage();
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
    try {
      if (typeof removePausedBannersBeforePrint === 'function') {
        removePausedBannersBeforePrint();
      }
      if (typeof setupAutoPrintPagination === 'function') {
        setupAutoPrintPagination();
      }
      if (typeof syncReportSignaturesBeforePrint === 'function') {
        syncReportSignaturesBeforePrint();
      }
    } catch (err) {
      console.error('Error preparing print pagination:', err);
    }
    window.print();
  });

  window.addEventListener('beforeprint', () => {
    try {
      if (typeof removePausedBannersBeforePrint === 'function') {
        removePausedBannersBeforePrint();
      }
      if (typeof setupAutoPrintPagination === 'function') {
        setupAutoPrintPagination();
      }
      if (typeof syncReportSignaturesBeforePrint === 'function') {
        syncReportSignaturesBeforePrint();
      }
    } catch (err) {
      console.error('Error in beforeprint pagination:', err);
    }
  });

  // Save Batch Scores
  const btnSaveScores = document.getElementById('btnSaveBatchScores');
  if (btnSaveScores) {
    btnSaveScores.addEventListener('click', async () => {
      await saveBatchScores();
    });
  }

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

  // Commune Interview Schedule Listeners
  const btnSaveReportSchedule = document.getElementById('btnSaveReportInterviewSchedule');
  if (btnSaveReportSchedule) {
    btnSaveReportSchedule.addEventListener('click', () => saveCommuneInterviewSchedule('reports'));
  }
  const btnOpenScheduleModal = document.getElementById('btnOpenCommuneScheduleModal');
  if (btnOpenScheduleModal) {
    btnOpenScheduleModal.addEventListener('click', openCommuneScheduleModal);
  }
  const formCommuneSchedule = document.getElementById('formCommuneSchedule');
  if (formCommuneSchedule) {
    formCommuneSchedule.addEventListener('submit', (e) => {
      e.preventDefault();
      saveCommuneInterviewSchedule('modal');
    });
  }

  // Manual Scoring Sync Button
  const btnManualSyncScoring = document.getElementById('btnManualScoringSync');
  if (btnManualSyncScoring) {
    btnManualSyncScoring.addEventListener('click', async () => {
      const orig = btnManualSyncScoring.innerHTML;
      btnManualSyncScoring.disabled = true;
      btnManualSyncScoring.innerHTML = '⏳ កំពុង Sync...';
      try {
        await renderScoringTableForActiveStation();
        showModernAlert('បានធ្វើសមកាលកម្មទិន្នន័យ (Sync) ពី Server ជោគជ័យ!');
      } catch (err) {
        showModernAlert('មិនអាច Sync បានទេ៖ ' + err.message);
      } finally {
        btnManualSyncScoring.disabled = false;
        btnManualSyncScoring.innerHTML = orig;
      }
    });
  }

  // Window focus listener to auto-sync latest data when user returns to this browser tab
  window.addEventListener('focus', () => {
    const tabScoring = document.getElementById('tabScoring');
    if (tabScoring && tabScoring.classList.contains('active')) {
      const active = document.activeElement;
      if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'SELECT' && active.tagName !== 'TEXTAREA')) {
        renderScoringTableForActiveStation();
      }
    }
  });

  // Start periodic background auto-sync
  startScoringAutoSync();

  // Settings Save & Google Sync
  const btnSaveSettings = document.getElementById('btnSaveSettings');
  if (btnSaveSettings) btnSaveSettings.addEventListener('click', handleSaveSettings);

  const btnManualSync = document.getElementById('btnManualGoogleSync');
  if (btnManualSync) btnManualSync.addEventListener('click', handleManualGoogleSync);

  // Telegram Test Notification Button
  const btnTestTelegram = document.getElementById('btnTestTelegram');
  if (btnTestTelegram) {
    btnTestTelegram.addEventListener('click', async () => {
      const botToken = document.getElementById('settingTelegramBotToken')?.value.trim() || '';
      const chatId = document.getElementById('settingTelegramChatId')?.value.trim() || '';
      const resultSpan = document.getElementById('telegramTestResult');

      if (!botToken || !chatId) {
        alert('⚠️ សូមបញ្ចូល Telegram Bot Token និង Chat ID ជាមុនសិន!');
        return;
      }

      btnTestTelegram.disabled = true;
      btnTestTelegram.textContent = 'កំពុងផ្ញើសារតេស្ត...';
      if (resultSpan) {
        resultSpan.style.display = 'inline';
        resultSpan.style.color = '#0284c7';
        resultSpan.textContent = '⏳ កំពុងតភ្ជាប់...';
      }

      try {
        const res = await fetch('/api/test-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botToken, chatId })
        });
        const data = await res.json();
        if (data.success) {
          if (resultSpan) {
            resultSpan.style.color = '#16a34a';
            resultSpan.textContent = '✅ ' + data.message;
          }
          alert('✅ ' + data.message);
        } else {
          if (resultSpan) {
            resultSpan.style.color = '#dc2626';
            resultSpan.textContent = '❌ ' + data.message;
          }
          alert('❌ ' + data.message);
        }
      } catch (err) {
        if (resultSpan) {
          resultSpan.style.color = '#dc2626';
          resultSpan.textContent = '❌ ' + err.message;
        }
        alert('❌ កំហុស៖ ' + err.message);
      } finally {
        btnTestTelegram.disabled = false;
        btnTestTelegram.textContent = '🔔 សាកល្បងផ្ញើសារ Telegram (Test Notification)';
      }
    });
  }

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

  // Initialize Excel Spreadsheet Engine (Arrows, Enter, Copy/Paste)
  initScoringTableExcelEngine();

  // Delete All Stations Button
  const btnDeleteAllStations = document.getElementById('btnDeleteAllStations');
  if (btnDeleteAllStations) {
    btnDeleteAllStations.addEventListener('click', async () => {
      if (!allPollingStations.length) {
        alert('គ្មានការិយាល័យបោះឆ្នោតសម្រាប់លុបឡើយ!');
        return;
      }
      const confirmMsg = '⚠️ តើលោកអ្នកពិតជាចង់លុបការិយាល័យបោះឆ្នោតទាំងអស់មែនទេ?\n\n(ទិន្នន័យបេក្ខជនទាំងអស់ដែលនៅក្នុងការិយាល័យទាំងនោះក៏នឹងត្រូវលុបចេញផងដែរ)';
      if (!await showModernConfirm(confirmMsg, {
        title: 'លុបការិយាល័យទាំងអស់',
        confirmText: 'លុបទាំងអស់',
        type: 'danger',
        isDanger: true
      })) return;

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
      if (!await showModernConfirm(confirmMsg, {
        title: 'Reset សម្អាតទិន្នន័យទាំងអស់',
        confirmText: 'Reset ទាំងអស់',
        type: 'danger',
        isDanger: true
      })) return;

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
      if (!await showModernConfirm('តើលោកអ្នកពិតជាចង់បង្កើត/ស្តារការិយាល័យបោះឆ្នោតទាំងអស់ទាំង ១,៦០៣ ការិយាល័យក្នុងខេត្តតាកែវមែនទេ?', {
        title: 'បង្កើតគ្រប់ការិយាល័យ',
        confirmText: 'បង្កើតភ្លាមៗ',
        type: 'info',
        icon: '🌐'
      })) {
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

function fromKhmerNum(str) {
  if (str === null || str === undefined || str === '') return '';
  const khmerDigits = { '០': '0', '១': '1', '២': '2', '៣': '3', '៤': '4', '៥': '5', '៦': '6', '៧': '7', '៨': '8', '៩': '9' };
  return String(str).replace(/[០-៩]/g, d => khmerDigits[d]);
}

function formatKhmerPhoneNumber(val) {
  if (!val) return '';
  const eng = fromKhmerNum(String(val)).replace(/[^0-9]/g, '').slice(0, 10);
  if (!eng) return '';
  let formatted = '';
  if (eng.length <= 3) {
    formatted = eng;
  } else if (eng.length <= 6) {
    formatted = `${eng.slice(0, 3)} ${eng.slice(3)}`;
  } else if (eng.length <= 9) {
    formatted = `${eng.slice(0, 3)} ${eng.slice(3, 6)} ${eng.slice(6)}`;
  } else {
    formatted = `${eng.slice(0, 3)} ${eng.slice(3, 6)} ${eng.slice(6, 10)}`;
  }
  return toKhmerNum(formatted);
}

function formatKhmerDate(val) {
  if (!val) return '';
  let clean = String(val).replace(/\//g, '-');
  clean = toKhmerNum(clean);
  clean = clean.replace(/[^០-៩\-]/g, '').replace(/-{2,}/g, '-');
  const digitsOnly = fromKhmerNum(clean).replace(/[^0-9]/g, '');
  if (!clean.includes('-')) {
    if (digitsOnly.length >= 8) {
      clean = toKhmerNum(`${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 4)}-${digitsOnly.slice(4, 8)}`);
    }
  } else {
    const parts = clean.split('-');
    if (parts.length > 3) {
      clean = parts.slice(0, 3).join('-');
    }
  }
  return clean;
}

// Official NEC Score Calculation Presets for Degree & Experience:
// - Degree (ប្រអប់ទី១): គ្មាន=0, បឋមភូមិ=0, ទុតិយភូមិ=5, បរិញ្ញាបត្រ ឬបរិញ្ញាបត្រជាន់ខ្ពស់=8
function computeDegreeScore(str) {
  if (!str) return 0;
  const s = String(str).trim();
  if (s.includes('បរិញ្ញាបត្រ') || s.includes('ជាន់ខ្ពស់') || s.includes('បណ្ឌិត')) {
    return 8;
  }
  if (s.includes('ទុតិយភូមិ') || s.includes('បាក់ឌុប')) {
    return 5;
  }
  if (s.includes('បឋមភូមិ') || s.includes('ឌីប្លូម') || s.includes('ក្រោម') || s.includes('គ្មាន')) {
    return 0;
  }
  return 0;
}

// - Experience (ប្រអប់ទី២): គ្មាន=0, ការិយាល័យ១ដង=4, ការិយាល័យ២ដង=8, ការិយាល័យ៣ដង ឬច្រើនជាងនេះ=12
function computeExpScore(str) {
  if (!str) return 0;
  const s = String(str).trim();
  if (s.includes('៣ដង') || s.includes('3ដង') || s.includes('3 ដង') || s.includes('ច្រើន') || s.includes('៤ដង') || s.includes('4ដង') || s.includes('៥ដង') || s.includes('5ដង')) {
    return 12;
  }
  if (s.includes('២ដង') || s.includes('2ដង') || s.includes('2 ដង')) {
    return 8;
  }
  if (s.includes('១ដង') || s.includes('1ដង') || s.includes('1 ដង')) {
    return 4;
  }
  if (s.includes('គ្មាន')) {
    return 0;
  }
  return 0;
}

function getDistrictPrefix(districtName) {
  if (!districtName) return '';
  const clean = String(districtName).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
  if (clean === 'ដូនកែវ') {
    return 'ក្រុងដូនកែវ';
  }
  return `ស្រុក${clean}`;
}

// Official NEC Takeo Province 10 Districts Administrative Order
function getTakeoDistrictOrder(districtName) {
  if (!districtName) return 999;
  const clean = String(districtName).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
  if (clean.includes('អង្គរ')) return 0;
  if (clean.includes('បាទី')) return 1;
  if (clean.includes('បូរី')) return 2;
  if (clean.includes('គិរី') || clean.includes('គីរី')) return 3;
  if (clean.includes('កោះ')) return 4;
  if (clean.includes('ព្រៃ')) return 5;
  if (clean.includes('សំរោង')) return 6;
  if (clean.includes('ដូនកែវ')) return 7;
  if (clean.includes('ត្រាំ')) return 8;
  if (clean.includes('ទ្រាំង')) return 9;
  return 999;
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
// LOCAL STORAGE AUTO-BACKUP & DISASTER RECOVERY ENGINE
// ==============================================================================
const LOCAL_BACKUP_KEY = 'pec21_kkb_candidates_backup';

function backupStationCandidatesToLocalStorage(stationId, candidates) {
  if (!candidates || !Array.isArray(candidates)) return;
  try {
    let backupMap = {};
    const stored = localStorage.getItem(LOCAL_BACKUP_KEY);
    if (stored) {
      try { backupMap = JSON.parse(stored) || {}; } catch(e) { backupMap = {}; }
    }
    candidates.forEach(c => {
      if (!c || !c.name || !c.name.trim()) return;
      const key = `${c.pollingStationId || stationId}_${c.role}_${c.orderInRole}`;
      backupMap[key] = {
        id: c.id && !c.id.startsWith('temp_') ? c.id : undefined,
        pollingStationId: c.pollingStationId || stationId,
        role: c.role,
        orderInRole: c.orderInRole,
        name: c.name.trim(),
        gender: c.gender || 'ប',
        dob: c.dob || '',
        phone: c.phone || '',
        degree: c.degree || '',
        scoreDegree: c.scoreDegree || 0,
        experience: c.experience || '',
        scoreExp: c.scoreExp || 0,
        scoreInterview: c.scoreInterview || '',
        status: c.status || '',
        rank: c.rank || c.orderInRole
      };
    });
    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(backupMap));
    localStorage.setItem('pec21_kkb_backup_last_time', new Date().toISOString());
  } catch (err) {
    console.warn('[LocalStorage Backup] Could not save:', err);
  }
}

function getAllLocalBackupCandidates() {
  try {
    const stored = localStorage.getItem(LOCAL_BACKUP_KEY);
    if (!stored) return [];
    const map = JSON.parse(stored) || {};
    return Object.values(map).filter(c => c && c.name && c.name.trim());
  } catch (e) {
    return [];
  }
}

async function restoreAllCandidatesFromBrowser() {
  const localCandidates = getAllLocalBackupCandidates();
  if (!localCandidates.length) {
    alert('មិនមានទិន្នន័យបម្រុងទុកនៅក្នុង Browser នេះឡើយ!');
    return;
  }
  if (!await showModernConfirm(`តើលោកអ្នកពិតជាចង់ស្ដារបេក្ខជនចំនួន ${localCandidates.length} នាក់ដែលបានរក្សាទុកក្នុង Browser នេះចូលក្នុងប្រព័ន្ធវិញមែនទេ?`, {
    title: 'ស្ដារបេក្ខជនពី Browser',
    confirmText: 'ស្ដារទិន្នន័យ',
    type: 'info',
    icon: '🔄'
  })) {
    return;
  }

  const bannerBtn = document.getElementById('btnRestoreBrowserBackup');
  if (bannerBtn) {
    bannerBtn.disabled = true;
    bannerBtn.textContent = '⏳ កំពុងស្ដារទិន្នន័យ...';
  }

  try {
    const res = await fetch('/api/candidates/batch-restore-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidates: localCandidates })
    });
    const result = await res.json();
    if (result.success) {
      alert(`🎉 ជោគជ័យ! ${result.message}`);
      const banner = document.getElementById('browserRecoveryBanner');
      if (banner) banner.remove();
      await loadDashboardStats();
      if (document.getElementById('scoringStationSelect')?.value) {
        await renderScoringTableForActiveStation();
      }
    } else {
      alert('កំហុស៖ ' + result.message);
      if (bannerBtn) {
        bannerBtn.disabled = false;
        bannerBtn.textContent = `🔄 ស្ដារទិន្នន័យបេក្ខជនទាំងអស់ឡើងវិញ (${localCandidates.length} នាក់)`;
      }
    }
  } catch (err) {
    alert('Network error: ' + err.message);
    if (bannerBtn) {
      bannerBtn.disabled = false;
      bannerBtn.textContent = `🔄 ស្ដារទិន្នន័យបេក្ខជនទាំងអស់ឡើងវិញ (${localCandidates.length} នាក់)`;
    }
  }
}
window.restoreAllCandidatesFromBrowser = restoreAllCandidatesFromBrowser;

function checkAndShowBrowserRecoveryBanner(serverCandidateCount) {
  const localCandidates = getAllLocalBackupCandidates();
  const existingBanner = document.getElementById('browserRecoveryBanner');
  
  if (serverCandidateCount === 0 && localCandidates.length > 0) {
    if (!existingBanner) {
      const banner = document.createElement('div');
      banner.id = 'browserRecoveryBanner';
      banner.style.cssText = `
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border: 2px solid #f59e0b;
        border-radius: 12px;
        padding: 16px 20px;
        margin: 15px 0 25px 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
      `;
      banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="font-size: 32px;">🛡️</div>
          <div>
            <div style="font-size: 15px; font-weight: 700; color: #92400e; margin-bottom: 3px;">
              ប្រព័ន្ធរកឃើញទិន្នន័យបម្រុងទុកសុវត្ថិភាពក្នុង Browser (${toKhmerNum(localCandidates.length)} នាក់)!
            </div>
            <div style="font-size: 13px; color: #78350f;">
              បន្ទាប់ពីការ Update ប្រព័ន្ធ ឬ Server Restart, លោកអ្នកអាចស្ដារទិន្នន័យបេក្ខជនទាំងអស់ដែលធ្លាប់បានបញ្ចូលឡើងវិញដោយគ្រាន់តែចុចប៊ូតុងខាងក្រោម ៖
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 10px; align-items: center; flex-shrink: 0;">
          <button id="btnRestoreBrowserBackup" onclick="restoreAllCandidatesFromBrowser()" style="
            background: #d97706;
            color: white;
            border: none;
            padding: 10px 18px;
            font-size: 14px;
            font-weight: 700;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(217, 119, 6, 0.4);
            display: inline-flex;
            align-items: center;
            gap: 6px;
          ">
            🔄 ស្ដារទិន្នន័យបេក្ខជនទាំងអស់ឡើងវិញ (${toKhmerNum(localCandidates.length)} នាក់)
          </button>
          <button onclick="document.getElementById('browserRecoveryBanner').remove()" style="
            background: transparent;
            border: 1px solid #d97706;
            color: #92400e;
            padding: 10px 14px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
          ">
            ✕ បិទ
          </button>
        </div>
      `;
      const tab1 = document.getElementById('tabDashboard');
      if (tab1) {
        tab1.insertBefore(banner, tab1.firstChild);
      }
    }
  } else if (existingBanner && serverCandidateCount > 0) {
    existingBanner.remove();
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
    checkAndShowBrowserRecoveryBanner(s.totalCandidates);
    document.getElementById('dashTotalCandidates').textContent = toKhmerNum(s.totalCandidates);
    document.getElementById('dashTotalStations').textContent = toKhmerNum(s.totalPollingStations);
    document.getElementById('dashTotalPassed').textContent = toKhmerNum(s.totalPassed);
    if (document.getElementById('dashTotalReserveB')) {
      document.getElementById('dashTotalReserveB').textContent = toKhmerNum(s.totalReserveB !== undefined ? s.totalReserveB : s.totalReserve);
    }
    if (document.getElementById('dashTotalReserveC')) {
      document.getElementById('dashTotalReserveC').textContent = toKhmerNum(s.totalReserveC !== undefined ? s.totalReserveC : 0);
    }
    if (document.getElementById('dashTotalReserve')) {
      document.getElementById('dashTotalReserve').textContent = toKhmerNum(s.totalReserve);
    }
    document.getElementById('dashTotalAbsent').textContent = toKhmerNum(s.totalAbsent);

    const titleEl = document.querySelector('#tabDashboard .card-header .card-title');
    const theadEl = document.querySelector('#tabDashboard table.table-custom thead');
    const tbody = document.getElementById('districtStatsTableBody');
    tbody.innerHTML = '';

    // 1. Role: Commune -> Show Polling Stations in this Commune
    if (currentUser && currentUser.role === 'Commune') {
      const comPrefix = getCommunePrefix(currentUser.communeName, currentUser.district);
      const comCode3 = toKhmerNum(String(currentUser.communeCode || '').padStart(3, '0'));
      if (titleEl) {
        titleEl.textContent = `📈 ស្ថិតិបេក្ខជនតាមឃុំសង្កាត់ ៖ ${comPrefix} (${comCode3})`;
      }
      if (theadEl) {
        theadEl.innerHTML = `
          <tr>
            <th style="width: 50px; text-align: center;">ល.រ</th>
            <th style="min-width: 150px;">ការិយាល័យបោះឆ្នោត</th>
            <th style="min-width: 170px;">ទីតាំងការិយាល័យ</th>
            <th style="text-align: center; width: 100px;">បេក្ខជនសរុប</th>
            <th style="text-align: center; width: 80px;">A-ជាប់</th>
            <th style="text-align: center; width: 80px;">B-បម្រុង</th>
            <th style="text-align: center; width: 90px;">C-បម្រុងបន្ទាប់</th>
            <th style="text-align: center; width: 80px;">អវត្តមាន</th>
          </tr>
        `;
      }

      const stationsList = s.byStation || [];
      stationsList.forEach((st, idx) => {
        const c4Khmer = toKhmerNum(st.code);
        tbody.innerHTML += `
          <tr>
            <td style="text-align: center;">${toKhmerNum(idx + 1)}</td>
            <td style="font-weight: 600;">ការិយាល័យ ${c4Khmer}</td>
            <td style="color: var(--text-muted);">${st.location || '-'}</td>
            <td style="text-align: center; font-weight: 700;">${toKhmerNum(st.candidateCount)}</td>
            <td style="text-align: center;"><span class="badge badge-passed">${toKhmerNum(st.passedCount)}</span></td>
            <td style="text-align: center;"><span class="badge badge-reserve">${toKhmerNum(st.reserveBCount)}</span></td>
            <td style="text-align: center;"><span class="badge badge-reserve2">${toKhmerNum(st.reserveCCount)}</span></td>
            <td style="text-align: center;"><span class="badge badge-absent">${toKhmerNum(st.absentCount)}</span></td>
          </tr>
        `;
      });
      return;
    }

    // 2. Role: Trainer -> Show Communes in this District
    if (currentUser && currentUser.role === 'Trainer') {
      const distPrefix = getDistrictPrefix(currentUser.district);
      if (titleEl) {
        titleEl.textContent = `📈 ស្ថិតិបេក្ខជនតាមឃុំ-សង្កាត់ក្នុង ${distPrefix}`;
      }
      if (theadEl) {
        theadEl.innerHTML = `
          <tr>
            <th style="width: 50px; text-align: center;">ល.រ</th>
            <th>ឃុំ/សង្កាត់</th>
            <th style="text-align: center;">ការិយាល័យ</th>
            <th style="text-align: center;">បេក្ខជនសរុប</th>
            <th style="text-align: center;">A-ជាប់</th>
            <th style="text-align: center;">B-បម្រុង</th>
            <th style="text-align: center;">C-បម្រុងបន្ទាប់</th>
            <th style="text-align: center;">អវត្តមាន</th>
          </tr>
        `;
      }

      const comList = s.byCommune || [];
      comList.forEach((c, idx) => {
        const prefix = getCommunePrefix(c.communeName, c.district);
        tbody.innerHTML += `
          <tr>
            <td style="text-align: center;">${toKhmerNum(idx + 1)}</td>
            <td style="font-weight: 600;">${prefix} (${toKhmerNum(c.communeCode)})</td>
            <td style="text-align: center;">${toKhmerNum(c.pollingStationCount)}</td>
            <td style="text-align: center; font-weight: 700;">${toKhmerNum(c.candidateCount)}</td>
            <td style="text-align: center;"><span class="badge badge-passed">${toKhmerNum(c.passedCount)}</span></td>
            <td style="text-align: center;"><span class="badge badge-reserve">${toKhmerNum(c.reserveBCount)}</span></td>
            <td style="text-align: center;"><span class="badge badge-reserve2">${toKhmerNum(c.reserveCCount)}</span></td>
            <td style="text-align: center;"><span class="badge badge-absent">${toKhmerNum(c.absentCount)}</span></td>
          </tr>
        `;
      });
      return;
    }

    // 3. Default: SuperAdmin / Admin / PEC21 -> Show Statistics By District
    if (titleEl) {
      titleEl.textContent = '📈 ស្ថិតិបេក្ខជនតាមក្រុង-ស្រុក (Statistics By District)';
    }
    if (theadEl) {
      theadEl.innerHTML = `
        <tr>
          <th style="width: 50px; text-align: center;">ល.រ</th>
          <th>ក្រុង-ស្រុក</th>
          <th style="text-align: center;">ការិយាល័យ</th>
          <th style="text-align: center;">បេក្ខជនសរុប</th>
          <th style="text-align: center;">A-ជាប់</th>
          <th style="text-align: center;">B-បម្រុង</th>
          <th style="text-align: center;">C-បម្រុងបន្ទាប់</th>
          <th style="text-align: center;">អវត្តមាន</th>
        </tr>
      `;
    }

    (s.byDistrict || []).forEach((d, idx) => {
      const resB = d.reserveBCount !== undefined ? d.reserveBCount : d.reserveCount;
      const resC = d.reserveCCount !== undefined ? d.reserveCCount : 0;
      tbody.innerHTML += `
        <tr>
          <td style="text-align: center;">${toKhmerNum(idx + 1)}</td>
          <td style="font-weight: 600;">${d.district}</td>
          <td style="text-align: center;">${toKhmerNum(d.pollingStationCount)}</td>
          <td style="text-align: center; font-weight: 700;">${toKhmerNum(d.candidateCount)}</td>
          <td style="text-align: center;"><span class="badge badge-passed">${toKhmerNum(d.passedCount)}</span></td>
          <td style="text-align: center;"><span class="badge badge-reserve">${toKhmerNum(resB)}</span></td>
          <td style="text-align: center;"><span class="badge badge-reserve2">${toKhmerNum(resC)}</span></td>
          <td style="text-align: center;"><span class="badge badge-absent">${toKhmerNum(d.absentCount)}</span></td>
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
    if (currentUser && currentUser.role === 'Trainer') {
      const distName = getDistrictPrefix(currentUser.district);
      if (!await showModernConfirm(`លោកអ្នកមិនទាន់បានជ្រើសរើសឃុំ-សង្កាត់ជាក់លាក់ណាមួយឡើយ។\nតើលោកអ្នកពិតជាចង់បង្កើត/ស្តារការិយាល័យបោះឆ្នោតផ្លូវការទាំងអស់ក្នុង${distName} មែនទេ?`, {
        title: `បង្កើតការិយាល័យក្នុង${distName}`,
        confirmText: 'បង្កើតទាំងអស់',
        type: 'info',
        icon: '🏛️'
      })) {
        return;
      }
      try {
        const res = await fetch('/api/polling-stations/batch-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ district: currentUser.district })
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
      } catch (err) {
        alert('Network error: ' + err.message);
      }
      return;
    }
    alert('សូមជ្រើសរើសឃុំ-សង្កាត់ជាមុនសិន!');
    return;
  }

  const paddedCom = String(comCode).padStart(3, '0');
  const comObj = allCommunes.find(c => String(c.code).padStart(3, '0') === paddedCom);
  const comName = comObj ? comObj.name : comCode;

  if (!await showModernConfirm(`តើលោកអ្នកពិតជាចង់បង្កើត/ទាញយកការិយាល័យបោះឆ្នោតទាំងអស់ក្នុងឃុំ «${comName}» ដោយស្វ័យប្រវត្តិតាមស្ថិតិផ្លូវការមែនទេ?`, {
    title: `បង្កើតការិយាល័យឃុំ «${comName}»`,
    confirmText: 'បង្កើតការិយាល័យ',
    type: 'info',
    icon: '🏛️'
  })) {
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

  const isTrainer = currentUser && currentUser.role === 'Trainer';
  const thActions = document.getElementById('thStationActions');
  if (thActions) thActions.style.display = isTrainer ? 'none' : '';
  const colSpan = isTrainer ? 6 : 7;

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

  // Dynamic Enable/Disable of btnBatchCreateCommuneStations
  const btnBatchCommune = document.getElementById('btnBatchCreateCommuneStations');
  if (btnBatchCommune) {
    let isComplete = false;
    let curStCount = 0;
    let offStCount = 0;

    if (filterCom) {
      const paddedCom = String(filterCom).padStart(3, '0');
      const comObj = allCommunes.find(c => String(c.code).padStart(3, '0') === paddedCom);
      curStCount = allPollingStations.filter(p => String(p.communeCode).padStart(3, '0') === paddedCom).length;
      offStCount = comObj?.officialStationCount || 0;
      isComplete = (offStCount > 0 && curStCount >= offStCount);
    } else if (currentUser && currentUser.role === 'Trainer') {
      const uDistClean = String(currentUser.district || '').trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      curStCount = allPollingStations.filter(p => String(p.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '') === uDistClean).length;
      const distComs = allCommunes.filter(c => String(c.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '') === uDistClean);
      offStCount = distComs.reduce((sum, c) => sum + (c.officialStationCount || 0), 0);
      isComplete = (offStCount > 0 && curStCount >= offStCount);
    }

    if (isComplete) {
      btnBatchCommune.disabled = true;
      btnBatchCommune.style.opacity = '0.55';
      btnBatchCommune.style.cursor = 'not-allowed';
      btnBatchCommune.title = `ការិយាល័យបោះឆ្នោតទាំងអស់មានគ្រប់ចំនួនរួចរាល់ហើយ (${toKhmerNum(curStCount)}/${toKhmerNum(offStCount)})`;
      btnBatchCommune.innerHTML = `✅ មានការិយាល័យគ្រប់ចំនួន (${toKhmerNum(curStCount)})`;
    } else {
      btnBatchCommune.disabled = false;
      btnBatchCommune.style.opacity = '1';
      btnBatchCommune.style.cursor = 'pointer';
      btnBatchCommune.title = 'បង្កើតការិយាល័យទាំងអស់ក្នុងឃុំដែលបានជ្រើសរើសដោយស្វ័យប្រវត្តិតាមស្ថិតិផ្លូវការ';
      btnBatchCommune.innerHTML = '⚡ បង្កើតការិយាល័យទាំងអស់ក្នុងឃុំនេះ';
    }
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
          <td colspan="${colSpan}" style="text-align: center; padding: 36px 16px;">
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
      tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; color: var(--text-muted); padding: 24px;">រកមិនឃើញការិយាល័យបោះឆ្នោតតាមលក្ខខណ្ឌស្វែងរកនេះឡើយ។</td></tr>`;
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
    const actionsTd = isTrainer ? '' : `
      <td style="text-align: center; white-space: nowrap;">
        <div class="table-actions-nowrap" style="display: inline-flex; flex-direction: row; flex-wrap: nowrap; gap: 4px; align-items: center; justify-content: center;">
          <button class="btn btn-secondary btn-sm" onclick="selectStationForScoring('${ps.id}')" title="បញ្ចូលពិន្ទុ" style="white-space: nowrap; padding: 4px 8px; font-weight: 600;">📝 ពិន្ទុ</button>
          <button class="btn btn-secondary btn-sm" onclick="editStation('${ps.id}')" title="កែប្រែ" style="padding: 4px 8px;">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStation('${ps.id}')" title="លុប" style="padding: 4px 8px;">🗑️</button>
        </div>
      </td>
    `;

    tbody.innerHTML += `
      <tr>
        <td style="text-align: center; font-weight: 700;">${String(ps.code || '').padStart(4, '0')}</td>
        <td style="font-weight: 600; color: var(--primary);">${ps.name}</td>
        <td>${comLabel}</td>
        <td>${distLabel}</td>
        <td>${ps.location || '---'}</td>
        <td style="text-align: center;"><span class="badge badge-passed">${ps.candidateCount || 0} នាក់</span></td>
        ${actionsTd}
      </tr>
    `;
  });

  if (filtered.length > displayLimit) {
    tbody.innerHTML += `
      <tr style="background: #f8fafc; font-style: italic; color: #64748b; text-align: center;">
        <td colspan="${colSpan}" style="padding: 12px;">
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
  const ok = await showModernConfirm(`តើលោកអ្នកពិតជាចង់លុប "${ps.name}" និងទិន្នន័យបេក្ខជនទាំងអស់មែនទេ?`, {
    title: 'លុបការិយាល័យបោះឆ្នោត',
    confirmText: 'លុបការិយាល័យ',
    type: 'danger',
    isDanger: true
  });
  if (ok) {
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

// ==============================================================================
// EXCEL-LIKE SPREADSHEET ENGINE FOR SCORING TABLE (Arrows, Enter, Copy & Paste)
// ==============================================================================

const EXCEL_SCORING_COLS = [
  '.cand-name',         // Col 0: គោត្តនាម-នាម
  '.cand-gender',       // Col 1: ភេទ
  '.cand-dob',          // Col 2: ថ្ងៃ ខែ ឆ្នាំកំណើត
  '.cand-phone',        // Col 3: លេខទូរសព្ទ
  '.cand-degree',       // Col 4: កម្រិតសញ្ញាបត្រ
  '.cand-score-degree', // Col 5: ពិន្ទុសម្រាំង
  '.cand-exp',          // Col 6: បទពិសោធន៍
  '.cand-score-exp',    // Col 7: ពិន្ទុបទពិសោធន៍
  '.cand-interview'     // Col 8: សម្ភាសន៍ (0-20 ឬ អវត្តមាន)
];

function initScoringTableExcelEngine() {
  const table = document.getElementById('scoringTable');
  if (!table || table.hasAttribute('data-excel-engine-init')) return;
  table.setAttribute('data-excel-engine-init', 'true');

  // 1. Keyboard Navigation (Enter, Shift+Enter, Tab, Shift+Tab, ArrowUp, ArrowDown, ArrowLeft, ArrowRight)
  table.addEventListener('keydown', handleScoringTableKeyDown);

  // 2. Excel TSV Copy & Paste handler
  table.addEventListener('paste', handleScoringTablePaste);

  // 3. Highlight active row when focusing inside table
  table.addEventListener('focusin', (e) => {
    const target = e.target.closest('.excel-cell-input, .excel-cell-select');
    if (target) {
      const tr = target.closest('tr[data-cand-id]');
      highlightActiveScoringRow(tr);
    }
  });

  // 4. Auto select text on focus for quick typing
  table.addEventListener('focus', (e) => {
    const target = e.target.closest('.excel-cell-input');
    if (target && typeof target.select === 'function') {
      setTimeout(() => {
        try { target.select(); } catch (err) {}
      }, 10);
    }
  }, true);
}

function highlightActiveScoringRow(tr) {
  document.querySelectorAll('#scoringTableBody tr.excel-row-active').forEach(r => r.classList.remove('excel-row-active'));
  if (tr) tr.classList.add('excel-row-active');
}

function isCaretAtStart(input) {
  try {
    if (input.tagName === 'SELECT') return true;
    if (input.selectionStart !== null && input.selectionStart !== undefined) {
      return input.selectionStart === 0;
    }
  } catch (e) {}
  return true;
}

function isCaretAtEnd(input) {
  try {
    if (input.tagName === 'SELECT') return true;
    if (input.selectionEnd !== null && input.selectionEnd !== undefined) {
      return input.selectionEnd === String(input.value || '').length;
    }
  } catch (e) {}
  return true;
}

function handleScoringTableKeyDown(e) {
  const target = e.target.closest('.excel-cell-input, .excel-cell-select');
  if (!target) return;

  const currentTr = target.closest('tr[data-cand-id]');
  if (!currentTr) return;

  const allRows = Array.from(document.querySelectorAll('#scoringTableBody tr[data-cand-id]'));
  const rowIdx = allRows.indexOf(currentTr);
  const colIdx = EXCEL_SCORING_COLS.findIndex(sel => target.matches(sel));
  if (rowIdx === -1 || colIdx === -1) return;

  const focusCell = (r, c) => {
    if (r < 0 || r >= allRows.length || c < 0 || c >= EXCEL_SCORING_COLS.length) return false;
    const targetRow = allRows[r];
    const targetEl = targetRow.querySelector(EXCEL_SCORING_COLS[c]);
    if (targetEl) {
      targetEl.focus();
      if (typeof targetEl.select === 'function') {
        try { targetEl.select(); } catch (err) {}
      }
      highlightActiveScoringRow(targetRow);
      return true;
    }
    return false;
  };

  // 1. Enter key -> Moves row DOWN (or UP with Shift)
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) {
      focusCell(rowIdx - 1, colIdx);
    } else {
      focusCell(rowIdx + 1, colIdx);
    }
    return;
  }

  // 2. Tab key -> Moves column RIGHT (or LEFT with Shift)
  if (e.key === 'Tab') {
    if (e.shiftKey) {
      if (colIdx === 0 && rowIdx > 0) {
        e.preventDefault();
        focusCell(rowIdx - 1, EXCEL_SCORING_COLS.length - 1);
      }
    } else {
      if (colIdx === EXCEL_SCORING_COLS.length - 1 && rowIdx < allRows.length - 1) {
        e.preventDefault();
        focusCell(rowIdx + 1, 0);
      }
    }
    return;
  }

  // 3. ArrowUp -> Moves row UP
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    focusCell(rowIdx - 1, colIdx);
    return;
  }

  // 4. ArrowDown -> Moves row DOWN
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    focusCell(rowIdx + 1, colIdx);
    return;
  }

  // 5. ArrowLeft -> Moves column LEFT if at start of text or select
  if (e.key === 'ArrowLeft') {
    if (isCaretAtStart(target)) {
      e.preventDefault();
      focusCell(rowIdx, colIdx - 1);
    }
    return;
  }

  // 6. ArrowRight -> Moves column RIGHT if at end of text or select
  if (e.key === 'ArrowRight') {
    if (isCaretAtEnd(target)) {
      e.preventDefault();
      focusCell(rowIdx, colIdx + 1);
    }
    return;
  }
}

window.onCandidateNameKeyDown = function(e, input) {
  handleScoringTableKeyDown(e);
};

function handleScoringTablePaste(e) {
  const target = e.target.closest('.excel-cell-input, .excel-cell-select');
  if (!target) return;

  const currentTr = target.closest('tr[data-cand-id]');
  if (!currentTr) return;

  const allRows = Array.from(document.querySelectorAll('#scoringTableBody tr[data-cand-id]'));
  const startRowIdx = allRows.indexOf(currentTr);
  const startColIdx = EXCEL_SCORING_COLS.findIndex(sel => target.matches(sel));
  if (startRowIdx === -1 || startColIdx === -1) return;

  const text = (e.clipboardData || window.clipboardData)?.getData('text');
  if (!text) return;

  // Intercept TSV / Multi-line data copied from Excel or Google Sheets
  if (text.includes('\t') || text.includes('\n') || text.includes('\r')) {
    e.preventDefault();

    const rawLines = text.split(/\r\n|\n|\r/);
    while (rawLines.length && rawLines[rawLines.length - 1].trim() === '') {
      rawLines.pop();
    }
    if (!rawLines.length) return;

    for (let r = 0; r < rawLines.length; r++) {
      const rowIdx = startRowIdx + r;
      if (rowIdx >= allRows.length) break;

      const tr = allRows[rowIdx];
      const cells = rawLines[r].split('\t');

      for (let c = 0; c < cells.length; c++) {
        const colIdx = startColIdx + c;
        if (colIdx >= EXCEL_SCORING_COLS.length) break;

        const inputEl = tr.querySelector(EXCEL_SCORING_COLS[colIdx]);
        if (!inputEl) continue;

        let rawVal = cells[c].trim();

        if (inputEl.classList.contains('cand-gender')) {
          const lower = rawVal.toLowerCase();
          if (rawVal.includes('ស') || lower === 'f' || lower === 'female' || rawVal.includes('ស្រី')) {
            inputEl.value = 'ស';
          } else {
            inputEl.value = 'ប';
          }
        } else if (inputEl.classList.contains('cand-dob')) {
          inputEl.value = formatKhmerDate(rawVal);
        } else if (inputEl.classList.contains('cand-phone')) {
          inputEl.value = formatKhmerPhoneNumber(rawVal);
        } else if (inputEl.classList.contains('cand-score-degree') || inputEl.classList.contains('cand-score-exp')) {
          const num = parseFloat(fromKhmerNum(rawVal));
          inputEl.value = toKhmerNum(isNaN(num) ? 0 : num);
        } else if (inputEl.classList.contains('cand-interview')) {
          inputEl.value = sanitizeInterviewInput(rawVal);
        } else {
          inputEl.value = rawVal;
        }

        // Auto preset score if degree/exp text was pasted without score column
        if (inputEl.classList.contains('cand-degree') && (!cells[c + 1] || isNaN(parseFloat(fromKhmerNum(cells[c + 1]))))) {
          const degScoreInput = tr.querySelector('.cand-score-degree');
          if (degScoreInput) {
            degScoreInput.value = toKhmerNum(computeDegreeScore(rawVal));
          }
        }
        if (inputEl.classList.contains('cand-exp') && (!cells[c + 1] || isNaN(parseFloat(fromKhmerNum(cells[c + 1]))))) {
          const expScoreInput = tr.querySelector('.cand-score-exp');
          if (expScoreInput) {
            expScoreInput.value = toKhmerNum(computeExpScore(rawVal));
          }
        }
      }

      // Trigger change and recalculation for this row
      const nameInput = tr.querySelector('.cand-name');
      if (nameInput) onCandidateRowChange(nameInput);
      updateRowDeleteButtonState(tr);
    }

    // Update candidate count badge
    const countBadge = document.getElementById('stationCandidateCountBadge');
    if (countBadge) {
      const filledCount = currentCandidates.filter(c => c.name && c.name.trim()).length;
      countBadge.textContent = `👥 បេក្ខជនក្នុងប្រព័ន្ធ ៖ ${toKhmerNum(filledCount)} / ១៨ នាក់`;
    }

    const stationId = document.getElementById('scoringStationSelect').value;
    if (stationId) {
      backupStationCandidatesToLocalStorage(stationId, currentCandidates);
    }

    // Check duplicates for pasted rows
    setTimeout(async () => {
      for (let r = 0; r < rawLines.length; r++) {
        const rowIdx = startRowIdx + r;
        if (rowIdx >= allRows.length) break;
        const tr = allRows[rowIdx];
        const name = tr.querySelector('.cand-name')?.value?.trim();
        const dob = tr.querySelector('.cand-dob')?.value?.trim();
        if (name && dob) {
          const ok = await checkCandidateDuplicateRow(tr);
          if (!ok) break;
        }
      }
    }, 150);
  }
}

// ==============================================================================
// CANDIDATE DUPLICATE DETECTION (TAB 3: PROVINCE-WIDE & TABLE-WIDE)
// ==============================================================================

let isCheckingDuplicate = false;

function normKhmerText(str) {
  if (!str) return '';
  return String(str).replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/\s+/g, ' ');
}

function normComparableDob(val) {
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

function normComparableGender(g) {
  if (!g) return 'ប';
  const s = String(g).trim().toLowerCase();
  if (s.includes('ស') || s === 'f' || s === 'female' || s.includes('ស្រី')) return 'ស';
  return 'ប';
}

function clearCandidateRowInputs(tr) {
  if (!tr) return;
  const order = parseInt(tr.getAttribute('data-order')) || 1;
  const roleName = tr.getAttribute('data-role');
  const candId = tr.getAttribute('data-cand-id');

  const nameInput = tr.querySelector('.cand-name');
  if (nameInput) nameInput.value = '';
  const genderInput = tr.querySelector('.cand-gender');
  if (genderInput) genderInput.value = 'ប';
  const dobInput = tr.querySelector('.cand-dob');
  if (dobInput) dobInput.value = '';
  const phoneInput = tr.querySelector('.cand-phone');
  if (phoneInput) phoneInput.value = '';
  const degInput = tr.querySelector('.cand-degree');
  if (degInput) degInput.value = '';
  const degScore = tr.querySelector('.cand-score-degree');
  if (degScore) degScore.value = toKhmerNum(0);
  const expInput = tr.querySelector('.cand-exp');
  if (expInput) expInput.value = '';
  const expScore = tr.querySelector('.cand-score-exp');
  if (expScore) expScore.value = toKhmerNum(0);
  const shortlist = tr.querySelector('.cand-shortlist-display');
  if (shortlist) shortlist.textContent = toKhmerNum(0);
  const interview = tr.querySelector('.cand-interview');
  if (interview) interview.value = '';
  const total = tr.querySelector('.cand-total-display');
  if (total) total.textContent = '---';
  const rank = tr.querySelector('.cand-rank-display');
  if (rank) rank.textContent = toKhmerNum(order);
  const status = tr.querySelector('.cand-status-display');
  if (status) status.innerHTML = '<span class="badge badge-reserve">---</span>';

  tr.classList.remove('duplicate-highlight-row');
  delete tr.dataset.dupConfirmedSig;
  delete tr.dataset.isDuplicate;

  if (candId) {
    let cand = currentCandidates.find(c => c.id === candId);
    if (cand) {
      cand.name = '';
      cand.gender = 'ប';
      cand.dob = '';
      cand.phone = '';
      cand.degree = '';
      cand.scoreDegree = 0;
      cand.experience = '';
      cand.scoreExp = 0;
      cand.scoreShortlist = 0;
      cand.scoreInterview = '';
      cand.scoreTotal = '';
      cand.rank = order;
      cand.status = '';
      cand.isDuplicate = false;
    }
  }

  updateRowDeleteButtonState(tr);
  if (roleName) recalculateUIRanksForRole(roleName);

  setTimeout(() => {
    try {
      if (nameInput) nameInput.focus();
    } catch (e) {}
  }, 100);
}

window.onCandidateFieldFinished = async function(inputEl) {
  if (!inputEl) return;
  const tr = inputEl.closest('tr[data-cand-id]');
  if (tr) {
    await checkCandidateDuplicateRow(tr);
  }
};

async function checkCandidateDuplicateRow(tr) {
  if (!tr || isCheckingDuplicate) return true;

  const nameInput = tr.querySelector('.cand-name');
  const genderInput = tr.querySelector('.cand-gender');
  const dobInput = tr.querySelector('.cand-dob');

  const rawName = nameInput ? nameInput.value.trim() : '';
  const rawGender = genderInput ? genderInput.value : 'ប';
  const rawDob = dobInput ? dobInput.value.trim() : '';

  // Only check if BOTH name and dob are filled
  if (!rawName || !rawDob) {
    return true;
  }

  const qName = normKhmerText(rawName);
  const qGender = normComparableGender(rawGender);
  const qDob = normComparableDob(rawDob);

  // If DOB digits < 8 and doesn't contain complete date separator, wait until user completes
  const dobDigits = qDob.replace(/[^0-9]/g, '');
  if (dobDigits.length < 8 && !qDob.includes('-')) {
    return true;
  }

  const currentSig = `${qName}|${qGender}|${qDob}`;

  // If already confirmed by user for this exact combination, skip
  if (tr.dataset.dupConfirmedSig === currentSig) {
    return true;
  }

  isCheckingDuplicate = true;

  try {
    let duplicateFound = null;

    // 1. Check in the current table (among other rows)
    const allRows = document.querySelectorAll('#scoringTableBody tr[data-cand-id]');
    for (const otherTr of allRows) {
      if (otherTr === tr) continue;

      const oName = otherTr.querySelector('.cand-name')?.value?.trim() || '';
      const oGender = otherTr.querySelector('.cand-gender')?.value || 'ប';
      const oDob = otherTr.querySelector('.cand-dob')?.value?.trim() || '';

      if (!oName || !oDob) continue;

      if (normKhmerText(oName) === qName && normComparableGender(oGender) === qGender && normComparableDob(oDob) === qDob) {
        const oRole = otherTr.getAttribute('data-role') || '';
        const oOrder = otherTr.getAttribute('data-order') || '1';
        
        const currStationId = document.getElementById('scoringStationSelect')?.value;
        const currStation = (allPollingStations || []).find(s => s.id === currStationId) || {};
        const curDistrict = currStation.district || '';
        const curCommune = currStation.communeName || '';
        const curStationName = currStation.name || (currStation.code ? `ការិយាល័យលេខ ${currStation.code}` : 'ការិយាល័យបច្ចុប្បន្ន');

        const otherId = otherTr.getAttribute('data-cand-id');

        duplicateFound = {
          source: 'table',
          otherTr: otherTr,
          otherId: otherId && !otherId.startsWith('temp_') ? otherId : null,
          district: curDistrict || 'ការិយាល័យបច្ចុប្បន្ន',
          commune: curCommune || 'ការិយាល័យបច្ចុប្បន្ន',
          station: curStationName,
          role: `${oRole} (លេខរៀងទី ${toKhmerNum(oOrder)})`
        };
        break;
      }
    }

    // 2. If not found in current table, check server database across the entire province (all 10 districts/cities)
    if (!duplicateFound) {
      const candId = tr.getAttribute('data-cand-id') || '';
      const stationId = document.getElementById('scoringStationSelect')?.value || '';
      const res = await fetch('/api/candidates/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rawName,
          gender: rawGender,
          dob: rawDob,
          excludeId: candId.startsWith('temp_') ? undefined : candId,
          currentPollingStationId: stationId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.isDuplicate && data.existing) {
          const ex = data.existing;
          duplicateFound = {
            source: 'server',
            otherId: ex.id || null,
            district: ex.district || 'មិនបានបញ្ជាក់',
            commune: ex.communeName || 'មិនបានបញ្ជាក់',
            station: ex.pollingStationName || (ex.pollingStationCode ? `ការិយាល័យលេខ ${ex.pollingStationCode}` : 'មិនបានបញ្ជាក់'),
            role: ex.role || 'មិនបានបញ្ជាក់'
          };
        }
      }
    }

    // 3. If duplicate is detected, show Popup
    if (duplicateFound) {
      const genderText = qGender === 'ប' ? 'ប្រុស (ប)' : 'ស្រី (ស)';
      const msgHtml = `
<div style="text-align: left; font-size: 13.5px; line-height: 1.6;">
  <div style="font-weight: 700; color: #b91c1c; margin-bottom: 12px; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 8px;">
    <span>⚠️</span>
    <span>ឈ្មោះបេក្ខជននេះស្ទួនហើយ សូមជួយពិនិត្យ និងផ្ទៀងផ្ទាត់ឡើងវិញ!</span>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1.15fr; gap: 14px; margin-bottom: 12px; align-items: stretch;">
    <!-- Column 1: ព័ត៌មានបេក្ខជនកំពុងបញ្ចូល -->
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px 14px; box-sizing: border-box; display: flex; flex-direction: column;">
      <div style="font-weight: 700; color: #1e293b; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; font-size: 13.5px; display: flex; align-items: center; gap: 6px;">
        <span>📋</span> <span>ព័ត៌មានបេក្ខជនកំពុងបញ្ចូល</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 7px; font-size: 13px; line-height: 1.6;">
        <div>• <strong>គោត្តនាម-នាម ៖</strong> <span style="color:#0f172a; font-weight: 700;">${rawName}</span></div>
        <div>• <strong>ភេទ ៖</strong> <span style="color:#0f172a;">${genderText}</span></div>
        <div>• <strong>ថ្ងៃ ខែ ឆ្នាំកំណើត ៖</strong> <span style="color:#0f172a; font-weight: 700;">${rawDob}</span></div>
      </div>
    </div>

    <!-- Column 2: ស្ទួនជាមួយបេក្ខជនដែលមានក្នុងប្រព័ន្ធ -->
    <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 12px 14px; box-sizing: border-box; display: flex; flex-direction: column;">
      <div style="font-weight: 700; color: #991b1b; margin-bottom: 8px; border-bottom: 2px dashed #fecdd3; padding-bottom: 5px; font-size: 13.5px; display: flex; align-items: center; gap: 6px;">
        <span>🚨</span> <span>ស្ទួនជាមួយបេក្ខជនដែលមានក្នុងប្រព័ន្ធ</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; line-height: 1.6;">
        <div>• <strong>ស្រុក/ក្រុង ៖</strong> <span style="color:#991b1b; font-weight: 700;">${duplicateFound.district}</span></div>
        <div>• <strong>ឃុំ/សង្កាត់ ៖</strong> <span style="color:#991b1b; font-weight: 700;">${duplicateFound.commune}</span></div>
        <div>• <strong>ការិយាល័យបោះឆ្នោត ៖</strong> <span style="color:#991b1b; font-weight: 700;">${duplicateFound.station}</span></div>
        <div>• <strong>មុខតំណែង ៖</strong> <span style="color:#991b1b; font-weight: 700;">${duplicateFound.role}</span></div>
      </div>
    </div>
  </div>

  <div style="font-size: 12.5px; color: #475569; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; line-height: 1.6; text-align: left;">
    <div>👉 ប្រសិនបើអ្នកប្រាកដថា <strong>មិនស្ទួន</strong> សូមចុច <strong>(យល់ព្រម)</strong></div>
    <div>👉 ប្រសិនបើអ្នកប្រាកដថា <strong>ស្ទួន</strong> សូមចុច <strong>(ស្ទួន)</strong> ឈ្មោះបេក្ខជននេះមិនអាចបញ្ចូលបានទេ</div>
  </div>
</div>
      `.trim();

      const confirmedNotDuplicate = await showModernPopup({
        title: '⚠️ ឈ្មោះបេក្ខជននេះស្ទួនហើយ',
        message: msgHtml,
        type: 'warning',
        icon: '⚠️',
        showCancel: true,
        confirmText: 'យល់ព្រម',
        cancelText: 'ស្ទួន',
        cancelIsDanger: true,
        isWide: true
      });

      if (confirmedNotDuplicate) {
        // Second Confirmation Popup requested by user
        const secondConfirmHtml = `
<div style="text-align: left; font-size: 13.5px; line-height: 1.6;">
  <div style="margin-bottom: 12px; color: #1e293b; font-size: 14.5px;">
    តើអ្នកបញ្ចូលឈ្មោះបេក្ខជន <strong>«${rawName}»</strong> ដែលស្ទួនជាមួយ ៖
  </div>
  <div style="background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 13px; line-height: 1.8;">
    <div>• <strong>ក្រុង/ស្រុក ៖</strong> <span style="color:#991b1b; font-weight: 700;">${duplicateFound.district}</span></div>
    <div>• <strong>ឃុំ/សង្កាត់ ៖</strong> <span style="color:#991b1b; font-weight: 700;">${duplicateFound.commune}</span></div>
    <div>• <strong>ការិយាល័យបោះឆ្នោត ៖</strong> <span style="color:#991b1b; font-weight: 700;">${duplicateFound.station}</span></div>
    <div>• <strong>មុខតំណែង ៖</strong> <span style="color:#991b1b; font-weight: 700;">${duplicateFound.role}</span></div>
  </div>
  <div style="font-weight: 700; color: #b91c1c; font-size: 14.5px; text-align: center;">
    នេះមែនទេ?
  </div>
</div>
        `.trim();

        const reallyInsert = await showModernPopup({
          title: '❓ បញ្ជាក់ការបញ្ចូលបេក្ខជនស្ទួន',
          message: secondConfirmHtml,
          type: 'question',
          icon: '❓',
          showCancel: true,
          confirmText: 'ពិតមែន',
          cancelText: 'បោះបង់',
          cancelIsDanger: true
        });

        if (!reallyInsert) {
          // User clicked "បោះបង់" -> Candidate is NOT inserted
          clearCandidateRowInputs(tr);
          return false;
        }

        // User clicked "ពិតមែន" -> Highlight BOTH rows in RED and KEEP & PERSIST candidate in database!
        tr.dataset.dupConfirmedSig = currentSig;
        tr.dataset.isDuplicate = "true";
        tr.classList.add('duplicate-highlight-row');

        // Retain input values in current row
        if (nameInput) nameInput.value = rawName;
        if (genderInput) genderInput.value = rawGender;
        if (dobInput) dobInput.value = rawDob;

        const candId = tr.getAttribute('data-cand-id');
        const roleName = tr.getAttribute('data-role') || 'ប្រធាន';
        const order = parseInt(tr.getAttribute('data-order')) || 1;
        const stationId = document.getElementById('scoringStationSelect')?.value;

        let cand = currentCandidates.find(c => c.id === candId);
        if (!cand) {
          cand = {
            id: candId || `temp_${stationId}_${roleName}_${order}`,
            pollingStationId: stationId,
            role: roleName,
            orderInRole: order,
            name: rawName,
            gender: rawGender,
            dob: rawDob,
            isDuplicate: true
          };
          currentCandidates.push(cand);
        } else {
          cand.name = rawName;
          cand.gender = rawGender;
          cand.dob = rawDob;
          cand.isDuplicate = true;
        }

        // Highlight the matched duplicate row in current table if present
        if (duplicateFound.otherTr) {
          duplicateFound.otherTr.classList.add('duplicate-highlight-row');
          duplicateFound.otherTr.dataset.isDuplicate = "true";
          const otherId = duplicateFound.otherTr.getAttribute('data-cand-id');
          let otherCand = currentCandidates.find(c => c.id === otherId);
          if (otherCand) otherCand.isDuplicate = true;
        }

        // If duplicate was from server DB, mark other candidate as duplicate in DB
        if (duplicateFound.otherId) {
          try {
            await fetch('/api/candidates/mark-duplicate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: duplicateFound.otherId, isDuplicate: true })
            });
          } catch (e) {
            console.error('Error marking duplicate candidate in DB:', e);
          }
        }

        // Update delete button state and count badge
        updateRowDeleteButtonState(tr);
        const countBadge = document.getElementById('stationCandidateCountBadge');
        if (countBadge) {
          const filledCount = currentCandidates.filter(c => c.name && c.name.trim()).length;
          countBadge.textContent = `👥 បេក្ខជនក្នុងប្រព័ន្ធ ៖ ${toKhmerNum(filledCount)} / ១៨ នាក់`;
        }

        // Immediately auto-save this candidate into database so it persists across station switching
        if (stationId && rawName) {
          try {
            const rawInterview = tr.querySelector('.cand-interview') ? tr.querySelector('.cand-interview').value.trim() : '';
            const cleanInterview = (rawInterview === 'អវត្តមាន' || rawInterview.startsWith('អ')) ? 'អវត្តមាន' : (fromKhmerNum(rawInterview));

            const saveRes = await fetch('/api/candidates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: candId && !candId.startsWith('temp_') ? candId : undefined,
                pollingStationId: stationId,
                role: roleName,
                orderInRole: order,
                name: rawName,
                gender: rawGender,
                dob: rawDob,
                phone: tr.querySelector('.cand-phone')?.value?.trim() || '',
                degree: tr.querySelector('.cand-degree')?.value?.trim() || '',
                scoreDegree: parseFloat(fromKhmerNum(tr.querySelector('.cand-score-degree')?.value)) || 0,
                experience: tr.querySelector('.cand-exp')?.value?.trim() || '',
                scoreExp: parseFloat(fromKhmerNum(tr.querySelector('.cand-score-exp')?.value)) || 0,
                scoreInterview: cleanInterview,
                isDuplicate: true
              })
            });
            if (saveRes.ok) {
              const resData = await saveRes.json();
              if (resData.candidate && resData.candidate.id) {
                candId = resData.candidate.id;
              }
            }
          } catch (saveErr) {
            console.error('Error auto-saving confirmed duplicate candidate:', saveErr);
          }
        }

        // Re-render scoring table immediately so newly confirmed duplicate appears with red highlight and updated count
        await renderScoringTableForActiveStation();
        await updateDuplicateBadgeCount();

        setTimeout(() => {
          const targetTr = document.querySelector(`tr[data-role="${roleName}"][data-order="${order}"]`);
          if (targetTr) {
            targetTr.dataset.dupConfirmedSig = currentSig;
            const phoneInput = targetTr.querySelector('.cand-phone');
            if (phoneInput) phoneInput.focus();
          }
        }, 50);

        return true;
      } else {
        // User clicked "ស្ទួន" -> Candidate cannot be entered
        clearCandidateRowInputs(tr);
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('Error during duplicate check:', err);
    return true;
  } finally {
    isCheckingDuplicate = false;
  }
}

// ==============================================================================
// TAB: DUPLICATE CANDIDATES MANAGEMENT (បញ្ជីបេក្ខជនស្ទួនទូទាំងខេត្ត)
// ==============================================================================

let currentDuplicateGroups = [];

function escapeJs(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

async function updateDuplicateBadgeCount() {
  try {
    const res = await fetch('/api/candidates/duplicates');
    if (!res.ok) return;
    const data = await res.json();
    const count = data.totalDuplicates || 0;
    const badge = document.getElementById('duplicateBadgeCount');
    if (badge) {
      if (count > 0) {
        badge.textContent = toKhmerNum(count);
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
    const headerBadge = document.getElementById('dupCountBadge');
    if (headerBadge) {
      headerBadge.textContent = `ស្ទួនសរុប ៖ ${toKhmerNum(count)} នាក់ (${toKhmerNum(data.totalGroups || 0)} ក្រុម)`;
    }
  } catch (e) {
    console.error('Error updating duplicate badge:', e);
  }
}

async function loadDuplicateCandidatesList() {
  const container = document.getElementById('duplicateListContainer');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 14px;">
      ⏳ កំពុងទាញយកទិន្នន័យបេក្ខជនស្ទួន...
    </div>
  `;

  try {
    const res = await fetch('/api/candidates/duplicates');
    if (!res.ok) throw new Error('Failed to fetch duplicates');
    const data = await res.json();
    currentDuplicateGroups = data.groups || [];

    const badge = document.getElementById('duplicateBadgeCount');
    if (badge) {
      const count = data.totalDuplicates || 0;
      if (count > 0) {
        badge.textContent = toKhmerNum(count);
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
    const headerBadge = document.getElementById('dupCountBadge');
    if (headerBadge) {
      headerBadge.textContent = `ស្ទួនសរុប ៖ ${toKhmerNum(data.totalDuplicates || 0)} នាក់ (${toKhmerNum(data.totalGroups || 0)} ក្រុម)`;
    }

    renderDuplicateCandidates(currentDuplicateGroups);
  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: #dc2626;">
        ❌ មានបញ្ហាក្នុងការទាញយកទិន្នន័យ ៖ ${err.message}
      </div>
    `;
  }
}

function renderDuplicateCandidates(groups) {
  const container = document.getElementById('duplicateListContainer');
  if (!container) return;

  if (!groups || groups.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 50px 20px; background: #f0fdf4; border: 1.5px dashed #86efac; border-radius: 12px;">
        <div style="font-size: 42px; margin-bottom: 12px;">🎉</div>
        <div style="font-size: 16px; font-weight: 700; color: #166534; margin-bottom: 6px;">
          មិនមានបេក្ខជនស្ទួនក្នុងប្រព័ន្ធឡើយ! (No Duplicate Candidates)
        </div>
        <div style="font-size: 13px; color: #15803d;">
          បេក្ខជនទាំងអស់ក្នុងប្រព័ន្ធមានភាពត្រឹមត្រូវ និងគ្មានឈ្មោះស្ទួនឆ្លងកាត់ការិយាល័យឡើយ។
        </div>
      </div>
    `;
    return;
  }

  let html = '';

  groups.forEach((g, gIdx) => {
    const genderText = g.gender === 'ប' ? 'ប្រុស' : 'ស្រី';
    const dobFormatted = formatKhmerDate(g.dob);

    html += `
      <div class="dup-group-card" style="margin-bottom: 24px; border: 1.5px solid #fca5a5; border-radius: 10px; overflow: hidden; background: #ffffff; box-shadow: 0 3px 10px rgba(220,38,38,0.07);">
        <!-- Group Header -->
        <div style="background: linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%); padding: 12px 18px; border-bottom: 1.5px solid #fecdd3; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span style="background: #dc2626; color: #ffffff; font-weight: 700; font-size: 12px; padding: 3px 8px; border-radius: 6px;">
              ក្រុមទី ${toKhmerNum(gIdx + 1)}
            </span>
            <span style="font-size: 15px; font-weight: 700; color: #991b1b;">
              👤 គោត្តនាម-នាម ៖ ${g.name}
            </span>
            <span style="color: #cbd5e1; font-size: 13px;">|</span>
            <span style="font-size: 13px; color: #334155;">
              <strong>ភេទ ៖</strong> ${genderText}
            </span>
            <span style="color: #cbd5e1; font-size: 13px;">|</span>
            <span style="font-size: 13px; color: #334155;">
              <strong>ថ្ងៃខែឆ្នាំកំណើត ៖</strong> <span style="font-weight: 700; color: #0f172a;">${dobFormatted}</span>
            </span>
          </div>
          <div>
            <span style="font-size: 12.5px; font-weight: 700; background: #ffffff; color: #dc2626; border: 1px solid #fca5a5; padding: 4px 10px; border-radius: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              ⚠️ រកឃើញស្ទួនចំនួន ${toKhmerNum(g.count)} ការិយាល័យ
            </span>
          </div>
        </div>

        <!-- Group Candidate Rows Table -->
        <div class="table-responsive" style="margin: 0; padding: 0;">
          <table class="table-custom" style="width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 0;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-size: 12px;">
                <th style="padding: 9px 8px; text-align: center; width: 45px;">ល.រ</th>
                <th style="padding: 9px 10px; text-align: left;">ក្រុង/ស្រុក</th>
                <th style="padding: 9px 10px; text-align: left;">ឃុំ/សង្កាត់</th>
                <th style="padding: 9px 10px; text-align: left;">ការិយាល័យបោះឆ្នោត</th>
                <th style="padding: 9px 10px; text-align: left;">មុខតំណែង</th>
                <th style="padding: 9px 8px; text-align: center;">ទូរស័ព្ទ</th>
                <th style="padding: 9px 6px; text-align: center; width: 65px;">ពិន្ទុសម្រាំង</th>
                <th style="padding: 9px 6px; text-align: center; width: 65px;">សម្ភាសន៍</th>
                <th style="padding: 9px 6px; text-align: center; width: 65px;">សរុប</th>
                <th style="padding: 9px 6px; text-align: center; width: 55px;">ចំណាត់ថ្នាក់</th>
                <th style="padding: 9px 8px; text-align: center; width: 85px;">លទ្ធផល</th>
                <th style="padding: 9px 10px; text-align: center; width: 140px;">សកម្មភាព</th>
              </tr>
            </thead>
            <tbody>
    `;

    g.candidates.forEach((c, cIdx) => {
      const orderNum = toKhmerNum(cIdx + 1);
      const stCode = c.pollingStationCode ? String(c.pollingStationCode).padStart(4, '0') : '';
      const stDisplay = c.pollingStationName || (stCode ? `ការិយាល័យលេខ ${toKhmerNum(stCode)}` : 'មិនបានបញ្ជាក់');
      const roleText = c.role ? `${c.role} (លេខរៀងទី ${toKhmerNum(c.orderInRole || 1)})` : '---';

      let statusBadge = '<span class="badge badge-reserve">---</span>';
      if (c.status === 'A-ជាប់') statusBadge = '<span class="badge badge-passed">A-ជាប់</span>';
      else if (c.status === 'B-បម្រុង') statusBadge = '<span class="badge badge-reserve">B-បម្រុង</span>';
      else if (c.status === 'C-បម្រុងបន្ទាប់') statusBadge = '<span class="badge badge-reserve2">C-បម្រុងបន្ទាប់</span>';
      else if (c.status === 'អវត្តមាន') statusBadge = '<span class="badge badge-absent">អវត្តមាន</span>';

      const interviewText = c.scoreInterview === 'អវត្តមាន' ? 'អវត្តមាន' : (c.scoreInterview !== '' && c.scoreInterview !== undefined ? toKhmerNum(c.scoreInterview) : '---');
      const totalText = c.scoreInterview === 'អវត្តមាន' ? 'អវត្តមាន' : (c.scoreTotal !== '' && c.scoreTotal !== undefined ? toKhmerNum(c.scoreTotal) : '---');

      html += `
        <tr style="border-bottom: 1px solid #f1f5f9; background: #ffffff;">
          <td style="text-align: center; padding: 10px 6px; font-weight: 700; color: #64748b;">${orderNum}</td>
          <td style="padding: 10px 8px; font-weight: 600; color: #1e293b;">${c.district || '---'}</td>
          <td style="padding: 10px 8px; color: #334155;">${c.communeName || '---'}</td>
          <td style="padding: 10px 8px; color: #0f172a; font-weight: 600;">
            ${stDisplay} ${stCode ? `<span style="font-size: 11px; color: #64748b; font-weight: normal;">[កូដ: ${toKhmerNum(stCode)}]</span>` : ''}
          </td>
          <td style="padding: 10px 8px; color: #0284c7; font-weight: 600;">${roleText}</td>
          <td style="text-align: center; padding: 10px 6px;">${c.phone ? formatKhmerPhoneNumber(c.phone) : '---'}</td>
          <td style="text-align: center; padding: 10px 6px; font-weight: 700; color: #047857;">${toKhmerNum(c.scoreShortlist || 0)}</td>
          <td style="text-align: center; padding: 10px 6px; font-weight: 700; color: #b45309;">${interviewText}</td>
          <td style="text-align: center; padding: 10px 6px; font-weight: 700; color: #1e293b;">${totalText}</td>
          <td style="text-align: center; padding: 10px 6px; font-weight: 700; color: #4338ca;">${toKhmerNum(c.rank || c.orderInRole || 1)}</td>
          <td style="text-align: center; padding: 10px 6px;">${statusBadge}</td>
          <td style="text-align: center; padding: 10px 8px;">
            <button type="button" class="btn btn-sm" style="background: #dc2626; color: #ffffff; border: none; border-radius: 6px; padding: 5px 10px; font-size: 11.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 1px 3px rgba(220,38,38,0.25); cursor: pointer;"
              onclick="deleteDuplicateCandidate('${c.id}', '${escapeJs(c.name)}', '${escapeJs(stDisplay)}')">
              <span>🗑️</span> <span>លុបចេញ</span>
            </button>
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function filterDuplicateCandidatesList() {
  const query = normKhmerText(document.getElementById('dupSearchInput')?.value || '');
  if (!query) {
    renderDuplicateCandidates(currentDuplicateGroups);
    return;
  }

  const filtered = currentDuplicateGroups.filter(g => {
    if (normKhmerText(g.name).includes(query)) return true;
    if (g.dob && g.dob.includes(query)) return true;
    return g.candidates.some(c => {
      const dist = normKhmerText(c.district || '');
      const com = normKhmerText(c.communeName || '');
      const st = normKhmerText(c.pollingStationName || '');
      const code = String(c.pollingStationCode || '');
      return dist.includes(query) || com.includes(query) || st.includes(query) || code.includes(query);
    });
  });

  renderDuplicateCandidates(filtered);
}

async function deleteDuplicateCandidate(candId, candName, stationName) {
  if (!candId) return;

  const msgHtml = `
    <div style="text-align: left; font-size: 13.5px; line-height: 1.6;">
      <div style="font-weight: 700; color: #b91c1c; margin-bottom: 8px; font-size: 15px;">
        ⚠️ លុបបេក្ខជនស្ទួនចេញពីការិយាល័យ
      </div>
      <div style="margin-bottom: 12px; color: #1e293b;">
        តើលោកអ្នកពិតជាចង់លុបបេក្ខជន <strong>«${candName}»</strong> ចេញពី <strong>«${stationName}»</strong> មែនទេ?
      </div>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 12px; border-radius: 8px; font-size: 12.5px; color: #166534; line-height: 1.6;">
        👉 <strong>ចំណាំ ៖</strong> នៅពេលលុបបេក្ខជននេះចេញ បេក្ខជនម្នាក់ទៀតដែលនៅសល់នឹង<strong>លែងស្ទួន</strong> ហើយប្រព័ន្ធនឹង<strong>ដោះ High Light ពណ៌ក្រហមចេញវិញ</strong>ដោយស្វ័យប្រវត្តិ!
      </div>
    </div>
  `;

  const confirmed = await showModernPopup({
    title: 'លុបបេក្ខជនស្ទួន',
    message: msgHtml,
    type: 'danger',
    icon: '🗑️',
    showCancel: true,
    confirmText: 'លុបចេញ',
    cancelText: 'បោះបង់',
    isDanger: true,
    isWide: false
  });

  if (!confirmed) return;

  try {
    const res = await fetch('/api/candidates/' + candId, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || 'បរាជ័យក្នុងការលុប');

    showModernAlert('✅ បានលុបបេក្ខជនដោយជោគជ័យ! បេក្ខជនម្នាក់ទៀតដែលនៅសល់ត្រូវបានដោះ High Light ក្រហមចេញវិញរួចរាល់។', {
      title: 'ជោគជ័យ',
      type: 'success'
    });

    // Reload duplicate candidates list
    await loadDuplicateCandidatesList();
    await updateDuplicateBadgeCount();

    // If active scoring station is open, refresh scoring table so highlights update immediately
    const activeStationId = document.getElementById('scoringStationSelect')?.value;
    if (activeStationId) {
      renderScoringTableForActiveStation();
    }
  } catch (err) {
    showModernAlert('មានបញ្ហាក្នុងការលុប ៖ ' + err.message, {
      title: 'កំហុស',
      type: 'danger'
    });
  }
}

function hasCandidateRowData(tr) {
  if (!tr) return false;
  const name = tr.querySelector('.cand-name')?.value?.trim() || '';
  const dob = tr.querySelector('.cand-dob')?.value?.trim() || '';
  const phone = tr.querySelector('.cand-phone')?.value?.trim() || '';
  const degree = tr.querySelector('.cand-degree')?.value?.trim() || '';
  const scoreDeg = parseFloat(fromKhmerNum(tr.querySelector('.cand-score-degree')?.value)) || 0;
  const exp = tr.querySelector('.cand-exp')?.value?.trim() || '';
  const scoreExp = parseFloat(fromKhmerNum(tr.querySelector('.cand-score-exp')?.value)) || 0;
  const interview = tr.querySelector('.cand-interview')?.value?.trim() || '';
  return !!(name || dob || phone || degree || scoreDeg > 0 || exp || scoreExp > 0 || interview);
}

function updateRowDeleteButtonState(tr) {
  if (!tr) return;
  const btn = tr.querySelector('.cand-btn-delete');
  if (btn) {
    const hasData = hasCandidateRowData(tr);
    btn.disabled = !hasData;
  }
}

window.onCandidateNameInput = function(input) {
  const original = input.value;
  // Allow ONLY Khmer characters (\u1780-\u17D3), zero-width characters (\u200B-\u200D), and whitespace (\s)
  const sanitized = original.replace(/[^\u1780-\u17D3\u200B-\u200D\s]/g, '');
  if (original !== sanitized) {
    const start = input.selectionStart;
    const diff = original.length - sanitized.length;
    input.value = sanitized;
    if (start !== null) {
      const newPos = Math.max(0, start - diff);
      input.setSelectionRange(newPos, newPos);
    }
  }
  const tr = input.closest('tr');
  if (tr) {
    delete tr.dataset.dupConfirmedSig;
    delete tr.dataset.isDuplicate;
    tr.classList.remove('duplicate-highlight-row');
    const candId = tr.getAttribute('data-cand-id');
    let cand = currentCandidates.find(c => c.id === candId);
    if (cand) cand.isDuplicate = false;
    updateRowDeleteButtonState(tr);
    onCandidateRowChange(input);
  }
};

window.onCandidateDobInput = function(input) {
  const tr = input.closest('tr');
  if (tr) {
    delete tr.dataset.dupConfirmedSig;
    delete tr.dataset.isDuplicate;
    tr.classList.remove('duplicate-highlight-row');
    const candId = tr.getAttribute('data-cand-id');
    let cand = currentCandidates.find(c => c.id === candId);
    if (cand) cand.isDuplicate = false;
  }
  const prevVal = input.value;
  const formatted = formatKhmerDate(prevVal);
  if (formatted !== prevVal) {
    input.value = formatted;
  }
  updateRowDeleteButtonState(tr);
  onCandidateRowChange(input);

  const digits = fromKhmerNum(formatted).replace(/[^0-9]/g, '');
  if (digits.length >= 8) {
    onCandidateFieldFinished(input);
  }
};

window.onCandidatePhoneInput = function(input) {
  const tr = input.closest('tr');
  const prevVal = input.value;
  const formatted = formatKhmerPhoneNumber(prevVal);
  if (formatted !== prevVal) {
    input.value = formatted;
  }
  updateRowDeleteButtonState(tr);
};

window.onCandidateScoreInput = function(input) {
  const tr = input.closest('tr');
  const prevVal = input.value;
  const engVal = fromKhmerNum(prevVal).replace(/[^0-9.]/g, '');
  const parts = engVal.split('.');
  const sanitizedEng = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : engVal;
  const khmerVal = toKhmerNum(sanitizedEng);
  if (khmerVal !== prevVal) {
    input.value = khmerVal;
  }
  updateRowDeleteButtonState(tr);
  onCandidateRowChange(input);
};

function sanitizeInterviewInput(val) {
  if (!val) return '';
  let str = String(val);

  // If user pasted or typed 'absent' or 'ab', convert to 'អវត្តមាន'
  if (/^ab(s|se|sen|sent)?$/i.test(str.trim())) {
    return 'អវត្តមាន';
  }

  // Convert any English digits to Khmer digits
  let converted = toKhmerNum(str);

  // Allow ONLY Khmer characters (\u1780-\u17FF), spaces, and decimal dot
  // This explicitly removes English letters (a-z, A-Z), Latin characters, and other symbols
  let cleaned = converted.replace(/[^\u1780-\u17FF0-9.\s]/g, '');
  cleaned = toKhmerNum(cleaned);

  // If input is purely numeric (Khmer digits and decimal point)
  const isPureNumber = /^[០-៩]+(?:\.[០-៩]*)?$/.test(cleaned.trim());
  if (isPureNumber) {
    const parts = cleaned.trim().split('.');
    let numStr = parts[0];
    if (parts.length > 1) {
      numStr += '.' + parts.slice(1).join('');
    }
    const engNum = parseFloat(fromKhmerNum(numStr));
    if (!isNaN(engNum) && engNum > 20) {
      return toKhmerNum(20);
    }
    return numStr;
  }

  return cleaned;
}

window.onCandidateInterviewInput = function(input) {
  const tr = input.closest('tr');
  const prevVal = input.value;
  const sanitized = sanitizeInterviewInput(prevVal);
  if (sanitized !== prevVal) {
    input.value = sanitized;
  }
  updateRowDeleteButtonState(tr);
  onCandidateRowChange(input);
};

window.onCandidateInterviewChange = function(input) {
  const tr = input.closest('tr');
  let val = input.value.trim();
  if (val.startsWith('អ') || /^ab/i.test(val)) {
    input.value = 'អវត្តមាន';
  } else if (/^[០-៩]+(?:\.[០-៩]+)?$/.test(val)) {
    const eng = parseFloat(fromKhmerNum(val));
    if (!isNaN(eng)) {
      if (eng > 20) {
        input.value = toKhmerNum(20);
      } else {
        input.value = toKhmerNum(val);
      }
    }
  }
  updateRowDeleteButtonState(tr);
  onCandidateRowChange(input);
};

let scoringAutoSyncInterval = null;
let isScoringAutoSyncing = false;

function startScoringAutoSync() {
  if (scoringAutoSyncInterval) clearInterval(scoringAutoSyncInterval);
  scoringAutoSyncInterval = setInterval(async () => {
    const tabScoring = document.getElementById('tabScoring');
    if (!tabScoring || !tabScoring.classList.contains('active')) return;
    const stationId = document.getElementById('scoringStationSelect')?.value;
    if (!stationId) return;

    // Do NOT refresh if user is currently typing in an input
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA')) {
      return;
    }

    if (isScoringAutoSyncing) return;
    isScoringAutoSyncing = true;
    try {
      const res = await fetch(`/api/candidates?pollingStationId=${stationId}`);
      if (res.ok) {
        const data = await res.json();
        const serverCands = (data.candidates || []).filter(c => c && c.name && c.name.trim());
        const localCands = (currentCandidates || []).filter(c => c && c.name && c.name.trim());

        const serverSignature = serverCands.map(c => `${c.role}_${c.orderInRole}_${c.name}_${c.scoreShortlist}_${c.scoreInterview}`).sort().join('|');
        const localSignature = localCands.map(c => `${c.role}_${c.orderInRole}_${c.name}_${c.scoreShortlist}_${c.scoreInterview}`).sort().join('|');

        if (serverSignature !== localSignature) {
          console.log('[AutoSync] Server candidates updated, refreshing view...');
          await renderScoringTableForActiveStation();
        }
      }
    } catch (e) {
      // Ignore background network glitch
    } finally {
      isScoringAutoSyncing = false;
    }
  }, 8000); // Poll every 8 seconds
}

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
    infoSpan.textContent = `📍 ${distPrefix} | ${comPrefix} | ${ps.name} [កូដ: ${toKhmerNum(c4)}] | ទីតាំង: ${ps.location || 'គ្មាន'}`;
  }

  try {
    const res = await fetch(`/api/candidates?pollingStationId=${stationId}`);
    const data = await res.json();
    currentCandidates = data.candidates || [];
    backupStationCandidatesToLocalStorage(stationId, currentCandidates);

    if (countBadge) {
      const filledCount = currentCandidates.filter(c => c.name && c.name.trim()).length;
      countBadge.textContent = `👥 បេក្ខជនក្នុងប្រព័ន្ធ ៖ ${toKhmerNum(filledCount)} / ១៨ នាក់`;
    }

    tbody.innerHTML = '';

    // Render grouped by the 6 roles matching Excel structure
    ROLES_ORDER.forEach(roleName => {
      const roleCode = ROLE_CODES[roleName];
      tbody.innerHTML += `
        <tr class="excel-position-banner">
          <td colspan="15">
            📋 មុខតំណែង ៖ ${roleName}
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
        const hasCompletedTotal = isAbsent || (cand.scoreInterview !== undefined && cand.scoreInterview !== null && cand.scoreInterview !== '' && cand.scoreTotal !== undefined && cand.scoreTotal !== null && cand.scoreTotal !== '' && cand.scoreTotal !== '---');

        const degScoreVal = cand.scoreDegree !== undefined && cand.scoreDegree !== null ? cand.scoreDegree : 0;
        const expScoreVal = cand.scoreExp !== undefined && cand.scoreExp !== null ? cand.scoreExp : 0;
        const shortlistVal = cand.scoreShortlist !== undefined && cand.scoreShortlist !== null ? cand.scoreShortlist : (parseFloat(fromKhmerNum(degScoreVal)) || 0) + (parseFloat(fromKhmerNum(expScoreVal)) || 0);

        let totalDisplay = '---';
        if (cand.scoreTotal === 'អវត្តមាន' || isAbsent) {
          totalDisplay = 'អវត្តមាន';
        } else if (hasCompletedTotal) {
          totalDisplay = toKhmerNum(cand.scoreTotal);
        }

        let badgeHtml = '<span class="badge badge-reserve">---</span>';
        if (hasCompletedTotal && cand.name && cand.name.trim()) {
          if (cand.status === 'A-ជាប់') badgeHtml = '<span class="badge badge-passed">A-ជាប់</span>';
          else if (cand.status === 'B-បម្រុង') badgeHtml = '<span class="badge badge-reserve">B-បម្រុង</span>';
          else if (cand.status === 'C-បម្រុងបន្ទាប់') badgeHtml = '<span class="badge badge-reserve2">C-បម្រុងបន្ទាប់</span>';
          else if (cand.status === 'អវត្តមាន') badgeHtml = '<span class="badge badge-absent">អវត្តមាន</span>';
        }

        const hasData = !!(
          (cand.name && cand.name.trim()) ||
          (cand.dob && cand.dob.trim()) ||
          (cand.phone && cand.phone.trim()) ||
          (cand.degree && cand.degree.trim()) ||
          (parseFloat(fromKhmerNum(cand.scoreDegree)) > 0) ||
          (cand.experience && cand.experience.trim()) ||
          (parseFloat(fromKhmerNum(cand.scoreExp)) > 0) ||
          (cand.scoreInterview !== undefined && cand.scoreInterview !== null && String(cand.scoreInterview).trim() !== '')
        );

        const isDup = !!(cand.isDuplicate);
        const dupSig = isDup && cand.name && cand.dob ? `${normKhmerText(cand.name)}|${normComparableGender(cand.gender)}|${normComparableDob(cand.dob)}` : '';
        tbody.innerHTML += `
          <tr data-cand-id="${cand.id}" data-role="${roleName}" data-order="${order}" class="${isDup ? 'duplicate-highlight-row' : ''}" data-is-duplicate="${isDup ? 'true' : 'false'}" data-dup-confirmed-sig="${dupSig}">
            <td class="excel-col-order">${toKhmerNum(order)}</td>
            <td>
              <input type="text" class="excel-cell-input cand-name" value="${cand.name || ''}" placeholder="បញ្ចូលគោត្តនាម-នាម" onchange="onCandidateRowChange(this); onCandidateFieldFinished(this);" oninput="onCandidateNameInput(this)" onkeydown="onCandidateNameKeyDown(event, this)">
            </td>
            <td style="text-align: center; width: 65px; min-width: 65px;">
              <select class="excel-cell-select cand-gender" style="text-align: center; text-align-last: center;" onchange="onCandidateRowChange(this); onCandidateFieldFinished(this);">
                <option value="ប" ${cand.gender === 'ប' ? 'selected' : ''}>ប</option>
                <option value="ស" ${cand.gender === 'ស' ? 'selected' : ''}>ស</option>
              </select>
            </td>
            <td>
              <input type="text" class="excel-cell-input cand-dob" value="${formatKhmerDate(cand.dob || '')}" placeholder="ថ្ងៃ-ខែ-ឆ្នាំ" style="text-align: center;" oninput="onCandidateDobInput(this)" onchange="onCandidateRowChange(this); onCandidateFieldFinished(this);">
            </td>
            <td>
              <input type="text" class="excel-cell-input cand-phone" value="${formatKhmerPhoneNumber(cand.phone || '')}" placeholder="០៨៧..." oninput="onCandidatePhoneInput(this)" onchange="onCandidateRowChange(this)">
            </td>
            <td>
              <input type="text" class="excel-cell-input cand-degree" value="${cand.degree || ''}" placeholder="វាយបញ្ចូលកម្រិតវប្បធម៌" onchange="onCandidateRowChange(this)" oninput="onCandidateRowChange(this)">
            </td>
            <td style="width: 70px; min-width: 70px; text-align: center;">
              <input type="text" inputmode="decimal" class="excel-cell-input cand-score-degree" value="${toKhmerNum(degScoreVal)}" style="text-align: center; padding: 4px 2px;" oninput="onCandidateScoreInput(this)" onchange="onCandidateRowChange(this)">
            </td>
            <td>
              <input type="text" class="excel-cell-input cand-exp" value="${cand.experience || ''}" placeholder="វាយបញ្ចូលបទពិសោធន៍" onchange="onCandidateRowChange(this)" oninput="onCandidateRowChange(this)">
            </td>
            <td style="width: 70px; min-width: 70px; text-align: center;">
              <input type="text" inputmode="decimal" class="excel-cell-input cand-score-exp" value="${toKhmerNum(expScoreVal)}" style="text-align: center; padding: 4px 2px;" oninput="onCandidateScoreInput(this)" onchange="onCandidateRowChange(this)">
            </td>
            <td class="excel-calc-shortlist cand-shortlist-display">
              ${toKhmerNum(shortlistVal)}
            </td>
            <td style="width: 95px; min-width: 95px; text-align: center;">
              <input type="text" class="excel-cell-input cand-interview" value="${cand.scoreInterview === 'អវត្តមាន' ? 'អវត្តមាន' : (cand.scoreInterview !== undefined && cand.scoreInterview !== null && cand.scoreInterview !== '' ? toKhmerNum(cand.scoreInterview) : '')}" placeholder="០-២០ ឬ អវត្តមាន" style="text-align: center; font-weight: 700; padding: 4px 2px;" oninput="onCandidateInterviewInput(this)" onchange="onCandidateInterviewChange(this)">
            </td>
            <td class="excel-calc-total cand-total-display" style="width: 65px; min-width: 65px; text-align: center;">
              ${totalDisplay}
            </td>
            <td class="excel-calc-rank cand-rank-display" style="width: 65px; min-width: 65px; text-align: center;">
              ${toKhmerNum(hasCompletedTotal ? (cand.rank || order) : order)}
            </td>
            <td class="excel-calc-status cand-status-display" style="text-align: left !important; padding-left: 10px !important; min-width: 110px; white-space: nowrap;">
              ${badgeHtml}
            </td>
            <td style="text-align: center;">
              <button class="btn btn-danger btn-sm cand-btn-delete" style="padding: 2px 7px; font-size: 11px;" onclick="clearCandidateRow(this)" title="លុបទិន្នន័យជួរដេក" ${hasData ? '' : 'disabled'}>❌</button>
            </td>
          </tr>
        `;
      }
    });

    initScoringTableExcelEngine();
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

  // Auto preset score when typing / selecting Degree: គ្មាន=0, បឋមភូមិ=0, ទុតិយភូមិ=5, បរិញ្ញាបត្រ ឬបរិញ្ញាបត្រជាន់ខ្ពស់=8
  if (inputElem === degInput) {
    degScoreInput.value = toKhmerNum(computeDegreeScore(degInput.value));
  }

  // Auto preset score when typing / selecting Experience: គ្មាន=0, ការិយាល័យ១ដង=4, ការិយាល័យ២ដង=8, ការិយាល័យ៣ដង ឬច្រើនជាងនេះ=12
  if (inputElem === expInput) {
    expScoreInput.value = toKhmerNum(computeExpScore(expInput.value));
  }

  const name = tr.querySelector('.cand-name').value.trim();
  const gender = tr.querySelector('.cand-gender').value;
  const dob = tr.querySelector('.cand-dob').value.trim();
  const phone = tr.querySelector('.cand-phone').value.trim();
  const degree = degInput.value.trim();
  const scoreDeg = parseFloat(fromKhmerNum(degScoreInput.value)) || 0;
  const exp = expInput.value.trim();
  const scoreExp = parseFloat(fromKhmerNum(expScoreInput.value)) || 0;
  const interviewRaw = tr.querySelector('.cand-interview').value.trim();

  const shortlist = scoreDeg + scoreExp;
  tr.querySelector('.cand-shortlist-display').textContent = toKhmerNum(shortlist);

  let total = '';
  let isAbsent = false;
  if (interviewRaw.includes('អវត្តមាន') || interviewRaw.startsWith('អ')) {
    isAbsent = true;
    total = 'អវត្តមាន';
  } else if (interviewRaw !== '') {
    const interviewNum = parseFloat(fromKhmerNum(interviewRaw));
    if (!isNaN(interviewNum)) {
      total = shortlist + interviewNum;
    }
  }

  tr.querySelector('.cand-total-display').textContent = isAbsent ? 'អវត្តមាន' : (typeof total === 'number' ? toKhmerNum(total) : '---');

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
    cand.scoreInterview = isAbsent ? 'អវត្តមាន' : (fromKhmerNum(interviewRaw) || '');
    cand.scoreTotal = total;
  }

  // Update delete button state
  updateRowDeleteButtonState(tr);

  // Recalculate rank for this role in UI
  recalculateUIRanksForRole(roleName);
};

function recalculateUIRanksForRole(roleName) {
  const rows = Array.from(document.querySelectorAll(`tr[data-role="${roleName}"]`));
  const rowData = rows.map(r => {
    const name = r.querySelector('.cand-name').value.trim();
    const totalText = r.querySelector('.cand-total-display').textContent.trim();
    const isAbsent = totalText === 'អវត្តមាន';
    const hasTotal = isAbsent || (totalText !== '---' && totalText !== '');
    const totalNum = hasTotal && !isAbsent ? (parseFloat(fromKhmerNum(totalText)) || 0) : 0;
    const order = parseInt(r.getAttribute('data-order')) || 1;
    return { row: r, hasName: !!name, hasTotal, isAbsent, totalNum, order };
  });

  // Only rank active rows that have a name AND a completed total score!
  const rankedRows = rowData.filter(d => d.hasName && d.hasTotal);
  const unrankedActiveRows = rowData.filter(d => d.hasName && !d.hasTotal);
  const inactiveRows = rowData.filter(d => !d.hasName);

  rankedRows.sort((a, b) => {
    if (a.isAbsent && !b.isAbsent) return 1;
    if (!a.isAbsent && b.isAbsent) return -1;
    return b.totalNum - a.totalNum;
  });

  rankedRows.forEach((d, idx) => {
    const rankElem = d.row.querySelector('.cand-rank-display');
    const statusElem = d.row.querySelector('.cand-status-display');
    const candId = d.row.getAttribute('data-cand-id');
    let cand = currentCandidates.find(c => c.id === candId);

    if (d.isAbsent) {
      rankElem.textContent = toKhmerNum(rankedRows.length);
      statusElem.innerHTML = '<span class="badge badge-absent">អវត្តមាន</span>';
      if (cand) { cand.rank = rankedRows.length; cand.status = 'អវត្តមាន'; }
    } else {
      const r = idx + 1;
      rankElem.textContent = toKhmerNum(r);
      let st = '';
      if (r === 1) { st = 'A-ជាប់'; statusElem.innerHTML = '<span class="badge badge-passed">A-ជាប់</span>'; }
      else if (r === 2) { st = 'B-បម្រុង'; statusElem.innerHTML = '<span class="badge badge-reserve">B-បម្រុង</span>'; }
      else if (r === 3) { st = 'C-បម្រុងបន្ទាប់'; statusElem.innerHTML = '<span class="badge badge-reserve2">C-បម្រុងបន្ទាប់</span>'; }
      else { st = `បម្រុង ${toKhmerNum(r - 1)}`; statusElem.innerHTML = `<span class="badge badge-reserve">បម្រុង ${toKhmerNum(r - 1)}</span>`; }
      if (cand) { cand.rank = r; cand.status = st; }
    }
  });

  unrankedActiveRows.forEach(d => {
    const rankElem = d.row.querySelector('.cand-rank-display');
    const statusElem = d.row.querySelector('.cand-status-display');
    const candId = d.row.getAttribute('data-cand-id');
    let cand = currentCandidates.find(c => c.id === candId);
    rankElem.textContent = toKhmerNum(d.order);
    statusElem.innerHTML = '<span class="badge badge-reserve">---</span>';
    if (cand) { cand.rank = d.order; cand.status = ''; }
  });

  inactiveRows.forEach(d => {
    const rankElem = d.row.querySelector('.cand-rank-display');
    const statusElem = d.row.querySelector('.cand-status-display');
    const candId = d.row.getAttribute('data-cand-id');
    let cand = currentCandidates.find(c => c.id === candId);
    rankElem.textContent = toKhmerNum(d.order);
    statusElem.innerHTML = '<span class="badge badge-reserve">---</span>';
    if (cand) { cand.rank = d.order; cand.status = ''; }
  });
}

window.clearCandidateRow = async function(btn) {
  const tr = btn.closest('tr');
  const ok = await showModernConfirm('តើលោកអ្នកពិតជាចង់លុបទិន្នន័យបេក្ខជនក្នុងជួរនេះមែនទេ?', {
    title: 'លុបទិន្នន័យបេក្ខជន',
    confirmText: 'លុបទិន្នន័យ',
    type: 'danger',
    isDanger: true
  });
  if (ok) {
    const order = parseInt(tr.getAttribute('data-order')) || 1;
    tr.classList.remove('duplicate-highlight-row');
    delete tr.dataset.dupConfirmedSig;
    delete tr.dataset.isDuplicate;
    const candId = tr.getAttribute('data-cand-id');
    let cand = currentCandidates.find(c => c.id === candId);
    if (cand) cand.isDuplicate = false;

    // Delete candidate directly on server if already stored
    if (candId && !candId.startsWith('temp_')) {
      try {
        await fetch('/api/candidates/' + candId, { method: 'DELETE' });
      } catch (err) {
        console.error('Error deleting candidate from server in clearCandidateRow:', err);
      }
    }

    tr.querySelector('.cand-name').value = '';
    tr.querySelector('.cand-gender').value = 'ប';
    tr.querySelector('.cand-dob').value = '';
    tr.querySelector('.cand-phone').value = '';
    tr.querySelector('.cand-degree').value = '';
    tr.querySelector('.cand-score-degree').value = toKhmerNum(0);
    tr.querySelector('.cand-exp').value = '';
    tr.querySelector('.cand-score-exp').value = toKhmerNum(0);
    tr.querySelector('.cand-shortlist-display').textContent = toKhmerNum(0);
    tr.querySelector('.cand-interview').value = '';
    tr.querySelector('.cand-total-display').textContent = '---';
    tr.querySelector('.cand-rank-display').textContent = toKhmerNum(order);
    tr.querySelector('.cand-status-display').innerHTML = '<span class="badge badge-reserve">---</span>';

    onCandidateRowChange(tr.querySelector('.cand-name'));
    updateRowDeleteButtonState(tr);
    updateDuplicateBadgeCount();

    // Check if other rows in the active table also lost their duplicate status
    const allRows = document.querySelectorAll('#scoringTableBody tr[data-cand-id]');
    allRows.forEach(async otherTr => {
      if (otherTr.classList.contains('duplicate-highlight-row')) {
        const oName = otherTr.querySelector('.cand-name')?.value?.trim();
        const oGender = otherTr.querySelector('.cand-gender')?.value;
        const oDob = otherTr.querySelector('.cand-dob')?.value?.trim();
        if (oName && oDob) {
          try {
            const checkRes = await fetch('/api/candidates/check-duplicate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: oName,
                gender: oGender,
                dob: oDob,
                excludeId: otherTr.getAttribute('data-cand-id')
              })
            });
            const checkData = await checkRes.json();
            if (checkData && !checkData.isDuplicate) {
              otherTr.classList.remove('duplicate-highlight-row');
              delete otherTr.dataset.isDuplicate;
              delete otherTr.dataset.dupConfirmedSig;
              const oId = otherTr.getAttribute('data-cand-id');
              let oCand = currentCandidates.find(c => c.id === oId);
              if (oCand) oCand.isDuplicate = false;
            }
          } catch(e) {}
        }
      }
    });
  }
};

async function saveBatchScores() {
  const stationId = document.getElementById('scoringStationSelect').value;
  if (!stationId) return alert('សូមជ្រើសរើស ឬវាយលេខកូដការិយាល័យជាមុនសិន!');

  const rows = document.querySelectorAll('#scoringTableBody tr[data-cand-id]');

  // Verify duplicates across rows and across the province before saving
  for (const tr of rows) {
    const nameInput = tr.querySelector('.cand-name');
    const dobInput = tr.querySelector('.cand-dob');
    const name = nameInput ? nameInput.value.trim() : '';
    const dob = dobInput ? dobInput.value.trim() : '';
    if (name && dob) {
      if (tr.classList.contains('duplicate-highlight-row') || tr.dataset.isDuplicate === "true") {
        continue;
      }
      const ok = await checkCandidateDuplicateRow(tr);
      if (!ok) {
        return; // Stopped save because duplicate candidate was rejected
      }
    }
  }

  const candidatesPayload = [];

  rows.forEach(tr => {
    const candId = tr.getAttribute('data-cand-id');
    const roleName = tr.getAttribute('data-role');
    const order = parseInt(tr.getAttribute('data-order')) || 1;
    const nameInput = tr.querySelector('.cand-name');
    const name = nameInput ? nameInput.value.trim() : '';

    const rawInterview = tr.querySelector('.cand-interview') ? tr.querySelector('.cand-interview').value.trim() : '';
    const cleanInterview = (rawInterview === 'អវត្តមាន' || rawInterview.startsWith('អ')) ? 'អវត្តមាន' : (fromKhmerNum(rawInterview));

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
      scoreDegree: parseFloat(fromKhmerNum(tr.querySelector('.cand-score-degree')?.value)) || 0,
      experience: tr.querySelector('.cand-exp') ? tr.querySelector('.cand-exp').value.trim() : '',
      scoreExp: parseFloat(fromKhmerNum(tr.querySelector('.cand-score-exp')?.value)) || 0,
      scoreInterview: cleanInterview,
      isDuplicate: tr.classList.contains('duplicate-highlight-row') || tr.dataset.isDuplicate === "true"
    });
  });

  backupStationCandidatesToLocalStorage(stationId, candidatesPayload);

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
    await updateDuplicateBadgeCount();
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

  // 1. Populate Districts based on user role
  const isSuperOrAdmin = currentUser && (
    currentUser.role === 'SuperAdmin' || 
    currentUser.role === 'Admin' || 
    currentUser.role === 'PEC21'
  );
  const isTrainer = currentUser && currentUser.role === 'Trainer';
  const isCommune = currentUser && currentUser.role === 'Commune';

  const rawDistNames = allDistricts.length 
    ? allDistricts.map(d => d.name) 
    : [...new Set(allPollingStations.map(p => p.district))].filter(Boolean);

  const distNames = [...new Set(rawDistNames.map(n => String(n).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '')))];
  distNames.sort((a, b) => getTakeoDistrictOrder(a) - getTakeoDistrictOrder(b));

  distSelect.innerHTML = '';

  if (isSuperOrAdmin) {
    distSelect.innerHTML = '<option value="">-- ជ្រើសរើសក្រុង/ស្រុក --</option>';
    distSelect.innerHTML += '<option value="all">⭐ គ្រប់ក្រុង-ស្រុក (ទូទាំងខេត្ត)</option>';
    distNames.forEach(name => {
      const label = getDistrictPrefix(name);
      distSelect.innerHTML += `<option value="${name}">${label}</option>`;
    });
    distSelect.disabled = false;
  } else if (isTrainer || isCommune) {
    const cleanUserDist = String(currentUser.district || '').trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
    distSelect.innerHTML = `<option value="${cleanUserDist}">${getDistrictPrefix(cleanUserDist)}</option>`;
    distSelect.value = cleanUserDist;
    distSelect.disabled = true;
  } else {
    distNames.forEach(name => {
      const label = getDistrictPrefix(name);
      distSelect.innerHTML += `<option value="${name}">${label}</option>`;
    });
  }

  // Populate datalist with station codes scoped to user permission
  if (codeDatalist) {
    codeDatalist.innerHTML = '';
    let allowedStations = allPollingStations;
    if (isCommune && currentUser.communeCode) {
      const uCom = String(currentUser.communeCode).padStart(3, '0');
      allowedStations = allPollingStations.filter(p => String(p.communeCode).padStart(3, '0') === uCom);
    } else if (isTrainer && currentUser.district && currentUser.district !== 'all') {
      const uDistClean = String(currentUser.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      allowedStations = allPollingStations.filter(p => String(p.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '') === uDistClean);
    }
    allowedStations.forEach(ps => {
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
        if (currentUser && currentUser.role === 'Trainer') {
          const uDistClean = String(currentUser.district || '').trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
          const mDistClean = String(matched.district || '').trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
          if (uDistClean !== mDistClean) {
            alert(`ការិយាល័យកូដ ${c4} ស្ថិតនៅ${getDistrictPrefix(matched.district)}! គណនីរបស់អ្នកមានសិទ្ធិតែក្នុង${getDistrictPrefix(currentUser.district)} ប៉ុណ្ណោះ។`);
            return;
          }
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

      const schedCard = document.getElementById('reportInterviewScheduleCard');
      if (schedCard) {
        schedCard.style.display = (repType === 'notice') ? 'block' : 'none';
      }
      
      const titleEl = document.getElementById('activeReportSheetTitle');
      if (titleEl) {
        const titles = {
          'sortlist': '📋 សន្លឹក ១ ៖ តារាងសម្រាំងបេក្ខជនសម្រាប់ការសម្ភាសន៍ (សម្រាំងពាក្យ) [📄 ក្រដាសផ្តេក - Landscape]',
          'notice': '📢 សន្លឹក ២ ៖ សេចក្តីជូនដំណឹងបេក្ខជនសម្ភាសន៍ (Notice)',
          'attendance': '✍️ សន្លឹក ៣ ៖ បញ្ជីវត្តមានសម្ភាសន៍ជ្រើសរើស គ.ក.ប (Attendance)',
          'scoresheet': '📝 សន្លឹក ៤ ៖ តារាងស្រង់ពិន្ទុនៃការជ្រើសរើស គ.ក.ប (Score Sheet)',
          'results': '🏆 សន្លឹក ៥ ៖ លទ្ធផលនៃការសម្ភាសន៍ជ្រើសរើស គ.ក.ប តាមលំដាប់ពិន្ទុ (Ranked Results)',
          'final_roster': '📜 សន្លឹក ៦ ៖ បញ្ជីរាយនាមសមាសភាពគណៈកម្មការការិយាល័យបោះឆ្នោត (គ.ក.ប) ផ្លូវការ'
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
  const isAllDistricts = (selDist === 'all');
  const isSuperOrAdmin = currentUser && (
    currentUser.role === 'SuperAdmin' || 
    currentUser.role === 'Admin' || 
    currentUser.role === 'PEC21'
  );
  const isTrainer = currentUser && currentUser.role === 'Trainer';
  const isCommune = currentUser && currentUser.role === 'Commune';

  if (distLabel) {
    distLabel.innerHTML = isAllDistricts ? '🏛️ វិសាលភាព (Scope)' : (isKrong ? '🏛️ ក្រុង (City / District)' : '🏛️ ស្រុក (District)');
  }
  if (comLabel) {
    comLabel.innerHTML = isAllDistricts ? '🏘️ ឃុំ/សង្កាត់ (Commune)' : (isKrong ? '🏘️ សង្កាត់ (Sangkat / Commune)' : '🏘️ ឃុំ (Commune)');
  }

  comSelect.innerHTML = '';

  // 1. All Districts (Province-wide) -> Only SuperAdmin, Admin, PEC21 can select
  if (isAllDistricts) {
    if (!isSuperOrAdmin) {
      const uDist = currentUser ? String(currentUser.district || '').trim().replace(/^(ស្រុក|ក្រុង)\s*/, '') : '';
      distSelect.value = uDist;
      updateReportCommunes(autoSelectFirst);
      return;
    }

    comSelect.innerHTML = '<option value="all">⭐ គ្រប់ឃុំ-សង្កាត់ (ទូទាំងខេត្ត)</option>';
    const sortedAllCommunes = [...allCommunes].sort((a, b) => {
      const da = getTakeoDistrictOrder(a.district);
      const db = getTakeoDistrictOrder(b.district);
      if (da !== db) return da - db;
      return (parseInt(a.code, 10) || 0) - (parseInt(b.code, 10) || 0);
    });
    sortedAllCommunes.forEach(c => {
      const prefix = getCommunePrefix(c.name, c.district);
      comSelect.innerHTML += `<option value="${c.code}">${prefix} (${c.code}) - ${c.district}</option>`;
    });
    if (targetCommuneCode) {
      comSelect.value = String(targetCommuneCode).padStart(3, '0');
    } else {
      comSelect.value = 'all';
    }
    comSelect.disabled = false;
    updateReportStationsForCommune(autoSelectFirst);
    return;
  }

  // 2. Specific District
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

  // Role: Commune -> ONLY allow their own commune!
  if (isCommune) {
    const userComCode = String(currentUser.communeCode || '').padStart(3, '0');
    const matchedCom = distCommunes.find(c => String(c.code).padStart(3, '0') === userComCode) || {
      code: userComCode,
      name: currentUser.communeName || `ឃុំកូដ ${userComCode}`,
      district: currentUser.district
    };
    const prefix = getCommunePrefix(matchedCom.name, matchedCom.district);
    comSelect.innerHTML = `<option value="${userComCode}">${prefix} (${userComCode})</option>`;
    comSelect.value = userComCode;
    comSelect.disabled = true;
    updateReportStationsForCommune(autoSelectFirst);
    return;
  }

  if (!distCommunes.length) {
    comSelect.innerHTML = '<option value="">-- គ្មានឃុំ/សង្កាត់ --</option>';
    updateReportStationsForCommune(false);
    return;
  }

  // Role: SuperAdmin, Admin, PEC21, Trainer -> Can select All Communes in District or specific commune
  const allLabel = isKrong ? '⭐ គ្រប់សង្កាត់ទាំងអស់ក្នុងក្រុង' : '⭐ គ្រប់ឃុំទាំងអស់នៅក្នុងស្រុក';
  comSelect.innerHTML += `<option value="all">${allLabel}</option>`;

  distCommunes.forEach(c => {
    const prefix = getCommunePrefix(c.name, c.district);
    comSelect.innerHTML += `<option value="${c.code}">${prefix} (${c.code})</option>`;
  });
  comSelect.disabled = false;

  if (targetCommuneCode) {
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

  const distSelect = document.getElementById('reportDistrictFilter');
  const selCommuneCode = comSelect.value;
  const selDist = distSelect ? distSelect.value : '';
  codeSelect.innerHTML = '';
  locSelect.innerHTML = '';

  let stations = [];
  if (selCommuneCode === 'all' && selDist === 'all') {
    stations = [...allPollingStations];
  } else if (selCommuneCode === 'all' && selDist && selDist !== 'all') {
    stations = allPollingStations.filter(p => {
      const cleanDist = String(p.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      return cleanDist === selDist;
    });
  } else {
    stations = allPollingStations.filter(p => {
      return String(p.communeCode).padStart(3, '0') === String(selCommuneCode).padStart(3, '0');
    });
  }

  // Safety filter by user role
  if (currentUser && currentUser.role === 'Commune') {
    const userComCode = String(currentUser.communeCode || '').padStart(3, '0');
    stations = stations.filter(p => String(p.communeCode).padStart(3, '0') === userComCode);
  } else if (currentUser && currentUser.role === 'Trainer') {
    const uDistClean = String(currentUser.district || '').trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
    stations = stations.filter(p => String(p.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '') === uDistClean);
  }

  stations.sort((a, b) => {
    const da = getTakeoDistrictOrder(a.district);
    const db = getTakeoDistrictOrder(b.district);
    if (da !== db) return da - db;
    const ca = parseInt(a.communeCode, 10) || 0;
    const cb = parseInt(b.communeCode, 10) || 0;
    if (ca !== cb) return ca - cb;
    const sa = parseInt(a.code, 10) || 0;
    const sb = parseInt(b.code, 10) || 0;
    return sa - sb;
  });

  if (!stations.length) {
    codeSelect.innerHTML = '<option value="">-- គ្មាន --</option>';
    locSelect.innerHTML = '<option value="">-- គ្មានការិយាល័យក្នុងទីតាំងនេះ --</option>';
    if (codeInput) codeInput.value = '';
    if (hiddenStation) hiddenStation.value = '';
    renderReportPreview();
    return;
  }

  // 1. Build the "⭐ គ្រប់ការិយាល័យ..." option at the top
  let allLabel = '';
  let allLocLabel = '';
  if (selCommuneCode === 'all') {
    const scopeLabel = (selDist === 'all') ? 'ទូទាំងខេត្ត' : getDistrictPrefix(selDist);
    allLabel = `⭐ គ្រប់ការិយាល័យនៃ${scopeLabel} (${toKhmerNum(stations.length)})`;
    allLocLabel = `📍 គ្រប់ទីតាំងការិយាល័យនៃ${scopeLabel}`;
  } else {
    const comPrefix = stations.length ? getCommunePrefix(stations[0].communeName, stations[0].district) : 'ឃុំ/សង្កាត់';
    allLabel = `⭐ គ្រប់ការិយាល័យក្នុង${comPrefix} (${toKhmerNum(stations.length)})`;
    allLocLabel = `📍 គ្រប់ទីតាំងការិយាល័យក្នុង${comPrefix}`;
  }

  codeSelect.innerHTML += `<option value="all">${allLabel}</option>`;
  locSelect.innerHTML += `<option value="all">${allLocLabel}</option>`;

  // For district trainers and admins who are viewing a specific commune, also offer "គ្រប់ការិយាល័យនៃក្រុងស្រុក"
  const canSelectAllInDist = currentUser && (
    currentUser.role === 'SuperAdmin' ||
    currentUser.role === 'Admin' ||
    currentUser.role === 'PEC21' ||
    currentUser.role === 'Trainer'
  );
  if (canSelectAllInDist && selCommuneCode !== 'all' && selDist && selDist !== 'all') {
    codeSelect.innerHTML += `<option value="all_district">⭐ គ្រប់ការិយាល័យនៃ${getDistrictPrefix(selDist)}</option>`;
    locSelect.innerHTML += `<option value="all_district">📍 គ្រប់ទីតាំងការិយាល័យនៃ${getDistrictPrefix(selDist)}</option>`;
  }

  // 2. Build individual station options
  stations.forEach(ps => {
    const c4 = String(ps.code || '').padStart(4, '0');
    codeSelect.innerHTML += `<option value="${ps.id}">${c4}</option>`;
    const locText = ps.location ? ` - ${ps.location}` : '';
    locSelect.innerHTML += `<option value="${ps.id}">${ps.name} [${c4}]${locText}</option>`;
  });

  // Synchronize interview schedule panel inputs for this commune
  updateReportInterviewScheduleInputs(selCommuneCode, stations);

  // 3. Selection resolution
  if (targetStationId === 'all') {
    setReportStationById('all', 'init');
    return;
  }
  if (targetStationId === 'all_district') {
    setReportStationById('all_district', 'init');
    return;
  }
  if (targetStationId) {
    const matched = stations.find(p => p.id === targetStationId);
    if (matched) {
      setReportStationById(matched.id, 'init');
      return;
    }
  }

  if (selCommuneCode === 'all') {
    setReportStationById('all', 'init');
  } else if (autoSelectFirst && stations.length) {
    setReportStationById(stations[0].id, 'init');
  } else {
    renderReportPreview();
  }
}

function setReportStationById(stationId, source = '') {
  const distSelect = document.getElementById('reportDistrictFilter');
  const comSelect = document.getElementById('reportCommuneFilter');
  const codeInput = document.getElementById('reportCodeInput');
  const codeSelect = document.getElementById('reportCodeSelect');
  const locSelect = document.getElementById('reportLocationSelect');
  const hiddenStation = document.getElementById('reportStationSelect');
  const infoSpan = document.getElementById('reportActiveStationInfo');

  if (stationId === 'all_district') {
    if (currentUser && currentUser.role === 'Commune') {
      alert('គណនីឃុំសង្កាត់អាចជ្រើសរើសបានត្រឹមកម្រិតឃុំសង្កាត់ខ្លួនប៉ុណ្ណោះ!');
      return;
    }
    if (comSelect) {
      comSelect.value = 'all';
      updateReportStationsForCommune(false, 'all');
      return;
    }
  }

  if (stationId === 'all') {
    if (source !== 'codeSelect' && codeSelect) codeSelect.value = 'all';
    if (source !== 'locSelect' && locSelect) locSelect.value = 'all';
    if (codeInput) {
      codeInput.value = '';
      codeInput.placeholder = 'គ្រប់កូដ...';
    }
    if (hiddenStation) hiddenStation.value = 'all';

    if (infoSpan) {
      const selDist = distSelect ? distSelect.value : '';
      const selCom = comSelect ? comSelect.value : '';
      let scopeStr = 'គ្រប់ការិយាល័យ';
      if (selDist === 'all') scopeStr = 'គ្រប់ការិយាល័យទូទាំងខេត្ត';
      else if (selCom === 'all') scopeStr = `គ្រប់ការិយាល័យនៃ${getDistrictPrefix(selDist)}`;
      else {
        const curCom = allCommunes.find(c => String(c.code).padStart(3, '0') === String(selCom).padStart(3, '0'));
        scopeStr = curCom ? `គ្រប់ការិយាល័យក្នុង${getCommunePrefix(curCom.name, curCom.district)}` : 'គ្រប់ការិយាល័យក្នុងឃុំ';
      }
      infoSpan.textContent = `⭐ ${scopeStr}`;
    }

    renderReportPreview();
    return;
  }

  const ps = allPollingStations.find(p => p.id === stationId);
  if (!ps) return;

  const c4 = String(ps.code || '').padStart(4, '0');
  const cleanDist = String(ps.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');

  if (distSelect && distSelect.value !== 'all' && distSelect.value !== cleanDist) {
    distSelect.value = cleanDist;
  }
  const comCode3 = String(ps.communeCode).padStart(3, '0');
  if (comSelect && comSelect.value !== 'all' && comSelect.value !== comCode3) {
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
// COMMUNE INTERVIEW SCHEDULE MANAGEMENT (Place, Date, Time)
// ==============================================================================

function toISODate(dStr) {
  if (!dStr) return '';
  const str = String(dStr).trim();
  const dmy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
  }
  const ymd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${String(ymd[2]).padStart(2, '0')}-${String(ymd[3]).padStart(2, '0')}`;
  }
  return '';
}

function updateReportInterviewScheduleInputs(selCommuneCode, stations) {
  const card = document.getElementById('reportInterviewScheduleCard');
  if (!card) return;

  const currentRep = document.getElementById('reportTypeSelect')?.value || 'sortlist';
  if (currentRep !== 'notice') {
    card.style.display = 'none';
    return;
  }

  let comCode = selCommuneCode;
  if (!comCode || comCode === 'all') {
    const comSelect = document.getElementById('reportCommuneFilter');
    comCode = comSelect ? comSelect.value : '';
  }
  if (!comCode || comCode === 'all') {
    const hiddenStation = document.getElementById('reportStationSelect');
    const ps = allPollingStations.find(p => p.id === (hiddenStation ? hiddenStation.value : ''));
    if (ps) comCode = String(ps.communeCode).padStart(3, '0');
  }
  if (currentUser && currentUser.role === 'Commune') {
    comCode = String(currentUser.communeCode).padStart(3, '0');
  }

  const label = document.getElementById('reportScheduleCommuneLabel');

  if (!comCode || comCode === 'all') {
    if (label) label.textContent = 'គ្រប់ឃុំ (សូមជ្រើសរើសឃុំជាក់លាក់)';
    card.style.opacity = '0.6';
    return;
  }

  card.style.opacity = '1';
  card.style.display = 'block';

  const comObj = (allCommunes || []).find(c => String(c.code).padStart(3, '0') === String(comCode).padStart(3, '0'));
  const comName = comObj ? comObj.name : '';
  const comPrefix = comName ? getCommunePrefix(comName, comObj?.district) : 'ឃុំ';

  if (label) {
    label.textContent = `${comPrefix} (${toKhmerNum(comCode)})`;
  }

  const sampleStation = (stations && stations.length)
    ? stations.find(s => String(s.communeCode).padStart(3, '0') === String(comCode).padStart(3, '0'))
    : allPollingStations.find(s => String(s.communeCode).padStart(3, '0') === String(comCode).padStart(3, '0'));

  const placeInput = document.getElementById('reportInterviewPlaceInput');
  const datePicker = document.getElementById('reportInterviewDatePicker');
  const timeInput = document.getElementById('reportInterviewTimeInput');

  if (placeInput) {
    placeInput.value = sampleStation?.interviewPlace || (comName ? `សាលា${comPrefix}` : 'សាលាឃុំ');
  }
  if (datePicker) {
    datePicker.value = toISODate(sampleStation?.interviewDate) || '2027-09-07';
  }
  if (timeInput) {
    timeInput.value = sampleStation?.interviewTime || '០៧:០០ ព្រឹក';
  }
}

async function saveCommuneInterviewSchedule(source = 'reports') {
  let comCode = '';
  let place = '';
  let date = '';
  let time = '';
  let btn = null;

  if (source === 'modal') {
    const comSelect = document.getElementById('scoringCommuneFilter');
    comCode = comSelect ? comSelect.value : '';
    if (currentUser && currentUser.role === 'Commune') {
      comCode = String(currentUser.communeCode).padStart(3, '0');
    }
    if (!comCode) {
      const stationId = document.getElementById('scoringStationSelect')?.value;
      const ps = allPollingStations.find(p => p.id === stationId);
      if (ps) comCode = String(ps.communeCode).padStart(3, '0');
    }
    place = document.getElementById('modalInterviewPlaceInput')?.value?.trim();
    date = document.getElementById('modalInterviewDatePicker')?.value?.trim();
    time = document.getElementById('modalInterviewTimeInput')?.value?.trim();
    btn = document.querySelector('#formCommuneSchedule button[type="submit"]');
  } else {
    const comSelect = document.getElementById('reportCommuneFilter');
    comCode = comSelect ? comSelect.value : '';
    if (!comCode || comCode === 'all') {
      const hiddenStation = document.getElementById('reportStationSelect');
      const ps = allPollingStations.find(p => p.id === (hiddenStation ? hiddenStation.value : ''));
      if (ps) comCode = String(ps.communeCode).padStart(3, '0');
    }
    if (currentUser && currentUser.role === 'Commune') {
      comCode = String(currentUser.communeCode).padStart(3, '0');
    }
    place = document.getElementById('reportInterviewPlaceInput')?.value?.trim();
    date = document.getElementById('reportInterviewDatePicker')?.value?.trim();
    time = document.getElementById('reportInterviewTimeInput')?.value?.trim();
    btn = document.getElementById('btnSaveReportInterviewSchedule');
  }

  if (!comCode || comCode === 'all') {
    showModernAlert('សូមជ្រើសរើសឃុំ/សង្កាត់ជាក់លាក់មួយជាមុនសិន!');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'កំពុងរក្សាទុក...';
  }

  try {
    const res = await fetch('/api/communes/interview-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communeCode: comCode,
        interviewPlace: place,
        interviewDate: date,
        interviewTime: time
      })
    });
    const data = await res.json();
    if (data.success) {
      // Update in-memory stations
      allPollingStations.forEach(s => {
        if (String(s.communeCode).padStart(3, '0') === String(comCode).padStart(3, '0')) {
          if (place) s.interviewPlace = place;
          if (date) s.interviewDate = date;
          if (time) s.interviewTime = time;
        }
      });

      // Sync inputs across tabs
      const rPlace = document.getElementById('reportInterviewPlaceInput');
      const rDate = document.getElementById('reportInterviewDatePicker');
      const rTime = document.getElementById('reportInterviewTimeInput');
      if (rPlace && place) rPlace.value = place;
      if (rDate && date) rDate.value = toISODate(date);
      if (rTime && time) rTime.value = time;

      const mPlace = document.getElementById('modalInterviewPlaceInput');
      const mDate = document.getElementById('modalInterviewDatePicker');
      const mTime = document.getElementById('modalInterviewTimeInput');
      if (mPlace && place) mPlace.value = place;
      if (mDate && date) mDate.value = toISODate(date);
      if (mTime && time) mTime.value = time;

      if (source === 'modal') {
        closeModal('modalCommuneSchedule');
      }

      showModernAlert(data.message || 'បានរក្សាទុកព័ត៌មានសម្ភាសន៍ដោយជោគជ័យ!');

      // Re-render report preview
      renderReportPreview();
    } else {
      showModernAlert(data.message || 'មិនអាចរក្សាទុកបានទេ');
    }
  } catch (err) {
    console.error('Error saving interview schedule:', err);
    showModernAlert('មានបញ្ហាក្នុងការតភ្ជាប់ទៅកាន់ Server');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = source === 'modal' ? '💾 រក្សាទុកកាលវិភាគ' : '💾 រក្សាទុក';
    }
  }
}

window.openCommuneScheduleModal = function() {
  try {
    const comSelect = document.getElementById('scoringCommuneFilter');
    let comCode = comSelect ? comSelect.value : '';
    if (currentUser && currentUser.role === 'Commune') {
      comCode = String(currentUser.communeCode).padStart(3, '0');
    }
    if (!comCode) {
      const stationId = document.getElementById('scoringStationSelect')?.value;
      const ps = allPollingStations.find(p => p.id === stationId);
      if (ps) comCode = String(ps.communeCode).padStart(3, '0');
    }

    if (!comCode) {
      if (allPollingStations && allPollingStations.length > 0) {
        comCode = String(allPollingStations[0].communeCode).padStart(3, '0');
      }
    }

    if (!comCode) {
      showModernAlert('សូមជ្រើសរើសឃុំ/សង្កាត់ជាមុនសិន!');
      return;
    }

    const comObj = (allCommunes || []).find(c => String(c.code).padStart(3, '0') === String(comCode).padStart(3, '0'));
    const comName = comObj ? comObj.name : '';
    const comPrefix = comName ? getCommunePrefix(comName, comObj?.district) : 'ឃុំ';
    const sampleStation = allPollingStations.find(s => String(s.communeCode).padStart(3, '0') === String(comCode).padStart(3, '0'));

    const infoP = document.getElementById('modalScheduleCommuneInfo');
    if (infoP) {
      infoP.textContent = `🏛️ កាលវិភាគសម្ភាសន៍ ៖ ${comPrefix} ${comName} (${toKhmerNum(comCode)})`;
    }

    const placeInput = document.getElementById('modalInterviewPlaceInput');
    const dateInput = document.getElementById('modalInterviewDatePicker');
    const timeInput = document.getElementById('modalInterviewTimeInput');

    if (placeInput) placeInput.value = sampleStation?.interviewPlace || (comName ? `សាលា${comPrefix}${comName}` : '');
    if (dateInput) dateInput.value = toISODate(sampleStation?.interviewDate) || '2027-09-07';
    if (timeInput) timeInput.value = sampleStation?.interviewTime || '០៧:០០ ព្រឹក';

    const modal = document.getElementById('modalCommuneSchedule');
    if (modal) {
      modal.classList.add('active');
    }
  } catch (err) {
    console.error('Error opening commune schedule modal:', err);
    showModernAlert('មិនអាចបើកផ្ទាំងកាលវិភាគសម្ភាសន៍បានទេ៖ ' + err.message);
  }
};

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

function buildReportLetterheadHtml(ps, reportType = '') {
  const distSelect = document.getElementById('reportDistrictFilter');
  const comSelect = document.getElementById('reportCommuneFilter');
  const selDist = distSelect ? distSelect.value : '';
  const selCommuneCode = comSelect ? comSelect.value : '';

  const psCodeFormatted = String(ps.code || '').padStart(4, '0');
  const psCodeKhmer = toKhmerNum(psCodeFormatted);
  const communePrefix = getCommunePrefix(ps.communeName, ps.district);
  const communeCodeKhmer = toKhmerNum(String(ps.communeCode || '').padStart(3, '0'));
  const provinceTitle = ps.province || 'គណៈកម្មការរៀបចំការបោះឆ្នោត ខេត្តតាកែវ';
  const committeeTitle = ps.committeeName || 'គណៈកម្មការសម្ភាសន៍ជ្រើសរើស គ.ក.ប';
  const logoCfg = getReportLogoConfig();
  const currentLogoUrl = appSettings.logoUrl || 'img/nec_logo.jpg';

  let jurisdictionLine = `${communePrefix}(${communeCodeKhmer})`;
  if (selCommuneCode === 'all') {
    if (selDist === 'all') {
      jurisdictionLine = 'ទូទាំងខេត្តតាកែវ';
    } else if (selDist) {
      jurisdictionLine = getDistrictPrefix(selDist);
    }
  }

  const isFinalRoster = (reportType === 'final_roster');
  const customInstHeaderKey = isFinalRoster ? 'report_custom_inst_header_final_roster' : 'report_custom_inst_header';
  const savedHeader = localStorage.getItem(customInstHeaderKey);

  let defaultInstHeader = '';
  if (isFinalRoster) {
    defaultInstHeader = `
      <div>គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត</div>
      <div>គណៈកម្មការរៀបចំការបោះឆ្នោត ខេត្តតាកែវ</div>
    `;
  } else {
    defaultInstHeader = `
      <div>គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត</div>
      <div>គណៈកម្មការរៀបចំការបោះឆ្នោត ខេត្តតាកែវ</div>
      <div>${committeeTitle}</div>
      <div>${jurisdictionLine}</div>
    `;
  }

  const instBoxContent = (savedHeader && savedHeader.trim()) ? savedHeader : defaultInstHeader;

  return `
    <div class="letterhead" style="width: 100%; margin-bottom: 2px;">
      <table style="width: 100%; border: none !important; border-collapse: collapse;">
        <tr>
          <!-- Column 1 (35%): Logo on Top, Box 1 (Left Institution Header) Situated Underneath Logo, Left-Aligned -->
          <td style="width: 35%; border: none !important; vertical-align: top; padding: 0; text-align: left;">
            <div style="display: flex; flex-direction: column; align-items: flex-start; text-align: left; width: 100%;">
              <!-- Logo Container (Drag with Mouse handle or Alt-drag, Click image to change) -->
              <div class="report-logo-wrapper" style="display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 2px;">
                <div id="reportLogoContainer" style="display: inline-block; transform: translate(${logoCfg.x}px, ${logoCfg.y}px); cursor: grab;" title="ចុចរូបភាពដើម្បីប្តូរ Logo ឬអូស Mouse ដើម្បីរំកិលទីតាំង">
                  <img id="reportLogoImg" src="${currentLogoUrl}" alt="NEC Logo" style="width: ${logoCfg.size}px; height: ${logoCfg.size}px; object-fit: contain; border-radius: 50%; display: block;">
                  <input type="file" id="reportLogoFileInput" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp" style="display: none;">
                </div>
              </div>
              <!-- Box 1 (Left Institution Header): Left-aligned, Font Khmer OS Muol Light, Size: 10pt -->
              <div class="report-inst-header-box" data-report-type="${reportType || ''}" contenteditable="true" spellcheck="false" title="ប្រអប់ទី១ ៖ អាចកែសម្រួលអត្ថបទបាន">
                ${instBoxContent}
              </div>
            </div>
          </td>
          <!-- Column 2 (30%): Box 2 (Kingdom Header: Khmer OS Muol Light Size 12pt, Tacteing Single Symbol - Centered on A4 Paper) -->
          <td style="width: 30%; border: none !important; vertical-align: top; text-align: center; padding: 0;">
            <div class="report-kingdom-header-box" style="padding-top: 0; white-space: nowrap;">
              <div class="report-kingdom-title">ព្រះរាជាណាចក្រកម្ពុជា</div>
              <div class="report-kingdom-title">ជាតិ  សាសនា  ព្រះមហាក្សត្រ</div>
              <div class="report-tacteing-emblem" contenteditable="true" spellcheck="false" title="និមិត្តសញ្ញា Font Tacteing (Size: 18pt) - អាចកែសម្រួលបាន">${localStorage.getItem('report_custom_tacteing') || '5'}</div>
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
  const currentReportType = document.getElementById('reportTypeSelect')?.value || '';
  const savedCustomTitle = localStorage.getItem('report_custom_title_' + currentReportType);
  if (savedCustomTitle && savedCustomTitle.trim()) {
    return `
      <div class="report-title-section report-title-box report-draggable-box" contenteditable="true" spellcheck="false" style="text-align: center; margin: 1px 0 4px 0;" title="ប្រអប់ទី៣ ៖ ចំណងជើងអាចកែសម្រួលបាន">
        ${savedCustomTitle}
      </div>
    `;
  }

  const psCodeFormatted = String(ps.code || '').padStart(4, '0');
  const psCodeKhmer = toKhmerNum(psCodeFormatted);
  const mandateText = appSettings.mandateTitle || 'សម្រាប់ការបោះឆ្នោតជ្រើសរើសក្រុមប្រឹក្សាឃុំ សង្កាត់ អណត្តិទី៧ ឆ្នាំ២០២៧';

  const subHtml = customSubHtml || `<div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; color: #000; text-align: center;">${mandateText}</div>`;

  return `
    <div class="report-title-section report-title-box report-draggable-box" contenteditable="true" spellcheck="false" style="text-align: center; margin: 1px 0 4px 0;" title="ប្រអប់ទី៣ ៖ ចំណងជើងអាចកែសម្រួលបាន">
      <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; color: #000; margin-bottom: 2px; text-align: center;">${titleText}</div>
      ${subHtml}
      <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; margin-top: 3px; color: #000; text-align: center;">លេខកូដការិយាល័យ ៖ ${psCodeKhmer}</div>
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
  const hiddenStation = document.getElementById('reportStationSelect');
  const codeSelect = document.getElementById('reportCodeSelect');
  const stationId = hiddenStation ? hiddenStation.value : '';
  const reportType = document.getElementById('reportTypeSelect').value;
  const container = document.getElementById('printContainer');

  const isAllStations = (stationId === 'all' || (codeSelect && codeSelect.value === 'all') || stationId === 'all_district');

  if (!stationId && !isAllStations) {
    container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted);">សូមជ្រើសរើសការិយាល័យបោះឆ្នោតដើម្បីពិនិត្យ និងបោះពុម្ពរបាយការណ៍</div>';
    return;
  }

  // Representative station (ps) for letterhead and fallback
  let ps = null;
  if (stationId && stationId !== 'all' && stationId !== 'all_district') {
    ps = allPollingStations.find(p => p.id === stationId);
  }
  if (!ps) {
    const distSelect = document.getElementById('reportDistrictFilter');
    const comSelect = document.getElementById('reportCommuneFilter');
    const selDist = distSelect ? distSelect.value : '';
    const selCommuneCode = comSelect ? comSelect.value : '';
    
    if (selCommuneCode && selCommuneCode !== 'all') {
      ps = allPollingStations.find(p => String(p.communeCode).padStart(3, '0') === String(selCommuneCode).padStart(3, '0'));
    } else if (selDist && selDist !== 'all') {
      ps = allPollingStations.find(p => String(p.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '') === selDist);
    }
    if (!ps && allPollingStations.length) {
      ps = allPollingStations[0];
    }
  }

  if (!ps) return;

  const psCodeFormatted = String(ps.code || '').padStart(4, '0');
  const psCodeKhmer = toKhmerNum(psCodeFormatted);
  const communePrefix = getCommunePrefix(ps.communeName, ps.district);
  const communeCodeKhmer = toKhmerNum(String(ps.communeCode || '').padStart(3, '0'));
  const mandateText = appSettings.mandateTitle || 'សម្រាប់ការបោះឆ្នោតជ្រើសរើសក្រុមប្រឹក្សាឃុំ សង្កាត់ អណត្តិទី៧ ឆ្នាំ២០២៧';
  const provinceTitle = ps.province || 'គណៈកម្មការរៀបចំការបោះឆ្នោត ខេត្តតាកែវ';
  const committeeTitle = ps.committeeName || 'គណៈកម្មការសម្ភាសន៍ជ្រើសរើស គ.ក.ប';

  const distSelect = document.getElementById('reportDistrictFilter');
  const comSelect = document.getElementById('reportCommuneFilter');
  const selDist = distSelect ? distSelect.value : '';
  const selCommuneCode = comSelect ? comSelect.value : '';

  updateReportInterviewScheduleInputs(selCommuneCode);

  let allTargetCandidates = [];
  let targetStations = [];
  let scopeBoxTitle = `${communePrefix} (${communeCodeKhmer})`;

  if (isAllStations) {
    let apiUrl = '';
    if (selDist === 'all' && selCommuneCode === 'all') {
      targetStations = [...(allPollingStations || [])];
      apiUrl = '/api/candidates?district=all&communeCode=all';
      scopeBoxTitle = 'ទូទាំងខេត្តតាកែវ';
    } else if (selDist && selDist !== 'all' && selCommuneCode === 'all') {
      targetStations = (allPollingStations || []).filter(p => {
        const cleanDist = String(p.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
        return cleanDist === selDist;
      });
      apiUrl = `/api/candidates?district=${encodeURIComponent(selDist)}&communeCode=all`;
      scopeBoxTitle = getDistrictPrefix(selDist);
    } else {
      const effectiveCommuneCode = (selCommuneCode && selCommuneCode !== 'all') ? selCommuneCode : ps.communeCode;
      targetStations = (allPollingStations || []).filter(p => {
        return String(p.communeCode).padStart(3, '0') === String(effectiveCommuneCode).padStart(3, '0');
      });
      apiUrl = `/api/candidates?communeCode=${effectiveCommuneCode}`;
      const curCom = allCommunes.find(c => String(c.code).padStart(3, '0') === String(effectiveCommuneCode).padStart(3, '0'));
      scopeBoxTitle = curCom ? `${getCommunePrefix(curCom.name, curCom.district)} (${toKhmerNum(curCom.code)})` : `${communePrefix} (${communeCodeKhmer})`;
    }

    targetStations.sort((a, b) => {
      const da = getTakeoDistrictOrder(a.district);
      const db = getTakeoDistrictOrder(b.district);
      if (da !== db) return da - db;
      const ca = parseInt(a.communeCode, 10) || 0;
      const cb = parseInt(b.communeCode, 10) || 0;
      if (ca !== cb) return ca - cb;
      const sa = parseInt(a.code, 10) || 0;
      const sb = parseInt(b.code, 10) || 0;
      return sa - sb;
    });

    try {
      const res = await fetch(apiUrl);
      const data = await res.json();
      allTargetCandidates = data.candidates || [];
    } catch (err) {
      console.error('Error fetching candidates for multi-station report:', err);
    }
  } else {
    targetStations = [ps];
    try {
      const res = await fetch(`/api/candidates?pollingStationId=${ps.id}`);
      const data = await res.json();
      allTargetCandidates = data.candidates || [];
    } catch (err) {
      console.error('Error fetching candidates for single station report:', err);
    }
  }

  // Group candidates by role for single station
  const roleGroups = {};
  ROLES_ORDER.forEach(r => roleGroups[r] = []);
  allTargetCandidates.forEach(c => {
    if (!isAllStations || c.pollingStationId === ps.id) {
      if (roleGroups[c.role]) roleGroups[c.role].push(c);
    }
  });

  let reportContentHtml = '';

  const isLandscape = (reportType === 'sortlist');
  if (isLandscape) {
    document.body.classList.add('report-landscape-active');
  } else {
    document.body.classList.remove('report-landscape-active');
  }

  const isMultiPage = (isAllStations || reportType === 'sortlist');
  if (isMultiPage) {
    document.body.classList.add('report-multipage-active');
  } else {
    document.body.classList.remove('report-multipage-active');
  }

  // Dynamically set browser print dialog page orientation (Landscape for Report 1, Portrait for Reports 2-5)
  let orientStyle = document.getElementById('printOrientationStyle');
  if (!orientStyle) {
    orientStyle = document.createElement('style');
    orientStyle.id = 'printOrientationStyle';
    document.head.appendChild(orientStyle);
  }
  orientStyle.textContent = isLandscape
    ? '@page { size: landscape !important; margin: 4mm 6mm !important; } @media print { .print-paper-sheet { max-width: 100% !important; width: 100% !important; padding: 0 !important; margin: 0 !important; } }'
    : '@page { size: portrait !important; margin: 4mm 6mm !important; } @media print { .print-paper-sheet { max-width: 100% !important; width: 100% !important; padding: 0 !important; margin: 0 !important; } }';

  // ----------------------------------------------------------------------------
  // SHEET 1: SortList (តារាងសម្រាំងបេក្ខជនសម្រាប់ការសម្ភាសន៍ជ្រើសរើស គ.ក.ប - ក្រដាសផ្តេក Landscape)
  // ----------------------------------------------------------------------------
  if (reportType === 'sortlist') {
    const tableColgroupHtml = `
      <colgroup>
        <col style="width: 34px;">
        <col style="width: 145px;">
        <col style="width: 35px;">
        <col style="width: 120px;">
        <col style="width: 200px;">
        <col style="width: 35px;">
        <col style="width: 255px;">
        <col style="width: 35px;">
        <col style="width: 78px;">
        <col style="width: 60px;">
      </colgroup>
    `;

    const tableHeaderHtml = `
            <tr>
              <th rowspan="2" style="width: 34px; vertical-align: middle; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 10.5pt !important; font-weight: normal !important;">ល.រ</th>
              <th rowspan="2" style="width: 145px; min-width: 145px; vertical-align: middle; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 10.5pt !important; font-weight: normal !important;">គោត្តនាម-នាម</th>
              <th rowspan="2" style="width: 35px; vertical-align: middle; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 10.5pt !important; font-weight: normal !important;">ភេទ</th>
              <th rowspan="2" class="th-dob" style="width: 120px; min-width: 120px; white-space: nowrap !important; vertical-align: middle; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 10.5pt !important; font-weight: normal !important;">ថ្ងៃ ខែ ឆ្នាំកំណើត</th>
              <th colspan="2" style="text-align: center; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 10.5pt !important; font-weight: normal !important;">កម្រិតសញ្ញាបត្រ</th>
              <th colspan="2" style="text-align: center; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 10.5pt !important; font-weight: normal !important;">បទពិសោធន៍</th>
              <th rowspan="2" class="th-total-score" style="width: 78px; min-width: 78px; white-space: nowrap !important; vertical-align: middle; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 10.5pt !important; font-weight: normal !important;">សរុបពិន្ទុ</th>
              <th rowspan="2" style="width: 60px; vertical-align: middle; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 10.5pt !important; font-weight: normal !important;">ផ្សេងៗ</th>
            </tr>
            <tr>
              <th class="th-criteria text-left" style="font-size: 7.2pt; font-weight: normal; text-align: left !important; padding: 2px 3px; line-height: 1.25; width: 200px;">
                <div style="text-align: left !important;">-សញ្ញាបត្រទុតិយភូមិ ឬបទពិសោធន៍ស្របនឹងមុខតំណែង<br>
                ចាប់ពី១ឆ្នាំ/ដង ដល់២ឆ្នាំ/ដង=៥ពិន្ទុ<br>
                -សញ្ញាបត្រខ្ពស់ជាង ឬបទពិសោធន៍ស្របនឹងមុខតំណែង<br>
                ចាប់ពី៣ឆ្នាំ/ដង ឡើង =៨ពិន្ទុ</div>
              </th>
              <th style="width: 35px; vertical-align: middle; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 10.5pt !important; font-weight: normal !important;">ពិន្ទុ</th>
              <th class="th-criteria text-left" style="font-size: 7pt; font-weight: normal; text-align: left !important; padding: 2px 3px; line-height: 1.2; width: 255px;">
                <div style="text-align: left !important;">+ បទពិសោធន៍ស្របមុខតំណែង និងមានសញ្ញាបត្រ<br>
                -១ឆ្នាំ/ដង ដល់២ឆ្នាំ/ដង =៤ពិន្ទុ, ៣ឆ្នាំ/ដង ដល់៤ឆ្នាំ/ដង=៨ពិន្ទុ<br>
                ៥ឆ្នាំ/ដងឡើង =១២ពិន្ទុ<br>
                + បទពិសោធន៍ស្របមុខតំណែង និងគ្មានសញ្ញាបត្រ<br>
                -២ឆ្នាំ/ដង ដល់៣ឆ្នាំ/ដង =៤ពិន្ទុ, ៤ឆ្នាំ/ដង ដល់៥ឆ្នាំ/ដង=៨ពិន្ទុ<br>
                ៦ឆ្នាំ/ដងឡើង =១២ពិន្ទុ<br>
                + សមាជិកទី១,សមាជិកទី២,សមាជិកទី៣<br>
                -២ឆ្នាំ=៨ពិន្ទុ ,ចាប់ពី៣ឆ្នាំឡើង=១២ពិន្ទុ</div>
              </th>
              <th style="width: 35px; vertical-align: middle; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 10.5pt !important; font-weight: normal !important;">ពិន្ទុ</th>
            </tr>
    `;

    if (isAllStations) {
      let rowsAllHtml = '';
      let prevDist = null;
      let prevCom = null;

      targetStations.forEach(st => {
        const cleanDist = String(st.district || '').trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
        if ((selDist === 'all' || selCommuneCode === 'all') && cleanDist !== prevDist) {
          prevDist = cleanDist;
          rowsAllHtml += `
            <tr class="district-banner-row">
              <td colspan="10" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; background: #e0e7ff; padding: 5px 8px 5px 10px; border: 1px solid #000; text-align: left !important; color: #1e1b4b;">
                🏛️ ${getDistrictPrefix(st.district)}
              </td>
            </tr>
          `;
        }
        if (selCommuneCode === 'all' && st.communeCode !== prevCom) {
          prevCom = st.communeCode;
          rowsAllHtml += `
            <tr class="commune-banner-row">
              <td colspan="10" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; background: #f1f5f9; padding: 4px 8px; border: 1px solid #000; text-align: left; color: #334155;">
                🏘️ ${getCommunePrefix(st.communeName, st.district)} (${toKhmerNum(st.communeCode)})
              </td>
            </tr>
          `;
        }

        const stCodeFormatted = String(st.code || '').padStart(4, '0');
        const stCodeKhmer = toKhmerNum(stCodeFormatted);

        rowsAllHtml += `
          <tr class="station-banner-row">
            <td colspan="10" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; background: #e2e8f0; padding: 4px 8px; border: 1px solid #000; text-align: left;">
              - លេខកូដការិយាល័យ ៖ ${stCodeKhmer}
            </td>
          </tr>
        `;

        const stCands = allTargetCandidates.filter(c => c.pollingStationId === st.id);
        const stRoleGroups = {};
        ROLES_ORDER.forEach(r => stRoleGroups[r] = []);
        stCands.forEach(c => {
          if (stRoleGroups[c.role]) stRoleGroups[c.role].push(c);
        });

        ROLES_ORDER.forEach(role => {
          rowsAllHtml += `
            <tr class="category-row">
              <td colspan="10" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 10.5pt !important; font-weight: normal !important; background: #fff; padding: 2px 6px; border: 1px solid #000; text-align: left;">
                - មុខតំណែង ៖ ${role}
              </td>
            </tr>
          `;
          const items = stRoleGroups[role] || [];
          for (let i = 1; i <= 3; i++) {
            const c = items.find(x => x.orderInRole === i);
            const isEmpty = !c || !c.name;
            const khmerIdx = toKhmerNum(i);
            const dobKhmer = c && c.dob ? toKhmerNum(c.dob) : '';
            const scoreDeg = c && c.scoreDegree !== undefined && c.scoreDegree !== '' ? toKhmerNum(c.scoreDegree) : '';
            const scoreExp = c && c.scoreExp !== undefined && c.scoreExp !== '' ? toKhmerNum(c.scoreExp) : '';
            const scoreTot = c && c.scoreShortlist !== undefined && c.scoreShortlist !== '' ? toKhmerNum(c.scoreShortlist) : '';

            const cName = sanitizeCandidateText(c ? (c.name || '') : '');
            const cDegree = sanitizeCandidateText(c ? (c.degree || '') : '');
            const cExp = sanitizeCandidateText(c ? (c.experience || '') : '');
            const cNotes = sanitizeCandidateText(c ? (c.notes || '') : '');

            rowsAllHtml += `
              <tr class="${isEmpty ? 'empty-candidate-row' : ''}">
                <td class="center" style="width: 34px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${khmerIdx}</td>
                <td style="font-weight: normal; width: 145px; min-width: 145px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${cName}</td>
                <td class="center" style="width: 35px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${c ? (c.gender || '') : ''}</td>
                <td class="center" style="width: 120px; min-width: 120px; white-space: nowrap !important; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${dobKhmer}</td>
                <td style="width: 200px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${cDegree}</td>
                <td class="center" style="width: 35px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${scoreDeg}</td>
                <td style="width: 255px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${cExp}</td>
                <td class="center" style="width: 35px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${scoreExp}</td>
                <td class="center" style="font-weight: normal; width: 78px; min-width: 78px; white-space: nowrap !important; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${scoreTot}</td>
                <td style="width: 60px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${cNotes}</td>
              </tr>
            `;
          }
        });
      });

      const sortlistScopeTitleBoxHtml = `
        <div class="report-title-section report-title-box" contenteditable="true" spellcheck="false" style="text-align: center; margin: 1px 0 4px 0;" title="ប្រអប់ទី៣ ៖ ចំណងជើងអាចកែសម្រួលបាន">
          <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; color: #000; margin-bottom: 2px; text-align: center;">តារាងសម្រាំងបេក្ខជនសម្រាប់ការសម្ភាសន៍ជ្រើសរើស គ.ក.ប</div>
          <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; color: #000; text-align: center;">${mandateText}</div>
          <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; margin-top: 3px; color: #000; text-align: center;">${scopeBoxTitle}</div>
        </div>
      `;

      reportContentHtml = `
        <div class="print-paper-sheet landscape">
          ${buildReportLetterheadHtml(ps)}
          ${sortlistScopeTitleBoxHtml}
          <table class="official-print-table" style="margin-top: 2px; margin-bottom: 0;">
            ${tableColgroupHtml}
            <thead>
              ${tableHeaderHtml}
            </thead>
            <tbody>
              ${rowsAllHtml}
            </tbody>
          </table>
          ${getOfficialSignatureBlock(ps, 'sortlist')}
        </div>
      `;
    } else {
      // Single-station SortList (Original 2-page print layout)
      let rowsAllHtml = '';
      let rowsPage1Html = '';
      let rowsPage2Html = '';
      ROLES_ORDER.forEach((role, rIdx) => {
        let roleHtml = `
          <tr class="category-row">
            <td colspan="10" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 10.5pt !important; font-weight: normal !important; background: #fff; padding: 2px 6px; border: 1px solid #000; text-align: left;">
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
          const scoreDeg = c && c.scoreDegree !== undefined && c.scoreDegree !== '' ? toKhmerNum(c.scoreDegree) : '';
          const scoreExp = c && c.scoreExp !== undefined && c.scoreExp !== '' ? toKhmerNum(c.scoreExp) : '';
          const scoreTot = c && c.scoreShortlist !== undefined && c.scoreShortlist !== '' ? toKhmerNum(c.scoreShortlist) : '';

          const cName = sanitizeCandidateText(c ? (c.name || '') : '');
          const cDegree = sanitizeCandidateText(c ? (c.degree || '') : '');
          const cExp = sanitizeCandidateText(c ? (c.experience || '') : '');
          const cNotes = sanitizeCandidateText(c ? (c.notes || '') : '');

          roleHtml += `
            <tr class="${isEmpty ? 'empty-candidate-row' : ''}">
              <td class="center" style="width: 34px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${khmerIdx}</td>
              <td style="font-weight: normal; width: 145px; min-width: 145px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${cName}</td>
              <td class="center" style="width: 35px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${c ? (c.gender || '') : ''}</td>
              <td class="center" style="width: 120px; min-width: 120px; white-space: nowrap !important; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${dobKhmer}</td>
              <td style="width: 200px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${cDegree}</td>
              <td class="center" style="width: 35px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${scoreDeg}</td>
              <td style="width: 255px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${cExp}</td>
              <td class="center" style="width: 35px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${scoreExp}</td>
              <td class="center" style="font-weight: normal; width: 78px; min-width: 78px; white-space: nowrap !important; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${scoreTot}</td>
              <td style="width: 60px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important;">${cNotes}</td>
            </tr>
          `;
        }

        rowsAllHtml += roleHtml;
        if (rIdx < 3) {
          rowsPage1Html += roleHtml;
        } else {
          rowsPage2Html += roleHtml;
        }
      });

      reportContentHtml = `
        <div class="print-paper-sheet landscape">
          <!-- SCREEN VIEW: Single continuous sheet (shown only on screen) -->
          <div class="report-screen-view no-print">
            ${buildReportLetterheadHtml(ps)}
            ${buildReportTitleBoxHtml(ps, 'តារាងសម្រាំងបេក្ខជនសម្រាប់ការសម្ភាសន៍ជ្រើសរើស គ.ក.ប')}
            <table class="official-print-table" style="margin-top: 2px; margin-bottom: 0;">
              ${tableColgroupHtml}
              <thead>
                ${tableHeaderHtml}
              </thead>
              <tbody>
                ${rowsAllHtml}
              </tbody>
            </table>
            ${getOfficialSignatureBlock(ps, 'sortlist')}
          </div>

          <!-- PRINT VIEW: Exactly 2 pages (hidden on screen, visible only when printing) -->
          <div class="report-print-view print-only">
            <!-- PAGE 1 : Roles 1 to 3 (ប្រធាន, អនុប្រធាន, លេខាធិការ) -->
            <div class="report-print-page report-print-page-1">
              <div class="report-page-body">
                ${buildReportLetterheadHtml(ps)}
                ${buildReportTitleBoxHtml(ps, 'តារាងសម្រាំងបេក្ខជនសម្រាប់ការសម្ភាសន៍ជ្រើសរើស គ.ក.ប')}
                <table class="official-print-table" style="margin-top: 2px; margin-bottom: 0;">
                  ${tableColgroupHtml}
                  <thead>
                    ${tableHeaderHtml}
                  </thead>
                  <tbody>
                    ${rowsPage1Html}
                  </tbody>
                </table>
              </div>
              <div class="report-page-footer print-only">
                ១/២
              </div>
            </div>

            <!-- PAGE 2 : Roles 4 to 6 (សមាជិកទី១, សមាជិកទី២, សមាជិកទី៣) + Signatures -->
            <div class="report-print-page report-print-page-2">
              <div class="report-page-body">
                <table class="official-print-table" style="margin-top: 0;">
                  ${tableColgroupHtml}
                  <thead>
                    ${tableHeaderHtml}
                  </thead>
                  <tbody>
                    ${rowsPage2Html}
                  </tbody>
                </table>
                ${getOfficialSignatureBlock(ps, 'sortlist')}
              </div>
              <div class="report-page-footer print-only">
                ២/២
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // ----------------------------------------------------------------------------
  // SHEET 2: ជូនដំណឹង (សេចក្តីជូនដំណឹងបេក្ខជនសម្ភាសន៍)
  // ----------------------------------------------------------------------------
  else if (reportType === 'notice') {
    const interviewPlace = (isAllStations && selCommuneCode === 'all')
      ? (selDist === 'all' ? 'តាមការិយាល័យបោះឆ្នោតនីមួយៗ' : `តាមសាលាឃុំ/សង្កាត់ក្នុង${getDistrictPrefix(selDist)}`)
      : (ps.interviewPlace || `សាលា${communePrefix}`);
    const solarDateFormatted = getKhmerSolarDateString(ps.interviewDate);
    const interviewTime = ps.interviewTime || '០៧:០០ ព្រឹក';

    const noticeSubHtml = `
      <div style="font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; line-height: 1.6; color: #000; text-align: justify !important; text-justify: inter-word !important; margin: 4px 0 2px 0; width: 100%;">
        បេក្ខជនដែលបានដាក់ពាក្យសុំចូលបម្រើការងារជាមន្ត្រី គ.ក.ប ដូចមានរាយនាមខាងក្រោម ត្រូវមកធ្វើសម្ភាសន៍ នៅ<span class="report-editable-notice-place" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែសម្រួលទីកន្លែងសម្ភាសន៍">${interviewPlace}</span> នាថ្ងៃទី<span class="report-editable-notice-date" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែសម្រួលកាលបរិច្ឆេទសម្ភាសន៍">${solarDateFormatted}</span> វេលាម៉ោង <span class="report-editable-notice-time" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែសម្រួលម៉ោងសម្ភាសន៍">${interviewTime}</span> តទៅ។
      </div>
    `;

    let rowsHtml = '';
    let prevDist = null;
    let prevCom = null;

    targetStations.forEach(st => {
      const cleanDist = String(st.district || '').trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      if (isAllStations && (selDist === 'all' || selCommuneCode === 'all') && cleanDist !== prevDist) {
        prevDist = cleanDist;
        rowsHtml += `
          <tr class="district-banner-row">
            <td colspan="6" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; background: #e0e7ff; padding: 5px 8px 5px 10px; border: 1px solid #000; text-align: left !important; color: #1e1b4b;">
              🏛️ ${getDistrictPrefix(st.district)}
            </td>
          </tr>
        `;
      }
      if (isAllStations && selCommuneCode === 'all' && st.communeCode !== prevCom) {
        prevCom = st.communeCode;
        rowsHtml += `
          <tr class="commune-banner-row">
            <td colspan="6" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; background: #f1f5f9; padding: 4px 8px; border: 1px solid #000; text-align: left; color: #334155;">
              🏘️ ${getCommunePrefix(st.communeName, st.district)} (${toKhmerNum(st.communeCode)})
            </td>
          </tr>
        `;
      }

      if (isAllStations) {
        const stCodeFormatted = String(st.code || '').padStart(4, '0');
        const stCodeKhmer = toKhmerNum(stCodeFormatted);
        rowsHtml += `
          <tr class="station-banner-row">
            <td colspan="6" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; background: #e2e8f0; padding: 4px 8px; border: 1px solid #000; text-align: left;">
              - លេខកូដការិយាល័យ ៖ ${stCodeKhmer}
            </td>
          </tr>
        `;
      }

      const stCands = allTargetCandidates.filter(c => c.pollingStationId === st.id);
      const stRoleGroups = {};
      ROLES_ORDER.forEach(r => stRoleGroups[r] = []);
      stCands.forEach(c => {
        if (stRoleGroups[c.role]) stRoleGroups[c.role].push(c);
      });

      ROLES_ORDER.forEach(role => {
        rowsHtml += `
          <tr class="category-row">
            <td colspan="6" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; background: #fff; padding: 2px 6px; border: 1px solid #000; text-align: left;">
              - មុខតំណែង ៖ ${role}
            </td>
          </tr>
        `;
        const items = stRoleGroups[role] || [];
        for (let i = 1; i <= 3; i++) {
          const c = items.find(x => x.orderInRole === i);
          const isEmpty = !c || !c.name;
          const khmerIdx = toKhmerNum(i);
          const dobKhmer = c && c.dob ? toKhmerNum(c.dob) : '';

          rowsHtml += `
            <tr class="${isEmpty ? 'empty-candidate-row' : ''}">
              <td class="center" style="width: 45px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${khmerIdx}</td>
              <td style="font-weight: normal; width: 140px; min-width: 140px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? (c.name || '') : ''}</td>
              <td class="center" style="width: 50px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? (c.gender || '') : ''}</td>
              <td class="center" style="width: 125px; white-space: nowrap !important; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${dobKhmer}</td>
              <td class="center" style="width: 170px; min-width: 170px; font-weight: normal; white-space: nowrap !important; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? formatKhmerPhoneNumber(c.phone || '') : ''}</td>
              <td style="width: 90px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? (c.notes || '') : ''}</td>
            </tr>
          `;
        }
      });
    });

    const titleBoxHtml = isAllStations ? `
      <div class="report-title-section report-title-box" contenteditable="true" spellcheck="false" style="text-align: center; margin: 1px 0 4px 0;" title="ប្រអប់ទី៣ ៖ ចំណងជើងអាចកែសម្រួលបាន">
        <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; color: #000; margin-bottom: 2px; text-align: center;">សេចក្ដីជូនដំណឹង</div>
        <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; color: #000; text-align: center;">${mandateText}</div>
        <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; margin-top: 3px; color: #000; text-align: center;">${scopeBoxTitle}</div>
        ${noticeSubHtml}
      </div>
    ` : buildReportTitleBoxHtml(ps, 'សេចក្ដីជូនដំណឹង', noticeSubHtml);

    reportContentHtml = `
      <div class="print-paper-sheet report-sheet-notice">
        ${buildReportLetterheadHtml(ps)}
        ${titleBoxHtml}
        <table class="official-print-table report-notice-table" style="margin-top: 2px;">
          <thead>
            <tr>
              <th style="width: 45px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ល.រ</th>
              <th style="width: 140px; min-width: 140px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">គោត្តនាម-នាម</th>
              <th style="width: 50px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ភេទ</th>
              <th class="th-dob" style="width: 125px; min-width: 125px; white-space: nowrap !important; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ថ្ងៃ ខែ ឆ្នាំកំណើត</th>
              <th style="width: 170px; min-width: 170px; white-space: nowrap !important; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">លេខទូរសព្ទ</th>
              <th style="width: 90px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ផ្សេងៗ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        ${getOfficialSignatureBlock(ps, 'notice')}
      </div>
    `;
  }

  // ----------------------------------------------------------------------------
  // SHEET 3: បញ្ជីវត្តមាន (បញ្ជីវត្តមានសម្ភាសន៍)
  // ----------------------------------------------------------------------------
  else if (reportType === 'attendance') {
    let rowsHtml = '';
    let prevDist = null;
    let prevCom = null;

    targetStations.forEach(st => {
      const cleanDist = String(st.district || '').trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      if (isAllStations && (selDist === 'all' || selCommuneCode === 'all') && cleanDist !== prevDist) {
        prevDist = cleanDist;
        rowsHtml += `
          <tr class="district-banner-row">
            <td colspan="7" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; background: #e0e7ff; padding: 5px 8px 5px 10px; border: 1px solid #000; text-align: left !important; color: #1e1b4b;">
              🏛️ ${getDistrictPrefix(st.district)}
            </td>
          </tr>
        `;
      }
      if (isAllStations && selCommuneCode === 'all' && st.communeCode !== prevCom) {
        prevCom = st.communeCode;
        rowsHtml += `
          <tr class="commune-banner-row">
            <td colspan="7" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; background: #f1f5f9; padding: 4px 8px; border: 1px solid #000; text-align: left; color: #334155;">
              🏘️ ${getCommunePrefix(st.communeName, st.district)} (${toKhmerNum(st.communeCode)})
            </td>
          </tr>
        `;
      }

      if (isAllStations) {
        const stCodeFormatted = String(st.code || '').padStart(4, '0');
        const stCodeKhmer = toKhmerNum(stCodeFormatted);
        rowsHtml += `
          <tr class="station-banner-row">
            <td colspan="7" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; background: #e2e8f0; padding: 4px 8px; border: 1px solid #000; text-align: left;">
              - លេខកូដការិយាល័យ ៖ ${stCodeKhmer}
            </td>
          </tr>
        `;
      }

      const stCands = allTargetCandidates.filter(c => c.pollingStationId === st.id);
      const stRoleGroups = {};
      ROLES_ORDER.forEach(r => stRoleGroups[r] = []);
      stCands.forEach(c => {
        if (stRoleGroups[c.role]) stRoleGroups[c.role].push(c);
      });

      ROLES_ORDER.forEach(role => {
        rowsHtml += `
          <tr class="category-row">
            <td colspan="7" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; background: #fff; padding: 2px 6px; border: 1px solid #000; text-align: left;">
              - មុខតំណែង ៖ ${role}
            </td>
          </tr>
        `;
        const items = stRoleGroups[role] || [];
        for (let i = 1; i <= 3; i++) {
          const c = items.find(x => x.orderInRole === i);
          const isEmpty = !c || !c.name;
          const khmerIdx = toKhmerNum(i);
          const dobKhmer = c && c.dob ? toKhmerNum(c.dob) : '';

          rowsHtml += `
            <tr class="${isEmpty ? 'empty-candidate-row' : ''}">
              <td class="center" style="width: 45px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${khmerIdx}</td>
              <td style="font-weight: normal; min-width: 180px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? (c.name || '') : ''}</td>
              <td class="center" style="width: 50px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? (c.gender || '') : ''}</td>
              <td class="center" style="width: 125px; white-space: nowrap !important; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${dobKhmer}</td>
              <td style="width: 130px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;"></td>
              <td style="width: 130px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;"></td>
              <td style="width: 90px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? (c.notes || '') : ''}</td>
            </tr>
          `;
        }
      });
    });

    const titleBoxHtml = isAllStations ? `
      <div class="report-title-section report-title-box" contenteditable="true" spellcheck="false" style="text-align: center; margin: 1px 0 4px 0;" title="ប្រអប់ទី៣ ៖ ចំណងជើងអាចកែសម្រួលបាន">
        <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; color: #000; margin-bottom: 2px; text-align: center;">បញ្ជីវត្តមានសម្ភាសន៍ ជ្រើសរើស គ.ក.ប</div>
        <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; color: #000; text-align: center;">${mandateText}</div>
        <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; margin-top: 3px; color: #000; text-align: center;">${scopeBoxTitle}</div>
      </div>
    ` : buildReportTitleBoxHtml(ps, 'បញ្ជីវត្តមានសម្ភាសន៍ ជ្រើសរើស គ.ក.ប');

    reportContentHtml = `
      <div class="print-paper-sheet">
        ${buildReportLetterheadHtml(ps)}
        ${titleBoxHtml}
        <table class="official-print-table" style="margin-top: 2px;">
          <thead>
            <tr>
              <th style="width: 45px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ល.រ</th>
              <th style="min-width: 180px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">គោត្តនាម-នាម</th>
              <th style="width: 50px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ភេទ</th>
              <th class="th-dob" style="width: 125px; min-width: 125px; white-space: nowrap !important; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ថ្ងៃ ខែ ឆ្នាំកំណើត</th>
              <th style="width: 130px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ហត្ថលេខាចូល</th>
              <th style="width: 130px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ហត្ថលេខាចេញ</th>
              <th style="width: 90px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ផ្សេងៗ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        ${getOfficialSignatureBlock(ps, 'attendance')}
      </div>
    `;
  }

  // ----------------------------------------------------------------------------
  // SHEET 4: បញ្ចូលពិន្ទុ (តារាងស្រង់ពិន្ទុនៃការជ្រើសរើស គ.ក.ប)
  // ----------------------------------------------------------------------------
  else if (reportType === 'scoresheet') {
    let rowsHtml = '';
    let prevDist = null;
    let prevCom = null;

    targetStations.forEach(st => {
      const cleanDist = String(st.district || '').trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      if (isAllStations && (selDist === 'all' || selCommuneCode === 'all') && cleanDist !== prevDist) {
        prevDist = cleanDist;
        rowsHtml += `
          <tr class="district-banner-row">
            <td colspan="8" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; background: #e0e7ff; padding: 5px 8px 5px 10px; border: 1px solid #000; text-align: left !important; color: #1e1b4b;">
              🏛️ ${getDistrictPrefix(st.district)}
            </td>
          </tr>
        `;
      }
      if (isAllStations && selCommuneCode === 'all' && st.communeCode !== prevCom) {
        prevCom = st.communeCode;
        rowsHtml += `
          <tr class="commune-banner-row">
            <td colspan="8" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; background: #f1f5f9; padding: 4px 8px; border: 1px solid #000; text-align: left; color: #334155;">
              🏘️ ${getCommunePrefix(st.communeName, st.district)} (${toKhmerNum(st.communeCode)})
            </td>
          </tr>
        `;
      }

      if (isAllStations) {
        const stCodeFormatted = String(st.code || '').padStart(4, '0');
        const stCodeKhmer = toKhmerNum(stCodeFormatted);
        rowsHtml += `
          <tr class="station-banner-row">
            <td colspan="8" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; background: #e2e8f0; padding: 4px 8px; border: 1px solid #000; text-align: left;">
              - លេខកូដការិយាល័យ ៖ ${stCodeKhmer}
            </td>
          </tr>
        `;
      }

      const stCands = allTargetCandidates.filter(c => c.pollingStationId === st.id);
      const stRoleGroups = {};
      ROLES_ORDER.forEach(r => stRoleGroups[r] = []);
      stCands.forEach(c => {
        if (stRoleGroups[c.role]) stRoleGroups[c.role].push(c);
      });

      ROLES_ORDER.forEach(role => {
        rowsHtml += `
          <tr class="category-row">
            <td colspan="8" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; background: #fff; padding: 2px 6px; border: 1px solid #000; text-align: left;">
              - មុខតំណែង ៖ ${role}
            </td>
          </tr>
        `;
        const items = stRoleGroups[role] || [];
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
              scoreShortlistHtml = `<td class="center" style="width: 95px; font-weight: normal; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c.scoreShortlist !== undefined && c.scoreShortlist !== '' ? toKhmerNum(Number(c.scoreShortlist).toFixed(2)) : toKhmerNum('0.00')}</td>`;
              scoreInterviewHtml = `<td class="center official-absent-cell" style="width: 110px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">អវត្តមាន</td>`;
              scoreTotalHtml = `<td class="center official-absent-cell" style="width: 95px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">អវត្តមាន</td>`;
            } else {
              const sShort = c.scoreShortlist !== undefined && c.scoreShortlist !== '' ? toKhmerNum(Number(c.scoreShortlist).toFixed(2)) : '';
              const sInt = c.scoreInterview !== undefined && c.scoreInterview !== '' ? toKhmerNum(Number(c.scoreInterview).toFixed(2)) : '';
              const sTot = c.scoreTotal !== undefined && c.scoreTotal !== '' ? toKhmerNum(Number(c.scoreTotal).toFixed(2)) : '';
              scoreShortlistHtml = `<td class="center" style="width: 95px; font-weight: normal; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${sShort}</td>`;
              scoreInterviewHtml = `<td class="center" style="width: 110px; font-weight: normal; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${sInt}</td>`;
              scoreTotalHtml = `<td class="center" style="width: 95px; font-weight: normal; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${sTot}</td>`;
            }
          } else {
            scoreShortlistHtml = `<td class="center" style="width: 95px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;"></td>`;
            scoreInterviewHtml = `<td class="center" style="width: 110px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;"></td>`;
            scoreTotalHtml = `<td class="center" style="width: 95px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;"></td>`;
          }

          rowsHtml += `
            <tr class="${isEmpty ? 'empty-candidate-row' : ''} ${isAbsent ? 'absent-row' : ''}">
              <td class="center" style="width: 45px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${khmerIdx}</td>
              <td style="font-weight: normal; min-width: 180px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? (c.name || '') : ''}</td>
              <td class="center" style="width: 50px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? (c.gender || '') : ''}</td>
              <td class="center" style="width: 125px; white-space: nowrap !important; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${dobKhmer}</td>
              ${scoreShortlistHtml}
              ${scoreInterviewHtml}
              ${scoreTotalHtml}
              <td style="width: 90px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? (c.notes || '') : ''}</td>
            </tr>
          `;
        }
      });
    });

    const titleBoxHtml = isAllStations ? `
      <div class="report-title-section report-title-box" contenteditable="true" spellcheck="false" style="text-align: center; margin: 1px 0 4px 0;" title="ប្រអប់ទី៣ ៖ ចំណងជើងអាចកែសម្រួលបាន">
        <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; color: #000; margin-bottom: 2px; text-align: center;">តារាងស្រង់ពិន្ទុនៃការជ្រើសរើស គ.ក.ប</div>
        <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; color: #000; text-align: center;">${mandateText}</div>
        <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; margin-top: 3px; color: #000; text-align: center;">${scopeBoxTitle}</div>
      </div>
    ` : buildReportTitleBoxHtml(ps, 'តារាងស្រង់ពិន្ទុនៃការជ្រើសរើស គ.ក.ប');

    reportContentHtml = `
      <div class="print-paper-sheet">
        ${buildReportLetterheadHtml(ps)}
        ${titleBoxHtml}
        <table class="official-print-table" style="margin-top: 2px;">
          <thead>
            <tr>
              <th style="width: 45px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ល.រ</th>
              <th style="min-width: 180px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">គោត្តនាម-នាម</th>
              <th style="width: 50px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ភេទ</th>
              <th class="th-dob" style="width: 125px; min-width: 125px; white-space: nowrap !important; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ថ្ងៃ ខែ ឆ្នាំកំណើត</th>
              <th style="width: 95px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ពិន្ទុសម្រាំង</th>
              <th style="width: 110px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ពិន្ទុសម្ភាសន៍</th>
              <th style="width: 95px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">សរុបពិន្ទុ</th>
              <th style="width: 90px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ផ្សេងៗ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        ${getOfficialSignatureBlock(ps, 'scoresheet')}
      </div>
    `;
  }

  // ----------------------------------------------------------------------------
  // SHEET 5: លទ្ធផលតាមលំដាប់ (Ranked official results for 1 station or ALL stations)
  // ----------------------------------------------------------------------------
  else if (reportType === 'results' || reportType === 'commune_results') {
    if (isAllStations) {
      let rowsHtml = '';
      let prevDist = null;
      let prevCom = null;

      targetStations.forEach(st => {
        const cleanDist = String(st.district || '').trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
        if ((selDist === 'all' || selCommuneCode === 'all') && cleanDist !== prevDist) {
          prevDist = cleanDist;
          rowsHtml += `
            <tr class="district-banner-row">
              <td colspan="7" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; background: #e0e7ff; padding: 5px 8px 5px 10px; border: 1px solid #000; text-align: left !important; color: #1e1b4b;">
                🏛️ ${getDistrictPrefix(st.district)}
              </td>
            </tr>
          `;
        }
        if (selCommuneCode === 'all' && st.communeCode !== prevCom) {
          prevCom = st.communeCode;
          rowsHtml += `
            <tr class="commune-banner-row">
              <td colspan="7" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; background: #f1f5f9; padding: 4px 8px; border: 1px solid #000; text-align: left; color: #334155;">
                🏘️ ${getCommunePrefix(st.communeName, st.district)} (${toKhmerNum(st.communeCode)})
              </td>
            </tr>
          `;
        }

        const stCodeFormatted = String(st.code || '').padStart(4, '0');
        const stCodeKhmer = toKhmerNum(stCodeFormatted);

        // Station code header banner inside the table (above President role)
        rowsHtml += `
          <tr class="station-banner-row">
            <td colspan="7" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; background: #e2e8f0; padding: 4px 8px; border: 1px solid #000; text-align: left;">
              - លេខកូដការិយាល័យ ៖ ${stCodeKhmer}
            </td>
          </tr>
        `;

        // Get candidates for this specific station
        const stationCands = allTargetCandidates.filter(c => c.pollingStationId === st.id);
        const stRoleGroups = {};
        ROLES_ORDER.forEach(r => stRoleGroups[r] = []);
        stationCands.forEach(c => {
          if (stRoleGroups[c.role]) stRoleGroups[c.role].push(c);
        });

        // Render all 6 roles for this station
        ROLES_ORDER.forEach(role => {
          rowsHtml += `
            <tr class="category-row">
              <td colspan="7" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; background: #fff; padding: 2px 6px; border: 1px solid #000; text-align: left;">
                - មុខតំណែង ៖ ${role}
              </td>
            </tr>
          `;
          const items = stRoleGroups[role] || [];
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
                scoreTotalHtml = `<td class="center official-absent-cell" style="width: 95px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">អវត្តមាន</td>`;
                statusHtml = `<td class="official-absent-cell" style="width: 110px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: left !important; padding-left: 10px !important;">អវត្តមាន</td>`;
              } else {
                const sTot = c.scoreTotal !== undefined && c.scoreTotal !== '' ? toKhmerNum(Number(c.scoreTotal).toFixed(2)) : '';
                scoreTotalHtml = `<td class="center" style="width: 95px; font-weight: normal; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${sTot}</td>`;
                if (c.status === 'A-ជាប់') {
                  statusHtml = `<td style="width: 110px; font-weight: normal; color: #000; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: left !important; padding-left: 10px !important;">A-ជាប់</td>`;
                } else if (c.status === 'B-បម្រុង') {
                  statusHtml = `<td style="width: 110px; font-weight: normal; color: #000; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: left !important; padding-left: 10px !important;">B-បម្រុង</td>`;
                } else if (c.status === 'C-បម្រុង' || c.status === 'C-បម្រុងបន្ទាប់') {
                  statusHtml = `<td style="width: 110px; font-weight: normal; color: #000; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: left !important; padding-left: 10px !important;">C-បម្រុងបន្ទាប់</td>`;
                } else {
                  statusHtml = `<td style="width: 110px; font-weight: normal; color: #000; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: left !important; padding-left: 10px !important;">${c.status || ''}</td>`;
                }
              }
            } else {
              scoreTotalHtml = `<td class="center" style="width: 95px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;"></td>`;
              statusHtml = `<td style="width: 110px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: left !important; padding-left: 10px !important;"></td>`;
            }

            rowsHtml += `
              <tr class="${isEmpty ? 'empty-candidate-row' : ''} ${isAbsent ? 'absent-row' : ''}">
                <td class="center" style="width: 45px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${khmerIdx}</td>
                <td style="font-weight: normal; min-width: 180px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? (c.name || '') : ''}</td>
                <td class="center" style="width: 50px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? (c.gender || '') : ''}</td>
                <td class="center" style="width: 125px; white-space: nowrap !important; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${dobKhmer}</td>
                ${scoreTotalHtml}
                ${statusHtml}
                <td style="width: 90px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? (c.notes || '') : ''}</td>
              </tr>
            `;
          }
        });
      });

      const communeTitleBoxHtml = `
        <div class="report-title-section report-title-box" contenteditable="true" spellcheck="false" style="text-align: center; margin: 1px 0 4px 0;" title="ប្រអប់ទី៣ ៖ ចំណងជើងអាចកែសម្រួលបាន">
          <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; color: #000; margin-bottom: 2px; text-align: center;">លទ្ធផលនៃការសម្ភាសន៍ជ្រើសរើស គ.ក.ប</div>
          <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; color: #000; text-align: center;">${mandateText}</div>
          <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; margin-top: 3px; color: #000; text-align: center;">${scopeBoxTitle}</div>
        </div>
      `;

      reportContentHtml = `
        <div class="print-paper-sheet">
          ${buildReportLetterheadHtml(ps)}
          ${communeTitleBoxHtml}
          <table class="official-print-table" style="margin-top: 2px;">
            <thead>
              <tr>
                <th style="width: 45px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ល.រ</th>
                <th style="min-width: 180px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">គោត្តនាម-នាម</th>
                <th style="width: 50px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ភេទ</th>
                <th class="th-dob" style="width: 125px; min-width: 125px; white-space: nowrap !important; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ថ្ងៃ ខែ ឆ្នាំកំណើត</th>
                <th style="width: 95px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">សរុបពិន្ទុ</th>
                <th style="width: 110px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">និទ្ទេស</th>
                <th style="width: 90px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ផ្សេងៗ</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          ${getOfficialSignatureBlock(ps, 'results')}
        </div>
      `;
    } else {
      // Single-Station View
      let rowsHtml = '';
      ROLES_ORDER.forEach(role => {
        rowsHtml += `
          <tr class="category-row">
            <td colspan="7" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; background: #fff; padding: 2px 6px; border: 1px solid #000; text-align: left;">
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
              scoreTotalHtml = `<td class="center official-absent-cell" style="width: 95px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">អវត្តមាន</td>`;
              statusHtml = `<td class="official-absent-cell" style="width: 110px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: left !important; padding-left: 10px !important;">អវត្តមាន</td>`;
            } else {
              const sTot = c.scoreTotal !== undefined && c.scoreTotal !== '' ? toKhmerNum(Number(c.scoreTotal).toFixed(2)) : '';
              scoreTotalHtml = `<td class="center" style="width: 95px; font-weight: normal; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${sTot}</td>`;
              if (c.status === 'A-ជាប់') {
                statusHtml = `<td style="width: 110px; font-weight: normal; color: #000; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: left !important; padding-left: 10px !important;">A-ជាប់</td>`;
              } else if (c.status === 'B-បម្រុង') {
                statusHtml = `<td style="width: 110px; font-weight: normal; color: #000; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: left !important; padding-left: 10px !important;">B-បម្រុង</td>`;
              } else if (c.status === 'C-បម្រុង' || c.status === 'C-បម្រុងបន្ទាប់') {
                statusHtml = `<td style="width: 110px; font-weight: normal; color: #000; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: left !important; padding-left: 10px !important;">C-បម្រុងបន្ទាប់</td>`;
              } else {
                statusHtml = `<td style="width: 110px; font-weight: normal; color: #000; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: left !important; padding-left: 10px !important;">${c.status || ''}</td>`;
              }
            }
          } else {
            scoreTotalHtml = `<td class="center" style="width: 95px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;"></td>`;
            statusHtml = `<td style="width: 110px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: left !important; padding-left: 10px !important;"></td>`;
          }

          rowsHtml += `
            <tr class="${isEmpty ? 'empty-candidate-row' : ''} ${isAbsent ? 'absent-row' : ''}">
              <td class="center" style="width: 45px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${khmerIdx}</td>
              <td style="font-weight: normal; min-width: 180px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? (c.name || '') : ''}</td>
              <td class="center" style="width: 50px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? (c.gender || '') : ''}</td>
              <td class="center" style="width: 125px; white-space: nowrap !important; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${dobKhmer}</td>
              ${scoreTotalHtml}
              ${statusHtml}
              <td style="width: 90px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important;">${c ? (c.notes || '') : ''}</td>
            </tr>
          `;
        }
      });

      reportContentHtml = `
        <div class="print-paper-sheet">
          ${buildReportLetterheadHtml(ps)}
          ${buildReportTitleBoxHtml(ps, 'លទ្ធផលនៃការសម្ភាសន៍ជ្រើសរើស គ.ក.ប')}
          <table class="official-print-table" style="margin-top: 2px;">
            <thead>
              <tr>
                <th style="width: 45px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ល.រ</th>
                <th style="min-width: 180px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">គោត្តនាម-នាម</th>
                <th style="width: 50px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ភេទ</th>
                <th class="th-dob" style="width: 125px; min-width: 125px; white-space: nowrap !important; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ថ្ងៃ ខែ ឆ្នាំកំណើត</th>
                <th style="width: 95px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">សរុបពិន្ទុ</th>
                <th style="width: 110px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">និទ្ទេស</th>
                <th style="width: 90px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important;">ផ្សេងៗ</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          ${getOfficialSignatureBlock(ps, 'results')}
        </div>
      `;
    }
  }

  // ----------------------------------------------------------------------------
  // SHEET 6: បញ្ជីរាយនាមសមាសភាពគណៈកម្មការការិយាល័យបោះឆ្នោត (គ.ក.ប) ផ្លូវការ
  // ----------------------------------------------------------------------------
  else if (reportType === 'final_roster') {
    const distSelect = document.getElementById('reportDistrictFilter');
    const comSelect = document.getElementById('reportCommuneFilter');
    const selDist = distSelect ? distSelect.value : '';
    const selCommuneCode = comSelect ? comSelect.value : '';

    let targetStations = [];
    let apiUrl = '';

    if (!isAllStations && ps) {
      targetStations = [ps];
      apiUrl = `/api/candidates?pollingStationId=${ps.id}`;
    } else if (selDist === 'all' && selCommuneCode === 'all') {
      targetStations = [...(allPollingStations || [])];
      apiUrl = '/api/candidates?district=all&communeCode=all';
    } else if (selDist && selDist !== 'all' && selCommuneCode === 'all') {
      targetStations = (allPollingStations || []).filter(p => {
        const cleanDist = String(p.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
        return cleanDist === selDist;
      });
      apiUrl = `/api/candidates?district=${encodeURIComponent(selDist)}&communeCode=all`;
    } else {
      const effectiveCommuneCode = (selCommuneCode && selCommuneCode !== 'all') ? selCommuneCode : ps.communeCode;
      targetStations = (allPollingStations || []).filter(p => {
        return String(p.communeCode).padStart(3, '0') === String(effectiveCommuneCode).padStart(3, '0');
      });
      apiUrl = `/api/candidates?communeCode=${effectiveCommuneCode}`;
    }

    targetStations.sort((a, b) => {
      const da = getTakeoDistrictOrder(a.district);
      const db = getTakeoDistrictOrder(b.district);
      if (da !== db) return da - db;
      const ca = parseInt(a.communeCode, 10) || 0;
      const cb = parseInt(b.communeCode, 10) || 0;
      if (ca !== cb) return ca - cb;
      const sa = parseInt(a.code, 10) || 0;
      const sb = parseInt(b.code, 10) || 0;
      return sa - sb;
    });

    let communeCandidates = [];
    try {
      const res = await fetch(apiUrl);
      const data = await res.json();
      communeCandidates = data.candidates || [];
    } catch (err) {
      console.error('Error fetching commune candidates:', err);
    }

    const ROSTER_ROLES = [
      'ប្រធាន',
      'អនុប្រធាន',
      'លេខាធិការ',
      'សមាជិកទី១',
      'សមាជិកទី២',
      'សមាជិកទី៣'
    ];

    const stats = {
      'ប្រធាន': { total: 0, female: 0 },
      'អនុប្រធាន': { total: 0, female: 0 },
      'លេខាធិការ': { total: 0, female: 0 },
      'សមាជិកទី១': { total: 0, female: 0 },
      'សមាជិកទី២': { total: 0, female: 0 },
      'សមាជិកទី៣': { total: 0, female: 0 },
      grandTotal: 0,
      grandFemale: 0
    };

    let rowsHtml = '';
    let globalRowIdx = 0;
    let prevDistrict = null;
    let prevCommuneCode = null;

    targetStations.forEach((st) => {
      const cleanCurDist = String(st.district || '').trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      const isFirstStOfDistrict = (cleanCurDist !== prevDistrict);
      if (isFirstStOfDistrict) {
        prevDistrict = cleanCurDist;
      }

      const curCommuneCode = String(st.communeCode || '').padStart(3, '0');
      const isFirstStOfCommune = (curCommuneCode !== prevCommuneCode);
      if (isFirstStOfCommune) {
        prevCommuneCode = curCommuneCode;
      }

      const stCands = communeCandidates.filter(c => c.pollingStationId === st.id);

      ROSTER_ROLES.forEach((role, roleIdx) => {
        globalRowIdx++;
        const khmerRowIdx = toKhmerNum(globalRowIdx);

        // Find candidate for this role with status 'A-ជាប់'
        let c = stCands.find(x => x.role === role && x.status === 'A-ជាប់');
        if (!c) {
          const roleCands = stCands.filter(x => x.role === role);
          roleCands.sort((a, b) => {
            if (a.rank && b.rank) return a.rank - b.rank;
            const at = parseFloat(a.scoreTotal) || 0;
            const bt = parseFloat(b.scoreTotal) || 0;
            return bt - at;
          });
          c = roleCands[0];
        }

        const isFemale = c && (c.gender === 'ស' || c.gender === 'ស្រី');
        stats[role].total++;
        stats.grandTotal++;
        if (isFemale) {
          stats[role].female++;
          stats.grandFemale++;
        }

        const candName = c ? (c.name || '') : '';
        const candGender = c ? (c.gender || '') : '';

        const communeCol = (roleIdx === 0 && isFirstStOfCommune) ? (st.communeName || '') : ' -';
        const districtCol = (roleIdx === 0 && isFirstStOfDistrict) ? (st.district || '') : ' -';
        const stCodeFormatted = String(st.code || '').padStart(4, '0');
        const stCodeCol = (roleIdx === 0) ? toKhmerNum(stCodeFormatted) : ' -';

        rowsHtml += `
          <tr>
            <td class="center" style="width: 40px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: center; border: 1px solid #000; padding: 3px 4px;">${khmerRowIdx}</td>
            <td style="width: 140px; min-width: 135px; max-width: 145px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; border: 1px solid #000; padding: 3px 6px; font-weight: normal !important; text-align: left;">${candName}</td>
            <td class="center" style="width: 40px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: center; border: 1px solid #000; padding: 3px 4px;">${candGender}</td>
            <td style="width: 115px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: left !important; border: 1px solid #000; padding: 3px 6px;">${role}</td>
            <td class="center" style="width: 140px; white-space: nowrap; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: center; border: 1px solid #000; padding: 3px 4px;">${communeCol}</td>
            <td class="center" style="width: 120px; white-space: nowrap; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: center; border: 1px solid #000; padding: 3px 4px;">${districtCol}</td>
            <td class="center" style="width: 110px; white-space: nowrap !important; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 11pt !important; text-align: center; border: 1px solid #000; padding: 3px 4px;">${stCodeCol}</td>
          </tr>
        `;
      });
    });

    const bottomFooterHtml = `
      <div class="final-roster-footer" style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 6px; width: 100%; page-break-inside: avoid; break-inside: avoid;">
        <div class="final-roster-bottom-breakdown" style="font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif !important; font-size: 10.5pt !important; font-weight: 700; line-height: 1.4; margin: 0 !important; padding: 0 !important; vertical-align: top;">
          បញ្ឈប់បញ្ជីនេះត្រឹមចំនួន ${toKhmerNum(stats.grandTotal)} នាក់ ក្នុងនោះ ស្រី ${toKhmerNum(stats.grandFemale)} នាក់។
        </div>
        <div style="margin-left: auto;">
          ${getOfficialSignatureBlock(ps, 'final_roster')}
        </div>
      </div>
    `;

    reportContentHtml = `
      <div class="print-paper-sheet">
        ${buildReportLetterheadHtml(ps, 'final_roster')}
        <div class="report-title-section report-title-box" contenteditable="true" spellcheck="false" style="text-align: center; margin: 4px 0 6px 0;" title="ចំណងជើងរបាយការណ៍ ៖ អាចកែសម្រួលបាន">
          <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 13pt !important; font-weight: normal !important; color: #000; margin-bottom: 4px; text-align: center;">បញ្ជីរាយនាម</div>
          <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 12pt !important; font-weight: normal !important; color: #000; margin-bottom: 4px; text-align: center;">សមាសភាពគណៈកម្មការការិយាល័យបោះឆ្នោត ( គ.ក.ប )</div>
          <div style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; color: #000; text-align: center;">${mandateText}</div>
        </div>
        <table class="final-roster-table official-print-table" style="width: 100%; border-collapse: collapse; margin-top: 4px;">
          <thead>
            <tr>
              <th style="width: 40px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; text-align: center;">ល.រ</th>
              <th style="width: 140px; min-width: 135px; max-width: 145px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; text-align: center;">គោត្តនាម និងនាម</th>
              <th style="width: 40px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; text-align: center;">ភេទ</th>
              <th style="width: 115px; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; text-align: center;">មុខតំណែង</th>
              <th style="width: 140px; white-space: nowrap; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; text-align: center;">ឃុំ សង្កាត់</th>
              <th style="width: 120px; white-space: nowrap; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; text-align: center;">ក្រុង ស្រុក</th>
              <th style="width: 110px; white-space: nowrap !important; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 11pt !important; font-weight: normal !important; text-align: center;">លេខកូដការិ.</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        ${bottomFooterHtml}
      </div>
    `;
  }

  container.innerHTML = reportContentHtml;
  setupReportLogoInteractions();
  setupReportDateInteractions();
  setupReportSignatureInteractions();
  setupReportTableRowHeightControls();
  setupAutoPrintPagination();
}

function sanitizeCandidateText(text) {
  if (!text || typeof text !== 'string') return '';
  if (/deployment|temporarily\s*paused|cognito|amazonaws/i.test(text)) {
    return '';
  }
  return text;
}

function getReportDateConfig() {
  const auto = computeAutoDates(new Date());
  let lunar = localStorage.getItem('report_lunar_date');
  let solar = localStorage.getItem('report_solar_date');
  return {
    lunar: (lunar !== null && lunar !== '' && !lunar.includes('.....')) ? lunar : auto.lunar,
    solar: (solar !== null && solar !== '' && !solar.includes('.....')) ? solar : auto.solar
  };
}

function setReportDateConfig(lunar, solar) {
  if (lunar !== undefined) localStorage.setItem('report_lunar_date', lunar);
  if (solar !== undefined) localStorage.setItem('report_solar_date', solar);
}

function getKhmerSolarDateString(val) {
  if (!val) return '០៩ ខែកក្កដា ឆ្នាំ២០២៧';
  let str = String(val).trim();
  if (/[\u1780-\u17FF]/.test(str)) {
    return str.replace(/^(នា)?ថ្ងៃទី\s*/, '').trim();
  }

  const khmerSolarMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];

  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const mIdx = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    if (mIdx >= 0 && mIdx < 12) {
      return `${toKhmerNum(String(day).padStart(2, '0'))} ខែ${khmerSolarMonths[mIdx]} ឆ្នាំ${toKhmerNum(year)}`;
    }
  }

  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    if (str.includes('T')) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = khmerSolarMonths[d.getMonth()];
        const year = d.getFullYear();
        return `${toKhmerNum(day)} ខែ${month} ឆ្នាំ${toKhmerNum(year)}`;
      }
    }
    const year = parseInt(ymdMatch[1], 10);
    const mIdx = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    if (mIdx >= 0 && mIdx < 12) {
      return `${toKhmerNum(String(day).padStart(2, '0'))} ខែ${khmerSolarMonths[mIdx]} ឆ្នាំ${toKhmerNum(year)}`;
    }
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = khmerSolarMonths[d.getMonth()];
    const year = d.getFullYear();
    return `${toKhmerNum(day)} ខែ${month} ឆ្នាំ${toKhmerNum(year)}`;
  }

  return toKhmerNum(str);
}

function computeAutoDates(targetDate) {
  let dateObj;
  if (!targetDate) {
    dateObj = new Date();
  } else if (typeof targetDate === 'string') {
    if (targetDate.includes('-')) {
      const parts = targetDate.split('-').map(Number);
      dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      dateObj = new Date(targetDate);
    }
  } else {
    dateObj = targetDate;
  }

  if (isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }

  const day = dateObj.getDate();
  const month = dateObj.getMonth();
  const year = dateObj.getFullYear();

  const khmerSolarMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
  const solarMonth = khmerSolarMonths[month];
  const solar = `ថ្ងៃទី${toKhmerNum(day)} ខែ${solarMonth} ឆ្នាំ${toKhmerNum(year)}`;
  const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  let lunar = '';

  // Use momentkh library for exact traditional Khmer lunar date calculation (completely no dots!)
  if (typeof momentkh !== 'undefined' && typeof momentkh.fromGregorian === 'function') {
    try {
      const mDate = momentkh.fromGregorian(year, month + 1, day);
      if (mDate && mDate.khmer) {
        const k = mDate.khmer;
        const khDayNum = toKhmerNum(k.day);
        const dayPrefix = k.dayOfWeekName ? `ថ្ងៃ${k.dayOfWeekName} ` : 'ថ្ងៃ';
        // E.g.: ថ្ងៃពុធ ៣កើត ខែអស្សុជ ឆ្នាំមមី អដ្ឋស័ក ព.ស.២៥៧០
        lunar = `${dayPrefix}${khDayNum}${k.moonPhaseName} ខែ${k.monthName} ឆ្នាំ${k.animalYearName} ${k.sakName} ព.ស.${toKhmerNum(k.beYear)}`;
      }
    } catch (err) {
      console.warn('Error in momentkh conversion:', err);
    }
  }

  // Fallback if momentkh is unavailable (still no dots!)
  if (!lunar) {
    const khmerAnimals = ['ជូត', 'ឆ្លូវ', 'ខាល', 'ថោះ', 'រោង', 'ម្សាញ់', 'មមី', 'មមែ', 'វក', 'រកា', 'ច', 'កុរ'];
    const khmerSaks = ['សំរឹទ្ធិស័ក', 'ឯកស័ក', 'ទោស័ក', 'ត្រីស័ក', 'ចត្វាស័ក', 'បញ្ចស័ក', 'ឆស័ក', 'សប្តស័ក', 'អដ្ឋស័ក', 'នព្វស័ក'];
    const khmerLunarMonths = ['បុស្ស', 'មាឃ', 'ផល្គុន', 'ចេត្រ', 'ពិសាខ', 'ជេស្ឋ', 'បឋមាសាឍ', 'ស្រាពណ៍', 'ភទ្របទ', 'អស្សុជ', 'កត្តិក', 'មិគសិរ'];
    const khmerDaysOfWeek = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];

    const beYear = year + (month >= 4 ? 544 : 543);
    const animal = khmerAnimals[((year - 4) % 12 + 12) % 12];
    const sak = khmerSaks[((year - 2018) % 10 + 10) % 10];
    const lunarMonth = khmerLunarMonths[month];
    const dayOfWeek = khmerDaysOfWeek[dateObj.getDay()];

    lunar = `ថ្ងៃ${dayOfWeek} ខែ${lunarMonth} ឆ្នាំ${animal} ${sak} ព.ស.${toKhmerNum(beYear)}`;
  }

  return { solar, lunar, isoDate };
}

function getOfficialSignatureBlock(ps, reportType = 'sortlist') {
  const dateCfg = getReportDateConfig();

  let signatureContent = '';
  if (reportType === 'sortlist') {
    const savedCommittee = localStorage.getItem('report_sig_committee_sortlist');
    const committeeTitle = (savedCommittee !== null && savedCommittee.trim() !== '') ? savedCommittee : 'គណៈកម្មការសម្រាំងជ្រើសរើស គ.ក.ប';
    const savedList = localStorage.getItem('report_sig_list_sortlist');
    const defaultList = `
          <div style="display: flex; align-items: baseline; white-space: nowrap;">
            <span style="width: 26px;">១-</span>
            <span style="width: 140px; overflow: hidden; letter-spacing: 2px;">.........................................</span>
            <span style="width: 75px; text-align: left;">ប្រធាន</span>
            <span style="width: 120px; overflow: hidden; letter-spacing: 2px;">.........................................</span>
          </div>
          <div style="display: flex; align-items: baseline; white-space: nowrap;">
            <span style="width: 26px;">២-</span>
            <span style="width: 140px; overflow: hidden; letter-spacing: 2px;">.........................................</span>
            <span style="width: 75px; text-align: left;">អនុប្រធាន</span>
            <span style="width: 120px; overflow: hidden; letter-spacing: 2px;">.........................................</span>
          </div>
          <div style="display: flex; align-items: baseline; white-space: nowrap;">
            <span style="width: 26px;">៣-</span>
            <span style="width: 140px; overflow: hidden; letter-spacing: 2px;">.........................................</span>
            <span style="width: 75px; text-align: left;">សមាជិក</span>
            <span style="width: 120px; overflow: hidden; letter-spacing: 2px;">.........................................</span>
          </div>
          <div style="display: flex; align-items: baseline; white-space: nowrap;">
            <span style="width: 26px;">៤-</span>
            <span style="width: 140px; overflow: hidden; letter-spacing: 2px;">.........................................</span>
            <span style="width: 75px; text-align: left;">សមាជិក</span>
            <span style="width: 120px; overflow: hidden; letter-spacing: 2px;">.........................................</span>
          </div>
          <div style="display: flex; align-items: baseline; white-space: nowrap;">
            <span style="width: 26px;">៥-</span>
            <span style="width: 140px; overflow: hidden; letter-spacing: 2px;">.........................................</span>
            <span style="width: 75px; text-align: left;">សមាជិក</span>
            <span style="width: 120px; overflow: hidden; letter-spacing: 2px;">.........................................</span>
          </div>
    `;
    const committeeListHtml = (savedList !== null && savedList.trim() !== '') ? savedList : defaultList;

    signatureContent = `
        <div class="editable-sig-committee" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែសម្រួលចំណងជើងគណៈកម្មការ" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 10.5pt !important; font-weight: normal !important; margin-bottom: 8px; color: #000; text-align: center;">
          ${committeeTitle}
        </div>
        <div class="committee-signatures editable-sig-committee-list" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែសម្រួលសមាសភាពគណៈកម្មការ" style="display: inline-block; text-align: left; font-size: 9.5pt; line-height: 2.1; margin: 0 auto; white-space: nowrap;">
          ${committeeListHtml}
        </div>
    `;
  } else {
    // Reports 2-6: ជ.គណៈកម្មការសម្ភាស៍ជ្រើសរើស គ.ក.ប / ប្រធាន (Centered)
    const savedCommittee = localStorage.getItem('report_sig_committee_other');
    const committeeTitle = (savedCommittee !== null && savedCommittee.trim() !== '') ? savedCommittee : 'ជ.គណៈកម្មការសម្ភាស៍ជ្រើសរើស គ.ក.ប';
    const savedRole = localStorage.getItem('report_sig_role_other');
    const roleTitle = (savedRole !== null && savedRole.trim() !== '') ? savedRole : 'ប្រធាន';

    signatureContent = `
        <div class="editable-sig-committee" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែសម្រួលគណៈកម្មការ" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 10.5pt !important; font-weight: normal !important; margin-bottom: 4px; color: #000; text-align: center;">
          ${committeeTitle}
        </div>
        <div class="editable-sig-role" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែសម្រួលមុខតំណែង" style="font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important; font-size: 10.5pt !important; font-weight: normal !important; margin-bottom: 35px; color: #000; text-align: center;">
          ${roleTitle}
        </div>
    `;
  }

  if (reportType === 'sortlist') {
    return `
      <div class="signature-section" style="margin-top: 8px; width: 100%; display: flex; justify-content: flex-end; page-break-inside: avoid; break-inside: avoid;">
        <div class="signature-box signature-box-right" style="width: auto; min-width: 380px; margin-left: auto; margin-right: 0; text-align: center; color: #000; font-family: var(--font-body);">
          <div class="editable-sig-date sig-lunar-date-val" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែសម្រួលកាលបរិច្ឆេទចន្ទគតិ" style="font-size: 10pt; line-height: 1.4; margin-bottom: 2px; text-align: center;">
            ${dateCfg.lunar}
          </div>
          <div class="editable-sig-date sig-solar-date-val" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែសម្រួលកាលបរិច្ឆេទសុរិយគតិ" style="font-size: 10pt; line-height: 1.4; margin-bottom: 4px; text-align: center;">
            ${dateCfg.solar}
          </div>
          ${signatureContent}
        </div>
      </div>
    `;
  }

  // Reports 2-6: Flush right aligned with table's right border
  const sigTopMargin = (reportType === 'final_roster') ? '0' : '8px';
  return `
    <div class="signature-section" style="margin-top: ${sigTopMargin}; width: 100%; display: flex; justify-content: flex-end; page-break-inside: avoid; break-inside: avoid;">
      <div class="signature-box signature-box-right" style="width: auto; min-width: 290px; max-width: 350px; margin-left: auto; margin-right: 0; text-align: center; color: #000; font-family: var(--font-body); margin-top: 0; padding-top: 0;">
        <div class="editable-sig-date sig-lunar-date-val" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែសម្រួលកាលបរិច្ឆេទចន្ទគតិ" style="font-size: 10pt; line-height: 1.4; margin-bottom: 2px; text-align: center; white-space: nowrap; margin-top: 0; padding-top: 0;">
          ${dateCfg.lunar}
        </div>
        <div class="editable-sig-date sig-solar-date-val" contenteditable="true" spellcheck="false" title="ចុចដើម្បីកែសម្រួលកាលបរិច្ឆេទសុរិយគតិ" style="font-size: 10pt; line-height: 1.4; margin-bottom: 4px; text-align: center;">
          ${dateCfg.solar}
        </div>
        ${signatureContent}
      </div>
    </div>
  `;
}

function removePausedBannersBeforePrint() {
  document.querySelectorAll('*').forEach(el => {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
    const txt = (el.textContent || '').trim();
    if (/deployment.*temporarily\s*paused|temporarily\s*paused/i.test(txt)) {
      if (el.children.length <= 2) {
        el.style.display = 'none';
        el.remove();
      }
    }
  });
}
if (typeof window !== 'undefined') {
  window.addEventListener('beforeprint', removePausedBannersBeforePrint);
}

function setupReportDateInteractions() {
  const solarPicker = document.getElementById('reportSolarDatePicker');
  const lunarInput = document.getElementById('reportLunarDateInput');
  const solarInput = document.getElementById('reportSolarDateInput');
  const btnAuto = document.getElementById('btnAutoFillDate');

  const getAllLunarDates = () => document.querySelectorAll('.sig-lunar-date-val, #sigLunarDate');
  const getAllSolarDates = () => document.querySelectorAll('.sig-solar-date-val, #sigSolarDate');

  const dateCfg = getReportDateConfig();
  if (lunarInput) lunarInput.value = dateCfg.lunar;
  if (solarInput) solarInput.value = dateCfg.solar;

  const updateDatesFromTarget = (target) => {
    const auto = computeAutoDates(target);
    if (lunarInput) lunarInput.value = auto.lunar;
    if (solarInput) solarInput.value = auto.solar;
    setReportDateConfig(auto.lunar, auto.solar);
    getAllLunarDates().forEach(el => el.textContent = auto.lunar);
    getAllSolarDates().forEach(el => el.textContent = auto.solar);
    if (solarPicker && auto.isoDate) solarPicker.value = auto.isoDate;
  };

  if (solarPicker) {
    if (!solarPicker.value) {
      const todayIso = new Date().toISOString().split('T')[0];
      solarPicker.value = todayIso;
    }
    solarPicker.onchange = solarPicker.oninput = (e) => {
      if (e.target.value) {
        updateDatesFromTarget(e.target.value);
      }
    };
  }

  if (lunarInput) {
    let orig = lunarInput.value;
    lunarInput.onfocus = () => { orig = lunarInput.value; };
    lunarInput.oninput = (e) => {
      setReportDateConfig(e.target.value, undefined);
      getAllLunarDates().forEach(el => el.textContent = e.target.value);
    };
    lunarInput.onchange = lunarInput.onblur = (e) => {
      setReportDateConfig(e.target.value, undefined);
      getAllLunarDates().forEach(el => el.textContent = e.target.value);
      if (e.target.value !== orig) showSaveSuccessToast('បានរក្សាទុករួច');
    };
  }

  if (solarInput) {
    let orig = solarInput.value;
    solarInput.onfocus = () => { orig = solarInput.value; };
    solarInput.oninput = (e) => {
      setReportDateConfig(undefined, e.target.value);
      getAllSolarDates().forEach(el => el.textContent = e.target.value);
    };
    solarInput.onchange = solarInput.onblur = (e) => {
      setReportDateConfig(undefined, e.target.value);
      getAllSolarDates().forEach(el => el.textContent = e.target.value);
      if (e.target.value !== orig) showSaveSuccessToast('បានរក្សាទុករួច');
    };
  }

  if (btnAuto) {
    btnAuto.onclick = () => {
      updateDatesFromTarget(new Date());
      showSaveSuccessToast('បានរក្សាទុករួច');
    };
  }

  getAllLunarDates().forEach(el => {
    let orig = el.textContent.trim();
    el.onfocus = () => { orig = el.textContent.trim(); };
    el.onblur = () => {
      const val = el.textContent.trim();
      setReportDateConfig(val, undefined);
      if (lunarInput) lunarInput.value = val;
      getAllLunarDates().forEach(targetEl => targetEl.textContent = val);
      if (val !== orig) {
        showSaveSuccessToast('បានរក្សាទុករួច');
      }
    };
  });

  getAllSolarDates().forEach(el => {
    let orig = el.textContent.trim();
    el.onfocus = () => { orig = el.textContent.trim(); };
    el.onblur = () => {
      const val = el.textContent.trim();
      setReportDateConfig(undefined, val);
      if (solarInput) solarInput.value = val;
      getAllSolarDates().forEach(targetEl => targetEl.textContent = val);
      if (val !== orig) {
        showSaveSuccessToast('បានរក្សាទុករួច');
      }
    };
  });
}

let toastThrottleTimer = null;
function showSaveSuccessToast(message = 'បានរក្សាទុករួច') {
  if (toastThrottleTimer) clearTimeout(toastThrottleTimer);
  toastThrottleTimer = setTimeout(() => {
    let toast = document.getElementById('pec21SaveToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pec21SaveToast';
      toast.className = 'pec21-save-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span style="font-size: 16px;">✅</span> <span>${message}</span>`;
    toast.classList.add('show');

    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }, 40);
}

// Global listener to ensure ANY editable element anywhere triggers toast when user finishes editing
let globalLastEditableFocus = null;
let globalLastEditableOriginalHtml = '';
document.addEventListener('focusin', (e) => {
  if (e.target && e.target.isContentEditable) {
    globalLastEditableFocus = e.target;
    globalLastEditableOriginalHtml = e.target.innerHTML;
  }
}, true);

document.addEventListener('focusout', (e) => {
  if (e.target && e.target.isContentEditable) {
    if (e.target.innerHTML !== globalLastEditableOriginalHtml) {
      showSaveSuccessToast('បានរក្សាទុករួច');
    }
  }
}, true);

// =========================================================================
// Universal Draggable Report Boxes (Mouse drag repositioning & storage)
// =========================================================================
function getDraggableBoxPosition(boxId, reportType) {
  try {
    if (reportType) {
      const specific = localStorage.getItem(`report_box_pos_${boxId}_${reportType}`);
      if (specific) return JSON.parse(specific);
    }
    const globalPos = localStorage.getItem(`report_box_pos_${boxId}`);
    if (globalPos) return JSON.parse(globalPos);
  } catch (e) {}
  return { x: 0, y: 0 };
}

function saveDraggableBoxPosition(boxId, reportType, pos) {
  try {
    if (reportType) {
      localStorage.setItem(`report_box_pos_${boxId}_${reportType}`, JSON.stringify(pos));
    }
    localStorage.setItem(`report_box_pos_${boxId}`, JSON.stringify(pos));
  } catch (e) {}
}

function applyAllSavedBoxPositions(container = document) {
  const currentReportType = document.getElementById('reportTypeSelect')?.value || '';
  const configs = [
    { selector: '#reportLogoContainer', id: 'logo' },
    { selector: '.report-inst-header-box', id: 'inst_header' },
    { selector: '.report-kingdom-header-box', id: 'kingdom_header' },
    { selector: '.report-title-box', id: 'title_box' },
    { selector: '.signature-box', id: 'signature_box' }
  ];
  configs.forEach(cfg => {
    const pos = getDraggableBoxPosition(cfg.id, currentReportType);
    if (pos && (pos.x !== 0 || pos.y !== 0)) {
      container.querySelectorAll(cfg.selector).forEach(el => {
        el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      });
    }
  });
}

function setupDraggableReportBoxes() {
  const currentReportType = document.getElementById('reportTypeSelect')?.value || '';
  const boxConfigs = [
    { selector: '#reportLogoContainer', id: 'logo', label: 'Logo' },
    { selector: '.report-inst-header-box', id: 'inst_header', label: 'ស្ថាប័ន' },
    { selector: '.report-kingdom-header-box', id: 'kingdom_header', label: 'ជាតិ' },
    { selector: '.report-title-box', id: 'title_box', label: 'ចំណងជើង' },
    { selector: '.signature-box', id: 'signature_box', label: 'ហត្ថលេខា' }
  ];

  boxConfigs.forEach(cfg => {
    document.querySelectorAll(`#printContainer ${cfg.selector}`).forEach(boxEl => {
      boxEl.classList.add('report-draggable-box');

      // Apply initial saved position
      const savedPos = getDraggableBoxPosition(cfg.id, currentReportType);
      if (savedPos && (savedPos.x !== 0 || savedPos.y !== 0)) {
        boxEl.style.transform = `translate(${savedPos.x}px, ${savedPos.y}px)`;
      }

      // Check if handle already exists
      let handle = boxEl.querySelector(':scope > .report-box-drag-handle');
      if (!handle) {
        handle = document.createElement('div');
        handle.className = 'report-box-drag-handle no-print';
        handle.setAttribute('contenteditable', 'false');
        handle.setAttribute('title', 'ចុចហើយអូស Mouse (Drag) ដើម្បីផ្លាស់ប្តូរទីតាំង');
        handle.innerHTML = `
          <span style="font-size: 13px; line-height: 1; cursor: grab;">✥</span>
          <span style="cursor: grab;">${cfg.label}</span>
          <span class="report-box-reset-btn" title="កំណត់ទីតាំងដើមឡើងវិញ (Reset 0,0)">↺</span>
        `;
        boxEl.appendChild(handle);
      }

      const resetBtn = handle.querySelector('.report-box-reset-btn');
      if (resetBtn) {
        resetBtn.onmousedown = (e) => e.stopPropagation();
        resetBtn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          boxEl.style.transform = 'translate(0px, 0px)';
          saveDraggableBoxPosition(cfg.id, currentReportType, { x: 0, y: 0 });
          document.querySelectorAll(cfg.selector).forEach(el => el.style.transform = 'translate(0px, 0px)');
          showSaveSuccessToast('បានកំណត់ទីតាំង ' + cfg.label + ' ដើមឡើងវិញ');
        };
      }

      // Mouse drag handlers
      const startDrag = (e) => {
        let isDragging = true;
        const startX = e.clientX;
        const startY = e.clientY;
        const currentPos = getDraggableBoxPosition(cfg.id, currentReportType);
        const startPosX = currentPos.x || 0;
        const startPosY = currentPos.y || 0;

        handle.classList.add('is-dragging');
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';

        const onMouseMove = (ev) => {
          if (!isDragging) return;
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          const newX = Math.round(startPosX + dx);
          const newY = Math.round(startPosY + dy);
          boxEl.style.transform = `translate(${newX}px, ${newY}px)`;
          document.querySelectorAll(cfg.selector).forEach(el => {
            if (el !== boxEl) el.style.transform = `translate(${newX}px, ${newY}px)`;
          });
        };

        const onMouseUp = (ev) => {
          if (!isDragging) return;
          isDragging = false;
          handle.classList.remove('is-dragging');
          document.body.style.userSelect = '';
          document.body.style.cursor = '';
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);

          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          const newX = Math.round(startPosX + dx);
          const newY = Math.round(startPosY + dy);
          const finalPos = { x: newX, y: newY };
          saveDraggableBoxPosition(cfg.id, currentReportType, finalPos);
          document.querySelectorAll(cfg.selector).forEach(el => {
            el.style.transform = `translate(${newX}px, ${newY}px)`;
          });

          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            showSaveSuccessToast('បានរក្សាទុកទីតាំង ' + cfg.label + ' រួចរាល់');
          }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      };

      // Mousedown on handle initiates dragging
      handle.onmousedown = (e) => {
        if (e.target.closest('.report-box-reset-btn')) return;
        e.preventDefault();
        e.stopPropagation();
        startDrag(e);
      };

      // Also allow Alt+drag anywhere on the box
      boxEl.addEventListener('mousedown', (e) => {
        if (e.altKey) {
          e.preventDefault();
          e.stopPropagation();
          startDrag(e);
        }
      });
    });
  });
}

function setupReportSignatureInteractions() {
  const currentReportType = document.getElementById('reportTypeSelect')?.value || 'sortlist';

  // 1. Committee Title
  document.querySelectorAll('.editable-sig-committee').forEach(el => {
    let originalText = el.innerText.trim();
    el.onfocus = () => { originalText = el.innerText.trim(); };
    el.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.blur();
      }
    };
    el.onblur = () => {
      const val = el.innerText.trim();
      const storageKey = currentReportType === 'sortlist' ? 'report_sig_committee_sortlist' : 'report_sig_committee_other';
      localStorage.setItem(storageKey, val);
      document.querySelectorAll('.editable-sig-committee').forEach(target => {
        if (target !== el) target.innerText = val;
      });
      if (val !== originalText) {
        showSaveSuccessToast('បានរក្សាទុករួច');
      }
    };
  });

  // 2. Committee List (Report 1 SortList)
  document.querySelectorAll('.editable-sig-committee-list').forEach(el => {
    let originalHtml = el.innerHTML.trim();
    el.onfocus = () => { originalHtml = el.innerHTML.trim(); };
    el.onblur = () => {
      const valHtml = el.innerHTML.trim();
      localStorage.setItem('report_sig_list_sortlist', valHtml);
      document.querySelectorAll('.editable-sig-committee-list').forEach(target => {
        if (target !== el) target.innerHTML = valHtml;
      });
      if (valHtml !== originalHtml) {
        showSaveSuccessToast('បានរក្សាទុករួច');
      }
    };
  });

  // 3. Role (Reports 2-6)
  document.querySelectorAll('.editable-sig-role').forEach(el => {
    let originalText = el.innerText.trim();
    el.onfocus = () => { originalText = el.innerText.trim(); };
    el.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        el.blur();
      }
    };
    el.onblur = () => {
      const val = el.innerText.trim();
      localStorage.setItem('report_sig_role_other', val);
      document.querySelectorAll('.editable-sig-role').forEach(target => {
        if (target !== el) target.innerText = val;
      });
      if (val !== originalText) {
        showSaveSuccessToast('បានរក្សាទុករួច');
      }
    };
  });

  // 4. Institution Letterhead Box (.report-inst-header-box)
  document.querySelectorAll('.report-inst-header-box').forEach(el => {
    const getCleanHtml = (node) => {
      const clone = node.cloneNode(true);
      clone.querySelectorAll('.report-box-drag-handle').forEach(h => h.remove());
      return clone.innerHTML.trim();
    };
    let originalHtml = getCleanHtml(el);
    el.onfocus = () => { originalHtml = getCleanHtml(el); };
    el.onblur = () => {
      const valHtml = getCleanHtml(el);
      const rType = el.getAttribute('data-report-type');
      const storageKey = (rType === 'final_roster') ? 'report_custom_inst_header_final_roster' : 'report_custom_inst_header';
      localStorage.setItem(storageKey, valHtml);
      const selector = (rType === 'final_roster') ? '.report-inst-header-box[data-report-type="final_roster"]' : '.report-inst-header-box:not([data-report-type="final_roster"])';
      document.querySelectorAll(selector).forEach(target => {
        if (target !== el) {
          const tHandle = target.querySelector('.report-box-drag-handle');
          target.innerHTML = valHtml;
          if (tHandle) target.appendChild(tHandle);
        }
      });
      if (valHtml !== originalHtml) {
        showSaveSuccessToast('បានរក្សាទុករួច');
      }
    };
  });

  // 5. Tacteing Emblem (.report-tacteing-emblem)
  document.querySelectorAll('.report-tacteing-emblem').forEach(el => {
    let orig = el.innerText.trim();
    el.onfocus = () => { orig = el.innerText.trim(); };
    el.onblur = () => {
      const val = el.innerText.trim();
      localStorage.setItem('report_custom_tacteing', val);
      document.querySelectorAll('.report-tacteing-emblem').forEach(target => {
        if (target !== el) target.innerText = val;
      });
      if (val !== orig) {
        showSaveSuccessToast('បានរក្សាទុករួច');
      }
    };
  });

  // 6. Notice Elements (.report-editable-notice-place, etc.)
  document.querySelectorAll('.report-editable-notice-place').forEach(el => {
    let orig = el.innerText.trim();
    el.onfocus = () => { orig = el.innerText.trim(); };
    el.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } };
    el.onblur = () => {
      const val = el.innerText.trim();
      localStorage.setItem('report_notice_place', val);
      if (val !== orig) showSaveSuccessToast('បានរក្សាទុករួច');
    };
  });

  document.querySelectorAll('.report-editable-notice-date').forEach(el => {
    let orig = el.innerText.trim();
    el.onfocus = () => { orig = el.innerText.trim(); };
    el.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } };
    el.onblur = () => {
      const val = el.innerText.trim();
      localStorage.setItem('report_notice_date', val);
      if (val !== orig) showSaveSuccessToast('បានរក្សាទុករួច');
    };
  });

  document.querySelectorAll('.report-editable-notice-time').forEach(el => {
    let orig = el.innerText.trim();
    el.onfocus = () => { orig = el.innerText.trim(); };
    el.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } };
    el.onblur = () => {
      const val = el.innerText.trim();
      localStorage.setItem('report_notice_time', val);
      if (val !== orig) showSaveSuccessToast('បានរក្សាទុករួច');
    };
  });

  // 7. Title Box (.report-title-box)
  document.querySelectorAll('.report-title-box').forEach(el => {
    const getCleanHtml = (node) => {
      const clone = node.cloneNode(true);
      clone.querySelectorAll('.report-box-drag-handle').forEach(h => h.remove());
      return clone.innerHTML.trim();
    };
    let originalHtml = getCleanHtml(el);
    el.onfocus = () => { originalHtml = getCleanHtml(el); };
    el.onblur = () => {
      const valHtml = getCleanHtml(el);
      localStorage.setItem('report_custom_title_' + currentReportType, valHtml);
      document.querySelectorAll('.report-title-box').forEach(target => {
        if (target !== el) {
          const tHandle = target.querySelector('.report-box-drag-handle');
          target.innerHTML = valHtml;
          if (tHandle) target.appendChild(tHandle);
        }
      });
      if (valHtml !== originalHtml) {
        showSaveSuccessToast('បានរក្សាទុកចំណងជើងរួច');
      }
    };
  });

  // Live screen -> print view synchronization
  const syncLive = (selector) => {
    const screenEl = document.querySelector(`.report-screen-view ${selector}`);
    const printEls = document.querySelectorAll(`.report-print-view ${selector}`);
    if (screenEl && printEls.length > 0) {
      screenEl.oninput = () => {
        printEls.forEach(pel => pel.innerHTML = screenEl.innerHTML);
      };
    }
  };
  syncLive('.editable-sig-committee');
  syncLive('.editable-sig-committee-list');
  syncLive('.editable-sig-role');
  syncLive('.report-inst-header-box');
  syncLive('.report-tacteing-emblem');
  syncLive('.report-title-box');

  // Setup draggable boxes for all boxed sections in all reports
  setupDraggableReportBoxes();
  setupReportTableRowHeightControls();
}

function getReportTableRowPadding() {
  const saved = localStorage.getItem('report_table_row_padding');
  return saved !== null ? parseFloat(saved) : 2;
}

function setReportTableRowPadding(paddingVal) {
  let p = parseFloat(paddingVal);
  if (isNaN(p) || p < 0) p = 0;
  if (p > 25) p = 25;
  p = Math.round(p * 10) / 10;
  document.documentElement.style.setProperty('--report-row-padding-v', `${p}px`);
  localStorage.setItem('report_table_row_padding', String(p));
  const input = document.getElementById('reportRowHeightInput');
  const label = document.getElementById('reportRowHeightLabel');
  const slider = document.getElementById('reportRowHeightSlider');
  if (input && document.activeElement !== input) input.value = p;
  if (label && label.id === 'reportRowHeightLabel' && label.tagName === 'SPAN' && !document.getElementById('reportRowHeightInput')) {
    label.textContent = `${p}px`;
  }
  if (slider) slider.value = Math.min(slider.max || 20, p);
  document.querySelectorAll('#printContainer table.official-print-table td, #printContainer table.official-print-table th').forEach(cell => {
    cell.style.paddingTop = `${p}px`;
    cell.style.paddingBottom = `${p}px`;
  });
}

function setupReportTableRowHeightControls() {
  const btnShrink = document.getElementById('btnShrinkReportRows');
  const btnExpand = document.getElementById('btnExpandReportRows');
  const input = document.getElementById('reportRowHeightInput');
  const slider = document.getElementById('reportRowHeightSlider');
  const btnReset = document.getElementById('btnResetReportRows');
  const currentP = getReportTableRowPadding();
  setReportTableRowPadding(currentP);

  if (input) {
    input.value = currentP;
    input.oninput = () => {
      const val = parseFloat(input.value);
      if (!isNaN(val)) {
        const clamped = Math.round(Math.max(0, Math.min(25, val)) * 10) / 10;
        document.documentElement.style.setProperty('--report-row-padding-v', `${clamped}px`);
        localStorage.setItem('report_table_row_padding', String(clamped));
        if (slider) slider.value = Math.min(slider.max || 20, clamped);
        document.querySelectorAll('#printContainer table.official-print-table td, #printContainer table.official-print-table th').forEach(cell => {
          cell.style.paddingTop = `${clamped}px`;
          cell.style.paddingBottom = `${clamped}px`;
        });
      }
    };
    input.onchange = () => {
      let val = parseFloat(input.value);
      if (isNaN(val) || val < 0) val = 0;
      if (val > 25) val = 25;
      val = Math.round(val * 10) / 10;
      input.value = val;
      setReportTableRowPadding(val);
      setupAutoPrintPagination();
      showSaveSuccessToast(`បានកំណត់កម្ពស់ជួរដេក ${val}px`);
    };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    };
  }

  if (btnShrink) {
    btnShrink.onclick = (e) => {
      e.preventDefault();
      const p = Math.max(0, Math.round((getReportTableRowPadding() - 0.5) * 10) / 10);
      setReportTableRowPadding(p);
      if (input) input.value = p;
      setupAutoPrintPagination();
      showSaveSuccessToast(`បានបង្រួមកម្ពស់ជួរដេក ${p}px`);
    };
  }
  if (btnExpand) {
    btnExpand.onclick = (e) => {
      e.preventDefault();
      const p = Math.min(25, Math.round((getReportTableRowPadding() + 0.5) * 10) / 10);
      setReportTableRowPadding(p);
      if (input) input.value = p;
      setupAutoPrintPagination();
      showSaveSuccessToast(`បានពង្រីកកម្ពស់ជួរដេក ${p}px`);
    };
  }
  if (slider) {
    slider.oninput = (e) => {
      const val = parseFloat(e.target.value);
      setReportTableRowPadding(val);
      if (input) input.value = val;
    };
    slider.onchange = () => {
      setupAutoPrintPagination();
      showSaveSuccessToast(`បានកំណត់កម្ពស់ជួរដេក ${getReportTableRowPadding()}px`);
    };
  }
  if (btnReset) {
    btnReset.onclick = (e) => {
      e.preventDefault();
      setReportTableRowPadding(2);
      if (input) input.value = 2;
      setupAutoPrintPagination();
      showSaveSuccessToast('បានកំណត់កម្ពស់ជួរដេកដើមវិញ (2px)');
    };
  }
  setupInteractiveRowResizeOnTables();
}

function setupInteractiveRowResizeOnTables() {
  const tables = document.querySelectorAll('#printContainer table.official-print-table');
  tables.forEach(table => {
    if (table.dataset.rowResizeBound) return;
    table.dataset.rowResizeBound = 'true';

    let isResizing = false;
    let startY = 0;
    let startPadding = 2;

    table.addEventListener('mousedown', (e) => {
      if (e.target.isContentEditable) return;
      const cell = e.target.closest('td, th');
      if (!cell) return;
      const rect = cell.getBoundingClientRect();
      if (e.clientY >= rect.bottom - 6) {
        isResizing = true;
        startY = e.clientY;
        startPadding = getReportTableRowPadding();
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
        e.stopPropagation();

        const onMouseMove = (ev) => {
          if (!isResizing) return;
          const dy = ev.clientY - startY;
          const paddingDelta = Math.round((dy / 4) * 2) / 2;
          const newPadding = Math.max(0, Math.min(25, Math.round((startPadding + paddingDelta) * 10) / 10));
          setReportTableRowPadding(newPadding);
        };

        const onMouseUp = () => {
          if (!isResizing) return;
          isResizing = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          setupAutoPrintPagination();
          showSaveSuccessToast(`បានកំណត់កម្ពស់ជួរដេក ${getReportTableRowPadding()}px`);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      }
    });

    table.addEventListener('mousemove', (e) => {
      if (isResizing) return;
      const cell = e.target.closest('td, th');
      if (cell) {
        const rect = cell.getBoundingClientRect();
        if (e.clientY >= rect.bottom - 6) {
          cell.style.cursor = 'row-resize';
        } else {
          cell.style.cursor = '';
        }
      }
    });
  });
}

function setupAutoPrintPagination() {
  const sheet = document.querySelector('#printContainer .print-paper-sheet');
  if (!sheet) return;

  const currentReportType = document.getElementById('reportTypeSelect')?.value || 'sortlist';
  const hiddenStation = document.getElementById('reportStationSelect')?.value || '';
  const codeSelect = document.getElementById('reportCodeSelect');
  const isAllStations = (hiddenStation === 'all' || (codeSelect && codeSelect.value === 'all') || hiddenStation === 'all_district');

  // If Report 1 (single station), it already has its dedicated 2-page print view built-in!
  if (currentReportType === 'sortlist' && !isAllStations) {
    return;
  }

  // 1. Locate the master data table (either in .report-screen-view or directly in sheet)
  // 1. Locate the master data table (with class .official-print-table, NEVER the layout/letterhead table)
  let table = null;
  const existingScreenView = sheet.querySelector('.report-screen-view');
  if (existingScreenView) {
    table = existingScreenView.querySelector('table.official-print-table') || Array.from(existingScreenView.querySelectorAll('table')).find(t => !t.closest('.letterhead'));
  }
  if (!table) {
    const printView = sheet.querySelector('.report-print-view');
    const allTables = Array.from(sheet.querySelectorAll('table.official-print-table'));
    table = allTables.find(t => !printView || !printView.contains(t));
  }
  if (!table) {
    const allTables = Array.from(sheet.querySelectorAll('table'));
    table = allTables.find(t => !t.closest('.letterhead') && (!sheet.querySelector('.report-print-view') || !sheet.querySelector('.report-print-view').contains(t)));
  }
  if (!table) return;

  const rows = Array.from(table.querySelectorAll('tbody tr'));
  if (!rows || rows.length === 0) return;

  const isLandscape = sheet.classList.contains('landscape');

  // Determine pagination thresholds per report type
  let page1Cap = 28;
  let midPageCap = 36;
  let lastPageCap = 28;
  let singlePageMaxRows = 24;

  if (isLandscape) {
    page1Cap = 14;
    midPageCap = 18;
    lastPageCap = 14;
    singlePageMaxRows = 12;
  } else if (currentReportType === 'final_roster') {
    page1Cap = 34; // Reduced by 2 rows (from 36 to 34) as requested by user
    midPageCap = 42; // 7 stations of 6 candidates
    lastPageCap = 38; // Up to 38 rows + footer fits comfortably on last page (450 rows = exactly 11 full pages)
    singlePageMaxRows = 24; // up to 24 rows on 1 page (no page number)
    if (rows.length > singlePageMaxRows && rows.length <= 34) {
      page1Cap = 20;
    }
  } else if (currentReportType === 'notice') {
    page1Cap = 28;
    midPageCap = 36;
    lastPageCap = 28;
    singlePageMaxRows = 22;
  } else if (currentReportType === 'results' || currentReportType === 'commune_results') {
    page1Cap = 34;
    midPageCap = 42;
    lastPageCap = 38;
    singlePageMaxRows = 24;
  } else if (currentReportType === 'scoresheet') {
    page1Cap = 34;
    midPageCap = 42;
    lastPageCap = 38;
    singlePageMaxRows = 24;
  } else if (currentReportType === 'attendance') {
    page1Cap = isLandscape ? 14 : 34;
    midPageCap = isLandscape ? 18 : 42;
    lastPageCap = isLandscape ? 14 : 38;
    singlePageMaxRows = isLandscape ? 12 : 24;
  }

  // Dynamically scale page row capacity when row height / vertical padding is customized
  const currentRowPadding = getReportTableRowPadding();
  if (currentRowPadding !== 2) {
    const scale = 22 / Math.max(14, 22 + (currentRowPadding - 2) * 2);
    page1Cap = Math.max(6, Math.floor(page1Cap * scale));
    midPageCap = Math.max(8, Math.floor(midPageCap * scale));
    lastPageCap = Math.max(6, Math.floor(lastPageCap * scale));
    singlePageMaxRows = Math.max(6, Math.floor(singlePageMaxRows * scale));
  }

  // Clean up any old footers or indicators first
  Array.from(sheet.querySelectorAll('.report-single-page-footer, .report-screen-page-indicator')).forEach(el => el.remove());
  Array.from(sheet.children).forEach(el => {
    if (el && el.classList && (el.classList.contains('report-single-page-footer') || el.classList.contains('report-page-footer'))) {
      el.remove();
    }
  });

  // If total rows fit comfortably on 1 page (single page report)
  if (rows.length <= singlePageMaxRows) {
    // Total pages = 1 -> Single page report!
    if (existingScreenView) {
      while (existingScreenView.firstChild) {
        sheet.insertBefore(existingScreenView.firstChild, existingScreenView);
      }
      existingScreenView.remove();
    }
    const existingPrintView = sheet.querySelector('.report-print-view');
    if (existingPrintView) {
      existingPrintView.remove();
    }
    sheet.classList.remove('print-has-pages');
    if (!isAllStations && currentReportType !== 'sortlist') {
      document.body.classList.remove('report-multipage-active');
    }

    // Single page report -> NO PAGE NUMBER! (User request: មួយទៀតប្រសិនមានតែ១ទំព័រ មិនបាច់ដាក់លេខទំព័រទេ)
    return;
  }

  // Multi-page document: 2 or more pages!
  document.body.classList.add('report-multipage-active');
  sheet.classList.add('print-has-pages');

  let screenView = sheet.querySelector('.report-screen-view');
  if (!screenView) {
    const existingChildren = Array.from(sheet.children).filter(el => !el.classList.contains('report-print-view'));
    screenView = document.createElement('div');
    screenView.className = 'report-screen-view no-print';
    existingChildren.forEach(child => screenView.appendChild(child));
    sheet.prepend(screenView);
  } else {
    screenView.classList.add('no-print');
  }

  // Remove existing generated print view if any to rebuild fresh
  const existingPrintView = sheet.querySelector('.report-print-view');
  if (existingPrintView) {
    existingPrintView.remove();
  }

  // Extract common components from screenView
  const letterheadHtml = screenView.querySelector('.letterhead')?.outerHTML || '';
  const titleBoxHtml = screenView.querySelector('.report-title-section')?.outerHTML || '';
  const tableColgroupHtml = table.querySelector('colgroup')?.outerHTML || '';
  const tableTheadHtml = table.querySelector('thead')?.innerHTML || '';
  const tableClass = table.className || 'official-print-table';
  const tableStyle = table.getAttribute('style') || '';
  
  // Footer: final-roster-footer or signature-section
  const footerEl = screenView.querySelector('.final-roster-footer') || screenView.querySelector('.signature-section');
  const footerHtml = footerEl ? footerEl.outerHTML : '';

  // Notice extra intro text (if any) between title and table
  let noticeIntroHtml = '';
  if (currentReportType === 'notice') {
    const introEl = screenView.querySelector('.report-notice-intro') || screenView.querySelector('div[style*="text-align: justify"]');
    if (introEl) noticeIntroHtml = introEl.outerHTML;
  }

  // Chunk rows into pages
  const pagesRows = [];
  let currentChunk = [];
  let isFirstPage = true;

  for (let i = 0; i < rows.length; i++) {
    currentChunk.push(rows[i].outerHTML);
    const currentLimit = isFirstPage ? page1Cap : midPageCap;
    const remainingAfterThis = rows.length - (i + 1);

    if (currentChunk.length >= currentLimit && remainingAfterThis > 0) {
      pagesRows.push(currentChunk);
      currentChunk = [];
      isFirstPage = false;
    }
  }
  if (currentChunk.length > 0) {
    pagesRows.push(currentChunk);
  }

  // If the last page has too many rows to fit the footer comfortably, split it cleanly
  if (pagesRows.length > 1) {
    const lastChunk = pagesRows[pagesRows.length - 1];
    if (lastChunk.length > lastPageCap) {
      // Balance rows between the second-to-last page and the new last page so neither page looks empty
      const targetLast = Math.min(lastPageCap, Math.max(6, Math.floor(lastChunk.length / 2)));
      let splitPoint = lastChunk.length - targetLast;
      if (currentReportType === 'final_roster' && splitPoint % 6 !== 0) {
        splitPoint = Math.floor(splitPoint / 6) * 6;
        if (splitPoint < 6) splitPoint = 6;
      }
      if (splitPoint > 0 && splitPoint < lastChunk.length) {
        const overflow = lastChunk.splice(splitPoint);
        pagesRows.push(overflow);
      }
    }
  }

  const totalPages = pagesRows.length;

  // On screen Form: No page number is shown (page numbers only display when printing)

  // Build the .report-print-view element
  const printView = document.createElement('div');
  printView.className = 'report-print-view print-only';

  let printPagesHtml = '';
  pagesRows.forEach((rowChunk, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isP1 = (pageNum === 1);
    const isLast = (pageNum === totalPages);

    let pageHeaderContent = '';
    if (isP1) {
      pageHeaderContent = `${letterheadHtml}${titleBoxHtml}${noticeIntroHtml}`;
    }

    let pageFooterContent = '';
    if (isLast) {
      pageFooterContent = footerHtml;
    }

    printPagesHtml += `
      <div class="report-print-page report-print-page-${pageNum}">
        <div class="report-page-body">
          ${pageHeaderContent}
          <table class="${tableClass}" style="${tableStyle}">
            ${tableColgroupHtml}
            <thead>
              ${tableTheadHtml}
            </thead>
            <tbody>
              ${rowChunk.join('')}
            </tbody>
          </table>
          ${pageFooterContent}
        </div>
        ${totalPages > 1 ? `
        <div class="report-page-footer print-only">
          ${toKhmerNum(pageNum)}/${toKhmerNum(totalPages)}
        </div>` : ''}
      </div>
    `;
  });

  printView.innerHTML = printPagesHtml;
  sheet.appendChild(printView);
  setReportTableRowPadding(currentRowPadding);
  setupInteractiveRowResizeOnTables();
  applyAllSavedBoxPositions(printView);
}

function syncReportSignaturesBeforePrint() {
  const sync = (selector) => {
    const screenEl = document.querySelector(`.report-screen-view ${selector}`);
    const printEls = document.querySelectorAll(`.report-print-view ${selector}`);
    if (screenEl && printEls.length > 0) {
      printEls.forEach(pel => {
        pel.innerHTML = screenEl.innerHTML;
        if (screenEl.style.transform) {
          pel.style.transform = screenEl.style.transform;
        }
      });
    }
  };
  sync('.editable-sig-committee');
  sync('.editable-sig-committee-list');
  sync('.editable-sig-role');
  sync('.report-inst-header-box');
  sync('.report-tacteing-emblem');
  sync('.report-title-box');
  sync('.sig-lunar-date-val');
  sync('.sig-solar-date-val');
  sync('.report-editable-notice-place');
  sync('.report-editable-notice-date');
  sync('.report-editable-notice-time');
  sync('.signature-box');
  sync('.report-kingdom-header-box');
  sync('#reportLogoContainer');
}

function exportCurrentReportToExcel() {
  const tables = document.querySelectorAll('#printContainer table.official-print-table');
  if (!tables || !tables.length) {
    alert('មិនទាន់មានទិន្នន័យតារាងសម្រាប់ Export ឡើយ!');
    return;
  }
  const stationId = document.getElementById('reportStationSelect').value;
  const ps = allPollingStations.find(p => p.id === stationId);
  const code4 = ps ? String(ps.code || '').padStart(4, '0') : '0000';
  const reportType = document.getElementById('reportTypeSelect').value;

  if (reportType === 'final_roster') {
    exportFinalRosterToExcel(ps);
    return;
  }

  const sheetNamesMap = {
    'sortlist': 'SortList',
    'notice': 'ជូនដំណឹង',
    'attendance': 'បញ្ជីវត្តមាន',
    'scoresheet': 'បញ្ចូលពិន្ទុ',
    'results': 'លទ្ធផលតាមលំដាប់',
    'commune_results': 'លទ្ធផលតាមលំដាប់',
    'final_roster': '21-TAKEO'
  };
  const sheetName = sheetNamesMap[reportType] || 'Report';

  // If there are multiple tables (e.g. 2-page SortList), merge their tbody rows for Excel export
  let exportTable = tables[0];
  if (tables.length > 1) {
    exportTable = tables[0].cloneNode(true);
    const mainTbody = exportTable.querySelector('tbody');
    for (let i = 1; i < tables.length; i++) {
      const otherTbody = tables[i].querySelector('tbody');
      if (otherTbody && mainTbody) {
        Array.from(otherTbody.children).forEach(tr => {
          mainTbody.appendChild(tr.cloneNode(true));
        });
      }
    }
  }

  const distSelect = document.getElementById('reportDistrictFilter');
  const comSelect = document.getElementById('reportCommuneFilter');
  const codeSelect = document.getElementById('reportCodeSelect');
  const selDist = distSelect ? distSelect.value : '';
  const selCommuneCode = comSelect ? comSelect.value : '';

  const isAllStations = (stationId === 'all' || (codeSelect && codeSelect.value === 'all') || (exportTable && exportTable.querySelector('.station-banner-row')));

  let fileName = `គ.ក.ប_2027_${sheetName}_កូដ_${code4}.xlsx`;
  if (isAllStations) {
    const reportLabel = (reportType === 'results' || reportType === 'commune_results') ? 'លទ្ធផល' : sheetName;
    if (selDist === 'all' && selCommuneCode === 'all') {
      fileName = `គ.ក.ប_2027_${reportLabel}_គ្រប់ការិយាល័យ_ទូទាំងខេត្តតាកែវ.xlsx`;
    } else if (selDist && selDist !== 'all' && selCommuneCode === 'all') {
      fileName = `គ.ក.ប_2027_${reportLabel}_គ្រប់ការិយាល័យ_${getDistrictPrefix(selDist)}.xlsx`;
    } else {
      fileName = `គ.ក.ប_2027_${reportLabel}_គ្រប់ការិយាល័យ_${ps ? ps.communeName : ''}_${ps ? ps.communeCode : ''}.xlsx`;
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(exportTable, { raw: true });
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

async function exportFinalRosterToExcel(ps) {
  const distSelect = document.getElementById('reportDistrictFilter');
  const comSelect = document.getElementById('reportCommuneFilter');
  const codeSelect = document.getElementById('reportCodeSelect');
  const hiddenStation = document.getElementById('reportStationSelect');
  const stationId = hiddenStation ? hiddenStation.value : '';
  const selDist = distSelect ? distSelect.value : '';
  const selCommuneCode = comSelect ? comSelect.value : '';

  const isAllStations = (stationId === 'all' || (codeSelect && codeSelect.value === 'all'));

  let targetStations = [];
  let apiUrl = '';
  let fileName = '';

  if (!isAllStations && ps) {
    targetStations = [ps];
    apiUrl = `/api/candidates?pollingStationId=${ps.id}`;
    const code4 = String(ps.code || '').padStart(4, '0');
    fileName = `បញ្ជីរាយនាម_គ.ក.ប_2027_កូដ_${code4}.xlsx`;
  } else if (selDist === 'all' && selCommuneCode === 'all') {
    targetStations = [...(allPollingStations || [])];
    apiUrl = '/api/candidates?district=all&communeCode=all';
    fileName = 'បញ្ជីរាយនាម_គ.ក.ប_2027_ទូទាំងខេត្តតាកែវ.xlsx';
  } else if (selDist && selDist !== 'all' && selCommuneCode === 'all') {
    targetStations = (allPollingStations || []).filter(p => {
      const cleanDist = String(p.district).trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
      return cleanDist === selDist;
    });
    apiUrl = `/api/candidates?district=${encodeURIComponent(selDist)}&communeCode=all`;
    fileName = `បញ្ជីរាយនាម_គ.ក.ប_2027_ស្រុក_${selDist}.xlsx`;
  } else {
    const effectiveCommuneCode = (selCommuneCode && selCommuneCode !== 'all') ? selCommuneCode : (ps ? ps.communeCode : null);
    if (!effectiveCommuneCode) {
      alert('សូមជ្រើសរើសការិយាល័យ ឬឃុំ/សង្កាត់ជាមុនសិន!');
      return;
    }
    targetStations = (allPollingStations || []).filter(p => {
      return String(p.communeCode).padStart(3, '0') === String(effectiveCommuneCode).padStart(3, '0');
    });
    apiUrl = `/api/candidates?communeCode=${effectiveCommuneCode}`;
    const cName = (ps && ps.communeName) || '';
    fileName = `បញ្ជីរាយនាម_គ.ក.ប_2027_ឃុំ_${cName}_${effectiveCommuneCode}.xlsx`;
  }

  targetStations.sort((a, b) => {
    const da = getTakeoDistrictOrder(a.district);
    const db = getTakeoDistrictOrder(b.district);
    if (da !== db) return da - db;
    const ca = parseInt(a.communeCode, 10) || 0;
    const cb = parseInt(b.communeCode, 10) || 0;
    if (ca !== cb) return ca - cb;
    const sa = parseInt(a.code, 10) || 0;
    const sb = parseInt(b.code, 10) || 0;
    return sa - sb;
  });

  let communeCandidates = [];
  try {
    const res = await fetch(apiUrl);
    const data = await res.json();
    communeCandidates = data.candidates || [];
  } catch (err) {
    console.error('Error fetching candidates for Excel:', err);
  }

  const ROSTER_ROLES = [
    'ប្រធាន',
    'អនុប្រធាន',
    'លេខាធិការ',
    'សមាជិកទី១',
    'សមាជិកទី២',
    'សមាជិកទី៣'
  ];

  const stats = {
    'ប្រធាន': { total: 0, female: 0 },
    'អនុប្រធាន': { total: 0, female: 0 },
    'លេខាធិការ': { total: 0, female: 0 },
    'សមាជិកទី១': { total: 0, female: 0 },
    'សមាជិកទី២': { total: 0, female: 0 },
    'សមាជិកទី៣': { total: 0, female: 0 },
    grandTotal: 0,
    grandFemale: 0
  };

  const candidateRows = [];
  let globalRowIdx = 0;
  let prevDistrict = null;
  let prevCommuneCode = null;

  targetStations.forEach((st) => {
    const cleanCurDist = String(st.district || '').trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
    const isFirstStOfDistrict = (cleanCurDist !== prevDistrict);
    if (isFirstStOfDistrict) {
      prevDistrict = cleanCurDist;
    }

    const curCommuneCode = String(st.communeCode || '').padStart(3, '0');
    const isFirstStOfCommune = (curCommuneCode !== prevCommuneCode);
    if (isFirstStOfCommune) {
      prevCommuneCode = curCommuneCode;
    }

    const stCands = communeCandidates.filter(c => c.pollingStationId === st.id);

    ROSTER_ROLES.forEach((role, roleIdx) => {
      globalRowIdx++;

      let c = stCands.find(x => x.role === role && x.status === 'A-ជាប់');
      if (!c) {
        const roleCands = stCands.filter(x => x.role === role);
        roleCands.sort((a, b) => {
          if (a.rank && b.rank) return a.rank - b.rank;
          const at = parseFloat(a.scoreTotal) || 0;
          const bt = parseFloat(b.scoreTotal) || 0;
          return bt - at;
        });
        c = roleCands[0];
      }

      const isFemale = c && (c.gender === 'ស' || c.gender === 'ស្រី');
      stats[role].total++;
      stats.grandTotal++;
      if (isFemale) {
        stats[role].female++;
        stats.grandFemale++;
      }

      const candName = c ? (c.name || '') : '';
      const candGender = c ? (c.gender || '') : '';
      const communeCol = (roleIdx === 0 && isFirstStOfCommune) ? (st.communeName || '') : ' -';
      const districtCol = (roleIdx === 0 && isFirstStOfDistrict) ? (st.district || '') : ' -';
      const stCodeFormatted = String(st.code || '').padStart(4, '0');
      const stCodeCol = (roleIdx === 0) ? stCodeFormatted : ' -';

      candidateRows.push([
        globalRowIdx,
        candName,
        candGender,
        role,
        communeCol,
        districtCol,
        stCodeCol
      ]);
    });
  });

  const mandateText = (appSettings && appSettings.mandate)
    ? appSettings.mandate
    : ((ps && ps.mandate) || 'សម្រាប់ការបោះឆ្នោតជ្រើសតាំងតំណាងរាស្ត្រ នីតិកាលទី៨ ឆ្នាំ២០២៧');

  const aoa = [];
  // Rows 0 to 5 (Excel rows 1 to 6): empty
  for (let i = 0; i < 6; i++) aoa.push([]);

  // Row 6 (Excel row 7): Title
  aoa.push(["បញ្ជីរាយនាម"]);

  // Row 7 (Excel row 8): Subtitle
  aoa.push(["សមាសភាពគណៈកម្មការការិយាល័យបោះឆ្នោត (គ.ក.ប) "]);

  // Row 8 (Excel row 9): Mandate
  aoa.push([mandateText]);

  // Row 9 (Excel row 10): Table headers
  aoa.push([
    "ល.រ", "គោត្តនាម និងនាម", "ភេទ", "មុខតំណែង", "ឃុំ សង្កាត់", "ក្រុង ស្រុក", "លេខកូដការិ."
  ]);

  for (let i = 0; i < candidateRows.length; i++) {
    aoa.push(candidateRows[i]);
  }

  // Bottom note
  aoa.push([`បញ្ឈប់បញ្ជីនេះត្រឹមចំនួន ${toKhmerNum(stats.grandTotal)} នាក់ ក្នុងនោះ ស្រី ${toKhmerNum(stats.grandFemale)} នាក់។`]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Merges matching template
  ws['!merges'] = [
    { s: { c: 0, r: 6 }, e: { c: 6, r: 6 } },
    { s: { c: 0, r: 7 }, e: { c: 6, r: 7 } },
    { s: { c: 0, r: 8 }, e: { c: 6, r: 8 } }
  ];

  // Column widths matching template
  ws['!cols'] = [
    { wch: 6.78 },   // A: ល.រ
    { wch: 18.33 },  // B: គោត្តនាម និងនាម
    { wch: 5.00 },   // C: ភេទ
    { wch: 13.55 },  // D: មុខតំណែង
    { wch: 13.78 },  // E: ឃុំ សង្កាត់
    { wch: 13.78 },  // F: ក្រុង ស្រុក
    { wch: 12.44 }   // G: លេខកូដការិ.
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '21-TAKEO');
  XLSX.writeFile(wb, fileName);
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
    else if (u.role === 'Trainer') roleBadge = `<span class="badge" style="background:#f3e8ff; color:#7e22ce; border:1px solid #e9d5ff; font-weight:700;">គ្រូប្រចាំក្រុងស្រុក</span>`;
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
  const ok = await showModernConfirm(`តើលោកអ្នកពិតជាចង់ Reset លេខសម្ងាត់របស់គណនី "${username}" ទៅជា "pec21" មែនទេ?`, {
    title: 'Reset លេខសម្ងាត់',
    confirmText: 'Reset ឥឡូវនេះ',
    type: 'warning',
    icon: '🔑'
  });
  if (ok) {
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
  const ok = await showModernConfirm('តើលោកអ្នកពិតជាចង់កំណត់ប្រើប្រាស់ Logo គ.ជ.ប ដើមវិញមែនទេ?', {
    title: 'កំណត់ Logo ដើម',
    confirmText: 'កំណត់ Logo ដើម',
    type: 'info',
    icon: '🔄'
  });
  if (ok) {
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
      const teleCheck = document.getElementById('settingTelegramEnabled');
      if (teleCheck) teleCheck.checked = (s.telegramNotifyEnabled !== false);
      const teleTokenInput = document.getElementById('settingTelegramBotToken');
      if (teleTokenInput) teleTokenInput.value = s.telegramBotToken || '';
      const teleChatIdInput = document.getElementById('settingTelegramChatId');
      if (teleChatIdInput) teleChatIdInput.value = s.telegramChatId || '';
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
    logoUrl: document.getElementById('settingLogoUrl')?.value || '',
    telegramNotifyEnabled: document.getElementById('settingTelegramEnabled')?.checked !== false,
    telegramBotToken: document.getElementById('settingTelegramBotToken')?.value.trim() || '',
    telegramChatId: document.getElementById('settingTelegramChatId')?.value.trim() || ''
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

  if (payload.name && payload.dob) {
    const dupRes = await fetch('/api/candidates/check-duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        gender: payload.gender,
        dob: payload.dob,
        currentPollingStationId: stationId
      })
    });
    if (dupRes.ok) {
      const dupData = await dupRes.json();
      if (dupData.success && dupData.isDuplicate && dupData.existing) {
        const ex = dupData.existing;
        const genderText = payload.gender === 'ប' ? 'ប្រុស (ប)' : 'ស្រី (ស)';
        const msgHtml = `
<div style="text-align: left; font-size: 13.5px; line-height: 1.6;">
  <div style="font-weight: 700; color: #b91c1c; margin-bottom: 12px; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 8px;">
    <span>⚠️</span>
    <span>ឈ្មោះបេក្ខជននេះស្ទួនហើយ សូមជួយពិនិត្យ និងផ្ទៀងផ្ទាត់ឡើងវិញ!</span>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1.15fr; gap: 14px; margin-bottom: 12px; align-items: stretch;">
    <!-- Column 1: ព័ត៌មានបេក្ខជនកំពុងបញ្ចូល -->
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px 14px; box-sizing: border-box; display: flex; flex-direction: column;">
      <div style="font-weight: 700; color: #1e293b; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; font-size: 13.5px; display: flex; align-items: center; gap: 6px;">
        <span>📋</span> <span>ព័ត៌មានបេក្ខជនកំពុងបញ្ចូល</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 7px; font-size: 13px; line-height: 1.6;">
        <div>• <strong>គោត្តនាម-នាម ៖</strong> <span style="color:#0f172a; font-weight: 700;">${payload.name}</span></div>
        <div>• <strong>ភេទ ៖</strong> <span style="color:#0f172a;">${genderText}</span></div>
        <div>• <strong>ថ្ងៃ ខែ ឆ្នាំកំណើត ៖</strong> <span style="color:#0f172a; font-weight: 700;">${payload.dob}</span></div>
      </div>
    </div>

    <!-- Column 2: ស្ទួនជាមួយបេក្ខជនដែលមានក្នុងប្រព័ន្ធ -->
    <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 12px 14px; box-sizing: border-box; display: flex; flex-direction: column;">
      <div style="font-weight: 700; color: #991b1b; margin-bottom: 8px; border-bottom: 2px dashed #fecdd3; padding-bottom: 5px; font-size: 13.5px; display: flex; align-items: center; gap: 6px;">
        <span>🚨</span> <span>ស្ទួនជាមួយបេក្ខជនដែលមានក្នុងប្រព័ន្ធ</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; line-height: 1.6;">
        <div>• <strong>ស្រុក/ក្រុង ៖</strong> <span style="color:#991b1b; font-weight: 700;">${ex.district || 'មិនបានបញ្ជាក់'}</span></div>
        <div>• <strong>ឃុំ/សង្កាត់ ៖</strong> <span style="color:#991b1b; font-weight: 700;">${ex.communeName || 'មិនបានបញ្ជាក់'}</span></div>
        <div>• <strong>ការិយាល័យបោះឆ្នោត ៖</strong> <span style="color:#991b1b; font-weight: 700;">${ex.pollingStationName || (ex.pollingStationCode ? 'ការិយាល័យលេខ ' + ex.pollingStationCode : 'មិនបានបញ្ជាក់')}</span></div>
        <div>• <strong>មុខតំណែង ៖</strong> <span style="color:#991b1b; font-weight: 700;">${ex.role || 'មិនបានបញ្ជាក់'}</span></div>
      </div>
    </div>
  </div>

  <div style="font-size: 12.5px; color: #475569; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; line-height: 1.6; text-align: left;">
    <div>👉 ប្រសិនបើអ្នកប្រាកដថា <strong>មិនស្ទួន</strong> សូមចុច <strong>(យល់ព្រម)</strong></div>
    <div>👉 ប្រសិនបើអ្នកប្រាកដថា <strong>ស្ទួន</strong> សូមចុច <strong>(ស្ទួន)</strong> ឈ្មោះបេក្ខជននេះមិនអាចបញ្ចូលបានទេ</div>
  </div>
</div>
        `.trim();

        const ok = await showModernPopup({
          title: '⚠️ ឈ្មោះបេក្ខជននេះស្ទួនហើយ',
          message: msgHtml,
          type: 'warning',
          icon: '⚠️',
          showCancel: true,
          confirmText: 'យល់ព្រម',
          cancelText: 'ស្ទួន',
          cancelIsDanger: true,
          isWide: true
        });

        if (!ok) {
          return;
        }

        const exStation = ex.pollingStationName || (ex.pollingStationCode ? 'ការិយាល័យលេខ ' + ex.pollingStationCode : 'មិនបានបញ្ជាក់');
        const secondConfirmHtml = `
<div style="text-align: left; font-size: 13.5px; line-height: 1.6;">
  <div style="margin-bottom: 12px; color: #1e293b; font-size: 14.5px;">
    តើអ្នកបញ្ចូលឈ្មោះបេក្ខជន <strong>«${payload.name}»</strong> ដែលស្ទួនជាមួយ ៖
  </div>
  <div style="background: #fff1f2; border: 1.5px solid #fecdd3; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 13px; line-height: 1.8;">
    <div>• <strong>ក្រុង/ស្រុក ៖</strong> <span style="color:#991b1b; font-weight: 700;">${ex.district || 'មិនបានបញ្ជាក់'}</span></div>
    <div>• <strong>ឃុំ/សង្កាត់ ៖</strong> <span style="color:#991b1b; font-weight: 700;">${ex.communeName || 'មិនបានបញ្ជាក់'}</span></div>
    <div>• <strong>ការិយាល័យបោះឆ្នោត ៖</strong> <span style="color:#991b1b; font-weight: 700;">${exStation}</span></div>
    <div>• <strong>មុខតំណែង ៖</strong> <span style="color:#991b1b; font-weight: 700;">${ex.role || 'មិនបានបញ្ជាក់'}</span></div>
  </div>
  <div style="font-weight: 700; color: #b91c1c; font-size: 14.5px; text-align: center;">
    នេះមែនទេ?
  </div>
</div>
        `.trim();

        const reallyInsert = await showModernPopup({
          title: '❓ បញ្ជាក់ការបញ្ចូលបេក្ខជនស្ទួន',
          message: secondConfirmHtml,
          type: 'question',
          icon: '❓',
          showCancel: true,
          confirmText: 'ពិតមែន',
          cancelText: 'បោះបង់',
          cancelIsDanger: true
        });

        if (!reallyInsert) {
          return;
        }

        payload.isDuplicate = true;
        if (ex && ex.id) {
          try {
            fetch('/api/candidates/mark-duplicate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: ex.id, isDuplicate: true })
            });
          } catch(e) {}
        }
      }
    }
  }

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
      await updateDuplicateBadgeCount();
    } else {
      alert(data.message);
    }
  } catch (err) {
    alert(err.message);
  }
}

// Modal Utility
window.openModal = function(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('active');
};
window.closeModal = function(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('active');
};

// ==============================================================================
// PASSED CANDIDATES STATISTICS TAB (តារាងស្ថិតិបេក្ខជនជាប់ គ.ក.ប)
// ==============================================================================
let cachedStatsCandidates = null;
window.currentStatsExportData = null;

const STATS_ROLES_LIST = [
  'ប្រធាន',
  'អនុប្រធាន',
  'លេខាធិការ',
  'សមាជិកទី១',
  'សមាជិកទី២',
  'សមាជិកទី៣'
];

async function loadStatisticsPage() {
  const container = document.getElementById('statisticsTableContainer');
  if (container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #64748b; font-size: 14px;">
        ⏳ កំពុងទាញយកទិន្នន័យស្ថិតិបេក្ខជនជាប់...
      </div>
    `;
  }

  try {
    if (!allPollingStations || !allPollingStations.length) {
      const psRes = await (await fetch('/api/polling-stations')).json();
      allPollingStations = psRes.pollingStations || [];
    }

    const candRes = await (await fetch('/api/candidates?district=all&communeCode=all')).json();
    cachedStatsCandidates = candRes.candidates || [];

    const distSelect = document.getElementById('statDistrictFilter');
    if (distSelect) {
      const currentVal = distSelect.value;
      const dists = [...new Set(allPollingStations.map(p => p.district))].filter(Boolean).sort();
      let distOptions = '<option value="all">ទាំងអស់ (ទូទាំងខេត្ត)</option>';
      dists.forEach(d => {
        distOptions += `<option value="${d}">${getDistrictPrefix(d)}</option>`;
      });
      distSelect.innerHTML = distOptions;

      if (currentUser && currentUser.role === 'Trainer' && currentUser.district && currentUser.district !== 'all') {
        distSelect.value = currentUser.district;
        distSelect.disabled = true;
      } else if (currentVal && Array.from(distSelect.options).some(o => o.value === currentVal)) {
        distSelect.value = currentVal;
      }
    }

    updateStatCommuneDropdown();
    renderStatisticsPage();
  } catch (err) {
    console.error('Error loading statistics:', err);
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 30px; color: #ef4444; font-size: 14px;">
          ❌ មានបញ្ហាក្នុងការទាញយកទិន្នន័យស្ថិតិ ៖ ${err.message}
        </div>
      `;
    }
  }
}

function updateStatCommuneDropdown() {
  const distSelect = document.getElementById('statDistrictFilter');
  const comSelect = document.getElementById('statCommuneFilter');
  if (!comSelect || !distSelect) return;

  const selDist = distSelect.value;
  const currentVal = comSelect.value;

  let filteredStations = allPollingStations;
  if (selDist !== 'all') {
    const cleanD = selDist.trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
    filteredStations = filteredStations.filter(s => String(s.district || '').trim().replace(/^(ស្រុក|ក្រុង)\s*/, '') === cleanD);
  }

  const comMap = new Map();
  filteredStations.forEach(s => {
    const code = String(s.communeCode || '').padStart(3, '0');
    if (!comMap.has(code)) {
      comMap.set(code, {
        code: code,
        name: s.communeName || '',
        district: s.district || ''
      });
    }
  });

  let comOptions = '<option value="all">ទាំងអស់</option>';
  Array.from(comMap.values()).sort((a, b) => a.code.localeCompare(b.code)).forEach(c => {
    comOptions += `<option value="${c.code}">${getCommunePrefix(c.name, c.district)} (${toKhmerNum(c.code)})</option>`;
  });
  comSelect.innerHTML = comOptions;

  if (currentUser && currentUser.role === 'Commune' && currentUser.communeCode) {
    comSelect.value = String(currentUser.communeCode).padStart(3, '0');
    comSelect.disabled = true;
  } else if (currentVal && Array.from(comSelect.options).some(o => o.value === currentVal)) {
    comSelect.value = currentVal;
  }
}

function onStatDistrictChange() {
  updateStatCommuneDropdown();
  renderStatisticsPage();
}

function getPassedCandidateForStationRole(stCandidates, role) {
  const roleCands = (stCandidates || []).filter(c => c.role === role);
  if (!roleCands.length) return null;

  let c = roleCands.find(x => x.status === 'A-ជាប់');
  if (!c) {
    roleCands.sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      const at = parseFloat(a.scoreTotal) || 0;
      const bt = parseFloat(b.scoreTotal) || 0;
      return bt - at;
    });
    const top = roleCands[0];
    if (top && top.name && (top.status === 'A-ជាប់' || top.rank === 1 || parseFloat(top.scoreTotal) > 0)) {
      c = top;
    }
  }
  return (c && c.name) ? c : null;
}

function renderStatisticsPage() {
  const container = document.getElementById('statisticsTableContainer');
  if (!container) return;

  const levelSelect = document.getElementById('statLevelSelect');
  const distSelect = document.getElementById('statDistrictFilter');
  const comSelect = document.getElementById('statCommuneFilter');
  const comWrapper = document.getElementById('statCommuneFilterWrapper');

  const level = levelSelect ? levelSelect.value : 'province';
  const selDist = distSelect ? distSelect.value : 'all';
  const selCom = comSelect ? comSelect.value : 'all';

  if (comWrapper) {
    comWrapper.style.display = (level === 'province') ? 'none' : 'flex';
  }

  // Filter stations based on selection
  let targetStations = [...(allPollingStations || [])];
  if (selDist !== 'all') {
    const cleanD = selDist.trim().replace(/^(ស្រុក|ក្រុង)\s*/, '');
    targetStations = targetStations.filter(s => String(s.district || '').trim().replace(/^(ស្រុក|ក្រុង)\s*/, '') === cleanD);
  }
  if (level !== 'province' && selCom !== 'all') {
    const targetCom = String(selCom).padStart(3, '0');
    targetStations = targetStations.filter(s => String(s.communeCode || '').padStart(3, '0') === targetCom);
  }

  // Pre-calculate per-station passed candidates
  const allCands = cachedStatsCandidates || [];
  const stationPassedMap = new Map();

  targetStations.forEach(st => {
    const stCands = allCands.filter(c => c.pollingStationId === st.id);
    const roleStats = {};
    let stTotal = 0;
    let stFemale = 0;

    STATS_ROLES_LIST.forEach(role => {
      const cand = getPassedCandidateForStationRole(stCands, role);
      if (cand) {
        const isF = (cand.gender === 'ស' || cand.gender === 'ស្រី' || cand.gender === 'F');
        roleStats[role] = { total: 1, female: isF ? 1 : 0 };
        stTotal += 1;
        if (isF) stFemale += 1;
      } else {
        roleStats[role] = { total: 0, female: 0 };
      }
    });

    stationPassedMap.set(st.id, {
      station: st,
      roles: roleStats,
      grandTotal: stTotal,
      grandFemale: stFemale
    });
  });

  // Aggregation containers
  let rowsHtml = '';
  const exportRows = [];
  let grandTotalStations = 0;
  const grandRoleTotals = {};
  STATS_ROLES_LIST.forEach(r => grandRoleTotals[r] = { total: 0, female: 0 });
  let grandAllTotal = 0;
  let grandAllFemale = 0;

  // LEVEL 1: PROVINCE (Group by District)
  if (level === 'province') {
    const distGroups = new Map();
    targetStations.forEach(st => {
      const d = st.district || 'មិនស្គាល់';
      if (!distGroups.has(d)) distGroups.set(d, []);
      distGroups.get(d).push(st);
    });

    let rowIdx = 0;
    Array.from(distGroups.keys()).sort().forEach(d => {
      rowIdx++;
      const stList = distGroups.get(d);
      const stCount = stList.length;
      grandTotalStations += stCount;

      const dRoles = {};
      STATS_ROLES_LIST.forEach(r => dRoles[r] = { total: 0, female: 0 });
      let dTotal = 0;
      let dFemale = 0;

      stList.forEach(st => {
        const data = stationPassedMap.get(st.id);
        if (data) {
          STATS_ROLES_LIST.forEach(r => {
            dRoles[r].total += data.roles[r].total;
            dRoles[r].female += data.roles[r].female;
            grandRoleTotals[r].total += data.roles[r].total;
            grandRoleTotals[r].female += data.roles[r].female;
          });
          dTotal += data.grandTotal;
          dFemale += data.grandFemale;
          grandAllTotal += data.grandTotal;
          grandAllFemale += data.grandFemale;
        }
      });

      let roleCells = '';
      const expRow = [rowIdx, getDistrictPrefix(d), stCount];
      STATS_ROLES_LIST.forEach(r => {
        roleCells += `
          <td style="font-weight: 500;">${toKhmerNum(dRoles[r].total)}</td>
          <td class="col-female">${toKhmerNum(dRoles[r].female)}</td>
        `;
        expRow.push(dRoles[r].total, dRoles[r].female);
      });
      expRow.push(dTotal, dFemale);
      exportRows.push(expRow);

      rowsHtml += `
        <tr>
          <td class="text-center">${toKhmerNum(rowIdx)}</td>
          <td class="text-left" style="font-weight: 600; color: #1e3a8a;">${getDistrictPrefix(d)}</td>
          <td class="text-center" style="font-weight: 600;">${toKhmerNum(stCount)}</td>
          ${roleCells}
          <td class="col-grand-total text-center">${toKhmerNum(dTotal)}</td>
          <td class="col-female text-center" style="font-weight: 700;">${toKhmerNum(dFemale)}</td>
        </tr>
      `;
    });
  }

  // LEVEL 2: COMMUNE (Group by Commune)
  else if (level === 'commune') {
    const comGroups = new Map();
    targetStations.forEach(st => {
      const code = String(st.communeCode || '').padStart(3, '0');
      const key = `${st.district}_${code}`;
      if (!comGroups.has(key)) {
        comGroups.set(key, {
          district: st.district,
          communeCode: code,
          communeName: st.communeName || '',
          stations: []
        });
      }
      comGroups.get(key).stations.push(st);
    });

    let rowIdx = 0;
    Array.from(comGroups.values()).sort((a, b) => a.communeCode.localeCompare(b.communeCode)).forEach(grp => {
      rowIdx++;
      const stCount = grp.stations.length;
      grandTotalStations += stCount;

      const cRoles = {};
      STATS_ROLES_LIST.forEach(r => cRoles[r] = { total: 0, female: 0 });
      let cTotal = 0;
      let cFemale = 0;

      grp.stations.forEach(st => {
        const data = stationPassedMap.get(st.id);
        if (data) {
          STATS_ROLES_LIST.forEach(r => {
            cRoles[r].total += data.roles[r].total;
            cRoles[r].female += data.roles[r].female;
            grandRoleTotals[r].total += data.roles[r].total;
            grandRoleTotals[r].female += data.roles[r].female;
          });
          cTotal += data.grandTotal;
          cFemale += data.grandFemale;
          grandAllTotal += data.grandTotal;
          grandAllFemale += data.grandFemale;
        }
      });

      let roleCells = '';
      const comFullLabel = `${getCommunePrefix(grp.communeName, grp.district)} (${toKhmerNum(grp.communeCode)})`;
      const expRow = [rowIdx, getDistrictPrefix(grp.district), comFullLabel, stCount];
      STATS_ROLES_LIST.forEach(r => {
        roleCells += `
          <td style="font-weight: 500;">${toKhmerNum(cRoles[r].total)}</td>
          <td class="col-female">${toKhmerNum(cRoles[r].female)}</td>
        `;
        expRow.push(cRoles[r].total, cRoles[r].female);
      });
      expRow.push(cTotal, cFemale);
      exportRows.push(expRow);

      rowsHtml += `
        <tr>
          <td class="text-center">${toKhmerNum(rowIdx)}</td>
          <td class="text-left">${getDistrictPrefix(grp.district)}</td>
          <td class="text-left" style="font-weight: 600; color: #1e3a8a;">${comFullLabel}</td>
          <td class="text-center" style="font-weight: 600;">${toKhmerNum(stCount)}</td>
          ${roleCells}
          <td class="col-grand-total text-center">${toKhmerNum(cTotal)}</td>
          <td class="col-female text-center" style="font-weight: 700;">${toKhmerNum(cFemale)}</td>
        </tr>
      `;
    });
  }

  // LEVEL 3: POLLING STATION (1 row per station)
  else {
    let rowIdx = 0;
    targetStations.forEach(st => {
      rowIdx++;
      grandTotalStations += 1;
      const data = stationPassedMap.get(st.id);

      let sTotal = 0;
      let sFemale = 0;
      let roleCells = '';

      const stCodeKhmer = toKhmerNum(String(st.code || '').padStart(4, '0'));
      const expRow = [rowIdx, getDistrictPrefix(st.district), getCommunePrefix(st.communeName, st.district), stCodeKhmer, st.name || ''];

      STATS_ROLES_LIST.forEach(r => {
        const tot = data ? data.roles[r].total : 0;
        const fem = data ? data.roles[r].female : 0;

        grandRoleTotals[r].total += tot;
        grandRoleTotals[r].female += fem;
        sTotal += tot;
        sFemale += fem;

        roleCells += `
          <td style="${tot > 0 ? 'color: #166534; font-weight: 600;' : 'color: #94a3b8;'}">${toKhmerNum(tot)}</td>
          <td class="col-female" style="${fem > 0 ? 'font-weight: 700;' : 'color: #cbd5e1;'}">${toKhmerNum(fem)}</td>
        `;
        expRow.push(tot, fem);
      });

      grandAllTotal += sTotal;
      grandAllFemale += sFemale;
      expRow.push(sTotal, sFemale);
      exportRows.push(expRow);

      rowsHtml += `
        <tr>
          <td class="text-center">${toKhmerNum(rowIdx)}</td>
          <td class="text-left">${getDistrictPrefix(st.district)}</td>
          <td class="text-left">${getCommunePrefix(st.communeName, st.district)}</td>
          <td class="text-center" style="font-weight: 600;">${stCodeKhmer}</td>
          <td class="text-left" style="font-size: 12px;">${st.name || ''}</td>
          ${roleCells}
          <td class="col-grand-total text-center">${toKhmerNum(sTotal)}</td>
          <td class="col-female text-center" style="font-weight: 700;">${toKhmerNum(sFemale)}</td>
        </tr>
      `;
    });
  }

  // Update Summary Pill at top
  const summaryPill = document.getElementById('statSummaryPill');
  if (summaryPill) {
    summaryPill.textContent = `សរុបជាប់ ៖ ${toKhmerNum(grandAllTotal)} នាក់ (ស្រី ${toKhmerNum(grandAllFemale)} នាក់)`;
  }

  // Build Footer Total Row
  let footerRoleCells = '';
  const totalExpRow = ['សរុប', '', grandTotalStations];
  if (level === 'commune') totalExpRow.push('');
  if (level === 'station') totalExpRow.push('', '');

  STATS_ROLES_LIST.forEach(r => {
    footerRoleCells += `
      <td class="text-center" style="font-weight: 700;">${toKhmerNum(grandRoleTotals[r].total)}</td>
      <td class="col-female text-center" style="font-weight: 700;">${toKhmerNum(grandRoleTotals[r].female)}</td>
    `;
    totalExpRow.push(grandRoleTotals[r].total, grandRoleTotals[r].female);
  });
  totalExpRow.push(grandAllTotal, grandAllFemale);

  const locColspan = (level === 'province') ? 2 : (level === 'commune') ? 3 : 5;
  const footerRowHtml = `
    <tr class="row-total">
      <td colspan="${locColspan}" class="text-center" style="letter-spacing: 0.5px;">
        សរុបរួម (${toKhmerNum(grandTotalStations)} ការិយាល័យ)
      </td>
      ${footerRoleCells}
      <td class="col-grand-total text-center" style="font-size: 13px !important; font-weight: 800 !important; color: #166534 !important;">${toKhmerNum(grandAllTotal)}</td>
      <td class="col-female text-center" style="font-size: 13px !important; font-weight: 800 !important; color: #7e22ce !important;">${toKhmerNum(grandAllFemale)}</td>
    </tr>
  `;

  // Dynamic Header Columns
  let locationHeaders = '';
  if (level === 'province') {
    locationHeaders = `
      <th rowspan="2" style="width: 45px;">ល.រ</th>
      <th rowspan="2" style="min-width: 160px;">ក្រុង-ស្រុក</th>
      <th rowspan="2" style="width: 100px;">ការិយាល័យ</th>
    `;
  } else if (level === 'commune') {
    locationHeaders = `
      <th rowspan="2" style="width: 45px;">ល.រ</th>
      <th rowspan="2" style="min-width: 130px;">ក្រុង-ស្រុក</th>
      <th rowspan="2" style="min-width: 160px;">ឃុំ-សង្កាត់</th>
      <th rowspan="2" style="width: 95px;">ការិយាល័យ</th>
    `;
  } else {
    locationHeaders = `
      <th rowspan="2" style="width: 45px;">ល.រ</th>
      <th rowspan="2" style="width: 120px;">ក្រុង-ស្រុក</th>
      <th rowspan="2" style="width: 130px;">ឃុំ-សង្កាត់</th>
      <th rowspan="2" style="width: 85px;">លេខកូដ</th>
      <th rowspan="2" style="min-width: 160px;">ទីតាំងការិយាល័យ</th>
    `;
  }

  // Save current export data for Excel / Print
  window.currentStatsExportData = {
    level: level,
    district: selDist,
    commune: selCom,
    totalStations: grandTotalStations,
    grandTotal: grandAllTotal,
    grandFemale: grandAllFemale,
    grandRoleTotals: grandRoleTotals,
    rows: exportRows
  };

  // Full Table Assembly
  const tableHtml = `
    <div class="stats-table-wrapper">
      <table class="stats-table">
        <thead>
          <tr>
            ${locationHeaders}
            <th colspan="2" class="th-role-header">ប្រធាន</th>
            <th colspan="2" class="th-role-header">អនុប្រធាន</th>
            <th colspan="2" class="th-role-header">លេខាធិការ</th>
            <th colspan="2" class="th-role-header">សមាជិកទី១</th>
            <th colspan="2" class="th-role-header">សមាជិកទី២</th>
            <th colspan="2" class="th-role-header">សមាជិកទី៣</th>
            <th colspan="2" class="th-grand-total">សរុបរួម</th>
          </tr>
          <tr>
            <th style="width: 48px;">សរុប</th><th style="width: 48px;" class="col-female">ស្រី</th>
            <th style="width: 48px;">សរុប</th><th style="width: 48px;" class="col-female">ស្រី</th>
            <th style="width: 48px;">សរុប</th><th style="width: 48px;" class="col-female">ស្រី</th>
            <th style="width: 48px;">សរុប</th><th style="width: 48px;" class="col-female">ស្រី</th>
            <th style="width: 48px;">សរុប</th><th style="width: 48px;" class="col-female">ស្រី</th>
            <th style="width: 48px;">សរុប</th><th style="width: 48px;" class="col-female">ស្រី</th>
            <th style="width: 58px;" class="th-grand-total">សរុប</th><th style="width: 58px;" class="th-grand-total col-female">ស្រី</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="18" style="padding: 30px; text-align: center; color: #94a3b8;">ពុំមានទិន្នន័យស្របតាមលក្ខខណ្ឌជ្រើសរើសឡើយ</td></tr>`}
        </tbody>
        <tfoot>
          ${footerRowHtml}
        </tfoot>
      </table>
    </div>
  `;

  container.innerHTML = tableHtml;
}

function exportStatisticsToExcel() {
  if (!window.currentStatsExportData || !window.XLSX) {
    alert('ទិន្នន័យពុំទាន់រួចរាល់សម្រាប់ការទាញយកឡើយ!');
    return;
  }

  const d = window.currentStatsExportData;
  const levelNames = {
    'province': 'ទូទាំងខេត្ត_តាមក្រុងស្រុក',
    'commune': 'តាមឃុំសង្កាត់',
    'station': 'តាមការិយាល័យបោះឆ្នោត'
  };

  const wb = XLSX.utils.book_new();

  let headerRow1 = [];
  let headerRow2 = [];

  if (d.level === 'province') {
    headerRow1 = ['ល.រ', 'ក្រុង-ស្រុក', 'ការិយាល័យសរុប', 'ប្រធាន', '', 'អនុប្រធាន', '', 'លេខាធិការ', '', 'សមាជិកទី១', '', 'សមាជិកទី២', '', 'សមាជិកទី៣', '', 'សរុបរួម', ''];
    headerRow2 = ['', '', '', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី'];
  } else if (d.level === 'commune') {
    headerRow1 = ['ល.រ', 'ក្រុង-ស្រុក', 'ឃុំ-សង្កាត់', 'ការិយាល័យសរុប', 'ប្រធាន', '', 'អនុប្រធាន', '', 'លេខាធិការ', '', 'សមាជិកទី១', '', 'សមាជិកទី២', '', 'សមាជិកទី៣', '', 'សរុបរួម', ''];
    headerRow2 = ['', '', '', '', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី'];
  } else {
    headerRow1 = ['ល.រ', 'ក្រុង-ស្រុក', 'ឃុំ-សង្កាត់', 'លេខកូដ', 'ទីតាំងការិយាល័យ', 'ប្រធាន', '', 'អនុប្រធាន', '', 'លេខាធិការ', '', 'សមាជិកទី១', '', 'សមាជិកទី២', '', 'សមាជិកទី៣', '', 'សរុបរួម', ''];
    headerRow2 = ['', '', '', '', '', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី', 'សរុប', 'ស្រី'];
  }

  const aoa = [
    ['តារាងស្ថិតិសមាសភាពគណៈកម្មការការិយាល័យបោះឆ្នោត (គ.ក.ប) ដែលបានជាប់ជាផ្លូវការ'],
    [`កម្រិតស្ថិតិ ៖ ${levelNames[d.level] || d.level} | សរុបជាប់ ៖ ${d.grandTotal} នាក់ (ស្រី ${d.grandFemale} នាក់)`],
    [],
    headerRow1,
    headerRow2
  ];

  d.rows.forEach(r => aoa.push(r));

  // Footer Total Row
  const totalRow = ['សរុបរួម'];
  const padCount = (d.level === 'province') ? 1 : (d.level === 'commune') ? 2 : 3;
  for (let i = 0; i < padCount; i++) totalRow.push('');
  totalRow.push(d.totalStations);
  STATS_ROLES_LIST.forEach(r => {
    totalRow.push(d.grandRoleTotals[r].total, d.grandRoleTotals[r].female);
  });
  totalRow.push(d.grandTotal, d.grandFemale);
  aoa.push(totalRow);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const colWidths = [
    { wch: 6 },
    { wch: 20 },
    { wch: 22 },
    { wch: 10 },
    { wch: 24 }
  ];
  for (let i = 0; i < 14; i++) colWidths.push({ wch: 8 });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'តារាងស្ថិតិ_គកប');
  const fileName = `តារាងស្ថិតិបេក្ខជនជាប់_គកប_${d.level}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

function printStatisticsTable() {
  const container = document.getElementById('statisticsTableContainer');
  if (!container || !window.currentStatsExportData) {
    alert('ពុំទាន់មានទិន្នន័យដើម្បីបោះពុម្ពឡើយ!');
    return;
  }

  const d = window.currentStatsExportData;
  const levelLabels = {
    'province': 'ទូទាំងខេត្ត (តាមក្រុង-ស្រុក)',
    'commune': 'តាមឃុំ-សង្កាត់',
    'station': 'តាមការិយាល័យបោះឆ្នោតនីមួយៗ'
  };

  const printContent = container.innerHTML;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="km">
    <head>
      <meta charset="UTF-8">
      <title>តារាងស្ថិតិសមាសភាព គ.ក.ប ដែលបានជាប់ជាផ្លូវការ</title>
      <link href="https://fonts.googleapis.com/css2?family=Moul&family=Siemreap&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm 10mm 10mm 10mm;
        }
        body {
          font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif;
          margin: 0;
          padding: 10px;
          color: #000;
          background: #fff;
          font-size: 11pt;
        }
        .letterhead-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-bottom: 6px;
        }
        .letterhead-table td {
          border: none;
          vertical-align: top;
        }
        .inst-title {
          font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif;
          font-size: 11pt;
          line-height: 1.5;
          text-align: left;
        }
        .kingdom-title {
          font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif;
          font-size: 13pt;
          text-align: center;
          line-height: 1.5;
        }
        .report-main-title {
          font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif;
          font-size: 13pt;
          text-align: center;
          margin: 8px 0 2px 0;
        }
        .report-sub-title {
          font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif;
          font-size: 11.5pt;
          text-align: center;
          margin-bottom: 8px;
        }
        .stats-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10pt;
        }
        .stats-table th, .stats-table td {
          border: 1px solid #000;
          padding: 3px 5px;
          text-align: center;
        }
        .stats-table thead tr:first-child th {
          font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif;
          font-size: 10pt;
          background: #f1f5f9;
        }
        .stats-table thead tr:nth-child(2) th {
          font-size: 9.5pt;
          background: #f8fafc;
        }
        .stats-table tr.row-total td {
          font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif !important;
          font-size: 10pt !important;
          background: #e2e8f0 !important;
          font-weight: bold;
        }
        .text-left { text-align: left !important; }
        .text-center { text-align: center !important; }
        .footer-sig-block {
          margin-top: 14px;
          display: flex;
          justify-content: flex-end;
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <table class="letterhead-table">
        <tr>
          <td style="width: 45%;">
            <div class="inst-title">
              <div>គណៈកម្មាធិការជាតិរៀបចំការបោះឆ្នោត</div>
              <div>គណៈកម្មការរៀបចំការបោះឆ្នោត ខេត្តតាកែវ</div>
              <div>គណៈកម្មការសម្ភាសន៍ជ្រើសរើស គ.ក.ប</div>
            </div>
          </td>
          <td style="width: 55%;">
            <div class="kingdom-title">
              <div>ព្រះរាជាណាចក្រកម្ពុជា</div>
              <div>ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
              <div style="font-family: 'Tacteing', serif; font-size: 15pt;">3</div>
            </div>
          </td>
        </tr>
      </table>

      <div class="report-main-title">តារាងស្ថិតិសមាសភាពគណៈកម្មការការិយាល័យបោះឆ្នោត (គ.ក.ប) ដែលបានជាប់</div>
      <div class="report-sub-title">កម្រិតស្ថិតិ ៖ ${levelLabels[d.level] || d.level} | សរុប ៖ ${toKhmerNum(d.grandTotal)} នាក់ (ស្រី ${toKhmerNum(d.grandFemale)} នាក់)</div>

      ${printContent}

      <div class="footer-sig-block">
        <div style="text-align: center; width: 260px; font-family: 'Khmer OS Siemreap', 'Siemreap', sans-serif; font-size: 10.5pt;">
          <div>ថ្ងៃ...........................ខែ..................ឆ្នាំ...............</div>
          <div style="margin-top: 4px; font-weight: bold; font-family: 'Khmer OS Muol Light', 'Khmer OS Muol', serif;">ប្រធាន គ.ខ.ប</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      <\/script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

