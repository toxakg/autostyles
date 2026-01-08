// Делаем функцию глобальной, чтобы она работала из HTML onclick
window.toggleForm = function(type) {
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
    // Скрываем сообщение через 5 секунд
    setTimeout(() => {
        box.classList.add('hidden');
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');

    // --- ВХОД ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        // ИСПОЛЬЗУЕМ sb ВМЕСТО supabase
        const { data, error } = await window.sb.auth.signInWithPassword({ email, password });

        if (error) {
            showMessage('Ошибка входа: ' + error.message, true);
        } else {
            showMessage('Вход выполнен успешно!', false);
            setTimeout(() => window.location.href = 'cabinet.html', 1000);
        }
    });

    // --- РЕГИСТРАЦИЯ ---
    regForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = e.target.querySelector('button');
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = "Загрузка...";

        const name = document.getElementById('reg-name').value;
        const phone = document.getElementById('reg-phone').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        try {
            // 1. Регистрация пользователя
            // ИСПОЛЬЗУЕМ sb ВМЕСТО supabase
            const { data: authData, error: authError } = await window.sb.auth.signUp({
                email,
                password,
                options: { 
                    data: { name: name } // Метаданные сохраняются в user_metadata
                }
            });

            if (authError) throw authError;

            // 2. Создание записи в таблице profiles (если она есть)
            if (authData.user) {
                // Проверяем, не пустой ли ID перед вставкой
                const { error: profileError } = await window.sb
                    .from('profiles')
                    .insert([{ 
                        id: authData.user.id, 
                        name: name, 
                        phone: phone || null 
                    }]);

                if (profileError) {
                    console.warn('Ошибка создания профиля (возможно, нет таблицы или прав):', profileError);
                    // Мы не прерываем вход, если профиль не создался, но выводим предупреждение в консоль
                }

                showMessage("Регистрация успешна! Перенаправление...", false);
                setTimeout(() => window.location.href = 'cabinet.html', 1500);
            }
        } catch (error) {
            showMessage(error.message, true);
        } finally {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    });
});









