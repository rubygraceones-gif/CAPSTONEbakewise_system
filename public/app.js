/* ==========================================================================
   BAKEWISE APPLICATION LOGIC
   AI-Powered Bakery Management System Client Code
   ========================================================================== */

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
  { id: "p1", name: "Pandesal (10pcs/pack)", category: "Bread", price: 45, cost: 18, shelfLifeDays: 2, repurposeRecipe: "Garlic Croutons or Fine Breadcrumbs" },
  { id: "p2", name: "Special Ensaymada", category: "Pastries", price: 30, cost: 12, shelfLifeDays: 3, repurposeRecipe: "Baked Ensaymada Pudding" },
  { id: "p3", name: "Classic Sliced Bread", category: "Bread", price: 65, cost: 28, shelfLifeDays: 4, repurposeRecipe: "Cinnamon Bread Pudding or French Toast Sliders" },
  { id: "p4", name: "Premium Chocolate Cake", category: "Cakes", price: 380, cost: 160, shelfLifeDays: 5, repurposeRecipe: "Chocolate Truffle Cake Pops" },
  { id: "p5", name: "Spanish Bread", category: "Bread", price: 10, cost: 4, shelfLifeDays: 2, repurposeRecipe: "Bread Pudding Base" },
  { id: "p6", name: "Butter Croissant", category: "Pastries", price: 50, cost: 22, shelfLifeDays: 2, repurposeRecipe: "Double Baked Almond Croissants" }
];

const DEFAULT_SALES = [
  { id: "s1", productId: "p1", qty: 45, price: 45, date: getRelativeDateString(-6), cashier: "Sales Staff", branchId: 1 },
  { id: "s2", productId: "p2", qty: 28, price: 30, date: getRelativeDateString(-6), cashier: "Sales Staff", branchId: 1 },
  { id: "s3", productId: "p3", qty: 20, price: 65, date: getRelativeDateString(-6), cashier: "Sales Staff", branchId: 1 },
  { id: "s4", productId: "p5", qty: 65, price: 10, date: getRelativeDateString(-6), cashier: "Sales Staff", branchId: 1 },
  { id: "s5", productId: "p1", qty: 48, price: 45, date: getRelativeDateString(-5), cashier: "Sales Staff", branchId: 1 },
  { id: "s6", productId: "p2", qty: 32, price: 30, date: getRelativeDateString(-5), cashier: "Sales Staff", branchId: 1 },
  { id: "s7", productId: "p3", qty: 22, price: 65, date: getRelativeDateString(-5), cashier: "Sales Staff", branchId: 1 },
  { id: "s8", productId: "p6", qty: 15, price: 50, date: getRelativeDateString(-5), cashier: "Sales Staff", branchId: 1 },
  { id: "s9", productId: "p1", qty: 52, price: 45, date: getRelativeDateString(-4), cashier: "Sales Staff", branchId: 1 },
  { id: "s10", productId: "p2", qty: 30, price: 30, date: getRelativeDateString(-4), cashier: "Sales Staff", branchId: 1 },
  { id: "s11", productId: "p3", qty: 25, price: 65, date: getRelativeDateString(-4), cashier: "Sales Staff", branchId: 1 },
  { id: "s12", productId: "p5", qty: 72, price: 10, date: getRelativeDateString(-4), cashier: "Sales Staff", branchId: 1 },
  { id: "s13", productId: "p1", qty: 60, price: 45, date: getRelativeDateString(-3), cashier: "Sales Staff", branchId: 1 },
  { id: "s14", productId: "p2", qty: 42, price: 30, date: getRelativeDateString(-3), cashier: "Sales Staff", branchId: 1 },
  { id: "s15", productId: "p3", qty: 28, price: 65, date: getRelativeDateString(-3), cashier: "Sales Staff", branchId: 1 },
  { id: "s16", productId: "p6", qty: 20, price: 50, date: getRelativeDateString(-3), cashier: "Sales Staff", branchId: 1 },
  { id: "s17", productId: "p1", qty: 65, price: 45, date: getRelativeDateString(-2), cashier: "Sales Staff", branchId: 1 },
  { id: "s18", productId: "p2", qty: 38, price: 30, date: getRelativeDateString(-2), cashier: "Sales Staff", branchId: 1 },
  { id: "s19", productId: "p3", qty: 30, price: 65, date: getRelativeDateString(-2), cashier: "Sales Staff", branchId: 1 },
  { id: "s20", productId: "p5", qty: 85, price: 10, date: getRelativeDateString(-2), cashier: "Sales Staff", branchId: 1 },
  { id: "s21", productId: "p1", qty: 50, price: 45, date: getRelativeDateString(-1), cashier: "Sales Staff", branchId: 1 },
  { id: "s22", productId: "p2", qty: 35, price: 30, date: getRelativeDateString(-1), cashier: "Sales Staff", branchId: 1 },
  { id: "s23", productId: "p3", qty: 18, price: 65, date: getRelativeDateString(-1), cashier: "Sales Staff", branchId: 1 },
  { id: "s24", productId: "p6", qty: 12, price: 50, date: getRelativeDateString(-1), cashier: "Sales Staff", branchId: 1 },
  { id: "s25", productId: "p1", qty: 40, price: 45, date: getRelativeDateString(0), cashier: "Sales Staff", branchId: 1 },
  { id: "s26", productId: "p2", qty: 25, price: 30, date: getRelativeDateString(0), cashier: "Sales Staff", branchId: 1 },
  { id: "s27", productId: "p3", qty: 15, price: 65, date: getRelativeDateString(0), cashier: "Sales Staff", branchId: 1 }
];

const DEFAULT_INVENTORY = [
  { id: "i1", productId: "p1", stockLevel: 30, productionDate: getRelativeDateString(-1), expiryDate: getRelativeDateString(1), branchId: 1 },
  { id: "i2", productId: "p2", stockLevel: 15, productionDate: getRelativeDateString(-2), expiryDate: getRelativeDateString(1), branchId: 1 },
  { id: "i3", productId: "p3", stockLevel: 12, productionDate: getRelativeDateString(-3), expiryDate: getRelativeDateString(1), branchId: 1 },
  { id: "i4", productId: "p4", stockLevel: 4, productionDate: getRelativeDateString(-4), expiryDate: getRelativeDateString(1), branchId: 1 },
  { id: "i5", productId: "p5", stockLevel: 50, productionDate: getRelativeDateString(-1), expiryDate: getRelativeDateString(1), branchId: 1 },
  { id: "i6", productId: "p6", stockLevel: 8, productionDate: getRelativeDateString(0), expiryDate: getRelativeDateString(2), branchId: 1 }
];

const DEFAULT_PRODUCTION = [
  { id: "pr1", productId: "p1", planned: 80, actual: 80, date: getRelativeDateString(-1), baker: "Baking Specialist", status: "Completed", code: "B-260717-01", branchId: 1 },
  { id: "pr2", productId: "p2", planned: 40, actual: 40, date: getRelativeDateString(-1), baker: "Baking Specialist", status: "Completed", code: "B-260717-02", branchId: 1 },
  { id: "pr3", productId: "p3", planned: 25, actual: 23, date: getRelativeDateString(-1), baker: "Baking Specialist", status: "Completed", code: "B-260717-03", branchId: 1 },
  { id: "pr4", productId: "p5", planned: 100, actual: 100, date: getRelativeDateString(-1), baker: "Baking Specialist", status: "Completed", code: "B-260717-04", branchId: 1 },
  { id: "pr5", productId: "p6", planned: 20, actual: 20, date: getRelativeDateString(0), baker: "Baking Specialist", status: "Completed", code: "B-260718-01", branchId: 1 }
];

const DEFAULT_WASTE = [
  { id: "w1", productId: "p1", qty: 10, cost: 18, reason: "Expired", date: getRelativeDateString(-4), branchId: 1 },
  { id: "w2", productId: "p2", qty: 5, cost: 12, reason: "Expired", date: getRelativeDateString(-3), branchId: 1 },
  { id: "w3", productId: "p3", qty: 2, cost: 28, reason: "Damaged", date: getRelativeDateString(-2), branchId: 1 },
  { id: "w4", productId: "p6", qty: 4, cost: 22, reason: "Quality Defect", date: getRelativeDateString(-1), branchId: 1 }
];

// --- APP STATE CONTROLLER ---
class BakeWiseStore {
  constructor() {
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
    this.currentUser = JSON.parse(localStorage.getItem("bakewise_v2_session") || null);
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
        }

        // Fetch inventory
        const iRes = await fetch(`/api/inventory${queryStr}`);
        if (iRes.ok) {
          const fetchedInv = await iRes.json();
          this._inventory = fetchedInv.map(inv => ({
            id: inv.id.toString(),
            productId: inv.product_id,
            stockLevel: parseInt(inv.stock_level),
            productionDate: inv.production_date ? inv.production_date.split('T')[0] : getRelativeDateString(0),
            expiryDate: inv.expiry_date ? inv.expiry_date.split('T')[0] : getRelativeDateString(1),
            branchId: inv.branch_id
          }));
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

    if (this.isBackendOnline) {
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
            roleLabel: this.getRoleLabel(user.role)
          };
          localStorage.setItem("bakewise_v2_session", JSON.stringify(this.currentUser));
          return this.currentUser;
        }
      } catch (e) {
        console.error("Auth login failed", e);
      }
    }

    const matchedUser = this.users.find(u => 
      u.email.toLowerCase() === cleanEmail ||
      u.email.toLowerCase().replace('@rosebakeshop.com', '@bakewise.com') === cleanEmail ||
      u.email.toLowerCase().replace('@bakewise.com', '@rosebakeshop.com') === cleanEmail
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
      localStorage.setItem("bakewise_v2_session", JSON.stringify(this.currentUser));
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
      localStorage.setItem("bakewise_v2_session", JSON.stringify(this.currentUser));
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
    localStorage.removeItem("bakewise_v2_session");
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

  async addInventory(productId, stockQty, prodDate, expDate) {
    const parsedQty = parseInt(stockQty);
    if (isNaN(parsedQty) || parsedQty <= 0) return false;
    const branchId = this.getSelectedBranchId() === 'all' ? 1 : parseInt(this.getSelectedBranchId());

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

  // Handle branch switcher changes
  const switcher = document.getElementById("branch-switcher-select");
  if (switcher) {
    switcher.addEventListener("change", () => {
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
      "pane-ai-analytics": "Artificial Intelligence Analytics",
      "pane-products": "Product Catalog & Pricing Directory",
      "pane-reports": "Performance Reporting Dashboard",
      "pane-admin-users": "Staff Directory & Accounts Manager",
      "pane-admin-branches": "Bakeshop Network Branches"
    };
    document.getElementById("current-view-title").textContent = titleMap[paneId] || "BakeWise App";
    if (sidebar) sidebar.classList.remove("open");
  }

  if (targetNav) targetNav.classList.add("active");

  if (paneId === "pane-dashboard") refreshDashboard();
  else if (paneId === "pane-sales") refreshSalesPane();
  else if (paneId === "pane-inventory") refreshInventoryPane();
  else if (paneId === "pane-production") refreshProductionPane();
  else if (paneId === "pane-waste") refreshWastePane();
  else if (paneId === "pane-ai-analytics") refreshAIAnalyticsPane();
  else if (paneId === "pane-products") refreshProductsPane();
  else if (paneId === "pane-reports") refreshReportsPane();
  else if (paneId === "pane-admin-users") refreshAdminUsersPane();
  else if (paneId === "pane-admin-branches") refreshAdminBranchesPane();
}

// --- SESSION CHECK ---
async function checkSessionState() {
  const loginView = document.getElementById("login-view");
  const appView = document.getElementById("app-view");

  if (store.currentUser) {
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
      } else if (store.currentUser.role === 'manager') {
        branchSwitcher.style.display = 'flex';
        const userBranch = store.branches.find(b => b.id === store.currentUser.branch_id);
        const branchName = userBranch ? userBranch.name : `Branch ${store.currentUser.branch_id}`;
        switcherSelect.innerHTML = `<option value="${store.currentUser.branch_id}">${branchName}</option>`;
        switcherSelect.disabled = true;
      } else {
        branchSwitcher.style.display = 'none';
      }
    }

    const activePane = document.querySelector(".view-pane.active");
    if (activePane) navigateToPane(activePane.id);
    else navigateToPane("pane-dashboard");
  } else {
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

  const optionsHTML = store.products.map(p => `<option value="${p.id}">${p.name} (${p.category})</option>`).join('');

  if (selectSales) selectSales.innerHTML = optionsHTML;
  if (selectInv) selectInv.innerHTML = optionsHTML;
  if (selectProd) selectProd.innerHTML = optionsHTML;
  if (selectWaste) selectWaste.innerHTML = optionsHTML;

  if (selectUsrBranch) {
    selectUsrBranch.innerHTML = store.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
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
      const email = document.getElementById("usr-email-input").value;
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
      const lat = document.getElementById("br-lat-input").value;
      const lng = document.getElementById("br-lng-input").value;
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
      const email = document.getElementById("edit-usr-email").value;
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

  const openModal = () => {
    modal.style.display = "block";
    overlay.style.display = "block";
    document.getElementById("inv-prod-date").value = formatLocalDate(new Date());

    const prodSelect = document.getElementById("inv-select-product");
    const pId = prodSelect.value;
    const product = store.products.find(p => p.id === pId);
    const shelfLife = product ? product.shelfLifeDays : 2;

    const expDate = new Date();
    expDate.setDate(expDate.getDate() + shelfLife);
    document.getElementById("inv-exp-date").value = formatLocalDate(expDate);
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
      const pId = document.getElementById("inv-select-product").value;
      const qty = document.getElementById("inv-stock-input").value;
      const prodDate = document.getElementById("inv-prod-date").value;
      const expDate = document.getElementById("inv-exp-date").value;

      await store.addInventory(pId, qty, prodDate, expDate);
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

function showConfirmModal(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirm-modal");
    const overlay = document.getElementById("confirm-modal-overlay");
    const msgEl = document.getElementById("confirm-modal-message");
    const okBtn = document.getElementById("btn-confirm-ok");
    const cancelBtn = document.getElementById("btn-confirm-cancel");

    msgEl.textContent = message;
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
  const today = parseLocalDate(formatLocalDate(new Date()));
  const start = parseLocalDate(productionDateStr);
  const end = parseLocalDate(expiryDateStr);

  const totalSpan = end.getTime() - start.getTime();
  const elapsed = today.getTime() - start.getTime();

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

  const salesToday = store.sales
    .filter(s => s.date === latestDateStr)
    .reduce((sum, s) => sum + (s.qty * s.price), 0);
  document.getElementById("dash-sales-value").textContent = `₱${salesToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const wasteToday = store.waste
    .filter(w => w.date === latestDateStr)
    .reduce((sum, w) => sum + (w.qty * w.cost), 0);
  document.getElementById("dash-waste-value").textContent = `₱${wasteToday.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  let expiryCount = 0;
  store.inventory.forEach(item => {
    const fIndex = getFreshnessIndex(item.productionDate, item.expiryDate);
    if (fIndex <= 30 && item.stockLevel > 0) expiryCount++;
  });
  document.getElementById("dash-expiry-value").textContent = `${expiryCount} items`;

  const totalStock = store.inventory.reduce((sum, i) => sum + i.stockLevel, 0);
  document.getElementById("dash-stock-value").textContent = `${totalStock.toLocaleString()} pcs`;

  renderDashboardSalesWasteChart();
  renderDashboardBranchesChart();
  renderRealtimeAlerts();
}

function renderDashboardSalesWasteChart() {
  const ctx = document.getElementById("chart-dashboard-sales-waste").getContext("2d");
  if (dashSalesChartInstance) dashSalesChartInstance.destroy();

  const labels = [];
  const salesData = [];
  const wasteData = [];

  let latestDate = new Date();
  const allDates = [...store.sales.map(s => s.date), ...store.waste.map(w => w.date)].filter(d => d);
  if (allDates.length > 0) {
    const maxTime = Math.max(...allDates.map(d => parseLocalDate(d).getTime()));
    latestDate = new Date(maxTime);
  }
  if (latestDate > new Date()) latestDate = new Date(); // cap at today

  for (let i = 6; i >= 0; i--) {
    const d = new Date(latestDate);
    d.setDate(d.getDate() - i);
    const dStr = formatLocalDate(d);
    
    labels.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }));

    const daySales = store.sales.filter(s => s.date === dStr).reduce((sum, s) => sum + (s.qty * s.price), 0);
    salesData.push(daySales);

    const dayWaste = store.waste.filter(w => w.date === dStr).reduce((sum, w) => sum + (w.qty * w.cost), 0);
    wasteData.push(dayWaste);
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

function renderDashboardBranchesChart() {
  const ctx = document.getElementById("chart-dashboard-branches").getContext("2d");
  if (dashBranchesChartInstance) dashBranchesChartInstance.destroy();

  const totalPages = Math.ceil(store.branches.length / CHART_BRANCHES_PER_PAGE);
  if (dashBranchesChartPage > totalPages && totalPages > 0) dashBranchesChartPage = totalPages;

  const startIdx = (dashBranchesChartPage - 1) * CHART_BRANCHES_PER_PAGE;
  const paginatedBranches = store.branches.slice(startIdx, startIdx + CHART_BRANCHES_PER_PAGE);

  const branchLabels = paginatedBranches.map(b => b.name);
  const salesData = paginatedBranches.map(b => {
    return store.sales
      .filter(s => s.branchId === b.id)
      .reduce((sum, s) => sum + (s.qty * s.price), 0);
  });
  
  const wasteData = paginatedBranches.map(b => {
    return store.waste
      .filter(w => w.branchId === b.id)
      .reduce((sum, w) => sum + (w.qty * w.cost), 0);
  });

  const prevBtn = document.getElementById("chart-branches-prev");
  const nextBtn = document.getElementById("chart-branches-next");
  const infoSpan = document.getElementById("chart-branches-info");
  
  if (prevBtn) {
    prevBtn.disabled = dashBranchesChartPage === 1;
    prevBtn.onclick = () => {
      if (dashBranchesChartPage > 1) {
        dashBranchesChartPage--;
        renderDashboardBranchesChart();
      }
    };
  }
  
  if (nextBtn) {
    nextBtn.disabled = dashBranchesChartPage >= totalPages;
    nextBtn.onclick = () => {
      if (dashBranchesChartPage < totalPages) {
        dashBranchesChartPage++;
        renderDashboardBranchesChart();
      }
    };
  }
  
  if (infoSpan) {
    infoSpan.textContent = `Page ${dashBranchesChartPage} of ${totalPages || 1}`;
  }

  dashBranchesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: branchLabels,
      datasets: [
        {
          label: 'Total Sales (₱)',
          data: salesData,
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'Total Waste (₱)',
          data: wasteData,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { 
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₱' + value.toLocaleString();
            }
          }
        }
      },
      plugins: {
        legend: { position: 'top' },
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
}

function renderRealtimeAlerts() {
  const container = document.getElementById("dashboard-ai-alerts-container");
  if (!container) return;
  container.innerHTML = "";
  const alerts = [];

  store.inventory.forEach(item => {
    if (item.stockLevel > 0) {
      const p = store.products.find(x => x.id === item.productId);
      if (!p) return;
      const fIndex = getFreshnessIndex(item.productionDate, item.expiryDate);
      const b = store.branches.find(x => x.id === item.branchId) || { name: "Unknown Branch" };

      if (fIndex === 0) {
        alerts.push({
          type: "danger",
          title: "Critical Expiration Hazard",
          description: `[${b.name}] Batch of ${item.stockLevel} units of ${p.name} has expired! Record to waste log immediately.`
        });
      } else if (fIndex <= 30) {
        alerts.push({
          type: "warning",
          title: "Shelf-Life Expiry Imminent",
          description: `[${b.name}] ${p.name} on shelf has only ${fIndex}% freshness left (${item.stockLevel} pcs). Suggested repurposing: "${p.repurposeRecipe}".`
        });
      }
    }
  });

  const last3DaysWaste = store.waste
    .filter(w => {
      const wDate = parseLocalDate(w.date);
      const limit = parseLocalDate(getRelativeDateString(-3));
      return wDate >= limit;
    })
    .reduce((sum, w) => sum + (w.qty * w.cost), 0);

  if (last3DaysWaste > 800) {
    alerts.push({
      type: "info",
      title: "Waste Reduction Strategy Required",
      description: `High waste (₱${last3DaysWaste.toLocaleString()}) logged over last 3 days. Check AI optimization model before scheduling tomorrow's bake.`
    });
  }

  if (alerts.length === 0) {
    container.innerHTML = `
      <div class="alert-box success">
        <i data-lucide="check-circle" class="alert-icon"></i>
        <div class="alert-content">
          <span class="alert-title">Systems Nominal</span>
          <span class="alert-description">No expiration hazards or high waste incidents detected. Production matches daily demand.</span>
        </div>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  const totalPages = Math.ceil(alerts.length / AI_ALERTS_PER_PAGE) || 1;
  if (aiAlertsCurrentPage > totalPages) aiAlertsCurrentPage = totalPages;
  const startIndex = (aiAlertsCurrentPage - 1) * AI_ALERTS_PER_PAGE;
  const pagedAlerts = alerts.slice(startIndex, startIndex + AI_ALERTS_PER_PAGE);

  const prevBtn = document.getElementById("ai-alerts-prev");
  const nextBtn = document.getElementById("ai-alerts-next");
  const infoSpan = document.getElementById("ai-alerts-info");
  
  if (prevBtn) {
    prevBtn.disabled = aiAlertsCurrentPage === 1;
    prevBtn.onclick = () => {
      if (aiAlertsCurrentPage > 1) {
        aiAlertsCurrentPage--;
        renderRealtimeAlerts();
      }
    };
  }
  
  if (nextBtn) {
    nextBtn.disabled = aiAlertsCurrentPage >= totalPages;
    nextBtn.onclick = () => {
      if (aiAlertsCurrentPage < totalPages) {
        aiAlertsCurrentPage++;
        renderRealtimeAlerts();
      }
    };
  }
  
  if (infoSpan) {
    infoSpan.textContent = `Page ${aiAlertsCurrentPage} of ${totalPages}`;
  }

  container.innerHTML = pagedAlerts.map(a => `
    <div class="alert-box ${a.type}">
      <i data-lucide="${a.type === 'danger' ? 'x-circle' : a.type === 'warning' ? 'alert-triangle' : 'info'}" class="alert-icon"></i>
      <div class="alert-content">
        <span class="alert-title">${a.title}</span>
        <span class="alert-description">${a.description}</span>
      </div>
    </div>
  `).join('');

  lucide.createIcons();
}

// 2. SALES RECORD VIEW REFRESHER
function refreshSalesPane() {
  const tbody = document.getElementById("sales-history-tbody");
  if (!tbody) return;

  const sortedSales = [...store.sales].sort((a, b) => {
    const dA = parseLocalDate(a.date);
    const dB = parseLocalDate(b.date);
    return dB.getTime() - dA.getTime();
  });
  const totalPages = Math.ceil(sortedSales.length / ITEMS_PER_PAGE) || 1;
  if (salesHistCurrentPage > totalPages) salesHistCurrentPage = totalPages;
  const startIndex = (salesHistCurrentPage - 1) * ITEMS_PER_PAGE;
  const pagedSales = sortedSales.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  tbody.innerHTML = pagedSales.map(s => {
    const p = store.products.find(x => x.id === s.productId) || { name: "Unknown", price: 0 };
    const b = store.branches.find(x => x.id === s.branchId) || { name: "Unknown Branch" };
    const total = s.qty * s.price;
    const dateObj = parseLocalDate(s.date);
    return `
      <tr>
        <td style="font-weight: 600;">${p.name}</td>
        <td style="color: var(--text-secondary); font-size: 0.85rem;">${b.name}</td>
        <td>${s.qty} packs/pcs</td>
        <td>₱${s.price.toFixed(2)}</td>
        <td style="font-weight: 600; color: var(--primary-color);">₱${total.toFixed(2)}</td>
        <td>${dateObj.toLocaleDateString()}</td>
      </tr>
    `;
  }).join('');

  const prevBtn = document.getElementById("sales-hist-prev-page");
  const nextBtn = document.getElementById("sales-hist-next-page");
  const pageInfo = document.getElementById("sales-hist-page-info");

  if (pageInfo) pageInfo.textContent = `Page ${salesHistCurrentPage} of ${totalPages}`;
  if (prevBtn) {
    prevBtn.disabled = salesHistCurrentPage <= 1;
    prevBtn.style.opacity = salesHistCurrentPage <= 1 ? "0.5" : "1";
    prevBtn.onclick = () => {
      if (salesHistCurrentPage > 1) {
        salesHistCurrentPage--;
        refreshSalesPane();
      }
    };
  }
  if (nextBtn) {
    nextBtn.disabled = salesHistCurrentPage >= totalPages;
    nextBtn.style.opacity = salesHistCurrentPage >= totalPages ? "0.5" : "1";
    nextBtn.onclick = () => {
      if (salesHistCurrentPage < totalPages) {
        salesHistCurrentPage++;
        refreshSalesPane();
      }
    };
  }
}

// 3. INVENTORY CHECK VIEW REFRESHER
function refreshInventoryPane() {
  const tbody = document.getElementById("inventory-tbody");
  if (!tbody) return;

  const totalPages = Math.ceil(store.inventory.length / ITEMS_PER_PAGE) || 1;
  if (inventoryCurrentPage > totalPages) inventoryCurrentPage = totalPages;
  const startIndex = (inventoryCurrentPage - 1) * ITEMS_PER_PAGE;
  const pagedInventory = store.inventory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

    const pDate = parseLocalDate(item.productionDate);
    const eDate = parseLocalDate(item.expiryDate);
    const b = store.branches.find(x => x.id === item.branchId) || { name: "Unknown Branch" };

    return `
      <tr>
        <td style="font-weight: 700;">${p.name}</td>
        <td style="color: var(--text-secondary); font-size: 0.85rem;">${b.name}</td>
        <td>${p.category}</td>
        <td>${item.stockLevel} pcs</td>
        <td>${pDate.toLocaleDateString()}</td>
        <td>${eDate.toLocaleDateString()}</td>
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

  const sortedProd = [...store.production].sort((a, b) => {
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

  const sortedWaste = [...store.waste].sort((a, b) => {
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
  await renderBakeRecommendations();
  renderRepurposingAlerts();
}

async function getAIPredictedDemand(productId) {
  const salesHistory = store.sales.filter(s => s.productId === productId);
  if (salesHistory.length === 0) return 30;

  try {
    const response = await fetch('/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales: salesHistory })
    });
    if (response.ok) {
      const data = await response.json();
      return data.predicted_demand !== undefined ? data.predicted_demand : 30;
    }
  } catch (error) {
    console.error("AI Forecast error:", error);
  }

  // Fallback
  const qtySum = salesHistory.slice(-3).reduce((sum, s) => sum + s.qty, 0);
  const avg = Math.round(qtySum / Math.min(3, salesHistory.length));
  return Math.max(5, avg);
}

async function renderAIDemandForecastChart() {
  const ctx = document.getElementById("chart-ai-demand-forecast").getContext("2d");
  if (aiDemandChartInstance) aiDemandChartInstance.destroy();

  const labels = store.products.map(p => p.name.split(' (')[0]);
  const historicalAvg = store.products.map(p => {
    const pSales = store.sales.filter(s => s.productId === p.id);
    if (pSales.length === 0) return 0;
    return Math.round(pSales.reduce((sum, s) => sum + s.qty, 0) / pSales.length);
  });

  const predictedDemand = await Promise.all(store.products.map(p => getAIPredictedDemand(p.id)));

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
          label: "AI Predicted Demand (Tomorrow)",
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
}

async function renderBakeRecommendations() {
  const container = document.getElementById("ai-recs-container");
  if (!container) return;
  container.innerHTML = "";

  const recsPromises = store.products.map(async p => {
    const currentStock = store.inventory
      .filter(i => i.productId === p.id)
      .reduce((sum, i) => sum + i.stockLevel, 0);

    const prediction = await getAIPredictedDemand(p.id);
    const safetyStock = 5; // Allowable safety quantity
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
        itemsToRepurposeMap.set(p.id, { name: p.name, qty: item.stockLevel, recipe: p.repurposeRecipe, freshness: fIndex });
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
    lucide.createIcons();
    return;
  }

  container.innerHTML = itemsToRepurpose.map((item, idx) => `
    <div class="repurpose-card">
      <div class="repurpose-badge-top">
        <span class="repurpose-item-name">${item.name}</span>
        <span class="badge warning">${item.freshness}% Fresh</span>
      </div>
      <p style="font-size: 0.85rem;">Available excess stock: <strong>${item.qty} pcs</strong></p>
      <div class="repurpose-recipe">Suggested Recipe: "${item.recipe}"</div>
      <button class="btn-primary btn-repurpose-action" data-idx="${idx}" style="margin-top: 10px; width: 100%; font-size: 0.8rem; padding: 6px 12px; background: linear-gradient(135deg, #0284c7, #0369a1);">
        <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Mark as Repurposed
      </button>
    </div>
  `).join('');

  document.querySelectorAll(".btn-repurpose-action").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-idx"));
      const target = itemsToRepurpose[idx];
      if (target) {
        showToast(`Saved ${target.qty} pcs of ${target.name} by converting into "${target.recipe}". Waste prevented!`, "success");
        btn.disabled = true;
        btn.textContent = "✓ Repurposed Recipe Prepared";
        btn.style.background = "#22c55e";
      }
    });
  });

  lucide.createIcons();
}

// 7. PRODUCT CATALOG VIEW REFRESHER
function refreshProductsPane() {
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
  const reportSalesTbody = document.getElementById("report-sales-tbody");
  if (reportSalesTbody) {
    const totalPages = Math.ceil(store.products.length / ITEMS_PER_PAGE) || 1;
    if (repSalesCurrentPage > totalPages) repSalesCurrentPage = totalPages;
    const startIndex = (repSalesCurrentPage - 1) * ITEMS_PER_PAGE;
    const pagedProducts = store.products.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    reportSalesTbody.innerHTML = pagedProducts.map(p => {
      const pSales = store.sales.filter(s => s.productId === p.id);
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
      const pWaste = store.waste.filter(w => w.productId === p.id);
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
      const pRuns = store.production.filter(pr => pr.productId === p.id);
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

  // Calculate User KPI Summary Cards
  const kpiTotal = document.getElementById("user-kpi-total");
  const kpiManagers = document.getElementById("user-kpi-managers");
  const kpiStaff = document.getElementById("user-kpi-staff");
  const kpiAdmins = document.getElementById("user-kpi-admins");

  if (kpiTotal) kpiTotal.textContent = `${store.users.length} Accounts`;
  if (kpiManagers) kpiManagers.textContent = `${store.users.filter(u => u.role === 'manager').length} Managers`;
  if (kpiStaff) kpiStaff.textContent = `${store.users.filter(u => ['sales','inventory','production'].includes(u.role)).length} Staff`;
  if (kpiAdmins) kpiAdmins.textContent = `${store.users.filter(u => u.role === 'admin').length} Admin`;

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

  const kpiCount = document.getElementById("branch-kpi-count");
  const kpiSales = document.getElementById("branch-kpi-sales");
  const kpiWaste = document.getElementById("branch-kpi-waste");
  const kpiNet = document.getElementById("branch-kpi-net");

  const totalNetSales = store._sales.reduce((sum, s) => sum + (s.qty * s.price), 0);
  const totalNetWaste = store._waste.reduce((sum, w) => sum + (w.qty * w.cost), 0);
  const totalNetMargin = totalNetSales - totalNetWaste;

  if (kpiCount) kpiCount.textContent = `${store.branches.length} Nodes`;
  if (kpiSales) kpiSales.textContent = `₱${totalNetSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (kpiWaste) kpiWaste.textContent = `₱${totalNetWaste.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (kpiNet) kpiNet.textContent = `₱${totalNetMargin.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

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
    const breadType = document.getElementById("shelf-bread-type").value;
    const breadName = document.getElementById("shelf-bread-type").options[document.getElementById("shelf-bread-type").selectedIndex].text;
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

    // Base Shelf Life Mapping
    let baseShelfLife = 3; // default
    if (breadType === "pandesal") baseShelfLife = 3;
    else if (breadType === "sliced_bread") baseShelfLife = 7;
    else if (breadType === "ensaymada") baseShelfLife = 4;
    else if (breadType === "cake") baseShelfLife = 5;

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
