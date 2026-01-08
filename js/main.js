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

    if (!targetText) {
        console.warn('❗ stat-number без data-target:', element);
        return;
    }

    const target = parseInt(targetText.replace('+', ''), 10);
    if (isNaN(target)) return;

    let current = 0;
    const duration = 2500;
    const step = target / (duration / 20);

    const updateCounter = setInterval(() => {
        current += step;

        if (current < target) {
            element.innerText = targetText.includes('+')
                ? Math.ceil(current) + '+'
                : Math.ceil(current);
        } else {
            element.innerText = targetText;
            element.classList.add('is-counted');
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













// Функция для слайдера "до-после"
document.querySelectorAll('.before-after').forEach(block => {
    const input = block.querySelector('input');
    const before = block.querySelector('.before');
    const divider = block.querySelector('.divider');

    input.addEventListener('input', e => {
        before.style.width = e.target.value + '%';
        divider.style.left = e.target.value + '%';
    });

    // Добавляем поддержку касания для мобильных устройств
    input.addEventListener('touchstart', function (e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.getBoundingClientRect();
        const percent = (touch.clientX - rect.left) / rect.width * 100;
        const clampedPercent = Math.max(0, Math.min(100, percent));

        before.style.width = clampedPercent + '%';
        divider.style.left = clampedPercent + '%';
        this.value = clampedPercent;
    });

    input.addEventListener('touchmove', function (e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.getBoundingClientRect();
        const percent = (touch.clientX - rect.left) / rect.width * 100;
        const clampedPercent = Math.max(0, Math.min(100, percent));

        before.style.width = clampedPercent + '%';
        divider.style.left = clampedPercent + '%';
        this.value = clampedPercent;
    });
});

// Функция для центрирования активной кнопки фильтра
function centerActiveFilter() {
    const container = document.getElementById('filtersContainer');
    const activeFilter = container.querySelector('.filter.active');

    if (!activeFilter || window.innerWidth >= 768) return;

    // Вычисляем позицию для центрирования
    const containerWidth = container.offsetWidth;
    const filterWidth = activeFilter.offsetWidth;
    const filterLeft = activeFilter.offsetLeft;
    const filterCenter = filterLeft + (filterWidth / 2);

    // Прокручиваем контейнер, чтобы активный фильтр был по центру
    container.scrollLeft = filterCenter - (containerWidth / 2);
}

// Функция обновления счетчика работ
function updateWorkCount(visible, total) {
    const countElement = document.getElementById('workCount');
    if (countElement) {
        countElement.textContent = `Показано ${visible} из ${total} работ`;
    }
}

// Фильтрация карточек с центрированием активного фильтра
document.querySelectorAll('.filter').forEach(btn => {
    btn.addEventListener('click', function () {
        // Обновляем активную кнопку
        document.querySelector('.filter.active')?.classList.remove('active');
        this.classList.add('active');

        // Центрируем активный фильтр
        centerActiveFilter();

        // Фильтруем карточки
        const type = this.dataset.filter;
        const cards = document.querySelectorAll('.card');
        let visibleCount = 0;

        cards.forEach(card => {
            if (type === 'all' || card.dataset.category === type) {
                card.classList.remove('hidden');
                visibleCount++;
            } else {
                card.classList.add('hidden');
            }
        });

        // Обновляем счетчик
        updateWorkCount(visibleCount, cards.length);
    });
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация счетчика
    const allCards = document.querySelectorAll('.card').length;
    updateWorkCount(allCards, allCards);

    // Центрируем активный фильтр
    centerActiveFilter();

    // Добавляем плавное появление карточек
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });

    // Инициализация для адаптивности
    handleResize();
});

// Центрируем активный фильтр при изменении размера окна
window.addEventListener('resize', () => {
    // Задержка для завершения изменения размера
    setTimeout(centerActiveFilter, 100);
});

// Кнопка "Показать все работы"
document.getElementById('showAllBtn')?.addEventListener('click', function (e) {
    e.preventDefault();
    alert('В реальном проекте здесь будет загрузка дополнительных работ или переход на страницу портфолио');
});

// Адаптивное поведение для очень маленьких экранов
function handleResize() {
    const filters = document.querySelector('.filters');
    if (window.innerWidth < 576) {
        filters.style.justifyContent = 'flex-start';
    } else {
        filters.style.justifyContent = 'center';
    }
}

window.addEventListener('load', handleResize);
window.addEventListener('resize', handleResize);






// Инициализация при полной загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    // Инициализация AOS (Animate On Scroll)
    AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 100,
        disable: window.innerWidth < 768 ? true : false
    });

    // Инициализация Swiper для отзывов
    initSwiper();

    // Инициализация счетчиков
    initCounters();

    // Инициализация интерактивных элементов
    initProcessSteps();
    initVideoReviews();
    initUspCards();
    initCtaButton();

    // Адаптивные обработчики
    initResponsiveHandlers();

    // Анимация заголовков
    initTitleAnimations();

    // Инициализация модального окна для видео
    initVideoModal();
});

// ===== ИНИЦИАЛИЗАЦИЯ SWIPER =====
function initSwiper() {
    const swiperContainer = document.querySelector('.reviews-slider');
    if (!swiperContainer) return;

    const swiper = new Swiper('.reviews-slider', {
        slidesPerView: 1,
        spaceBetween: 30,
        loop: true,
        speed: 800,
        effect: 'slide',
        grabCursor: true,
        preventInteractionOnTransition: true,

        // Навигация
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },

        // Пагинация
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
            dynamicBullets: true,
        },

        // Автоплей
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
        },

        // Адаптивность
        breakpoints: {
            640: {
                slidesPerView: 2,
                spaceBetween: 20,
            },
            1024: {
                slidesPerView: 3,
                spaceBetween: 30,
            },
        },

        // Обработчики событий
        on: {
            init: function () {
                console.log('Swiper инициализирован');
            },
            slideChange: function () {
                // При смене слайда останавливаем все видео
                stopAllVideos();
            },
            touchStart: function () {
                // Останавливаем видео при касании
                stopAllVideos();
            }
        },
    });

    // Сохраняем ссылку на swiper для глобального доступа
    window.reviewsSwiper = swiper;
}

// ===== АНИМАЦИЯ СЧЕТЧИКОВ =====
function initCounters() {
    function animateCounter(counter) {
        if (!counter) return;

        const target = parseInt(counter.getAttribute('data-count') || counter.textContent.replace(/\D/g, ''));
        const duration = 2000; // 2 секунды
        const startTime = Date.now();
        const startValue = 0;

        function update() {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Используем ease-out функцию для более естественной анимации
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (target - startValue) * easeProgress);

            counter.textContent = currentValue.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                counter.textContent = target.toLocaleString();
            }
        }

        update();
    }

    // Запуск анимации счетчиков при скролле
    function checkCounters() {
        const statsSection = document.querySelector('.reviews-stats');
        if (!statsSection) return;

        function isElementInViewport(el) {
            const rect = el.getBoundingClientRect();
            return (
                rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.8 &&
                rect.bottom >= 0
            );
        }

        if (isElementInViewport(statsSection)) {
            const counters = document.querySelectorAll('.stat-number');
            counters.forEach(counter => {
                // Проверяем, не был ли уже анимирован этот счетчик
                if (!counter.classList.contains('animated')) {
                    animateCounter(counter);
                    counter.classList.add('animated');
                }
            });
        }
    }

    // Используем Intersection Observer для лучшей производительности
    const statsSection = document.querySelector('.reviews-stats');
    if (statsSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counters = document.querySelectorAll('.stat-number');
                    counters.forEach(counter => {
                        if (!counter.classList.contains('animated')) {
                            animateCounter(counter);
                            counter.classList.add('animated');
                        }
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.5,
            rootMargin: '50px'
        });

        observer.observe(statsSection);
    }

    // Также добавляем обработчик скролла для обратной совместимости
    window.addEventListener('scroll', checkCounters);
    // Проверяем сразу при загрузке
    setTimeout(checkCounters, 100);
}

// ===== ИНИЦИАЛИЗАЦИЯ ШАГОВ ПРОЦЕССА =====
function initProcessSteps() {
    const processSteps = document.querySelectorAll('.process-step');
    if (!processSteps.length) return;

    processSteps.forEach((step, index) => {
        // Устанавливаем начальные стили
        step.style.opacity = '0';
        step.style.transform = 'translateY(20px)';
        step.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

        // Плавное появление шагов
        setTimeout(() => {
            step.style.opacity = '1';
            step.style.transform = 'translateY(0)';
        }, index * 150);

        // Добавляем обработчики событий
        step.addEventListener('mouseenter', () => {
            step.style.zIndex = '10';
        });

        step.addEventListener('mouseleave', () => {
            step.style.zIndex = '';
        });
    });
}

// ===== ИНИЦИАЛИЗАЦИЯ ВИДЕО-ОТЗЫВОВ =====
function initVideoReviews() {
    // Обработчик для встроенных видео в карточках
    document.querySelectorAll('.review-media.video-review').forEach(wrapper => {
        const video = wrapper.querySelector('video');
        if (!video) return;

        wrapper.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Останавливаем все другие видео
            stopAllVideosExcept(video);

            if (video.paused) {
                // Начинаем воспроизведение
                video.muted = true; // Начинаем с выключенным звуком для автоплей
                video.play()
                    .then(() => {
                        video.muted = false;
                        wrapper.classList.add('playing');
                    })
                    .catch(err => {
                        console.warn('Autoplay blocked:', err);
                        // Показываем уведомление пользователю
                        showPlayNotification(wrapper);
                    });
            } else {
                // Останавливаем текущее видео
                video.pause();
                video.currentTime = 0;
                wrapper.classList.remove('playing');
            }
        });

        // Останавливаем видео при окончании воспроизведения
        video.addEventListener('ended', () => {
            video.currentTime = 0;
            wrapper.classList.remove('playing');
        });
    });

    // Обработчик для основного (фичерного) видео
    const mainVideoPlaceholder = document.querySelector('.video-placeholder');
    const mainVideo = document.querySelector('.featured-video');
    
    if (mainVideoPlaceholder && mainVideo) {
        const source = mainVideo.querySelector('source');
        
        mainVideoPlaceholder.addEventListener('click', () => {
            const videoSrc = mainVideoPlaceholder.dataset.video;
            if (!videoSrc || !source) return;

            // Останавливаем все другие видео
            stopAllVideos();

            // Подставляем и загружаем видео
            source.src = videoSrc;
            mainVideo.load();

            // Показываем плеер, скрываем плейсхолдер
            mainVideoPlaceholder.style.display = 'none';
            mainVideo.style.display = 'block';

            // Запускаем воспроизведение
            mainVideo.muted = true;
            mainVideo.play()
                .then(() => {
                    mainVideo.muted = false;
                    mainVideoPlaceholder.classList.add('playing');
                })
                .catch(err => {
                    console.warn('Main video autoplay blocked:', err);
                    // Показываем кнопку для ручного запуска
                    showVideoPlayButton(mainVideo);
                });
        });

        // Обработчик окончания видео
        mainVideo.addEventListener('ended', () => {
            mainVideo.style.display = 'none';
            mainVideoPlaceholder.style.display = 'flex';
            mainVideoPlaceholder.classList.remove('playing');
        });
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ МОДАЛЬНОГО ОКНА ДЛЯ ВИДЕО =====
function initVideoModal() {
    const modal = document.getElementById('videoModal');
    if (!modal) return;

    const modalVideo = modal.querySelector('#modalVideo');
    const source = modalVideo?.querySelector('source');
    const closeBtn = modal.querySelector('.video-modal__close');
    const overlay = modal.querySelector('.video-modal__overlay');

    if (!modalVideo || !source || !closeBtn || !overlay) return;

    // Закрываем модальное окно
    function closeModal() {
        modal.classList.remove('open');
        modalVideo.pause();
        modalVideo.currentTime = 0;
        source.src = '';
        
        // Восстанавливаем скролл страницы
        document.body.style.overflow = '';
    }

    // Открываем модальное окно с видео
    function openModal(videoSrc, videoId) {
        if (!videoSrc) return;

        // Останавливаем все видео на странице
        stopAllVideos();

        // Устанавливаем источник видео
        source.src = videoSrc;
        modalVideo.load();

        // Открываем модальное окно
        modal.classList.add('open');
        
        // Блокируем скролл страницы
        document.body.style.overflow = 'hidden';

        // Пытаемся запустить воспроизведение
        modalVideo.muted = true;
        modalVideo.play()
            .then(() => {
                modalVideo.muted = false;
            })
            .catch(err => {
                console.warn('Modal video autoplay blocked:', err);
            });
    }

    // Обработчики закрытия
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('open')) {
            closeModal();
        }
    });

    // Инициализация кликов на видео-карточки
    const videoCards = document.querySelectorAll('[data-video-modal]');
    videoCards.forEach(card => {
        card.addEventListener('click', () => {
            const videoSrc = card.dataset.videoSrc;
            const videoId = card.dataset.videoId;
            if (videoSrc) {
                openModal(videoSrc, videoId);
            }
        });
    });

    // Сохраняем функции для глобального доступа
    window.openVideoModal = openModal;
    window.closeVideoModal = closeModal;
}

// ===== ИНИЦИАЛИЗАЦИЯ КАРТОЧЕК УТП =====
function initUspCards() {
    const uspCards = document.querySelectorAll('.usp-card');
    if (!uspCards.length) return;

    // Параллакс эффект только на десктопе
    if (window.innerWidth >= 768) {
        document.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX / window.innerWidth;
            const mouseY = e.clientY / window.innerHeight;

            uspCards.forEach((card, index) => {
                const speed = 0.03;
                const x = (mouseX - 0.5) * 20 * speed;
                const y = (mouseY - 0.5) * 20 * speed;

                card.style.transform = `translateY(-10px) translate3d(${x}px, ${y}px, 0)`;
            });
        });
    }

    // Эффект при наведении
    uspCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transition = '';
        });
    });
}

// ===== ИНИЦИАЛИЗАЦИЯ CTA КНОПКИ =====
function initCtaButton() {
    const ctaButton = document.querySelector('.cta-button');
    if (!ctaButton) return;

    ctaButton.addEventListener('click', function (e) {
        e.preventDefault();
        
        // Анимация нажатия
        this.classList.add('clicked');
        setTimeout(() => {
            this.classList.remove('clicked');
        }, 300);

        // В реальном проекте здесь будет открытие формы
        console.log('CTA button clicked - opening booking form');
        
        // Пример: открытие модального окна с формой
        // openBookingModal();
        
        // Или скролл к форме
        const bookingForm = document.getElementById('booking-form');
        if (bookingForm) {
            bookingForm.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

// ===== ИНИЦИАЛИЗАЦИЯ АДАПТИВНЫХ ОБРАБОТЧИКОВ =====
function initResponsiveHandlers() {
    // Обработчик изменения размера окна
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            handleResize();
        }, 250);
    });

    function handleResize() {
        // Отключаем параллакс на мобильных
        const uspCards = document.querySelectorAll('.usp-card');
        if (window.innerWidth < 768) {
            uspCards.forEach(card => {
                card.style.transform = '';
            });
        }
        
        // Обновляем AOS для мобильных
        if (window.innerWidth < 768) {
            AOS.refreshHard();
        }
    }

    // Инициализация сразу
    handleResize();
}

// ===== АНИМАЦИЯ ЗАГОЛОВКОВ =====
function initTitleAnimations() {
    const titles = document.querySelectorAll('.section-title');
    if (!titles.length) return;

    // Добавляем стиль для анимации букв
    if (!document.querySelector('#title-animation-style')) {
        const style = document.createElement('style');
        style.id = 'title-animation-style';
        style.textContent = `
            @keyframes fadeInLetter {
                from { 
                    opacity: 0; 
                    transform: translateY(10px) rotateX(90deg); 
                }
                to { 
                    opacity: 1; 
                    transform: translateY(0) rotateX(0); 
                }
            }
            
            .letter-animated {
                display: inline-block;
                opacity: 0;
                animation: fadeInLetter 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }
        `;
        document.head.appendChild(style);
    }

    // Анимируем заголовки
    titles.forEach(title => {
        if (title.classList.contains('animated')) return;
        
        const text = title.textContent;
        title.innerHTML = '';
        
        for (let i = 0; i < text.length; i++) {
            const span = document.createElement('span');
            span.textContent = text[i];
            span.classList.add('letter-animated');
            span.style.animationDelay = `${i * 0.05}s`;
            span.style.display = text[i] === ' ' ? 'inline' : 'inline-block';
            title.appendChild(span);
        }
        
        title.classList.add('animated');
    });
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function stopAllVideos() {
    document.querySelectorAll('video').forEach(video => {
        if (!video.paused) {
            video.pause();
            video.currentTime = 0;
        }
        video.parentElement?.classList.remove('playing');
    });
}

function stopAllVideosExcept(exceptVideo) {
    document.querySelectorAll('video').forEach(video => {
        if (video !== exceptVideo && !video.paused) {
            video.pause();
            video.currentTime = 0;
            video.parentElement?.classList.remove('playing');
        }
    });
}

function showPlayNotification(wrapper) {
    // Создаем уведомление о необходимости кликнуть для воспроизведения
    const notification = document.createElement('div');
    notification.className = 'video-play-notification';
    notification.innerHTML = `
        <p>Кликните для воспроизведения видео</p>
        <button class="play-btn">▶️ Воспроизвести</button>
    `;
    
    notification.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        z-index: 100;
    `;
    
    wrapper.appendChild(notification);
    
    // Обработчик клика на кнопку воспроизведения
    notification.querySelector('.play-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const video = wrapper.querySelector('video');
        if (video) {
            video.play();
            wrapper.classList.add('playing');
            notification.remove();
        }
    });
    
    // Удаляем уведомление через 5 секунд
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function showVideoPlayButton(videoElement) {
    // Создаем кнопку воспроизведения поверх видео
    const playBtn = document.createElement('button');
    playBtn.className = 'manual-play-btn';
    playBtn.innerHTML = '▶';
    playBtn.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.9);
        color: white;
        border: none;
        font-size: 24px;
        cursor: pointer;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    videoElement.parentElement.style.position = 'relative';
    videoElement.parentElement.appendChild(playBtn);
    
    playBtn.addEventListener('click', () => {
        videoElement.play();
        playBtn.style.display = 'none';
    });
}

// ===== ОБРАБОТЧИКИ ДОСТУПНОСТИ =====
document.addEventListener('keydown', function (e) {
    // Навигация по Tab
    if (e.key === 'Tab') {
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        focusableElements.forEach(el => {
            el.addEventListener('focus', function () {
                this.style.outline = '2px solid var(--primary)';
                this.style.outlineOffset = '2px';
            });

            el.addEventListener('blur', function () {
                this.style.outline = 'none';
            });
        });
    }
    
    // Управление видео с клавиатуры
    if (e.key === ' ' || e.key === 'Spacebar') {
        const focusedVideo = document.activeElement.closest('.video-review')?.querySelector('video');
        if (focusedVideo) {
            e.preventDefault();
            if (focusedVideo.paused) {
                focusedVideo.play();
            } else {
                focusedVideo.pause();
            }
        }
    }
});

// ===== ПЛАВНЫЙ СКРОЛЛ ДЛЯ ЯКОРЕЙ =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#' || targetId === '#!') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            
            // Рассчитываем отступ для фиксированного header'а
            const headerHeight = document.querySelector('header')?.offsetHeight || 80;
            
            window.scrollTo({
                top: targetElement.offsetTop - headerHeight,
                behavior: 'smooth'
            });
            
            // Фокус для доступности
            targetElement.setAttribute('tabindex', '-1');
            targetElement.focus();
        }
    });
});

// ===== ОБРАБОТЧИК ПОЛНОЙ ЗАГРУЗКИ СТРАНИЦЫ =====
window.addEventListener('load', function () {
    document.body.classList.add('loaded');

    // Скрываем прелоадер если он есть
    const loader = document.querySelector('.page-loader');
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }, 300);
    }

    // Запускаем анимации после загрузки
    setTimeout(() => {
        initTitleAnimations();
    }, 100);
});

// ===== ОБРАБОТЧИКИ ДЛЯ SWIPER СЛАЙДОВ С ВИДЕО =====
// Обработчик для паузы видео при выходе из слайда
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.video-review video').forEach(video => {
        video.addEventListener('play', function () {
            // Останавливаем другие видео при запуске текущего
            stopAllVideosExcept(this);
        });
    });
});

// Экспортируем функции для глобального доступа
window.APP = {
    stopAllVideos,
    openVideoModal: window.openVideoModal,
    closeVideoModal: window.closeVideoModal
};