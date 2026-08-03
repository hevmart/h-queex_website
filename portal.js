const STORAGE_KEY = 'hqueex_portal_state_v2';
const KPI_WINDOW_KEY = 'hqueex_portal_kpi_window_v1';
const STATUS_FILTER_KEY = 'hqueex_portal_status_filter_v1';
const CLIENT_SEARCH_KEY = 'hqueex_portal_client_search_v1';

function contentValue(key, fallback) {
  const values = window.__HQ_CONTENT_VALUES__ || {};
  const value = values[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function contentTemplate(key, fallback, tokens) {
  const template = contentValue(key, fallback);
  return Object.keys(tokens || {}).reduce((result, token) => {
    return result.replaceAll(`{${token}}`, String(tokens[token]));
  }, template);
}

function makeWorkspace(name) {
  const now = new Date().toISOString();
  return {
    id: `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    status: 'active',
    createdAt: now,
    activatedAt: now,
    completedAt: null,
    archivedAt: null,
    logoUrl: '',
    phase: contentValue('portalRuntimeDefaultPhaseEvidenceReview', 'Evidence Review'),
    files: [],
    deliverables: [],
    messages: [],
    notifications: [
      {
        text: contentTemplate(
          'portalRuntimeNotificationWorkspaceInitialized',
          'Workspace initialized: {name}.',
          { name }
        ),
        time: now,
        unread: true,
      },
    ],
    activity: [
      {
        action: contentValue('portalRuntimeActivityWorkspaceInitialized', 'Workspace initialized'),
        actor: 'System',
        time: now,
      },
    ],
  };
}

function makeSampleCompletedWorkspace() {
  const now = new Date().toISOString();
  return {
    id: 'ws_example_completed_client',
    name: contentValue(
      'portalRuntimeSampleCompletedWorkspaceName',
      'Example Completed Client Workspace'
    ),
    status: 'completed',
    createdAt: now,
    activatedAt: null,
    completedAt: now,
    archivedAt: null,
    logoUrl: '',
    phase: 'Delivery',
    files: [
      {
        name: contentValue('portalRuntimeSampleFileName', 'Current-State Process Map.pdf'),
        type: 'Document',
        notes: contentValue('portalRuntimeSampleFileNotes', 'Baseline operations capture'),
        actor: 'Client Operations Lead',
        time: now,
      },
    ],
    deliverables: [
      {
        title: contentValue('portalRuntimeSampleDeliverableTitle', 'Operational Clarity Report'),
        version: 'v1.0',
        summary: contentValue(
          'portalRuntimeSampleDeliverableSummary',
          'Final report issued with implementation roadmap.'
        ),
        actor: 'H-Queex Operator',
        time: now,
      },
    ],
    messages: [
      {
        body: contentValue(
          'portalRuntimeSampleMessage',
          'Final walkthrough completed. Team can proceed with implementation sprint.'
        ),
        actor: 'H-Queex Operator',
        time: now,
      },
    ],
    notifications: [
      {
        text: contentValue(
          'portalRuntimeSampleNotification',
          'Project marked completed and handover package delivered.'
        ),
        time: now,
        unread: true,
      },
    ],
    activity: [
      {
        action: contentValue(
          'portalRuntimeSampleActivityCompleted',
          'Workspace marked completed'
        ),
        actor: 'System',
        time: now,
      },
    ],
  };
}

const defaultState = {
  session: null,
  selectedClientId: null,
  clients: [
    makeWorkspace(contentValue('portalRuntimeDefaultWorkspaceNameA', 'Client Workspace A')),
    makeSampleCompletedWorkspace(),
  ],
};

function normalizeWorkspace(workspace) {
  const status =
    workspace.status === 'completed' || workspace.status === 'archived'
      ? workspace.status
      : 'active';

  return {
    id: workspace.id || `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: workspace.name || contentValue('portalRuntimeDefaultWorkspaceFallback', 'Client Workspace'),
    status,
    createdAt: workspace.createdAt || workspace.updatedAt || new Date().toISOString(),
    activatedAt: status === 'active' ? workspace.activatedAt || workspace.updatedAt || null : null,
    completedAt: status === 'completed' ? workspace.completedAt || workspace.updatedAt || null : null,
    archivedAt: status === 'archived' ? workspace.archivedAt || workspace.updatedAt || null : null,
    logoUrl: String(workspace.logoUrl || '').trim(),
    phase:
      workspace.phase || contentValue('portalRuntimeDefaultPhaseEvidenceReview', 'Evidence Review'),
    files: Array.isArray(workspace.files) ? workspace.files : [],
    deliverables: Array.isArray(workspace.deliverables) ? workspace.deliverables : [],
    messages: Array.isArray(workspace.messages) ? workspace.messages : [],
    notifications: Array.isArray(workspace.notifications) ? workspace.notifications : [],
    activity: Array.isArray(workspace.activity) ? workspace.activity : [],
  };
}

function migrateLegacyState(parsed) {
  if (Array.isArray(parsed.clients) && parsed.clients.length > 0) {
    return {
      session: parsed.session || null,
      selectedClientId: parsed.selectedClientId || parsed.clients[0].id,
      clients: parsed.clients.map(normalizeWorkspace),
    };
  }

  const migratedWorkspace = makeWorkspace(
    contentValue('portalRuntimeDefaultWorkspaceNameA', 'Client Workspace A')
  );
  migratedWorkspace.phase = parsed.phase || migratedWorkspace.phase;
  migratedWorkspace.files = Array.isArray(parsed.files) ? parsed.files : [];
  migratedWorkspace.deliverables = Array.isArray(parsed.deliverables) ? parsed.deliverables : [];
  migratedWorkspace.messages = Array.isArray(parsed.messages) ? parsed.messages : [];
  migratedWorkspace.notifications = Array.isArray(parsed.notifications)
    ? parsed.notifications
    : migratedWorkspace.notifications;
  migratedWorkspace.activity = Array.isArray(parsed.activity)
    ? parsed.activity
    : migratedWorkspace.activity;

  return {
    session: parsed.session || null,
    selectedClientId: migratedWorkspace.id,
    clients: [migratedWorkspace],
  };
}

function readState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(defaultState);
  }

  try {
    const parsed = JSON.parse(raw);
    const migrated = migrateLegacyState(parsed);
    return {
      session: migrated.session,
      selectedClientId: migrated.selectedClientId,
      clients: migrated.clients,
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function ensureSampleWorkspace(stateModel) {
  const exists = stateModel.clients.some((item) => item.id === 'ws_example_completed_client');
  if (!exists) {
    stateModel.clients.push(makeSampleCompletedWorkspace());
  }

  if (!stateModel.selectedClientId && stateModel.clients.length > 0) {
    stateModel.selectedClientId = stateModel.clients[0].id;
  }
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = readState();
ensureSampleWorkspace(state);

const loginShell = document.getElementById('login-shell');
const appShell = document.getElementById('app-shell');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const loginNote = document.getElementById('login-note');

const sessionName = document.getElementById('session-name');
const sessionRole = document.getElementById('session-role');
const workspaceLabel = document.getElementById('workspace-label');
const phaseSelect = document.getElementById('phase-select');

const workspaceSwitchBlock = document.getElementById('workspace-switch-block');
const clientSwitch = document.getElementById('client-switch');
const workspaceLogoUpdateInput = document.getElementById('workspace-logo-update-input');
const updateLogoBtn = document.getElementById('update-logo-btn');
const logoUpdateNote = document.getElementById('logo-update-note');
const workspaceForm = document.getElementById('workspace-form');
const workspaceNameInput = document.getElementById('workspace-name-input');
const workspaceLogoInput = document.getElementById('workspace-logo-input');
const workspaceStatusInput = document.getElementById('workspace-status-input');
const workspaceNote = document.getElementById('workspace-note');

const operatorOverview = document.getElementById('operator-overview');
const activeGroup = document.getElementById('active-group');
const completedGroup = document.getElementById('completed-group');
const archivedGroup = document.getElementById('archived-group');
const clientCards = document.getElementById('client-cards');
const completedClientCards = document.getElementById('completed-client-cards');
const archivedClientCards = document.getElementById('archived-client-cards');
const clientSearch = document.getElementById('client-search');
const statusFilter = document.getElementById('status-filter');
const kpiWindow = document.getElementById('kpi-window');
const kpiActiveCount = document.getElementById('kpi-active-count');
const kpiCompletedCount = document.getElementById('kpi-completed-count');
const kpiArchivedCount = document.getElementById('kpi-archived-count');
const kpiActiveTrend = document.getElementById('kpi-active-trend');
const kpiCompletedTrend = document.getElementById('kpi-completed-trend');
const kpiArchivedTrend = document.getElementById('kpi-archived-trend');

const nextAction = document.getElementById('next-action');
const latestDeliverable = document.getElementById('latest-deliverable');
const unreadCount = document.getElementById('unread-count');
const notificationList = document.getElementById('notification-list');
const statusStrip = document.getElementById('status-strip');
const overviewTitle = document.getElementById('overview-title');
const portfolioViewBtn = document.getElementById('portfolio-view-btn');
const workspaceFocusNote = document.getElementById('workspace-focus-note');
const workspaceIdentity = document.getElementById('workspace-identity');
const workspaceIdentityName = document.getElementById('workspace-identity-name');
const workspaceIdentityMeta = document.getElementById('workspace-identity-meta');
const workspaceIdentityAvatarImg = document.getElementById('workspace-identity-avatar-img');
const workspaceIdentityAvatarText = document.getElementById('workspace-identity-avatar-text');

const uploadForm = document.getElementById('upload-form');
const uploadNote = document.getElementById('upload-note');
const fileTableBody = document.getElementById('file-table-body');

const deliverableForm = document.getElementById('deliverable-form');
const deliverableNote = document.getElementById('deliverable-note');
const deliverableList = document.getElementById('deliverable-list');

const messageForm = document.getElementById('message-form');
const messageList = document.getElementById('message-list');

const activityList = document.getElementById('activity-list');

const tabs = Array.from(document.querySelectorAll('.tab-btn'));
const panels = Array.from(document.querySelectorAll('.panel'));

let operatorViewMode = 'portfolio';

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function roleIsOperator() {
  return Boolean(state.session && state.session.role === 'operator');
}

function getWorkspaceById(workspaceId) {
  return state.clients.find((item) => item.id === workspaceId) || null;
}

function getActiveWorkspace() {
  if (!state.session) {
    return null;
  }

  if (roleIsOperator()) {
    return getWorkspaceById(state.selectedClientId) || state.clients[0] || null;
  }

  return getWorkspaceById(state.session.clientId) || null;
}

function findWorkspaceByName(name) {
  const normalized = name.trim().toLowerCase();
  return state.clients.find((item) => item.name.trim().toLowerCase() === normalized) || null;
}

function addWorkspace(name) {
  return addWorkspaceWithStatus(name, 'active');
}

function addWorkspaceWithStatus(name, status, logoUrl) {
  const existing = findWorkspaceByName(name);
  if (existing) {
    return existing;
  }

  const workspace = makeWorkspace(name);
  workspace.status = status;
  workspace.logoUrl = String(logoUrl || '').trim();
  state.clients.push(workspace);
  return workspace;
}

function getValidStatus(value) {
  if (value === 'completed' || value === 'archived') {
    return value;
  }

  return 'active';
}

function getStatusLabel(value) {
  if (value === 'completed') {
    return contentValue('portalControlStatusCompleted', 'Completed');
  }

  if (value === 'archived') {
    return contentValue('portalControlStatusArchived', 'Archived');
  }

  return contentValue('portalControlStatusActive', 'Active');
}

function getStatusTimestampLine(workspace) {
  if (workspace.status === 'completed' && workspace.completedAt) {
    return contentTemplate(
      'portalRuntimeStatusTimestampCompleted',
      'Completed on {time}',
      { time: formatTime(workspace.completedAt) }
    );
  }

  if (workspace.status === 'archived' && workspace.archivedAt) {
    return contentTemplate(
      'portalRuntimeStatusTimestampArchived',
      'Archived on {time}',
      { time: formatTime(workspace.archivedAt) }
    );
  }

  return contentValue('portalRuntimeStatusTimestampActive', 'Current engagement is active.');
}

function isWithinLastDays(iso, days) {
  if (!iso) {
    return false;
  }

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  const now = Date.now();
  const threshold = now - days * 24 * 60 * 60 * 1000;
  return parsed.getTime() >= threshold;
}

function getTrendWindowDays() {
  const raw = kpiWindow ? Number(kpiWindow.value) : 7;
  if (raw === 30 || raw === 90) {
    return raw;
  }

  return 7;
}

function saveTrendWindowPreference(days) {
  localStorage.setItem(KPI_WINDOW_KEY, String(days));
}

function loadTrendWindowPreference() {
  const raw = localStorage.getItem(KPI_WINDOW_KEY);
  const value = Number(raw);
  if (value === 30 || value === 90) {
    return value;
  }

  return 7;
}

function saveStatusFilterPreference(value) {
  if (value === 'active' || value === 'completed' || value === 'archived' || value === 'all') {
    localStorage.setItem(STATUS_FILTER_KEY, value);
  }
}

function loadStatusFilterPreference() {
  const raw = localStorage.getItem(STATUS_FILTER_KEY);
  if (raw === 'active' || raw === 'completed' || raw === 'archived') {
    return raw;
  }

  return 'all';
}

function saveClientSearchPreference(value) {
  localStorage.setItem(CLIENT_SEARCH_KEY, value || '');
}

function loadClientSearchPreference() {
  return localStorage.getItem(CLIENT_SEARCH_KEY) || '';
}

function setTrendLabel(element, count, days) {
  if (!element) {
    return;
  }

  element.textContent = `+${count} last ${days} days`;
}

function setWorkspaceIdentity(workspace, visible) {
  if (!workspaceIdentity || !workspaceIdentityName || !workspaceIdentityMeta) {
    return;
  }

  const computeInitials = (name) =>
    String(name || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'CW';

  if (!workspace || !visible) {
    workspaceIdentity.classList.add('hidden');
    workspaceIdentityName.textContent = 'Client Name';
    workspaceIdentityMeta.textContent = '';
    if (workspaceIdentityAvatarImg) {
      workspaceIdentityAvatarImg.classList.add('hidden');
      workspaceIdentityAvatarImg.removeAttribute('src');
    }
    if (workspaceIdentityAvatarText) {
      workspaceIdentityAvatarText.textContent = 'CN';
      workspaceIdentityAvatarText.classList.remove('hidden');
    }
    return;
  }

  workspaceIdentity.classList.remove('hidden');
  workspaceIdentityName.textContent = workspace.name;
  workspaceIdentityMeta.textContent = `${getStatusLabel(workspace.status)} status · Phase ${workspace.phase}`;

  if (workspaceIdentityAvatarImg && workspaceIdentityAvatarText) {
    if (workspace.logoUrl) {
      workspaceIdentityAvatarImg.onerror = () => {
        workspaceIdentityAvatarImg.classList.add('hidden');
        workspaceIdentityAvatarImg.removeAttribute('src');
        workspaceIdentityAvatarText.textContent = computeInitials(workspace.name);
        workspaceIdentityAvatarText.classList.remove('hidden');
      };
      workspaceIdentityAvatarImg.src = workspace.logoUrl;
      workspaceIdentityAvatarImg.classList.remove('hidden');
      workspaceIdentityAvatarText.classList.add('hidden');
    } else {
      workspaceIdentityAvatarImg.onerror = null;
      workspaceIdentityAvatarImg.classList.add('hidden');
      workspaceIdentityAvatarImg.removeAttribute('src');
      workspaceIdentityAvatarText.textContent = computeInitials(workspace.name);
      workspaceIdentityAvatarText.classList.remove('hidden');
    }
  }
}

function syncLogoToolsWithActiveWorkspace() {
  if (!workspaceLogoUpdateInput || !logoUpdateNote) {
    return;
  }

  const workspace = getActiveWorkspace();
  if (!workspace || !roleIsOperator()) {
    workspaceLogoUpdateInput.value = '';
    logoUpdateNote.textContent = '';
    return;
  }

  workspaceLogoUpdateInput.value = workspace.logoUrl || '';
}

function addActivity(workspace, action, actor) {
  workspace.activity.unshift({
    action,
    actor,
    time: new Date().toISOString(),
  });

  if (workspace.activity.length > 80) {
    workspace.activity = workspace.activity.slice(0, 80);
  }

  workspace.updatedAt = new Date().toISOString();
}

function addNotification(workspace, text) {
  workspace.notifications.unshift({
    text,
    time: new Date().toISOString(),
    unread: true,
  });

  if (workspace.notifications.length > 30) {
    workspace.notifications = workspace.notifications.slice(0, 30);
  }

  workspace.updatedAt = new Date().toISOString();
}

function setTab(tabName) {
  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  panels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === `panel-${tabName}`);
  });
}

function renderStatusStrip(workspace) {
  const statuses = [
    ['Intake', 'Intake'],
    ['Qualification', 'Qualification'],
    ['Portal Setup', 'Evidence Review'],
    ['Evidence Review', 'Design'],
    ['Report Delivery', 'Delivery'],
  ];

  statusStrip.innerHTML = '';

  statuses.forEach(([label, phaseKey]) => {
    const article = document.createElement('article');
    const isCurrent = workspace.phase === phaseKey;
    article.innerHTML = `<span>${label}</span><strong>${isCurrent ? 'In Progress' : 'Tracked'}</strong>`;
    statusStrip.appendChild(article);
  });
}

function renderOverview(workspace) {
  const phaseActionMap = {
    Intake: contentValue('portalRuntimeOverviewActionIntake', 'Complete intake package review'),
    Qualification: contentValue(
      'portalRuntimeOverviewActionQualification',
      'Finalize fit decision and engagement terms'
    ),
    'Evidence Review': contentValue(
      'portalRuntimeOverviewActionEvidenceReview',
      'Upload current-state materials'
    ),
    Design: contentValue('portalRuntimeOverviewActionDesign', 'Review process architecture draft'),
    Delivery: contentValue(
      'portalRuntimeOverviewActionDelivery',
      'Validate deliverable release package'
    ),
    Monitoring: contentValue(
      'portalRuntimeOverviewActionMonitoring',
      'Review monthly governance report'
    ),
  };

  renderStatusStrip(workspace);

  nextAction.textContent =
    phaseActionMap[workspace.phase] ||
    contentValue('portalRuntimeOverviewActionDefault', 'Review project updates');

  if (workspace.deliverables.length === 0) {
    latestDeliverable.textContent = contentValue('portalRuntimeLatestNonePublished', 'None published');
  } else {
    const latest = workspace.deliverables[0];
    latestDeliverable.textContent = `${latest.title} ${latest.version}`;
  }

  const unread = workspace.notifications.filter((item) => item.unread !== false).length;
  unreadCount.textContent = String(unread);

  notificationList.innerHTML = '';
  workspace.notifications.forEach((item, index) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${item.text}</strong><br /><small>${formatTime(item.time)}</small>`;
    notificationList.appendChild(li);

    if (index < 3) {
      item.unread = false;
    }
  });
}

function renderFiles(workspace) {
  fileTableBody.innerHTML = '';

  workspace.files.forEach((file) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${file.name}</td>
      <td>${file.type}</td>
      <td>${file.notes || '-'}</td>
      <td>${file.actor}</td>
      <td>${formatTime(file.time)}</td>
    `;
    fileTableBody.appendChild(row);
  });
}

function renderDeliverables(workspace) {
  deliverableList.innerHTML = '';

  workspace.deliverables.forEach((item) => {
    const card = document.createElement('article');
    card.className = 'version-item';
    card.innerHTML = `
      <h5>${item.title} ${item.version}</h5>
      <p>${item.summary}</p>
      <small>Published by ${item.actor} on ${formatTime(item.time)}</small>
    `;
    deliverableList.appendChild(card);
  });
}

function renderMessages(workspace) {
  messageList.innerHTML = '';

  workspace.messages.forEach((msg) => {
    const li = document.createElement('li');
    li.className = 'message-item';
    li.innerHTML = `
      <p>${msg.body}</p>
      <small>${msg.actor} · ${formatTime(msg.time)}</small>
    `;
    messageList.appendChild(li);
  });
}

function renderActivity(workspace) {
  activityList.innerHTML = '';

  workspace.activity.forEach((log) => {
    const li = document.createElement('li');
    li.className = 'activity-item';
    li.innerHTML = `
      <p>${log.action}</p>
      <small>${log.actor} · ${formatTime(log.time)}</small>
    `;
    activityList.appendChild(li);
  });
}

function renderWorkspaceSwitcher() {
  if (!state.session) {
    return;
  }

  if (roleIsOperator()) {
    workspaceSwitchBlock.classList.remove('hidden');
    clientSwitch.innerHTML = '';

    state.clients.forEach((workspace) => {
      const option = document.createElement('option');
      option.value = workspace.id;
      option.textContent = workspace.name;
      clientSwitch.appendChild(option);
    });

    if (!state.selectedClientId || !getWorkspaceById(state.selectedClientId)) {
      state.selectedClientId = state.clients[0].id;
    }

    const selectedWorkspace = getWorkspaceById(state.selectedClientId);
    if (selectedWorkspace && selectedWorkspace.status === 'archived') {
      const firstNonArchived = state.clients.find((item) => item.status !== 'archived');
      if (firstNonArchived) {
        state.selectedClientId = firstNonArchived.id;
      }
    }

    clientSwitch.value = state.selectedClientId;
  } else {
    workspaceSwitchBlock.classList.add('hidden');
  }
}

function renderOperatorOverview() {
  const workspace = getActiveWorkspace();

  if (!state.session || !roleIsOperator() || !workspace) {
    operatorOverview.classList.add('hidden');
    setWorkspaceIdentity(workspace, false);
    if (portfolioViewBtn) {
      portfolioViewBtn.classList.add('hidden');
    }
    if (workspaceFocusNote) {
      workspaceFocusNote.classList.add('hidden');
      workspaceFocusNote.textContent = '';
    }
    if (overviewTitle) {
      overviewTitle.textContent = contentValue(
        'portalRuntimeOverviewTitleProjectSnapshot',
        'Project Snapshot'
      );
    }
    return;
  }

  if (operatorViewMode === 'workspace') {
    operatorOverview.classList.add('hidden');
    setWorkspaceIdentity(workspace, true);
    if (portfolioViewBtn) {
      portfolioViewBtn.classList.remove('hidden');
    }
    if (workspaceFocusNote) {
      workspaceFocusNote.classList.remove('hidden');
      workspaceFocusNote.textContent = contentTemplate(
        'portalRuntimeFocusDedicatedWorkspace',
        'Dedicated workspace view: {name}',
        { name: workspace.name }
      );
    }
    if (overviewTitle) {
      overviewTitle.textContent = contentValue(
        'portalRuntimeOverviewTitleClientWorkspace',
        'Client Workspace'
      );
    }
    return;
  }

  if (portfolioViewBtn) {
    portfolioViewBtn.classList.add('hidden');
  }
  setWorkspaceIdentity(workspace, false);
  if (workspaceFocusNote) {
    workspaceFocusNote.classList.add('hidden');
    workspaceFocusNote.textContent = '';
  }
  if (overviewTitle) {
    overviewTitle.textContent = contentValue(
      'portalRuntimeOverviewTitleProjectSnapshot',
      'Project Snapshot'
    );
  }

  operatorOverview.classList.remove('hidden');
  clientCards.innerHTML = '';

  completedClientCards.innerHTML = '';
  archivedClientCards.innerHTML = '';

  const query = clientSearch ? clientSearch.value.trim().toLowerCase() : '';
  const statusView = statusFilter ? statusFilter.value : 'all';

  const filtered = state.clients.filter((item) => {
    const matchesName = query.length === 0 || item.name.toLowerCase().includes(query);
    const matchesStatus = statusView === 'all' || item.status === statusView;
    return matchesName && matchesStatus;
  });

  const activeWorkspaces = filtered.filter((item) => item.status === 'active');
  const completedWorkspaces = filtered.filter((item) => item.status === 'completed');
  const archivedWorkspaces = filtered.filter((item) => item.status === 'archived');

  const allActive = state.clients.filter((item) => item.status === 'active').length;
  const allCompleted = state.clients.filter((item) => item.status === 'completed').length;
  const allArchived = state.clients.filter((item) => item.status === 'archived').length;
  const trendWindowDays = getTrendWindowDays();
  const activeTrendCount = state.clients.filter(
    (item) =>
      item.status === 'active' &&
      isWithinLastDays(item.activatedAt || item.createdAt, trendWindowDays)
  ).length;
  const completedTrendCount = state.clients.filter(
    (item) => item.status === 'completed' && isWithinLastDays(item.completedAt, trendWindowDays)
  ).length;
  const archivedTrendCount = state.clients.filter(
    (item) => item.status === 'archived' && isWithinLastDays(item.archivedAt, trendWindowDays)
  ).length;

  if (kpiActiveCount) {
    kpiActiveCount.textContent = String(allActive);
  }

  if (kpiCompletedCount) {
    kpiCompletedCount.textContent = String(allCompleted);
  }

  if (kpiArchivedCount) {
    kpiArchivedCount.textContent = String(allArchived);
  }

  setTrendLabel(kpiActiveTrend, activeTrendCount, trendWindowDays);
  setTrendLabel(kpiCompletedTrend, completedTrendCount, trendWindowDays);
  setTrendLabel(kpiArchivedTrend, archivedTrendCount, trendWindowDays);

  activeGroup.classList.toggle('hidden', statusView !== 'all' && statusView !== 'active');
  completedGroup.classList.toggle('hidden', statusView !== 'all' && statusView !== 'completed');
  archivedGroup.classList.toggle('hidden', statusView !== 'all' && statusView !== 'archived');

  const renderCardGroup = (workspaces, targetElement) => {
    if (workspaces.length === 0) {
      const empty = document.createElement('article');
      empty.className = 'empty-card';
      empty.textContent = contentValue(
        'portalRuntimeEmptyClientSection',
        'No client workspaces in this section.'
      );
      targetElement.appendChild(empty);
      return;
    }

    workspaces.forEach((workspace) => {
      const unread = workspace.notifications.filter((item) => item.unread !== false).length;
      const latestActivity = workspace.activity[0];
      const card = document.createElement('article');
      card.className = `client-card${workspace.id === state.selectedClientId ? ' active' : ''}`;
      const activeLabel =
        workspace.status === 'active'
          ? contentValue('portalRuntimeButtonKeepActive', 'Keep Active')
          : contentValue('portalRuntimeButtonMarkActive', 'Mark Active');
      const completedLabel =
        workspace.status === 'completed'
          ? contentValue('portalRuntimeButtonKeepCompleted', 'Keep Completed')
          : contentValue('portalRuntimeButtonMarkCompleted', 'Mark Completed');
      const archivedLabel =
        workspace.status === 'archived'
          ? contentValue('portalRuntimeButtonRestoreArchived', 'Restore from Archived')
          : contentValue('portalRuntimeButtonArchive', 'Archive');
      card.innerHTML = `
        <h5>${workspace.name}</h5>
        <span class="status-badge ${workspace.status}">${getStatusLabel(workspace.status)}</span>
        <p>${getStatusTimestampLine(workspace)}</p>
        <p>Phase: ${workspace.phase}</p>
        <p>Unread: ${unread}</p>
        <p>${latestActivity ? `Last activity: ${formatTime(latestActivity.time)}` : 'No activity yet'}</p>
        <button type="button" data-action="open" data-workspace-id="${workspace.id}">Open Workspace</button>
        <button type="button" data-action="set-active" data-workspace-id="${workspace.id}">${activeLabel}</button>
        <button type="button" data-action="set-completed" data-workspace-id="${workspace.id}">${completedLabel}</button>
        <button type="button" data-action="set-archived" data-workspace-id="${workspace.id}">${archivedLabel}</button>
      `;
      targetElement.appendChild(card);
    });
  };

  renderCardGroup(activeWorkspaces, clientCards);
  renderCardGroup(completedWorkspaces, completedClientCards);
  renderCardGroup(archivedWorkspaces, archivedClientCards);

  operatorOverview.querySelectorAll('button[data-workspace-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const workspaceId = button.getAttribute('data-workspace-id');
      const action = button.getAttribute('data-action');
      const workspace = getWorkspaceById(workspaceId);

      if (!workspace) {
        return;
      }

      if (action === 'open') {
        const wasSelected = state.selectedClientId === workspace.id;

        if (workspace.status === 'archived') {
          const restoreConfirmed = window.confirm(
            contentTemplate(
              'portalRuntimeConfirmRestoreArchived',
              'Workspace "{name}" is archived. Restore it to Active and open now?',
              { name: workspace.name }
            )
          );
          if (!restoreConfirmed) {
            workspaceNote.textContent = contentValue(
              'portalRuntimeNoteArchivedUnchanged',
              'Archived workspace remains unchanged.'
            );
            return;
          }

          workspace.status = 'active';
          workspace.archivedAt = null;
          workspace.activatedAt = new Date().toISOString();
          addActivity(
            workspace,
            contentValue('portalRuntimeActivityRestoredFromArchived', 'Workspace restored from archived'),
            state.session.name
          );
          addNotification(
            workspace,
            contentTemplate(
              'portalRuntimeNotificationRestoredActiveBy',
              'Workspace restored to Active by {actor}.',
              { actor: state.session.name }
            )
          );
        }

        if (wasSelected) {
          workspaceNote.textContent = contentTemplate(
            'portalRuntimeNoteAlreadyOpen',
            '{name} is already open.',
            { name: workspace.name }
          );
        }

        state.selectedClientId = workspace.id;
        operatorViewMode = 'workspace';
        setTab('overview');
        if (!wasSelected && workspace.status === 'active') {
          workspaceNote.textContent = contentTemplate(
            'portalRuntimeNoteOpened',
            '{name} opened.',
            { name: workspace.name }
          );
        }
      }

      if (action === 'set-active' || action === 'set-completed' || action === 'set-archived') {
        const newStatus =
          action === 'set-active'
            ? 'active'
            : action === 'set-completed'
              ? 'completed'
              : workspace.status === 'archived'
                ? 'active'
                : 'archived';

        if (newStatus === 'archived') {
          const confirmed = window.confirm(
            contentTemplate(
              'portalRuntimeConfirmArchive',
              'Archive workspace "{name}"? Archived workspaces are hidden from active operations until restored.',
              { name: workspace.name }
            )
          );
          if (!confirmed) {
            return;
          }
        }

        if (workspace.status !== newStatus) {
          workspace.status = newStatus;

          if (newStatus === 'completed') {
            workspace.completedAt = new Date().toISOString();
            workspace.activatedAt = null;
            workspace.archivedAt = null;
          }

          if (newStatus === 'archived') {
            workspace.archivedAt = new Date().toISOString();
            workspace.activatedAt = null;
          }

          if (newStatus === 'active') {
            workspace.activatedAt = new Date().toISOString();
            workspace.archivedAt = null;
          }

          addActivity(
            workspace,
            contentTemplate(
              'portalRuntimeActivityStatusChangedTo',
              'Workspace status changed to {status}',
              { status: getStatusLabel(newStatus) }
            ),
            state.session.name
          );
          addNotification(
            workspace,
            contentTemplate(
              'portalRuntimeNotificationStatusUpdatedTo',
              'Workspace status updated to {status}.',
              { status: getStatusLabel(newStatus) }
            )
          );
        }

        if (newStatus === 'archived' && state.selectedClientId === workspace.id) {
          const replacement = state.clients.find((item) => item.status !== 'archived' && item.id !== workspace.id);
          if (replacement) {
            state.selectedClientId = replacement.id;
          }
        }

        if (newStatus !== 'archived') {
          state.selectedClientId = workspace.id;
        }

        workspaceNote.textContent = contentTemplate(
          'portalRuntimeNoteNowStatus',
          '{name} is now {status}.',
          { name: workspace.name, status: getStatusLabel(newStatus) }
        );
      }

      writeState(state);
      renderSession();
    });
  });
}

function renderSession() {
  if (!state.session) {
    loginShell.classList.remove('hidden');
    appShell.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    return;
  }

  const workspace = getActiveWorkspace();
  if (!workspace) {
    loginShell.classList.remove('hidden');
    appShell.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    return;
  }

  loginShell.classList.add('hidden');
  appShell.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');

  sessionName.textContent = state.session.name;
  sessionRole.textContent = `Role: ${
    roleIsOperator()
      ? contentValue('portalRuntimeRoleOperator', 'H-Queex Operator')
      : contentValue('portalRuntimeRoleClient', 'Client')
  }`;
  workspaceLabel.textContent = contentTemplate(
    'portalRuntimeWorkspaceLabelFormat',
    'Workspace: {name} ({status})',
    { name: workspace.name, status: getStatusLabel(workspace.status) }
  );
  phaseSelect.value = workspace.phase;

  const operator = roleIsOperator();
  if (!operator) {
    operatorViewMode = 'workspace';
    setWorkspaceIdentity(workspace, true);
    if (overviewTitle) {
      overviewTitle.textContent = contentValue(
        'portalRuntimeOverviewTitleClientWorkspace',
        'Client Workspace'
      );
    }
    if (workspaceFocusNote) {
      workspaceFocusNote.classList.remove('hidden');
      workspaceFocusNote.textContent = contentTemplate(
        'portalRuntimeFocusDedicatedWorkspace',
        'Dedicated workspace view: {name}',
        { name: workspace.name }
      );
    }
    if (portfolioViewBtn) {
      portfolioViewBtn.classList.add('hidden');
    }
  }
  if (operator) {
    setWorkspaceIdentity(workspace, operatorViewMode === 'workspace');
  }
  deliverableForm.querySelector('button').disabled = !operator;
  phaseSelect.disabled = !operator;

  if (!operator) {
    deliverableNote.textContent = contentValue(
      'portalRuntimeNoteOperatorRequiredDeliverables',
      'Operator role required to publish deliverables.'
    );
  } else {
    deliverableNote.textContent = '';
  }

  renderWorkspaceSwitcher();
  syncLogoToolsWithActiveWorkspace();
  renderOperatorOverview();
  renderOverview(workspace);
  renderFiles(workspace);
  renderDeliverables(workspace);
  renderMessages(workspace);
  renderActivity(workspace);

  writeState(state);
}

if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const name = String(formData.get('displayName') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const role = String(formData.get('role') || 'client').trim();
    const workspaceName = String(formData.get('workspaceName') || '').trim();
    const passphrase = String(formData.get('passphrase') || '').trim();

    if (!name || !email || !passphrase || !workspaceName) {
      loginNote.textContent = contentValue(
        'portalRuntimeNoteLoginAllFieldsRequired',
        'All fields are required to continue.'
      );
      return;
    }

    const workspace = addWorkspaceWithStatus(workspaceName, 'active');

    state.session = {
      name,
      email,
      role,
      clientId: role === 'client' ? workspace.id : null,
      loginAt: new Date().toISOString(),
    };

    state.selectedClientId = workspace.id;

    addActivity(workspace, contentValue('portalRuntimeActivityPortalLogin', 'Portal login'), name);
    addNotification(
      workspace,
      contentTemplate('portalRuntimeNotificationJoinedWorkspace', '{actor} joined workspace {workspace}.', {
        actor: name,
        workspace: workspace.name,
      })
    );

    writeState(state);
    loginForm.reset();
    loginNote.textContent = '';
    renderSession();
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    const workspace = getActiveWorkspace();
    const actor = state.session ? state.session.name : 'Session';
    if (workspace) {
      addActivity(workspace, contentValue('portalRuntimeActivityPortalLogout', 'Portal logout'), actor);
    }

    state.session = null;
    writeState(state);
    renderSession();
  });
}

if (clientSwitch) {
  clientSwitch.addEventListener('change', () => {
    if (!roleIsOperator()) {
      return;
    }

    state.selectedClientId = clientSwitch.value;
    writeState(state);
    renderSession();
  });
}

if (updateLogoBtn) {
  updateLogoBtn.addEventListener('click', () => {
    if (!roleIsOperator()) {
      if (logoUpdateNote) {
        logoUpdateNote.textContent = contentValue(
          'portalRuntimeNoteOperatorRequiredLogo',
          'Operator role required to update workspace logo.'
        );
      }
      return;
    }

    const workspace = getActiveWorkspace();
    if (!workspace) {
      if (logoUpdateNote) {
        logoUpdateNote.textContent = contentValue(
          'portalRuntimeNoteActiveWorkspaceRequired',
          'Active workspace is required.'
        );
      }
      return;
    }

    const nextLogoValue = String((workspaceLogoUpdateInput && workspaceLogoUpdateInput.value) || '').trim();
    const currentLogoValue = String(workspace.logoUrl || '').trim();

    if (nextLogoValue === currentLogoValue) {
      if (logoUpdateNote) {
        logoUpdateNote.textContent = contentValue(
          'portalRuntimeNoteNoLogoChange',
          'No logo change detected for this workspace.'
        );
      }
      return;
    }

    workspace.logoUrl = nextLogoValue;
    if (nextLogoValue) {
      addActivity(
        workspace,
        contentValue('portalRuntimeActivityLogoUpdated', 'Active workspace logo updated'),
        state.session.name
      );
      addNotification(
        workspace,
        contentTemplate('portalRuntimeNotificationLogoUpdatedBy', 'Workspace logo updated by {actor}.', {
          actor: state.session.name,
        })
      );
      if (logoUpdateNote) {
        logoUpdateNote.textContent = contentValue(
          'portalRuntimeNoteLogoUpdated',
          'Workspace logo updated.'
        );
      }
    } else {
      addActivity(
        workspace,
        contentValue('portalRuntimeActivityLogoCleared', 'Active workspace logo cleared'),
        state.session.name
      );
      addNotification(
        workspace,
        contentTemplate('portalRuntimeNotificationLogoClearedBy', 'Workspace logo cleared by {actor}.', {
          actor: state.session.name,
        })
      );
      if (logoUpdateNote) {
        logoUpdateNote.textContent = contentValue(
          'portalRuntimeNoteLogoCleared',
          'Workspace logo cleared. Initials fallback is active.'
        );
      }
    }

    writeState(state);
    renderSession();
  });
}

if (workspaceForm) {
  workspaceForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!roleIsOperator()) {
      workspaceNote.textContent = contentValue(
        'portalRuntimeNoteOperatorRequiredWorkspaces',
        'Operator role required to create workspaces.'
      );
      return;
    }

    const name = (workspaceNameInput.value || '').trim();
    const logoUrl = String((workspaceLogoInput && workspaceLogoInput.value) || '').trim();
    const requestedStatus = getValidStatus(
      workspaceStatusInput ? workspaceStatusInput.value : 'active'
    );
    if (!name) {
      workspaceNote.textContent = contentValue(
        'portalRuntimeNoteWorkspaceNameRequired',
        'Workspace name is required.'
      );
      return;
    }

    const existing = findWorkspaceByName(name);
    const workspace = addWorkspaceWithStatus(name, requestedStatus, logoUrl);
    state.selectedClientId = workspace.id;

    if (existing) {
      if (logoUrl) {
        workspace.logoUrl = logoUrl;
        addActivity(workspace, 'Client logo URL updated', state.session.name);
        addNotification(
          workspace,
          contentTemplate('portalRuntimeNotificationClientLogoUpdatedBy', 'Client logo updated by {actor}.', {
            actor: state.session.name,
          })
        );
        workspaceNote.textContent = contentValue(
          'portalRuntimeNoteWorkspaceExistsUpdatedLogo',
          'Workspace already exists. Switched to existing record and updated logo.'
        );
      } else {
        workspaceNote.textContent = contentValue(
          'portalRuntimeNoteWorkspaceExistsSwitched',
          'Workspace already exists. Switched to existing record.'
        );
      }
    } else {
      workspace.status = requestedStatus;
      workspace.logoUrl = logoUrl;
      if (requestedStatus === 'completed') {
        workspace.activatedAt = null;
        workspace.completedAt = new Date().toISOString();
      }
      if (requestedStatus === 'archived') {
        workspace.activatedAt = null;
        workspace.archivedAt = new Date().toISOString();
      }
      if (requestedStatus === 'active') {
        workspace.activatedAt = new Date().toISOString();
      }
      addActivity(
        workspace,
        contentValue('portalRuntimeActivityWorkspaceCreated', 'Workspace created'),
        state.session.name
      );
      addNotification(
        workspace,
        contentTemplate('portalRuntimeNotificationWorkspaceCreatedBy', 'Workspace created by {actor}.', {
          actor: state.session.name,
        })
      );
      workspaceNote.textContent = contentTemplate(
        'portalRuntimeNoteWorkspaceCreatedAsSelected',
        'Workspace created as {status} and selected.',
        { status: getStatusLabel(requestedStatus) }
      );
    }

    workspaceNameInput.value = '';
    if (workspaceLogoInput) {
      workspaceLogoInput.value = '';
    }
    writeState(state);
    renderSession();
  });
}

if (clientSearch) {
  clientSearch.value = loadClientSearchPreference();
  clientSearch.addEventListener('input', () => {
    if (!roleIsOperator()) {
      return;
    }

    saveClientSearchPreference(clientSearch.value);

    renderOperatorOverview();
  });
}

if (statusFilter) {
  statusFilter.value = loadStatusFilterPreference();
  statusFilter.addEventListener('change', () => {
    if (!roleIsOperator()) {
      return;
    }

    saveStatusFilterPreference(statusFilter.value);

    renderOperatorOverview();
  });
}

if (portfolioViewBtn) {
  portfolioViewBtn.addEventListener('click', () => {
    if (!roleIsOperator()) {
      return;
    }

    operatorViewMode = 'portfolio';
    workspaceNote.textContent = contentValue(
      'portalRuntimeNoteReturnedToPortfolio',
      'Returned to client portfolio view.'
    );
    renderSession();
  });
}

if (kpiWindow) {
  kpiWindow.value = String(loadTrendWindowPreference());
  kpiWindow.addEventListener('change', () => {
    if (!roleIsOperator()) {
      return;
    }

    saveTrendWindowPreference(getTrendWindowDays());

    renderOperatorOverview();
  });
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    setTab(tab.dataset.tab);
  });
});

if (uploadForm) {
  uploadForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!state.session) {
      uploadNote.textContent = contentValue('portalRuntimeNoteLoginRequired', 'Login is required.');
      return;
    }

    const workspace = getActiveWorkspace();
    if (!workspace) {
      uploadNote.textContent = 'Active workspace is required.';
      return;
    }

    const data = new FormData(uploadForm);
    const name = String(data.get('fileName') || '').trim();
    const type = String(data.get('fileType') || 'Document');
    const notes = String(data.get('fileNotes') || '').trim();

    workspace.files.unshift({
      name,
      type,
      notes,
      actor: state.session.name,
      time: new Date().toISOString(),
    });

    addActivity(
      workspace,
      contentTemplate('portalRuntimeActivityRecordedFileUpload', 'Recorded file upload: {name}', { name }),
      state.session.name
    );
    addNotification(
      workspace,
      contentTemplate('portalRuntimeNotificationNewFileRecorded', 'New file recorded: {name}', { name })
    );
    writeState(state);

    uploadForm.reset();
    uploadNote.textContent = contentValue(
      'portalRuntimeNoteUploadRecorded',
      'Upload recorded in workspace history.'
    );
    renderSession();
  });
}

if (deliverableForm) {
  deliverableForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!roleIsOperator()) {
      deliverableNote.textContent = contentValue(
        'portalRuntimeNoteOnlyOperatorCanPublish',
        'Only operator role can publish deliverables.'
      );
      return;
    }

    const workspace = getActiveWorkspace();
    if (!workspace) {
      deliverableNote.textContent = 'Active workspace is required.';
      return;
    }

    const data = new FormData(deliverableForm);
    const title = String(data.get('deliverableTitle') || '').trim();
    const version = String(data.get('deliverableVersion') || '').trim();
    const summary = String(data.get('deliverableSummary') || '').trim();

    workspace.deliverables.unshift({
      title,
      version,
      summary,
      actor: state.session.name,
      time: new Date().toISOString(),
    });

    addActivity(
      workspace,
      contentTemplate(
        'portalRuntimeActivityPublishedDeliverable',
        'Published deliverable: {title} {version}',
        { title, version }
      ),
      state.session.name
    );
    addNotification(
      workspace,
      contentTemplate(
        'portalRuntimeNotificationDeliverablePublished',
        'Deliverable published: {title} {version}',
        { title, version }
      )
    );
    writeState(state);

    deliverableForm.reset();
    deliverableNote.textContent = contentValue(
      'portalRuntimeNoteDeliverablePublished',
      'Deliverable version published.'
    );
    renderSession();
  });
}

if (messageForm) {
  messageForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!state.session) {
      return;
    }

    const workspace = getActiveWorkspace();
    if (!workspace) {
      return;
    }

    const data = new FormData(messageForm);
    const body = String(data.get('messageBody') || '').trim();
    if (!body) {
      return;
    }

    workspace.messages.unshift({
      body,
      actor: state.session.name,
      time: new Date().toISOString(),
    });

    addActivity(
      workspace,
      contentValue('portalRuntimeActivityPostedMessage', 'Posted asynchronous message'),
      state.session.name
    );
    addNotification(
      workspace,
      contentTemplate('portalRuntimeNotificationNewMessageFrom', 'New message from {actor}', {
        actor: state.session.name,
      })
    );
    writeState(state);

    messageForm.reset();
    renderSession();
  });
}

if (phaseSelect) {
  phaseSelect.addEventListener('change', () => {
    if (!roleIsOperator()) {
      return;
    }

    const workspace = getActiveWorkspace();
    if (!workspace) {
      return;
    }

    workspace.phase = phaseSelect.value;
    addActivity(
      workspace,
      contentTemplate('portalRuntimeActivityUpdatedPhaseTo', 'Updated project phase to {phase}', {
        phase: workspace.phase,
      }),
      state.session.name
    );
    addNotification(
      workspace,
      contentTemplate('portalRuntimeNotificationPhaseUpdated', 'Project phase updated: {phase}', {
        phase: workspace.phase,
      })
    );
    writeState(state);

    renderSession();
  });
}

renderSession();
setTab('overview');
