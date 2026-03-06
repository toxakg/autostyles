// Конфигурация и инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Проверка подключения Supabase
    if (typeof window.sb === 'undefined') {
        console.error('Supabase client not initialized');
        showNotification('Ошибка подключения к серверу', 'error');
        return;
    }

    // Инициализация всех компонентов
    initThemeToggle();
    initFormToggle();
    initPasswordToggles();
    initPhoneMask();
    initPasswordStrength();
    initCarToggle();
    initForms();
    initSocialAuth();
    initForgotPassword();
});

// Переменные состояния
let currentUser = null;

// ==================== ТЕМА ====================
function initThemeToggle() {
    const themeSwitcher = document.getElementById('themeSwitcher');
    const body = document.body;
    const icon = themeSwitcher.querySelector('i');

    // Проверяем сохраненную тему
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }

    themeSwitcher.addEventListener('click', () => {
        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('theme', 'light');
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('theme', 'dark');
        }
    });
}

// ==================== ПЕРЕКЛЮЧЕНИЕ ФОРМ ====================
function initFormToggle() {
    const loginToggle = document.getElementById('loginToggle');
    const registerToggle = document.getElementById('registerToggle');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const slider = document.getElementById('toggleSlider');

    loginToggle.addEventListener('click', () => {
        loginToggle.classList.add('active');
        registerToggle.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        slider.classList.remove('register');
    });

    registerToggle.addEventListener('click', () => {
        registerToggle.classList.add('active');
        loginToggle.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
        slider.classList.add('register');
    });
}

// ==================== ПЕРЕКЛЮЧАТЕЛИ ПАРОЛЯ ====================
function initPasswordToggles() {
    // Функция глобально доступна для onclick
    window.togglePassword = function(inputId, btn) {
        const input = document.getElementById(inputId);
        const icon = btn.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    };
}

// ==================== МАСКА ТЕЛЕФОНА KG (+996) ====================
function initPhoneMask() {
    const phoneInputs = document.querySelectorAll('.phone-mask');

    phoneInputs.forEach(input => {

        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');

            // Убираем код страны если пользователь ввел его вручную
            if (value.startsWith('996')) {
                value = value.substring(3);
            }

            // Убираем ведущий 0 (если вводят 0555...)
            if (value.startsWith('0')) {
                value = value.substring(1);
            }

            // Ограничиваем до 9 цифр
            value = value.substring(0, 9);

            let formatted = '+996';

            if (value.length > 0) {
                formatted += ' (' + value.substring(0, 3);
            }

            if (value.length >= 3) {
                formatted += ') ' + value.substring(3, 6);
            }

            if (value.length >= 6) {
                formatted += '-' + value.substring(6, 9);
            }

            e.target.value = formatted;
        });

        // Чтобы при фокусе сразу ставился +996
        input.addEventListener('focus', (e) => {
            if (!e.target.value) {
                e.target.value = '+996 ';
            }
        });

    });
}

// ==================== СИЛА ПАРОЛЯ ====================
function initPasswordStrength() {
    const passwordInput = document.getElementById('registerPassword');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');

    passwordInput.addEventListener('input', () => {
        const password = passwordInput.value;
        const strength = checkPasswordStrength(password);
        
        strengthBar.className = 'strength-bar';
        
        switch(strength) {
            case 'weak':
                strengthBar.classList.add('weak');
                strengthText.textContent = 'Слабый пароль';
                strengthText.style.color = '#ff4d4d';
                break;
            case 'medium':
                strengthBar.classList.add('medium');
                strengthText.textContent = 'Средний пароль';
                strengthText.style.color = '#ffa500';
                break;
            case 'strong':
                strengthBar.classList.add('strong');
                strengthText.textContent = 'Надежный пароль';
                strengthText.style.color = '#00ff88';
                break;
            default:
                strengthText.textContent = '';
        }
    });
}

function checkPasswordStrength(password) {
    if (password.length < 6) return 'weak';
    
    let strength = 0;
    
    // Проверка на цифры
    if (password.match(/\d/)) strength++;
    // Проверка на спецсимволы
    if (password.match(/[!@#$%^&*]/)) strength++;
    // Проверка на заглавные буквы
    if (password.match(/[A-Z]/)) strength++;
    // Проверка на строчные буквы
    if (password.match(/[a-z]/)) strength++;
    // Длина больше 8
    if (password.length > 8) strength++;
    
    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
}

// ==================== ДОБАВЛЕНИЕ АВТОМОБИЛЯ ====================
function initCarToggle() {
    const addCarBtn = document.getElementById('addCarBtn');
    const carFields = document.getElementById('carFields');
    
    addCarBtn.addEventListener('click', () => {
        carFields.classList.toggle('show');
        
        const icon = addCarBtn.querySelector('i');
        const text = addCarBtn.querySelector('span');
        
        if (carFields.classList.contains('show')) {
            icon.classList.remove('fa-plus');
            icon.classList.add('fa-minus');
            text.textContent = 'Убрать автомобиль';
        } else {
            icon.classList.remove('fa-minus');
            icon.classList.add('fa-plus');
            text.textContent = 'Добавить автомобиль';
        }
    });
}

// ==================== ФОРМЫ ====================
function initForms() {
    // Форма входа
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    
    // Форма регистрации
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
}

// Обработка входа
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Валидация
    if (!validateEmail(email)) {
        showFieldError('loginEmailError', 'Введите корректный email');
        return;
    }
    
    if (password.length < 6) {
        showFieldError('loginPasswordError', 'Пароль должен быть не менее 6 символов');
        return;
    }
    
    // Очистка ошибок
    clearFieldErrors();
    
    // Блокируем кнопку
    const submitBtn = document.getElementById('loginSubmit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
    
    try {
        // Вход через Supabase
        const { data, error } = await window.sb.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Успешный вход
        currentUser = data.user;
        
        // Сохраняем сессию если нужно
        if (rememberMe) {
            localStorage.setItem('supabase-auth-token', data.session.access_token);
        }
        
        showNotification('Успешный вход! Перенаправление...', 'success');
        
        // Анимация успеха
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Успешно!';
        
        // Перенаправление через 1.5 секунды
        setTimeout(() => {
            window.location.href = '/cabinet.html'; // Замените на ваш URL
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message || 'Ошибка входа', 'error');
        
        // Разблокируем кнопку
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Войти</span><i class="fas fa-arrow-right"></i>';
    }
}

// Обработка регистрации
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const phone = document.getElementById('registerPhone').value.replace(/\D/g, '');
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const privacyChecked = document.getElementById('privacyPolicy').checked;
    
    // Валидация
    let isValid = true;
    
    if (name.length < 2) {
        showFieldError('registerNameError', 'Введите корректное имя');
        isValid = false;
    }
    
    if (phone.length < 11) {
        showFieldError('registerPhoneError', 'Введите корректный телефон');
        isValid = false;
    }
    
    if (!validateEmail(email)) {
        showFieldError('registerEmailError', 'Введите корректный email');
        isValid = false;
    }
    
    if (password.length < 6) {
        showFieldError('registerPasswordError', 'Пароль должен быть не менее 6 символов');
        isValid = false;
    }
    
    if (password !== confirmPassword) {
        showFieldError('registerConfirmError', 'Пароли не совпадают');
        isValid = false;
    }
    
    if (!privacyChecked) {
        showFieldError('privacyError', 'Необходимо согласие с политикой конфиденциальности');
        isValid = false;
    }
    
    if (!isValid) return;
    
    // Очистка ошибок
    clearFieldErrors();
    
    // Блокируем кнопку
    const submitBtn = document.getElementById('registerSubmit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
    
    try {
        // 1. Регистрация в auth.users
        const { data: authData, error: authError } = await window.sb.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    phone: phone
                }
            }
        });
        
        if (authError) throw authError;
        
        // 2. Создание записи в profiles
        const { error: profileError } = await window.sb
            .from('profiles')
            .insert([
                {
                    id: authData.user.id,
                    name: name,
                    phone: phone,
                    role: 'user',
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ]);
        
        if (profileError) throw profileError;
        
        // 3. Добавление автомобиля если указан
        const carBrand = document.getElementById('carBrand').value;
        const carModel = document.getElementById('carModel').value;
        const carYear = document.getElementById('carYear').value;
        
        if (carBrand && carModel && carYear) {
            // Здесь можно добавить сохранение автомобиля в отдельную таблицу
            console.log('Car added:', { carBrand, carModel, carYear });
        }
        
        // Успешная регистрация
        showNotification('Регистрация успешна! Проверьте email для подтверждения', 'success');
        
        // Показываем модальное окно для записи на услугу
        setTimeout(() => {
            showServiceModal();
        }, 1000);
        
        // Переключаем на форму входа
        setTimeout(() => {
            document.getElementById('loginToggle').click();
        }, 2000);
        
    } catch (error) {
        console.error('Registration error:', error);
        showNotification(error.message || 'Ошибка регистрации', 'error');
    } finally {
        // Разблокируем кнопку
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Зарегистрироваться</span><i class="fas fa-arrow-right"></i>';
    }
}

// ==================== СОЦИАЛЬНАЯ АВТОРИЗАЦИЯ ====================
function initSocialAuth() {
    document.getElementById('googleLogin').addEventListener('click', () => {
        handleSocialLogin('google');
    });
    
    document.getElementById('appleLogin').addEventListener('click', () => {
        handleSocialLogin('apple');
    });
}

async function handleSocialLogin(provider) {
    try {
        const { data, error } = await window.sb.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: window.location.origin + '/cabinet.html' // Замените на ваш URL
            }
        });
        
        if (error) throw error;
        
    } catch (error) {
        console.error('Social login error:', error);
        showNotification(error.message || 'Ошибка входа через ' + provider, 'error');
    }
}

// ==================== ВОССТАНОВЛЕНИЕ ПАРОЛЯ ====================
function initForgotPassword() {
    document.getElementById('forgotPassword').addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = prompt('Введите ваш email для восстановления пароля:');
        
        if (!email) return;
        
        if (!validateEmail(email)) {
            showNotification('Введите корректный email', 'error');
            return;
        }
        
        try {
            const { error } = await window.sb.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password'
            });
            
            if (error) throw error;
            
            showNotification('Инструкция по восстановлению отправлена на ваш email', 'success');
            
        } catch (error) {
            console.error('Password reset error:', error);
            showNotification(error.message || 'Ошибка восстановления пароля', 'error');
        }
    });
}

// ==================== УВЕДОМЛЕНИЯ ====================
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// ==================== МОДАЛЬНОЕ ОКНО ====================
function showServiceModal() {
    const modal = document.getElementById('serviceModal');
    modal.classList.add('show');
}

window.closeModal = function() {
    const modal = document.getElementById('serviceModal');
    modal.classList.remove('show');
}

window.redirectToBooking = function() {
    window.location.href = '/booking'; // Замените на ваш URL
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(fieldId);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

function clearFieldErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
    });
}

// Защита от брутфорса (простейшая реализация)
let loginAttempts = 0;
let lastAttemptTime = Date.now();

function checkBruteforce() {
    const now = Date.now();
    
    // Сброс счетчика через 15 минут
    if (now - lastAttemptTime > 900000) {
        loginAttempts = 0;
    }
    
    lastAttemptTime = now;
    loginAttempts++;
    
    if (loginAttempts > 5) {
        showNotification('Слишком много попыток входа. Попробуйте через 15 минут', 'error');
        return false;
    }
    
    return true;
}

// Экспорт функций для глобального доступа
window.showNotification = showNotification;











// ==================== КНОПКА НАЗАД ====================
window.goToMainPage = function() {
    // Анимация нажатия
    const btn = document.querySelector('.back-button');
    if (btn) {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = '';
        }, 200);
    }
    
    // Показываем уведомление о возвращении
    showNotification('Возвращаемся на главную...', 'info');
    
    // Задержка для анимации
    setTimeout(() => {
        // Здесь укажите URL вашей главной страницы
        window.location.href = '/'; // Замените на нужный URL
        
        // Альтернатива: если нужно вернуться назад в истории
        // window.history.back();
    }, 300);
}

// Можно также добавить обработчик для клавиши Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Спрашиваем подтверждение перед выходом
        if (confirm('Вернуться на главную страницу?')) {
            goToMainPage();
        }
    }
});






















// ==================== БЫСТРЫЙ ВХОД АДМИНИСТРАТОРА ====================

// Функция для открытия модального окна администратора
window.showAdminLoginModal = function() {
    const modal = document.getElementById('adminLoginModal');
    if (modal) {
        modal.classList.add('show');
        
        // Очищаем поля ввода
        document.getElementById('adminEmail').value = '';
        document.getElementById('adminPassword').value = '';
        
        // Фокусируемся на поле email
        setTimeout(() => {
            document.getElementById('adminEmail').focus();
        }, 100);
    }
}

// Функция для закрытия модального окна
window.closeAdminModal = function() {
    const modal = document.getElementById('adminLoginModal');
    if (modal) {
        modal.classList.remove('show');
        
        // Очищаем поля при закрытии
        document.getElementById('adminEmail').value = '';
        document.getElementById('adminPassword').value = '';
    }
}

// Обработка входа администратора
window.handleAdminLogin = async function(event) {
    event.preventDefault();
    
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    
    // Валидация
    if (!email || !password) {
        showNotification('Введите email и пароль', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showNotification('Введите корректный email', 'error');
        return;
    }
    
    // Блокируем кнопку
    const submitBtn = document.getElementById('adminLoginSubmit');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
    
    try {
        // Вход через Supabase
        const { data, error } = await window.sb.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Проверяем роль администратора
        const { data: profile, error: profileError } = await window.sb
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
        
        if (profileError) throw profileError;
        
        if (profile.role !== 'admin') {
            // Если не админ, выходим из системы
            await window.sb.auth.signOut();
            showNotification('У вас нет прав администратора', 'error');
            
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            return;
        }
        
        // Успешный вход
        showNotification('✅ Успешный вход! Перенаправление...', 'success');
        
        // Закрываем модальное окно
        closeAdminModal();
        
        setTimeout(() => {
            showNotification('👑 Добро пожаловать, Администратор!', 'success');
        }, 500);
        
        setTimeout(() => {
            window.location.href = '/admin.html';
        }, 1500);
        
    } catch (error) {
        console.error('Admin login error:', error);
        
        let errorMessage = 'Ошибка входа';
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Неверный email или пароль';
        } else {
            errorMessage = error.message;
        }
        
        showNotification(`❌ ${errorMessage}`, 'error');
        
        // Разблокируем кнопку
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Добавляем горячие клавиши для быстрого открытия модального окна администратора (Ctrl+Alt+A)
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.altKey && e.key === 'a') {
        e.preventDefault();
        showAdminLoginModal();
    }
});

// Добавляем подсказку о горячих клавишах
setTimeout(() => {
    console.log('💡 Tip: Press Ctrl+Alt+A for admin login');
}, 3000);

// Дополнительная функция для проверки прав администратора
async function checkAdminAccess() {
    try {
        const { data: { user } } = await window.sb.auth.getUser();
        
        if (!user) {
            return false;
        }
        
        const { data: profile, error } = await window.sb
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        
        if (error) throw error;
        
        return profile.role === 'admin';
        
    } catch (error) {
        console.error('Error checking admin access:', error);
        return false;
    }
}

// Добавляем горячие клавиши для быстрого входа администратора (Ctrl+Alt+A)
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.altKey && e.key === 'a') {
        e.preventDefault();
        quickAdminLogin();
    }
});

// Добавляем подсказку о горячих клавишах
setTimeout(() => {
    console.log('💡 Tip: Press Ctrl+Alt+A for quick admin login');
}, 3000);