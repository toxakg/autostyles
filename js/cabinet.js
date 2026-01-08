// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let supabaseClient = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    supabaseClient = window.sb;
    
    // *** ИСПОЛЬЗУЕМ СЛУШАТЕЛЬ ДЛЯ НАДЕЖНОЙ ПРОВЕРКИ СЕССИИ ***
    // Этот метод гарантирует, что мы ждем, пока Supabase восстановит сессию из localStorage
    supabaseClient.auth.onAuthStateChange((event, session) => {
        
        // 1. Если сессия существует (пользователь вошел или сессия восстановлена)
        if (session && session.user) {
            currentUser = session.user;
            
            // 2. Инициализация данных (выполняется ТОЛЬКО один раз после авторизации)
            updateUI();
            loadServices();
            loadCars();
            loadAppointments();
            loadGallery();
            loadBonuses();
            loadChat();
            
            console.log('Пользователь авторизован, данные загружены.');

        } else {
            // 3. Если сессии нет (пользователь вышел или не вошел)
            console.log('Пользователь не авторизован. Перенаправление на вход.');
            // Перенаправляем только если мы уже на странице кабинета
            if (window.location.pathname.endsWith('cabinet.html')) {
                window.location.href = 'auth.html';
            }
        }
    });
});

// --- UI HELPERS ---
function showSection(id, element) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');

    if (element) element.classList.add('active');

    // Обновляем заголовок
    const titles = {
        'dashboard': 'Главная',
        'booking': 'Запись на сервис',
        'cars': 'Мой гараж',
        'history': 'История',
        'finance': 'Финансы',
        'media': 'Медиа отчеты',
        'settings': 'Профиль'
    };
    document.getElementById('page-title').innerText = titles[id] || 'Личный кабинет';

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('overlay').classList.remove('active');
    }
}

function updateUI() {
    document.getElementById('mini-email').innerText = currentUser.email;
    loadProfileData();
}

// --- 1. ЗАПИСЬ (Booking) ---
async function loadServices() {
    // Загружаем услуги из таблицы services
    const { data, error } = await supabaseClient.from('services').select('id, name, base_price');
    if (data) {
        const select = document.getElementById('booking-service');
        select.innerHTML = '<option value="" disabled selected>Выберите услугу</option>';
        data.forEach(srv => {
            const opt = document.createElement('option');
            opt.value = srv.id;
            opt.innerText = `${srv.name} (от ${srv.base_price} сом)`; // ИСПОЛЬЗУЕМ "сом"
            select.appendChild(opt);
        });
    }
}

async function createAppointment() {
    const carId = document.getElementById('booking-car').value;
    const serviceId = document.getElementById('booking-service').value;
    const date = document.getElementById('booking-date').value;
    const note = document.getElementById('booking-note').value;

    if (!carId || !serviceId || !date) {
        alert("Заполните авто, услугу и дату!");
        return;
    }

    try {
        const { error } = await supabaseClient.from('appointments').insert([{
            user_id: currentUser.id,
            car_id: carId,
            service_id: serviceId,
            scheduled_at: date,
            notes: note,
            status: 'pending',
            total_price: 0
        }]);

        if (error) throw error;
        alert("Заявка успешно отправлена! Менеджер свяжется для подтверждения.");
        showSection('dashboard');
        loadAppointments();
    } catch (err) {
        alert("Ошибка записи: " + err.message);
    }
}

// --- 2. АВТОМОБИЛИ & SELECT ---
async function loadCars() {
    const { data } = await supabaseClient.from('cars').select('*').eq('user_id', currentUser.id);

    const container = document.getElementById('cars-container');
    const select = document.getElementById('booking-car');

    container.innerHTML = '';
    select.innerHTML = '<option value="" disabled selected>Выберите авто</option>';

    if (data) {
        data.forEach(car => {
            // 1. Добавляем в список (Гараж) - ИСПРАВЛЕННЫЙ КОД БЕЗ ДУБЛИРОВАНИЯ
            container.innerHTML += `
                <div class="card car-item">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <h3>${car.brand} ${car.model}</h3>
                            <p style="color:#666; margin-top: 5px;">${car.license_plate || 'Без номера'}</p>
                        </div>
                        <button class="btn-delete" onclick="deleteCar('${car.id}')" title="Удалить авто">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                    <small>VIN: ${car.vin || 'Не указан'} | Пробег: ${car.mileage || 0} км</small>
                </div>
            `;
            // 2. Добавляем в Select (Запись)
            const opt = document.createElement('option');
            opt.value = car.id;
            opt.innerText = `${car.brand} ${car.model} (${car.license_plate})`;
            select.appendChild(opt);
        });
    }
}


async function deleteCar(carId) {
    if (!confirm("Вы уверены, что хотите удалить этот автомобиль из своего гаража?")) {
        return;
    }

    try {
        // Запрос к Supabase на удаление
        const { error } = await supabaseClient
            .from('cars')
            .delete()
            .eq('id', carId)
            .eq('user_id', currentUser.id);

        if (error) throw error;

        alert("Автомобиль успешно удален.");
        loadCars(); // Перезагружаем список автомобилей после удаления

    } catch (err) {
        alert("Ошибка при удалении автомобиля: " + err.message);
    }
}


async function saveCar() {
    const brand = document.getElementById('car-brand').value;
    const model = document.getElementById('car-model').value;
    const year = document.getElementById('car-year').value;
    const plate = document.getElementById('car-plate').value;
    const mileage = document.getElementById('car-mileage').value;

    if (!brand || !model) {
        alert("Заполните Марку и Модель!");
        return;
    }

    try {
        const { error } = await supabaseClient.from('cars').insert([{
            user_id: currentUser.id,
            brand: brand,
            model: model,
            production_year: year,
            license_plate: plate,
            mileage: mileage
        }]);

        if (error) throw error;
        alert("Автомобиль добавлен!");
        closeModal();
        loadCars(); // Обновить список
    } catch (err) {
        alert("Ошибка при добавлении авто: " + err.message);
    }
}

// --- 3. ИСТОРИЯ, СТАТУС И ФИНАНСЫ ---
async function loadAppointments() {
    // Получаем записи + название услуги (join)
    const { data, error } = await supabaseClient
        .from('appointments')
        .select(`
            *,
            services (name),
            cars (brand, model)
        `)
        .eq('user_id', currentUser.id)
        .order('scheduled_at', { ascending: false });

    if (!data) return;

    const historyContainer = document.getElementById('history-container');
    const ordersList = document.getElementById('orders-list');
    let totalSpent = 0;
    let activeJob = null;

    historyContainer.innerHTML = '';
    ordersList.innerHTML = '';

    data.forEach(app => {
        const date = new Date(app.scheduled_at).toLocaleDateString();
        const price = app.total_price || 0;
        const serviceName = app.services ? app.services.name : 'Услуга';
        const carName = app.cars ? `${app.cars.brand} ${app.cars.model}` : 'Авто';

        // 1. Ищем активный заказ для Дашборда
        if (app.status === 'in_progress' || app.status === 'pending') {
            activeJob = app;
        }

        // 2. Заполняем историю
        historyContainer.innerHTML += `
            <div class="card" style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between;">
                    <strong>${serviceName}</strong>
                    <span class="status-badge status-${app.status}">${translateStatus(app.status)}</span>
                </div>
                <small>${date} | ${carName}</small>
            </div>
        `;

        // 3. Заполняем финансы (если завершено)
        if (app.status === 'completed') {
            totalSpent += parseFloat(price);
            ordersList.innerHTML += `
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:5px;">
                    <span>${date} - ${serviceName}</span>
                    <strong>${price} сом</strong>
                </div>
            `;
        }
    });

    // Обновляем виджет статуса на главной
    const statusCard = document.getElementById('current-order-card');
    if (activeJob) {
        statusCard.style.display = 'block';
        document.getElementById('status-car').innerText = activeJob.cars?.model || 'Авто';
        document.getElementById('status-text').innerText = translateStatus(activeJob.status);
    } else {
        statusCard.style.display = 'none';
    }

    // Обновляем "Всего потрачено"
    document.getElementById('total-spent').innerText = totalSpent + ' сом';
}

function translateStatus(status) {
    const map = {
        'pending': 'Ожидает',
        'in_progress': 'В работе',
        'completed': 'Готово',
        'cancelled': 'Отменено'
    };
    return map[status] || status;
}

// --- 4. МЕДИА (Галерея) ---
async function loadGallery() {
    const { data } = await supabaseClient
        .from('car_photos')
        .select('*')
        .eq('user_id', currentUser.id);

    const gallery = document.getElementById('gallery-container');
    gallery.innerHTML = '';

    if (data && data.length > 0) {
        data.forEach(photo => {
            gallery.innerHTML += `
                <div class="gallery-item">
                    <img src="${photo.photo_url}" alt="Report" onclick="window.open(this.src)">
                    <div class="gallery-tag">${photo.type === 'before' ? 'ДО' : 'ПОСЛЕ'}</div>
                </div>
            `;
        });
    } else {
        gallery.innerHTML = '<p>Пока нет фото отчетов.</p>';
    }
}

// --- 5. ЧАТ (Messages) ---
async function loadChat() {
    const chatBody = document.getElementById('chat-messages');

    // Подписка на новые сообщения (Realtime) - опционально, здесь просто загрузка
    const { data } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true });

    if (data) {
        // Очищаем дефолтное сообщение, если есть история
        if (data.length > 0) chatBody.innerHTML = '';

        data.forEach(msg => {
            // Для упрощения, считаем все сообщения пользователя 'user'
            // Если нужно различать, нужно поле 'is_admin' или 'sender_id'
            const div = document.createElement('div');
            div.className = 'msg user'; // Класс 'user' или 'manager'
            div.innerText = msg.message;
            chatBody.appendChild(div);
        });
        chatBody.scrollTop = chatBody.scrollHeight;
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input-text');
    const text = input.value.trim();
    if (!text) return;

    // Оптимистичный UI
    const chatBody = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'msg user';
    div.innerText = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
    input.value = '';

    // Отправка в БД
    await supabaseClient.from('messages').insert([{
        user_id: currentUser.id,
        message: text
    }]);
}

function toggleChat() {
    const body = document.getElementById('chat-body');
    const icon = document.getElementById('chat-icon');
    if (body.style.display === 'flex') {
        body.style.display = 'none';
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        body.style.display = 'flex';
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}

// --- ПРОФИЛЬ и БОНУСЫ ---
async function loadProfileData() {
    const { data } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
    if (data) {
        document.getElementById('profile-name').value = data.name || '';
        document.getElementById('profile-phone').value = data.phone || '';
        // Если есть logic user_levels
        if (data.level_id) document.getElementById('level-name').innerText = "Gold"; // Заглушка, нужен join
    }
}

async function loadBonuses() {
    const { data } = await supabaseClient.from('bonuses').select('amount').eq('user_id', currentUser.id);
    const total = data ? data.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) : 0;
    document.getElementById('bonus-balance').innerText = total;
}

// Остальные функции (toggleSidebar, logout, openModal, closeModal)
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('active');
}
function logout() {
    supabaseClient.auth.signOut().then(() => window.location.href = 'auth.html');
}
function openModal() { document.getElementById('car-modal').style.display = 'flex'; }
function closeModal() { document.getElementById('car-modal').style.display = 'none'; }


// Функция для открытия/закрытия меню соцсетей (Слева)
function toggleSupport() {
    const supportMenu = document.getElementById('support-menu');
    supportMenu.classList.toggle('show');
}

// Добавим закрытие меню, если кликнуть в любом другом месте
document.addEventListener('click', (e) => {
    const fab = document.querySelector('.support-fab');
    const menu = document.getElementById('support-menu');

    // Если клик НЕ по кнопке и НЕ по меню -> закрываем
    if (!fab.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('show');
    }
});
















async function sendMessage() {
    const input = document.getElementById('chat-input-text');
    const messages = document.getElementById('chat-messages');
    const text = input.value.trim();
    if (!text) return;

    // сообщение пользователя
    messages.innerHTML += `<div class="msg user">${text}</div>`;
    input.value = '';

    // запрос к серверу
    const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
    });

    const data = await response.json();

    // ответ ИИ
    messages.innerHTML += `<div class="msg manager">${data.reply}</div>`;
    messages.scrollTop = messages.scrollHeight;
}