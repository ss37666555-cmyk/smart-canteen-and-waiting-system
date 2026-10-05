/**
 * SmartQueue Canteen - Client Application Logic & Error Boundaries
 *
 * Responsibilities:
 * - Tab navigation and view transitions
 * - Real-time state synchronization with backend API
 * - Local token persistence (localStorage) for seamless page reloads
 * - Dynamic waiting-time and progress bar computations
 * - Resilient API client with HTTP status validation and graceful error feedback
 */

const API_BASE = ''; // Same origin relative API base

// Local application state persisted across browser sessions
let currentUserToken = localStorage.getItem('smartqueue_user_token') || null;
let cachedQueue = [];
let cachedNowServing = 'A119';

// Safe DOM element references with fail-safe fallbacks
const elements = {
  // Navigation
  navButtons: document.querySelectorAll('.nav-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  actionButtons: document.querySelectorAll('.action-nav-btn'),

  // Student Dashboard
  dashCrowd: document.getElementById('dashCrowd'),
  dashNowServing: document.getElementById('dashNowServing'),
  dashCounters: document.getElementById('dashCounters'),
  dashEstimatedWait: document.getElementById('dashEstimatedWait'),
  crowdBadge: document.getElementById('crowdBadge'),
  currentTime: document.getElementById('currentTime'),
  progressNowServing: document.getElementById('progressNowServing'),
  progressWaitingCount: document.getElementById('progressWaitingCount'),
  progressBarFill: document.getElementById('progressBarFill'),
  lblNowServing: document.getElementById('lblNowServing'),

  // AI Prediction Card
  aiPredMessage: document.getElementById('aiPredMessage'),
  formulaQueue: document.getElementById('formulaQueue'),
  formulaAvg: document.getElementById('formulaAvg'),
  formulaCounters: document.getElementById('formulaCounters'),
  formulaResult: document.getElementById('formulaResult'),

  // Get Token Section
  btnGenerateToken: document.getElementById('btnGenerateToken'),
  tokenDisplayBox: document.getElementById('tokenDisplayBox'),
  tokenTicketNumber: document.getElementById('tokenTicketNumber'),
  tokenTicketStatus: document.getElementById('tokenTicketStatus'),
  tokenVal: document.getElementById('tokenVal'),
  tokenPosition: document.getElementById('tokenPosition'),
  tokenAhead: document.getElementById('tokenAhead'),
  tokenWait: document.getElementById('tokenWait'),
  tokenPillStatus: document.getElementById('tokenPillStatus'),

  // My Queue Section
  myQueueContent: document.getElementById('myQueueContent'),
  btnRefreshMyQueue: document.getElementById('btnRefreshMyQueue'),

  // Menu Catalog
  menuGrid: document.getElementById('menuGrid'),

  // Admin Console
  adminWaiting: document.getElementById('adminWaiting'),
  adminNowServing: document.getElementById('adminNowServing'),
  adminCompleted: document.getElementById('adminCompleted'),
  adminCounters: document.getElementById('adminCounters'),
  queueTotalBadge: document.getElementById('queueTotalBadge'),
  queueTokensList: document.getElementById('queueTokensList'),
  btnCallNext: document.getElementById('btnCallNext'),
  btnCompleteToken: document.getElementById('btnCompleteToken'),
  btnIncCounter: document.getElementById('btnIncCounter'),
  btnDecCounter: document.getElementById('btnDecCounter'),
  btnResetDemo: document.getElementById('btnResetDemo'),

  // Toast Feedback Component
  toast: document.getElementById('toast')
};

// ============================================================================
// RESILIENT API CLIENT (FRONTEND ERROR BOUNDARY)
// ============================================================================
/**
 * Wraps window.fetch with:
 * 1. HTTP response status checking (treats 4xx/5xx as catchable errors)
 * 2. Safe JSON body deserialization
 * 3. Network timeout / connectivity failure interceptor
 *
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<{ ok: boolean, data: any, error?: string }>}
 */
async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    let data = null;
    try {
      data = await res.json();
    } catch (parseErr) {
      // Non-JSON response
      return {
        ok: false,
        data: null,
        error: `Server returned non-JSON response (${res.status} ${res.statusText}).`
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        data,
        error: data.error || `HTTP error ${res.status}: ${res.statusText}`
      };
    }

    return { ok: true, data };
  } catch (netErr) {
    console.error(`[API Network Error] ${url}:`, netErr);
    return {
      ok: false,
      data: null,
      error: 'Unable to connect to the canteen server. Please check your connection.'
    };
  }
}

/**
 * Toast Notification Helper
 * Provides visual feedback for actions and errors.
 *
 * @param {string} message - Feedback text to display
 * @param {string} [type='info'] - 'info' | 'error' | 'success'
 */
function showToast(message, type = 'info') {
  if (!elements.toast) return;
  
  elements.toast.textContent = message;
  elements.toast.className = 'toast show';
  
  if (type === 'error') {
    elements.toast.style.background = '#dc2626'; // Red
    elements.toast.style.color = '#ffffff';
  } else if (type === 'success') {
    elements.toast.style.background = '#16a34a'; // Green
    elements.toast.style.color = '#ffffff';
  } else {
    elements.toast.style.background = '#1e293b'; // Slate dark
    elements.toast.style.color = '#ffffff';
  }

  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3400);
}

// ============================================================================
// TAB NAVIGATION CONTROLLER
// ============================================================================
/**
 * Switches the active tab view and triggers lazy data fetches for the target tab.
 *
 * @param {string} tabId - 'dashboard' | 'token' | 'myqueue' | 'menu' | 'admin'
 */
function switchTab(tabId) {
  elements.navButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  elements.tabContents.forEach(tab => {
    tab.classList.toggle('active', tab.id === `tab-${tabId}`);
  });

  // Lazy refresh data depending on the newly activated view
  if (tabId === 'dashboard') {
    fetchDashboardData();
    fetchPredictionData();
  } else if (tabId === 'myqueue') {
    renderMyQueueView();
  } else if (tabId === 'admin') {
    fetchAdminData();
  } else if (tabId === 'menu') {
    fetchMenuData();
  }
}

// Bind navigation button listeners
elements.navButtons.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Bind quick-action buttons from the dashboard
elements.actionButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    if (target === 'token' && !currentUserToken) {
      generateToken();
    }
    switchTab(target);
  });
});

// ============================================================================
// 1. STUDENT DASHBOARD CONTROLLER
// ============================================================================
/**
 * Fetches current canteen throughput telemetry and updates dashboard metric cards.
 */
async function fetchDashboardData() {
  const result = await safeFetch(`${API_BASE}/api/dashboard`);

  if (!result.ok) {
    console.warn('[Dashboard Fetch Warning]:', result.error);
    return;
  }

  const data = result.data;
  if (!data || !data.success) return;

  if (elements.dashCrowd) {
    elements.dashCrowd.innerHTML = `${data.currentCrowd} <span class="metric-unit">Students</span>`;
  }
  if (elements.dashNowServing) {
    elements.dashNowServing.textContent = data.nowServing || '---';
  }
  if (elements.dashCounters) {
    elements.dashCounters.innerHTML = `${data.activeCounters} <span class="metric-unit">Counters</span>`;
  }
  if (elements.dashEstimatedWait) {
    elements.dashEstimatedWait.innerHTML = `${data.estimatedWait} <span class="metric-unit">Minutes</span>`;
  }

  // Crowd density indicator pill
  if (elements.crowdBadge) {
    elements.crowdBadge.textContent = `⚡ ${data.crowdStatus} • ${data.currentCrowd} in Canteen`;
  }

  // Synchronize progress bar values
  cachedNowServing = data.nowServing;
  if (elements.progressNowServing) elements.progressNowServing.textContent = data.nowServing;
  if (elements.lblNowServing) elements.lblNowServing.textContent = data.nowServing;
  if (elements.progressWaitingCount) elements.progressWaitingCount.textContent = data.queueLength;

  // Throughput completion progress percentage
  const totalVolume = data.completedToday + data.queueLength;
  const progressPercent = totalVolume > 0
    ? Math.min(100, Math.max(15, Math.round((data.completedToday / totalVolume) * 100)))
    : 50;
  if (elements.progressBarFill) elements.progressBarFill.style.width = `${progressPercent}%`;

  // Update live clock
  if (elements.currentTime) {
    const d = new Date();
    elements.currentTime.textContent = `Live Sync: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }
}

// ============================================================================
// 2. AI WAITING TIME PREDICTION CONTROLLER
// ============================================================================
/**
 * Fetches dynamic waiting-time formula variables and renders real-time calculation.
 */
async function fetchPredictionData() {
  const result = await safeFetch(`${API_BASE}/api/queue/prediction`);

  if (!result.ok) {
    if (elements.aiPredMessage) {
      elements.aiPredMessage.textContent = 'AI Prediction: Operational Wait Unavailable';
    }
    return;
  }

  const data = result.data;
  if (data && data.success) {
    if (elements.aiPredMessage) elements.aiPredMessage.textContent = data.message;
    if (elements.formulaQueue) elements.formulaQueue.textContent = data.queueLength;
    if (elements.formulaAvg) elements.formulaAvg.textContent = `${data.averageServiceTime} min`;
    if (elements.formulaCounters) elements.formulaCounters.textContent = data.activeCounters;
    if (elements.formulaResult) elements.formulaResult.textContent = `${data.waitingTime} Minutes`;
  }
}

// ============================================================================
// 3. GET QUEUE TOKEN CONTROLLER
// ============================================================================
/**
 * Requests a new virtual queue token from the backend.
 * Handles duplicate joins and updates local storage.
 */
async function generateToken() {
  const result = await safeFetch(`${API_BASE}/api/queue/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestedBy: 'Demo Student' })
  });

  if (!result.ok) {
    showToast(`⚠️ ${result.error}`, 'error');
    return;
  }

  const data = result.data;
  if (data && data.success) {
    currentUserToken = data.token;
    localStorage.setItem('smartqueue_user_token', data.token);

    updateTokenDisplay(data);
    showToast(`🎟️ Token ${data.token} generated! Estimated wait: ${data.estimatedWait} mins`, 'success');

    // Refresh telemetry in background
    fetchDashboardData();
    fetchPredictionData();
  }
}

/**
 * Updates the visual ticket view with token parameters.
 *
 * @param {{ token: string, position: number, peopleAhead: number, estimatedWait: number, status: string }} data
 */
function updateTokenDisplay(data) {
  if (!elements.tokenDisplayBox) return;

  if (elements.tokenTicketNumber) elements.tokenTicketNumber.textContent = data.token;
  if (elements.tokenVal) elements.tokenVal.textContent = data.token;
  if (elements.tokenPosition) elements.tokenPosition.textContent = data.position;
  if (elements.tokenAhead) elements.tokenAhead.textContent = data.peopleAhead;
  if (elements.tokenWait) elements.tokenWait.textContent = `${data.estimatedWait} Minutes`;

  const isServing = data.status === 'NOW SERVING';
  if (elements.tokenPillStatus) {
    elements.tokenPillStatus.textContent = data.status;
    elements.tokenPillStatus.className = isServing ? 'status-pill status-serving' : 'status-pill status-waiting';
  }
  if (elements.tokenTicketStatus) {
    elements.tokenTicketStatus.textContent = `STATUS: ${data.status}`;
  }

  elements.tokenDisplayBox.style.display = 'block';
}

if (elements.btnGenerateToken) {
  elements.btnGenerateToken.addEventListener('click', generateToken);
}

// ============================================================================
// 4. MY QUEUE TAB CONTROLLER
// ============================================================================
/**
 * Renders the personal queue status ticket for the active user token.
 */
async function renderMyQueueView() {
  if (!elements.myQueueContent) return;

  if (!currentUserToken) {
    elements.myQueueContent.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem;">
        <div style="font-size: 3.5rem; margin-bottom: 1rem;">🎫</div>
        <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem;">No Active Token Found</h3>
        <p style="color: var(--text-muted); margin-bottom: 1.5rem;">You haven't requested a queue token yet.</p>
        <button class="btn btn-primary" onclick="generateToken(); switchTab('token');">
          <span>⚡</span> Get Token Now (A127)
        </button>
      </div>
    `;
    return;
  }

  const result = await safeFetch(`${API_BASE}/api/queue`);

  if (!result.ok) {
    elements.myQueueContent.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #dc2626;">
        <p>⚠️ Unable to fetch live queue status. Please try refreshing.</p>
      </div>
    `;
    return;
  }

  const data = result.data;
  if (data && data.success) {
    cachedQueue = data.queue || [];
    const queueIndex = cachedQueue.indexOf(currentUserToken);
    let position, peopleAhead, waitTime, status;

    if (data.nowServing === currentUserToken) {
      position = 0;
      peopleAhead = 0;
      waitTime = 0;
      status = 'NOW SERVING';
    } else if (queueIndex !== -1) {
      position = queueIndex + 1;
      peopleAhead = queueIndex;
      waitTime = Math.round((position * (data.averageServiceTime || 2)) / (data.activeCounters || 3));
      status = 'WAITING';
    } else {
      position = '-';
      peopleAhead = 0;
      waitTime = 0;
      status = 'COMPLETED / READY';
    }

    elements.myQueueContent.innerHTML = `
      <div class="token-display-box" style="margin-top: 1rem;">
        <div class="ticket-header">
          <div class="ticket-canteen-name">CAMPUS CANTEEN EXPRESS</div>
          <div class="ticket-badge">${status}</div>
        </div>
        <div class="ticket-body">
          <div class="ticket-token-title">YOUR RESERVED TOKEN</div>
          <div class="ticket-token-number">${currentUserToken}</div>
          <p class="ticket-note">
            ${status === 'NOW SERVING'
              ? '🔔 PLEASE PROCEED TO COUNTER NOW!'
              : 'Keep this screen ready when approaching the counter'}
          </p>
          <div class="ticket-grid">
            <div class="ticket-stat">
              <span class="ticket-stat-lbl">Token</span>
              <strong class="ticket-stat-val">${currentUserToken}</strong>
            </div>
            <div class="ticket-stat">
              <span class="ticket-stat-lbl">Position</span>
              <strong class="ticket-stat-val">${position}</strong>
            </div>
            <div class="ticket-stat">
              <span class="ticket-stat-lbl">People Ahead</span>
              <strong class="ticket-stat-val">${peopleAhead}</strong>
            </div>
            <div class="ticket-stat">
              <span class="ticket-stat-lbl">Estimated Wait</span>
              <strong class="ticket-stat-val highlight">${waitTime} Minutes</strong>
            </div>
          </div>
          <div class="ticket-status-row">
            <span>Status:</span>
            <span class="status-pill ${status === 'NOW SERVING' ? 'status-serving' : 'status-waiting'}">${status}</span>
          </div>
        </div>
        <div class="ticket-footer">
          <span>Now Serving at Counter: <strong>${data.nowServing}</strong></span>
          <button class="btn btn-outline" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;" onclick="generateToken()">New Token</button>
        </div>
      </div>
    `;
  }
}

if (elements.btnRefreshMyQueue) {
  elements.btnRefreshMyQueue.addEventListener('click', () => {
    renderMyQueueView();
    showToast('Queue status refreshed!');
  });
}

// ============================================================================
// 5. CANTEEN MENU CONTROLLER
// ============================================================================
/**
 * Fetches canteen menu catalog and renders clean food cards.
 */
async function fetchMenuData() {
  const result = await safeFetch(`${API_BASE}/api/menu`);

  if (!result.ok) {
    if (elements.menuGrid) {
      elements.menuGrid.innerHTML = '<p style="color: #dc2626; padding: 1rem;">Failed to load canteen menu.</p>';
    }
    return;
  }

  const data = result.data;
  if (data && data.success && elements.menuGrid) {
    elements.menuGrid.innerHTML = data.menu.map(item => `
      <div class="menu-item-card">
        <div class="menu-item-icon">${item.icon}</div>
        <div class="menu-item-details">
          <div class="menu-item-header">
            <span class="menu-item-name">${item.name}</span>
            <span class="menu-item-price">₹${item.price}</span>
          </div>
          <span class="menu-item-category">${item.category} &bull; ${item.badge}</span>
        </div>
      </div>
    `).join('');
  }
}

// ============================================================================
// 6. ADMIN PANEL & CONTROLS CONTROLLER
// ============================================================================
/**
 * Fetches admin operational telemetry and renders the live queue stream.
 */
async function fetchAdminData() {
  const result = await safeFetch(`${API_BASE}/api/queue`);

  if (!result.ok) {
    console.warn('[Admin Fetch Error]:', result.error);
    return;
  }

  const data = result.data;
  if (!data || !data.success) return;

  cachedQueue = data.queue || [];
  if (elements.adminWaiting) elements.adminWaiting.textContent = data.queueLength;
  if (elements.adminNowServing) elements.adminNowServing.textContent = data.nowServing;
  if (elements.adminCompleted) elements.adminCompleted.textContent = data.completedToday;
  if (elements.adminCounters) elements.adminCounters.textContent = data.activeCounters;

  if (elements.queueTotalBadge) {
    elements.queueTotalBadge.textContent = `${data.queueLength} In Queue`;
  }

  // Render visual chips for waiting queue stream
  if (elements.queueTokensList) {
    if (cachedQueue.length === 0) {
      elements.queueTokensList.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem;">Queue is currently empty.</span>';
    } else {
      elements.queueTokensList.innerHTML = cachedQueue.map((t, idx) => {
        const isUser = (t === currentUserToken);
        return `
          <div class="token-chip ${isUser ? 'user-chip' : ''}">
            <span style="font-size: 0.75rem; color: var(--text-muted);">#${idx + 1}</span>
            <span>${t}</span>
            ${isUser ? '<span style="font-size: 0.7rem; font-weight: 800; color: var(--primary);">(YOU)</span>' : ''}
          </div>
        `;
      }).join('');
    }
  }
}

/**
 * Admin action: Call next student in queue.
 * Displays error feedback if the queue is empty.
 */
async function adminCallNext() {
  const result = await safeFetch(`${API_BASE}/api/queue/next`, { method: 'POST' });

  if (!result.ok) {
    showToast(`⚠️ ${result.error}`, 'error');
    return;
  }

  const data = result.data;
  if (data && data.success) {
    showToast(`📢 Called next token: ${data.nowServing}`, 'success');
    fetchAdminData();
    fetchDashboardData();
    fetchPredictionData();
    if (currentUserToken) renderMyQueueView();
  }
}

/**
 * Admin action: Complete the token currently at the pickup window.
 */
async function adminCompleteToken() {
  const result = await safeFetch(`${API_BASE}/api/queue/complete`, { method: 'POST' });

  if (!result.ok) {
    showToast(`⚠️ ${result.error}`, 'error');
    return;
  }

  const data = result.data;
  if (data && data.success) {
    showToast(`✅ Order fulfilled! Now serving: ${data.nowServing}`, 'success');
    fetchAdminData();
    fetchDashboardData();
    fetchPredictionData();
    if (currentUserToken) renderMyQueueView();
  }
}

/**
 * Admin action: Adjust operational counters (+ / -).
 * Enforces boundary of 1 to 10 counters.
 *
 * @param {number} delta - +1 or -1
 */
async function updateCounters(delta) {
  const current = parseInt(elements.adminCounters ? elements.adminCounters.textContent : '3', 10) || 3;
  const newCounters = current + delta;

  if (newCounters < 1 || newCounters > 10) {
    showToast('⚠️ Operational counters must remain between 1 and 10.', 'error');
    return;
  }

  const result = await safeFetch(`${API_BASE}/api/counters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ counters: newCounters })
  });

  if (!result.ok) {
    showToast(`⚠️ ${result.error}`, 'error');
    return;
  }

  const data = result.data;
  if (data && data.success) {
    showToast(`Active counters adjusted to ${data.activeCounters}`, 'info');
    fetchAdminData();
    fetchDashboardData();
    fetchPredictionData();
  }
}

/**
 * Admin action: Reset demo prototype data to baseline specification.
 */
async function resetDemoData() {
  const result = await safeFetch(`${API_BASE}/api/reset`, { method: 'POST' });

  if (!result.ok) {
    showToast(`⚠️ ${result.error}`, 'error');
    return;
  }

  const data = result.data;
  if (data && data.success) {
    showToast('Demo data reset to default specifications!', 'success');
    fetchAdminData();
    fetchDashboardData();
    fetchPredictionData();
    renderMyQueueView();
  }
}

// Bind Admin control listeners
if (elements.btnCallNext) elements.btnCallNext.addEventListener('click', adminCallNext);
if (elements.btnCompleteToken) elements.btnCompleteToken.addEventListener('click', adminCompleteToken);
if (elements.btnIncCounter) elements.btnIncCounter.addEventListener('click', () => updateCounters(1));
if (elements.btnDecCounter) elements.btnDecCounter.addEventListener('click', () => updateCounters(-1));
if (elements.btnResetDemo) elements.btnResetDemo.addEventListener('click', resetDemoData);

// ============================================================================
// APPLICATION INITIALIZATION & POLLING
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
  fetchDashboardData();
  fetchPredictionData();
  fetchMenuData();

  // Baseline demo ticket preview
  // Token: A127, Position: 8, People Ahead: 7, Estimated Wait: 8 Minutes, Status: WAITING
  updateTokenDisplay({
    token: 'A127',
    position: 8,
    peopleAhead: 7,
    estimatedWait: 8,
    status: 'WAITING'
  });

  // Background polling for live sync feel
  setInterval(() => {
    fetchDashboardData();
    const adminTab = document.getElementById('tab-admin');
    if (adminTab && adminTab.classList.contains('active')) {
      fetchAdminData();
    }
  }, 4000);
});
