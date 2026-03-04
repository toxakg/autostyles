// ============================================================
//  AUTOSTYLES — cabinet.js  (clean, fixed)
// ============================================================

// ── ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ────────────────────────────────────
let supabaseClient  = null;
let currentUser     = null;
let currentCars     = [];
let currentServices = [];
let currentServiceTypes = [];
let currentAppointments = [];
let currentBonuses  = 0;
let currentLevel    = 'Silver';
let currentDiscount = 5;
let appInitialized  = false;
let realtimeChannel = null;

// ── ИНИЦИАЛИЗАЦИЯ ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Cabinet.js: DOM загружен');

    // Берём клиент Supabase из supabaseClient.js
    supabaseClient = window.sb || window.supabaseClient || null;

    if (!supabaseClient) {
        // Подождём до 3 сек, пока файл не подгрузится
        await waitForSupabase();
    }

    if (!supabaseClient) {
        showNotification('Ошибка подключения к базе данных', 'error');
        return;
    }

    // Проверяем сессию
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

    // Слушаем изменения авторизации
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
            window.location.href = 'auth.html';
        } else if (event === 'SIGNED_IN' && session && !appInitialized) {
            currentUser = session.user;
            await initializeApp();
        }
    });

    // Минимальная дата для записи = сейчас
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dateInput.min = now.toISOString().slice(0, 16);
    }

    // Загрузка фото профиля
    document.getElementById('change-photo-btn')?.addEventListener('click', () => {
        document.getElementById('profile-photo-input')?.click();
    });
    document.getElementById('profile-photo-input')?.addEventListener('change', handlePhotoUpload);

    // Форматирование телефона в форме записи
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

    // Настройка чата
    setupChatEvents();

    // Шаги бронирования
    initStepAnimation();
    setupAutoStepHighlight();
    setTimeout(() => {
        document.querySelector('.form-step')?.classList.add('active');
    }, 100);
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
            } else if (tries >= 30) {
                clearInterval(iv);
                resolve();
            }
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
        await Promise.all([
            loadUserProfile(),
            loadServices(),
            loadServiceTypes(),
            loadCars(),
            loadAppointments(),
            loadBonuses(),
            loadGallery(),
            loadNotifications(),
            loadChatMessages()
        ]);

        updateUI();
        console.log('✅ Приложение инициализировано');
    } catch (err) {
        console.error('Ошибка инициализации:', err);
        showNotification('Ошибка загрузки данных', 'error');
    } finally {
        hideLoader();
    }
}

// ── ЗАГРУЗКА ДАННЫХ ───────────────────────────────────────────

async function loadUserProfile() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (data) currentUser.profile = data;
    } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
    }
}

async function loadServices() {
    try {
        const { data, error } = await supabaseClient
            .from('services')
            .select('*')
            .order('name');
        if (error) throw error;
        currentServices = data || [];
        console.log('Загружено услуг:', currentServices.length);
        updateServicesSelect();
    } catch (err) {
        console.error('Ошибка загрузки услуг:', err);
    }
}

async function loadServiceTypes() {
    try {
        const { data, error } = await supabaseClient
            .from('service_types')
            .select('*');
        if (error) throw error;
        currentServiceTypes = data || [];
        console.log('Загружено типов услуг:', currentServiceTypes.length);
    } catch (err) {
        console.error('Ошибка загрузки типов услуг:', err);
    }
}

async function loadCars() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('cars')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error) throw error;
        currentCars = data || [];
        console.log('Загружено авто:', currentCars.length);
        displayCars();
        updateCarSelect();
    } catch (err) {
        console.error('Ошибка загрузки автомобилей:', err);
    }
}

async function loadAppointments() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('appointments')
            .select(`
                *,
                services:service_id(name, base_price),
                cars:car_id(brand, model, license_plate)
            `)
            .eq('user_id', currentUser.id)
            .order('scheduled_at', { ascending: false });
        if (error) throw error;
        currentAppointments = data || [];
        console.log('Загружено записей:', currentAppointments.length);
        displayHistory();
        updateFinanceStats();
        updateCurrentOrder();
    } catch (err) {
        console.error('Ошибка загрузки записей:', err);
    }
}

async function loadBonuses() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('bonuses')
            .select('amount')
            .eq('user_id', currentUser.id);
        if (error) throw error;
        currentBonuses = (data || []).reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
        updateBonuses();
    } catch (err) {
        console.error('Ошибка загрузки бонусов:', err);
    }
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
    } catch (err) {
        console.error('Ошибка загрузки галереи:', err);
    }
}

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
        updateNotifications(data || []);
    } catch (err) {
        console.error('Ошибка загрузки уведомлений:', err);
    }
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
    } catch (err) {
        console.error('Ошибка загрузки чата:', err);
    }
}

// ── ОБНОВЛЕНИЕ UI ─────────────────────────────────────────────

function updateUI() {
    if (!currentUser) return;

    const userName = currentUser.profile?.name
        || currentUser.user_metadata?.name
        || currentUser.email?.split('@')[0]
        || 'Клиент';

    setEl('welcome-name', userName);
    setEl('mini-name', userName);

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
    }

    setEl('mini-level',      `Уровень: ${currentLevel}`);
    setEl('level-name',      currentLevel);
    setEl('level-discount',  currentDiscount + '%');
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

    sel.addEventListener('change', handleServiceChange);
}

function handleServiceChange() {
    const serviceId = document.getElementById('booking-service').value;
    const typeWrap  = document.getElementById('booking-service-type');
    if (!typeWrap) return;

    typeWrap.innerHTML = '<option value="">— без варианта —</option>';

    const types = currentServiceTypes.filter(t => t.service_id == serviceId);
    if (types.length > 0) {
        types.forEach(t => {
            typeWrap.appendChild(new Option(`${t.name} (+${t.additional_price} сом)`, t.id));
        });
    }

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
                <p><i class="fas fa-id-card"></i> ${car.license_plate || '—'}</p>
                <p><i class="fas fa-tachometer-alt"></i> ${formatNumber(car.mileage || 0)} км</p>
                ${car.vin ? `<p><i class="fas fa-barcode"></i> VIN: ${esc(car.vin)}</p>` : ''}
            </div>
            <div class="car-actions">
                <button class="btn-icon" onclick="editCar(${car.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-icon danger" onclick="deleteCar(${car.id})"><i class="fas fa-trash-alt"></i></button>
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
        return `
        <div class="history-item status-${app.status}">
            <div class="history-date">
                <i class="fas fa-calendar-alt"></i>
                ${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' })}
            </div>
            <div class="history-details">
                <h4>${app.services?.name || 'Услуга'}</h4>
                <p><i class="fas fa-car"></i> ${app.cars?.brand || ''} ${app.cars?.model || ''}</p>
                ${app.notes ? `<p class="history-notes"><i class="fas fa-comment"></i> ${esc(app.notes)}</p>` : ''}
            </div>
            <div class="history-status">
                <span class="status-badge status-${app.status}">${getStatusText(app.status)}</span>
            </div>
            <div class="history-price">${formatNumber(app.total_price || 0)} сом</div>
        </div>`;
    }).join('');
}

function updateFinanceStats() {
    const done  = currentAppointments.filter(a => a.status === 'completed');
    const spent = done.reduce((s, a) => s + (parseFloat(a.total_price) || 0), 0);

    setEl('total-spent',  formatNumber(spent) + ' сом');
    setEl('total-orders', done.length);
    setEl('total-saved',  formatNumber(spent * 0.05) + ' сом');

    const ol = document.getElementById('orders-list');
    if (!ol) return;
    if (!done.length) {
        ol.innerHTML = emptyState('fa-file-invoice', 'История транзакций пуста');
        return;
    }
    ol.innerHTML = done.slice(0, 10).map(a => `
        <div class="transaction-item">
            <div class="transaction-icon"><i class="fas fa-receipt"></i></div>
            <div class="transaction-info">
                <h4>${a.services?.name || 'Услуга'}</h4>
                <small>${new Date(a.scheduled_at).toLocaleDateString('ru-RU')}</small>
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
    const nextGoal = currentLevel === 'Silver' ? 5000 : currentLevel === 'Gold' ? 15000 : 1;
    const pct = Math.min((currentBonuses / nextGoal) * 100, 100);
    const progressEl = document.getElementById('loyalty-progress');
    if (progressEl) progressEl.style.width = pct + '%';
    setEl('points-needed', formatNumber(Math.max(0, nextGoal - currentBonuses)));
}

function displayGallery(photos) {
    const el = document.getElementById('gallery-container');
    if (!el) return;
    if (!photos.length) {
        el.innerHTML = emptyState('fa-camera', 'Фото отчеты появятся здесь', 'После начала работ с вашим автомобилем');
        return;
    }
    el.innerHTML = photos.map(p => `
        <div class="gallery-item" data-type="${p.type}" onclick="openImage('${p.photo_url}')">
            <img src="${p.photo_url}" alt="${p.type}" loading="lazy">
            <div class="gallery-overlay">
                <span class="gallery-badge ${p.type}">${p.type === 'before' ? 'ДО' : 'ПОСЛЕ'}</span>
                <small>${p.cars?.brand || ''} ${p.cars?.model || ''}</small>
            </div>
        </div>`).join('');
}

function updateNotifications(notifications) {
    const badge = document.getElementById('notif-badge');
    if (badge) {
        badge.textContent = notifications.length;
        badge.style.display = notifications.length > 0 ? 'flex' : 'none';
    }

    const list = document.getElementById('notifications-list');
    if (!list) return;

    if (!notifications.length) {
        list.innerHTML = `
            <div class="notification-item">
                <i class="fas fa-bell-slash"></i>
                <div><p>Нет новых уведомлений</p><small>Сейчас</small></div>
            </div>`;
        return;
    }

    list.innerHTML = notifications.map(n => `
        <div class="notification-item" onclick="markNotificationRead(${n.id})" style="cursor:pointer;">
            <i class="fas fa-${n.type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
            <div>
                <p>${esc(n.message)}</p>
                <small>${formatDate(n.created_at)}</small>
            </div>
        </div>`).join('');
}

// ── ЧАТ ───────────────────────────────────────────────────────

function renderChatMessages(messages) {
    const el = document.getElementById('chat-messages-container');
    if (!el) return;

    if (!messages.length) {
        el.innerHTML = `
            <div class="msg manager">
                <div class="msg-avatar"><i class="fas fa-user-tie"></i></div>
                <div class="msg-content">
                    <p>Здравствуйте! Чем могу помочь?</p>
                    <small class="msg-time">Сейчас</small>
                </div>
            </div>`;
        return;
    }

    el.innerHTML = messages.map(msg => buildMsgHtml(msg)).join('');
    el.scrollTop = el.scrollHeight;
}

function buildMsgHtml(msg) {
    const isUser = msg.user_id === currentUser?.id;
    const time   = new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' });
    return `
        <div class="msg ${isUser ? 'user' : 'manager'}">
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
        .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'messages'
        }, payload => {
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
        const { data, error } = await supabaseClient
            .from('messages')
            .insert([{
                user_id:   currentUser.id,
                message:   text,
                direction: 'client_to_staff',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        if (input) input.value = '';
        appendMsgToChat(data);
    } catch (err) {
        console.error('Ошибка отправки:', err);
        showNotification('Не удалось отправить сообщение', 'error');
    }
}

// Псевдоним для кнопки в HTML
function sendUserMessage() { sendMessage(); }

function setupChatEvents() {
    const input = document.getElementById('chat-input-text');
    const btn   = document.getElementById('chat-send-btn');

    input?.addEventListener('keypress', e => {
        if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
    });
    btn?.addEventListener('click', sendMessage);

    // Заголовок чата открывает/закрывает
    document.getElementById('chat-header')?.addEventListener('click', toggleChat);
}

// ── ДЕЙСТВИЯ ─────────────────────────────────────────────────

async function createAppointment() {
    const carId       = document.getElementById('booking-car')?.value;
    const serviceId   = document.getElementById('booking-service')?.value;
    const typeId      = document.getElementById('booking-service-type')?.value || null;
    const dateVal     = document.getElementById('booking-date')?.value;
    const note        = document.getElementById('booking-note')?.value || '';
    const phone       = document.getElementById('booking-phone')?.value?.trim() || '';

    if (!carId || !serviceId || !dateVal || !phone) {
        showNotification('Заполните обязательные поля', 'warning');
        return;
    }

    try {
        showLoader();
        const service = currentServices.find(s => s.id == serviceId);
        const sType   = currentServiceTypes.find(t => t.id == typeId);
        const total   = (service?.base_price || 0) + (sType?.additional_price || 0);

        const { error } = await supabaseClient
            .from('appointments')
            .insert([{
                user_id:         currentUser.id,
                car_id:          carId,
                service_id:      serviceId,
                service_type_id: typeId || null,
                scheduled_at:    new Date(dateVal).toISOString(),
                notes:           note || null,
                status:          'pending',
                total_price:     total,
                client_phone:    phone
            }]);

        if (error) throw error;
        showNotification('Запись создана!', 'success');
        await loadAppointments();

        // Сброс формы
        ['booking-car', 'booking-service', 'booking-date', 'booking-note', 'booking-phone'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const typeEl = document.getElementById('booking-service-type');
        if (typeEl) typeEl.innerHTML = '<option value="">Выберите вариант</option>';
        const priceEl = document.getElementById('service-price-display');
        if (priceEl) priceEl.style.display = 'none';

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

    if (!brand || !model) {
        showNotification('Укажите марку и модель', 'warning');
        return;
    }

    try {
        showLoader();
        const { error } = await supabaseClient
            .from('cars')
            .insert([{
                user_id:          currentUser.id,
                brand, model,
                production_year:  year    || null,
                license_plate:    plate   || null,
                mileage:          mileage || null,
                vin:              vin     || null
            }]);
        if (error) throw error;
        showNotification('Автомобиль добавлен', 'success');
        closeModal();
        await loadCars();
    } catch (err) {
        showNotification('Ошибка: ' + err.message, 'error');
    } finally {
        hideLoader();
    }
}

async function deleteCar(carId) {
    if (!confirm('Удалить автомобиль?')) return;
    try {
        showLoader();
        const { error } = await supabaseClient
            .from('cars').delete().eq('id', carId).eq('user_id', currentUser.id);
        if (error) throw error;
        showNotification('Автомобиль удалён', 'success');
        await loadCars();
    } catch (err) {
        showNotification('Ошибка: ' + err.message, 'error');
    } finally {
        hideLoader();
    }
}

function editCar(carId) {
    const car = currentCars.find(c => c.id === carId);
    if (!car) return;
    setVal('car-brand',   car.brand            || '');
    setVal('car-model',   car.model            || '');
    setVal('car-year',    car.production_year  || '');
    setVal('car-plate',   car.license_plate    || '');
    setVal('car-mileage', car.mileage          || '');
    setVal('car-vin',     car.vin              || '');
    openModal();
    const btn = document.getElementById('save-car-btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-save"></i> Обновить';
        btn.onclick   = () => updateCar(carId);
    }
}

async function updateCar(carId) {
    const brand   = document.getElementById('car-brand')?.value.trim();
    const model   = document.getElementById('car-model')?.value.trim();
    if (!brand || !model) { showNotification('Укажите марку и модель', 'warning'); return; }

    try {
        showLoader();
        const { error } = await supabaseClient
            .from('cars')
            .update({
                brand, model,
                production_year: document.getElementById('car-year')?.value    || null,
                license_plate:   document.getElementById('car-plate')?.value   || null,
                mileage:         document.getElementById('car-mileage')?.value || null,
                vin:             document.getElementById('car-vin')?.value     || null,
                updated_at:      new Date().toISOString()
            })
            .eq('id', carId).eq('user_id', currentUser.id);
        if (error) throw error;
        showNotification('Автомобиль обновлён', 'success');
        closeModal();
        await loadCars();
    } catch (err) {
        showNotification('Ошибка: ' + err.message, 'error');
    } finally {
        hideLoader();
    }
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
        const profileData = {
            id:         currentUser.id,
            name,
            updated_at: new Date().toISOString()
        };
        if (phone)    profileData.phone    = phone;
        if (birthday) profileData.birthday = birthday;

        const { error } = await supabaseClient
            .from('profiles')
            .upsert(profileData);

        if (error) {
            if (error.code === '23505') throw new Error('Этот телефон уже используется');
            throw error;
        }

        await loadUserProfile();
        updateUI();
        showNotification('Профиль сохранён', 'success');
    } catch (err) {
        showNotification(err.message || 'Ошибка сохранения', 'error');
    } finally {
        hideLoader();
    }
}

async function markNotificationRead(id) {
    try {
        await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);
        await loadNotifications();
    } catch (err) {
        console.error('Ошибка:', err);
    }
}

// ── ЗАГРУЗКА ФОТО ─────────────────────────────────────────────

async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showNotification('Файл слишком большой (макс 2 МБ)', 'error');
        return;
    }

    try {
        showLoader();
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) throw new Error('Сессия истекла');

        const ext    = file.name.split('.').pop();
        const path   = `avatars/avatar_${session.user.id}_${Date.now()}.${ext}`;
        const { error: upErr } = await supabaseClient.storage
            .from('avatars')
            .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type });
        if (upErr) throw upErr;

        const { data: { publicUrl } } = supabaseClient.storage.from('avatars').getPublicUrl(path);

        const { error: updErr } = await supabaseClient
            .from('profiles')
            .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
            .eq('id', session.user.id);
        if (updErr) throw updErr;

        setAvatarImg('profile-avatar', publicUrl);
        setAvatarImg('user-avatar',    publicUrl);
        showNotification('Фото обновлено', 'success');
    } catch (err) {
        console.error('Ошибка:', err);
        showNotification(err.message || 'Ошибка загрузки фото', 'error');
    } finally {
        hideLoader();
    }
}

// ── UI УТИЛИТЫ ────────────────────────────────────────────────

function showSection(sectionId, element) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId)?.classList.add('active');

    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
    if (element) element.classList.add('active');

    const titles = {
        dashboard: 'Главная', booking: 'Запись на сервис', cars: 'Мой гараж',
        history: 'История', finance: 'Финансы', media: 'Медиа отчеты', settings: 'Профиль'
    };
    setEl('page-title', titles[sectionId] || 'Личный кабинет');

    if (sectionId === 'media') loadGallery();

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar')?.classList.remove('open');
        document.getElementById('overlay')?.classList.remove('active');
    }
}

function toggleSidebar() {
    document.getElementById('sidebar')?.classList.toggle('open');
    document.getElementById('overlay')?.classList.toggle('active');
}

function toggleNotifications() {
    document.getElementById('notifications-panel')?.classList.toggle('active');
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

function filterHistory(status) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event?.currentTarget?.classList.add('active');

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

function filterMedia(type) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event?.currentTarget?.classList.add('active');
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

// ── ШАГИ ЗАПИСИ ───────────────────────────────────────────────

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
        @keyframes stepPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}
    `;
    document.head.appendChild(s);

    document.querySelectorAll('.form-step').forEach((step, i, steps) => {
        step.addEventListener('click', () => {
            steps.forEach((s, j) => {
                s.classList.remove('active', 'completed');
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
            steps[i].classList.toggle('completed', !!el.value);
        });
    });
}

// ── УВЕДОМЛЕНИЯ ───────────────────────────────────────────────

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

// ── LOADER ────────────────────────────────────────────────────

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

function hideLoader() {
    document.getElementById('app-loader')?.remove();
}

// ── ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ───────────────────────────────────

function getStatusText(s) {
    return { pending:'Ожидает', confirmed:'Подтверждён', in_progress:'В работе', completed:'Завершён', cancelled:'Отменён' }[s] || s;
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
        <i class="fas ${icon}"></i>
        <p>${text}</p>
        ${sub ? `<small>${sub}</small>` : ''}
    </div>`;
}

function setEl(id, text)  { const el = document.getElementById(id); if (el) el.textContent = text; }
function setVal(id, val)  { const el = document.getElementById(id); if (el) el.value = val; }

function setAvatarImg(id, url) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    const img = new Image();
    img.src   = url + '?t=' + Date.now();
    img.alt   = 'Avatar';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
    img.onerror = () => { el.innerHTML = '<i class="fas fa-user"></i>'; };
    el.appendChild(img);
}

// ── ЗАКРЫТИЕ ПО КЛИКУ ВНЕ ────────────────────────────────────

window.addEventListener('click', e => {
    const modal = document.getElementById('car-modal');
    if (e.target === modal) closeModal();

    const fab  = document.querySelector('.support-fab');
    const menu = document.getElementById('support-menu');
    if (fab && menu && !fab.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('show');
    }
});

document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeModal();
    document.getElementById('notifications-panel')?.classList.remove('active');
    document.getElementById('support-menu')?.classList.remove('show');
});

console.log('✅ cabinet.js загружен');