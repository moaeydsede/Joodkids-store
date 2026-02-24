JoodKids PRO (Flat)
- ارفع الملفات كما هي على GitHub Pages (بدون مجلدات).
- افتح index.html من الرابط.
- لوحة التحكم: اضغط على اللوجو 5 مرات لفتح admin.html
- تسجيل الدخول عبر Google ثم سيُسمح فقط للأدمن UID.

ملاحظة ضرورية للصور:
- لرفع الصور من المتصفح يجب إنشاء Upload Preset (Unsigned) داخل Cloudinary ثم وضعه داخل "بيانات الشركة" في لوحة التحكم.


✅ الصور:
- الرفع من لوحة التحكم يتم عبر Cloudinary (cloud: dthtzvypx / preset الافتراضي: Joodkids)
- يمكنك لصق رابط صورة من Google Drive وسيتم تحويله تلقائياً لرابط مباشر (يجب جعل الملف Public: Anyone with the link).
تحديث مهم (حل جذري لمشكلة رفع الصور):
- الآن إذا لم يعمل Cloudinary (أو لم يتم ضبط preset صحيح) سيقوم النظام تلقائياً بالرفع إلى Firebase Storage كبديل.
- لكي يعمل رفع الصور إلى Firebase Storage يجب نشر قواعد التخزين (Storage Rules). ستجد ملف:
  storage.rules
  انسخه داخل Firebase Console > Storage > Rules ثم Publish.

ملاحظة:
- عرض الصور من روابط Google Drive يحتاج أن تكون الصور Public (Anyone with the link).
