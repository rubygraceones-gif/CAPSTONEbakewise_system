// --- PHILIPPINE CONTACT NUMBER VALIDATION & NUMERIC INPUT RESTRICTION ---
function isValidPhContactNumber(val) {
  if (!val) return false;
  const cleaned = String(val).trim();
  return /^(09\d{9}|639\d{9})$/.test(cleaned);
}

function handleContactKeyDown(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Home', 'End'];
  if (allowedKeys.includes(e.key)) return;
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
}

function handleContactInput(e) {
  const input = e.target;
  const digitsOnly = input.value.replace(/\D/g, '').slice(0, 12);
  if (input.value !== digitsOnly) {
    input.value = digitsOnly;
  }
}

function handleContactPaste(e) {
  e.preventDefault();
  const clipboardData = e.clipboardData || window.clipboardData;
  const pastedText = clipboardData ? clipboardData.getData('text') : '';
  const digitsOnly = (pastedText || '').replace(/\D/g, '');
  const input = e.target;
  const start = input.selectionStart || 0;
  const end = input.selectionEnd || 0;
  const currentVal = input.value || '';
  const newVal = (currentVal.slice(0, start) + digitsOnly + currentVal.slice(end)).replace(/\D/g, '').slice(0, 12);
  input.value = newVal;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
window.escapeHtml = escapeHtml;

function bindContactNumberSanitizer(inputId) {
  const el = document.getElementById(inputId);
  if (el && !el.dataset.numericBound) {
    el.dataset.numericBound = "true";
    el.addEventListener("keydown", handleContactKeyDown);
    el.addEventListener("input", handleContactInput);
    el.addEventListener("paste", handleContactPaste);
  }
}

// --- STORE HOURS TIME PICKER HELPERS (AM/PM FORMAT & 24 HOURS) ---
function formatTimeToAmPm(timeStr) {
  if (!timeStr) return "";
  const parts = String(timeStr).trim().split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, "0");
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${ampm}`;
}

function parseAmPmTo24H(ampmStr) {
  if (!ampmStr) return "";
  const match = String(ampmStr).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    const simpleMatch = String(ampmStr).trim().match(/^(\d{1,2})\s*(AM|PM)$/i);
    if (simpleMatch) {
      let h = parseInt(simpleMatch[1], 10);
      const isPm = simpleMatch[2].toUpperCase() === "PM";
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:00`;
    }
    return "";
  }
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const isPm = match[3].toUpperCase() === "PM";
  if (isPm && hours < 12) hours += 12;
  if (!isPm && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function parseStoreHoursString(hoursStr) {
  if (!hoursStr) return { is24Hours: false, openTime: "05:00", closeTime: "20:00" };
  const trimmed = String(hoursStr).trim();
  if (/^24\s*hours?$/i.test(trimmed) || /24\/7/i.test(trimmed)) {
    return { is24Hours: true, openTime: "05:00", closeTime: "20:00" };
  }
  const parts = trimmed.split(/\s*[\u2013\u2014\-]|(?:\s+to\s+)\s*/i);
  if (parts.length >= 2) {
    const open24 = parseAmPmTo24H(parts[0].trim());
    const close24 = parseAmPmTo24H(parts[1].trim());
    return {
      is24Hours: false,
      openTime: open24 || "05:00",
      closeTime: close24 || "20:00"
    };
  }
  return { is24Hours: false, openTime: "05:00", closeTime: "20:00" };
}

function buildStoreHoursString(is24Hours, openTime, closeTime) {
  if (is24Hours) {
    return "24 Hours";
  }
  const formattedOpen = formatTimeToAmPm(openTime);
  const formattedClose = formatTimeToAmPm(closeTime);
  return `${formattedOpen} – ${formattedClose}`;
}

function setupStoreHoursPickers() {
  const bindGroup = (prefix) => {
    const isRegister = prefix === "br";
    const cb = document.getElementById(isRegister ? "br-24hours-checkbox" : "edit-br-24hours-checkbox");
    const openInput = document.getElementById(isRegister ? "br-open-time" : "edit-br-open-time");
    const closeInput = document.getElementById(isRegister ? "br-close-time" : "edit-br-close-time");
    const row = document.getElementById(isRegister ? "br-time-picker-row" : "edit-br-time-picker-row");
    const hidden = document.getElementById(isRegister ? "br-hours-input" : "edit-br-hours");

    if (!cb || !openInput || !closeInput || cb.dataset.hoursBound) return;
    cb.dataset.hoursBound = "true";

    const updateState = () => {
      const is24 = cb.checked;
      if (row) {
        row.style.opacity = is24 ? "0.45" : "1";
        row.style.pointerEvents = is24 ? "none" : "auto";
      }
      openInput.required = !is24;
      closeInput.required = !is24;

      if (hidden) {
        hidden.value = buildStoreHoursString(is24, openInput.value, closeInput.value);
      }
    };

    cb.addEventListener("change", updateState);
    openInput.addEventListener("input", updateState);
    closeInput.addEventListener("input", updateState);
    openInput.addEventListener("change", updateState);
    closeInput.addEventListener("change", updateState);
    updateState();
  };

  bindGroup("br");
  bindGroup("edit");
}



/* ==========================================================================
   BAKEWISE APPLICATION LOGIC
   Advanced Bakery Management System Client Code
   ========================================================================== */

// --- JWT FETCH INTERCEPTOR ---
const originalFetch = window.fetch;
window.fetch = async function () {
  let [resource, config] = arguments;
  if (typeof resource === 'string' && resource.startsWith('/api')) {
    const isRemembered = localStorage.getItem('bakewise_v2_remember_me') === 'true';
    let sessionStr = sessionStorage.getItem('bakewise_v2_session');
    if (!sessionStr && isRemembered) {
      sessionStr = localStorage.getItem('bakewise_v2_session');
    }
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.token) {
          config = config || {};
          config.headers = config.headers || {};
          config.headers['Authorization'] = `Bearer ${session.token}`;
        }
      } catch(e) {}
    }
  }
  const response = await originalFetch(resource, config);
  if ((response.status === 401 || response.status === 403) && typeof resource === 'string' && resource.startsWith('/api') && resource !== '/api/auth/login') {
    const hasToken = config && config.headers && config.headers['Authorization'];
    if (hasToken && (!window.store || window.store.isBackendOnline)) {
      sessionStorage.removeItem('bakewise_v2_session');
      localStorage.removeItem('bakewise_v2_remember_me');
      localStorage.removeItem('bakewise_v2_session');
      localStorage.removeItem('bakewise_token');
      sessionStorage.removeItem('bakewise_token');
      document.documentElement.classList.remove('user-logged-in');
      if (document.getElementById('app-view') && document.getElementById('app-view').style.display !== 'none') {
        window.location.reload();
      }
    }
  }
  return response;
};


// --- GLOBAL DEFAULT BRANCH HELPER ---
function getDefaultBranchId() {
  if (typeof store !== 'undefined' && store && typeof store.getDefaultBranchId === 'function') {
    return store.getDefaultBranchId();
  }
  return 212;
}
window.getDefaultBranchId = getDefaultBranchId;

// --- SAFE DOM HTML SINK HELPER ---
function setSafeHtml(target, htmlString) {
  if (!target) return;
  target.replaceChildren();
  if (htmlString === undefined || htmlString === null || htmlString === "") return;
  const range = document.createRange();
  range.selectNodeContents(target);
  const fragment = range.createContextualFragment(String(htmlString));
  target.appendChild(fragment);
}

// --- PAGINATION STATE VARIABLES ---
let usersCurrentPage = 1;
let salesHistCurrentPage = 1;
let inventoryCurrentPage = 1;
let prodHistCurrentPage = 1;
let wasteHistCurrentPage = 1;
let productsCurrentPage = 1;
let repSalesCurrentPage = 1;
let repWasteCurrentPage = 1;
let repEffCurrentPage = 1;
const ITEMS_PER_PAGE = 10;
let dashBranchesChartPage = 1;
const CHART_BRANCHES_PER_PAGE = 15;
let aiAlertsCurrentPage = 1;
const AI_ALERTS_PER_PAGE = 4;

// --- DATE UTILITY FUNCTIONS (LOCAL TIME SAFE) ---
function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date();
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function parseDateTime(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? new Date() : dateStr;
  if (typeof dateStr === 'number') return new Date(dateStr);
  if (typeof dateStr !== 'string') return new Date(dateStr);

  const clean = dateStr.trim();
  // Match YYYY-MM-DD HH:mm:ss or YYYY-MM-DDTHH:mm:ss
  const dtMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (dtMatch) {
    const y = parseInt(dtMatch[1]);
    const mo = parseInt(dtMatch[2]) - 1;
    const d = parseInt(dtMatch[3]);
    const h = parseInt(dtMatch[4]);
    const mi = parseInt(dtMatch[5]);
    const s = dtMatch[6] ? parseInt(dtMatch[6]) : 0;
    return new Date(y, mo, d, h, mi, s);
  }

  // Match YYYY-MM-DD date only
  const dOnlyMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dOnlyMatch) {
    return new Date(parseInt(dOnlyMatch[1]), parseInt(dOnlyMatch[2]) - 1, parseInt(dOnlyMatch[3]), 8, 0, 0);
  }

  const d = new Date(clean);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatDateTimeDisplay(val) {
  if (!val) return 'N/A';
  const d = (val instanceof Date) ? val : parseDateTime(val);
  if (isNaN(d.getTime())) return String(val);

  const dateFormatted = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const timeFormatted = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${dateFormatted} ${timeFormatted}`;
}

function formatLocalDate(dateObj) {
  let d = dateObj;
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) {
    d = new Date();
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const getRelativeDateString = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return formatLocalDate(d);
};

// --- INITIAL DATABASE SEED DATA & FALLBACK STATE ---
const DEFAULT_PRODUCTS = [
  { id: "p1", name: "Pandesal", category: "Bread", price: 45, cost: 18, shelfLifeDays: 2, repurposeRecipe: "Garlic Croutons or Fine Breadcrumbs" },
  { id: "p2", name: "Special Ensaymada", category: "Pastries", price: 30, cost: 12, shelfLifeDays: 3, repurposeRecipe: "Baked Ensaymada Pudding" },
  { id: "p3", name: "Classic Sliced Bread", category: "Bread", price: 65, cost: 28, shelfLifeDays: 4, repurposeRecipe: "Cinnamon Bread Pudding or French Toast Sliders" },
  { id: "p4", name: "Premium Chocolate Cake", category: "Cakes", price: 380, cost: 160, shelfLifeDays: 5, repurposeRecipe: "Chocolate Truffle Cake Pops" },
  { id: "p5", name: "Spanish Bread", category: "Bread", price: 10, cost: 4, shelfLifeDays: 2, repurposeRecipe: "Bread Pudding Base" },
  { id: "p6", name: "Butter Croissant", category: "Pastries", price: 50, cost: 22, shelfLifeDays: 2, repurposeRecipe: "Double Baked Almond Croissants" },
  { id: "p7", name: "Coke", category: "Drinks", price: 25, cost: 12, shelfLifeDays: 90, repurposeRecipe: "N/A" }
];

const DEFAULT_SALES = [];
const DEFAULT_INVENTORY = [];
const DEFAULT_PRODUCTION = [];
const DEFAULT_WASTE = [];

// --- APP STATE CONTROLLER ---

// --- Secure Logout & Credential Cleanup Helper ---
function clearLoginCredentials() {
  const emailInput = document.getElementById('email-input');
  const passwordInput = document.getElementById('password-input');
  if (emailInput) emailInput.value = '';
  if (passwordInput) {
    passwordInput.value = '';
    passwordInput.setAttribute('type', 'password');
  }
  const togglePassBtn = document.getElementById('btn-toggle-password');
  if (togglePassBtn) {
    togglePassBtn.setAttribute('data-visible', 'false');
    togglePassBtn.setAttribute('aria-label', 'Show password');
    togglePassBtn.setAttribute('title', 'Show password');
  }
  const rememberCheckbox = document.getElementById('remember-me');
  if (rememberCheckbox) rememberCheckbox.checked = false;
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.reset();
}
window.clearLoginCredentials = clearLoginCredentials;

class BakeWiseStore {
  constructor() {
    // One-time data wipe as requested by user
    if (!localStorage.getItem('bakewise_v2_data_cleared_v44')) {
      localStorage.removeItem("bakewise_v2_sales");
      localStorage.removeItem("bakewise_v2_inventory");
      localStorage.removeItem("bakewise_v2_production");
      localStorage.removeItem("bakewise_v2_waste");
      localStorage.removeItem("bakewise_v2_products");
      localStorage.removeItem("bakewise_v2_branches");
      localStorage.setItem('bakewise_v2_data_cleared_v44', 'true');
    }
    this.products = this.load("bakewise_v2_products", DEFAULT_PRODUCTS);
    this._sales = this.load("bakewise_v2_sales", DEFAULT_SALES);
    this._inventory = this.load("bakewise_v2_inventory", DEFAULT_INVENTORY);
    this._production = this.load("bakewise_v2_production", DEFAULT_PRODUCTION);
    this._waste = this.load("bakewise_v2_waste", DEFAULT_WASTE);

    this.branches = this.load("bakewise_v2_branches", []);

    this.users = this.load("bakewise_v2_users", [
      { id: 1, email: "admin@bakewise.com", name: "System Administrator", role: "admin", branch_id: null }
    ]);

    this.isBackendOnline = false;
    // Persist session across refresh within the same tab or reloads
    const isRemembered = localStorage.getItem("bakewise_v2_remember_me") === "true";
    let sessionStr = sessionStorage.getItem("bakewise_v2_session");
    if (!sessionStr && isRemembered) {
      sessionStr = localStorage.getItem("bakewise_v2_session");
    } else if (!sessionStr && !isRemembered) {
      localStorage.removeItem("bakewise_v2_session");
    }
    if (sessionStr) {
      try {
        this.currentUser = JSON.parse(sessionStr);
        // Sync currentUser with latest user data locally
        if (this.currentUser) {
          const freshUser = this.users.find(u => u.email.toLowerCase() === this.currentUser.email.toLowerCase());
          if (freshUser) {
            this.currentUser.role = freshUser.role;
            this.currentUser.name = freshUser.name;
            this.currentUser.branch_id = freshUser.branch_id;
            const branch = this.branches.find(b => b.id === freshUser.branch_id);
            this.currentUser.branch_name = branch ? branch.name : null;
            
            const roleLabels = {
              "manager": "Branch Manager",
              "sales": "Sales Staff",
              "inventory": "Inventory Staff",
              "production": "Baking Crew",
              "admin": "System Administrator"
            };
            this.currentUser.roleLabel = roleLabels[freshUser.role] || "Staff Member";
            
            this.saveSession(this.currentUser);
          }
        }
      } catch(e) {
        this.clearSession();
      }
    } else {
      this.clearSession();
    }
    this.notifications = this.load("bakewise_v2_notifications", []);
  }

  saveSession(user, rememberMe = null) {
    this.currentUser = user;
    if (!user) {
      sessionStorage.removeItem("bakewise_v2_session");
      localStorage.removeItem("bakewise_v2_session");
      localStorage.removeItem("bakewise_v2_remember_me");
      return;
    }

    sessionStorage.setItem("bakewise_v2_session", JSON.stringify(user));
    const isRemembered = rememberMe !== null
      ? Boolean(rememberMe)
      : (localStorage.getItem("bakewise_v2_remember_me") === "true");

    if (isRemembered) {
      localStorage.setItem("bakewise_v2_session", JSON.stringify(user));
      localStorage.setItem("bakewise_v2_remember_me", "true");
    } else {
      localStorage.removeItem("bakewise_v2_session");
      localStorage.removeItem("bakewise_v2_remember_me");
    }
  }

  clearSession() {
    this.currentUser = null;
    sessionStorage.removeItem("bakewise_v2_session");
    localStorage.removeItem("bakewise_v2_session");
    localStorage.removeItem("bakewise_v2_remember_me");
    document.documentElement.classList.remove("user-logged-in");
    if (typeof clearLoginCredentials === "function") {
      clearLoginCredentials();
    }
  }


  // Branch Filtering Getters
  get sales() {
    const branchId = this.getSelectedBranchId();
    if (branchId === 'all') return this._sales;
    return this._sales.filter(s => (s.branchId != null ? s.branchId : s.branch_id) == branchId);
  }
  set sales(val) { this._sales = val; }

  get inventory() {
    const branchId = this.getSelectedBranchId();
    if (branchId === 'all') return this._inventory;
    return this._inventory.filter(i => (i.branchId != null ? i.branchId : i.branch_id) == branchId);
  }
  set inventory(val) { this._inventory = val; }

  get production() {
    const branchId = this.getSelectedBranchId();
    if (branchId === 'all') return this._production;
    return this._production.filter(pr => (pr.branchId != null ? pr.branchId : pr.branch_id) == branchId);
  }
  set production(val) { this._production = val; }

  get waste() {
    const branchId = this.getSelectedBranchId();
    if (branchId === 'all') return this._waste;
    return this._waste.filter(w => (w.branchId != null ? w.branchId : w.branch_id) == branchId);
  }
  set waste(val) { this._waste = val; }

  load(key, fallback) {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    this.save(key, fallback);
    return fallback;
  }

  save(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  commitAll() {
    this.save("bakewise_v2_products", this.products);
    this.save("bakewise_v2_sales", this._sales);
    this.save("bakewise_v2_inventory", this._inventory);
    this.save("bakewise_v2_production", this._production);
    this.save("bakewise_v2_waste", this._waste);
    this.save("bakewise_v2_branches", this.branches);
    this.save("bakewise_v2_users", this.users);
    if (typeof populateSelectDropdowns === 'function') populateSelectDropdowns();
    if (typeof refreshActiveView === 'function') refreshActiveView();
    else if (typeof refreshDashboard === 'function') refreshDashboard();
  }

  async syncWithBackend() {
    this.isBackendOnline = false;
    const activeBranch = this.getSelectedBranchId();
    const queryStr = (activeBranch && activeBranch !== 'all') ? `?branch_id=${activeBranch}` : '';

    try {
      // 1. Unified Fast Batch Sync (1 single network roundtrip instead of 8)
      const res = await fetch(`/api/sync${queryStr}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        this.isBackendOnline = true;

        if (Array.isArray(data.products)) {
          this.products = data.products.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: parseFloat(p.price),
            cost: parseFloat(p.cost),
            shelfLifeDays: p.shelf_life_days,
            repurposeRecipe: p.repurpose_recipe,
            branchId: p.branch_id || null,
            unit: p.unit || 'pcs',
            status: p.status || 'Active',
            description: p.description || ''
          }));
          this.save("bakewise_v2_products", this.products);
        }

        if (Array.isArray(data.branches)) {
          this.branches = data.branches;
          this.save("bakewise_v2_branches", this.branches);
        }

        if (Array.isArray(data.users)) {
          this.users = data.users;
          this.save("bakewise_v2_users", this.users);
        }

        if (Array.isArray(data.sales)) {
          this._sales = data.sales.map(s => {
            const dateStr = s.date ? String(s.date).split('T')[0] : getRelativeDateString(0);
            const bId = s.branch_id != null ? parseInt(s.branch_id) : null;
            return {
              id: s.id.toString(),
              productId: s.product_id,
              product_id: s.product_id,
              qty: parseInt(s.qty),
              price: parseFloat(s.price),
              date: dateStr,
              cashier: s.cashier,
              branchId: bId,
              branch_id: bId
            };
          });
          this.save("bakewise_v2_sales", this._sales);
        }

        if (Array.isArray(data.inventory)) {
          this._inventory = data.inventory.map(inv => {
            const prodDateStr = inv.production_date ? String(inv.production_date).split('T')[0] : getRelativeDateString(0);
            const expDateStr = inv.expiry_date ? String(inv.expiry_date).split('T')[0] : getRelativeDateString(1);
            const bId = inv.branch_id != null ? parseInt(inv.branch_id) : null;
            return {
              id: inv.id.toString(),
              productId: inv.product_id,
              product_id: inv.product_id,
              stockLevel: parseInt(inv.stock_level),
              stock_level: parseInt(inv.stock_level),
              productionDate: prodDateStr,
              production_date: prodDateStr,
              expiryDate: expDateStr,
              expiry_date: expDateStr,
              branchId: bId,
              branch_id: bId,
              unit: inv.unit || 'pcs',
              status: inv.status || 'In Stock',
              batchId: inv.batch_id || null,
              batch_id: inv.batch_id || null,
              productionTime: inv.production_time || '06:00:00',
              expiryTime: inv.expiry_time || '18:00:00',
              degradationPercent: inv.degradation_percent !== undefined ? inv.degradation_percent : 0,
              shelfStatus: inv.shelf_status || 'Fresh'
            };
          });
          this.save("bakewise_v2_inventory", this._inventory);
        }

        if (Array.isArray(data.movements)) {
          this.movements = data.movements;
        }

        if (Array.isArray(data.production)) {
          this._production = data.production.map(p => {
            const dateStr = p.date ? String(p.date).split('T')[0] : getRelativeDateString(0);
            const bId = p.branch_id != null ? parseInt(p.branch_id) : null;
            const bCode = p.code || p.batch_id || `PRD-${p.id}`;
            return {
              id: p.id.toString(),
              productId: p.product_id,
              product_id: p.product_id,
              planned: parseInt(p.planned),
              actual: parseInt(p.actual),
              date: dateStr,
              baker: p.baker,
              status: p.status || 'Completed',
              code: bCode,
              batchId: bCode,
              batch_id: bCode,
              branchId: bId,
              branch_id: bId
            };
          });
          this.save("bakewise_v2_production", this._production);
        }

        if (Array.isArray(data.waste)) {
          this._waste = data.waste.map(w => {
            const dateStr = w.date ? String(w.date).split('T')[0] : getRelativeDateString(0);
            const bId = w.branch_id != null ? parseInt(w.branch_id) : null;
            return {
              id: w.id.toString(),
              productId: w.product_id,
              product_id: w.product_id,
              qty: parseInt(w.qty),
              cost: parseFloat(w.cost),
              reason: w.reason,
              date: dateStr,
              branchId: bId,
              branch_id: bId
            };
          });
          this.save("bakewise_v2_waste", this._waste);
        }

        this.commitAll();
        return true;
      }
    } catch (e) {
      console.warn("Unified /api/sync error, trying parallel fallback:", e.message);
    }

    // 2. Parallel Fallback (runs all fetches simultaneously with Promise.allSettled)
    try {
      const [statusRes, prodRes, brRes, usrRes, sRes, iRes, pRes, wRes] = await Promise.allSettled([
        fetch('/api/status', { cache: 'no-store' }),
        fetch('/api/products', { cache: 'no-store' }),
        fetch('/api/branches', { cache: 'no-store' }),
        fetch('/api/users', { cache: 'no-store' }),
        fetch(`/api/sales${queryStr}`, { cache: 'no-store' }),
        fetch('/api/inventory', { cache: 'no-store' }),
        fetch(`/api/production${queryStr}`, { cache: 'no-store' }),
        fetch(`/api/waste${queryStr}`, { cache: 'no-store' })
      ]);

      if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
        this.isBackendOnline = true;
      }

      if (prodRes.status === 'fulfilled' && prodRes.value.ok) {
        const rawProds = await prodRes.value.json();
        this.products = rawProds.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: parseFloat(p.price),
          cost: parseFloat(p.cost),
          shelfLifeDays: p.shelf_life_days,
          repurposeRecipe: p.repurpose_recipe,
          branchId: p.branch_id || null,
          unit: p.unit || 'pcs',
          status: p.status || 'Active',
          description: p.description || ''
        }));
        this.save("bakewise_v2_products", this.products);
      }

      if (brRes.status === 'fulfilled' && brRes.value.ok) {
        this.branches = await brRes.value.json();
        this.save("bakewise_v2_branches", this.branches);
      }

      if (usrRes.status === 'fulfilled' && usrRes.value.ok) {
        this.users = await usrRes.value.json();
        this.save("bakewise_v2_users", this.users);
      }

      if (sRes.status === 'fulfilled' && sRes.value.ok) {
        const fetchedSales = await sRes.value.json();
        this._sales = fetchedSales.map(s => ({
          id: s.id.toString(),
          productId: s.product_id,
          qty: parseInt(s.qty),
          price: parseFloat(s.price),
          date: s.date ? s.date.split('T')[0] : getRelativeDateString(0),
          cashier: s.cashier,
          branchId: s.branch_id
        }));
        this.save("bakewise_v2_sales", this._sales);
      }

      if (iRes.status === 'fulfilled' && iRes.value.ok) {
        const fetchedInv = await iRes.value.json();
        this._inventory = fetchedInv.map(inv => ({
          id: inv.id.toString(),
          productId: inv.product_id,
          stockLevel: parseInt(inv.stock_level),
          productionDate: inv.production_date ? inv.production_date : (getRelativeDateString(0) + 'T05:00:00'),
          expiryDate: inv.expiry_date ? inv.expiry_date : (getRelativeDateString(1) + 'T05:00:00'),
          branchId: inv.branch_id,
          unit: inv.unit || 'pcs',
          status: inv.status || 'In Stock',
          batchId: inv.batch_id || null,
          productionTime: inv.production_time || '06:00:00',
          expiryTime: inv.expiry_time || '18:00:00',
          degradationPercent: inv.degradation_percent !== undefined ? inv.degradation_percent : 0,
          shelfStatus: inv.shelf_status || 'Fresh'
        }));
        this.save("bakewise_v2_inventory", this._inventory);
      }

      if (pRes.status === 'fulfilled' && pRes.value.ok) {
        const fetchedProd = await pRes.value.json();
        this._production = fetchedProd.map(p => ({
          id: p.id.toString(),
          productId: p.product_id,
          planned: parseInt(p.planned),
          actual: parseInt(p.actual),
          date: p.date ? p.date.split('T')[0] : getRelativeDateString(0),
          baker: p.baker,
          status: p.status,
          code: p.code,
          branchId: p.branch_id
        }));
        this.save("bakewise_v2_production", this._production);
      }

      if (wRes.status === 'fulfilled' && wRes.value.ok) {
        const fetchedWaste = await wRes.value.json();
        this._waste = fetchedWaste.map(w => ({
          id: w.id.toString(),
          productId: w.product_id,
          qty: parseInt(w.qty),
          cost: parseFloat(w.cost),
          reason: w.reason,
          date: w.date ? w.date.split('T')[0] : getRelativeDateString(0),
          branchId: w.branch_id
        }));
        this.save("bakewise_v2_waste", this._waste);
      }

      this.commitAll();
    } catch (err) {
      console.error("Parallel sync error:", err);
    }
  }

  setSelectedBranchId(val) {
    this._selectedBranchId = val;
    const select = document.getElementById("branch-switcher-select");
    if (select && select.value !== val) {
      select.value = val;
    }
  }

  getDefaultBranchId() {
    if (this.currentUser && this.currentUser.branch_id) {
      return parseInt(this.currentUser.branch_id);
    }
    if (this.branches && this.branches.length > 0) {
      return parseInt(this.branches[0].id);
    }
    return 212; // Lasang branch
  }

  getSelectedBranchId() {
    if (this.currentUser && this.currentUser.role !== 'admin') {
      return this.currentUser.branch_id || this.getDefaultBranchId();
    }
    const select = document.getElementById("branch-switcher-select");
    if (select && select.value) return select.value;
    return this._selectedBranchId || 'all';
  }

  logActivity(message, type = 'system', targetBranch = 'all') {
    let finalMessage = message;
    if (type === 'system') {
      const branchId = this.getSelectedBranchId();
      if (branchId !== 'all') {
        const b = this.branches.find(br => br.id === parseInt(branchId));
        if (b) {
          finalMessage += ` [${b.name}]`;
        } else {
          finalMessage += ` [Branch ${branchId}]`;
        }
      } else if (this.currentUser && this.currentUser.role === 'admin') {
        finalMessage += ` [Admin]`;
      }
    }

    const notification = {
      id: "n_" + Date.now(),
      message: finalMessage,
      type: type,
      targetBranch: targetBranch,
      timestamp: new Date().toISOString(),
      readBy: []
    };
    this.notifications.unshift(notification);
    if (this.notifications.length > 50) this.notifications.pop(); // Keep last 50
    this.save("bakewise_v2_notifications", this.notifications);
    if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
  }

  async login(email, password, rememberMe = false) {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return null;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });
      if (res.ok) {
        const user = await res.json();
        this.currentUser = {
          email: user.email,
          role: user.role,
          name: user.name,
          branch_id: user.branch_id,
          branch_name: user.branch_name,
          roleLabel: this.getRoleLabel(user.role),
          token: user.token
        };
        this.saveSession(this.currentUser, rememberMe);
        document.documentElement.classList.add('user-logged-in');
        this.isBackendOnline = true;
        return this.currentUser;
      } else if (res.status === 429) {
        if (typeof showToast !== 'undefined') showToast("Too many login attempts. Please wait before trying again.", "error");
        return null;
      } else {
        return null;
      }
    } catch (e) {
      console.warn("Auth network error:", e);
      return null;
    }
  }

    getRoleLabel(role) {
    const roleLabels = {
      "admin": "Admin",
      "manager": "Manager",
      "sales": "Sales Staff",
      "staff": "Sales Staff",
      "inventory": "Inventory Specialist",
      "production": "Baking Specialist",
      "baker": "Baking Specialist"
    };
    return roleLabels[role] || role || "Staff Member";
  }

  logout() {
    this.clearSession();
  }

  async addProduct(name, category, price, cost, shelfLifeDays, repurposeRecipe, branchId = null, unit = 'pcs', status = 'Active', description = '', initialStock = 0) {
    let maxIdNum = 0;
    this.products.forEach(p => {
      if (p.id && p.id.startsWith("p")) {
        const num = parseInt(p.id.substring(1));
        if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
      }
    });
    const id = "p" + (maxIdNum + 1);
    const bId = (branchId && branchId !== 'all') ? parseInt(branchId) : null;
    const product = {
      id,
      name,
      category,
      price: parseFloat(price),
      cost: parseFloat(cost),
      shelfLifeDays: parseInt(shelfLifeDays),
      repurposeRecipe,
      branchId: bId,
      unit: unit || 'pcs',
      status: status || 'Active',
      description: description || ''
    };

    if (this.isBackendOnline) {
      try {
        const token = localStorage.getItem('bakewise_token') || sessionStorage.getItem('bakewise_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/products', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            id,
            name,
            category,
            price: parseFloat(price),
            cost: parseFloat(cost),
            shelf_life_days: parseInt(shelfLifeDays),
            repurpose_recipe: repurposeRecipe,
            branch_id: bId,
            unit: unit || 'pcs',
            status: status || 'Active',
            description: description || '',
            initial_stock: parseInt(initialStock) || 0
          })
        });
        if (res.ok) {
          const newP = await res.json();
          const pToAdd = {
            id: newP.id || id,
            name: newP.name || name,
            category: newP.category || category,
            price: parseFloat(newP.price || price),
            cost: parseFloat(newP.cost || cost),
            shelfLifeDays: newP.shelf_life_days !== undefined ? newP.shelf_life_days : parseInt(shelfLifeDays),
            repurposeRecipe: newP.repurpose_recipe !== undefined ? newP.repurpose_recipe : repurposeRecipe,
            branchId: newP.branch_id || bId,
            unit: newP.unit || unit || 'pcs',
            status: newP.status || status || 'Active',
            description: newP.description || description || ''
          };
          this.products.push(pToAdd);
          if (parseInt(initialStock) > 0 && bId) {
            await this.syncWithBackend();
          } else {
            this.commitAll();
          }
          return true;
        }
      } catch (e) { console.error(e); }
    }

    this.products.push(product);
    this.commitAll();
    this.logActivity(`Added new product: ${name}`);
    return true;
  }

  async updateProduct(id, productData) {
    if (this.isBackendOnline) {
      try {
        const token = localStorage.getItem('bakewise_token') || sessionStorage.getItem('bakewise_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`/api/products/${id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            name: productData.name,
            category: productData.category,
            price: productData.price,
            cost: productData.cost,
            shelf_life_days: productData.shelfLifeDays,
            repurpose_recipe: productData.repurposeRecipe,
            branch_id: productData.branchId,
            unit: productData.unit,
            status: productData.status,
            description: productData.description
          })
        });
        if (res.ok) {
          const u = await res.json();
          const idx = this.products.findIndex(p => p.id === id);
          if (idx !== -1) {
            this.products[idx] = {
              id: u.id,
              name: u.name,
              category: u.category,
              price: parseFloat(u.price),
              cost: parseFloat(u.cost),
              shelfLifeDays: u.shelf_life_days,
              repurposeRecipe: u.repurpose_recipe,
              branchId: u.branch_id,
              unit: u.unit,
              status: u.status,
              description: u.description
            };
          }
          this.commitAll();
          return true;
        }
      } catch (e) { console.error(e); }
    }

    const idx = this.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.products[idx] = { ...this.products[idx], ...productData };
      this.commitAll();
      this.logActivity(`Updated product: ${productData.name}`);
      return true;
    }
    return false;
  }

  async deleteProduct(id) {
    if (this.isBackendOnline) {
      try {
        const token = localStorage.getItem('bakewise_token') || sessionStorage.getItem('bakewise_token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        await fetch(`/api/products/${id}`, { method: 'DELETE', headers });
      } catch (e) { console.error(e); }
    }
    this.products = this.products.filter(p => p.id !== id);
    this.commitAll();
    this.logActivity(`Deleted product ID: ${id}`);
    return true;
  }

  async addSale(productId, qty, date, cashier) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return false;
    const parsedQty = parseInt(qty);
    if (isNaN(parsedQty) || parsedQty <= 0) return false;
    const branchId = this.getSelectedBranchId() === 'all' ? this.getDefaultBranchId() : parseInt(this.getSelectedBranchId());

    if (this.isBackendOnline) {
      try {
        await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: productId, qty: parsedQty, price: product.price, date, cashier, branch_id: branchId })
        });
      } catch (e) { console.error(e); }
    }

    const sale = { id: "s_" + Date.now(), productId, qty: parsedQty, price: product.price, date, cashier, branchId };
    this._sales.push(sale);

    const inv = this._inventory.find(i => i.productId === productId && i.branchId === branchId);
    if (inv) inv.stockLevel = Math.max(0, inv.stockLevel - parsedQty);

    this.commitAll();
    this.logActivity(`Logged sale: ${parsedQty}x ${product.name}`);
    return true;
  }

  async addInventory(productId, stockQty, prodDate, expDate, targetBranchId, unit = 'pcs', prodTime = '06:00:00', expTime = '18:00:00') {
    const parsedQty = parseInt(stockQty);
    if (isNaN(parsedQty) || parsedQty <= 0) return false;
    const defaultBranchId = (this.branches && this.branches.length > 0) ? parseInt(this.branches[0].id) : 1;
    const branchId = (targetBranchId && targetBranchId !== 'all') ? parseInt(targetBranchId) : (this.getSelectedBranchId() && this.getSelectedBranchId() !== 'all' ? parseInt(this.getSelectedBranchId()) : defaultBranchId);

    if (this.isBackendOnline) {
      try {
        const token = localStorage.getItem('bakewise_token') || sessionStorage.getItem('bakewise_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            product_id: productId,
            stock_level: parsedQty,
            production_date: prodDate,
            expiry_date: expDate,
            branch_id: branchId,
            unit,
            production_time: prodTime,
            expiry_time: expTime,
            performed_by: this.currentUser ? this.currentUser.name : 'Staff'
          })
        });
        if (res.ok) {
          await this.syncWithBackend();
          return true;
        }
      } catch (e) { console.error(e); }
    }

    const existingIndex = this._inventory.findIndex(i => i.productId === productId && i.branchId === branchId);
    if (existingIndex !== -1) {
      this._inventory[existingIndex].stockLevel += parsedQty;
      this._inventory[existingIndex].productionDate = prodDate;
      this._inventory[existingIndex].expiryDate = expDate;
    } else {
      this._inventory.push({ id: "i_" + Date.now(), productId, stockLevel: parsedQty, productionDate: prodDate, expiryDate: expDate, branchId, unit });
    }

    this.commitAll();
    this.logActivity(`Added inventory: ${parsedQty} pcs (Product ID: ${productId})`);
    return true;
  }

  async adjustInventory({ branch_id, product_id, adjustment_type, quantity, reason, notes, performed_by, authorized_by }) {
    if (this.isBackendOnline) {
      const token = localStorage.getItem('bakewise_token') || sessionStorage.getItem('bakewise_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          branch_id: parseInt(branch_id),
          product_id,
          adjustment_type,
          quantity: parseInt(quantity),
          reason,
          notes,
          performed_by: performed_by || (this.currentUser ? this.currentUser.name : 'Staff'),
          authorized_by: authorized_by || 'Branch Manager'
        })
      });
      if (res.ok) {
        await this.syncWithBackend();
        return await res.json();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to adjust inventory');
      }
    }
    return { success: true };
  }

  async transferInventory({ from_branch_id, to_branch_id, product_id, quantity, notes, performed_by, authorized_by }) {
    if (this.isBackendOnline) {
      const token = localStorage.getItem('bakewise_token') || sessionStorage.getItem('bakewise_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/inventory/transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from_branch_id: parseInt(from_branch_id),
          to_branch_id: parseInt(to_branch_id),
          product_id,
          quantity: parseInt(quantity),
          notes,
          performed_by: performed_by || (this.currentUser ? this.currentUser.name : 'Staff'),
          authorized_by: authorized_by || 'Branch Manager'
        })
      });
      if (res.ok) {
        await this.syncWithBackend();
        return await res.json();
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to transfer inventory');
      }
    }
    return { success: true };
  }

  async fetchMovements(filters = {}) {
    if (!this.isBackendOnline) return this.movements || [];
    try {
      const token = localStorage.getItem('bakewise_token') || sessionStorage.getItem('bakewise_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const queryParams = new URLSearchParams();
      if (filters.branch_id && filters.branch_id !== 'all') queryParams.append('branch_id', filters.branch_id);
      if (filters.product_id) queryParams.append('product_id', filters.product_id);
      if (filters.movement_type && filters.movement_type !== 'all') queryParams.append('movement_type', filters.movement_type);
      if (filters.limit) queryParams.append('limit', filters.limit);

      const res = await fetch(`/api/inventory/movements?${queryParams.toString()}`, { headers });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error("fetchMovements error:", e);
    }
    return [];
  }

  async addProduction(productId, planned, actual, date, baker) {
    const parsedPlanned = parseInt(planned);
    const parsedActual = parseInt(actual);
    if (isNaN(parsedPlanned) || isNaN(parsedActual)) return false;

    const branchId = this.getSelectedBranchId() === 'all' ? this.getDefaultBranchId() : parseInt(this.getSelectedBranchId());
    const randCode = "B-" + date.replace(/-/g, '').substring(2) + "-" + Math.floor(Math.random() * 90 + 10);

    if (this.isBackendOnline) {
      try {
        await fetch('/api/production', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: productId, planned: parsedPlanned, actual: parsedActual, date, baker, status: "Completed", code: randCode, branch_id: branchId })
        });
      } catch (e) { console.error(e); }
    }

    this._production.push({ id: "pr_" + Date.now(), productId, planned: parsedPlanned, actual: parsedActual, date, baker, status: "Completed", code: randCode, branchId });

    const product = this.products.find(p => p.id === productId);
    const shelfLife = product ? product.shelfLifeDays : 2;
    const prodDateObj = parseLocalDate(date);
    const expDateObj = new Date(prodDateObj.getTime());
    expDateObj.setDate(expDateObj.getDate() + shelfLife);
    const expString = formatLocalDate(expDateObj);

    await this.addInventory(productId, parsedActual, date, expString);
    this.commitAll();
    this.logActivity(`Logged production: ${parsedActual}x ${productId}`);
    return true;
  }

  async addWaste(productId, qty, reason, date) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return false;

    const parsedQty = parseInt(qty);
    if (isNaN(parsedQty) || parsedQty <= 0) return false;
    const branchId = this.getSelectedBranchId() === 'all' ? this.getDefaultBranchId() : parseInt(this.getSelectedBranchId());

    if (this.isBackendOnline) {
      try {
        await fetch('/api/waste', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: productId, qty: parsedQty, cost: product.cost, reason, date, branch_id: branchId })
        });
      } catch (e) { console.error(e); }
    }

    this._waste.push({ id: "w_" + Date.now(), productId, qty: parsedQty, cost: product.cost, reason, date, branchId });

    const inv = this._inventory.find(i => i.productId === productId && i.branchId === branchId);
    if (inv) inv.stockLevel = Math.max(0, inv.stockLevel - parsedQty);

    this.commitAll();
    this.logActivity(`Logged waste: ${parsedQty}x ${product.name}`);
    return true;
  }

  async addBranch(name, latitude, longitude, address, store_hours, contact_no) {
    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);
    if (isNaN(parsedLat) || isNaN(parsedLng)) return false;

    if (this.isBackendOnline) {
      try {
        const res = await fetch('/api/branches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, latitude: parsedLat, longitude: parsedLng, address, store_hours, contact_no })
        });
        if (res.ok) {
          const newBr = await res.json();
          this.branches.push(newBr);
          this.save("bakewise_v2_branches", this.branches);
          return true;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to register branch.");
        }
      } catch (e) { console.error(e); }
    }

    const newBr = { id: this.branches.length + 1, name, latitude: parsedLat, longitude: parsedLng, address, store_hours, contact_no, status: 'Active' };
    this.branches.push(newBr);
    this.save("bakewise_v2_branches", this.branches);
    this.logActivity(`Added new branch: ${name}`);
    return true;
  }

  async updateBranch(id, name, latitude, longitude, address, store_hours, contact_no, status) {
    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);
    const bId = parseInt(id);

    if (this.isBackendOnline) {
      try {
        const res = await fetch(`/api/branches/${bId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, latitude: parsedLat, longitude: parsedLng, address, store_hours, contact_no, status })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to update branch.");
        }
      } catch (e) { console.error(e); }
    }

    const br = this.branches.find(b => b.id === bId);
    if (br) {
      br.name = name;
      br.latitude = parsedLat;
      br.longitude = parsedLng;
      br.address = address;
      br.store_hours = store_hours;
      br.contact_no = contact_no;
      br.status = status;
      this.save("bakewise_v2_branches", this.branches);
      this.logActivity(`Updated branch: ${name}`);
    }
    return true;
  }

  async syncFromBackend() {
    return this.syncWithBackend();
  }

  async deleteBranch(id) {
    const branchIdStr = id.toString();

    if (this.isBackendOnline) {
      try {
        const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server deletion failed (${res.status})`);
        }
      } catch (e) {
        console.error("Backend branch delete failed:", e);
        throw e;
      }
    }

    // 1. Remove branch itself from local memory
    this.branches = (this.branches || []).filter(b => b.id.toString() !== branchIdStr);
    this.save("bakewise_v2_branches", this.branches);

    // 2. Delete staff accounts assigned to this branch, strictly protecting System Administrator
    this.users = (this.users || []).filter(u => {
      const isBranchUser = u.branch_id !== null && u.branch_id !== undefined && u.branch_id.toString() === branchIdStr;
      const isSysAdmin = u.role === 'admin' || (u.email && u.email.toLowerCase() === 'admin@bakewise.com');
      if (isBranchUser && isSysAdmin) {
        u.branch_id = null; // Admin accounts are global; clear branch association if present
        return true;
      }
      return !isBranchUser;
    });
    this.save("bakewise_v2_users", this.users);

    // 3. Delete inventory records associated with this branch
    this._inventory = (this._inventory || []).filter(inv => {
      return inv.branch_id === null || inv.branch_id === undefined || inv.branch_id.toString() !== branchIdStr;
    });
    this.save("bakewise_v2_inventory", this._inventory);

    // 4. Delete sales records associated with this branch
    this._sales = (this._sales || []).filter(s => {
      return s.branch_id === null || s.branch_id === undefined || s.branch_id.toString() !== branchIdStr;
    });
    this.save("bakewise_v2_sales", this._sales);

    // 5. Delete production records associated with this branch
    this._production = (this._production || []).filter(p => {
      return p.branch_id === null || p.branch_id === undefined || p.branch_id.toString() !== branchIdStr;
    });
    this.save("bakewise_v2_production", this._production);

    // 6. Delete waste records associated with this branch
    this._waste = (this._waste || []).filter(w => {
      return w.branch_id === null || w.branch_id === undefined || w.branch_id.toString() !== branchIdStr;
    });
    this.save("bakewise_v2_waste", this._waste);

    // 7. Delete POS transactions associated with this branch
    if (Array.isArray(this._posTransactions)) {
      this._posTransactions = this._posTransactions.filter(tx => {
        return tx.branch_id === null || tx.branch_id === undefined || tx.branch_id.toString() !== branchIdStr;
      });
      this.save("bakewise_v2_pos_transactions", this._posTransactions);
    }

    // 8. If active selected branch was this branch, reset to 'all'
    if (this.getSelectedBranchId() === branchIdStr) {
      this.setSelectedBranchId('all');
    }

    // Commit all local changes and re-sync with backend if online
    this.commitAll();
    if (this.isBackendOnline) {
      await this.syncWithBackend();
    }

    this.logActivity(`Permanently deleted branch ID ${id} and all associated data.`);
    return true;
  }

  async addUser(name, email, password, role, branchId) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const bId = (role === 'admin' || !branchId) ? null : parseInt(branchId);

    if (this.isBackendOnline) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (this.currentUser && this.currentUser.token) {
          headers['Authorization'] = `Bearer ${this.currentUser.token}`;
        }
        const res = await fetch('/api/users', {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: name.trim(), email: cleanEmail, password: (password || '').trim(), role, branch_id: bId })
        });
        if (res.ok) {
          const newUser = await res.json();
          this.users.push(newUser);
          this.save("bakewise_v2_users", this.users);
          return true;
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server creation failed (${res.status})`);
        }
      } catch (e) {
        console.error("Add user failed:", e);
        throw e;
      }
    }

    const newUser = { id: this.users.length + 1, name: name.trim(), email: cleanEmail, password: (password || '').trim(), role, branch_id: bId };
    this.users.push(newUser);
    this.save("bakewise_v2_users", this.users);
    this.logActivity(`Added new user: ${name}`);
    return true;
  }

  async updateUser(id, name, email, password, role, branchId) {
    const uId = parseInt(id);
    const bId = (role === 'admin' || !branchId) ? null : parseInt(branchId);
    const cleanEmail = (email || '').trim().toLowerCase();

    if (this.isBackendOnline) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (this.currentUser && this.currentUser.token) {
          headers['Authorization'] = `Bearer ${this.currentUser.token}`;
        }
        const res = await fetch(`/api/users/${uId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ name: name.trim(), email: cleanEmail, password: (password || '').trim(), role, branch_id: bId })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server update failed (${res.status})`);
        }
      } catch (e) {
        console.error("Update user failed:", e);
        throw e;
      }
    }

    const usr = this.users.find(u => u.id === uId);
    if (usr) {
      usr.name = name.trim();
      usr.email = cleanEmail;
      if (password && password.trim() !== "") usr.password = password.trim();
      usr.role = role;
      usr.branch_id = bId;
      this.save("bakewise_v2_users", this.users);
      this.logActivity(`Updated user: ${name}`);
    }

    if (this.currentUser && (this.currentUser.id === uId || (this.currentUser.email && this.currentUser.email.toLowerCase() === cleanEmail))) {
      this.currentUser.name = name.trim();
      this.currentUser.role = role;
      this.currentUser.roleLabel = this.getRoleLabel(role);
      this.currentUser.branch_id = bId;
      this.saveSession(this.currentUser);
    }
    return true;
  }

  async deleteUser(id) {
    if (this.isBackendOnline) {
      try { await fetch(`/api/users/${id}`, { method: 'DELETE' }); } catch (e) { console.error(e); }
    }
    this.users = this.users.filter(u => u.id.toString() !== id.toString());
    this.save("bakewise_v2_users", this.users);
    this.logActivity(`Deleted user ID: ${id}`);
    return true;
  }
}

// Global Store Instance
const store = new BakeWiseStore();
window.store = store;

// --- DOM CONTROLLER ---
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();

  if (localStorage.getItem("bakewise_v2_theme") === "dark") {
    document.body.classList.add("dark-mode");
  }

  checkSessionState();

  const todayStr = formatLocalDate(new Date());
  if (document.getElementById("sales-date-input")) document.getElementById("sales-date-input").value = todayStr;
  if (document.getElementById("waste-date-input")) document.getElementById("waste-date-input").value = todayStr;

  populateSelectDropdowns();

  setupThemeToggles();
  setupLoginActions();
  setupNavigation();
  setupFormSubmissions();
  setupAllPasswordToggles();
  setupInventoryModal();
  setupInventoryTransferModal();
  setupInventoryAdjustModal();
  setupInventoryMovementsModal();
  setupProductModal();
  setupShelfLifeModule();
  setupNotifications();
  setupPOSModule();

  // Chart Date Filters
  const dashFilterBtn = document.getElementById("btn-dash-filter-apply");
  if (dashFilterBtn) {
    dashFilterBtn.addEventListener("click", () => {
      renderDashboardSalesWasteChart();
    });
  }

  const repFilterBtn = document.getElementById("btn-rep-filter-apply");
  if (repFilterBtn) {
    repFilterBtn.addEventListener("click", () => {
      refreshReportsPane();
    });
  }

  // Handle branch switcher changes
  const switcher = document.getElementById("branch-switcher-select");
  if (switcher) {
    switcher.addEventListener("focus", function() {
      this.dataset.prevValue = this.value;
    });
    switcher.addEventListener("change", async function() {
      const newValue = this.value;
      const prevValue = this.dataset.prevValue || "all";
      const branchName = this.options[this.selectedIndex].text;
      
      const confirmed = await showConfirmModal(`Are you sure you want to switch to ${branchName}?`, "Switch Branch", "arrow-right-left");
      
      if (!confirmed) {
        this.value = prevValue;
        return;
      }
      
      this.dataset.prevValue = newValue;
      const activePane = document.querySelector(".view-pane.active");
      if (activePane) navigateToPane(activePane.id);
    });
  }
});

// --- ROLE-BASED ACCESS CONTROL ---
function applyRolePermissions(role) {
  const allNavItems = document.querySelectorAll(".nav-item");

  allNavItems.forEach(nav => nav.style.display = "flex");

  if (role === "sales") {
    if (document.getElementById("nav-inventory")) document.getElementById("nav-inventory").style.display = "none";
    if (document.getElementById("nav-production")) document.getElementById("nav-production").style.display = "none";
    if (document.getElementById("nav-waste")) document.getElementById("nav-waste").style.display = "none";
    if (document.getElementById("nav-ai-analytics")) document.getElementById("nav-ai-analytics").style.display = "none";
    if (document.getElementById("nav-reports")) document.getElementById("nav-reports").style.display = "none";
    if (document.getElementById("nav-products")) document.getElementById("nav-products").style.display = "none";
    if (document.getElementById("nav-branches")) document.getElementById("nav-branches").style.display = "none";
    if (document.getElementById("nav-users")) document.getElementById("nav-users").style.display = "none";
  } else if (role === "inventory") {
    if (document.getElementById("nav-sales")) document.getElementById("nav-sales").style.display = "none";
    if (document.getElementById("nav-production")) document.getElementById("nav-production").style.display = "none";
    if (document.getElementById("nav-ai-analytics")) document.getElementById("nav-ai-analytics").style.display = "none";
    if (document.getElementById("nav-reports")) document.getElementById("nav-reports").style.display = "none";
    if (document.getElementById("nav-products")) document.getElementById("nav-products").style.display = "none";
    if (document.getElementById("nav-branches")) document.getElementById("nav-branches").style.display = "none";
    if (document.getElementById("nav-users")) document.getElementById("nav-users").style.display = "none";
  } else if (role === "production") {
    if (document.getElementById("nav-sales")) document.getElementById("nav-sales").style.display = "none";
    if (document.getElementById("nav-inventory")) document.getElementById("nav-inventory").style.display = "none";
    if (document.getElementById("nav-waste")) document.getElementById("nav-waste").style.display = "none";
    if (document.getElementById("nav-reports")) document.getElementById("nav-reports").style.display = "none";
    if (document.getElementById("nav-products")) document.getElementById("nav-products").style.display = "none";
    if (document.getElementById("nav-branches")) document.getElementById("nav-branches").style.display = "none";
    if (document.getElementById("nav-users")) document.getElementById("nav-users").style.display = "none";
  } else if (role === "manager") {
    if (document.getElementById("nav-branches")) document.getElementById("nav-branches").style.display = "none";
    if (document.getElementById("nav-users")) document.getElementById("nav-users").style.display = "none";
  } else if (role === "admin") {
    if (document.getElementById("nav-branches")) document.getElementById("nav-branches").style.display = "flex";
    if (document.getElementById("nav-users")) document.getElementById("nav-users").style.display = "flex";
  }

  const branchChartContainer = document.getElementById("dashboard-branches-chart-container");
  if (branchChartContainer) {
    branchChartContainer.style.display = (role === "admin") ? "grid" : "none";
  }

  const lastPane = localStorage.getItem('bakewise_v2_last_pane');
  if (lastPane) {
    const targetNav = document.querySelector(`.nav-item[data-pane="${lastPane}"]`);
    if (targetNav && targetNav.style.display !== "none") {
      navigateToPane(lastPane);
      return;
    }
  }
  navigateToPane("pane-dashboard");
}

// --- NAVIGATION CONTROLLER ---
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const paneId = item.getAttribute("data-pane");
      navigateToPane(paneId);
    });
  });

  // Explicitly bind ONLY dashboard summary cards to their respective destination panes
  const dashboardCards = document.querySelectorAll("#pane-dashboard .summary-card");
  dashboardCards.forEach(card => {
    if (card.closest('#pane-admin-branches') || card.closest('#pane-admin-users') || card.classList.contains('static-kpi-card')) {
      return;
    }
    card.addEventListener("click", (e) => {
      e.preventDefault();
      if (card.classList.contains("sales")) navigateToPane("pane-sales");
      else if (card.classList.contains("waste")) navigateToPane("pane-waste");
      else if (card.classList.contains("expiry")) navigateToPane("pane-ai-analytics");
      else if (card.classList.contains("inventory")) navigateToPane("pane-inventory");
    });
  });

  const toggleBtn = document.getElementById("btn-menu-toggle");
  const sidebar = document.getElementById("app-sidebar");

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 1024) {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target) && sidebar.classList.contains("open")) {
          sidebar.classList.remove("open");
        }
      }
    });
  }
}

function navigateToPane(paneId) {
  const targetNavCheck = document.querySelector(`.nav-item[data-pane="${paneId}"]`);
  if (targetNavCheck && targetNavCheck.style.display === "none") {
    if (typeof showToast === 'function') {
      showToast("Your account role does not have access to this section", "warning");
    }
    return;
  }

  localStorage.setItem('bakewise_v2_last_pane', paneId);
  const panes = document.querySelectorAll(".view-pane");
  const navItems = document.querySelectorAll(".nav-item");
  const sidebar = document.getElementById("app-sidebar");

  panes.forEach(pane => {
    pane.classList.remove("active");
    pane.style.display = "none";
  });
  navItems.forEach(nav => nav.classList.remove("active"));

  const targetPane = document.getElementById(paneId);
  const targetNav = document.querySelector(`.nav-item[data-pane="${paneId}"]`);

  if (targetPane) {
    targetPane.classList.add("active");
    targetPane.style.display = "block";

    const titleMap = {
      "pane-dashboard": "Dashboard Overview",
      "pane-sales": "Sales Record & POS Logs",
      "pane-inventory": "Bakery Stock Inventory Check",
      "pane-production": "Baking & Production Logs",
      "pane-waste": "Unsold & Defect Waste Tracker",
      "pane-ai-analytics": "Optimization & Analytics",
      "pane-shelf-life": "Shelf Life Prediction & Repurposing",
      "pane-products": "Product Catalog & Pricing Directory",
      "pane-reports": "Performance Reporting Dashboard",
      "pane-admin-users": "Staff Accounts",
      "pane-admin-branches": "Bakeshop Network Branches"
    };
    const titleElem = document.getElementById("current-view-title");
    if (titleElem) titleElem.textContent = titleMap[paneId] || "BakeWise App";
    if (sidebar) sidebar.classList.remove("open");
  }

  if (targetNav) targetNav.classList.add("active");

  if (paneId === "pane-dashboard") refreshDashboard();
  else if (paneId === "pane-sales") refreshSalesPane();
  else if (paneId === "pane-inventory") refreshInventoryPane();
  else if (paneId === "pane-production") refreshProductionPane();
  else if (paneId === "pane-waste") refreshWastePane();
  else if (paneId === "pane-ai-analytics") refreshAIAnalyticsPane();
  else if (paneId === "pane-shelf-life") refreshShelfLifePane();
  else if (paneId === "pane-products") refreshProductsPane();
  else if (paneId === "pane-reports") refreshReportsPane();
  else if (paneId === "pane-admin-users") refreshAdminUsersPane();
  else if (paneId === "pane-admin-branches") refreshAdminBranchesPane();
}
window.navigateToPane = navigateToPane;

// --- HIGH-SPEED REAL-TIME VIEW REFRESHER & AUTO-SYNC ---
function refreshActiveView() {
  const activePane = document.querySelector('.view-pane.active');
  if (!activePane) return;
  const id = activePane.id;
  if (id === 'pane-dashboard') {
    if (typeof refreshDashboard === 'function') refreshDashboard();
  } else if (id === 'pane-sales') {
    if (typeof refreshSalesPane === 'function') refreshSalesPane();
  } else if (id === 'pane-inventory') {
    if (typeof refreshInventoryPane === 'function') refreshInventoryPane();
  } else if (id === 'pane-production') {
    if (typeof refreshProductionPane === 'function') refreshProductionPane();
  } else if (id === 'pane-waste') {
    if (typeof refreshWastePane === 'function') refreshWastePane();
  } else if (id === 'pane-ai-analytics') {
    if (typeof refreshAIAnalyticsPane === 'function') refreshAIAnalyticsPane();
  } else if (id === 'pane-shelf-life') {
    if (typeof refreshShelfLifePane === 'function') refreshShelfLifePane();
  } else if (id === 'pane-products') {
    if (typeof refreshProductsPane === 'function') refreshProductsPane();
  } else if (id === 'pane-reports') {
    if (typeof refreshReportsPane === 'function') refreshReportsPane();
  } else if (id === 'pane-admin-users') {
    if (typeof refreshAdminUsersPane === 'function') refreshAdminUsersPane();
  } else if (id === 'pane-admin-branches') {
    if (typeof refreshAdminBranchesPane === 'function') refreshAdminBranchesPane();
  } else if (id === 'pane-pos') {
    if (typeof renderPosProducts === 'function') renderPosProducts();
    if (typeof updatePosCartUI === 'function') updatePosCartUI();
  }
}
window.refreshActiveView = refreshActiveView;

let bgSyncTimer = null;
function startRealtimeSync() {
  if (bgSyncTimer) clearInterval(bgSyncTimer);
  bgSyncTimer = setInterval(async () => {
    if (store.currentUser && store.isBackendOnline && !document.hidden) {
      await store.syncWithBackend();
    }
  }, 12000); // Live background sync interval
}
window.startRealtimeSync = startRealtimeSync;

window.addEventListener('focus', async () => {
  if (store.currentUser && store.isBackendOnline) {
    await store.syncWithBackend();
    refreshActiveView();
  }
});

document.addEventListener('visibilitychange', async () => {
  if (!document.hidden && store.currentUser && store.isBackendOnline) {
    await store.syncWithBackend();
    refreshActiveView();
  }
});


// --- SESSION CHECK ---
async function checkSessionState() {
  const loginView = document.getElementById("login-view");
  const appView = document.getElementById("app-view");

  if (store.currentUser) {
    document.documentElement.classList.add('user-logged-in');
    loginView.style.display = "none";
    appView.style.display = "flex";

    document.getElementById("header-user-name").textContent = store.currentUser.name;
    document.getElementById("header-user-role").textContent = store.currentUser.roleLabel;

    const initials = store.currentUser.name.split(' ').map(n => n[0]).join('');
    document.getElementById("header-user-avatar").textContent = initials.toUpperCase();

    applyRolePermissions(store.currentUser.role);
    await store.syncWithBackend();

    const branchSwitcher = document.getElementById("header-branch-switcher");
    const switcherSelect = document.getElementById("branch-switcher-select");
    if (branchSwitcher && switcherSelect) {
      if (store.currentUser.role === 'admin') {
        branchSwitcher.style.display = 'flex';
        setSafeHtml(switcherSelect, '<option value="all">All Network Branches</option>' + 
          store.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join(''));
        switcherSelect.disabled = false;
      } else {
        branchSwitcher.style.display = 'none';
        const uBranchId = store.currentUser.branch_id ? parseInt(store.currentUser.branch_id) : 1;
        const userBranch = store.branches.find(b => b.id === uBranchId);
        const branchName = userBranch ? userBranch.name : `Branch ${uBranchId}`;
        setSafeHtml(switcherSelect, `<option value="${uBranchId}">${branchName}</option>`);
        switcherSelect.disabled = true;
      }
    }

    const lastPane = localStorage.getItem("bakewise_v2_last_pane");
    if (lastPane) navigateToPane(lastPane);
    else navigateToPane("pane-dashboard");
  } else {
    document.documentElement.classList.remove('user-logged-in');
    loginView.style.display = "grid";
    appView.style.display = "none";
    if (typeof clearLoginCredentials === "function") {
      clearLoginCredentials();
    }
  }
}

// --- Password Visibility Toggle Controller ---
function setupPasswordToggle(inputElOrId, toggleBtnOrId) {
  const input = typeof inputElOrId === "string" ? document.getElementById(inputElOrId) : inputElOrId;
  const btn = typeof toggleBtnOrId === "string" ? document.getElementById(toggleBtnOrId) : toggleBtnOrId;
  if (!input || !btn) return null;

  const setVisibility = (show) => {
    input.setAttribute("type", show ? "text" : "password");
    btn.setAttribute("data-visible", show ? "true" : "false");
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    btn.setAttribute("title", show ? "Hide password" : "Show password");

    const eyeOpen = btn.querySelector(".eye-open, [data-lucide='eye']");
    const eyeClosed = btn.querySelector(".eye-closed, [data-lucide='eye-off']");
    if (eyeOpen) eyeOpen.style.display = show ? "none" : "block";
    if (eyeClosed) eyeClosed.style.display = show ? "block" : "none";
  };

  // Ensure default hidden state on init
  setVisibility(false);

  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isCurrentlyPassword = input.getAttribute("type") === "password";
    setVisibility(isCurrentlyPassword);
  };

  if (input.form) {
    input.form.addEventListener("reset", () => {
      setTimeout(() => setVisibility(false), 0);
    });
  }

  return { setVisibility };
}

function setupAllPasswordToggles() {
  setupPasswordToggle("password-input", "btn-toggle-password");
  setupPasswordToggle("usr-password-input", "btn-toggle-usr-password");
  setupPasswordToggle("edit-usr-password", "btn-toggle-edit-usr-password");
}

function setupLoginActions() {
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("btn-logout");
  const passwordInput = document.getElementById("password-input");
  const togglePassBtn = document.getElementById("btn-toggle-password");
  const forgotBtn = document.getElementById("link-forgot-password");

  if (forgotBtn) {
    forgotBtn.addEventListener("click", () => {
      showToast("Please contact your system administrator to reset your password.", "info");
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email-input").value;
      const password = document.getElementById("password-input").value;

      const rememberMe = document.getElementById("remember-me") ? document.getElementById("remember-me").checked : false;

      const user = await store.login(email, password, rememberMe);
      if (user) {
        await checkSessionState();
        showToast("Welcome back! Credentials authenticated.", "success");
      } else {
        showToast("Authentication failed. Invalid email or password.", "error");
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      store.logout();
      if (typeof clearLoginCredentials === "function") {
        clearLoginCredentials();
      }
      await checkSessionState();
      showToast("Session disconnected. Goodbye!", "info");
    });
  }

  if (togglePassBtn && passwordInput) {
    setupPasswordToggle(passwordInput, togglePassBtn);
  }

  const btnShowPrivacy = document.getElementById("btn-show-privacy-policy");
  const privacyModal = document.getElementById("privacy-policy-modal");
  const btnPrivacyClose = document.getElementById("btn-privacy-modal-close");
  const btnPrivacyOk = document.getElementById("btn-privacy-modal-ok");
  const confirmOverlay = document.getElementById("confirm-modal-overlay");

  if (btnShowPrivacy && privacyModal) {
    btnShowPrivacy.addEventListener("click", () => {
      privacyModal.style.display = "block";
      if(confirmOverlay) confirmOverlay.style.display = "block";
    });
    
    const closePrivacy = () => {
      privacyModal.style.display = "none";
      if(confirmOverlay) confirmOverlay.style.display = "none";
    };

    if (btnPrivacyClose) btnPrivacyClose.addEventListener("click", closePrivacy);
    if (btnPrivacyOk) btnPrivacyOk.addEventListener("click", closePrivacy);
  }
}

function setupThemeToggles() {
  const toggleBtnLogin = document.getElementById("theme-toggle-login");
  const toggleBtnApp = document.getElementById("theme-toggle-app");

  const toggleHandler = () => {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("bakewise_v2_theme", isDark ? "dark" : "light");
    showToast(`${isDark ? 'Dark' : 'Light'} theme activated.`, "info");

    const activePane = document.querySelector(".view-pane.active");
    if (activePane && activePane.id === "pane-dashboard") refreshDashboard();
    else if (activePane && activePane.id === "pane-ai-analytics") refreshAIAnalyticsPane();
  };

  if (toggleBtnLogin) toggleBtnLogin.addEventListener("click", toggleHandler);
  if (toggleBtnApp) toggleBtnApp.addEventListener("click", toggleHandler);
}

window.branchComboboxes = window.branchComboboxes || {};
window.customComboboxes = window.customComboboxes || {};

class SearchableCombobox {
  constructor(targetElementId, options = {}) {
    this.targetId = targetElementId;
    this.icon = options.icon || 'tag';
    this.placeholder = options.placeholder || 'Search...';
    this.onChange = options.onChange || null;
    this.roleScoped = options.roleScoped || false;
    this.items = options.items || null;
    this.selectedValue = options.defaultValue || '';
    this.wrapper = null;
    this.trigger = null;
    this.dropdown = null;
    this.searchInput = null;
    this.optionsList = null;
    this.hiddenInput = null;
    this.currentItemsList = [];
    this.init();
  }

  init() {
    const existingElement = document.getElementById(this.targetId);
    if (!existingElement) return;

    if (!this.selectedValue && existingElement.value) {
      this.selectedValue = existingElement.value;
    }

    if (!this.items && existingElement.tagName === 'SELECT') {
      this.items = Array.from(existingElement.options).map(opt => ({
        id: opt.value,
        name: opt.text || opt.textContent
      }));
      if (!this.selectedValue) {
        this.selectedValue = existingElement.value || (this.items[0] ? this.items[0].id : '');
      }
    }

    let wrapper = existingElement.closest('.custom-combobox-wrapper, .branch-combobox-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'custom-combobox-wrapper';
      wrapper.id = `combobox-wrapper-${this.targetId}`;

      const existingStyle = existingElement.getAttribute('style');
      if (existingStyle) wrapper.setAttribute('style', existingStyle);

      existingElement.parentNode.insertBefore(wrapper, existingElement);

      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.id = this.targetId;
      hiddenInput.value = this.selectedValue;

      existingElement.parentNode.removeChild(existingElement);
      wrapper.appendChild(hiddenInput);
      this.hiddenInput = hiddenInput;
    } else {
      this.hiddenInput = document.getElementById(this.targetId);
    }

    this.wrapper = wrapper;
    this.setupProperties();

    if (!wrapper.querySelector('.combobox-trigger')) {
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'combobox-trigger';
      setSafeHtml(trigger, `
        <i data-lucide="${this.icon}" class="combobox-icon"></i>
        <span class="combobox-label">Select...</span>
        <i data-lucide="chevron-down" class="combobox-arrow"></i>
      `);
      wrapper.appendChild(trigger);
      this.trigger = trigger;
    } else {
      this.trigger = wrapper.querySelector('.combobox-trigger');
    }

    if (!wrapper.querySelector('.combobox-dropdown')) {
      const dropdown = document.createElement('div');
      dropdown.className = 'combobox-dropdown';
      dropdown.style.display = 'none';
      setSafeHtml(dropdown, `
        <div class="combobox-search-box">
          <i data-lucide="search" class="combobox-search-icon"></i>
          <input type="text" class="combobox-search-input" placeholder="${this.placeholder}" autocomplete="off">
        </div>
        <div class="combobox-options-list"></div>
      `);
      wrapper.appendChild(dropdown);
      this.dropdown = dropdown;
    } else {
      this.dropdown = wrapper.querySelector('.combobox-dropdown');
    }

    this.searchInput = this.dropdown.querySelector('.combobox-search-input');
    this.optionsList = this.dropdown.querySelector('.combobox-options-list');

    this.bindEvents();
    this.render();
  }

  setupProperties() {
    if (!this.hiddenInput || this.hiddenInput._comboboxConfigured) return;
    this.hiddenInput._comboboxConfigured = true;
    const self = this;
    const proto = HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');

    Object.defineProperty(this.hiddenInput, 'value', {
      get() {
        return desc.get.call(this);
      },
      set(val) {
        desc.set.call(this, val);
        self.selectedValue = String(val);
        self.updateTriggerText();
        self.updateOptionHighlights();
      },
      configurable: true
    });

    Object.defineProperty(this.hiddenInput, 'options', {
      get() {
        const list = self.currentItemsList || self.items || [];
        const optsArr = list.map(item => ({
          value: String(item.id),
          text: item.name,
          textContent: item.name
        }));
        optsArr.selectedIndex = self.getSelectedIndex();
        return optsArr;
      },
      configurable: true
    });

    Object.defineProperty(this.hiddenInput, 'selectedIndex', {
      get() {
        return self.getSelectedIndex();
      },
      configurable: true
    });
  }

  getSelectedIndex() {
    const list = this.currentItemsList || this.items || [];
    return list.findIndex(x => String(x.id) === String(this.selectedValue));
  }

  bindEvents() {
    if (this.trigger && !this.trigger.dataset.listening) {
      this.trigger.dataset.listening = 'true';
      this.trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.trigger.disabled) return;
        this.toggleDropdown();
      });
    }

    if (this.searchInput && !this.searchInput.dataset.listening) {
      this.searchInput.dataset.listening = 'true';
      this.searchInput.addEventListener('input', () => {
        this.filterOptions(this.searchInput.value);
      });
    }

    if (!document.datasetGlobalComboboxListening) {
      document.datasetGlobalComboboxListening = 'true';
      document.addEventListener('click', (e) => {
        document.querySelectorAll('.custom-combobox-wrapper.open, .branch-combobox-wrapper.open').forEach(w => {
          if (!w.contains(e.target)) {
            w.classList.remove('open');
            const d = w.querySelector('.combobox-dropdown');
            if (d) d.style.display = 'none';
          }
        });
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.querySelectorAll('.custom-combobox-wrapper.open, .branch-combobox-wrapper.open').forEach(w => {
            w.classList.remove('open');
            const d = w.querySelector('.combobox-dropdown');
            if (d) d.style.display = 'none';
          });
        }
      });
    }
  }

  toggleDropdown() {
    if (this.disabled) return;
    const isOpen = this.wrapper.classList.contains('open');
    if (isOpen) {
      this.closeDropdown();
    } else {
      document.querySelectorAll('.custom-combobox-wrapper.open, .branch-combobox-wrapper.open').forEach(w => {
        w.classList.remove('open');
        const d = w.querySelector('.combobox-dropdown');
        if (d) d.style.display = 'none';
      });

      this.wrapper.classList.add('open');
      this.dropdown.style.display = 'flex';
      this.searchInput.value = '';
      this.filterOptions('');
      setTimeout(() => this.searchInput.focus(), 50);
    }
  }

  closeDropdown() {
    if (this.wrapper) this.wrapper.classList.remove('open');
    if (this.dropdown) this.dropdown.style.display = 'none';
  }

  setItems(newItems) {
    this.items = newItems;
    this.render();
  }

  render() {
    if (!this.hiddenInput) return;
    let list = this.items || [];

    if (this.roleScoped || this.targetId.includes('branch')) {
      const user = store.currentUser;
      const isAdmin = !user || user.role === 'admin';
      const userBranchId = user && user.branch_id ? parseInt(user.branch_id) : 1;

      if (!isAdmin) {
        const uBranch = store.branches.find(b => parseInt(b.id) === userBranchId);
        const bName = uBranch ? uBranch.name : `Branch ${userBranchId}`;
        list = [{ id: String(userBranchId), name: bName }];
        this.selectedValue = String(userBranchId);
        const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        if (desc && desc.set) desc.set.call(this.hiddenInput, String(userBranchId));
        this.trigger.disabled = true;
      } else {
        this.trigger.disabled = false;
      }
    }

    if (this.disabled) {
      this.trigger.disabled = true;
    }

    this.currentItemsList = list;

    if (!this.disabled && list.length > 0 && !list.some(x => String(x.id) === String(this.selectedValue))) {
      this.selectedValue = String(list[0].id);
      const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
      if (desc && desc.set) desc.set.call(this.hiddenInput, this.selectedValue);
    }

    this.populateOptions(list);
    this.updateTriggerText();

    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons({ root: this.wrapper });
    }
  }

  populateOptions(list) {
    if (!this.optionsList) return;
    if (!list || list.length === 0) {
      setSafeHtml(this.optionsList, `<div class="combobox-empty-state">No options found</div>`);
      return;
    }

    setSafeHtml(this.optionsList, list.map(item => {
      const isSelected = String(item.id) === String(this.selectedValue);
      return `
        <div class="combobox-option-item ${isSelected ? 'selected' : ''}" data-id="${item.id}" data-name="${item.name}">
          <span>${item.name}</span>
          ${isSelected ? '<i data-lucide="check" style="width: 14px; height: 14px;"></i>' : ''}
        </div>
      `;
    }).join(''));

    this.optionsList.querySelectorAll('.combobox-option-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = item.getAttribute('data-id');
        this.selectValue(id);
        this.closeDropdown();
      });
    });

    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons({ root: this.optionsList });
    }
  }

  filterOptions(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      this.populateOptions(this.currentItemsList);
      return;
    }
    const filtered = (this.currentItemsList || []).filter(i => i.name.toLowerCase().includes(q));
    this.populateOptions(filtered);
  }

  selectValue(val) {
    this.selectedValue = String(val);
    if (this.hiddenInput) {
      try {
        this.hiddenInput.value = String(val);
        const proto = (this.hiddenInput.tagName === 'SELECT') ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc && desc.set) desc.set.call(this.hiddenInput, String(val));
      } catch (e) {
        try { this.hiddenInput.value = String(val); } catch (_) {}
      }
      try {
        this.hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        this.hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
      } catch (e) {}
    }
    this.updateTriggerText();
    this.updateOptionHighlights();

    if (typeof this.onChange === 'function') {
      try {
        this.onChange(val);
      } catch (e) {
        console.error("Combobox onChange error:", e);
      }
    }
  }

  updateTriggerText() {
    if (!this.trigger) return;
    const label = this.trigger.querySelector('.combobox-label');
    if (!label) return;

    if (this.disabled && this.customDisabledLabel) {
      label.textContent = this.customDisabledLabel;
      return;
    }

    const list = this.currentItemsList || this.items || [];
    const item = list.find(x => String(x.id) === String(this.selectedValue));
    if (item) {
      label.textContent = item.name;
    } else if (this.selectedValue === 'all') {
      label.textContent = 'All Branches';
    } else if (!this.selectedValue) {
      label.textContent = this.placeholder || 'Select...';
    } else {
      label.textContent = this.selectedValue;
    }
  }

  
  setDisabled(disabled, customLabel = null) {
    this.disabled = !!disabled;
    this.customDisabledLabel = customLabel;
    if (this.trigger) {
      this.trigger.disabled = this.disabled;
      if (this.disabled) {
        this.trigger.classList.add('disabled');
        this.trigger.style.opacity = '0.65';
        this.trigger.style.cursor = 'not-allowed';
        this.trigger.style.pointerEvents = 'none';
        this.trigger.style.backgroundColor = 'var(--bg-secondary, #f1f5f9)';
        this.trigger.style.color = 'var(--text-secondary, #8c827a)';
        if (this.wrapper) {
          this.wrapper.classList.remove('open');
          this.wrapper.classList.add('disabled');
        }
        if (this.dropdown) this.dropdown.style.display = 'none';
        if (customLabel) {
          const label = this.trigger.querySelector('.combobox-label');
          if (label) label.textContent = customLabel;
        }
      } else {
        this.trigger.classList.remove('disabled');
        this.trigger.style.opacity = '1';
        this.trigger.style.cursor = 'pointer';
        this.trigger.style.pointerEvents = 'auto';
        this.trigger.style.backgroundColor = '';
        this.trigger.style.color = '';
        if (this.wrapper) this.wrapper.classList.remove('disabled');
        this.updateTriggerText();
      }
    }
    if (this.hiddenInput) {
      this.hiddenInput.disabled = this.disabled;
      if (this.disabled) {
        this.hiddenInput.removeAttribute('required');
      } else {
        this.hiddenInput.setAttribute('required', 'required');
      }
    }
  }

  updateOptionHighlights() {
    if (!this.optionsList) return;
    this.optionsList.querySelectorAll('.combobox-option-item').forEach(item => {
      const isSelected = item.getAttribute('data-id') === String(this.selectedValue);
      item.classList.toggle('selected', isSelected);
      let checkIcon = item.querySelector('[data-lucide="check"], svg.lucide-check');
      if (isSelected && !checkIcon) {
        const i = document.createElement('i');
        i.setAttribute('data-lucide', 'check');
        i.style.width = '14px';
        i.style.height = '14px';
        item.appendChild(i);
        if (window.lucide && window.lucide.createIcons) window.lucide.createIcons({ root: item });
      } else if (!isSelected && checkIcon) {
        checkIcon.remove();
      }
    });
  }
}

window.SearchableCombobox = SearchableCombobox;
window.SearchableBranchCombobox = SearchableCombobox;


function syncRoleBranchField(roleVal, branchComboboxId, branchSelectId) {
  const isSysAdmin = (roleVal || '').trim().toLowerCase() === 'admin';
  const branchCb = window.customComboboxes ? window.customComboboxes[branchComboboxId] : null;
  const branchEl = document.getElementById(branchSelectId);
  const helperEl = document.getElementById(`${branchSelectId}-helper`);
  const branchGroup = branchEl ? (branchEl.closest('.form-group') || branchEl.parentElement) : null;

  if (isSysAdmin) {
    if (branchCb) {
      branchCb.setDisabled(true, 'All Branches');
      branchCb.selectedValue = '';
      if (branchCb.hiddenInput) {
        branchCb.hiddenInput.value = '';
        branchCb.hiddenInput.disabled = true;
        branchCb.hiddenInput.removeAttribute('required');
      }
      branchCb.updateTriggerText();
      branchCb.updateOptionHighlights();
    }
    if (branchEl) {
      branchEl.value = '';
      branchEl.disabled = true;
      branchEl.required = false;
    }
    if (helperEl) {
      helperEl.style.display = 'block';
    }
    if (branchGroup) {
      branchGroup.classList.add('disabled-field-group');
    }
  } else {
    if (branchCb) {
      branchCb.setDisabled(false);
      if (branchCb.hiddenInput) {
        branchCb.hiddenInput.disabled = false;
        branchCb.hiddenInput.setAttribute('required', 'required');
      }
      if (!branchCb.selectedValue || branchCb.selectedValue === '') {
        const availableBranches = store.branches || [];
        if (availableBranches.length > 0) {
          branchCb.selectValue(String(availableBranches[0].id));
        }
      } else {
        branchCb.updateTriggerText();
      }
    }
    if (branchEl) {
      branchEl.disabled = false;
      branchEl.required = true;
      if (!branchEl.value && store.branches && store.branches.length > 0) {
        branchEl.value = store.branches[0].id;
      }
    }
    if (helperEl) {
      helperEl.style.display = 'none';
    }
    if (branchGroup) {
      branchGroup.classList.remove('disabled-field-group');
    }
  }
}
window.syncRoleBranchField = syncRoleBranchField;

function populateSelectDropdowns() {
  window.customComboboxes = window.customComboboxes || {};

  const productItems = (store.products || []).map(p => ({ id: p.id, name: `${p.name} (${p.category})` }));
  const branchItems = (store.branches || []).map(b => ({ id: b.id, name: b.name }));
  const branchFilterItems = [{ id: 'all', name: 'All Branches' }, ...(store.branches || []).map(b => ({ id: b.id, name: b.name }))];

  const initCombobox = (id, config) => {
    if (document.getElementById(id)) {
      if (!window.customComboboxes[id]) {
        window.customComboboxes[id] = new SearchableCombobox(id, config);
      } else {
        if (config.items) window.customComboboxes[id].setItems(config.items);
        else window.customComboboxes[id].render();
      }
      if (id.includes('branch')) {
        window.branchComboboxes[id] = window.customComboboxes[id];
      }
    }
  };

  // Header & Navbar
  initCombobox("branch-switcher-select", {
    icon: "store",
    placeholder: "Search branch...",
    items: branchFilterItems,
    roleScoped: true,
    onChange: (val) => {
      store.setSelectedBranchId(val);
      if (typeof refreshActiveView === 'function') refreshActiveView();
    }
  });

  // Table Branch Filters
  initCombobox("inventory-branch-filter", { icon: "store", placeholder: "Search branch...", items: branchFilterItems, roleScoped: true, onChange: refreshInventoryPane });
  initCombobox("prod-branch-filter", { icon: "store", placeholder: "Search branch...", items: branchFilterItems, roleScoped: true, onChange: refreshProductionPane });
  initCombobox("waste-branch-filter", { icon: "store", placeholder: "Search branch...", items: branchFilterItems, roleScoped: true, onChange: refreshWastePane });
  initCombobox("pos-history-branch", { icon: "store", placeholder: "Search branch...", items: branchFilterItems, roleScoped: true, onChange: refreshPosHistory });

  // Other Table Filters
  initCombobox("prod-status-filter", {
    icon: "activity",
    placeholder: "Search status...",
    items: [{ id: 'all', name: 'All Statuses' }, { id: 'Completed', name: 'Completed' }, { id: 'In Progress', name: 'In Progress' }],
    onChange: refreshProductionPane
  });

  initCombobox("pos-history-payment", {
    icon: "credit-card",
    placeholder: "Search payment...",
    items: [{ id: 'all', name: 'All Payment Methods' }, { id: 'Cash', name: 'Cash' }, { id: 'GCash', name: 'GCash' }, { id: 'Credit Card', name: 'Credit Card' }],
    onChange: refreshPosHistory
  });

  initCombobox("pos-history-status", {
    icon: "activity",
    placeholder: "Search status...",
    items: [{ id: 'all', name: 'All Statuses' }, { id: 'Completed', name: 'Completed' }, { id: 'Voided', name: 'Voided' }],
    onChange: refreshPosHistory
  });

  const userRoleItems = [
    { id: 'admin', name: 'Admin' },
    { id: 'manager', name: 'Manager' },
    { id: 'sales', name: 'Sales Staff' },
    { id: 'inventory', name: 'Inventory Specialist' },
    { id: 'production', name: 'Baking Specialist' }
  ];

  initCombobox("user-role-filter", {
    icon: "shield",
    placeholder: "Search role...",
    items: [{ id: 'all', name: 'All Roles' }, ...userRoleItems],
    onChange: refreshAdminUsersPane
  });

  // Form & Modal Dropdowns
  initCombobox("inv-select-product", { icon: "package", placeholder: "Search product...", items: productItems });
  initCombobox("prod-select-product", { icon: "package", placeholder: "Search product...", items: productItems });
  initCombobox("waste-select-product", { icon: "package", placeholder: "Search product...", items: productItems });
  initCombobox("inv-select-branch", { icon: "store", placeholder: "Search branch...", items: branchItems, roleScoped: true });
  initCombobox("usr-branch-select", { icon: "store", placeholder: "Search branch...", items: branchItems });
  initCombobox("edit-usr-branch", { icon: "store", placeholder: "Search branch...", items: branchItems });

  initCombobox("usr-role-select", {
    icon: "shield",
    placeholder: "Search role...",
    items: userRoleItems,
    onChange: (val) => syncRoleBranchField(val, "usr-branch-select", "usr-branch-select")
  });

  const nativeUsrRoleSelect = document.getElementById("usr-role-select");
  if (nativeUsrRoleSelect && !nativeUsrRoleSelect.dataset.syncBound) {
    nativeUsrRoleSelect.dataset.syncBound = "true";
    nativeUsrRoleSelect.addEventListener("change", (e) => {
      syncRoleBranchField(e.target.value, "usr-branch-select", "usr-branch-select");
    });
  }

  initCombobox("edit-usr-role", {
    icon: "shield",
    placeholder: "Search role...",
    items: userRoleItems,
    onChange: (val) => syncRoleBranchField(val, "edit-usr-branch", "edit-usr-branch")
  });

  const nativeEditUsrRoleSelect = document.getElementById("edit-usr-role");
  if (nativeEditUsrRoleSelect && !nativeEditUsrRoleSelect.dataset.syncBound) {
    nativeEditUsrRoleSelect.dataset.syncBound = "true";
    nativeEditUsrRoleSelect.addEventListener("change", (e) => {
      syncRoleBranchField(e.target.value, "edit-usr-branch", "edit-usr-branch");
    });
  }

  // Initial synchronization for user creation and edit dropdowns
  const activeCreateRole = (window.customComboboxes && window.customComboboxes["usr-role-select"] ? window.customComboboxes["usr-role-select"].selectedValue : null) || document.getElementById("usr-role-select")?.value || "admin";
  syncRoleBranchField(activeCreateRole, "usr-branch-select", "usr-branch-select");

  const activeEditRole = (window.customComboboxes && window.customComboboxes["edit-usr-role"] ? window.customComboboxes["edit-usr-role"].selectedValue : null) || document.getElementById("edit-usr-role")?.value;
  if (activeEditRole) {
    syncRoleBranchField(activeEditRole, "edit-usr-branch", "edit-usr-branch");
  }

  initCombobox("waste-reason-select", {
    icon: "alert-triangle",
    placeholder: "Search reason...",
    items: [{ id: 'Expired', name: 'Expired' }, { id: 'Damaged', name: 'Damaged' }, { id: 'Overproduction', name: 'Overproduction' }, { id: 'Quality Control', name: 'Quality Control' }]
  });

  initCombobox("shelf-storage", {
    icon: "box",
    placeholder: "Search storage...",
    defaultValue: "Covered Room-Temperature Storage",
    items: [
      { id: 'Uncovered Storage', name: 'Uncovered Storage' },
      { id: 'Sealed Packaging', name: 'Sealed Packaging' },
      { id: 'Refrigerated Storage', name: 'Refrigerated Storage' },
      { id: 'Frozen Storage', name: 'Frozen Storage' },
      { id: 'Display Case Storage', name: 'Display Case Storage' },
      { id: 'Covered Room-Temperature Storage', name: 'Covered Room-Temperature Storage' }
    ],
    onChange: () => {
      if (typeof window.triggerShelfLifeCalculation === 'function') {
        window.triggerShelfLifeCalculation({ persist: false });
      }
    }
  });

  initCombobox("edit-br-status", {
    icon: "activity",
    placeholder: "Search status...",
    items: [{ id: 'Active', name: 'Active' }, { id: 'Inactive', name: 'Inactive' }]
  });

  initCombobox("prod-category-select", {
    icon: "tag",
    placeholder: "Search category...",
    items: [{ id: 'Bread', name: 'Bread' }, { id: 'Pastries', name: 'Pastries' }, { id: 'Cakes', name: 'Cakes' }, { id: 'Beverages', name: 'Beverages' }]
  });

  initCombobox("announcement-target", {
    icon: "users",
    placeholder: "Search target...",
    items: [{ id: 'all', name: 'All Staff & Managers' }, { id: 'admins', name: 'Store Managers Only' }, { id: 'staff', name: 'Floor Staff Only' }]
  });

  if (typeof populateShelfBreadTypeDropdown === 'function') {
    populateShelfBreadTypeDropdown();
  }
}

function setupFormSubmissions() {
  const salesForm = document.getElementById("sales-entry-form");
  if (salesForm) {
    salesForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pId = document.getElementById("sales-select-product").value;
      const qty = document.getElementById("sales-qty-input").value;
      const date = document.getElementById("sales-date-input").value;

      const success = await store.addSale(pId, qty, date, store.currentUser ? store.currentUser.name : "Staff");
      if (success) {
        showToast("Sales transaction logged.", "success");
        salesForm.reset();
        document.getElementById("sales-date-input").value = formatLocalDate(new Date());
        refreshSalesPane();
      } else showToast("Error recording sale.", "error");
    });
  }

  const prodForm = document.getElementById("production-entry-form");
  if (prodForm) {
    prodForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pId = document.getElementById("prod-select-product").value;
      const planned = document.getElementById("prod-planned-input").value;
      const actual = document.getElementById("prod-actual-input").value;
      const todayStr = formatLocalDate(new Date());

      const success = await store.addProduction(pId, planned, actual, todayStr, store.currentUser ? store.currentUser.name : "Baker");
      if (success) {
        showToast("Production batch logged. Inventory updated.", "success");
        prodForm.reset();
        refreshProductionPane();
      } else showToast("Error logging production run.", "error");
    });
  }

  const wasteForm = document.getElementById("waste-entry-form");
  if (wasteForm) {
    wasteForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pId = document.getElementById("waste-select-product").value;
      const qty = document.getElementById("waste-qty-input").value;
      const reason = document.getElementById("waste-reason-select").value;
      const date = document.getElementById("waste-date-input").value;

      const success = await store.addWaste(pId, qty, reason, date);
      if (success) {
        showToast("Waste transaction logged.", "success");
        wasteForm.reset();
        document.getElementById("waste-date-input").value = formatLocalDate(new Date());
        refreshWastePane();
      } else showToast("Error recording waste event.", "error");
    });
  }

  const userForm = document.getElementById("admin-user-form");
  if (userForm) {
    const usrPassController = setupPasswordToggle("usr-password-input", "btn-toggle-usr-password");
    userForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!(await showConfirmModal("Are you sure you want to register this user account?"))) return;

      const name = document.getElementById("usr-name-input").value;
      const email = document.getElementById("usr-email-input").value.trim();

      if (!email.endsWith("@bakewise.com")) {
        showToast("Only @bakewise.com email addresses are allowed.", "error");
        return;
      }

      const password = document.getElementById("usr-password-input").value;
      const role = document.getElementById("usr-role-select").value;
      const branchId = document.getElementById("usr-branch-select").value;

      if (!role) {
        showToast("Please select a system role.", "error");
        return;
      }
      if (role !== "admin" && !branchId) {
        showToast("Please assign a branch to this staff member.", "error");
        return;
      }

      const assignedBranch = role === "admin" ? null : branchId;
      try {
        const success = await store.addUser(name, email, password, role, assignedBranch);
        if (success) {
          showToast("Staff account registered.", "success");
          userForm.reset();
          if (usrPassController) usrPassController.setVisibility(false);
          const usrRoleCb = window.customComboboxes ? window.customComboboxes["usr-role-select"] : null;
          if (usrRoleCb) usrRoleCb.selectValue("admin");
          syncRoleBranchField("admin", "usr-branch-select", "usr-branch-select");
          refreshAdminUsersPane();
        }
      } catch (err) {
        showToast(err.message || "Error creating user account.", "error");
      }
    });
  }

  bindContactNumberSanitizer("br-contact-input");
  bindContactNumberSanitizer("edit-br-contact");
  setupStoreHoursPickers();

  const branchForm = document.getElementById("admin-branch-form");
  if (branchForm) {
    branchForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const contactNo = (document.getElementById("br-contact-input")?.value || "").trim();
      if (!isValidPhContactNumber(contactNo)) {
        showToast("Please enter a valid Philippine contact number using numbers only.", "error");
        const contactInput = document.getElementById("br-contact-input");
        if (contactInput) contactInput.focus();
        return;
      }

      if (!(await showConfirmModal("Are you sure you want to register this new branch?"))) return;

      const is24Hours = document.getElementById("br-24hours-checkbox")?.checked;
      const openTime = document.getElementById("br-open-time")?.value;
      const closeTime = document.getElementById("br-close-time")?.value;

      if (!is24Hours) {
        if (!openTime || !closeTime) {
          showToast("Please select both opening and closing times.", "error");
          return;
        }
        if (openTime === closeTime) {
          showToast("Opening and closing times cannot be identical. Select 24 Hours Open for round-the-clock operations.", "error");
          return;
        }
      }

      const storeHours = buildStoreHoursString(is24Hours, openTime, closeTime);

      const name = document.getElementById("br-name-input").value;
      const lat = document.getElementById("br-lat-input")?.value || 14.5995;
      const lng = document.getElementById("br-lng-input")?.value || 120.9842;
      const address = document.getElementById("br-address-input").value;

      try {
        const success = await store.addBranch(name, lat, lng, address, storeHours, contactNo);
        if (success) {
          showToast("Branch registered.", "success");
          branchForm.reset();
          populateSelectDropdowns();
          refreshAdminBranchesPane();
        } else {
          showToast("Error registering branch.", "error");
        }
      } catch (err) {
        showToast(err.message || "Error registering branch.", "error");
      }
    });
  }

  const branchEditForm = document.getElementById("branch-edit-form");
  if (branchEditForm) {
    branchEditForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const contactNo = (document.getElementById("edit-br-contact")?.value || "").trim();
      if (!isValidPhContactNumber(contactNo)) {
        showToast("Please enter a valid Philippine contact number using numbers only.", "error");
        const editContactInput = document.getElementById("edit-br-contact");
        if (editContactInput) editContactInput.focus();
        return;
      }

      if (!(await showConfirmModal("Are you sure you want to save changes to this branch?"))) return;

      const is24Hours = document.getElementById("edit-br-24hours-checkbox")?.checked;
      const openTime = document.getElementById("edit-br-open-time")?.value;
      const closeTime = document.getElementById("edit-br-close-time")?.value;

      if (!is24Hours) {
        if (!openTime || !closeTime) {
          showToast("Please select both opening and closing times.", "error");
          return;
        }
        if (openTime === closeTime) {
          showToast("Opening and closing times cannot be identical. Select 24 Hours Open for round-the-clock operations.", "error");
          return;
        }
      }

      const storeHours = buildStoreHoursString(is24Hours, openTime, closeTime);

      const id = document.getElementById("edit-branch-id").value;
      const name = document.getElementById("edit-br-name").value;
      const status = document.getElementById("edit-br-status").value;
      const address = document.getElementById("edit-br-address").value;
      const branch = store.branches.find(b => b.id === parseInt(id));
      const lat = branch ? branch.latitude : 300;
      const lng = branch ? branch.longitude : 200;

      try {
        await store.updateBranch(id, name, lat, lng, address, storeHours, contactNo, status);
        document.getElementById("branch-edit-modal").style.display = "none";
        document.getElementById("modal-overlay").classList.remove("visible");
        populateSelectDropdowns();
        await refreshAdminBranchesPane();
        showToast("Branch updated successfully.", "success");
      } catch (err) {
        showToast(err.message || "Failed to update branch.", "error");
      }
    });
  }

  const userEditForm = document.getElementById("user-edit-form");
  if (userEditForm) {
    const editPassController = setupPasswordToggle("edit-usr-password", "btn-toggle-edit-usr-password");
    userEditForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!(await showConfirmModal("Are you sure you want to save changes to this staff account?"))) return;

      const id = document.getElementById("edit-user-id").value;
      const name = document.getElementById("edit-usr-name").value;
      const email = document.getElementById("edit-usr-email").value.trim();

      if (!email.endsWith("@bakewise.com")) {
        showToast("Only @bakewise.com email addresses are allowed.", "error");
        return;
      }

      const password = document.getElementById("edit-usr-password").value;
      const role = document.getElementById("edit-usr-role").value;
      const branchId = document.getElementById("edit-usr-branch").value;
      const assignedBranch = role === "admin" ? null : branchId;

      try {
        const success = await store.updateUser(id, name, email, password, role, assignedBranch);
        if (success) {
          if (editPassController) editPassController.setVisibility(false);
          document.getElementById("edit-usr-password").value = "";
          document.getElementById("user-edit-modal").style.display = "none";
          document.getElementById("modal-overlay").classList.remove("visible");
          await refreshAdminUsersPane();
          showToast("Staff account updated successfully.", "success");
        }
      } catch (err) {
        showToast(err.message || "Failed to update staff account.", "error");
      }
    });
  }

  const btnSwitchBranch = document.getElementById("btn-switch-to-branch");
  if (btnSwitchBranch) {
    btnSwitchBranch.addEventListener("click", () => {
      const bId = document.getElementById("edit-branch-id").value;
      const switcher = document.getElementById("branch-switcher-select");
      if (switcher) {
        switcher.value = bId;
        switcher.dispatchEvent(new Event("change"));
        document.getElementById("branch-edit-modal").style.display = "none";
        document.getElementById("modal-overlay").classList.remove("visible");
        navigateToPane("pane-dashboard");
        showToast("Switched active view to selected branch.", "info");
      }
    });
  }

  const printBtn = document.getElementById("btn-print-report");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      document.body.classList.remove('printing-pos-receipt');
      const activeBranchName = store.getCurrentBranchName ? store.getCurrentBranchName() : 'Network Wide';
      const nowStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const tsElem = document.getElementById("print-report-timestamp");
      if (tsElem) {
        tsElem.textContent = `Generated: ${nowStr} | Location: ${activeBranchName} | Rose Bakeshop x BakeWise Enterprise`;
      }
      window.print();
    });
  }

  // Export Custom Reports to CSV
  const csvExportBtn = document.getElementById("btn-export-report-csv");
  if (csvExportBtn && !csvExportBtn.dataset.bound) {
    csvExportBtn.dataset.bound = "true";
    csvExportBtn.addEventListener("click", () => {
      exportCustomReportToCsv();
    });
  }


}

// --- MODALS & DIALOGS ---
function setupInventoryModal() {
  const modal = document.getElementById("inventory-modal");
  const overlay = document.getElementById("modal-overlay");
  const openBtn = document.getElementById("btn-add-inventory-modal");
  const closeBtn = document.getElementById("btn-inventory-modal-close");
  const cancelBtn = document.getElementById("btn-inventory-modal-cancel");
  const addForm = document.getElementById("inventory-add-form");

  const updateExpDate = () => {
    const prodSelect = document.getElementById("inv-select-product");
    const pId = prodSelect ? prodSelect.value : null;
    const product = store.products.find(p => p.id === pId);
    const shelfLife = product ? product.shelfLifeDays : 2;

    const prodDateStr = document.getElementById("inv-prod-date").value;
    if (prodDateStr) {
      const pDate = new Date(prodDateStr);
      if (!isNaN(pDate.getTime())) {
        pDate.setDate(pDate.getDate() + shelfLife);
        const expFormatted = new Date(pDate.getTime() - pDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        document.getElementById("inv-exp-date").value = expFormatted;
      }
    }
  };

  const prodSelectEl = document.getElementById("inv-select-product");
  const prodDateEl = document.getElementById("inv-prod-date");
  if (prodSelectEl) prodSelectEl.addEventListener("change", updateExpDate);
  if (prodDateEl) prodDateEl.addEventListener("input", updateExpDate);
  if (prodDateEl) prodDateEl.addEventListener("change", updateExpDate);

  const openModal = () => {
    modal.style.display = "block";
    overlay.style.display = "block";
    const now = new Date();
    const nowFormatted = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById("inv-prod-date").value = nowFormatted;
    
    const branchSelect = document.getElementById("inv-select-branch");
    if (branchSelect && store.currentUser) {
      if (store.currentUser.role === 'admin') {
        branchSelect.disabled = false;
        const currentBranch = store.getSelectedBranchId();
        branchSelect.value = currentBranch === 'all' ? store.getDefaultBranchId() : currentBranch;
      } else {
        branchSelect.value = store.currentUser.branch_id || store.getDefaultBranchId();
        branchSelect.disabled = true;
      }
    }
    
    updateExpDate();
  };

  const closeModal = () => {
    modal.style.display = "none";
    overlay.style.display = "none";
    if (addForm) addForm.reset();
  };

  if (openBtn) openBtn.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
  if (overlay) overlay.addEventListener("click", closeModal);

  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const bId = document.getElementById("inv-select-branch").value;
      const pId = document.getElementById("inv-select-product").value;
      const qty = document.getElementById("inv-stock-input").value;
      const prodDate = document.getElementById("inv-prod-date").value;
      const expDate = document.getElementById("inv-exp-date").value;

      await store.addInventory(pId, qty, prodDate, expDate, bId);
      showToast("Inventory stock updated.", "success");
      closeModal();
      refreshInventoryPane();
    });
  }
}

function setupProductModal() {
  const modal = document.getElementById("product-modal");
  const overlay = document.getElementById("modal-overlay");
  const openBtn = document.getElementById("btn-add-product-modal");
  const closeBtn = document.getElementById("btn-product-modal-close");
  const cancelBtn = document.getElementById("btn-product-modal-cancel");
  const form = document.getElementById("product-form");

  const openModal = (product = null) => {
    const branchSel = document.getElementById("prod-branch-select");
    if (branchSel) {
      const branches = store.branches || [];
      branchSel.innerHTML = `<option value="all">All Branches (Global Master)</option>` + 
        branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

      if (store.currentUser && store.currentUser.role !== 'admin') {
        branchSel.value = store.currentUser.branch_id || store.currentUser.branchId || 'all';
        branchSel.disabled = true;
      } else {
        branchSel.disabled = false;
      }
    }

    const initStockGroup = document.getElementById("prod-initial-stock-group");

    if (product) {
      document.getElementById("product-modal-title").textContent = "Edit Bakery Product";
      document.getElementById("product-id-hidden").value = product.id;
      document.getElementById("prod-name-input").value = product.name;
      document.getElementById("prod-category-select").value = product.category;
      document.getElementById("prod-price-input").value = product.price;
      document.getElementById("prod-cost-input").value = product.cost;
      document.getElementById("prod-shelflife-input").value = product.shelfLifeDays;
      document.getElementById("prod-repurpose-input").value = product.repurposeRecipe || "";
      if (document.getElementById("prod-unit-select")) document.getElementById("prod-unit-select").value = product.unit || "pcs";
      if (document.getElementById("prod-status-select")) document.getElementById("prod-status-select").value = product.status || "Active";
      if (branchSel) branchSel.value = product.branchId || "all";
      if (initStockGroup) initStockGroup.style.display = "none";
    } else {
      document.getElementById("product-modal-title").textContent = "Add Bakery Product";
      if (form) form.reset();
      document.getElementById("product-id-hidden").value = "";
      if (branchSel && store.getSelectedBranchId() !== 'all') {
        branchSel.value = store.getSelectedBranchId();
      }
      if (initStockGroup) initStockGroup.style.display = "block";
    }
    if (modal) {
      modal.style.display = "block";
      modal.style.zIndex = "1000";
    }
    if (overlay) {
      overlay.style.display = "block";
      overlay.classList.add("visible");
    }
  };

  const closeModal = () => {
    if (modal) modal.style.display = "none";
    if (overlay) {
      overlay.style.display = "none";
      overlay.classList.remove("visible");
    }
    if (form) form.reset();
  };

  window.openEditProductModal = openModal;

  if (openBtn) openBtn.addEventListener("click", () => openModal());
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
  if (overlay) overlay.addEventListener("click", closeModal);

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!(await showConfirmModal("Are you sure you want to save this product?"))) return;

      const pId = document.getElementById("product-id-hidden").value;
      const name = document.getElementById("prod-name-input").value;
      const category = document.getElementById("prod-category-select").value;
      const price = parseFloat(document.getElementById("prod-price-input").value);
      const cost = parseFloat(document.getElementById("prod-cost-input").value);
      const shelfLifeDays = parseInt(document.getElementById("prod-shelflife-input").value);
      const repurposeRecipe = document.getElementById("prod-repurpose-input").value;
      const branchSelVal = document.getElementById("prod-branch-select")?.value || 'all';
      const branchId = (branchSelVal && branchSelVal !== 'all') ? parseInt(branchSelVal) : null;
      const unit = document.getElementById("prod-unit-select")?.value || 'pcs';
      const status = document.getElementById("prod-status-select")?.value || 'Active';
      const initialStock = parseInt(document.getElementById("prod-initial-stock-input")?.value || 0);

      if (pId) {
        await store.updateProduct(pId, { name, category, price, cost, shelfLifeDays, repurposeRecipe, branchId, unit, status });
        showToast("Product details updated.", "success");
      } else {
        await store.addProduct(name, category, price, cost, shelfLifeDays, repurposeRecipe, branchId, unit, status, '', initialStock);
        showToast("New product added to catalog.", "success");
      }
      populateSelectDropdowns();
      closeModal();
      refreshProductsPane();
    });
  }
}

function setupInventoryTransferModal() {
  const modal = document.getElementById("inventory-transfer-modal");
  const overlay = document.getElementById("modal-overlay");
  const openBtn = document.getElementById("btn-transfer-inventory-modal");
  const closeBtn = document.getElementById("btn-transfer-modal-close");
  const cancelBtn = document.getElementById("btn-transfer-modal-cancel");
  const form = document.getElementById("inventory-transfer-form");
  const fromBranchSel = document.getElementById("transfer-from-branch");
  const toBranchSel = document.getElementById("transfer-to-branch");
  const prodSel = document.getElementById("transfer-product-select");
  const availNote = document.getElementById("transfer-avail-stock-note");

  const updateAvailStock = () => {
    if (!fromBranchSel || !prodSel || !availNote) return;
    const bId = parseInt(fromBranchSel.value);
    const pId = prodSel.value;
    const inv = (store.inventory || []).find(i => parseInt(i.branchId) === bId && i.productId === pId);
    const stock = inv ? inv.stockLevel : 0;
    availNote.textContent = `Available stock in source branch: ${stock} pcs`;
  };

  const populateTransferDropdowns = (preSelectedBranch = null, preSelectedProduct = null) => {
    if (!fromBranchSel || !toBranchSel || !prodSel) return;
    const branches = store.branches || [];
    fromBranchSel.innerHTML = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    toBranchSel.innerHTML = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    prodSel.innerHTML = (store.products || []).map(p => `<option value="${p.id}">${p.name} (${p.category})</option>`).join('');

    if (store.currentUser && store.currentUser.role !== 'admin') {
      fromBranchSel.value = store.currentUser.branch_id || store.currentUser.branchId || branches[0]?.id;
      fromBranchSel.disabled = true;
    } else {
      fromBranchSel.disabled = false;
      if (preSelectedBranch) fromBranchSel.value = preSelectedBranch;
      else if (store.getSelectedBranchId() !== 'all') fromBranchSel.value = store.getSelectedBranchId();
    }

    if (branches.length > 1) {
      const other = branches.find(b => parseInt(b.id) !== parseInt(fromBranchSel.value));
      if (other) toBranchSel.value = other.id;
    }

    if (preSelectedProduct) prodSel.value = preSelectedProduct;
    updateAvailStock();
  };

  fromBranchSel?.addEventListener("change", updateAvailStock);
  prodSel?.addEventListener("change", updateAvailStock);

  window.openTransferModal = (branchId = null, productId = null) => {
    populateTransferDropdowns(branchId, productId);
    if (modal) modal.style.display = "block";
    if (overlay) {
      overlay.style.display = "block";
      overlay.classList.add("visible");
    }
  };

  const closeModal = () => {
    if (modal) modal.style.display = "none";
    if (overlay) {
      overlay.style.display = "none";
      overlay.classList.remove("visible");
    }
    if (form) form.reset();
  };

  if (openBtn) openBtn.addEventListener("click", () => window.openTransferModal());
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fromBranch = fromBranchSel.value;
      const toBranch = toBranchSel.value;
      const prodId = prodSel.value;
      const qty = parseInt(document.getElementById("transfer-quantity-input").value);
      const notes = document.getElementById("transfer-notes-input").value;

      if (parseInt(fromBranch) === parseInt(toBranch)) {
        showToast("Source and destination branch cannot be the same.", "error");
        return;
      }

      if (!(await showConfirmModal(`Transfer ${qty} units of this product to destination branch?`))) return;

      try {
        await store.transferInventory({
          from_branch_id: fromBranch,
          to_branch_id: toBranch,
          product_id: prodId,
          quantity: qty,
          notes,
          performed_by: store.currentUser ? store.currentUser.name : 'Staff',
          authorized_by: store.currentUser ? store.currentUser.name : 'Branch Manager'
        });
        showToast("Stock transfer completed successfully.", "success");
        closeModal();
        refreshInventoryPane();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }
}

function setupInventoryAdjustModal() {
  const modal = document.getElementById("inventory-adjust-modal");
  const overlay = document.getElementById("modal-overlay");
  const closeBtn = document.getElementById("btn-adjust-modal-close");
  const cancelBtn = document.getElementById("btn-adjust-modal-cancel");
  const form = document.getElementById("inventory-adjust-form");
  const branchSel = document.getElementById("adjust-branch-select");
  const prodSel = document.getElementById("adjust-product-select");
  const stockNote = document.getElementById("adjust-current-stock-note");

  const updateCurrentStock = () => {
    if (!branchSel || !prodSel || !stockNote) return;
    const bId = parseInt(branchSel.value);
    const pId = prodSel.value;
    const inv = (store.inventory || []).find(i => parseInt(i.branchId) === bId && i.productId === pId);
    const stock = inv ? inv.stockLevel : 0;
    stockNote.textContent = `Current branch stock: ${stock} pcs`;
  };

  const populateAdjustDropdowns = (preSelectedBranch = null, preSelectedProduct = null) => {
    if (!branchSel || !prodSel) return;
    const branches = store.branches || [];
    branchSel.innerHTML = branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
    prodSel.innerHTML = (store.products || []).map(p => `<option value="${p.id}">${p.name} (${p.category})</option>`).join('');

    if (store.currentUser && store.currentUser.role !== 'admin') {
      branchSel.value = store.currentUser.branch_id || store.currentUser.branchId || branches[0]?.id;
      branchSel.disabled = true;
    } else {
      branchSel.disabled = false;
      if (preSelectedBranch) branchSel.value = preSelectedBranch;
      else if (store.getSelectedBranchId() !== 'all') branchSel.value = store.getSelectedBranchId();
    }

    if (preSelectedProduct) prodSel.value = preSelectedProduct;
    updateCurrentStock();
  };

  branchSel?.addEventListener("change", updateCurrentStock);
  prodSel?.addEventListener("change", updateCurrentStock);

  window.openAdjustModal = (branchId = null, productId = null) => {
    populateAdjustDropdowns(branchId, productId);
    if (modal) modal.style.display = "block";
    if (overlay) {
      overlay.style.display = "block";
      overlay.classList.add("visible");
    }
  };

  const closeModal = () => {
    if (modal) modal.style.display = "none";
    if (overlay) {
      overlay.style.display = "none";
      overlay.classList.remove("visible");
    }
    if (form) form.reset();
  };

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const bId = branchSel.value;
      const pId = prodSel.value;
      const adjType = document.getElementById("adjust-type-select").value;
      const qty = parseInt(document.getElementById("adjust-quantity-input").value);
      const reason = document.getElementById("adjust-reason-input").value;

      if (!(await showConfirmModal(`Apply ${adjType} of ${qty} units?`))) return;

      try {
        await store.adjustInventory({
          branch_id: bId,
          product_id: pId,
          adjustment_type: adjType,
          quantity: qty,
          reason,
          notes: reason,
          performed_by: store.currentUser ? store.currentUser.name : 'Staff',
          authorized_by: store.currentUser ? store.currentUser.name : 'Branch Manager'
        });
        showToast("Stock adjustment saved successfully.", "success");
        closeModal();
        refreshInventoryPane();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }
}

function setupInventoryMovementsModal() {
  const modal = document.getElementById("inventory-movements-modal");
  const overlay = document.getElementById("modal-overlay");
  const openBtn = document.getElementById("btn-inventory-movements-modal");
  const closeBtn = document.getElementById("btn-movements-modal-close");
  const branchFilter = document.getElementById("movements-branch-filter");
  const typeFilter = document.getElementById("movements-type-filter");
  const tbody = document.getElementById("movements-tbody");

  const loadMovements = async () => {
    if (!tbody) return;
    const bId = branchFilter ? branchFilter.value : 'all';
    const type = typeFilter ? typeFilter.value : 'all';

    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--text-muted);">Loading movement history...</td></tr>`;

    const movements = await store.fetchMovements({ branch_id: bId, movement_type: type, limit: 100 });
    if (!movements || movements.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--text-muted);">No stock movement records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = movements.map(m => {
      const typeBadgeClass = (m.movement_type || '').includes('In') || (m.movement_type || '').includes('Adjustment') ? 'success' : ((m.movement_type || '').includes('Damaged') || (m.movement_type || '').includes('Expired') ? 'danger' : 'info');
      const formattedDate = formatDateTimeDisplay(m.created_at);
      const qtySign = m.quantity > 0 ? `+${m.quantity}` : `${m.quantity}`;
      const qtyColor = m.quantity > 0 ? 'var(--color-success)' : 'var(--color-error)';

      return `
        <tr>
          <td style="font-size: 0.82rem; color: var(--text-secondary);">${formattedDate}</td>
          <td><span class="badge ${typeBadgeClass}">${m.movement_type}</span></td>
          <td style="font-weight: 600;">${m.branch_name || ('Branch ' + m.branch_id)}</td>
          <td style="font-weight: 700;">${m.product_name || m.product_id}</td>
          <td style="font-weight: 700; color: ${qtyColor};">${qtySign} ${m.unit || 'pcs'}</td>
          <td style="font-size: 0.85rem;">${m.previous_stock} &rarr; <b>${m.new_stock}</b></td>
          <td style="font-size: 0.82rem; color: var(--text-secondary);">${m.notes || m.reason || m.reference_id || 'N/A'}</td>
          <td style="font-size: 0.82rem;">${m.performed_by || 'Staff'}</td>
        </tr>
      `;
    }).join('');
  };

  window.openMovementsModal = () => {
    if (branchFilter) {
      const branches = store.branches || [];
      branchFilter.innerHTML = `<option value="all">All Branches</option>` + branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
      if (store.currentUser && store.currentUser.role !== 'admin') {
        branchFilter.value = store.currentUser.branch_id || store.currentUser.branchId || 'all';
        branchFilter.disabled = true;
      } else {
        branchFilter.disabled = false;
        if (store.getSelectedBranchId() !== 'all') branchFilter.value = store.getSelectedBranchId();
      }
    }

    loadMovements();
    if (modal) modal.style.display = "block";
    if (overlay) {
      overlay.style.display = "block";
      overlay.classList.add("visible");
    }
  };

  const closeModal = () => {
    if (modal) modal.style.display = "none";
    if (overlay) {
      overlay.style.display = "none";
      overlay.classList.remove("visible");
    }
  };

  if (openBtn) openBtn.addEventListener("click", () => window.openMovementsModal());
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  branchFilter?.addEventListener("change", loadMovements);
  typeFilter?.addEventListener("change", loadMovements);
}

function showConfirmModal(message, title = "Confirm Action", iconType = "alert-triangle", confirmBtnText = null, cancelBtnText = null) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const overlay = document.getElementById("confirm-modal-overlay");
    const titleEl = document.getElementById("confirm-modal-title");
    const msgEl = document.getElementById("confirm-modal-message");
    const iconContainer = document.getElementById("confirm-modal-icon-container");
    const okBtn = document.getElementById("btn-confirm-ok");
    const cancelBtn = document.getElementById("btn-confirm-cancel");

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    
    if (iconContainer) {
      const color = iconType === "alert-triangle" ? "var(--color-error)" : "var(--primary-color)";
      setSafeHtml(iconContainer, `<i data-lucide="${iconType}" style="width: 48px; height: 48px; color: ${color}; margin: 0 auto; display: block;"></i>`);
      if (window.lucide) window.lucide.createIcons({ root: iconContainer });
    }
    
    if (confirmBtnText) {
      okBtn.textContent = confirmBtnText;
    } else if (message.toLowerCase().includes("delete") || message.toLowerCase().includes("remove")) {
      okBtn.textContent = "Delete";
    } else {
      okBtn.textContent = "Confirm";
    }

    if (cancelBtnText && cancelBtn) {
      cancelBtn.textContent = cancelBtnText;
    }

    if ((confirmBtnText && confirmBtnText.toLowerCase().includes("delete")) || message.toLowerCase().includes("delete") || message.toLowerCase().includes("remove")) {
      okBtn.style.backgroundColor = "var(--color-error)";
      okBtn.style.color = "#ffffff";
    } else {
      okBtn.style.backgroundColor = "var(--primary-color)";
      okBtn.style.color = "#ffffff";
    }

    modal.style.display = "block";
    overlay.style.display = "block";
    overlay.classList.add("visible");

    const cleanup = () => {
      modal.style.display = "none";
      overlay.style.display = "none";
      overlay.classList.remove("visible");
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
    };

    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
  });
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconMap = { success: "check-circle", info: "info", warning: "alert-triangle", error: "x-circle" };
  const colorMap = { success: "#16a34a", info: "#0284c7", warning: "#eab308", error: "#dc2626" };

  setSafeHtml(toast, `
    <i data-lucide="${iconMap[type] || 'info'}" style="width: 20px; height: 20px; color: ${colorMap[type]}; flex-shrink:0;"></i>
    <span class="toast-message">${message}</span>
  `);

  container.appendChild(toast);
  lucide.createIcons({ attrs: { class: 'lucide-custom' } });

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================================================
// DATA REFRESHERS & MATHEMATICAL MODELS (AI LOGIC)
// ==========================================================================

let dashSalesChartInstance = null;
let dashBranchesChartInstance = null;
let aiDemandChartInstance = null;

function getFreshnessIndex(productionDateStr, expiryDateStr) {
  const now = new Date();
  const start = parseDateTime(productionDateStr);
  const end = parseDateTime(expiryDateStr);

  const totalSpan = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();

  if (totalSpan <= 0) return 0;
  const percentage = Math.round(((totalSpan - elapsed) / totalSpan) * 100);
  return Math.max(0, Math.min(100, percentage));
}

// 1. DASHBOARD REFRESHER
function refreshDashboard() {
  const branchIdStr = store.getSelectedBranchId();
  const branchId = branchIdStr === 'all' ? 'all' : parseInt(branchIdStr);

  const todayStr = formatLocalDate(new Date());
  const allSalesDates = [...new Set(store.sales.map(s => s.date).filter(Boolean))].sort();

  // Resolve latest operational sales date
  let latestDateStr = todayStr;
  if (!allSalesDates.includes(todayStr) && allSalesDates.length > 0) {
    const pastOrToday = allSalesDates.filter(d => d <= todayStr);
    latestDateStr = pastOrToday.length > 0 
      ? pastOrToday[pastOrToday.length - 1] 
      : (allSalesDates.includes('2026-10-31') ? '2026-10-31' : allSalesDates[allSalesDates.length - 1]);
  }

  const salesToday = store.sales
    .filter(s => s.date === latestDateStr && (branchId === 'all' || (s.branchId != null ? s.branchId : s.branch_id) == branchId))
    .reduce((sum, s) => sum + (s.qty * s.price), 0);
  document.getElementById("dash-sales-value").textContent = `₱${salesToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const wasteToday = store.waste
    .filter(w => w.date === latestDateStr && (branchId === 'all' || (w.branchId != null ? w.branchId : w.branch_id) == branchId))
    .reduce((sum, w) => {
      const p = store.products.find(x => x.id === (w.productId || w.product_id));
      const uCost = (p && p.cost != null) ? parseFloat(p.cost) : parseFloat(w.cost || 0);
      return sum + ((parseInt(w.qty) || 0) * uCost);
    }, 0);
  document.getElementById("dash-waste-value").textContent = `₱${wasteToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  let expiryCount = 0;
  store.inventory.forEach(item => {
    if (branchId !== 'all' && (item.branchId != null ? item.branchId : item.branch_id) != branchId) return;
    const fIndex = getFreshnessIndex(item.productionDate, item.expiryDate);
    if (fIndex <= 30 && item.stockLevel > 0) expiryCount++;
  });
  document.getElementById("dash-expiry-value").textContent = `${expiryCount} items`;

  const totalStock = store.inventory
    .filter(i => branchId === 'all' || (i.branchId != null ? i.branchId : i.branch_id) == branchId)
    .reduce((sum, i) => sum + i.stockLevel, 0);
  document.getElementById("dash-stock-value").textContent = `${totalStock.toLocaleString()} pcs`;

  // Find yesterday's date relative to latestDateStr
  const prevDate = new Date(parseLocalDate(latestDateStr));
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = formatLocalDate(prevDate);

  const salesYesterday = store.sales
    .filter(s => s.date === prevDateStr && (branchId === 'all' || (s.branchId != null ? s.branchId : s.branch_id) == branchId))
    .reduce((sum, s) => sum + (s.qty * s.price), 0);

  // Dynamic Sales Trend Percentage Calculation
  const salesTrendEl = document.getElementById("dash-sales-trend");
  if (salesTrendEl) {
    if (salesToday === 0 && store.sales.length === 0) {
      salesTrendEl.style.visibility = "hidden";
      setSafeHtml(document.getElementById("dash-sales-insight"), '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>No recent sales data to analyze.</span>');
    } else {
      salesTrendEl.style.visibility = "visible";
      if (salesYesterday > 0) {
        const pctDiff = ((salesToday - salesYesterday) / salesYesterday) * 100;
        const sign = pctDiff >= 0 ? '+' : '';
        const trendClass = pctDiff >= 0 ? 'up' : 'down';
        salesTrendEl.className = `stats-trend ${trendClass}`;
        salesTrendEl.innerHTML = `<span>${sign}${pctDiff.toFixed(1)}% from yesterday</span>`;
      } else {
        salesTrendEl.className = 'stats-trend up';
        salesTrendEl.innerHTML = `<span>+100% vs yesterday</span>`;
      }
      setSafeHtml(document.getElementById("dash-sales-insight"), '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>Daily transactions recorded: 250 sales. Performance tracking steady.</span>');
    }
  }

  // Dynamic Waste Trend Percentage Calculation
  const wasteYesterday = store.waste
    .filter(w => w.date === prevDateStr && (branchId === 'all' || (w.branchId != null ? w.branchId : w.branch_id) == branchId))
    .reduce((sum, w) => {
      const p = store.products.find(x => x.id === (w.productId || w.product_id));
      const uCost = (p && p.cost != null) ? parseFloat(p.cost) : parseFloat(w.cost || 0);
      return sum + ((parseInt(w.qty) || 0) * uCost);
    }, 0);

  const wasteTrendEl = document.getElementById("dash-waste-trend");
  if (wasteTrendEl) {
    if (wasteToday === 0 && store.waste.length === 0) {
      wasteTrendEl.style.visibility = "hidden";
      setSafeHtml(document.getElementById("dash-waste-insight"), '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>No recent waste data to analyze.</span>');
    } else {
      wasteTrendEl.style.visibility = "visible";
      if (wasteYesterday > 0) {
        const wastePctDiff = ((wasteToday - wasteYesterday) / wasteYesterday) * 100;
        const sign = wastePctDiff >= 0 ? '+' : '';
        const trendClass = wastePctDiff <= 0 ? 'down' : 'up';
        wasteTrendEl.className = `stats-trend ${trendClass}`;
        wasteTrendEl.innerHTML = `<span>${sign}${wastePctDiff.toFixed(1)}% vs yesterday</span>`;
      } else if (wasteToday === 0) {
        wasteTrendEl.className = 'stats-trend down';
        wasteTrendEl.innerHTML = `<span>0.0% Optimal (No waste)</span>`;
      } else {
        wasteTrendEl.className = 'stats-trend up';
        wasteTrendEl.innerHTML = `<span>+100% vs yesterday</span>`;
      }
      setSafeHtml(document.getElementById("dash-waste-insight"), '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>Waste cost is tightly managed. Low disposal scrap rate maintained.</span>');
    }
  }

  if (expiryCount === 0) {
    document.getElementById("dash-expiry-subtext").style.visibility = "hidden";
    setSafeHtml(document.getElementById("dash-expiry-insight"), '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>No items currently nearing expiry.</span>');
  } else {
    document.getElementById("dash-expiry-subtext").style.visibility = "visible";
    setSafeHtml(document.getElementById("dash-expiry-insight"), '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>Prioritize repurposing or discounting these items immediately.</span>');
  }

  if (totalStock === 0) {
    document.getElementById("dash-stock-subtext").textContent = "Empty";
    document.getElementById("dash-stock-subtext").style.color = "var(--color-danger)";
    setSafeHtml(document.getElementById("dash-stock-insight"), '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>Inventory is empty. Immediate restocking required.</span>');
  } else {
    document.getElementById("dash-stock-subtext").textContent = "Optimal levels";
    document.getElementById("dash-stock-subtext").style.color = "var(--color-success)";
    setSafeHtml(document.getElementById("dash-stock-insight"), '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>Stock levels are optimal. No immediate restocking required.</span>');
  }
  
  if (typeof lucide !== 'undefined') lucide.createIcons();

  renderDashboardSalesWasteChart();
  renderDashboardStockPlanTable();
  renderDashboardBranchesChart();
  renderRealtimeAlerts();
}

function handleAlertLogWaste(inventoryId, productId, branchId, qty, cost, productName) {
  let item = store._inventory.find(i => i.id === inventoryId);
  if (!item) {
    item = store._inventory.find(i => i.productId === productId && i.branchId === branchId && i.stockLevel > 0);
  }
  if (item) {
    item.stockLevel = 0;
  }
  store._waste.push({
    id: `w_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    productId: productId,
    branchId: branchId,
    qty: qty,
    cost: cost || 10,
    reason: "Expired",
    date: formatLocalDate(new Date())
  });

  store.save("bakewise_v2_inventory", store._inventory);
  store.save("bakewise_v2_waste", store._waste);
  store.commitAll();

  store.logActivity(`Recorded ${qty} pcs of expired ${productName} to waste logs.`, "waste");
  showToast(`Logged ${qty} pcs of expired ${productName} to waste logs.`, "warning");

  refreshDashboard();
  refreshInventoryPane();
  refreshWastePane();
  if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
}
window.handleAlertLogWaste = handleAlertLogWaste;

function renderDashboardSalesWasteChart() {
  const canvas = document.getElementById("chart-dashboard-sales-waste");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (dashSalesChartInstance) dashSalesChartInstance.destroy();

  const labels = [];
  const salesData = [];
  const wasteData = [];

  const startInput = document.getElementById("dash-filter-start")?.value;
  const endInput = document.getElementById("dash-filter-end")?.value;

  let startDate, endDate;
  if (startInput && endInput) {
    startDate = parseLocalDate(startInput);
    endDate = parseLocalDate(endInput);
  } else {
    // Default to last 7 days from latest active data date (or today if active)
    const allDates = [...store.sales.map(s => s.date), ...store.waste.map(w => w.date)].filter(Boolean).sort();
    let refDate = new Date();
    if (allDates.length > 0) {
      const todayStr = formatLocalDate(new Date());
      if (allDates.includes(todayStr)) {
        refDate = parseLocalDate(todayStr);
      } else {
        const pastOrToday = allDates.filter(d => d <= todayStr);
        const bestDateStr = pastOrToday.length > 0 ? pastOrToday[pastOrToday.length - 1] : (allDates.includes('2026-10-31') ? '2026-10-31' : allDates[allDates.length - 1]);
        refDate = parseLocalDate(bestDateStr);
      }
    }
    endDate = new Date(refDate);
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    
    if (document.getElementById("dash-filter-start")) document.getElementById("dash-filter-start").value = formatLocalDate(startDate);
    if (document.getElementById("dash-filter-end")) document.getElementById("dash-filter-end").value = formatLocalDate(endDate);
  }

  const branchIdStr = store.getSelectedBranchId();
  const branchId = branchIdStr === 'all' ? 'all' : parseInt(branchIdStr);

  const current = new Date(startDate);
  while (current <= endDate) {
    const dStr = formatLocalDate(current);
    labels.push(current.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }));

    const daySales = store.sales
      .filter(s => s.date === dStr && (branchId === 'all' || s.branchId === branchId))
      .reduce((sum, s) => sum + (s.qty * s.price), 0);
    salesData.push(daySales);

    const dayWaste = store.waste
      .filter(w => w.date === dStr && (branchId === 'all' || w.branchId === branchId))
      .reduce((sum, w) => {
        const p = store.products.find(x => x.id === (w.productId || w.product_id));
        const uCost = (p && p.cost != null) ? parseFloat(p.cost) : parseFloat(w.cost || 0);
        return sum + ((parseInt(w.qty) || 0) * uCost);
      }, 0);
    wasteData.push(dayWaste);

    current.setDate(current.getDate() + 1);
  }

  const daysDiff = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  const chartTitleEl = document.getElementById("dash-chart-title");
  if (chartTitleEl) chartTitleEl.textContent = `Daily Sales vs. Waste Trend (${daysDiff} Days)`;

  const totalSales = salesData.reduce((sum, val) => sum + val, 0);
  const totalWaste = wasteData.reduce((sum, val) => sum + val, 0);
  const salesWasteInsightEl = document.getElementById("insight-sales-waste-chart");
  if (salesWasteInsightEl) {
    if (totalSales === 0 && totalWaste === 0) {
      setSafeHtml(salesWasteInsightEl, '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>No sales or waste data for the selected period.</span>');
    } else {
      const salesExceed = totalSales >= totalWaste;
      setSafeHtml(salesWasteInsightEl, `<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>${salesExceed ? 'Sales are outperforming waste costs.' : 'Warning: Waste costs are high compared to sales.'} Total sales reached ₱${totalSales.toLocaleString('en-US', {minimumFractionDigits: 2})}.</span>`);
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  const isDark = document.body.classList.contains("dark-mode");
  const textColor = isDark ? "#a8a29e" : "#78716c";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  dashSalesChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Sales Value (₱)",
          data: salesData,
          borderColor: "#d97706",
          backgroundColor: "rgba(217, 119, 6, 0.1)",
          fill: true,
          tension: 0.3,
          borderWidth: 3
        },
        {
          label: "Waste Cost (₱)",
          data: wasteData,
          borderColor: "#dc2626",
          backgroundColor: "rgba(220, 38, 38, 0.05)",
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          borderDash: [5, 5]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor, font: { family: 'Outfit' } } }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Outfit' } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Outfit' } } }
      }
    }
  });
}

async function renderDashboardStockPlanTable() {
  const tbody = document.getElementById("dashboard-stock-plan-tbody");
  if (!tbody) return;

  const branchIdStr = store.getSelectedBranchId();
  const branchId = branchIdStr === 'all' ? 'all' : parseInt(branchIdStr);

  const rows = await Promise.all(store.products.map(async p => {
    const inventoryItems = store.inventory.filter(i => 
      i.productId === p.id && (branchId === 'all' || i.branchId === branchId)
    );
    const currentStock = inventoryItems.reduce((sum, i) => sum + i.stockLevel, 0);

    const forecastRes = await getAIPredictedDemand(p.id);
    const predictedDemand = forecastRes ? forecastRes.demand : 30;

    const suggestedBake = Math.max(0, predictedDemand - currentStock);

    let statusBadge = '';
    if (currentStock < predictedDemand) {
      statusBadge = `<span class="badge warning" style="background: #fef3c7; color: #b45309; font-weight: 700;">Low Stock</span>`;
    } else if (currentStock >= Math.round(predictedDemand * 1.5) && currentStock > predictedDemand + 10) {
      statusBadge = `<span class="badge info" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">Overstocked</span>`;
    } else {
      statusBadge = `<span class="badge success" style="background: #dcfce7; color: #15803d; font-weight: 700;">Sufficient</span>`;
    }

    return `
      <tr>
        <td style="font-weight: 700; color: var(--text-primary);">${p.name}</td>
        <td><span class="badge info" style="font-size: 0.75rem;">${p.category}</span></td>
        <td style="font-weight: 700;">${currentStock} pcs</td>
        <td style="font-weight: 700; color: var(--primary-color);">${predictedDemand} pcs</td>
        <td style="font-weight: 800; color: ${suggestedBake > 0 ? 'var(--accent-color)' : 'var(--text-secondary)'};">${suggestedBake} pcs</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }));

  setSafeHtml(tbody, rows.join(''));

  const insightEl = document.getElementById("insight-stock-plan");
  if (insightEl) {
    const lowStockCount = store.products.filter(p => {
      const stock = store.inventory.filter(i => i.productId === p.id && (branchId === 'all' || i.branchId === branchId)).reduce((sum, i) => sum + i.stockLevel, 0);
      return stock < 10;
    }).length;
    if (lowStockCount > 0) {
      setSafeHtml(insightEl, `<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>Notice: ${lowStockCount} product(s) are currently at low stock. Prioritize suggested production runs.</span>`);
    } else {
      setSafeHtml(insightEl, `<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>Stock levels are healthy across products. Production recommendations updated based on forecast.</span>`);
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function renderDashboardBranchesChart() {
  const canvas = document.getElementById("chart-dashboard-branches");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (dashBranchesChartInstance) dashBranchesChartInstance.destroy();

  const branchLabels = store.branches.map(b => b.name);
  const salesData = store.branches.map(b => {
    return store.sales
      .filter(s => (s.branchId != null ? s.branchId : s.branch_id) == b.id)
      .reduce((sum, s) => sum + (s.qty * s.price), 0);
  });
  
  const wasteData = store.branches.map(b => {
    return store.waste
      .filter(w => (w.branchId != null ? w.branchId : w.branch_id) === b.id)
      .reduce((sum, w) => {
        const p = store.products.find(x => x.id === (w.productId || w.product_id));
        const uCost = (p && p.cost != null) ? parseFloat(p.cost) : parseFloat(w.cost || 0);
        return sum + ((parseInt(w.qty) || 0) * uCost);
      }, 0);
  });

  const isDark = document.body.classList.contains("dark-mode");
  const textColor = isDark ? "#a8a29e" : "#78716c";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  dashBranchesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: branchLabels,
      datasets: [
        {
          label: 'Total Sales (₱)',
          data: salesData,
          backgroundColor: 'rgba(34, 197, 94, 0.75)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: 'Total Waste (₱)',
          data: wasteData,
          backgroundColor: 'rgba(239, 68, 68, 0.75)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Outfit' } } },
        y: { 
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'Outfit' },
            callback: function(value) {
              return '₱' + value.toLocaleString();
            }
          }
        }
      },
      plugins: {
        legend: { position: 'top', labels: { color: textColor, font: { family: 'Outfit' } } },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ₱' + context.parsed.y.toLocaleString();
            }
          }
        }
      }
    }
  });

  const branchInsightEl = document.getElementById("insight-branches-chart");
  if (branchInsightEl) {
    const allBranchPerformance = store.branches.map(b => {
      const bSales = store.sales.filter(s => (s.branchId != null ? s.branchId : s.branch_id) === b.id).reduce((sum, s) => sum + (s.qty * s.price), 0);
      const bWaste = store.waste.filter(w => (w.branchId != null ? w.branchId : w.branch_id) === b.id).reduce((sum, w) => {
        const p = store.products.find(x => x.id === (w.productId || w.product_id));
        const uCost = (p && p.cost != null) ? parseFloat(p.cost) : parseFloat(w.cost || 0);
        return sum + ((parseInt(w.qty) || 0) * uCost);
      }, 0);
      return { name: b.name, sales: bSales, waste: bWaste };
    });
    
    const totalSalesGlobal = allBranchPerformance.reduce((a, b) => a + b.sales, 0);
    const totalWasteGlobal = allBranchPerformance.reduce((a, b) => a + b.waste, 0);
    
    if (totalSalesGlobal === 0 && totalWasteGlobal === 0) {
      setSafeHtml(branchInsightEl, '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>No branch data available for comparison.</span>');
    } else {
      const sortedBySales = [...allBranchPerformance].sort((a, b) => b.sales - a.sales);
      const sortedByWaste = [...allBranchPerformance].sort((a, b) => b.waste - a.waste);
      
      const top3 = sortedBySales.slice(0, 3).filter(b => b.sales > 0);
      let rankingText = top3.map((b, i) => {
        const rank = i === 0 ? '1st' : i === 1 ? '2nd' : '3rd';
        return `<strong>${rank}: ${b.name}</strong> (₱${b.sales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})`;
      }).join(", ");
      
      if (!rankingText) rankingText = "No sales generated yet.";
      
      let insightHtml = `<div style="display: flex; flex-direction: column; gap: 8px;">`;
      insightHtml += `<div style="display: flex; align-items: flex-start; gap: 8px;">
        <i data-lucide="sparkles" style="width: 14px; height: 14px; margin-top: 2px; flex-shrink: 0;"></i>
        <span style="line-height: 1.4;"><strong>Top Branches by Sales:</strong> ${rankingText}</span>
      </div>`;
      
      let decisionText = "";
      if (top3.length > 0) {
        decisionText += `Maintain high inventory levels and consider running promotions at top performing branches to maximize revenue. `;
      }
      if (sortedByWaste[0] && sortedByWaste[0].waste > 0) {
        decisionText += `Monitor <strong>${sortedByWaste[0].name}</strong> closely as it reported the highest waste cost (₱${sortedByWaste[0].waste.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}). Investigate their inventory management to minimize losses.`;
      }
      
      if (decisionText) {
        insightHtml += `<div style="display: flex; align-items: flex-start; gap: 8px;">
          <i data-lucide="target" style="width: 14px; height: 14px; margin-top: 2px; flex-shrink: 0;"></i>
          <span style="font-size: 0.9em; line-height: 1.4;"><strong>Decision Support:</strong> ${decisionText}</span>
        </div>`;
      }
      insightHtml += `</div>`;
      
      setSafeHtml(branchInsightEl, insightHtml);
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function renderRealtimeAlerts() {
  const tbody = document.getElementById("dashboard-action-alerts-tbody");
  if (!tbody) return;
  tbody.replaceChildren();

  const branchIdStr = store.getSelectedBranchId();
  const branchId = branchIdStr === 'all' ? 'all' : parseInt(branchIdStr);

  const alertItems = [];

  store.inventory.forEach(item => {
    if (branchId !== 'all' && item.branchId !== branchId) return;
    if (item.stockLevel > 0) {
      const p = store.products.find(x => x.id === item.productId);
      if (!p) return;
      const fIndex = getFreshnessIndex(item.productionDate, item.expiryDate);
      const b = store.branches.find(x => x.id === item.branchId) || { name: "Main Branch" };

      if (fIndex === 0) {
        alertItems.push({
          item,
          product: p,
          branch: b,
          fIndex,
          type: 'expired'
        });
      } else if (fIndex <= 30) {
        alertItems.push({
          item,
          product: p,
          branch: b,
          fIndex,
          type: 'near_expiry'
        });
      }
    }
  });

  if (alertItems.length === 0) {
    setSafeHtml(tbody, `
      <tr>
        <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">
          <i data-lucide="check-circle" style="width: 24px; height: 24px; color: var(--color-success); vertical-align: middle; margin-right: 6px;"></i>
          <strong>Systems Nominal</strong> — No active expiration hazards or critical alerts.
        </td>
      </tr>
    `);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  setSafeHtml(tbody, alertItems.map(a => {
    const expFormatted = formatDateTimeDisplay(a.item.expiryDate);
    const cost = a.product.cost || 10;
    
    let actionBtnHtml = '';
    if (a.type === 'expired') {
      actionBtnHtml = `<button class="btn-primary" onclick="handleAlertLogWaste('${a.item.id}', '${a.product.id}', ${a.item.branchId}, ${a.item.stockLevel}, ${cost}, '${a.product.name.replace(/'/g, "\\'")}')" style="padding: 4px 10px; font-size: 0.75rem; background: var(--color-error); border: none; border-radius: 4px; font-weight: 600;">
        <i data-lucide="trash-2" style="width: 12px; height: 12px; margin-right: 4px;"></i> Log to Waste
      </button>`;
    } else {
      actionBtnHtml = `<button class="btn-primary" onclick="handleMarkAsRepurposed('${a.product.id}', '${a.product.name.replace(/'/g, "\\'")}', ${a.item.stockLevel}, '${(a.product.repurposeRecipe || 'Repurpose').replace(/'/g, "\\'")}')" style="padding: 4px 10px; font-size: 0.75rem; background: linear-gradient(135deg, #0284c7, #0369a1); border: none; border-radius: 4px; font-weight: 600;">
        <i data-lucide="refresh-cw" style="width: 12px; height: 12px; margin-right: 4px;"></i> Repurpose
      </button>`;
    }

    return `
      <tr>
        <td style="font-size: 0.85rem; font-weight: 600;">${a.branch.name}</td>
        <td style="font-weight: 700;">${a.product.name}</td>
        <td style="font-size: 0.82rem; color: var(--text-secondary);">${expFormatted}</td>
        <td style="font-weight: 700;">${a.item.stockLevel} pcs</td>
        <td>${actionBtnHtml}</td>
      </tr>
    `;
  }).join(''));

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 2. POINT-OF-SALE (POS) CONTROLLER & REFRESHER
let posCart = [];
window.getPosCart = () => posCart;
let activePosCategory = 'all';
let currentPosPaymentMethod = 'Cash';
let currentReceiptTxData = null;
let currentDetailsTxData = null;
let currentPosTab = 'new-sale';

function switchPosTab(tabName) {
  currentPosTab = tabName;
  const saleBtn = document.getElementById("btn-pos-tab-sale");
  const historyBtn = document.getElementById("btn-pos-tab-history");
  const saleContent = document.getElementById("pos-view-new-sale");
  const historyContent = document.getElementById("pos-view-history");

  if (tabName === 'new-sale') {
    if (saleBtn) saleBtn.classList.add('active');
    if (historyBtn) historyBtn.classList.remove('active');
    if (saleContent) saleContent.style.display = 'block';
    if (historyContent) historyContent.style.display = 'none';
    renderPosProducts();
    updatePosCartUI();
  } else {
    if (historyBtn) historyBtn.classList.add('active');
    if (saleBtn) saleBtn.classList.remove('active');
    if (historyContent) historyContent.style.display = 'block';
    if (saleContent) saleContent.style.display = 'none';
    refreshPosHistory();
  }
}
window.switchPosTab = switchPosTab;

async function refreshSalesPane() {
  setupPOSModule();
  switchPosTab(currentPosTab || 'new-sale');
  if (store && store.isBackendOnline) {
    try {
      await store.syncWithBackend();
      renderPosProducts();
      updatePosCartUI();
    } catch(e) {}
  }
}

let currentPosSelectedBranchId = null;

function getPosEffectiveBranchId() {
  const user = store.currentUser;
  const isAdmin = !user || user.role === 'admin';
  const userBranchId = user && user.branch_id ? parseInt(user.branch_id) : 2;

  if (!isAdmin) {
    return userBranchId;
  }

  // Admin: Check local POS terminal dropdown
  if (currentPosSelectedBranchId) {
    const exists = (store.branches || []).some(b => parseInt(b.id) === parseInt(currentPosSelectedBranchId));
    if (exists) return parseInt(currentPosSelectedBranchId);
  }

  // Admin: Check topbar switcher if specific branch is selected
  const topbarVal = store.getSelectedBranchId();
  if (topbarVal && topbarVal !== 'all') {
    const exists = (store.branches || []).some(b => parseInt(b.id) === parseInt(topbarVal));
    if (exists) {
      currentPosSelectedBranchId = parseInt(topbarVal);
      return currentPosSelectedBranchId;
    }
  }

  // Admin: Fallback to first registered branch in store
  if (store.branches && store.branches.length > 0) {
    currentPosSelectedBranchId = parseInt(store.branches[0].id);
    return currentPosSelectedBranchId;
  }

  return store.getDefaultBranchId ? store.getDefaultBranchId() : 212;
}
window.getPosEffectiveBranchId = getPosEffectiveBranchId;

function getPosProductStockInfo(productId) {
  const effectiveBranchId = getPosEffectiveBranchId();
  const bObj = (store.branches || []).find(b => parseInt(b.id) === effectiveBranchId);
  const branchName = bObj ? bObj.name : `Branch ${effectiveBranchId}`;
  const scopeLabel = `(${branchName})`;

  const pStr = String(productId).trim();
  const altPid = pStr.startsWith('p') ? pStr.substring(1) : `p${pStr}`;

  // STRICT BRANCH ISOLATION: Calculate stock exclusively for the effective branch
  const inventoryRecords = (store._inventory || []).filter(i => {
    const iPid = String(i.productId !== undefined ? i.productId : (i.product_id !== undefined ? i.product_id : '')).trim();
    const pidMatch = iPid === pStr || iPid === altPid;
    const itemBranchId = parseInt(i.branchId !== undefined ? i.branchId : (i.branch_id !== undefined ? i.branch_id : 0));
    return pidMatch && itemBranchId === effectiveBranchId;
  });

  const stockAvailable = inventoryRecords.reduce((sum, item) => {
    const qty = parseInt(item.stockLevel !== undefined ? item.stockLevel : (item.quantity !== undefined ? item.quantity : item.stock_level)) || 0;
    return sum + qty;
  }, 0);

  return {
    stock: Math.max(0, stockAvailable),
    scopeLabel: scopeLabel,
    branchName: branchName,
    isNetwork: false,
    effectiveBranchId: effectiveBranchId
  };
}

function getBranchProductStock(productId) {
  return getPosProductStockInfo(productId).stock;
}

function findPosProduct(productId) {
  if (!store || !store.products) return null;
  const pStr = String(productId).trim();
  const altStr = pStr.startsWith('p') ? pStr.substring(1) : `p${pStr}`;
  return store.products.find(p => {
    const idStr = String(p.id).trim();
    return idStr === pStr || idStr === altStr;
  });
}

function updateProductCardCartState(productId) {
  if (!productId) return;
  const pStr = String(productId).trim();
  const altStr = pStr.startsWith('p') ? pStr.substring(1) : ('p' + pStr);
  const card = document.querySelector(`.pos-product-card[data-product-id="${pStr}"], .pos-product-card[data-product-id="${altStr}"]`);
  if (!card) return;

  const p = findPosProduct(productId);
  if (!p) return;

  const stockInfo = getPosProductStockInfo(p.id);
  const stockAvailable = stockInfo.stock;
  const cartItem = posCart.find(c => {
    const cStr = String(c.productId).trim();
    return cStr === pStr || cStr === altStr;
  });
  const inCartQty = cartItem ? cartItem.qty : 0;
  const isOutOfStock = stockAvailable <= 0;

  if (isOutOfStock) {
    card.classList.add('disabled-card');
    card.style.opacity = '0.55';
    card.style.cursor = 'not-allowed';
    card.setAttribute('title', 'Out of Stock');
  } else {
    card.classList.remove('disabled-card');
    card.style.opacity = '';
    card.style.cursor = 'pointer';
    card.setAttribute('title', 'Click to add to cart');
  }

  // Update in-cart quantity indicator badge
  let badgeEl = card.querySelector('.pos-card-cart-pill');
  if (inCartQty > 0) {
    if (!badgeEl) {
      const catRow = card.querySelector('.pos-product-header-row');
      if (catRow) {
        badgeEl = document.createElement('span');
        badgeEl.className = 'pos-card-cart-pill';
        catRow.appendChild(badgeEl);
      }
    }
    if (badgeEl) badgeEl.textContent = `${inCartQty} in cart`;
  } else if (badgeEl) {
    badgeEl.remove();
  }
}
window.updateProductCardCartState = updateProductCardCartState;

function renderPosProducts() {
  const grid = document.getElementById("pos-products-grid");
  if (!grid) return;

  const searchText = (document.getElementById("pos-product-search")?.value || "").toLowerCase().trim();

  const filtered = (store.products || []).filter(p => {
    const matchesCategory = activePosCategory === 'all' || (p.category && p.category.toLowerCase() === activePosCategory.toLowerCase());
    const matchesSearch = !searchText || p.name.toLowerCase().includes(searchText) || (p.category && p.category.toLowerCase().includes(searchText));
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    setSafeHtml(grid, `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
        <i data-lucide="package-x" style="width: 36px; height: 36px; opacity: 0.5; margin-bottom: 8px;"></i>
        <p style="font-weight: 600;">No bakery products found matching your search</p>
      </div>
    `);
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons({ root: grid });
    return;
  }

  setSafeHtml(grid, filtered.map(p => {
    const stockInfo = getPosProductStockInfo(p.id);
    const stockAvailable = stockInfo.stock;
    const scopeLabelStr = stockInfo.scopeLabel ? ` ${stockInfo.scopeLabel}` : "";

    const pStr = String(p.id).trim();
    const altStr = pStr.startsWith('p') ? pStr.substring(1) : `p${pStr}`;

    const cartItem = posCart.find(c => {
      const cStr = String(c.productId).trim();
      return cStr === pStr || cStr === altStr;
    });
    const inCartQty = cartItem ? cartItem.qty : 0;
    const isOutOfStock = stockAvailable <= 0;

    let stockBadgeClass = "in-stock";
    let stockLabel = `In Stock: ${stockAvailable}${scopeLabelStr}`;
    if (stockAvailable <= 0) {
      stockBadgeClass = "out-stock";
      stockLabel = "Out of Stock (0)";
    } else if (stockAvailable <= 10) {
      stockBadgeClass = "low-stock";
      stockLabel = `Low Stock: ${stockAvailable}${scopeLabelStr}`;
    }

    const inCartBadge = inCartQty > 0
      ? `<span class="pos-card-cart-pill">${inCartQty} in cart</span>`
      : '';

    return `
      <div class="pos-product-card ${isOutOfStock ? 'disabled-card' : ''}" data-product-id="${p.id}" ${isOutOfStock ? 'style="opacity: 0.55; cursor: not-allowed;" title="Out of Stock"' : 'style="cursor: pointer;" title="Click to add to cart"'}>
        <div class="pos-product-info">
          <div class="pos-product-header-row" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <span class="pos-product-category">${p.category || 'BAKERY'}</span>
            ${inCartBadge}
          </div>
          <h4 style="margin: 6px 0 0 0;">${p.name}</h4>
        </div>
        <div style="margin-top: 14px;">
          <div class="pos-product-price" style="margin: 0 0 4px 0;">₱${parseFloat(p.price).toFixed(2)}</div>
          <div class="pos-product-stock ${stockBadgeClass}">
            <span>${stockLabel}</span>
          </div>
        </div>
      </div>
    `;
  }).join(''));

  if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons({ root: grid });
}

function addToPosCart(productId) {
  const p = findPosProduct(productId);
  if (!p) {
    console.warn("Product not found for ID:", productId);
    return;
  }

  const pStr = String(p.id).trim();
  const altStr = pStr.startsWith('p') ? pStr.substring(1) : `p${pStr}`;

  const stockInfo = getPosProductStockInfo(p.id);
  const stockAvailable = stockInfo.stock;

  const existingIndex = posCart.findIndex(c => {
    const cStr = String(c.productId).trim();
    return cStr === pStr || cStr === altStr;
  });

  if (stockAvailable <= 0) {
    showToast(`Cannot add ${p.name}. Item is out of stock at ${stockInfo.branchName}.`, "danger");
    return;
  }

  if (existingIndex >= 0) {
    if (posCart[existingIndex].qty + 1 > stockAvailable) {
      showToast(`Insufficient stock for ${p.name}. Only ${stockAvailable} units are available in stock at ${stockInfo.branchName}.`, "warning");
      return;
    }
    posCart[existingIndex].qty += 1;
  } else {
    posCart.push({
      productId: p.id,
      name: p.name,
      price: parseFloat(p.price),
      category: p.category,
      qty: 1
    });
  }

  updatePosCartUI();
  updateProductCardCartState(p.id);
}
window.addToPosCart = addToPosCart;

function updatePosCartQty(productId, delta) {
  const pStr = String(productId).trim();
  const altStr = pStr.startsWith('p') ? pStr.substring(1) : `p${pStr}`;

  const index = posCart.findIndex(c => {
    const cStr = String(c.productId).trim();
    return cStr === pStr || cStr === altStr;
  });
  if (index < 0) return;

  const item = posCart[index];
  const stockInfo = getPosProductStockInfo(item.productId);
  const stockAvailable = stockInfo.stock;

  if (delta > 0) {
    if (item.qty + 1 > stockAvailable) {
      showToast(`Insufficient stock for ${item.name}. Only ${stockAvailable} units are available at ${stockInfo.branchName}.`, "warning");
      return;
    }
    item.qty += 1;
  } else {
    item.qty -= 1;
    if (item.qty <= 0) {
      posCart.splice(index, 1);
    }
  }

  updatePosCartUI();
  updateProductCardCartState(productId);
}
window.updatePosCartQty = updatePosCartQty;

function removeFromPosCart(productId) {
  const pStr = String(productId).trim();
  const altStr = pStr.startsWith('p') ? pStr.substring(1) : `p${pStr}`;

  posCart = posCart.filter(c => {
    const cStr = String(c.productId).trim();
    return cStr !== pStr && cStr !== altStr;
  });
  updatePosCartUI();
  updateProductCardCartState(productId);
}
window.removeFromPosCart = removeFromPosCart;

function clearPosCart() {
  if (posCart.length === 0) return;
  const prevItems = [...posCart];
  posCart = [];
  const discountInput = document.getElementById("pos-discount-input");
  if (discountInput) discountInput.value = "0.00";
  const tenderedInput = document.getElementById("pos-tendered-input");
  if (tenderedInput) tenderedInput.value = "";
  updatePosCartUI();
  prevItems.forEach(i => updateProductCardCartState(i.productId));
  showToast("Current order cleared", "info");
}
window.clearPosCart = clearPosCart;

function updatePosCartUI() {
  const listElem = document.getElementById("pos-cart-items-list");
  const countElem = document.getElementById("pos-cart-count");
  const subtotalElem = document.getElementById("pos-summary-subtotal");
  const totalElem = document.getElementById("pos-summary-total");
  const checkoutBtn = document.getElementById("btn-pos-checkout");
  const checkoutBtnText = document.getElementById("btn-pos-checkout-text");
  const changeValueElem = document.getElementById("pos-change-value");
  const branchCtxElem = document.getElementById("pos-ctx-branch");
  const cashierCtxElem = document.getElementById("pos-ctx-cashier");
  const posBranchSelect = document.getElementById("pos-branch-select");

  // Context updates
  const effBranchId = getPosEffectiveBranchId();
  const branchObj = (store.branches || []).find(b => parseInt(b.id) === effBranchId);
  const branchName = branchObj ? branchObj.name : `Branch ${effBranchId}`;
  const isAdmin = !store.currentUser || store.currentUser.role === 'admin';

  if (posBranchSelect) {
    if (isAdmin && store.branches && store.branches.length > 0) {
      posBranchSelect.style.display = "inline-block";
      if (branchCtxElem) branchCtxElem.style.display = "none";
      const branchOptsHtml = store.branches.map(b => `<option value="${b.id}" ${parseInt(b.id) === effBranchId ? 'selected' : ''}>${b.name}</option>`).join('');
      if (posBranchSelect.innerHTML !== branchOptsHtml) {
        setSafeHtml(posBranchSelect, branchOptsHtml);
      }
      posBranchSelect.value = String(effBranchId);
    } else {
      posBranchSelect.style.display = "none";
      if (branchCtxElem) {
        branchCtxElem.style.display = "inline-flex";
        branchCtxElem.textContent = `Branch: ${branchName}`;
      }
    }
  } else if (branchCtxElem) {
    branchCtxElem.textContent = `Branch: ${branchName}`;
  }

  const cashierName = (store.currentUser && store.currentUser.role === 'sales') ? store.currentUser.name : 'Catalina Kato';
  if (cashierCtxElem) cashierCtxElem.textContent = `Cashier: ${cashierName}`;

  const totalItemCount = posCart.reduce((acc, item) => acc + item.qty, 0);
  if (countElem) countElem.textContent = `${totalItemCount} ${totalItemCount === 1 ? 'item' : 'items'}`;

  if (!posCart.length) {
    if (listElem) {
      setSafeHtml(listElem, `
        <div class="cart-empty-state">
          <i data-lucide="shopping-cart" style="width: 44px; height: 44px; color: var(--text-muted); opacity: 0.5;"></i>
          <p style="margin-top: 10px; font-weight: 600; color: var(--text-secondary);">Cart is empty</p>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Select bakery products from the left to start checkout</span>
        </div>
      `);
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons({ root: listElem });
    }
    if (subtotalElem) subtotalElem.textContent = "₱0.00";
    if (totalElem) totalElem.textContent = "₱0.00";
    if (checkoutBtnText) checkoutBtnText.textContent = "CHECKOUT (₱0.00)";
    if (changeValueElem) changeValueElem.textContent = "₱0.00";
    return;
  }

  if (listElem) {
    setSafeHtml(listElem, posCart.map(item => {
      const itemSubtotal = item.qty * item.price;
      return `
        <div class="cart-item-row">
          <div class="cart-item-left">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price-unit">₱${item.price.toFixed(2)} × ${item.qty}</div>
          </div>
          <div class="cart-item-controls">
            <button type="button" class="qty-btn" data-product-id="${item.productId}" data-delta="-1" title="Decrease quantity">-</button>
            <span class="qty-val">${item.qty}</span>
            <button type="button" class="qty-btn" data-product-id="${item.productId}" data-delta="1" title="Increase quantity">+</button>
          </div>
          <div class="cart-item-subtotal">₱${itemSubtotal.toFixed(2)}</div>
          <button type="button" class="cart-item-remove" data-product-id="${item.productId}" title="Remove item">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      `;
    }).join(''));
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons({ root: listElem });
  }

  const subtotal = posCart.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const discountInput = document.getElementById("pos-discount-input");
  let discountVal = parseFloat(discountInput?.value || 0) || 0;
  if (discountVal < 0) {
    discountVal = 0;
    if (discountInput) discountInput.value = "0.00";
  }
  if (discountVal > subtotal && subtotal > 0) {
    discountVal = subtotal;
    if (discountInput) discountInput.value = subtotal.toFixed(2);
  }

  const grandTotal = Math.max(0, subtotal - discountVal);

  if (subtotalElem) subtotalElem.textContent = `₱${subtotal.toFixed(2)}`;
  if (totalElem) totalElem.textContent = `₱${grandTotal.toFixed(2)}`;
  if (checkoutBtnText) checkoutBtnText.textContent = `CHECKOUT (₱${grandTotal.toFixed(2)})`;

  // Calculate change
  const tenderedInput = document.getElementById("pos-tendered-input");
  let tenderedVal = parseFloat(tenderedInput?.value || 0) || 0;
  if (tenderedVal < 0) {
    tenderedVal = 0;
    if (tenderedInput) tenderedInput.value = "0.00";
  }
  const changeVal = currentPosPaymentMethod === 'Cash' ? (tenderedVal >= grandTotal ? (tenderedVal - grandTotal) : 0) : 0;
  if (changeValueElem) changeValueElem.textContent = `₱${changeVal.toFixed(2)}`;
}

function setPosCashPreset(value) {
  const subtotal = posCart.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const discountVal = parseFloat(document.getElementById("pos-discount-input")?.value || 0) || 0;
  const grandTotal = Math.max(0, subtotal - discountVal);
  const inputElem = document.getElementById("pos-tendered-input");
  if (!inputElem) return;

  if (value === 'exact') {
    inputElem.value = grandTotal.toFixed(2);
  } else {
    inputElem.value = parseFloat(value).toFixed(2);
  }
  updatePosCartUI();
}
window.setPosCashPreset = setPosCashPreset;

let isPosCheckoutInProgress = false;

async function handlePosCheckout() {
  if (isPosCheckoutInProgress) return;
  if (!posCart.length) {
    showToast("Shopping cart is empty. Please add products before checking out.", "warning");
    return;
  }

  const effBranchId = getPosEffectiveBranchId();
  const branchObj = (store.branches || []).find(b => parseInt(b.id) === effBranchId);
  const branchName = branchObj ? branchObj.name : `Branch ${effBranchId}`;

  // Strict stock validation before checkout
  for (const item of posCart) {
    const stockInfo = getPosProductStockInfo(item.productId);
    if (item.qty > stockInfo.stock) {
      showToast(`Insufficient stock. Only ${stockInfo.stock} units are available for ${item.name} at ${branchName}.`, "danger");
      return;
    }
  }

  const subtotal = posCart.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const discountVal = parseFloat(document.getElementById("pos-discount-input")?.value || 0) || 0;
  const discount = Math.min(Math.max(0, discountVal), subtotal);
  const total = Math.max(0, subtotal - discount);

  const tenderedRaw = document.getElementById("pos-tendered-input")?.value;
  const tendered = parseFloat(tenderedRaw || 0);

  if (currentPosPaymentMethod === 'Cash') {
    if (!tenderedRaw || isNaN(tendered) || tendered <= 0) {
      showToast("Please enter the cash tendered amount before checking out.", "warning");
      const tenderedInput = document.getElementById("pos-tendered-input");
      if (tenderedInput) tenderedInput.focus();
      return;
    }
    if (tendered < total) {
      showToast(`Cash tendered (₱${tendered.toFixed(2)}) is insufficient. Total due is ₱${total.toFixed(2)}.`, "danger");
      return;
    }
  }

  const nowObj = new Date();
  const y = nowObj.getFullYear();
  const m = String(nowObj.getMonth() + 1).padStart(2, '0');
  const d = String(nowObj.getDate()).padStart(2, '0');
  const hh = String(nowObj.getHours()).padStart(2, '0');
  const mm = String(nowObj.getMinutes()).padStart(2, '0');
  const ss = String(nowObj.getSeconds()).padStart(2, '0');
  const curDateStr = `${y}-${m}-${d}`;
  const curDateTimeStr = `${y}-${m}-${d} ${hh}:${mm}:${ss}`;

  const payload = {
    branch_id: effBranchId,
    cashier_id: store.currentUser ? store.currentUser.id : 1,
    cashier_name: (store.currentUser && store.currentUser.role === 'sales') ? store.currentUser.name : 'Catalina Kato',
    cashier: (store.currentUser && store.currentUser.role === 'sales') ? store.currentUser.name : 'Catalina Kato',
    subtotal: subtotal,
    discount: discount,
    total: total,
    payment_amount: currentPosPaymentMethod === 'Cash' ? tendered : total,
    change_amount: currentPosPaymentMethod === 'Cash' ? Math.max(0, tendered - total) : 0,
    payment_method: currentPosPaymentMethod || 'Cash',
    date: curDateStr,
    created_at: curDateTimeStr,
    items: posCart.map(item => ({
      product_id: item.productId,
      product_name: item.name,
      quantity: item.qty,
      unit_price: item.price,
      subtotal: item.qty * item.price
    }))
  };

  const checkoutBtn = document.getElementById("btn-pos-checkout");
  const checkoutBtnText = document.getElementById("btn-pos-checkout-text");

  try {
    isPosCheckoutInProgress = true;
    if (checkoutBtn) checkoutBtn.disabled = true;
    if (checkoutBtnText) checkoutBtnText.textContent = "Processing...";

    const res = await fetch("/api/pos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const errorMsg = data.message || data.error || (data.errors && data.errors.join(', ')) || "Failed to process POS checkout";
      throw new Error(errorMsg);
    }

    showToast(`POS Transaction ${data.transaction.transaction_number} completed successfully!`, "success");

    if (data.low_stock_warnings && data.low_stock_warnings.length > 0) {
      data.low_stock_warnings.forEach(w => {
        showToast(`Low Stock Alert: ${w.product_name} has only ${w.remaining_stock} units remaining at ${branchName}.`, "warning");
      });
    }

    // Refresh store dataset from server & update all dependent panes
    await store.syncWithBackend();
    refreshPosHistory();
    refreshDashboard();
    refreshAdminBranchesPane();
    refreshInventoryPane();
    renderPosProducts();

    // Prepare receipt object
    currentReceiptTxData = {
      isNewCheckout: true,
      transaction_number: data.transaction.transaction_number,
      transaction_date: data.transaction.transaction_date || data.transaction.date,
      branch_id: effBranchId,
      branch_name: branchObj ? branchObj.name : 'Main Branch',
      branch_address: branchObj && branchObj.address ? branchObj.address : 'Commercial Center, Poblacion, Davao City',
      branch_contact: branchObj && branchObj.contact_no ? branchObj.contact_no : '0917-123-4567',
      cashier_name: payload.cashier_name,
      items: payload.items,
      subtotal: subtotal,
      discount: discount,
      total: total,
      payment_amount: payload.payment_amount,
      change_amount: payload.change_amount,
      payment_method: payload.payment_method || 'Cash'
    };

    // Show thermal receipt modal
    showPosReceiptModal(currentReceiptTxData);

    // Clear cart immediately upon successful sale
    posCart = [];
    const discountIn = document.getElementById("pos-discount-input");
    if (discountIn) discountIn.value = "0.00";
    const tenderedIn = document.getElementById("pos-tendered-input");
    if (tenderedIn) tenderedIn.value = "";
    updatePosCartUI();

  } catch (err) {
    showToast(`Checkout Error: ${err.message}`, "danger");
    try {
      await store.syncWithBackend();
      renderPosProducts();
    } catch(e) {}
  } finally {
    isPosCheckoutInProgress = false;
    if (checkoutBtn) checkoutBtn.disabled = false;
    updatePosCartUI();
  }
}
window.handlePosCheckout = handlePosCheckout;

function showPosReceiptModal(tx) {
  if (!tx) return;
  currentReceiptTxData = tx;

  const container = document.getElementById("pos-receipt-printable");
  const overlay = document.getElementById("pos-receipt-overlay");
  const modal = document.getElementById("pos-receipt-modal");
  if (!container || !modal) return;

  // 1. Transaction Date & Time Separation
  const rawDate = tx.transaction_date || tx.created_at || tx.date || Date.now();
  const dateObj = new Date(rawDate);
  const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;

  const formattedDate = validDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });

  const formattedTime = validDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  // 2. Resolve Accurate Branch Details (Name, Address, Contact No)
  let branchName = tx.branch_name;
  let branchAddress = tx.branch_address;
  let branchContact = tx.branch_contact || tx.branch_contact_no;

  const bId = parseInt(tx.branch_id || (store.currentUser?.branch_id));
  const foundBranch = (store.branches || []).find(b => parseInt(b.id) === bId);
  if (foundBranch) {
    if (!branchName || branchName === 'Main Branch') branchName = foundBranch.name;
    if (!branchAddress) branchAddress = foundBranch.address;
    if (!branchContact) branchContact = foundBranch.contact_no;
  }

  branchName = branchName || 'Rose Bakeshop - Central Branch';
  branchAddress = branchAddress || 'Commercial Center, Poblacion, Davao City';
  branchContact = branchContact || '0917-123-4567';

  // 3. Cashier Details
  const cashierName = tx.cashier_name || tx.cashier || (store.currentUser ? store.currentUser.name : 'System Administrator');

  // 4. Normalized Items List
  let items = tx.items;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch(e) { items = []; }
  }
  if (!Array.isArray(items)) items = [];

  // 5. Payment & Financial Calculations
  const subtotal = parseFloat(tx.subtotal != null ? tx.subtotal : items.reduce((sum, i) => sum + (parseFloat(i.subtotal) || (parseInt(i.quantity || 1) * parseFloat(i.unit_price || 0))), 0));
  const discount = parseFloat(tx.discount || 0);
  const total = parseFloat(tx.total != null ? tx.total : Math.max(0, subtotal - discount));
  const paymentMethod = tx.payment_method || 'Cash';
  const cashReceived = parseFloat(tx.payment_amount != null ? tx.payment_amount : total);
  const changeAmount = parseFloat(tx.change_amount != null ? tx.change_amount : Math.max(0, cashReceived - total));

  setSafeHtml(container, `
    <div class="receipt-header">
      <div class="receipt-brand-row">
        <img src="assets/rose_logo.png" alt="Rose Bakeshop Logo" class="receipt-logo-primary">
        <img src="assets/bakewise_logo.png" alt="BakeWise Logo" class="receipt-logo-badge">
      </div>
      <h1 class="receipt-brand-name">ROSE BAKESHOP</h1>
      <div class="receipt-brand-sub">Rose Bakeshop x BakeWise System</div>
      <div class="receipt-store-info">
        <div class="receipt-branch-name">${branchName}</div>
        <div class="receipt-branch-addr">${branchAddress}</div>
        <div class="receipt-branch-contact">Contact No: ${branchContact}</div>
      </div>
      <div class="receipt-title-banner">SALES RECEIPT</div>
    </div>

    <div class="receipt-meta">
      <div class="receipt-meta-row">
        <span>Receipt Number:</span>
        <strong>${tx.transaction_number || 'POS-' + Date.now()}</strong>
      </div>
      <div class="receipt-meta-row">
        <span>Transaction Date:</span>
        <span>${formattedDate}</span>
      </div>
      <div class="receipt-meta-row">
        <span>Transaction Time:</span>
        <span>${formattedTime}</span>
      </div>
      <div class="receipt-meta-row">
        <span>Cashier Name:</span>
        <span>${cashierName}</span>
      </div>
      <div class="receipt-meta-row">
        <span>Branch Name:</span>
        <span>${branchName}</span>
      </div>
    </div>

    <table class="receipt-items-table">
      <thead>
        <tr>
          <th style="text-align: left;">Product Name</th>
          <th style="text-align: center;">Quantity</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${items.length === 0 ? `
          <tr>
            <td colspan="4" style="text-align: center; padding: 8px 0; color: #64748b;">No items recorded</td>
          </tr>
        ` : items.map(item => {
          const name = item.product_name || item.name || `Product #${item.product_id}`;
          const qty = parseInt(item.quantity || item.qty || 1);
          const unitPrice = parseFloat(item.unit_price || item.price || 0);
          const itemSubtotal = parseFloat(item.subtotal != null ? item.subtotal : (qty * unitPrice));
          return `
            <tr>
              <td class="receipt-col-product">${name}</td>
              <td class="receipt-col-qty">${qty}</td>
              <td class="receipt-col-price">&#8369;${unitPrice.toFixed(2)}</td>
              <td class="receipt-col-subtotal">&#8369;${itemSubtotal.toFixed(2)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="receipt-payment-summary">
      <div class="receipt-summary-line">
        <span>Subtotal</span>
        <span>&#8369;${subtotal.toFixed(2)}</span>
      </div>
      <div class="receipt-summary-line">
        <span>Discount</span>
        <span>${discount > 0 ? `-&#8369;${discount.toFixed(2)}` : `&#8369;0.00`}</span>
      </div>
      <div class="receipt-summary-total">
        <span>TOTAL AMOUNT</span>
        <span class="receipt-total-val">&#8369;${total.toFixed(2)}</span>
      </div>
      <div class="receipt-divider-dashed"></div>
      <div class="receipt-summary-line">
        <span>Payment Method</span>
        <span>${paymentMethod}</span>
      </div>
      <div class="receipt-summary-line">
        <span>Cash Received</span>
        <span>&#8369;${cashReceived.toFixed(2)}</span>
      </div>
      <div class="receipt-summary-line receipt-change-highlight">
        <span>Change</span>
        <span>&#8369;${changeAmount.toFixed(2)}</span>
      </div>
    </div>

    <div class="receipt-footer">
      <div class="receipt-divider-dashed"></div>
      <p class="receipt-footer-title">Thank you for purchasing at Rose Bakeshop!</p>
      <p class="receipt-footer-subtitle">Please come again!</p>
      <p class="receipt-footer-msg">This serves as your Official Sales Receipt.<br>Please keep this receipt for your records.</p>
      <div class="receipt-barcode-stub">
        <div class="receipt-barcode-lines">||| | | |||| | || ||||| | ||| || ||| | ||</div>
        <div class="receipt-barcode-num">${tx.transaction_number || ''}</div>
      </div>
    </div>
  `);

  if (overlay) overlay.style.display = 'block';
  modal.style.display = 'block';
}

function closePosReceiptModal() {
  const overlay = document.getElementById("pos-receipt-overlay");
  const modal = document.getElementById("pos-receipt-modal");
  if (overlay) overlay.style.display = 'none';
  if (modal) modal.style.display = 'none';
  if (currentReceiptTxData && currentReceiptTxData.isNewCheckout) {
    clearPosCart();
  }
}
window.closePosReceiptModal = closePosReceiptModal;

function printPosReceipt() {
  const container = document.getElementById("pos-receipt-printable");
  if (!container || !container.innerHTML.trim()) {
    showToast("No receipt available to print", "warning");
    return;
  }

  document.body.classList.add('printing-pos-receipt');

  // Enforce 80mm thermal receipt sizing during print dialog
  let styleEl = document.getElementById('pos-print-page-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'pos-print-page-style';
    styleEl.textContent = '@page { size: 80mm auto; margin: 0; }';
    document.head.appendChild(styleEl);
  }

  const cleanup = () => {
    document.body.classList.remove('printing-pos-receipt');
    const s = document.getElementById('pos-print-page-style');
    if (s) s.remove();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  // Trigger browser print dialog
  setTimeout(() => {
    window.print();
  }, 100);

  // Fallback cleanup if afterprint is cancelled or not fired
  setTimeout(cleanup, 3000);
}
window.printPosReceipt = printPosReceipt;

function getTxDateString(tx) {
  if (!tx) return '';
  // 1. Transaction number timestamp POS-B3-20261014-001 or SIM-POS-B3-20261101-001
  if (tx.transaction_number) {
    const m = String(tx.transaction_number).match(/2026(\d{2})(\d{2})/);
    if (m) {
      return `2026-${m[1]}-${m[2]}`;
    }
  }
  // 2. Direct date column
  const rawDate = tx.transaction_date || tx.date;
  if (rawDate) {
    if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim())) {
      return rawDate.trim();
    }
    if (typeof rawDate === 'string' && rawDate.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(rawDate.trim())) {
      return rawDate.trim().substring(0, 10);
    }
    try {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    } catch (e) {}
  }
  // 3. Fallback created_at
  if (tx.created_at) {
    if (typeof tx.created_at === 'string' && tx.created_at.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(tx.created_at.trim())) {
      return tx.created_at.trim().substring(0, 10);
    }
    try {
      const d = new Date(tx.created_at);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    } catch (e) {}
  }
  return '';
}

async function refreshPosHistory() {
  const tbody = document.getElementById("pos-history-tbody");
  if (!tbody) return;

  const user = store.currentUser;
  const isAdmin = user && user.role === 'admin';
  const userBranchId = user && user.branch_id ? parseInt(user.branch_id) : 1;

  // Handle branch filter dropdown according to role
  const branchSelect = document.getElementById("pos-history-branch");
  if (branchSelect) {
    if (isAdmin) {
      branchSelect.disabled = false;
      if (branchSelect.options.length <= 1) {
        setSafeHtml(branchSelect, '<option value="all">All Branches</option>' + 
          store.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join(''));
      }
    } else {
      const userBranchObj = store.branches.find(b => parseInt(b.id) === userBranchId);
      const bName = userBranchObj ? userBranchObj.name : `Branch ${userBranchId}`;
      setSafeHtml(branchSelect, `<option value="${userBranchId}">${bName}</option>`);
      branchSelect.value = String(userBranchId);
      branchSelect.disabled = true;
    }
  }

  const effectiveBranchId = isAdmin 
    ? (branchSelect?.value || store.getSelectedBranchId() || 'all')
    : userBranchId;

  const searchInput = (document.getElementById("pos-history-search")?.value || "").toLowerCase().trim();
  const selectedPayment = document.getElementById("pos-history-payment")?.value || 'all';
  const selectedStatus = document.getElementById("pos-history-status")?.value || 'all';
  const selectedDate = document.getElementById("pos-history-date")?.value || '';

  try {
    const qParams = new URLSearchParams();
    if (effectiveBranchId && effectiveBranchId !== 'all') qParams.set('branch_id', effectiveBranchId);
    if (selectedDate) qParams.set('date', selectedDate);
    if (selectedPayment && selectedPayment !== 'all') qParams.set('payment_method', selectedPayment);
    if (selectedStatus && selectedStatus !== 'all') qParams.set('status', selectedStatus);

    const queryUrl = `/api/pos/transactions?${qParams.toString()}`;
    const res = await fetch(queryUrl);
    const data = await res.json();
    let transactions = Array.isArray(data) ? data : (data && data.success && Array.isArray(data.transactions) ? data.transactions : []);

    // Filter locally (strictly isolating branch sales for non-admins)
    transactions = transactions.filter(tx => {
      const txBranchId = parseInt(tx.branch_id || tx.branchId || (store.getDefaultBranchId ? store.getDefaultBranchId() : 212));
      const matchBranch = isAdmin 
        ? (effectiveBranchId === 'all' || parseInt(effectiveBranchId) === txBranchId)
        : (txBranchId === userBranchId);

      const cashierStr = tx.cashier_name || tx.cashier || "";
      const matchSearch = !searchInput || 
        (tx.transaction_number && tx.transaction_number.toLowerCase().includes(searchInput)) ||
        cashierStr.toLowerCase().includes(searchInput) ||
        (tx.items && tx.items.some(i => (i.product_name || i.product_id || "").toLowerCase().includes(searchInput)));
      const matchPayment = selectedPayment === 'all' || (tx.payment_method || '').toLowerCase() === selectedPayment.toLowerCase();
      const matchStatus = selectedStatus === 'all' || (tx.status || '').toLowerCase() === selectedStatus.toLowerCase();
      
      const txDateStr = getTxDateString(tx);
      const matchDate = !selectedDate || (txDateStr === selectedDate || txDateStr.startsWith(selectedDate));
      return matchBranch && matchSearch && matchPayment && matchStatus && matchDate;
    });

    if (transactions.length === 0) {
      setSafeHtml(tbody, `
        <tr>
          <td colspan="9" style="text-align: center; padding: 30px; color: var(--text-muted);">
            No POS transactions found matching the selected filters.
          </td>
        </tr>
      `);
      return;
    }

    setSafeHtml(tbody, transactions.map(tx => {
      const txDateStr = getTxDateString(tx);
      let dateVal = tx.created_at || tx.transaction_date || tx.date;
      let dateFormatted = formatDateTimeDisplay(dateVal);

      // Clean transaction number (strip SIM- if present)
      const cleanTxNumber = String(tx.transaction_number || '').replace(/^SIM-/, '');

      // Preserve true date and time from database record
      if (txDateStr && /^\d{4}-\d{2}-\d{2}$/.test(txDateStr)) {
        const parts = txDateStr.split('-');
        const expectedDatePrefix = `${parts[1]}/${parts[2]}/${parts[0]}`;
        if (!dateFormatted.startsWith(expectedDatePrefix)) {
          const timeMatch = dateFormatted.match(/\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)/i);
          dateFormatted = `${expectedDatePrefix} ${timeMatch ? timeMatch[0] : ''}`.trim();
        }
      }
      const itemsCount = tx.items ? tx.items.reduce((sum, i) => sum + (parseInt(i.quantity) || 0), 0) : 0;
      const branchName = tx.branch_name || (store.branches.find(b => parseInt(b.id) === parseInt(tx.branch_id))?.name) || 'Main Branch';
      const cashierName = tx.cashier_name || tx.cashier || 'Staff';
      const statusBadge = tx.status === 'Completed' 
        ? `<span class="status-badge active" style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-weight: 700;">Completed</span>`
        : `<span class="status-badge inactive" style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-weight: 700;">Voided</span>`;

      return `
        <tr>
          <td style="font-weight: 700; color: var(--primary-color);">${cleanTxNumber}</td>
          <td style="font-size: 0.82rem; color: var(--text-secondary);">${dateFormatted}</td>
          <td>${branchName}</td>
          <td>${cashierName}</td>
          <td><strong>${tx.items ? tx.items.length : 0} items</strong> (${itemsCount} units)</td>
          <td style="font-weight: 800; color: var(--accent-color);">₱${parseFloat(tx.total || 0).toFixed(2)}</td>
          <td>${tx.payment_method || 'Cash'}</td>
          <td>${statusBadge}</td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px;" onclick="viewPosTransactionDetails(${tx.id})">
                <i data-lucide="eye" style="width: 14px; height: 14px;"></i> View
              </button>
              <button type="button" class="btn-primary-gold" style="padding: 4px 8px; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 4px;" onclick="reprintPosTransaction(${tx.id})">
                <i data-lucide="printer" style="width: 14px; height: 14px;"></i> Print
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join(''));

    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  } catch (err) {
    console.error("Error fetching POS transactions:", err);
  }
}
window.refreshPosHistory = refreshPosHistory;

async function viewPosTransactionDetails(txId) {
  try {
    const res = await fetch(`/api/pos/transactions/${txId}`);
    const data = await res.json();
    const tx = (data && data.transaction) ? data.transaction : data;
    if (!res.ok || !tx || (!tx.id && !tx.transaction_number)) throw new Error("Transaction details not found");
    
    const user = store.currentUser;
    const isAdmin = user && user.role === 'admin';
    const userBranchId = user && user.branch_id ? parseInt(user.branch_id) : 1;
    if (!isAdmin && tx.branch_id && parseInt(tx.branch_id) !== userBranchId) {
      alert("Access denied: You can only view transactions from your assigned branch.");
      return;
    }
    
    currentDetailsTxData = tx;

    const overlay = document.getElementById("pos-details-overlay");
    const modal = document.getElementById("pos-details-modal");
    const body = document.getElementById("pos-details-body");
    const title = document.getElementById("pos-details-modal-title");
    const voidBtn = document.getElementById("btn-pos-void-tx");

    if (title) title.textContent = `Transaction Details — ${tx.transaction_number}`;

    const txDateStr = getTxDateString(tx);
    let dateVal = tx.created_at || tx.transaction_date || tx.date;
    let dateFormatted = formatDateTimeDisplay(dateVal);
    const cleanTxNumber = String(tx.transaction_number || '').replace(/^SIM-/, '');
    if (txDateStr && /^\d{4}-\d{2}-\d{2}$/.test(txDateStr)) {
      const parts = txDateStr.split('-');
      const expectedDatePrefix = `${parts[1]}/${parts[2]}/${parts[0]}`;
      if (!dateFormatted.startsWith(expectedDatePrefix)) {
        const timeMatch = dateFormatted.match(/\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)/i);
        dateFormatted = `${expectedDatePrefix} ${timeMatch ? timeMatch[0] : ''}`.trim();
      }
    }
    const branchName = tx.branch_name || (store.branches.find(b => parseInt(b.id) === parseInt(tx.branch_id))?.name) || 'Main Branch';
    const cashierName = tx.cashier_name || tx.cashier || 'System Administrator';
    const itemsList = tx.items || [];

    setSafeHtml(body, `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: var(--bg-secondary); padding: 14px; border-radius: 8px; margin-bottom: 16px; font-size: 0.88rem;">
        <div><strong>Transaction ID:</strong> <span style="color: var(--primary-color); font-weight: 700;">${cleanTxNumber}</span></div>
        <div><strong>Exact Timestamp:</strong> ${dateFormatted}</div>
        <div><strong>Branch:</strong> ${branchName}</div>
        <div><strong>Cashier:</strong> ${cashierName}</div>
        <div><strong>Payment Method:</strong> ${tx.payment_method || 'Cash'}</div>
        <div><strong>Status:</strong> <span class="status-badge ${tx.status === 'Completed' ? 'active' : 'inactive'}" style="font-weight: 700; color: ${tx.status === 'Completed' ? 'var(--color-success)' : 'var(--color-error)'}">${tx.status || 'Completed'}</span></div>
      </div>

      <h4 style="margin-bottom: 8px; font-size: 0.95rem; font-weight: 700;">Itemized Purchased Items (${itemsList.length})</h4>
      <table class="data-table" style="margin-bottom: 16px;">
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Item Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList.map(i => {
            const pName = i.product_name || i.name || i.product_id;
            const uPrice = parseFloat(i.unit_price || i.price || 0);
            const qtyVal = parseInt(i.quantity || i.qty || 1);
            const subVal = parseFloat(i.subtotal || (uPrice * qtyVal));
            return `
              <tr>
                <td style="font-weight: 600;">${pName}</td>
                <td>${qtyVal}</td>
                <td>₱${uPrice.toFixed(2)}</td>
                <td style="font-weight: 700;">₱${subVal.toFixed(2)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div style="background: var(--bg-secondary); padding: 14px; border-radius: 8px; font-size: 0.9rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Subtotal:</span> <strong>₱${parseFloat(tx.subtotal || 0).toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>Discount:</span> <strong>₱${parseFloat(tx.discount || 0).toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 1.1rem; color: var(--accent-color); font-weight: 800; border-top: 1px dashed var(--border-color); padding-top: 6px; margin-top: 4px;">
          <span>Total Due:</span> <span>₱${parseFloat(tx.total || 0).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.88rem;">
          <span>Payment Method:</span> <strong>${tx.payment_method || 'Cash'}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 0.88rem;">
          <span>Cash Tendered:</span> <strong>₱${parseFloat(tx.payment_amount || tx.total || 0).toFixed(2)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 0.88rem; font-weight: 700; color: var(--color-success);">
          <span>Change:</span> <strong>₱${parseFloat(tx.change_amount || 0).toFixed(2)}</strong>
        </div>
      </div>
    `);

    if (voidBtn) {
      if (tx.status === 'Completed') {
        voidBtn.style.display = 'flex';
        voidBtn.onclick = () => voidPosTransaction(tx.id);
      } else {
        voidBtn.style.display = 'none';
      }
    }

    if (overlay) overlay.style.display = 'block';
    if (modal) modal.style.display = 'block';
  } catch (err) {
    showToast(err.message, "danger");
  }
}
window.viewPosTransactionDetails = viewPosTransactionDetails;

function closePosDetailsModal() {
  const overlay = document.getElementById("pos-details-overlay");
  const modal = document.getElementById("pos-details-modal");
  if (overlay) overlay.style.display = 'none';
  if (modal) modal.style.display = 'none';
}
window.closePosDetailsModal = closePosDetailsModal;

function printPosReceiptFromDetails() {
  if (!currentDetailsTxData) {
    showToast("No transaction selected for printing", "warning");
    return;
  }

  const tx = currentDetailsTxData;
  const bId = parseInt(tx.branch_id);
  const branchObj = (store.branches || []).find(b => parseInt(b.id) === bId);

  closePosDetailsModal();

  showPosReceiptModal({
    transaction_number: tx.transaction_number,
    transaction_date: tx.created_at || tx.transaction_date || tx.date,
    branch_id: tx.branch_id,
    branch_name: branchObj ? branchObj.name : (tx.branch_name || 'Main Branch'),
    branch_address: branchObj && branchObj.address ? branchObj.address : 'Commercial Center, Poblacion, Davao City',
    branch_contact: branchObj && branchObj.contact_no ? branchObj.contact_no : '0917-123-4567',
    cashier_name: tx.cashier_name || tx.cashier || 'System Administrator',
    items: tx.items || [],
    subtotal: tx.subtotal,
    discount: tx.discount,
    total: tx.total,
    payment_amount: tx.payment_amount != null ? tx.payment_amount : tx.total,
    change_amount: tx.change_amount || 0,
    payment_method: tx.payment_method || 'Cash'
  });
}
window.printPosReceiptFromDetails = printPosReceiptFromDetails;

async function reprintPosTransaction(txId) {
  try {
    const res = await fetch(`/api/pos/transactions/${txId}`);
    if (!res.ok) throw new Error("Could not load transaction details");
    const data = await res.json();
    const tx = (data && data.transaction) ? data.transaction : data;
    if (!tx) throw new Error("Transaction not found");

    const bId = parseInt(tx.branch_id);
    const branchObj = (store.branches || []).find(b => parseInt(b.id) === bId);

    showPosReceiptModal({
      transaction_number: tx.transaction_number,
      transaction_date: tx.created_at || tx.transaction_date || tx.date,
      branch_id: tx.branch_id,
      branch_name: branchObj ? branchObj.name : (tx.branch_name || 'Main Branch'),
      branch_address: branchObj && branchObj.address ? branchObj.address : 'Commercial Center, Poblacion, Davao City',
      branch_contact: branchObj && branchObj.contact_no ? branchObj.contact_no : '0917-123-4567',
      cashier_name: tx.cashier_name || tx.cashier || 'System Administrator',
      items: tx.items || [],
      subtotal: tx.subtotal,
      discount: tx.discount,
      total: tx.total,
      payment_amount: tx.payment_amount != null ? tx.payment_amount : tx.total,
      change_amount: tx.change_amount || 0,
      payment_method: tx.payment_method || 'Cash'
    });
  } catch (err) {
    showToast(`Error loading receipt: ${err.message}`, "danger");
  }
}
window.reprintPosTransaction = reprintPosTransaction;

async function voidPosTransaction(txId) {
  const confirmed = await showConfirmModal(
    "Are you sure you want to void this transaction? The deducted inventory will be automatically restored back to stock.",
    "Void POS Transaction",
    "alert-triangle"
  );
  if (!confirmed) return;

  const voidBtn = document.getElementById("btn-pos-void-tx");
  if (voidBtn) {
    voidBtn.disabled = true;
    voidBtn.innerHTML = '<i data-lucide="loader" class="animate-spin" style="width: 16px; height: 16px;"></i> Voiding...';
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons({ root: voidBtn });
  }

  try {
    const res = await fetch(`/api/pos/void/${txId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voided_by: store.currentUser ? store.currentUser.name : "System Administrator" })
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to void transaction");

    showToast("Transaction voided successfully and inventory restored!", "success");
    await store.syncWithBackend();
    closePosDetailsModal();
    refreshPosHistory();
    refreshInventoryPane();
    renderPosProducts();
  } catch (err) {
    showToast(err.message, "danger");
  } finally {
    if (voidBtn) {
      voidBtn.disabled = false;
      voidBtn.innerHTML = '<i data-lucide="slash" style="width: 16px; height: 16px;"></i> Void Transaction';
      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons({ root: voidBtn });
    }
  }
}
window.voidPosTransaction = voidPosTransaction;

let isPosModuleInitialized = false;

function setupPOSModule() {
  if (isPosModuleInitialized) return;
  isPosModuleInitialized = true;

  // Category pill listeners
  const categoryPills = document.querySelectorAll(".category-pill");
  categoryPills.forEach(pill => {
    pill.addEventListener("click", () => {
      categoryPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      activePosCategory = pill.getAttribute("data-category") || 'all';
      renderPosProducts();
    });
  });

  // Product search input
  const searchInput = document.getElementById("pos-product-search");
  if (searchInput) {
    searchInput.addEventListener("input", renderPosProducts);
  }

  // Event delegation on product grid: STRICT intentional left-click adds product directly to cart
  const gridContainer = document.getElementById("pos-products-grid");
  let cardMouseDownTarget = null;
  let cardMouseDownX = 0;
  let cardMouseDownY = 0;
  let lastCardClickTime = 0;
  let lastCardClickProductId = null;

  if (gridContainer) {
    // 1. Explicitly ignore and block all non-click / hover / mouse movement triggers from altering cart
    const passiveHoverHandler = (e) => {
      // Hover and movement events are purely visual; never trigger cart modifications
    };
    gridContainer.addEventListener("mouseover", passiveHoverHandler, { passive: true });
    gridContainer.addEventListener("mouseenter", passiveHoverHandler, { passive: true });
    gridContainer.addEventListener("mousemove", passiveHoverHandler, { passive: true });
    gridContainer.addEventListener("pointerover", passiveHoverHandler, { passive: true });
    gridContainer.addEventListener("pointerenter", passiveHoverHandler, { passive: true });
    gridContainer.addEventListener("pointermove", passiveHoverHandler, { passive: true });

    // 2. Track mousedown to verify intentional primary click on the exact same product card
    gridContainer.addEventListener("mousedown", (e) => {
      if (e.button !== 0) {
        cardMouseDownTarget = null;
        return;
      }
      const card = e.target.closest(".pos-product-card");
      if (card && !card.classList.contains("disabled-card")) {
        cardMouseDownTarget = card;
        cardMouseDownX = e.clientX;
        cardMouseDownY = e.clientY;
      } else {
        cardMouseDownTarget = null;
      }
    });

    window.addEventListener("mouseup", (e) => {
      // If mouse is released outside or moved away, reset target
      if (cardMouseDownTarget && e.target && !cardMouseDownTarget.contains(e.target) && e.target !== cardMouseDownTarget) {
        cardMouseDownTarget = null;
      }
    });

    // 3. Strict click verification: must be intentional left click, same card, minimal movement, not a drag
    gridContainer.addEventListener("click", (e) => {
      // Strictly require primary left-click
      if (e.button !== 0) return;

      const card = e.target.closest(".pos-product-card");
      if (!card || card.classList.contains("disabled-card")) {
        cardMouseDownTarget = null;
        return;
      }

      // Verify that this click was initiated on this exact same card
      if (cardMouseDownTarget && cardMouseDownTarget !== card) {
        // Pointer was dragged across from another card: reject!
        cardMouseDownTarget = null;
        return;
      }

      // Reject drag-over / moving across cards
      if (cardMouseDownX || cardMouseDownY) {
        const dist = Math.hypot(e.clientX - cardMouseDownX, e.clientY - cardMouseDownY);
        if (dist > 15) {
          cardMouseDownTarget = null;
          return;
        }
      }

      const productId = card.getAttribute("data-product-id");
      if (!productId) {
        cardMouseDownTarget = null;
        return;
      }

      const now = Date.now();
      // Debounce rapid accidental bounce (< 150ms) on the exact same card
      if (lastCardClickProductId === productId && (now - lastCardClickTime < 150)) {
        return;
      }

      lastCardClickTime = now;
      lastCardClickProductId = productId;
      cardMouseDownTarget = null;

      // Intentional single click: add exactly 1 quantity to cart
      addToPosCart(productId);
    });
  }

  // Event delegation on cart items list
  const cartList = document.getElementById("pos-cart-items-list");
  if (cartList) {
    cartList.addEventListener("click", (e) => {
      const qtyBtn = e.target.closest(".qty-btn");
      if (qtyBtn) {
        e.preventDefault();
        const pid = qtyBtn.getAttribute("data-product-id");
        const delta = parseInt(qtyBtn.getAttribute("data-delta"), 10) || 0;
        if (pid && delta) updatePosCartQty(pid, delta);
        return;
      }
      const removeBtn = e.target.closest(".cart-item-remove");
      if (removeBtn) {
        e.preventDefault();
        const pid = removeBtn.getAttribute("data-product-id");
        if (pid) removeFromPosCart(pid);
        return;
      }
    });
  }

  // Global document click delegation for POS Action Buttons & Tabs
  document.addEventListener("click", (e) => {
    const closeReceiptBtn = e.target.closest("#btn-pos-receipt-close, #pos-receipt-overlay");
    if (closeReceiptBtn) {
      e.preventDefault();
      closePosReceiptModal();
      return;
    }

    const printReceiptBtn = e.target.closest("#btn-pos-receipt-print");
    if (printReceiptBtn) {
      e.preventDefault();
      printPosReceipt();
      return;
    }

    const clearBtn = e.target.closest("#btn-pos-clear-cart");
    if (clearBtn) {
      e.preventDefault();
      clearPosCart();
      return;
    }

    const checkoutBtn = e.target.closest("#btn-pos-checkout");
    if (checkoutBtn) {
      e.preventDefault();
      handlePosCheckout();
      return;
    }

    const tabSaleBtn = e.target.closest("#btn-pos-tab-sale");
    if (tabSaleBtn) {
      e.preventDefault();
      switchPosTab('new-sale');
      return;
    }

    const tabHistBtn = e.target.closest("#btn-pos-tab-history");
    if (tabHistBtn) {
      e.preventDefault();
      switchPosTab('history');
      return;
    }

    const presetBtn = e.target.closest(".preset-btn");
    if (presetBtn) {
      e.preventDefault();
      const txt = presetBtn.innerText.replace('₱','').trim().toLowerCase();
      if (txt === 'exact') setPosCashPreset('exact');
      else setPosCashPreset(parseFloat(txt) || 0);
      return;
    }

    const payBtn = e.target.closest(".pay-method-btn");
    if (payBtn) {
      e.preventDefault();
      document.querySelectorAll(".pay-method-btn").forEach(b => b.classList.remove("active"));
      payBtn.classList.add("active");
      currentPosPaymentMethod = payBtn.getAttribute("data-method") || 'Cash';
      const cashGroup = document.getElementById("pos-cash-input-group");
      if (cashGroup) {
        cashGroup.style.display = currentPosPaymentMethod === 'Cash' ? 'block' : 'none';
      }
      updatePosCartUI();
      return;
    }
  });

  // POS Branch Selector for Admins
  const posBranchSelect = document.getElementById("pos-branch-select");
  if (posBranchSelect) {
    posBranchSelect.addEventListener("change", async function() {
      const newBId = parseInt(this.value);
      if (posCart.length > 0) {
        const confirmed = await showConfirmModal(
          "Switching branches will clear your current order cart. Do you want to proceed?",
          "Switch POS Branch",
          "arrow-right-left"
        );
        if (!confirmed) {
          this.value = String(getPosEffectiveBranchId());
          return;
        }
        posCart = [];
      }
      currentPosSelectedBranchId = newBId;
      updatePosCartUI();
      renderPosProducts();
      const bObj = (store.branches || []).find(b => parseInt(b.id) === newBId);
      showToast(`Switched POS terminal to ${bObj ? bObj.name : 'Branch ' + newBId}`, "info");
    });
  }

  // Discount & Tendered Inputs
  const discountInput = document.getElementById("pos-discount-input");
  if (discountInput) discountInput.addEventListener("input", updatePosCartUI);

  const tenderedInput = document.getElementById("pos-tendered-input");
  if (tenderedInput) tenderedInput.addEventListener("input", updatePosCartUI);

  // Sales History filter listeners
  const histSearch = document.getElementById("pos-history-search");
  const histBranch = document.getElementById("pos-history-branch");
  const histPay = document.getElementById("pos-history-payment");
  const histStatus = document.getElementById("pos-history-status");
  const histDate = document.getElementById("pos-history-date");

  [histSearch, histBranch, histPay, histStatus, histDate].forEach(el => {
    if (el) el.addEventListener("change", refreshPosHistory);
    if (el && el.tagName === "INPUT") el.addEventListener("keyup", refreshPosHistory);
  });
}

// 3. INVENTORY CHECK VIEW REFRESHER
function refreshInventoryPane() {
  const tbody = document.getElementById("inventory-tbody");
  if (!tbody) return;

  const branchFilterEl = document.getElementById("inventory-branch-filter");
  const searchInputEl = document.getElementById("inventory-search-input");
  const categoryFilterEl = document.getElementById("inventory-category-filter");
  const dateFilterEl = document.getElementById("inventory-date-filter");
  const expiryFilterEl = document.getElementById("inventory-expiry-filter");
  const statusFilterEl = document.getElementById("inventory-status-filter");

  if (branchFilterEl && branchFilterEl.options.length <= 1) {
    const branches = store.branches || [];
    branchFilterEl.innerHTML = `<option value="all">All Branches</option>` + 
      branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

    if (store.currentUser && store.currentUser.role !== 'admin') {
      branchFilterEl.value = store.currentUser.branch_id || store.currentUser.branchId || 'all';
      branchFilterEl.disabled = true;
    }

    if (!branchFilterEl.dataset.listening) {
      branchFilterEl.dataset.listening = "true";
      branchFilterEl.addEventListener("change", () => {
        inventoryCurrentPage = 1;
        refreshInventoryPane();
      });
    }
  }

  [searchInputEl, categoryFilterEl, dateFilterEl, expiryFilterEl, statusFilterEl].forEach(el => {
    if (el && !el.dataset.listening) {
      el.dataset.listening = "true";
      el.addEventListener(el.tagName === 'INPUT' && el.type === 'text' ? 'input' : 'change', () => {
        inventoryCurrentPage = 1;
        refreshInventoryPane();
      });
    }
  });

  const branchVal = branchFilterEl ? branchFilterEl.value : 'all';
  const searchVal = searchInputEl ? searchInputEl.value.toLowerCase().trim() : '';
  const categoryVal = categoryFilterEl ? categoryFilterEl.value : 'all';
  const dateVal = dateFilterEl ? dateFilterEl.value : '';
  const expiryVal = expiryFilterEl ? expiryFilterEl.value : '';
  const statusVal = statusFilterEl ? statusFilterEl.value : 'all';

  const filteredInventory = (store.inventory || []).filter(item => {
    if (branchVal !== 'all' && parseInt(item.branchId || item.branch_id) !== parseInt(branchVal)) return false;

    const p = (store.products || []).find(x => x.id === (item.productId || item.product_id));
    const pName = p ? p.name.toLowerCase() : String(item.productId || item.product_id).toLowerCase();
    const pCat = p ? p.category.toUpperCase() : 'BREAD';

    if (searchVal && !pName.includes(searchVal)) return false;
    if (categoryVal !== 'all' && pCat !== categoryVal.toUpperCase()) return false;
    
    const getCleanDate = (val) => {
      if (!val) return '';
      const s = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
      return s;
    };
    const prodStr = getCleanDate(item.productionDate);
    const expStr = getCleanDate(item.expiryDate);
    if (dateVal && prodStr !== dateVal && !prodStr.startsWith(dateVal)) return false;
    if (expiryVal && expStr !== expiryVal && !expStr.startsWith(expiryVal)) return false;

    const fIndex = getFreshnessIndex(item.productionDate, item.expiryDate);
    let shelfStatus = 'Fresh';
    if (fIndex === 0) shelfStatus = 'Expired';
    else if (fIndex <= 30) shelfStatus = 'Near Expiry';
    else if (item.stockLevel <= 10) shelfStatus = 'Low Stock';

    if (statusVal !== 'all' && shelfStatus.toLowerCase() !== statusVal.toLowerCase()) return false;

    return true;
  });

  // Consolidate inventory: when no specific production or expiry date is filtered, show each product once per branch (eliminating duplicate product rows)
  let displayInventory = filteredInventory;
  if (!dateVal && !expiryVal) {
    const productMap = new Map();
    for (const item of filteredInventory) {
      const pId = String(item.productId || item.product_id);
      const bId = String(item.branchId || item.branch_id);
      const key = `${bId}_${pId}`;
      const existing = productMap.get(key);
      if (!existing) {
        productMap.set(key, item);
      } else {
        const curDate = new Date(item.productionDate || item.expiryDate || 0).getTime();
        const prevDate = new Date(existing.productionDate || existing.expiryDate || 0).getTime();
        if (curDate > prevDate) {
          productMap.set(key, item);
        }
      }
    }
    displayInventory = Array.from(productMap.values());
  }

  const totalPages = Math.ceil(displayInventory.length / ITEMS_PER_PAGE) || 1;
  if (inventoryCurrentPage > totalPages) inventoryCurrentPage = totalPages;
  const startIndex = (inventoryCurrentPage - 1) * ITEMS_PER_PAGE;
  const pagedInventory = displayInventory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  setSafeHtml(tbody, pagedInventory.map(item => {
    const p = store.products.find(x => x.id === (item.productId || item.product_id));
    const pName = p ? p.name : (item.productId || item.product_id);
    const pCategory = p ? p.category : 'Bread';

    const fIndex = getFreshnessIndex(item.productionDate, item.expiryDate);
    const degradation = 100 - fIndex;
    let statusClass = "success";
    let statusText = "Fresh";
    let barColor = "var(--color-success)";

    if (fIndex === 0) {
      statusClass = "danger";
      statusText = "Expired";
      barColor = "var(--color-error)";
    } else if (fIndex <= 30) {
      statusClass = "warning";
      statusText = "Near Expiry";
      barColor = "var(--color-warning)";
    } else if (item.stockLevel <= 10) {
      statusClass = "warning";
      statusText = "Low Stock";
    }

    const prodFormatted = formatDateTimeDisplay(item.productionDate);
    const expFormatted = formatDateTimeDisplay(item.expiryDate);
    const b = (store.branches || []).find(x => parseInt(x.id) === parseInt(item.branchId)) || { name: `Branch ${item.branchId}` };

    return `
      <tr>
        <td style="font-weight: 700;">${pName}</td>
        <td style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">${b.name}</td>
        <td><span class="badge info">${pCategory}</span></td>
        <td style="font-weight: 700;">${item.stockLevel} ${item.unit || 'pcs'}</td>
        <td style="font-size: 0.85rem; color: var(--text-primary); font-weight: 600;">${prodFormatted}</td>
        <td style="font-size: 0.85rem; color: var(--text-primary); font-weight: 600;">${expFormatted}</td>
        <td>
          <div class="freshness-indicator">
            <div class="freshness-bar-outer" title="${degradation}% Degradation">
              <div class="freshness-bar-inner" style="width: ${degradation}%; background-color: ${barColor};"></div>
            </div>
            <span class="freshness-value" style="font-size: 0.8rem; font-weight: 600;">${degradation}%</span>
          </div>
        </td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn-secondary inv-row-adjust-btn" data-pid="${item.productId}" data-branch="${item.branchId}" style="padding: 4px 8px; font-size: 0.78rem;" title="Adjust Stock">Adjust</button>
            <button class="btn-secondary inv-row-transfer-btn" data-pid="${item.productId}" data-branch="${item.branchId}" style="padding: 4px 8px; font-size: 0.78rem;" title="Transfer Stock">Transfer</button>
          </div>
        </td>
      </tr>
    `;
  }).join(''));

  const prevBtn = document.getElementById("inventory-prev-page");
  const nextBtn = document.getElementById("inventory-next-page");
  const pageInfo = document.getElementById("inventory-page-info");

  if (pageInfo) pageInfo.textContent = `Page ${inventoryCurrentPage} of ${totalPages}`;
  if (prevBtn) {
    prevBtn.disabled = inventoryCurrentPage <= 1;
    prevBtn.style.opacity = inventoryCurrentPage <= 1 ? "0.5" : "1";
    prevBtn.onclick = () => {
      if (inventoryCurrentPage > 1) {
        inventoryCurrentPage--;
        refreshInventoryPane();
      }
    };
  }
  if (nextBtn) {
    nextBtn.disabled = inventoryCurrentPage >= totalPages;
    nextBtn.style.opacity = inventoryCurrentPage >= totalPages ? "0.5" : "1";
    nextBtn.onclick = () => {
      if (inventoryCurrentPage < totalPages) {
        inventoryCurrentPage++;
        refreshInventoryPane();
      }
    };
  }

  document.querySelectorAll(".inv-row-adjust-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const pid = btn.getAttribute("data-pid");
      const branchId = btn.getAttribute("data-branch");
      if (window.openAdjustModal) window.openAdjustModal(branchId, pid);
    });
  });

  document.querySelectorAll(".inv-row-transfer-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const pid = btn.getAttribute("data-pid");
      const branchId = btn.getAttribute("data-branch");
      if (window.openTransferModal) window.openTransferModal(branchId, pid);
    });
  });

  lucide.createIcons();
}

// 4. PRODUCTION LOGS VIEW REFRESHER
function refreshProductionPane() {
  const tbody = document.getElementById("production-history-tbody");
  if (!tbody) return;

  const branchIdStr = store.getSelectedBranchId();
  const branchId = branchIdStr === 'all' ? 'all' : parseInt(branchIdStr);

  const searchInput = document.getElementById('prod-search-input')?.value.toLowerCase() || '';
  const batchFilter = document.getElementById('prod-batch-filter')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('prod-status-filter')?.value || 'all';
  const localBranchFilter = document.getElementById('prod-branch-filter')?.value || 'all';
  const effectiveBranchId = localBranchFilter !== 'all' ? parseInt(localBranchFilter) : branchId;

  const sortedProd = [...store.production]
    .filter(p => effectiveBranchId === 'all' || parseInt(p.branchId || p.branch_id) === parseInt(effectiveBranchId))
    .filter(p => {
      const prodObj = store.products.find(x => x.id === (p.productId || p.product_id));
      const nameMatch = prodObj ? prodObj.name.toLowerCase().includes(searchInput) : true;
      const bCode = p.code || p.batchId || p.batch_id || '';
      const batchMatch = batchFilter ? bCode.toLowerCase().includes(batchFilter) : true;
      const statusMatch = statusFilter === 'all' ? true : (p.status || '').toLowerCase() === statusFilter.toLowerCase();
      return nameMatch && batchMatch && statusMatch;
    })
    .sort((a, b) => {
    const dA = parseLocalDate(a.date);
    const dB = parseLocalDate(b.date);
    return dB.getTime() - dA.getTime();
  });

  const totalPages = Math.ceil(sortedProd.length / ITEMS_PER_PAGE) || 1;
  if (prodHistCurrentPage > totalPages) prodHistCurrentPage = totalPages;
  const startIndex = (prodHistCurrentPage - 1) * ITEMS_PER_PAGE;
  const pagedProd = sortedProd.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  setSafeHtml(tbody, pagedProd.map(pr => {
    const p = store.products.find(x => x.id === pr.productId) || { name: "Unknown" };
    const b = (store.branches || []).find(x => parseInt(x.id) === parseInt(pr.branchId || pr.branch_id)) || (store.branches.length > 0 ? store.branches[0] : { name: "Main Branch" });
    const efficiency = pr.planned > 0 ? Math.round((pr.actual / pr.planned) * 100) : 100;

    return `
      <tr>
        <td style="font-weight: 600;">${p.name}</td>
        <td style="color: var(--text-secondary); font-size: 0.85rem;">${b.name}</td>
        <td>${pr.planned} pcs</td>
        <td>${pr.actual} pcs</td>
        <td style="font-weight: 600; color: ${efficiency >= 100 ? 'var(--color-success)' : 'var(--color-warning)'}">${efficiency}%</td>
        <td><code>${pr.code}</code></td>
        <td><span class="badge success">${pr.status}</span></td>
      </tr>
    `;
  }).join(''));

  const prevBtn = document.getElementById("prod-hist-prev-page");
  const nextBtn = document.getElementById("prod-hist-next-page");
  const pageInfo = document.getElementById("prod-hist-page-info");

  if (pageInfo) pageInfo.textContent = `Page ${prodHistCurrentPage} of ${totalPages}`;
  if (prevBtn) {
    prevBtn.disabled = prodHistCurrentPage <= 1;
    prevBtn.style.opacity = prodHistCurrentPage <= 1 ? "0.5" : "1";
    prevBtn.onclick = () => {
      if (prodHistCurrentPage > 1) {
        prodHistCurrentPage--;
        refreshProductionPane();
      }
    };
  }
  if (nextBtn) {
    nextBtn.disabled = prodHistCurrentPage >= totalPages;
    nextBtn.style.opacity = prodHistCurrentPage >= totalPages ? "0.5" : "1";
    nextBtn.onclick = () => {
      if (prodHistCurrentPage < totalPages) {
        prodHistCurrentPage++;
        refreshProductionPane();
      }
    };
  }
}

// 5. WASTE MONITORING VIEW REFRESHER
function refreshWastePane() {
  const tbody = document.getElementById("waste-history-tbody");
  if (!tbody) return;

  const branchIdStr = store.getSelectedBranchId();
  const branchId = branchIdStr === 'all' ? 'all' : parseInt(branchIdStr);

  const searchInput = document.getElementById('waste-search-input')?.value.toLowerCase() || '';
  const dateFilter = document.getElementById('waste-date-filter')?.value || '';
  const localBranchFilter = document.getElementById('waste-branch-filter')?.value || 'all';
  const effectiveBranchId = localBranchFilter !== 'all' ? parseInt(localBranchFilter) : branchId;

  const sortedWaste = [...store.waste]
    .filter(w => effectiveBranchId === 'all' || parseInt(w.branchId) === parseInt(effectiveBranchId))
    .filter(w => {
      const p = store.products.find(x => x.id === w.productId);
      const nameMatch = p ? p.name.toLowerCase().includes(searchInput) : true;
      const dateMatch = dateFilter ? w.date.startsWith(dateFilter) : true;
      return nameMatch && dateMatch;
    })
    .sort((a, b) => {
    const dA = parseLocalDate(a.date);
    const dB = parseLocalDate(b.date);
    return dB.getTime() - dA.getTime();
  });

  const totalPages = Math.ceil(sortedWaste.length / ITEMS_PER_PAGE) || 1;
  if (wasteHistCurrentPage > totalPages) wasteHistCurrentPage = totalPages;
  const startIndex = (wasteHistCurrentPage - 1) * ITEMS_PER_PAGE;
  const pagedWaste = sortedWaste.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  setSafeHtml(tbody, pagedWaste.map(w => {
    const p = store.products.find(x => x.id === (w.productId || w.product_id)) || { name: "Unknown" };
    const b = (store.branches || []).find(x => parseInt(x.id) === parseInt(w.branchId || w.branch_id)) || (store.branches.length > 0 ? store.branches[0] : { name: "Main Branch" });
    const uCost = (p && p.cost != null) ? parseFloat(p.cost) : parseFloat(w.cost || 0);
    const totalCost = (parseInt(w.qty) || 0) * uCost;
    const dateObj = parseLocalDate(w.date);

    return `
      <tr>
        <td style="font-weight: 600;">${p.name}</td>
        <td style="color: var(--text-secondary); font-size: 0.85rem;">${b.name}</td>
        <td>${w.qty} pcs</td>
        <td style="font-weight: 600; color: var(--color-error)">₱${totalCost.toFixed(2)}</td>
        <td><span class="badge ${w.reason === 'Expired' ? 'danger' : 'warning'}">${w.reason}</span></td>
        <td>${dateObj.toLocaleDateString()}</td>
      </tr>
    `;
  }).join(''));

  const prevBtn = document.getElementById("waste-hist-prev-page");
  const nextBtn = document.getElementById("waste-hist-next-page");
  const pageInfo = document.getElementById("waste-hist-page-info");

  if (pageInfo) pageInfo.textContent = `Page ${wasteHistCurrentPage} of ${totalPages}`;
  if (prevBtn) {
    prevBtn.disabled = wasteHistCurrentPage <= 1;
    prevBtn.style.opacity = wasteHistCurrentPage <= 1 ? "0.5" : "1";
    prevBtn.onclick = () => {
      if (wasteHistCurrentPage > 1) {
        wasteHistCurrentPage--;
        refreshWastePane();
      }
    };
  }
  if (nextBtn) {
    nextBtn.disabled = wasteHistCurrentPage >= totalPages;
    nextBtn.style.opacity = wasteHistCurrentPage >= totalPages ? "0.5" : "1";
    nextBtn.onclick = () => {
      if (wasteHistCurrentPage < totalPages) {
        wasteHistCurrentPage++;
        refreshWastePane();
      }
    };
  }
}

// 6. AI ANALYTICS CONTROLLER & DEMAND FORECASTING ENGINE
async function refreshAIAnalyticsPane() {
  try { await renderAIDemandForecastChart(); } catch (e) { console.error("renderAIDemandForecastChart error:", e); }
  try { await renderDailyPredictionTable(); } catch (e) { console.error("renderDailyPredictionTable error:", e); }
  try { await render7DayProjectionTable(); } catch (e) { console.error("render7DayProjectionTable error:", e); }
  try { await renderBakeRecommendations(); } catch (e) { console.error("renderBakeRecommendations error:", e); }
  try { await renderRepurposingAlerts(); } catch (e) { console.error("renderRepurposingAlerts error:", e); }

  // Bind Refresh buttons for Demand Forecasting
  const btnRefreshRecs = document.getElementById("btn-refresh-recs");
  if (btnRefreshRecs && !btnRefreshRecs._bound) {
    btnRefreshRecs._bound = true;
    btnRefreshRecs.addEventListener("click", async () => {
      btnRefreshRecs.disabled = true;
      btnRefreshRecs.style.opacity = "0.6";
      if (store.isBackendOnline) {
        try { await store.syncWithBackend(); } catch(e) {}
      }
      await renderBakeRecommendations();
      showToast("Production recommendations refreshed using latest database records.", "info");
      btnRefreshRecs.disabled = false;
      btnRefreshRecs.style.opacity = "1";
    });
  }

  const btnRefreshRepurpose = document.getElementById("btn-refresh-repurpose");
  if (btnRefreshRepurpose && !btnRefreshRepurpose._bound) {
    btnRefreshRepurpose._bound = true;
    btnRefreshRepurpose.addEventListener("click", async () => {
      btnRefreshRepurpose.disabled = true;
      btnRefreshRepurpose.style.opacity = "0.6";
      if (store.isBackendOnline) {
        try { await store.syncWithBackend(); } catch(e) {}
      }
      await renderRepurposingAlerts();
      showToast("Repurposing recommendations refreshed from live batch records.", "info");
      btnRefreshRepurpose.disabled = false;
      btnRefreshRepurpose.style.opacity = "1";
    });
  }

  // Bind Repurposing Category Filter Tabs
  const filterBtns = document.querySelectorAll(".btn-filter-repurpose");
  filterBtns.forEach(btn => {
    if (!btn._bound) {
      btn._bound = true;
      btn.addEventListener("click", () => {
        filterBtns.forEach(b => {
          b.classList.remove("active");
          b.style.background = "var(--bg-surface)";
          b.style.color = "var(--text-secondary)";
        });
        btn.classList.add("active");
        btn.style.background = "var(--primary-color)";
        btn.style.color = "white";
        currentRepurposeFilter = btn.getAttribute("data-filter") || 'all';
        renderRepurposingAlerts();
      });
    }
  });
}

function computeLocalDemandForecast(productId, salesRecords, product, branchId) {
  const today = new Date();
  const catLower = (product?.category || '').toLowerCase();
  const nameLower = (product?.name || '').toLowerCase();
  const unit = product?.unit || 'pcs';

  let defaultBaseline = 15;
  if (nameLower.includes('pandesal') || catLower.includes('bread')) defaultBaseline = 22;
  else if (catLower.includes('pastr') || nameLower.includes('ensaymada') || nameLower.includes('muffin')) defaultBaseline = 14;
  else if (catLower.includes('cake') || nameLower.includes('cake')) defaultBaseline = 4;
  else if (catLower.includes('beverage') || nameLower.includes('coke') || nameLower.includes('drink')) defaultBaseline = 12;

  const standardDowMultipliers = {
    0: 1.20, // Sunday
    1: 0.90, // Monday
    2: 0.92, // Tuesday
    3: 0.95, // Wednesday
    4: 1.00, // Thursday
    5: 1.15, // Friday
    6: 1.25  // Saturday
  };

  const dailySalesMap = new Map();
  if (Array.isArray(salesRecords)) {
    for (const s of salesRecords) {
      if (!s) continue;
      const rawDate = s.date || s.created_at;
      if (!rawDate) continue;
      const dateStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : new Date(rawDate).toISOString().split('T')[0];
      const q = parseInt(s.qty || s.quantity) || 0;
      if (q > 0) {
        dailySalesMap.set(dateStr, (dailySalesMap.get(dateStr) || 0) + q);
      }
    }
  }

  const sortedDates = Array.from(dailySalesMap.keys()).sort();
  const salesDaysCount = sortedDates.length;
  const totalQtySold = Array.from(dailySalesMap.values()).reduce((a, b) => a + b, 0);

  if (salesDaysCount < 3) {
    const historicalAvg = salesDaysCount > 0 ? parseFloat((totalQtySold / salesDaysCount).toFixed(1)) : 0;
    const baseVal = historicalAvg > 0 ? Math.round(historicalAvg) : defaultBaseline;

    const dailyForecast = [];
    for (let d = 1; d <= 7; d++) {
      const dDate = new Date(today);
      dDate.setDate(dDate.getDate() + d);
      const dow = dDate.getDay();
      const mult = standardDowMultipliers[dow] || 1.0;
      dailyForecast.push(Math.max(1, Math.round(baseVal * mult)));
    }
    const sevenDayTotal = dailyForecast.reduce((a, b) => a + b, 0);

    return {
      productId: productId || '',
      productName: product?.name || productId,
      demand: dailyForecast[0],
      dailyForecast: dailyForecast,
      sevenDayTotal: sevenDayTotal,
      historicalAvg: historicalAvg,
      confidence: "Insufficient historical data",
      reliabilityScore: "N/A (< 3 sales days)",
      dataPoints: salesDaysCount,
      dataPeriod: salesDaysCount > 0 ? `${salesDaysCount} recorded sales day(s)` : "No completed sales records",
      isFallback: true,
      fallbackReason: "Insufficient historical transaction data (< 3 distinct sales days) to train statistical prediction model.",
      trend: "Insufficient Data",
      unit: unit,
      lastUpdated: new Date().toISOString()
    };
  }

  const historicalAvg = parseFloat((totalQtySold / salesDaysCount).toFixed(1));

  // Empirical DOW seasonality
  const dowSales = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const [dateStr, q] of dailySalesMap.entries()) {
    const dow = new Date(dateStr + 'T12:00:00').getDay();
    dowSales[dow].push(q);
  }

  const empiricalDowMultipliers = {};
  for (let dow = 0; dow < 7; dow++) {
    if (dowSales[dow].length > 0) {
      const dowMean = dowSales[dow].reduce((a, b) => a + b, 0) / dowSales[dow].length;
      empiricalDowMultipliers[dow] = Math.min(1.65, Math.max(0.65, dowMean / Math.max(1, historicalAvg)));
    } else {
      empiricalDowMultipliers[dow] = standardDowMultipliers[dow];
    }
  }

  // Weighted recent trend
  const recentDays = sortedDates.slice(-7);
  let weightedSum = 0;
  let weightTotal = 0;
  recentDays.forEach((dt, idx) => {
    const w = idx + 1;
    weightedSum += dailySalesMap.get(dt) * w;
    weightTotal += w;
  });
  const recentWeightedAvg = weightedSum / weightTotal;
  const baselineDemand = (recentWeightedAvg * 0.60) + (historicalAvg * 0.40);

  const dailyForecast = [];
  for (let d = 1; d <= 7; d++) {
    const dDate = new Date(today);
    dDate.setDate(dDate.getDate() + d);
    const dow = dDate.getDay();
    const mult = empiricalDowMultipliers[dow] || 1.0;
    const projected = Math.max(1, Math.round(baselineDemand * mult));
    dailyForecast.push(projected);
  }

  const sevenDayTotal = dailyForecast.reduce((a, b) => a + b, 0);

  const quantities = Array.from(dailySalesMap.values());
  const variance = quantities.reduce((acc, val) => acc + Math.pow(val - historicalAvg, 2), 0) / salesDaysCount;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / Math.max(1, historicalAvg);

  let confidence = "Low";
  let reliabilityScore = "60% - 69%";
  if (salesDaysCount >= 14 && cv <= 0.40) {
    confidence = "High";
    reliabilityScore = "88% - 94%";
  } else if (salesDaysCount >= 5 && cv <= 0.70) {
    confidence = "Medium";
    reliabilityScore = "75% - 84%";
  }

  let trend = "Stable";
  const trendDiff = recentWeightedAvg - historicalAvg;
  if (trendDiff >= 1.5) trend = "Upward";
  else if (trendDiff <= -1.5) trend = "Downward";

  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  return {
    productId: productId || '',
    productName: product?.name || productId,
    demand: dailyForecast[0],
    dailyForecast: dailyForecast,
    sevenDayTotal: sevenDayTotal,
    historicalAvg: historicalAvg,
    confidence: confidence,
    reliabilityScore: reliabilityScore,
    dataPoints: salesDaysCount,
    dataPeriod: `${salesDaysCount} sales days (${firstDate} to ${lastDate})`,
    isFallback: false,
    trend: trend,
    unit: unit,
    lastUpdated: new Date().toISOString()
  };
}

async function getAIPredictedDemand(productId, branchId) {
  const p = (store.products || []).find(x => x.id === productId);
  const activeBranch = branchId !== undefined ? branchId : store.getSelectedBranchId();
  const pSales = (store.sales || []).filter(s => {
    if (s.productId !== productId && String(s.productId) !== String(productId)) return false;
    if (activeBranch && activeBranch !== 'all' && s.branchId && parseInt(s.branchId) !== parseInt(activeBranch)) return false;
    return true;
  });

  const pName = p ? p.name : productId;
  const category = p ? p.category : 'Bread';
  const unit = p ? (p.unit || 'pcs') : 'pcs';

  const headers = { 'Content-Type': 'application/json' };
  const session = sessionStorage.getItem("bakewise_v2_session") || localStorage.getItem("bakewise_v2_session");
  if (session) {
    try {
      const user = JSON.parse(session);
      if (user && user.token) headers['Authorization'] = `Bearer ${user.token}`;
    } catch (e) {}
  }

  try {
    const response = await fetch('/api/forecast', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sales: pSales,
        product_id: productId,
        branch_id: activeBranch,
        product_name: pName,
        category: category,
        unit: unit
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.predicted_demand === 'number') {
        return {
          productId: productId,
          productName: pName,
          demand: data.predicted_demand,
          dailyForecast: Array.isArray(data.daily_forecast) ? data.daily_forecast : [data.predicted_demand],
          sevenDayTotal: data.seven_day_total !== undefined ? data.seven_day_total : data.predicted_demand,
          historicalAvg: data.historical_avg !== undefined ? data.historical_avg : 0,
          confidence: data.confidence || "Low",
          reliabilityScore: data.reliability_score || "65%",
          dataPoints: data.data_points || 0,
          dataPeriod: data.data_period || "Historical data",
          isFallback: !!data.is_fallback,
          fallbackReason: data.fallback_reason || "",
          trend: data.trend || "Stable",
          unit: data.unit || unit,
          lastUpdated: data.last_updated || new Date().toISOString()
        };
      }
    }
  } catch (error) {
    console.warn("AI Forecast API notice (using local statistical engine):", error.message);
  }

  // Pure JavaScript analytical engine fallback
  return computeLocalDemandForecast(productId, pSales, p, activeBranch);
}

async function renderAIDemandForecastChart() {
  const canvas = document.getElementById("chart-ai-demand-forecast");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (aiDemandChartInstance) aiDemandChartInstance.destroy();

  const labels = (store.products || []).map(p => p.name.split(' (')[0]);
  const activeBranch = store.getSelectedBranchId();

  const aiResults = await Promise.all((store.products || []).map(p => getAIPredictedDemand(p.id, activeBranch)));
  const historicalAvg = aiResults.map(r => r.historicalAvg);
  const predictedDemand = aiResults.map(r => r.demand);

  const isDark = document.body.classList.contains("dark-mode");
  const textColor = isDark ? "#a8a29e" : "#78716c";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  aiDemandChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Historical Daily Sales Avg",
          data: historicalAvg,
          backgroundColor: "#78716c",
          borderRadius: 6
        },
        {
          label: "Predicted Demand (Tomorrow)",
          data: predictedDemand,
          backgroundColor: "#d97706",
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor, font: { family: 'Outfit', weight: 'bold' } } }
      },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Outfit' } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Outfit' } } }
      }
    }
  });

  const metricsEl = document.getElementById("ai-forecast-metrics");
  if (metricsEl) metricsEl.style.display = "none";
}

async function renderDailyPredictionTable() {
  const tbody = document.getElementById("ai-daily-prediction-tbody");
  if (!tbody) return;

  const activeBranch = store.getSelectedBranchId();
  const predictions = await Promise.all((store.products || []).map(async p => {
    const forecastRes = await getAIPredictedDemand(p.id, activeBranch);
    const histAvg = forecastRes.historicalAvg || 0;
    const forecast = forecastRes.demand;
    const unit = p.unit || forecastRes.unit || 'pcs';
    const total7 = forecastRes.sevenDayTotal || forecast;

    // Calculate Demand Trend dynamically comparing tomorrow's forecast with historical daily average
    let trendBadge = '';
    const hasSufficientData = !forecastRes.isFallback && forecastRes.confidence !== "Insufficient historical data" && (forecastRes.dataPoints >= 3) && histAvg > 0;

    if (!hasSufficientData) {
      // INSUFFICIENT DATA: Not enough reliable sales history (< 3 distinct sales days)
      trendBadge = `<span class="badge" style="background: rgba(0, 0, 0, 0.05); color: var(--text-secondary); font-weight: 600; font-size: 0.76rem; padding: 4px 10px; border-radius: 9999px; border: 1px solid var(--border-color); display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;" title="Not enough reliable sales history to determine trend (requires minimum 3 completed sales days)">○ INSUFFICIENT DATA</span>`;
    } else {
      const diffFromAvg = forecast - histAvg;
      const pctDiff = (diffFromAvg / histAvg) * 100;

      if (pctDiff >= 30) {
        // HIGH DEMAND: Strong increase (forecast is at least 30% above historical average)
        trendBadge = `<span class="badge" style="background: #dcfce7; color: #166534; font-weight: 700; font-size: 0.78rem; padding: 4px 10px; border-radius: 9999px; border: 1px solid rgba(22, 101, 52, 0.25); display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;" title="${diffFromAvg >= 0 ? '+' : ''}${diffFromAvg.toFixed(1)} ${unit} (${pctDiff >= 0 ? '+' : ''}${pctDiff.toFixed(0)}% vs avg)">▲ HIGH DEMAND</span>`;
      } else if (pctDiff >= 10) {
        // MODERATE DEMAND: Demand is above normal baseline (10% to less than 30% above historical average)
        trendBadge = `<span class="badge" style="background: #ffedd5; color: #c2410c; font-weight: 700; font-size: 0.78rem; padding: 4px 10px; border-radius: 9999px; border: 1px solid rgba(194, 65, 12, 0.25); display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;" title="${diffFromAvg >= 0 ? '+' : ''}${diffFromAvg.toFixed(1)} ${unit} (${pctDiff >= 0 ? '+' : ''}${pctDiff.toFixed(0)}% vs avg)">↗ MODERATE DEMAND</span>`;
      } else if (pctDiff >= -10) {
        // STABLE DEMAND: Relatively consistent (within 10% above or below historical average)
        trendBadge = `<span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 0.78rem; padding: 4px 10px; border-radius: 9999px; border: 1px solid rgba(3, 105, 161, 0.25); display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;" title="${diffFromAvg >= 0 ? '+' : ''}${diffFromAvg.toFixed(1)} ${unit} (${pctDiff >= 0 ? '+' : ''}${pctDiff.toFixed(0)}% vs avg)">▬ STABLE DEMAND</span>`;
      } else {
        // LOW DEMAND: Below normal baseline (more than 10% below historical average)
        trendBadge = `<span class="badge" style="background: #fee2e2; color: #991b1b; font-weight: 700; font-size: 0.78rem; padding: 4px 10px; border-radius: 9999px; border: 1px solid rgba(153, 27, 27, 0.25); display: inline-flex; align-items: center; gap: 5px; white-space: nowrap;" title="${diffFromAvg.toFixed(1)} ${unit} (${pctDiff.toFixed(0)}% vs avg)">▼ LOW DEMAND</span>`;
      }
    }

    return `
      <tr>
        <td style="font-weight: 700; color: var(--text-primary);">${escapeHtml(p.name)}</td>
        <td><span class="badge category-badge" style="font-size: 0.78rem;">${escapeHtml(p.category || 'General')}</span></td>
        <td style="font-weight: 600; color: var(--text-secondary);">${escapeHtml(unit)}</td>
        <td style="font-weight: 600;">${histAvg} ${unit}/day</td>
        <td style="font-weight: 800; color: var(--primary-color); font-size: 0.95rem;">${forecast} ${unit}</td>
        <td style="font-weight: 700; color: var(--accent-color);">${total7} ${unit}</td>
        <td>${trendBadge}</td>
      </tr>
    `;
  }));

  setSafeHtml(tbody, predictions.join(''));

  // Update Last Updated Timestamp display
  const timeElem = document.getElementById("forecast-timestamp-text");
  if (timeElem) {
    const now = new Date();
    timeElem.textContent = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
}

async function render7DayProjectionTable() {
  const trHead = document.getElementById("ai-7day-projection-thead-tr");
  const tbody = document.getElementById("ai-7day-projection-tbody");
  if (!tbody) return;

  const today = new Date();
  if (trHead) {
    let ths = `<th>Product Name</th>`;
    for (let d = 1; d <= 7; d++) {
      const dayDate = new Date(today);
      dayDate.setDate(dayDate.getDate() + d);
      const dateFormatted = dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      ths += `<th style="text-align: center;">Day ${d}<br><span style="font-size: 0.72rem; font-weight: normal; color: var(--text-secondary);">${dateFormatted}</span></th>`;
    }
    ths += `<th style="text-align: center; background: rgba(217, 119, 6, 0.1); color: var(--primary-color);">7-Day Total</th>`;
    setSafeHtml(trHead, ths);
  }

  const activeBranch = store.getSelectedBranchId();
  const rows = await Promise.all((store.products || []).map(async p => {
    const forecastRes = await getAIPredictedDemand(p.id, activeBranch);
    const dailyForecasts = forecastRes.dailyForecast || [forecastRes.demand];
    const unit = p.unit || forecastRes.unit || 'pcs';

    // Strict mathematical equality: 7-day total strictly equals the sum of daily forecasts
    const total7 = dailyForecasts.reduce((sum, val) => sum + val, 0);

    const cols = dailyForecasts.map((f, i) => {
      const isTomorrow = i === 0;
      return `<td style="text-align: center; font-weight: ${isTomorrow ? '800' : '600'}; color: ${isTomorrow ? 'var(--primary-color)' : 'var(--text-primary)'};">${f} <span style="font-size:0.75rem; color:var(--text-secondary);">${unit}</span></td>`;
    }).join('');

    return `
      <tr>
        <td style="font-weight: 700; color: var(--primary-color);">
          ${p.name}
          <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: normal;">${p.category}</div>
        </td>
        ${cols}
        <td style="text-align: center; font-weight: 800; color: var(--accent-color); background: rgba(217, 119, 6, 0.05); font-size: 0.95rem;">
          ${total7} <span style="font-size:0.75rem;">${unit}</span>
        </td>
      </tr>
    `;
  }));

  setSafeHtml(tbody, rows.join(''));
}

// ====================================================================
// BAKEWISE PRODUCTION OPTIMIZATION RECOMMENDATIONS
// ====================================================================

async function renderBakeRecommendations() {
  const container = document.getElementById("ai-recs-container");
  if (!container) return;
  container.replaceChildren();

  try {
    const activeBranch = (store.getSelectedBranchId() === 'all') ? getDefaultBranchId() : store.getSelectedBranchId();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Ensure products are available
    if (!store.products || store.products.length === 0) {
      try {
        const pRes = await fetch('/api/products');
        if (pRes.ok) store.products = await pRes.json();
      } catch (e) {
        console.warn("Could not fetch products for recommendations:", e);
      }
    }

    // Ensure inventory is available
    if (!store.inventory || store.inventory.length === 0) {
      try {
        const iRes = await fetch(`/api/inventory?branch_id=${activeBranch}`);
        if (iRes.ok) store.inventory = await iRes.json();
      } catch (e) {
        console.warn("Could not fetch inventory for recommendations:", e);
      }
    }

    const availableProducts = (store.products || []).filter(p => p.status !== 'Inactive');
    if (availableProducts.length === 0) {
      setSafeHtml(container, `
        <div style="padding: 24px; text-align: center; color: var(--text-secondary); background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
          <i data-lucide="package-search" style="width: 32px; height: 32px; color: var(--primary-color); margin-bottom: 6px;"></i>
          <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">No active products found</div>
          <div style="font-size: 0.82rem; margin-top: 4px; color: var(--text-secondary);">Add products in Product Catalog or click Refresh Recommendations.</div>
        </div>
      `);
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    const recsPromises = availableProducts.map(async p => {
      try {
        // 1. Usable Available Stock (exclude expired, damaged, quarantined, or spoiled)
        const matchingInv = (store.inventory || []).filter(i => {
          if (i.productId !== p.id && String(i.productId) !== String(p.id)) return false;
          if (activeBranch && activeBranch !== 'all' && i.branchId && parseInt(i.branchId) !== parseInt(activeBranch)) return false;
          return true;
        });

        let usableStock = 0;
        let expiredStock = 0;
        matchingInv.forEach(i => {
          const isExp = (i.status === 'Expired' || i.status === 'Damaged' || i.status === 'Quarantined' || i.status === 'Spoiled' ||
            (i.expiryDate && new Date(i.expiryDate) < new Date(todayStr + 'T00:00:00')));
          if (isExp) {
            expiredStock += (parseInt(i.stockLevel) || 0);
          } else {
            usableStock += (parseInt(i.stockLevel) || 0);
          }
        });

        // 2. Confirmed Scheduled Production (Planned, In Progress, or Scheduled)
        const matchingProd = (store.production || []).filter(pr => {
          if (pr.productId !== p.id && String(pr.productId) !== String(p.id)) return false;
          if (activeBranch && activeBranch !== 'all' && pr.branchId && parseInt(pr.branchId) !== parseInt(activeBranch)) return false;
          return (pr.status === 'Planned' || pr.status === 'In Progress' || pr.status === 'Scheduled');
        });
        const scheduledProduction = matchingProd.reduce((sum, pr) => sum + (parseInt(pr.planned) || 0), 0);

        // 3. Tomorrow's Forecasted Demand
        const predictionResult = await getAIPredictedDemand(p.id, activeBranch);
        const tomorrowDemand = predictionResult.demand;
        const unit = p.unit || predictionResult.unit || 'pcs';

        // 4. Data sufficiency check: If statistical demand model cannot reliably predict
        if (predictionResult.isFallback || predictionResult.dataPoints < 2) {
          return {
            productId: p.id,
            productName: p.name,
            category: p.category || 'Bakery',
            unit: unit,
            usableStock,
            scheduledProduction,
            tomorrowDemand,
            recommended: 0,
            status: 'Insufficient Data',
            badgeStyle: 'background: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db;',
            reason: 'Insufficient historical sales transactions to calculate reliable statistical demand. Additional POS data required.'
          };
        }

        // 5. Dynamic Safety Stock & Production Optimization Formula
        const safetyStock = Math.max(3, Math.min(15, Math.round(tomorrowDemand * 0.20)));
        const grossNeeded = tomorrowDemand + safetyStock;
        const availableSupply = usableStock + scheduledProduction;
        const recommendedBake = Math.max(0, grossNeeded - availableSupply);

        let status = 'Stock Sufficient';
        let badgeStyle = 'background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;';
        let reason = 'Available stock can cover expected demand without additional baking.';

        if (recommendedBake > 0) {
          if (usableStock < safetyStock) {
            status = 'Low Stock';
            badgeStyle = 'background: #fef3c7; color: #b45309; border: 1px solid #fde68a;';
            reason = 'Current usable inventory is below the required operational safety buffer. Baking is recommended to replenish inventory.';
          } else {
            status = 'Produce Now';
            badgeStyle = 'background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;';
            reason = 'Current usable inventory is insufficient to cover the expected demand and required stock allowance.';
          }
        } else {
          if (scheduledProduction > 0 && usableStock < grossNeeded) {
            status = 'Production Scheduled';
            badgeStyle = 'background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd;';
            reason = 'Production is already confirmed and scheduled to cover upcoming demand.';
          } else if (usableStock >= grossNeeded) {
            status = 'Stock Sufficient';
            badgeStyle = 'background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;';
            reason = 'Available stock comfortably covers expected demand.';
          } else {
            status = 'No Production Needed';
            badgeStyle = 'background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb;';
            reason = 'Current inventory is balanced with demand. No additional production is justified.';
          }
        }

        return {
          productId: p.id,
          productName: p.name,
          category: p.category || 'Bakery',
          unit: unit,
          usableStock,
          scheduledProduction,
          tomorrowDemand,
          recommended: recommendedBake,
          status,
          badgeStyle,
          reason
        };
      } catch (prodErr) {
        console.warn(`Error generating recommendation for ${p.name}:`, prodErr);
        return {
          productId: p.id,
          productName: p.name,
          category: p.category || 'Bakery',
          unit: p.unit || 'pcs',
          usableStock: 0,
          scheduledProduction: 0,
          tomorrowDemand: 0,
          recommended: 0,
          status: 'Insufficient Data',
          badgeStyle: 'background: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db;',
          reason: 'Insufficient historical sales transactions to calculate reliable statistical demand.'
        };
      }
    });

    const recs = await Promise.all(recsPromises);
    window._lastProductionRecs = recs;

    const cardsHtml = recs.map(r => `
      <div class="ai-recommendation-card" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; background: var(--bg-surface); display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <strong style="font-size: 1.02rem; color: var(--text-primary);">${escapeHtml(r.productName)}</strong>
              <span class="badge" style="font-size: 0.72rem; background: rgba(0,0,0,0.05); color: var(--text-secondary);">${escapeHtml(r.category)}</span>
            </div>
            <div style="font-size: 0.83rem; color: var(--text-secondary); margin-top: 2px;">
              Available Stock: <strong style="color: var(--text-primary);">${r.usableStock} ${escapeHtml(r.unit)}</strong>
              ${r.scheduledProduction > 0 ? ` &bull; <span style="color: #0369a1; font-weight: 600;">Scheduled: ${r.scheduledProduction} ${escapeHtml(r.unit)}</span>` : ''}
            </div>
          </div>

          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
            <span class="badge" style="${r.badgeStyle} font-weight: 800; font-size: 0.76rem; padding: 3px 8px; border-radius: 6px;">
              ${r.status}
            </span>
            <div style="font-size: 0.83rem; color: var(--text-muted); text-align: right;">
              Recommended: <strong style="font-size: 1.1rem; color: ${r.recommended > 0 ? 'var(--primary-color)' : 'var(--color-success)'};">${r.status === 'Insufficient Data' ? '--' : r.recommended} ${escapeHtml(r.unit)}</strong>
            </div>
          </div>
        </div>

        <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4; background: var(--bg-surface-secondary, rgba(0,0,0,0.02)); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color);">
          <strong>Reason:</strong> ${escapeHtml(r.reason)}
        </div>

        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; padding-top: 4px;">
          <button type="button" class="btn-secondary btn-rec-view-product" data-pid="${escapeHtml(r.productId)}" style="font-size: 0.78rem; padding: 5px 10px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
            <i data-lucide="eye" style="width: 13px; height: 13px;"></i> View Product
          </button>

          ${(r.status === 'Produce Now' || r.status === 'Low Stock' || r.status === 'Insufficient Data') ? `
            <button type="button" class="btn-primary btn-rec-schedule-prod" data-pid="${escapeHtml(r.productId)}" data-qty="${r.recommended > 0 ? r.recommended : 20}" data-unit="${escapeHtml(r.unit)}" data-name="${escapeHtml(r.productName)}" data-cat="${escapeHtml(r.category)}" style="font-size: 0.78rem; padding: 5px 12px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer;">
              <i data-lucide="calendar-plus" style="width: 13px; height: 13px;"></i> Schedule Production
            </button>
          ` : (r.status === 'Production Scheduled') ? `
            <button type="button" class="btn-secondary btn-rec-schedule-prod" data-pid="${escapeHtml(r.productId)}" data-qty="${r.scheduledProduction}" data-unit="${escapeHtml(r.unit)}" data-name="${escapeHtml(r.productName)}" data-cat="${escapeHtml(r.category)}" style="font-size: 0.78rem; padding: 5px 10px; display: inline-flex; align-items: center; gap: 4px; color: #0369a1; border-color: #bae6fd; cursor: pointer;">
              <i data-lucide="calendar" style="width: 13px; height: 13px;"></i> View Schedule
            </button>
          ` : `
            <button type="button" class="btn-secondary btn-rec-schedule-prod" data-pid="${escapeHtml(r.productId)}" data-qty="15" data-unit="${escapeHtml(r.unit)}" data-name="${escapeHtml(r.productName)}" data-cat="${escapeHtml(r.category)}" style="font-size: 0.78rem; padding: 5px 10px; display: inline-flex; align-items: center; gap: 4px; opacity: 0.85; cursor: pointer;">
              <i data-lucide="plus" style="width: 13px; height: 13px;"></i> Schedule Custom
            </button>
          `}
        </div>
      </div>
    `).join('');

    setSafeHtml(container, cardsHtml);

    // Attach button click events
    document.querySelectorAll(".btn-rec-schedule-prod").forEach(btn => {
      btn.addEventListener("click", () => {
        const pid = btn.getAttribute("data-pid");
        const qty = parseInt(btn.getAttribute("data-qty") || 0);
        const unit = btn.getAttribute("data-unit") || 'pcs';
        const name = btn.getAttribute("data-name");
        const cat = btn.getAttribute("data-cat");
        openScheduleProductionModal(pid, qty, unit, name, cat);
      });
    });

    document.querySelectorAll(".btn-rec-view-product").forEach(btn => {
      btn.addEventListener("click", () => {
        const pid = btn.getAttribute("data-pid");
        openProductDetailsModal(pid);
      });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (err) {
    console.error("renderBakeRecommendations fatal error:", err);
    setSafeHtml(container, `
      <div style="padding: 20px; text-align: center; color: var(--text-secondary); background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
        <i data-lucide="alert-circle" style="width: 28px; height: 28px; color: var(--primary-color); margin-bottom: 6px;"></i>
        <div style="font-weight: 600; font-size: 0.9rem;">Unable to display recommendations right now.</div>
        <div style="font-size: 0.8rem; margin-top: 4px; color: var(--text-muted);">Please click "Refresh Recommendations" to reload latest branch data.</div>
      </div>
    `);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// --------------------------------------------------------------------
// PRODUCTION OPTIMIZATION ACTION MODALS
// --------------------------------------------------------------------

function openScheduleProductionModal(productId, recommendedQty, unit, productName, category) {
  const modal = document.getElementById("schedule-prod-modal");
  const overlay = document.getElementById("schedule-prod-overlay");
  if (!modal || !overlay) return;

  const p = (store.products || []).find(x => x.id === productId) || { name: productName || productId, category: category || 'Bread', unit: unit || 'pcs' };
  const pName = productName || p.name || productId;
  const pCat = category || p.category || 'Bread';
  const pUnit = unit || p.unit || 'pcs';

  document.getElementById("sched-product-id").value = productId;
  document.getElementById("sched-product-name").textContent = pName;
  document.getElementById("sched-product-cat").textContent = pCat;
  document.getElementById("sched-unit-label").textContent = pUnit;
  document.getElementById("sched-quantity-input").value = recommendedQty > 0 ? recommendedQty : 20;

  // Set default target date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const dateInput = document.getElementById("sched-date-input");
  dateInput.value = tomorrowStr;

  // Check for duplicate or existing scheduled production on that date
  const checkDuplicate = () => {
    const selectedDate = dateInput.value;
    const existingSchedule = (store.production || []).find(pr => {
      return (pr.productId === productId || String(pr.productId) === String(productId)) &&
             (pr.date && pr.date.startsWith(selectedDate)) &&
             (pr.status === 'Planned' || pr.status === 'Scheduled' || pr.status === 'In Progress');
    });
    const warnEl = document.getElementById("sched-duplicate-warning");
    const warnText = document.getElementById("sched-duplicate-text");
    if (existingSchedule) {
      warnEl.style.display = "block";
      warnText.textContent = `Notice: A scheduled baking batch (${existingSchedule.planned || 0} ${pUnit}) already exists for this product on ${selectedDate}. Confirming will schedule an additional batch.`;
    } else {
      warnEl.style.display = "none";
    }
  };

  dateInput.onchange = checkDuplicate;
  checkDuplicate();

  modal.style.display = "block";
  overlay.style.display = "block";
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.openScheduleProductionModal = openScheduleProductionModal;

function closeScheduleProdModal() {
  const modal = document.getElementById("schedule-prod-modal");
  const overlay = document.getElementById("schedule-prod-overlay");
  if (modal) modal.style.display = "none";
  if (overlay) overlay.style.display = "none";
}
window.closeScheduleProdModal = closeScheduleProdModal;

async function submitScheduleProductionOrder() {
  const productId = document.getElementById("sched-product-id").value;
  const plannedQty = parseInt(document.getElementById("sched-quantity-input").value) || 0;
  const targetDate = document.getElementById("sched-date-input").value;
  const bakerName = document.getElementById("sched-baker-input").value.trim() || 'Marco Reyes';
  const p = (store.products || []).find(x => x.id === productId) || { name: productId, unit: 'pcs' };
  const unit = p.unit || 'pcs';

  if (!productId || plannedQty <= 0 || !targetDate) {
    showToast("Please provide a valid product, quantity, and scheduled date.", "error");
    return;
  }

  const branchId = getDefaultBranchId();

  try {
    const res = await fetch('/api/production', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        planned: plannedQty,
        actual: 0,
        date: targetDate,
        baker: bakerName,
        status: 'Scheduled',
        branch_id: branchId
      })
    });

    if (res.ok) {
      const created = await res.json();
      store._production.unshift({
        id: created.id || Date.now(),
        productId: productId,
        planned: plannedQty,
        actual: 0,
        date: targetDate,
        baker: bakerName,
        status: 'Scheduled',
        code: created.code || `PRD-B${branchId}-${productId}-${Date.now().toString().slice(-4)}`,
        branchId: branchId
      });
      store.save("bakewise_v2_production", store._production);
      store.commitAll();

      showToast(`Production scheduled: ${plannedQty} ${unit} of ${p.name} for ${targetDate}`, "success");
      closeScheduleProdModal();

      // Refresh Demand Forecasting and Production panes immediately
      await renderBakeRecommendations();
      if (typeof refreshProductionPane === 'function') refreshProductionPane();
      if (typeof refreshDashboard === 'function') refreshDashboard();
    } else {
      const errData = await res.json().catch(() => ({}));
      showToast(`Failed to schedule production: ${errData.error || res.statusText}`, "error");
    }
  } catch (err) {
    console.error("Error scheduling production:", err);
    showToast(`Error scheduling production: ${err.message}`, "error");
  }
}
window.submitScheduleProductionOrder = submitScheduleProductionOrder;

function openProductDetailsModal(productId) {
  const modal = document.getElementById("view-product-details-modal");
  const overlay = document.getElementById("view-product-details-overlay");
  const body = document.getElementById("view-product-details-body");
  if (!modal || !overlay || !body) return;

  const p = (store.products || []).find(x => x.id === productId);
  if (!p) {
    showToast("Product details not found.", "warning");
    return;
  }

  const activeBranch = getDefaultBranchId();
  const matchingInv = (store.inventory || []).filter(i => {
    return (i.productId === p.id || String(i.productId) === String(p.id)) &&
           (!i.branchId || parseInt(i.branchId) === parseInt(activeBranch));
  });
  const totalStock = matchingInv.reduce((sum, i) => sum + (parseInt(i.stockLevel) || 0), 0);

  const html = `
    <div style="background: var(--bg-surface-secondary, rgba(0,0,0,0.02)); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h3 style="margin: 0; font-size: 1.1rem; color: var(--text-primary); font-weight: 700;">${escapeHtml(p.name)}</h3>
        <span class="badge" style="background: rgba(0,0,0,0.06); color: var(--text-secondary);">${escapeHtml(p.category || 'Bakery')}</span>
      </div>
      <div style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">
        Catalog ID: ${escapeHtml(p.id)} &bull; Registered Branch: Lasang (ID: ${activeBranch})
      </div>
    </div>

    <table class="data-table" style="font-size: 0.85rem; width: 100%; margin-bottom: 16px;">
      <tbody>
        <tr>
          <td style="color: var(--text-secondary); width: 45%;">Unit of Measure:</td>
          <td style="font-weight: 600;">${escapeHtml(p.unit || 'pcs')}</td>
        </tr>
        <tr>
          <td style="color: var(--text-secondary);">Selling Price (Retail):</td>
          <td style="font-weight: 700; color: var(--primary-color);">₱${parseFloat(p.price || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color: var(--text-secondary);">Production Cost:</td>
          <td style="font-weight: 600;">₱${parseFloat(p.cost || p.cost_price || 0).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color: var(--text-secondary);">Validated Shelf Life:</td>
          <td style="font-weight: 600;">${p.shelfLife || p.shelf_life_days || 2} Days</td>
        </tr>
        <tr>
          <td style="color: var(--text-secondary);">Current Stock in Lasang:</td>
          <td style="font-weight: 700; color: ${totalStock > 0 ? '#166534' : '#991b1b'};">${totalStock} ${escapeHtml(p.unit || 'pcs')}</td>
        </tr>
        <tr>
          <td style="color: var(--text-secondary);">Approved Repurpose Recipe:</td>
          <td style="font-weight: 600; color: #b45309;">${escapeHtml(p.repurposeRecipe || p.repurpose_recipe || 'N/A')}</td>
        </tr>
        <tr>
          <td style="color: var(--text-secondary);">Status:</td>
          <td><span class="badge success" style="background:#dcfce7;color:#166534;">Active</span></td>
        </tr>
      </tbody>
    </table>
  `;

  setSafeHtml(body, html);
  modal.style.display = "block";
  overlay.style.display = "block";
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.openProductDetailsModal = openProductDetailsModal;

function closeProductDetailsModal() {
  const modal = document.getElementById("view-product-details-modal");
  const overlay = document.getElementById("view-product-details-overlay");
  if (modal) modal.style.display = "none";
  if (overlay) overlay.style.display = "none";
}
window.closeProductDetailsModal = closeProductDetailsModal;

// ====================================================================
// PRODUCT REPURPOSING RECOMMENDATIONS & FOOD-SAFETY WORKFLOW
// ====================================================================

let currentRepurposeFilter = 'all';

async function renderRepurposingAlerts() {
  const container = document.getElementById("ai-repurpose-container");
  if (!container) return;
  container.replaceChildren();

  try {
    const activeBranch = (store.getSelectedBranchId() === 'all') ? getDefaultBranchId() : store.getSelectedBranchId();
    let batches = [];

    // Ensure products and inventory are loaded
    if (!store.products || store.products.length === 0) {
      try {
        const pRes = await fetch('/api/products');
        if (pRes.ok) store.products = await pRes.json();
      } catch (e) {
        console.warn("Could not fetch products for repurposing:", e);
      }
    }

    // 1. Fetch live batches from backend API
    try {
      const branchQuery = (activeBranch && activeBranch !== 'all') ? `?branch_id=${activeBranch}` : '';
      const res = await fetch(`/api/inventory/batches${branchQuery}`);
      if (res.ok) {
        batches = await res.json();
      }
    } catch (err) {
      console.warn("Could not fetch batches from API, checking store inventory:", err.message);
    }

    // Fallback to store inventory if API batches empty
    if (!Array.isArray(batches) || batches.length === 0) {
      if (!store.inventory || store.inventory.length === 0) {
        try {
          const invRes = await fetch(`/api/inventory?branch_id=${activeBranch}`);
          if (invRes.ok) store.inventory = await invRes.json();
        } catch(e) {}
      }
      batches = (store.inventory || []).map(i => {
        const p = (store.products || []).find(x => x.id === i.productId);
        return {
          id: i.id,
          batch_id: i.batchId || `BAT-B${i.branchId || 212}-${i.productId}-${(i.productionDate || '').replace(/-/g, '')}`,
          batch_code: i.batchId || `BAT-B${i.branchId || 212}-${i.productId}-${(i.productionDate || '').replace(/-/g, '')}`,
          branch_id: i.branchId || 212,
          branch_name: 'Lasang',
          product_id: i.productId,
          product_name: p ? p.name : i.productId,
          category: p ? p.category : (i.category || 'Bread'),
          unit: i.unit || (p ? p.unit : 'pcs'),
          cost_price: p ? (p.cost || p.cost_price || 15) : 15,
          price: p ? p.price : 25,
          current_quantity: i.stockLevel,
          production_date: i.productionDate,
          production_time: i.productionTime || '06:00:00',
          expiry_date: i.expiryDate,
          expiry_time: i.expiryTime || '18:00:00',
          shelf_life_days: i.shelfLifeDays || (p ? p.shelf_life_days : 2),
          status: i.status || 'In Stock',
          repurpose_recipe: p ? (p.repurposeRecipe || p.repurpose_recipe) : 'Bread Crumbs',
          degradation_percent: i.degradationPercent || 20,
          shelf_status: i.shelfStatus || 'Fresh'
        };
      });
    }

    // Filter batches by selected branch
    if (activeBranch && activeBranch !== 'all') {
      batches = batches.filter(b => b.branch_id == null || parseInt(b.branch_id) === parseInt(activeBranch));
    }

    if (!Array.isArray(batches) || batches.length === 0) {
      setSafeHtml(container, `
        <div style="grid-column: 1 / -1; text-align: center; padding: 28px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
          <i data-lucide="package-search" style="width: 36px; height: 36px; color: var(--primary-color); margin-bottom: 8px;"></i>
          <h4 style="margin: 0 0 6px 0; font-size: 0.95rem; color: var(--text-primary); font-weight: 700;">No inventory batches found.</h4>
          <p style="margin: 0; font-size: 0.82rem; color: var(--text-secondary);">Batch records are automatically synchronized from Lasang inventory management.</p>
        </div>
      `);
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    const now = new Date();

    // Evaluate Food Safety Eligibility Rules for every batch individually
    const evaluatedBatches = batches.map(batch => {
      const p = (store.products || []).find(x => x.id === batch.product_id || x.id === `p${batch.product_id}` || `p${x.id}` === batch.product_id);
      const pName = batch.product_name || (p ? p.name : batch.product_id);
      const category = (batch.category || (p ? p.category : '')).toLowerCase();
      const recipe = batch.repurpose_recipe || (p ? (p.repurposeRecipe || p.repurpose_recipe) : null);
      const qty = parseInt(batch.current_quantity) || 0;

      // Rule 1: INSUFFICIENT DATA
      if (!batch.expiry_date || !batch.batch_code || !batch.production_date) {
        return {
          ...batch,
          product_name: pName,
          status_category: 'INSUFFICIENT DATA',
          eligibility_label: 'INSUFFICIENT DATA',
          badge_style: 'background: #f3f4f6; color: #4b5563; border: 1px solid #d1d5db;',
          reason: 'Missing batch traceability, production timestamp, or validated expiration date. Food safety standards require verifiable batch records.',
          repurpose_recipe: 'N/A',
          is_repurposable: false
        };
      }

      const expiryTimeStr = batch.expiry_time || '18:00:00';
      const expiryDateTime = new Date(`${batch.expiry_date.split('T')[0]}T${expiryTimeStr}`);
      const remainingMs = expiryDateTime.getTime() - now.getTime();
      const remainingHours = Math.round(remainingMs / (1000 * 60 * 60));

      const prodDateStr = (batch.production_date ? batch.production_date.split('T')[0] : batch.expiry_date.split('T')[0]);
      const prodDateTime = new Date(`${prodDateStr}T${batch.production_time || '06:00:00'}`);
      const totalLifeMs = Math.max(1, expiryDateTime.getTime() - prodDateTime.getTime());
      const degradationScore = Math.max(0, Math.min(100, Math.round(((totalLifeMs - remainingMs) / totalLifeMs) * 100)));

      // Rule 2: EXPIRED / UNSAFE (Expired food must NEVER be recommended for repurposing!)
      if (remainingMs <= 0 || batch.status === 'Expired' || batch.status === 'Spoiled' || batch.status === 'Damaged') {
        return {
          ...batch,
          product_name: pName,
          status_category: 'EXPIRED / UNSAFE',
          eligibility_label: 'EXPIRED / UNSAFE',
          badge_style: 'background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;',
          remaining_hours: 0,
          degradation_score: 100,
          reason: `Product has reached the end of its validated shelf life (Expired on ${batch.expiry_date.split('T')[0]}). Repurposing expired bread is strictly prohibited under food-safety regulations. Disposal required.`,
          repurpose_recipe: 'N/A - Disposal Required',
          is_repurposable: false
        };
      }

      // Rule 3: NOT ELIGIBLE - Packaged commercial beverages (Coke, etc.)
      if (category.includes('drink') || category.includes('beverage') || pName.toLowerCase().includes('coke')) {
        return {
          ...batch,
          product_name: pName,
          status_category: 'NOT ELIGIBLE',
          eligibility_label: 'NOT ELIGIBLE',
          badge_style: 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;',
          remaining_hours: remainingHours,
          degradation_score: degradationScore,
          reason: 'Commercial packaged beverage. Ineligible for bakery culinary repurposing.',
          repurpose_recipe: 'N/A',
          is_repurposable: false
        };
      }

      // Rule 4: NOT ELIGIBLE - Perishable cream/custard cakes requiring cold-chain
      const isPerishableCake = (category.includes('cake') && !pName.toLowerCase().includes('chocolate')) || pName.toLowerCase().includes('cream');
      if (isPerishableCake) {
        return {
          ...batch,
          product_name: pName,
          status_category: 'NOT ELIGIBLE',
          eligibility_label: 'NOT ELIGIBLE',
          badge_style: 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;',
          remaining_hours: remainingHours,
          degradation_score: degradationScore,
          reason: 'Perishable dairy cream/custard filling requires strict continuous refrigeration. Prohibited from repurposing under bakery food-safety standards.',
          repurpose_recipe: 'N/A - Perishable Cake',
          is_repurposable: false
        };
      }

      // Rule 5: NOT ELIGIBLE - No approved recipe or disqualified by staff
      if (!recipe || recipe === 'N/A' || batch.status === 'Not Eligible') {
        return {
          ...batch,
          product_name: pName,
          status_category: 'NOT ELIGIBLE',
          eligibility_label: 'NOT ELIGIBLE',
          badge_style: 'background: #fef3c7; color: #92400e; border: 1px solid #fde68a;',
          remaining_hours: remainingHours,
          degradation_score: degradationScore,
          reason: batch.status === 'Not Eligible' ? 'Disqualified from repurposing by authorized staff decision.' : 'No approved repurposing recipe is registered for this bakery product.',
          repurpose_recipe: 'N/A',
          is_repurposable: false
        };
      }

      // Rule 6: ELIGIBLE - Safe, unexpired bakery item within permitted repurposing window
      return {
        ...batch,
        product_name: pName,
        status_category: 'ELIGIBLE',
        eligibility_label: 'ELIGIBLE',
        badge_style: 'background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;',
        remaining_hours: remainingHours,
        degradation_score: degradationScore,
        reason: `Batch is safe and within permitted use window (${remainingHours}h remaining, ${degradationScore}% freshness degradation). Approved recipe '${recipe}' available to prevent waste.`,
        repurpose_recipe: recipe,
        is_repurposable: true
      };
    });

    window._lastEvaluatedBatches = evaluatedBatches;

    // Filter based on active category filter tab
    let filteredBatches = evaluatedBatches;
    if (currentRepurposeFilter && currentRepurposeFilter !== 'all') {
      filteredBatches = evaluatedBatches.filter(b => b.status_category === currentRepurposeFilter);
    }

    if (filteredBatches.length === 0) {
      setSafeHtml(container, `
        <div style="grid-column: 1 / -1; text-align: center; padding: 28px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
          <i data-lucide="shield-check" style="width: 36px; height: 36px; color: var(--color-success); margin-bottom: 8px;"></i>
          <h4 style="margin: 0 0 6px 0; font-size: 0.95rem; color: var(--text-primary); font-weight: 700;">No batches matching filter "${escapeHtml(currentRepurposeFilter)}".</h4>
          <p style="margin: 0; font-size: 0.82rem; color: var(--text-secondary);">All batches in Lasang branch are evaluated against live inventory and food safety standards.</p>
        </div>
      `);
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    const cardsHtml = filteredBatches.map(b => {
      const branchName = b.branch_name || 'Lasang';
      const expiryFormatted = b.expiry_date ? b.expiry_date.split('T')[0] : 'N/A';
      const remainingText = b.remaining_hours !== undefined ? `${b.remaining_hours}h remaining` : 'N/A';

      return `
        <div class="repurpose-card" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 14px 16px; background: var(--bg-surface); display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
              <div>
                <strong style="font-size: 1rem; color: var(--text-primary);">${escapeHtml(b.product_name)}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">Batch: ${escapeHtml(b.batch_code || 'N/A')} &bull; ${escapeHtml(branchName)}</div>
              </div>
              <span class="badge" style="${b.badge_style} font-weight: 800; font-size: 0.74rem; padding: 3px 8px; border-radius: 6px;">
                ${b.eligibility_label}
              </span>
            </div>

            <div style="background: var(--bg-surface-secondary, rgba(0,0,0,0.02)); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px; font-size: 0.8rem; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span style="color: var(--text-secondary);">Current Stock:</span>
                <strong style="color: var(--text-primary);">${b.current_quantity} ${escapeHtml(b.unit || 'pcs')}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                <span style="color: var(--text-secondary);">Expiry Timestamp:</span>
                <span>${expiryFormatted} ${escapeHtml(b.expiry_time || '')}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-secondary);">Remaining Shelf Life:</span>
                <strong style="color: ${b.remaining_hours <= 12 ? 'var(--color-error)' : 'var(--text-primary)'};">${remainingText} (${b.degradation_score || 0}% Degraded)</strong>
              </div>
            </div>

            <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 8px;">
              <strong>Reason:</strong> ${escapeHtml(b.reason)}
            </div>

            <div style="font-size: 0.8rem; background: rgba(217, 119, 6, 0.08); border-left: 3px solid var(--primary-color); padding: 6px 8px; border-radius: 4px; margin-bottom: 4px;">
              <strong>Approved Recipe:</strong> ${escapeHtml(b.repurpose_recipe || 'N/A')}
            </div>
          </div>

          <div style="border-top: 1px solid var(--border-color); padding-top: 10px; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button type="button" class="btn-secondary btn-repurpose-view-batch" data-batch="${escapeHtml(b.batch_code)}" style="flex: 1; font-size: 0.76rem; padding: 4px 8px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; cursor: pointer;">
                <i data-lucide="layers" style="width: 12px; height: 12px;"></i> View Batch
              </button>
              ${(b.repurpose_recipe && b.repurpose_recipe !== 'N/A' && !b.repurpose_recipe.includes('Disposal')) ? `
                <button type="button" class="btn-secondary btn-repurpose-view-recipe" data-recipe="${escapeHtml(b.repurpose_recipe)}" style="flex: 1; font-size: 0.76rem; padding: 4px 8px; display: inline-flex; align-items: center; justify-content: center; gap: 4px; cursor: pointer;">
                  <i data-lucide="book-open" style="width: 12px; height: 12px;"></i> View Recipe
                </button>
              ` : ''}
            </div>

            ${b.is_repurposable ? `
              <div style="display: flex; gap: 6px;">
                <button type="button" class="btn-primary btn-repurpose-create-prod" 
                  data-batch="${escapeHtml(b.batch_code)}" 
                  data-pid="${escapeHtml(b.product_id)}" 
                  data-name="${escapeHtml(b.product_name)}" 
                  data-qty="${b.current_quantity}" 
                  data-unit="${escapeHtml(b.unit || 'pcs')}" 
                  data-recipe="${escapeHtml(b.repurpose_recipe)}" 
                  style="flex: 2; font-size: 0.78rem; padding: 6px 10px; background: linear-gradient(135deg, #0284c7, #0369a1); font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 4px; cursor: pointer;">
                  <i data-lucide="refresh-cw" style="width: 13px; height: 13px;"></i> Create Repurposing Production
                </button>
                <button type="button" class="btn-secondary btn-repurpose-not-eligible" data-batch="${escapeHtml(b.batch_code)}" data-pid="${escapeHtml(b.product_id)}" style="flex: 1; font-size: 0.74rem; padding: 4px 6px; color: var(--color-error); border-color: #fecaca; display: inline-flex; align-items: center; justify-content: center; gap: 2px; cursor: pointer;">
                  <i data-lucide="slash" style="width: 12px; height: 12px;"></i> Disqualify
                </button>
              </div>
            ` : `
              <button class="btn-secondary" disabled style="width: 100%; font-size: 0.76rem; padding: 5px 8px; opacity: 0.65; cursor: not-allowed; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                <i data-lucide="shield-alert" style="width: 12px; height: 12px;"></i> Repurposing Prohibited (Food-Safety Rule)
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    setSafeHtml(container, cardsHtml);

    // Attach click handlers
    document.querySelectorAll(".btn-repurpose-view-batch").forEach(btn => {
      btn.addEventListener("click", () => {
        openBatchDetailsModal(btn.getAttribute("data-batch"));
      });
    });

    document.querySelectorAll(".btn-repurpose-view-recipe").forEach(btn => {
      btn.addEventListener("click", () => {
        openRepurposeRecipeModal(btn.getAttribute("data-recipe"));
      });
    });

    document.querySelectorAll(".btn-repurpose-create-prod").forEach(btn => {
      btn.addEventListener("click", () => {
        const batchCode = btn.getAttribute("data-batch");
        const pid = btn.getAttribute("data-pid");
        const name = btn.getAttribute("data-name");
        const qty = parseInt(btn.getAttribute("data-qty") || 0);
        const unit = btn.getAttribute("data-unit") || 'pcs';
        const recipe = btn.getAttribute("data-recipe");
        openCreateRepurposingModal(batchCode, pid, name, qty, unit, recipe);
      });
    });

    document.querySelectorAll(".btn-repurpose-not-eligible").forEach(btn => {
      btn.addEventListener("click", () => {
        const batchCode = btn.getAttribute("data-batch");
        const pid = btn.getAttribute("data-pid");
        openMarkNotEligibleModal(batchCode, pid);
      });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (err) {
    console.error("renderRepurposingAlerts fatal error:", err);
    setSafeHtml(container, `
      <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-secondary); background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
        <i data-lucide="alert-circle" style="width: 28px; height: 28px; color: var(--primary-color); margin-bottom: 6px;"></i>
        <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-primary);">Unable to display repurposing recommendations right now.</div>
        <div style="font-size: 0.8rem; margin-top: 4px; color: var(--text-muted);">Please click "Refresh Batches" to reload live inventory records.</div>
      </div>
    `);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// --------------------------------------------------------------------
// REPURPOSING WORKFLOW MODALS
// --------------------------------------------------------------------

function openBatchDetailsModal(batchCode) {
  const modal = document.getElementById("batch-details-modal");
  const overlay = document.getElementById("batch-details-overlay");
  const body = document.getElementById("batch-details-body");
  if (!modal || !overlay || !body) return;

  const batch = (window._lastEvaluatedBatches || []).find(b => b.batch_code === batchCode || b.batch_id === batchCode) ||
                (store.inventory || []).find(i => i.batchId === batchCode || String(i.id) === batchCode);

  if (!batch) {
    showToast("Batch details not found.", "warning");
    return;
  }

  const p = (store.products || []).find(x => x.id === (batch.product_id || batch.productId));
  const pName = batch.product_name || (p ? p.name : (batch.product_id || 'Unknown'));
  const branchName = batch.branch_name || 'Lasang';
  const prodDate = batch.production_date ? String(batch.production_date).split('T')[0] : 'N/A';
  const prodTime = batch.production_time || '06:00:00';
  const expDate = batch.expiry_date ? String(batch.expiry_date).split('T')[0] : 'N/A';
  const expTime = batch.expiry_time || '18:00:00';
  const degradation = batch.degradation_score != null ? batch.degradation_score : (batch.degradationPercent || 20);

  const html = `
    <div style="background: var(--bg-surface-secondary, rgba(0,0,0,0.02)); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <h3 style="margin: 0; font-size: 1.05rem; color: var(--text-primary); font-weight: 700;">${escapeHtml(pName)}</h3>
        <span class="badge" style="${batch.badge_style || 'background: #f3f4f6; color: #4b5563;'}">${escapeHtml(batch.eligibility_label || 'BATCH')}</span>
      </div>
      <div style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">
        Batch ID: ${escapeHtml(batch.batch_code || batch.batch_id || 'N/A')} &bull; Branch: ${escapeHtml(branchName)}
      </div>
    </div>

    <table class="data-table" style="font-size: 0.85rem; width: 100%; margin-bottom: 16px;">
      <tbody>
        <tr>
          <td style="color: var(--text-secondary); width: 45%;">Current Batch Stock:</td>
          <td style="font-weight: 700;">${batch.current_quantity || batch.stockLevel || 0} ${escapeHtml(batch.unit || 'pcs')}</td>
        </tr>
        <tr>
          <td style="color: var(--text-secondary);">Production Timestamp:</td>
          <td>${prodDate} ${prodTime}</td>
        </tr>
        <tr>
          <td style="color: var(--text-secondary);">Expiration Timestamp:</td>
          <td style="font-weight: 600;">${expDate} ${expTime}</td>
        </tr>
        <tr>
          <td style="color: var(--text-secondary);">Shelf Life Degradation:</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${Math.min(100, degradation)}%; background: ${degradation >= 85 ? '#ef4444' : degradation >= 50 ? '#f59e0b' : '#10b981'};"></div>
              </div>
              <span style="font-weight: 600; font-size: 0.78rem;">${degradation}%</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="color: var(--text-secondary);">Food Safety Evaluation:</td>
          <td>${escapeHtml(batch.reason || 'Verified batch inventory record.')}</td>
        </tr>
        <tr>
          <td style="color: var(--text-secondary);">Storage Condition:</td>
          <td>Controlled Bakery Ambient (22-25°C)</td>
        </tr>
      </tbody>
    </table>
  `;

  setSafeHtml(body, html);
  modal.style.display = "block";
  overlay.style.display = "block";
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.openBatchDetailsModal = openBatchDetailsModal;

function closeBatchDetailsModal() {
  const modal = document.getElementById("batch-details-modal");
  const overlay = document.getElementById("batch-details-overlay");
  if (modal) modal.style.display = "none";
  if (overlay) overlay.style.display = "none";
}
window.closeBatchDetailsModal = closeBatchDetailsModal;

// Approved Repurposing Recipes catalogue
const CLIENT_APPROVED_RECIPES = [
  {
    name: 'Cinnamon Bread Pudding or French Toast Sliders',
    category: 'Bread',
    shelf_life_extension: '+2 Days (Refrigerated at 4°C)',
    optimal_window: '24-48 hours before expiry (unexpired, firm texture)',
    required_ingredients: [
      'Fresh whole milk (500ml)',
      'Large eggs (4 pcs)',
      'Brown sugar (150g)',
      'Ground cinnamon (1 tbsp)',
      'Unsalted butter (50g)',
      'Pure vanilla extract (1 tsp)'
    ],
    instructions: [
      'Slice bread into uniform 1-inch cubes and place into mixing bowl.',
      'Whisk eggs, milk, sugar, melted butter, and cinnamon into a rich custard slurry.',
      'Pour custard over bread cubes and soak for 20 minutes until thoroughly saturated.',
      'Transfer into buttered aluminum baking pans.',
      'Bake at 175°C (350°F) for 35-40 minutes until golden brown and custard is set.'
    ],
    food_safety_controls: [
      'Minimum internal core temperature must reach 74°C (165°F).',
      'Inspect all bread cubes for surface mold or sour discoloration prior to soaking.',
      'Strictly reject and dispose of any bread showing visible mold spore colonies.'
    ]
  },
  {
    name: 'Double Baked Almond Croissants',
    category: 'Pastries',
    shelf_life_extension: '+24 to +48 Hours',
    optimal_window: '24-48 hours after bake / before expiry (dry flaky pastry)',
    required_ingredients: [
      'Simple syrup (100ml water + 100g sugar + vanilla)',
      'Almond frangipane cream (butter, sugar, egg, almond flour)',
      'Flaked sliced almonds (60g)',
      'Confectioners powdered sugar for dusting'
    ],
    instructions: [
      'Slice day-old croissants horizontally in half.',
      'Generously brush inner cut sides and top surface with sugar syrup.',
      'Pipe almond frangipane cream inside and replace top half.',
      'Spread a thin layer of frangipane on top and coat with sliced flaked almonds.',
      'Double bake at 170°C (340°F) for 15-18 minutes until frangipane is set and almonds are toasted golden.',
      'Dust lightly with powdered sugar once cooled.'
    ],
    food_safety_controls: [
      'Thermal kill step: Almond frangipane contains raw egg, ensuring internal temperature exceeds 75°C.',
      'Croissants must be dry and free of excessive moisture or mold.'
    ]
  },
  {
    name: 'Toasted Bread Crumbs',
    category: 'Bread',
    shelf_life_extension: '+14 to +30 Days (Airtight dry storage)',
    optimal_window: '12-36 hours before expiry (unexpired, firm or dry crumb)',
    required_ingredients: [
      'Unsold unexpired bread batches',
      'Optional: dried herbs, garlic powder, sea salt'
    ],
    instructions: [
      'Break or slice unsold bread into uniform small pieces.',
      'Dehydrate in low convection oven at 120°C (250°F) for 45 minutes until crisp and moisture is evaporated.',
      'Cool completely to room temperature.',
      'Process through commercial breadcrumb mill or food processor to desired grain size.',
      'Sift through wire mesh for consistent texture.',
      'Seal in airtight food-grade poly bags with silica desiccants.'
    ],
    food_safety_controls: [
      'Moisture content must be reduced below 10% to prevent water-activity spore growth.',
      'Must be 100% free from mold, fillings, or perishable meats.'
    ]
  },
  {
    name: 'Baked Ensaymada Pudding',
    category: 'Pastries',
    shelf_life_extension: '+2 Days (Refrigerated)',
    optimal_window: '24-36 hours before expiry',
    required_ingredients: [
      'Sweet custard base (condensed milk, evaporated milk, whole eggs)',
      'Golden raisins (50g)',
      'Extra cheddar cheese shreds (60g)'
    ],
    instructions: [
      'Cut unsold ensaymada into bite-sized quarters.',
      'Layer cut pieces in a baking dish, scattering golden raisins between layers.',
      'Pour creamy milk custard over the bread pieces and let rest for 15 minutes.',
      'Top with shredded cheddar cheese.',
      'Bake at 165°C (330°F) for 30 minutes in a water bath until custard is gently set.'
    ],
    food_safety_controls: [
      'Ensure cheese topping is fresh and unfermented before baking.',
      'Must maintain internal temperature of 74°C during water-bath baking.'
    ]
  },
  {
    name: 'Bread Pudding Base',
    category: 'Bread',
    shelf_life_extension: '+2 Days (Refrigerated)',
    optimal_window: '24-36 hours before expiry',
    required_ingredients: [
      'Whole milk (400ml)',
      'Fresh egg wash (3 eggs)',
      'Brown sugar (100g)',
      'Melted butter (40g)',
      'Cinnamon spice (1/2 tsp)'
    ],
    instructions: [
      'Dice Spanish bread into cubes (incorporating sweet filling into the pudding matrix).',
      'Blend milk, egg wash, and cinnamon spice.',
      'Fold bread cubes into custard mixture and let rest 15 minutes.',
      'Bake at 170°C for 35 minutes until browned and fragrant.'
    ],
    food_safety_controls: [
      'Thorough internal bake to core temperature of 74°C.',
      'Immediate cooling and packaging within 1 hour post-bake.'
    ]
  },
  {
    name: 'Chocolate Truffle Cake Pops',
    category: 'Cakes',
    shelf_life_extension: '+3 Days (Chilled at 4°C)',
    optimal_window: '24-48 hours before expiry (unfrosted trimmings or unexpired sponge base only)',
    required_ingredients: [
      'Dark chocolate ganache (150g)',
      'Chocolate sprinkles / crushed nuts',
      'Lollipop sticks'
    ],
    instructions: [
      'Crumble safe, unexpired chocolate sponge cake finely into a mixing bowl.',
      'Blend with dark chocolate ganache until dough forms pliable balls.',
      'Scoop and shape into 30g round spheres and chill for 20 minutes.',
      'Dip lollipop stick into melted dark chocolate and insert into cake ball.',
      'Dip entire cake pop into tempered dark chocolate coating and decorate.'
    ],
    food_safety_controls: [
      'Strict cold chain storage at 4°C or below.',
      'Perishable cream/custard-filled cakes are strictly excluded from repurposing.'
    ]
  }
];

function openRepurposeRecipeModal(recipeName) {
  const modal = document.getElementById("repurpose-recipe-modal");
  const overlay = document.getElementById("repurpose-recipe-overlay");
  const body = document.getElementById("repurpose-recipe-body");
  if (!modal || !overlay || !body) return;

  const rNameLower = (recipeName || '').toLowerCase();
  const recipe = CLIENT_APPROVED_RECIPES.find(r => {
    return r.name.toLowerCase().includes(rNameLower) || rNameLower.includes(r.name.toLowerCase()) ||
           (rNameLower.includes('bread crumb') && r.name.includes('Bread Crumbs')) ||
           (rNameLower.includes('croissant') && r.name.includes('Croissant')) ||
           (rNameLower.includes('ensaymada') && r.name.includes('Ensaymada')) ||
           (rNameLower.includes('pudding') && r.name.includes('Pudding'));
  }) || CLIENT_APPROVED_RECIPES[0];

  const html = `
    <div style="background: var(--bg-surface-secondary, rgba(0,0,0,0.02)); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; margin-bottom: 16px;">
      <h3 style="margin: 0 0 6px 0; font-size: 1.15rem; color: var(--text-primary); font-weight: 700;">${escapeHtml(recipe.name)}</h3>
      <div style="display: flex; gap: 12px; font-size: 0.82rem; color: var(--text-secondary); flex-wrap: wrap;">
        <span>Category: <strong>${escapeHtml(recipe.category)}</strong></span>
        <span>&bull;</span>
        <span>Target Shelf Life: <strong style="color: var(--color-success);">${escapeHtml(recipe.shelf_life_extension)}</strong></span>
      </div>
    </div>

    <div style="margin-bottom: 14px;">
      <h4 style="margin: 0 0 6px 0; font-size: 0.9rem; color: var(--text-primary); font-weight: 700;">Optimal Utilization Window:</h4>
      <p style="margin: 0; font-size: 0.83rem; color: var(--text-secondary);">${escapeHtml(recipe.optimal_window)}</p>
    </div>

    <div style="margin-bottom: 14px;">
      <h4 style="margin: 0 0 6px 0; font-size: 0.9rem; color: var(--text-primary); font-weight: 700;">Required Secondary Ingredients:</h4>
      <ul style="margin: 0; padding-left: 20px; font-size: 0.83rem; color: var(--text-secondary); line-height: 1.5;">
        ${recipe.required_ingredients.map(ing => `<li>${escapeHtml(ing)}</li>`).join('')}
      </ul>
    </div>

    <div style="margin-bottom: 16px;">
      <h4 style="margin: 0 0 6px 0; font-size: 0.9rem; color: var(--text-primary); font-weight: 700;">Step-by-Step Preparation Method:</h4>
      <ol style="margin: 0; padding-left: 20px; font-size: 0.83rem; color: var(--text-secondary); line-height: 1.5;">
        ${recipe.instructions.map(inst => `<li>${escapeHtml(inst)}</li>`).join('')}
      </ol>
    </div>

    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px; color: #92400e; font-size: 0.82rem;">
      <strong style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
        <i data-lucide="shield-alert" style="width: 14px; height: 14px;"></i> Critical Food-Safety Controls:
      </strong>
      <ul style="margin: 0; padding-left: 18px; line-height: 1.45;">
        ${recipe.food_safety_controls.map(ctrl => `<li>${escapeHtml(ctrl)}</li>`).join('')}
      </ul>
    </div>
  `;

  setSafeHtml(body, html);
  modal.style.display = "block";
  overlay.style.display = "block";
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.openRepurposeRecipeModal = openRepurposeRecipeModal;

function closeRepurposeRecipeModal() {
  const modal = document.getElementById("repurpose-recipe-modal");
  const overlay = document.getElementById("repurpose-recipe-overlay");
  if (modal) modal.style.display = "none";
  if (overlay) overlay.style.display = "none";
}
window.closeRepurposeRecipeModal = closeRepurposeRecipeModal;

function openCreateRepurposingModal(batchCode, productId, productName, availableQty, unit, targetRecipe) {
  const modal = document.getElementById("create-repurpose-modal");
  const overlay = document.getElementById("create-repurpose-overlay");
  if (!modal || !overlay) return;

  document.getElementById("cr-batch-code").value = batchCode;
  document.getElementById("cr-product-id").value = productId;
  document.getElementById("cr-batch-label").textContent = batchCode;
  document.getElementById("cr-product-name").textContent = productName;
  document.getElementById("cr-available-qty").textContent = `${availableQty} ${unit}`;
  document.getElementById("cr-recipe-name").textContent = targetRecipe;
  document.getElementById("cr-unit-label").textContent = unit;
  document.getElementById("cr-quantity-input").value = availableQty;
  document.getElementById("cr-quantity-input").max = availableQty;

  const currentUserName = store.currentUser ? store.currentUser.name : 'Baker / Staff';
  document.getElementById("cr-baker-input").value = currentUserName;

  modal.style.display = "block";
  overlay.style.display = "block";
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.openCreateRepurposingModal = openCreateRepurposingModal;

function closeCreateRepurposeModal() {
  const modal = document.getElementById("create-repurpose-modal");
  const overlay = document.getElementById("create-repurpose-overlay");
  if (modal) modal.style.display = "none";
  if (overlay) overlay.style.display = "none";
}
window.closeCreateRepurposeModal = closeCreateRepurposeModal;

async function submitCreateRepurposingProduction() {
  const batchCode = document.getElementById("cr-batch-code").value;
  const productId = document.getElementById("cr-product-id").value;
  const productName = document.getElementById("cr-product-name").textContent;
  const recipe = document.getElementById("cr-recipe-name").textContent;
  const qty = parseInt(document.getElementById("cr-quantity-input").value) || 0;
  const baker = document.getElementById("cr-baker-input").value.trim() || 'Baker / Staff';
  const branchId = getDefaultBranchId();

  if (!batchCode || !productId || qty <= 0) {
    showToast("Please provide a valid repurposing quantity.", "error");
    return;
  }

  try {
    const res = await fetch('/api/repurpose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        product_name: productName,
        quantity: qty,
        target_recipe: recipe,
        branch_id: branchId,
        batch_id: batchCode
      })
    });

    if (res.ok) {
      const data = await res.json();
      const savedCost = data.waste_prevented_cost || (qty * 15);

      // Deduct inventory from local state
      let rem = qty;
      store._inventory.forEach(item => {
        if ((item.productId === productId || String(item.productId) === String(productId)) && rem > 0) {
          const deduct = Math.min(item.stockLevel, rem);
          item.stockLevel -= deduct;
          rem -= deduct;
          if (item.stockLevel <= 0) item.status = "Repurposed";
        }
      });
      store.save("bakewise_v2_inventory", store._inventory);

      // Add repurposed production order
      store._production.unshift({
        id: Date.now(),
        productId: productId,
        planned: qty,
        actual: qty,
        date: new Date().toISOString().split('T')[0],
        baker: baker,
        status: 'In Progress',
        code: `REP-B${branchId}-${productId}-${Date.now().toString().slice(-4)}`,
        branchId: branchId
      });
      store.save("bakewise_v2_production", store._production);
      store.commitAll();

      showToast(`Batch ${batchCode} (${qty} pcs) successfully converted into "${recipe}". Prevented waste value: ₱${savedCost.toFixed(2)}`, "success");
      closeCreateRepurposeModal();

      // Refresh relevant UI panes
      await renderRepurposingAlerts();
      await renderBakeRecommendations();
      if (typeof refreshProductionPane === 'function') refreshProductionPane();
      if (typeof refreshInventoryPane === 'function') refreshInventoryPane();
      if (typeof refreshDashboard === 'function') refreshDashboard();
      if (typeof refreshWastePane === 'function') refreshWastePane();
    } else {
      const errData = await res.json().catch(() => ({}));
      showToast(`Repurposing rejected: ${errData.error || res.statusText}`, "error");
    }
  } catch (err) {
    console.error("Error creating repurposing production:", err);
    showToast(`Error: ${err.message}`, "error");
  }
}
window.submitCreateRepurposingProduction = submitCreateRepurposingProduction;

function openMarkNotEligibleModal(batchCode, productId) {
  const modal = document.getElementById("not-eligible-modal");
  const overlay = document.getElementById("not-eligible-overlay");
  if (!modal || !overlay) return;

  document.getElementById("ne-batch-code").value = batchCode;
  document.getElementById("ne-product-id").value = productId;
  document.getElementById("ne-batch-label").textContent = batchCode;

  const select = document.getElementById("ne-reason-select");
  const customGroup = document.getElementById("ne-custom-reason-group");
  select.value = "Physical texture staling / excessive crumb hardening";
  customGroup.style.display = "none";

  select.onchange = () => {
    customGroup.style.display = select.value === "Other" ? "block" : "none";
  };

  modal.style.display = "block";
  overlay.style.display = "block";
  if (typeof lucide !== 'undefined') lucide.createIcons();
}
window.openMarkNotEligibleModal = openMarkNotEligibleModal;

function closeNotEligibleModal() {
  const modal = document.getElementById("not-eligible-modal");
  const overlay = document.getElementById("not-eligible-overlay");
  if (modal) modal.style.display = "none";
  if (overlay) overlay.style.display = "none";
}
window.closeNotEligibleModal = closeNotEligibleModal;

async function submitMarkBatchNotEligible() {
  const batchCode = document.getElementById("ne-batch-code").value;
  const productId = document.getElementById("ne-product-id").value;
  const select = document.getElementById("ne-reason-select");
  const customInput = document.getElementById("ne-custom-reason-input");
  const branchId = getDefaultBranchId();

  let finalReason = select.value;
  if (finalReason === "Other") {
    finalReason = customInput.value.trim() || "Disqualified from repurposing by authorized staff";
  }

  try {
    const res = await fetch('/api/repurpose/not-eligible', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_id: batchCode,
        product_id: productId,
        reason: finalReason,
        branch_id: branchId
      })
    });

    // Update in local store
    (store.inventory || []).forEach(i => {
      if (i.batchId === batchCode || String(i.id) === batchCode) {
        i.status = 'Not Eligible';
      }
    });
    store.save("bakewise_v2_inventory", store._inventory);
    store.commitAll();

    showToast(`Batch ${batchCode} marked as Not Eligible: ${finalReason}`, "warning");
    closeNotEligibleModal();

    await renderRepurposingAlerts();
  } catch (err) {
    console.error("Error marking batch not eligible:", err);
    showToast(`Error: ${err.message}`, "error");
  }
}
window.submitMarkBatchNotEligible = submitMarkBatchNotEligible;

// Compatibility handler
window.handleMarkAsRepurposed = async function(productId, productName, qty, recipe, batchId, branchId) {
  openCreateRepurposingModal(batchId || `BAT-${productId}`, productId, productName, qty, 'pcs', recipe);
};

function populateShelfBreadTypeDropdown() {
  const bakedProducts = (store.products || []).filter(p => {
    const cat = (p.category || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    if (cat.includes('drink') || cat.includes('beverage') || name.includes('coke') || name.includes('sprite') || name.includes('water')) {
      return false;
    }
    return true;
  });

  if (bakedProducts.length === 0) return;

  const items = bakedProducts.map(p => ({ id: p.name, name: p.name }));

  if (window.customComboboxes && window.customComboboxes["shelf-bread-type"]) {
    window.customComboboxes["shelf-bread-type"].setItems(items);
  } else if (document.getElementById("shelf-bread-type")) {
    window.customComboboxes = window.customComboboxes || {};
    window.customComboboxes["shelf-bread-type"] = new SearchableCombobox("shelf-bread-type", {
      icon: "tag",
      placeholder: "Search bread type...",
      items: items,
      onChange: () => {
        if (typeof window.triggerShelfLifeCalculation === 'function') {
          window.triggerShelfLifeCalculation({ persist: false });
        }
      }
    });
  }
}

function refreshShelfLifePane() {
  populateShelfBreadTypeDropdown();
  renderRepurposingAlerts();

  try {
    const saved = localStorage.getItem("bakewise_v2_last_shelf_prediction");
    if (saved) {
      const pred = JSON.parse(saved);
      if (pred && (pred.breadName || pred.breadType)) {
        if (pred.storageCondition) {
          pred.storageCondition = normalizeStorageCondition(pred.storageCondition);
        }
        if (typeof applyShelfLifePredictionResult === 'function') {
          applyShelfLifePredictionResult(pred);
        }
      }
    } else {
      if (typeof renderShelfRepurposingOptions === 'function') {
        renderShelfRepurposingOptions({ freshnessScore: 100, breadName: 'Pandesal' });
      }
    }
  } catch (e) {
    console.warn("Could not restore last shelf prediction:", e);
  }
}

// 7. PRODUCT CATALOG VIEW REFRESHER
function refreshProductsPane() {
  populateShelfBreadTypeDropdown();
  const tbody = document.getElementById("products-tbody");
  const addBtn = document.getElementById("btn-add-product-modal");
  const branchFilterEl = document.getElementById("products-branch-filter");
  const searchInputEl = document.getElementById("products-search-input");
  const categoryFilterEl = document.getElementById("products-category-filter");
  const statusFilterEl = document.getElementById("products-status-filter");

  if (addBtn && !addBtn.dataset.listening) {
    addBtn.dataset.listening = "true";
    addBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.openEditProductModal) window.openEditProductModal();
    });
  }

  if (branchFilterEl && branchFilterEl.options.length <= 1) {
    const branches = store.branches || [];
    branchFilterEl.innerHTML = `<option value="all">All Branches</option>` + 
      branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

    if (store.currentUser && store.currentUser.role !== 'admin') {
      branchFilterEl.value = store.currentUser.branch_id || store.currentUser.branchId || 'all';
      branchFilterEl.disabled = true;
    }

    if (!branchFilterEl.dataset.listening) {
      branchFilterEl.dataset.listening = "true";
      branchFilterEl.addEventListener("change", () => {
        productsCurrentPage = 1;
        refreshProductsPane();
      });
    }
  }

  if (searchInputEl && !searchInputEl.dataset.listening) {
    searchInputEl.dataset.listening = "true";
    searchInputEl.addEventListener("input", () => {
      productsCurrentPage = 1;
      refreshProductsPane();
    });
  }

  if (categoryFilterEl && !categoryFilterEl.dataset.listening) {
    categoryFilterEl.dataset.listening = "true";
    categoryFilterEl.addEventListener("change", () => {
      productsCurrentPage = 1;
      refreshProductsPane();
    });
  }

  if (statusFilterEl && !statusFilterEl.dataset.listening) {
    statusFilterEl.dataset.listening = "true";
    statusFilterEl.addEventListener("change", () => {
      productsCurrentPage = 1;
      refreshProductsPane();
    });
  }

  if (!tbody) return;

  const branchFilterVal = branchFilterEl ? branchFilterEl.value : 'all';
  const searchVal = searchInputEl ? searchInputEl.value.trim().toLowerCase() : '';
  const categoryVal = categoryFilterEl ? categoryFilterEl.value : 'all';
  const statusVal = statusFilterEl ? statusFilterEl.value : 'all';

  const filteredProducts = (store.products || []).filter(p => {
    if (branchFilterVal !== 'all') {
      const bId = parseInt(branchFilterVal);
      if (p.branchId != null && parseInt(p.branchId) !== bId) return false;
    }
    if (searchVal && !p.name.toLowerCase().includes(searchVal)) return false;
    if (categoryVal !== 'all' && p.category.toUpperCase() !== categoryVal.toUpperCase()) return false;
    if (statusVal !== 'all' && (p.status || 'Active').toLowerCase() !== statusVal.toLowerCase()) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  if (productsCurrentPage > totalPages) productsCurrentPage = totalPages;
  const startIndex = (productsCurrentPage - 1) * ITEMS_PER_PAGE;
  const pagedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  setSafeHtml(tbody, pagedProducts.map(p => {
    const branchObj = p.branchId ? (store.branches || []).find(b => parseInt(b.id) === parseInt(p.branchId)) : null;
    const branchLabel = branchObj ? branchObj.name : 'All Branches (Global)';
    const statusClass = (p.status || 'Active') === 'Active' ? 'success' : 'danger';

    return `
      <tr>
        <td style="font-weight: 700;">${p.name}</td>
        <td style="font-size: 0.85rem; color: var(--text-secondary);">${branchLabel}</td>
        <td><span class="badge info">${p.category}</span></td>
        <td style="font-weight: 700; color: var(--primary-color);">₱${p.price.toFixed(2)}</td>
        <td>₱${p.cost.toFixed(2)}</td>
        <td>${p.shelfLifeDays} Days</td>
        <td style="font-size: 0.85rem;">${p.unit || 'pcs'}</td>
        <td><span class="badge ${statusClass}">${p.status || 'Active'}</span></td>
        <td style="font-size: 0.85rem; color: var(--text-secondary);">${p.repurposeRecipe || 'N/A'}</td>
        <td style="vertical-align: middle;">
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="kanban-action-btn edit-product-btn" data-id="${p.id}" title="Edit Product"><i data-lucide="edit-3" style="width: 14px; height: 14px;"></i></button>
            <button class="kanban-action-btn delete-product-btn" data-id="${p.id}" title="Delete Product" style="color: var(--color-error);"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join(''));

  const prevBtn = document.getElementById("products-prev-page");
  const nextBtn = document.getElementById("products-next-page");
  const pageInfo = document.getElementById("products-page-info");

  if (pageInfo) pageInfo.textContent = `Page ${productsCurrentPage} of ${totalPages}`;
  if (prevBtn) {
    prevBtn.disabled = productsCurrentPage <= 1;
    prevBtn.style.opacity = productsCurrentPage <= 1 ? "0.5" : "1";
    prevBtn.onclick = () => {
      if (productsCurrentPage > 1) {
        productsCurrentPage--;
        refreshProductsPane();
      }
    };
  }
  if (nextBtn) {
    nextBtn.disabled = productsCurrentPage >= totalPages;
    nextBtn.style.opacity = productsCurrentPage >= totalPages ? "0.5" : "1";
    nextBtn.onclick = () => {
      if (productsCurrentPage < totalPages) {
        productsCurrentPage++;
        refreshProductsPane();
      }
    };
  }

  document.querySelectorAll(".edit-product-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const pId = btn.getAttribute("data-id");
      const product = store.products.find(x => x.id === pId);
      if (product && window.openEditProductModal) {
        window.openEditProductModal(product);
      }
    });
  });

  document.querySelectorAll(".delete-product-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const pId = btn.getAttribute("data-id");
      if (await showConfirmModal("Are you sure you want to delete this product?")) {
        await store.deleteProduct(pId);
        showToast('Product deleted from catalog.', 'info');
        refreshProductsPane();
        populateSelectDropdowns();
      }
    });
  });

  lucide.createIcons();
}

// 8. REPORTS PERFORMANCE DASHBOARD REFRESHER
function refreshReportsPane() {
  const startInputEl = document.getElementById("rep-filter-start");
  const endInputEl = document.getElementById("rep-filter-end");
  
  if (startInputEl && !startInputEl.value && endInputEl && !endInputEl.value) {
    const allDates = [...store.sales.map(s => s.date), ...store.waste.map(w => w.date)].filter(Boolean).sort();
    let refDate = new Date();
    if (allDates.length > 0) {
      const todayStr = formatLocalDate(new Date());
      if (allDates.includes(todayStr)) {
        refDate = parseLocalDate(todayStr);
      } else {
        const pastOrToday = allDates.filter(d => d <= todayStr);
        const bestDateStr = pastOrToday.length > 0 ? pastOrToday[pastOrToday.length - 1] : (allDates.includes('2026-10-31') ? '2026-10-31' : allDates[allDates.length - 1]);
        refDate = parseLocalDate(bestDateStr);
      }
    }
    let endDate = new Date(refDate);
    let startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    
    startInputEl.value = formatLocalDate(startDate);
    endInputEl.value = formatLocalDate(endDate);
  }

  const startDateStr = startInputEl?.value || "1970-01-01";
  const endDateStr = endInputEl?.value || "2099-12-31";

  const branchIdStr = store.getSelectedBranchId();
  const branchId = branchIdStr === 'all' ? 'all' : parseInt(branchIdStr);

  const reportSalesTbody = document.getElementById("report-sales-tbody");
  if (reportSalesTbody) {
    const totalPages = Math.ceil(store.products.length / ITEMS_PER_PAGE) || 1;
    if (repSalesCurrentPage > totalPages) repSalesCurrentPage = totalPages;
    const startIndex = (repSalesCurrentPage - 1) * ITEMS_PER_PAGE;
    const pagedProducts = store.products.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    setSafeHtml(reportSalesTbody, pagedProducts.map(p => {
      const pSales = store.sales.filter(s => s.productId === p.id && s.date >= startDateStr && s.date <= endDateStr && (branchId === 'all' || s.branchId === branchId));
      const unitsSold = pSales.reduce((sum, s) => sum + s.qty, 0);
      const totalIncome = unitsSold * p.price;
      return `
        <tr>
          <td style="font-weight: 600;">${p.name}</td>
          <td>${p.category}</td>
          <td>${unitsSold} pcs</td>
          <td>₱${p.price.toFixed(2)}</td>
          <td style="font-weight: 700; color: var(--color-success)">₱${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join(''));

    const prevBtn = document.getElementById("rep-sales-prev-page");
    const nextBtn = document.getElementById("rep-sales-next-page");
    const pageInfo = document.getElementById("rep-sales-page-info");

    if (pageInfo) pageInfo.textContent = `Page ${repSalesCurrentPage} of ${totalPages}`;
    if (prevBtn) {
      prevBtn.disabled = repSalesCurrentPage <= 1;
      prevBtn.style.opacity = repSalesCurrentPage <= 1 ? "0.5" : "1";
      prevBtn.onclick = () => {
        if (repSalesCurrentPage > 1) {
          repSalesCurrentPage--;
          refreshReportsPane();
        }
      };
    }
    if (nextBtn) {
      nextBtn.disabled = repSalesCurrentPage >= totalPages;
      nextBtn.style.opacity = repSalesCurrentPage >= totalPages ? "0.5" : "1";
      nextBtn.onclick = () => {
        if (repSalesCurrentPage < totalPages) {
          repSalesCurrentPage++;
          refreshReportsPane();
        }
      };
    }
  }

  const reportWasteTbody = document.getElementById("report-waste-tbody");
  if (reportWasteTbody) {
    const totalPages = Math.ceil(store.products.length / ITEMS_PER_PAGE) || 1;
    if (repWasteCurrentPage > totalPages) repWasteCurrentPage = totalPages;
    const startIndex = (repWasteCurrentPage - 1) * ITEMS_PER_PAGE;
    const pagedProducts = store.products.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    setSafeHtml(reportWasteTbody, pagedProducts.map(p => {
      const pWaste = store.waste.filter(w => (w.productId === p.id || w.product_id === p.id) && w.date >= startDateStr && w.date <= endDateStr && (branchId === 'all' || (w.branchId != null ? w.branchId : w.branch_id) === branchId));
      const totalWaste = pWaste.reduce((sum, w) => sum + (parseInt(w.qty) || 0), 0);
      const costLost = totalWaste * parseFloat(p.cost || 0);
      const reasons = pWaste.map(w => w.reason);
      let primaryReason = reasons.length > 0 ? reasons[0] : "N/A";

      return `
        <tr>
          <td style="font-weight: 600;">${p.name}</td>
          <td>${totalWaste} pcs</td>
          <td><span class="badge ${primaryReason === 'Expired' ? 'danger' : 'warning'}">${primaryReason}</span></td>
          <td style="font-weight: 700; color: var(--color-error)">₱${costLost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    }).join(''));

    const prevBtn = document.getElementById("rep-waste-prev-page");
    const nextBtn = document.getElementById("rep-waste-next-page");
    const pageInfo = document.getElementById("rep-waste-page-info");

    if (pageInfo) pageInfo.textContent = `Page ${repWasteCurrentPage} of ${totalPages}`;
    if (prevBtn) {
      prevBtn.disabled = repWasteCurrentPage <= 1;
      prevBtn.style.opacity = repWasteCurrentPage <= 1 ? "0.5" : "1";
      prevBtn.onclick = () => {
        if (repWasteCurrentPage > 1) {
          repWasteCurrentPage--;
          refreshReportsPane();
        }
      };
    }
    if (nextBtn) {
      nextBtn.disabled = repWasteCurrentPage >= totalPages;
      nextBtn.style.opacity = repWasteCurrentPage >= totalPages ? "0.5" : "1";
      nextBtn.onclick = () => {
        if (repWasteCurrentPage < totalPages) {
          repWasteCurrentPage++;
          refreshReportsPane();
        }
      };
    }
  }

  const reportEffTbody = document.getElementById("report-efficiency-tbody");
  if (reportEffTbody) {
    const totalPages = Math.ceil(store.products.length / ITEMS_PER_PAGE) || 1;
    if (repEffCurrentPage > totalPages) repEffCurrentPage = totalPages;
    const startIndex = (repEffCurrentPage - 1) * ITEMS_PER_PAGE;
    const pagedProducts = store.products.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    setSafeHtml(reportEffTbody, pagedProducts.map(p => {
      const pRuns = store.production.filter(pr => pr.productId === p.id && (branchId === 'all' || pr.branchId === branchId));
      const plannedSum = pRuns.reduce((sum, r) => sum + r.planned, 0);
      const actualSum = pRuns.reduce((sum, r) => sum + r.actual, 0);
      const deviation = actualSum - plannedSum;
      const efficiency = plannedSum > 0 ? Math.round((actualSum / plannedSum) * 100) : 100;

      return `
        <tr>
          <td style="font-weight: 600;">${p.name}</td>
          <td>${plannedSum} pcs</td>
          <td>${actualSum} pcs</td>
          <td style="font-weight: 600; color: ${deviation < 0 ? 'var(--color-error)' : 'var(--color-success)'}">
            ${deviation > 0 ? '+' : ''}${deviation} pcs
          </td>
          <td style="font-weight: 700; color: ${efficiency >= 100 ? 'var(--color-success)' : 'var(--color-warning)'}">${efficiency}%</td>
        </tr>
      `;
    }).join(''));

    const prevBtn = document.getElementById("rep-eff-prev-page");
    const nextBtn = document.getElementById("rep-eff-next-page");
    const pageInfo = document.getElementById("rep-eff-page-info");

    if (pageInfo) pageInfo.textContent = `Page ${repEffCurrentPage} of ${totalPages}`;
    if (prevBtn) {
      prevBtn.disabled = repEffCurrentPage <= 1;
      prevBtn.style.opacity = repEffCurrentPage <= 1 ? "0.5" : "1";
      prevBtn.onclick = () => {
        if (repEffCurrentPage > 1) {
          repEffCurrentPage--;
          refreshReportsPane();
        }
      };
    }
    if (nextBtn) {
      nextBtn.disabled = repEffCurrentPage >= totalPages;
      nextBtn.style.opacity = repEffCurrentPage >= totalPages ? "0.5" : "1";
      nextBtn.onclick = () => {
        if (repEffCurrentPage < totalPages) {
          repEffCurrentPage++;
          refreshReportsPane();
        }
      };
    }
  }
}

// 9. ADMIN USERS PANE REFRESHER
async function refreshAdminUsersPane() {
  const tbody = document.getElementById("admin-users-tbody");
  if (!tbody) return;

  // Re-sync Create Staff Account role & branch state on refresh
  const activeCreateRole = (window.customComboboxes && window.customComboboxes["usr-role-select"] ? window.customComboboxes["usr-role-select"].selectedValue : null) || document.getElementById("usr-role-select")?.value || "admin";
  syncRoleBranchField(activeCreateRole, "usr-branch-select", "usr-branch-select");

  if (store.isBackendOnline) {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        store.users = await res.json();
        store.save("bakewise_v2_users", store.users);
      }
    } catch (e) { console.error("Error fetching users:", e); }
  }

  const selectedBranchId = store.getSelectedBranchId();
  const isAllBranches = !selectedBranchId || selectedBranchId === 'all';

  // Branch filtering following global administrator and individual branch assignment rules
  const branchUsers = (store.users || []).filter(u => {
    if (isAllBranches) return true;
    if (u.role === 'admin') return true; // Global Administrator has global access across all branches
    return u.branch_id != null && parseInt(u.branch_id) === parseInt(selectedBranchId);
  });

  // Calculate dynamic account counts from actual database records in scope
  const totalCount = branchUsers.length;
  const managerCount = branchUsers.filter(u => u.role === 'manager').length;
  const staffCount = branchUsers.filter(u => ['sales', 'staff', 'production', 'baker', 'inventory'].includes(u.role)).length;
  const adminCount = branchUsers.filter(u => u.role === 'admin').length;

  // Update summary cards dynamically
  const totalEl = document.getElementById("user-kpi-total");
  const managersEl = document.getElementById("user-kpi-managers");
  const staffEl = document.getElementById("user-kpi-staff");
  const adminsEl = document.getElementById("user-kpi-admins");

  if (totalEl) totalEl.textContent = `${totalCount} ${totalCount === 1 ? 'Account' : 'Accounts'}`;
  if (managersEl) managersEl.textContent = `${managerCount} ${managerCount === 1 ? 'Manager' : 'Managers'}`;
  if (staffEl) staffEl.textContent = `${staffCount} Staff`;
  if (adminsEl) adminsEl.textContent = `${adminCount} ${adminCount === 1 ? 'Admin' : 'Admins'}`;

  // Filter for directory table based on search input and role filter
  const searchInput = document.getElementById("user-search-input");
  const roleFilter = document.getElementById("user-role-filter");

  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const roleVal = roleFilter ? roleFilter.value : "all";

  const filteredUsers = branchUsers.filter(u => {
    const displayNameForSearch = u.name === 'System Administrator' ? 'Admin' : (u.name === 'Branch Manager' ? 'Manager' : (u.name || ''));
    const matchQuery = !query || (u.name && u.name.toLowerCase().includes(query)) || displayNameForSearch.toLowerCase().includes(query) || (u.email && u.email.toLowerCase().includes(query));
    const matchRole = roleVal === "all" || u.role === roleVal || (roleVal === "sales" && u.role === "staff") || (roleVal === "production" && u.role === "baker");
    return matchQuery && matchRole;
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
  if (usersCurrentPage > totalPages) usersCurrentPage = totalPages;
  const startIdx = (usersCurrentPage - 1) * ITEMS_PER_PAGE;
  const pagedUsers = filteredUsers.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  if (pagedUsers.length === 0) {
    setSafeHtml(tbody, `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-secondary); font-style: italic;">No registered user accounts found.</td></tr>`);
  } else {
    setSafeHtml(tbody, pagedUsers.map(u => {
      const branch = store.branches.find(b => b.id === u.branch_id);
      const branchName = branch ? branch.name : (u.role === 'admin' ? 'All Branches' : 'Main Branch (Central)');
      const displayName = u.name === 'System Administrator' ? 'Admin' : (u.name === 'Branch Manager' ? 'Manager' : u.name);
      const isProtected = u.email === 'admin@bakewise.com' || (store.currentUser && (store.currentUser.id === u.id || store.currentUser.email === u.email));

      return `
        <tr>
          <td style="font-weight: 700;">${displayName}</td>
          <td><code>${u.email}</code></td>
          <td><span class="badge ${u.role === 'admin' ? 'danger' : u.role === 'manager' ? 'warning' : 'info'}">${store.getRoleLabel(u.role)}</span></td>
          <td>${branchName}</td>
          <td style="vertical-align: middle;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="kanban-action-btn edit-user-btn" data-id="${u.id}" title="Edit User Account" style="color: var(--primary-color); border: none; background: transparent; cursor: pointer;">
                <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
              </button>
              <button class="kanban-action-btn delete-user-btn" data-id="${u.id}" title="${isProtected ? 'Protected Administrator' : 'Delete User Account'}" style="color: ${isProtected ? 'var(--text-secondary)' : 'var(--color-error)'}; border: none; background: transparent; cursor: ${isProtected ? 'not-allowed' : 'pointer'}; opacity: ${isProtected ? '0.4' : '1'};" ${isProtected ? 'disabled' : ''}>
                <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join(''));
  }
  lucide.createIcons();

  if (searchInput && !searchInput.dataset.listening) {
    searchInput.dataset.listening = "true";
    searchInput.addEventListener("input", () => {
      usersCurrentPage = 1;
      refreshAdminUsersPane();
    });
  }
  if (roleFilter && !roleFilter.dataset.listening) {
    roleFilter.dataset.listening = "true";
    roleFilter.addEventListener("change", () => {
      usersCurrentPage = 1;
      refreshAdminUsersPane();
    });
  }

  const prevBtn = document.getElementById("users-prev-page");
  const nextBtn = document.getElementById("users-next-page");
  const pageInfo = document.getElementById("users-page-info");

  if (pageInfo) pageInfo.textContent = `Page ${usersCurrentPage} of ${totalPages}`;
  if (prevBtn) {
    prevBtn.disabled = usersCurrentPage <= 1;
    prevBtn.style.opacity = usersCurrentPage <= 1 ? "0.5" : "1";
    prevBtn.onclick = () => {
      if (usersCurrentPage > 1) {
        usersCurrentPage--;
        refreshAdminUsersPane();
      }
    };
  }
  if (nextBtn) {
    nextBtn.disabled = usersCurrentPage >= totalPages;
    nextBtn.style.opacity = usersCurrentPage >= totalPages ? "0.5" : "1";
    nextBtn.onclick = () => {
      if (usersCurrentPage < totalPages) {
        usersCurrentPage++;
        refreshAdminUsersPane();
      }
    };
  }

  document.querySelectorAll(".edit-user-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const uId = parseInt(btn.getAttribute("data-id"));
      const user = store.users.find(u => u.id === uId);
      if (user) {
        document.getElementById("edit-user-id").value = user.id;
        document.getElementById("edit-usr-name").value = user.name;
        document.getElementById("edit-usr-email").value = user.email;
        document.getElementById("edit-usr-password").value = "";
        setupPasswordToggle("edit-usr-password", "btn-toggle-edit-usr-password");
        const roleCb = window.customComboboxes ? window.customComboboxes["edit-usr-role"] : null;
        if (roleCb) {
          roleCb.selectValue(user.role);
        } else {
          document.getElementById("edit-usr-role").value = user.role;
        }

        const editBranchCb = window.customComboboxes ? window.customComboboxes["edit-usr-branch"] : null;
        if (user.role !== 'admin' && user.branch_id) {
          if (editBranchCb) editBranchCb.selectValue(String(user.branch_id));
          const editBranchEl = document.getElementById("edit-usr-branch");
          if (editBranchEl) editBranchEl.value = String(user.branch_id);
        }
        syncRoleBranchField(user.role, "edit-usr-branch", "edit-usr-branch");

        document.getElementById("user-edit-modal").style.display = "block";
        document.getElementById("modal-overlay").classList.add("visible");
      }
    });
  });

  const btnUserModalClose = document.getElementById("btn-user-modal-close");
  const btnUserModalCancel = document.getElementById("btn-user-modal-cancel");
  const closeUserModal = () => {
    document.getElementById("user-edit-modal").style.display = "none";
    document.getElementById("modal-overlay").classList.remove("visible");
    setupPasswordToggle("edit-usr-password", "btn-toggle-edit-usr-password");
  };
  if (btnUserModalClose) btnUserModalClose.onclick = closeUserModal;
  if (btnUserModalCancel) btnUserModalCancel.onclick = closeUserModal;

  document.querySelectorAll(".delete-user-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (btn.disabled) return;
      const id = btn.getAttribute("data-id");
      const targetUser = store.users.find(u => u.id.toString() === id.toString());
      if (targetUser) {
        if (targetUser.email === 'admin@bakewise.com') {
          showToast("The primary System Administrator account cannot be deleted.", "error");
          return;
        }
        if (store.currentUser && (store.currentUser.id === targetUser.id || store.currentUser.email === targetUser.email)) {
          showToast("You cannot delete your own active administrator account.", "error");
          return;
        }
      }
      if (await showConfirmModal("Are you sure you want to delete this staff account?")) {
        await store.deleteUser(id);
        await refreshAdminUsersPane();
        showToast("Staff account deleted.", "info");
      }
    });
  });
}

// 10. ADMIN BRANCHES PANE & REAL INTERACTIVE MAP MONITOR REFRESHER
let realLeafletMapInstance = null;
let leafletMarkersGroup = null;

let branchCurrentPage = 1;
const BRANCHES_PER_PAGE = 10;

async function refreshAdminBranchesPane() {
  bindContactNumberSanitizer("br-contact-input");
  bindContactNumberSanitizer("edit-br-contact");
  const tbody = document.getElementById("admin-branches-tbody");

  if (store.isBackendOnline) {
    try {
      const res = await fetch('/api/branches');
      if (res.ok) { store.branches = await res.json(); store.save("bakewise_v2_branches", store.branches); }
    } catch (e) { console.error("Error fetching branches:", e); }
  }

  // Dynamic Network KPI Updates
  const totalBranchesCount = (store.branches || []).length;

  // Only aggregate financial KPIs for registered branches; show ₱0.00 when none
  const registeredBranchIds = new Set((store.branches || []).map(b => b.id != null ? b.id.toString() : null).filter(Boolean));
  const hasBranches = totalBranchesCount > 0;
  const totalNetworkSales = hasBranches
    ? (store._sales || []).filter(s => {
        const bId = s.branch_id != null ? s.branch_id : s.branchId;
        return bId != null && (registeredBranchIds.size === 0 || registeredBranchIds.has(bId.toString()));
      }).reduce((sum, s) => sum + (s.qty * s.price), 0)
    : 0;
  const totalNetworkWaste = hasBranches
    ? (store._waste || []).filter(w => {
        const bId = w.branch_id != null ? w.branch_id : w.branchId;
        return bId != null && (registeredBranchIds.size === 0 || registeredBranchIds.has(bId.toString()));
      }).reduce((sum, w) => {
        const p = (store.products || []).find(prod => prod.id === (w.productId || w.product_id));
        const uCost = (p && p.cost != null) ? parseFloat(p.cost) : parseFloat(w.cost || 0);
        return sum + ((parseInt(w.qty) || 0) * uCost);
      }, 0)
    : 0;

  // Compute Cost of Goods Sold (COGS) for accurate bakery net profit
  const totalNetworkCogs = hasBranches
    ? (store._sales || []).filter(s => {
        const bId = s.branch_id != null ? s.branch_id : s.branchId;
        return bId != null && (registeredBranchIds.size === 0 || registeredBranchIds.has(bId.toString()));
      }).reduce((sum, s) => {
        const p = (store.products || []).find(prod => prod.id === (s.productId || s.product_id));
        const uCost = (p && p.cost != null) ? parseFloat(p.cost) : (parseFloat(s.price) * 0.55);
        return sum + ((parseInt(s.qty) || 0) * uCost);
      }, 0)
    : 0;

  // True Net Profit Formula: Sales Revenue - COGS (Ingredient Production Cost) - Total Waste Cost
  const totalNetProfit = totalNetworkSales - totalNetworkCogs - totalNetworkWaste;
  const marginPct = totalNetworkSales > 0 ? ((totalNetProfit / totalNetworkSales) * 100).toFixed(1) : '0.0';

  const countEl = document.getElementById("branch-kpi-count");
  if (countEl) countEl.textContent = `${totalBranchesCount}`;

  const salesEl = document.getElementById("branch-kpi-sales");
  if (salesEl) salesEl.textContent = `₱${totalNetworkSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const wasteEl = document.getElementById("branch-kpi-waste");
  if (wasteEl) wasteEl.textContent = `₱${totalNetworkWaste.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const netEl = document.getElementById("branch-kpi-net");
  if (netEl) netEl.textContent = `₱${totalNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const netSubtextEl = document.getElementById("branch-kpi-net-subtext");
  if (netSubtextEl) {
    netSubtextEl.textContent = `${marginPct}% Net Margin (COGS & Waste Deducted)`;
  }

  const searchInput = document.getElementById("branch-search-input");
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const filteredBranches = store.branches.filter(b => {
    return !query || b.name.toLowerCase().includes(query) || (b.address && b.address.toLowerCase().includes(query));
  });

  const totalPages = Math.ceil(filteredBranches.length / BRANCHES_PER_PAGE) || 1;
  if (branchCurrentPage > totalPages) branchCurrentPage = totalPages;
  const startIndex = (branchCurrentPage - 1) * BRANCHES_PER_PAGE;
  const pagedBranches = filteredBranches.slice(startIndex, startIndex + BRANCHES_PER_PAGE);

  if (tbody) {
    if (pagedBranches.length === 0) {
      setSafeHtml(tbody, `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted, #888); font-size: 0.97rem;">No branches registered yet. Register your first branch to get started.</td></tr>`);
    } else {
    setSafeHtml(tbody, pagedBranches.map(b => `
      <tr>
        <td style="font-weight: 700;">${b.name}</td>
        <td>${b.address || ''}</td>
        <td>${b.store_hours || ''}</td>
        <td>${b.contact_no || ''}</td>
        <td><span class="badge ${b.status === 'Active' ? 'success' : 'danger'}">${b.status || 'Active'}</span></td>
        <td style="vertical-align: middle;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="kanban-action-btn edit-branch-btn" data-id="${b.id}" title="Edit Branch" style="color: var(--primary-color); border: none; background: transparent; cursor: pointer;">
              <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="kanban-action-btn delete-branch-btn" data-id="${b.id}" title="Remove Branch" style="color: var(--color-error); border: none; background: transparent; cursor: pointer;">
              <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join(''));
    } // end else (pagedBranches.length > 0)
    lucide.createIcons();

    if (searchInput && !searchInput.dataset.listening) {
      searchInput.dataset.listening = "true";
      searchInput.addEventListener("input", () => {
        branchCurrentPage = 1; // reset page on search
        refreshAdminBranchesPane();
      });
    }

    const prevBtn = document.getElementById("branch-prev-page");
    const nextBtn = document.getElementById("branch-next-page");
    const pageInfo = document.getElementById("branch-page-info");

    if (pageInfo) {
      pageInfo.textContent = `Page ${branchCurrentPage} of ${totalPages}`;
    }

    if (prevBtn) {
      prevBtn.disabled = branchCurrentPage <= 1;
      prevBtn.style.opacity = branchCurrentPage <= 1 ? "0.5" : "1";
      prevBtn.onclick = () => {
        if (branchCurrentPage > 1) {
          branchCurrentPage--;
          refreshAdminBranchesPane();
        }
      };
    }

    if (nextBtn) {
      nextBtn.disabled = branchCurrentPage >= totalPages;
      nextBtn.style.opacity = branchCurrentPage >= totalPages ? "0.5" : "1";
      nextBtn.onclick = () => {
        if (branchCurrentPage < totalPages) {
          branchCurrentPage++;
          refreshAdminBranchesPane();
        }
      };
    }

    document.querySelectorAll(".edit-branch-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const bId = parseInt(btn.getAttribute("data-id"));
        const branch = store.branches.find(b => b.id === bId);
        if (branch) {
          document.getElementById("edit-branch-id").value = branch.id;
          document.getElementById("edit-br-name").value = branch.name;
          document.getElementById("edit-br-status").value = branch.status || 'Active';
          document.getElementById("edit-br-address").value = branch.address || '';
          document.getElementById("edit-br-contact").value = branch.contact_no || '';

          const parsedHours = parseStoreHoursString(branch.store_hours || '');
          const edit24Cb = document.getElementById("edit-br-24hours-checkbox");
          const editOpenEl = document.getElementById("edit-br-open-time");
          const editCloseEl = document.getElementById("edit-br-close-time");
          const editTimeRow = document.getElementById("edit-br-time-picker-row");
          const editHoursHidden = document.getElementById("edit-br-hours");

          if (edit24Cb) edit24Cb.checked = parsedHours.is24Hours;
          if (editOpenEl) editOpenEl.value = parsedHours.openTime || "05:00";
          if (editCloseEl) editCloseEl.value = parsedHours.closeTime || "20:00";
          if (editHoursHidden) editHoursHidden.value = branch.store_hours || (parsedHours.is24Hours ? "24 Hours" : "5:00 AM – 8:00 PM");

          if (editTimeRow) {
            editTimeRow.style.opacity = parsedHours.is24Hours ? "0.45" : "1";
            editTimeRow.style.pointerEvents = parsedHours.is24Hours ? "none" : "auto";
          }
          if (editOpenEl) editOpenEl.required = !parsedHours.is24Hours;
          if (editCloseEl) editCloseEl.required = !parsedHours.is24Hours;
          document.getElementById("branch-edit-modal").style.display = "block";
          document.getElementById("modal-overlay").classList.add("visible");
        }
      });
    });

    const btnBranchModalClose = document.getElementById("btn-branch-modal-close");
    if (btnBranchModalClose) {
      btnBranchModalClose.onclick = () => {
        document.getElementById("branch-edit-modal").style.display = "none";
        document.getElementById("modal-overlay").classList.remove("visible");
      };
    }

    document.querySelectorAll(".delete-branch-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const bObj = (store.branches || []).find(b => b.id.toString() === id.toString());
        const bName = bObj ? bObj.name : `Branch #${id}`;

        const confirmTitle = "Delete Branch?";
        const confirmMsg = "Are you sure you want to delete this branch? This will permanently delete the branch and all its associated staff accounts, inventory, sales, production, waste records, and other branch data. This action cannot be undone.";

        if (await showConfirmModal(confirmMsg, confirmTitle, "alert-triangle", "Delete Branch", "Cancel")) {
          try {
            await store.deleteBranch(id);
            populateSelectDropdowns();
            await refreshAdminBranchesPane();
            if (typeof refreshAdminUsersPane === 'function') await refreshAdminUsersPane();
            if (typeof refreshInventoryPane === 'function') await refreshInventoryPane();
            if (typeof refreshSalesPane === 'function') await refreshSalesPane();
            if (typeof refreshProductionPane === 'function') await refreshProductionPane();
            if (typeof refreshWastePane === 'function') await refreshWastePane();
            if (typeof refreshReportsPane === 'function') await refreshReportsPane();
            if (typeof refreshPosHistory === 'function') await refreshPosHistory();
            if (typeof refreshDashboardPane === 'function') await refreshDashboardPane();
            if (typeof refreshDashboard === 'function') await refreshDashboard();
            showToast("Branch and all associated data have been successfully deleted.", "success");
          } catch (err) {
            console.error("Branch deletion error:", err);
            showToast(err.message || "Failed to delete branch.", "error");
          }
        }
      });
    });
  }

  // Map visualization (Real Leaflet Map)
  const mapContainer = document.getElementById("branch-map");
  if (mapContainer && typeof L !== 'undefined') {
    if (!realLeafletMapInstance) {
      realLeafletMapInstance = L.map('branch-map').setView([7.0736, 125.6110], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(realLeafletMapInstance);
    }
    
    if (leafletMarkersGroup) {
      realLeafletMapInstance.removeLayer(leafletMarkersGroup);
    }
    leafletMarkersGroup = L.layerGroup().addTo(realLeafletMapInstance);

    store.branches.forEach(b => {
      let lat = parseFloat(b.latitude);
      let lng = parseFloat(b.longitude);
      if (isNaN(lat) || isNaN(lng) || lat > 90 || lng > 180) {
        lat = 7.0736 + (b.id * 0.01) - 0.02;
        lng = 125.6110 + (b.id * 0.01) - 0.02;
      }
      
      const markerColor = b.status === 'Active' ? 'var(--color-success, #22c55e)' : 'var(--color-error, #ef4444)';
      const customIcon = L.divIcon({
        className: 'custom-leaflet-pin',
        html: `<div style="display:flex;flex-direction:column;align-items:center;">
                 <div style="background-color:${markerColor};width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.2);"></div>
                 <div style="background-color:white;padding:2px 6px;border-radius:4px;font-size:0.7rem;font-weight:700;margin-top:4px;border:1px solid #ccc;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.1);color:#333;">
                   ${b.name}
                 </div>
               </div>`,
        iconSize: [120, 40],
        iconAnchor: [60, 10],
        popupAnchor: [0, -10]
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(leafletMarkersGroup);
      marker.bindPopup(`<b>${b.name}</b><br>${b.address || 'No address'}<br>Status: <b>${b.status}</b>`);
    });
    
    setTimeout(() => {
      realLeafletMapInstance.invalidateSize();
    }, 250);
  }

  lucide.createIcons();
}

// --- SHELF LIFE PREDICTION MODULE ---
function normalizeStorageCondition(rawStorage) {
  if (!rawStorage) return 'Covered Room-Temperature Storage';
  const s = String(rawStorage).trim().toLowerCase();
  
  if (s === 'uncovered storage' || s === 'open' || s.includes('uncover') || s.includes('exposed')) {
    return 'Uncovered Storage';
  }
  if (s === 'sealed packaging' || s === 'sealed' || s.includes('sealed') || s.includes('airtight')) {
    return 'Sealed Packaging';
  }
  if (s === 'frozen storage' || s === 'frozen' || s.includes('froz')) {
    return 'Frozen Storage';
  }
  if (s === 'refrigerated storage' || s === 'refrigerated' || s.includes('refrigerat') || s.includes('chilled') || s.includes('4°c')) {
    return 'Refrigerated Storage';
  }
  if (s === 'display case storage' || s.includes('display') || s.includes('showcase')) {
    return 'Display Case Storage';
  }
  if (s === 'covered room-temperature storage' || s.includes('ambient') || s.includes('room') || s.includes('covered') || s.includes('25°c')) {
    return 'Covered Room-Temperature Storage';
  }
  return 'Covered Room-Temperature Storage';
}
window.normalizeStorageCondition = normalizeStorageCondition;

function getTemperatureBand(temp) {
  const t = parseInt(temp, 10);
  if (t < 25) {
    return { band: "Cool", color: "#2563eb", bg: "rgba(59, 130, 246, 0.12)" };
  } else if (t < 40) {
    return { 
      band: "Ambient", 
      color: t > 30 ? "#d97706" : "#16a34a", 
      bg: t > 30 ? "rgba(245, 158, 11, 0.12)" : "rgba(34, 197, 94, 0.12)" 
    };
  } else if (t < 50) {
    return { band: "Hot", color: "#ea580c", bg: "rgba(234, 88, 12, 0.12)" };
  } else {
    return { band: "Very Hot", color: "#dc2626", bg: "rgba(239, 68, 68, 0.15)" };
  }
}
window.getTemperatureBand = getTemperatureBand;

function calculateShelfLifePrediction({ breadType, breadName, storage, temp, humid, prodDate }) {
  const normalizedStorage = normalizeStorageCondition(storage);

  // 1. Dynamic Base Shelf Life Lookup from Product Catalog
  const targetProduct = (store.products || []).find(p => 
    String(p.id) === String(breadType) || 
    p.name === breadName || 
    String(p.name).toLowerCase() === String(breadType).toLowerCase() ||
    String(p.name).toLowerCase() === String(breadName).toLowerCase()
  );

  let baseShelfLife = 3;
  if (targetProduct && targetProduct.shelfLifeDays) {
    baseShelfLife = parseInt(targetProduct.shelfLifeDays, 10);
  } else if (targetProduct) {
    const pNameLower = targetProduct.name.toLowerCase();
    const pCatLower = (targetProduct.category || '').toLowerCase();
    if (pNameLower.includes('sliced') || pNameLower.includes('loaf')) baseShelfLife = 7;
    else if (pCatLower.includes('cake') || pNameLower.includes('cake')) baseShelfLife = 5;
    else if (pCatLower.includes('pastr') || pNameLower.includes('ensaymada') || pNameLower.includes('croissant') || pNameLower.includes('muffin')) baseShelfLife = 4;
    else baseShelfLife = 3;
  } else {
    const bLower = (breadType || breadName || '').toLowerCase();
    if (bLower.includes("sliced") || bLower.includes("loaf")) baseShelfLife = 7;
    else if (bLower.includes("cake")) baseShelfLife = 5;
    else if (bLower.includes("ensaymada") || bLower.includes("pastr") || bLower.includes("muffin")) baseShelfLife = 4;
    else baseShelfLife = 3;
  }

  const isDairyOrFilled = (breadName || breadType || '').toLowerCase().match(/(ensaymada|cake|custard|cream|cheese|pastry)/i);

  // 2. Storage Condition Multiplier & Informative Guidance
  let storageMultiplier = 1.0;
  let storageMsg = "";
  let storageColor = "var(--text-secondary)";

  switch (normalizedStorage) {
    case 'Uncovered Storage':
      storageMultiplier = 0.50;
      storageMsg = "Uncovered storage: Direct air exposure accelerates moisture loss, crumb staling, and airborne mold spore deposition.";
      storageColor = "#ef4444";
      break;

    case 'Sealed Packaging':
      storageMultiplier = 1.25;
      storageMsg = "Sealed packaging: Airtight barrier prevents moisture loss and blocks airborne fungal spores.";
      storageColor = "#22c55e";
      break;

    case 'Refrigerated Storage':
      // Refrigeration (4°C) suppresses mold significantly, especially vital for dairy/cream fillings
      storageMultiplier = isDairyOrFilled ? 1.75 : 1.60;
      storageMsg = "Refrigerated storage (4°C): Significantly suppresses microbial and mold growth; ideal for filled and dairy-rich pastries.";
      storageColor = "#3b82f6";
      break;

    case 'Frozen Storage':
      // Freezing (-18°C) halts water activity and fungal growth
      storageMultiplier = 3.50;
      storageMsg = "Frozen storage (-18°C): Halts microbial activity and staling; preserves bread structure until thawed.";
      storageColor = "#06b6d4";
      break;

    case 'Display Case Storage':
      storageMultiplier = 0.85;
      storageMsg = "Display case storage: Provides display protection, but showcase warmth and frequent opening gradually reduce freshness.";
      storageColor = "#f59e0b";
      break;

    case 'Covered Room-Temperature Storage':
    default:
      storageMultiplier = 1.00;
      storageMsg = "Covered room-temperature storage: Standard baseline storage protecting from dust and room drafts.";
      storageColor = "var(--text-secondary)";
      break;
  }

  // 3. Temperature Modifiers (10°C to 70°C) with 4 Indicator Bands (Cool, Ambient, Hot, Very Hot)
  const bandInfo = (typeof getTemperatureBand === 'function') 
    ? getTemperatureBand(temp) 
    : (temp < 25 ? { band: "Cool" } : temp < 40 ? { band: "Ambient" } : temp < 50 ? { band: "Hot" } : { band: "Very Hot" });
  const tempBand = bandInfo.band;
  let tempModifier = 1.0;
  let tempMsg = `Optimal room temperature (${temp}°C - ${tempBand}) is within acceptable bakery standards.`;
  let tempColor = "var(--text-secondary)";

  if (normalizedStorage === 'Frozen Storage') {
    if (temp >= 50) {
      tempModifier = 0.92;
      tempMsg = `Sub-zero freezing maintains preservation despite extreme facility heat (${temp}°C - ${tempBand}).`;
      tempColor = "#f59e0b";
    } else {
      tempModifier = 1.0;
      tempMsg = `Sub-zero freezing (-18°C) maintains preservation independent of ambient room temperature (${temp}°C - ${tempBand}).`;
      tempColor = "#06b6d4";
    }
  } else if (normalizedStorage === 'Refrigerated Storage') {
    if (temp >= 50) {
      tempModifier = 0.82;
      tempMsg = `High ambient room heat (${temp}°C - ${tempBand}) places heavy load on refrigeration with minor opening thermal transfer.`;
      tempColor = "#f59e0b";
    } else if (temp >= 40) {
      tempModifier = 0.90;
      tempMsg = `Refrigeration (4°C) insulates product against hot bakery room air (${temp}°C - ${tempBand}).`;
      tempColor = "var(--text-secondary)";
    } else if (temp >= 30) {
      tempModifier = 0.95;
      tempMsg = `Refrigeration (4°C) insulates product against warm ambient air (${temp}°C - ${tempBand}).`;
      tempColor = "var(--text-secondary)";
    } else {
      tempModifier = 1.0;
      tempMsg = `Refrigeration (4°C) maintains steady cold preservation at ambient ${temp}°C (${tempBand}).`;
      tempColor = "#3b82f6";
    }
  } else {
    // Non-refrigerated / Ambient storage (10°C to 70°C)
    if (temp >= 50) {
      // 50°C - 70°C: Very Hot
      const penalty = 0.36 - ((temp - 50) / 20) * 0.21;
      tempModifier = Math.max(0.15, Number(penalty.toFixed(2)));
      tempMsg = `Extreme heat (${temp}°C - Very Hot) triggers rapid crumb dehydration, oil migration, and severe thermal breakdown.`;
      tempColor = "#dc2626";
    } else if (temp >= 40) {
      // 40°C - 49°C: Hot
      const penalty = 0.58 - ((temp - 40) / 10) * 0.18;
      tempModifier = Math.max(0.38, Number(penalty.toFixed(2)));
      tempMsg = `Hot environment (${temp}°C - Hot) drastically accelerates starch retrogradation and moisture loss.`;
      tempColor = "#ea580c";
    } else if (temp >= 32) {
      // 32°C - 39°C: Warm Ambient
      const penalty = 0.80 - ((temp - 32) / 8) * 0.18;
      tempModifier = Math.max(0.60, Number(penalty.toFixed(2)));
      tempMsg = `High ambient temperature (${temp}°C - Ambient) accelerates fungal spore germination and mold growth.`;
      tempColor = "#ef4444";
    } else if (temp >= 27) {
      // 27°C - 31°C: Warm bakery room
      const penalty = 0.95 - ((temp - 27) / 5) * 0.12;
      tempModifier = Math.max(0.80, Number(penalty.toFixed(2)));
      tempMsg = `Warm bakery temperature (${temp}°C - Ambient) moderately speeds up moisture loss and staling.`;
      tempColor = "#f59e0b";
    } else if (temp >= 24) {
      // 24°C - 26°C: Baseline ambient (25°C is baseline 1.0)
      tempModifier = 1.0;
      tempMsg = `Optimal room temperature (${temp}°C - Ambient) is within acceptable bakery standards.`;
      tempColor = "var(--text-secondary)";
    } else {
      // 10°C - 23°C: Cool
      const bonus = 1.00 + ((24 - temp) / 14) * 0.25;
      tempModifier = Math.min(1.25, Number(bonus.toFixed(2)));
      tempMsg = `Cool temperature (${temp}°C - Cool) slows microbial metabolism and retards fungal spore development.`;
      tempColor = "#3b82f6";
    }
  }

  // 4. Humidity Modifiers (20% to 100%)
  let humidModifier = 1.0;
  let humidMsg = `Relative humidity (${humid}%) is in the optimal range for bread preservation.`;
  let humidColor = "var(--text-secondary)";

  if (normalizedStorage === 'Frozen Storage') {
    humidModifier = 1.0;
    humidMsg = `Freezer humidity is controlled in deep freeze.`;
  } else if (normalizedStorage === 'Sealed Packaging') {
    if (humid > 75) {
      humidModifier = 0.90;
      humidMsg = `High ambient humidity (${humid}%); check sealed packaging for internal moisture condensation.`;
      humidColor = "#f59e0b";
    } else {
      humidModifier = 1.05;
      humidMsg = `Sealed packaging maintains equilibrium moisture content against room humidity (${humid}%).`;
    }
  } else {
    if (humid > 75) {
      humidModifier = Math.max(0.60, Number((0.75 - ((humid - 75) / 25) * 0.15).toFixed(2)));
      humidMsg = `High humidity (${humid}%) creates surface condensation, dramatically elevating mold risk.`;
      humidColor = "#ef4444";
    } else if (humid < 40) {
      humidModifier = Math.max(0.70, Number((0.85 - ((40 - humid) / 20) * 0.15).toFixed(2)));
      humidMsg = `Low humidity (${humid}%) draws moisture from crumb, causing rapid staling and crust hardening.`;
      humidColor = "#f59e0b";
    }
  }

  // 5. Total Effective Shelf Life
  const rawTotal = baseShelfLife * storageMultiplier * tempModifier * humidModifier;
  const totalShelfLife = Number(rawTotal.toFixed(1));

  // 6. Days Elapsed
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pDate = new Date(prodDate);
  pDate.setHours(0, 0, 0, 0);
  const diffTime = today - pDate;
  let daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (isNaN(daysSince) || daysSince < 0) daysSince = 0;

  // 7. Remaining Days & Dynamic Freshness Score (Never permanently fixed at 100%)
  const remainingDays = Math.max(0, Number((rawTotal - daysSince).toFixed(1)));
  let freshnessScore = 0;

  if (daysSince >= rawTotal || rawTotal <= 0 || remainingDays <= 0) {
    freshnessScore = 0;
  } else {
    const timeRemainingRatio = Math.max(0, (rawTotal - daysSince) / rawTotal);
    // Environmental stress penalty when conditions accelerate staling
    const envComposite = storageMultiplier * tempModifier * humidModifier;
    const envStress = Math.min(1.0, Math.sqrt(Math.max(0.04, envComposite)));
    freshnessScore = Math.max(0, Math.min(100, Math.round(timeRemainingRatio * envStress * 100)));
  }

  // 8. Risk Assessment
  let risk = "Low Risk";
  let riskColor = "#22c55e"; // green
  let riskIcon = "check-square";
  let riskSubtext = "Safe for Retail Sale";

  if (freshnessScore <= 24 || remainingDays <= 0.5) {
    risk = "High Risk";
    riskColor = "#ef4444"; // red
    riskIcon = "alert-triangle";
    riskSubtext = "Spoiled — Mark for Disposal";
  } else if (freshnessScore <= 74 || remainingDays <= 1.5) {
    risk = "Moderate Risk";
    riskColor = "#eab308"; // yellow
    riskIcon = "alert-circle";
    riskSubtext = "Approaching Limit — Repurpose";
  }

  // 9. Freshness Status & Expiry Formatting (Categories: 75-100% Fresh, 25-74% Moderate, 0-24% Spoiled / Critical)
  let freshnessStatus = "Fresh";
  let freshnessStatusColor = "#16a34a"; // Green
  if (freshnessScore <= 24) {
    freshnessStatus = "Spoiled / Critical";
    freshnessStatusColor = "#ef4444"; // Red
  } else if (freshnessScore <= 74) {
    freshnessStatus = "Moderate";
    freshnessStatusColor = "#f59e0b"; // Orange/Amber
  }

  const expiryDate = new Date(pDate.getTime() + totalShelfLife * 24 * 60 * 60 * 1000);
  const expiryDateStr = expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let remainingDisplay = `${remainingDays.toFixed(1)} Days`;
  if (remainingDays <= 0) {
    remainingDisplay = "0 Days (Expired)";
  } else if (remainingDays < 1.0) {
    remainingDisplay = `${Math.max(1, Math.round(remainingDays * 24))} Hours`;
  }

  const productLifespanMsg = targetProduct 
    ? `${targetProduct.name} baseline (${baseShelfLife} days, ${targetProduct.category || 'Bakery'}).`
    : `Standard bakery bread baseline (${baseShelfLife} days).`;

  return {
    breadType,
    breadName,
    storageCondition: normalizedStorage,
    storageMultiplier,
    temp,
    tempBand,
    humid,
    prodDate,
    daysSince,
    baseShelfLife,
    totalShelfLife,
    remainingDays,
    remainingDisplay,
    expiryDateStr,
    freshnessScore,
    freshnessStatus,
    freshnessStatusColor,
    risk,
    riskColor,
    riskIcon,
    riskSubtext,
    productLifespanMsg,
    tempMsg,
    tempColor,
    humidMsg,
    humidColor,
    storageMsg,
    storageColor
  };
}
window.calculateShelfLifePrediction = calculateShelfLifePrediction;

function renderShelfRepurposingOptions(res) {
  const container = document.getElementById("shelf-repurpose-container");
  if (!container) return;

  const score = res ? res.freshnessScore : 100;
  const breadName = res ? res.breadName : "Pandesal";
  const bLower = (breadName || "").toLowerCase();

  // Safety Rule: Never recommend repurposing spoiled or moldy items!
  if (score < 25) {
    setSafeHtml(container, `
      <div style="grid-column: 1 / -1; background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
        <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); display: flex; align-items: center; justify-content: center; color: #ef4444; flex-shrink: 0;">
          <i data-lucide="alert-octagon" style="width: 24px; height: 24px;"></i>
        </div>
        <div style="flex: 1; min-width: 240px;">
          <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 700; color: #ef4444;">Unsafe for Repurposing — Mark for Disposal</h4>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
            <strong>${breadName}</strong> has reached the end of its safe shelf life (Freshness: ${score}%). Mold growth, crumb degradation, or microbial breakdown makes it unsafe for consumption or repurposing. <strong>Do not repurpose.</strong> Mark as spoiled waste in the Waste Tracker for safe disposal.
          </p>
        </div>
        <button class="btn-secondary" onclick="navigateToPane('pane-waste')" style="white-space: nowrap; font-size: 0.85rem; padding: 8px 14px; border-color: #ef4444; color: #ef4444; display: flex; align-items: center; gap: 6px; cursor: pointer;">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Log Waste
        </button>
      </div>
    `);
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons({ root: container });
    return;
  }

  // Peak Freshness: Repurposing not needed yet
  if (score >= 75) {
    setSafeHtml(container, `
      <div style="grid-column: 1 / -1; background: rgba(34, 197, 94, 0.06); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px;">
        <div style="width: 44px; height: 44px; border-radius: 50%; background: rgba(34, 197, 94, 0.15); display: flex; align-items: center; justify-content: center; color: #16a34a; flex-shrink: 0;">
          <i data-lucide="check-circle-2" style="width: 24px; height: 24px;"></i>
        </div>
        <div>
          <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 700; color: #16a34a;">Peak Freshness — Repurposing Not Required</h4>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
            <strong>${breadName}</strong> is currently at peak freshness (${score}%). Continue regular front-counter retail sales. Recommended repurposing options will activate automatically if unsold stock enters the 25%–74% moderate freshness window.
          </p>
        </div>
      </div>
    `);
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons({ root: container });
    return;
  }

  // Moderate Freshness (25% - 74%): Near-expiry, safe and wholesome to repurpose!
  const recipes = [];
  if (bLower.includes("pandesal") || bLower.includes("monay") || bLower.includes("roll")) {
    recipes.push(
      {
        recipe: "Garlic Butter Croutons",
        product: breadName,
        desc: "Cubed and tossed in melted garlic butter and dried herbs, oven-baked until crunchy. Perfect for soups and salads.",
        safety: "Freshness 25%–74% • Clean wholesome aroma, dry crumb structure"
      },
      {
        recipe: "Fine Toasted Breadcrumbs",
        product: breadName,
        desc: "Slow-baked until golden dry and pulsed fine for savory breading coatings and bakery pastry fillings.",
        safety: "Freshness 25%–74% • Completely moisture-free crumb"
      },
      {
        recipe: "Toasted Bread Snacks",
        product: breadName,
        desc: "Sliced thin, brushed with margarine and sprinkled with sugar, toasted crisp for retail snack packs.",
        safety: "Freshness 25%–74% • Clean crumb texture"
      }
    );
  } else if (bLower.includes("ensaymada") || bLower.includes("pastr") || bLower.includes("croissant")) {
    recipes.push(
      {
        recipe: "Baked Ensaymada Pudding",
        product: breadName,
        desc: "Cubed and baked in a rich vanilla-custard bath with raisins and melted butter. Serves as a premium dessert special.",
        safety: "Freshness 25%–74% • Kept chilled, wholesome dairy topping"
      },
      {
        recipe: "Brioche-Style French Toast",
        product: breadName,
        desc: "Dipped in egg-milk batter and griddled golden for bakery café breakfast pairings.",
        safety: "Freshness 25%–74% • Intact crumb structure"
      }
    );
  } else if (bLower.includes("sliced") || bLower.includes("loaf")) {
    recipes.push(
      {
        recipe: "Cinnamon Bread Pudding",
        product: breadName,
        desc: "Tender baked custard pudding infused with cinnamon, raisins, and caramel syrup.",
        safety: "Freshness 25%–74% • Wholesome aroma, no discoloration"
      },
      {
        recipe: "French Toast Sliders",
        product: breadName,
        desc: "Thick bread slices soaked in sweet egg custard, pan-fried and dusted with powdered sugar.",
        safety: "Freshness 25%–74% • Sealed packaging prior, intact crust"
      },
      {
        recipe: "Herb Salad Croutons",
        product: breadName,
        desc: "Diced into cubes, seasoned with olive oil and Italian seasoning, baked into crunchy salad croutons.",
        safety: "Freshness 25%–74% • Safe dry crumb"
      }
    );
  } else if (bLower.includes("cake")) {
    recipes.push(
      {
        recipe: "Chocolate Truffle Cake Pops",
        product: breadName,
        desc: "Crumbled cake crumb bound with rich dark chocolate ganache, formed into pops and dipped in hard shell chocolate.",
        safety: "Freshness 25%–74% • Kept chilled, wholesome frosting"
      },
      {
        recipe: "Bakery Trifle Cups",
        product: breadName,
        desc: "Layered sponge cake with vanilla pastry cream and fruit preserves in individual dessert cups.",
        safety: "Freshness 25%–74% • Sweet aroma, clean sponge"
      }
    );
  } else {
    recipes.push(
      {
        recipe: "Classic Bread Pudding",
        product: breadName,
        desc: "Baked with sweet custard, vanilla, raisins, and nutmeg for a warm bakery favorite.",
        safety: "Freshness 25%–74% • Wholesome unsold bread, no spoilage"
      },
      {
        recipe: "Toasted Breadcrumbs",
        product: breadName,
        desc: "Oven-dried and pulverized into fine breading for meat cutlets and croquettes.",
        safety: "Freshness 25%–74% • Zero moisture in crumb"
      },
      {
        recipe: "Toasted Bread Snacks",
        product: breadName,
        desc: "Sliced and baked crisp with butter and sugar for crunchy bakery biscotti-style snacks.",
        safety: "Freshness 25%–74% • Wholesome aroma"
      }
    );
  }

  setSafeHtml(container, recipes.map(r => `
    <div class="shelf-repurpose-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
        <h4 class="recipe-title">${r.recipe}</h4>
        <span class="product-tag">${r.product}</span>
      </div>
      <p class="recipe-desc">${r.desc}</p>
      <div class="safety-req">
        <i data-lucide="shield-check" style="width: 14px; height: 14px; flex-shrink: 0;"></i>
        <span>${r.safety}</span>
      </div>
      <button class="btn-primary" onclick="if(typeof showToast === 'function') showToast('Repurposing workflow initiated for ${r.recipe}.', 'success');" style="margin-top: 4px; padding: 7px 12px; font-size: 0.8rem; background: var(--primary-color); border: none; border-radius: 6px; color: white; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;">
        <i data-lucide="check" style="width: 14px; height: 14px;"></i> Use Recipe
      </button>
    </div>
  `).join(''));

  if (window.lucide && window.lucide.createIcons) window.lucide.createIcons({ root: container });
}
window.renderShelfRepurposingOptions = renderShelfRepurposingOptions;

function updateShelfTempUI(tempValue) {
  const t = parseInt(tempValue, 10);
  const tempValEl = document.getElementById("shelf-temp-val");
  const tempBandEl = document.getElementById("shelf-temp-band");
  const tempBadgeEl = document.getElementById("shelf-temp-badge");
  
  if (tempValEl) tempValEl.textContent = isNaN(t) ? 27 : t;
  
  const bandInfo = (typeof getTemperatureBand === 'function') 
    ? getTemperatureBand(t) 
    : (t < 25 ? { band: "Cool", color: "#2563eb", bg: "rgba(59, 130, 246, 0.12)" } 
      : t < 40 ? { band: "Ambient", color: "#16a34a", bg: "rgba(34, 197, 94, 0.12)" } 
      : t < 50 ? { band: "Hot", color: "#ea580c", bg: "rgba(234, 88, 12, 0.12)" } 
      : { band: "Very Hot", color: "#dc2626", bg: "rgba(239, 68, 68, 0.15)" });

  if (tempBandEl) tempBandEl.textContent = bandInfo.band;
  if (tempBadgeEl) {
    tempBadgeEl.style.color = bandInfo.color;
    tempBadgeEl.style.background = bandInfo.bg;
  }
}
window.updateShelfTempUI = updateShelfTempUI;

function applyShelfLifePredictionResult(res) {
  if (!res) return;

  const breadNameEl = document.getElementById("res-bread-name");
  if (breadNameEl) breadNameEl.textContent = res.breadName;

  const freshnessEl = document.getElementById("res-freshness");
  if (freshnessEl) {
    freshnessEl.textContent = `${res.freshnessScore}%`;
    freshnessEl.style.color = res.freshnessStatusColor || res.riskColor;
  }

  const circularCircle = document.getElementById("res-circular-progress");
  if (circularCircle) {
    circularCircle.setAttribute("stroke-dasharray", `${res.freshnessScore}, 100`);
    circularCircle.style.stroke = res.freshnessStatusColor || res.riskColor;
  }

  const freshnessBadge = document.getElementById("res-freshness-status-badge");
  if (freshnessBadge) {
    const status = res.freshnessStatus || (res.freshnessScore >= 75 ? "Fresh" : res.freshnessScore >= 25 ? "Moderate" : "Spoiled / Critical");
    freshnessBadge.textContent = status;
    if (status === "Fresh") {
      freshnessBadge.style.background = "rgba(34, 197, 94, 0.12)";
      freshnessBadge.style.color = "#16a34a";
    } else if (status === "Moderate") {
      freshnessBadge.style.background = "rgba(245, 158, 11, 0.12)";
      freshnessBadge.style.color = "#d97706";
    } else {
      freshnessBadge.style.background = "rgba(239, 68, 68, 0.12)";
      freshnessBadge.style.color = "#ef4444";
    }
  }

  const daysEl = document.getElementById("res-days");
  if (daysEl) {
    daysEl.textContent = res.remainingDisplay || `${Number(res.remainingDays).toFixed(1)} Days`;
    daysEl.style.color = res.riskColor === "#ef4444" ? "#ef4444" : "#3b82f6";
  }

  const expiryEl = document.getElementById("res-expiry-date");
  if (expiryEl && res.expiryDateStr) {
    expiryEl.textContent = `Estimated Expiry: ${res.expiryDateStr}`;
  }

  const riskEl = document.getElementById("res-risk");
  if (riskEl) {
    riskEl.textContent = res.risk;
    riskEl.style.color = res.riskColor;
  }

  const riskIconEl = document.getElementById("res-risk-icon");
  if (riskIconEl) {
    riskIconEl.setAttribute("data-lucide", res.riskIcon);
    riskIconEl.style.color = res.riskColor;
  }

  const riskContainer = document.getElementById("res-risk-icon-container");
  if (riskContainer) {
    riskContainer.style.color = res.riskColor;
    if (res.risk === "High Risk") {
      riskContainer.style.background = "rgba(239, 68, 68, 0.12)";
    } else if (res.risk === "Moderate Risk") {
      riskContainer.style.background = "rgba(245, 158, 11, 0.12)";
    } else {
      riskContainer.style.background = "rgba(34, 197, 94, 0.12)";
    }
  }

  const riskSubtextEl = document.getElementById("res-risk-subtext");
  if (riskSubtextEl && res.riskSubtext) {
    riskSubtextEl.textContent = res.riskSubtext;
  }

  const barTextEl = document.getElementById("res-freshness-bar-text");
  if (barTextEl) {
    barTextEl.textContent = `${res.freshnessScore}%`;
    barTextEl.style.color = res.freshnessStatusColor || res.riskColor;
  }

  const barEl = document.getElementById("res-freshness-bar");
  if (barEl) {
    barEl.style.width = `${res.freshnessScore}%`;
    barEl.style.backgroundColor = res.freshnessStatusColor || res.riskColor;
  }

  const tempValEl = document.getElementById("res-val-temp");
  if (tempValEl) tempValEl.textContent = `${res.temp}°C • ${res.tempBand || 'Ambient'}`;

  const tempMsgEl = document.getElementById("res-msg-temp");
  if (tempMsgEl) {
    tempMsgEl.textContent = res.tempMsg;
    tempMsgEl.style.color = res.tempColor;
  }

  const humidValEl = document.getElementById("res-val-humid");
  if (humidValEl) humidValEl.textContent = `${res.humid}%`;

  const humidMsgEl = document.getElementById("res-msg-humid");
  if (humidMsgEl) {
    humidMsgEl.textContent = res.humidMsg;
    humidMsgEl.style.color = res.humidColor;
  }

  const storageValEl = document.getElementById("res-val-storage");
  if (storageValEl) storageValEl.textContent = res.storageCondition;

  const storageMsgEl = document.getElementById("res-msg-storage");
  if (storageMsgEl) {
    storageMsgEl.textContent = res.storageMsg;
    storageMsgEl.style.color = res.storageColor;
  }

  const productValEl = document.getElementById("res-val-product");
  if (productValEl) productValEl.textContent = `${res.baseShelfLife} Days Base`;

  const productMsgEl = document.getElementById("res-msg-product");
  if (productMsgEl && res.productLifespanMsg) {
    productMsgEl.textContent = res.productLifespanMsg;
  }

  if (typeof renderShelfRepurposingOptions === 'function') {
    renderShelfRepurposingOptions(res);
  }

  if (window.lucide && window.lucide.createIcons) {
    window.lucide.createIcons();
  }
}
window.applyShelfLifePredictionResult = applyShelfLifePredictionResult;

function setupShelfLifeModule() {
  populateShelfBreadTypeDropdown();

  const tempSlider = document.getElementById("shelf-temp");
  const humidSlider = document.getElementById("shelf-humidity");
  const tempVal = document.getElementById("shelf-temp-val");
  const humidVal = document.getElementById("shelf-humidity-val");
  const dateInput = document.getElementById("shelf-date");
  const storageInput = document.getElementById("shelf-storage");
  const breadSelect = document.getElementById("shelf-bread-type");
  
  // Set default date to today
  if (dateInput && !dateInput.value) {
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];
  }

  // Live Prediction Engine with Full Validation & Persistence
  function triggerShelfLifeCalculation(opts = {}) {
    const selectEl = document.getElementById("shelf-bread-type");
    if (!selectEl || selectEl.options.length === 0) {
      populateShelfBreadTypeDropdown();
    }
    const breadTypeVal = selectEl ? selectEl.value : "";
    const selectedOption = selectEl && selectEl.selectedIndex >= 0 ? selectEl.options[selectEl.selectedIndex] : null;
    const breadName = selectedOption ? (selectedOption.text || selectedOption.name || selectedOption.value) : (breadTypeVal || "Pandesal");

    const storEl = document.getElementById("shelf-storage");
    const rawStorage = storEl ? storEl.value : "Covered Room-Temperature Storage";
    const storage = normalizeStorageCondition(rawStorage);

    const tSlider = document.getElementById("shelf-temp");
    const hSlider = document.getElementById("shelf-humidity");
    const dInput = document.getElementById("shelf-date");

    const rawT = parseInt(tSlider ? tSlider.value : 27, 10);
    const temp = Math.max(10, Math.min(70, isNaN(rawT) ? 27 : rawT));
    const rawH = parseInt(hSlider ? hSlider.value : 60, 10);
    const humid = Math.max(20, Math.min(100, isNaN(rawH) ? 60 : rawH));
    const prodDateStr = dInput ? dInput.value : "";

    if (!prodDateStr) {
      if (opts.showToastOnError) {
        if (typeof showToast === 'function') {
          showToast("Please select a valid Production Date.", "error");
        } else {
          alert("Please select a valid production date.");
        }
      }
      return null;
    }

    const res = calculateShelfLifePrediction({
      breadType: breadTypeVal,
      breadName: breadName,
      storage: storage,
      temp: temp,
      humid: humid,
      prodDate: prodDateStr
    });

    applyShelfLifePredictionResult(res);

    if (opts.persist) {
      try {
        localStorage.setItem("bakewise_v2_last_shelf_prediction", JSON.stringify(res));
        const historyStr = localStorage.getItem("bakewise_v2_shelf_prediction_history");
        const history = historyStr ? JSON.parse(historyStr) : [];
        history.unshift({ ...res, predictedAt: new Date().toISOString() });
        if (history.length > 50) history.pop();
        localStorage.setItem("bakewise_v2_shelf_prediction_history", JSON.stringify(history));
      } catch (err) {
        console.warn("Could not save shelf prediction history:", err);
      }
    }

    if (opts.showToastOnSuccess && typeof showToast === 'function') {
      showToast("Shelf life prediction calculated successfully.", "success");
    }

    return res;
  }
  window.triggerShelfLifeCalculation = triggerShelfLifeCalculation;

  // Initialize temperature UI badge display
  if (tempSlider) {
    updateShelfTempUI(tempSlider.value);
  }

  // Dynamic real-time input listeners
  if (tempSlider && !tempSlider.dataset.listening) {
    tempSlider.dataset.listening = "true";
    tempSlider.addEventListener("input", (e) => {
      updateShelfTempUI(e.target.value);
      triggerShelfLifeCalculation({ persist: false });
    });
  }

  if (humidSlider && !humidSlider.dataset.listening) {
    humidSlider.dataset.listening = "true";
    if (humidVal) humidVal.textContent = humidSlider.value;
    humidSlider.addEventListener("input", (e) => {
      if (humidVal) humidVal.textContent = e.target.value;
      triggerShelfLifeCalculation({ persist: false });
    });
  }

  if (storageInput && !storageInput.dataset.listening) {
    storageInput.dataset.listening = "true";
    storageInput.addEventListener("change", () => {
      triggerShelfLifeCalculation({ persist: false });
    });
  }

  if (breadSelect && !breadSelect.dataset.listening) {
    breadSelect.dataset.listening = "true";
    breadSelect.addEventListener("change", () => {
      triggerShelfLifeCalculation({ persist: false });
    });
  }

  if (dateInput && !dateInput.dataset.listening) {
    dateInput.dataset.listening = "true";
    dateInput.addEventListener("change", () => {
      triggerShelfLifeCalculation({ persist: false });
    });
    dateInput.addEventListener("input", () => {
      triggerShelfLifeCalculation({ persist: false });
    });
  }

  // Manual Trigger: "Calculate Shelf Life" button
  const btnPredict = document.getElementById("btn-predict-shelf");
  if (btnPredict && !btnPredict.dataset.listening) {
    btnPredict.dataset.listening = "true";
    btnPredict.addEventListener("click", () => {
      triggerShelfLifeCalculation({ persist: true, showToastOnSuccess: true, showToastOnError: true });
    });
  }

  // Initial calculation if no saved prediction
  try {
    const saved = localStorage.getItem("bakewise_v2_last_shelf_prediction");
    if (!saved) {
      triggerShelfLifeCalculation({ persist: false });
    }
  } catch (_) {}
}

window.updateNotificationBadge = function() {
  const badge = document.getElementById("alert-notification-badge");
  if (!badge) return;
  const user = store.currentUser;
  
  if (!user) {
    badge.style.display = "none";
    return;
  }

  const relevantNotifs = store.notifications.filter(n => {
    if (n.type === 'announcement') {
      return n.targetBranch === 'all' || parseInt(n.targetBranch) === parseInt(user.branch_id) || user.role === 'admin';
    }
    if (user.role === 'admin') return true;
    return false;
  });

  const unreadCount = relevantNotifs.filter(n => !(n.readBy && n.readBy.includes(user.email))).length;
  
  if (unreadCount > 0) {
    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

function setupNotifications() {
  const bellBtn = document.getElementById("btn-notifications");
  const dropdown = document.getElementById("notifications-dropdown");
  const listContainer = document.getElementById("notifications-list");
  const clearBtn = document.getElementById("btn-clear-notifications");
  const announceBtn = document.getElementById("btn-new-announcement");

  if (!bellBtn || !dropdown) return;

  // Toggle dropdown
  bellBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = dropdown.style.display === "flex";
    dropdown.style.display = isVisible ? "none" : "flex";
    if (!isVisible) {
      renderNotificationsList();
    }
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });

  // Clear all
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      store.notifications = [];
      store.save("bakewise_v2_notifications", store.notifications);
      renderNotificationsList();
      window.updateNotificationBadge();
    });
  }

  const announcementModal = document.getElementById("announcement-modal");
  const announcementOverlay = document.getElementById("announcement-modal-overlay");
  const announcementForm = document.getElementById("announcement-form");
  const announcementTarget = document.getElementById("announcement-target");
  const btnAnnouncementCancel = document.getElementById("btn-announcement-cancel");

  function closeAnnouncementModal() {
    if(announcementModal) announcementModal.style.display = "none";
    if(announcementOverlay) announcementOverlay.style.display = "none";
    if(announcementForm) announcementForm.reset();
  }

  if (announceBtn) {
    announceBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.style.display = "none";
      
      if (announcementTarget) {
        setSafeHtml(announcementTarget, '<option value="all">All Branches (Entire Business)</option>');
        store.branches.forEach(b => {
          setSafeHtml(announcementTarget, `<option value="${b.id}">${b.name}</option>`);
        });
      }

      if(announcementModal) announcementModal.style.display = "block";
      if(announcementOverlay) announcementOverlay.style.display = "block";
    });
  }

  if (btnAnnouncementCancel) {
    btnAnnouncementCancel.addEventListener("click", closeAnnouncementModal);
  }

  if (announcementForm) {
    announcementForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = document.getElementById("announcement-message").value.trim();
      const target = document.getElementById("announcement-target").value;
      if (msg !== "") {
        store.logActivity(msg, 'announcement', target);
        closeAnnouncementModal();
        renderNotificationsList();
      }
    });
  }

  function renderNotificationsList() {
    if (!listContainer) return;
    listContainer.replaceChildren();
    
    const user = store.currentUser;
    if (!user) return;

    if (announceBtn) {
      announceBtn.style.display = (user.role === 'admin') ? "block" : "none";
    }

    const relevantNotifs = store.notifications.filter(n => {
      if (n.type === 'announcement') {
        return n.targetBranch === 'all' || parseInt(n.targetBranch) === parseInt(user.branch_id) || user.role === 'admin';
      }
      if (user.role === 'admin') return true;
      return false;
    });
    
    if (relevantNotifs.length === 0) {
      setSafeHtml(listContainer, `<div style="padding: 20px; text-align: center; color: var(--text-muted);">No new notifications.</div>`);
      return;
    }

    relevantNotifs.forEach(notif => {
      const item = document.createElement("div");
      const isRead = notif.readBy && notif.readBy.includes(user.email);
      item.className = `notification-item ${isRead ? '' : 'unread'}`;
      
      const timeStr = formatRelativeTime(notif.timestamp);
      const typeBadge = notif.type === 'announcement' ? '<span style="background:var(--accent-color);color:white;padding:2px 4px;border-radius:4px;font-size:0.6rem;margin-right:5px;">ANNOUNCEMENT</span> ' : '';
      
      setSafeHtml(item, `
        <span class="notification-message">${typeBadge}${notif.message}</span>
        <span class="notification-time">${timeStr}</span>
      `);

      item.addEventListener("click", () => {
        if (!notif.readBy) notif.readBy = [];
        if (!notif.readBy.includes(user.email)) {
          notif.readBy.push(user.email);
          store.save("bakewise_v2_notifications", store.notifications);
          item.classList.remove("unread");
          window.updateNotificationBadge();
        }
      });

      listContainer.appendChild(item);
    });
  }

  // Helper for relative time
  function formatRelativeTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  }

  // Initial badge update
  window.updateNotificationBadge();
}

// ==========================================================================
// SHELF LIFE PREDICTOR UI & LOGIC
// ==========================================================================
function setupShelfLifePredictor() {
  // Delegate to setupShelfLifeModule to unify prediction engine and prevent duplicate event listeners
  setupShelfLifeModule();
}

// Call on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupShelfLifePredictor);
} else {
  setupShelfLifePredictor();
}

function setupFilters() {
  ['sales-search-input', 'sales-date-filter', 'sales-branch-filter'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', () => { salesHistCurrentPage = 1; refreshSalesPane(); });
  });
  ['inventory-search-input', 'inventory-date-filter', 'inventory-branch-filter'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', () => { invHistCurrentPage = 1; refreshInventoryPane(); });
  });
  ['prod-search-input', 'prod-batch-filter', 'prod-status-filter', 'prod-branch-filter'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', () => { prodHistCurrentPage = 1; refreshProductionPane(); });
  });
  ['waste-search-input', 'waste-date-filter', 'waste-branch-filter'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', () => { wasteHistCurrentPage = 1; refreshWastePane(); });
  });
  ['branch-search-input'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', () => { branchCurrentPage = 1; refreshAdminBranchesPane(); });
  });
  ['user-search-input', 'user-role-filter'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', () => { usersCurrentPage = 1; refreshAdminUsersPane(); });
  });
}
document.addEventListener('DOMContentLoaded', () => {
  setupPOSModule();
  setTimeout(setupFilters, 500);
});

window.addEventListener('afterprint', () => {
  document.body.classList.remove('printing-pos-receipt');
});

function exportCustomReportToCsv() {
  const activeBranchName = store.getCurrentBranchName ? store.getCurrentBranchName() : 'Network Wide';
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  let csvContent = "";
  csvContent += "ROSE BAKESHOP x BAKEWISE ENTERPRISE MANAGEMENT REPORT\r\n";
  csvContent += `Generated Date: ${now.toLocaleString()}\r\n`;
  csvContent += `Branch Scope: ${activeBranchName}\r\n\r\n`;

  // 1. Sales Performance Report
  csvContent += "=== SALES PERFORMANCE REPORT SUMMARY ===\r\n";
  csvContent += "Product,Category,Total Units Sold,Average Price (PHP),Gross Income Generated (PHP)\r\n";
  const salesTable = document.getElementById("report-sales-table");
  if (salesTable) {
    const rows = salesTable.querySelectorAll("tbody tr");
    rows.forEach(r => {
      const cols = Array.from(r.querySelectorAll("td")).map(c => '"' + (c.innerText || '').replace(/"/g, '""').trim() + '"');
      if (cols.length > 0) csvContent += cols.join(",") + "\r\n";
    });
  }
  csvContent += "\r\n";

  // 2. Waste & Loss Analytics
  csvContent += "=== WASTE & LOSS ANALYTICS SUMMARY ===\r\n";
  csvContent += "Product,Total Discarded,Primary Discard Reason,Total Cost Lost (PHP)\r\n";
  const wasteTable = document.getElementById("report-waste-table");
  if (wasteTable) {
    const rows = wasteTable.querySelectorAll("tbody tr");
    rows.forEach(r => {
      const cols = Array.from(r.querySelectorAll("td")).map(c => '"' + (c.innerText || '').replace(/"/g, '""').trim() + '"');
      if (cols.length > 0) csvContent += cols.join(",") + "\r\n";
    });
  }
  csvContent += "\r\n";

  // 3. Baking Efficiency Report
  csvContent += "=== BAKING EFFICIENCY REPORT ===\r\n";
  csvContent += "Product Name,Planned Bake Run,Actual Bake Output,Deviation Rate,Bake Efficiency\r\n";
  const effTable = document.getElementById("report-efficiency-table");
  if (effTable) {
    const rows = effTable.querySelectorAll("tbody tr");
    rows.forEach(r => {
      const cols = Array.from(r.querySelectorAll("td")).map(c => '"' + (c.innerText || '').replace(/"/g, '""').trim() + '"');
      if (cols.length > 0) csvContent += cols.join(",") + "\r\n";
    });
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("href", url);
  a.setAttribute("download", `RoseBakeshop_Report_${dateStr}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Report exported successfully as CSV.", "success");
}
window.exportCustomReportToCsv = exportCustomReportToCsv;
