import { firebaseConfig, appConfig } from "./firebase-config.js";
import { uploadToCloudinary } from "./cloudinary.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc, serverTimestamp, limit } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 2 });

function money(v){
  const n = Number(v);
  return fmt.format(Number.isFinite(n) ? n : 0) + " " + (appConfig.currency || "");
}

let PRODUCTS = [];
let ACTIVE_ID = null;
let ACTIVE_IMAGES = []; // array of {url, public_id}

function parseSizesToArray(s){
  if (Array.isArray(s)) return s.map(String).filter(Boolean);
  return String(s||"").split(",").map(x=>x.trim()).filter(Boolean);
}
function setMsg(id, text){
  $(id).textContent = text || "";
}

function requireAuthUI(isAuthed){
  $("authPanel").classList.toggle("hidden", isAuthed);
  $("adminPanel").classList.toggle("hidden", !isAuthed);
  $("settingsPanel").classList.toggle("hidden", !isAuthed);
  $("ordersPanel").classList.toggle("hidden", !isAuthed);
  $("btnSignOut").classList.toggle("hidden", !isAuthed);
}

async function loadProducts(){
  const qy = query(
    collection(db, "products"),
    where("companyId", "==", appConfig.companyId || "main"),
    orderBy("createdAt", "desc"),
    limit(500)
  );
  const snap = await getDocs(qy);
  PRODUCTS = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  renderProductList(PRODUCTS);
}

function renderProductList(list){
  const q = ($("aq").value||"").trim().toLowerCase();
  const filtered = q ? list.filter(p =>
    String(p.name||"").toLowerCase().includes(q) ||
    String(p.model||"").toLowerCase().includes(q)
  ) : list;

  const wrap = $("productList");
  wrap.innerHTML = "";
  $("pEmpty").classList.toggle("hidden", filtered.length !== 0);

  filtered.forEach(p=>{
    const row = document.createElement("div");
    row.className = "itemRow";
    row.innerHTML = `
      <div>
        <div class="title">${escapeHtml(p.name||"")}</div>
        <div class="muted">Model ${escapeHtml(p.model||"")} • ${money(p.priceWholesale ?? p.price)}</div>
      </div>
      <button class="btn ghost">تعديل</button>
    `;
    row.querySelector("button").onclick = ()=> loadIntoForm(p);
    wrap.appendChild(row);
  });
}

function escapeHtml(str){
  return String(str||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function clearForm(){
  ACTIVE_ID = null;
  ACTIVE_IMAGES = [];
  $("formTitle").textContent = "إضافة / تعديل";
  $("pName").value = "";
  $("pModel").value = "";
  $("pPrice").value = "";
  $("pSizes").value = "3,6,9";
  $("pDesc").value = "";
  $("pImgFile").value = "";
  $("imgPreview").innerHTML = "";
  $("btnDelete").classList.add("hidden");
  setMsg("formMsg","");
}

function renderThumbs(){
  const wrap = $("imgPreview");
  wrap.innerHTML = "";
  ACTIVE_IMAGES.forEach((img, idx)=>{
    const el = document.createElement("div");
    el.innerHTML = `
      <img alt="" src="${img.url}" />
    `;
    el.querySelector("img").onerror = (e)=> e.target.style.display="none";
    el.onclick = ()=>{
      if (!confirm("حذف هذه الصورة من المنتج؟ (لن تُحذف من Cloudinary تلقائياً)")) return;
      ACTIVE_IMAGES.splice(idx,1);
      renderThumbs();
    };
    wrap.appendChild(el);
  });
}

function loadIntoForm(p){
  ACTIVE_ID = p.id;
  $("formTitle").textContent = "تعديل المنتج";
  $("pName").value = p.name || "";
  $("pModel").value = p.model || "";
  $("pPrice").value = String((p.priceWholesale ?? p.price) ?? "");
  $("pSizes").value = Array.isArray(p.sizes) ? p.sizes.join(",") : (p.sizes || "3,6,9");
  $("pDesc").value = p.desc || "";
  ACTIVE_IMAGES = [];
  const urls = p.imageUrls || (p.imageUrl ? [p.imageUrl] : []);
  urls.forEach(u => ACTIVE_IMAGES.push({ url: u, public_id: null }));
  renderThumbs();
  $("btnDelete").classList.remove("hidden");
  setMsg("formMsg","");
}

async function uploadImage(){
  const f = $("pImgFile").files?.[0];
  if (!f) return alert("اختر صورة أولاً.");
  try{
    setMsg("formMsg","جاري رفع الصورة إلى Cloudinary...");
    $("btnUpload").disabled = true;
    const up = await uploadToCloudinary(f);
    ACTIVE_IMAGES.push({ url: up.secure_url, public_id: up.public_id });
    renderThumbs();
    setMsg("formMsg","تم رفع الصورة ✅ اضغط حفظ لتثبيتها بالمنتج.");
  }catch(e){
    console.error(e);
    alert("فشل رفع الصورة: " + (e.message || e));
    setMsg("formMsg","");
  }finally{
    $("btnUpload").disabled = false;
  }
}

function validateProduct(){
  const name = $("pName").value.trim();
  const model = $("pModel").value.trim();
  const price = Number($("pPrice").value);
  const sizes = parseSizesToArray($("pSizes").value);
  if (!name) return "اسم المنتج مطلوب";
  if (!model) return "Model مطلوب";
  if (!Number.isFinite(price) || price < 0) return "السعر غير صحيح";
  if (!sizes.length) return "المقاسات مطلوبة";
  if (!ACTIVE_IMAGES.length) return "ارفع صورة واحدة على الأقل";
  return null;
}

async function saveProduct(){
  const err = validateProduct();
  if (err) return alert(err);

  const payload = {
    companyId: appConfig.companyId || "main",
    name: $("pName").value.trim(),
    model: $("pModel").value.trim(),
    priceWholesale: Number($("pPrice").value),
    sizes: parseSizesToArray($("pSizes").value),
    desc: $("pDesc").value.trim(),
    imageUrls: ACTIVE_IMAGES.map(x=>x.url),
    updatedAt: serverTimestamp()
  };

  try{
    $("btnSave").disabled = true;
    setMsg("formMsg","جاري الحفظ...");
    if (ACTIVE_ID){
      await updateDoc(doc(db, "products", ACTIVE_ID), payload);
      setMsg("formMsg","تم التحديث ✅");
    }else{
      payload.createdAt = serverTimestamp();
      const ref = await addDoc(collection(db, "products"), payload);
      ACTIVE_ID = ref.id;
      $("btnDelete").classList.remove("hidden");
      setMsg("formMsg","تمت الإضافة ✅");
    }
    await loadProducts();
  }catch(e){
    console.error(e);
    alert("فشل الحفظ. تأكد من Firestore Rules و UID الأدمن.");
    setMsg("formMsg","");
  }finally{
    $("btnSave").disabled = false;
  }
}

async function deleteProduct(){
  if (!ACTIVE_ID) return;
  if (!confirm("تأكيد حذف المنتج؟")) return;
  try{
    $("btnDelete").disabled = true;
    await deleteDoc(doc(db, "products", ACTIVE_ID));
    clearForm();
    await loadProducts();
  }catch(e){
    console.error(e);
    alert("فشل الحذف. تأكد من صلاحيات الأدمن.");
  }finally{
    $("btnDelete").disabled = false;
  }
}

/* Settings */
async function loadSettings(){
  const ref = doc(db, "settings", appConfig.companyId || "main");
  const snap = await getDoc(ref);
  const s = snap.exists() ? snap.data() : {};
  $("sIG").value = s.instagram || "";
  $("sFB").value = s.facebook || "";
  $("sTG").value = s.telegram || "";
  $("sShopMap").value = s.shopMapEmbedUrl || "";
  $("sFactoryMap").value = s.factoryMapEmbedUrl || "";
}

async function saveSettings(){
  try{
    $("btnSaveSettings").disabled = true;
    $("settingsMsg").textContent = "جاري الحفظ...";
    const ref = doc(db, "settings", appConfig.companyId || "main");
    await setDoc(ref, {
      instagram: $("sIG").value.trim(),
      facebook: $("sFB").value.trim(),
      telegram: $("sTG").value.trim(),
      shopMapEmbedUrl: $("sShopMap").value.trim(),
      factoryMapEmbedUrl: $("sFactoryMap").value.trim(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    $("settingsMsg").textContent = "تم الحفظ ✅";
  }catch(e){
    console.error(e);
    alert("فشل حفظ الإعدادات. تحقق من الصلاحيات.");
    $("settingsMsg").textContent = "";
  }finally{
    $("btnSaveSettings").disabled = false;
  }
}

/* Orders */
async function loadOrders(){
  const filter = $("oFilter").value || "all";
  let qy = query(
    collection(db, "orders"),
    where("companyId", "==", appConfig.companyId || "main"),
    orderBy("createdAt", "desc"),
    limit(200)
  );
  const snap = await getDocs(qy);
  let list = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  if (filter !== "all") list = list.filter(o => o.status === filter);
  renderOrders(list);
}

function renderOrders(list){
  const wrap = $("ordersList");
  wrap.innerHTML = "";
  $("oEmpty").classList.toggle("hidden", list.length !== 0);

  list.forEach(o=>{
    const items = Array.isArray(o.items) ? o.items : [];
    const row = document.createElement("div");
    row.className = "itemRow";
    row.innerHTML = `
      <div>
        <div class="title">${escapeHtml(o.customer?.name||"عميل")}</div>
        <div class="muted">${escapeHtml(o.customer?.phone||"")} • ${escapeHtml(o.payMethod||"")}</div>
        <div class="muted">${items.length} صنف • ${money(o.total||0)} • الحالة: ${escapeHtml(o.status||"")}</div>
      </div>
      <select class="input" style="max-width:160px">
        <option value="new">جديد</option>
        <option value="processing">قيد التجهيز</option>
        <option value="done">مكتمل</option>
      </select>
    `;
    const sel = row.querySelector("select");
    sel.value = o.status || "new";
    sel.onchange = async ()=>{
      try{
        await updateDoc(doc(db,"orders",o.id), { status: sel.value, updatedAt: serverTimestamp() });
      }catch{
        alert("فشل تحديث الحالة.");
      }
    };
    wrap.appendChild(row);
  });
}

/* Auth */
$("btnSignIn").onclick = async ()=>{
  const email = $("email").value.trim();
  const pass = $("pass").value;
  if (!email || !pass) return alert("أدخل البريد وكلمة المرور.");
  try{
    setMsg("authMsg","جاري تسجيل الدخول...");
    await signInWithEmailAndPassword(auth, email, pass);
    setMsg("authMsg","");
  }catch(e){
    console.error(e);
    setMsg("authMsg","فشل الدخول. تأكد من الحساب.");
  }
};
$("btnSignOut").onclick = ()=> signOut(auth).catch(()=>{});

$("btnNew").onclick = clearForm;
$("aq").oninput = ()=> renderProductList(PRODUCTS);
$("btnUpload").onclick = uploadImage;
$("btnSave").onclick = saveProduct;
$("btnDelete").onclick = deleteProduct;
$("btnSaveSettings").onclick = saveSettings;
$("btnRefreshOrders").onclick = loadOrders;
$("oFilter").onchange = loadOrders;

onAuthStateChanged(auth, async (user)=>{
  requireAuthUI(!!user);
  if (user){
    clearForm();
    await loadProducts();
    await loadSettings();
    await loadOrders();
  }
});
