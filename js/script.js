// ========== КОНФИГУРАЦИЯ ==========
const managers = [
    { name: "🏢 КСиПТ", tg: "ICE_SHOP39" },
    { name: "🏘️ Гурьевск", tg: "IceShop_Gur" },
    { name: "🌆 Калининград", tg: "iceshop_kld39" }
];

const categories = [
    { id: "Жидкости", name: "Жидкости", icon: "💧" },
    { id: "Шайбы", name: "Шайбы", icon: "👅" },
    { id: "Вейпы", name: "Вейпы", icon: "💨" },
    { id: "Испарители", name: "Испарители", icon: "🔥" },
    { id: "Картриджи", name: "Картриджи", icon: "⚡" },
    { id: "Одноразки", name: "Одноразки", icon: "🔄" }
];

let allItems = {
    "Жидкости": [],
    "Шайбы": [],
    "Вейпы": [],
    "Испарители": [],
    "Картриджи": [],
    "Одноразки": []
};
let currentCategory = null;

// ========== JSONBIN НАСТРОЙКИ ==========
const JSONBIN_BIN_ID = "69d507df856a6821890a0bcb";
const JSONBIN_API_KEY = "$2a$10$02JoCoxrhI2J2COQIvNbM.G5Yh5iYDRA96V93DNU27viKWcqf.g5a";
const STATS_BIN_ID = "67f4a2ad8960c979a57d0695";

// ========== TELEGRAM БОТ ==========
const ADMIN_BOT_TOKEN = "8552470788:AAGB1Q36M-gPlnTebMXJWw8e8GmcCXk00y4";
const ADMIN_CHAT_ID = "6919484181";

// ========== КЕШ В LOCALSTORAGE ==========
const CACHE_KEY = "iceshop39_cache";
const CACHE_TIME_KEY = "iceshop39_cache_time";
const CACHE_DURATION = 10 * 60 * 1000; // 10 минут кеш

// ========== КОРЗИНА ==========
let cart = [];

// ========== ИЗБРАННОЕ ==========
let favorites = [];

function loadFavorites() {
    try {
        const saved = localStorage.getItem('favorites_variants');
        if (saved) favorites = JSON.parse(saved);
        else favorites = [];
    } catch(e) {
        favorites = [];
    }
    renderFavoritesBlock();
}

function saveFavorites() {
    try {
        localStorage.setItem('favorites_variants', JSON.stringify(favorites));
    } catch(e) {}
    renderFavoritesBlock();
    updateAllFavoriteButtons();
}

function toggleFavorite(productName, variantName, price, image, category, productId, variantId, isSimple = false) {
    const uniqueId = isSimple ? `simple_${productId}` : `${productId}_${variantId}`;
    const index = favorites.findIndex(f => f.uniqueId === uniqueId);
    
    if (index === -1) {
        favorites.push({
            uniqueId: uniqueId,
            productName: productName,
            variantName: variantName || productName,
            price: price,
            image: image,
            category: category,
            productId: productId,
            isSimple: isSimple
        });
        showToast(`❤️ ${variantName || productName} добавлен в избранное`, false);
    } else {
        favorites.splice(index, 1);
        showToast(`💔 Удалено из избранного`, false);
    }
    saveFavorites();
}

function isFavorite(productId, variantId, isSimple = false) {
    const uniqueId = isSimple ? `simple_${productId}` : `${productId}_${variantId}`;
    return favorites.some(f => f.uniqueId === uniqueId);
}

function updateAllFavoriteButtons() {
    document.querySelectorAll('.favorite-btn-option').forEach(btn => {
        const productId = parseInt(btn.dataset.productId);
        const variantId = parseInt(btn.dataset.variantId);
        if (isFavorite(productId, variantId, false)) {
            btn.classList.add('active');
            btn.innerHTML = '❤️';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '🤍';
        }
    });
    
    document.querySelectorAll('.favorite-btn-simple').forEach(btn => {
        const productId = parseInt(btn.dataset.productId);
        if (isFavorite(productId, 0, true)) {
            btn.classList.add('active');
            btn.innerHTML = '❤️';
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '🤍';
        }
    });
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
        <div class="favorite-card" data-category="${item.category}" data-product-id="${item.productId}" data-variant-name="${escapeHtml(item.variantName)}" data-is-simple="${item.isSimple}">
            <button class="remove-favorite" data-unique-id="${item.uniqueId}">✖</button>
            <img class="favorite-image" src="${item.image || 'https://placehold.co/200x200/1E293B/3B82F6?text=No+Image'}" loading="lazy" onerror="this.src='https://placehold.co/200x200/1E293B/3B82F6?text=No+Image'">
            <div class="favorite-name">${escapeHtml(item.productName)}${!item.isSimple ? ` — ${escapeHtml(item.variantName)}` : ''}</div>
            <div class="favorite-price">${item.price} ₽</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.favorite-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-favorite')) return;
            const category = card.dataset.category;
            const productId = parseInt(card.dataset.productId);
            const variantName = card.dataset.variantName;
            const isSimple = card.dataset.isSimple === 'true';
            
            openCategory(category);
            setTimeout(() => {
                const items = allItems[category];
                const item = items.find(i => i.id === productId);
                if (item?.flavors) openFlavors(item, variantName);
            }, 100);
        });
    });
    
    document.querySelectorAll('.remove-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const uniqueId = btn.dataset.uniqueId;
            favorites = favorites.filter(f => f.uniqueId !== uniqueId);
            saveFavorites();
            showToast("🗑️ Удалено из избранного", false);
        });
    });
}

// ========== ГЛОБАЛЬНЫЕ ПРОСМОТРЫ ==========
let globalViews = {};

async function loadGlobalViews() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${STATS_BIN_ID}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_API_KEY }
        });
        if (!response.ok) throw new Error('Ошибка загрузки');
        const data = await response.json();
        globalViews = data.record.views || {};
        renderPopularBlock();
    } catch(e) {
        console.warn('Глобальные просмотры не загружены:', e);
        globalViews = {};
    }
}

async function saveGlobalViews() {
    try {
        const currentData = await getStatsData();
        await fetch(`https://api.jsonbin.io/v3/b/${STATS_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify({ 
                views: globalViews,
                orders: currentData.orders || [],
                totalOrders: currentData.totalOrders || 0,
                totalRevenue: currentData.totalRevenue || 0,
                lastUpdated: new Date().toISOString() 
            })
        });
    } catch(e) {
        console.error('Ошибка сохранения просмотров:', e);
    }
}

async function getStatsData() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${STATS_BIN_ID}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_API_KEY }
        });
        if (!response.ok) return {};
        const data = await response.json();
        return data.record || {};
    } catch { return {}; }
}

async function addGlobalView(itemId, itemCategory) {
    const key = `${itemCategory}_${itemId}`;
    if (!globalViews[key]) {
        globalViews[key] = { id: itemId, category: itemCategory, views: 0 };
    }
    globalViews[key].views++;
    saveGlobalViews().catch(() => {});
    renderPopularBlock();
}

function recordView(itemId, itemCategory) {
    addGlobalView(itemId, itemCategory);
}

function renderPopularBlock() {
    const section = document.getElementById('popularSection');
    const container = document.getElementById('popularContainer');
    if (!section || !container) return;
    
    const popular = Object.values(globalViews)
        .sort((a, b) => b.views - a.views)
        .slice(0, 8);
    
    if (popular.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    const popularWithData = [];
    for (const stat of popular) {
        const category = stat.category;
        const items = allItems[category];
        if (!items) continue;
        
        const item = items.find(i => i.id === stat.id);
        if (!item) continue;
        
        let price = '';
        if (item.flavors && item.flavors.length > 0) {
            const prices = item.flavors.map(f => f.price);
            price = `от ${Math.min(...prices)} ₽`;
        } else {
            price = `${item.price} ₽`;
        }
        
        popularWithData.push({
            id: item.id,
            category: category,
            name: item.name,
            image: item.image,
            price: price,
            views: stat.views
        });
    }
    
    if (popularWithData.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    container.innerHTML = popularWithData.map(item => `
        <div class="popular-card" data-id="${item.id}" data-category="${item.category}">
            <img class="popular-image" src="${item.image || 'https://placehold.co/200x200/1E293B/3B82F6?text=No+Image'}" loading="lazy" onerror="this.src='https://placehold.co/200x200/1E293B/3B82F6?text=No+Image'">
            <div class="popular-name">${escapeHtml(item.name)}</div>
            <div class="popular-price">${item.price}</div>
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
const MAX_HISTORY = 5;

function saveToHistory(item, variantName = null) {
    let history = getHistory();
    const displayName = variantName ? `${item.name} — ${variantName}` : item.name;
    const itemId = variantName ? `${item.id}_${variantName}` : item.id;
    
    history = history.filter(h => h.id !== itemId);
    history.unshift({
        id: itemId,
        name: displayName,
        image: item.image,
        category: currentCategory,
        price: variantName ? item.flavors?.find(f => f.name === variantName)?.price : (item.flavors ? `от ${Math.min(...item.flavors.map(f => f.price))}` : item.price),
        timestamp: Date.now()
    });
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch(e) {}
    renderHistoryBlock();
}

function getHistory() {
    try {
        const history = localStorage.getItem(HISTORY_KEY);
        if (history) return JSON.parse(history);
    } catch(e) {}
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
        <div class="history-card" data-category="${item.category}" data-name="${escapeHtml(item.name)}">
            <img class="history-image" src="${item.image || 'https://placehold.co/100x100/1E293B/3B82F6?text=No+Image'}" loading="lazy" onerror="this.src='https://placehold.co/100x100/1E293B/3B82F6?text=No+Image'">
            <div class="history-name">${escapeHtml(item.name)}</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.history-card').forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            const name = card.dataset.name;
            openCategory(category);
            setTimeout(() => {
                const items = allItems[category];
                const item = items.find(i => name.includes(i.name));
                if (item?.flavors) {
                    const variantName = name.includes('—') ? name.split('—')[1].trim() : null;
                    openFlavors(item, variantName);
                }
            }, 100);
        });
    });
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
}

function escapeMarkdown(text) {
    if (!text) return '';
    return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
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
        showToast(`❌ Нельзя добавить больше ${maxStock} шт`, true);
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
    showToast(`✅ Добавлено в корзину!`, false);
    return true;
}

function showCartModal() {
    if (cart.length === 0) {
        showToast("🛒 Корзина пуста", false);
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
            if (item.quantity >= item.maxStock) { 
                showToast(`❌ Нельзя добавить больше ${item.maxStock} шт`, true); 
                return; 
            }
            cart[idx].quantity++; 
            modalDiv.remove(); 
            showCartModal();
        });
    });
    modalDiv.querySelectorAll('.cart-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index);
            if (cart[idx].quantity > 1) cart[idx].quantity--;
            else cart.splice(idx, 1);
            if (cart.length === 0) { 
                modalDiv.remove(); 
                updateCartIcon(); 
                showToast("🛒 Корзина очищена", false); 
                return; 
            }
            modalDiv.remove(); 
            showCartModal();
        });
    });
    modalDiv.querySelector('#clearCartBtn').onclick = () => { 
        cart = []; 
        modalDiv.remove(); 
        updateCartIcon(); 
        showToast("🗑️ Корзина очищена", false); 
    };
    modalDiv.querySelector('#closeCartBtn').onclick = () => modalDiv.remove();
    modalDiv.querySelector('#checkoutBtn').onclick = () => { 
        modalDiv.remove(); 
        showManagerModalForCart(); 
    };
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
        opt.addEventListener('click', () => { 
            modalDiv.remove(); 
            showAgeConfirmForCart(opt.dataset.tg); 
        });
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
    submitBtn.onclick = () => { 
        if (orderCheck.checked) { 
            sendCartToTelegram(managerTg); 
            modalDiv.remove(); 
        } 
    };
    modalDiv.querySelector('#cancelOrderBtn').onclick = () => modalDiv.remove();
}

async function saveOrderToStats(cartItems, totalPrice, managerTg) {
    try {
        const currentData = await getStatsData();
        const orders = currentData.orders || [];
        orders.push({
            id: Date.now(),
            date: new Date().toISOString(),
            items: cartItems.map(item => ({
                productName: item.productName,
                variantName: item.variantName,
                price: item.price,
                quantity: item.quantity
            })),
            total: totalPrice,
            manager: managerTg
        });
        
        await fetch(`https://api.jsonbin.io/v3/b/${STATS_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify({
                views: globalViews,
                orders: orders,
                totalOrders: orders.length,
                totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
                lastUpdated: new Date().toISOString()
            })
        });
    } catch(e) {
        console.error('Ошибка сохранения заказа:', e);
    }
}

async function sendCartToTelegram(managerTg) {
    let message = "🛒 *НОВЫЙ ЗАКАЗ* 🛒\n\n";
    let totalPrice = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        totalPrice += itemTotal;
        message += `${index + 1}\\. *${escapeMarkdown(item.productName)}*\n`;
        message += `   Вариант: ${escapeMarkdown(item.variantName)}\n`;
        message += `   Цена: ${item.price} ₽\n`;
        message += `   Количество: ${item.quantity} шт\n`;
        message += `   Сумма: ${itemTotal} ₽\n\n`;
    });
    
    message += `────────────────\n`;
    message += `💰 *ИТОГО: ${totalPrice} ₽*\n\n`;
    message += `🕐 Заказ отправлен с сайта ICESHOP39`;
    
    window.open(`https://t.me/${managerTg}?text=${encodeURIComponent(message)}`, '_blank');
    
    if (ADMIN_BOT_TOKEN && ADMIN_BOT_TOKEN !== "") {
        try {
            let adminMessage = `🔔 *НОВЫЙ ЗАКАЗ!*\n\n`;
            adminMessage += `👤 *Менеджер:* @${managerTg}\n`;
            adminMessage += `💰 *Сумма:* ${totalPrice} ₽\n`;
            adminMessage += `📦 *Товаров:* ${cart.length}\n\n`;
            adminMessage += `*Состав заказа:*\n`;
            
            cart.forEach((item, index) => {
                adminMessage += `${index + 1}\\. ${escapeMarkdown(item.productName)} — ${escapeMarkdown(item.variantName)} × ${item.quantity} = ${item.price * item.quantity} ₽\n`;
            });
            
            const response = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: ADMIN_CHAT_ID,
                    text: adminMessage,
                    parse_mode: 'MarkdownV2'
                })
            });
            
            const result = await response.json();
            if (!result.ok) {
                await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: ADMIN_CHAT_ID,
                        text: `🔔 НОВЫЙ ЗАКАЗ!\n\nМенеджер: @${managerTg}\nСумма: ${totalPrice} ₽\nТоваров: ${cart.length}`
                    })
                });
            }
        } catch(e) {
            console.error('Ошибка отправки админу:', e);
        }
    }
    
    saveOrderToStats(cart, totalPrice, managerTg);
    cart = []; 
    updateCartIcon(); 
    showToast("✅ Заказ отправлен! Корзина очищена", false);
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

// ========== ЗАГРУЗКА ДАННЫХ С КЕШИРОВАНИЕМ ==========
function getCachedData() {
    try {
        const cacheTime = localStorage.getItem(CACHE_TIME_KEY);
        if (cacheTime && (Date.now() - parseInt(cacheTime)) < CACHE_DURATION) {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                console.log('📦 Загружено из кеша');
                return JSON.parse(cached);
            }
        }
    } catch(e) {}
    return null;
}

function setCachedData(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    } catch(e) {}
}

async function loadAllData() {
    // 1. Пробуем загрузить из кеша
    const cached = getCachedData();
    if (cached) {
        allItems["Жидкости"] = cached.Zhitkosty || [];
        allItems["Шайбы"] = cached.Snus || [];
        allItems["Вейпы"] = cached.Vapes || [];
        allItems["Испарители"] = cached.Ispariteli || [];
        allItems["Картриджи"] = cached.Kartdritzhy || [];
        allItems["Одноразки"] = cached.Odnorazki || [];
        
        renderCategories();
        renderManagers();
        updateCartIcon();
        loadFavorites();
        renderHistoryBlock();
        loadGlobalViews().catch(() => {});
        
        // Фоновое обновление
        fetchFreshData();
        return;
    }
    
    // 2. Кеша нет — грузим из JSONBin
    await fetchFreshData(true);
}

async function fetchFreshData(showLoader = false) {
    if (showLoader) showToast("🔄 Загрузка товаров...", false);
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_API_KEY },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const record = data.record || {};
        
        allItems["Жидкости"] = record.Zhitkosty || [];
        allItems["Шайбы"] = record.Snus || [];
        allItems["Вейпы"] = record.Vapes || [];
        allItems["Испарители"] = record.Ispariteli || [];
        allItems["Картриджи"] = record.Kartdritzhy || [];
        allItems["Одноразки"] = record.Odnorazki || [];
        
        // Сохраняем в кеш
        setCachedData({
            Zhitkosty: allItems["Жидкости"],
            Snus: allItems["Шайбы"],
            Vapes: allItems["Вейпы"],
            Ispariteli: allItems["Испарители"],
            Kartdritzhy: allItems["Картриджи"],
            Odnorazki: allItems["Одноразки"]
        });
        
        console.log("✅ Данные загружены из JSONBin");
        console.log("📊 Категории:", Object.keys(allItems).map(k => `${k}: ${allItems[k].length}`).join(', '));
        
        renderCategories();
        renderManagers();
        updateCartIcon();
        loadFavorites();
        renderHistoryBlock();
        loadGlobalViews().catch(() => {});
        
        if (showLoader) showToast("✅ Товары загружены", false);
    } catch(e) {
        console.error('❌ Ошибка загрузки:', e);
        
        // Пробуем загрузить из кеша даже просроченный
        try {
            const oldCache = localStorage.getItem(CACHE_KEY);
            if (oldCache) {
                const cached = JSON.parse(oldCache);
                allItems["Жидкости"] = cached.Zhitkosty || [];
                allItems["Шайбы"] = cached.Snus || [];
                allItems["Вейпы"] = cached.Vapes || [];
                allItems["Испарители"] = cached.Ispariteli || [];
                allItems["Картриджи"] = cached.Kartdritzhy || [];
                allItems["Одноразки"] = cached.Odnorazki || [];
                
                console.log('📦 Загружен старый кеш');
                renderCategories();
                renderManagers();
                updateCartIcon();
                loadFavorites();
                renderHistoryBlock();
                loadGlobalViews().catch(() => {});
                showToast("⚠️ Загружены сохранённые данные", true);
                return;
            }
        } catch(e2) {}
        
        if (showLoader) showToast("❌ Ошибка загрузки товаров", true);
        renderCategories();
        renderManagers();
    }
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
    if (!items.length) { 
        container.innerHTML = '<div class="empty-msg" style="text-align:center; padding:40px; color:#94A3B8;">📭 Товары отсутствуют.</div>'; 
        return; 
    }
    
    container.innerHTML = items.map(item => {
        const itemName = escapeHtml(item.name);
        const itemImage = item.image || 'https://placehold.co/400x300/1E293B/3B82F6?text=No+Image';
        const itemDesc = item.desc ? escapeHtml(item.desc) : '';
        const priceDisplay = item.flavors?.length ? `от ${Math.min(...item.flavors.map(f => f.price))} ₽` : `${item.price} ₽`;
        
        if (item.flavors?.length) {
            return `<div class="product-card" data-id="${item.id}" data-has-flavors="true">
                <img class="product-image" src="${itemImage}" loading="lazy" onerror="this.src='https://placehold.co/400x300/1E293B/3B82F6?text=No+Image'">
                <div class="product-title">${itemName}</div>
                <div class="product-price">${priceDisplay}</div>
                <div class="product-desc">${itemDesc}</div>
            </div>`;
        } else {
            const stockInfo = formatStock(item.stock);
            const isFav = isFavorite(item.id, 0, true);
            const stockText = stockInfo.isOutOfStock ? 'Нет в наличии' : `${stockInfo.available} шт`;
            
            return `<div class="product-card" data-id="${item.id}" data-has-flavors="false">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="product-title">${itemName}</div>
                    <button class="favorite-btn-simple ${isFav ? 'active' : ''}" data-product-id="${item.id}" data-product-name="${itemName}" data-price="${item.price}" data-image="${itemImage}" data-category="${catName}">${isFav ? '❤️' : '🤍'}</button>
                </div>
                <img class="product-image" src="${itemImage}" loading="lazy" onerror="this.src='https://placehold.co/400x300/1E293B/3B82F6?text=No+Image'">
                <div class="product-price">${priceDisplay}</div>
                <div class="product-desc">${itemDesc}</div>
                <div style="margin: 5px 0; font-size: 0.8rem; color: #94A3B8;">📦 Остаток: ${stockText}</div>
                ${!stockInfo.isOutOfStock ? `<button class="order-pill" data-order-name="${itemName}" data-order-price="${item.price}" data-order-image="${itemImage}" data-order-maxstock="${stockInfo.available}">📦 В корзину</button>` : '<div class="stock-warning" style="color:#EF4444; font-size:0.8rem; text-align:center; padding:10px;">❌ Нет в наличии</div>'}
            </div>`;
        }
    }).join('');
    
    document.querySelectorAll('.order-pill').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const maxStock = parseInt(btn.dataset.orderMaxstock);
        addToCart(btn.dataset.orderName, btn.dataset.orderName, parseInt(btn.dataset.orderPrice), btn.dataset.orderImage, maxStock);
    }));
    
    document.querySelectorAll('.favorite-btn-simple').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const productId = parseInt(btn.dataset.productId);
        const productName = btn.dataset.productName;
        const price = parseInt(btn.dataset.price);
        const image = btn.dataset.image;
        const category = btn.dataset.category;
        toggleFavorite(productName, null, price, image, category, productId, 0, true);
    }));
    
    document.querySelectorAll('.product-card[data-has-flavors="true"]').forEach(card => {
        const id = parseInt(card.dataset.id);
        const item = items.find(i => i.id === id);
        if (item?.flavors) card.addEventListener('click', () => openFlavors(item));
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openFlavors(parentItem, highlightVariant = null) {
    saveToHistory(parentItem);
    recordView(parentItem.id, currentCategory);
    
    document.getElementById('productsPage').classList.remove('active');
    document.getElementById('flavorsPage').classList.add('active');
    document.getElementById('flavorsPageTitle').textContent = `${parentItem.name} — выберите вариант`;
    const container = document.getElementById('flavorsContainer');
    if (!parentItem.flavors?.length) { container.innerHTML = '<div class="empty-msg">📭 Список вариантов пуст.</div>'; return; }
    
    container.innerHTML = `<div class="flavors-list">${parentItem.flavors.map((f, idx) => {
        const stockInfo = formatStock(f.stock);
        const isFav = isFavorite(parentItem.id, idx, false);
        return `<div class="flavor-item" data-variant-idx="${idx}">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div class="flavor-name">${escapeHtml(f.name)}</div>
                <button class="favorite-btn-option ${isFav ? 'active' : ''}" data-product-id="${parentItem.id}" data-variant-id="${idx}" data-product-name="${escapeHtml(parentItem.name)}" data-variant-name="${escapeHtml(f.name)}" data-price="${f.price}" data-image="${parentItem.image}" data-category="${currentCategory}">${isFav ? '❤️' : '🤍'}</button>
            </div>
            <span class="flavor-price">${f.price} ₽</span>
            <span class="flavor-stock ${stockInfo.isOutOfStock || stockInfo.isLow ? 'stock-low' : ''}">${stockInfo.text}</span>
            <button class="flavor-order-btn" data-flavor-name="${escapeHtml(f.name)}" data-flavor-price="${f.price}" data-product-name="${escapeHtml(parentItem.name)}" data-product-image="${parentItem.image || ''}" data-product-maxstock="${stockInfo.available}" ${stockInfo.isOutOfStock ? 'disabled' : ''}>📦 В корзину</button>
        </div>`;
    }).join('')}</div>`;
    
    document.querySelectorAll('.flavor-order-btn:not([disabled])').forEach(btn => btn.addEventListener('click', () => {
        const maxStock = parseInt(btn.dataset.productMaxstock);
        addToCart(btn.dataset.productName, btn.dataset.flavorName, parseInt(btn.dataset.flavorPrice), btn.dataset.productImage, maxStock);
    }));
    
    document.querySelectorAll('.favorite-btn-option').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const productId = parseInt(btn.dataset.productId);
        const variantId = parseInt(btn.dataset.variantId);
        const productName = btn.dataset.productName;
        const variantName = btn.dataset.variantName;
        const price = parseInt(btn.dataset.price);
        const image = btn.dataset.image;
        const category = btn.dataset.category;
        toggleFavorite(productName, variantName, price, image, category, productId, variantId, false);
    }));
    
    if (highlightVariant) {
        const items = document.querySelectorAll('.flavor-item');
        for (let item of items) {
            const nameEl = item.querySelector('.flavor-name');
            if (nameEl && nameEl.textContent.trim() === highlightVariant) {
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                break;
            }
        }
    }
    
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
            if (item?.flavors) openFlavors(item, flavorName);
        }, 100);
    }));
}

document.getElementById('backHomeBtn')?.addEventListener('click', goToHome);
document.getElementById('backFlavorsHomeBtn')?.addEventListener('click', goBackToCategory);
document.getElementById('homeLogoBtn')?.addEventListener('click', goToHome);
document.getElementById('scrollHint')?.addEventListener('click', () => document.getElementById('categoriesSection')?.scrollIntoView({ behavior: 'smooth' }));
window.addEventListener('scroll', handleScroll);
loadAllData();
handleScroll();
setTimeout(() => { setupSearch(); }, 500);
document.getElementById('clearHistoryBtn')?.addEventListener('click', clearHistory);
document.getElementById('clearFavoritesBtn')?.addEventListener('click', () => { favorites = []; saveFavorites(); showToast("❤️ Избранное очищено", false); });
