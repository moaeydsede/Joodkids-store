# JoodKids — متجر احترافي (GitHub Pages + Firebase + Cloudinary)

هذا مشروع جديد نظيف (Vanilla JS + ES Modules) جاهز للنشر على GitHub Pages،
مع:
- قاعدة بيانات: Firestore (Products / Orders / Settings)
- إدارة: Firebase Auth (Email/Password)
- الصور: Cloudinary فقط (Unsigned Upload Preset) — لا يوجد Firebase Storage
- PWA: Manifest + Service Worker

## 1) الإعداد السريع
### A) Firebase
1. أنشئ Firebase Project
2. فعّل **Firestore** و **Authentication > Email/Password**
3. أنشئ حساب Admin (بريد/كلمة مرور)
4. انسخ إعدادات Firebase Web App وضعها داخل:
   `firebase-config.js`

> مهم: من Firebase Console > Authentication > Settings
أضف نطاق GitHub Pages إلى Authorized domains (مثل: `username.github.io`).

### B) Firestore Rules (ضعها كما هي)
انظر ملف: `FIRESTORE_RULES.txt`

### C) Cloudinary
1. أنشئ Upload Preset نوعه **Unsigned**
2. ضع `cloudName` و `uploadPreset` داخل `firebase-config.js`

## 2) النشر على GitHub Pages
- ارفع محتويات هذا المشروع إلى repo
- Settings > Pages > Deploy from branch
- اختر branch: `main` والمجلد `/root`
- افتح رابط GitHub Pages

## 3) الاستخدام
- المتجر: `index.html`
- الإدارة: `admin.html`
  - سجّل دخول بحساب Admin
  - ارفع الصور (Cloudinary) ثم احفظ المنتج

## 4) البنية
- products:
  - name, model, price, sizes[], desc, imageUrls[], companyId, createdAt, updatedAt
- orders:
  - customer{name,phone,address}, items[], total, payMethod, status, createdAt
- settings:
  - instagram, facebook, telegram, shopMapEmbedUrl, factoryMapEmbedUrl


## ملاحظة
- هذا الإصدار مُعبأ مسبقاً بإعدادات Firebase و Cloudinary التي زودتني بها.
- المنتج يُحفظ في Firestore بحقل **priceWholesale** مطابقاً للقواعد.
- الطلب يُحفظ بالحقول: customerName/customerPhone/city/address/total.
