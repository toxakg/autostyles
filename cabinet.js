// Глобальная переменная для ID пользователя
let currentUserId = null;

// 1. Проверка сессии при загрузке
async function init() {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.href = 'auth.html';
        return;
    }

    currentUserId = session.user.id;
    
    // Загружаем данные
    loadProfile(session.user);
    loadCars();
    loadAppointments();
}

// 2. Загрузка Профиля (из public.profiles)
async function loadProfile(user) {
    document.getElementById('display-email').textContent = user.email;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (data) {
        document.getElementById('display-name').textContent = data.name;
        document.getElementById('display-phone').textContent = data.phone || 'Не указан';
        document.getElementById('display-role').textContent = data.role;
    }
}

// 3. Загрузка машин (из public.cars)
async function loadCars() {
    const container = document.getElementById('cars-list');
    
    const { data: cars, error } = await supabase
        .from('cars')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = '<p class="text-red-500">Ошибка загрузки авто</p>';
        return;
    }

    if (cars.length === 0) {
        container.innerHTML = '<p class="text-slate-400 p-4 border border-dashed rounded">Машин пока нет.</p>';
        return;
    }

    container.innerHTML = cars.map(car => `
        <div class="bg-white border p-4 rounded-lg flex justify-between items-center">
            <div>
                <h4 class="font-bold text-lg">${car.brand} ${car.model}</h4>
                <p class="text-sm text-slate-500">${car.license_plate} ${car.year ? `(${car.year})` : ''}</p>
            </div>
            <button onclick="deleteCar(${car.id})" class="text-red-400 hover:text-red-600"><i data-lucide="trash-2"></i></button>
        </div>
    `).join('');
    lucide.createIcons();
}

// 4. Добавление машины
document.getElementById('add-car-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newCar = {
        user_id: currentUserId,
        brand: document.getElementById('car-brand').value,
        model: document.getElementById('car-model').value,
        license_plate: document.getElementById('car-plate').value,
        year: document.getElementById('car-year').value || null
    };

    const { error } = await supabase.from('cars').insert([newCar]);

    if (error) {
        alert('Ошибка: ' + error.message);
    } else {
        e.target.reset();
        loadCars(); // Обновляем список
    }
});

// 5. Удаление машины
async function deleteCar(id) {
    if(!confirm('Удалить авто?')) return;
    await supabase.from('cars').delete().eq('id', id);
    loadCars();
}

// 6. Загрузка записей (appointments + join services)
async function loadAppointments() {
    const list = document.getElementById('appointments-list');
    
    // Запрашиваем appointments и подтягиваем название услуги из services
    const { data: appts, error } = await supabase
        .from('appointments')
        .select(`
            *,
            services (name)
        `)
        .eq('user_id', currentUserId)
        .order('scheduled_at', { ascending: false });

    if (!appts || appts.length === 0) {
        document.getElementById('no-bookings').classList.remove('hidden');
        return;
    }

    list.innerHTML = appts.map(item => {
        const date = new Date(item.scheduled_at).toLocaleDateString('ru-RU');
        const serviceName = item.services ? item.services.name : 'Услуга удалена';
        
        // Цвета статусов
        let statusColor = 'bg-gray-100 text-gray-800';
        if (item.status === 'confirmed') statusColor = 'bg-green-100 text-green-800';
        if (item.status === 'pending') statusColor = 'bg-yellow-100 text-yellow-800';

        return `
            <tr class="hover:bg-slate-50">
                <td class="p-4 text-slate-700">${date}</td>
                <td class="p-4 font-medium">${serviceName}</td>
                <td class="p-4"><span class="px-2 py-1 rounded text-xs font-bold ${statusColor}">${item.status}</span></td>
                <td class="p-4 font-bold">${item.total_price} ₽</td>
            </tr>
        `;
    }).join('');
}

// Логика табов и выхода
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    
    // Активный стиль меню (упрощенно)
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('bg-slate-800', 'text-indigo-400'));
    document.getElementById(`nav-${tabName}`).classList.add('bg-slate-800', 'text-indigo-400');
}

document.getElementById('logout-btn').addEventListener('click', signOut);
document.getElementById('mobile-logout').addEventListener('click', signOut);

async function signOut() {
    await supabase.auth.signOut();
    window.location.href = 'auth.html';
}

// Старт
init();