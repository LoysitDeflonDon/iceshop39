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

// ========== TELEGRAM БОТ ДЛЯ УВЕДОМЛЕНИЙ АДМИНА ==========
const ADMIN_BOT_TOKEN = "8552470788:AAGB1Q36M-gPlnTebMXJWw8e8GmcCXk00y4";
const ADMIN_CHAT_ID = "6919484181";

// ========== КОРЗИНА ==========
let cart = [];

// ========== ИЗБРАННОЕ ==========
let favorites = [];

function loadFavorites() {
    const saved = localStorage.getItem('favorites');
    if (saved) favorites = JSON.parse(saved);
    else favorites = [];
    renderFavoritesBlock();
}

function saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderFavoritesBlock();
}

function toggleFavorite(itemId, itemName, itemImage, itemPrice, itemCategory) {
    const index = favorites.findIndex(f => f.id === itemId);
    if (index === -1) {
        favorites.push({
            id: itemId,
            name: itemName,
            image: itemImage,
            price: itemPrice,
            category: itemCategory
        });
        showToast("❤️ Добавлено в избранное", false);
    } else {
        favorites.splice(index, 1);
        showToast("💔 Удалено из избранного", false);
    }
    saveFavorites();
    updateFavoriteButtons();
}

function isFavorite(itemId) {
    return favorites.some(f => f.id === itemId);
}

function renderFavoritesBlock() {
    const section = document.getElementById('favoritesSection');
    const container = document.getElementById('favoritesContainer');
    if (!section || !container) return;
    
    if (favorites.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';
    container.innerHTML = favorites.map(item => `
        <div class="favorite-card" data-id="${item.id}" data-category="${item.category}">
            <button class="remove-favorite" data-id="${item.id}">✖</button>
            <img class="favorite-image" src="${item.image || 'https://placehold.co/200x200/1E293B/3B82F6?text=No+Image'}" loading="lazy">
            <div class="favorite-name">${escapeHtml(item.name)}</div>
            <div class="favorite-price">${item.price} ₽</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.favorite-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-favorite')) return;
            const category = card.dataset.category;
            const id = parseInt(card.dataset.id);
            openCategory(category);
            setTimeout(() => {
                const items = allItems[category];
                const item = items.find(i => i.id === id);
                if (item?.flavors) openFlavors(item);
            }, 100);
        });
    });
    
    document.querySelectorAll('.remove-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            favorites = favorites.filter(f => f.id !== id);
            saveFavorites();
            updateFavoriteButtons();
            showToast("🗑️ Удалено из избранного", false);
        });
    });
}

function updateFavoriteButtons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const id = parseInt(btn.dataset.id);
        if (isFavorite(id)) {
            btn.classList.add('active');
            btn.textContent = '❤️';
        } else {
            btn.classList.remove('active');
            btn.textContent = '🤍';
        }
    });
}

// ========== СРАВНЕНИЕ ==========
let compareItems = [];

function loadCompare() {
    const saved = localStorage.getItem('compare');
    if (saved) compareItems = JSON.parse(saved);
    else compareItems = [];
    renderCompareBlock();
}

function saveCompare() {
    localStorage.setItem('compare', JSON.stringify(compareItems));
    renderCompareBlock();
}

function toggleCompare(itemId, itemName, itemImage, itemPrice, itemCategory) {
    const index = compareItems.findIndex(c => c.id === itemId);
    if (index === -1) {
        if (compareItems.length >= 4) {
            showToast("❌ Можно сравнить не более 4 товаров", true);
            return;
        }
        compareItems.push({
            id: itemId,
            name: itemName,
            image: itemImage,
            price: itemPrice,
            category: itemCategory
        });
        showToast("🔄 Добавлено в сравнение", false);
    } else {
        compareItems.splice(index, 1);
        showToast("🔄 Удалено из сравнения", false);
    }
    saveCompare();
    updateCompareCheckboxes();
}

function isInCompare(itemId) {
    return compareItems.some(c => c.id === itemId);
}

function renderCompareBlock() {
    const section = document.getElementById('compareSection');
    const container = document.getElementById('compareContainer');
    if (!section || !container) return;
    
    if (compareItems.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';
    container.innerHTML = compareItems.map(item => `
        <div class="compare-card" data-id="${item.id}" data-category="${item.category}">
            <button class="remove-compare" data-id="${item.id}">✖</button>
            <img class="compare-image" src="${item.image || 'https://placehold.co/200x200/1E293B/3B82F6?text=No+Image'}" loading="lazy">
            <div class="compare-name">${escapeHtml(item.name)}</div>
            <div class="compare-price">${item.price} ₽</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.compare-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-compare')) return;
            const category = card.dataset.category;
            const id = parseInt(card.dataset.id);
            openCategory(category);
            setTimeout(() => {
                const items = allItems[category];
                const item = items.find(i => i.id === id);
                if (item?.flavors) openFlavors(item);
            }, 100);
        });
    });
    
    document.querySelectorAll('.remove-compare').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            compareItems = compareItems.filter(c => c.id !== id);
            saveCompare();
            updateCompareCheckboxes();
            showToast("🗑️ Удалено из сравнения", false);
        });
    });
}

function updateCompareCheckboxes() {
    document.querySelectorAll('.compare-checkbox input').forEach(cb => {
        const id = parseInt(cb.dataset.id);
        cb.checked = isInCompare(id);
    });
}

// ========== ПОПУЛЯРНЫЕ ТОВАРЫ (ЧАЩЕ ВСЕГО СМОТРЯТ) ==========
let viewStats = {};

function loadViewStats() {
    const saved = localStorage.getItem('view_stats');
    if (saved) viewStats = JSON.parse(saved);
    else viewStats = {};
}

function saveViewStats() {
    localStorage.setItem('view_stats', JSON.stringify(viewStats));
}

function recordView(itemId, itemName, itemImage, itemPrice, itemCategory) {
    if (!viewStats[itemId]) {
        viewStats[itemId] = {
            id: itemId,
            name: itemName,
            image: itemImage,
            price: itemPrice,
            category: itemCategory,
            views: 0
        };
    }
    viewStats[itemId].views++;
    saveViewStats();
    renderPopularBlock();
}

function renderPopularBlock() {
    const section = document.getElementById('popularSection');
    const container = document.getElementById('popularContainer');
    if (!section || !container) return;
    
    const popular = Object.values(viewStats)
        .sort((a, b) => b.views - a.views)
        .slice(0, 8);
    
    if (popular.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';
    container.innerHTML = popular.map(item => `
        <div class="popular-card" data-id="${item.id}" data-category="${item.category}">
            <img class="popular-image" src="${item.image || 'https://placehold.co/200x200/1E293B/3B82F6?text=No+Image'}" loading="lazy">
            <div class="popular-name">${escapeHtml(item.name)}</div>
            <div class="popular-price">${item.price} ₽</div>
            <div style="font-size: 10px; color: #94A3B8; margin-top: 4px;">👁️ ${item.views} просмотров</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.popular-card').forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            const id = parseInt(card.dataset.id);
            openCategory(category);
            setTimeout(() => {
                const items = allItems[category];
                const item = items.find(i => i.id === id);
                if (item?.flavors) openFlavors(item);
            }, 100);
        });
    });
}

// ========== ИСТОРИЯ ПРОСМОТРОВ ==========
const HISTORY_KEY = "view_history";
const MAX_HISTORY = 10;

function saveToHistory(item) {
    let history = getHistory();
    history = history.filter(h => h.id !== item.id);
    history.unshift({
        id: item.id,
        name: item.name,
        image: item.image,
        category: currentCategory,
        price: item.flavors ? `от ${Math.min(...item.flavors.map(f => f.price))}` : item.price,
        timestamp: Date.now()
    });
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistoryBlock();
}

function getHistory() {
    const history = localStorage.getItem(HISTORY_KEY);
    if (history) return JSON.parse(history);
    return [];
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistoryBlock();
    showToast("📜 История просмотров очищена", false);
}

function renderHistoryBlock() {
    const history = getHistory();
    const historySection = document.getElementById('historySection');
    const container = document.getElementById('historyContainer');
    if (!historySection || !container) return;
    
    if (history.length === 0) {
        historySection.style.display = 'none';
        return;
    }
    historySection.style.display = 'block';
    container.innerHTML = history.map(item => `
        <div class="history-card" data-id="${item.id}" data-category="${item.category}">
            <img class="history-image" src="${item.image || 'https://placehold.co/100x100/1E293B/3B82F6?text=No+Image'}" loading="lazy">
            <div class="history-name">${escapeHtml(item.name)}</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.history-card').forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            const id = parseInt(card.dataset.id);
            openCategory(category);
            setTimeout(() => {
                const items = allItems[category];
                const item = items.find(i => i.id === id);
                if (item?.flavors) openFlavors(item);
            }, 100);
        });
    });
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (ОСТАЛЬНЫЕ) ==========
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
}

function formatStock(stock) {
    if (stock === undefined || stock === null) return { text: "Нет в наличии", isOutOfStock: true, available: 0 };
    let numStock = Number(stock);
    if (!isNaN(numStock) && typeof stock !== 'boolean') {
        if (numStock <= 0) return { text: "Нет в наличии", isOutOfStock: true, available: 0 };
        if (numStock < 5) return { text: numStock + " шт", isLow: true, isOutOfStock: false, available: numStock };
        return { text: numStock + " шт", isOutOfStock: false, available: numStock };
    }
    return { text: "Нет в наличии", isOutOfStock: true, available: 0 };
}

function getCartQuantity(productName, variantName) {
    const item = cart.find(i => i.productName === productName && i.variantName === variantName);
    return item ? item.quantity : 0;
}

function updateCartIcon() {
    let cartBtn = document.getElementById('cartBtn');
    if (!cartBtn) {
        const cartHtml = `<div class="cart-icon" id="cartBtn" style="position:fixed; bottom:20px; right:20px; background:#3B82F6; width:55px; height:55px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 0 15px rgba(59,130,246,0.5); z-index:1000;">
            <span style="font-size:24px;">🛒</span>
            <span id="cartCount" style="position:absolute; top:-5px; right:-5px; background:#ff0040; color:white; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold;">0</span>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', cartHtml);
        document.getElementById('cartBtn').addEventListener('click', showCartModal);
    }
    const countSpan = document.getElementById('cartCount');
    if (countSpan) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        countSpan.textContent = totalItems;
    }
}

function addToCart(productName, variantName, price, image, maxStock) {
    const currentQty = getCartQuantity(productName, variantName);
    if (currentQty >= maxStock) {
        showToast(`❌ Нельзя добавить больше ${maxStock} шт. товара "${variantName}"`);
        return false;
    }
    const existingItem = cart.find(item => item.productName === productName && item.variantName === variantName);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            productName: productName,
            variantName: variantName,
            price: price,
            image: image,
            quantity: 1,
            maxStock: maxStock
        });
    }
    updateCartIcon();
    showToast(`✅ ${productName} (${variantName}) добавлен в корзину`);
    return true;
}

function showCartModal() {
    if (cart.length === 0) {
        showToast("🛒 Корзина пуста");
        return;
    }
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.style.display = 'flex';
    let cartHtml = `<div class="modal-content" style="max-width:500px; max-height:80vh; overflow-y:auto;"><h3>🛒 Ваша корзина</h3><div style="margin:15px 0;">`;
    let totalPrice = 0;
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        totalPrice += itemTotal;
        cartHtml += `<div style="display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid #1F2A44; flex-wrap:wrap;">
            <img src="${item.image || 'https://placehold.co/50x50/1E293B/3B82F6?text=No+Image'}" style="width:50px; height:50px; object-fit:cover; border-radius:10px;">
            <div style="flex:1;"><div><strong>${escapeHtml(item.productName)}</strong></div><div style="font-size:0.8rem; color:#94A3B8;">${escapeHtml(item.variantName)}</div><div style="color:#FACC15;">${item.price} ₽ × ${item.quantity} = ${itemTotal} ₽</div></div>
            <div style="display:flex; gap:5px;"><button class="cart-minus" data-index="${index}" style="background:#EF4444; border:none; width:30px; height:30px; border-radius:50%; color:white; cursor:pointer;">-</button><span style="min-width:30px; text-align:center;">${item.quantity}</span><button class="cart-plus" data-index="${index}" style="background:#10B981; border:none; width:30px; height:30px; border-radius:50%; color:white; cursor:pointer;">+</button></div>
            </div>`;
    });
    cartHtml += `</div><div style="text-align:right; padding:10px; font-size:1.2rem; font-weight:bold; border-top:1px solid #1F2A44;">Итого: ${totalPrice} ₽</div>
        <button class="order-submit" id="checkoutBtn" style="background:#10B981; margin-top:10px;">📤 Оформить заказ</button>
        <button class="cancel-modal" id="clearCartBtn" style="background:#EF4444;">🗑️ Очистить корзину</button>
        <button class="cancel-modal" id="closeCartBtn">Закрыть</button></div>`;
    modalDiv.innerHTML = cartHtml;
    document.body.appendChild(modalDiv);
    
    modalDiv.querySelectorAll('.cart-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index);
            const item = cart[idx];
            if (item.quantity >= item.maxStock) { showToast(`❌ Нельзя добавить больше ${item.maxStock} шт.`, true); return; }
            cart[idx].quantity++; modalDiv.remove(); showCartModal();
        });
    });
    modalDiv.querySelectorAll('.cart-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index);
            if (cart[idx].quantity > 1) cart[idx].quantity--;
            else cart.splice(idx, 1);
            if (cart.length === 0) { modalDiv.remove(); updateCartIcon(); showToast("🛒 Корзина очищена"); return; }
            modalDiv.remove(); showCartModal();
        });
    });
    modalDiv.querySelector('#clearCartBtn').onclick = () => { cart = []; modalDiv.remove(); updateCartIcon(); showToast("🗑️ Корзина очищена"); };
    modalDiv.querySelector('#closeCartBtn').onclick = () => modalDiv.remove();
    modalDiv.querySelector('#checkoutBtn').onclick = () => { modalDiv.remove(); showManagerModalForCart(); };
}

function showManagerModalForCart() {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.style.display = 'flex';
    modalDiv.innerHTML = `<div class="modal-content"><h3>📱 Выберите менеджера</h3><div id="managerOptionsTemp"></div><button class="cancel-modal" id="cancelManagerBtn">Отмена</button></div>`;
    document.body.appendChild(modalDiv);
    const opts = modalDiv.querySelector('#managerOptionsTemp');
    opts.innerHTML = managers.map(m => `<div class="manager-option" data-tg="${m.tg}">${escapeHtml(m.name)}</div>`).join('');
    modalDiv.querySelectorAll('.manager-option').forEach(opt => {
        opt.addEventListener('click', () => { modalDiv.remove(); showAgeConfirmForCart(opt.dataset.tg); });
    });
    modalDiv.querySelector('#cancelManagerBtn').onclick = () => modalDiv.remove();
}

function showAgeConfirmForCart(managerTg) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'order-modal';
    modalDiv.style.display = 'flex';
    modalDiv.innerHTML = `<div class="order-content"><h3>📦 Оформление заказа</h3><p style="margin:15px 0;">Подтвердите возраст и отправьте заказ</p><div class="order-checkbox"><input type="checkbox" id="orderAgeConfirm"><label for="orderAgeConfirm">Подтверждаю, что мне есть 18 лет</label></div><button class="order-submit" id="submitOrderBtn" disabled>📤 Отправить заказ</button><button class="cancel-order" id="cancelOrderBtn">Отмена</button></div>`;
    document.body.appendChild(modalDiv);
    const orderCheck = modalDiv.querySelector('#orderAgeConfirm');
    const submitBtn = modalDiv.querySelector('#submitOrderBtn');
    orderCheck.addEventListener('change', () => { submitBtn.disabled = !orderCheck.checked; });
    submitBtn.onclick = () => { if (orderCheck.checked) { sendCartToTelegram(managerTg); modalDiv.remove(); } };
    modalDiv.querySelector('#cancelOrderBtn').onclick = () => modalDiv.remove();
}

function saveOrderToStats(cartItems, totalPrice, managerTg) {
    const statsKey = "shop_statistics";
    const existingStats = JSON.parse(localStorage.getItem(statsKey) || '{"orders":[], "totalOrders":0, "totalRevenue":0}');
    existingStats.orders.push({ id: Date.now(), date: new Date().toISOString(), items: cartItems.map(item => ({ productName: item.productName, variantName: item.variantName, price: item.price, quantity: item.quantity })), total: totalPrice, manager: managerTg });
    existingStats.totalOrders = existingStats.orders.length;
    existingStats.totalRevenue = existingStats.orders.reduce((sum, o) => sum + o.total, 0);
    localStorage.setItem(statsKey, JSON.stringify(existingStats));
}

async function sendCartToTelegram(managerTg) {
    let message = "🛒 *НОВЫЙ ЗАКАЗ* 🛒\n\n";
    let totalPrice = 0;
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        totalPrice += itemTotal;
        message += `${index + 1}. *${item.productName}*\n   Вариант: ${item.variantName}\n   Цена: ${item.price} ₽\n   Количество: ${item.quantity} шт\n   Сумма: ${itemTotal} ₽\n\n`;
    });
    message += `────────────────\n💰 *ИТОГО: ${totalPrice} ₽*\n\n🕐 Заказ отправлен с сайта ICESHOP39`;
    window.open(`https://t.me/${managerTg}?text=${encodeURIComponent(message)}`, '_blank');
    if (ADMIN_BOT_TOKEN && ADMIN_BOT_TOKEN !== "") {
        try {
            await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text: `🔔 *НОВЫЙ ЗАКАЗ!*\n\nМенеджер: @${managerTg}\nСумма: ${totalPrice} ₽\nТоваров: ${cart.length}`, parse_mode: 'Markdown' })
            });
        } catch(e) { console.error(e); }
    }
    saveOrderToStats(cart, totalPrice, managerTg);
    cart = []; updateCartIcon(); showToast("✅ Заказ отправлен! Корзина очищена");
}

function showToast(message, isError = false) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = 'position:fixed; bottom:90px; left:50%; transform:translateX(-50%); background:#10B981; color:white; padding:12px 20px; border-radius:60px; z-index:10000; font-size:14px; white-space:nowrap; box-shadow:0 0 15px rgba(0,0,0,0.3);';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.background = isError ? '#EF4444' : '#10B981';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2500);
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
        try { return JSON.parse(clean); } catch(e) {
            if (file === "Ispariteli.json") { const match = clean.match(/\[\s*\{[\s\S]*?\}\s*\]/); if (match) return JSON.parse(match[0]); }
            return [];
        }
    } catch(e) { return []; }
}

async function loadAllData() {
    for (const cat of categories) allItems[cat.name] = await loadCategory(cat.name);
    renderCategories();
    renderManagers();
    updateCartIcon();
    loadFavorites();
    loadCompare();
    loadViewStats();
    renderHistoryBlock();
    renderPopularBlock();
}

function renderManagers() {
    const container = document.getElementById('managersGrid');
    if (!container) return;
    container.innerHTML = managers.map(m => `<a href="https://t.me/${m.tg}" target="_blank" class="manager-card"><span>${m.name}</span></a>`).join('');
}

function getCount(catName) { return allItems[catName]?.length || 0; }

function renderCategories() {
    const container = document.getElementById("categoriesGrid");
    if (!container) return;
    container.innerHTML = categories.map(cat => `<div class="category-card" data-category="${cat.name}"><div class="category-icon">${cat.icon}</div><div class="category-name">${cat.name}</div><div class="category-count">${getCount(cat.name)} товаров</div></div>`).join('');
    document.querySelectorAll('.category-card').forEach(card => card.addEventListener('click', () => openCategory(card.dataset.category)));
}

function openCategory(catName) {
    currentCategory = catName;
    const items = allItems[catName] || [];
    document.getElementById('mainPage').style.display = 'none';
    document.getElementById('productsPage').classList.add('active');
    document.getElementById('flavorsPage').classList.remove('active');
    document.getElementById('productsPageTitle').textContent = catName;
    const container = document.getElementById('productsContainer');
    if (!items.length) { container.innerHTML = '<div class="empty-msg">📭 Товары отсутствуют.</div>'; return; }
    container.innerHTML = items.map(item => {
        const itemName = escapeHtml(item.name);
        const itemImage = item.image || 'https://placehold.co/400x300/1E293B/3B82F6?text=No+Image';
        const itemDesc = item.desc ? escapeHtml(item.desc) : '';
        const priceDisplay = item.flavors?.length ? `от ${Math.min(...item.flavors.map(f => f.price))} ₽` : `${item.price} ₽`;
        const isFav = isFavorite(item.id);
        const isComp = isInCompare(item.id);
        if (item.flavors?.length) {
            return `<div class="product-card" data-id="${item.id}" data-has-flavors="true">
                <button class="favorite-btn ${isFav ? 'active' : ''}" data-id="${item.id}" data-name="${itemName}" data-image="${itemImage}" data-price="${priceDisplay}" data-category="${catName}">${isFav ? '❤️' : '🤍'}</button>
                <button class="compare-checkbox" data-id="${item.id}" data-name="${itemName}" data-image="${itemImage}" data-price="${priceDisplay}" data-category="${catName}">🔄 ${isComp ? '✓' : '⊡'}</button>
                <img class="product-image" src="${itemImage}" loading="lazy" onerror="this.src='https://placehold.co/400x300/1E293B/3B82F6?text=No+Image'">
                <div class="product-title">${itemName}</div>
                <div class="product-price">${priceDisplay}</div>
                <div class="product-desc">${itemDesc}</div>
            </div>`;
        } else {
            const stockInfo = formatStock(item.stock);
            return `<div class="product-card" data-id="${item.id}" data-has-flavors="false">
                <button class="favorite-btn ${isFav ? 'active' : ''}" data-id="${item.id}" data-name="${itemName}" data-image="${itemImage}" data-price="${priceDisplay}" data-category="${catName}">${isFav ? '❤️' : '🤍'}</button>
                <button class="compare-checkbox" data-id="${item.id}" data-name="${itemName}" data-image="${itemImage}" data-price="${priceDisplay}" data-category="${catName}">🔄 ${isComp ? '✓' : '⊡'}</button>
                <img class="product-image" src="${itemImage}" loading="lazy" onerror="this.src='https://placehold.co/400x300/1E293B/3B82F6?text=No+Image'">
                <div class="product-title">${itemName}</div>
                <div class="product-price">${priceDisplay}</div>
                <div class="product-desc">${itemDesc}</div>
                ${!stockInfo.isOutOfStock ? `<button class="order-pill" data-order-name="${itemName}" data-order-price="${item.price}" data-order-image="${itemImage}" data-order-maxstock="${stockInfo.available}">📦 В корзину</button>` : '<div class="stock-warning" style="color:#EF4444; font-size:0.8rem;">❌ Нет в наличии</div>'}
            </div>`;
        }
    }).join('');
    
    document.querySelectorAll('.order-pill').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(btn.dataset.orderName, 'стандарт', parseInt(btn.dataset.orderPrice), btn.dataset.orderImage, parseInt(btn.dataset.orderMaxstock));
    }));
    
    document.querySelectorAll('.favorite-btn').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(parseInt(btn.dataset.id), btn.dataset.name, btn.dataset.image, btn.dataset.price, btn.dataset.category);
    }));
    
    document.querySelectorAll('.compare-checkbox').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCompare(parseInt(btn.dataset.id), btn.dataset.name, btn.dataset.image, btn.dataset.price, btn.dataset.category);
    }));
    
    document.querySelectorAll('.product-card[data-has-flavors="true"]').forEach(card => {
        const id = parseInt(card.dataset.id);
        const item = items.find(i => i.id === id);
        if (item?.flavors) card.addEventListener('click', (e) => {
            if (e.target.classList.contains('favorite-btn')) return;
            if (e.target.classList.contains('compare-checkbox')) return;
            openFlavors(item);
        });
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openFlavors(parentItem) {
    saveToHistory(parentItem);
    recordView(parentItem.id, parentItem.name, parentItem.image, parentItem.flavors ? `от ${Math.min(...parentItem.flavors.map(f => f.price))}` : parentItem.price, currentCategory);
    
    document.getElementById('productsPage').classList.remove('active');
    document.getElementById('flavorsPage').classList.add('active');
    document.getElementById('flavorsPageTitle').textContent = `${parentItem.name} — выберите вариант`;
    const container = document.getElementById('flavorsContainer');
    if (!parentItem.flavors?.length) { container.innerHTML = '<div class="empty-msg">📭 Список вариантов пуст.</div>'; return; }
    container.innerHTML = `<div class="flavors-list">${parentItem.flavors.map(f => {
        const stockInfo = formatStock(f.stock);
        return `<div class="flavor-item"><div class="flavor-name">${escapeHtml(f.name)}</div><span class="flavor-price">${f.price} ₽</span><span class="flavor-stock ${stockInfo.isOutOfStock || stockInfo.isLow ? 'stock-low' : ''}">${stockInfo.text}</span><button class="flavor-order-btn" data-flavor-name="${escapeHtml(f.name)}" data-flavor-price="${f.price}" data-product-name="${escapeHtml(parentItem.name)}" data-product-image="${parentItem.image || ''}" data-product-maxstock="${stockInfo.available}" ${stockInfo.isOutOfStock ? 'disabled' : ''}>📦 В корзину</button></div>`;
    }).join('')}</div>`;
    document.querySelectorAll('.flavor-order-btn:not([disabled])').forEach(btn => btn.addEventListener('click', () => addToCart(btn.dataset.productName, btn.dataset.flavorName, parseInt(btn.dataset.flavorPrice), btn.dataset.productImage, parseInt(btn.dataset.productMaxstock))));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToHome() {
    document.getElementById('mainPage').style.display = 'block';
    document.getElementById('productsPage').classList.remove('active');
    document.getElementById('flavorsPage').classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBackToCategory() {
    document.getElementById('flavorsPage').classList.remove('active');
    document.getElementById('productsPage').classList.add('active');
    if (currentCategory) openCategory(currentCategory);
}

function handleScroll() {
    const header = document.getElementById('header');
    if (window.scrollY > 100) header.classList.add('visible');
    else header.classList.remove('visible');
}

const backgrounds = ["https://i.ibb.co/5hYz909b/istockphoto-1399967405-612x612.jpg", "https://i.ibb.co/mrGR4qTc/2026-04-05-122820613.png", "https://i.ibb.co/YBH1vwHc/2026-04-05-122925535.png"];
let bgIndex = 0;
const hero = document.getElementById('heroSection');
if (hero) setInterval(() => { bgIndex = (bgIndex + 1) % backgrounds.length; hero.style.backgroundImage = `url('${backgrounds[bgIndex]}')`; }, 4500);

let searchTimeout;
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    if (!searchInput) return;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim().toLowerCase();
        if (query.length < 2) { searchResults.classList.remove('show'); return; }
        searchTimeout = setTimeout(() => performSearch(query), 300);
    });
    document.addEventListener('click', function(e) { if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) searchResults.classList.remove('show'); });
}

function performSearch(query) {
    const results = [];
    for (const [category, items] of Object.entries(allItems)) {
        for (const item of items) {
            if (item.name.toLowerCase().includes(query)) results.push({ name: item.name, category: category, price: item.flavors ? `от ${Math.min(...item.flavors.map(f => f.price))} ₽` : `${item.price} ₽`, id: item.id, hasFlavors: !!item.flavors, item: item });
            else if (item.flavors) {
                for (const flavor of item.flavors) {
                    if (flavor.name.toLowerCase().includes(query)) { results.push({ name: `${item.name} — ${flavor.name}`, category: category, price: `${flavor.price} ₽`, id: item.id, hasFlavors: true, flavorName: flavor.name, item: item }); break; }
                }
            }
        }
    }
    renderSearchResults(results.slice(0, 10));
}

function renderSearchResults(results) {
    const searchResults = document.getElementById('searchResults');
    if (results.length === 0) { searchResults.innerHTML = '<div class="search-result-item" style="color:#94A3B8;">😔 Ничего не найдено</div>'; searchResults.classList.add('show'); return; }
    searchResults.innerHTML = results.map(r => `<div class="search-result-item" data-category="${r.category}" data-id="${r.id}" data-has-flavors="${r.hasFlavors}" data-flavor-name="${r.flavorName || ''}"><div class="search-result-name">${escapeHtml(r.name)}</div><div class="search-result-category">${escapeHtml(r.category)}</div><div class="search-result-price">${r.price}</div></div>`).join('');
    searchResults.classList.add('show');
    document.querySelectorAll('.search-result-item').forEach(el => el.addEventListener('click', () => {
        const category = el.dataset.category, id = parseInt(el.dataset.id), hasFlavors = el.dataset.hasFlavors === 'true', flavorName = el.dataset.flavorName;
        document.getElementById('searchResults').classList.remove('show'); document.getElementById('searchInput').value = '';
        openCategory(category);
        if (hasFlavors) setTimeout(() => {
            const items = allItems[category], item = items.find(i => i.id === id);
            if (item?.flavors) openFlavors(item);
        }, 100);
    }));
}

function setupGoTop() {
    const goTopBtn = document.getElementById('goTopBtn');
    if (!goTopBtn) return;
    window.addEventListener('scroll', () => { if (window.scrollY > 300) { goTopBtn.style.display = 'flex'; goTopBtn.style.alignItems = 'center'; goTopBtn.style.justifyContent = 'center'; } else goTopBtn.style.display = 'none'; });
    goTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

document.getElementById('backHomeBtn')?.addEventListener('click', goToHome);
document.getElementById('backFlavorsHomeBtn')?.addEventListener('click', goBackToCategory);
document.getElementById('homeLogoBtn')?.addEventListener('click', goToHome);
document.getElementById('scrollHint')?.addEventListener('click', () => document.getElementById('categoriesSection')?.scrollIntoView({ behavior: 'smooth' }));
window.addEventListener('scroll', handleScroll);
loadAllData();
handleScroll();
setTimeout(() => { setupSearch(); setupGoTop(); }, 1000);
document.getElementById('clearHistoryBtn')?.addEventListener('click', clearHistory);
document.getElementById('clearFavoritesBtn')?.addEventListener('click', () => { favorites = []; saveFavorites(); updateFavoriteButtons(); showToast("❤️ Избранное очищено", false); });
document.getElementById('clearCompareBtn')?.addEventListener('click', () => { compareItems = []; saveCompare(); updateCompareCheckboxes(); showToast("🔄 Сравнение очищено", false); });
