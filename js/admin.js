/**
 * AUTOSTYLES — Admin Panel JS
 * Requires: supabaseClient.js (экспортирует window.sb)
 */

// ─── ГЛОБАЛЬНОЕ СОСТОЯНИЕ ─────────────────────────────────────────────────────
const STATE = {
  data: {},          // { tableName: [...rows] }
  filtered: {},      // { tableName: [...rows] }
  pages: {},         // { tableName: currentPage }
  sort: {},          // { tableName: { col, dir } }
  pageSize: 20,
  modalType: null,
  modalEditId: null,
  confirmCallback: null,
  activeChat: null,
  charts: {},
};

// ─── SUPABASE ──────────────────────────────────────────────────────────────────
function getDB() {
  const db = window.sb || window.supabaseClient || window.supabase;
  if (db) return db;
  
  // Если клиент не найден, пробуем создать его заново
  if (typeof supabase !== 'undefined') {
    console.warn('Supabase client not found in window, creating new instance...');
    window.sb = supabase.createClient(
      "https://oekrtypfqaierhkhulab.supabase.co",
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9la3J0eXBmcWFpZXJoa2h1bGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NDgwMTYsImV4cCI6MjA3ODQyNDAxNn0.61ouoN7hBsGFibzrijeNG7i6HOcukDImbQjYRBZjQiA'
    );
    return window.sb;
  }
  
  throw new Error('Supabase не инициализирован. Проверьте подключение библиотеки и файл supabaseClient.js');
}

// ─── ИНИЦИАЛИЗАЦИЯ ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initDate();
  initNavigation();
  await checkConnection();
  await loadAllData();
});

function initDate() {
  const el = document.getElementById('hdr-date');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('ru-RU', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ─── НАВИГАЦИЯ ────────────────────────────────────────────────────────────────
function initNavigation() {
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.addEventListener('click', () => showSection(item.dataset.section));
  });
}

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

  const section = document.getElementById(`section-${name}`);
  const navItem = document.querySelector(`.nav-item[data-section="${name}"]`);

  if (section) section.classList.add('active');
  if (navItem) navItem.classList.add('active');

  const titles = {
    dashboard: 'Дашборд / Обзор',
    appointments: 'Записи / Управление',
    orders: 'Заказы / Управление',
    services: 'Услуги / Управление',
    promotions: 'Акции / Управление',
    bonuses: 'Бонусы / Управление',
    cars: 'Автомобили / Управление',
    car_photos: 'Фото авто / Галерея',
    maintenance: 'Напоминания о ТО',
    users: 'Пользователи / Управление',
    user_levels: 'Уровни / Управление',
    messages: 'Сообщения / Центр',
    reviews: 'Отзывы / Управление',
    notifications: 'Уведомления',
    documents: 'Документы',
    subscriptions: 'Подписки',
    service_history: 'История услуг',
    cart: 'Корзины / Управление',
    settings: 'Настройки / Система',
  };
  
  const titleEl = document.getElementById('page-title');
  if (titleEl) {
    const parts = (titles[name] || name).split(' / ');
    titleEl.innerHTML = parts[0] + (parts[1] ? ` <span>/ ${parts[1]}</span>` : '');
  }

  if (name === 'messages') renderMessageList();
}

// ─── ПРОВЕРКА ПОДКЛЮЧЕНИЯ ─────────────────────────────────────────────────────
async function checkConnection() {
  const statusEl = document.getElementById('conn-status');
  const labelEl  = document.getElementById('conn-label');
  try {
    const db = getDB();
    const { error } = await db.from('profiles').select('id', { count: 'exact', head: true });
    if (error) throw error;
    if (statusEl) { statusEl.className = 'conn-status connected'; }
    if (labelEl)  { labelEl.textContent = 'Подключено'; }
  } catch (e) {
    if (statusEl) { statusEl.className = 'conn-status disconnected'; }
    if (labelEl)  { labelEl.textContent = 'Ошибка'; }
    showToast('error', 'Supabase', e.message || 'Нет подключения к базе данных');
  }
}

// ─── ЗАГРУЗКА ВСЕХ ДАННЫХ ─────────────────────────────────────────────────────
async function loadAllData() {
  const icon = document.getElementById('refresh-icon');
  if (icon) icon.classList.add('fa-spin');

  try {
    await Promise.allSettled([
      fetchTable('appointments'),
      fetchTable('orders'),
      fetchTable('services'),
      fetchTable('service_types'),
      fetchTable('promotions'),
      fetchTable('bonuses'),
      fetchTable('cars'),
      fetchTable('car_photos'),
      fetchTable('maintenance_reminders'),
      fetchTable('profiles'),
      fetchTable('user_levels'),
      fetchTable('messages'),
      fetchTable('reviews'),
      fetchTable('notifications'),
      fetchTable('documents'),
      fetchTable('subscriptions'),
      fetchTable('service_history'),
      fetchTable('cart_items'),
    ]);

    renderAll();
    renderDashboard();
    updateBadges();
    updateDbStats();

  } catch (e) {
    showToast('error', 'Ошибка загрузки', e.message);
  } finally {
    if (icon) icon.classList.remove('fa-spin');
  }
}

// ─── УНИВЕРСАЛЬНЫЙ FETCH ───────────────────────────────────────────────────────
async function fetchTable(table, options = {}) {
  try {
    const db = getDB();
    let query = db.from(table).select(options.select || '*');
    if (options.order) query = query.order(options.order, { ascending: false });
    else query = query.order('id', { ascending: false });
    if (options.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) throw error;

    STATE.data[table] = data || [];
    STATE.filtered[table] = [...STATE.data[table]];
    STATE.pages[table] = STATE.pages[table] || 1;
    return data;
  } catch (e) {
    STATE.data[table] = STATE.data[table] || [];
    STATE.filtered[table] = [];
    console.error(`fetchTable(${table}):`, e.message);
    return [];
  }
}

// ─── RENDER ALL ───────────────────────────────────────────────────────────────
function renderAll() {
  renderAppointments();
  renderOrders();
  renderServices();
  renderServiceTypes();
  renderPromotions();
  renderBonuses();
  renderCars();
  renderCarPhotos();
  renderMaintenance();
  renderUsers();
  renderUserLevels();
  renderReviews();
  renderNotifications();
  renderDocuments();
  renderSubscriptions();
  renderServiceHistory();
  renderCartItems();
}

// ════════════════════════════════════════════════════════════════════════════════
// 1. APPOINTMENTS
// ════════════════════════════════════════════════════════════════════════════════
function renderAppointments() {
  const rows = paginate('appointments');
  const tbody = document.getElementById('tbody-appointments');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = emptyRow(8, 'Записей нет');
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td title="${esc(r.client_name || '')}">${esc(r.client_name || '—')}</td>
      <td>${esc(r.client_phone || '—')}</td>
      <td>${getServiceName(r.service_id)}</td>
      <td>${fmtDateTime(r.scheduled_at)}</td>
      <td>${statusBadge(r.status)}</td>
      <td>${fmtMoney(r.total_price)}</td>
      <td class="td-actions">
        <button class="action-btn edit" onclick="openModal('appointment', ${r.id})" title="Редактировать"><i class="fas fa-pen"></i></button>
        <button class="action-btn del"  onclick="confirmDelete('appointments', ${r.id})" title="Удалить"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');

  renderPagination('appointments', 'pag-appointments');
}

// ════════════════════════════════════════════════════════════════════════════════
// 2. ORDERS
// ════════════════════════════════════════════════════════════════════════════════
function renderOrders() {
  const rows = paginate('orders');
  const tbody = document.getElementById('tbody-orders');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(7, 'Заказов нет'); return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>#${r.appointment_id || '—'}</td>
      <td>${getUserName(r.user_id)}</td>
      <td>${fmtMoney(r.total_price)}</td>
      <td>${orderBadge(r.status)}</td>
      <td>${fmtDate(r.created_at)}</td>
      <td class="td-actions">
        <button class="action-btn edit" onclick="openModal('order', ${r.id})" title="Редактировать"><i class="fas fa-pen"></i></button>
        <button class="action-btn del"  onclick="confirmDelete('orders', ${r.id})" title="Удалить"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');

  renderPagination('orders', 'pag-orders');
}

// ════════════════════════════════════════════════════════════════════════════════
// 3. SERVICES
// ════════════════════════════════════════════════════════════════════════════════
function renderServices() {
  const rows = STATE.filtered['services'] || [];
  const tbody = document.getElementById('tbody-services');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(7, 'Услуг нет'); return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td><b>${esc(r.name)}</b></td>
      <td title="${esc(r.description || '')}">${esc(r.description?.substring(0,60) || '—')}${r.description?.length > 60 ? '…' : ''}</td>
      <td>${fmtMoney(r.base_price)}</td>
      <td>${r.duration_minutes ? r.duration_minutes + ' мин' : '—'}</td>
      <td>${fmtDate(r.created_at)}</td>
      <td class="td-actions">
        <button class="action-btn edit" onclick="openModal('service', ${r.id})"><i class="fas fa-pen"></i></button>
        <button class="action-btn del"  onclick="confirmDelete('services', ${r.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

function renderServiceTypes() {
  const rows = STATE.filtered['service_types'] || STATE.data['service_types'] || [];
  const tbody = document.getElementById('tbody-service-types');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(6, 'Типов нет'); return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${getServiceName(r.service_id)}</td>
      <td>${esc(r.name)}</td>
      <td>${fmtMoney(r.additional_price)}</td>
      <td>${r.duration_minutes ? r.duration_minutes + ' мин' : '—'}</td>
      <td class="td-actions">
        <button class="action-btn edit" onclick="openModal('service_type', ${r.id})"><i class="fas fa-pen"></i></button>
        <button class="action-btn del"  onclick="confirmDelete('service_types', ${r.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

// ════════════════════════════════════════════════════════════════════════════════
// 4. PROMOTIONS
// ════════════════════════════════════════════════════════════════════════════════
function renderPromotions() {
  const rows = STATE.filtered['promotions'] || [];
  const tbody = document.getElementById('tbody-promotions');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(7, 'Акций нет'); return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td><code style="color:var(--neon);background:rgba(255,77,0,.1);padding:2px 6px;border-radius:3px;">${esc(r.code)}</code></td>
      <td title="${esc(r.description || '')}">${esc(r.description?.substring(0,50) || '—')}</td>
      <td>${r.discount_percent ?? 0}%</td>
      <td>${r.expires_at ? fmtDate(r.expires_at) : '∞'}</td>
      <td>${fmtDate(r.created_at)}</td>
      <td class="td-actions">
        <button class="action-btn edit" onclick="openModal('promotion', ${r.id})"><i class="fas fa-pen"></i></button>
        <button class="action-btn del"  onclick="confirmDelete('promotions', ${r.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

// ════════════════════════════════════════════════════════════════════════════════
// 5. BONUSES
// ════════════════════════════════════════════════════════════════════════════════
function renderBonuses() {
  const rows = paginate('bonuses');
  const tbody = document.getElementById('tbody-bonuses');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(8, 'Бонусов нет'); return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${getUserName(r.user_id)}</td>
      <td style="color:var(--success);font-weight:600;">${fmtMoney(r.amount)}</td>
      <td>${r.expires_at ? fmtDate(r.expires_at) : '—'}</td>
      <td title="${esc(r.reason || '')}">${esc(r.reason?.substring(0,40) || '—')}</td>
      <td>${r.appointment_id || '—'}</td>
      <td>${fmtDate(r.created_at)}</td>
      <td class="td-actions">
        <button class="action-btn del" onclick="confirmDelete('bonuses', ${r.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');

  renderPagination('bonuses', null);
}

// ════════════════════════════════════════════════════════════════════════════════
// 6. CARS
// ════════════════════════════════════════════════════════════════════════════════
function renderCars() {
  const rows = paginate('cars');
  const tbody = document.getElementById('tbody-cars');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(9, 'Автомобилей нет'); return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${getUserName(r.user_id)}</td>
      <td>${esc(r.brand)}</td>
      <td>${esc(r.model)}</td>
      <td>${esc(r.license_plate || '—')}</td>
      <td title="${esc(r.vin || '')}">${r.vin ? r.vin.substring(0,12) + '…' : '—'}</td>
      <td>${r.production_year || '—'}</td>
      <td>${r.mileage ? r.mileage.toLocaleString('ru-RU') + ' км' : '—'}</td>
      <td class="td-actions">
        <button class="action-btn edit" onclick="openModal('car', ${r.id})"><i class="fas fa-pen"></i></button>
        <button class="action-btn del"  onclick="confirmDelete('cars', ${r.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');

  renderPagination('cars', null);
}

// ════════════════════════════════════════════════════════════════════════════════
// 7. CAR PHOTOS
// ════════════════════════════════════════════════════════════════════════════════
function renderCarPhotos() {
  const rows = STATE.filtered['car_photos'] || [];
  const tbody = document.getElementById('tbody-car_photos');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(7, 'Фото нет'); return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${r.car_id}</td>
      <td>${getUserName(r.user_id)}</td>
      <td><span class="badge badge-confirmed">${esc(r.type || 'after')}</span></td>
      <td><a href="${esc(r.photo_url)}" target="_blank" style="color:var(--info);text-decoration:underline;">Открыть</a></td>
      <td>${fmtDate(r.created_at)}</td>
      <td class="td-actions">
        <button class="action-btn del" onclick="confirmDelete('car_photos', ${r.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

// ════════════════════════════════════════════════════════════════════════════════
// 8. MAINTENANCE REMINDERS
// ════════════════════════════════════════════════════════════════════════════════
function renderMaintenance() {
  const rows = STATE.filtered['maintenance_reminders'] || [];
  const tbody = document.getElementById('tbody-maintenance');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(8, 'Напоминаний нет'); return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${r.car_id || '—'}</td>
      <td>${r.reminder_date ? fmtDate(r.reminder_date) : '—'}</td>
      <td>${r.mileage ? r.mileage.toLocaleString('ru-RU') + ' км' : '—'}</td>
      <td title="${esc(r.message || '')}">${esc(r.message?.substring(0,50) || '—')}</td>
      <td>${esc(r.channel || 'push')}</td>
      <td>${r.is_sent
        ? `<span class="badge badge-completed">Отправлено</span>`
        : `<span class="badge badge-pending">Нет</span>`}</td>
      <td class="td-actions">
        <button class="action-btn edit" onclick="openModal('maintenance', ${r.id})"><i class="fas fa-pen"></i></button>
        <button class="action-btn del"  onclick="confirmDelete('maintenance_reminders', ${r.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

// ════════════════════════════════════════════════════════════════════════════════
// 9. USERS (profiles)
// ════════════════════════════════════════════════════════════════════════════════
function renderUsers() {
  const rows = paginate('profiles');
  const tbody = document.getElementById('tbody-users');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(8, 'Пользователей нет'); return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td title="${r.id}" style="font-family:monospace;font-size:10px;">${r.id?.substring(0,12)}…</td>
      <td>${esc(r.name || '—')}</td>
      <td>${esc(r.phone || '—')}</td>
      <td>${r.role === 'admin'
        ? '<span class="badge badge-admin">Admin</span>'
        : '<span class="badge badge-user">User</span>'}</td>
      <td>${getLevelName(r.level_id)}</td>
      <td>${r.birthday ? fmtDate(r.birthday) : '—'}</td>
      <td>${fmtDate(r.created_at)}</td>
      <td class="td-actions">
        <button class="action-btn edit" onclick="openModal('user', '${r.id}')"><i class="fas fa-pen"></i></button>
      </td>
    </tr>`).join('');

  renderPagination('profiles', 'pag-users');
}

// ════════════════════════════════════════════════════════════════════════════════
// 10. USER LEVELS
// ════════════════════════════════════════════════════════════════════════════════
function renderUserLevels() {
  const rows = STATE.data['user_levels'] || [];
  const tbody = document.getElementById('tbody-user_levels');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(6, 'Уровней нет'); return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td><b>${esc(r.name)}</b></td>
      <td>${r.min_spent ? fmtMoney(r.min_spent) : '—'}</td>
      <td>${r.discount_percent ?? 0}%</td>
      <td title="${esc(r.benefits || '')}">${esc(r.benefits?.substring(0,60) || '—')}</td>
      <td class="td-actions">
        <button class="action-btn edit" onclick="openModal('user_level', ${r.id})"><i class="fas fa-pen"></i></button>
        <button class="action-btn del"  onclick="confirmDelete('user_levels', ${r.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

// ════════════════════════════════════════════════════════════════════════════════
// 11. MESSAGES
// ════════════════════════════════════════════════════════════════════════════════
function renderMessageList() {
  const all = STATE.data['messages'] || [];
  const body = document.getElementById('msg-list-body');
  if (!body) return;

  // Группировка по user_id
  const byUser = {};
  all.forEach(m => {
    const uid = m.direction === 'client_to_staff' ? m.user_id : (m.receiver_id || m.user_id);
    if (!byUser[uid]) byUser[uid] = [];
    byUser[uid].push(m);
  });

  const users = Object.entries(byUser);
  if (!users.length) {
    body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px;">Сообщений нет</div>';
    return;
  }

  body.innerHTML = users.map(([uid, msgs]) => {
    const last = msgs[msgs.length - 1];
    const name = getUserName(uid);
    const initials = name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase() || '??';
    const unread = msgs.filter(m => m.direction === 'client_to_staff').length;
    return `
      <div class="msg-item ${STATE.activeChat === uid ? 'active' : ''}" onclick="openChat('${uid}')">
        <div class="msg-avatar" style="background:${strColor(uid)}">${initials}</div>
        <div class="msg-meta">
          <div class="msg-from">${name}</div>
          <div class="msg-preview">${esc(last.message?.substring(0,40) || '')}</div>
          <div class="msg-time">${fmtDateTime(last.created_at)}</div>
        </div>
        ${unread ? `<div class="msg-unread"></div>` : ''}
      </div>`;
  }).join('');
}

function openChat(uid) {
  STATE.activeChat = uid;
  renderMessageList();

  const messages = (STATE.data['messages'] || []).filter(m =>
    m.user_id === uid || m.receiver_id === uid
  ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const hdr = document.getElementById('chat-header');
  const chatEl = document.getElementById('chat-messages');
  const name = getUserName(uid);

  if (hdr) hdr.innerHTML = `
    <div>
      <div class="chat-name">${name}</div>
      <div class="chat-sub">${uid.substring(0,16)}…</div>
    </div>`;

  if (!chatEl) return;
  
  if (messages.length === 0) {
    chatEl.innerHTML = '<div class="chat-empty">Нет сообщений в этом диалоге</div>';
    return;
  }
  
  chatEl.innerHTML = messages.map(m => {
    const isSent = m.direction === 'staff_to_client';
    return `
      <div class="chat-bubble ${isSent ? 'sent' : 'recv'}">
        ${esc(m.message)}
        <div class="chat-ts">${fmtDateTime(m.created_at)}</div>
      </div>`;
  }).join('');
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function sendReply() {
  const ta = document.getElementById('chat-reply');
  const text = ta?.value?.trim();
  if (!text || !STATE.activeChat) return;

  try {
    const db = getDB();
    const { error } = await db.from('messages').insert({
      user_id: STATE.activeChat,
      message: text,
      direction: 'staff_to_client',
    });
    if (error) throw error;
    ta.value = '';
    await fetchTable('messages');
    openChat(STATE.activeChat);
    showToast('success', 'Отправлено', 'Сообщение доставлено');
  } catch (e) {
    showToast('error', 'Ошибка', e.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 12. REVIEWS
// ════════════════════════════════════════════════════════════════════════════════
function renderReviews() {
  const rows = STATE.filtered['reviews'] || [];
  const tbody = document.getElementById('tbody-reviews');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(7, 'Отзывов нет'); return; }

  tbody.innerHTML = rows.map(r => {
    const stars = '⭐'.repeat(r.rating || 0);
    return `
      <tr>
        <td>${r.id}</td>
        <td>${getUserName(r.user_id)}</td>
        <td>#${r.appointment_id || '—'}</td>
        <td>${stars}</td>
        <td title="${esc(r.comment || '')}">${esc(r.comment?.substring(0,60) || '—')}</td>
        <td>${fmtDate(r.created_at)}</td>
        <td class="td-actions">
          <button class="action-btn del" onclick="confirmDelete('reviews', ${r.id})"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
  }).join('');
}

// ════════════════════════════════════════════════════════════════════════════════
// 13. NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════════════════
function renderNotifications() {
  const rows = STATE.data['notifications'] || [];
  const tbody = document.getElementById('tbody-notifications');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(8, 'Уведомлений нет'); return; }

  tbody.innerHTML = rows.map(r => `
    <tr style="${!r.is_read ? 'background:rgba(255,77,0,.03)' : ''}">
      <td>${r.id}</td>
      <td>${getUserName(r.user_id)}</td>
      <td><b>${esc(r.title)}</b></td>
      <td title="${esc(r.message)}">${esc(r.message?.substring(0,50) || '')}…</td>
      <td><span class="badge badge-confirmed">${esc(r.type || 'info')}</span></td>
      <td>${r.is_read
        ? '<span class="badge badge-completed">Да</span>'
        : '<span class="badge badge-pending">Нет</span>'}</td>
      <td>${fmtDate(r.created_at)}</td>
      <td class="td-actions">
        <button class="action-btn del" onclick="confirmDelete('notifications', ${r.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');

  // Значок в хедере
  const unread = rows.filter(n => !n.is_read).length;
  const dot = document.getElementById('notif-dot');
  if (dot) dot.style.display = unread ? 'block' : 'none';
}

async function markAllRead() {
  try {
    const db = getDB();
    const { error } = await db.from('notifications').update({ is_read: true }).eq('is_read', false);
    if (error) throw error;
    await fetchTable('notifications');
    renderNotifications();
    showToast('success', 'Готово', 'Все уведомления отмечены прочитанными');
  } catch (e) {
    showToast('error', 'Ошибка', e.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// 14. DOCUMENTS
// ════════════════════════════════════════════════════════════════════════════════
function renderDocuments() {
  const rows = STATE.data['documents'] || [];
  const tbody = document.getElementById('tbody-documents');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(7, 'Документов нет'); return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${getUserName(r.user_id)}</td>
      <td>${r.appointment_id ? '#' + r.appointment_id : '—'}</td>
      <td><a href="${esc(r.file_url)}" target="_blank" style="color:var(--info);">Открыть</a></td>
      <td>${esc(r.file_type || '—')}</td>
      <td>${fmtDate(r.created_at)}</td>
      <td class="td-actions">
        <button class="action-btn del" onclick="confirmDelete('documents', ${r.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

// ════════════════════════════════════════════════════════════════════════════════
// 15. SUBSCRIPTIONS
// ════════════════════════════════════════════════════════════════════════════════
function renderSubscriptions() {
  const rows = STATE.filtered['subscriptions'] || [];
  const tbody = document.getElementById('tbody-subscriptions');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(7, 'Подписок нет'); return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${getUserName(r.user_id)}</td>
      <td><b>${esc(r.plan_name)}</b></td>
      <td>${fmtMoney(r.price)}</td>
      <td>${r.renews_at ? fmtDate(r.renews_at) : '—'}</td>
      <td>${r.is_active
        ? '<span class="badge badge-active">Активна</span>'
        : '<span class="badge badge-inactive">Нет</span>'}</td>
      <td class="td-actions">
        <button class="action-btn edit" onclick="openModal('subscription', ${r.id})"><i class="fas fa-pen"></i></button>
        <button class="action-btn del"  onclick="confirmDelete('subscriptions', ${r.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

// ════════════════════════════════════════════════════════════════════════════════
// 16. SERVICE HISTORY
// ════════════════════════════════════════════════════════════════════════════════
function renderServiceHistory() {
  const rows = STATE.filtered['service_history'] || [];
  const tbody = document.getElementById('tbody-service_history');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(8, 'Истории нет'); return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${r.appointment_id ? '#' + r.appointment_id : '—'}</td>
      <td>${r.car_id || '—'}</td>
      <td>${getUserName(r.user_id)}</td>
      <td title="${esc(r.description)}">${esc(r.description?.substring(0,50) || '')}…</td>
      <td title="${esc(r.recommendations || '')}">${esc(r.recommendations?.substring(0,40) || '—')}</td>
      <td>${fmtDate(r.created_at)}</td>
      <td class="td-actions">
        <button class="action-btn edit" onclick="openModal('service_history', ${r.id})"><i class="fas fa-pen"></i></button>
        <button class="action-btn del"  onclick="confirmDelete('service_history', ${r.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

// ════════════════════════════════════════════════════════════════════════════════
// 17. CART ITEMS
// ════════════════════════════════════════════════════════════════════════════════
function renderCartItems() {
  const rows = STATE.data['cart_items'] || [];
  const tbody = document.getElementById('tbody-cart_items');
  if (!tbody) return;

  if (!rows.length) { tbody.innerHTML = emptyRow(8, 'Корзин нет'); return; }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${getUserName(r.user_id)}</td>
      <td>${getServiceName(r.service_id)}</td>
      <td>${r.quantity}</td>
      <td>${fmtMoney(r.price_snapshot)}</td>
      <td>${r.car_id || '—'}</td>
      <td>${fmtDate(r.created_at)}</td>
      <td class="td-actions">
        <button class="action-btn del" onclick="confirmDelete('cart_items', ${r.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function renderDashboard() {
  const apts = STATE.data['appointments'] || [];
  const orders = STATE.data['orders'] || [];
  const users = STATE.data['profiles'] || [];

  const revenue = orders
    .filter(o => o.status === 'paid' || o.status === 'completed')
    .reduce((s, o) => s + (+o.total_price || 0), 0);
  const activeOrders = orders.filter(o => o.status === 'pending').length;

  setText('kpi-appointments', apts.length.toLocaleString('ru-RU'));
  setText('kpi-revenue', fmtMoney(revenue, false));
  setText('kpi-users', users.length.toLocaleString('ru-RU'));
  setText('kpi-orders', activeOrders.toLocaleString('ru-RU'));

  renderChartAppointments(apts);
  renderChartStatuses(apts);
  renderRecentAppointments(apts);
  renderRecentReviews();
}

function renderChartAppointments(apts) {
  const ctx = document.getElementById('chart-appointments');
  if (!ctx) return;
  if (STATE.charts['appointments']) STATE.charts['appointments'].destroy();

  // Группировка по месяцам (последние 6 месяцев)
  const months = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    months[key] = 0;
  }
  apts.forEach(a => {
    if (!a.scheduled_at) return;
    const d = new Date(a.scheduled_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (key in months) months[key]++;
  });

  const labels = Object.keys(months).map(k => {
    const [y, m] = k.split('-');
    return new Date(y, m-1).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
  });

  STATE.charts['appointments'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Записи',
        data: Object.values(months),
        borderColor: '#ff4d00',
        backgroundColor: 'rgba(255,77,0,.08)',
        pointBackgroundColor: '#ff4d00',
        pointRadius: 4,
        fill: true,
        tension: 0.4,
      }]
    },
    options: chartOptions(),
  });
}

function renderChartStatuses(apts) {
  const ctx = document.getElementById('chart-statuses');
  if (!ctx) return;
  if (STATE.charts['statuses']) STATE.charts['statuses'].destroy();

  const statusMap = { pending: 0, confirmed: 0, in_progress: 0, completed: 0, cancelled: 0 };
  apts.forEach(a => { if (a.status in statusMap) statusMap[a.status]++; });

  const labels = { pending: 'Ожидание', confirmed: 'Подтверждён', in_progress: 'В работе', completed: 'Выполнен', cancelled: 'Отменён' };
  const colors = ['#f59e0b','#38bdf8','#a78bfa','#00e5a0','#ff3860'];

  STATE.charts['statuses'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusMap).map(k => labels[k]),
      datasets: [{ data: Object.values(statusMap), backgroundColor: colors, borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#8899bb', font: { size: 10 }, boxWidth: 10, padding: 8 } },
        tooltip: tooltipStyle(),
      }
    },
  });
}

function renderRecentAppointments(apts) {
  const el = document.getElementById('recent-appointments');
  if (!el) return;
  const recent = [...apts].slice(0, 6);
  if (!recent.length) { el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px 0;">Нет данных</div>'; return; }
  el.innerHTML = recent.map(r => `
    <div class="recent-item">
      <div style="flex:1">${esc(r.client_name || '—')} — ${getServiceName(r.service_id)}</div>
      <div style="margin-left:auto;">${statusBadge(r.status)}</div>
    </div>`).join('');
}

function renderRecentReviews() {
  const el = document.getElementById('recent-reviews');
  if (!el) return;
  const revs = (STATE.data['reviews'] || []).slice(0, 6);
  if (!revs.length) { el.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px 0;">Нет отзывов</div>'; return; }
  el.innerHTML = revs.map(r => `
    <div class="recent-item">
      <div style="flex:1;overflow:hidden;text-overflow:ellipsis;">${getUserName(r.user_id)} — ${esc(r.comment?.substring(0,40) || '')}…</div>
      <div>⭐ ${r.rating}</div>
    </div>`).join('');
}

function chartOptions() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: tooltipStyle(),
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#5a6480', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#5a6480', font: { size: 10 } }, beginAtZero: true },
    }
  };
}
function tooltipStyle() {
  return {
    backgroundColor: '#111827',
    borderColor: 'rgba(255,77,0,.3)',
    borderWidth: 1,
    titleColor: '#e2e8f4',
    bodyColor: '#8899bb',
    padding: 10,
    cornerRadius: 4,
  };
}

// ─── FILTER / SEARCH ──────────────────────────────────────────────────────────
function filterTable(key) {
  const tableMap = {
    appointments: { search: 'search-appointments', status: 'filter-apt-status', fields: ['client_name','client_phone','id'] },
    orders:       { search: 'search-orders',       status: 'filter-order-status', fields: ['id','appointment_id'] },
    services:     { search: 'search-services',     fields: ['name','description'] },
    promotions:   { search: 'search-promotions',   fields: ['code','description'] },
    bonuses:      { search: 'search-bonuses',      fields: ['reason'] },
    cars:         { search: 'search-cars',         fields: ['brand','model','license_plate','vin'] },
    car_photos:   { search: 'search-car_photos',   fields: ['type'] },
    maintenance:  { search: 'search-maintenance',  fields: ['message','channel'] },
    users:        { search: 'search-users',        role: 'filter-user-role', fields: ['name','phone'] },
    reviews:      { search: 'search-reviews',      rating: 'filter-review-rating', fields: ['comment'] },
    subscriptions:{ search: 'search-subscriptions', active: 'filter-subscription-active', fields: ['plan_name'] },
    service_history: { search: 'search-service_history', fields: ['description','recommendations'] },
  };

  const cfg  = tableMap[key];
  if (!cfg) return;

  const dbKey = key === 'users' ? 'profiles' : key === 'maintenance' ? 'maintenance_reminders' : key;
  let rows = [...(STATE.data[dbKey] || [])];

  // Search
  const q = document.getElementById(cfg.search)?.value?.toLowerCase().trim();
  if (q) {
    rows = rows.filter(r => cfg.fields.some(f => String(r[f] ?? '').toLowerCase().includes(q)));
  }

  // Status filter
  if (cfg.status) {
    const val = document.getElementById(cfg.status)?.value;
    if (val) rows = rows.filter(r => r.status === val);
  }

  // Role filter
  if (cfg.role) {
    const val = document.getElementById(cfg.role)?.value;
    if (val) rows = rows.filter(r => r.role === val);
  }

  // Rating filter
  if (cfg.rating) {
    const val = document.getElementById(cfg.rating)?.value;
    if (val) rows = rows.filter(r => String(r.rating) === val);
  }

  // Active filter
  if (cfg.active) {
    const val = document.getElementById(cfg.active)?.value;
    if (val) rows = rows.filter(r => String(r.is_active) === val);
  }

  STATE.filtered[dbKey] = rows;
  STATE.pages[dbKey] = 1;

  const renderMap = {
    appointments: renderAppointments,
    orders: renderOrders,
    services: renderServices,
    promotions: renderPromotions,
    bonuses: renderBonuses,
    cars: renderCars,
    car_photos: renderCarPhotos,
    maintenance_reminders: renderMaintenance,
    profiles: renderUsers,
    reviews: renderReviews,
    subscriptions: renderSubscriptions,
    service_history: renderServiceHistory,
  };
  
  const renderFn = renderMap[dbKey];
  if (renderFn) renderFn();
}

// ─── SORT ─────────────────────────────────────────────────────────────────────
function sortTable(section, col) {
  const dbKey = section === 'appointments' ? 'appointments' : section;
  const current = STATE.sort[dbKey] || {};
  const dir = current.col === col && current.dir === 'asc' ? 'desc' : 'asc';
  STATE.sort[dbKey] = { col, dir };

  STATE.filtered[dbKey] = [...(STATE.filtered[dbKey] || STATE.data[dbKey] || [])].sort((a, b) => {
    const av = a[col] ?? '';
    const bv = b[col] ?? '';
    const res = String(av).localeCompare(String(bv), 'ru', { numeric: true });
    return dir === 'asc' ? res : -res;
  });

  // Обновить заголовки
  document.querySelectorAll(`#section-${section} th`).forEach(th => {
    th.classList.remove('sorted-asc','sorted-desc');
  });

  // Добавить класс сортировки к текущему заголовку
  const header = document.querySelector(`#section-${section} th[onclick*="${col}"]`);
  if (header) {
    header.classList.add(`sorted-${dir}`);
  }

  const renders = {
    appointments: renderAppointments,
    orders: renderOrders,
  };
  
  const renderFn = renders[dbKey];
  if (renderFn) renderFn();
}

// ─── PAGINATION ───────────────────────────────────────────────────────────────
function paginate(key) {
  const rows = STATE.filtered[key] || STATE.data[key] || [];
  const page = STATE.pages[key] || 1;
  const size = STATE.pageSize;
  return rows.slice((page - 1) * size, page * size);
}

function renderPagination(key, elId) {
  if (!elId) return;
  const el = document.getElementById(elId);
  if (!el) return;

  const rows  = STATE.filtered[key] || STATE.data[key] || [];
  const page  = STATE.pages[key] || 1;
  const size  = STATE.pageSize;
  const total = Math.ceil(rows.length / size);

  if (total <= 1) { el.innerHTML = ''; return; }

  const from = (page - 1) * size + 1;
  const to   = Math.min(page * size, rows.length);

  let btns = '';
  const range = (s, e) => { for (let i = s; i <= e; i++) btns += pageBtn(i, page, key); };
  btns += `<button class="page-btn" ${page===1?'disabled':''} onclick="goPage('${key}','${elId}',${page-1})"><i class="fas fa-chevron-left"></i></button>`;
  if (total <= 7) { range(1, total); }
  else {
    range(1, Math.min(2, total));
    if (page > 4) btns += `<button class="page-btn" disabled>…</button>`;
    range(Math.max(3, page-1), Math.min(total-2, page+1));
    if (page < total - 3) btns += `<button class="page-btn" disabled>…</button>`;
    range(Math.max(total-1, 3), total);
  }
  btns += `<button class="page-btn" ${page===total?'disabled':''} onclick="goPage('${key}','${elId}',${page+1})"><i class="fas fa-chevron-right"></i></button>`;

  el.innerHTML = `
    <span>Показано ${from}–${to} из ${rows.length}</span>
    <div class="page-btns">${btns}</div>`;
}

function pageBtn(i, current, key) {
  const pagMap = { 
    appointments:'pag-appointments', 
    profiles:'pag-users', 
    orders:'pag-orders',
    bonuses: 'pag-bonuses',
    cars: 'pag-cars'
  };
  const elId = pagMap[key] || '';
  return `<button class="page-btn ${i===current?'active':''}" onclick="goPage('${key}','${elId}',${i})">${i}</button>`;
}

function goPage(key, elId, page) {
  STATE.pages[key] = page;
  const renders = {
    appointments: renderAppointments,
    orders: renderOrders,
    profiles: renderUsers,
    bonuses: renderBonuses,
    cars: renderCars,
  };
  
  const renderFn = renders[key];
  if (renderFn) renderFn();
  
  // Обновляем пагинацию
  renderPagination(key, elId);
}

// ─── MODAL: OPEN ──────────────────────────────────────────────────────────────
function openModal(type, id = null) {
  STATE.modalType = type;
  STATE.modalEditId = id;

  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title-text');
  const iconEl  = document.getElementById('modal-icon');
  const bodyEl  = document.getElementById('modal-body');
  const box     = document.getElementById('modal-box');

  const cfg = {
    appointment:    { title: 'Запись',         icon: 'fas fa-calendar-check' },
    order:          { title: 'Заказ',           icon: 'fas fa-receipt' },
    service:        { title: 'Услуга',          icon: 'fas fa-spray-can-sparkles' },
    service_type:   { title: 'Тип услуги',      icon: 'fas fa-list' },
    promotion:      { title: 'Акция',           icon: 'fas fa-tags' },
    bonus:          { title: 'Бонус',           icon: 'fas fa-coins' },
    car:            { title: 'Автомобиль',      icon: 'fas fa-car' },
    car_photo:      { title: 'Фото авто',       icon: 'fas fa-images' },
    maintenance:    { title: 'Напоминание ТО',  icon: 'fas fa-wrench' },
    user:           { title: 'Пользователь',    icon: 'fas fa-user' },
    user_level:     { title: 'Уровень',         icon: 'fas fa-layer-group' },
    send_message:   { title: 'Новое сообщение', icon: 'fas fa-paper-plane' },
    notification:   { title: 'Уведомление',     icon: 'fas fa-bell' },
    document:       { title: 'Документ',        icon: 'fas fa-file' },
    subscription:   { title: 'Подписка',        icon: 'fas fa-calendar-alt' },
    service_history:{ title: 'История услуги',  icon: 'fas fa-history' },
  };

  const c = cfg[type] || { title: 'Форма', icon: 'fas fa-circle-plus' };
  titleEl.textContent = (id ? 'Редактировать ' : 'Добавить ') + c.title;
  iconEl.className = c.icon;

  box.className = 'modal';
  bodyEl.innerHTML = buildForm(type, id);

  if (id) fillForm(type, id);

  overlay.classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay')?.classList.remove('open');
  STATE.modalType = null;
  STATE.modalEditId = null;
}

function closeModalOnBg(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

// ─── MODAL: BUILD FORM ────────────────────────────────────────────────────────
function buildForm(type, id) {
  const svcOptions  = (STATE.data['services'] || []).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  const userOptions = (STATE.data['profiles'] || []).map(u => `<option value="${u.id}">${esc(u.name)} (${esc(u.phone || '')})</option>`).join('');
  const carOptions  = (STATE.data['cars']     || []).map(c => `<option value="${c.id}">${esc(c.brand)} ${esc(c.model)} — ${esc(c.license_plate || c.id)}</option>`).join('');
  const lvlOptions  = (STATE.data['user_levels'] || []).map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');

  const forms = {
    appointment: `
      <div class="form-grid">
        <div class="field-group"><label>Клиент (имя)</label><input id="f-client_name" placeholder="Иван Иванов"></div>
        <div class="field-group"><label>Телефон</label><input id="f-client_phone" placeholder="+996 ..."></div>
        <div class="field-group"><label>Услуга</label><select id="f-service_id"><option value="">—</option>${svcOptions}</select></div>
        <div class="field-group"><label>Дата/Время</label><input id="f-scheduled_at" type="datetime-local"></div>
        <div class="field-group"><label>Автомобиль</label><select id="f-car_id"><option value="">—</option>${carOptions}</select></div>
        <div class="field-group"><label>Сумма</label><input id="f-total_price" type="number" placeholder="0"></div>
        <div class="field-group"><label>Статус</label>
          <select id="f-status">
            <option value="pending">Ожидание</option>
            <option value="confirmed">Подтверждён</option>
            <option value="in_progress">В работе</option>
            <option value="completed">Выполнен</option>
            <option value="cancelled">Отменён</option>
          </select>
        </div>
        <div class="field-group col-span-2"><label>Примечания</label><textarea id="f-notes" rows="2"></textarea></div>
      </div>`,

    service: `
      <div class="form-grid cols-1">
        <div class="field-group"><label>Название</label><input id="f-name" placeholder="Химчистка салона"></div>
        <div class="field-group"><label>Описание</label><textarea id="f-description"></textarea></div>
        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:14px;">
          <div class="field-group"><label>Базовая цена (сум)</label><input id="f-base_price" type="number" placeholder="0"></div>
          <div class="field-group"><label>Длительность (мин)</label><input id="f-duration_minutes" type="number" placeholder="60"></div>
        </div>
      </div>`,

    service_type: `
      <div class="form-grid">
        <div class="field-group col-span-2"><label>Услуга</label><select id="f-service_id"><option value="">—</option>${svcOptions}</select></div>
        <div class="field-group col-span-2"><label>Название типа</label><input id="f-name" placeholder="Стандарт / Премиум"></div>
        <div class="field-group"><label>Доп. цена</label><input id="f-additional_price" type="number" placeholder="0"></div>
        <div class="field-group"><label>Длительность (мин)</label><input id="f-duration_minutes" type="number" placeholder="0"></div>
      </div>`,

    promotion: `
      <div class="form-grid">
        <div class="field-group"><label>Промокод</label><input id="f-code" placeholder="SUMMER2024" style="text-transform:uppercase;"></div>
        <div class="field-group"><label>Скидка %</label><input id="f-discount_percent" type="number" min="0" max="100" placeholder="10"></div>
        <div class="field-group col-span-2"><label>Описание</label><textarea id="f-description"></textarea></div>
        <div class="field-group col-span-2"><label>Дата истечения</label><input id="f-expires_at" type="datetime-local"></div>
      </div>`,

    bonus: `
      <div class="form-grid">
        <div class="field-group col-span-2"><label>Пользователь</label><select id="f-user_id"><option value="">—</option>${userOptions}</select></div>
        <div class="field-group"><label>Сумма бонусов</label><input id="f-amount" type="number" placeholder="100"></div>
        <div class="field-group"><label>Истекает</label><input id="f-expires_at" type="datetime-local"></div>
        <div class="field-group col-span-2"><label>Причина</label><input id="f-reason" placeholder="За визит, акция..."></div>
      </div>`,

    car: `
      <div class="form-grid">
        <div class="field-group col-span-2"><label>Владелец</label><select id="f-user_id"><option value="">—</option>${userOptions}</select></div>
        <div class="field-group"><label>Марка</label><input id="f-brand" placeholder="Toyota"></div>
        <div class="field-group"><label>Модель</label><input id="f-model" placeholder="Camry"></div>
        <div class="field-group"><label>Госномер</label><input id="f-license_plate" placeholder="01 KG 777"></div>
        <div class="field-group"><label>Год выпуска</label><input id="f-production_year" type="number" placeholder="2020"></div>
        <div class="field-group"><label>VIN</label><input id="f-vin" placeholder="JTDBT923651234567"></div>
        <div class="field-group"><label>Пробег (км)</label><input id="f-mileage" type="number" placeholder="50000"></div>
      </div>`,

    car_photo: `
      <div class="form-grid">
        <div class="field-group col-span-2"><label>Автомобиль</label><select id="f-car_id"><option value="">—</option>${carOptions}</select></div>
        <div class="field-group col-span-2"><label>URL фотографии</label><input id="f-photo_url" placeholder="https://..."></div>
        <div class="field-group"><label>Тип</label>
          <select id="f-type"><option value="before">До</option><option value="after">После</option><option value="other">Другое</option></select>
        </div>
      </div>`,

    maintenance: `
      <div class="form-grid">
        <div class="field-group col-span-2"><label>Автомобиль</label><select id="f-car_id"><option value="">—</option>${carOptions}</select></div>
        <div class="field-group"><label>Дата напоминания</label><input id="f-reminder_date" type="date"></div>
        <div class="field-group"><label>Пробег (км)</label><input id="f-mileage" type="number"></div>
        <div class="field-group"><label>Канал</label>
          <select id="f-channel"><option value="push">Push</option><option value="sms">SMS</option><option value="email">Email</option></select>
        </div>
        <div class="field-group col-span-2"><label>Сообщение</label><textarea id="f-message"></textarea></div>
      </div>`,

    user: `
      <div class="form-grid">
        <div class="field-group col-span-2"><label>Имя</label><input id="f-name"></div>
        <div class="field-group"><label>Телефон</label><input id="f-phone"></div>
        <div class="field-group"><label>Дата рождения</label><input id="f-birthday" type="date"></div>
        <div class="field-group"><label>Роль</label>
          <select id="f-role"><option value="user">Клиент</option><option value="admin">Администратор</option></select>
        </div>
        <div class="field-group"><label>Уровень</label><select id="f-level_id"><option value="">—</option>${lvlOptions}</select></div>
      </div>`,

    user_level: `
      <div class="form-grid">
        <div class="field-group col-span-2"><label>Название уровня</label><input id="f-name" placeholder="Gold"></div>
        <div class="field-group"><label>Мин. сумма (сум)</label><input id="f-min_spent" type="number"></div>
        <div class="field-group"><label>Скидка %</label><input id="f-discount_percent" type="number" min="0" max="100"></div>
        <div class="field-group col-span-2"><label>Преимущества</label><textarea id="f-benefits"></textarea></div>
      </div>`,

    send_message: `
      <div class="form-grid cols-1">
        <div class="field-group"><label>Получатель</label><select id="f-user_id"><option value="">—</option>${userOptions}</select></div>
        <div class="field-group"><label>Сообщение</label><textarea id="f-message" rows="4"></textarea></div>
      </div>`,

    notification: `
      <div class="form-grid">
        <div class="field-group col-span-2"><label>Пользователь</label><select id="f-user_id"><option value="">—</option>${userOptions}</select></div>
        <div class="field-group col-span-2"><label>Заголовок</label><input id="f-title"></div>
        <div class="field-group col-span-2"><label>Сообщение</label><textarea id="f-message"></textarea></div>
        <div class="field-group"><label>Тип</label>
          <select id="f-type"><option value="info">Info</option><option value="success">Success</option><option value="warning">Warning</option><option value="error">Error</option></select>
        </div>
      </div>`,

    document: `
      <div class="form-grid">
        <div class="field-group col-span-2"><label>Пользователь</label><select id="f-user_id"><option value="">—</option>${userOptions}</select></div>
        <div class="field-group col-span-2"><label>URL файла</label><input id="f-file_url" placeholder="https://..."></div>
        <div class="field-group"><label>Тип файла</label><input id="f-file_type" placeholder="pdf, jpg..."></div>
      </div>`,

    subscription: `
      <div class="form-grid">
        <div class="field-group col-span-2"><label>Пользователь</label><select id="f-user_id"><option value="">—</option>${userOptions}</select></div>
        <div class="field-group"><label>Название плана</label><input id="f-plan_name" placeholder="Premium"></div>
        <div class="field-group"><label>Цена</label><input id="f-price" type="number"></div>
        <div class="field-group"><label>Дата продления</label><input id="f-renews_at" type="date"></div>
        <div class="field-group"><label>Активна</label>
          <select id="f-is_active"><option value="true">Да</option><option value="false">Нет</option></select>
        </div>
      </div>`,

    service_history: `
      <div class="form-grid">
        <div class="field-group"><label>Запись ID</label><input id="f-appointment_id" type="number"></div>
        <div class="field-group"><label>Автомобиль</label><select id="f-car_id"><option value="">—</option>${carOptions}</select></div>
        <div class="field-group col-span-2"><label>Пользователь</label><select id="f-user_id"><option value="">—</option>${userOptions}</select></div>
        <div class="field-group col-span-2"><label>Описание</label><textarea id="f-description"></textarea></div>
        <div class="field-group col-span-2"><label>Рекомендации</label><textarea id="f-recommendations"></textarea></div>
      </div>`,

    order: `
      <div class="form-grid">
        <div class="field-group col-span-2"><label>Статус</label>
          <select id="f-status"><option value="pending">Ожидание</option><option value="paid">Оплачен</option><option value="cancelled">Отменён</option><option value="refunded">Возврат</option></select>
        </div>
        <div class="field-group"><label>Сумма</label><input id="f-total_price" type="number"></div>
      </div>`,
  };

  return forms[type] || `<div class="empty-state"><i class="fas fa-tools"></i>Форма не найдена</div>`;
}

// ─── MODAL: FILL (edit) ───────────────────────────────────────────────────────
function fillForm(type, id) {
  const dbMap = {
    appointment: 'appointments', service: 'services', service_type: 'service_types',
    promotion: 'promotions', bonus: 'bonuses', car: 'cars', car_photo: 'car_photos',
    maintenance: 'maintenance_reminders', user: 'profiles', user_level: 'user_levels',
    notification: 'notifications', document: 'documents', subscription: 'subscriptions',
    service_history: 'service_history', order: 'orders',
  };
  const table = dbMap[type];
  if (!table) return;

  const row = (STATE.data[table] || []).find(r => String(r.id) === String(id));
  if (!row) return;

  const fields = {
    appointment: ['client_name','client_phone','service_id','scheduled_at','car_id','total_price','status','notes'],
    service:     ['name','description','base_price','duration_minutes'],
    service_type:['service_id','name','additional_price','duration_minutes'],
    promotion:   ['code','discount_percent','description','expires_at'],
    bonus:       ['user_id','amount','expires_at','reason'],
    car:         ['user_id','brand','model','license_plate','production_year','vin','mileage'],
    car_photo:   ['car_id','photo_url','type'],
    maintenance: ['car_id','reminder_date','mileage','channel','message'],
    user:        ['name','phone','birthday','role','level_id'],
    user_level:  ['name','min_spent','discount_percent','benefits'],
    notification:['user_id','title','message','type'],
    document:    ['user_id','file_url','file_type'],
    subscription:['user_id','plan_name','price','renews_at','is_active'],
    service_history:['appointment_id','car_id','user_id','description','recommendations'],
    order:       ['status','total_price'],
  };

  (fields[type] || []).forEach(f => {
    const el = document.getElementById(`f-${f}`);
    if (!el) return;
    let val = row[f] ?? '';
    // Normalize datetime-local
    if (el.type === 'datetime-local' && val) val = new Date(val).toISOString().slice(0,16);
    if (el.type === 'date' && val) val = String(val).slice(0,10);
    el.value = val;
  });
}

// ─── MODAL: SAVE ──────────────────────────────────────────────────────────────
async function saveModal() {
  const type = STATE.modalType;
  const id   = STATE.modalEditId;

  const btn = document.getElementById('modal-save-btn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span class="inline-spinner"></span> Сохранение...';
  btn.disabled = true;

  try {
    const payload = gatherForm(type);
    if (!payload) return;

    const db = getDB();
    const tableMap = {
      appointment: 'appointments', order: 'orders', service: 'services',
      service_type: 'service_types', promotion: 'promotions', bonus: 'bonuses',
      car: 'cars', car_photo: 'car_photos', maintenance: 'maintenance_reminders',
      user: 'profiles', user_level: 'user_levels', notification: 'notifications',
      document: 'documents', subscription: 'subscriptions',
      service_history: 'service_history',
    };

    if (type === 'send_message') {
      const { error } = await db.from('messages').insert({
        user_id: payload.user_id,
        message: payload.message,
        direction: 'staff_to_client',
      });
      if (error) throw error;
      await fetchTable('messages');
      renderMessageList();
    } else {
      const table = tableMap[type];
      if (!table) throw new Error('Неизвестный тип: ' + type);

      let error;
      if (id) {
        ({ error } = await db.from(table).update(payload).eq('id', id));
      } else {
        ({ error } = await db.from(table).insert(payload));
      }
      if (error) throw error;

      await fetchTable(table);
      renderAll();
      if (table === 'appointments') renderDashboard();
    }

    closeModal();
    showToast('success', 'Сохранено', `Запись успешно ${id ? 'обновлена' : 'создана'}`);

  } catch (e) {
    showToast('error', 'Ошибка', e.message);
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function gatherForm(type) {
  const g = id => {
    const el = document.getElementById(`f-${id}`);
    return el ? el.value.trim() : null;
  };
  const gBool = id => {
    const v = g(id);
    return v === 'true' ? true : v === 'false' ? false : null;
  };
  const gNum = id => {
    const v = g(id);
    return v !== '' && v !== null ? Number(v) : null;
  };

  const maps = {
    appointment:    () => ({ client_name: g('client_name'), client_phone: g('client_phone'), service_id: gNum('service_id'), scheduled_at: g('scheduled_at') || null, car_id: gNum('car_id') || null, total_price: gNum('total_price'), status: g('status'), notes: g('notes') }),
    order:          () => ({ status: g('status'), total_price: gNum('total_price') }),
    service:        () => ({ name: g('name'), description: g('description'), base_price: gNum('base_price'), duration_minutes: gNum('duration_minutes') }),
    service_type:   () => ({ service_id: gNum('service_id'), name: g('name'), additional_price: gNum('additional_price'), duration_minutes: gNum('duration_minutes') }),
    promotion:      () => ({ code: g('code')?.toUpperCase(), discount_percent: gNum('discount_percent'), description: g('description'), expires_at: g('expires_at') || null }),
    bonus:          () => ({ user_id: g('user_id'), amount: gNum('amount'), expires_at: g('expires_at') || null, reason: g('reason') }),
    car:            () => ({ user_id: g('user_id'), brand: g('brand'), model: g('model'), license_plate: g('license_plate'), production_year: gNum('production_year'), vin: g('vin'), mileage: gNum('mileage') }),
    car_photo:      () => ({ car_id: gNum('car_id'), photo_url: g('photo_url'), type: g('type') }),
    maintenance:    () => ({ car_id: gNum('car_id') || null, reminder_date: g('reminder_date') || null, mileage: gNum('mileage'), channel: g('channel'), message: g('message') }),
    user:           () => ({ name: g('name'), phone: g('phone'), birthday: g('birthday') || null, role: g('role'), level_id: gNum('level_id') || null }),
    user_level:     () => ({ name: g('name'), min_spent: gNum('min_spent'), discount_percent: gNum('discount_percent'), benefits: g('benefits') }),
    send_message:   () => ({ user_id: g('user_id'), message: g('message') }),
    notification:   () => ({ user_id: g('user_id'), title: g('title'), message: g('message'), type: g('type') }),
    document:       () => ({ user_id: g('user_id') || null, file_url: g('file_url'), file_type: g('file_type') }),
    subscription:   () => ({ user_id: g('user_id') || null, plan_name: g('plan_name'), price: gNum('price'), renews_at: g('renews_at') || null, is_active: gBool('is_active') }),
    service_history:() => ({ appointment_id: gNum('appointment_id') || null, car_id: gNum('car_id') || null, user_id: g('user_id') || null, description: g('description'), recommendations: g('recommendations') }),
  };

  const fn = maps[type];
  return fn ? fn() : null;
}

// ─── CONFIRM DELETE ───────────────────────────────────────────────────────────
function confirmDelete(table, id) {
  document.getElementById('confirm-text').textContent = `Удалить запись #${id} из таблицы "${table}"? Это действие необратимо.`;
  const overlay = document.getElementById('confirm-overlay');
  overlay.classList.add('open');

  document.getElementById('confirm-ok').onclick = async () => {
    closeConfirm();
    try {
      const db = getDB();
      const { error } = await db.from(table).delete().eq('id', id);
      if (error) throw error;
      await fetchTable(table);
      renderAll();
      renderDashboard();
      showToast('success', 'Удалено', `Запись #${id} удалена`);
    } catch (e) {
      showToast('error', 'Ошибка удаления', e.message);
    }
  };
}

function closeConfirm() {
  document.getElementById('confirm-overlay')?.classList.remove('open');
}

// ─── EXPORT CSV ───────────────────────────────────────────────────────────────
function exportCSV(table) {
  const rows = STATE.data[table] || [];
  if (!rows.length) { showToast('warn', 'Пусто', 'Нет данных для экспорта'); return; }
  const keys = Object.keys(rows[0]);
  const csv  = [keys.join(','), ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `${table}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

// ─── SETTINGS: DB STATS ───────────────────────────────────────────────────────
function updateDbStats() {
  const el = document.getElementById('db-stats');
  if (!el) return;
  const tables = [
    ['appointments','Записи'],['orders','Заказы'],['profiles','Клиенты'],
    ['services','Услуги'],['cars','Авто'],['reviews','Отзывы'],
    ['messages','Сообщения'],['notifications','Уведомления'],
  ];
  el.innerHTML = tables.map(([t, label]) => {
    const cnt = (STATE.data[t] || []).length;
    return `<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border2);">
      <span style="color:var(--muted2)">${label}</span>
      <span style="font-family:'Orbitron',sans-serif;font-size:11px;color:var(--neon)">${cnt.toLocaleString('ru-RU')}</span>
    </div>`;
  }).join('');
}

function saveSettings() {
  showToast('success', 'Сохранено', 'Настройки обновлены');
}

// ─── BADGES ───────────────────────────────────────────────────────────────────
function updateBadges() {
  const pendingApt = (STATE.data['appointments'] || []).filter(a => a.status === 'pending').length;
  const unreadMsg  = (STATE.data['messages']     || []).filter(m => m.direction === 'client_to_staff').length;

  setBadge('badge-appointments', pendingApt);
  setBadge('badge-messages',     unreadMsg);
}

function setBadge(id, count) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = count > 0 ? 'inline' : 'none';
  el.textContent = count > 99 ? '99+' : count;
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('collapsed');
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(type, title, msg = '') {
  const colors = { success: '#00e5a0', error: '#ff3860', warn: '#f59e0b', info: '#38bdf8' };
  const icons  = { success: 'fa-circle-check', error: 'fa-circle-xmark', warn: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  const color  = colors[type] || colors.info;
  const icon   = icons[type]  || icons.info;

  const wrap = document.getElementById('toasts');
  const el   = document.createElement('div');
  el.className = 'toast';
  el.style.setProperty('--toast-color', color);
  el.innerHTML = `<i class="fas ${icon} toast-icon"></i>
    <div class="toast-text"><div class="toast-title">${esc(title)}</div>${msg ? `<div class="toast-msg">${esc(msg)}</div>` : ''}</div>`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(v) {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('ru-RU'); } catch { return String(v); }
}

function fmtDateTime(v) {
  if (!v) return '—';
  try { return new Date(v).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }); }
  catch { return String(v); }
}

function fmtMoney(v, withSym = true) {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return (isNaN(n) ? '—' : n.toLocaleString('ru-RU')) + (withSym ? ' сум' : '');
}

function getServiceName(id) {
  const s = (STATE.data['services'] || []).find(s => s.id === id);
  return s ? esc(s.name) : `ID:${id || '—'}`;
}

function getUserName(uid) {
  const u = (STATE.data['profiles'] || []).find(u => u.id === uid);
  return u ? esc(u.name) : uid ? String(uid).substring(0,12) + '…' : '—';
}

function getLevelName(id) {
  if (!id) return '—';
  const l = (STATE.data['user_levels'] || []).find(l => l.id === id);
  return l ? esc(l.name) : String(id);
}

function statusBadge(status) {
  const map = {
    pending:     ['badge-pending',    'Ожидание'],
    confirmed:   ['badge-confirmed',  'Подтверждён'],
    in_progress: ['badge-in-progress','В работе'],
    completed:   ['badge-completed',  'Выполнен'],
    cancelled:   ['badge-cancelled',  'Отменён'],
  };
  const [cls, label] = map[status] || ['badge-inactive', status || '—'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function orderBadge(status) {
  const map = {
    pending:   ['badge-pending',  'Ожидание'],
    paid:      ['badge-paid',     'Оплачен'],
    cancelled: ['badge-cancelled','Отменён'],
    refunded:  ['badge-refunded', 'Возврат'],
  };
  const [cls, label] = map[status] || ['badge-inactive', status || '—'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function emptyRow(cols, text = 'Нет данных') {
  return `<tr><td colspan="${cols}" style="text-align:center;padding:30px;color:var(--muted)"><i class="fas fa-inbox" style="margin-right:8px;opacity:.4;"></i>${text}</td></tr>`;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function strColor(str) {
  let h = 0;
  for (const c of String(str)) h = ((h << 5) - h) + c.charCodeAt(0);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, 55%, 35%)`;
}

// Делаем функции доступными глобально для onclick атрибутов
window.openModal = openModal;
window.closeModal = closeModal;
window.closeModalOnBg = closeModalOnBg;
window.saveModal = saveModal;
window.confirmDelete = confirmDelete;
window.closeConfirm = closeConfirm;
window.exportCSV = exportCSV;
window.filterTable = filterTable;
window.sortTable = sortTable;
window.goPage = goPage;
window.toggleSidebar = toggleSidebar;
window.showSection = showSection;
window.loadAllData = loadAllData;
window.markAllRead = markAllRead;
window.sendReply = sendReply;
window.openChat = openChat;
window.saveSettings = saveSettings;