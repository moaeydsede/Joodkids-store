import { firebaseConfig, appConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, query, orderBy, getDocs, where, limit, Timestamp, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });

const CART_KEY = "jk_cart_v1";
const SETTINGS_KEY = "jk_settings_v1";

function money(v){
  const n = Number(v);
  return fmt.format(Number.isFinite(n) ? n : 0) + " " + (appConfig.currency || "");
}

function readCart(){
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
}
function writeCart(items){
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  renderCart();
}
function cartCount(items){ return items.reduce((a,i)=>a+(i.qty||0),0); }
function cartTotal(items){ return items.reduce((a,i)=>a+(i.qty||0)*(Number(i.priceWholesale)||0),0); }


function openMenu(){
  $("menu").classList.remove("hidden");
  $("menuBackdrop").classList.remove("hidden");
}
function closeMenu(){
  $("menu").classList.add("hidden");
  $("menuBackdrop").classList.add("hidden");
}
function openCart(){
  $("cart").classList.remove("hidden");
  $("backdrop").classList.remove("hidden");
}
function closeCart(){
  $("cart").classList.add("hidden");
  $("backdrop").classList.add("hidden");
}
function openModal(){
  $("modal").classList.remove("hidden");
}
function closeModal(){
  $("modal").classList.add("hidden");
}

let PRODUCTS = [];
let ACTIVE = null;

function safeImg(url){
  return url || "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>
      <rect width='100%' height='100%' fill='#f6f6f6'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#999' font-family='Arial' font-size='22'>No Image</text>
    </svg>
  `);
}

function parseSizes(sizes){
  if (Array.isArray(sizes)) return sizes.map(String).filter(Boolean);
  if (typeof sizes === "string") return sizes.split(/[ ,]+/).map(s=>s.trim()).filter(Boolean);
  return ["3","6","9"];
}

function productCard(p){
  const img = safeImg(p.imageUrl || p.imageUrls?.[0]);
  const div = document.createElement("div");
  div.className = "card product";
  div.innerHTML = `
    <div class="imgWrap">
      <img loading="lazy" alt="" src="${img}">
      <div class="badge">Model ${escapeHtml(p.model || "")}</div>
    </div>
    <div class="row between">
      <div>
        <div class="title">${escapeHtml(p.name || "")}</div>
        <div class="muted">مقاسات: ${escapeHtml(parseSizes(p.sizes).join(" / "))}</div>
      </div>
      <div class="price">${money((p.priceWholesale ?? p.price))}</div>
    </div>
    <button class="btn ghost">عرض التفاصيل</button>
  `;
  div.querySelector("button").onclick = () => showProduct(p);
  div.querySelector("img").onerror = (e) => { e.target.src = safeImg(""); };
  return div;
}

function escapeHtml(str){
  return String(str||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function renderGrid(list){
  const grid = $("grid");
  grid.innerHTML = "";
  list.forEach(p => grid.appendChild(productCard(p)));
  $("empty").classList.toggle("hidden", list.length !== 0);
}

function applyFilters(){
  const q = ($("q").value || "").trim().toLowerCase();
  const sort = $("sort").value;

  let list = [...PRODUCTS];
  if (q){
    list = list.filter(p =>
      String(p.name||"").toLowerCase().includes(q) ||
      String(p.model||"").toLowerCase().includes(q)
    );
  }
  if (sort === "priceAsc") list.sort((a,b)=>(Number(a.price)||0)-(Number(b.price)||0));
  else if (sort === "priceDesc") list.sort((a,b)=>(Number(b.price)||0)-(Number(a.price)||0));
  else list.sort((a,b)=> (b.createdAtMillis||0) - (a.createdAtMillis||0));

  renderGrid(list);
}

function showProduct(p){
  ACTIVE = p;
  $("mImg").src = safeImg(p.imageUrl || p.imageUrls?.[0]);
  $("mImg").onerror = (e)=>{ e.target.src = safeImg(""); };
  $("mName").textContent = p.name || "";
  $("mModel").textContent = "Model " + (p.model || "");
  $("mPrice").textContent = money((p.priceWholesale ?? p.price));
  $("mDesc").textContent = p.desc || "";

  const sizes = parseSizes(p.sizes);
  $("mSize").innerHTML = sizes.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
  openModal();
}

function addToCart(product, size){
  const items = readCart();
  const key = product.id + "::" + size;
  const existing = items.find(i => i.key === key);
  if (existing) existing.qty += 1;
  else items.push({
    key,
    id: product.id,
    name: product.name,
    model: product.model,
    size,
    priceWholesale: Number(product.priceWholesale ?? product.price)||0,
    imageUrl: product.imageUrl || product.imageUrls?.[0] || "",
    qty: 1
  });
  writeCart(items);
}

function renderCart(){
  const items = readCart();
  $("cartCount").textContent = String(cartCount(items));
  $("cartSub").textContent = `${cartCount(items)} عنصر`;
  $("cartTotal").textContent = money(cartTotal(items));

  const wrap = $("cartItems");
  wrap.innerHTML = "";
  if (!items.length){
    wrap.innerHTML = `<div class="empty">السلة فارغة.</div>`;
    return;
  }
  items.forEach((i, idx)=>{
    const row = document.createElement("div");
    row.className = "cartRow";
    row.innerHTML = `
      <img alt="" src="${safeImg(i.imageUrl)}" />
      <div>
        <div class="title">${escapeHtml(i.name)}</div>
        <div class="muted">Model ${escapeHtml(i.model)} • Size ${escapeHtml(i.size)}</div>
        <div class="muted">${money(i.priceWholesale)}</div>
      </div>
      <div class="qty">
        <button class="btn ghost" data-act="minus">−</button>
        <div class="title">${i.qty}</div>
        <button class="btn ghost" data-act="plus">+</button>
      </div>
    `;
    row.querySelectorAll("button").forEach(btn=>{
      btn.onclick = () => {
        const act = btn.dataset.act;
        const items2 = readCart();
        const it = items2.find(x=>x.key===i.key);
        if (!it) return;
        if (act==="plus") it.qty += 1;
        if (act==="minus") it.qty -= 1;
        const cleaned = items2.filter(x => (x.qty||0) > 0);
        writeCart(cleaned);
      };
    });
    wrap.appendChild(row);
  });
}

async function loadSettings(){
  // settings are stored in Firestore (/settings/main) but we also cache in localStorage to keep UI fast
  try{
    const cached = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    applySettings(cached);
  }catch{}

  try{
    const { getDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
    const ref = doc(db, "settings", appConfig.companyId || "main");
    const snap = await getDoc(ref);
    if (snap.exists()){
      const s = snap.data();
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
      applySettings(s);
    }
  }catch{}
}

function applySettings(s){
  const ig = s?.instagram || "#";
  const fb = s?.facebook || "#";
  const tg = s?.telegram || "#";
  $("igLink").href = ig;
  $("fbLink").href = fb;
  $("tgLink").href = tg;

  const shop = s?.shopMapEmbedUrl || "";
  const factory = s?.factoryMapEmbedUrl || "";
  $("shopMap").src = shop;
  $("factoryMap").src = factory;
}

async function checkout(){
  const items = readCart();
  if (!items.length) return alert("السلة فارغة.");

  const customerName = prompt("اسم العميل:");
  if (!customerName) return;

  const customerPhone = prompt("رقم الهاتف:");
  if (!customerPhone) return;

  const city = prompt("المدينة / المحافظة:");
  if (!city) return;

  const address = prompt("العنوان (الشارع/علامة مميزة):");
  if (!address) return;

  const payMethod = $("payMethod").value || "cash";

  try{
    $("checkout").disabled = true;
    await addDoc(collection(db, "orders"), {
      companyId: appConfig.companyId || "main",
      customerName,
      customerPhone,
      city,
      address,
      payMethod,
      items,
      total: cartTotal(items),
      status: "new",
      createdAt: serverTimestamp()
    });
    writeCart([]);
    alert("تم إرسال الطلب بنجاح ✅");
    closeCart();
  }catch(e){
    console.error(e);
    alert("تعذر إرسال الطلب. تحقق من Firestore Rules.");
  }finally{
    $("checkout").disabled = false;
  }
}

async function loadProducts(){
  $("loading").classList.remove("hidden");
  $("empty").classList.add("hidden");
  try{
    const qy = query(
      collection(db, "products"),
      where("companyId", "==", appConfig.companyId || "main"),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const snap = await getDocs(qy);
    PRODUCTS = snap.docs.map(d => {
      const data = d.data();
      const createdAtMillis = data?.createdAt?.toMillis?.() || 0;
      return { id: d.id, ...data, createdAtMillis };
    });
    $("statProducts").textContent = String(PRODUCTS.length);
    applyFilters();
  }catch(e){
    console.error(e);
    $("empty").textContent = "تعذر تحميل المنتجات. تأكد من إعدادات Firebase.";
    $("empty").classList.remove("hidden");
  }finally{
    $("loading").classList.add("hidden");
  }
}

async function loadOrdersStat(){
  // lightweight stat: count orders created today (best effort)
  try{
    const { startOfDay, endOfDay } = getTodayRange();
    const { Timestamp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
    const qy = query(
      collection(db, "orders"),
      where("companyId", "==", appConfig.companyId || "main"),
      where("createdAt", ">=", Timestamp.fromMillis(startOfDay)),
      where("createdAt", "<=", Timestamp.fromMillis(endOfDay)),
      limit(500)
    );
    const snap = await getDocs(qy);
    $("statOrders").textContent = String(snap.size);
  }catch{
    $("statOrders").textContent = "—";
  }
}

function getTodayRange(){
  const d = new Date();
  d.setHours(0,0,0,0);
  const start = d.getTime();
  const end = start + 24*60*60*1000 - 1;
  return { startOfDay: start, endOfDay: end };
}

/* Events */
$("btnMenu").onclick = openMenu;
$("closeMenu").onclick = closeMenu;
$("menuBackdrop").onclick = closeMenu;

$("btnCart").onclick = openCart;
$("closeCart").onclick = closeCart;
$("backdrop").onclick = () => { closeCart(); closeModal(); closeMenu(); };
$("closeModal").onclick = closeModal;
$("modal").onclick = (e)=>{ if (e.target.id==="modal") closeModal(); };

$("q").oninput = applyFilters;
$("sort").onchange = applyFilters;

$("mAdd").onclick = () => {
  if (!ACTIVE) return;
  const size = $("mSize").value || "";
  addToCart(ACTIVE, size);
  closeModal();
  openCart();
};

$("checkout").onclick = checkout;

renderCart();
loadSettings();
loadProducts();
loadOrdersStat();

/* PWA */
if ("serviceWorker" in navigator){
  window.addEventListener("load", ()=> navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}

// Close menu on click any menu link
document.addEventListener("click", (e)=>{
  const a = e.target.closest?.("a.menuLink");
  if (a) closeMenu();
});
