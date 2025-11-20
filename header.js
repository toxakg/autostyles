function initHeader() {
    // Элементы навигации
    const menuToggle = document.querySelector('.menu-toggle'); // бургер
    const mobileNav = document.querySelector('.mobile-nav');   // основное меню
    const closeBtn = document.querySelector('.close-menu-btn'); // кнопка "X"
    const menuItems = document.querySelectorAll('.menu-item.has-submenu'); // пункты с подменю

    // ===============================
    // 1️⃣ ФУНКЦИЯ ЗАКРЫТИЯ МОБИЛЬНОГО МЕНЮ
    // ===============================
    function closeMobileMenu() {
        if (mobileNav) mobileNav.classList.remove('active');
        if (menuToggle) {
            menuToggle.classList.remove('is-active');
            menuToggle.setAttribute('aria-expanded', false);
        }
        document.body.classList.remove('no-scroll');
    }

    // ===============================
    // 2️⃣ ОТКРЫТИЕ / ЗАКРЫТИЕ МЕНЮ (БУРГЕР)
    // ===============================
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
    if (closeBtn) {
        closeBtn.addEventListener('click', closeMobileMenu);
    }

    // ===============================
    // 3️⃣ АККОРДЕОН ДЛЯ ПОДМЕНЮ
    // ===============================
    if (menuItems.length > 0) {
        menuItems.forEach(item => {
            const link = item.querySelector('.menu-link');
            const toggleIcon = item.querySelector('.toggle-icon');
            const submenu = item.querySelector('.submenu');

            if (!link || !submenu) return;

            link.addEventListener('click', function (e) {
                e.preventDefault();
                menuItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                        const otherSubmenu = otherItem.querySelector('.submenu');
                        const otherIcon = otherItem.querySelector('.toggle-icon');
                        if (otherSubmenu) otherSubmenu.style.display = 'none';
                        if (otherIcon) otherIcon.textContent = '+';
                    }
                });

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

    // ===============================
    // 4️⃣ DROPDOWN-КНОПКИ НА МОБИЛЬНОМ
    // ===============================
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
