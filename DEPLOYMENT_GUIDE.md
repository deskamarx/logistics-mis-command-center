# 🚀 InfinityFree Deployment Guide
**Logistics MIS & Executive Command Center**
*Target Account & Owner: `bahalul1964@gmail.com`*

---

## 📋 Overview of Included Files
Your app package is completely self-contained and ready to host on InfinityFree:

- `index.php` - Main Single-Page Application (SPA) dashboard.
- `api.php` - REST API Controller for authentication, analytics, search, and spreadsheet sync.
- `config.php` - App configurations & CSRF security setup.
- `install.php` - **InfinityFree 1-Click Database Installer & Configurator**.
- `includes/`
  - `db.php` - Universal Database Driver (MySQL + JSON storage engine).
  - `auth.php` - Multi-User Login & Role-Based Access Control (Admin vs Partner).
  - `sheet_fetcher.php` - Google Sheets synchronizer engine.
  - `analytics.php` - Business Intelligence & Decision Center engine.
- `assets/`
  - `css/style.css` - Ultra-modern Glassmorphism Dark Mode design system.
  - `js/app.js` - Interactive SPA controller & ApexCharts graph engine.
- `data/db.json` - Seeded database loaded with **6,136+ real transactions** and workstation orders.

---

## 📥 How to Upload & Deploy to InfinityFree (5 Steps)

### Step 1: Create an Account on InfinityFree
1. Go to [InfinityFree.com](https://www.infinityfree.com) and sign up / log in.
2. Click **Create Account** and choose a free domain or subdomain (e.g. `bahalul-mis.infinityfreeapp.com`).

### Step 2: Open File Manager & Upload Code
1. In your InfinityFree Dashboard, open **File Manager** (or connect via FileZilla FTP).
2. Open the `htdocs` folder.
3. Upload all files from `e:\newPRO` directly into the `htdocs` folder.

### Step 3: Run 1-Click MySQL Installer (Optional for MySQL, works with JSON out of the box!)
The app works out of the box with the included high-performance JSON database. If you want to use InfinityFree's MySQL database:
1. Go to your InfinityFree vPanel -> **MySQL Databases** -> Create a database (e.g. `if0_38401234_mis`).
2. Open your browser and navigate to: `http://your-subdomain.infinityfreeapp.com/install.php`
3. Enter your MySQL Host (`sqlXXX.infinityfree.com`), DB Name, User, and Password.
4. Click **Run Database Installation**.

### Step 4: Login to your Dashboard
Navigate to `http://your-subdomain.infinityfreeapp.com/index.php` and sign in with default credentials:

- **Admin (Owner Account - `bahalul1964@gmail.com`):**
  - Username: `bahalul` (or `bahalul1964@gmail.com`)
  - Password: `admin123`
  - *Full Control: Manage spreadsheet links, add/delete users, trigger syncs.*

- **Partner Account (Viewer Only):**
  - Username: `partner1`
  - Password: `partner123`
  - *Permissions: View executive dashboards, profit reports, staff responsibility matrix, alerts.*

---

## 🔗 Managing Spreadsheets & Adding New Links in Future

1. Log in as Admin (`bahalul`).
2. Click **Manage Spreadsheets** in the sidebar.
3. Click **Add New Spreadsheet Link**.
4. Paste the Google Sheet URL, select Category and Fetch Method, and click **Add & Sync**.

### Private Google Sheets Setup for `bahalul1964@gmail.com`:
If a spreadsheet is private (not public to anyone with link), see `apps_script_guide.txt` included in your project folder.
