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
let cart = [];

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
}

// ИСПРАВЛЕНО: корректно возвращаем available для любого количества
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

function updateCartIcon() {
    let cartBtn = document.getElementById('cartBtn');
    if (!cartBtn) {
        const cartHtml = `<div class="cart-icon" id="cartBtn" style="position:fixed; bottom:20px; right:20px; background:#3B82F6; width:55px; height:55px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:1000; box-shadow:0 0 15px rgba(59,130,246,0.5);">
            <span style="font-size:24px;">🛒</span>
            <span id="cartCount" style="position:absolute; top:-5px; right:-5px; background:#ff0040; color:white; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; font-size:12px;">0</span>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', cartHtml);
        document.getElementById('cartBtn').addEventListener('click', showCartModal);
    }
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const countSpan = document.getElementById('cartCount');
    if (countSpan) countSpan.textContent = totalItems;
}

// ИСПРАВЛЕНО: теперь проверяем maxStock > 0 и текущее количество
function addToCart(productName, variantName, price, image, maxStock) {
    if (!maxStock || maxStock <= 0) {
        showToast(`❌ Товар "${productName} (${variantName})" закончился`);
        return false;
    }
    const existingItem = cart.find(item => item.productName === productName && item.variantName === variantName);
    const currentQty = existingItem ? existingItem.quantity : 0;
    if (currentQty >= maxStock) {
        showToast(`❌ Нельзя добавить больше ${maxStock} шт. товара "${productName}"`);
        return false;
    }
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ productName, variantName, price, image, quantity: 1, maxStock });
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
    modalDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); backdrop-filter:blur(12px); z-index:9999; display:flex; justify-content:center; align-items:center;';
    let totalPrice = 0;
    let cartHtml = `<div class="modal-content" style="background:#0F172A; border-radius:40px; padding:30px; max-width:500px; width:90%; max-height:80vh; overflow-y:auto;"><h3>🛒 Корзина</h3>`;
    cart.forEach((item, idx) => {
        const itemTotal = item.price * item.quantity;
        totalPrice += itemTotal;
        cartHtml += `<div style="display:flex; gap:10px; padding:10px; border-bottom:1px solid #1F2A44; flex-wrap:wrap;">
            <img src="${item.image}" style="width:50px; height:50px; object-fit:cover; border-radius:10px;">
            <div style="flex:1;"><strong>${escapeHtml(item.productName)}</strong><br>${escapeHtml(item.variantName)}<br>${item.price}₽ × ${item.quantity} = ${itemTotal}₽</div>
            <div><button onclick="updateQuantity(${idx}, -1)" style="background:#EF4444; border:none; width:30px; height:30px; border-radius:50%; color:white; cursor:pointer;">-</button> <button onclick="updateQuantity(${idx}, 1)" style="background:#10B981; border:none; width:30px; height:30px; border-radius:50%; color:white; cursor:pointer;">+</button></div>
        </div>`;
    });
    cartHtml += `<div style="text-align:right; padding:10px; font-weight:bold;">Итого: ${totalPrice}₽</div>
        <button onclick="checkout()" style="background:#10B981; width:100%; padding:12px; border:none; border-radius:60px; color:white; font-weight:bold; cursor:pointer;">📤 Оформить</button>
        <button onclick="this.closest('.modal').remove()" style="background:#334155; width:100%; padding:10px; margin-top:10px; border:none; border-radius:60px; color:white; cursor:pointer;">Закрыть</button>
    </div>`;
    modalDiv.innerHTML = cartHtml;
    document.body.appendChild(modalDiv);
}

window.updateQuantity = function(idx, delta) {
    const item = cart[idx];
    const newQty = item.quantity + delta;
    if (newQty < 1) {
        cart.splice(idx, 1);
    } else if (newQty <= item.maxStock) {
        item.quantity = newQty;
    } else {
        showToast(`❌ Нельзя добавить больше ${item.maxStock} шт. товара "${item.productName}"`);
        return;
    }
    updateCartIcon();
    document.querySelector('.modal')?.remove();
    showCartModal();
};

window.checkout = function() {
    document.querySelector('.modal')?.remove();
    let msg = "🛒 НОВЫЙ ЗАКАЗ 🛒\n\n";
    let total = 0;
    cart.forEach((item, i) => {
        const sum = item.price * item.quantity;
        total += sum;
        msg += `${i+1}. ${item.productName} (${item.variantName})\n   Цена: ${item.price}₽ × ${item.quantity} = ${sum}₽\n\n`;
    });
    msg += `────────────────\n💰 ИТОГО: ${total}₽\n\n🕐 Заказ с ICESHOP39`;
    const managerTg = prompt("Введите username менеджера (без @):", "ICE_SHOP39");
    if (managerTg) window.open(`https://t.me/${managerTg}?text=${encodeURIComponent(msg)}`, '_blank');
    cart = [];
    updateCartIcon();
    showToast("✅ Заказ отправлен!");
};

function showToast(msg) {
    let toast = document.getElementById('toastMsg');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastMsg';
        toast.style.cssText = 'position:fixed; bottom:90px; left:50%; transform:translateX(-50%); background:#10B981; color:white; padding:12px 20px; border-radius:60px; z-index:10000; font-size:14px; white-space:nowrap;';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 2500);
}

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
        return JSON.parse(clean);
    } catch(e) { return []; }
}

async function loadAllData() {
    for (const cat of categories) allItems[cat.name] = await loadCategory(cat.name);
    renderCategories();
    renderManagers();
    updateCartIcon();
}

function renderManagers() {
    const container = document.getElementById('managersGrid');
    if (container) container.innerHTML = managers.map(m => `<a href="https://t.me/${m.tg}" target="_blank" class="manager-card">${m.name}</a>`).join('');
}

function getCount(catName) { return allItems[catName]?.length || 0; }

function renderCategories() {
    const container = document.getElementById("categoriesGrid");
    if (!container) return;
    container.innerHTML = categories.map(cat => `<div class="category-card" data-category="${cat.name}"><div class="category-icon">${cat.icon}</div><div class="category-name">${cat.name}</div><div class="category-count">${getCount(cat.name)} товаров</div></div>`).join('');
    document.querySelectorAll('.category-card').forEach(card => card.addEventListener('click', () => openCategory(card.dataset.category)));
}

// ИСПРАВЛЕНО: передаём правильный maxStock из stockInfo.available
function openCategory(catName) {
    currentCategory = catName;
    const items = allItems[catName] || [];
    document.getElementById('mainPage').style.display = 'none';
    document.getElementById('productsPage').classList.add('active');
    document.getElementById('productsPageTitle').textContent = catName;
    const container = document.getElementById('productsContainer');
    if (!items.length) { container.innerHTML = '<div class="empty-msg">📭 Товары отсутствуют.</div>'; return; }
    container.innerHTML = items.map(item => {
        const itemName = escapeHtml(item.name);
        const itemImage = item.image || 'https://placehold.co/400x300/1E293B/3B82F6?text=No+Image';
        const itemDesc = item.desc ? escapeHtml(item.desc) : '';
        if (item.flavors?.length) {
            const minPrice = Math.min(...item.flavors.map(f => f.price));
            return `<div class="product-card" data-id="${item.id}" data-has-flavors="true"><img class="product-image" src="${itemImage}" loading="lazy"><div class="product-title">${itemName}</div><div class="product-price">от ${minPrice} ₽</div><div class="product-desc">${itemDesc}</div></div>`;
        } else {
            const stockInfo = formatStock(item.stock);
            const availableQty = stockInfo.available;
            const isAvailable = !stockInfo.isOutOfStock && availableQty > 0;
            return `<div class="product-card" data-id="${item.id}" data-has-flavors="false"><img class="product-image" src="${itemImage}" loading="lazy"><div class="product-title">${itemName}</div><div class="product-price">${item.price} ₽</div><div class="product-desc">${itemDesc}</div>${isAvailable ? `<button class="order-pill" data-name="${itemName}" data-price="${item.price}" data-image="${itemImage}" data-maxstock="${availableQty}">📦 В корзину</button>` : `<div style="color:#EF4444; margin-top:8px;">❌ Нет в наличии</div>`}</div>`;
        }
    }).join('');
    document.querySelectorAll('.order-pill').forEach(btn => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(btn.dataset.name, 'стандарт', parseInt(btn.dataset.price), btn.dataset.image, parseInt(btn.dataset.maxstock));
    }));
    document.querySelectorAll('.product-card[data-has-flavors="true"]').forEach(card => {
        const id = parseInt(card.dataset.id);
        const item = items.find(i => i.id === id);
        if (item?.flavors) card.addEventListener('click', () => openFlavors(item));
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ИСПРАВЛЕНО: для каждого вкуса тоже передаём available из stockInfo
function openFlavors(parentItem) {
    document.getElementById('productsPage').classList.remove('active');
    document.getElementById('flavorsPage').classList.add('active');
    document.getElementById('flavorsPageTitle').textContent = `${parentItem.name} — варианты`;
    const container = document.getElementById('flavorsContainer');
    if (!parentItem.flavors?.length) { container.innerHTML = '<div class="empty-msg">Нет вариантов</div>'; return; }
    container.innerHTML = `<div class="flavors-list">${parentItem.flavors.map(f => {
        const stockInfo = formatStock(f.stock);
        const availableQty = stockInfo.available;
        const isAvailable = !stockInfo.isOutOfStock && availableQty > 0;
        return `<div class="flavor-item"><div class="flavor-name">${escapeHtml(f.name)}</div><span class="flavor-price">${f.price} ₽</span><span class="flavor-stock ${stockInfo.isOutOfStock || stockInfo.isLow ? 'stock-low' : ''}">${stockInfo.text}</span>${isAvailable ? `<button class="flavor-order-btn" data-name="${escapeHtml(f.name)}" data-price="${f.price}" data-image="${parentItem.image}" data-maxstock="${availableQty}">📦 В корзину</button>` : `<button class="flavor-order-btn" disabled style="background:#4B5563; cursor:not-allowed;">❌ Нет</button>`}</div>`;
    }).join('')}</div>`;
    document.querySelectorAll('.flavor-order-btn:not([disabled])').forEach(btn => btn.addEventListener('click', () => addToCart(parentItem.name, btn.dataset.name, parseInt(btn.dataset.price), btn.dataset.image, parseInt(btn.dataset.maxstock))));
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

document.getElementById('backHomeBtn')?.addEventListener('click', goToHome);
document.getElementById('backFlavorsHomeBtn')?.addEventListener('click', goBackToCategory);
document.getElementById('homeLogoBtn')?.addEventListener('click', goToHome);
document.getElementById('scrollHint')?.addEventListener('click', () => document.getElementById('categoriesSection')?.scrollIntoView({ behavior: 'smooth' }));
window.addEventListener('scroll', handleScroll);
loadAllData();
handleScroll();
