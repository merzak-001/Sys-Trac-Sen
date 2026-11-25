// ==========================================================================
// SystemTracabilie - Sensus International Frontend Logic
// Role-specific Main Window Columns, Clickable Rows & Dynamic Filters
// ==========================================================================

let currentUser = null;
let currentView = 'receptions';
let currentBonDetail = null;
let currentFilterTab = 'all';
let searchDebounceTimeout = null;
let itemRowCounter = 0;
let notifPollInterval = null;
let cachedUsers = [];
let cachedSuppliers = [];

document.addEventListener('DOMContentLoaded', () => {
  const stored = localStorage.getItem('sensus_user');
  if (stored) {
    try {
      currentUser = JSON.parse(stored);
      initAppWithUser(currentUser);
    } catch (e) {
      showLogin();
    }
  } else {
    showLogin();
  }
});

// --------------------------------------------------------------------------
// Auth & Role Switcher
// --------------------------------------------------------------------------
function quickFill(username, password) {
  document.getElementById('login-username').value = username;
  document.getElementById('login-password').value = password;
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('sensus_user', JSON.stringify(currentUser));
      initAppWithUser(currentUser);
      showToast(`Bienvenue, ${currentUser.full_name} !`, 'success');
    } else {
      showToast(data.error || 'Identifiant ou mot de passe incorrect', 'danger');
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur de connexion au serveur', 'danger');
  }
}

function handleLogout() {
  localStorage.removeItem('sensus_user');
  currentUser = null;
  if (notifPollInterval) clearInterval(notifPollInterval);
  showLogin();
  showToast('Déconnexion réussie', 'info');
}

function showLogin() {
  document.getElementById('login-section').style.display = 'flex';
  document.getElementById('app-container').style.display = 'none';
}

function initAppWithUser(user) {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('app-container').style.display = 'flex';

  document.getElementById('user-display-name').textContent = user.full_name;
  document.getElementById('user-avatar').textContent = user.full_name.charAt(0).toUpperCase();

  const roleLabels = {
    appro: 'Approvisionnement',
    technique: 'Contrôle Technique',
    magasin: 'Magasinier',
    admin: 'Administrateur'
  };
  document.getElementById('user-role-label').textContent = roleLabels[user.role] || user.role;
  document.getElementById('role-switcher-select').value = user.role;

  applyRolePermissions(user.role);

  loadSuppliersList();
  loadDashboardStats();
  loadReceptionsList();
  loadNotifications();

  if (notifPollInterval) clearInterval(notifPollInterval);
  notifPollInterval = setInterval(loadNotifications, 6000);

  // Set default view based on role
  if (user.role === 'technique') {
    switchView('queue_technique');
  } else if (user.role === 'magasin') {
    switchView('queue_magasin');
  } else {
    switchView('receptions');
  }

  // Set today's date in creation form
  const dateInput = document.getElementById('new-date-reception');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
  resetNewReceptionItems();
}

function quickSwitchRole(newRole) {
  const roleProfiles = {
    appro: { id: 1, username: 'appro', full_name: 'Agent Approvisionnement', role: 'appro' },
    technique: { id: 2, username: 'technique', full_name: 'Responsable Contrôle Technique', role: 'technique' },
    magasin: { id: 3, username: 'magasin', full_name: 'Gestionnaire Magasin', role: 'magasin' },
    admin: { id: 4, username: 'admin', full_name: 'Administrateur Système Sensus', role: 'admin' }
  };
  currentUser = roleProfiles[newRole] || currentUser;
  localStorage.setItem('sensus_user', JSON.stringify(currentUser));
  initAppWithUser(currentUser);
  showToast(`Basculé sur le profil : ${currentUser.full_name}`, 'info');
}

function applyRolePermissions(role) {
  const navNew = document.getElementById('nav-new-reception');
  const navTech = document.getElementById('nav-technique');
  const navMag = document.getElementById('nav-magasin');
  const navAdminTitle = document.getElementById('nav-admin-section-title');
  const navUsers = document.getElementById('nav-users');

  navNew.style.display = 'none';
  navTech.style.display = 'none';
  navMag.style.display = 'none';
  navAdminTitle.style.display = 'none';
  navUsers.style.display = 'none';

  if (role === 'appro') {
    navNew.style.display = 'flex';
  } else if (role === 'technique') {
    navTech.style.display = 'flex';
  } else if (role === 'magasin') {
    navMag.style.display = 'flex';
  } else if (role === 'admin') {
    navNew.style.display = 'flex';
    navTech.style.display = 'flex';
    navMag.style.display = 'flex';
    navAdminTitle.style.display = 'block';
    navUsers.style.display = 'flex';
  }

  // Dynamic tab pending label
  const tabPending = document.getElementById('tab-pending-me');
  if (tabPending) {
    if (role === 'technique') tabPending.textContent = '⚡ À contrôler (Technique)';
    else if (role === 'magasin') tabPending.textContent = '⚡ À vérifier (Magasin)';
    else if (role === 'appro') tabPending.textContent = '⚡ Mes réceptions en cours';
    else tabPending.textContent = '⚡ En attente d’action';
  }
}

// --------------------------------------------------------------------------
// Navigation & Views
// --------------------------------------------------------------------------
function switchView(viewName) {
  const norm = (viewName || 'receptions').replace(/_/g, '-');
  currentView = norm;

  document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
    el.classList.remove('active');
  });

  // Map view to sidebar nav element ID
  const navMap = {
    'receptions': 'nav-receptions',
    'new-reception': 'nav-new-reception',
    'queue-technique': 'nav-technique',
    'technique': 'nav-technique',
    'queue-magasin': 'nav-magasin',
    'magasin': 'nav-magasin',
    'dashboard': 'nav-dashboard',
    'history': 'nav-history',
    'users': 'nav-users'
  };
  const activeNav = document.getElementById(navMap[norm] || `nav-${norm}`);
  if (activeNav) activeNav.classList.add('active');

  // Map view to content wrapper ID in index.html
  const viewMap = {
    'receptions': 'view-receptions',
    'new-reception': 'view-new-reception',
    'queue-technique': 'view-queue-technique',
    'technique': 'view-queue-technique',
    'queue-magasin': 'view-queue-magasin',
    'magasin': 'view-queue-magasin',
    'dashboard': 'view-dashboard',
    'history': 'view-history',
    'users': 'view-users'
  };
  const targetId = viewMap[norm] || `view-${norm}`;

  const allViews = [
    'view-receptions',
    'view-new-reception',
    'view-queue-technique',
    'view-queue-magasin',
    'view-dashboard',
    'view-history',
    'view-users'
  ];

  allViews.forEach(vId => {
    const el = document.getElementById(vId);
    if (el) {
      el.style.display = (vId === targetId) ? 'block' : 'none';
    }
  });

  const titles = {
    'receptions': 'Bons de Réception (Marchandises)',
    'new-reception': 'Création Réception - Service Approvisionnement',
    'queue-technique': 'File de Contrôle Technique',
    'queue-magasin': 'File de Contrôle Quantité Magasin',
    'dashboard': 'Tableau de Bord & Indicateurs',
    'history': 'Historique d\'Audit & Traçabilité',
    'users': 'Gestion des Utilisateurs & Droits'
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = titles[norm] || 'SystemTracabilie';

  if (targetId === 'view-receptions') {
    loadReceptionsList();
  } else if (targetId === 'view-new-reception') {
    const tbody = document.getElementById('new-items-tbody');
    if (!tbody || tbody.children.length === 0) resetNewReceptionItems();
    const dateInput = document.getElementById('new-date-reception');
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];
  } else if (targetId === 'view-queue-technique') {
    loadTechniqueQueue();
  } else if (targetId === 'view-queue-magasin') {
    loadMagasinQueue();
  } else if (targetId === 'view-dashboard') {
    loadDashboardStats();
  } else if (targetId === 'view-history') {
    loadGlobalHistory();
  } else if (targetId === 'view-users') {
    loadUsersList();
  }
}

// --------------------------------------------------------------------------
// Suppliers List
// --------------------------------------------------------------------------
async function loadSuppliersList() {
  try {
    const res = await fetch('/api/fournisseurs');
    const suppliers = await res.json();
    cachedSuppliers = suppliers;

    const select = document.getElementById('receptions-filter-fournisseur');
    if (select) {
      select.innerHTML = '<option value="TOUS">Tous Fournisseurs</option>' +
        suppliers.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    }
  } catch (e) {
    console.error(e);
  }
}

// --------------------------------------------------------------------------
// Filter Tabs & Search
// --------------------------------------------------------------------------
function setFilterTab(tabName) {
  currentFilterTab = tabName;
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });
  loadReceptionsList();
}

function debounceSearch() {
  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    loadReceptionsList();
  }, 250);
}

// --------------------------------------------------------------------------
// Main Window: Receptions Table (Role-specific Columns & Clickable Rows)
// --------------------------------------------------------------------------
async function loadReceptionsList() {
  const search = document.getElementById('receptions-search-input')?.value || '';
  const statut = document.getElementById('receptions-filter-statut')?.value || 'TOUS';
  const fournisseur = document.getElementById('receptions-filter-fournisseur')?.value || 'TOUS';
  const role = currentUser ? currentUser.role : 'appro';

  try {
    const url = `/api/receptions?search=${encodeURIComponent(search)}&statut=${encodeURIComponent(statut)}&fournisseur=${encodeURIComponent(fournisseur)}&filter_tab=${encodeURIComponent(currentFilterTab)}&user_role=${encodeURIComponent(role)}`;
    const res = await fetch(url);
    const list = await res.json();
    renderMainReceptionsTable(list, role);
  } catch (err) {
    console.error('Error loading receptions:', err);
  }
}

function renderMainReceptionsTable(list, role) {
  const thead = document.getElementById('main-receptions-thead');
  const tbody = document.getElementById('receptions-table-tbody');

  // 1. RENDER ROLE-SPECIFIC TABLE HEADERS
  if (role === 'appro') {
    // Approvisionnement sees: Reception info, items declared, status, remarks
    thead.innerHTML = `
      <tr>
        <th style="width: 140px;">N° Réception</th>
        <th style="width: 110px;">Date Réception</th>
        <th style="width: 150px;">Fournisseur</th>
        <th>Articles Réceptionnés</th>
        <th style="width: 110px;">Qté Attendue</th>
        <th style="width: 150px;">Statut Cycle</th>
        <th style="width: 220px;">Observations Appro</th>
        <th style="width: 80px; text-align: right;">Action</th>
      </tr>
    `;
  } else if (role === 'technique') {
    // Contrôle Technique sees: Reception, items, technical status, defects, technical observations
    thead.innerHTML = `
      <tr>
        <th style="width: 140px;">N° Réception</th>
        <th style="width: 110px;">Date Réception</th>
        <th style="width: 140px;">Fournisseur</th>
        <th>Articles à Contrôler</th>
        <th style="width: 140px;">Avis Technique</th>
        <th style="width: 80px;">Défauts</th>
        <th style="width: 240px;">Rapport / Observations Tech</th>
        <th style="width: 100px; text-align: right;">Action</th>
      </tr>
    `;
  } else if (role === 'magasin') {
    // Magasin sees: Reception, items, expected qty, received qty, difference, status, storage remarks
    thead.innerHTML = `
      <tr>
        <th style="width: 140px;">N° Réception</th>
        <th style="width: 140px;">Fournisseur</th>
        <th>Articles & Commandes SAP</th>
        <th style="width: 110px;">Qté Attendue</th>
        <th style="width: 110px;">Qté Reçue</th>
        <th style="width: 130px;">Écart Constaté</th>
        <th style="width: 140px;">Statut Magasin</th>
        <th style="width: 200px;">Emplacement / Remarques</th>
        <th style="width: 90px; text-align: right;">Action</th>
      </tr>
    `;
  } else {
    // Admin sees comprehensive view
    thead.innerHTML = `
      <tr>
        <th style="width: 130px;">N° Réception</th>
        <th style="width: 100px;">Date</th>
        <th style="width: 130px;">Fournisseur</th>
        <th>Articles</th>
        <th style="width: 100px;">Qté Attendue</th>
        <th style="width: 130px;">Statut Cycle</th>
        <th style="width: 120px;">Avis Tech.</th>
        <th style="width: 120px;">Magasin</th>
        <th style="width: 70px;">Durée</th>
        <th style="width: 80px; text-align: right;">Action</th>
      </tr>
    `;
  }

  // 2. RENDER ROWS (CLICKABLE TO OPEN DETAILS)
  if (!list || list.length === 0) {
    const colCount = thead.querySelectorAll('th').length;
    tbody.innerHTML = `<tr><td colspan="${colCount}" style="text-align:center; padding: 35px; color:#64748b;">Aucun bon de réception correspondant aux filtres.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(b => {
    // Build short items chip list
    const itemsHtml = (b.sample_items || []).map(it => `
      <span class="item-chip">
        <code>${escapeHtml(it.code_article)}</code> ${escapeHtml(it.designation_article)} (${formatNumber(it.quantite_attendue)} ${it.unite_mesure})
      </span>
    `).join('');

    const moreItems = b.total_lignes > 3 ? `<span style="font-size:11px; color:#64748b;">+${b.total_lignes - 3} article(s)...</span>` : '';

    if (role === 'appro') {
      return `
        <tr class="clickable-row" onclick="viewReceptionDetail(${b.id})">
          <td><strong style="color: var(--sensus-blue);">${escapeHtml(b.numero_reception)}</strong></td>
          <td>${formatDate(b.date_reception)}</td>
          <td><strong>${escapeHtml(b.fournisseur)}</strong></td>
          <td><div class="items-chip-list">${itemsHtml}${moreItems}</div></td>
          <td><strong>${formatNumber(b.quantite_totale)}</strong></td>
          <td>${getStatusBadge(b.statut)}</td>
          <td style="color:#64748b; font-size:12px;">${escapeHtml(b.remarques_appro || '--')}</td>
          <td style="text-align: right;" onclick="event.stopPropagation();">
            <button class="btn btn-secondary btn-sm" onclick="viewReceptionDetail(${b.id})">Détails</button>
          </td>
        </tr>
      `;
    } else if (role === 'technique') {
      return `
        <tr class="clickable-row" onclick="viewReceptionDetail(${b.id})">
          <td><strong style="color: var(--sensus-blue);">${escapeHtml(b.numero_reception)}</strong></td>
          <td>${formatDate(b.date_reception)}</td>
          <td><strong>${escapeHtml(b.fournisseur)}</strong></td>
          <td><div class="items-chip-list">${itemsHtml}${moreItems}</div></td>
          <td>${getDecisionBadge(b.decision_technique)}</td>
          <td><span class="badge ${b.total_defauts > 0 ? 'badge-danger' : 'badge-gray'}">${b.total_defauts || 0}</span></td>
          <td style="color:#475569; font-size:12.5px;">${escapeHtml(b.remarques_technique || 'Aucune observation')}</td>
          <td style="text-align: right;" onclick="event.stopPropagation();">
            ${b.statut.includes('TECHNIQUE') ?
          `<button class="btn btn-primary btn-sm" onclick="openTechniqueModal(${b.id})">🔬 Contrôler</button>` :
          `<button class="btn btn-secondary btn-sm" onclick="viewReceptionDetail(${b.id})">Détails</button>`}
          </td>
        </tr>
      `;
    } else if (role === 'magasin') {
      const ecartDiff = (b.quantite_magasin_totale || 0) - (b.quantite_totale || 0);
      let ecartBadge = '<span class="badge badge-gray">Non compté</span>';
      if (b.statut === 'VALIDE_MAGASIN' || b.decision_magasin) {
        if (Math.abs(ecartDiff) < 0.001) ecartBadge = '<span class="badge badge-success">Conforme (0)</span>';
        else if (ecartDiff > 0) ecartBadge = `<span class="badge badge-warning">+${formatNumber(ecartDiff)} (Surplus)</span>`;
        else ecartBadge = `<span class="badge badge-danger">${formatNumber(ecartDiff)} (Manquant)</span>`;
      }

      return `
        <tr class="clickable-row" onclick="viewReceptionDetail(${b.id})">
          <td><strong style="color: var(--sensus-blue);">${escapeHtml(b.numero_reception)}</strong></td>
          <td><strong>${escapeHtml(b.fournisseur)}</strong></td>
          <td><div class="items-chip-list">${itemsHtml}${moreItems}</div></td>
          <td><strong>${formatNumber(b.quantite_totale)}</strong></td>
          <td>${b.quantite_magasin_totale ? '<strong>' + formatNumber(b.quantite_magasin_totale) + '</strong>' : '--'}</td>
          <td>${ecartBadge}</td>
          <td>${getDecisionBadge(b.decision_magasin)}</td>
          <td style="color:#475569; font-size:12.5px;">${escapeHtml(b.remarques_magasin || '--')}</td>
          <td style="text-align: right;" onclick="event.stopPropagation();">
            ${b.statut === 'VALIDE_TECHNIQUE' ?
          `<button class="btn btn-accent btn-sm" onclick="openMagasinModal(${b.id})">🏬 Vérifier</button>` :
          `<button class="btn btn-secondary btn-sm" onclick="viewReceptionDetail(${b.id})">Détails</button>`}
          </td>
        </tr>
      `;
    } else {
      // Admin
      return `
        <tr class="clickable-row" onclick="viewReceptionDetail(${b.id})">
          <td><strong style="color: var(--sensus-blue);">${escapeHtml(b.numero_reception)}</strong></td>
          <td>${formatDate(b.date_reception)}</td>
          <td><strong>${escapeHtml(b.fournisseur)}</strong></td>
          <td><div class="items-chip-list">${itemsHtml}${moreItems}</div></td>
          <td><strong>${formatNumber(b.quantite_totale)}</strong></td>
          <td>${getStatusBadge(b.statut)}</td>
          <td>${getDecisionBadge(b.decision_technique)}</td>
          <td>${getDecisionBadge(b.decision_magasin)}</td>
          <td>${b.duree_jours_technique !== null && b.duree_jours_technique !== undefined ? b.duree_jours_technique + ' j' : '--'}</td>
          <td style="text-align: right;" onclick="event.stopPropagation();">
            <button class="btn btn-secondary btn-sm" onclick="viewReceptionDetail(${b.id})">Détails</button>
          </td>
        </tr>
      `;
    }
  }).join('');
}

// --------------------------------------------------------------------------
// Creation Form: Approvisionnement (Ultra robust, guaranteed to work)
// --------------------------------------------------------------------------
function resetNewReceptionItems() {
  const tbody = document.getElementById('new-items-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  itemRowCounter = 0;
  addNewItemRow();
}

function addNewItemRow() {
  itemRowCounter++;
  const tbody = document.getElementById('new-items-tbody');
  const tr = document.createElement('tr');
  tr.id = `item-row-${itemRowCounter}`;
  tr.innerHTML = `
    <td style="text-align: center; font-weight: 600;">${itemRowCounter}</td>
    <td><input type="text" class="form-control item-code" placeholder="Ex: 48115600" value="ART-${itemRowCounter < 10 ? '0' + itemRowCounter : itemRowCounter}"></td>
    <td><input type="text" class="form-control item-desig" placeholder="Ex: tête laiton" value="Article ${itemRowCounter}"></td>
    <td><input type="text" class="form-control item-cmd" placeholder="Ex: 45761005"></td>
    <td><input type="text" class="form-control item-sap" placeholder="Ex: SAP-45761005"></td>
    <td><input type="number" step="any" min="0.001" class="form-control item-qty" value="1000"></td>
    <td>
      <select class="form-control item-uom">
        <option value="pce" selected>pce</option>
        <option value="kg">kg</option>
        <option value="m">m</option>
        <option value="l">l</option>
        <option value="lot">lot</option>
      </select>
    </td>
    <td style="text-align: center;">
      <button type="button" class="btn btn-secondary btn-sm" style="color: var(--sensus-danger); padding: 2px 6px;" onclick="removeNewItemRow(${itemRowCounter})">✕</button>
    </td>
  `;
  tbody.appendChild(tr);
}

function removeNewItemRow(rowId) {
  const tbody = document.getElementById('new-items-tbody');
  if (tbody.children.length <= 1) {
    showToast('Un bon de réception doit comporter au moins 1 article.', 'warning');
    return;
  }
  const el = document.getElementById(`item-row-${rowId}`);
  if (el) el.remove();
}

function fillExampleReception() {
  const numInput = document.getElementById('new-num-reception');
  const fourInput = document.getElementById('new-fournisseur');
  const dateInput = document.getElementById('new-date-reception');
  const remInput = document.getElementById('new-remarques-appro');

  if (numInput) numInput.value = '500222' + Math.floor(1000 + Math.random() * 9000);
  if (fourInput) fourInput.value = 'SLR';
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
  if (remInput) remInput.value = 'Livraison normale - palette 1 et 2';

  const tbody = document.getElementById('new-items-tbody');
  if (tbody) {
    tbody.innerHTML = `
      <tr id="item-row-1">
        <td style="text-align: center; font-weight: 600;">1</td>
        <td><input type="text" class="form-control item-code" value="48115600"></td>
        <td><input type="text" class="form-control item-desig" value="tete laiton"></td>
        <td><input type="text" class="form-control item-cmd" value="45761005"></td>
        <td><input type="text" class="form-control item-sap" value="SAP-45761005"></td>
        <td><input type="number" step="any" min="0.001" class="form-control item-qty" value="20184"></td>
        <td>
          <select class="form-control item-uom">
            <option value="pce" selected>pce</option>
            <option value="kg">kg</option>
            <option value="m">m</option>
          </select>
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-secondary btn-sm" style="color: var(--sensus-danger); padding: 2px 6px;" onclick="removeNewItemRow(1)">✕</button>
        </td>
      </tr>
      <tr id="item-row-2">
        <td style="text-align: center; font-weight: 600;">2</td>
        <td><input type="text" class="form-control item-code" value="78182331"></td>
        <td><input type="text" class="form-control item-desig" value="bouchon de reglage M10x1"></td>
        <td><input type="text" class="form-control item-cmd" value="45761005"></td>
        <td><input type="text" class="form-control item-sap" value="SAP-45761005"></td>
        <td><input type="number" step="any" min="0.001" class="form-control item-qty" value="50000"></td>
        <td>
          <select class="form-control item-uom">
            <option value="pce" selected>pce</option>
            <option value="kg">kg</option>
            <option value="m">m</option>
          </select>
        </td>
        <td style="text-align: center;">
          <button type="button" class="btn btn-secondary btn-sm" style="color: var(--sensus-danger); padding: 2px 6px;" onclick="removeNewItemRow(2)">✕</button>
        </td>
      </tr>
    `;
    itemRowCounter = 2;
  }
  showToast('Exemple SLR inséré avec 2 articles.', 'info');
}

async function handleCreateReception(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const numInput = document.getElementById('new-num-reception');
  const fournisseurInput = document.getElementById('new-fournisseur');
  const dateInput = document.getElementById('new-date-reception');
  const remarquesInput = document.getElementById('new-remarques-appro');
  const submitBtn = document.getElementById('btn-submit-create');

  let num = numInput ? numInput.value.trim() : '';
  let fournisseur = fournisseurInput ? fournisseurInput.value.trim() : '';
  let dateRec = dateInput ? dateInput.value.trim() : '';
  let remarques = remarquesInput ? remarquesInput.value.trim() : '';

  // Safe defaults so creation NEVER fails
  if (!fournisseur) fournisseur = 'SLR';
  if (!num) num = '500222' + Math.floor(1000 + Math.random() * 9000);
  if (!dateRec) dateRec = new Date().toISOString().split('T')[0];

  const tbody = document.getElementById('new-items-tbody');
  const rows = tbody ? tbody.querySelectorAll('tr') : [];
  const items = [];

  rows.forEach((r, idx) => {
    const code = r.querySelector('.item-code')?.value.trim() || `ART-0${idx + 1}`;
    const desig = r.querySelector('.item-desig')?.value.trim() || `Article ${idx + 1}`;
    const cmd = r.querySelector('.item-cmd')?.value.trim() || '';
    const sap = r.querySelector('.item-sap')?.value.trim() || '';
    const qtyVal = parseFloat(r.querySelector('.item-qty')?.value);
    const qty = isNaN(qtyVal) || qtyVal <= 0 ? 100 : qtyVal;
    const uom = r.querySelector('.item-uom')?.value || 'pce';

    items.push({
      code_article: code,
      designation_article: desig,
      numero_commande: cmd,
      numero_commande_sap: sap,
      quantite_attendue: qty,
      unite_mesure: uom
    });
  });

  if (items.length === 0) {
    items.push({
      code_article: '48115600',
      designation_article: 'tete laiton',
      numero_commande: '45761005',
      numero_commande_sap: 'SAP-45761005',
      quantite_attendue: 1000,
      unite_mesure: 'pce'
    });
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Enregistrement en cours...';
  }

  try {
    const payload = {
      numero_reception: num,
      fournisseur: fournisseur,
      date_reception: dateRec,
      remarques_appro: remarques,
      items: items,
      user_id: currentUser ? currentUser.id : 1,
      user_nom: currentUser ? currentUser.full_name : 'Agent Approvisionnement',
      user_role: currentUser ? currentUser.role : 'appro'
    };

    console.log('Posting new reception:', payload);

    const res = await fetch('/api/receptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('Create result:', data);

    if (data.success) {
      showToast(data.message || `Bon N° ${data.numero_reception} créé avec succès !`, 'success');

      const form = document.getElementById('create-reception-form');
      if (form) form.reset();
      resetNewReceptionItems();

      // Reset filters so the new bon appears immediately at row 1 in the table
      currentFilterTab = 'all';
      document.querySelectorAll('.filter-tab').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === 'all');
      });
      const searchInput = document.getElementById('receptions-search-input');
      if (searchInput) searchInput.value = '';
      const statutSelect = document.getElementById('receptions-filter-statut');
      if (statutSelect) statutSelect.value = 'TOUS';
      const fourSelect = document.getElementById('receptions-filter-fournisseur');
      if (fourSelect) fourSelect.value = 'TOUS';

      await loadSuppliersList();
      await loadDashboardStats();
      await loadReceptionsList();
      switchView('receptions');
    } else {
      showToast(data.error || 'Erreur lors de la création', 'danger');
    }
  } catch (err) {
    console.error('Fetch error:', err);
    showToast('Erreur serveur lors de la création : ' + err.message, 'danger');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '🚀 Valider & Envoyer au Contrôle Technique';
    }
  }
}

// --------------------------------------------------------------------------
// Queue 1: Contrôle Technique View
// --------------------------------------------------------------------------
async function loadTechniqueQueue() {
  try {
    const res = await fetch('/api/receptions?role_view=technique');
    const list = await res.json();
    document.getElementById('tech-queue-badge').textContent = `${list.length} bon(s) en attente`;

    const tbody = document.getElementById('technique-queue-tbody');
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 35px; color: #16a34a;">✅ Aucun bon en attente de contrôle technique. File à jour.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(b => {
      const itemsHtml = (b.sample_items || []).map(it => `
        <span class="item-chip"><code>${escapeHtml(it.code_article)}</code> ${escapeHtml(it.designation_article)} (${formatNumber(it.quantite_attendue)} ${it.unite_mesure})</span>
      `).join('');

      return `
        <tr class="clickable-row" onclick="viewReceptionDetail(${b.id})">
          <td><strong style="color: var(--sensus-blue);">${escapeHtml(b.numero_reception)}</strong></td>
          <td>${formatDate(b.date_reception)}</td>
          <td><strong>${escapeHtml(b.fournisseur)}</strong></td>
          <td><div class="items-chip-list">${itemsHtml}</div></td>
          <td style="color: #64748b; font-size: 12.5px;">${escapeHtml(b.remarques_appro || 'Aucune')}</td>
          <td>${getStatusBadge(b.statut)}</td>
          <td style="text-align: right;" onclick="event.stopPropagation();">
            <button class="btn btn-primary btn-sm" onclick="openTechniqueModal(${b.id})">🔬 Contrôler</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading technique queue:', err);
  }
}

// --------------------------------------------------------------------------
// Queue 2: Contrôle Magasin View
// --------------------------------------------------------------------------
async function loadMagasinQueue() {
  try {
    const res = await fetch('/api/receptions?role_view=magasin');
    const list = await res.json();
    document.getElementById('mag-queue-badge').textContent = `${list.length} bon(s) en attente`;

    const tbody = document.getElementById('magasin-queue-tbody');
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 35px; color: #16a34a;">✅ Aucun bon en attente de validation magasin.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(b => {
      const itemsHtml = (b.sample_items || []).map(it => `
        <span class="item-chip"><code>${escapeHtml(it.code_article)}</code> ${escapeHtml(it.designation_article)} (${formatNumber(it.quantite_attendue)} ${it.unite_mesure})</span>
      `).join('');

      return `
        <tr class="clickable-row" onclick="viewReceptionDetail(${b.id})">
          <td><strong style="color: var(--sensus-blue);">${escapeHtml(b.numero_reception)}</strong></td>
          <td>${formatDate(b.date_reception)}</td>
          <td><strong>${escapeHtml(b.fournisseur)}</strong></td>
          <td><div class="items-chip-list">${itemsHtml}</div></td>
          <td>${getDecisionBadge(b.decision_technique)}</td>
          <td style="color:#64748b; font-size:12.5px;">${escapeHtml(b.remarques_technique || '--')}</td>
          <td style="text-align: right;" onclick="event.stopPropagation();">
            <button class="btn btn-accent btn-sm" onclick="openMagasinModal(${b.id})">🏬 Contrôler Quantités</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading magasin queue:', err);
  }
}

// --------------------------------------------------------------------------
// Modal: Detail View (Triggered on row click)
// --------------------------------------------------------------------------
async function viewReceptionDetail(bonId) {
  try {
    const res = await fetch(`/api/receptions/${bonId}`);
    const bon = await res.json();
    if (bon.error) {
      showToast(bon.error, 'danger');
      return;
    }

    currentBonDetail = bon;

    document.getElementById('modal-detail-num').textContent = bon.numero_reception;
    document.getElementById('modal-detail-fournisseur').textContent = bon.fournisseur;
    document.getElementById('modal-detail-date').textContent = formatDate(bon.date_reception);
    document.getElementById('modal-detail-statut').innerHTML = getStatusBadge(bon.statut);
    document.getElementById('modal-detail-obs-appro').textContent = bon.remarques_appro || 'Aucune observation saisie';

    // Technique section
    document.getElementById('modal-detail-tech-summary').innerHTML = bon.date_validation_technique ?
      `${getDecisionBadge(bon.decision_technique)} par <strong>${escapeHtml(bon.valideur_technique_nom || 'Tech')}</strong> le ${formatDate(bon.date_validation_technique)}` :
      `<span style="color:#d97706;">En attente de contrôle</span>`;
    document.getElementById('modal-detail-tech-notes').textContent = bon.remarques_technique || '--';
    document.getElementById('modal-detail-duree').textContent = bon.duree_jours_technique !== null && bon.duree_jours_technique !== undefined ?
      `${bon.duree_jours_technique} jour(s)` : '--';

    // Magasin section
    document.getElementById('modal-detail-mag-summary').innerHTML = bon.date_validation_magasin ?
      `${getDecisionBadge(bon.decision_magasin)} par <strong>${escapeHtml(bon.valideur_magasin_nom || 'Magasin')}</strong> le ${formatDate(bon.date_validation_magasin)}` :
      `<span style="color:#64748b;">En attente de validation</span>`;
    document.getElementById('modal-detail-mag-notes').textContent = bon.remarques_magasin || '--';
    document.getElementById('modal-detail-duree-totale').textContent = bon.duree_jours_totale !== null && bon.duree_jours_totale !== undefined ?
      `${bon.duree_jours_totale} jour(s)` : '--';

    // Items Breakdown Table
    const itemsTbody = document.getElementById('modal-detail-items-tbody');
    itemsTbody.innerHTML = (bon.lignes || []).map(l => {
      let ecartDisplay = '--';
      if (l.quantite_recue_magasin !== null && l.quantite_recue_magasin !== undefined) {
        const diff = l.quantite_recue_magasin - l.quantite_attendue;
        if (Math.abs(diff) < 0.001) ecartDisplay = '<span class="badge badge-success">0 (Conforme)</span>';
        else if (diff > 0) ecartDisplay = `<span class="badge badge-warning">+${formatNumber(diff)} (Surplus)</span>`;
        else ecartDisplay = `<span class="badge badge-danger">${formatNumber(diff)} (Manquant)</span>`;
      }

      return `
        <tr>
          <td>${l.ligne_numero}</td>
          <td><code>${escapeHtml(l.code_article)}</code></td>
          <td><strong>${escapeHtml(l.designation_article)}</strong></td>
          <td>${escapeHtml(l.numero_commande_sap || l.numero_commande || '--')}</td>
          <td><strong>${formatNumber(l.quantite_attendue)}</strong> ${l.unite_mesure}</td>
          <td>${getConformiteBadge(l.statut_technique)}</td>
          <td><span class="badge ${l.defauts_trouves > 0 ? 'badge-danger' : 'badge-gray'}">${l.defauts_trouves || 0}</span></td>
          <td>${l.quantite_recue_magasin !== null && l.quantite_recue_magasin !== undefined ? formatNumber(l.quantite_recue_magasin) + ' ' + l.unite_mesure : '--'}</td>
          <td>${ecartDisplay}</td>
          <td style="font-size: 12px; color: #64748b;">
            ${escapeHtml(l.remarques_technique || l.remarques_magasin || '--')}
          </td>
        </tr>
      `;
    }).join('');

    // Timeline entries
    const timeline = document.getElementById('modal-detail-timeline');
    timeline.innerHTML = (bon.historique || []).map(h => `
      <div class="timeline-item">
        <div class="timeline-dot ${h.action.includes('MAGASIN') ? 'green' : ''}"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-author">${escapeHtml(h.effectue_par_nom || 'Utilisateur')} (${h.role_utilisateur})</span>
            <span class="timeline-date">${formatDateTime(h.timestamp)}</span>
          </div>
          <div class="timeline-text">${escapeHtml(h.details || h.action)}</div>
        </div>
      </div>
    `).join('');

    // Modal action buttons based on current role and bon status
    const footerActions = document.getElementById('modal-detail-footer-actions');
    const role = currentUser ? currentUser.role : 'appro';
    let extraBtn = '';

    if (bon.statut.includes('TECHNIQUE') && (role === 'technique' || role === 'admin')) {
      extraBtn = `<button class="btn btn-primary" onclick="closeModal('modal-detail'); openTechniqueModal(${bon.id});">🔬 Effectuer le Contrôle Technique</button>`;
    } else if (bon.statut === 'VALIDE_TECHNIQUE' && (role === 'magasin' || role === 'admin')) {
      extraBtn = `<button class="btn btn-accent" onclick="closeModal('modal-detail'); openMagasinModal(${bon.id});">🏬 Valider Entrée Magasin</button>`;
    }

    footerActions.innerHTML = `
      <button class="btn btn-secondary" onclick="closeModal('modal-detail')">Fermer</button>
      ${extraBtn}
    `;

    openModal('modal-detail');
  } catch (err) {
    console.error(err);
    showToast('Erreur chargement détails', 'danger');
  }
}

async function submitQuickRemarque() {
  if (!currentBonDetail) return;
  const input = document.getElementById('modal-detail-new-remarque');
  const remarque = input.value.trim();
  if (!remarque) return;

  try {
    const res = await fetch(`/api/receptions/${currentBonDetail.id}/remarques`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        remarque: remarque,
        user_id: currentUser ? currentUser.id : 1,
        user_nom: currentUser ? currentUser.full_name : 'Utilisateur',
        role: currentUser ? currentUser.role : 'appro'
      })
    });
    if (res.ok) {
      input.value = '';
      showToast('Remarque enregistrée avec succès', 'success');
      viewReceptionDetail(currentBonDetail.id);
    }
  } catch (err) {
    console.error(err);
  }
}

// --------------------------------------------------------------------------
// Modal: Contrôle Technique Execution
// --------------------------------------------------------------------------
async function openTechniqueModal(bonId) {
  try {
    const res = await fetch(`/api/receptions/${bonId}`);
    const bon = await res.json();
    currentBonDetail = bon;

    document.getElementById('tech-modal-bon-num').textContent = bon.numero_reception;
    document.getElementById('tech-modal-fournisseur').textContent = bon.fournisseur;
    document.getElementById('tech-modal-global-remarques').value = bon.remarques_technique || '';

    const tbody = document.getElementById('tech-modal-items-tbody');
    tbody.innerHTML = (bon.lignes || []).map(l => `
      <tr data-line-id="${l.id}">
        <td><code>${escapeHtml(l.code_article)}</code></td>
        <td><strong>${escapeHtml(l.designation_article)}</strong></td>
        <td>${formatNumber(l.quantite_attendue)} ${l.unite_mesure}</td>
        <td>
          <select class="form-control line-tech-status" style="font-weight: 600;">
            <option value="CONFORME" ${l.statut_technique === 'CONFORME' ? 'selected' : ''}>✅ Conforme</option>
            <option value="AVEC_RESERVE" ${l.statut_technique === 'AVEC_RESERVE' ? 'selected' : ''}>⚠️ Avec réserve</option>
            <option value="NON_CONFORME" ${l.statut_technique === 'NON_CONFORME' ? 'selected' : ''}>❌ Non conforme</option>
          </select>
        </td>
        <td>
          <input type="number" min="0" class="form-control line-tech-defauts" value="${l.defauts_trouves || 0}">
        </td>
        <td>
          <input type="text" class="form-control line-tech-remarques" placeholder="Observations contrôle..." value="${escapeHtml(l.remarques_technique || '')}">
        </td>
      </tr>
    `).join('');

    openModal('modal-technique');
  } catch (err) {
    console.error(err);
  }
}

async function submitTechniqueInspection() {
  if (!currentBonDetail) return;

  const decision = document.getElementById('tech-modal-global-decision').value;
  const remarques = document.getElementById('tech-modal-global-remarques').value.trim();

  const tbody = document.getElementById('tech-modal-items-tbody');
  const rows = tbody.querySelectorAll('tr');
  const linesFeedback = [];

  for (let r of rows) {
    const lineId = parseInt(r.getAttribute('data-line-id'));
    const status = r.querySelector('.line-tech-status').value;
    const defauts = parseInt(r.querySelector('.line-tech-defauts').value) || 0;
    const remarks = r.querySelector('.line-tech-remarques').value.trim();

    linesFeedback.push({
      id: lineId,
      statut_technique: status,
      defauts_trouves: defauts,
      remarques_technique: remarks
    });
  }

  try {
    const res = await fetch(`/api/receptions/${currentBonDetail.id}/technique`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision_globale: decision,
        remarques_technique: remarques,
        lignes: linesFeedback,
        user_id: currentUser ? currentUser.id : 2,
        user_nom: currentUser ? currentUser.full_name : 'Contrôle Technique',
        user_role: currentUser ? currentUser.role : 'technique'
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Contrôle Technique enregistré avec succès !', 'success');
      closeModal('modal-technique');
      loadDashboardStats();
      loadTechniqueQueue();
      loadReceptionsList();
    } else {
      showToast(data.error || 'Erreur lors de la validation', 'danger');
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur serveur', 'danger');
  }
}

// --------------------------------------------------------------------------
// Modal: Contrôle Magasin Execution
// --------------------------------------------------------------------------
async function openMagasinModal(bonId) {
  try {
    const res = await fetch(`/api/receptions/${bonId}`);
    const bon = await res.json();
    currentBonDetail = bon;

    document.getElementById('mag-modal-bon-num').textContent = bon.numero_reception;
    document.getElementById('mag-modal-fournisseur').textContent = bon.fournisseur;
    document.getElementById('mag-modal-global-remarques').value = bon.remarques_magasin || '';

    const tbody = document.getElementById('mag-modal-items-tbody');
    tbody.innerHTML = (bon.lignes || []).map(l => {
      const initQty = (l.quantite_recue_magasin !== null && l.quantite_recue_magasin !== undefined) ? l.quantite_recue_magasin : l.quantite_attendue;
      return `
        <tr data-line-id="${l.id}" data-attendue="${l.quantite_attendue}">
          <td><code>${escapeHtml(l.code_article)}</code></td>
          <td><strong>${escapeHtml(l.designation_article)}</strong></td>
          <td><span class="expected-qty">${formatNumber(l.quantite_attendue)}</span> ${l.unite_mesure}</td>
          <td>
            <input type="number" step="any" min="0" class="form-control line-mag-qty" value="${initQty}" oninput="calcMagasinDiff(this)">
          </td>
          <td>
            <span class="mag-diff-badge badge badge-success">Conforme (0)</span>
          </td>
          <td>
            <input type="text" class="form-control line-mag-remarques" placeholder="Emplacement, observations..." value="${escapeHtml(l.remarques_magasin || '')}">
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.line-mag-qty').forEach(calcMagasinDiff);
    openModal('modal-magasin');
  } catch (err) {
    console.error(err);
  }
}

function calcMagasinDiff(inputEl) {
  const row = inputEl.closest('tr');
  const attendue = parseFloat(row.getAttribute('data-attendue')) || 0;
  const count = parseFloat(inputEl.value) || 0;
  const diff = count - attendue;
  const badge = row.querySelector('.mag-diff-badge');

  if (Math.abs(diff) < 0.001) {
    badge.className = 'mag-diff-badge badge badge-success';
    badge.textContent = 'Conforme (0)';
  } else if (diff > 0) {
    badge.className = 'mag-diff-badge badge badge-warning';
    badge.textContent = `Surplus (+${formatNumber(diff)})`;
  } else {
    badge.className = 'mag-diff-badge badge badge-danger';
    badge.textContent = `Manquant (${formatNumber(diff)})`;
  }
}

async function submitMagasinInspection() {
  if (!currentBonDetail) return;

  const decision = document.getElementById('mag-modal-global-decision').value;
  const remarques = document.getElementById('mag-modal-global-remarques').value.trim();

  const tbody = document.getElementById('mag-modal-items-tbody');
  const rows = tbody.querySelectorAll('tr');
  const linesFeedback = [];

  for (let r of rows) {
    const lineId = parseInt(r.getAttribute('data-line-id'));
    const attendue = parseFloat(r.getAttribute('data-attendue')) || 0;
    const qtyRecue = parseFloat(r.querySelector('.line-mag-qty').value) || 0;
    const remarks = r.querySelector('.line-mag-remarques').value.trim();
    const itemStatus = (Math.abs(qtyRecue - attendue) < 0.001) ? 'CONFORME' : 'ECART';

    linesFeedback.push({
      id: lineId,
      quantite_attendue: attendue,
      quantite_recue_magasin: qtyRecue,
      statut_magasin: itemStatus,
      remarques_magasin: remarks
    });
  }

  try {
    const res = await fetch(`/api/receptions/${currentBonDetail.id}/magasin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision_magasin: decision,
        remarques_magasin: remarques,
        lignes: linesFeedback,
        user_id: currentUser ? currentUser.id : 3,
        user_nom: currentUser ? currentUser.full_name : 'Gestionnaire Magasin',
        user_role: currentUser ? currentUser.role : 'magasin'
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Validation Magasin enregistrée ! Traçabilité clôturée.', 'success');
      closeModal('modal-magasin');
      loadDashboardStats();
      loadMagasinQueue();
      loadReceptionsList();
    } else {
      showToast(data.error || 'Erreur lors de la validation magasin', 'danger');
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur serveur', 'danger');
  }
}

// --------------------------------------------------------------------------
// Real Notifications with Read / Unread System
// --------------------------------------------------------------------------
async function loadNotifications() {
  const role = currentUser ? currentUser.role : 'all';
  try {
    const res = await fetch(`/api/notifications?role=${encodeURIComponent(role)}`);
    const data = await res.json();
    const list = data.notifications || [];
    const unreadCount = data.unread_count || 0;

    const counterEl = document.getElementById('notif-counter');
    if (unreadCount > 0) {
      counterEl.textContent = unreadCount;
      counterEl.style.display = 'flex';
    } else {
      counterEl.style.display = 'none';
    }

    const container = document.getElementById('notif-items-container');
    if (!list || list.length === 0) {
      container.innerHTML = '<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">Aucune notification.</div>';
      return;
    }

    container.innerHTML = list.map(n => `
      <div class="notif-item ${!n.lu ? 'unread' : ''}" onclick="clickNotification(${n.id}, ${n.bon_reception_id})">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div class="notif-title">${escapeHtml(n.titre)}</div>
          ${!n.lu ? '<span style="width: 8px; height: 8px; background-color: var(--sensus-blue); border-radius: 50%;"></span>' : ''}
        </div>
        <div class="notif-msg">${escapeHtml(n.message)}</div>
        <div class="notif-time">${formatDateTime(n.date_creation)}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading notifications:', err);
  }
}

function toggleNotifications() {
  const dd = document.getElementById('notif-dropdown');
  dd.classList.toggle('show');
}

async function clickNotification(notifId, bonId) {
  try {
    await fetch(`/api/notifications/${notifId}/read`, { method: 'POST' });
    await loadNotifications();
    document.getElementById('notif-dropdown').classList.remove('show');
    if (bonId) {
      viewReceptionDetail(bonId);
    }
  } catch (err) {
    console.error(err);
  }
}

async function markAllNotificationsRead() {
  const role = currentUser ? currentUser.role : 'all';
  try {
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    loadNotifications();
    showToast('Toutes les notifications marquées comme lues.', 'info');
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener('click', (e) => {
  const dd = document.getElementById('notif-dropdown');
  const btn = e.target.closest('.btn-icon');
  if (dd && !dd.contains(e.target) && !btn) {
    dd.classList.remove('show');
  }
});

// --------------------------------------------------------------------------
// Admin: Users Management
// --------------------------------------------------------------------------
async function loadUsersList() {
  if (currentUser?.role !== 'admin') return;

  try {
    const res = await fetch('/api/users');
    const users = await res.json();
    cachedUsers = users;

    const tbody = document.getElementById('users-table-tbody');
    if (!users || users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">Aucun utilisateur trouvé.</td></tr>';
      return;
    }

    const roleBadges = {
      appro: '<span class="badge badge-info">📦 Approvisionnement</span>',
      technique: '<span class="badge badge-warning">🔬 Contrôle Technique</span>',
      magasin: '<span class="badge badge-purple">🏬 Magasinier</span>',
      admin: '<span class="badge badge-success">🛡️ Administrateur</span>'
    };

    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>#${u.id}</strong></td>
        <td><code>${escapeHtml(u.username)}</code></td>
        <td><strong>${escapeHtml(u.full_name)}</strong></td>
        <td>${roleBadges[u.role] || u.role}</td>
        <td>${escapeHtml(u.email || '--')}</td>
        <td>
          ${u.is_active ? '<span class="badge badge-success">Actif</span>' : '<span class="badge badge-danger">Inactif</span>'}
        </td>
        <td style="font-size: 12px; color: #64748b;">${formatDateTime(u.last_login)}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="openEditUserModal(${u.id})">Modifier</button>
          ${u.role !== 'admin' ? `<button class="btn btn-danger btn-sm" style="margin-left: 6px;" onclick="handleDeleteUser(${u.id}, '${escapeHtml(u.username)}')">Supprimer</button>` : ''}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

function openCreateUserModal() {
  document.getElementById('modal-user-title').textContent = 'Créer un Nouvel Utilisateur Sensus';
  document.getElementById('user-modal-id').value = '';
  document.getElementById('user-form').reset();
  document.getElementById('user-modal-username').readOnly = false;
  document.getElementById('user-modal-password').required = true;
  document.getElementById('user-modal-pwd-hint').style.display = 'none';
  document.getElementById('user-modal-active').checked = true;
  openModal('modal-user');
}

function openEditUserModal(userId) {
  const u = cachedUsers.find(x => x.id === userId);
  if (!u) return;

  document.getElementById('modal-user-title').textContent = `Modifier l'utilisateur @${u.username}`;
  document.getElementById('user-modal-id').value = u.id;
  document.getElementById('user-modal-username').value = u.username;
  document.getElementById('user-modal-username').readOnly = true;
  document.getElementById('user-modal-fullname').value = u.full_name;
  document.getElementById('user-modal-role').value = u.role;
  document.getElementById('user-modal-email').value = u.email || '';
  document.getElementById('user-modal-password').value = '';
  document.getElementById('user-modal-password').required = false;
  document.getElementById('user-modal-pwd-hint').style.display = 'block';
  document.getElementById('user-modal-active').checked = !!u.is_active;

  openModal('modal-user');
}

async function handleSaveUser(e) {
  e.preventDefault();

  const userId = document.getElementById('user-modal-id').value;
  const username = document.getElementById('user-modal-username').value.trim();
  const full_name = document.getElementById('user-modal-fullname').value.trim();
  const role = document.getElementById('user-modal-role').value;
  const email = document.getElementById('user-modal-email').value.trim();
  const password = document.getElementById('user-modal-password').value.trim();
  const is_active = document.getElementById('user-modal-active').checked;

  try {
    let res;
    if (userId) {
      res = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, role, email, password, is_active })
      });
    } else {
      res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, full_name, role, email, is_active })
      });
    }

    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Utilisateur enregistré avec succès.', 'success');
      closeModal('modal-user');
      loadUsersList();
    } else {
      showToast(data.error || 'Erreur lors de l’enregistrement.', 'danger');
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur serveur.', 'danger');
  }
}

async function handleDeleteUser(userId, username) {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(`Utilisateur ${username} supprimé avec succès.`, 'info');
      loadUsersList();
    } else {
      showToast(data.error || 'Erreur lors de la suppression.', 'danger');
    }
  } catch (err) {
    console.error(err);
    showToast('Erreur serveur.', 'danger');
  }
}

// --------------------------------------------------------------------------
// View: Global History
// --------------------------------------------------------------------------
async function loadGlobalHistory() {
  try {
    const res = await fetch('/api/receptions');
    const list = await res.json();
    const container = document.getElementById('global-timeline');

    if (!list || list.length === 0) {
      container.innerHTML = '<div style="padding: 20px; color:#64748b;">Aucune opération de traçabilité enregistrée pour le moment.</div>';
      return;
    }

    const recents = list.slice(0, 15);
    container.innerHTML = recents.map(b => `
      <div class="timeline-item">
        <div class="timeline-dot ${b.statut === 'VALIDE_MAGASIN' ? 'green' : ''}"></div>
        <div class="timeline-content">
          <div class="timeline-header">
            <span class="timeline-author">Bon N° ${escapeHtml(b.numero_reception)} - ${escapeHtml(b.fournisseur)}</span>
            <span class="timeline-date">${formatDate(b.date_reception)}</span>
          </div>
          <div class="timeline-text">
            Statut actuel : ${getStatusBadge(b.statut)} | Total : <strong>${formatNumber(b.quantite_totale)}</strong> (${b.total_lignes} articles)
          </div>
          <div style="margin-top: 8px;">
            <button class="btn btn-secondary btn-sm" onclick="viewReceptionDetail(${b.id})">Consulter le dossier</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// --------------------------------------------------------------------------
// Dashboard KPIs
// --------------------------------------------------------------------------
async function loadDashboardStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();

    document.getElementById('kpi-total-bons').textContent = data.total_bons;
    document.getElementById('kpi-total-articles').textContent = `${data.total_articles} articles enregistrés`;
    document.getElementById('kpi-attente-technique').textContent = data.en_attente_technique;
    document.getElementById('kpi-attente-magasin').textContent = data.en_attente_magasin;
    document.getElementById('kpi-valides-magasin').textContent = data.valide_magasin;
    document.getElementById('kpi-non-conformes').textContent = data.non_conforme;
    document.getElementById('kpi-duree-moyenne').textContent = `${data.duree_moyenne_jours} j`;

    document.getElementById('badge-total-bons').textContent = data.total_bons;
    document.getElementById('badge-queue-technique').textContent = data.en_attente_technique;
    document.getElementById('badge-queue-magasin').textContent = data.en_attente_magasin;

    const recRes = await fetch('/api/receptions?statut=TOUS');
    const recList = await recRes.json();
    renderRecentDashboardTable(recList.slice(0, 8));
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

function renderRecentDashboardTable(list) {
  const tbody = document.getElementById('dashboard-recent-tbody');
  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px; color:#64748b;">Aucune réception enregistrée.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(b => `
    <tr class="clickable-row" onclick="viewReceptionDetail(${b.id})">
      <td><strong>${escapeHtml(b.numero_reception)}</strong></td>
      <td>${formatDate(b.date_reception)}</td>
      <td>${escapeHtml(b.fournisseur)}</td>
      <td>${b.total_lignes || 1}</td>
      <td>${formatNumber(b.quantite_totale)}</td>
      <td>${getStatusBadge(b.statut)}</td>
      <td>${getDecisionBadge(b.decision_technique)}</td>
      <td onclick="event.stopPropagation();">
        <button class="btn btn-secondary btn-sm" onclick="viewReceptionDetail(${b.id})">Consulter</button>
      </td>
    </tr>
  `).join('');
}

// --------------------------------------------------------------------------
// Export Excel
// --------------------------------------------------------------------------
function exportExcel() {
  window.open('/api/export', '_blank');
  showToast('Téléchargement du fichier Excel en cours...', 'info');
}

// --------------------------------------------------------------------------
// Modal Helpers
// --------------------------------------------------------------------------
function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// --------------------------------------------------------------------------
// UI Badges & Formatting
// --------------------------------------------------------------------------
function getStatusBadge(statut) {
  switch (statut) {
    case 'EN_ATTENTE_TECHNIQUE':
      return '<span class="badge badge-warning">⏳ En attente Technique</span>';
    case 'EN_COURS_TECHNIQUE':
      return '<span class="badge badge-info">🔬 En cours Contrôle</span>';
    case 'VALIDE_TECHNIQUE':
      return '<span class="badge badge-purple">🏬 En attente Magasin</span>';
    case 'VALIDE_MAGASIN':
      return '<span class="badge badge-success">✅ Validé Magasin (Clôturé)</span>';
    case 'NON_CONFORME':
      return '<span class="badge badge-danger">❌ Non Conforme</span>';
    case 'ECART_MAGASIN':
      return '<span class="badge badge-warning">⚠️ Clôturé avec Écart</span>';
    default:
      return `<span class="badge badge-gray">${escapeHtml(statut || '--')}</span>`;
  }
}

function getDecisionBadge(decision) {
  if (!decision) return '<span style="color:#94a3b8; font-size:12px;">--</span>';
  switch (decision) {
    case 'CONFORME':
      return '<span class="badge badge-success">Conforme</span>';
    case 'AVEC_RESERVE':
      return '<span class="badge badge-warning">Avec réserve</span>';
    case 'AVEC_ECART':
      return '<span class="badge badge-warning">Avec écart</span>';
    case 'NON_CONFORME':
    case 'REFUSE':
      return '<span class="badge badge-danger">Refusé</span>';
    default:
      return `<span class="badge badge-gray">${escapeHtml(decision)}</span>`;
  }
}

function getConformiteBadge(statut) {
  if (!statut || statut === 'EN_ATTENTE') return '<span class="badge badge-gray">En attente</span>';
  if (statut === 'CONFORME') return '<span class="badge badge-success">Conforme</span>';
  if (statut === 'AVEC_RESERVE') return '<span class="badge badge-warning">Réserve</span>';
  if (statut === 'NON_CONFORME' || statut === 'REFUSE') return '<span class="badge badge-danger">Non conf.</span>';
  if (statut === 'ECART') return '<span class="badge badge-warning">Écart</span>';
  return `<span class="badge badge-gray">${escapeHtml(statut)}</span>`;
}

function formatDate(isoStr) {
  if (!isoStr) return '--';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch (e) {
    return isoStr;
  }
}

function formatDateTime(isoStr) {
  if (!isoStr) return '--';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return isoStr;
  }
}

function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('fr-FR');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'danger') toast.style.borderLeftColor = 'var(--sensus-danger)';
  if (type === 'warning') toast.style.borderLeftColor = 'var(--sensus-warning)';
  if (type === 'info') toast.style.borderLeftColor = 'var(--sensus-info)';
  if (type === 'success') toast.style.borderLeftColor = 'var(--sensus-green)';

  toast.innerHTML = `<span>${escapeHtml(msg)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
