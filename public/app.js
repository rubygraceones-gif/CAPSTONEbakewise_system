/* ==========================================================================
   BAKEWISE APPLICATION LOGIC
   Advanced Bakery Management System Client Code
   ========================================================================== */

// --- JWT FETCH INTERCEPTOR ---
const originalFetch = window.fetch;
window.fetch = async function () {
  let [resource, config] = arguments;
  if (typeof resource === 'string' && resource.startsWith('/api')) {
    const sessionStr = sessionStorage.getItem('bakewise_v2_session') || localStorage.getItem('bakewise_v2_session');
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
  if (response.status === 401 && typeof resource === 'string' && resource.startsWith('/api') && resource !== '/api/auth/login') {
    const hasToken = config && config.headers && config.headers['Authorization'];
    if (hasToken && (!window.store || window.store.isBackendOnline)) {
      sessionStorage.removeItem('bakewise_v2_session');
      localStorage.removeItem('bakewise_v2_session');
      document.documentElement.classList.remove('user-logged-in');
      if (document.getElementById('app-view') && document.getElementById('app-view').style.display !== 'none') {
        window.location.reload();
      }
    }
  }
  return response;
};

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
  if (typeof dateStr !== 'string') return new Date(dateStr);

  if (dateStr.includes('T') || dateStr.includes(' ')) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const dayPart = parseInt(parts[2]);
    if (!isNaN(dayPart)) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, dayPart, 5, 0, 0);
    }
  }

  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatDateTimeDisplay(val) {
  if (!val) return 'N/A';
  const d = (val instanceof Date) ? val : parseDateTime(val);
  if (isNaN(d.getTime())) return String(val);

  const dateFormatted = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  const timeFormatted = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${dateFormatted}, ${timeFormatted}`;
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
class BakeWiseStore {
  constructor() {
    // One-time data wipe as requested by user
    if (!localStorage.getItem('bakewise_v2_data_cleared_1')) {
      localStorage.removeItem("bakewise_v2_sales");
      localStorage.removeItem("bakewise_v2_inventory");
      localStorage.removeItem("bakewise_v2_production");
      localStorage.removeItem("bakewise_v2_waste");
      localStorage.setItem('bakewise_v2_data_cleared_1', 'true');
    }
    this.products = this.load("bakewise_v2_products", DEFAULT_PRODUCTS);
    this._sales = this.load("bakewise_v2_sales", DEFAULT_SALES);
    this._inventory = this.load("bakewise_v2_inventory", DEFAULT_INVENTORY);
    this._production = this.load("bakewise_v2_production", DEFAULT_PRODUCTION);
    this._waste = this.load("bakewise_v2_waste", DEFAULT_WASTE);

    this.branches = this.load("bakewise_v2_branches", [
      { id: 1, name: "Main Branch (Central)", latitude: 620, longitude: 100, address: "Central Boulevard, Main City", status: "Active" },
      { id: 2, name: "North District Branch", latitude: 480, longitude: 170, address: "North Commercial Ave, Main City", status: "Active" },
      { id: 3, name: "Eastside Hub Branch", latitude: 380, longitude: 230, address: "Eastside Market Crossing, Main City", status: "Active" },
      { id: 4, name: "South Regional Branch", latitude: 240, longitude: 310, address: "South Highway, Main City", status: "Active" }
    ]);

    this.users = this.load("bakewise_v2_users", [
      { id: 1, email: "manager@bakewise.com", password: "password123", name: "Branch Manager", role: "manager", branch_id: 1 },
      { id: 2, email: "sales@bakewise.com", password: "password123", name: "Sales Staff", role: "sales", branch_id: 1 },
      { id: 3, email: "inventory@bakewise.com", password: "password123", name: "Inventory Specialist", role: "inventory", branch_id: 1 },
      { id: 4, email: "production@bakewise.com", password: "password123", name: "Baking Specialist", role: "production", branch_id: 1 },
      { id: 5, email: "admin@bakewise.com", password: "password123", name: "System Administrator", role: "admin", branch_id: null }
    ]);

    this.isBackendOnline = false;
    // Persist session across refresh within the same tab or reloads
    const sessionStr = sessionStorage.getItem("bakewise_v2_session") || localStorage.getItem("bakewise_v2_session");
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
            
            sessionStorage.setItem("bakewise_v2_session", JSON.stringify(this.currentUser));
            localStorage.setItem("bakewise_v2_session", JSON.stringify(this.currentUser));
          }
        }
      } catch(e) {
        this.currentUser = null;
      }
    } else {
      this.currentUser = null;
    }
    this.notifications = this.load("bakewise_v2_notifications", []);
  }

  // Branch Filtering Getters
  get sales() {
    const branchId = this.getSelectedBranchId();
    if (branchId === 'all') return this._sales;
    return this._sales.filter(s => s.branchId === parseInt(branchId));
  }
  set sales(val) { this._sales = val; }

  get inventory() {
    const branchId = this.getSelectedBranchId();
    if (branchId === 'all') return this._inventory;
    return this._inventory.filter(i => i.branchId === parseInt(branchId));
  }
  set inventory(val) { this._inventory = val; }

  get production() {
    const branchId = this.getSelectedBranchId();
    if (branchId === 'all') return this._production;
    return this._production.filter(pr => pr.branchId === parseInt(branchId));
  }
  set production(val) { this._production = val; }

  get waste() {
    const branchId = this.getSelectedBranchId();
    if (branchId === 'all') return this._waste;
    return this._waste.filter(w => w.branchId === parseInt(branchId));
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
    if (typeof refreshDashboard === 'function') refreshDashboard();
  }

  async syncWithBackend() {
    this.isBackendOnline = false;
    try {
      const statusRes = await fetch('/api/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.dbConnection === 'healthy') {
          this.isBackendOnline = true;
        }
      }
    } catch (e) {
      console.log("MySQL backend is OFFLINE. Using LocalStorage fallback.");
    }

    if (this.isBackendOnline) {
      try {
        // Fetch products
        const prodRes = await fetch('/api/products');
        if (prodRes.ok) {
          const rawProds = await prodRes.json();
          this.products = rawProds.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: parseFloat(p.price),
            cost: parseFloat(p.cost),
            shelfLifeDays: p.shelf_life_days,
            repurposeRecipe: p.repurpose_recipe
          }));
          this.save("bakewise_v2_products", this.products);
        }

        // Fetch branches
        const brRes = await fetch('/api/branches');
        if (brRes.ok) {
          this.branches = await brRes.json();
          this.save("bakewise_v2_branches", this.branches);
        }

        // Fetch users
        const usrRes = await fetch('/api/users');
        if (usrRes.ok) {
          this.users = await usrRes.json();
          this.save("bakewise_v2_users", this.users);
        }

        const activeBranch = this.getSelectedBranchId();
        let queryStr = activeBranch !== 'all' ? `?branch_id=${activeBranch}` : '';

        // Fetch sales
        const sRes = await fetch(`/api/sales${queryStr}`);
        if (sRes.ok) {
          const fetchedSales = await sRes.json();
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

        // Fetch inventory (always fetch complete multi-branch inventory for accurate POS sync)
        const iRes = await fetch('/api/inventory');
        if (iRes.ok) {
          const fetchedInv = await iRes.json();
          this._inventory = fetchedInv.map(inv => ({
            id: inv.id.toString(),
            productId: inv.product_id,
            stockLevel: parseInt(inv.stock_level),
            productionDate: inv.production_date ? inv.production_date : (getRelativeDateString(0) + 'T05:00:00'),
            expiryDate: inv.expiry_date ? inv.expiry_date : (getRelativeDateString(1) + 'T05:00:00'),
            branchId: inv.branch_id
          }));
          this.save("bakewise_v2_inventory", this._inventory);
        }

        // Fetch production
        const pRes = await fetch(`/api/production${queryStr}`);
        if (pRes.ok) {
          const fetchedProd = await pRes.json();
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

        // Fetch waste
        const wRes = await fetch(`/api/waste${queryStr}`);
        if (wRes.ok) {
          const fetchedWaste = await wRes.json();
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
        console.error("Error syncing data from database API:", err);
      }
    }
  }

  getSelectedBranchId() {
    if (this.currentUser && this.currentUser.role !== 'admin') {
      return this.currentUser.branch_id || 1;
    }
    const select = document.getElementById("branch-switcher-select");
    return select ? select.value : 'all';
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

  async login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();

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
        sessionStorage.setItem("bakewise_v2_session", JSON.stringify(this.currentUser));
        localStorage.setItem("bakewise_v2_session", JSON.stringify(this.currentUser));
        document.documentElement.classList.add('user-logged-in');
        this.isBackendOnline = true;
        return this.currentUser;
      } else if (res.status === 429) {
        if (typeof showToast !== 'undefined') showToast("API Rate limited. Falling back to local authentication.", "info");
      } else {
        console.warn("API authentication failed. Falling back to local authentication.");
      }
    } catch (e) {
      console.error("Auth login network failed, attempting offline fallback", e);
    }

    const matchedUser = this.users.find(u => 
      u.email.toLowerCase() === cleanEmail ||
      u.email.toLowerCase().replace('@rosebakeshop.com', '@bakewise.com') === cleanEmail ||
      u.email.toLowerCase().replace('@bakewise.com', '@rosebakeshop.com') === cleanEmail ||
      u.email.toLowerCase().replace('@gmail.com', '@bakewise.com') === cleanEmail
    );

    if (matchedUser && matchedUser.password === password) {
      const branch = this.branches.find(b => b.id === matchedUser.branch_id);
      this.currentUser = {
        email: matchedUser.email,
        role: matchedUser.role,
        name: matchedUser.name,
        branch_id: matchedUser.branch_id,
        branch_name: branch ? branch.name : null,
        roleLabel: this.getRoleLabel(matchedUser.role)
      };
      sessionStorage.setItem("bakewise_v2_session", JSON.stringify(this.currentUser));
      localStorage.setItem("bakewise_v2_session", JSON.stringify(this.currentUser));
      document.documentElement.classList.add('user-logged-in');
      return this.currentUser;
    }

    // Role-based keyword fallback matching
    const nameMap = { "manager": "Branch Manager", "sales": "Sales Staff", "inventory": "Inventory Specialist", "production": "Baking Specialist", "admin": "System Administrator" };
    let role = null;
    if (cleanEmail.includes("manager")) role = "manager";
    else if (cleanEmail.includes("sales")) role = "sales";
    else if (cleanEmail.includes("inventory")) role = "inventory";
    else if (cleanEmail.includes("production")) role = "production";
    else if (cleanEmail.includes("admin")) role = "admin";

    if (role && (password === "password123" || password === "password")) {
      this.currentUser = {
        email: cleanEmail,
        role: role,
        name: nameMap[role] || "Staff Member",
        roleLabel: this.getRoleLabel(role),
        branch_id: role === 'admin' ? null : 1,
        branch_name: role === 'admin' ? null : "Main Branch (Central)"
      };
      sessionStorage.setItem("bakewise_v2_session", JSON.stringify(this.currentUser));
      localStorage.setItem("bakewise_v2_session", JSON.stringify(this.currentUser));
      document.documentElement.classList.add('user-logged-in');
      return this.currentUser;
    }

    return null;
  }

  getRoleLabel(role) {
    const roleLabels = {
      "manager": "Branch Manager",
      "sales": "Sales Staff",
      "inventory": "Inventory Staff",
      "production": "Baking Crew",
      "admin": "Administrator"
    };
    return roleLabels[role] || "Staff Member";
  }

  logout() {
    this.currentUser = null;
    sessionStorage.removeItem("bakewise_v2_session");
    localStorage.removeItem("bakewise_v2_session");
    document.documentElement.classList.remove('user-logged-in');
  }

  async addProduct(name, category, price, cost, shelfLifeDays, repurposeRecipe) {
    let maxIdNum = 0;
    this.products.forEach(p => {
      if (p.id && p.id.startsWith("p")) {
        const num = parseInt(p.id.substring(1));
        if (!isNaN(num) && num > maxIdNum) maxIdNum = num;
      }
    });
    const id = "p" + (maxIdNum + 1);
    const product = { id, name, category, price: parseFloat(price), cost: parseFloat(cost), shelfLifeDays: parseInt(shelfLifeDays), repurposeRecipe };

    if (this.isBackendOnline) {
      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, name, category, price: parseFloat(price), cost: parseFloat(cost), shelf_life_days: parseInt(shelfLifeDays), repurpose_recipe: repurposeRecipe })
        });
        if (res.ok) {
          const newP = await res.json();
          const pToAdd = {
            id: newP.id || id,
            name: newP.name || name,
            category: newP.category || category,
            price: parseFloat(newP.price || price),
            cost: parseFloat(newP.cost || cost),
            shelfLifeDays: newP.shelfLifeDays !== undefined ? newP.shelfLifeDays : (newP.shelf_life_days !== undefined ? newP.shelf_life_days : parseInt(shelfLifeDays)),
            repurposeRecipe: newP.repurposeRecipe !== undefined ? newP.repurposeRecipe : (newP.repurpose_recipe !== undefined ? newP.repurpose_recipe : repurposeRecipe)
          };
          this.products.push(pToAdd);
          this.commitAll();
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
        const res = await fetch(`/api/products/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: productData.name,
            category: productData.category,
            price: productData.price,
            cost: productData.cost,
            shelf_life_days: productData.shelfLifeDays,
            repurpose_recipe: productData.repurposeRecipe
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
              repurposeRecipe: u.repurpose_recipe
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
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
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
    const branchId = this.getSelectedBranchId() === 'all' ? 1 : parseInt(this.getSelectedBranchId());

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

  async addInventory(productId, stockQty, prodDate, expDate, targetBranchId) {
    const parsedQty = parseInt(stockQty);
    if (isNaN(parsedQty) || parsedQty <= 0) return false;
    const branchId = targetBranchId ? parseInt(targetBranchId) : (this.getSelectedBranchId() === 'all' ? 1 : parseInt(this.getSelectedBranchId()));

    if (this.isBackendOnline) {
      try {
        await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id: productId, stock_level: parsedQty, production_date: prodDate, expiry_date: expDate, branch_id: branchId })
        });
      } catch (e) { console.error(e); }
    }

    const existingIndex = this._inventory.findIndex(i => i.productId === productId && i.branchId === branchId);
    if (existingIndex !== -1) {
      this._inventory[existingIndex].stockLevel += parsedQty;
      this._inventory[existingIndex].productionDate = prodDate;
      this._inventory[existingIndex].expiryDate = expDate;
    } else {
      this._inventory.push({ id: "i_" + Date.now(), productId, stockLevel: parsedQty, productionDate: prodDate, expiryDate: expDate, branchId });
    }

    this.commitAll();
    this.logActivity(`Added inventory: ${parsedQty} pcs (Product ID: ${productId})`);
    return true;
  }

  async addProduction(productId, planned, actual, date, baker) {
    const parsedPlanned = parseInt(planned);
    const parsedActual = parseInt(actual);
    if (isNaN(parsedPlanned) || isNaN(parsedActual)) return false;

    const branchId = this.getSelectedBranchId() === 'all' ? 1 : parseInt(this.getSelectedBranchId());
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
    const branchId = this.getSelectedBranchId() === 'all' ? 1 : parseInt(this.getSelectedBranchId());

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
        await fetch(`/api/branches/${bId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, latitude: parsedLat, longitude: parsedLng, address, store_hours, contact_no, status })
        });
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

  async deleteBranch(id) {
    if (this.isBackendOnline) {
      try { await fetch(`/api/branches/${id}`, { method: 'DELETE' }); } catch (e) { console.error(e); }
    }
    this.branches = this.branches.filter(b => b.id.toString() !== id.toString());
    this.save("bakewise_v2_branches", this.branches);
    this.logActivity(`Deleted branch ID: ${id}`);
    return true;
  }

  async addUser(name, email, password, role, branchId) {
    const bId = branchId ? parseInt(branchId) : null;
    if (this.isBackendOnline) {
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role, branch_id: bId })
        });
        if (res.ok) {
          const newUser = await res.json();
          this.users.push(newUser);
          this.save("bakewise_v2_users", this.users);
          return true;
        }
      } catch (e) { console.error(e); }
    }

    const newUser = { id: this.users.length + 1, name, email, password, role, branch_id: bId };
    this.users.push(newUser);
    this.save("bakewise_v2_users", this.users);
    this.logActivity(`Added new user: ${name}`);
    return true;
  }

  async updateUser(id, name, email, password, role, branchId) {
    const uId = parseInt(id);
    const bId = branchId ? parseInt(branchId) : null;

    if (this.isBackendOnline) {
      try {
        await fetch(`/api/users/${uId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role, branch_id: bId })
        });
      } catch (e) { console.error(e); }
    }

    const usr = this.users.find(u => u.id === uId);
    if (usr) {
      usr.name = name;
      usr.email = email;
      if (password) usr.password = password;
      usr.role = role;
      usr.branch_id = bId;
      this.save("bakewise_v2_users", this.users);
      this.logActivity(`Updated user: ${name}`);
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
  setupInventoryModal();
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
      "pane-admin-users": "Staff Directory & Accounts Manager",
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
        switcherSelect.innerHTML = '<option value="all">All Network Branches</option>' + 
          store.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
        switcherSelect.disabled = false;
      } else {
        branchSwitcher.style.display = 'none';
        const uBranchId = store.currentUser.branch_id ? parseInt(store.currentUser.branch_id) : 1;
        const userBranch = store.branches.find(b => b.id === uBranchId);
        const branchName = userBranch ? userBranch.name : `Branch ${uBranchId}`;
        switcherSelect.innerHTML = `<option value="${uBranchId}">${branchName}</option>`;
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
  }
}

function setupLoginActions() {
  const loginForm = document.getElementById("login-form");
  const logoutBtn = document.getElementById("btn-logout");
  const passwordInput = document.getElementById("password-input");
  const togglePassBtn = document.getElementById("btn-toggle-password");
  const iconEyeOpen = document.getElementById("icon-eye-open");
  const iconEyeClosed = document.getElementById("icon-eye-closed");
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

      const user = await store.login(email, password);
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
      await checkSessionState();
      showToast("Session disconnected. Goodbye!", "info");
    });
  }

  if (togglePassBtn) {
    togglePassBtn.addEventListener("click", () => {
      const isPass = passwordInput.getAttribute("type") === "password";
      if (isPass) {
        passwordInput.setAttribute("type", "text");
        iconEyeOpen.style.display = "block";
        iconEyeClosed.style.display = "none";
      } else {
        passwordInput.setAttribute("type", "password");
        iconEyeOpen.style.display = "none";
        iconEyeClosed.style.display = "block";
      }
    });
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

function populateSelectDropdowns() {
  const selectSales = document.getElementById("sales-select-product");
  const selectInv = document.getElementById("inv-select-product");
  const selectProd = document.getElementById("prod-select-product");
  const selectWaste = document.getElementById("waste-select-product");
  const selectUsrBranch = document.getElementById("usr-branch-select");
  const selectInvBranch = document.getElementById("inv-select-branch");

  const optionsHTML = store.products.map(p => `<option value="${p.id}">${p.name} (${p.category})</option>`).join('');
  const branchOptionsHTML = store.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

  if (selectSales) selectSales.innerHTML = optionsHTML;
  if (selectInv) selectInv.innerHTML = optionsHTML;
  if (selectProd) selectProd.innerHTML = optionsHTML;
  if (selectWaste) selectWaste.innerHTML = optionsHTML;

  if (selectUsrBranch) {
    selectUsrBranch.innerHTML = branchOptionsHTML;
  }
  if (selectInvBranch) {
    selectInvBranch.innerHTML = branchOptionsHTML;
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

      const success = await store.addUser(name, email, password, role, branchId);
      if (success) {
        showToast("Staff account registered.", "success");
        userForm.reset();
        refreshAdminUsersPane();
      } else showToast("Error creating user account.", "error");
    });
  }

  const branchForm = document.getElementById("admin-branch-form");
  if (branchForm) {
    branchForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!(await showConfirmModal("Are you sure you want to register this new branch?"))) return;

      const name = document.getElementById("br-name-input").value;
      const lat = document.getElementById("br-lat-input")?.value || 14.5995;
      const lng = document.getElementById("br-lng-input")?.value || 120.9842;
      const address = document.getElementById("br-address-input").value;
      const storeHours = document.getElementById("br-hours-input").value;
      const contactNo = document.getElementById("br-contact-input").value;

      const success = await store.addBranch(name, lat, lng, address, storeHours, contactNo);
      if (success) {
        showToast("Branch registered.", "success");
        branchForm.reset();
        populateSelectDropdowns();
        refreshAdminBranchesPane();
      } else showToast("Error registering branch.", "error");
    });
  }

  const branchEditForm = document.getElementById("branch-edit-form");
  if (branchEditForm) {
    branchEditForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!(await showConfirmModal("Are you sure you want to save changes to this branch?"))) return;

      const id = document.getElementById("edit-branch-id").value;
      const name = document.getElementById("edit-br-name").value;
      const status = document.getElementById("edit-br-status").value;
      const address = document.getElementById("edit-br-address").value;
      const storeHours = document.getElementById("edit-br-hours").value;
      const contactNo = document.getElementById("edit-br-contact").value;
      const branch = store.branches.find(b => b.id === parseInt(id));
      const lat = branch ? branch.latitude : 300;
      const lng = branch ? branch.longitude : 200;

      await store.updateBranch(id, name, lat, lng, address, storeHours, contactNo, status);
      document.getElementById("branch-edit-modal").style.display = "none";
      document.getElementById("modal-overlay").classList.remove("visible");
      populateSelectDropdowns();
      await refreshAdminBranchesPane();
      showToast("Branch updated successfully.", "success");
    });
  }

  const userEditForm = document.getElementById("user-edit-form");
  if (userEditForm) {
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

      await store.updateUser(id, name, email, password, role, branchId);
      document.getElementById("user-edit-modal").style.display = "none";
      document.getElementById("modal-overlay").classList.remove("visible");
      await refreshAdminUsersPane();
      showToast("Staff account updated successfully.", "success");
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
      document.getElementById("print-report-timestamp").textContent = "Generated: " + new Date().toLocaleString();
      window.print();
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
        branchSelect.value = currentBranch === 'all' ? 1 : currentBranch;
      } else {
        branchSelect.value = store.currentUser.branch_id || 1;
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
    if (product) {
      document.getElementById("product-modal-title").textContent = "Edit Bakery Product";
      document.getElementById("product-id-hidden").value = product.id;
      document.getElementById("prod-name-input").value = product.name;
      document.getElementById("prod-category-select").value = product.category;
      document.getElementById("prod-price-input").value = product.price;
      document.getElementById("prod-cost-input").value = product.cost;
      document.getElementById("prod-shelflife-input").value = product.shelfLifeDays;
      document.getElementById("prod-repurpose-input").value = product.repurposeRecipe || "";
    } else {
      document.getElementById("product-modal-title").textContent = "Add Bakery Product";
      if (form) form.reset();
      document.getElementById("product-id-hidden").value = "";
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

      if (pId) {
        await store.updateProduct(pId, { name, category, price, cost, shelfLifeDays, repurposeRecipe });
        showToast("Product details updated.", "success");
      } else {
        await store.addProduct(name, category, price, cost, shelfLifeDays, repurposeRecipe);
        showToast("New product added to catalog.", "success");
      }
      populateSelectDropdowns();
      closeModal();
      refreshProductsPane();
    });
  }
}

function showConfirmModal(message, title = "Confirm Action", iconType = "alert-triangle") {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const overlay = document.getElementById("confirm-modal-overlay");
    const titleEl = document.getElementById("confirm-modal-title");
    const msgEl = document.getElementById("confirm-modal-message");
    const iconContainer = document.getElementById("confirm-modal-icon-container");
    const okBtn = document.getElementById("btn-confirm-ok");
    const cancelBtn = document.getElementById("btn-confirm-cancel");

    if (titleEl) titleEl.textContent = title;
    msgEl.textContent = message;
    
    if (iconContainer) {
      const color = iconType === "alert-triangle" ? "var(--color-error)" : "var(--primary-color)";
      iconContainer.innerHTML = `<i data-lucide="${iconType}" style="width: 48px; height: 48px; color: ${color}; margin: 0 auto; display: block;"></i>`;
      if (window.lucide) window.lucide.createIcons({ root: iconContainer });
    }
    
    if (message.toLowerCase().includes("delete") || message.toLowerCase().includes("remove")) {
      okBtn.textContent = "Delete";
      okBtn.style.backgroundColor = "var(--color-error)";
    } else {
      okBtn.textContent = "Confirm";
      okBtn.style.backgroundColor = "var(--primary-color)";
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

  toast.innerHTML = `
    <i data-lucide="${iconMap[type] || 'info'}" style="width: 20px; height: 20px; color: ${colorMap[type]}; flex-shrink:0;"></i>
    <span class="toast-message">${message}</span>
  `;

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
  let latestDate = new Date();
  const allDates = [...store.sales.map(s => s.date), ...store.waste.map(w => w.date)].filter(d => d);
  if (allDates.length > 0) {
    const maxTime = Math.max(...allDates.map(d => parseLocalDate(d).getTime()));
    latestDate = new Date(maxTime);
  }
  if (latestDate > new Date()) latestDate = new Date(); // cap at today
  const latestDateStr = formatLocalDate(latestDate);

  const branchIdStr = store.getSelectedBranchId();
  const branchId = branchIdStr === 'all' ? 'all' : parseInt(branchIdStr);

  const salesToday = store.sales
    .filter(s => s.date === latestDateStr && (branchId === 'all' || s.branchId === branchId))
    .reduce((sum, s) => sum + (s.qty * s.price), 0);
  document.getElementById("dash-sales-value").textContent = `₱${salesToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const wasteToday = store.waste
    .filter(w => w.date === latestDateStr && (branchId === 'all' || w.branchId === branchId))
    .reduce((sum, w) => sum + (w.qty * w.cost), 0);
  document.getElementById("dash-waste-value").textContent = `₱${wasteToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  let expiryCount = 0;
  store.inventory.forEach(item => {
    if (branchId !== 'all' && item.branchId !== branchId) return;
    const fIndex = getFreshnessIndex(item.productionDate, item.expiryDate);
    if (fIndex <= 30 && item.stockLevel > 0) expiryCount++;
  });
  document.getElementById("dash-expiry-value").textContent = `${expiryCount} items`;

  const totalStock = store.inventory
    .filter(i => branchId === 'all' || i.branchId === branchId)
    .reduce((sum, i) => sum + i.stockLevel, 0);
  document.getElementById("dash-stock-value").textContent = `${totalStock.toLocaleString()} pcs`;

  // Update AI Insights & Trends based on data presence
  if (salesToday === 0 && store.sales.length === 0) {
    document.getElementById("dash-sales-trend").style.visibility = "hidden";
    document.getElementById("dash-sales-insight").innerHTML = '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>No recent sales data to analyze.</span>';
  } else {
    document.getElementById("dash-sales-trend").style.visibility = "visible";
    document.getElementById("dash-sales-insight").innerHTML = '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>Forecast indicates a steady increase. Ensure adequate staffing during peak hours.</span>';
  }

  if (wasteToday === 0 && store.waste.length === 0) {
    document.getElementById("dash-waste-trend").style.visibility = "hidden";
    document.getElementById("dash-waste-insight").innerHTML = '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>No recent waste data to analyze.</span>';
  } else {
    document.getElementById("dash-waste-trend").style.visibility = "visible";
    document.getElementById("dash-waste-insight").innerHTML = '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>Waste cost is decreasing. Maintain current inventory practices to keep waste low.</span>';
  }

  if (expiryCount === 0) {
    document.getElementById("dash-expiry-subtext").style.visibility = "hidden";
    document.getElementById("dash-expiry-insight").innerHTML = '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>No items currently nearing expiry.</span>';
  } else {
    document.getElementById("dash-expiry-subtext").style.visibility = "visible";
    document.getElementById("dash-expiry-insight").innerHTML = '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>Prioritize repurposing or discounting these items immediately.</span>';
  }

  if (totalStock === 0) {
    document.getElementById("dash-stock-subtext").textContent = "Empty";
    document.getElementById("dash-stock-subtext").style.color = "var(--color-danger)";
    document.getElementById("dash-stock-insight").innerHTML = '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>Inventory is empty. Immediate restocking required.</span>';
  } else {
    document.getElementById("dash-stock-subtext").textContent = "Optimal levels";
    document.getElementById("dash-stock-subtext").style.color = "var(--color-success)";
    document.getElementById("dash-stock-insight").innerHTML = '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>Stock levels are optimal. No immediate restocking required.</span>';
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
    // Default to last 7 days from latest data date
    endDate = new Date();
    const allDates = [...store.sales.map(s => s.date), ...store.waste.map(w => w.date)].filter(d => d);
    if (allDates.length > 0) {
      const maxTime = Math.max(...allDates.map(d => parseLocalDate(d).getTime()));
      endDate = new Date(maxTime);
    }
    if (endDate > new Date()) endDate = new Date();
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
      .reduce((sum, w) => sum + (w.qty * w.cost), 0);
    wasteData.push(dayWaste);

    current.setDate(current.getDate() + 1);
  }

  const daysDiff = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  const chartTitleEl = document.getElementById("dash-chart-title");
  if (chartTitleEl) chartTitleEl.textContent = `Sales vs. Waste Trend (${daysDiff} Days)`;

  const totalSales = salesData.reduce((sum, val) => sum + val, 0);
  const totalWaste = wasteData.reduce((sum, val) => sum + val, 0);
  const salesWasteInsightEl = document.getElementById("insight-sales-waste-chart");
  if (salesWasteInsightEl) {
    if (totalSales === 0 && totalWaste === 0) {
      salesWasteInsightEl.innerHTML = '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>No sales or waste data for the selected period.</span>';
    } else {
      const salesExceed = totalSales >= totalWaste;
      salesWasteInsightEl.innerHTML = `<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>${salesExceed ? 'Sales are outperforming waste costs.' : 'Warning: Waste costs are high compared to sales.'} Total sales reached ₱${totalSales.toLocaleString('en-US', {minimumFractionDigits: 2})}.</span>`;
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

  tbody.innerHTML = rows.join('');

  const insightEl = document.getElementById("insight-stock-plan");
  if (insightEl) {
    const lowStockCount = store.products.filter(p => {
      const stock = store.inventory.filter(i => i.productId === p.id && (branchId === 'all' || i.branchId === branchId)).reduce((sum, i) => sum + i.stockLevel, 0);
      return stock < 10;
    }).length;
    if (lowStockCount > 0) {
      insightEl.innerHTML = `<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>Notice: ${lowStockCount} product(s) are currently at low stock. Prioritize suggested production runs.</span>`;
    } else {
      insightEl.innerHTML = `<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>Stock levels are healthy across products. Production recommendations updated based on forecast.</span>`;
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
      .filter(s => s.branchId === b.id)
      .reduce((sum, s) => sum + (s.qty * s.price), 0);
  });
  
  const wasteData = store.branches.map(b => {
    return store.waste
      .filter(w => w.branchId === b.id)
      .reduce((sum, w) => sum + (w.qty * w.cost), 0);
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
      const bSales = store.sales.filter(s => s.branchId === b.id).reduce((sum, s) => sum + (s.qty * s.price), 0);
      const bWaste = store.waste.filter(w => w.branchId === b.id).reduce((sum, w) => sum + (w.qty * w.cost), 0);
      return { name: b.name, sales: bSales, waste: bWaste };
    });
    
    const totalSalesGlobal = allBranchPerformance.reduce((a, b) => a + b.sales, 0);
    const totalWasteGlobal = allBranchPerformance.reduce((a, b) => a + b.waste, 0);
    
    if (totalSalesGlobal === 0 && totalWasteGlobal === 0) {
      branchInsightEl.innerHTML = '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>No branch data available for comparison.</span>';
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
      
      branchInsightEl.innerHTML = insightHtml;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function renderRealtimeAlerts() {
  const tbody = document.getElementById("dashboard-action-alerts-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

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
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">
          <i data-lucide="check-circle" style="width: 24px; height: 24px; color: var(--color-success); vertical-align: middle; margin-right: 6px;"></i>
          <strong>Systems Nominal</strong> — No active expiration hazards or critical alerts.
        </td>
      </tr>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  tbody.innerHTML = alertItems.map(a => {
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
  }).join('');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 2. POINT-OF-SALE (POS) CONTROLLER & REFRESHER
let posCart = [];
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
  if (store && store.isBackendOnline) {
    try {
      await store.syncWithBackend();
    } catch(e) {}
  }
  setupPOSModule();
  switchPosTab(currentPosTab || 'new-sale');
}

function getBranchProductStock(productId) {
  const selectedBranchId = store.getSelectedBranchId();
  let effectiveBranchId = 1;
  if (selectedBranchId && selectedBranchId !== 'all') {
    effectiveBranchId = parseInt(selectedBranchId);
  } else if (store.currentUser && store.currentUser.branch_id) {
    effectiveBranchId = parseInt(store.currentUser.branch_id);
  } else if (store.branches && store.branches.length > 0) {
    effectiveBranchId = parseInt(store.branches[0].id);
  }

  const pStr = String(productId).trim();
  const altPid = pStr.startsWith('p') ? pStr.substring(1) : `p${pStr}`;

  const inventoryRecords = (store._inventory || []).filter(i => {
    const iPid = String(i.productId).trim();
    const pidMatch = iPid === pStr || iPid === altPid;
    const bidMatch = parseInt(i.branchId) === parseInt(effectiveBranchId);
    return pidMatch && bidMatch;
  });

  return inventoryRecords.reduce((sum, item) => sum + (parseInt(item.stockLevel !== undefined ? item.stockLevel : (item.quantity !== undefined ? item.quantity : item.stock_level)) || 0), 0);
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

function renderPosProducts() {
  const grid = document.getElementById("pos-products-grid");
  if (!grid) return;

  const searchText = (document.getElementById("pos-product-search")?.value || "").toLowerCase().trim();

  const filtered = store.products.filter(p => {
    const matchesCategory = activePosCategory === 'all' || (p.category && p.category.toLowerCase() === activePosCategory.toLowerCase());
    const matchesSearch = !searchText || p.name.toLowerCase().includes(searchText) || (p.category && p.category.toLowerCase().includes(searchText));
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
        <i data-lucide="package-x" style="width: 36px; height: 36px; opacity: 0.5; margin-bottom: 8px;"></i>
        <p style="font-weight: 600;">No bakery products found matching your search</p>
      </div>
    `;
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const stockAvailable = getBranchProductStock(p.id);
    const pStr = String(p.id).trim();
    const altStr = pStr.startsWith('p') ? pStr.substring(1) : `p${pStr}`;

    const cartItem = posCart.find(c => {
      const cStr = String(c.productId).trim();
      return cStr === pStr || cStr === altStr;
    });
    const inCartQty = cartItem ? cartItem.qty : 0;
    const remainingStock = Math.max(0, stockAvailable - inCartQty);

    let stockBadgeClass = "in-stock";
    let stockLabel = `In Stock: ${stockAvailable}`;
    if (stockAvailable <= 0) {
      stockBadgeClass = "out-stock";
      stockLabel = "Out of Stock (0)";
    } else if (stockAvailable <= 10) {
      stockBadgeClass = "low-stock";
      stockLabel = `Low Stock: ${stockAvailable}`;
    }

    return `
      <div class="pos-product-card" data-product-id="${p.id}" onclick="addToPosCart('${p.id}')">
        <div class="pos-product-info">
          <span class="pos-product-category">${p.category || 'BAKERY'}</span>
          <h4>${p.name}</h4>
        </div>
        <div>
          <div class="pos-product-price">₱${parseFloat(p.price).toFixed(2)}</div>
          <div class="pos-product-stock ${stockBadgeClass}">
            <span>${stockLabel}</span>
          </div>
          <button type="button" class="pos-product-add-btn" data-product-id="${p.id}" onclick="event.stopPropagation(); addToPosCart('${p.id}')" ${remainingStock <= 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            <span>${remainingStock <= 0 ? 'Out of Stock' : (inCartQty > 0 ? `Add (${inCartQty} in cart)` : 'Add to Cart')}</span>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
}

function addToPosCart(productId) {
  const p = findPosProduct(productId);
  if (!p) {
    console.warn("Product not found for ID:", productId);
    return;
  }

  const pStr = String(p.id).trim();
  const altStr = pStr.startsWith('p') ? pStr.substring(1) : `p${pStr}`;

  const stockAvailable = getBranchProductStock(p.id);

  const existingIndex = posCart.findIndex(c => {
    const cStr = String(c.productId).trim();
    return cStr === pStr || cStr === altStr;
  });

  if (existingIndex >= 0) {
    if (posCart[existingIndex].qty + 1 > stockAvailable) {
      showToast(`Insufficient stock for ${p.name}. Only ${stockAvailable} units are available.`, "warning");
      return;
    }
    posCart[existingIndex].qty += 1;
  } else {
    if (stockAvailable <= 0) {
      showToast(`Cannot add ${p.name}. Item is out of stock.`, "danger");
      return;
    }
    posCart.push({
      productId: p.id,
      name: p.name,
      price: parseFloat(p.price),
      category: p.category,
      qty: 1
    });
  }

  updatePosCartUI();
  renderPosProducts();
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
  const stockAvailable = getBranchProductStock(item.productId);

  if (delta > 0) {
    if (item.qty + 1 > stockAvailable) {
      showToast(`Insufficient stock. Only ${stockAvailable} units are available.`, "warning");
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
  renderPosProducts();
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
  renderPosProducts();
}
window.removeFromPosCart = removeFromPosCart;

function clearPosCart() {
  posCart = [];
  const discountInput = document.getElementById("pos-discount-input");
  if (discountInput) discountInput.value = "0.00";
  const tenderedInput = document.getElementById("pos-tendered-input");
  if (tenderedInput) tenderedInput.value = "";
  updatePosCartUI();
  renderPosProducts();
}
window.clearPosCart = clearPosCart;

function updatePosCartUI() {
  const listElem = document.getElementById("pos-cart-items-list");
  const countElem = document.getElementById("pos-cart-count");
  const subtotalElem = document.getElementById("pos-summary-subtotal");
  const totalElem = document.getElementById("pos-summary-total");
  const checkoutBtnText = document.getElementById("btn-pos-checkout-text");
  const changeValueElem = document.getElementById("pos-change-value");
  const branchCtxElem = document.getElementById("pos-ctx-branch");
  const cashierCtxElem = document.getElementById("pos-ctx-cashier");

  // Context updates
  const selectedBranchId = store.getSelectedBranchId();
  const effBranchId = (selectedBranchId === 'all' || !selectedBranchId)
    ? (store.currentUser?.branch_id ? parseInt(store.currentUser.branch_id) : 1)
    : parseInt(selectedBranchId);
  const branchObj = store.branches.find(b => b.id === effBranchId);
  if (branchCtxElem) branchCtxElem.textContent = `Branch: ${branchObj ? branchObj.name : 'Main Branch'}`;
  if (cashierCtxElem) cashierCtxElem.textContent = `Cashier: ${store.currentUser ? store.currentUser.name : 'System Administrator'}`;

  const totalItemCount = posCart.reduce((acc, item) => acc + item.qty, 0);
  if (countElem) countElem.textContent = `${totalItemCount} items`;

  if (!posCart.length) {
    if (listElem) {
      listElem.innerHTML = `
        <div class="cart-empty-state">
          <i data-lucide="shopping-cart" style="width: 44px; height: 44px; color: var(--text-muted); opacity: 0.5;"></i>
          <p style="margin-top: 10px; font-weight: 600; color: var(--text-secondary);">Cart is empty</p>
          <span style="font-size: 0.85rem; color: var(--text-muted);">Select bakery products from the left to start checkout</span>
        </div>
      `;
      if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }
    if (subtotalElem) subtotalElem.textContent = "₱0.00";
    if (totalElem) totalElem.textContent = "₱0.00";
    if (checkoutBtnText) checkoutBtnText.textContent = "CHECKOUT (₱0.00)";
    if (changeValueElem) changeValueElem.textContent = "₱0.00";
    return;
  }

  if (listElem) {
    listElem.innerHTML = posCart.map(item => {
      const itemSubtotal = item.qty * item.price;
      return `
        <div class="cart-item-row">
          <div class="cart-item-left">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price-unit">₱${item.price.toFixed(2)} × ${item.qty}</div>
          </div>
          <div class="cart-item-controls">
            <button type="button" class="qty-btn" onclick="updatePosCartQty('${item.productId}', -1)">-</button>
            <span class="qty-val">${item.qty}</span>
            <button type="button" class="qty-btn" onclick="updatePosCartQty('${item.productId}', 1)">+</button>
          </div>
          <div class="cart-item-subtotal">₱${itemSubtotal.toFixed(2)}</div>
          <button type="button" class="cart-item-remove" onclick="removeFromPosCart('${item.productId}')" title="Remove item">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </div>
      `;
    }).join('');
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
  }

  const subtotal = posCart.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const discountVal = parseFloat(document.getElementById("pos-discount-input")?.value || 0) || 0;
  const grandTotal = Math.max(0, subtotal - discountVal);

  if (subtotalElem) subtotalElem.textContent = `₱${subtotal.toFixed(2)}`;
  if (totalElem) totalElem.textContent = `₱${grandTotal.toFixed(2)}`;
  if (checkoutBtnText) checkoutBtnText.textContent = `CHECKOUT (₱${grandTotal.toFixed(2)})`;

  // Calculate change
  const tenderedVal = parseFloat(document.getElementById("pos-tendered-input")?.value || 0) || 0;
  const changeVal = currentPosPaymentMethod === 'Cash' ? Math.max(0, tenderedVal - grandTotal) : 0;
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

async function handlePosCheckout() {
  if (!posCart.length) {
    showToast("Shopping cart is empty. Add products before checking out.", "warning");
    return;
  }

  // Stock validation before checkout
  for (const item of posCart) {
    const stockAvailable = getBranchProductStock(item.productId);
    if (item.qty > stockAvailable) {
      showToast(`Insufficient stock. Only ${stockAvailable} units are available for ${item.name}.`, "danger");
      return;
    }
  }

  const subtotal = posCart.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const discount = parseFloat(document.getElementById("pos-discount-input")?.value || 0) || 0;
  const total = Math.max(0, subtotal - discount);
  const tendered = parseFloat(document.getElementById("pos-tendered-input")?.value || 0) || 0;

  if (currentPosPaymentMethod === 'Cash' && tendered < total) {
    showToast(`Insufficient payment. Please enter an amount equal to or greater than ₱${total.toFixed(2)}.`, "danger");
    return;
  }

  const selectedBranchId = store.getSelectedBranchId();
  const branch_id = (selectedBranchId === 'all' || !selectedBranchId)
    ? (store.currentUser?.branch_id ? parseInt(store.currentUser.branch_id) : 1)
    : parseInt(selectedBranchId);
  const branchObj = store.branches.find(b => b.id === branch_id);

  const payload = {
    branch_id: branch_id,
    cashier_id: store.currentUser ? store.currentUser.id : 1,
    cashier_name: store.currentUser ? store.currentUser.name : 'System Administrator',
    subtotal: subtotal,
    discount: discount,
    total: total,
    payment_amount: currentPosPaymentMethod === 'Cash' ? tendered : total,
    change_amount: currentPosPaymentMethod === 'Cash' ? Math.max(0, tendered - total) : 0,
    payment_method: currentPosPaymentMethod,
    items: posCart.map(item => ({
      product_id: item.productId,
      product_name: item.name,
      quantity: item.qty,
      unit_price: item.price,
      subtotal: item.qty * item.price
    }))
  };

  try {
    const checkoutBtn = document.getElementById("btn-pos-checkout");
    if (checkoutBtn) checkoutBtn.disabled = true;

    const res = await fetch("/api/pos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to process POS checkout");
    }

    showToast(`POS Transaction ${data.transaction.transaction_number} completed successfully!`, "success");

    if (data.low_stock_warnings && data.low_stock_warnings.length > 0) {
      data.low_stock_warnings.forEach(w => {
        showToast(`Low Stock Alert: ${w.product_name} has only ${w.remaining_stock} units remaining.`, "warning");
      });
    }

    // Refresh store dataset from server & update Sales History table immediately
    await store.syncWithBackend();
    refreshPosHistory();

    // Prepare receipt object
    currentReceiptTxData = {
      transaction_number: data.transaction.transaction_number,
      transaction_date: data.transaction.transaction_date,
      branch_name: branchObj ? branchObj.name : 'Main Branch',
      cashier_name: payload.cashier_name,
      items: payload.items,
      subtotal: subtotal,
      discount: discount,
      total: total,
      payment_amount: payload.payment_amount,
      change_amount: payload.change_amount,
      payment_method: 'Cash'
    };

    // Show thermal receipt modal
    showPosReceiptModal(currentReceiptTxData);

  } catch (err) {
    showToast(`Checkout Error: ${err.message}`, "danger");
    try {
      await store.syncWithBackend();
      renderPosProducts();
    } catch(e) {}
  } finally {
    const checkoutBtn = document.getElementById("btn-pos-checkout");
    if (checkoutBtn) checkoutBtn.disabled = false;
  }
}
window.handlePosCheckout = handlePosCheckout;

function showPosReceiptModal(tx) {
  const container = document.getElementById("pos-receipt-printable");
  const overlay = document.getElementById("pos-receipt-overlay");
  const modal = document.getElementById("pos-receipt-modal");
  if (!container || !modal) return;

  const dateFormatted = new Date(tx.transaction_date || Date.now()).toLocaleString();

  container.innerHTML = `
    <div class="receipt-logo-header">
      <h2>ROSE BAKESHOP</h2>
      <p style="color: #666; font-size: 0.75rem;">BakeWise POS Receipt</p>
    </div>
    <div style="margin-bottom: 8px; font-size: 0.8rem;">
      <div><strong>Tx #:</strong> ${tx.transaction_number}</div>
      <div><strong>Date:</strong> ${dateFormatted}</div>
      <div><strong>Branch:</strong> ${tx.branch_name}</div>
      <div><strong>Cashier:</strong> ${tx.cashier_name}</div>
    </div>
    <div class="receipt-divider"></div>
    <div style="margin-bottom: 8px;">
      ${tx.items.map(item => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <div>
            <div style="font-weight: bold;">${item.product_name}</div>
            <div style="font-size: 0.75rem; color: #555;">${item.quantity} × ₱${parseFloat(item.unit_price).toFixed(2)}</div>
          </div>
          <div style="font-weight: bold;">₱${parseFloat(item.subtotal).toFixed(2)}</div>
        </div>
      `).join('')}
    </div>
    <div class="receipt-divider"></div>
    <div style="font-size: 0.82rem; margin-bottom: 6px;">
      <div style="display: flex; justify-content: space-between;">
        <span>Subtotal:</span>
        <span>₱${parseFloat(tx.subtotal).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Discount:</span>
        <span>₱${parseFloat(tx.discount).toFixed(2)}</span>
      </div>
      <div class="receipt-total-row" style="margin-top: 4px; font-size: 1rem;">
        <span>TOTAL:</span>
        <span>₱${parseFloat(tx.total).toFixed(2)}</span>
      </div>
    </div>
    <div class="receipt-divider"></div>
    <div style="font-size: 0.82rem;">
      <div style="display: flex; justify-content: space-between;">
        <span>Payment Method:</span>
        <span>${tx.payment_method || 'Cash'}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>Payment Amount:</span>
        <span>₱${parseFloat(tx.payment_amount).toFixed(2)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-weight: bold;">
        <span>Change:</span>
        <span>₱${parseFloat(tx.change_amount).toFixed(2)}</span>
      </div>
    </div>
    <div class="receipt-divider"></div>
    <div style="text-align: center; font-size: 0.78rem; margin-top: 10px;">
      <p style="margin: 0; font-weight: bold;">Thank You for Choosing Rose Bakeshop!</p>
      <p style="margin: 2px 0 0 0; color: #666;">Please come again!</p>
    </div>
  `;

  if (overlay) overlay.style.display = 'block';
  modal.style.display = 'block';
}

function closePosReceiptModal() {
  const overlay = document.getElementById("pos-receipt-overlay");
  const modal = document.getElementById("pos-receipt-modal");
  if (overlay) overlay.style.display = 'none';
  if (modal) modal.style.display = 'none';
  clearPosCart();
}
window.closePosReceiptModal = closePosReceiptModal;

function printPosReceipt() {
  window.print();
}
window.printPosReceipt = printPosReceipt;

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
        branchSelect.innerHTML = '<option value="all">All Branches</option>' + 
          store.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
      }
    } else {
      const userBranchObj = store.branches.find(b => parseInt(b.id) === userBranchId);
      const bName = userBranchObj ? userBranchObj.name : `Branch ${userBranchId}`;
      branchSelect.innerHTML = `<option value="${userBranchId}">${bName}</option>`;
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
    const res = await fetch(`/api/pos/transactions?branch_id=${effectiveBranchId}`);
    const data = await res.json();
    let transactions = Array.isArray(data) ? data : (data && data.success && Array.isArray(data.transactions) ? data.transactions : []);

    // Filter locally (strictly isolating branch sales for non-admins)
    transactions = transactions.filter(tx => {
      const txBranchId = parseInt(tx.branch_id || 1);
      const matchBranch = isAdmin 
        ? (effectiveBranchId === 'all' || parseInt(effectiveBranchId) === txBranchId)
        : (txBranchId === userBranchId);

      const cashierStr = tx.cashier_name || tx.cashier || "";
      const dateStr = tx.transaction_date || tx.date || "";
      const matchSearch = !searchInput || 
        tx.transaction_number.toLowerCase().includes(searchInput) ||
        cashierStr.toLowerCase().includes(searchInput) ||
        (tx.items && tx.items.some(i => (i.product_name || i.product_id || "").toLowerCase().includes(searchInput)));
      const matchPayment = selectedPayment === 'all' || tx.payment_method === selectedPayment;
      const matchStatus = selectedStatus === 'all' || tx.status === selectedStatus;
      const matchDate = !selectedDate || dateStr.startsWith(selectedDate);
      return matchBranch && matchSearch && matchPayment && matchStatus && matchDate;
    });

    if (transactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 30px; color: var(--text-muted);">
            No POS transactions found matching the selected filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = transactions.map(tx => {
      const dateVal = tx.transaction_date || tx.date || Date.now();
      const dateFormatted = new Date(dateVal).toLocaleDateString() + ' ' + new Date(dateVal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const itemsCount = tx.items ? tx.items.reduce((sum, i) => sum + (parseInt(i.quantity) || 0), 0) : 0;
      const branchName = tx.branch_name || (store.branches.find(b => parseInt(b.id) === parseInt(tx.branch_id))?.name) || 'Main Branch';
      const cashierName = tx.cashier_name || tx.cashier || 'Staff';
      const statusBadge = tx.status === 'Completed' 
        ? `<span class="status-badge active" style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-weight: 700;">Completed</span>`
        : `<span class="status-badge inactive" style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-weight: 700;">Voided</span>`;

      return `
        <tr>
          <td style="font-weight: 700; color: var(--primary-color);">${tx.transaction_number}</td>
          <td style="font-size: 0.82rem; color: var(--text-secondary);">${dateFormatted}</td>
          <td>${branchName}</td>
          <td>${cashierName}</td>
          <td><strong>${tx.items ? tx.items.length : 0} items</strong> (${itemsCount} units)</td>
          <td style="font-weight: 800; color: var(--accent-color);">₱${parseFloat(tx.total || 0).toFixed(2)}</td>
          <td>${tx.payment_method || 'Cash'}</td>
          <td>${statusBadge}</td>
          <td>
            <button type="button" class="btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;" onclick="viewPosTransactionDetails(${tx.id})">
              <i data-lucide="eye" style="width: 14px; height: 14px;"></i> View
            </button>
          </td>
        </tr>
      `;
    }).join('');

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

    const dateVal = tx.transaction_date || tx.date || Date.now();
    const dateFormatted = new Date(dateVal).toLocaleString();
    const branchName = tx.branch_name || (store.branches.find(b => b.id === tx.branch_id)?.name) || 'Main Branch';
    const cashierName = tx.cashier_name || tx.cashier || 'System Administrator';
    const itemsList = tx.items || [];

    body.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: var(--bg-secondary); padding: 14px; border-radius: 8px; margin-bottom: 16px; font-size: 0.88rem;">
        <div><strong>Date/Time:</strong> ${dateFormatted}</div>
        <div><strong>Branch:</strong> ${branchName}</div>
        <div><strong>Cashier:</strong> ${cashierName}</div>
        <div><strong>Status:</strong> <span style="font-weight: 700; color: ${tx.status === 'Completed' ? 'var(--color-success)' : 'var(--color-error)'}">${tx.status || 'Completed'}</span></div>
      </div>

      <h4 style="margin-bottom: 8px; font-size: 0.95rem; font-weight: 700;">Items Purchased (${itemsList.length})</h4>
      <table class="data-table" style="margin-bottom: 16px;">
        <thead>
          <tr>
            <th>Product</th>
            <th>Unit Price</th>
            <th>Qty</th>
            <th>Subtotal</th>
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
                <td>₱${uPrice.toFixed(2)}</td>
                <td>${qtyVal}</td>
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
          <span>Grand Total:</span> <span>₱${parseFloat(tx.total || 0).toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.85rem; color: var(--text-secondary);">
          <span>Payment (${tx.payment_method || 'Cash'}):</span> <span>₱${parseFloat(tx.payment_amount || 0).toFixed(2)} (Change: ₱${parseFloat(tx.change_amount || 0).toFixed(2)})</span>
        </div>
      </div>
    `;

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
  if (currentDetailsTxData) {
    showPosReceiptModal({
      transaction_number: currentDetailsTxData.transaction_number,
      transaction_date: currentDetailsTxData.transaction_date,
      branch_name: currentDetailsTxData.branch_name,
      cashier_name: currentDetailsTxData.cashier_name,
      items: currentDetailsTxData.items,
      subtotal: currentDetailsTxData.subtotal,
      discount: currentDetailsTxData.discount,
      total: currentDetailsTxData.total,
      payment_amount: currentDetailsTxData.payment_amount,
      change_amount: currentDetailsTxData.change_amount,
      payment_method: currentDetailsTxData.payment_method
    });
  }
}
window.printPosReceiptFromDetails = printPosReceiptFromDetails;

async function voidPosTransaction(txId) {
  showConfirmModal(
    "Void POS Transaction",
    "Are you sure you want to void this transaction? The deducted inventory will be automatically restored back to stock.",
    async () => {
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
      } catch (err) {
        showToast(err.message, "danger");
      }
    }
  );
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

  // Event delegation on product grid
  const gridContainer = document.getElementById("pos-products-grid");
  if (gridContainer) {
    gridContainer.addEventListener("click", (e) => {
      const card = e.target.closest(".pos-product-card, .pos-product-add-btn");
      if (card) {
        const productId = card.getAttribute("data-product-id");
        if (productId) {
          addToPosCart(productId);
        }
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
  const branchIdStr = store.getSelectedBranchId();
  const branchId = branchIdStr === 'all' ? 'all' : parseInt(branchIdStr);

  const searchInput = document.getElementById('inventory-search-input')?.value.toLowerCase() || '';
  const dateFilter = document.getElementById('inventory-date-filter')?.value || '';
  const localBranchFilter = document.getElementById('inventory-branch-filter')?.value || 'all';
  const effectiveBranchId = localBranchFilter !== 'all' ? parseInt(localBranchFilter) : branchId;

  const filteredInventory = store.inventory
    .filter(i => effectiveBranchId === 'all' || i.branchId === effectiveBranchId)
    .filter(i => {
      const p = store.products.find(x => x.id === i.productId);
      const nameMatch = p ? p.name.toLowerCase().includes(searchInput) : true;
      const dateMatch = dateFilter ? i.productionDate.startsWith(dateFilter) : true;
      return nameMatch && dateMatch;
    });

  const totalPages = Math.ceil(filteredInventory.length / ITEMS_PER_PAGE) || 1;
  if (inventoryCurrentPage > totalPages) inventoryCurrentPage = totalPages;
  const startIndex = (inventoryCurrentPage - 1) * ITEMS_PER_PAGE;
  const pagedInventory = filteredInventory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  tbody.innerHTML = pagedInventory.map(item => {
    const p = store.products.find(x => x.id === item.productId);
    if (!p) return '';

    const fIndex = getFreshnessIndex(item.productionDate, item.expiryDate);
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
    }

    const prodFormatted = formatDateTimeDisplay(item.productionDate);
    const expFormatted = formatDateTimeDisplay(item.expiryDate);
    const b = store.branches.find(x => x.id === item.branchId) || { name: "Unknown Branch" };

    return `
      <tr>
        <td style="font-weight: 700;">${p.name}</td>
        <td style="color: var(--text-secondary); font-size: 0.85rem;">${b.name}</td>
        <td>${p.category}</td>
        <td>${item.stockLevel} pcs</td>
        <td style="font-size: 0.85rem; color: var(--text-primary); font-weight: 600;">${prodFormatted}</td>
        <td style="font-size: 0.85rem; color: var(--text-primary); font-weight: 600;">${expFormatted}</td>
        <td>
          <div class="freshness-indicator">
            <div class="freshness-bar-outer">
              <div class="freshness-bar-inner" style="width: ${fIndex}%; background-color: ${barColor};"></div>
            </div>
            <span class="freshness-value">${fIndex}%</span>
          </div>
        </td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
      </tr>
    `;
  }).join('');

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
  const sortedProd = [...store.production]
    .filter(p => branchId === 'all' || p.branchId === branchId)
    .filter(p => {
      const prodObj = store.products.find(x => x.id === p.productId);
      const nameMatch = prodObj ? prodObj.name.toLowerCase().includes(searchInput) : true;
      const batchMatch = batchFilter ? p.batchId.toLowerCase().includes(batchFilter) : true;
      const statusMatch = statusFilter === 'all' ? true : p.status.toLowerCase() === statusFilter.toLowerCase();
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

  tbody.innerHTML = pagedProd.map(pr => {
    const p = store.products.find(x => x.id === pr.productId) || { name: "Unknown" };
    const b = store.branches.find(x => x.id === pr.branchId) || { name: "Unknown Branch" };
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
  }).join('');

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
  const sortedWaste = [...store.waste]
    .filter(w => branchId === 'all' || w.branchId === branchId)
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

  tbody.innerHTML = pagedWaste.map(w => {
    const p = store.products.find(x => x.id === w.productId) || { name: "Unknown" };
    const b = store.branches.find(x => x.id === w.branchId) || { name: "Unknown Branch" };
    const totalCost = w.qty * w.cost;
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
  }).join('');

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

// 6. AI ANALYTICS CONTROLLER
async function refreshAIAnalyticsPane() {
  await renderAIDemandForecastChart();
  await renderDailyPredictionTable();
  await render7DayProjectionTable();
  await renderBakeRecommendations();
  renderRepurposingAlerts();
}

async function getAIPredictedDemand(productId) {
  const salesHistory = store.sales.filter(s => s.productId === productId);
  if (salesHistory.length === 0) return { demand: 30 };

  try {
    const response = await fetch('/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales: salesHistory })
    });
    if (response.ok) {
      const data = await response.json();
      return {
        demand: data.predicted_demand !== undefined ? data.predicted_demand : 30,
        metrics: data.metrics,
        insights: data.insights
      };
    }
  } catch (error) {
    console.error("AI Forecast error:", error);
  }

  // Fallback
  const qtySum = salesHistory.slice(-3).reduce((sum, s) => sum + s.qty, 0);
  const avg = Math.round(qtySum / Math.min(3, salesHistory.length));
  return { demand: Math.max(5, avg) };
}

async function renderAIDemandForecastChart() {
  const canvas = document.getElementById("chart-ai-demand-forecast");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (aiDemandChartInstance) aiDemandChartInstance.destroy();

  const labels = store.products.map(p => p.name.split(' (')[0]);
  const historicalAvg = store.products.map(p => {
    const pSales = store.sales.filter(s => s.productId === p.id);
    if (pSales.length === 0) return 0;
    return Math.round(pSales.reduce((sum, s) => sum + s.qty, 0) / pSales.length);
  });

  const aiResults = await Promise.all(store.products.map(p => getAIPredictedDemand(p.id)));
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

  // Hide AI Scoring Matrix section as requested
  const metricsEl = document.getElementById("ai-forecast-metrics");
  if (metricsEl) {
    metricsEl.style.display = "none";
  }
}

async function renderDailyPredictionTable() {
  const tbody = document.getElementById("ai-daily-prediction-tbody");
  if (!tbody) return;

  const predictions = await Promise.all(store.products.map(async p => {
    const pSales = store.sales.filter(s => s.productId === p.id);
    const histAvg = pSales.length === 0 ? 0 : Math.round(pSales.reduce((sum, s) => sum + s.qty, 0) / pSales.length);
    const forecastRes = await getAIPredictedDemand(p.id);
    const forecast = forecastRes.demand;
    const diff = forecast - histAvg;
    const diffPct = histAvg > 0 ? Math.round((diff / histAvg) * 100) : 0;

    let trendHtml = '';
    if (diff > 0) {
      trendHtml = `<span style="color: var(--color-success); font-weight: 700;">+${diff} pcs (+${diffPct}%) ▲</span>`;
    } else if (diff < 0) {
      trendHtml = `<span style="color: var(--color-error); font-weight: 700;">${diff} pcs (${diffPct}%) ▼</span>`;
    } else {
      trendHtml = `<span style="color: var(--text-secondary); font-weight: 600;">0 pcs (Stable)</span>`;
    }

    let statusBadge = '';
    if (diff >= 5) {
      statusBadge = `<span class="badge success" style="background: #dcfce7; color: #166534; font-weight: 700;">High Demand</span>`;
    } else if (diff <= -5) {
      statusBadge = `<span class="badge danger" style="background: #fee2e2; color: #991b1b; font-weight: 700;">Low Demand</span>`;
    } else {
      statusBadge = `<span class="badge info" style="background: #e0f2fe; color: #075985; font-weight: 700;">Stable Demand</span>`;
    }

    return `
      <tr>
        <td style="font-weight: 700;">${p.name}</td>
        <td>${p.category}</td>
        <td style="font-weight: 600;">${histAvg} pcs/day</td>
        <td style="font-weight: 800; color: var(--primary-color);">${forecast} pcs</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }));

  tbody.innerHTML = predictions.join('');
}

async function render7DayProjectionTable() {
  const trHead = document.getElementById("ai-7day-projection-thead-tr");
  const tbody = document.getElementById("ai-7day-projection-tbody");
  if (!tbody) return;

  if (trHead) {
    let ths = `<th>Product</th>`;
    for (let d = 1; d <= 7; d++) {
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() + d);
      const dateFormatted = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
      ths += `<th>Day ${d}<br><span style="font-size: 0.75rem; font-weight: normal; color: var(--text-secondary);">${dateFormatted}</span></th>`;
    }
    ths += `<th style="background: rgba(217, 119, 6, 0.1); color: var(--primary-color);">7-Day Total</th>`;
    trHead.innerHTML = ths;
  }

  const rows = await Promise.all(store.products.map(async p => {
    const forecastRes = await getAIPredictedDemand(p.id);
    const day1Forecast = forecastRes.demand;

    const dailyForecasts = [];
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() + (d + 1));
      const dayOfWeek = dayDate.getDay();
      let mult = 1.0;
      if (dayOfWeek === 0 || dayOfWeek === 6) mult = 1.25;
      else if (dayOfWeek === 5) mult = 1.15;
      else mult = 0.95;

      const f = Math.max(5, Math.round(day1Forecast * mult));
      dailyForecasts.push(f);
    }

    const total7 = dailyForecasts.reduce((sum, val) => sum + val, 0);

    const cols = dailyForecasts.map(f => `<td style="font-weight: 600;">${f} pcs</td>`).join('');
    return `
      <tr>
        <td style="font-weight: 700; color: var(--primary-color);">${p.name}</td>
        ${cols}
        <td style="font-weight: 800; color: var(--accent-color); background: rgba(217, 119, 6, 0.05);">${total7} pcs</td>
      </tr>
    `;
  }));

  tbody.innerHTML = rows.join('');
}

async function renderBakeRecommendations() {
  const container = document.getElementById("ai-recs-container");
  if (!container) return;
  container.innerHTML = "";

  const recsPromises = store.products.map(async p => {
    const currentStock = store.inventory
      .filter(i => i.productId === p.id)
      .reduce((sum, i) => sum + i.stockLevel, 0);

    const predictionResult = await getAIPredictedDemand(p.id);
    const prediction = predictionResult.demand;
    const safetyStock = 5;
    const recommendedBake = Math.max(0, prediction - currentStock + safetyStock);

    let reason = `The predicted demand is ${prediction} pieces. With a current stock of ${currentStock} pieces and a required safety buffer of ${safetyStock} pieces, a production run of ${recommendedBake} pieces is recommended.`;
    if (recommendedBake === 0) {
      reason = `The current stock of ${currentStock} pieces is sufficient to fulfill the predicted demand of ${prediction} pieces, inclusive of a ${safetyStock}-piece safety buffer. No additional production is required, preventing excess waste.`;
    }

    return { product: p.name, recommended: recommendedBake, reason };
  });

  const recs = await Promise.all(recsPromises);

  container.innerHTML = recs.map(r => `
    <div class="ai-recommendation-card" style="border-left-color: ${r.recommended > 0 ? 'var(--primary-color)' : 'var(--color-success)'}">
      <div class="rec-details">
        <span class="rec-title">${r.product}</span>
        <span class="rec-reason">${r.reason}</span>
      </div>
      <div class="rec-action" style="color: ${r.recommended > 0 ? 'var(--primary-color)' : 'var(--color-success)'}">
        ${r.recommended} pcs
      </div>
    </div>
  `).join('');
}

function renderRepurposingAlerts() {
  const container = document.getElementById("ai-repurpose-container");
  if (!container) return;
  container.innerHTML = "";

  const itemsToRepurposeMap = new Map();
  store.inventory.forEach(item => {
    const fIndex = getFreshnessIndex(item.productionDate, item.expiryDate);
    if (fIndex <= 30 && item.stockLevel > 0) {
      const p = store.products.find(x => x.id === item.productId);
      if (!p) return;
      if (itemsToRepurposeMap.has(p.id)) {
        const existing = itemsToRepurposeMap.get(p.id);
        existing.qty += item.stockLevel;
        existing.freshness = Math.min(existing.freshness, fIndex);
      } else {
        itemsToRepurposeMap.set(p.id, { productId: p.id, name: p.name, qty: item.stockLevel, recipe: p.repurposeRecipe, freshness: fIndex });
      }
    }
  });
  const itemsToRepurpose = Array.from(itemsToRepurposeMap.values());

  if (itemsToRepurpose.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--text-secondary);">
        <i data-lucide="sparkles" style="width: 32px; height: 32px; color: var(--accent-color); margin-bottom: 8px;"></i>
        <p>No products are currently approaching shelf-life expiration limits. Repurposing is not required.</p>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  container.innerHTML = itemsToRepurpose.map(item => `
    <div class="repurpose-card" id="repurpose-card-${item.productId}">
      <div class="repurpose-badge-top">
        <span class="repurpose-item-name">${item.name}</span>
        <span class="badge warning">${item.freshness}% Fresh</span>
      </div>
      <p style="font-size: 0.85rem;">Available excess stock: <strong>${item.qty} pcs</strong></p>
      <div class="repurpose-recipe">Suggested Recipe: "${item.recipe}"</div>
      <button class="btn-primary btn-repurpose-action" data-pid="${item.productId}" data-qty="${item.qty}" data-name="${item.name}" data-recipe="${item.recipe}" style="margin-top: 10px; width: 100%; font-size: 0.8rem; padding: 6px 12px; background: linear-gradient(135deg, #0284c7, #0369a1);">
        <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Mark as Repurposed
      </button>
    </div>
  `).join('');

  document.querySelectorAll(".btn-repurpose-action").forEach(btn => {
    btn.addEventListener("click", () => {
      const pid = btn.getAttribute("data-pid");
      const name = btn.getAttribute("data-name");
      const qty = parseInt(btn.getAttribute("data-qty") || 0);
      const recipe = btn.getAttribute("data-recipe");

      handleMarkAsRepurposed(pid, name, qty, recipe);
    });
  });

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function handleMarkAsRepurposed(productId, productName, qty, recipe, batchId) {
  const userBranchId = store.currentUser && store.currentUser.branch_id ? parseInt(store.currentUser.branch_id) : 1;

  // 1. Trigger POST /api/repurpose mutation to persist permanently in DB
  try {
    await fetch('/api/repurpose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        product_name: productName,
        quantity: qty,
        target_recipe: recipe,
        branch_id: userBranchId,
        batch_id: batchId || `batch_${Date.now()}`
      })
    });
  } catch (err) {
    console.warn("Backend API repurpose error (falling back to local state sync):", err.message);
  }

  // 2. Deduct/clear near-expiry inventory items and update batch status to "Repurposed"
  let remainingToDeduct = qty;
  store._inventory.forEach(item => {
    if ((item.productId === productId || String(item.productId) === String(productId)) && remainingToDeduct > 0) {
      const fIndex = getFreshnessIndex(item.productionDate, item.expiryDate);
      if (fIndex <= 30 && item.stockLevel > 0) {
        const deduct = Math.min(item.stockLevel, remainingToDeduct);
        item.stockLevel -= deduct;
        remainingToDeduct -= deduct;
        item.status = "Repurposed";
      }
    }
  });

  // Save updated state permanently
  store.save("bakewise_v2_inventory", store._inventory);
  store.commitAll();

  // Log system activity & display success toast alert
  store.logActivity(`Repurposed ${qty} pcs of ${productName} into "${recipe}". Waste prevented & stock updated!`, "inventory");
  showToast(`${productName} (${qty} pcs) successfully marked as repurposed into "${recipe}"`, "success");

  // 3. Cache invalidation & system-wide UI synchronization
  if (store.isBackendOnline) {
    try { await store.syncWithBackend(); } catch(e) {}
  }
  refreshDashboard();
  refreshInventoryPane();
  renderRepurposingAlerts();
  if (typeof refreshAIAnalyticsPane === 'function') refreshAIAnalyticsPane();
  if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
}
window.handleMarkAsRepurposed = handleMarkAsRepurposed;

function populateShelfBreadTypeDropdown() {
  const selectEl = document.getElementById("shelf-bread-type");
  if (!selectEl) return;

  const currentVal = selectEl.value;

  // Filter baked goods (exclude drinks / beverages)
  const bakedProducts = (store.products || []).filter(p => {
    const cat = (p.category || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    if (cat.includes('drink') || cat.includes('beverage') || name.includes('coke') || name.includes('sprite') || name.includes('water')) {
      return false;
    }
    return true;
  });

  if (bakedProducts.length === 0) return;

  selectEl.innerHTML = bakedProducts.map(p => {
    return `<option value="${p.id}">${p.name}</option>`;
  }).join('');

  if (currentVal && Array.from(selectEl.options).some(o => String(o.value) === String(currentVal))) {
    selectEl.value = currentVal;
  }
}

function refreshShelfLifePane() {
  populateShelfBreadTypeDropdown();
  renderRepurposingAlerts();
}

// 7. PRODUCT CATALOG VIEW REFRESHER
function refreshProductsPane() {
  populateShelfBreadTypeDropdown();
  const tbody = document.getElementById("products-tbody");
  const addBtn = document.getElementById("btn-add-product-modal");

  if (addBtn && !addBtn.dataset.listening) {
    addBtn.dataset.listening = "true";
    addBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.openEditProductModal) window.openEditProductModal();
    });
  }

  if (!tbody) return;

  const totalPages = Math.ceil(store.products.length / ITEMS_PER_PAGE) || 1;
  if (productsCurrentPage > totalPages) productsCurrentPage = totalPages;
  const startIndex = (productsCurrentPage - 1) * ITEMS_PER_PAGE;
  const pagedProducts = store.products.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  tbody.innerHTML = pagedProducts.map(p => `
    <tr>
      <td><code>${p.id}</code></td>
      <td style="font-weight: 700;">${p.name}</td>
      <td><span class="badge info">${p.category}</span></td>
      <td style="font-weight: 700; color: var(--primary-color);">₱${p.price.toFixed(2)}</td>
      <td>₱${p.cost.toFixed(2)}</td>
      <td>${p.shelfLifeDays} Days</td>
      <td style="font-size: 0.85rem; color: var(--text-secondary);">${p.repurposeRecipe}</td>
      <td style="vertical-align: middle;">
        <div style="display: flex; gap: 6px; align-items: center;">
          <button class="kanban-action-btn edit-product-btn" data-id="${p.id}" title="Edit Product"><i data-lucide="edit-3" style="width: 14px; height: 14px;"></i></button>
          <button class="kanban-action-btn delete-product-btn" data-id="${p.id}" title="Delete Product" style="color: var(--color-error);"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
        </div>
      </td>
    </tr>
  `).join('');

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
    let endDate = new Date();
    const allDates = [...store.sales.map(s => s.date), ...store.waste.map(w => w.date)].filter(d => d);
    if (allDates.length > 0) {
      const maxTime = Math.max(...allDates.map(d => parseLocalDate(d).getTime()));
      endDate = new Date(maxTime);
    }
    if (endDate > new Date()) endDate = new Date();
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

    reportSalesTbody.innerHTML = pagedProducts.map(p => {
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
    }).join('');

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

    reportWasteTbody.innerHTML = pagedProducts.map(p => {
      const pWaste = store.waste.filter(w => w.productId === p.id && w.date >= startDateStr && w.date <= endDateStr && (branchId === 'all' || w.branchId === branchId));
      const totalWaste = pWaste.reduce((sum, w) => sum + w.qty, 0);
      const costLost = totalWaste * p.cost;
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
    }).join('');

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

    reportEffTbody.innerHTML = pagedProducts.map(p => {
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
    }).join('');

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

  if (store.isBackendOnline) {
    try {
      const res = await fetch('/api/users');
      if (res.ok) store.users = await res.json();
    } catch (e) { console.error("Error fetching users:", e); }
  }

  const searchInput = document.getElementById("user-search-input");
  const roleFilter = document.getElementById("user-role-filter");

  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const roleVal = roleFilter ? roleFilter.value : "all";

  const filteredUsers = store.users.filter(u => {
    const matchQuery = !query || u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query);
    const matchRole = roleVal === "all" || u.role === roleVal;
    return matchQuery && matchRole;
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1;
  if (usersCurrentPage > totalPages) usersCurrentPage = totalPages;
  const startIndex = (usersCurrentPage - 1) * ITEMS_PER_PAGE;
  const pagedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  tbody.innerHTML = pagedUsers.map(u => {
    const branch = store.branches.find(b => b.id === u.branch_id);
    const branchName = branch ? branch.name : (u.role === 'admin' ? 'Global Network' : 'Main Branch (Central)');

    return `
      <tr>
        <td style="font-weight: 700;">${u.name}</td>
        <td><code>${u.email}</code></td>
        <td><span class="badge ${u.role === 'admin' ? 'danger' : u.role === 'manager' ? 'warning' : 'info'}">${store.getRoleLabel(u.role)}</span></td>
        <td>${branchName}</td>
        <td style="vertical-align: middle;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="kanban-action-btn edit-user-btn" data-id="${u.id}" title="Edit User Account" style="color: var(--primary-color); border: none; background: transparent; cursor: pointer;">
              <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
            </button>
            <button class="kanban-action-btn delete-user-btn" data-id="${u.id}" title="Delete User Account" style="color: var(--color-error); border: none; background: transparent; cursor: pointer;">
              <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
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
        document.getElementById("edit-usr-role").value = user.role;

        const branchSelect = document.getElementById("edit-usr-branch");
        if (branchSelect) {
          branchSelect.innerHTML = store.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
          branchSelect.value = user.branch_id || (store.branches[0] ? store.branches[0].id : '');
        }

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
  };
  if (btnUserModalClose) btnUserModalClose.onclick = closeUserModal;
  if (btnUserModalCancel) btnUserModalCancel.onclick = closeUserModal;

  document.querySelectorAll(".delete-user-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
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
  const tbody = document.getElementById("admin-branches-tbody");

  if (store.isBackendOnline) {
    try {
      const res = await fetch('/api/branches');
      if (res.ok) store.branches = await res.json();
    } catch (e) { console.error("Error fetching branches:", e); }
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
    tbody.innerHTML = pagedBranches.map(b => `
      <tr>
        <td><code>#${b.id}</code></td>
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
    `).join('');
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
          document.getElementById("edit-br-hours").value = branch.store_hours || '';
          document.getElementById("edit-br-contact").value = branch.contact_no || '';
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
        if (await showConfirmModal("Are you sure you want to remove this branch?")) {
          await store.deleteBranch(id);
          populateSelectDropdowns();
          await refreshAdminBranchesPane();
          showToast("Branch removed.", "info");
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
function setupShelfLifeModule() {
  populateShelfBreadTypeDropdown();

  const btnPredict = document.getElementById("btn-predict-shelf");
  if (!btnPredict) return;

  const tempSlider = document.getElementById("shelf-temp");
  const humidSlider = document.getElementById("shelf-humidity");
  const tempVal = document.getElementById("shelf-temp-val");
  const humidVal = document.getElementById("shelf-humidity-val");
  const dateInput = document.getElementById("shelf-date");
  
  // Set default date to today
  if (dateInput) {
    const today = new Date();
    dateInput.value = today.toISOString().split('T')[0];
  }

  // Update slider values dynamically
  if (tempSlider && tempVal) {
    tempSlider.addEventListener("input", (e) => {
      tempVal.textContent = e.target.value;
    });
  }
  if (humidSlider && humidVal) {
    humidSlider.addEventListener("input", (e) => {
      humidVal.textContent = e.target.value;
    });
  }

  // Prediction Logic
  btnPredict.addEventListener("click", () => {
    const selectEl = document.getElementById("shelf-bread-type");
    if (!selectEl || selectEl.options.length === 0) {
      populateShelfBreadTypeDropdown();
    }
    const breadTypeVal = selectEl ? selectEl.value : "";
    const selectedOption = selectEl && selectEl.selectedIndex >= 0 ? selectEl.options[selectEl.selectedIndex] : null;
    const breadName = selectedOption ? selectedOption.text : "Bread";

    const storage = document.getElementById("shelf-storage").value;
    const temp = parseInt(tempSlider.value, 10);
    const humid = parseInt(humidSlider.value, 10);
    const prodDateStr = dateInput.value;

    if (!prodDateStr) {
      alert("Please select a production date.");
      return;
    }

    // Calculate days since production
    const prodDate = new Date(prodDateStr);
    const today = new Date();
    const diffTime = today - prodDate;
    let daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (daysSince < 0) daysSince = 0;

    // Dynamic Base Shelf Life Lookup from Product Catalog
    const targetProduct = (store.products || []).find(p => String(p.id) === String(breadTypeVal) || p.name === breadName);

    let baseShelfLife = 3;
    if (targetProduct) {
      if (targetProduct.shelfLifeDays) {
        baseShelfLife = parseInt(targetProduct.shelfLifeDays, 10);
      } else {
        const pNameLower = targetProduct.name.toLowerCase();
        const pCatLower = (targetProduct.category || '').toLowerCase();
        if (pNameLower.includes('sliced') || pNameLower.includes('loaf')) baseShelfLife = 7;
        else if (pCatLower.includes('cake') || pNameLower.includes('cake')) baseShelfLife = 5;
        else if (pCatLower.includes('pastr') || pNameLower.includes('ensaymada') || pNameLower.includes('croissant') || pNameLower.includes('muffin')) baseShelfLife = 4;
        else baseShelfLife = 3;
      }
    } else {
      if (breadTypeVal === "pandesal") baseShelfLife = 3;
      else if (breadTypeVal === "sliced_bread") baseShelfLife = 7;
      else if (breadTypeVal === "ensaymada") baseShelfLife = 4;
      else if (breadTypeVal === "cake") baseShelfLife = 5;
    }

    // Apply storage modifiers
    let storageMsg = "";
    if (storage === "refrigerated") {
      baseShelfLife += 2;
      storageMsg = "Refrigeration extends shelf life.";
    } else if (storage === "open") {
      baseShelfLife -= 1;
      storageMsg = "Open storage accelerates staling and spoilage.";
    } else {
      storageMsg = "Sealed storage is appropriate for this bread type.";
    }

    // Apply Temp/Humidity modifiers
    let tempMsg = `Temperature ${temp}°C is within acceptable range.`;
    if (temp > 30) {
      baseShelfLife *= 0.7; // 30% reduction
      tempMsg = `High temperature (${temp}°C) accelerates mold growth.`;
    } else if (temp < 15 && storage !== "refrigerated") {
      tempMsg = `Cooler temperature helps maintain freshness.`;
    }

    let humidMsg = `Humidity ${humid}% is acceptable for bread storage.`;
    if (humid > 70) {
      baseShelfLife *= 0.8; // 20% reduction
      humidMsg = `High humidity (${humid}%) significantly increases spoilage risk.`;
    } else if (humid < 40) {
      baseShelfLife *= 0.9;
      humidMsg = `Low humidity (${humid}%) may cause bread to stale faster.`;
    }

    // Calculate Final metrics
    const remainingDays = Math.max(0, baseShelfLife - daysSince);
    let freshnessScore = 0;
    if (baseShelfLife > 0) {
      freshnessScore = Math.max(0, Math.min(100, (remainingDays / baseShelfLife) * 100));
    }

    // Determine Risk
    let risk = "Low Risk";
    let riskColor = "#22c55e"; // green
    if (freshnessScore <= 25) {
      risk = "High Risk";
      riskColor = "#ef4444"; // red
    } else if (freshnessScore <= 75) {
      risk = "Moderate Risk";
      riskColor = "#eab308"; // yellow
    }

    // Update UI
    document.getElementById("res-bread-name").textContent = breadName;
    document.getElementById("res-freshness").textContent = `${Math.round(freshnessScore)}%`;
    document.getElementById("res-freshness").style.color = riskColor;
    
    document.getElementById("res-days").textContent = `${remainingDays.toFixed(1)} Days`;
    
    document.getElementById("res-risk").textContent = risk;
    document.getElementById("res-risk").style.color = riskColor;
    document.getElementById("res-risk-icon").style.color = riskColor;
    
    if (risk === "High Risk") {
      document.getElementById("res-risk-icon").setAttribute("data-lucide", "alert-triangle");
    } else {
      document.getElementById("res-risk-icon").setAttribute("data-lucide", "check-square");
    }
    lucide.createIcons();

    // Update progress bar
    document.getElementById("res-freshness-bar-text").textContent = `${Math.round(freshnessScore)}%`;
    document.getElementById("res-freshness-bar-text").style.color = riskColor;
    const bar = document.getElementById("res-freshness-bar");
    bar.style.width = `${freshnessScore}%`;
    bar.style.backgroundColor = riskColor;

    // Update Messages
    document.getElementById("res-msg-temp").textContent = tempMsg;
    document.getElementById("res-msg-humid").textContent = humidMsg;
    document.getElementById("res-msg-storage").textContent = storageMsg;

  });
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
        announcementTarget.innerHTML = '<option value="all">All Branches (Entire Business)</option>';
        store.branches.forEach(b => {
          announcementTarget.innerHTML += `<option value="${b.id}">${b.name}</option>`;
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
    listContainer.innerHTML = "";
    
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
      listContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted);">No new notifications.</div>`;
      return;
    }

    relevantNotifs.forEach(notif => {
      const item = document.createElement("div");
      const isRead = notif.readBy && notif.readBy.includes(user.email);
      item.className = `notification-item ${isRead ? '' : 'unread'}`;
      
      const timeStr = formatRelativeTime(notif.timestamp);
      const typeBadge = notif.type === 'announcement' ? '<span style="background:var(--accent-color);color:white;padding:2px 4px;border-radius:4px;font-size:0.6rem;margin-right:5px;">ANNOUNCEMENT</span> ' : '';
      
      item.innerHTML = `
        <span class="notification-message">${typeBadge}${notif.message}</span>
        <span class="notification-time">${timeStr}</span>
      `;

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
  const shelfTemp = document.getElementById("shelf-temp");
  const shelfTempVal = document.getElementById("shelf-temp-val");
  const shelfHumid = document.getElementById("shelf-humidity");
  const shelfHumidVal = document.getElementById("shelf-humidity-val");

  if (shelfTemp && shelfTempVal) {
    shelfTemp.addEventListener("input", (e) => shelfTempVal.textContent = e.target.value);
  }
  if (shelfHumid && shelfHumidVal) {
    shelfHumid.addEventListener("input", (e) => shelfHumidVal.textContent = e.target.value);
  }

  const btnPredictShelf = document.getElementById("btn-predict-shelf");
  if (btnPredictShelf) {
    btnPredictShelf.addEventListener("click", () => {
      const breadTypeEl = document.getElementById("shelf-bread-type");
      const breadType = breadTypeEl.value;
      const breadName = breadTypeEl.options[breadTypeEl.selectedIndex].text;
      const storage = document.getElementById("shelf-storage").value;
      const temp = parseInt(document.getElementById("shelf-temp").value);
      const humid = parseInt(document.getElementById("shelf-humidity").value);
      const prodDate = document.getElementById("shelf-date").value;

      if (!prodDate) {
        if (typeof showToast === 'function') showToast("Please select a Production Date.", "error");
        return;
      }

      // Base shelf life in days based on Bread Type
      let baseShelfLife = 3;
      if (breadType === "pandesal") baseShelfLife = 3;
      else if (breadType === "sliced_bread") baseShelfLife = 7;
      else if (breadType === "ensaymada") baseShelfLife = 5;
      else if (breadType === "cake") baseShelfLife = 4;

      // Calculate Modifiers
      let multiplier = 1.0;
      if (storage === "refrigerated") multiplier *= 1.5;
      else if (storage === "open") multiplier *= 0.5;

      if (temp > 30) multiplier *= 0.7; 
      else if (temp < 20) multiplier *= 1.1; 

      if (humid > 70) multiplier *= 0.6; 
      else if (humid < 40) multiplier *= 0.8; 
      else multiplier *= 1.1; 

      let totalShelfLife = Math.max(1, Math.round(baseShelfLife * multiplier));

      // Calculate Remaining Days and Freshness
      const today = new Date();
      today.setHours(0,0,0,0);
      const pDate = new Date(prodDate);
      pDate.setHours(0,0,0,0);
      
      const diffTime = today - pDate;
      const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      let remainingDays = totalShelfLife - daysElapsed;
      let freshnessScore = 0;
      
      if (remainingDays <= 0) {
        remainingDays = 0;
        freshnessScore = 0;
      } else if (daysElapsed < 0) {
        remainingDays = totalShelfLife;
        freshnessScore = Math.min(100, Math.max(0, Math.round((totalShelfLife / baseShelfLife) * 100)));
      } else {
        freshnessScore = Math.min(100, Math.max(0, Math.round((remainingDays / baseShelfLife) * 100)));
      }

      // Update UI elements
      document.getElementById("res-bread-name").textContent = breadName;
      document.getElementById("res-freshness").textContent = freshnessScore + "%";
      document.getElementById("res-days").textContent = remainingDays + " Days";

      const freshnessBar = document.getElementById("res-freshness-bar");
      const freshnessBarText = document.getElementById("res-freshness-bar-text");
      freshnessBar.style.width = freshnessScore + "%";
      freshnessBarText.textContent = freshnessScore + "%";

      let risk = "Low";
      let riskColor = "#22c55e"; // Green
      let riskIcon = "check-square";
      
      if (freshnessScore <= 25) {
        risk = "High";
        riskColor = "#ef4444"; // Red
        riskIcon = "alert-triangle";
        freshnessBar.style.backgroundColor = "#ef4444";
      } else if (freshnessScore <= 75) {
        risk = "Moderate";
        riskColor = "#eab308"; // Yellow
        riskIcon = "alert-circle";
        freshnessBar.style.backgroundColor = "#eab308";
      } else {
        freshnessBar.style.backgroundColor = "#22c55e";
      }
      
      const resRisk = document.getElementById("res-risk");
      resRisk.textContent = risk;
      resRisk.style.color = riskColor;
      
      document.getElementById("res-freshness").style.color = riskColor;
      freshnessBarText.style.color = riskColor;

      const riskIconEl = document.getElementById("res-risk-icon");
      if (riskIconEl && typeof lucide !== 'undefined') {
        riskIconEl.setAttribute("data-lucide", riskIcon);
        riskIconEl.style.color = riskColor;
        lucide.createIcons();
      }

      // Generate Analysis Messages
      let tempMsg = temp > 30 ? `High temp (${temp}°C) accelerates spoilage.` : temp < 20 ? `Cool temp (${temp}°C) extends shelf life.` : `Optimal room temperature (${temp}°C).`;
      let humidMsg = humid > 70 ? `High humidity (${humid}%) risks rapid mold growth.` : humid < 40 ? `Low humidity (${humid}%) risks rapid staling.` : `Ideal humidity (${humid}%) preserves texture.`;
      let storageMsg = storage === "sealed" ? "Sealed packaging protects from air." : storage === "refrigerated" ? "Refrigeration slows mold but may cause staling." : "Open storage exposes product to contaminants.";

      document.getElementById("res-msg-temp").textContent = tempMsg;
      document.getElementById("res-msg-temp").style.color = temp > 30 ? "#ef4444" : "var(--text-secondary)";
      
      document.getElementById("res-msg-humid").textContent = humidMsg;
      document.getElementById("res-msg-humid").style.color = (humid > 70 || humid < 40) ? "#f59e0b" : "var(--text-secondary)";
      
      document.getElementById("res-msg-storage").textContent = storageMsg;
      document.getElementById("res-msg-storage").style.color = storage === "open" ? "#ef4444" : "var(--text-secondary)";
    });
  }
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
    if(el) el.addEventListener('input', () => { userCurrentPage = 1; refreshAdminUsersPane(); });
  });
}
document.addEventListener('DOMContentLoaded', () => {
  setupPOSModule();
  setTimeout(setupFilters, 500);
});
