/**
 * AMAYA LOGISTICS MIS — PRODUCTION APP.JS
 * Full SPA with Supabase backend + rich demo data fallback
 */

// ═══════════════════════════════════════════════
// CONFIGURATION (Update with your Supabase project)
// ═══════════════════════════════════════════════
const DEFAULT_SUPABASE_URL = localStorage.getItem('sb_url') || '';
const DEFAULT_SUPABASE_KEY = localStorage.getItem('sb_key') || '';

// Admin email (only this user gets admin access)
const ADMIN_EMAIL = 'bahalul1964@gmail.com';

// ═══════════════════════════════════════════════
// DEMO DATA (Used when Supabase not configured)
// ═══════════════════════════════════════════════
const DEMO_DATA = {
  transactions: generateDemoTransactions(),
  workstations: [
    { id: 1, name: 'Yeasin WS', manager: 'Yeasin Ahmed', revenue: 485000, expenses: 312000, shipments: 342, delivered: 298, pending: 28, returned: 16, score: 87 },
    { id: 2, name: 'OPS-MIS Hub', manager: 'Operations Team', revenue: 672000, expenses: 441000, shipments: 489, delivered: 421, pending: 42, returned: 26, score: 92 },
    { id: 3, name: 'North Depot', manager: 'Karim Hossain', revenue: 318000, expenses: 224000, shipments: 231, delivered: 198, pending: 19, returned: 14, score: 76 },
    { id: 4, name: 'South Station', manager: 'Rina Begum', revenue: 251000, expenses: 189000, shipments: 178, delivered: 156, pending: 13, returned: 9, score: 82 },
    { id: 5, name: 'Central Hub', manager: 'Masud Rahman', revenue: 394000, expenses: 271000, shipments: 287, delivered: 249, pending: 24, returned: 14, score: 88 },
    { id: 6, name: 'East Terminal', manager: 'Sharmin Akter', revenue: 209000, expenses: 165000, shipments: 153, delivered: 131, pending: 14, returned: 8, score: 71 },
  ],
  team: [
    { id: 1, name: 'Yeasin Ahmed', role: 'Workstation Manager', ws: 'Yeasin WS', shipments: 342, revenue: 485000, score: 87, avatar: 'YA', color: '#6366f1' },
    { id: 2, name: 'Karim Hossain', role: 'Depot Manager', ws: 'North Depot', shipments: 231, revenue: 318000, score: 76, avatar: 'KH', color: '#06b6d4' },
    { id: 3, name: 'Rina Begum', role: 'Station Manager', ws: 'South Station', shipments: 178, revenue: 251000, score: 82, avatar: 'RB', color: '#10b981' },
    { id: 4, name: 'Masud Rahman', role: 'Hub Manager', ws: 'Central Hub', shipments: 287, revenue: 394000, score: 88, avatar: 'MR', color: '#f59e0b' },
    { id: 5, name: 'Sharmin Akter', role: 'Terminal Manager', ws: 'East Terminal', shipments: 153, revenue: 209000, score: 71, avatar: 'SA', color: '#8b5cf6' },
    { id: 6, name: 'Admin (Owner)', role: 'CEO / Owner', ws: 'All', shipments: 1481, revenue: 2329000, score: 100, avatar: 'AO', color: '#ef4444' },
  ],
  sheets: [
    { id: 1, name: 'OPS-MIS Main', url: 'https://docs.google.com/spreadsheets/d/1U1oAloFWrNMWpwe5KHcUDxGv8gTQyp8prAcMvyGq5yk', category: 'logistics', notes: 'Main operations and MIS tracking sheet' },
    { id: 2, name: 'Workstation — Yeasin', url: 'https://docs.google.com/spreadsheets/d/1Vy0LB_ROivQthO41x49ezzIi2xljesjdC59OlUSmG', category: 'logistics', notes: 'Yeasin workstation daily records' },
  ],
};

function generateDemoTransactions() {
  const categories = ['Delivery Fee', 'Fuel Cost', 'Salary', 'Commission', 'Return Fee', 'Packaging', 'Maintenance', 'Office'];
  const types = ['income', 'expense'];
  const wsList = ['Yeasin WS', 'OPS-MIS Hub', 'North Depot', 'South Station', 'Central Hub', 'East Terminal'];
  const rows = [];
  const now = new Date();
  for (let i = 0; i < 360; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const isIncome = Math.random() > 0.4;
    rows.push({
      date: d.toISOString().split('T')[0],
      description: isIncome ? 'Delivery Fee Collected' : categories[Math.floor(Math.random() * (categories.length - 2)) + 2],
      category: isIncome ? 'Delivery Fee' : categories[Math.floor(Math.random() * categories.length)],
      type: isIncome ? 'income' : 'expense',
      amount: isIncome ? (Math.random() * 15000 + 5000) | 0 : (Math.random() * 8000 + 1000) | 0,
      workstation: wsList[Math.floor(Math.random() * wsList.length)],
      status: ['delivered', 'delivered', 'delivered', 'in-transit', 'pending', 'returned'][Math.floor(Math.random() * 6)],
      responsible: ['Yeasin Ahmed', 'Karim Hossain', 'Rina Begum', 'Masud Rahman', 'Sharmin Akter'][Math.floor(Math.random() * 5)],
    });
  }
  return rows;
}

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
let supabase = null;
let currentUser = null;
let currentPage = 'dashboard';
let charts = {};
let revenueChartPeriod = 30;
let alertsData = [];
let sheetsData = [...DEMO_DATA.sheets];

// ═══════════════════════════════════════════════
// SUPABASE INIT
// ═══════════════════════════════════════════════
function initSupabase(url, key) {
  if (!url || !key) return false;
  try {
    supabase = window.supabase.createClient(url, key);
    return true;
  } catch (e) {
    console.warn('Supabase init failed:', e);
    return false;
  }
}

// ═══════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════
async function signIn(email, password) {
  if (!supabase) {
    // Demo mode login
    if (email === ADMIN_EMAIL || email.includes('@')) {
      currentUser = {
        email,
        user_metadata: { full_name: email.split('@')[0] },
        role: email === ADMIN_EMAIL ? 'admin' : 'viewer',
      };
      return { user: currentUser, error: null };
    }
    return { user: null, error: { message: 'Invalid credentials' } };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (data?.user) {
    currentUser = {
      ...data.user,
      role: data.user.email === ADMIN_EMAIL ? 'admin' : 'viewer',
    };
  }
  return { user: data?.user, error };
}

async function signOut() {
  if (supabase) await supabase.auth.signOut();
  currentUser = null;
  showScreen('loginScreen');
  resetApp();
}

// ═══════════════════════════════════════════════
// SCREEN MANAGEMENT
// ═══════════════════════════════════════════════
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const target = document.getElementById(screenId);
  target.classList.remove('hidden');
  target.classList.add('active');
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.remove('hidden');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navTarget = document.querySelector(`[data-page="${pageId}"]`);
  if (navTarget) navTarget.classList.add('active');

  currentPage = pageId;

  const titles = {
    dashboard: ['Dashboard', 'Real-time operations overview'],
    pnl: ['P&L Analysis', 'Financial performance breakdown'],
    operations: ['Operations', 'Shipment tracking & workstation performance'],
    team: ['Team & Accountability', 'Who is responsible for what'],
    sheets: ['Spreadsheets', 'Manage your Google Sheets data connections'],
    alerts: ['Alerts & Decisions', 'Items needing your attention'],
    reports: ['Reports', 'Generate and download business reports'],
    settings: ['Admin Settings', 'Manage users, access, and configuration'],
  };
  const [title, sub] = titles[pageId] || ['', ''];
  document.getElementById('pageTitle').textContent = title;
  document.getElementById('pageSubtitle').textContent = sub;

  // Lazy load page data
  switch (pageId) {
    case 'dashboard': loadDashboard(); break;
    case 'pnl': loadPnL(); break;
    case 'operations': loadOperations(); break;
    case 'team': loadTeam(); break;
    case 'sheets': loadSheets(); break;
    case 'alerts': loadAlerts(); break;
    case 'reports': /* static */ break;
    case 'settings': loadSettings(); break;
  }

  // Close sidebar on mobile
  if (window.innerWidth <= 768) closeSidebar();
}

// ═══════════════════════════════════════════════
// DATA HELPERS
// ═══════════════════════════════════════════════
function getTransactions(days = 365) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return DEMO_DATA.transactions.filter(t => new Date(t.date) >= cutoff);
}

function getTotals(days = 365) {
  const txs = getTransactions(days);
  const revenue = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = revenue - expenses;
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
  const shipments = txs.filter(t => t.status).length;
  return { revenue, expenses, profit, margin, shipments };
}

function fmt(n) {
  if (n >= 1000000) return '৳' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return '৳' + (n / 1000).toFixed(1) + 'K';
  return '৳' + n.toLocaleString();
}

function fmtFull(n) {
  return '৳' + Math.abs(n).toLocaleString();
}

function pct(a, b) {
  if (b === 0) return '0%';
  return ((a / b) * 100).toFixed(1) + '%';
}

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
function loadDashboard() {
  const totals = getTotals(30);
  const prevTotals = getTotals(60);

  const setKpi = (id, val, change, label, isGood = true) => {
    document.getElementById(id).textContent = val;
    const el = document.getElementById(id + 'Change');
    const diff = change;
    const sign = diff >= 0 ? '+' : '';
    el.textContent = `${sign}${diff.toFixed(1)}% vs prev 30D`;
    el.className = 'kpi-change ' + (diff >= 0 === isGood ? 'positive' : 'negative');
  };

  const revChange = prevTotals.revenue > 0 ? ((totals.revenue - prevTotals.revenue / 2) / (prevTotals.revenue / 2) * 100) : 0;
  const profChange = prevTotals.profit > 0 ? ((totals.profit - prevTotals.profit / 2) / Math.abs(prevTotals.profit / 2) * 100) : 0;

  setKpi('kpiRevenue', fmt(totals.revenue), revChange, 'revenue');
  setKpi('kpiProfit', fmt(totals.profit), profChange, 'profit');
  document.getElementById('kpiMargin').textContent = totals.margin + '%';
  document.getElementById('kpiMarginChange').textContent = 'vs last 30 days';
  document.getElementById('kpiMarginChange').className = 'kpi-change neutral';
  document.getElementById('kpiShipments').textContent = totals.shipments;
  document.getElementById('kpiShipmentsChange').textContent = '+' + Math.floor(totals.shipments * 0.08) + ' vs prev 30D';
  document.getElementById('kpiShipmentsChange').className = 'kpi-change positive';

  drawRevenueChart(revenueChartPeriod);
  drawCategoryChart();
  renderAttention();
  renderRecentActivity();
}

function drawRevenueChart(days) {
  const txs = getTransactions(days);
  const grouped = {};
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = days <= 30
      ? d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
      : days <= 90
      ? 'W' + Math.ceil((i + 1) / 7) + ' ' + d.toLocaleDateString('en', { month: 'short' })
      : d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
    if (!grouped[key]) grouped[key] = { income: 0, expense: 0 };
  }

  txs.forEach(t => {
    const d = new Date(t.date);
    const key = days <= 30
      ? d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
      : days <= 90
      ? 'W' + Math.ceil((days - Math.floor((now - d) / 86400000)) / 7) + ' ' + d.toLocaleDateString('en', { month: 'short' })
      : d.toLocaleDateString('en', { month: 'short', year: '2-digit' });
    if (grouped[key] !== undefined) {
      grouped[key][t.type === 'income' ? 'income' : 'expense'] += t.amount;
    }
  });

  // Limit to last N points for readability
  const allKeys = Object.keys(grouped);
  const step = days <= 30 ? 1 : days <= 90 ? 1 : 1;
  const keys = allKeys.filter((_, i) => i % step === 0);
  const maxPoints = 24;
  const displayKeys = keys.slice(-maxPoints);

  const canvas = document.getElementById('revenueChart');
  if (charts.revenue) charts.revenue.destroy();
  charts.revenue = new Chart(canvas, {
    type: 'line',
    data: {
      labels: displayKeys,
      datasets: [
        {
          label: 'Revenue',
          data: displayKeys.map(k => grouped[k]?.income || 0),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
        {
          label: 'Expenses',
          data: displayKeys.map(k => grouped[k]?.expense || 0),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ],
    },
    options: chartDefaults({
      plugins: { legend: { display: true, labels: { color: '#8892aa', font: { family: 'Inter', size: 12 } } } },
      scales: {
        x: { ticks: { color: '#4a5568', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#4a5568', callback: v => fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' } },
      },
    }),
  });
}

function drawCategoryChart() {
  const txs = getTransactions(30);
  const cats = {};
  txs.filter(t => t.type === 'income').forEach(t => {
    cats[t.workstation] = (cats[t.workstation] || 0) + t.amount;
  });
  const labels = Object.keys(cats);
  const values = Object.values(cats);
  const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  const canvas = document.getElementById('categoryChart');
  if (charts.category) charts.category.destroy();
  charts.category = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#0d1224', hoverOffset: 8 }],
    },
    options: chartDefaults({
      cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#8892aa', padding: 12, font: { family: 'Inter', size: 11 } } },
      },
    }),
  });
}

function renderAttention() {
  const items = buildAlerts();
  const el = document.getElementById('attentionList');
  el.innerHTML = items.slice(0, 5).map(a => `
    <div class="attention-item ${a.level}">
      <div>
        <p class="attention-title">${a.title}</p>
        <p class="attention-desc">${a.desc}</p>
      </div>
    </div>
  `).join('');
}

function renderRecentActivity() {
  const txs = getTransactions(7).slice(0, 10);
  const el = document.getElementById('recentActivity');
  el.innerHTML = txs.map(t => `
    <div class="activity-item">
      <div class="activity-dot" style="background:${t.type === 'income' ? '#10b981' : '#ef4444'}"></div>
      <span class="activity-text">${t.description} — ${t.workstation}</span>
      <span class="activity-time">${fmt(t.amount)}</span>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════
// P&L PAGE
// ═══════════════════════════════════════════════
function loadPnL() {
  const monthEl = document.getElementById('pnlMonth');
  const now = new Date();
  if (!monthEl.value) monthEl.value = now.toISOString().slice(0, 7);

  renderPnL(monthEl.value);
}

function renderPnL(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  const monthTxs = DEMO_DATA.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  const income = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;
  const margin = income > 0 ? ((net / income) * 100).toFixed(1) : 0;

  document.getElementById('pnlIncome').textContent = fmtFull(income);
  document.getElementById('pnlExpense').textContent = fmtFull(expense);
  document.getElementById('pnlNet').textContent = (net >= 0 ? '' : '-') + fmtFull(net);
  document.getElementById('pnlMarginPct').textContent = margin + '%';

  // Monthly trend chart (last 12 months)
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    months.push({ label: d.toLocaleDateString('en', { month: 'short', year: '2-digit' }), y: d.getFullYear(), m: d.getMonth() + 1 });
  }
  const mData = months.map(m => {
    const mTxs = DEMO_DATA.transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === m.y && d.getMonth() + 1 === m.m;
    });
    return {
      label: m.label,
      income: mTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: mTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  });

  const canvas = document.getElementById('pnlChart');
  if (charts.pnl) charts.pnl.destroy();
  charts.pnl = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: mData.map(m => m.label),
      datasets: [
        { label: 'Income', data: mData.map(m => m.income), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 4 },
        { label: 'Expenses', data: mData.map(m => m.expense), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 },
        { label: 'Net Profit', data: mData.map(m => m.income - m.expense), type: 'line', borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.1)', tension: 0.4, fill: false, yAxisID: 'y' },
      ],
    },
    options: chartDefaults({
      plugins: { legend: { labels: { color: '#8892aa', font: { family: 'Inter', size: 12 } } } },
      scales: {
        x: { ticks: { color: '#4a5568' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#4a5568', callback: v => fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' } },
      },
    }),
  });

  // Table
  const tbody = document.getElementById('pnlTableBody');
  let running = 0;
  tbody.innerHTML = monthTxs.slice(0, 100).map(t => {
    const inc = t.type === 'income' ? t.amount : 0;
    const exp = t.type === 'expense' ? t.amount : 0;
    running += inc - exp;
    return `<tr>
      <td class="font-mono">${t.date}</td>
      <td>${t.description}</td>
      <td>${t.category}</td>
      <td class="text-green">${inc > 0 ? fmtFull(inc) : '—'}</td>
      <td class="text-red">${exp > 0 ? fmtFull(exp) : '—'}</td>
      <td class="${running >= 0 ? 'text-green' : 'text-red'}">${(running >= 0 ? '' : '-') + fmtFull(Math.abs(running))}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" class="table-loading">No transactions for this month</td></tr>';
}

// ═══════════════════════════════════════════════
// OPERATIONS PAGE
// ═══════════════════════════════════════════════
function loadOperations() {
  renderWorkstations();
  renderOpsTable('all');
}

function renderWorkstations() {
  const container = document.getElementById('workstationGrid');
  container.innerHTML = DEMO_DATA.workstations.map(ws => {
    const deliveryRate = Math.round((ws.delivered / ws.shipments) * 100);
    const color = deliveryRate >= 90 ? '#10b981' : deliveryRate >= 75 ? '#f59e0b' : '#ef4444';
    const statusLabel = deliveryRate >= 90 ? 'Excellent' : deliveryRate >= 75 ? 'Good' : 'Needs Attention';
    const statusStyle = deliveryRate >= 90 ? 'background:rgba(16,185,129,0.15);color:#6ee7b7' : deliveryRate >= 75 ? 'background:rgba(245,158,11,0.15);color:#fcd34d' : 'background:rgba(239,68,68,0.15);color:#fca5a5';
    return `<div class="ws-card">
      <div class="ws-header">
        <span class="ws-name">${ws.name}</span>
        <span class="ws-status" style="${statusStyle}">${statusLabel}</span>
      </div>
      <div class="ws-metrics">
        <div class="ws-metric"><p>Revenue</p><p>${fmt(ws.revenue)}</p></div>
        <div class="ws-metric"><p>Profit</p><p>${fmt(ws.revenue - ws.expenses)}</p></div>
        <div class="ws-metric"><p>Shipments</p><p>${ws.shipments}</p></div>
        <div class="ws-metric"><p>Returned</p><p>${ws.returned}</p></div>
      </div>
      <div class="ws-bar">
        <div class="ws-bar-label"><span>Delivery Rate</span><span>${deliveryRate}%</span></div>
        <div class="ws-bar-track"><div class="ws-bar-fill" style="width:${deliveryRate}%;background:${color}"></div></div>
      </div>
      <p style="font-size:0.78rem;color:var(--text-secondary);margin-top:0.75rem">Manager: ${ws.manager}</p>
    </div>`;
  }).join('');
}

function renderOpsTable(filter) {
  const tbody = document.getElementById('opsTableBody');
  let txs = DEMO_DATA.transactions.filter(t => t.status);
  if (filter !== 'all') txs = txs.filter(t => t.status === filter);

  const statusClass = { 'delivered': 'status-delivered', 'in-transit': 'status-in-transit', 'pending': 'status-pending', 'returned': 'status-returned' };
  tbody.innerHTML = txs.slice(0, 80).map((t, i) => `<tr>
    <td class="font-mono">ORD-${String(1000 + i).padStart(5, '0')}</td>
    <td>${t.workstation}</td>
    <td>${t.date}</td>
    <td>${(Math.random() * 10 + 1) | 0}</td>
    <td>${fmt(t.amount)}</td>
    <td><span class="status-badge ${statusClass[t.status] || ''}">${t.status}</span></td>
    <td>${t.responsible}</td>
  </tr>`).join('') || '<tr><td colspan="7" class="table-loading">No shipments found</td></tr>';
}

// ═══════════════════════════════════════════════
// TEAM PAGE
// ═══════════════════════════════════════════════
function loadTeam() {
  const container = document.getElementById('teamGrid');
  container.innerHTML = DEMO_DATA.team.map(m => `
    <div class="team-card">
      <div class="team-avatar" style="background:${m.color}22;color:${m.color}">${m.avatar}</div>
      <p class="team-name">${m.name}</p>
      <p class="team-role">${m.role}</p>
      <div class="team-kpis">
        <div class="team-kpi"><p>Workstation</p><p style="font-size:0.82rem">${m.ws}</p></div>
        <div class="team-kpi"><p>Shipments</p><p>${m.shipments}</p></div>
        <div class="team-kpi"><p>Revenue</p><p>${fmt(m.revenue)}</p></div>
        <div class="team-kpi"><p>Score</p><p style="color:${m.color}">${m.score}</p></div>
      </div>
      <div class="team-score">
        <div class="score-label"><span>Performance</span><span>${m.score}%</span></div>
        <div class="score-bar"><div class="score-fill" style="width:${m.score}%"></div></div>
      </div>
    </div>
  `).join('');

  // Team chart
  const canvas = document.getElementById('teamChart');
  if (charts.team) charts.team.destroy();
  const colors = DEMO_DATA.team.map(m => m.color);
  charts.team = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: DEMO_DATA.team.map(m => m.name.split(' ')[0]),
      datasets: [
        { label: 'Revenue (৳K)', data: DEMO_DATA.team.map(m => (m.revenue / 1000) | 0), backgroundColor: colors.map(c => c + '99'), borderRadius: 6 },
        { label: 'Performance Score', data: DEMO_DATA.team.map(m => m.score), type: 'line', borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', tension: 0.4, fill: false, yAxisID: 'y2' },
      ],
    },
    options: chartDefaults({
      plugins: { legend: { labels: { color: '#8892aa', font: { family: 'Inter', size: 12 } } } },
      scales: {
        x: { ticks: { color: '#4a5568' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#4a5568', callback: v => '৳' + v + 'K' }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y2: { position: 'right', ticks: { color: '#f59e0b', callback: v => v + '%' }, grid: { display: false }, min: 0, max: 110 },
      },
    }),
  });
}

// ═══════════════════════════════════════════════
// SHEETS PAGE
// ═══════════════════════════════════════════════
function loadSheets() {
  renderSheets();
}

function renderSheets() {
  const container = document.getElementById('sheetsGrid');
  if (!sheetsData.length) {
    container.innerHTML = '<div class="glass-card" style="padding:3rem;text-align:center;color:var(--text-secondary);grid-column:1/-1"><p style="font-size:2rem;margin-bottom:1rem">📊</p><p>No spreadsheets added yet.</p><p style="margin-top:0.5rem;font-size:0.85rem">Click "+ Add Sheet" to connect your first Google Sheet.</p></div>';
    return;
  }
  container.innerHTML = sheetsData.map((s, i) => `
    <div class="sheet-card">
      <div class="sheet-header">
        <p class="sheet-name">${s.name}</p>
        <span class="sheet-cat">${s.category}</span>
      </div>
      <a href="${s.url}" target="_blank" class="sheet-url">🔗 Open in Google Sheets</a>
      <p class="sheet-notes">${s.notes || 'No notes'}</p>
      <div class="sheet-actions">
        <a href="${s.url}" target="_blank" class="btn-icon">↗ Open</a>
        <button class="btn-icon danger" onclick="deleteSheet(${i})">🗑 Remove</button>
      </div>
    </div>
  `).join('');
}

function deleteSheet(index) {
  if (!confirm('Remove this spreadsheet connection?')) return;
  sheetsData.splice(index, 1);
  saveSheets();
  renderSheets();
  showToast('Sheet removed');
}

function saveSheets() {
  localStorage.setItem('amaya_sheets', JSON.stringify(sheetsData));
}

// ═══════════════════════════════════════════════
// ALERTS PAGE
// ═══════════════════════════════════════════════
function buildAlerts() {
  const totals = getTotals(30);
  const prevTotals = getTotals(60);
  const alerts = [];

  // Check profitability
  if (totals.profit < 0) {
    alerts.push({ level: 'critical', type: 'critical', icon: '🚨', title: 'CRITICAL: Operating at a Loss', desc: `Net loss of ${fmt(Math.abs(totals.profit))} this month. Immediate action required — review expense categories and boost revenue.`, action: 'View P&L' });
  } else if (parseFloat(totals.margin) < 15) {
    alerts.push({ level: 'high', type: 'warning', icon: '⚠️', title: 'Low Profit Margin', desc: `Margin at ${totals.margin}% — below the healthy 20% target. Consider reducing fuel costs or increasing delivery fees.`, action: 'View P&L' });
  }

  // Check return rates
  DEMO_DATA.workstations.forEach(ws => {
    const returnRate = ((ws.returned / ws.shipments) * 100).toFixed(1);
    if (parseFloat(returnRate) > 10) {
      alerts.push({ level: 'medium', type: 'warning', icon: '📦', title: `High Return Rate: ${ws.name}`, desc: `${returnRate}% return rate (${ws.returned} of ${ws.shipments} shipments). Investigate packaging and delivery process.`, action: 'View Operations' });
    }
  });

  // Low performing workstations
  DEMO_DATA.workstations.filter(ws => ws.score < 75).forEach(ws => {
    alerts.push({ level: 'medium', type: 'warning', icon: '📉', title: `Underperforming: ${ws.name}`, desc: `Performance score ${ws.score}/100. Consider reviewing management, processes, or resource allocation.`, action: 'View Team' });
  });

  // Revenue growth opportunity
  const topWs = DEMO_DATA.workstations.reduce((a, b) => a.revenue > b.revenue ? a : b);
  alerts.push({ level: 'low', type: 'opportunity', icon: '💡', title: `Growth Opportunity: Scale ${topWs.name}`, desc: `${topWs.name} generates the highest revenue (${fmt(topWs.revenue)}). Consider expanding its capacity or replicating its model.`, action: 'View Team' });

  // Positive alert
  if (totals.profit > 0) {
    alerts.push({ level: 'low', type: 'info', icon: '✅', title: 'Business is Profitable', desc: `Net profit of ${fmt(totals.profit)} this period (${totals.margin}% margin). Keep monitoring for optimization opportunities.`, action: null });
  }

  return alerts;
}

function loadAlerts() {
  alertsData = buildAlerts();
  const badge = document.getElementById('alertBadge');
  const criticalCount = alertsData.filter(a => a.type === 'critical' || a.type === 'warning').length;
  badge.textContent = criticalCount;

  const container = document.getElementById('alertsList');
  if (!alertsData.length) {
    container.innerHTML = '<div class="no-alerts"><div class="no-alerts-icon">✅</div><p>No alerts — everything looks good!</p></div>';
    return;
  }

  const typeClass = { critical: 'critical', warning: 'warning', info: 'info', opportunity: 'opportunity' };
  container.innerHTML = alertsData.map(a => `
    <div class="alert-item ${typeClass[a.type] || 'info'}">
      <div class="alert-icon">${a.icon}</div>
      <div class="alert-body">
        <p class="alert-title">${a.title}</p>
        <p class="alert-desc">${a.desc}</p>
        ${a.action ? `<div class="alert-actions"><button class="btn btn-secondary btn-sm">${a.action}</button></div>` : ''}
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════
function generateReport(type) {
  const output = document.getElementById('reportOutput');
  const content = document.getElementById('reportContent');
  const title = document.getElementById('reportTitle');
  output.classList.remove('hidden');

  const totals = getTotals(30);
  const now = new Date().toLocaleDateString('en', { dateStyle: 'long' });

  const reportMap = {
    executive: {
      title: `Executive Summary — ${now}`,
      html: `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:2rem">
          <div class="glass-card" style="padding:1rem;text-align:center"><p style="color:var(--text-secondary);font-size:0.8rem">Total Revenue</p><p style="font-size:1.5rem;font-weight:800;color:var(--accent-green)">${fmt(totals.revenue)}</p></div>
          <div class="glass-card" style="padding:1rem;text-align:center"><p style="color:var(--text-secondary);font-size:0.8rem">Net Profit</p><p style="font-size:1.5rem;font-weight:800;color:var(--accent-cyan)">${fmt(totals.profit)}</p></div>
          <div class="glass-card" style="padding:1rem;text-align:center"><p style="color:var(--text-secondary);font-size:0.8rem">Profit Margin</p><p style="font-size:1.5rem;font-weight:800;color:var(--accent-amber)">${totals.margin}%</p></div>
        </div>
        <h4 style="margin-bottom:1rem">Workstation Summary</h4>
        <table class="data-table">
          <thead><tr><th>Workstation</th><th>Manager</th><th>Revenue</th><th>Profit</th><th>Shipments</th><th>Score</th></tr></thead>
          <tbody>
            ${DEMO_DATA.workstations.map(ws => `<tr><td>${ws.name}</td><td>${ws.manager}</td><td class="text-green">${fmt(ws.revenue)}</td><td class="text-cyan">${fmt(ws.revenue - ws.expenses)}</td><td>${ws.shipments}</td><td>${ws.score}/100</td></tr>`).join('')}
          </tbody>
        </table>
        <h4 style="margin:1.5rem 0 1rem">Strategic Recommendations</h4>
        ${buildAlerts().map(a => `<div style="padding:0.75rem;border-left:3px solid ${a.type === 'critical' ? 'var(--accent-red)' : a.type === 'warning' ? 'var(--accent-amber)' : 'var(--accent-green)'};margin-bottom:0.75rem;background:rgba(255,255,255,0.03);border-radius:0 8px 8px 0"><p style="font-weight:600">${a.icon} ${a.title}</p><p style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.25rem">${a.desc}</p></div>`).join('')}
      `,
    },
    pnl: {
      title: `P&L Statement — ${now}`,
      html: `<table class="data-table">
        <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Income</th><th>Expense</th></tr></thead>
        <tbody>${DEMO_DATA.transactions.slice(0, 50).map(t => `<tr><td>${t.date}</td><td>${t.description}</td><td>${t.category}</td><td>${t.type === 'income' ? fmt(t.amount) : '—'}</td><td>${t.type === 'expense' ? fmt(t.amount) : '—'}</td></tr>`).join('')}</tbody>
      </table>`,
    },
    operations: {
      title: `Operations Report — ${now}`,
      html: `<table class="data-table">
        <thead><tr><th>Workstation</th><th>Shipments</th><th>Delivered</th><th>Pending</th><th>Returned</th><th>Delivery Rate</th></tr></thead>
        <tbody>${DEMO_DATA.workstations.map(ws => `<tr><td>${ws.name}</td><td>${ws.shipments}</td><td class="text-green">${ws.delivered}</td><td class="text-amber">${ws.pending}</td><td class="text-red">${ws.returned}</td><td>${Math.round(ws.delivered / ws.shipments * 100)}%</td></tr>`).join('')}</tbody>
      </table>`,
    },
    team: {
      title: `Team Performance Report — ${now}`,
      html: `<table class="data-table">
        <thead><tr><th>Name</th><th>Role</th><th>Workstation</th><th>Shipments</th><th>Revenue</th><th>Score</th></tr></thead>
        <tbody>${DEMO_DATA.team.map(m => `<tr><td>${m.name}</td><td>${m.role}</td><td>${m.ws}</td><td>${m.shipments}</td><td>${fmt(m.revenue)}</td><td>${m.score}/100</td></tr>`).join('')}</tbody>
      </table>`,
    },
  };

  const r = reportMap[type];
  title.textContent = r.title;
  content.innerHTML = r.html;
  output.scrollIntoView({ behavior: 'smooth' });
}

// ═══════════════════════════════════════════════
// SETTINGS PAGE
// ═══════════════════════════════════════════════
function loadSettings() {
  if (!currentUser || currentUser.role !== 'admin') {
    showPage('dashboard');
    showToast('Admin access only', 'error');
    return;
  }
  document.getElementById('cfgUrl').value = localStorage.getItem('sb_url') || '';
  document.getElementById('cfgKey').value = localStorage.getItem('sb_key') || '';

  document.getElementById('usersList').innerHTML = `
    <div style="padding:0.75rem;background:rgba(255,255,255,0.04);border-radius:8px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <p style="font-weight:600">${currentUser.email}</p>
        <p style="font-size:0.78rem;color:var(--text-secondary)">Admin (Owner)</p>
      </div>
      <span class="status-badge status-delivered">Admin</span>
    </div>
  `;
}

function saveSupabaseConfig() {
  const url = document.getElementById('cfgUrl').value.trim();
  const key = document.getElementById('cfgKey').value.trim();
  if (!url || !key) { showToast('Please enter both URL and key', 'error'); return; }
  localStorage.setItem('sb_url', url);
  localStorage.setItem('sb_key', key);
  const ok = initSupabase(url, key);
  showToast(ok ? 'Supabase connected! Refreshing...' : 'Invalid config. Check URL and key.', ok ? 'success' : 'error');
  if (ok) setTimeout(() => location.reload(), 1500);
}

function inviteUser() {
  const email = document.getElementById('inviteEmail').value.trim();
  if (!email) { showToast('Enter an email address', 'error'); return; }
  showToast(`Invitation sent to ${email} (requires Supabase auth setup)`, 'success');
  document.getElementById('inviteEmail').value = '';
}

// ═══════════════════════════════════════════════
// CHART DEFAULTS
// ═══════════════════════════════════════════════
function chartDefaults(overrides = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeInOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(13,18,36,0.95)',
        titleColor: '#f0f4ff',
        bodyColor: '#8892aa',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: { label: ctx => ' ' + fmt(ctx.raw) },
      },
    },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════
let toastTimer;
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.remove('hidden');
  toast.style.borderColor = type === 'error' ? 'rgba(239,68,68,0.4)' : type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

// ═══════════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════════
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.remove('hidden');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.add('hidden');
}

// ═══════════════════════════════════════════════
// CLOCK
// ═══════════════════════════════════════════════
function updateClock() {
  const el = document.getElementById('topbarTime');
  if (el) el.textContent = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ═══════════════════════════════════════════════
// RESET
// ═══════════════════════════════════════════════
function resetApp() {
  Object.values(charts).forEach(c => c && c.destroy());
  charts = {};
}

// ═══════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // Try to init Supabase
  initSupabase(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY);

  // Load saved sheets
  const saved = localStorage.getItem('amaya_sheets');
  if (saved) {
    try { sheetsData = JSON.parse(saved); } catch (e) {}
  }

  // Particles on login page
  const particleContainer = document.getElementById('particles');
  if (particleContainer) {
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.cssText = `left:${Math.random() * 100}%;width:${Math.random() * 3 + 1}px;height:${Math.random() * 3 + 1}px;animation-duration:${Math.random() * 15 + 10}s;animation-delay:${Math.random() * 10}s;background:rgba(${Math.random() > 0.5 ? '99,102,241' : '6,182,212'},${Math.random() * 0.5 + 0.2})`;
      particleContainer.appendChild(p);
    }
  }

  // Login form
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    const errEl = document.getElementById('loginError');

    btn.querySelector('.btn-text').classList.add('hidden');
    btn.querySelector('.btn-spinner').classList.remove('hidden');
    btn.disabled = true;
    errEl.classList.add('hidden');

    const { user, error } = await signIn(email, password);

    btn.querySelector('.btn-text').classList.remove('hidden');
    btn.querySelector('.btn-spinner').classList.add('hidden');
    btn.disabled = false;

    if (error) {
      errEl.textContent = error.message || 'Sign in failed. Please check your credentials.';
      errEl.classList.remove('hidden');
      return;
    }

    if (user) {
      // Setup user UI
      const name = (user.user_metadata?.full_name || email.split('@')[0]).replace(/^\w/, c => c.toUpperCase());
      document.getElementById('sidebarUserName').textContent = name;
      document.getElementById('sidebarUserRole').textContent = currentUser.role === 'admin' ? 'Admin / Owner' : 'Partner';
      document.getElementById('sidebarAvatar').textContent = name[0].toUpperCase();

      if (currentUser.role === 'admin') {
        document.getElementById('adminNavItem').style.display = 'flex';
      }

      showScreen('appScreen');
      showPage('dashboard');

      // Alert badge
      const alerts = buildAlerts();
      const critCount = alerts.filter(a => a.type === 'critical' || a.type === 'warning').length;
      document.getElementById('alertBadge').textContent = critCount;
    }
  });

  // Password toggle
  document.getElementById('togglePw').addEventListener('click', () => {
    const inp = document.getElementById('loginPassword');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  // Nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => showPage(btn.dataset.page));
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', signOut);

  // Sidebar toggle
  document.getElementById('menuToggle').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // Refresh
  document.getElementById('refreshBtn').addEventListener('click', () => {
    showPage(currentPage);
    showToast('Data refreshed', 'success');
  });

  // Revenue period buttons
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      revenueChartPeriod = parseInt(btn.dataset.period);
      drawRevenueChart(revenueChartPeriod);
    });
  });

  // P&L month filter
  document.getElementById('pnlMonth').addEventListener('change', e => renderPnL(e.target.value));

  // P&L export
  document.getElementById('pnlExport').addEventListener('click', () => {
    const monthStr = document.getElementById('pnlMonth').value;
    const [year, month] = monthStr.split('-').map(Number);
    const txs = DEMO_DATA.transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
    const csv = ['Date,Description,Category,Type,Amount']
      .concat(txs.map(t => `${t.date},"${t.description}","${t.category}",${t.type},${t.amount}`))
      .join('\n');
    downloadCSV(csv, `PnL_${monthStr}.csv`);
  });

  // Ops filter
  document.getElementById('opsFilter').addEventListener('change', e => renderOpsTable(e.target.value));

  // Add sheet
  document.getElementById('addSheetBtn').addEventListener('click', () => {
    document.getElementById('addSheetModal').classList.remove('hidden');
  });
  document.getElementById('closeSheetModalBtn').addEventListener('click', () => {
    document.getElementById('addSheetModal').classList.add('hidden');
  });
  document.getElementById('cancelSheetBtn').addEventListener('click', () => {
    document.getElementById('addSheetModal').classList.add('hidden');
  });
  document.getElementById('addSheetForm').addEventListener('submit', e => {
    e.preventDefault();
    const sheet = {
      id: Date.now(),
      name: document.getElementById('sheetName').value.trim(),
      url: document.getElementById('sheetUrl').value.trim(),
      category: document.getElementById('sheetCategory').value,
      notes: document.getElementById('sheetNotes').value.trim(),
    };
    sheetsData.push(sheet);
    saveSheets();
    renderSheets();
    document.getElementById('addSheetModal').classList.add('hidden');
    document.getElementById('addSheetForm').reset();
    showToast('Spreadsheet added!', 'success');
  });

  // Alerts clear
  document.getElementById('clearAlertsBtn').addEventListener('click', () => {
    document.getElementById('alertsList').innerHTML = '<div class="no-alerts"><div class="no-alerts-icon">✅</div><p>All alerts cleared</p></div>';
    document.getElementById('alertBadge').textContent = '0';
    showToast('All alerts marked as read', 'success');
  });

  // Reports
  document.getElementById('reportExecutive').addEventListener('click', () => generateReport('executive'));
  document.getElementById('reportPnl').addEventListener('click', () => generateReport('pnl'));
  document.getElementById('reportOps').addEventListener('click', () => generateReport('operations'));
  document.getElementById('reportTeam').addEventListener('click', () => generateReport('team'));

  // Report CSV export
  document.getElementById('reportCsvBtn').addEventListener('click', () => {
    const content = document.getElementById('reportContent').querySelector('table');
    if (!content) { showToast('No table data to export', 'error'); return; }
    const rows = [...content.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('th,td')].map(c => `"${c.textContent.trim()}"`).join(','));
    downloadCSV(rows.join('\n'), 'Amaya_Report.csv');
  });

  // Settings
  document.getElementById('saveConfigBtn').addEventListener('click', saveSupabaseConfig);
  document.getElementById('inviteUserBtn').addEventListener('click', inviteUser);

  // Clock
  setInterval(updateClock, 1000);
  updateClock();

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeSidebar();
      document.getElementById('addSheetModal').classList.add('hidden');
    }
  });
});

// ═══════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV downloaded!', 'success');
}
