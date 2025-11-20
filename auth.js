// Переключение вкладок
function toggleForm(type) {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabReg = document.getElementById('tab-register');

    if (type === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        tabLogin.classList.add('bg-indigo-600', 'text-white');
        tabLogin.classList.remove('text-slate-300');
        tabReg.classList.remove('bg-indigo-600', 'text-white');
        tabReg.classList.add('text-slate-300');
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        tabReg.classList.add('bg-indigo-600', 'text-white');
        tabReg.classList.remove('text-slate-300');
        tabLogin.classList.remove('bg-indigo-600', 'text-white');
        tabLogin.classList.add('text-slate-300');
    }
}

function showMessage(text, isError = false) {
    const box = document.getElementById('msg-box');
    box.textContent = text;
    box.className = `mt-4 text-center text-sm ${isError ? 'text-red-400' : 'text-green-400'} block`;
}

// 1. Вход
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        showMessage(error.message, true);
    } else {
        window.location.href = 'cabinet.html';
    }
});
// 2. Регистрация (Обновленный код)
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = e.target.querySelector('button'); // Находим кнопку
    const originalText = btn.innerText;
    
    // Блокируем кнопку, чтобы не отправить 100 запросов
    btn.disabled = true;
    btn.innerText = "Загрузка...";

    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const name = document.getElementById('reg-name').value;
    const phone = document.getElementById('reg-phone').value;

    try {
        // А. Создаем юзера
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
            email, 
            password,
            // Важно: если выключил подтверждение почты, это позволит войти сразу
            options: {
                data: { name: name } // Сохраняем имя сразу в метаданные
            }
        });

        if (authError) throw authError;

        // Б. Создаем профиль
        if (authData.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([{ 
                    id: authData.user.id, 
                    name: name, 
                    phone: phone || null 
                }]);

            if (profileError) {
                console.error('Ошибка профиля:', profileError);
                // Не останавливаем вход, если профиль не создался (редкий случай)
            }
            
            showMessage("Регистрация успешна! Входим...", false);
            setTimeout(() => window.location.href = 'cabinet.html', 1500);
        }

    } catch (error) {
        showMessage(error.message, true); // Показываем ошибку
        btn.disabled = false;             // Разблокируем кнопку
        btn.innerText = originalText;     // Возвращаем текст
    }
});