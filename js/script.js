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

// ========== JSONBIN ==========
const JSONBIN_API_KEY = "$2a$10$02JoCoxrhI2J2COQIvNbM.G5Yh5iYDRA96V93DNU27viKWcqf.g5a";
const STATS_BIN_ID = "69de65c836566621a8b1fd5b";

const CATEGORY_BINS = {
    "Жидкости":   "69ecfff9aaba88219738d922",
    "Шайбы":     "69ed003736566621a8ef3796",
    "Вейпы":     "69ed0016aaba88219738d9bb",
    "Испарители": "69ed0049aaba88219738da71",
    "Картриджи":  "69ed005c36566621a8ef37fc",
    "Одноразки":  "69ed007436566621a8ef382b"
};

// ========== TELEGRAM ==========
const ADMIN_BOT_TOKEN = "8552470788:AAGB1Q36M-gPlnTebMXJWw8e8GmcCXk00y4";
const ADMIN_CHAT_ID = "6919484181";

// ========== КЕШ ==========
const CACHE_PREFIX = "iceshop39_";
const CACHE_TIME_SUFFIX = "_time";
const CACHE_DURATION = 30 * 60 * 1000;

// ========== КОРЗИНА ==========
let cart = [];

// ========== ИЗБРАННОЕ ==========
let favorites = [];

function loadFavorites() {
    try { const saved = localStorage.getItem('favorites_variants'); if (saved) favorites = JSON.parse(saved); else favorites = []; } catch(e) { favorites = []; }
    renderFavoritesBlock();
}

function saveFavorites() {
    try { localStorage.setItem('favorites_variants', JSON.stringify(favorites)); } catch(e) {}
    renderFavoritesBlock();
    updateAllFavoriteButtons();
}

function toggleFavorite(productName, variantName, price, image, category, productId, variantId, isSimple = false) {
    const uniqueId = isSimple ? `simple_${productId}` : `${productId}_${variantId}`;
    const index = favorites.findIndex(f => f.uniqueId === uniqueId);
    if (index === -1) { favorites.push({ uniqueId, productName, variantName: variantName || productName, price, image, category, productId, isSimple }); showToast(`❤️ ${variantName || productName} добавлен`, false); }
    else { favorites.splice(index, 1); showToast(`💔 Удалено`, false); }
    saveFavorites();
}

function isFavorite(productId, variantId, isSimple = false) {
    const uniqueId = isSimple ? `simple_${productId}` : `${productId}_${variantId}`;
    return favorites.some(f => f.uniqueId === uniqueId);
}

function updateAllFavoriteButtons() {
    document.querySelectorAll('.favorite-btn-option').forEach(btn => {
        const pid = parseInt(btn.dataset.productId), vid = parseInt(btn.dataset.variantId);
        btn.classList.toggle('active', isFavorite(pid, vid, false));
        btn.innerHTML = isFavorite(pid, vid, false) ? '❤️' : '🤍';
    });
    document.querySelectorAll('.favorite-btn-simple').forEach(btn => {
        const pid = parseInt(btn.dataset.productId);
        btn.classList.toggle('active', isFavorite(pid, 0, true));
        btn.innerHTML = isFavorite(pid, 0, true) ? '❤️' : '🤍';
    });
}

function renderFavoritesBlock() {
    const section = document.getElementById('favoritesSection'), container = document.getElementById('favoritesContainer');
    if (!section || !container) return;
    if (favorites.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    container.innerHTML = favorites.map(item => `
        <div class="favorite-card" data-category="${item.category}" data-product-id="${item.productId}" data-variant-name="${escapeHtml(item.variantName)}" data-is-simple="${item.isSimple}">
            <button class="remove-favorite" data-unique-id="${item.uniqueId}">✖</button>
            <img class="favorite-image" src="${item.image || 'https://placehold.co/200x200/1E293B/3B82F6?text=No+Image'}" loading="lazy" decoding="async" onerror="this.src='https://placehold.co/200x200/1E293B/3B82F6?text=No+Image'">
            <div class="favorite-name">${escapeHtml(item.productName)}${!item.isSimple ? ` — ${escapeHtml(item.variantName)}` : ''}</div>
            <div class="favorite-price">${item.price} ₽</div>
        </div>
    `).join('');
    document.querySelectorAll('.favorite-card').forEach(card => { card.addEventListener('click', (e) => { if (e.target.classList.contains('remove-favorite')) return; openCategory(card.dataset.category); setTimeout(() => { const item = allItems[card.dataset.category]?.find(i => i.id === parseInt(card.dataset.productId)); if (item?.flavors) openFlavors(item, card.dataset.variantName); }, 100); }); });
    document.querySelectorAll('.remove-favorite').forEach(btn => { btn.addEventListener('click', (e) => { e.stopPropagation(); favorites = favorites.filter(f => f.uniqueId !== btn.dataset.uniqueId); saveFavorites(); showToast("🗑️ Удалено", false); }); });
}

// ========== ГЛОБАЛЬНЫЕ ПРОСМОТРЫ ==========
let globalViews = {};

async function loadGlobalViews() {
    try {
        const r = await fetch(`https://api.jsonbin.io/v3/b/${STATS_BIN_ID}/latest`, { headers: { 'X-Master-Key': JSONBIN_API_KEY } });
        if (!r.ok) throw new Error('Ошибка');
        globalViews = (await r.json()).record.views || {};
        renderPopularBlock();
    } catch(e) { console.warn(e); globalViews = {}; }
}

async function saveGlobalViews() {
    try {
        const r = await fetch(`https://api.jsonbin.io/v3/b/${STATS_BIN_ID}/latest`, { headers: { 'X-Master-Key': JSONBIN_API_KEY } });
        let orders = [], totalOrders = 0, totalRevenue = 0;
        if (r.ok) { const d = await r.json(); const rec = d.record || {}; orders = rec.orders || []; totalOrders = rec.totalOrders || 0; totalRevenue = rec.totalRevenue || 0; }
        await fetch(`https://api.jsonbin.io/v3/b/${STATS_BIN_ID}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY }, body: JSON.stringify({ views: globalViews, orders, totalOrders, totalRevenue, lastUpdated: new Date().toISOString() }) });
    } catch(e) { console.error(e); }
}

async function addGlobalView(itemId, itemCategory) {
    const key = `${itemCategory}_${itemId}`;
    if (!globalViews[key]) globalViews[key] = { id: itemId, category: itemCategory, views: 0 };
    globalViews[key].views++;
    await saveGlobalViews();
    renderPopularBlock();
}

function recordView(itemId, itemCategory) { addGlobalView(itemId, itemCategory); }

function renderPopularBlock() {
    const section = document.getElementById('popularSection'), container = document.getElementById('popularContainer');
    if (!section || !container) return;
    const popular = Object.values(globalViews).sort((a, b) => b.views - a.views).slice(0, 8);
    if (popular.length === 0) { section.style.display = 'none'; return; }
    const popularWithData = [];
    for (const stat of popular) {
        const items = allItems[stat.category]; if (!items) continue;
        const item = items.find(i => i.id === stat.id); if (!item) continue;
        let price = item.flavors?.length ? `от ${Math.min(...item.flavors.map(f => f.price))} ₽` : `${item.price} ₽`;
        popularWithData.push({ id: item.id, category: stat.category, name: item.name, image: item.image, price, views: stat.views });
    }
    if (popularWithData.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    container.innerHTML = popularWithData.map(item => `
        <div class="popular-card" data-id="${item.id}" data-category="${item.category}">
            <img class="popular-image" src="${item.image || 'https://placehold.co/200x200/1E293B/3B82F6?text=No+Image'}" loading="lazy" decoding="async" onerror="this.src='https://placehold.co/200x200/1E293B/3B82F6?text=No+Image'">
            <div class="popular-name">${escapeHtml(item.name)}</div>
            <div class="popular-price">${item.price}</div>
            <div style="font-size:10px;color:#94A3B8;margin-top:4px;">👁️ ${item.views} просмотров</div>
        </div>
    `).join('');
    document.querySelectorAll('.popular-card').forEach(card => { card.addEventListener('click', () => { openCategory(card.dataset.category); setTimeout(() => { const item = allItems[card.dataset.category]?.find(i => i.id === parseInt(card.dataset.id)); if (item?.flavors) openFlavors(item); }, 100); }); });
}

// ========== ИСТОРИЯ ==========
const HISTORY_KEY = "view_history", MAX_HISTORY = 12;
function saveToHistory(item, variantName = null) {
    let history = getHistory();
    const displayName = variantName ? `${item.name} — ${variantName}` : item.name;
    const itemId = variantName ? `${item.id}_${variantName}` : item.id;
    history = history.filter(h => h.id !== itemId);
    history.unshift({ id: itemId, name: displayName, image: item.image, category: currentCategory, price: variantName ? item.flavors?.find(f => f.name === variantName)?.price : (item.flavors ? `от ${Math.min(...item.flavors.map(f => f.price))}` : item.price), timestamp: Date.now() });
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch(e) {}
    renderHistoryBlock();
}
function getHistory() { try { const h = localStorage.getItem(HISTORY_KEY); return h ? JSON.parse(h) : []; } catch(e) { return []; } }
function clearHistory() { localStorage.removeItem(HISTORY_KEY); renderHistoryBlock(); showToast("📜 История очищена", false); }

function renderHistoryBlock() {
    const history = getHistory(), section = document.getElementById('historySection'), container = document.getElementById('historyContainer');
    if (!section || !container) return;
    if (history.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    container.innerHTML = history.map(item => `
        <div class="history-card" data-category="${item.category}" data-name="${escapeHtml(item.name)}">
            <img class="history-image" src="${item.image || 'https://placehold.co/100x100/1E293B/3B82F6?text=No+Image'}" loading="lazy" decoding="async" onerror="this.src='https://placehold.co/100x100/1E293B/3B82F6?text=No+Image'">
            <div class="history-name">${escapeHtml(item.name)}</div>
        </div>
    `).join('');
    document.querySelectorAll('.history-card').forEach(card => { card.addEventListener('click', () => { openCategory(card.dataset.category); setTimeout(() => { const item = allItems[card.dataset.category]?.find(i => card.dataset.name.includes(i.name)); if (item?.flavors) { const vn = card.dataset.name.includes('—') ? card.dataset.name.split('—')[1].trim() : null; openFlavors(item, vn); } }, 100); }); });
}

// ========== ХЕЛПЕРЫ ==========
function escapeHtml(str) { if (!str) return ''; return String(str).replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }
function escapeMarkdown(text) { if (!text) return ''; return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&'); }
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

// ========== КОРЗИНА ==========
function getCartQuantity(pn, vn) { const i = cart.find(x => x.productName === pn && x.variantName === vn); return i ? i.quantity : 0; }
function updateCartIcon() {
    let btn = document.getElementById('cartBtn');
    if (!btn) { const h = `<div class="cart-icon" id="cartBtn" style="position:fixed;bottom:20px;right:20px;background:#3B82F6;width:55px;height:55px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 0 15px rgba(59,130,246,0.5);z-index:1000;"><span style="font-size:24px;">🛒</span><span id="cartCount" style="position:absolute;top:-5px;right:-5px;background:#ff0040;color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">0</span></div>`; document.body.insertAdjacentHTML('beforeend', h); document.getElementById('cartBtn').addEventListener('click', showCartModal); }
    document.getElementById('cartCount').textContent = cart.reduce((s, i) => s + i.quantity, 0);
}

function addToCart(pn, vn, price, image, maxStock) {
    if (getCartQuantity(pn, vn) >= maxStock) { showToast(`❌ Нельзя больше ${maxStock} шт`, true); return false; }
    const ex = cart.find(x => x.productName === pn && x.variantName === vn);
    if (ex) ex.quantity++; else cart.push({ productName: pn, variantName: vn, price, image, quantity: 1, maxStock });
    updateCartIcon(); showToast(`✅ Добавлено!`, false); return true;
}

function showCartModal() {
    if (cart.length === 0) { showToast("🛒 Корзина пуста", false); return; }
    const d = document.createElement('div'); d.className = 'modal'; d.style.display = 'flex';
    let h = `<div class="modal-content" style="max-width:500px;max-height:80vh;overflow-y:auto;"><h3>🛒 Корзина</h3><div style="margin:15px 0;">`, total = 0;
    cart.forEach((item, i) => { const it = item.price * item.quantity; total += it;
        h += `<div style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid #1F2A44;flex-wrap:wrap;"><img src="${item.image || 'https://placehold.co/50x50/1E293B/3B82F6?text=No+Image'}" style="width:50px;height:50px;object-fit:cover;border-radius:10px;"><div style="flex:1;"><div><strong>${escapeHtml(item.productName)}</strong></div><div style="font-size:0.8rem;color:#94A3B8;">${escapeHtml(item.variantName)}</div><div style="color:#FACC15;">${item.price} ₽ × ${item.quantity} = ${it} ₽</div></div><div style="display:flex;gap:5px;"><button class="cart-minus" data-idx="${i}" style="background:#EF4444;border:none;width:30px;height:30px;border-radius:50%;color:white;cursor:pointer;">-</button><span style="min-width:30px;text-align:center;">${item.quantity}</span><button class="cart-plus" data-idx="${i}" style="background:#10B981;border:none;width:30px;height:30px;border-radius:50%;color:white;cursor:pointer;">+</button></div></div>`; });
    h += `</div><div style="text-align:right;padding:10px;font-size:1.2rem;font-weight:bold;border-top:1px solid #1F2A44;">Итого: ${total} ₽</div><button class="order-submit" id="checkoutBtn" style="background:#10B981;margin-top:10px;">📤 Оформить</button><button class="cancel-modal" id="clearCartBtn" style="background:#EF4444;">🗑️ Очистить</button><button class="cancel-modal" id="closeCartBtn">Закрыть</button></div>`;
    d.innerHTML = h; document.body.appendChild(d);
    d.querySelectorAll('.cart-plus').forEach(b => b.addEventListener('click', () => { const idx = +b.dataset.idx; if (cart[idx].quantity >= cart[idx].maxStock) { showToast(`❌ Нельзя больше ${cart[idx].maxStock} шт`, true); return; } cart[idx].quantity++; d.remove(); showCartModal(); }));
    d.querySelectorAll('.cart-minus').forEach(b => b.addEventListener('click', () => { const idx = +b.dataset.idx; if (cart[idx].quantity > 1) cart[idx].quantity--; else cart.splice(idx, 1); if (cart.length === 0) { d.remove(); updateCartIcon(); showToast("🛒 Корзина очищена", false); return; } d.remove(); showCartModal(); }));
    d.querySelector('#clearCartBtn').onclick = () => { cart = []; d.remove(); updateCartIcon(); showToast("🗑️ Корзина очищена", false); };
    d.querySelector('#closeCartBtn').onclick = () => d.remove();
    d.querySelector('#checkoutBtn').onclick = () => { d.remove(); showManagerModalForCart(); };
}

function showManagerModalForCart() {
    const d = document.createElement('div'); d.className = 'modal'; d.style.display = 'flex';
    d.innerHTML = `<div class="modal-content"><h3>📱 Выберите менеджера</h3><div id="mgrOpts"></div><button class="cancel-modal" id="cancelMgr">Отмена</button></div>`;
    document.body.appendChild(d);
    d.querySelector('#mgrOpts').innerHTML = managers.map(m => `<div class="manager-option" data-tg="${m.tg}">${escapeHtml(m.name)}</div>`).join('');
    d.querySelectorAll('.manager-option').forEach(o => o.addEventListener('click', () => { d.remove(); showAgeConfirmForCart(o.dataset.tg); }));
    d.querySelector('#cancelMgr').onclick = () => d.remove();
}

function showAgeConfirmForCart(mgrTg) {
    const d = document.createElement('div'); d.className = 'order-modal'; d.style.display = 'flex';
    d.innerHTML = `<div class="order-content"><h3>📦 Оформление</h3><p style="margin:15px 0;">Подтвердите возраст</p><div class="order-checkbox"><input type="checkbox" id="ageCheck"><label for="ageCheck">Мне есть 18 лет</label></div><button class="order-submit" id="submitOrder" disabled>📤 Отправить</button><button class="cancel-order" id="cancelOrder">Отмена</button></div>`;
    document.body.appendChild(d);
    d.querySelector('#ageCheck').addEventListener('change', function() { d.querySelector('#submitOrder').disabled = !this.checked; });
    d.querySelector('#submitOrder').onclick = () => { if (d.querySelector('#ageCheck').checked) { sendCartToTelegram(mgrTg); d.remove(); } };
    d.querySelector('#cancelOrder').onclick = () => d.remove();
}

async function saveOrderToStats(cartItems, totalPrice, managerTg) {
    try {
        const r = await fetch(`https://api.jsonbin.io/v3/b/${STATS_BIN_ID}/latest`, { headers: { 'X-Master-Key': JSONBIN_API_KEY } });
        if (!r.ok) return;
        const rec = (await r.json()).record || {};
        const orders = rec.orders || [];
        orders.push({ id: Date.now(), date: new Date().toISOString(), items: cartItems.map(i => ({ productName: i.productName, variantName: i.variantName, price: i.price, quantity: i.quantity })), total: totalPrice, manager: managerTg });
        await fetch(`https://api.jsonbin.io/v3/b/${STATS_BIN_ID}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_API_KEY }, body: JSON.stringify({ views: globalViews, orders, totalOrders: orders.length, totalRevenue: orders.reduce((s, o) => s + o.total, 0), lastUpdated: new Date().toISOString() }) });
    } catch(e) { console.error(e); }
}

async function sendCartToTelegram(mgrTg) {
    let msg = "🛒 *НОВЫЙ ЗАКАЗ* 🛒\n\n", total = 0;
    cart.forEach((item, i) => { const it = item.price * item.quantity; total += it; msg += `${i + 1}\\. *${escapeMarkdown(item.productName)}*\n   Вариант: ${escapeMarkdown(item.variantName)}\n   Цена: ${item.price} ₽\n   Кол-во: ${item.quantity}\n   Сумма: ${it} ₽\n\n`; });
    msg += `────────────────\n💰 *ИТОГО: ${total} ₽*\n\n🕐 ICESHOP39`;
    window.open(`https://t.me/${mgrTg}?text=${encodeURIComponent(msg)}`, '_blank');
    if (ADMIN_BOT_TOKEN) {
        try {
            let am = `🔔 *НОВЫЙ ЗАКАЗ!*\n\n👤 @${mgrTg}\n💰 ${total} ₽\n📦 Товаров: ${cart.length}\n\n*Состав:*\n`;
            cart.forEach((item, i) => { am += `${i + 1}\\. ${escapeMarkdown(item.productName)} — ${escapeMarkdown(item.variantName)} × ${item.quantity} = ${item.price * item.quantity} ₽\n`; });
            const rr = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text: am, parse_mode: 'MarkdownV2' }) });
            if (!(await rr.json()).ok) await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text: `🔔 НОВЫЙ ЗАКАЗ!\n\n@${mgrTg}\nСумма: ${total} ₽\nТоваров: ${cart.length}` }) });
        } catch(e) {}
    }
    saveOrderToStats(cart, total, mgrTg);
    cart = []; updateCartIcon(); showToast("✅ Заказ отправлен!", false);
}

function showToast(msg, isErr) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#10B981;color:white;padding:12px 20px;border-radius:60px;z-index:10000;font-size:14px;white-space:nowrap;box-shadow:0 0 15px rgba(0,0,0,0.3);'; document.body.appendChild(t); }
    t.textContent = msg; t.style.background = isErr ? '#EF4444' : '#10B981'; t.style.display = 'block';
    setTimeout(() => { t.style.display = 'none'; }, 2500);
}

// ========== ЗАГРУЗКА ==========
function getCacheKey(c) { return CACHE_PREFIX + c; }
function getCacheTimeKey(c) { return CACHE_PREFIX + c + CACHE_TIME_SUFFIX; }
function getCachedCategory(c) { try { const ct = localStorage.getItem(getCacheTimeKey(c)); if (ct && (Date.now() - +ct) < CACHE_DURATION) { const cd = localStorage.getItem(getCacheKey(c)); if (cd) return JSON.parse(cd); } } catch(e) {} return null; }
function setCachedCategory(c, d) { try { localStorage.setItem(getCacheKey(c), JSON.stringify(d)); localStorage.setItem(getCacheTimeKey(c), Date.now().toString()); } catch(e) {} }

async function loadCategoryFromBin(catName, binId) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const ctrl = new AbortController(); const tid = setTimeout(() => ctrl.abort(), 10000);
            const r = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, { headers: { 'X-Master-Key': JSONBIN_API_KEY }, signal: ctrl.signal });
            clearTimeout(tid);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const d = await r.json(); let items = d.record || []; if (!items.length && Array.isArray(d)) items = d;
            console.log(`✅ ${catName}: ${items.length} товаров`);
            setCachedCategory(catName, items); return items;
        } catch(e) { console.warn(`⚠️ ${catName}, попытка ${attempt + 1}`); if (attempt < 2) await new Promise(r => setTimeout(r, 1500)); }
    }
    const cached = getCachedCategory(catName); console.warn(`⚠️ ${catName}: кеш (${cached ? cached.length : 0})`); return cached || [];
}

async function loadAllData() {
    // 1. Сначала кеш
    let hasCache = false;
    for (const [catName] of Object.entries(CATEGORY_BINS)) {
        const cached = getCachedCategory(catName);
        if (cached && cached.length > 0) {
            allItems[catName] = cached;
            hasCache = true;
        }
    }
    
    // 2. Показываем кеш мгновенно
    if (hasCache) {
        renderAll();
    }
    
    // 3. Грузим свежее (быстро, без повторных попыток для скорости)
    const proms = Object.entries(CATEGORY_BINS).map(async ([catName, binId]) => {
        try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 5000);
            const r = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
                headers: { 'X-Master-Key': JSONBIN_API_KEY },
                signal: ctrl.signal
            });
            clearTimeout(tid);
            if (r.ok) {
                const d = await r.json();
                let items = d.record || [];
                if (!items.length && Array.isArray(d)) items = d;
                if (items.length > 0) {
                    allItems[catName] = items;
                    setCachedCategory(catName, items);
                }
            }
        } catch(e) {}
    });
    
    await Promise.all(proms);
    
    // 4. Финальный рендер
    renderAll();
    
    const total = Object.values(allItems).reduce((s, a) => s + a.length, 0);
    if (!hasCache) {
        showToast(total > 0 ? `✅ ${total} товаров` : "❌ Ошибка загрузки", total === 0);
    }
}

function renderCategories() {
    const c = document.getElementById("categoriesGrid"); if (!c) return;
    c.innerHTML = categories.map(cat => `<div class="category-card" data-category="${cat.name}"><div class="category-icon">${cat.icon}</div><div class="category-name">${cat.name}</div><div class="category-count">${getCount(cat.name)} товаров</div></div>`).join('');
    document.querySelectorAll('.category-card').forEach(card => card.addEventListener('click', () => openCategory(card.dataset.category)));
}

function openCategory(catName) {
    currentCategory = catName; const items = allItems[catName] || [];
    document.getElementById('mainPage').style.display = 'none'; document.getElementById('productsPage').classList.add('active'); document.getElementById('flavorsPage').classList.remove('active'); document.getElementById('productsPageTitle').textContent = catName;
    const c = document.getElementById('productsContainer');
    if (!items.length) { c.innerHTML = '<div style="text-align:center;padding:40px;color:#94A3B8;">📭 Товары отсутствуют</div>'; return; }
    c.innerHTML = items.map(item => {
        const nm = escapeHtml(item.name), img = item.image || 'https://placehold.co/400x300/1E293B/3B82F6?text=No+Image', desc = item.desc ? escapeHtml(item.desc) : '', price = item.flavors?.length ? `от ${Math.min(...item.flavors.map(f => f.price))} ₽` : `${item.price} ₽`;
        if (item.flavors?.length) return `<div class="product-card" data-id="${item.id}" data-has-flavors="true"><img class="product-image" src="${img}" loading="lazy" decoding="async" onerror="this.src='https://placehold.co/400x300/1E293B/3B82F6?text=No+Image'"><div class="product-title">${nm}</div><div class="product-price">${price}</div><div class="product-desc">${desc}</div></div>`;
        const st = formatStock(item.stock), fav = isFavorite(item.id, 0, true), stText = st.isOutOfStock ? 'Нет в наличии' : `${st.available} шт`;
        return `<div class="product-card" data-id="${item.id}" data-has-flavors="false"><div style="display:flex;justify-content:space-between;align-items:center;"><div class="product-title">${nm}</div><button class="favorite-btn-simple ${fav ? 'active' : ''}" data-product-id="${item.id}" data-product-name="${nm}" data-price="${item.price}" data-image="${img}" data-category="${catName}">${fav ? '❤️' : '🤍'}</button></div><img class="product-image" src="${img}" loading="lazy" decoding="async" onerror="this.src='https://placehold.co/400x300/1E293B/3B82F6?text=No+Image'"><div class="product-price">${price}</div><div class="product-desc">${desc}</div><div style="margin:5px 0;font-size:0.8rem;color:#94A3B8;">📦 Остаток: ${stText}</div>${!st.isOutOfStock ? `<button class="order-pill" data-order-name="${nm}" data-order-price="${item.price}" data-order-image="${img}" data-order-maxstock="${st.available}">📦 В корзину</button>` : '<div style="color:#EF4444;font-size:0.8rem;text-align:center;padding:10px;">❌ Нет в наличии</div>'}</div>`;
    }).join('');
    document.querySelectorAll('.order-pill').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); addToCart(b.dataset.orderName, b.dataset.orderName, +b.dataset.orderPrice, b.dataset.orderImage, +b.dataset.orderMaxstock); }));
    document.querySelectorAll('.favorite-btn-simple').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(b.dataset.productName, null, +b.dataset.price, b.dataset.image, b.dataset.category, +b.dataset.productId, 0, true); }));
    document.querySelectorAll('.product-card[data-has-flavors="true"]').forEach(card => { const id = +card.dataset.id; const item = items.find(i => i.id === id); if (item?.flavors) card.addEventListener('click', () => openFlavors(item)); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openFlavors(parentItem, highlightVariant = null) {
    saveToHistory(parentItem); recordView(parentItem.id, currentCategory);
    document.getElementById('productsPage').classList.remove('active'); document.getElementById('flavorsPage').classList.add('active'); document.getElementById('flavorsPageTitle').textContent = `${parentItem.name} — выберите вариант`;
    const c = document.getElementById('flavorsContainer');
    if (!parentItem.flavors?.length) { c.innerHTML = '<div class="empty-msg">📭 Пусто</div>'; return; }
    c.innerHTML = `<div class="flavors-list">${parentItem.flavors.map((f, idx) => { const st = formatStock(f.stock), fav = isFavorite(parentItem.id, idx, false); return `<div class="flavor-item"><div style="display:flex;justify-content:space-between;align-items:center;width:100%;"><div class="flavor-name">${escapeHtml(f.name)}</div><button class="favorite-btn-option ${fav ? 'active' : ''}" data-product-id="${parentItem.id}" data-variant-id="${idx}" data-product-name="${escapeHtml(parentItem.name)}" data-variant-name="${escapeHtml(f.name)}" data-price="${f.price}" data-image="${parentItem.image}" data-category="${currentCategory}">${fav ? '❤️' : '🤍'}</button></div><span class="flavor-price">${f.price} ₽</span><span class="flavor-stock ${st.isOutOfStock || st.isLow ? 'stock-low' : ''}">${st.text}</span><button class="flavor-order-btn" data-flavor-name="${escapeHtml(f.name)}" data-flavor-price="${f.price}" data-product-name="${escapeHtml(parentItem.name)}" data-product-image="${parentItem.image || ''}" data-product-maxstock="${st.available}" ${st.isOutOfStock ? 'disabled' : ''}>📦 В корзину</button></div>`; }).join('')}</div>`;
    document.querySelectorAll('.flavor-order-btn:not([disabled])').forEach(b => b.addEventListener('click', () => { addToCart(b.dataset.productName, b.dataset.flavorName, +b.dataset.flavorPrice, b.dataset.productImage, +b.dataset.productMaxstock); }));
    document.querySelectorAll('.favorite-btn-option').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(b.dataset.productName, b.dataset.variantName, +b.dataset.price, b.dataset.image, b.dataset.category, +b.dataset.productId, +b.dataset.variantId, false); }));
    if (highlightVariant) { document.querySelectorAll('.flavor-item').forEach(el => { if (el.querySelector('.flavor-name')?.textContent.trim() === highlightVariant) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToHome() { document.getElementById('mainPage').style.display = 'block'; document.getElementById('productsPage').classList.remove('active'); document.getElementById('flavorsPage').classList.remove('active'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function goBackToCategory() { document.getElementById('flavorsPage').classList.remove('active'); document.getElementById('productsPage').classList.add('active'); if (currentCategory) openCategory(currentCategory); }

let scrollTicking = false;
function handleScroll() { if (!scrollTicking) { requestAnimationFrame(() => { const h = document.getElementById('header'); if (window.scrollY > 100) h.classList.add('visible'); else h.classList.remove('visible'); scrollTicking = false; }); scrollTicking = true; } }

const backgrounds = ["https://i.ibb.co/5hYz909b/istockphoto-1399967405-612x612.jpg", "https://i.ibb.co/mrGR4qTc/2026-04-05-122820613.png", "https://i.ibb.co/YBH1vwHc/2026-04-05-122925535.png"];
let bgIndex = 0;
const hero = document.getElementById('heroSection');
if (hero) setInterval(() => { bgIndex = (bgIndex + 1) % backgrounds.length; hero.style.backgroundImage = `url('${backgrounds[bgIndex]}')`; }, 4500);

let searchTimeout;
function setupSearch() { const si = document.getElementById('searchInput'), sr = document.getElementById('searchResults'); if (!si) return; si.addEventListener('input', function() { clearTimeout(searchTimeout); const q = this.value.trim().toLowerCase(); if (q.length < 2) { sr.classList.remove('show'); return; } searchTimeout = setTimeout(() => performSearch(q), 300); }); document.addEventListener('click', function(e) { if (!si.contains(e.target) && !sr.contains(e.target)) sr.classList.remove('show'); }); }

function performSearch(q) { const res = []; for (const [cat, items] of Object.entries(allItems)) { for (const item of items) { if (item.name.toLowerCase().includes(q)) res.push({ name: item.name, category: cat, price: item.flavors ? `от ${Math.min(...item.flavors.map(f => f.price))} ₽` : `${item.price} ₽`, id: item.id, hasFlavors: !!item.flavors }); else if (item.flavors) { for (const f of item.flavors) { if (f.name.toLowerCase().includes(q)) { res.push({ name: `${item.name} — ${f.name}`, category: cat, price: `${f.price} ₽`, id: item.id, hasFlavors: true, flavorName: f.name }); break; } } } } } renderSearchResults(res.slice(0, 10)); }

function renderSearchResults(res) { const sr = document.getElementById('searchResults'); if (res.length === 0) { sr.innerHTML = '<div class="search-result-item" style="color:#94A3B8;">😔 Ничего не найдено</div>'; sr.classList.add('show'); return; } sr.innerHTML = res.map(r => `<div class="search-result-item" data-category="${r.category}" data-id="${r.id}" data-has-flavors="${r.hasFlavors}" data-flavor-name="${r.flavorName || ''}"><div class="search-result-name">${escapeHtml(r.name)}</div><div class="search-result-category">${r.category}</div><div class="search-result-price">${r.price}</div></div>`).join(''); sr.classList.add('show'); document.querySelectorAll('.search-result-item').forEach(el => el.addEventListener('click', () => { const cat = el.dataset.category, id = +el.dataset.id, hf = el.dataset.hasFlavors === 'true', fn = el.dataset.flavorName; sr.classList.remove('show'); document.getElementById('searchInput').value = ''; openCategory(cat); if (hf) setTimeout(() => { const item = allItems[cat]?.find(i => i.id === id); if (item?.flavors) openFlavors(item, fn); }, 100); })); }

// ========== СТАРТ ==========
document.getElementById('backHomeBtn')?.addEventListener('click', goToHome);
document.getElementById('backFlavorsHomeBtn')?.addEventListener('click', goBackToCategory);
document.getElementById('homeLogoBtn')?.addEventListener('click', goToHome);
document.getElementById('scrollHint')?.addEventListener('click', () => document.getElementById('categoriesSection')?.scrollIntoView({ behavior: 'smooth' }));
window.addEventListener('scroll', handleScroll, { passive: true });
loadAllData();
handleScroll();
setTimeout(() => { setupSearch(); }, 500);
document.getElementById('clearHistoryBtn')?.addEventListener('click', clearHistory);
document.getElementById('clearFavoritesBtn')?.addEventListener('click', () => { favorites = []; saveFavorites(); showToast("❤️ Избранное очищено", false); });
