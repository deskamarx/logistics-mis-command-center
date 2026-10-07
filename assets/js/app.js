/**
 * Logistics MIS & Executive Command Center - Frontend SPA Controller
 */

let AppState = {
    user: null,
    csrfToken: '',
    currentTab: 'overview',
    charts: {},
    transactionsPage: 1,
    ordersPage: 1
};

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
});

// Check Session Auth Status on Load
async function checkAuthStatus() {
    try {
        const res = await fetch('api.php?action=me');
        const data = await res.json();

        if (data.status === 'success' && data.authenticated) {
            AppState.user = data.user;
            AppState.csrfToken = data.csrf_token;
            renderAppShell();
            loadTab(AppState.currentTab);
        } else {
            renderLoginForm();
        }
    } catch (e) {
        console.error('Auth Check Error:', e);
        renderLoginForm();
    }
}

// Render Login Form
function renderLoginForm() {
    const root = document.getElementById('app-root');
    root.innerHTML = `
        <div class="auth-wrapper">
            <div class="auth-card">
                <div style="text-align:center; margin-bottom: 2rem;">
                    <div class="brand-icon" style="margin: 0 auto 1rem; width:54px; height:54px; font-size:1.8rem;">📦</div>
                    <h2 style="font-size:1.5rem; font-weight:800; color:#fff; margin-bottom:0.4rem;">Command Center Login</h2>
                    <p style="color:var(--text-muted); font-size:0.88rem;">Amaya Logistics & Business Intelligence</p>
                </div>

                <div id="login-alert" style="display:none;" class="alert-card danger"></div>

                <form id="login-form">
                    <div class="form-group">
                        <label>Username or Email Address</label>
                        <input type="text" id="login-username" class="form-input" placeholder="bahalul1964@gmail.com or bahalul" required value="bahalul">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="login-password" class="form-input" placeholder="••••••••••••" required value="admin123">
                    </div>
                    <button type="submit" class="btn-primary" style="margin-top:0.5rem; padding:0.9rem;">🔐 Sign In to Dashboard</button>
                </form>

                <div style="margin-top:1.8rem; padding-top:1.2rem; border-top:1px solid var(--border-color); font-size:0.8rem; color:var(--text-muted); text-align:center;">
                    <p>Demo Accounts Available:</p>
                    <p style="margin-top:0.3rem;"><strong>Admin (Owner):</strong> bahalul / admin123</p>
                    <p><strong>Partner (Viewer):</strong> partner1 / partner123</p>
                </div>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const res = await fetch('api.php?action=login', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.status === 'success') {
                AppState.user = data.user;
                AppState.csrfToken = data.csrf_token;
                renderAppShell();
                loadTab('overview');
            } else {
                const alert = document.getElementById('login-alert');
                alert.style.display = 'block';
                alert.innerHTML = `<div>${data.message}</div>`;
            }
        } catch (err) {
            alert('Login failed. Connection error.');
        }
    });
}

// Render Main Application Shell
function renderAppShell() {
    const root = document.getElementById('app-root');
    const isAdmin = AppState.user.is_admin;

    root.innerHTML = `
        <header class="app-header">
            <div class="brand-container">
                <div class="brand-icon">📦</div>
                <div class="brand-title">
                    <h1>LOGISTICS MIS & COMMAND CENTER</h1>
                    <p>Executive Decision Engine & Automated Analytics</p>
                </div>
            </div>
            <div class="header-actions">
                <div class="user-badge">
                    <span>👤 ${escapeHtml(AppState.user.full_name)}</span>
                    <span class="user-role-badge" style="${isAdmin ? 'background:var(--primary);' : 'background:var(--info);'}">
                        ${isAdmin ? 'ADMIN (OWNER)' : 'PARTNER (VIEWER)'}
                    </span>
                </div>
                ${isAdmin ? `
                    <button class="btn-sync" onclick="triggerSyncAll()">
                        <span id="sync-spinner" style="display:none;">⏳</span>
                        <span>🔄 Sync Spreadsheets</span>
                    </button>
                ` : ''}
                <button class="btn-logout" onclick="handleLogout()">Logout</button>
            </div>
        </header>

        <div class="app-container">
            <aside class="sidebar">
                <div class="nav-item active" data-tab="overview" onclick="switchTab('overview')">
                    <span>📊 Executive Command Center</span>
                </div>
                <div class="nav-item" data-tab="responsibility" onclick="switchTab('responsibility')">
                    <span>👥 Responsibility & Wing Matrix</span>
                </div>
                <div class="nav-item" data-tab="financials" onclick="switchTab('financials')">
                    <span>📈 Profit & Track Analysis</span>
                </div>
                <div class="nav-item" data-tab="alerts" onclick="switchTab('alerts')">
                    <span>⚠️ Decision & Attention Center</span>
                    <span class="badge-count" id="nav-alert-count">0</span>
                </div>
                <div class="nav-item" data-tab="explorer" onclick="switchTab('explorer')">
                    <span>📑 Data Explorer & Reports</span>
                </div>
                ${isAdmin ? `
                    <div style="margin-top:1.5rem; margin-bottom:0.5rem; padding-left:1rem; font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">
                        Owner Settings
                    </div>
                    <div class="nav-item" data-tab="spreadsheets" onclick="switchTab('spreadsheets')">
                        <span>🔗 Manage Spreadsheets</span>
                    </div>
                    <div class="nav-item" data-tab="users" onclick="switchTab('users')">
                        <span>⚙️ Multi-User Access</span>
                    </div>
                ` : ''}
            </aside>

            <main class="main-view" id="main-view"></main>
        </div>

        <!-- Global Modal Holder -->
        <div class="modal-overlay" id="global-modal">
            <div class="modal-card" id="modal-content"></div>
        </div>
    `;
}

// Switch Tab Router
function switchTab(tabName) {
    AppState.currentTab = tabName;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
    if (activeNav) activeNav.classList.add('active');

    loadTab(tabName);
}

// Load Tab Content
async function loadTab(tabName) {
    const view = document.getElementById('main-view');
    view.innerHTML = `<div style="text-align:center; padding: 4rem; color:var(--text-muted);">
        <div style="font-size:2rem; margin-bottom:1rem;">⏳</div>
        <div>Loading Business Intelligence Data...</div>
    </div>`;

    switch (tabName) {
        case 'overview':
            await renderOverviewTab();
            break;
        case 'responsibility':
            await renderResponsibilityTab();
            break;
        case 'financials':
            await renderFinancialsTab();
            break;
        case 'alerts':
            await renderAlertsTab();
            break;
        case 'explorer':
            await renderExplorerTab();
            break;
        case 'spreadsheets':
            await renderSpreadsheetsTab();
            break;
        case 'users':
            await renderUsersTab();
            break;
    }
}

// TAB 1: EXECUTIVE COMMAND OVERVIEW
async function renderOverviewTab() {
    const res = await fetch('api.php?action=get_overview');
    const data = await res.json();
    const ov = data.overview;
    const alertSummary = data.alerts_summary;

    // Update alert count badge in sidebar
    const badge = document.getElementById('nav-alert-count');
    if (badge) badge.innerText = alertSummary.count;

    const view = document.getElementById('main-view');
    view.innerHTML = `
        <div class="glass-box-header" style="border:none; padding-bottom:0; margin-bottom:1.5rem;">
            <div>
                <h2 style="font-size:1.6rem; font-weight:800;">Executive Dashboard & Financial Health</h2>
                <p style="color:var(--text-muted); font-size:0.88rem; margin-top:0.2rem;">Live telemetry aggregated from OPS-MIS and Workstation sheets</p>
            </div>
        </div>

        <div class="grid-4">
            <div class="stat-card success">
                <div class="stat-header">
                    <span class="stat-title">Total Collected Deposits</span>
                    <span class="stat-icon" style="color:var(--success);">💰</span>
                </div>
                <div class="stat-value" style="color:var(--success);">${ov.total_deposits_formatted}</div>
                <div class="stat-desc">From ${ov.total_transactions.toLocaleString()} verified transactions</div>
            </div>

            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-title">Est. Net Profit Margin (${ov.est_profit_margin_pct}%)</span>
                    <span class="stat-icon" style="color:var(--primary);">📈</span>
                </div>
                <div class="stat-value" style="color:#a5b4fc;">${ov.est_net_profit_formatted}</div>
                <div class="stat-desc">Estimated profit based on current revenue</div>
            </div>

            <div class="stat-card warning">
                <div class="stat-header">
                    <span class="stat-title">Workstation Orders</span>
                    <span class="stat-icon" style="color:var(--warning);">📦</span>
                </div>
                <div class="stat-value" style="color:var(--warning);">${ov.done_orders} / ${ov.total_orders}</div>
                <div class="stat-desc">${ov.completion_rate}% fulfillment rate (${ov.pending_orders} pending)</div>
            </div>

            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-title">Client Stores & Dealers</span>
                    <span class="stat-icon" style="color:var(--info);">🏬</span>
                </div>
                <div class="stat-value" style="color:var(--info);">${ov.unique_stores_count}</div>
                <div class="stat-desc">Managed by ${ov.unique_employees_count} collection officers</div>
            </div>
        </div>

        <div class="grid-2">
            <div class="glass-box">
                <div class="glass-box-header">
                    <div class="glass-box-title">📊 Revenue & Collection Performance</div>
                </div>
                <div id="chart-overview-monthly" style="min-height:280px;"></div>
            </div>

            <div class="glass-box">
                <div class="glass-box-header">
                    <div class="glass-box-title">💳 Payment Method Distribution</div>
                </div>
                <div id="chart-overview-methods" style="min-height:280px;"></div>
            </div>
        </div>

        <div class="glass-box">
            <div class="glass-box-header">
                <div class="glass-box-title" style="color:var(--warning);">⚠️ High Priority Attention Items (${alertSummary.count})</div>
                <button class="btn-sync" style="background:rgba(255,255,255,0.08); box-shadow:none;" onclick="switchTab('alerts')">View All Recommendations &rarr;</button>
            </div>
            <div>
                ${alertSummary.top_alerts.map(a => `
                    <div class="alert-card ${a.severity}">
                        <div class="alert-icon">⚠️</div>
                        <div class="alert-content">
                            <h4>${a.title}</h4>
                            <p>${a.description}</p>
                            <div class="alert-rec">💡 Recommendation: ${a.recommendation}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    renderOverviewCharts();
}

// Render ApexCharts / Chart.js for Overview
async function renderOverviewCharts() {
    const finRes = await fetch('api.php?action=get_financials');
    const finData = await finRes.json();
    const f = finData.data;

    // Payment methods chart
    const methodsContainer = document.getElementById('chart-overview-methods');
    if (methodsContainer && f.payment_methods) {
        const labels = f.payment_methods.map(m => m.method.length > 20 ? m.method.substring(0, 20) + '...' : m.method);
        const series = f.payment_methods.map(m => m.amount);

        const options = {
            chart: { type: 'donut', height: 280, background: 'transparent' },
            theme: { mode: 'dark' },
            series: series,
            labels: labels,
            colors: ['#6366f1', '#10b981', '#06b6d4', '#f59e0b', '#ec4899', '#8b5cf6'],
            legend: { position: 'bottom', fontSize: '11px', labels: { colors: '#94a3b8' } },
            stroke: { show: false }
        };
        if (window.ApexCharts) {
            new ApexCharts(methodsContainer, options).render();
        }
    }

    // Monthly Trend chart
    const trendContainer = document.getElementById('chart-overview-monthly');
    if (trendContainer && f.monthly_trend) {
        const months = f.monthly_trend.map(t => t.month);
        const values = f.monthly_trend.map(t => t.amount);

        const options = {
            chart: { type: 'area', height: 280, background: 'transparent', toolbar: { show: false } },
            theme: { mode: 'dark' },
            colors: ['#10b981'],
            fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.05 } },
            series: [{ name: 'Deposits (BDT)', data: values }],
            xaxis: { categories: months, labels: { style: { colors: '#94a3b8' } } },
            yaxis: { labels: { style: { colors: '#94a3b8' }, formatter: val => (val / 1000000).toFixed(1) + 'M BDT' } },
            grid: { borderColor: 'rgba(255,255,255,0.05)' }
        };
        if (window.ApexCharts) {
            new ApexCharts(trendContainer, options).render();
        }
    }
}

// TAB 2: RESPONSIBILITY & WING MATRIX
async function renderResponsibilityTab() {
    const res = await fetch('api.php?action=get_responsibility');
    const data = await res.json();
    const staff = data.data.staff_matrix;
    const wings = data.data.wing_matrix;

    const view = document.getElementById('main-view');
    view.innerHTML = `
        <div class="glass-box-header" style="border:none; padding-bottom:0; margin-bottom:1.5rem;">
            <div>
                <h2 style="font-size:1.6rem; font-weight:800;">Who's Responsible for What?</h2>
                <p style="color:var(--text-muted); font-size:0.88rem; margin-top:0.2rem;">Staff Collection Matrix, Client Store Ownership, and Wing Allocations</p>
            </div>
        </div>

        <div class="glass-box">
            <div class="glass-box-header">
                <div class="glass-box-title">👥 Staff Revenue Collection Breakdown</div>
            </div>
            <div class="table-responsive">
                <table class="custom-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Employee / Staff Name</th>
                            <th>Total Collection</th>
                            <th>Company Share %</th>
                            <th>Txn Count</th>
                            <th>Top Managed Stores</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${staff.map((s, idx) => `
                            <tr>
                                <td><strong>#${idx + 1}</strong></td>
                                <td>
                                    <div style="font-weight:700; color:#fff;">${escapeHtml(s.name)}</div>
                                    <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(s.email)}</div>
                                </td>
                                <td><strong style="color:var(--success);">${s.total_collected_formatted}</strong></td>
                                <td>
                                    <div style="display:flex; align-items:center; gap:0.5rem;">
                                        <div style="flex:1; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
                                            <div style="width:${s.share_pct}%; height:100%; background:var(--primary);"></div>
                                        </div>
                                        <span>${s.share_pct}%</span>
                                    </div>
                                </td>
                                <td>${s.trans_count} txns</td>
                                <td style="color:var(--text-secondary);">${escapeHtml(s.top_stores)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="glass-box">
            <div class="glass-box-header">
                <div class="glass-box-title">🪶 Workstation Wing Operations Matrix</div>
            </div>
            <div class="grid-2" style="margin-bottom:0;">
                ${wings.map(w => `
                    <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.25rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                            <h3 style="font-size:1.1rem; color:var(--info);">Wing: ${escapeHtml(w.wing)}</h3>
                            <span class="user-role-badge" style="background:rgba(6,182,212,0.2); color:var(--info);">${w.total_orders} Total Orders</span>
                        </div>
                        <div style="display:flex; gap:1.5rem; margin-bottom:1rem; font-size:0.9rem;">
                            <div>Completed: <strong style="color:var(--success);">${w.done_orders}</strong></div>
                            <div>Pending: <strong style="color:var(--warning);">${w.pending_orders}</strong></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// TAB 3: FINANCIAL & TRACK ANALYSIS
async function renderFinancialsTab() {
    const res = await fetch('api.php?action=get_financials');
    const data = await res.json();
    const fin = data.data;

    const ovRes = await fetch('api.php?action=get_overview');
    const ovData = await ovRes.json();
    const ov = ovData.overview;

    const view = document.getElementById('main-view');
    view.innerHTML = `
        <div class="glass-box-header" style="border:none; padding-bottom:0; margin-bottom:1.5rem;">
            <div>
                <h2 style="font-size:1.6rem; font-weight:800;">Am I Going in the Right Track? Profit & Margin Analysis</h2>
                <p style="color:var(--text-muted); font-size:0.88rem; margin-top:0.2rem;">Revenue stream verification, net profit calculation, and collection run-rate</p>
            </div>
        </div>

        <div class="grid-4">
            <div class="stat-card success">
                <div class="stat-title">Total Gross Collection</div>
                <div class="stat-value" style="color:var(--success);">${ov.total_deposits_formatted}</div>
            </div>
            <div class="stat-card">
                <div class="stat-title">Net Profit Estimate (${ov.est_profit_margin_pct}%)</div>
                <div class="stat-value" style="color:var(--primary);">${ov.est_net_profit_formatted}</div>
            </div>
            <div class="stat-card">
                <div class="stat-title">Est. Order Book Value</div>
                <div class="stat-value" style="color:var(--info);">${ov.order_est_value_formatted}</div>
            </div>
            <div class="stat-card success">
                <div class="stat-title">Financial Health Status</div>
                <div class="stat-value" style="color:var(--success);">PROFITABLE</div>
            </div>
        </div>

        <div class="glass-box">
            <div class="glass-box-header">
                <div class="glass-box-title">💳 Revenue by Payment Account / Bank</div>
            </div>
            <div class="table-responsive">
                <table class="custom-table">
                    <thead>
                        <tr>
                            <th>Payment Channel / Account</th>
                            <th>Total Amount Collected</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fin.payment_methods.map(m => `
                            <tr>
                                <td><strong>${escapeHtml(m.method)}</strong></td>
                                <td><strong style="color:var(--success);">${m.amount_formatted}</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// TAB 4: DECISION & ATTENTION CENTER
async function renderAlertsTab() {
    const res = await fetch('api.php?action=get_alerts');
    const data = await res.json();
    const alerts = data.alerts;

    const view = document.getElementById('main-view');
    view.innerHTML = `
        <div class="glass-box-header" style="border:none; padding-bottom:0; margin-bottom:1.5rem;">
            <div>
                <h2 style="font-size:1.6rem; font-weight:800;">Decision & Attention Center</h2>
                <p style="color:var(--text-muted); font-size:0.88rem; margin-top:0.2rem;">Automated action items, replacement recommendations, and operational risk warnings</p>
            </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:1.25rem;">
            ${alerts.map(a => `
                <div class="glass-box" style="margin-bottom:0; border-left:5px solid var(--${a.severity === 'danger' ? 'danger' : (a.severity === 'warning' ? 'warning' : 'info')});">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
                        <h3 style="font-size:1.15rem; font-weight:700;">${escapeHtml(a.title)}</h3>
                        <span class="user-role-badge" style="background:rgba(255,255,255,0.08); color:var(--text-secondary);">${escapeHtml(a.category)}</span>
                    </div>
                    <p style="color:var(--text-secondary); font-size:0.92rem; line-height:1.5; margin-bottom:1rem;">
                        ${a.description}
                    </p>
                    <div style="background:rgba(0,0,0,0.3); padding:0.85rem 1rem; border-radius:var(--radius-sm); border:1px solid var(--border-color); font-size:0.88rem; color:#cbd5e1;">
                        💡 <strong>Action / Replacement Recommendation:</strong> ${a.recommendation}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// TAB 5: DATA EXPLORER & REPORTS
async function renderExplorerTab() {
    const view = document.getElementById('main-view');
    view.innerHTML = `
        <div class="glass-box-header" style="border:none; padding-bottom:0; margin-bottom:1.5rem;">
            <div>
                <h2 style="font-size:1.6rem; font-weight:800;">Data Explorer & Detailed Reports</h2>
                <p style="color:var(--text-muted); font-size:0.88rem; margin-top:0.2rem;">Search, filter, and export 6,000+ OPS-MIS records and Workstation orders</p>
            </div>
            <button class="btn-sync" style="background:var(--success);" onclick="exportCurrentTableToCSV()">📥 Export to CSV</button>
        </div>

        <div style="display:flex; gap:1rem; margin-bottom:1.5rem;">
            <input type="text" id="explorer-search" class="form-input" placeholder="Search by staff, store, payment method, account..." style="max-width:380px;" onkeyup="handleExplorerSearch()">
        </div>

        <div class="glass-box">
            <div class="glass-box-header">
                <div class="glass-box-title">📄 OPS-MIS Transaction Ledger</div>
            </div>
            <div class="table-responsive">
                <table class="custom-table" id="table-transactions">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Staff / Employee</th>
                            <th>Depositor Store</th>
                            <th>Deposit Amount</th>
                            <th>Payment Method</th>
                            <th>Slip Receipt</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-transactions">
                        <tr><td colspan="6" style="text-align:center;">Loading records...</td></tr>
                    </tbody>
                </table>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.25rem;">
                <div id="tx-page-info" style="font-size:0.82rem; color:var(--text-muted);">Showing page 1</div>
                <div style="display:flex; gap:0.5rem;">
                    <button class="btn-logout" style="border-color:var(--border-color); color:#fff;" onclick="changeTxPage(-1)">&larr; Prev</button>
                    <button class="btn-logout" style="border-color:var(--border-color); color:#fff;" onclick="changeTxPage(1)">Next &rarr;</button>
                </div>
            </div>
        </div>
    `;

    fetchExplorerData();
}

async function fetchExplorerData() {
    const query = document.getElementById('explorer-search')?.value || '';
    const res = await fetch(`api.php?action=get_transactions&page=${AppState.transactionsPage}&search=${encodeURIComponent(query)}`);
    const data = await res.json();

    const tbody = document.getElementById('tbody-transactions');
    if (!tbody) return;

    if (data.records && data.records.length > 0) {
        tbody.innerHTML = data.records.map(t => `
            <tr>
                <td>${escapeHtml(t.trans_date)}</td>
                <td><strong>${escapeHtml(t.employee_name)}</strong></td>
                <td>${escapeHtml(t.depositor_store)}</td>
                <td><strong style="color:var(--success);">BDT ${numberFormat(t.deposit_amount)}</strong></td>
                <td>${escapeHtml(t.payment_method)}</td>
                <td>
                    ${t.payment_slip_url ? `<a href="${escapeHtml(t.payment_slip_url)}" target="_blank" style="color:var(--info);">View Slip ↗</a>` : '<span style="color:var(--text-muted);">No slip</span>'}
                </td>
            </tr>
        `).join('');
        document.getElementById('tx-page-info').innerText = `Page ${data.page} of ${data.total_pages} (${data.total_records} total records)`;
    } else {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No records found.</td></tr>`;
    }
}

function handleExplorerSearch() {
    AppState.transactionsPage = 1;
    fetchExplorerData();
}

function changeTxPage(delta) {
    AppState.transactionsPage = Math.max(1, AppState.transactionsPage + delta);
    fetchExplorerData();
}

// TAB 6: SPREADSHEET MANAGER (Admin Only)
async function renderSpreadsheetsTab() {
    const res = await fetch('api.php?action=get_spreadsheets');
    const data = await res.json();
    const sheets = data.spreadsheets;

    const view = document.getElementById('main-view');
    view.innerHTML = `
        <div class="glass-box-header" style="border:none; padding-bottom:0; margin-bottom:1.5rem;">
            <div>
                <h2 style="font-size:1.6rem; font-weight:800;">Spreadsheet Integration Manager</h2>
                <p style="color:var(--text-muted); font-size:0.88rem; margin-top:0.2rem;">Add and manage spreadsheet collection links (Private & Public Google Sheets)</p>
            </div>
            <button class="btn-sync" onclick="openAddSheetModal()">➕ Add New Spreadsheet Link</button>
        </div>

        <div class="glass-box">
            <div class="glass-box-header">
                <div class="glass-box-title">🔗 Configured Spreadsheets (${sheets.length})</div>
            </div>
            <div class="table-responsive">
                <table class="custom-table">
                    <thead>
                        <tr>
                            <th>Title & Category</th>
                            <th>Google Sheet URL</th>
                            <th>Fetch Method</th>
                            <th>Status & Last Sync</th>
                            <th>Rows Count</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sheets.map(s => `
                            <tr>
                                <td>
                                    <div style="font-weight:700; color:#fff;">${escapeHtml(s.title)}</div>
                                    <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(s.category.toUpperCase())}</div>
                                </td>
                                <td><a href="${escapeHtml(s.sheet_url)}" target="_blank" style="color:var(--info); font-size:0.8rem;">Open Sheet ↗</a></td>
                                <td><span class="user-role-badge" style="background:rgba(255,255,255,0.08);">${s.fetch_method}</span></td>
                                <td>
                                    <div style="color:${s.sync_status === 'success' ? 'var(--success)' : 'var(--warning)'}; font-weight:600;">
                                        ${s.sync_status === 'success' ? 'Synced' : 'Requires Setup/Auth'}
                                    </div>
                                    <div style="font-size:0.75rem; color:var(--text-muted);">${s.last_synced_at || 'Never'}</div>
                                </td>
                                <td><strong>${s.rows_count} rows</strong></td>
                                <td>
                                    <button class="btn-logout" style="border-color:var(--primary); color:var(--primary);" onclick="triggerSyncSingle(${s.id})">Sync Now</button>
                                    <button class="btn-logout" onclick="deleteSheet(${s.id})">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="glass-box" style="background:rgba(99, 102, 241, 0.05); border-color:var(--primary);">
            <div class="glass-box-title" style="color:#a5b4fc; margin-bottom:0.75rem;">🔑 Private Google Sheets Access Guide for bahalul1964@gmail.com</div>
            <p style="font-size:0.88rem; color:var(--text-secondary); line-height:1.5;">
                For private spreadsheets where <code>bahalul1964@gmail.com</code> has access:
                <br>1. Open your Google Sheet &gt; Extensions &gt; Apps Script.
                <br>2. Paste the provided 1-line script and click Deploy as Web App.
                <br>3. Paste the Web App URL into the spreadsheet setting above for instant sync!
            </p>
        </div>
    `;
}

function openAddSheetModal() {
    const modal = document.getElementById('global-modal');
    const content = document.getElementById('modal-content');

    content.innerHTML = `
        <div class="modal-header">
            <h3>Add New Spreadsheet Link</h3>
            <button class="btn-close" onclick="closeModal()">&times;</button>
        </div>
        <form id="add-sheet-form">
            <input type="hidden" name="csrf_token" value="${AppState.csrfToken}">
            <div class="form-group">
                <label>Spreadsheet Title</label>
                <input type="text" name="title" class="form-input" placeholder="e.g. Workstation3 - Yeasin" required>
            </div>
            <div class="form-group">
                <label>Category</label>
                <select name="category" class="form-input">
                    <option value="workstation">Workstation / Orders</option>
                    <option value="mis_ops">OPS-MIS / Deposits</option>
                    <option value="inventory">Inventory</option>
                    <option value="expenses">Expenses</option>
                </select>
            </div>
            <div class="form-group">
                <label>Google Spreadsheet Link / URL</label>
                <input type="text" name="sheet_url" class="form-input" placeholder="https://docs.google.com/spreadsheets/d/..." required>
            </div>
            <div class="form-group">
                <label>Fetch Method</label>
                <select name="fetch_method" class="form-input">
                    <option value="csv_direct">Direct CSV Export (Public / Published Sheets)</option>
                    <option value="apps_script">Google Apps Script Web App (Private Sheets)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Apps Script Web App URL (Optional if using Apps Script)</label>
                <input type="text" name="apps_script_url" class="form-input" placeholder="https://script.google.com/macros/s/.../exec">
            </div>
            <button type="submit" class="btn-primary" style="margin-top:1rem;">Add Spreadsheet & Sync</button>
        </form>
    `;
    modal.classList.add('active');

    document.getElementById('add-sheet-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        formData.append('action', 'add_spreadsheet');

        const res = await fetch('api.php?action=add_spreadsheet', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.status === 'success') {
            closeModal();
            renderSpreadsheetsTab();
        } else {
            alert(data.message);
        }
    });
}

function closeModal() {
    document.getElementById('global-modal').classList.remove('active');
}

// TAB 7: USERS TAB (Admin Only)
async function renderUsersTab() {
    const res = await fetch('api.php?action=get_users');
    const data = await res.json();
    const users = data.users;

    const view = document.getElementById('main-view');
    view.innerHTML = `
        <div class="glass-box-header" style="border:none; padding-bottom:0; margin-bottom:1.5rem;">
            <div>
                <h2 style="font-size:1.6rem; font-weight:800;">Multi-User Access & Partner Accounts</h2>
                <p style="color:var(--text-muted); font-size:0.88rem; margin-top:0.2rem;">Grant partners access to view reports and executive dashboards</p>
            </div>
            <button class="btn-sync" onclick="openAddUserModal()">👤 Add Partner / User</button>
        </div>

        <div class="glass-box">
            <div class="glass-box-header">
                <div class="glass-box-title">👥 Authorized Accounts</div>
            </div>
            <div class="table-responsive">
                <table class="custom-table">
                    <thead>
                        <tr>
                            <th>Full Name</th>
                            <th>Username & Email</th>
                            <th>Role & Permissions</th>
                            <th>Created At</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td><strong>${escapeHtml(u.full_name)}</strong></td>
                                <td>
                                    <div>${escapeHtml(u.username)}</div>
                                    <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(u.email)}</div>
                                </td>
                                <td>
                                    <span class="user-role-badge" style="${u.role === 'admin' ? 'background:var(--primary);' : 'background:var(--info);'}">
                                        ${u.role.toUpperCase()}
                                    </span>
                                </td>
                                <td style="color:var(--text-muted);">${u.created_at || 'Default'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function openAddUserModal() {
    const modal = document.getElementById('global-modal');
    const content = document.getElementById('modal-content');

    content.innerHTML = `
        <div class="modal-header">
            <h3>Add New User / Partner Account</h3>
            <button class="btn-close" onclick="closeModal()">&times;</button>
        </div>
        <form id="add-user-form">
            <input type="hidden" name="csrf_token" value="${AppState.csrfToken}">
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" name="full_name" class="form-input" placeholder="e.g. Executive Partner" required>
            </div>
            <div class="form-group">
                <label>Username</label>
                <input type="text" name="username" class="form-input" placeholder="partner2" required>
            </div>
            <div class="form-group">
                <label>Email Address</label>
                <input type="email" name="email" class="form-input" placeholder="partner@company.com" required>
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" name="password" class="form-input" placeholder="••••••••••••" required>
            </div>
            <div class="form-group">
                <label>Role</label>
                <select name="role" class="form-input">
                    <option value="partner">Partner (Viewer Only)</option>
                    <option value="admin">Admin (Full Control)</option>
                </select>
            </div>
            <button type="submit" class="btn-primary" style="margin-top:1rem;">Create Account</button>
        </form>
    `;
    modal.classList.add('active');

    document.getElementById('add-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        formData.append('action', 'add_user');

        const res = await fetch('api.php?action=add_user', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.status === 'success') {
            closeModal();
            renderUsersTab();
        } else {
            alert(data.message);
        }
    });
}

// Global Sync Trigger
async function triggerSyncAll() {
    const spinner = document.getElementById('sync-spinner');
    if (spinner) spinner.style.display = 'inline-block';

    const formData = new FormData();
    formData.append('csrf_token', AppState.csrfToken);

    try {
        const res = await fetch('api.php?action=sync_sheets', { method: 'POST', body: formData });
        const data = await res.json();
        alert('Spreadsheets sync completed!');
        loadTab(AppState.currentTab);
    } catch (e) {
        alert('Sync error occurred.');
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
}

async function triggerSyncSingle(sheetId) {
    const formData = new FormData();
    formData.append('id', sheetId);
    formData.append('csrf_token', AppState.csrfToken);

    const res = await fetch('api.php?action=sync_sheets', { method: 'POST', body: formData });
    const data = await res.json();
    alert('Spreadsheet sync completed!');
    renderSpreadsheetsTab();
}

async function deleteSheet(sheetId) {
    if (!confirm('Are you sure you want to delete this spreadsheet link?')) return;
    const formData = new FormData();
    formData.append('id', sheetId);
    formData.append('csrf_token', AppState.csrfToken);

    const res = await fetch('api.php?action=delete_spreadsheet', { method: 'POST', body: formData });
    renderSpreadsheetsTab();
}

async function handleLogout() {
    await fetch('api.php?action=logout');
    AppState.user = null;
    renderLoginForm();
}

function exportCurrentTableToCSV() {
    window.location.href = 'api.php?action=get_transactions&limit=5000';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function numberFormat(val) {
    return parseFloat(val || 0).toLocaleString();
}
