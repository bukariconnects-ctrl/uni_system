# Sprint 23: E2E Testing Setup with Playwright

### الوصف
إعداد بنية اختبارات End-to-End باستخدام Playwright مع كتابة مجموعة اختبارات أساسية تغطي تدفق المصادقة ورحلة الطالب.

### المكونات

#### 1. Playwright Configuration
- `playwright.config.ts`
  - testDir: `./tests`
  - baseURL: `http://localhost:3000`
  - locale: `ar-SA`, timezone: `Asia/Riyadh`
  - مشاريع: Desktop Chrome + Mobile Chrome (Pixel 5)
  - webServer: يشغّل `npm run dev` تلقائياً
  - trace: on-first-retry

#### 2. Authentication Tests (`tests/auth.spec.ts`)
5 اختبارات:
- عرض صفحة تسجيل الدخول
- رفض بيانات اعتماد خاطئة
- تسجيل دخول ناجح
- إعادة توجيه المستخدم غير المصادق
- تسجيل خروج ناجح

#### 3. Student Journey Tests (`tests/student-journey.spec.ts`)
11 اختباراً:
- عرض لوحة تحكم الطالب
- التنقل بين الصفحات (المقررات، التكاليف، الحضور، الدرجات، الرسائل، UniBot، التذاكر)
- فتح نموذج تذكرة جديدة
- ملء نموذج التذكرة والانتقال لخطوة AI
- تبديل الوضع الداكن
- الانتقال لصفحة الملف الشخصي

#### 4. Test Scripts (package.json)
```json
"test:e2e": "npx playwright test",
"test:e2e:ui": "npx playwright test --ui",
"test:e2e:report": "npx playwright show-report"
```

### Environment Variables for Tests
```
TEST_USER_EMAIL=student@test.unibot.com
TEST_USER_PASSWORD=Test123456!
```

### الملفات المُنشأة
- `playwright.config.ts`
- `tests/auth.spec.ts`
- `tests/student-journey.spec.ts`

### الملفات المُعدَّلة
- `package.json` — إضافة 3 scripts للاختبارات

### الحزم المُضافة
- `@playwright/test` — إطار اختبارات E2E

### التشغيل
```bash
# تثبيت المتصفحات (مرة واحدة)
npx playwright install

# تشغيل الاختبارات
npm run test:e2e

# تشغيل مع واجهة رسومية
npm run test:e2e:ui

# عرض التقرير
npm run test:e2e:report
```
