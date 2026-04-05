// ========== КОНФИГУРАЦИЯ ==========
const managers = [
    { name: "🏢 КСиПТ", tg: "ICE_SHOP39" },
    { name: "🏘️ Гурьевск", tg: "IceShop_Gur" },
    { name: "🌆 Калининград", tg: "IceShop_KLND" }
];

const categoryFiles = {
    "Жидкости": "Zhitkosty.json",
    "Снюс": "Snus.json",
    "Вейпы": "Vapes.json",
    "Испарители": "Ispariteli.json",
    "Картриджи": "Kartdritzhy.json",
    "Одноразки": "Odnorazki.json"
};

const categories = [
    { id: "Жидкости", name: "Жидкости", icon: "💧" },
    { id: "Снюс", name: "Снюс", icon: "👅" },
    { id: "Вейпы", name: "Вейпы", icon: "💨" },
    { id: "Испарители", name: "Испарители", icon: "🔥" },
    { id: "Картриджи", name: "Картриджи", icon: "⚡" },
    { id: "Одноразки", name: "Одноразки", icon: "🔄" }
];

let allItems = {
    "Жидкости": [],
    "Снюс": [],
    "Вейпы": [],
    "Испарители": [],
    "Картриджи": [],
    "Одноразки": []
};
let currentCategory = null;

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatStock(stock) {
    if (stock === undefined || stock === null) {
        return { text: "Нет в наличии", isOutOfStock: true };
    }
    
    let numStock = Number(stock);
    if (!isNaN(numStock) && typeof stock !== 'boolean') {
        if (numStock <= 0) return { text: "Нет в наличии", isOutOfStock: true };
        if (numStock < 5) return { text: numStock + " шт", isLow: true, isOutOfStock: false };
        return { text: numStock + " шт", isOutOfStock: false };
    }
    
    const stockStr = String(stock).toLowerCase().trim();
    if (stockStr === "нет в наличии" || stockStr === "0" || stockStr === "out of stock") {
        return { text: "Нет в наличии", isOutOfStock: true };
    }
    
    return { text: "Нет в наличии", isOutOfStock: true };
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function loadCategory(catName) {
    const file = categoryFiles[catName];
    if (!file) return [];
    const url = `https://raw.githubusercontent.com/LoysitDeflonDon/iceshop39-data/refs/heads/main/${file}`;
    try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const text = await res.text();
        let clean = text.trim();
        if (clean.startsWith('\uFEFF')) clean = clean.substring(1);
        try {
            return JSON.parse(clean);
        } catch(e) {
            if (file === "Ispariteli.json") {
                const match = clean.match(/\[\s*\{[\s\S]*?\}\s*\]/);
                if (match) return JSON.parse(match[0]);
            }
            return [];
        }
    } catch(e) {
        console.error(`Ошибка загрузки ${catName}:`, e);
        return [];
    }
}

async function loadAllData() {
    for (const cat of categories) {
        allItems[cat.name] = await loadCategory(cat.name);
    }
    renderCategories();
    renderManagers();
}

// ========== ОТРИСОВКА КОМПОНЕНТОВ ==========
function renderManagers() {
    const container = document.getElementById('managersGrid');
    if (!container) return;
    container.innerHTML = managers.map(m => `
        <a href="https://t.me/${m.tg}" target="_blank" class="manager-card">
            <span>${m.name}</span>
        </a>
    `).join('');
}

function getCount(catName) {
    return allItems[catName]?.length || 0;
}

function renderCategories() {
    const container = document.getElementById("categoriesGrid");
    if (!container) return;
    container.innerHTML = categories.map(cat => `
        <div class="category-card" data-category="${cat.name}">
            <div class="category-icon">${cat.icon}</div>
            <div class="category-name">${cat.name}</div>
            <div class="category-count">${getCount(cat.name)} товаров</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => openCategory(card.dataset.category));
    });
}

function openCategory(catName) {
    currentCategory = catName;
    const items = allItems[catName] || [];
    
    document.getElementById('mainPage').style.display = 'none';
    document.getElementById('productsPage').classList.add('active');
    document.getElementById('flavorsPage').classList.remove('active');
    document.getElementById('productsPageTitle').textContent = catName;
    
    const container = document.getElementById('productsContainer');
    if (!items.length) {
        container.innerHTML = '<div class="empty-msg">📭 Товары отсутствуют.</div>';
        return;
    }
    
    container.innerHTML = items.map(item => {
        // Используем деструктуризацию для безопасного доступа к полям
        const itemName = escapeHtml(item.name);
        const itemImage = item.image || 'https://placehold.co/400x300/1E293B/3B82F6?text=No+Image';
        
        if (item.flavors?.length) {
            const prices = item.flavors.map(f => f.price);
            const minPrice = Math.min(...prices);
            return `
                <div class="product-card" data-id="${item.id}" data-has-flavors="true">
                    <img class="product-image" src="${itemImage}" loading="lazy" onerror="this.src='https://placehold.co/400x300/1E293B/3B82F6?text=No+Image'">
                    <div class="product-title">${itemName}</div>
                    <div class="product-price">от ${minPrice} ₽</div>
                </div>
            `;
        } else {
            const itemPrice = item.price || 0;
            const itemDesc = escapeHtml(item.desc || '');
            return `
                <div class="product-card" data-id="${item.id}" data-has-flavors="false">
                    <img class="product-image" src="${itemImage}" loading="lazy" onerror="this.src='https://placehold.co/400x300/1E293B/3B82F6?text=No+Image'">
                    <div class="product-title">${itemName}</div>
                    <div class="product-price">${itemPrice} ₽</div>
                    <div class="product-desc">${itemDesc}</div>
                    <button class="order-pill" data-order-name="${itemName}" data-order-price="${itemPrice}">📦 Заказать</button>
                </div>
            `;
        }
    }).join('');
    
    // Обработчики для кнопок заказа
    document.querySelectorAll('.order-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const name = btn.dataset.orderName;
            const price = btn.dataset.orderPrice;
            showManagerModal(name, 'стандарт', price, (tg) => orderViaTelegram(name, 'стандарт', price, tg));
        });
    });
    
    // Обработчики для карточек с вариантами
    document.querySelectorAll('.product-card[data-has-flavors="true"]').forEach(card => {
        const id = parseInt(card.dataset.id);
        const item = items.find(i => i.id === id);
        if (item?.flavors) {
            card.addEventListener('click', () => openFlavors(item));
        }
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openFlavors(parentItem) {
    document.getElementById('productsPage').classList.remove('active');
    document.getElementById('flavorsPage').classList.add('active');
    document.getElementById('flavorsPageTitle').textContent = `${parentItem.name} — все варианты`;
    
    const container = document.getElementById('flavorsContainer');
    if (!parentItem.flavors?.length) {
        container.innerHTML = '<div class="empty-msg">📭 Список вариантов пуст.</div>';
        return;
    }
    
    container.innerHTML = `
        <div class="flavors-list">
            ${parentItem.flavors.map(f => {
                const stockInfo = formatStock(f.stock);
                const flavorName = escapeHtml(f.name);
                const flavorDesc = f.desc ? `<div style="font-size:0.75rem; color:#64748B;">${escapeHtml(f.desc)}</div>` : '';
                return `
                    <div class="flavor-item">
                        <div class="flavor-name">
                            ${flavorName}
                            ${flavorDesc}
                        </div>
                        <span class="flavor-price">${f.price} ₽</span>
                        <span class="flavor-stock ${stockInfo.isOutOfStock || stockInfo.isLow ? 'stock-low' : ''}">
                            ${stockInfo.text}
                        </span>
                        <button class="flavor-order-btn" 
                                data-flavor-name="${flavorName}" 
                                data-flavor-price="${f.price}" 
                                ${stockInfo.isOutOfStock ? 'disabled' : ''}>
                            📦 Заказать
                        </button>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    document.querySelectorAll('.flavor-order-btn:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            const name = btn.dataset.flavorName;
            const price = btn.dataset.flavorPrice;
            showManagerModal(parentItem.name, name, price, (tg) => orderViaTelegram(parentItem.name, name, price, tg));
        });
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== ЗАКАЗЫ И МОДАЛКИ ==========
function orderViaTelegram(productName, variant, price, managerTg) {
    const msg = `Здравствуйте! Хочу заказать: ${productName}, ${variant} — ${price} ₽`;
    window.open(`https://t.me/${managerTg}?text=${encodeURIComponent(msg)}`, '_blank');
}

function showOrderModal(productName, variant, price, callback) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'order-modal';
    modalDiv.style.display = 'flex';
    modalDiv.innerHTML = `
        <div class="order-content">
            <h3>📦 Оформление заказа</h3>
            <div class="product-detail" style="margin:15px 0;padding:10px;background:#1E293B;border-radius:12px;">
                ${escapeHtml(productName)}<br>${escapeHtml(variant)}<br><strong>${price} ₽</strong>
            </div>
            <div class="order-checkbox">
                <input type="checkbox" id="orderAgeConfirm">
                <label for="orderAgeConfirm">Подтверждаю, что мне есть 18 лет</label>
            </div>
            <button class="order-submit" id="submitOrderBtn" disabled>📤 Отправить заказ</button>
            <button class="cancel-order" id="cancelOrderBtn">Отмена</button>
        </div>
    `;
    document.body.appendChild(modalDiv);
    
    const orderCheck = modalDiv.querySelector('#orderAgeConfirm');
    const submitBtn = modalDiv.querySelector('#submitOrderBtn');
    
    orderCheck.addEventListener('change', () => {
        submitBtn.disabled = !orderCheck.checked;
    });
    
    submitBtn.onclick = () => {
        if (orderCheck.checked) {
            modalDiv.remove();
            callback();
        }
    };
    
    modalDiv.querySelector('#cancelOrderBtn').onclick = () => modalDiv.remove();
}

function showManagerModal(productName, variant, price, callback) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.style.display = 'flex';
    modalDiv.innerHTML = `
        <div class="modal-content">
            <h3>📱 Выберите менеджера</h3>
            <div id="managerOptionsTemp"></div>
            <button class="cancel-modal" id="cancelManagerBtn">Отмена</button>
        </div>
    `;
    document.body.appendChild(modalDiv);
    
    const opts = modalDiv.querySelector('#managerOptionsTemp');
    opts.innerHTML = managers.map(m => `
        <div class="manager-option" data-tg="${m.tg}">
            ${escapeHtml(m.name)}
        </div>
    `).join('');
    
    modalDiv.querySelectorAll('.manager-option').forEach(opt => {
        opt.addEventListener('click', () => {
            modalDiv.remove();
            showOrderModal(productName, variant, price, () => callback(opt.dataset.tg));
        });
    });
    
    modalDiv.querySelector('#cancelManagerBtn').onclick = () => modalDiv.remove();
}

// ========== НАВИГАЦИЯ ==========
function goToHome() {
    document.getElementById('mainPage').style.display = 'block';
    document.getElementById('productsPage').classList.remove('active');
    document.getElementById('flavorsPage').classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBackToCategory() {
    document.getElementById('flavorsPage').classList.remove('active');
    document.getElementById('productsPage').classList.add('active');
    if (currentCategory) {
        openCategory(currentCategory);
    }
}

function handleScroll() {
    const header = document.getElementById('header');
    if (window.scrollY > 100) {
        header.classList.add('visible');
    } else {
        header.classList.remove('visible');
    }
}

// ========== РОТАЦИЯ ФОНОВ ==========
const backgrounds = [
    "https://i.ibb.co/5hYz909b/istockphoto-1399967405-612x612.jpg",
    "https://i.ibb.co/mrGR4qTc/2026-04-05-122820613.png",
    "https://i.ibb.co/YBH1vwHc/2026-04-05-122925535.png"
];
let bgIndex = 0;
const hero = document.getElementById('heroSection');
if (hero) {
    setInterval(() => {
        bgIndex = (bgIndex + 1) % backgrounds.length;
        hero.style.backgroundImage = `url('${backgrounds[bgIndex]}')`;
    }, 4500);
}

// ========== ВОЗРАСТНАЯ ПРОВЕРКА ==========
const ageModal = document.getElementById('ageModal');
const ageCheckbox = document.getElementById('ageCheckbox');
const confirmAgeBtn = document.getElementById('confirmAgeBtn');

if (localStorage.getItem('ageConfirmed') === 'true') {
    if (ageModal) ageModal.style.display = 'none';
    document.body.style.overflow = 'auto';
} else {
    document.body.style.overflow = 'hidden';
}

if (ageCheckbox && confirmAgeBtn) {
    ageCheckbox.addEventListener('change', () => {
        confirmAgeBtn.disabled = !ageCheckbox.checked;
    });
    
    confirmAgeBtn.addEventListener('click', () => {
        if (ageCheckbox.checked) {
            localStorage.setItem('ageConfirmed', 'true');
            if (ageModal) ageModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.getElementById('backHomeBtn')?.addEventListener('click', goToHome);
document.getElementById('backFlavorsHomeBtn')?.addEventListener('click', goBackToCategory);
document.getElementById('homeLogoBtn')?.addEventListener('click', goToHome);
document.getElementById('scrollHint')?.addEventListener('click', () => {
    document.getElementById('categoriesSection')?.scrollIntoView({ behavior: 'smooth' });
});
window.addEventListener('scroll', handleScroll);

loadAllData();
handleScroll();
