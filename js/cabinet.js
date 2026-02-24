// ============= ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =============
let supabaseClient = null; // Оставляем для совместимости
let currentUser = null;
let currentCars = [];
let currentServices = [];
let currentServiceTypes = [];
let currentAppointments = [];
let currentBonuses = 0;
let currentLevel = 'Silver';
let currentDiscount = 5;
let appInitialized = false;








// ============= ИНИЦИАЛИЗАЦИЯ =============
async function initApp() {
    if (appInitialized) return;

    console.log('Инициализация приложения...');

    // Пробуем получить клиент из разных источников
    if (!supabaseClient) {
        // Проверяем window.sb (из вашего файла)
        if (window.sb) {
            console.log('Найден window.sb, используем его');
            supabaseClient = window.sb;
        }
        // Проверяем глобальную переменную sb
        else if (typeof sb !== 'undefined' && sb) {
            console.log('Найден глобальный sb, используем его');
            supabaseClient = sb;
        }
    }

    if (!supabaseClient) {
        console.error('Supabase client не найден ни в одном источнике');
        showErrorMessage('Ошибка подключения к базе данных. Обновите страницу.');
        return;
    }

    console.log('Supabase client доступен:', supabaseClient);

    try {
        // ВАЖНО: Сначала загружаем услуги, потом их типы
        await loadServices();        // Загружаем основные услуги
        await loadServiceTypes();    // Загружаем типы услуг (зависит от services)
        await loadCars();            // Загружаем автомобили пользователя
        await loadAppointments();    // Загружаем записи

        // После загрузки всех данных прикрепляем обработчики событий
        attachBookingEvents();

        appInitialized = true;
        console.log('✅ Приложение инициализировано успешно');
    } catch (error) {
        console.error('❌ Ошибка при инициализации приложения:', error);
        showErrorMessage('Ошибка при загрузке данных');
    }
}

// ============= ПРОВЕРКА SUPABASE И ПОВТОРНАЯ ИНИЦИАЛИЗАЦИЯ =============
function checkSupabaseAndInit() {
    console.log('Проверка наличия Supabase client...');

    // Проверяем все возможные источники
    if (window.sb) {
        console.log('Найден window.sb');
        supabaseClient = window.sb;
        initApp();
    } else if (typeof sb !== 'undefined' && sb) {
        console.log('Найден глобальный sb');
        supabaseClient = sb;
        initApp();
    } else {
        console.error('Supabase client все еще не инициализирован');
        showErrorMessage('Ошибка подключения к базе данных. Обновите страницу.');
    }
}

// ============= ПОКАЗ ОШИБКИ ПОЛЬЗОВАТЕЛЮ =============
function showErrorMessage(message) {
    // Создаем элемент для отображения ошибки, если его нет
    let errorDiv = document.getElementById('error-message');

    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #ff4444;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 9999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 80%;
            text-align: center;
        `;
        document.body.appendChild(errorDiv);
    }

    errorDiv.textContent = message;

    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

// ============= ЗАГРУЗКА УСЛУГ =============
async function loadServices() {
    try {
        console.log('Загрузка услуг...');
        const { data, error } = await supabaseClient
            .from('services')
            .select('*');

        if (error) {
            console.error('Ошибка загрузки услуг:', error);
            showErrorMessage('Ошибка загрузки услуг');
            return;
        }

        currentServices = data || [];
        console.log('📦 Загружено услуг:', currentServices.length);

        // Заполняем select услуг, если он есть
        fillServicesSelect();
    } catch (error) {
        console.error('Исключение при загрузке услуг:', error);
        showErrorMessage('Ошибка при загрузке услуг');
    }
}

// ============= ЗАПОЛНЕНИЕ SELECT УСЛУГ =============
function fillServicesSelect() {
    const serviceSelect = document.getElementById('booking-service');
    if (!serviceSelect) {
        console.warn('Элемент booking-service не найден');
        return;
    }

    // Очищаем и добавляем опции
    serviceSelect.innerHTML = '<option value="">Выберите услугу</option>';

    currentServices.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.textContent = `${service.name} (${service.base_price} сом)`;
        serviceSelect.appendChild(option);
    });

    console.log('Select услуг заполнен');
}

// ============= ЗАГРУЗКА ТИПОВ УСЛУГ =============
async function loadServiceTypes() {
    try {
        console.log('Загрузка типов услуг...');
        const { data, error } = await supabaseClient
            .from('service_types')
            .select('*');

        if (error) {
            console.error('Ошибка загрузки типов услуг:', error);
            return;
        }

        currentServiceTypes = data || [];
        console.log('📦 Загружено типов услуг:', currentServiceTypes.length);
    } catch (error) {
        console.error('Исключение при загрузке типов услуг:', error);
    }
}

// ============= ЗАГРУЗКА АВТОМОБИЛЕЙ =============
async function loadCars() {
    if (!currentUser) {
        console.log('Пользователь не авторизован, пропускаем загрузку автомобилей');
        return;
    }

    try {
        console.log('Загрузка автомобилей...');
        const { data, error } = await supabaseClient
            .from('cars')
            .select('*')
            .eq('user_id', currentUser.id);

        if (error) {
            console.error('Ошибка загрузки автомобилей:', error);
            return;
        }

        currentCars = data || [];
        console.log('📦 Загружено автомобилей:', currentCars.length);

        // Заполняем select автомобилей, если он есть
        fillCarsSelect();
    } catch (error) {
        console.error('Исключение при загрузке автомобилей:', error);
    }
}

// ============= ЗАПОЛНЕНИЕ SELECT АВТОМОБИЛЕЙ =============
function fillCarsSelect() {
    const carSelect = document.getElementById('booking-car');
    if (!carSelect) return;

    carSelect.innerHTML = '<option value="">Выберите автомобиль</option>';

    currentCars.forEach(car => {
        const option = document.createElement('option');
        option.value = car.id;
        option.textContent = `${car.brand} ${car.model} (${car.license_plate})`;
        carSelect.appendChild(option);
    });
}

// ============= ЗАГРУЗКА ЗАПИСЕЙ =============
async function loadAppointments() {
    if (!currentUser) {
        console.log('Пользователь не авторизован, пропускаем загрузку записей');
        return;
    }

    try {
        console.log('Загрузка записей...');
        const { data, error } = await supabaseClient
            .from('appointments')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('date', { ascending: false });

        if (error) {
            console.error('Ошибка загрузки записей:', error);
            return;
        }

        currentAppointments = data || [];
        console.log('📦 Загружено записей:', currentAppointments.length);
    } catch (error) {
        console.error('Исключение при загрузке записей:', error);
    }
}

// ============= ПРИКРЕПЛЕНИЕ ОБРАБОТЧИКОВ СОБЫТИЙ =============
function attachBookingEvents() {
    const serviceSelect = document.getElementById('booking-service');
    const typeSelect = document.getElementById('booking-service-type');

    if (serviceSelect) {
        // Удаляем старый обработчик, если был, и добавляем новый
        serviceSelect.removeEventListener('change', handleServiceChange);
        serviceSelect.addEventListener('change', handleServiceChange);
        console.log('✅ Обработчик выбора услуги прикреплен');
    } else {
        console.warn('⚠️ Элемент booking-service не найден');
    }

    if (typeSelect) {
        typeSelect.removeEventListener('change', updatePrice);
        typeSelect.addEventListener('change', updatePrice);
        console.log('✅ Обработчик выбора типа услуги прикреплен');
    }

    // Прикрепляем обработчик для кнопки бронирования
    const bookBtn = document.getElementById('book-appointment-btn');
    if (bookBtn) {
        bookBtn.removeEventListener('click', bookAppointment);
        bookBtn.addEventListener('click', bookAppointment);
        console.log('✅ Обработчик кнопки бронирования прикреплен');
    }
}

// ============= ОБРАБОТЧИК ИЗМЕНЕНИЯ УСЛУГИ =============
function handleServiceChange() {
    const serviceId = document.getElementById('booking-service').value;
    const typeSelect = document.getElementById('booking-service-type');

    if (!typeSelect) return;

    console.log('Выбрана услуга ID:', serviceId);

    // Очищаем select типов услуг
    typeSelect.innerHTML = '<option value="">Выберите вариант</option>';

    // Если услуга не выбрана, скрываем select типов
    if (!serviceId) {
        typeSelect.style.display = 'none';
        hidePriceDisplay();
        return;
    }

    // Фильтруем типы услуг по ID выбранной услуги
    const filteredTypes = currentServiceTypes.filter(t => t.service_id == serviceId);
    console.log('Найдено типов для услуги:', filteredTypes.length);

    // Если нет типов для этой услуги, скрываем select типов
    if (filteredTypes.length === 0) {
        typeSelect.style.display = 'none';
        updatePrice(); // Обновляем цену только с основной услугой
        return;
    }

    // Показываем select типов и заполняем его
    typeSelect.style.display = 'block';

    filteredTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = `${type.name} (+${type.additional_price} сом)`;
        typeSelect.appendChild(option);
    });

    // Обновляем отображение цены
    updatePrice();
}

// ============= РАСЧЁТ И ОТОБРАЖЕНИЕ ЦЕНЫ =============
function updatePrice() {
    const serviceId = document.getElementById('booking-service').value;
    const typeSelect = document.getElementById('booking-service-type');
    const typeId = typeSelect?.value;

    // Находим выбранную услугу и тип услуги в массивах данных
    const service = currentServices.find(s => s.id == serviceId);
    const type = currentServiceTypes.find(t => t.id == typeId);

    // Рассчитываем общую стоимость
    const total = (service?.base_price || 0) + (type?.additional_price || 0);

    console.log('Расчет цены:', { serviceId, typeId, total });

    // Получаем элементы для отображения цены
    const priceEl = document.getElementById('service-price');
    const displayEl = document.getElementById('service-price-display');

    if (priceEl && displayEl) {
        priceEl.textContent = total;
        // Показываем блок с ценой только если выбрана услуга
        displayEl.style.display = serviceId ? 'block' : 'none';
    }
}

// ============= СКРЫТИЕ БЛОКА С ЦЕНОЙ =============
function hidePriceDisplay() {
    const displayEl = document.getElementById('service-price-display');
    if (displayEl) {
        displayEl.style.display = 'none';
    }
}

// ============= ФУНКЦИЯ БРОНИРОВАНИЯ =============
async function bookAppointment() {
    if (!currentUser) {
        showErrorMessage('Необходимо авторизоваться');
        return;
    }

    // Получаем данные из формы
    const carId = document.getElementById('booking-car')?.value;
    const serviceId = document.getElementById('booking-service')?.value;
    const typeId = document.getElementById('booking-service-type')?.value;
    const date = document.getElementById('booking-date')?.value;
    const time = document.getElementById('booking-time')?.value;
    const comment = document.getElementById('booking-comment')?.value;

    // Валидация
    if (!carId || !serviceId || !date || !time) {
        showErrorMessage('Заполните все обязательные поля');
        return;
    }

    // Создаем объект записи
    const appointment = {
        user_id: currentUser.id,
        car_id: carId,
        service_id: serviceId,
        service_type_id: typeId || null,
        date: date,
        time: time,
        comment: comment || '',
        status: 'pending',
        created_at: new Date().toISOString()
    };

    try {
        console.log('Создание записи:', appointment);

        const { data, error } = await supabaseClient
            .from('appointments')
            .insert([appointment])
            .select();

        if (error) {
            console.error('Ошибка при создании записи:', error);
            showErrorMessage('Ошибка при создании записи');
            return;
        }

        console.log('Запись успешно создана:', data);
        showSuccessMessage('Запись успешно создана!');

        // Очищаем форму
        document.getElementById('booking-form')?.reset();

        // Обновляем список записей
        await loadAppointments();

    } catch (error) {
        console.error('Исключение при создании записи:', error);
        showErrorMessage('Ошибка при создании записи');
    }
}

// ============= ПОКАЗ УСПЕШНОГО СООБЩЕНИЯ =============
function showSuccessMessage(message) {
    let successDiv = document.getElementById('success-message');

    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.id = 'success-message';
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            z-index: 9999;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 80%;
            text-align: center;
        `;
        document.body.appendChild(successDiv);
    }

    successDiv.textContent = message;

    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.remove();
        }
    }, 3000);
}
async function sendMessage() {
    const input = document.getElementById('chat-input-text');
    const text = input.value.trim();
    if (!text || !sb) return;

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const { error } = await sb.from('messages').insert({
        user_id: user.id,
        receiver_id: null, // можно указать ID админа если нужно
        message: text,
        direction: 'client_to_staff'
    });

    if (error) {
        console.error(error);
        return;
    }

    // Добавляем сообщение в интерфейс
    const area = document.getElementById('chat-messages');
    area.innerHTML += `
        <div class="msg client">
            <div class="msg-content">
                <p>${escHtml(text)}</p>
                <small class="msg-time">Сейчас</small>
            </div>
        </div>
    `;

    input.value = '';
    area.scrollTop = area.scrollHeight;

    showSuccessMessage('Сообщение отправлено');
}
// ============= ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ =============
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, проверяем Supabase client...');

    // Сразу проверяем доступные источники
    if (window.sb) {
        console.log('✅ window.sb доступен сразу');
        supabaseClient = window.sb;
        initApp();
    } else if (typeof sb !== 'undefined' && sb) {
        console.log('✅ Глобальный sb доступен сразу');
        supabaseClient = sb;
        initApp();
    } else {
        console.warn('Supabase client не найден при загрузке DOM');

        // Проверяем каждые 100мс в течение 5 секунд
        let attempts = 0;
        const maxAttempts = 50; // 5 секунд

        const checkInterval = setInterval(() => {
            attempts++;

            if (window.sb) {
                console.log(`✅ window.sb найден после ${attempts} попыток`);
                supabaseClient = window.sb;
                clearInterval(checkInterval);
                initApp();
            } else if (typeof sb !== 'undefined' && sb) {
                console.log(`✅ Глобальный sb найден после ${attempts} попыток`);
                supabaseClient = sb;
                clearInterval(checkInterval);
                initApp();
            } else if (attempts >= maxAttempts) {
                console.error('Supabase client не найден после', maxAttempts, 'попыток');
                clearInterval(checkInterval);
                showErrorMessage('Ошибка подключения к базе данных. Обновите страницу.');
            } else {
                console.log(`Ожидание Supabase client... попытка ${attempts}/${maxAttempts}`);
            }
        }, 100);
    }
});

// Экспортируем функцию для внешнего использования
window.initApp = initApp;

// ============= ИНИЦИАЛИЗАЦИЯ =============
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Cabinet.js: DOM загружен');

    supabaseClient = window.sb;

    if (!supabaseClient) {
        console.error('Supabase client не найден!');
        showNotification('Ошибка подключения к базе данных', 'error');
        return;
    }

    console.log('Supabase client найден, проверяем сессию...');

    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) console.error('Ошибка получения сессии:', error);

        if (session?.user) {
            currentUser = session.user;
            await initializeApp();
        } else {
            console.log('Сессия не найдена, перенаправляем на страницу входа');
            window.location.href = 'auth.html';
            return;
        }
    } catch (err) {
        console.error('Ошибка проверки сессии:', err);
    }

    // Слушаем изменения авторизации
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);

        if (event === 'SIGNED_OUT') {
            window.location.href = 'login.html';
        } else if (event === 'SIGNED_IN' && session) {
            currentUser = session.user;

            // Обновляем только профиль, уведомления и чат, а не всю инициализацию
            try {
                await Promise.all([
                    loadUserProfile(),
                    loadNotifications(),
                    loadChat()
                ]);
                updateUI();
            } catch (error) {
                console.error('Ошибка обновления после входа:', error);
            }
        }
    });

    // Минимальная дата для записи
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dateInput.min = now.toISOString().slice(0, 16);
    }

    // Загрузка фото профиля
    document.getElementById('change-photo-btn')?.addEventListener('click', () => {
        document.getElementById('profile-photo-input').click();
    });

    document.getElementById('profile-photo-input')?.addEventListener('change', handlePhotoUpload);
});

// ============= ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ =============
async function initializeApp() {
    if (appInitialized) return; // предотвращаем повторную инициализацию
    appInitialized = true;

    console.log('Инициализация приложения...');
    showLoader();

    try {
        // Загружаем все данные параллельно
        await Promise.all([
            loadUserProfile(),
            loadServices(),
            loadCars(),
            loadAppointments(),
            loadBonuses(),
            loadGallery(),
            loadNotifications(),
            loadChat()
        ]);

        updateUI();
        console.log('Приложение инициализировано успешно');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showNotification('Ошибка загрузки данных', 'error');
    } finally {
        hideLoader();
    }
}


// ============= ЗАГРУЗКА ДАННЫХ =============

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
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
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
    } catch (error) {
        console.error('Ошибка загрузки услуг:', error);
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
    } catch (error) {
        console.error('Ошибка загрузки автомобилей:', error);
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
    } catch (error) {
        console.error('Ошибка загрузки записей:', error);
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
        currentBonuses = data?.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0) || 0;
        updateBonuses();
    } catch (error) {
        console.error('Ошибка загрузки бонусов:', error);
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
    } catch (error) {
        console.error('Ошибка загрузки галереи:', error);
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
    } catch (error) {
        console.error('Ошибка загрузки уведомлений:', error);
    }
}

async function loadChat() {
    if (!currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('messages')
            .select('*')
            .or(`user_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) throw error;
        displayChatMessages(data || []);
    } catch (error) {
        console.error('Ошибка загрузки чата:', error);
    }
}

// ============= ОБНОВЛЕНИЕ UI =============

function updateUI() {
    if (!currentUser) return;

    const userName = currentUser.user_metadata?.name ||
        currentUser.profile?.name ||
        currentUser.email?.split('@')[0] ||
        'Клиент';

    const welcomeEl = document.getElementById('welcome-name');
    const miniNameEl = document.getElementById('mini-name');
    const emailEl = document.getElementById('profile-email');

    if (welcomeEl) welcomeEl.textContent = userName;
    if (miniNameEl) miniNameEl.textContent = userName;
    if (emailEl) emailEl.value = currentUser.email || '';

    if (currentUser.profile) {
        const nameEl = document.getElementById('profile-name');
        const phoneEl = document.getElementById('profile-phone');
        const birthdayEl = document.getElementById('profile-birthday');
        if (nameEl) nameEl.value = currentUser.profile.name || '';
        if (phoneEl) phoneEl.value = currentUser.profile.phone || '';
        if (birthdayEl) birthdayEl.value = currentUser.profile.birthday || '';

        // Аватар
        if (currentUser.profile.avatar_url) {
            const avatarHtml = `<img src="${currentUser.profile.avatar_url}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            const profileAvatar = document.getElementById('profile-avatar');
            const userAvatar = document.getElementById('user-avatar');
            if (profileAvatar) profileAvatar.innerHTML = avatarHtml;
            if (userAvatar) userAvatar.innerHTML = avatarHtml;
        }
    }

    const miniLevelEl = document.getElementById('mini-level');
    const levelNameEl = document.getElementById('level-name');
    const levelDiscountEl = document.getElementById('level-discount');
    if (miniLevelEl) miniLevelEl.textContent = `Уровень: ${currentLevel}`;
    if (levelNameEl) levelNameEl.textContent = currentLevel;
    if (levelDiscountEl) levelDiscountEl.textContent = currentDiscount + '%';
}

function updateServicesSelect() {
    const select = document.getElementById('booking-service');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Выберите услугу</option>';

    if (currentServices.length === 0) {
        select.innerHTML += '<option value="" disabled>Услуги временно недоступны</option>';
        return;
    }

    currentServices.forEach(service => {
        const option = document.createElement('option');
        option.value = service.id;
        option.dataset.price = service.base_price;
        option.textContent = `${service.name} - ${formatNumber(service.base_price)} сом`;
        select.appendChild(option);
    });

    select.addEventListener('change', function () {
        const selected = this.options[this.selectedIndex];
        const price = selected.dataset.price;
        const priceDisplay = document.getElementById('service-price-display');
        const priceSpan = document.getElementById('service-price');
        if (price && priceDisplay && priceSpan) {
            priceSpan.textContent = formatNumber(price);
            priceDisplay.style.display = 'block';
        }
    });
}

function displayCars() {
    const container = document.getElementById('cars-container');
    if (!container) return;

    if (currentCars.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-car"></i>
                <p>Добавьте свой первый автомобиль</p>
            </div>`;
        return;
    }

    container.innerHTML = currentCars.map(car => `
        <div class="car-card">
            <div class="car-header">
                <i class="fas fa-car-side"></i>
                <h3>${escapeHtml(car.brand)} ${escapeHtml(car.model)}</h3>
            </div>
            <div class="car-details">
                <p><i class="fas fa-calendar"></i> ${car.production_year || 'Год не указан'}</p>
                <p><i class="fas fa-id-card"></i> ${car.license_plate || 'Номер не указан'}</p>
                <p><i class="fas fa-tachometer-alt"></i> ${formatNumber(car.mileage || 0)} км</p>
                ${car.vin ? `<p><i class="fas fa-barcode"></i> VIN: ${escapeHtml(car.vin)}</p>` : ''}
            </div>
            <div class="car-actions">
                <button class="btn-icon" onclick="editCar(${car.id})" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon danger" onclick="deleteCar(${car.id})" title="Удалить">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updateCarSelect() {
    const select = document.getElementById('booking-car');
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Выберите автомобиль</option>';

    if (currentCars.length === 0) {
        select.innerHTML += '<option value="" disabled>Сначала добавьте автомобиль</option>';
        return;
    }

    currentCars.forEach(car => {
        const option = document.createElement('option');
        option.value = car.id;
        option.textContent = `${car.brand} ${car.model} (${car.license_plate || 'без номера'})`;
        select.appendChild(option);
    });
}

function displayHistory() {
    const container = document.getElementById('history-container');
    if (!container) return;

    if (currentAppointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>История обслуживания пуста</p>
                <small>Создайте первую запись на сервис</small>
            </div>`;
        return;
    }

    renderHistoryItems(container, currentAppointments);
}

function renderHistoryItems(container, appointments) {
    container.innerHTML = appointments.map(app => {
        const date = new Date(app.scheduled_at);
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('ru-RU', {
            hour: '2-digit', minute: '2-digit'
        });

        return `
            <div class="history-item status-${app.status}">
                <div class="history-date">
                    <i class="fas fa-calendar-alt"></i>
                    ${formattedDate} ${formattedTime}
                </div>
                <div class="history-details">
                    <h4>${app.services?.name || 'Услуга'}</h4>
                    <p><i class="fas fa-car"></i> ${app.cars?.brand || ''} ${app.cars?.model || ''}</p>
                    ${app.notes ? `<p class="history-notes"><i class="fas fa-comment"></i> ${escapeHtml(app.notes)}</p>` : ''}
                </div>
                <div class="history-status">
                    <span class="status-badge status-${app.status}">${getStatusText(app.status)}</span>
                </div>
                <div class="history-price">
                    ${formatNumber(app.total_price || 0)} сом
                </div>
            </div>`;
    }).join('');
}

function updateFinanceStats() {
    const totalSpentEl = document.getElementById('total-spent');
    const totalSavedEl = document.getElementById('total-saved');
    const totalOrdersEl = document.getElementById('total-orders');
    const ordersList = document.getElementById('orders-list');

    const completedOrders = currentAppointments.filter(app => app.status === 'completed');
    const totalSpent = completedOrders.reduce((sum, app) => sum + (parseFloat(app.total_price) || 0), 0);

    if (totalSpentEl) totalSpentEl.textContent = formatNumber(totalSpent) + ' сом';
    if (totalOrdersEl) totalOrdersEl.textContent = completedOrders.length;
    if (totalSavedEl) totalSavedEl.textContent = formatNumber(totalSpent * 0.05) + ' сом';

    if (ordersList) {
        if (completedOrders.length === 0) {
            ordersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-invoice"></i>
                    <p>История транзакций пуста</p>
                </div>`;
        } else {
            ordersList.innerHTML = completedOrders.slice(0, 10).map(app => {
                const date = new Date(app.scheduled_at).toLocaleDateString('ru-RU');
                return `
                    <div class="transaction-item">
                        <div class="transaction-icon">
                            <i class="fas fa-receipt"></i>
                        </div>
                        <div class="transaction-info">
                            <h4>${app.services?.name || 'Услуга'}</h4>
                            <small>${date}</small>
                        </div>
                        <div class="transaction-amount">
                            -${formatNumber(app.total_price || 0)} сом
                        </div>
                    </div>`;
            }).join('');
        }
    }
}

function updateCurrentOrder() {
    const card = document.getElementById('current-order-card');
    if (!card) return;

    const activeOrder = currentAppointments.find(app =>
        app.status === 'in_progress' || app.status === 'confirmed'
    );

    if (activeOrder) {
        card.style.display = 'block';
        const carName = activeOrder.cars
            ? `${activeOrder.cars.brand} ${activeOrder.cars.model}`
            : 'автомобиль';

        const statusCarEl = document.getElementById('status-car');
        const statusTextEl = document.getElementById('status-text');
        const progressFill = document.getElementById('progress-fill');

        if (statusCarEl) statusCarEl.textContent = carName;
        if (statusTextEl) statusTextEl.textContent = getStatusText(activeOrder.status);
        if (progressFill) {
            progressFill.style.width = (activeOrder.status === 'confirmed' ? 33 : 66) + '%';
        }
    } else {
        card.style.display = 'none';
    }
}

function updateBonuses() {
    const bonusEl = document.getElementById('bonus-balance');
    if (bonusEl) bonusEl.textContent = formatNumber(Math.floor(currentBonuses));

    const progressEl = document.getElementById('loyalty-progress');
    const pointsNeededEl = document.getElementById('points-needed');

    if (progressEl && pointsNeededEl) {
        const nextLevel = currentLevel === 'Silver' ? 5000 : currentLevel === 'Gold' ? 15000 : 1;
        const progress = Math.min((currentBonuses / nextLevel) * 100, 100);
        progressEl.style.width = progress + '%';
        pointsNeededEl.textContent = formatNumber(Math.max(0, nextLevel - currentBonuses));
    }
}

function displayGallery(photos) {
    const container = document.getElementById('gallery-container');
    if (!container) return;

    if (photos.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-camera"></i>
                <p>Фото отчеты появятся здесь</p>
                <small>После начала работ с вашим автомобилем</small>
            </div>`;
        return;
    }

    container.innerHTML = photos.map(photo => `
        <div class="gallery-item" data-type="${photo.type}" onclick="openImage('${photo.photo_url}')">
            <img src="${photo.photo_url}" alt="${photo.type === 'before' ? 'До' : 'После'}" loading="lazy">
            <div class="gallery-overlay">
                <span class="gallery-badge ${photo.type}">${photo.type === 'before' ? 'ДО' : 'ПОСЛЕ'}</span>
                <small>${photo.cars?.brand || ''} ${photo.cars?.model || ''}</small>
            </div>
        </div>
    `).join('');
}

function updateNotifications(notifications) {
    const badge = document.getElementById('notif-badge');
    const list = document.getElementById('notifications-list');

    if (badge) {
        badge.textContent = notifications.length;
        badge.style.display = notifications.length > 0 ? 'flex' : 'none';
    }

    if (list) {
        if (notifications.length === 0) {
            list.innerHTML = `
                <div class="notification-item">
                    <i class="fas fa-bell-slash"></i>
                    <div>
                        <p>Нет новых уведомлений</p>
                        <small>Сейчас</small>
                    </div>
                </div>`;
        } else {
            list.innerHTML = notifications.map(n => `
                <div class="notification-item" onclick="markNotificationRead(${n.id})" style="cursor:pointer;">
                    <i class="fas fa-${n.type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
                    <div>
                        <p>${escapeHtml(n.message)}</p>
                        <small>${formatDate(n.created_at)}</small>
                    </div>
                </div>
            `).join('');
        }
    }
}

function displayChatMessages(messages) {
    const chatBody = document.getElementById('chat-messages');
    if (!chatBody) return;

    if (messages.length === 0) {
        chatBody.innerHTML = `
            <div class="msg manager">
                <div class="msg-avatar"><i class="fas fa-user-tie"></i></div>
                <div class="msg-content">
                    <p>Здравствуйте! Чем могу помочь?</p>
                    <small class="msg-time">Сейчас</small>
                </div>
            </div>`;
        return;
    }

    chatBody.innerHTML = messages.map(msg => {
        const isUser = msg.user_id === currentUser.id;
        const time = new Date(msg.created_at).toLocaleTimeString('ru-RU', {
            hour: '2-digit', minute: '2-digit'
        });
        return `
            <div class="msg ${isUser ? 'user' : 'manager'}">
                <div class="msg-avatar">
                    <i class="fas fa-${isUser ? 'user' : 'user-tie'}"></i>
                </div>
                <div class="msg-content">
                    <p>${escapeHtml(msg.message)}</p>
                    <small class="msg-time">${time}</small>
                </div>
            </div>`;
    }).join('');

    chatBody.scrollTop = chatBody.scrollHeight;
}

// ============= ДЕЙСТВИЯ ПОЛЬЗОВАТЕЛЯ =============

function showSection(sectionId, element) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) selectedSection.classList.add('active');

    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    if (element) element.classList.add('active');

    const pageTitle = document.getElementById('page-title');
    const titles = {
        'dashboard': 'Главная',
        'booking': 'Запись на сервис',
        'cars': 'Мой гараж',
        'history': 'История',
        'finance': 'Финансы',
        'media': 'Медиа отчеты',
        'settings': 'Профиль'
    };
    if (pageTitle) pageTitle.textContent = titles[sectionId] || 'Личный кабинет';

    if (sectionId === 'media') loadGallery();

    // Закрываем мобильное меню
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }
}

// FIX: Исправлена функция создания записи — убрана стray-строка scheduled_at: formattedDate
async function createAppointment() {
    const phone = document.getElementById('booking-phone').value.trim();
    const carId = document.getElementById('booking-car').value;
    const serviceId = document.getElementById('booking-service').value;
    const serviceTypeId = document.getElementById('booking-service-type')?.value || null;
    const date = document.getElementById('booking-date').value;
    const note = document.getElementById('booking-note').value;
    const phoneInput = document.getElementById('booking-phone');

    phoneInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, '');

        // Убираем 996 если пользователь начал вводить с него
        if (value.startsWith('996')) {
            value = value.slice(3);
        }

        value = value.substring(0, 9); // максимум 9 цифр после кода

        let formatted = '+996';

        if (value.length > 0) {
            formatted += ' (' + value.substring(0, 3);
        }

        if (value.length >= 3) {
            formatted += ') ' + value.substring(3, 5);
        }

        if (value.length >= 5) {
            formatted += '-' + value.substring(5, 7);
        }

        if (value.length >= 7) {
            formatted += '-' + value.substring(7, 9);
        }

        e.target.value = formatted;
    });

    if (!carId || !serviceId || !date || !phone) {
        showNotification('Заполните обязательные поля', 'warning');
        return;
    }

    try {
        showLoader();

        const service = currentServices.find(s => s.id == serviceId);
        const serviceType = currentServiceTypes?.find(t => t.id == serviceTypeId);

        const totalPrice =
            (service?.base_price || 0) +
            (serviceType?.additional_price || 0);

        const { data, error } = await supabaseClient
            .from('appointments')
            .insert([{
                user_id: currentUser.id,
                car_id: carId,
                service_id: serviceId,
                service_type_id: serviceTypeId || null,
                scheduled_at: new Date(date).toISOString(),
                notes: note || null,
                status: 'pending',
                total_price: totalPrice,
                client_phone: phone   // ← вот это добавили
            }]);

        if (error) throw error;

        showNotification('Запись создана', 'success');
        await loadAppointments();

    } catch (err) {
        showNotification(err.message, 'error');
    } finally {
        hideLoader();
    }
}

async function saveCar() {
    const brand = document.getElementById('car-brand').value.trim();
    const model = document.getElementById('car-model').value.trim();
    const year = document.getElementById('car-year').value;
    const plate = document.getElementById('car-plate').value.trim();
    const mileage = document.getElementById('car-mileage').value;
    const vin = document.getElementById('car-vin').value.trim();

    if (!brand || !model) {
        showNotification('Укажите марку и модель', 'warning');
        return;
    }

    try {
        showLoader();

        const { error } = await supabaseClient
            .from('cars')
            .insert([{
                user_id: currentUser.id,
                brand: brand,
                model: model,
                production_year: year || null,
                license_plate: plate || null,
                mileage: mileage || null,
                vin: vin || null
            }]);

        if (error) throw error;

        showNotification('Автомобиль добавлен', 'success');
        closeModal();
        await loadCars();

    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка: ' + error.message, 'error');
    } finally {
        hideLoader();
    }
}

async function deleteCar(carId) {
    if (!confirm('Удалить автомобиль?')) return;
    try {
        showLoader();
        const { error } = await supabaseClient
            .from('cars')
            .delete()
            .eq('id', carId)
            .eq('user_id', currentUser.id);

        if (error) throw error;
        showNotification('Автомобиль удален', 'success');
        await loadCars();
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка: ' + error.message, 'error');
    } finally {
        hideLoader();
    }
}

function editCar(carId) {
    const car = currentCars.find(c => c.id === carId);
    if (!car) return;

    document.getElementById('car-brand').value = car.brand || '';
    document.getElementById('car-model').value = car.model || '';
    document.getElementById('car-year').value = car.production_year || '';
    document.getElementById('car-plate').value = car.license_plate || '';
    document.getElementById('car-mileage').value = car.mileage || '';
    document.getElementById('car-vin').value = car.vin || '';

    openModal();

    const saveBtn = document.getElementById('save-car-btn');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Обновить';
        saveBtn.onclick = () => updateCar(carId);
    }
}

async function updateCar(carId) {
    const brand = document.getElementById('car-brand').value.trim();
    const model = document.getElementById('car-model').value.trim();
    const year = document.getElementById('car-year').value;
    const plate = document.getElementById('car-plate').value.trim();
    const mileage = document.getElementById('car-mileage').value;
    const vin = document.getElementById('car-vin').value.trim();

    if (!brand || !model) {
        showNotification('Укажите марку и модель', 'warning');
        return;
    }

    try {
        showLoader();
        const { error } = await supabaseClient
            .from('cars')
            .update({
                brand: brand,
                model: model,
                production_year: year || null,
                license_plate: plate || null,
                mileage: mileage || null,
                vin: vin || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', carId)
            .eq('user_id', currentUser.id);

        if (error) throw error;
        showNotification('Автомобиль обновлен', 'success');
        closeModal();
        await loadCars();
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка: ' + error.message, 'error');
    } finally {
        hideLoader();
    }
}

async function saveProfile() {
    const name = document.getElementById('profile-name').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();
    const birthday = document.getElementById('profile-birthday').value;

    if (!name) {
        showNotification('Имя обязательно для заполнения', 'warning');
        document.getElementById('profile-name').focus();
        return;
    }

    try {
        showLoader();

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !user) throw new Error('Пользователь не авторизован');

        // ВАЖНО: Проверяем существующий профиль
        const { data: existingProfile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        // Базовые данные профиля
        const profileData = {
            id: user.id,
            name: name,
            updated_at: new Date().toISOString()
        };

        // Добавляем необязательные поля
        if (phone) profileData.phone = phone;
        if (birthday) profileData.birthday = birthday;

        // ЕСЛИ ЭТО НОВЫЙ ПРОФИЛЬ, добавляем обязательные поля со значениями по умолчанию
        if (!existingProfile) {
            profileData.role = 'user'; // или другое значение по умолчанию
            // Проверьте, есть ли другие обязательные поля в таблице
        }

        console.log('Сохраняем профиль:', profileData);

        // Выполняем upsert БЕЗ select() сначала, чтобы увидеть реальную ошибку
        const { error } = await supabaseClient
            .from('profiles')
            .upsert(profileData);

        if (error) {
            console.error('Полная ошибка:', error);

            // Анализируем ошибку
            if (error.code === '23502') { // PostgreSQL not-null violation
                const field = error.message.match(/column "(.+?)"/)?.[1];
                throw new Error(`Поле "${field}" обязательно для заполнения`);
            } else if (error.code === '23505') { // Unique violation
                throw new Error('Этот телефон уже используется');
            } else {
                throw error;
            }
        }

        // Если всё хорошо, получаем обновлённый профиль отдельным запросом
        const { data: updatedProfile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        console.log('Профиль обновлён:', updatedProfile);

        showNotification('Профиль успешно обновлен', 'success');

        if (typeof updateUI === 'function') {
            updateUI();
        }

    } catch (error) {
        console.error('Ошибка сохранения профиля:', error);
        showNotification(error.message || 'Ошибка сохранения', 'error');
    } finally {
        hideLoader();
    }
}
// ============= ПРОСТАЯ АНИМАЦИЯ ШАГОВ =============
function initStepAnimation() {
    const steps = document.querySelectorAll('.form-step');

    // Добавляем обработчик клика на каждый шаг
    steps.forEach((step, index) => {
        step.addEventListener('click', function () {
            // Убираем активный класс у всех шагов
            steps.forEach(s => {
                s.classList.remove('active');
                s.classList.remove('completed');
            });

            // Активируем текущий шаг и все предыдущие
            for (let i = 0; i <= index; i++) {
                if (i < index) {
                    steps[i].classList.add('completed');
                } else {
                    steps[i].classList.add('active');
                }
            }

            // Добавляем эффект пульсации
            this.style.animation = 'none';
            this.offsetHeight; // Trigger reflow
            this.style.animation = 'stepPulse 0.5s ease';
        });
    });

    // Добавляем стили для анимации (если их еще нет)
    addAnimationStyles();
}

// Добавляем CSS стили
function addAnimationStyles() {
    // Проверяем, есть ли уже стили
    if (document.getElementById('step-animation-styles')) return;

    const style = document.createElement('style');
    style.id = 'step-animation-styles';
    style.textContent = `
        .form-steps {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            position: relative;
            cursor: pointer;
        }
        
        .form-steps::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #3498db, #9b59b6);
            transform: translateY(-50%);
            z-index: 1;
            opacity: 0.3;
        }
        
        .form-step {
            position: relative;
            z-index: 2;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: white;
            border: 2px solid #e0e0e0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: #999;
            transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .form-step:hover {
            transform: scale(1.1);
            border-color: #3498db;
            box-shadow: 0 5px 15px rgba(52, 152, 219, 0.3);
        }
        
        .form-step.active {
            background: linear-gradient(135deg, #3498db, #2980b9);
            border-color: #2980b9;
            color: white;
            transform: scale(1.2);
            box-shadow: 0 0 20px rgba(52, 152, 219, 0.5);
            animation: glow 2s infinite;
        }
        
        .form-step.completed {
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            border-color: #27ae60;
            color: white;
        }
        
        .form-step.completed::after {
            content: '✓';
            font-size: 20px;
            font-weight: bold;
        }
        
        .form-step.completed .step-number {
            display: none;
        }
        
        .step-label {
            position: absolute;
            top: 45px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 12px;
            white-space: nowrap;
            font-weight: 500;
            color: #666;
            transition: all 0.3s ease;
        }
        
        .form-step.active .step-label {
            color: #3498db;
            font-weight: bold;
        }
        
        .form-step.completed .step-label {
            color: #2ecc71;
        }
        
        /* Анимации */
        @keyframes glow {
            0% { box-shadow: 0 0 5px rgba(52, 152, 219, 0.5); }
            50% { box-shadow: 0 0 20px rgba(52, 152, 219, 0.8); }
            100% { box-shadow: 0 0 5px rgba(52, 152, 219, 0.5); }
        }
        
        @keyframes stepPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.3); }
            100% { transform: scale(1); }
        }
        
        /* Эффект для линии прогресса */
        .form-step.active ~ .form-step {
            opacity: 0.7;
        }
    `;

    document.head.appendChild(style);
}

// Добавляем автоматическое переключение шагов при заполнении (опционально)
function setupAutoStepHighlight() {
    const carSelect = document.getElementById('booking-car');
    const serviceSelect = document.getElementById('booking-service');
    const datetimeInput = document.getElementById('booking-date');
    const steps = document.querySelectorAll('.form-step');

    function updateStepsFromInputs() {
        // Шаг 1 (автомобиль)
        if (carSelect && carSelect.value) {
            steps[0].classList.add('completed');
        } else {
            steps[0].classList.remove('completed');
        }

        // Шаг 2 (услуга)
        if (serviceSelect && serviceSelect.value) {
            steps[1].classList.add('completed');
        } else {
            steps[1].classList.remove('completed');
        }

        // Шаг 3 (дата)
        if (datetimeInput && datetimeInput.value) {
            steps[2].classList.add('completed');
        } else {
            steps[2].classList.remove('completed');
        }
    }

    if (carSelect) carSelect.addEventListener('change', updateStepsFromInputs);
    if (serviceSelect) serviceSelect.addEventListener('change', updateStepsFromInputs);
    if (datetimeInput) datetimeInput.addEventListener('change', updateStepsFromInputs);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    // Запускаем простую анимацию шагов
    initStepAnimation();

    // Опционально: автоматическая подсветка при заполнении
    setupAutoStepHighlight();

    // Делаем первый шаг активным по умолчанию
    setTimeout(() => {
        const firstStep = document.querySelector('.form-step');
        if (firstStep) {
            firstStep.classList.add('active');
        }
    }, 100);
});

async function sendMessage() {
    const input = document.getElementById('chat-input-text');
    const text = input.value.trim();
    if (!text) return;

    try {
        const { error } = await supabaseClient
            .from('messages')
            .insert([{
                user_id: currentUser.id,
                message: text,
                direction: 'client_to_staff'
            }]);

        if (error) throw error;

        const chatBody = document.getElementById('chat-messages');
        const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        chatBody.innerHTML += `
            <div class="msg user">
                <div class="msg-avatar"><i class="fas fa-user"></i></div>
                <div class="msg-content">
                    <p>${escapeHtml(text)}</p>
                    <small class="msg-time">${time}</small>
                </div>
            </div>`;

        input.value = '';
        chatBody.scrollTop = chatBody.scrollHeight;

    } catch (error) {
        console.error('Ошибка отправки:', error);
        showNotification('Не удалось отправить сообщение', 'error');
    }
}

async function markNotificationRead(id) {
    try {
        await supabaseClient
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);
        await loadNotifications();
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// FIX: Убран параметр event, теперь кнопка находится через querySelectorAll
function filterHistory(status) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    // Находим нажатую кнопку по тексту/data
    const buttons = document.querySelectorAll('.tab-btn');
    const labelMap = { 'all': 'Все', 'completed': 'Завершено', 'in_progress': 'В работе', 'pending': 'Ожидает' };
    buttons.forEach(btn => {
        if (btn.textContent.trim() === labelMap[status]) btn.classList.add('active');
    });

    const filtered = status === 'all'
        ? currentAppointments
        : currentAppointments.filter(app => app.status === status);

    const container = document.getElementById('history-container');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <p>Нет записей с таким статусом</p>
            </div>`;
        return;
    }

    renderHistoryItems(container, filtered);
}

// FIX: Убран параметр event, фильтрация по data-type
function filterMedia(type) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));

    const labelMap = { 'all': 'Все', 'before': 'До', 'after': 'После' };
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.textContent.trim() === labelMap[type]) btn.classList.add('active');
    });

    const items = document.querySelectorAll('.gallery-item');
    items.forEach(item => {
        if (type === 'all') {
            item.style.display = 'block';
        } else {
            item.style.display = item.dataset.type === type ? 'block' : 'none';
        }
    });
}
// ============= ЗАГРУЗКА ФОТО ПРОФИЛЯ =============
async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        showNotification('Файл слишком большой (макс 2MB)', 'error');
        return;
    }

    try {
        showLoader();

        // Check authentication first
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !session) {
            throw new Error('Сессия истекла. Пожалуйста, войдите снова');
        }

        const userId = session.user.id;

        // Create a unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `avatar_${userId}_${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // Upload with explicit content type
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true,
                contentType: file.type
            });

        if (uploadError) {
            console.error('Upload error details:', uploadError);
            if (uploadError.message.includes('row-level security policy')) {
                throw new Error('Ошибка доступа к хранилищу. Проверьте настройки RLS');
            }
            throw uploadError;
        }

        // ПОЛУЧАЕМ ПУБЛИЧНУЮ ССЫЛКУ ПРАВИЛЬНО
        const { data: { publicUrl } } = supabaseClient.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Update profile
        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({
                avatar_url: publicUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        // Update UI
        updateProfileAvatar(publicUrl);
        updateMiniAvatar(publicUrl, session.user.email || 'User');

        showNotification('Фото обновлено', 'success');
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification(error.message || 'Ошибка загрузки фото', 'error');
    } finally {
        hideLoader();
    }
}

function updateProfileAvatar(publicUrl) {
    const profileAvatar = document.getElementById('profile-avatar');
    if (!profileAvatar) return;

    profileAvatar.innerHTML = '';

    const img = new Image();
    img.onload = function () {
        // Изображение загрузилось успешно
        profileAvatar.innerHTML = '';
        profileAvatar.appendChild(img);
    };

    img.onerror = function () {
        console.error('Ошибка загрузки изображения, пробуем другой формат URL:', publicUrl);

        // Пробуем альтернативный формат URL
        const alternativeUrl = publicUrl.replace('/object/public/', '/object/authenticated/');

        const img2 = new Image();
        img2.onload = function () {
            profileAvatar.innerHTML = '';
            profileAvatar.appendChild(img2);
        };

        img2.onerror = function () {
            console.error('Все форматы URL не работают');
            profileAvatar.innerHTML = '<i class="fas fa-user"></i>';
        };

        img2.src = alternativeUrl + '?t=' + Date.now();
        img2.alt = 'Avatar';
        img2.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
    };

    img.src = publicUrl + '?t=' + Date.now();
    img.alt = 'Avatar';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
}

function updateMiniAvatar(publicUrl, userEmail) {
    const avatarContainer = document.querySelector('.avatar');
    const userNameElement = document.querySelector('.user-name');

    if (avatarContainer) {
        avatarContainer.innerHTML = '';

        const img = new Image();
        img.onload = function () {
            avatarContainer.innerHTML = '';
            avatarContainer.appendChild(img);
        };

        img.onerror = function () {
            console.error('Ошибка загрузки мини-аватара, пробуем альтернативный URL');

            const alternativeUrl = publicUrl.replace('/object/public/', '/object/authenticated/');

            const img2 = new Image();
            img2.onload = function () {
                avatarContainer.innerHTML = '';
                avatarContainer.appendChild(img2);
            };

            img2.onerror = function () {
                avatarContainer.innerHTML = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';
            };

            img2.src = alternativeUrl + '?t=' + Date.now();
            img2.alt = 'Avatar';
            img2.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
        };

        img.src = publicUrl + '?t=' + Date.now();
        img.alt = 'Avatar';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
    }
}

// Функция для обновления большого аватара в профиле
function updateProfileAvatar(publicUrl) {
    const profileAvatar = document.getElementById('profile-avatar');
    if (!profileAvatar) return;

    // Очищаем всё
    profileAvatar.innerHTML = '';

    // Создаём элемент <img>
    const img = document.createElement('img');
    img.src = publicUrl + '?t=' + Date.now(); // Добавляем timestamp для избегания кэширования
    img.alt = 'Avatar';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '50%';

    // Добавляем обработчик ошибки
    img.onerror = function () {
        console.error('Ошибка загрузки изображения:', publicUrl);
        // Если изображение не загрузилось, показываем иконку
        profileAvatar.innerHTML = '<i class="fas fa-user"></i>';
    };

    // Вставляем в блок
    profileAvatar.appendChild(img);
}

// Функция для обновления мини-аватара в сайдбаре
function updateMiniAvatar(publicUrl, userEmail) {
    const avatarContainer = document.querySelector('.avatar');
    const userNameElement = document.querySelector('.user-name');

    if (avatarContainer) {
        avatarContainer.innerHTML = ''; // Очищаем

        const img = document.createElement('img');
        img.src = publicUrl + '?t=' + Date.now();
        img.alt = 'Avatar';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '50%';

        img.onerror = function () {
            console.error('Ошибка загрузки мини-аватара');
            // Если ошибка, показываем инициалы
            avatarContainer.innerHTML = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';
        };

        avatarContainer.appendChild(img);
    }

    // Обновляем имя пользователя если нужно
    if (userNameElement && !userNameElement.textContent) {
        userNameElement.textContent = userEmail || 'Пользователь';
    }
}

// Добавьте эту функцию для загрузки профиля при старте
async function loadUserProfile() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;

        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) throw error;

        if (profile?.avatar_url) {
            updateProfileAvatar(profile.avatar_url);
            updateMiniAvatar(profile.avatar_url, session.user.email);
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
    }
}

// Вызываем загрузку профиля при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
});
// ============= UI УТИЛИТЫ =============

// FIX: Sidebar теперь переключает класс 'open' (соответствует CSS .sidebar.open)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
}

function toggleNotifications() {
    const panel = document.getElementById('notifications-panel');
    if (panel) panel.classList.toggle('active');
}

function toggleChat() {
    const chat = document.getElementById('chat-widget');
    const icon = document.getElementById('chat-icon');
    if (!chat) return;
    chat.classList.toggle('expanded');
    if (icon) {
        icon.className = chat.classList.contains('expanded') ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    }
    // Скролл вниз при открытии
    if (chat.classList.contains('expanded')) {
        setTimeout(() => {
            const chatMessages = document.getElementById('chat-messages');
            if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 300);
    }
}

// FIX: Support menu теперь переключает класс 'show' (соответствует CSS .support-menu.show)
function toggleSupport() {
    const menu = document.getElementById('support-menu');
    if (menu) menu.classList.toggle('show');
}

function openModal() {
    const modal = document.getElementById('car-modal');
    if (modal) modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('car-modal');
    if (modal) modal.style.display = 'none';
    clearCarForm();

    const saveBtn = document.getElementById('save-car-btn');
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="fas fa-plus"></i> Добавить';
        saveBtn.onclick = saveCar;
    }
}

function clearCarForm() {
    ['car-brand', 'car-model', 'car-year', 'car-plate', 'car-mileage', 'car-vin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

function openImage(url) {
    window.open(url, '_blank');
}

async function logout() {
    if (!confirm('Выйти из аккаунта?')) return;
    try {
        await supabaseClient.auth.signOut();
        window.location.href = 'auth.html';
    } catch (error) {
        console.error('Ошибка выхода:', error);
        window.location.href = 'auth.html';
    }
}

// ============= УВЕДОМЛЕНИЯ =============

function showNotification(message, type = 'info') {
    // Удаляем предыдущие уведомления того же типа
    document.querySelectorAll('.notification').forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
    notification.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        <span>${escapeHtml(message)}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;margin-left:8px;color:inherit;opacity:0.7;">✕</button>
    `;

    // Инлайн стили на случай если CSS не подключен
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '9999',
        padding: '14px 20px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '0.95rem',
        fontWeight: '500',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        animation: 'slideIn 0.3s ease',
        maxWidth: '400px',
        color: 'white',
        background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'
    });

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(20px)';
        notification.style.transition = 'all 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// ============= LOADER =============

function showLoader() {
    if (document.getElementById('app-loader')) return;
    const loader = document.createElement('div');
    loader.id = 'app-loader';
    Object.assign(loader.style, {
        position: 'fixed',
        top: '0', left: '0',
        width: '100%', height: '100%',
        background: 'rgba(255,255,255,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '99999',
        flexDirection: 'column',
        gap: '12px'
    });
    loader.innerHTML = `
        <div style="width:48px;height:48px;border:4px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <p style="color:#6b7280;font-size:0.95rem;font-family:sans-serif;">Загрузка...</p>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    `;
    document.body.appendChild(loader);
}

function hideLoader() {
    const loader = document.getElementById('app-loader');
    if (loader) loader.remove();
}

// ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============

function getStatusText(status) {
    const map = {
        'pending': 'Ожидает',
        'confirmed': 'Подтвержден',
        'in_progress': 'В работе',
        'completed': 'Завершен',
        'cancelled': 'Отменен'
    };
    return map[status] || status;
}

function formatNumber(num) {
    return Math.round(Number(num) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'только что';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;

    return date.toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============= ОБРАБОТЧИКИ СОБЫТИЙ =============

window.addEventListener('click', (e) => {
    const modal = document.getElementById('car-modal');
    if (e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        document.getElementById('notifications-panel')?.classList.remove('active');
        document.getElementById('support-menu')?.classList.remove('show');
    }
});

// FIX: Закрытие меню поддержки при клике вне
document.addEventListener('click', (e) => {
    const fab = document.querySelector('.support-fab');
    const menu = document.getElementById('support-menu');
    if (fab && menu && !fab.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('show');
    }
});

console.log('✅ Cabinet.js загружен и готов к работе');







// ============= ИНИЦИАЛИЗАЦИЯ SUPABASE ДЛЯ ПОЛЬЗОВАТЕЛЯ =============
const USER_SUPABASE_URL = "https://oekrtypfqaierhkhulab.supabase.co";
const USER_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9la3J0eXBmcWFpZXJoa2h1bGFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NDgwMTYsImV4cCI6MjA3ODQyNDAxNn0.61ouoN7hBsGFibzrijeNG7i6HOcukDImbQjYRBZjQiA';

let userSb = null;

// Инициализация Supabase для пользователя
if (typeof supabase !== 'undefined') {
    userSb = supabase.createClient(USER_SUPABASE_URL, USER_SUPABASE_KEY, {
        auth: {
            storageKey: 'user-auth-token',
            storage: window.localStorage,
            autoRefreshToken: true,
            persistSession: true
        }
    });
    console.log('✅ User Supabase client initialized');
}

// ID текущего пользователя (должен быть установлен при входе)
let currentUserId = localStorage.getItem('user_id') || null;

// ============= ФУНКЦИИ ЧАТА ДЛЯ ПОЛЬЗОВАТЕЛЯ =============
let messagePollingInterval = null;

function toggleChat() {
    const chatBody = document.getElementById('chat-body');
    const chatIcon = document.getElementById('chat-icon');
    
    if (chatBody.style.display === 'none') {
        chatBody.style.display = 'flex';
        chatIcon.className = 'fas fa-chevron-up';
        loadUserMessages(); // Загружаем сообщения при открытии
        
        // Запускаем polling для новых сообщений
        if (messagePollingInterval) clearInterval(messagePollingInterval);
        messagePollingInterval = setInterval(loadUserMessages, 3000);
    } else {
        chatBody.style.display = 'none';
        chatIcon.className = 'fas fa-chevron-down';
        if (messagePollingInterval) {
            clearInterval(messagePollingInterval);
            messagePollingInterval = null;
        }
    }
}

async function loadUserMessages() {
    if (!userSb || !currentUserId) {
        console.log('User not logged in or Supabase not initialized');
        return;
    }

    try {
        // Загружаем сообщения для текущего пользователя
        const { data: messages, error } = await userSb
            .from('messages')
            .select('*')
            .or(`user_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (messages) {
            renderUserMessages(messages);
            checkUnreadMessages(messages);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function renderUserMessages(messages) {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;

    if (!messages || messages.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;color:var(--muted2);padding:20px;">
                <i class="fas fa-comments" style="font-size:24px;margin-bottom:10px;opacity:0.5;"></i>
                <p>Напишите нам, мы онлайн</p>
            </div>
        `;
        return;
    }

    container.innerHTML = messages.map(msg => {
        const isUser = msg.user_id === currentUserId;
        const senderName = isUser ? 'Вы' : 'Мастер';
        
        return `
            <div class="msg ${isUser ? 'user' : 'manager'}">
                <div class="msg-avatar">
                    <i class="fas ${isUser ? 'fa-user' : 'fa-user-tie'}"></i>
                </div>
                <div class="msg-content">
                    <p>${escapeHtml(msg.message)}</p>
                    <small class="msg-time">${formatMessageTime(msg.created_at)}</small>
                </div>
            </div>
        `;
    }).join('');

    // Скроллим вниз
    container.scrollTop = container.scrollHeight;
}

function checkUnreadMessages(messages) {
    if (!messages || messages.length === 0) return;

    // Находим непрочитанные сообщения от мастера
    const unreadCount = messages.filter(msg => 
        msg.receiver_id === currentUserId && 
        msg.direction === 'staff_to_client' && 
        !msg.is_read
    ).length;

    const badge = document.getElementById('chat-unread-badge');
    if (badge) {
        if (unreadCount > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = unreadCount;
        } else {
            badge.style.display = 'none';
        }
    }
}

async function sendUserMessage() {
    const input = document.getElementById('chat-input-text');
    const message = input.value.trim();

    if (!message || !userSb || !currentUserId) {
        showUserMessage('Ошибка: не удалось отправить сообщение', 'error');
        return;
    }

    try {
        // Определяем ID получателя (админ)
        const { data: admins, error: adminError } = await userSb
            .from('profiles')
            .select('id')
            .eq('role', 'admin')
            .limit(1);

        if (adminError) throw adminError;

        const receiverId = admins && admins.length > 0 ? admins[0].id : null;

        if (!receiverId) {
            showUserMessage('Администратор не найден', 'error');
            return;
        }

        // Отправляем сообщение
        const { error } = await userSb
            .from('messages')
            .insert({
                user_id: currentUserId,
                receiver_id: receiverId,
                message: message,
                direction: 'client_to_staff',
                is_read: false
            });

        if (error) throw error;

        // Очищаем поле ввода
        input.value = '';

        // Показываем успешное сообщение
        showUserMessage('Сообщение отправлено', 'success');

        // Перезагружаем сообщения
        await loadUserMessages();

    } catch (error) {
        console.error('Error sending message:', error);
        showUserMessage('Ошибка отправки: ' + error.message, 'error');
    }
}

// ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // Если сегодня
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        }
        // Если вчера
        else if (diff < 86400000 * 2) {
            return 'Вчера ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        }
        // Если в этом году
        else if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        }
        // Если в прошлом году
        else {
            return date.toLocaleDateString('ru-RU', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }
    } catch (e) {
        return timestamp;
    }
}

function showUserMessage(message, type = 'success') {
    let messageDiv = document.getElementById('user-message');
    
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'user-message';
        document.body.appendChild(messageDiv);
    }
    
    const bgColor = type === 'success' ? '#4CAF50' : '#ff3860';
    
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: ${bgColor};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        font-family: 'Exo 2', sans-serif;
        font-size: 14px;
        max-width: 80%;
        text-align: center;
        animation: slideDown 0.3s ease;
    `;
    
    messageDiv.textContent = message;
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Получаем ID пользователя из localStorage (должен быть установлен при входе)
    currentUserId = localStorage.getItem('user_id');
    
    if (currentUserId) {
        // Загружаем сообщения
        loadUserMessages();
        
        // Запускаем polling только если чат открыт
        const chatBody = document.getElementById('chat-body');
        if (chatBody && chatBody.style.display === 'flex') {
            if (messagePollingInterval) clearInterval(messagePollingInterval);
            messagePollingInterval = setInterval(loadUserMessages, 3000);
        }
    }
});
