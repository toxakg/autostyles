// ============================================================
//  AUTOSTYLES — cabinet.js  (full enhanced version)
// ============================================================

// ── ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ────────────────────────────────────
let supabaseClient      = null;
let currentUser         = null;
let currentCars         = [];
let currentServices     = [];
let currentServiceTypes = [];
let currentAppointments = [];
let currentBonuses      = 0;
let currentLevel        = 'Silver';
let currentDiscount     = 5;
let currentPromo        = null;   // применённый промокод
let appInitialized      = false;
let realtimeChannel     = null;

// ── ИНИЦИАЛИЗАЦИЯ ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Cabinet.js: DOM загружен');

    supabaseClient = window.sb || window.supabaseClient || null;
    if (!supabaseClient) await waitForSupabase();

    if (!supabaseClient) {
        showNotification('Ошибка подключения к базе данных', 'error');
        return;
    }

    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        if (session?.user) {
            currentUser = session.user;
            await initializeApp();
        } else {
            window.location.href = 'auth.html';
            return;
        }
    } catch (err) {
        console.error('Ошибка проверки сессии:', err);
        window.location.href = 'auth.html';
        return;
    }

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
            window.location.href = 'auth.html';
        } else if (event === 'SIGNED_IN' && session && !appInitialized) {
            currentUser = session.user;
            await initializeApp();
        }
    });

    // Минимальная дата = сейчас
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dateInput.min = now.toISOString().slice(0, 16);
    }

    // Минимальная дата для напоминания = сегодня
    const reminderDate = document.getElementById('reminder-date');
    if (reminderDate) {
        reminderDate.min = new Date().toISOString().split('T')[0];
    }

    // Фото профиля
    document.getElementById('change-photo-btn')?.addEventListener('click', () => {
        document.getElementById('profile-photo-input')?.click();
    });
    document.getElementById('profile-photo-input')?.addEventListener('change', handlePhotoUpload);

    // Телефон
    const bookingPhone = document.getElementById('booking-phone');
    if (bookingPhone) {
        bookingPhone.addEventListener('input', function () {
            let val = this.value.replace(/\D/g, '');
            if (val.startsWith('996')) val = val.slice(3);
            val = val.substring(0, 9);
            let fmt = '+996';
            if (val.length > 0) fmt += ' (' + val.substring(0, 3);
            if (val.length >= 3) fmt += ') ' + val.substring(3, 5);
            if (val.length >= 5) fmt += '-' + val.substring(5, 7);
            if (val.length >= 7) fmt += '-' + val.substring(7, 9);
            this.value = fmt;
        });
    }

    // Промокод — uppercase автоматически
    document.getElementById('booking-promo')?.addEventListener('input', function () {
        this.value = this.value.toUpperCase();
    });
    document.getElementById('booking-promo')?.addEventListener('keypress', e => {
        if (e.key === 'Enter') applyPromoCode();
    });

    // Звёзды отзыва
    setupStarRating();

    // Чат
    setupChatEvents();

    // Шаги записи
    initStepAnimation();
    setupAutoStepHighlight();
    setTimeout(() => document.querySelector('.form-step')?.classList.add('active'), 100);
});

// ── ОЖИДАНИЕ SUPABASE ────────────────────────────────────────
function waitForSupabase() {
    return new Promise(resolve => {
        let tries = 0;
        const iv = setInterval(() => {
            tries++;
            if (window.sb || window.supabaseClient) {
                supabaseClient = window.sb || window.supabaseClient;
                clearInterval(iv);
                resolve();
            } else if (tries >= 30) { clearInterval(iv); resolve(); }
        }, 100);
    });
}

// ── ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ──────────────────────────────────
async function initializeApp() {
    if (appInitialized) return;
    appInitialized = true;
    console.log('Инициализация приложения...');
    showLoader();

    try {
        await updateNotificationsPreview(); // ВСТАВЬТЕ ЭТУ СТРОКУ ЗДЕСЬ
        
        await Promise.all([
            loadUserProfile(),
            loadServices(),
            loadServiceTypes(),
            loadCars(),
            loadAppointments(),
            loadBonuses(),
            loadGallery(),
            loadNotifications(),
            loadChatMessages(),
            loadSubscriptions(),
            loadReminders(),
            loadDocuments()
        ]);
        
        updateUI();
        updateProfileStats();
        console.log('✅ Приложение инициализировано');
    } catch (err) {
        console.error('Ошибка инициализации:', err);
        showNotification('Ошибка загрузки данных', 'error');
    } finally {
        hideLoader();
    }
}

// ════════════════════════════════════════════════════════════
//  ЗАГРУЗКА ДАННЫХ
// ════════════════════════════════════════════════════════════

async function loadUserProfile() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select(`*, user_levels(id, name, min_spent, discount_percent, benefits)`)
            .eq('id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
            currentUser.profile = data;
            // Уровень из связанной таблицы
            if (data.user_levels) {
                currentLevel    = data.user_levels.name;
                currentDiscount = data.user_levels.discount_percent || 5;
            }
        }
    } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
    }
}

async function loadServices() {
    try {
        const { data, error } = await supabaseClient
            .from('services').select('*').order('name');
        if (error) throw error;
        currentServices = data || [];
        updateServicesSelect();
    } catch (err) { console.error('Ошибка загрузки услуг:', err); }
}

async function loadServiceTypes() {
    try {
        const { data, error } = await supabaseClient
            .from('service_types').select('*');
        if (error) throw error;
        currentServiceTypes = data || [];
    } catch (err) { console.error('Ошибка загрузки типов услуг:', err); }
}

async function loadCars() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('cars').select('*').eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        currentCars = data || [];
        displayCars();
        updateCarSelect();
        updateReminderCarSelect();
    } catch (err) { console.error('Ошибка загрузки авто:', err); }
}

async function loadAppointments() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('appointments')
            .select(`
                *,
                services:service_id(name, base_price),
                cars:car_id(brand, model, license_plate),
                reviews(id, rating, comment)
            `)
            .eq('user_id', currentUser.id)
            .order('scheduled_at', { ascending: false });
        if (error) throw error;
        currentAppointments = data || [];
        displayHistory();
        updateFinanceStats();
        updateCurrentOrder();
    } catch (err) { console.error('Ошибка загрузки записей:', err); }
}

async function loadBonuses() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('bonuses').select('amount').eq('user_id', currentUser.id);
        if (error) throw error;
        currentBonuses = (data || []).reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
        updateBonuses();
    } catch (err) { console.error('Ошибка загрузки бонусов:', err); }
}

async function loadGallery() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('car_photos')
            .select('*, cars:car_id(brand, model)')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        displayGallery(data || []);
    } catch (err) { console.error('Ошибка загрузки галереи:', err); }
}

async function loadNotifications() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('notifications').select('*')
            .eq('user_id', currentUser.id).eq('is_read', false)
            .order('created_at', { ascending: false });
        if (error) throw error;
        
        const unreadCount = (data || []).length;
        updateNotificationBadge(unreadCount);
        updateNotifications(data || []);
        await updateNotificationsPreview(); // добавьте эту строку
    } catch (err) { 
        console.error('Ошибка загрузки уведомлений:', err);
        updateNotificationBadge(0);
    }
}
// ============================================================
//  НОВЫЕ ФУНКЦИИ ДЛЯ УВЕДОМЛЕНИЙ - ВСТАВЬТЕ ЭТОТ КОД
// ============================================================

// Обновление бейджей (и мобильный, и в меню)
function updateNotificationBadge(count) {
    // Бейдж в мобильной шапке
    const badge = document.getElementById('notif-badge');
    if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
    
    // Бейдж в боковом меню
    const menuBadge = document.getElementById('menu-notifications-badge');
    if (menuBadge) {
        menuBadge.textContent = count > 99 ? '99+' : count;
        menuBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

// Загрузка ВСЕХ уведомлений (для панели)
async function loadAllNotifications() {
    const listEl = document.getElementById('notifications-list');
    if (!listEl || !currentUser) return;
    
    try {
        listEl.innerHTML = '<div class="loading-spinner">Загрузка...</div>';
        
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(50);
            
        if (error) throw error;
        
        if (!data || data.length === 0) {
            listEl.innerHTML = `<div class="notification-item">
                <i class="fas fa-bell-slash"></i>
                <div><p>Нет уведомлений</p><small>Здесь будут появляться уведомления</small></div>
            </div>`;
            return;
        }
        
        listEl.innerHTML = data.map(n => `
            <div class="notification-item ${n.is_read ? '' : 'unread'}"
                 data-id="${n.id}" onclick="markNotificationRead(${n.id})" style="cursor:pointer;">
                <i class="fas ${getIconByType(n.type)}"></i>
                <div style="flex:1;">
                    <p><strong>${esc(n.title || '')}</strong></p>
                    <p>${esc(n.message)}</p>
                    <small>${formatDate(n.created_at)}</small>
                </div>
                ${!n.is_read ? '<span class="unread-dot"></span>' : ''}
            </div>
        `).join('');
        
    } catch (err) {
        console.error('Ошибка загрузки всех уведомлений:', err);
        listEl.innerHTML = '<div class="error-message">Ошибка загрузки</div>';
    }
}

// Обновление превью уведомлений (последние 3)
async function updateNotificationsPreview() {
    const previewList = document.getElementById('notifications-preview-list');
    if (!previewList || !currentUser) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(3);
            
        if (error) throw error;
        
        if (!data || data.length === 0) {
            previewList.innerHTML = '<div class="preview-empty">Нет уведомлений</div>';
            return;
        }
        
        previewList.innerHTML = data.map(n => {
            const icon = getIconByType(n.type);
            const date = formatDate(n.created_at);
            const unreadClass = n.is_read ? '' : 'unread';
            
            return `
                <div class="preview-item ${unreadClass}" onclick="markNotificationRead(${n.id})">
                    <i class="fas ${icon}" style="width:20px;"></i>
                    <div class="preview-text">
                        <strong>${esc(n.title || 'Уведомление')}</strong>
                        <small>${date}</small>
                        <p style="margin:2px 0 0;font-size:0.85rem;color:#666;">${esc(n.message.substring(0, 50))}${n.message.length > 50 ? '...' : ''}</p>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Ошибка загрузки превью уведомлений:', err);
        previewList.innerHTML = '<div class="preview-error">Ошибка загрузки</div>';
    }
}

// Отметить одно уведомление как прочитанное
async function markNotificationRead(id) {
    try {
        if (event) event.stopPropagation(); // останавливаем всплытие если есть event
        
        const { error } = await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);
            
        if (error) throw error;
        
        // Обновляем все
        await loadNotifications(); // обновит бейджи и превью
        
        // Если панель открыта, обновляем и её
        const panel = document.getElementById('notifications-panel');
        if (panel?.classList.contains('active')) {
            await loadAllNotifications();
        }
        
    } catch (err) { 
        console.error('Ошибка отметки уведомления:', err);
        showNotification('Не удалось обновить уведомление', 'error');
    }
}

// Отметить все уведомления как прочитанные (из панели)
async function markAllRead() {
    if (!currentUser) return;
    
    try {
        const { error } = await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);
            
        if (error) throw error;
        
        // Обновляем всё
        await loadNotifications();
        await loadAllNotifications();
        
        showNotification('Все уведомления отмечены прочитанными', 'success');
        
    } catch (err) { 
        console.error('Ошибка отметки всех уведомлений:', err);
        showNotification('Не удалось обновить уведомления', 'error');
    }
}

// Отметить все уведомления как прочитанные (из превью)
async function markAllMenuNotificationsRead(event) {
    if (event) event.stopPropagation();
    if (!currentUser) return;
    
    try {
        const { error } = await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);
            
        if (error) throw error;
        
        // Обновляем
        await loadNotifications();
        await loadAllNotifications();
        
        showNotification('Все уведомления отмечены прочитанными', 'success');
        
    } catch (err) {
        console.error('Ошибка при отметке всех уведомлений:', err);
        showNotification('Не удалось обновить уведомления', 'error');
    }
}

// Открыть/закрыть панель уведомлений
function toggleNotifications() {
    const panel = document.getElementById('notifications-panel');
    if (!panel) return;
    
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
    } else {
        panel.classList.add('active');
        loadAllNotifications(); // загружаем все уведомления при открытии
    }
}

// Иконка по типу уведомления
function getIconByType(type) {
    const icons = {
        'info': 'fa-info-circle',
        'success': 'fa-check-circle',
        'warning': 'fa-exclamation-triangle',
        'error': 'fa-times-circle'
    };
    return icons[type] || 'fa-bell';
}
async function loadChatMessages() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('messages')
            .select('*')
            .or(`user_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: true })
            .limit(50);
        if (error) throw error;
        renderChatMessages(data || []);
        subscribeToMessages();
    } catch (err) { console.error('Ошибка загрузки чата:', err); }
}

// ── ПОДПИСКИ ─────────────────────────────────────────────────
async function loadSubscriptions() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('subscriptions').select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        displaySubscriptions(data || []);
    } catch (err) { console.error('Ошибка загрузки подписок:', err); }
}

function displaySubscriptions(subs) {
    const el = document.getElementById('subscriptions-list');
    if (!el) return;
    const active = subs.filter(s => s.is_active);
    if (!active.length) {
        el.innerHTML = `<div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p>Нет активных подписок</p>
            <small>Оформите подписку на мойку или ТО для экономии</small>
        </div>`;
        return;
    }
    el.innerHTML = active.map(s => {
        const renewDate = s.renews_at ? new Date(s.renews_at).toLocaleDateString('ru-RU') : '—';
        const isExpiring = s.renews_at && (new Date(s.renews_at) - new Date()) < 7 * 86400000;
        return `
        <div class="subscription-item ${isExpiring ? 'expiring' : ''}">
            <div class="sub-icon"><i class="fas fa-crown"></i></div>
            <div class="sub-info">
                <strong>${esc(s.plan_name)}</strong>
                <small>Следующее продление: ${renewDate}</small>
                ${isExpiring ? '<span class="expiring-badge">Истекает скоро</span>' : ''}
            </div>
            <div class="sub-price">${formatNumber(s.price)} сом/мес</div>
        </div>`;
    }).join('');
}

// ── НАПОМИНАНИЯ ───────────────────────────────────────────────
async function loadReminders() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('maintenance_reminders')
            .select('*, cars:car_id(brand, model, license_plate)')
            .eq('user_id', currentUser.id)
            .eq('is_triggered', false)
            .order('reminder_date', { ascending: true });
        if (error) throw error;
        displayReminders(data || []);
        updateRemindersBadge(data || []);
        displayUpcomingReminders(data || []);
    } catch (err) { console.error('Ошибка загрузки напоминаний:', err); }
}

function displayReminders(reminders) {
    const el = document.getElementById('reminders-container');
    if (!el) return;
    if (!reminders.length) {
        el.innerHTML = `<div class="empty-state">
            <i class="fas fa-bell-slash"></i>
            <p>Нет активных напоминаний</p>
            <small>Добавьте напоминание о замене масла, шин или плановом ТО</small>
        </div>`;
        return;
    }
    const today = new Date();
    el.innerHTML = reminders.map(r => {
        const date = r.reminder_date ? new Date(r.reminder_date) : null;
        const isOverdue = date && date < today;
        const isNear    = date && !isOverdue && (date - today) < 7 * 86400000;
        let urgency = '';
        if (isOverdue) urgency = 'overdue';
        else if (isNear) urgency = 'near';

        return `
        <div class="reminder-card ${urgency}">
            <div class="reminder-icon">
                <i class="fas fa-${isOverdue ? 'exclamation-circle' : isNear ? 'exclamation-triangle' : 'bell'}"></i>
            </div>
            <div class="reminder-info">
                <h4>${esc(r.message)}</h4>
                <p><i class="fas fa-car"></i> ${r.cars ? esc(r.cars.brand + ' ' + r.cars.model) : '—'}</p>
                ${date ? `<p><i class="fas fa-calendar"></i> ${date.toLocaleDateString('ru-RU')}
                    ${isOverdue ? '<span class="reminder-tag danger">Просрочено</span>' :
                      isNear    ? '<span class="reminder-tag warning">Скоро</span>' : ''}</p>` : ''}
                ${r.mileage ? `<p><i class="fas fa-tachometer-alt"></i> При ${formatNumber(r.mileage)} км</p>` : ''}
            </div>
            <div class="reminder-actions">
                <button class="btn btn-sm btn-primary" onclick="bookFromReminder(${r.id})">
                    <i class="fas fa-calendar-plus"></i> Записаться
                </button>
                <button class="btn-icon danger" onclick="deleteReminder(${r.id})" title="Удалить">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>`;
    }).join('');
}

function displayUpcomingReminders(reminders) {
    const card = document.getElementById('upcoming-reminders-card');
    const list = document.getElementById('upcoming-reminders-list');
    if (!card || !list) return;

    const today = new Date();
    const upcoming = reminders.filter(r =>
        r.reminder_date && (new Date(r.reminder_date) - today) < 14 * 86400000
    ).slice(0, 3);

    if (!upcoming.length) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    list.innerHTML = upcoming.map(r => `
        <div class="upcoming-reminder-item">
            <i class="fas fa-tools"></i>
            <div>
                <strong>${esc(r.message)}</strong>
                <small>${r.cars ? esc(r.cars.brand + ' ' + r.cars.model) : ''} — ${
                    r.reminder_date ? new Date(r.reminder_date).toLocaleDateString('ru-RU') : ''
                }</small>
            </div>
            <button class="btn btn-sm btn-warning" onclick="showSection('booking', null)">Записаться</button>
        </div>`).join('');
}

function updateRemindersBadge(reminders) {
    const today = new Date();
    const urgent = reminders.filter(r =>
        r.reminder_date && (new Date(r.reminder_date) - today) < 7 * 86400000
    ).length;
    const badge = document.getElementById('reminders-badge');
    if (badge) {
        badge.textContent = urgent;
        badge.style.display = urgent > 0 ? 'inline-flex' : 'none';
    }
}

function updateReminderCarSelect() {
    const sel = document.getElementById('reminder-car');
    if (!sel) return;
    sel.innerHTML = '<option value="" disabled selected>Выберите автомобиль</option>';
    currentCars.forEach(c => {
        sel.appendChild(new Option(`${c.brand} ${c.model} (${c.license_plate || 'без номера'})`, c.id));
    });
}

function openReminderModal() {
    updateReminderCarSelect();
    const m = document.getElementById('reminder-modal');
    if (m) m.style.display = 'flex';
}

function closeReminderModal() {
    const m = document.getElementById('reminder-modal');
    if (m) m.style.display = 'none';
    ['reminder-car','reminder-message','reminder-date','reminder-mileage']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

async function saveReminder() {
    const carId   = document.getElementById('reminder-car')?.value;
    const message = document.getElementById('reminder-message')?.value.trim();
    const date    = document.getElementById('reminder-date')?.value;
    const mileage = document.getElementById('reminder-mileage')?.value;

    if (!message) { showNotification('Введите описание напоминания', 'warning'); return; }
    if (!carId)   { showNotification('Выберите автомобиль', 'warning'); return; }

    try {
        showLoader();
        const { error } = await supabaseClient
            .from('maintenance_reminders')
            .insert([{
                user_id:       currentUser.id,
                car_id:        carId,
                message,
                reminder_date: date || null,
                mileage:       mileage || null,
                is_triggered:  false,
                is_sent:       false
            }]);
        if (error) throw error;
        showNotification('Напоминание добавлено', 'success');
        closeReminderModal();
        await loadReminders();
    } catch (err) {
        showNotification('Ошибка: ' + err.message, 'error');
    } finally {
        hideLoader();
    }
}

async function deleteReminder(id) {
    if (!confirm('Удалить напоминание?')) return;
    try {
        showLoader();
        const { error } = await supabaseClient
            .from('maintenance_reminders').delete()
            .eq('id', id).eq('user_id', currentUser.id);
        if (error) throw error;
        showNotification('Напоминание удалено', 'success');
        await loadReminders();
    } catch (err) {
        showNotification('Ошибка: ' + err.message, 'error');
    } finally {
        hideLoader();
    }
}

function bookFromReminder(reminderId) {
    showSection('booking', null);
    showNotification('Выберите услугу и время для записи', 'info');
}

// ── ДОКУМЕНТЫ ────────────────────────────────────────────────
async function loadDocuments() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('documents')
            .select('*, appointments:appointment_id(scheduled_at, services:service_id(name))')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        displayDocuments(data || []);
    } catch (err) { console.error('Ошибка загрузки документов:', err); }
}

function displayDocuments(docs) {
    const el = document.getElementById('documents-container');
    if (!el) return;
    if (!docs.length) {
        el.innerHTML = `<div class="empty-state">
            <i class="fas fa-folder-open"></i>
            <p>Документы пока не добавлены</p>
            <small>Документы появятся после завершения первого заказа</small>
        </div>`;
        return;
    }

    const iconMap = { invoice: 'fa-file-invoice', act: 'fa-file-signature', warranty: 'fa-shield-alt' };
    const nameMap = { invoice: 'Счёт', act: 'Акт', warranty: 'Гарантия' };

    el.innerHTML = docs.map(d => {
        const type    = d.file_type || 'invoice';
        const docDate = new Date(d.created_at).toLocaleDateString('ru-RU');
        const svcName = d.appointments?.services?.name || 'Услуга';
        return `
        <div class="document-item" data-type="${esc(type)}">
            <div class="doc-icon">
                <i class="fas ${iconMap[type] || 'fa-file'}"></i>
            </div>
            <div class="doc-info">
                <h4>${nameMap[type] || 'Документ'} — ${esc(svcName)}</h4>
                <small><i class="fas fa-calendar"></i> ${docDate}</small>
            </div>
            <div class="doc-actions">
                <a href="${esc(d.file_url)}" target="_blank" class="btn btn-sm btn-primary">
                    <i class="fas fa-download"></i> Скачать
                </a>
            </div>
        </div>`;
    }).join('');
}

function filterDocuments(type, btn) {
    document.querySelectorAll('.documents-filter .filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.document-item').forEach(item => {
        item.style.display = (type === 'all' || item.dataset.type === type) ? 'flex' : 'none';
    });
}

// ── ОТЗЫВЫ ───────────────────────────────────────────────────
function setupStarRating() {
    const stars = document.querySelectorAll('#star-rating .star');
    stars.forEach(star => {
        star.addEventListener('mouseenter', () => {
            const val = parseInt(star.dataset.value);
            stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.value) <= val));
        });
        star.addEventListener('mouseleave', () => {
            const current = parseInt(document.getElementById('review-rating-value')?.value || 0);
            stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.value) <= current));
        });
        star.addEventListener('click', () => {
            const val = parseInt(star.dataset.value);
            const ratingInput = document.getElementById('review-rating-value');
            if (ratingInput) ratingInput.value = val;
            stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.value) <= val));
            const labels = { 1:'Очень плохо 😞', 2:'Плохо 😕', 3:'Нормально 😐', 4:'Хорошо 😊', 5:'Отлично! 🌟' };
            setEl('rating-label', labels[val] || '');
        });
    });
}

function openReviewModal(appointmentId, serviceName) {
    const modal = document.getElementById('review-modal');
    if (!modal) return;
    document.getElementById('review-appointment-id').value = appointmentId;
    document.getElementById('review-rating-value').value   = 0;
    document.getElementById('review-comment').value        = '';
    setEl('review-service-name', `Услуга: ${serviceName || 'Обслуживание'}`);
    setEl('rating-label', 'Выберите оценку');
    document.querySelectorAll('#star-rating .star').forEach(s => s.classList.remove('active'));
    modal.style.display = 'flex';
}

function closeReviewModal() {
    const m = document.getElementById('review-modal');
    if (m) m.style.display = 'none';
}

async function submitReview() {
    const appointmentId = document.getElementById('review-appointment-id')?.value;
    const rating        = parseInt(document.getElementById('review-rating-value')?.value || 0);
    const comment       = document.getElementById('review-comment')?.value.trim();

    if (!rating || rating < 1) {
        showNotification('Пожалуйста, выберите оценку', 'warning');
        return;
    }

    try {
        showLoader();
        const { error } = await supabaseClient
            .from('reviews')
            .upsert([{
                appointment_id: appointmentId,
                user_id:        currentUser.id,
                rating,
                comment:        comment || null
            }], { onConflict: 'appointment_id,user_id' });
        if (error) throw error;
        showNotification('Спасибо за отзыв!', 'success');
        closeReviewModal();
        await loadAppointments(); // обновить, чтобы скрыть кнопку отзыва
        updateProfileStats();
    } catch (err) {
        showNotification('Ошибка: ' + err.message, 'error');
    } finally {
        hideLoader();
    }
}

// ── ПРОМОКОДЫ ────────────────────────────────────────────────
async function applyPromoCode() {
    const code = document.getElementById('booking-promo')?.value.trim().toUpperCase();
    const resultEl = document.getElementById('promo-result');
    if (!resultEl) return;

    if (!code) { showNotification('Введите промокод', 'warning'); return; }

    try {
        const { data, error } = await supabaseClient
            .from('promotions')
            .select('*')
            .eq('code', code)
            .single();

        if (error || !data) {
            currentPromo = null;
            resultEl.style.display = 'block';
            resultEl.className = 'promo-result error';
            resultEl.innerHTML = '<i class="fas fa-times-circle"></i> Промокод не найден или недействителен';
            hidePromoInfo();
            return;
        }

        const now = new Date();
        if (data.expires_at && new Date(data.expires_at) < now) {
            currentPromo = null;
            resultEl.style.display = 'block';
            resultEl.className = 'promo-result error';
            resultEl.innerHTML = '<i class="fas fa-times-circle"></i> Срок действия промокода истёк';
            hidePromoInfo();
            return;
        }

        currentPromo = data;
        resultEl.style.display = 'block';
        resultEl.className = 'promo-result success';
        resultEl.innerHTML = `<i class="fas fa-check-circle"></i> Промокод применён! Скидка <strong>${data.discount_percent}%</strong>`;

        showPromoInfo(data.discount_percent);
        showNotification(`Промокод «${code}» применён — скидка ${data.discount_percent}%`, 'success');
    } catch (err) {
        console.error('Ошибка промокода:', err);
        showNotification('Ошибка проверки промокода', 'error');
    }
}

function showPromoInfo(discountPct) {
    const discountInfo = document.getElementById('promo-discount-info');
    const discountVal  = document.getElementById('promo-discount-value');
    const finalLabel   = document.getElementById('final-price-label');
    const finalPrice   = document.getElementById('final-price');
    if (discountInfo) { discountInfo.style.display = 'inline'; }
    if (discountVal)  { discountVal.textContent = discountPct; }

    // Пересчитать итоговую цену
    const priceEl = document.getElementById('service-price');
    if (priceEl && finalLabel && finalPrice) {
        const base = parseFloat(priceEl.textContent.replace(/\s/g, '')) || 0;
        const final = base * (1 - discountPct / 100);
        finalLabel.style.display = 'block';
        finalPrice.textContent   = formatNumber(final);
    }
}

function hidePromoInfo() {
    const discountInfo = document.getElementById('promo-discount-info');
    const finalLabel   = document.getElementById('final-price-label');
    if (discountInfo) discountInfo.style.display = 'none';
    if (finalLabel)   finalLabel.style.display = 'none';
}

// ════════════════════════════════════════════════════════════
//  ОБНОВЛЕНИЕ UI
// ════════════════════════════════════════════════════════════

function updateUI() {
    if (!currentUser) return;

    const userName = currentUser.profile?.name
        || currentUser.user_metadata?.name
        || currentUser.email?.split('@')[0]
        || 'Клиент';

    setEl('welcome-name', userName);
    setEl('mini-name',    userName);

    const emailEl = document.getElementById('profile-email');
    if (emailEl) emailEl.value = currentUser.email || '';

    if (currentUser.profile) {
        const p = currentUser.profile;
        setVal('profile-name',     p.name     || '');
        setVal('profile-phone',    p.phone    || '');
        setVal('profile-birthday', p.birthday || '');
        if (p.avatar_url) {
            setAvatarImg('profile-avatar', p.avatar_url);
            setAvatarImg('user-avatar',    p.avatar_url);
        }
        // Уровень
        if (p.user_levels) {
            const lv = p.user_levels;
            currentLevel    = lv.name;
            currentDiscount = lv.discount_percent || 5;

            setEl('level-name',     lv.name);
            setEl('level-discount', (lv.discount_percent || 5) + '%');
            setEl('level-badge',    lv.name);
            setEl('mini-level',     'Уровень: ' + lv.name);
            setEl('profile-level-name', lv.name);
            setEl('profile-level-desc', `Скидка ${lv.discount_percent || 5}% на все услуги`);

            // Бонусы привилегий
            if (lv.benefits) {
                setEl('level-perks', lv.benefits);
                const benefitEl = document.getElementById('level-benefits-extra');
                if (benefitEl) benefitEl.style.display = 'flex';
            }

            // Следующий уровень
            updateLoyaltyProgress(lv);
        } else {
            setEl('mini-level', `Уровень: ${currentLevel}`);
            setEl('level-name', currentLevel);
            setEl('level-discount', currentDiscount + '%');
        }
    }
}

async function updateLoyaltyProgress(currentLevelData) {
    try {
        // Загрузить все уровни для вычисления следующего
        const { data: levels } = await supabaseClient
            .from('user_levels').select('*').order('min_spent');
        if (!levels) return;

        const idx  = levels.findIndex(l => l.id === currentLevelData.id);
        const next = levels[idx + 1];

        if (next) {
            setEl('next-level-label', `До уровня ${next.name}`);
            const needed = Math.max(0, (next.min_spent || 0) - currentBonuses);
            setEl('points-needed', formatNumber(needed));
            const pct = Math.min(((currentBonuses) / (next.min_spent || 1)) * 100, 100);
            const progressEl = document.getElementById('loyalty-progress');
            if (progressEl) progressEl.style.width = pct + '%';
        } else {
            setEl('next-level-label', 'Максимальный уровень достигнут!');
            setEl('points-needed', '');
            const progressEl = document.getElementById('loyalty-progress');
            if (progressEl) progressEl.style.width = '100%';
        }
    } catch (err) { console.error('Ошибка уровней:', err); }
}

function updateProfileStats() {
    setEl('stat-cars',    currentCars.length);
    setEl('stat-orders',  currentAppointments.filter(a => a.status === 'completed').length);
    setEl('stat-bonuses', formatNumber(Math.floor(currentBonuses)));
    const reviews = currentAppointments.filter(a => a.reviews && a.reviews.length > 0).length;
    setEl('stat-reviews', reviews);
}

function updateServicesSelect() {
    const sel = document.getElementById('booking-service');
    if (!sel) return;
    sel.innerHTML = '<option value="" disabled selected>Выберите услугу</option>';
    currentServices.forEach(s => {
        const o = new Option(`${s.name} — ${formatNumber(s.base_price)} сом`, s.id);
        o.dataset.price = s.base_price;
        sel.appendChild(o);
    });
    sel.removeEventListener('change', handleServiceChange);
    sel.addEventListener('change', handleServiceChange);
}

function handleServiceChange() {
    const serviceId = document.getElementById('booking-service').value;
    const typeWrap  = document.getElementById('booking-service-type');
    if (!typeWrap) return;
    typeWrap.innerHTML = '<option value="">— без варианта —</option>';
    currentServiceTypes.filter(t => t.service_id == serviceId).forEach(t => {
        typeWrap.appendChild(new Option(`${t.name} (+${formatNumber(t.additional_price)} сом)`, t.id));
    });
    typeWrap.removeEventListener('change', updateBookingPrice);
    typeWrap.addEventListener('change', updateBookingPrice);
    updateBookingPrice();
}

function updateBookingPrice() {
    const serviceId = document.getElementById('booking-service')?.value;
    const typeId    = document.getElementById('booking-service-type')?.value;
    const service   = currentServices.find(s => s.id == serviceId);
    const type      = currentServiceTypes.find(t => t.id == typeId);
    const total     = (service?.base_price || 0) + (type?.additional_price || 0);

    const priceEl   = document.getElementById('service-price');
    const displayEl = document.getElementById('service-price-display');
    if (priceEl)   priceEl.textContent  = formatNumber(total);
    if (displayEl) displayEl.style.display = serviceId ? 'block' : 'none';

    // Пересчитать с промокодом
    if (currentPromo) showPromoInfo(currentPromo.discount_percent);
}

function updateCarSelect() {
    const sel = document.getElementById('booking-car');
    if (!sel) return;
    sel.innerHTML = '<option value="" disabled selected>Выберите автомобиль</option>';
    currentCars.forEach(c => {
        sel.appendChild(new Option(
            `${c.brand} ${c.model} (${c.license_plate || 'без номера'})`, c.id
        ));
    });
}

function displayCars() {
    const el = document.getElementById('cars-container');
    if (!el) return;
    if (!currentCars.length) {
        el.innerHTML = emptyState('fa-car', 'Добавьте свой первый автомобиль');
        return;
    }
    el.innerHTML = currentCars.map(car => `
        <div class="car-card">
            <div class="car-header">
                <i class="fas fa-car-side"></i>
                <h3>${esc(car.brand)} ${esc(car.model)}</h3>
            </div>
            <div class="car-details">
                <p><i class="fas fa-calendar"></i> ${car.production_year || '—'}</p>
                <p><i class="fas fa-id-card"></i> ${esc(car.license_plate || '—')}</p>
                <p><i class="fas fa-tachometer-alt"></i> ${formatNumber(car.mileage || 0)} км</p>
                ${car.vin ? `<p><i class="fas fa-barcode"></i> VIN: ${esc(car.vin)}</p>` : ''}
            </div>
            <div class="car-actions">
                <button class="btn-icon" onclick="editCar(${car.id})" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon danger" onclick="deleteCar(${car.id})" title="Удалить">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>`).join('');
}

function displayHistory() {
    const el = document.getElementById('history-container');
    if (!el) return;
    if (!currentAppointments.length) {
        el.innerHTML = emptyState('fa-history', 'История обслуживания пуста', 'Создайте первую запись на сервис');
        return;
    }
    renderHistoryItems(el, currentAppointments);
}

function renderHistoryItems(container, list) {
    container.innerHTML = list.map(app => {
        const d = new Date(app.scheduled_at);
        const hasReview = app.reviews && app.reviews.length > 0;
        const isCompleted = app.status === 'completed';
        const reviewHtml = isCompleted
            ? hasReview
                ? `<div class="review-stars">${renderStars(app.reviews[0].rating)}</div>`
                : `<button class="btn btn-sm btn-secondary" onclick="openReviewModal(${app.id}, '${esc(app.services?.name || '')}')">
                       <i class="fas fa-star"></i> Оставить отзыв
                   </button>`
            : '';

        return `
        <div class="history-item status-${app.status}">
            <div class="history-date">
                <i class="fas fa-calendar-alt"></i>
                ${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' })}
            </div>
            <div class="history-details">
                <h4>${esc(app.services?.name || 'Услуга')}</h4>
                <p><i class="fas fa-car"></i> ${esc(app.cars?.brand || '')} ${esc(app.cars?.model || '')}</p>
                ${app.notes ? `<p class="history-notes"><i class="fas fa-comment"></i> ${esc(app.notes)}</p>` : ''}
                ${reviewHtml}
            </div>
            <div class="history-status">
                <span class="status-badge status-${app.status}">${getStatusText(app.status)}</span>
            </div>
            <div class="history-price">${formatNumber(app.total_price || 0)} сом</div>
        </div>`;
    }).join('');
}

function renderStars(rating) {
    return Array.from({ length: 5 }, (_, i) =>
        `<i class="fas fa-star${i < rating ? '' : '-o'}" style="color:${i < rating ? '#f59e0b' : '#d1d5db'};font-size:0.85rem;"></i>`
    ).join('');
}

function updateFinanceStats() {
    const done  = currentAppointments.filter(a => a.status === 'completed');
    const spent = done.reduce((s, a) => s + (parseFloat(a.total_price) || 0), 0);

    setEl('total-spent',     formatNumber(spent) + ' сом');
    setEl('total-orders',    done.length);
    setEl('total-saved',     formatNumber(spent * (currentDiscount / 100)) + ' сом');
    setEl('finance-bonuses', formatNumber(Math.floor(currentBonuses)));

    const ol = document.getElementById('orders-list');
    if (!ol) return;
    if (!done.length) {
        ol.innerHTML = emptyState('fa-file-invoice', 'История транзакций пуста');
        return;
    }
    ol.innerHTML = done.slice(0, 20).map(a => `
        <div class="transaction-item">
            <div class="transaction-icon"><i class="fas fa-receipt"></i></div>
            <div class="transaction-info">
                <h4>${esc(a.services?.name || 'Услуга')}</h4>
                <small>${new Date(a.scheduled_at).toLocaleDateString('ru-RU')} — ${esc(a.cars?.brand || '')} ${esc(a.cars?.model || '')}</small>
            </div>
            <div class="transaction-amount">-${formatNumber(a.total_price || 0)} сом</div>
        </div>`).join('');
}

function updateCurrentOrder() {
    const card = document.getElementById('current-order-card');
    if (!card) return;
    const active = currentAppointments.find(a =>
        a.status === 'in_progress' || a.status === 'confirmed'
    );
    card.style.display = active ? 'block' : 'none';
    if (!active) return;
    const carName = active.cars ? `${active.cars.brand} ${active.cars.model}` : 'автомобиль';
    setEl('status-car',  carName);
    setEl('status-text', getStatusText(active.status));
    const pf = document.getElementById('progress-fill');
    if (pf) pf.style.width = (active.status === 'confirmed' ? 33 : 66) + '%';
}

function updateBonuses() {
    setEl('bonus-balance', formatNumber(Math.floor(currentBonuses)));
}

function displayGallery(photos) {
    const el = document.getElementById('gallery-container');
    if (!el) return;
    if (!photos.length) {
        el.innerHTML = emptyState('fa-camera', 'Фото отчеты появятся здесь', 'После начала работ с вашим автомобилем');
        return;
    }
    el.innerHTML = photos.map(p => `
        <div class="gallery-item" data-type="${esc(p.type || 'after')}" onclick="openImage('${esc(p.photo_url)}')">
            <img src="${esc(p.photo_url)}" alt="${esc(p.type)}" loading="lazy">
            <div class="gallery-overlay">
                <span class="gallery-badge ${esc(p.type)}">${p.type === 'before' ? 'ДО' : 'ПОСЛЕ'}</span>
                <small>${esc((p.cars?.brand || '') + ' ' + (p.cars?.model || ''))}</small>
            </div>
        </div>`).join('');
}

// ════════════════════════════════════════════════════════════
//  УВЕДОМЛЕНИЯ
// ════════════════════════════════════════════════════════════

function updateNotificationBadge(count) {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    badge.textContent    = count > 99 ? '99+' : count;
    badge.style.display  = count > 0 ? 'flex' : 'none';
}

function updateNotifications(notifications) {
    const list = document.getElementById('notifications-list');
    if (!list) return;
    if (!notifications.length) {
        list.innerHTML = `<div class="notification-item">
            <i class="fas fa-bell-slash"></i>
            <div><p>Нет новых уведомлений</p><small>Всё прочитано</small></div>
        </div>`;
        return;
    }
    list.innerHTML = notifications.map(n => `
        <div class="notification-item ${n.is_read ? '' : 'unread'}"
             data-id="${n.id}" onclick="markNotificationRead(${n.id})" style="cursor:pointer;">
            <i class="fas ${getIconByType(n.type)}"></i>
            <div>
                <p><strong>${esc(n.title || '')}</strong></p>
                <p>${esc(n.message)}</p>
                <small>${formatDate(n.created_at)}</small>
            </div>
            ${!n.is_read ? '<span class="unread-dot"></span>' : ''}
        </div>`).join('');
}

async function loadAllNotifications() {
    const listEl = document.getElementById('notifications-list');
    if (!listEl || !currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('notifications').select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        updateNotifications(data || []);
    } catch (err) {
        console.error('Ошибка загрузки уведомлений:', err);
    }
}

async function markNotificationRead(id) {
    try {
        await supabaseClient.from('notifications').update({ is_read: true }).eq('id', id);
        await loadNotifications();
        if (document.getElementById('notifications-panel')?.classList.contains('active')) {
            await loadAllNotifications();
        }
    } catch (err) { console.error('Ошибка:', err); }
}

async function markAllRead() {
    if (!currentUser) return;
    try {
        await supabaseClient.from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUser.id).eq('is_read', false);
        await loadNotifications();
        await loadAllNotifications();
    } catch (err) { console.error('Ошибка:', err); }
}

function toggleNotifications() {
    const panel = document.getElementById('notifications-panel');
    if (!panel) return;
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
    } else {
        panel.classList.add('active');
        loadAllNotifications();
    }
}

function getIconByType(type) {
    return { info:'fa-info-circle', success:'fa-check-circle',
             warning:'fa-exclamation-triangle', error:'fa-times-circle' }[type] || 'fa-bell';
}

// ════════════════════════════════════════════════════════════
//  ДЕЙСТВИЯ (CRUD)
// ════════════════════════════════════════════════════════════

async function createAppointment() {
    const carId     = document.getElementById('booking-car')?.value;
    const serviceId = document.getElementById('booking-service')?.value;
    const typeId    = document.getElementById('booking-service-type')?.value || null;
    const dateVal   = document.getElementById('booking-date')?.value;
    const note      = document.getElementById('booking-note')?.value || '';
    const phone     = document.getElementById('booking-phone')?.value?.trim() || '';

    if (!carId || !serviceId || !dateVal || !phone) {
        showNotification('Заполните обязательные поля', 'warning');
        return;
    }

    try {
        showLoader();
        const service = currentServices.find(s => s.id == serviceId);
        const sType   = currentServiceTypes.find(t => t.id == typeId);
        let total     = (service?.base_price || 0) + (sType?.additional_price || 0);

        // Применяем скидку промокода
        if (currentPromo) {
            total = total * (1 - currentPromo.discount_percent / 100);
        }
        // Применяем скидку уровня лояльности
        total = total * (1 - currentDiscount / 100);

        const { error } = await supabaseClient.from('appointments').insert([{
            user_id:         currentUser.id,
            car_id:          carId,
            service_id:      serviceId,
            service_type_id: typeId || null,
            scheduled_at:    new Date(dateVal).toISOString(),
            notes:           note || null,
            status:          'pending',
            total_price:     Math.round(total),
            client_phone:    phone
        }]);
        if (error) throw error;
        showNotification('Запись создана!', 'success');
        currentPromo = null;
        await loadAppointments();

        ['booking-car','booking-service','booking-date','booking-note','booking-phone','booking-promo']
            .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        const typeEl = document.getElementById('booking-service-type');
        if (typeEl) typeEl.innerHTML = '<option value="">Выберите вариант</option>';
        const priceEl = document.getElementById('service-price-display');
        if (priceEl) priceEl.style.display = 'none';
        const promoResult = document.getElementById('promo-result');
        if (promoResult) promoResult.style.display = 'none';
        hidePromoInfo();
    } catch (err) {
        console.error('Ошибка создания записи:', err);
        showNotification(err.message || 'Ошибка создания записи', 'error');
    } finally {
        hideLoader();
    }
}

async function saveCar() {
    const brand   = document.getElementById('car-brand')?.value.trim();
    const model   = document.getElementById('car-model')?.value.trim();
    const year    = document.getElementById('car-year')?.value;
    const plate   = document.getElementById('car-plate')?.value.trim();
    const mileage = document.getElementById('car-mileage')?.value;
    const vin     = document.getElementById('car-vin')?.value.trim();
    if (!brand || !model) { showNotification('Укажите марку и модель', 'warning'); return; }
    try {
        showLoader();
        const { error } = await supabaseClient.from('cars').insert([{
            user_id: currentUser.id, brand, model,
            production_year: year || null, license_plate: plate || null,
            mileage: mileage || null, vin: vin || null
        }]);
        if (error) throw error;
        showNotification('Автомобиль добавлен', 'success');
        closeModal();
        await loadCars();
        updateProfileStats();
    } catch (err) {
        showNotification('Ошибка: ' + err.message, 'error');
    } finally { hideLoader(); }
}

async function deleteCar(carId) {
    if (!confirm('Удалить автомобиль?')) return;
    try {
        showLoader();
        const { error } = await supabaseClient.from('cars').delete()
            .eq('id', carId).eq('user_id', currentUser.id);
        if (error) throw error;
        showNotification('Автомобиль удалён', 'success');
        await loadCars();
        updateProfileStats();
    } catch (err) {
        showNotification('Ошибка: ' + err.message, 'error');
    } finally { hideLoader(); }
}

function editCar(carId) {
    const car = currentCars.find(c => c.id === carId);
    if (!car) return;
    setVal('car-brand',   car.brand           || '');
    setVal('car-model',   car.model           || '');
    setVal('car-year',    car.production_year || '');
    setVal('car-plate',   car.license_plate   || '');
    setVal('car-mileage', car.mileage         || '');
    setVal('car-vin',     car.vin             || '');
    openModal();
    const btn = document.getElementById('save-car-btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-save"></i> Обновить';
        btn.onclick   = () => updateCar(carId);
    }
}

async function updateCar(carId) {
    const brand = document.getElementById('car-brand')?.value.trim();
    const model = document.getElementById('car-model')?.value.trim();
    if (!brand || !model) { showNotification('Укажите марку и модель', 'warning'); return; }
    try {
        showLoader();
        const { error } = await supabaseClient.from('cars').update({
            brand, model,
            production_year: document.getElementById('car-year')?.value    || null,
            license_plate:   document.getElementById('car-plate')?.value   || null,
            mileage:         document.getElementById('car-mileage')?.value || null,
            vin:             document.getElementById('car-vin')?.value     || null,
            updated_at:      new Date().toISOString()
        }).eq('id', carId).eq('user_id', currentUser.id);
        if (error) throw error;
        showNotification('Автомобиль обновлён', 'success');
        closeModal();
        await loadCars();
    } catch (err) {
        showNotification('Ошибка: ' + err.message, 'error');
    } finally { hideLoader(); }
}

async function saveProfile() {
    const name     = document.getElementById('profile-name')?.value.trim();
    const phone    = document.getElementById('profile-phone')?.value.trim();
    const birthday = document.getElementById('profile-birthday')?.value;
    if (!name) {
        showNotification('Имя обязательно', 'warning');
        document.getElementById('profile-name')?.focus();
        return;
    }
    try {
        showLoader();
        const profileData = { id: currentUser.id, name, updated_at: new Date().toISOString() };
        if (phone)    profileData.phone    = phone;
        if (birthday) profileData.birthday = birthday;
        const { error } = await supabaseClient.from('profiles').upsert(profileData);
        if (error) {
            if (error.code === '23505') throw new Error('Этот телефон уже используется');
            throw error;
        }
        await loadUserProfile();
        updateUI();
        showNotification('Профиль сохранён', 'success');
    } catch (err) {
        showNotification(err.message || 'Ошибка сохранения', 'error');
    } finally { hideLoader(); }
}

// ════════════════════════════════════════════════════════════
//  ЧАТ
// ════════════════════════════════════════════════════════════

function renderChatMessages(messages) {
    const el = document.getElementById('chat-messages-container');
    if (!el) return;
    if (!messages.length) {
        el.innerHTML = `<div class="msg manager">
            <div class="msg-avatar"><i class="fas fa-user-tie"></i></div>
            <div class="msg-content">
                <p>Здравствуйте! Чем могу помочь?</p>
                <small class="msg-time">Сейчас</small>
            </div>
        </div>`;
        return;
    }
    el.innerHTML = messages.map(buildMsgHtml).join('');
    el.scrollTop = el.scrollHeight;
}

function buildMsgHtml(msg) {
    const isUser = msg.user_id === currentUser?.id;
    const time   = new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' });
    return `<div class="msg ${isUser ? 'user' : 'manager'}">
        <div class="msg-avatar"><i class="fas fa-${isUser ? 'user' : 'user-tie'}"></i></div>
        <div class="msg-content">
            <p>${esc(msg.message)}</p>
            <small class="msg-time">${time}</small>
        </div>
    </div>`;
}

function appendMsgToChat(msg) {
    const el = document.getElementById('chat-messages-container');
    if (!el) return;
    el.insertAdjacentHTML('beforeend', buildMsgHtml(msg));
    el.scrollTop = el.scrollHeight;
}

function subscribeToMessages() {
    if (!currentUser || realtimeChannel) return;
    realtimeChannel = supabaseClient
        .channel('chat-realtime')
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages' }, payload => {
            const m = payload.new;
            if (m.user_id === currentUser.id || m.receiver_id === currentUser.id) {
                appendMsgToChat(m);
            }
        })
        .subscribe();
}

async function sendMessage() {
    const input = document.getElementById('chat-input-text');
    const text  = input?.value.trim();
    if (!text || !currentUser) return;
    try {
        const { data, error } = await supabaseClient.from('messages')
            .insert([{
                user_id:    currentUser.id,
                message:    text,
                direction:  'client_to_staff',
                created_at: new Date().toISOString()
            }])
            .select().single();
        if (error) throw error;
        if (input) input.value = '';
        appendMsgToChat(data);
    } catch (err) {
        showNotification('Не удалось отправить сообщение', 'error');
    }
}

function setupChatEvents() {
    const input = document.getElementById('chat-input-text');
    const btn   = document.getElementById('chat-send-btn');
    input?.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } });
    btn?.addEventListener('click', sendMessage);
    document.getElementById('chat-header')?.addEventListener('click', toggleChat);
}

// ── ФОТО ─────────────────────────────────────────────────────

async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showNotification('Выберите изображение', 'error'); return;
    }
    if (file.size > 2 * 1024 * 1024) {
        showNotification('Файл слишком большой (макс 2 МБ)', 'error'); return;
    }
    try {
        showLoader();
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) throw new Error('Сессия истекла');
        const ext    = file.name.split('.').pop();
        const path   = `avatars/avatar_${session.user.id}_${Date.now()}.${ext}`;
        const { error: upErr } = await supabaseClient.storage
            .from('avatars').upload(path, file, { cacheControl:'3600', upsert:true, contentType:file.type });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabaseClient.storage.from('avatars').getPublicUrl(path);
        const { error: updErr } = await supabaseClient.from('profiles')
            .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
            .eq('id', session.user.id);
        if (updErr) throw updErr;
        setAvatarImg('profile-avatar', publicUrl);
        setAvatarImg('user-avatar',    publicUrl);
        showNotification('Фото обновлено', 'success');
        await loadUserProfile();
    } catch (err) {
        showNotification(err.message || 'Ошибка загрузки фото', 'error');
    } finally { hideLoader(); }
}

// ════════════════════════════════════════════════════════════
//  UI УТИЛИТЫ
// ════════════════════════════════════════════════════════════

function showSection(sectionId, element) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId)?.classList.add('active');

    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
    if (element) element.classList.add('active');
    else {
        // Найти нужный пункт меню по onclick
        document.querySelectorAll('.menu-item').forEach(item => {
            if (item.getAttribute('onclick')?.includes(`'${sectionId}'`)) item.classList.add('active');
        });
    }

    const titles = {
        dashboard:'Главная', booking:'Запись на сервис', cars:'Мой гараж',
        history:'История', reminders:'Напоминания ТО', finance:'Финансы',
        documents:'Документы', media:'Медиа отчеты', settings:'Профиль'
    };
    setEl('page-title', titles[sectionId] || 'Личный кабинет');

    if (sectionId === 'media')     loadGallery();
    if (sectionId === 'reminders') loadReminders();
    if (sectionId === 'documents') loadDocuments();

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('overlay')?.classList.remove('active');
    }
}

function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('overlay')?.classList.toggle('active');
}

function toggleChat() {
    const chat = document.getElementById('chat-widget');
    const icon = document.getElementById('chat-icon');
    if (!chat) return;
    chat.classList.toggle('expanded');
    if (icon) icon.className = chat.classList.contains('expanded')
        ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    if (chat.classList.contains('expanded')) {
        setTimeout(() => {
            const el = document.getElementById('chat-messages-container');
            if (el) el.scrollTop = el.scrollHeight;
        }, 300);
    }
}

function toggleSupport() {
    document.getElementById('support-menu')?.classList.toggle('show');
}

function openModal() {
    const m = document.getElementById('car-modal');
    if (m) m.style.display = 'flex';
}

function closeModal() {
    const m = document.getElementById('car-modal');
    if (m) m.style.display = 'none';
    clearCarForm();
    const btn = document.getElementById('save-car-btn');
    if (btn) { btn.innerHTML = '<i class="fas fa-plus"></i> Добавить'; btn.onclick = saveCar; }
}

function clearCarForm() {
    ['car-brand','car-model','car-year','car-plate','car-mileage','car-vin']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

function openImage(url) { window.open(url, '_blank'); }

function filterHistory(status, btn) {
    document.querySelectorAll('.filter-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const list = status === 'all'
        ? currentAppointments
        : currentAppointments.filter(a => a.status === status);
    const el = document.getElementById('history-container');
    if (!el) return;
    if (!list.length) {
        el.innerHTML = emptyState('fa-filter', 'Нет записей с таким статусом');
        return;
    }
    renderHistoryItems(el, list);
}

function filterMedia(type, btn) {
    document.querySelectorAll('.media-filters .filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.gallery-item').forEach(item => {
        item.style.display = (type === 'all' || item.dataset.type === type) ? 'block' : 'none';
    });
}

async function logout() {
    if (!confirm('Выйти из аккаунта?')) return;
    try {
        realtimeChannel && supabaseClient.removeChannel(realtimeChannel);
        await supabaseClient.auth.signOut();
    } finally {
        window.location.href = 'auth.html';
    }
}

// ════════════════════════════════════════════════════════════
//  ШАГИ ЗАПИСИ
// ════════════════════════════════════════════════════════════

function initStepAnimation() {
    if (document.getElementById('step-anim-styles')) return;
    const s = document.createElement('style');
    s.id = 'step-anim-styles';
    s.textContent = `
        .form-step{transition:all .3s cubic-bezier(.68,-.55,.265,1.55);cursor:pointer;}
        .form-step:hover{transform:scale(1.1);}
        .form-step.active{transform:scale(1.2);animation:stepGlow 2s infinite;}
        .form-step.completed::after{content:'✓';}
        .form-step.completed .step-number{display:none;}
        @keyframes stepGlow{0%,100%{box-shadow:0 0 5px rgba(52,152,219,.5)}50%{box-shadow:0 0 20px rgba(52,152,219,.8)}}
    `;
    document.head.appendChild(s);

    document.querySelectorAll('.form-step').forEach((step, i, steps) => {
        step.addEventListener('click', () => {
            steps.forEach((s, j) => {
                s.classList.remove('active','completed');
                if (j < i) s.classList.add('completed');
            });
            step.classList.add('active');
        });
    });
}

function setupAutoStepHighlight() {
    const steps = document.querySelectorAll('.form-step');
    if (steps.length < 3) return;
    const map = [
        document.getElementById('booking-car'),
        document.getElementById('booking-service'),
        document.getElementById('booking-date')
    ];
    map.forEach((el, i) => {
        el?.addEventListener('change', () => {
            if (steps[i]) steps[i].classList.toggle('completed', !!el.value);
        });
    });
}

// ════════════════════════════════════════════════════════════
//  УВЕДОМЛЕНИЯ TOAST
// ════════════════════════════════════════════════════════════

function showNotification(message, type = 'info') {
    document.querySelectorAll('.app-toast').forEach(n => n.remove());
    const icons  = { success:'check-circle', error:'exclamation-circle', warning:'exclamation-triangle', info:'info-circle' };
    const colors = { success:'#10b981', error:'#ef4444', warning:'#f59e0b', info:'#3b82f6' };
    const el = document.createElement('div');
    el.className = 'app-toast';
    Object.assign(el.style, {
        position:'fixed', top:'20px', right:'20px', zIndex:'9999',
        padding:'14px 20px', borderRadius:'12px', display:'flex',
        alignItems:'center', gap:'10px', fontSize:'0.95rem', fontWeight:'500',
        boxShadow:'0 10px 30px rgba(0,0,0,.2)', maxWidth:'400px',
        color:'white', background: colors[type] || colors.info,
        animation:'slideIn .3s ease'
    });
    el.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        <span>${esc(message)}</span>
        <button onclick="this.parentElement.remove()"
            style="background:none;border:none;cursor:pointer;margin-left:8px;color:inherit;opacity:.7;">✕</button>`;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0'; el.style.transform = 'translateX(20px)';
        el.style.transition = 'all .3s ease';
        setTimeout(() => el.remove(), 300);
    }, 4000);
}

function showLoader() {
    if (document.getElementById('app-loader')) return;
    const el = document.createElement('div');
    el.id = 'app-loader';
    Object.assign(el.style, {
        position:'fixed', inset:'0', background:'rgba(255,255,255,.8)',
        display:'flex', alignItems:'center', justifyContent:'center',
        zIndex:'99999', flexDirection:'column', gap:'12px'
    });
    el.innerHTML = `
        <div style="width:48px;height:48px;border:4px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin .8s linear infinite;"></div>
        <p style="color:#6b7280;font-size:.95rem;font-family:sans-serif;">Загрузка...</p>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
    document.body.appendChild(el);
}

function hideLoader() { document.getElementById('app-loader')?.remove(); }

// ════════════════════════════════════════════════════════════
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ════════════════════════════════════════════════════════════

function getStatusText(s) {
    return { pending:'Ожидает', confirmed:'Подтверждён',
             in_progress:'В работе', completed:'Завершён', cancelled:'Отменён' }[s] || s;
}

function formatNumber(n) {
    return Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatDate(str) {
    const d = new Date(str), now = new Date(), diff = now - d;
    if (diff < 60000)    return 'только что';
    if (diff < 3600000)  return `${Math.floor(diff/60000)} мин назад`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)} ч назад`;
    return d.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function emptyState(icon, text, sub = '') {
    return `<div class="empty-state">
        <i class="fas ${icon}"></i><p>${text}</p>
        ${sub ? `<small>${sub}</small>` : ''}
    </div>`;
}

function setEl(id, text)  { const el = document.getElementById(id); if (el) el.textContent = text; }
function setVal(id, val)  { const el = document.getElementById(id); if (el) el.value = val; }

function setAvatarImg(id, url) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    if (!url) { el.innerHTML = '<i class="fas fa-user"></i>'; return; }
    const img = new Image();
    img.src = url + '?t=' + Date.now();
    img.alt = 'Avatar';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
    img.onload  = () => { el.innerHTML = ''; el.appendChild(img); };
    img.onerror = () => { el.innerHTML = '<i class="fas fa-user"></i>'; };
}

// ── ЗАКРЫТИЕ ПО КЛИКУ ВНЕ ────────────────────────────────────
window.addEventListener('click', e => {
    const modal = document.getElementById('car-modal');
    if (e.target === modal) closeModal();
    const reviewModal = document.getElementById('review-modal');
    if (e.target === reviewModal) closeReviewModal();
    const reminderModal = document.getElementById('reminder-modal');
    if (e.target === reminderModal) closeReminderModal();

    const fab  = document.querySelector('.support-fab');
    const menu = document.getElementById('support-menu');
    if (fab && menu && !fab.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('show');
    }

    const notifPanel = document.getElementById('notifications-panel');
    const notifIcon  = document.querySelector('.notification-icon');
    if (notifPanel && notifIcon &&
        !notifPanel.contains(e.target) && !notifIcon.contains(e.target)) {
        notifPanel.classList.remove('active');
    }
});

document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeModal();
    closeReviewModal();
    closeReminderModal();
    document.getElementById('notifications-panel')?.classList.remove('active');
    document.getElementById('support-menu')?.classList.remove('show');
});






// ============================================================
//  УВЕДОМЛЕНИЯ - ПОЛНОСТЬЮ РАБОЧИЙ КОД
// ============================================================

// Загрузка ТОЛЬКО непрочитанных уведомлений (для бейджей)
async function loadNotifications() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('is_read', false)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        const unreadCount = data?.length || 0;
        updateNotificationBadge(unreadCount);
        updateNotificationsPreview(); // обновляем превью
        return data || [];
    } catch (err) { 
        console.error('Ошибка загрузки уведомлений:', err);
        return [];
    }
}

// Обновление бейджей (и мобильный, и в меню)
function updateNotificationBadge(count) {
    // Бейдж в мобильной шапке
    const badge = document.getElementById('notif-badge');
    if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
    
    // Бейдж в боковом меню
    const menuBadge = document.getElementById('menu-notifications-badge');
    if (menuBadge) {
        menuBadge.textContent = count > 99 ? '99+' : count;
        menuBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

// Загрузка ВСЕХ уведомлений (для панели)
async function loadAllNotifications() {
    const listEl = document.getElementById('notifications-list');
    if (!listEl || !currentUser) return;
    
    try {
        listEl.innerHTML = '<div class="loading-spinner">Загрузка...</div>';
        
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(50);
            
        if (error) throw error;
        
        if (!data || data.length === 0) {
            listEl.innerHTML = `<div class="notification-item">
                <i class="fas fa-bell-slash"></i>
                <div><p>Нет уведомлений</p><small>Здесь будут появляться уведомления</small></div>
            </div>`;
            return;
        }
        
        listEl.innerHTML = data.map(n => `
            <div class="notification-item ${n.is_read ? '' : 'unread'}"
                 data-id="${n.id}" onclick="markNotificationRead(${n.id})" style="cursor:pointer;">
                <i class="fas ${getIconByType(n.type)}"></i>
                <div style="flex:1;">
                    <p><strong>${esc(n.title || '')}</strong></p>
                    <p>${esc(n.message)}</p>
                    <small>${formatDate(n.created_at)}</small>
                </div>
                ${!n.is_read ? '<span class="unread-dot"></span>' : ''}
            </div>
        `).join('');
        
    } catch (err) {
        console.error('Ошибка загрузки всех уведомлений:', err);
        listEl.innerHTML = '<div class="error-message">Ошибка загрузки</div>';
    }
}

// Обновление превью уведомлений (последние 3)
async function updateNotificationsPreview() {
    const previewList = document.getElementById('notifications-preview-list');
    if (!previewList || !currentUser) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(3);
            
        if (error) throw error;
        
        if (!data || data.length === 0) {
            previewList.innerHTML = '<div class="preview-empty">Нет уведомлений</div>';
            return;
        }
        
        previewList.innerHTML = data.map(n => {
            const icon = getIconByType(n.type);
            const date = formatDate(n.created_at);
            const unreadClass = n.is_read ? '' : 'unread';
            
            return `
                <div class="preview-item ${unreadClass}" onclick="markNotificationRead(${n.id})">
                    <i class="fas ${icon}" style="width:20px;"></i>
                    <div class="preview-text">
                        <strong>${esc(n.title || 'Уведомление')}</strong>
                        <small>${date}</small>
                        <p style="margin:2px 0 0;font-size:0.85rem;color:#666;">${esc(n.message.substring(0, 50))}${n.message.length > 50 ? '...' : ''}</p>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Ошибка загрузки превью уведомлений:', err);
        previewList.innerHTML = '<div class="preview-error">Ошибка загрузки</div>';
    }
}

// Отметить одно уведомление как прочитанное
async function markNotificationRead(id) {
    try {
        event?.stopPropagation(); // останавливаем всплытие если есть event
        
        const { error } = await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);
            
        if (error) throw error;
        
        // Обновляем все
        await loadNotifications(); // обновит бейджи и превью
        
        // Если панель открыта, обновляем и её
        const panel = document.getElementById('notifications-panel');
        if (panel?.classList.contains('active')) {
            await loadAllNotifications();
        }
        
    } catch (err) { 
        console.error('Ошибка отметки уведомления:', err);
        showNotification('Не удалось обновить уведомление', 'error');
    }
}

// Отметить все уведомления как прочитанные (из панели)
async function markAllRead() {
    if (!currentUser) return;
    
    try {
        const { error } = await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);
            
        if (error) throw error;
        
        // Обновляем всё
        await loadNotifications();
        await loadAllNotifications();
        
        showNotification('Все уведомления отмечены прочитанными', 'success');
        
    } catch (err) { 
        console.error('Ошибка отметки всех уведомлений:', err);
        showNotification('Не удалось обновить уведомления', 'error');
    }
}

// Отметить все уведомления как прочитанные (из превью)
async function markAllMenuNotificationsRead(event) {
    if (event) event.stopPropagation();
    if (!currentUser) return;
    
    try {
        const { error } = await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);
            
        if (error) throw error;
        
        // Обновляем
        await loadNotifications();
        await loadAllNotifications();
        
        showNotification('Все уведомления отмечены прочитанными', 'success');
        
    } catch (err) {
        console.error('Ошибка при отметке всех уведомлений:', err);
        showNotification('Не удалось обновить уведомления', 'error');
    }
}

// Открыть/закрыть панель уведомлений
function toggleNotifications() {
    const panel = document.getElementById('notifications-panel');
    if (!panel) return;
    
    if (panel.classList.contains('active')) {
        panel.classList.remove('active');
    } else {
        panel.classList.add('active');
        loadAllNotifications(); // загружаем все уведомления при открытии
    }
}

// Иконка по типу уведомления
function getIconByType(type) {
    const icons = {
        'info': 'fa-info-circle',
        'success': 'fa-check-circle',
        'warning': 'fa-exclamation-triangle',
        'error': 'fa-times-circle'
    };
    return icons[type] || 'fa-bell';
}

// Не забудьте добавить эту функцию в инициализацию
// Добавьте в функцию initializeApp() после loadNotifications():
// await updateNotificationsPreview();

console.log('✅ cabinet.js загружен (enhanced)');