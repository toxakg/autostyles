// ===============================
// Функция подгрузки HTML
// ===============================
async function loadHTML(selector, url, callback) {
    const element = document.querySelector(selector);
    if (!element) return;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Ошибка загрузки: ${url}`);
        element.innerHTML = await response.text();

        // После вставки HTML вызываем JS
        if (typeof callback === 'function') callback();

    } catch (err) {
        console.error(err);
    }
}

// ===============================
// Инициализация header после подгрузки
// ===============================
function initHeader() {
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    const closeBtn = document.querySelector('.close-menu-btn');
    const menuItems = document.querySelectorAll('.menu-item.has-submenu');

    // Функция закрытия мобильного меню
    function closeMobileMenu() {
        if (mobileNav) mobileNav.classList.remove('active');
        if (menuToggle) {
            menuToggle.classList.remove('is-active');
            menuToggle.setAttribute('aria-expanded', false);
        }
        document.body.classList.remove('no-scroll');
    }

    // Открытие / закрытие меню (бургер)
    if (menuToggle && mobileNav) {
        menuToggle.addEventListener('click', function () {
            const isOpen = mobileNav.classList.contains('active');
            if (isOpen) {
                closeMobileMenu();
            } else {
                mobileNav.classList.add('active');
                menuToggle.classList.add('is-active');
                menuToggle.setAttribute('aria-expanded', true);
                document.body.classList.add('no-scroll');
            }
        });
    }

    // Кнопка "X" закрывает меню
    if (closeBtn) closeBtn.addEventListener('click', closeMobileMenu);

    // Аккордеон для подменю
    if (menuItems.length > 0) {
        menuItems.forEach(item => {
            const link = item.querySelector('.menu-link');
            const toggleIcon = item.querySelector('.toggle-icon');
            const submenu = item.querySelector('.submenu');

            if (!link || !submenu) return;

            link.addEventListener('click', function (e) {
                e.preventDefault();
                // Закрываем другие подменю
                menuItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                        const otherSubmenu = otherItem.querySelector('.submenu');
                        const otherIcon = otherItem.querySelector('.toggle-icon');
                        if (otherSubmenu) otherSubmenu.style.display = 'none';
                        if (otherIcon) otherIcon.textContent = '+';
                    }
                });

                // Переключаем текущее подменю
                item.classList.toggle('active');
                if (item.classList.contains('active')) {
                    submenu.style.display = 'block';
                    if (toggleIcon) toggleIcon.textContent = '—';
                    link.setAttribute('aria-expanded', 'true');
                } else {
                    submenu.style.display = 'none';
                    if (toggleIcon) toggleIcon.textContent = '+';
                    link.setAttribute('aria-expanded', 'false');
                }
            });

            if (toggleIcon) {
                toggleIcon.addEventListener('click', function (e) {
                    e.preventDefault();
                    link.click();
                });
            }
        });
    }

    // Dropdown кнопки на мобильном
    const dropdowns = document.querySelectorAll('.dropdown-btn');
    if (dropdowns.length > 0) {
        dropdowns.forEach(btn => {
            btn.addEventListener('click', function (e) {
                if (window.innerWidth <= 767) {
                    e.preventDefault();
                    const menu = this.closest('.dropdown')?.querySelector('.dropdown-menu');
                    if (menu) {
                        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                    }
                }
            });
        });
    }
}

// ===============================
// Подгружаем header и footer
// ===============================
loadHTML('#header-placeholder', 'header.html', initHeader);
loadHTML('#footer-placeholder', 'footer.html');

// ===============================
// Scroll для desktop-header
// ===============================
document.addEventListener("scroll", () => {
    const header = document.querySelector(".desktop-header");
    if (!header) return;
    if (window.scrollY > 10) {
        header.classList.add("scrolled");
    } else {
        header.classList.remove("scrolled");
    }
});

// ===============================
// IntersectionObserver для карточек
// ===============================
document.addEventListener("DOMContentLoaded", function () {
    const cards = document.querySelectorAll('.product-card');
    if (cards.length === 0) return;

    const options = { root: null, rootMargin: '0px', threshold: 0.1 };
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, options);

    cards.forEach(card => observer.observe(card));
});







// js/statistics.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Функция для анимации счета
    const animateCounter = (element) => {
        const targetText = element.getAttribute('data-target');
        // Убираем потенциальный знак "+" для корректного парсинга числа
        const target = parseInt(targetText.replace('+', ''));
        let current = 0;
        const duration = 2500; // Длительность анимации (2.5 секунды)
        const step = target / (duration / 20); // Шаг для интервала в 20 мс

        const updateCounter = setInterval(() => {
            current += step;

            if (current < target) {
                // Если target - это "50+", добавляем "+" в конце
                const displayValue = targetText.includes('+')
                    ? Math.ceil(current) + '+'
                    : Math.ceil(current);

                element.innerText = displayValue;
            } else {
                element.innerText = targetText; // Устанавливаем точное целевое значение (включая "+")
                element.classList.add('is-counted'); // Меняем цвет через CSS
                clearInterval(updateCounter);
            }
        }, 20);
    };

    // 2. Создаем Intersection Observer
    const counters = document.querySelectorAll('.stat-number');
    const options = {
        root: null,
        threshold: 0.4 // Срабатывает, когда 40% элемента видно
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Начинаем анимацию и перестаем наблюдать
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, options);

    // 3. Начинаем наблюдение
    counters.forEach(counter => {
        // Устанавливаем начальное значение 0
        counter.innerText = '0';
        observer.observe(counter);
    });
});








// --- Скрипт для маски телефона ---

document.addEventListener('DOMContentLoaded', () => {
    const phoneInput = document.getElementById('phone');

    if (phoneInput) {
        phoneInput.addEventListener('input', onPhoneInput);
        phoneInput.addEventListener('keydown', onPhoneKeyDown);
        phoneInput.addEventListener('paste', onPhonePaste);
    }
});

// Форматирует номер телефона
function formatPhoneNumber(value) {
    if (!value) return value;

    const phoneNumber = value.replace(/[^\d]/g, '');
    const prefix = "+996";

    if (phoneNumber.length < 4) {
        return prefix;
    }

    // Начинаем форматирование после кода страны (996)
    let formattedNumber = prefix + " (";

    if (phoneNumber.length > 3) {
        formattedNumber += phoneNumber.substring(3, 6);
    }
    if (phoneNumber.length >= 6) {
        formattedNumber += ") " + phoneNumber.substring(6, 8);
    }
    if (phoneNumber.length >= 8) {
        formattedNumber += "-" + phoneNumber.substring(8, 10);
    }
    if (phoneNumber.length >= 10) {
        formattedNumber += "-" + phoneNumber.substring(10, 12);
    }

    // Ограничиваем общую длину 18 символами "+996 (XXX) XX-XX-XX"
    return formattedNumber.substring(0, 18);
}

// Обработчик ввода
function onPhoneInput(e) {
    const input = e.target;
    const selectionStart = input.selectionStart;
    const oldValue = input.value;

    const formattedValue = formatPhoneNumber(input.value);
    input.value = formattedValue;

    // Восстанавливаем позицию курсора
    if (selectionStart !== null) {
        // Пытаемся угадать новую позицию курсора
        // Это упрощенная логика, которая может быть неидеальной
        if (oldValue.length < formattedValue.length) {
            input.setSelectionRange(selectionStart + 1, selectionStart + 1);
        } else {
            input.setSelectionRange(selectionStart, selectionStart);
        }
    }
}

// Обработчик нажатия клавиш (для Backspace)
function onPhoneKeyDown(e) {
    const input = e.target;
    // Если нажат Backspace и курсор в конце " (", ") " или "-", удаляем весь блок
    if (e.key === 'Backspace' && input.value.length > 5) {
        const pos = input.selectionStart;
        if (input.value[pos - 1] === ' ' || input.value[pos - 1] === ')' || input.value[pos - 1] === '-') {
            // Предотвращаем стандартное поведение
            e.preventDefault();
            // Удаляем 3 символа " (X" или 2 символа ") "
            let charsToRemove = (input.value[pos - 1] === ' ' || input.value[pos - 1] === '-') ? 2 : 3;
            let newValue = input.value.substring(0, pos - charsToRemove);
            input.value = formatPhoneNumber(newValue); // Переформатируем
            input.setSelectionRange(input.value.length, input.value.length);
        } else if (input.value.slice(0, 5) === '+996 (' && pos <= 5) {
            e.preventDefault(); // Не даем удалить "+996 ("
        }
    }
}

// Обработчик вставки из буфера
function onPhonePaste(e) {
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData('text');
    const formatted = formatPhoneNumber(pasteData);
    document.execCommand('insertText', false, formatted.replace(e.target.value, ''));
}

























document.addEventListener("DOMContentLoaded", () => {
    const elements = document.querySelectorAll(".service-text h2, .service-text p, .service-img");
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = "translateY(0)";
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    elements.forEach(el => {
        el.style.opacity = 0;
        el.style.transform = "translateY(40px)";
        observer.observe(el);
    });
});







document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll(".service-card");

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
                entry.target.style.animation = "fadeInUp 1s ease forwards";
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    cards.forEach(card => observer.observe(card));
});



// Анимация появления карточек при прокрутке
document.addEventListener('DOMContentLoaded', function () {
    const serviceCards = document.querySelectorAll('.service-card');

    // Создаем наблюдатель для анимации при прокрутке
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Добавляем задержку для каждой карточки
                const index = Array.from(serviceCards).indexOf(entry.target);
                entry.target.style.transitionDelay = `${index * 0.1}s`;
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Наблюдаем за каждой карточкой
    serviceCards.forEach(card => {
        observer.observe(card);
    });

    // Обработчики для кнопок "Подробнее"
    const cardButtons = document.querySelectorAll('.card-button');
    cardButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            const card = this.closest('.service-card');
            const serviceName = card.querySelector('h3').textContent;
            alert(`Вы выбрали услугу: ${serviceName}. В ближайшее время с вами свяжется наш менеджер!`);
        });
    });
});





// Анимация появления этапов при прокрутке
document.addEventListener('DOMContentLoaded', function () {
    const processSteps = document.querySelectorAll('.process-step');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Добавляем задержку для каждого этапа
                const index = Array.from(processSteps).indexOf(entry.target);
                entry.target.style.transitionDelay = `${index * 0.2}s`;
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    });

    processSteps.forEach(step => {
        observer.observe(step);
    });
});





document.addEventListener("DOMContentLoaded", () => {
    const section = document.querySelector(".work-time");
    if (!section) return; // <— защита от отсутствия элемента

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const title = section.querySelector(".time-title");
                const desc = section.querySelector(".time-desc");
                if (title) title.style.animation = "fadeInDown 1s ease-out forwards";
                if (desc) desc.style.animation = "fadeInUp 1.2s ease-out 0.3s forwards";
                observer.unobserve(section);
            }
        });
    }, { threshold: 0.2 });

    observer.observe(section);
});






document.addEventListener("DOMContentLoaded", () => {
    const priceEl = document.querySelector(".price-value");
    if (!priceEl) return; // 🧩 предотвращает ошибку, если элемента нет

    const target = parseInt(priceEl.dataset.value, 10);
    let current = 0;
    let animated = false;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !animated) {
                animated = true;
                const step = target / 60; // скорость счётчика
                const interval = setInterval(() => {
                    current += step;
                    if (current >= target) {
                        current = target;
                        clearInterval(interval);
                    }
                    priceEl.textContent = Math.floor(current).toLocaleString("ru-RU");
                }, 30);
                observer.unobserve(priceEl);
            }
        });
    }, { threshold: 0.5 });

    observer.observe(priceEl);
});






document.addEventListener("DOMContentLoaded", () => {
    const items = document.querySelectorAll(".gallery-item");

    const observer = new IntersectionObserver(
        entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationDelay = `${Math.random() * 0.5}s`;
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.2 }
    );

    items.forEach(item => observer.observe(item));
});





document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        root: null,
        threshold: 0.1,
        rootMargin: '0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 1s ease-out forwards';
            }
        });
    }, observerOptions);

    // Наблюдаем все карточки отзывов
    document.querySelectorAll('.review-card').forEach(card => {
        observer.observe(card);
    });

    // Добавляем плавную прокрутку при клике на карточку
    document.querySelectorAll('.review-card').forEach(card => {
        card.addEventListener('click', function () {
            const stars = this.querySelectorAll('.star');
            stars.forEach((star, index) => {
                star.style.transform = `scale(1.2) rotate(${index * 10}deg)`;
                setTimeout(() => {
                    star.style.transform = 'scale(1.1)';
                }, 300);
            });
        });
    });
});

































































