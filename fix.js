const fs = require('fs');
const code = fs.readFileSync('app.js', 'utf8');
const marker = 'showToast("Staff account deleted.", "info");';
const idx = code.indexOf(marker);

if (idx !== -1) {
  const cleanCode = code.substring(0, idx + marker.length) + `
      }
    });
  });
}

// 10. ADMIN BRANCHES PANE & REAL INTERACTIVE MAP MONITOR REFRESHER
let realLeafletMapInstance = null;
let leafletMarkersGroup = null;

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

  if (kpiCount) kpiCount.textContent = \`\${store.branches.length} Nodes\`;
  if (kpiSales) kpiSales.textContent = \`₱\${totalNetSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}\`;
  if (kpiWaste) kpiWaste.textContent = \`₱\${totalNetWaste.toLocaleString('en-US', { minimumFractionDigits: 2 })}\`;
  if (kpiNet) kpiNet.textContent = \`₱\${totalNetMargin.toLocaleString('en-US', { minimumFractionDigits: 2 })}\`;

  const searchInput = document.getElementById("branch-search-input");
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

  const filteredBranches = store.branches.filter(b => {
    return !query || b.name.toLowerCase().includes(query) || (b.address && b.address.toLowerCase().includes(query));
  });

  if (tbody) {
    tbody.innerHTML = filteredBranches.map(b => \`
      <tr>
        <td><code>#\${b.id}</code></td>
        <td style="font-weight: 700;">\${b.name}</td>
        <td>GPS: \${b.latitude && b.latitude < 50 ? b.latitude : 7.0736}&deg; N, \${b.longitude && b.longitude < 200 ? b.longitude : 125.6110}&deg; E</td>
        <td>\${b.address}</td>
        <td><span class="badge \${b.status === 'Active' ? 'success' : 'danger'}">\${b.status || 'Active'}</span></td>
        <td style="display: flex; gap: 8px;">
          <button class="kanban-action-btn edit-branch-btn" data-id="\${b.id}" title="Edit Branch Node" style="color: var(--primary-color); border: none; background: transparent; cursor: pointer;">
            <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
          </button>
          <button class="kanban-action-btn delete-branch-btn" data-id="\${b.id}" title="Remove Branch Node" style="color: var(--color-error); border: none; background: transparent; cursor: pointer;">
            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
          </button>
        </td>
      </tr>
    \`).join('');

    if (searchInput && !searchInput.dataset.listening) {
      searchInput.dataset.listening = "true";
      searchInput.addEventListener("input", () => refreshAdminBranchesPane());
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
        if (confirm("Are you sure you want to remove this branch node?")) {
          await store.deleteBranch(id);
          populateSelectDropdowns();
          await refreshAdminBranchesPane();
          showToast("Branch node removed.", "info");
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
        html: \`<div style="display:flex;flex-direction:column;align-items:center;">
                 <div style="background-color:\${markerColor};width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.2);"></div>
                 <div style="background-color:white;padding:2px 6px;border-radius:4px;font-size:0.7rem;font-weight:700;margin-top:4px;border:1px solid #ccc;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.1);color:#333;">
                   \${b.name}
                 </div>
               </div>\`,
        iconSize: [120, 40],
        iconAnchor: [60, 10],
        popupAnchor: [0, -10]
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(leafletMarkersGroup);
      marker.bindPopup(\`<b>\${b.name}</b><br>\${b.address || 'No address'}<br>Status: <b>\${b.status}</b>\`);
    });
    
    setTimeout(() => {
      realLeafletMapInstance.invalidateSize();
    }, 250);
  }

  lucide.createIcons();
}
`;
  fs.writeFileSync('app.js', cleanCode);
  console.log('Successfully repaired app.js!');
} else {
  console.log('Marker not found!');
}
