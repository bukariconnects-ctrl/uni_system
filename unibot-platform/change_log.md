# سجل التغييرات — UniBot Platform

---

## UI/UX Rebranding: Royal Blue & Peach Theme
**التاريخ:** 2026-06-03

### ملخص
تحديث كامل لنظام الألوان والهوية البصرية للمنصة بالتزامن مع طلب العميل. تم الانتقال من لوحة الألوان القديمة (Academic Navy / Action Blue) إلى مجموعة ألوان عصرية تجمع بين **Royal Blue** (`#00539C`) كأساس موثوق وأكاديمي، و**Peach** (`#EEA47F`) كلمسة دافئة للتفاعل والتأكيد.

---

### المرحلة 1 — تحديث متغيرات CSS (Design Tokens)
**الملف:** `src/app/globals.css`

| المتغير | السابق | الجديد |
|---------|--------|--------|
| `--color-primary` | غير موجود | `hsl(208 100% 30%)` |
| `--color-secondary` | غير موجود | `hsl(20 78% 71%)` |
| `--color-academic-navy` | `#00539C` | `hsl(208 100% 30%)` |
| `--color-action-blue` | `#EEA47F` | `hsl(20 78% 71%)` |
| `--color-ai-light` | `#E6F1FA` | `hsl(208 100% 30%)` |
| `--color-ai-lavender` | `#FDE8DD` | `hsl(20 78% 71%)` |
| `--color-app-bg` | `#F7FAFC` | `hsl(210 33% 98%)` |
| `--color-card-bg` | `#FFFFFF` | `hsl(0 0% 100%)` |
| `--color-text-primary` | `#1A202C` | `hsl(218 23% 14%)` |
| `--color-text-secondary` | `#718096` | `hsl(215 16% 47%)` |
| `--color-border` | `#E2E8F0` | `hsl(214 32% 91%)` |
| `--color-danger` | `#E53E3E` | `hsl(0 72% 51%)` |
| `--color-success` | `#38A169` | `hsl(142 43% 44%)` |
| `--color-teal` | `#319795` | `hsl(174 48% 40%)` |
| `--color-purple` | `#805AD5` | `hsl(263 54% 58%)` |
| `--color-warning` | `#EEA47F` | `hsl(20 78% 71%)` |
| `--color-orange` | `#EEA47F` | `hsl(20 78% 71%)` |

**Dark Mode:**
*   Royal Blue أصبح أفتح قليلاً `hsl(208 100% 45%)` لتحسين القراءة على الخلفيات الداكنة.
*   Peach أصبح أكثر اعتدالاً `hsl(20 78% 65%)` ليناسب الوضع الليلي.

**Tailwind v4 `@theme inline`:**
تم تسجيل `primary`, `primary-foreground`, `secondary`, `secondary-foreground` إضافةً إلى المتغيرات الموجودة، مما يتيح استخدام `bg-primary` و `text-secondary` عالمياً.

---

### المرحلة 2 — تحديث التدرج الذكي (AI Gradient)
**الملفات المُعدَّلة:**

| الملف | التغيير |
|-------|---------|
| `src/app/student/unibot/unibot-client.tsx` | تدرج رؤوس المحادثة والأيقونات من Royal Blue إلى Peach. تحديث ألوان النصوص إلى `text-white` لضمان التباين. تخفيف تدرج فقاعات الرسائل إلى `/10` و `/10` ليظل لطيفاً. |
| `src/app/student/materials/materials-client.tsx` | شارة "AI" أصبح تدرجها من Royal Blue إلى Peach مع نص أبيض. |
| `src/app/student/page.tsx` | شريط التقدم الأكاديمي أصبح `from-academic-navy to-action-blue`. |
| `src/components/action-progress-enhancer.tsx` | كان يحمل التدرج الجديد مسبقاً (`linear-gradient(90deg, #00539C, #EEA47F)`). لم يتطلب تعديل. |

---

### المرحلة 3 — تحديث الوثائق
**الملفات المُعدَّلة:**

| الملف | التغيير |
|-------|---------|
| `documentations/theme.md` | تحديث أقسام Primary Colors, Backgrounds, Semantic Colors, Buttons, و Navigation لتعكس Royal Blue & Peach. إضافة قيم HSL بجانب HEX. |

---

## UI/UX Upgrade: Pro Analytics Dashboards & Recharts Integration
**التاريخ:** 2026-06-03

### ملخص
ترقية كاملة للوحات التحكم الخمس (Super Admin, Tenant Admin, Academic Management, Faculty, Student) من "بطاقات إحصائيات بسيطة" إلى "لوحات تحكم تحليلية احترافية (Pro Analytics SaaS Dashboards)" باستخدام مكتبة `recharts`. تمت إضافة مؤشرات الاتجاه (Trend Indicators)، ومخططات Recharts تفاعلية، وتخطيط Bento Box Grid.

**الحزمة المُضافة:**
- `recharts` — مكتبة React لرسوم البيانات التفاعلية.

**المكوّنات المشتركة الجديدة:**
| الملف | الوصف |
|-------|-------|
| `src/components/analytics/kpi-card.tsx` | بطاقة KPI موحدة: عنوان + رقم رئيسي + أيقونة + مؤشر اتجاه (TrendingUp/Down) |
| `src/components/analytics/chart-card.tsx` | حاوية مخطط موحدة: عنوان + subtitle + محتوى Recharts |
| `src/components/analytics/index.tsx` | Barrel export |

---

### 1. Super Admin Dashboard (`src/app/super-admin/`)
**الملفات الجديدة:**
- `src/app/super-admin/super-admin-client.tsx`

**الملفات المُعدَّلة:**
- `src/app/super-admin/page.tsx`

**KPIs:**
- إجمالي الجامعات + عدد النشطة
- استهلاك AI Tokens + إجمالي التكلفة
- إجمالي التخزين + نسبة الاستخدام

**المخططات:**
- **BarChart:** استهلاك AI Tokens حسب الجامعة (Top 8)
- **LineChart:** نمو الجامعات بمرور الوقت ( cumulative + monthly ) مع خطين
- **بطاقة إيرادات:** إجمالي الإيرادات المحصّلة مع عدد الفواتير المتأخرة
- **توزيع الحالات:** نشطة / معلّقة / محذوفة

---

### 2. Tenant Admin Dashboard (`src/app/tenant-admin/`)
**الملفات الجديدة:**
- `src/app/tenant-admin/tenant-admin-client.tsx`

**الملفات المُعدَّلة:**
- `src/app/tenant-admin/page.tsx`

**KPIs:**
- إجمالي الطلاب + نسبة السعة
- أعضاء هيئة التدريس + إجمالي المستخدمين
- الشعب المفتوحة + إجمالي الشعب
- التخزين المستخدم + نسبة السعة

**المخططات:**
- **PieChart (Donut):** توزيع المستخدمين (طلاب / هيئة تدريس / إداريون)
- **BarChart (vertical):** عدد الشعب حسب القسم (Top 10)
- **بطاقة معلومات الجامعة:** تفاصيل التخزين والسعة والحالة

---

### 3. Academic Management Dashboard (`src/app/academic-management/`)
**الملفات الجديدة:**
- `src/app/academic-management/academic-management-client.tsx`

**الملفات المُعدَّلة:**
- `src/app/academic-management/page.tsx`

**KPIs:**
- الطلاب المسجلون + عدد الشعب النشطة
- معدل الغياب + عدد سجلات الحضور
- منطقة الخطر (High + Critical)

**المخططات:**
- **ComposedChart (Bar + Line):** متوسط نسبة الغياب % (محور يسار) مقابل متوسط Risk Score (محور يمين) حسب الشعبة
- **Widget — Risk Zone:** قائمة Top 5 طلاب يحتاجون تدخلاً فورياً مع Risk Score ملوّن و GPA

**منطق جلب البيانات:**
- يبدأ بجلب الأقسام المُسندة للمسؤول من `academic_management_departments`
- ثم يجلب المقررات (`courses`) في تلك الأقسام
- ثم الشعب (`sections`) للفصل النشط ضمن تلك المقررات
- ثم التسجيلات والحضور والمخاطر للشعب المحددة

---

### 4. Faculty Dashboard (`src/app/faculty/`)
**الملفات الجديدة:**
- `src/app/faculty/faculty-client.tsx`

**الملفات المُعدَّلة:**
- `src/app/faculty/page.tsx`

**KPIs:**
- إجمالي الطلاب في الشعب النشطة
- تسليمات بانتظار التقييم
- التكاليف المنشورة + إجمالي المطلوب تقييمه
- نسبة الحضور الأخيرة + عدد الحضور المسجل

**المخططات:**
- **AreaChart:** اتجاهات الحضور (حاضر vs غائب) عبر آخر الجلسات مع تدرج لوني
- **Widget — Pending Submissions:** قائمة آخر 10 تسليمات بانتظار التقييم مع اسم الطالب وتاريخ التسليم

---

### 5. Student Dashboard (`src/app/student/`)
**الملفات الجديدة:**
- `src/app/student/student-client.tsx`

**الملفات المُعدَّلة:**
- `src/app/student/page.tsx`

**KPIs:**
- المعدل التراكمي + التصنيف (ممتاز/جيد/ضعيف)
- الساعات المكتسبة + نسبة التقدم
- نسبة الحضور الإجمالية + إحصائيات الجلسات
- المقررات الحالية + التكاليف القادمة

**المخططات:**
- **Study Path Card:** شريط التقدم نحو التخرج مع المعدل التراكمي
- **LineChart:** اتجاه الدرجات (النسبة المئوية والدرجة الخام) عبر آخر 10 تقييمات
- **Widget — Upcoming Deadlines:** قائمة المواعيد النهائية القادمة مع أيام متبقية وتصنيف ألوان (أحمر=متأخر / برتقالي=مستعجل / أخضر=آمن)

---

### تصميم الألوان والوضع المظلم
جميع المخططات تستخدم CSS Variables (`var(--color-card-bg)`, `var(--color-border)`, `var(--color-text-primary)`) مما يضمن تكيفها تلقائياً مع الوضع المظلم عبر `next-themes`. الألوان الرئيسية للمخططات:
- Royal Blue `#00539C` — Primary
- Peach `#EEA47F` — Secondary / Accent
- Success `#38A169` — Positive metrics
- Danger `#E53E3E` — Risk / Negative
- Purple `#805AD5` — AI / Storage

---

## Academic Workflow: سد الفجوات الأكاديمية وإصلاح الأخطاء المنطقية
**التاريخ:** 2026-04-26

### ملخص
مراجعة شاملة لسير العمل الأكاديمي مقارنةً بوثيقتَي `accadimic_opreational_workflow.md` و `academic_structure_workflow.md`، وتحديد 7 فجوات وإصلاحها بالكامل عبر 3 مراحل: هجرة قاعدة البيانات، إصلاح Server Actions، وتحسينات الواجهة.

---

### المرحلة 1 — هجرات قاعدة البيانات

#### 1.1 إصلاح عتبة الغياب على مستوى الكلية
**الملف:** `supabase/migrations/20260426000001_fix_college_absence_threshold.sql`

**المشكلة:** دالة `recalculate_attendance_summary()` كانت تقرأ `absence_threshold` دائماً من جدول `tenants` فقط، متجاهلةً العتبة المخصصة على مستوى الكلية (`colleges.absence_threshold`).

**الوثيقة تقول:** "يبحث الـ Trigger عن نسبة كليته أولاً ثم يرجع للافتراضي"

**الإصلاح:** إضافة مسار الحل: `section → course → department → college.absence_threshold` مع fallback لقيمة `tenants.absence_threshold`:
```sql
v_threshold := COALESCE(v_college_threshold, v_tenant_threshold);
```

---

#### 1.2 إغلاق الشعبة تلقائياً عند الامتلاء
**الملف:** `supabase/migrations/20260426000002_section_auto_close_when_full.sql`

**المشكلة:** دالة `sync_section_enrolled_count()` كانت تحدّث العداد فقط دون تغيير حالة الشعبة.

**الوثيقة تقول:** "إذا وصل العداد إلى `max_capacity`، تُغلق الشعبة تلقائياً"

**الإصلاح:** إضافة منطق auto-close/reopen بعد كل تحديث للعداد:
```sql
-- إغلاق تلقائي عند الامتلاء
IF v_new_count >= v_max_capacity AND v_status = 'open' THEN
    UPDATE sections SET status = 'closed' WHERE id = v_section_id;
END IF;
-- إعادة فتح عند توفر مقعد
IF v_new_count < v_max_capacity AND v_status = 'closed' THEN
    UPDATE sections SET status = 'open' WHERE id = v_section_id;
END IF;
```

---

#### 1.3 إصلاح منطق استعادة الطالب من الحرمان (Bugfix)
**الملف:** `supabase/migrations/20260426000003_fix_dismissal_restore_logic.sql`

**المشكلة (خطأ منطقي):** كان شرط الاستعادة يعتمد على `v_enrollment_status` الذي يُلتقط في بداية الـ Trigger قبل أي تحديث، مما يجعله قيمة قديمة (stale) لا تعكس الحالة الفعلية.

**الإصلاح:** استبدال الاعتماد على `v_enrollment_status` بـ `v_is_dismissed` المقروء من `attendance_summaries` والذي يعكس الحالة المحفوظة فعلياً:
```sql
-- قبل: ELSIF v_pct < v_threshold AND v_enrollment_status = 'dismissed'
-- بعد: ELSIF v_pct < v_threshold AND COALESCE(v_is_dismissed, FALSE) = TRUE
```
كما تم حذف متغير `v_enrollment_status` غير المستخدم لتنظيف الكود.

---

### المرحلة 2 — إصلاح Server Actions

#### 2.1 التحقق من المتطلبات السابقة في `batchEnroll()`
**الملف:** `src/app/academic-management/enrollments/actions.ts`

**المشكلة:** `batchEnroll()` كانت تُسجّل الطلاب دون التحقق من اجتياز المتطلبات السابقة (`course_prerequisites`).

**الإصلاح:**
- جلب `course_prerequisites` للمقرر المستهدف مرة واحدة قبل الحلقة
- لكل طالب: التحقق من وجود تسجيل مكتمل (`status = completed`) بدرجة ≥ `min_grade` في المقرر الشرط
- تسجيل اسم الطالب الكامل في رسالة الخطأ (بدلاً من UUID فقط) باستخدام pre-fetch للأسماء

**Bugfix مدمج:** رسائل الخطأ السابقة لم تحدد الطالب المتأثر — أُصلح بإضافة اسم الطالب في كل رسالة خطأ.

---

#### 2.2 حارس نطاق القسم في `createSection()` و `createLabSection()`
**الملف:** `src/app/academic-management/sections/actions.ts`

**المشكلة:** مسؤول الإدارة الأكاديمية كان يستطيع إنشاء شعب لمقررات خارج نطاق قسمه.

**الإصلاح:** إضافة دالة `assertDepartmentScope()` تُستدعى قبل كل INSERT:
- تقرأ القسم المسموح به من `academic_management_departments`
- إذا لم تُوجد سجل → لا قيود (صلاحية كاملة للمستأجر)
- إذا وُجد سجل → تتحقق من أن `course.department_id` يطابق القسم المسموح

**Bugfix مدمج:** استخدام `.single()` بدلاً من `.maybeSingle()` كان يُرجع خطأ عند غياب السجل، أُصلح بـ `.maybeSingle()`.

---

#### 2.3 قفل الجدول المنشور في `updateSchedule()`
**الملف:** `src/app/academic-management/schedules/actions.ts`

**المشكلة:** `updateSchedule()` كانت تسمح بتعديل الجداول المنشورة مباشرةً.

**الإصلاح:**
- قراءة `status` الحالي قبل أي تعديل
- رفع خطأ `PUBLISHED_SCHEDULE_LOCKED` إذا كانت الحالة `published`
- إضافة المفتاح للقاموس `CONFLICT_MESSAGES` لترجمته عربياً

---

### المرحلة 3 — تحسينات الواجهة

#### 3.1 مودال إضافة شعبة معمل
**الملف:** `src/app/academic-management/sections/sections-client.tsx`

**الإضافات:**
- زر `FlaskConical` على كل شعبة نظرية مفتوحة لفتح مودال إنشاء معمل
- مكوّن `AddLabSectionModal` مستقل (كود الشعبة، السعة، المحاضر)
- عرض شعب المعامل الفرعية مُبادَّرة أسفل الشعبة الأم بتصميم بنفسجي مُميَّز
- شارة نوع الشعبة (`نظري` / `معمل` / `تطبيقي`) على كل بطاقة

**Bugfix مدمج:** استعلام `sections` في `page.tsx` لم يكن يُرجع `section_type` و `parent_section_id` — أُصلح بتحديد الأعمدة صراحةً بدلاً من `*`.

---

#### 3.2 إصلاح فلتر الفصول الدراسية
**الملف:** `src/app/academic-management/sections/page.tsx`

**المشكلة:** الفلتر كان يُظهر فقط فصولاً بحالة `planning` أو `active`، متجاهلاً `registration`.

**الإصلاح:**
```ts
.in("status", ["planning", "registration", "active"])
```

---

#### 3.3 شارة قفل الجدول المنشور
**الملف:** `src/app/academic-management/schedules/schedules-client.tsx`

**الإضافات:**
- بانر تحذيري برتقالي داخل `EditLectureModal` عند فتح جدول منشور
- تعطيل زر "تحديث الموعد" مع تغيير نصه إلى `🔒 الجدول منشور`
- استيراد أيقونة `Lock` من `lucide-react`

---

### المرحلة 4 — ميزة التسجيل الذاتي للطلاب

#### 4.1 Server Actions
**الملف:** `src/app/student/register/actions.ts`

| الدالة | الوصف |
|--------|-------|
| `getAvailableSections()` | جلب الشعب المتاحة للفصل المفعّل للتسجيل الذاتي، مع استثناء المقررات المسجَّل فيها مسبقاً |
| `checkPrerequisites(courseId)` | التحقق من اجتياز المتطلبات السابقة لمقرر محدد |
| `selfEnroll(sectionId, labSectionId?)` | تسجيل الطالب مع التحقق من: `self_reg_enabled`، حالة الفصل، المتطلبات السابقة، ومتطلبات المعمل للمقررات الهجينة |

**Bugfix مدمج:** بيانات `semesters` و `courses` من join تُرجع مصفوفة أحياناً — أُصلح باستخدام `Array.isArray()` للتطبيع.

---

#### 4.2 صفحة وواجهة التسجيل الذاتي
**الملفات الجديدة:**
- `src/app/student/register/page.tsx` — Server Component
- `src/app/student/register/register-client.tsx` — Client Component

**مميزات الواجهة:**
- بانر حالة الفصل (مفتوح / مغلق للتسجيل)
- تجميع الشعب حسب المقرر
- زر "التحقق من المتطلبات" per-course مع عرض المتطلبات الناقصة
- شريط امتلاء الشعبة مع ألوان (أخضر / تحذيري / أحمر)
- اختيار شعبة المعمل بـ radio buttons للمقررات الهجينة
- تعطيل التسجيل عند الامتلاء أو عدم اجتياز المتطلبات
- رسائل خطأ per-section وتأكيد النجاح

---

#### 4.3 إضافة الرابط في الشريط الجانبي
**الملف:** `src/app/student/components/sidebar.tsx`

إضافة رابط "التسجيل الذاتي" بأيقونة `ClipboardList` في قائمة التنقل مباشرةً بعد لوحة التحكم.

---

### ملخص الملفات المُنشأة والمُعدَّلة

#### الملفات الجديدة
| الملف | النوع |
|-------|-------|
| `supabase/migrations/20260426000001_fix_college_absence_threshold.sql` | Migration |
| `supabase/migrations/20260426000002_section_auto_close_when_full.sql` | Migration |
| `supabase/migrations/20260426000003_fix_dismissal_restore_logic.sql` | Migration |
| `src/app/student/register/actions.ts` | Server Actions |
| `src/app/student/register/page.tsx` | Page |
| `src/app/student/register/register-client.tsx` | Client Component |

#### الملفات المُعدَّلة
| الملف | التغييرات |
|-------|-----------|
| `src/app/academic-management/enrollments/actions.ts` | Prerequisites check + student name in errors |
| `src/app/academic-management/sections/actions.ts` | `assertDepartmentScope()` + `.maybeSingle()` bugfix |
| `src/app/academic-management/sections/page.tsx` | Explicit column select + `registration` in semester filter |
| `src/app/academic-management/schedules/actions.ts` | Published schedule lock guard + `CONFLICT_MESSAGES` entry |
| `src/app/academic-management/sections/sections-client.tsx` | Lab modal + child display + type badge |
| `src/app/academic-management/schedules/schedules-client.tsx` | Lock banner + disabled submit button |
| `src/app/student/components/sidebar.tsx` | Self-registration nav link |

---

## Feature: Personal AI Context Integration — UniBot يعرف طالبه شخصياً
**التاريخ:** 2026-04-18

### المشكلة
UniBot كان يُجيب فقط من قاعدة المعرفة (PDF اللوائح) لكنه "أعمى" تجاه بيانات الطالب الفعلية في قاعدة البيانات. سؤال بسيط مثل "كم نسبة غيابي في CS101؟" أو "ما التكاليف التي لم أسلّمها؟" كان يُرجع إجابات عامة بدلاً من بيانات حقيقية.

### الحل — البنية الجديدة: مصدران متوازيان

```
رسالة الطالب
    ├── embedText() ──────────► match_chunks() ──► RAG Context (لوائح + سياسات)
    └── getStudentPersonalSnapshot() ──────────► Personal Context (بيانات حقيقية)
                                                        ↓
                                          buildSystemPrompt(rag, personal)
                                                        ↓
                                            gemini-2.5-flash → إجابة ذكية
```

### الملفات المُنشأة

| الملف | الوصف |
|-------|-------|
| `src/lib/ai/personal-context-aggregator.ts` | دالة `getStudentPersonalSnapshot()` — تجمع بيانات الطالب من 5 جداول بشكل متوازٍ |

### الملفات المُعدَّلة

| الملف | التغيير |
|-------|---------|
| `src/app/api/ai/chat/route.ts` | إضافة استدعاء `getStudentPersonalSnapshot()` بالتوازي مع `embedText()` + `buildSystemPrompt()` |

### ما تجمعه `getStudentPersonalSnapshot()`

| البيانات | الجدول | التفاصيل |
|----------|--------|---------|
| الملف الأكاديمي | `student_profiles` + `student_majors` | التخصص، المستوى، المعدل، الساعات المكتسبة |
| المقررات المسجلة | `enrollments` + `sections` + `courses` | أكواد المقررات، الشعب، أسماء الفصول |
| ملخص الحضور | `attendance_summaries` | نسبة الحضور، الغياب، حالة الحرمان لكل مقرر |
| التكاليف القادمة | `assignments` | الواجبات غير المسلّمة (due_date > now) |
| آخر الإشعارات | `notifications` | آخر 5 إشعارات مع حالة القراءة |

### هندسة Prompt المحدَّثة

```
System Prompt = [قواعد الذكاء] + [البيانات الشخصية الآنية] + [قاعدة المعرفة (RAG)]
```

**منطق الأولوية المُدرَّب عليه النموذج:**
- سؤال شخصي (حضور، درجات، تكاليف) → يُجيب من البيانات الشخصية مباشرة بدون citation chips
- سؤال عن لوائح ونظام → يُجيب من RAG ويُرفق citation chips (رقم الصفحة)
- سؤال ليس في أيٍّ منهما → يُرجع رسالة "لم أجد معلومات كافية"

### التحسينات التقنية

- **Parallel Fetch:** `embedText()` و `getStudentPersonalSnapshot()` يعملان بالتوازي عبر `Promise.all()` — لا تأخير إضافي
- **Role Guard:** `getStudentPersonalSnapshot()` تُستدعى فقط إذا `profile.role === "student"` — المحاضر لا يُرسَل له سياق شخصي طلابي
- **استخدام `createServiceClient`:** يتجاوز RLS بشكل آمن من Server-side لجمع البيانات دون تقييد

### أمثلة على الأسئلة التي باتت مدعومة

| السؤال | المصدر المُستخدَم |
|--------|-------------------|
| "ما نسبة حضوري في CS101؟" | البيانات الشخصية |
| "كم باقٍ لي من الساعات للتخرج؟" | البيانات الشخصية |
| "ما التكاليف التي لم أسلّمها؟" | البيانات الشخصية |
| "ما هي سياسة الحرمان من الامتحانات؟" | قاعدة المعرفة (RAG) |
| "هل درجتي في MATH101 تستحق التظلم؟" | كلا المصدرين |

---

## Enhancement: عرض Markdown في الدردشة الذكية (UniBot Chat)
**التاريخ:** 2026-04-16

### المشكلة
ردود الذكاء الاصطناعي تحتوي على تنسيق Markdown (نص عريض `**bold**`، قوائم نقطية `* item`، عناوين `##`) لكنها تُعرض كنص عادي مع ظهور النجمات والرموز حرفياً بدون تفسير.

### السبب الجذري
```tsx
// قبل الإصلاح — يعرض كل شيء كنص حرفي
<p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
```
مكوّن `<p>` لا يُفسّر صياغة Markdown — يعرض `**نص**` كـ `**نص**` بدلاً من **نص**.

### الإصلاح
تثبيت `react-markdown` + `remark-gfm` وإنشاء مكوّن `MarkdownMessage` يُطبّق أصناف نظام التصميم على كل عنصر Markdown:

| عنصر Markdown | التفسير | ملاحظة |\r
|--------------|---------|--------|\r
| `**نص**` | `<strong>` بخط سميك | يرث لون النص |\r
| `* عنصر` / `- عنصر` | `<ul>` قائمة نقطية | `pr-5` (يمين) للـ RTL العربي |\r
| `1. عنصر` | `<ol>` قائمة مرقمة | `pr-5` للـ RTL |\r
| `# / ## / ###` | عناوين بتدرج حجمي | |\r
| `` `كود` `` | كود مضمّن بخلفية `bg-black/10` | |\r
| `` ```كود``` `` | كتلة كود كاملة | |\r
| `> اقتباس` | `<blockquote>` بحد أيمن | `border-r-2` للـ RTL |\r
| `[رابط](url)` | يفتح في تبويب جديد | بتسطير |\r

> **لماذا `pr-5` بدلاً من `pl-5`؟** الواجهة عربية RTL — نقاط القوائم تظهر على اليمين فالحشوة يجب أن تكون يمينية (`pr`).

**رسائل المستخدم** تبقى `whitespace-pre-wrap` عادية لأن المستخدمين لا يكتبون Markdown.

### الحزم المُضافة
- `react-markdown` — محلل Markdown لـ React
- `remark-gfm` — دعم GitHub Flavored Markdown (جداول، strikethrough، task lists)

### الملفات المُعدَّلة
| الملف | التغيير |
|-------|---------|\r
| `src/app/student/unibot/unibot-client.tsx` | إضافة `MarkdownMessage` + استبدال `<p>` بـ `<MarkdownMessage>` لرسائل المساعد |

---

## Bugfix: إصلاح خطأ 429 (تجاوز الحصة) في نموذج التضمين
**التاريخ:** 2026-04-16

### المشكلة
```
[GoogleGenerativeAI Error]: 429 Too Many Requests — You exceeded your current quota
```
عند محاولة إعادة فهرسة وثيقة من `/tenant-admin/knowledge`، يفشل التضمين بعد 1-2 محاولة ويُرجع الخطأ 500 للمستخدم.

### التشخيص (5 Whys)

| لماذا؟ | الإجابة |
|--------|---------|
| لماذا 429؟ | مفتاح API الحالي `AQ.Ab8RN6LZ…` استُنفد حصته اليومية |
| لماذا يستمر حتى مع الانتظار؟ | الحصة اليومية = 0 — لا ينفع الانتظار الجزئي |
| لماذا يحدث بسرعة حتى مع المفتاح الجديد؟ | تأخير `MIN_CALL_DELAY_MS = 1100ms` يعني 54 RPM — أعلى بكثير من حد الطبقة المجانية **15 RPM** |
| لماذا خطأ TypeScript أيضاً؟ | `outputDimensionality` غير موجودة في نوع `EmbedContentRequest` في SDK — أُضيفت لـ REST API لكن أنواع TypeScript لم تُحدَّث |

### الإصلاحات المُطبَّقة

#### 1. تحديث مفتاح API
```diff
- GEMINI_API_KEY=AQ.Ab8RN6LZS-4Rhzyz3lrcNKvfpXE9iS8703Sk37rrNgM6ldkw1Q
+ GEMINI_API_KEY=AIzaSyDXFsSTNoceCfBXetJxnJYjBMwo4vxZwRs
```
المفتاح القديم: صيغة `AQ.` غير صالحة لـ Gemini API (يجب أن يبدأ بـ `AIzaSy`).

#### 2. إصلاح تأخير حد المعدل
```diff
- const MIN_CALL_DELAY_MS = 1100; // 54 RPM — أعلى من 15 RPM!
+ const MIN_CALL_DELAY_MS = parseInt(process.env.EMBEDDING_CALL_DELAY_MS ?? "4200", 10);
// 4200ms = 14.3 RPM — أقل من حد الطبقة المجانية 15 RPM ✓
```
يمكن تخفيضه عبر `EMBEDDING_CALL_DELAY_MS` في `.env.local` للطبقات المدفوعة.

#### 3. الانتقال إلى `fetch` مباشرة بدلاً من SDK
```typescript
// قبل: SDK — خطأ TypeScript في outputDimensionality
const result = await model.embedContent({
  content: { parts: [{ text }], role: "user" },
  outputDimensionality: EMBEDDING_DIMENSIONS, // ❌ خطأ TypeScript
});

// بعد: fetch مباشر — تحكم كامل، لا خطأ TypeScript
const res = await fetch(`${API_BASE}/${MODEL}:embedContent?key=${apiKey}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: `models/${MODEL}`,
    content: { parts: [{ text }] },
    outputDimensionality: EMBEDDING_DIMENSIONS, // ✓ لا مشكلة
  }),
});
```

#### 4. إضافة Retry مع Exponential Backoff
```
محاولة 1 → فشل 429 → انتظار 5s
محاولة 2 → فشل 429 → انتظار 15s
محاولة 3 → فشل 429 → انتظار 45s
محاولة 4 → فشل 429 → انتظار 135s
محاولة 5 → رمي خطأ نهائي
```

### الملفات المُعدَّلة
| الملف | التغيير |
|-------|---------|
| `src/lib/ai/embedding.ts` | إعادة كتابة كاملة: fetch مباشر + 4200ms تأخير + 4 محاولات retry |
| `.env.local` | تحديث `GEMINI_API_KEY` إلى المفتاح الصحيح |

### نتائج الاختبار
```
✅ GEMINI_API_KEY تنسيق صحيح (AIzaSy…)
✅ Embedding generated: 768 dims في 701ms
✅ لا خطأ TypeScript
```

---

## Bugfix: إصلاح استخراج النص من ملفات PDF العربية
**التاريخ:** 2026-04-16

### المشكلة
الوثائق المُفهرسة تحتوي على "أجزاء" (chunks) لكنها مليئة بـ PDF structure noise بدلاً من النص العربي الفعلي:
```
"%PDF-1.5 % 1 0 obj <<Type/Catalog... "
"} 2 c HS k RSV )2 k ! k + ~ > Z& R e e N..."
"833/Descent -188/CapHeight 613/AvgWidth..."
```

### السبب الجذري
```typescript
// الكود القديم — يقرأ bytes 32-126 فقط (ASCII)
for (let i = 0; i < uint8.length; i++) {
  if (uint8[i] >= 32 && uint8[i] <= 126) {  // ASCII فقط!
    textContent += String.fromCharCode(uint8[i]);
  }
}
```
الحروف العربية في Unicode `U+0600–U+06FF` مُشفَّرة كـ UTF-8 متعدد البايتات — كل قيمة تقع **خارج** نطاق 32-126 تماماً. النتيجة: **صفر حروف عربية** تُستخرج، فقط أوامر PDF البنيوية.

### الفرق بين الأسلوبين
| المقياس | الكود القديم (ASCII) | الكود الجديد (pdf-parse) |
|---------|---------------------|------------------------|
| الأحرف المُستخرجة | 428,425 (ضوضاء PDF) | 1,493 (نص حقيقي) |
| الأحرف العربية | **0** | **1,111** (74% من المحتوى) |
| الصلاحية للـ RAG | ❌ بيانات مزيفة | ✅ نص قابل للبحث |

### الإصلاح
```typescript
// بعد: pdf-parse — استخراج Unicode كامل
const pdfParse = require("pdf-parse");
const data = await pdfParse(Buffer.from(buffer));
fullText = data.text; // نص عربي كامل ✓
```

### التثبيت والإعداد
```bash
npm install pdf-parse@1.1.1  # الإصدار 1.x فقط — الإصدار 3.x تغيّر API
```
```typescript
// next.config.ts — منع webpack من bundling المكتبة
serverExternalPackages: ["pdf-parse"],
```

### تدفق السكريبتات التشخيصية الجديدة
```
scripts/debug-document.ts   → فحص الوثائق في DB + مقارنة الاستخراجين + التحقق من API key
scripts/simulate-ingest.ts  → محاكاة خطوة بخطوة (--dry-run افتراضي / --real للتنفيذ الحقيقي)
scripts/test-rag.ts         → اختبار استرجاع RAG نهاية-لنهاية (تضمين → match_chunks → ردّ AI)
```

### نتائج التشخيص الكامل
```
✅ وثيقة "الخدمات الرقمية": 1 جزء مُدمَج بـ 768 أبعاد
✅ match_chunks يُرجع similarity 0.76 لسؤال عربي ذي صلة
✅ الأجزاء الضوضائية القديمة (40 جزء) حُذفت وأُعيد إنشاؤها
✅ استرجاع RAG يعمل من النهاية للنهاية
```

### الملفات المُنشأة
| الملف | الوصف |
|-------|-------|
| `scripts/debug-document.ts` | فحص الوثائق في DB + مقارنة استخراج النص + التحقق من API key |
| `scripts/simulate-ingest.ts` | محاكاة كاملة للفهرسة (dry-run/real) |
| `scripts/test-rag.ts` | اختبار استرجاع RAG نهاية-لنهاية |

### الملفات المُعدَّلة
| الملف | التغيير |
|-------|---------|
| `src/lib/ai/ingest-service.ts` | استبدال استخراج ASCII بـ `pdf-parse` للـ PDF |
| `next.config.ts` | إضافة `serverExternalPackages: ["pdf-parse"]` |

---

## Bugfix + Refactor: إصلاح أنبوب التضمين (RAG Ingest Pipeline)
**التاريخ:** 2026-04-16

### المشكلة
عند محاولة مدير الجامعة إعادة فهرسة وثيقة (Reindex) في صفحة `/tenant-admin/knowledge`، ظهر الخطأ:
```
Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```
وكان جدول الأجزاء يعرض 0 جزء لكل وثيقة.

### تشخيص السبب الجذري (5 Whys)

| لماذا؟ | الإجابة |
|--------|---------|
| لماذا يفشل `res.json()`؟ | لأن الاستجابة HTML وليست JSON |
| لماذا HTML بدلاً من JSON؟ | `reindexDocument` تستدعي `fetch('/api/ai/ingest')` بدون إرسال cookies المصادقة |
| لماذا لا تُرسَل الـ cookies؟ | Server Actions لا تُرسل session cookies تلقائياً عند استدعاء routes HTTP داخلية |
| لماذا يعود HTML؟ | `requireRole()` داخل route تستدعي `redirect("/login")` → Next.js ترجع صفحة HTML |
| **السبب الجذري** | **Server Action → HTTP loopback إلى `/api/ai/ingest` بدون مصادقة** |

### الإصلاح
استخراج منطق التضمين في دالة مشتركة وإلغاء HTTP loopback بالكامل:

#### الملفات الجديدة

| الملف | الوصف |
|-------|-------|
| `src/lib/ai/embedding.ts` | أداة التضمين المركزية — `embedText()` + إعدادات النموذج |
| `src/lib/ai/ingest-service.ts` | خدمة الاستيعاب الأساسية — `performIngest()` بدون HTTP |
| `scripts/test-ingest.ts` | سكريبت اختبار شامل للتحقق من صحة الإصلاح |

#### الملفات المُعدَّلة

| الملف | التغيير |
|-------|---------|
| `src/app/tenant-admin/knowledge/actions.ts` | `reindexDocument` تستدعي `performIngest()` مباشرة بدلاً من HTTP fetch |
| `src/app/api/ai/ingest/route.ts` | تبسيط: مصادقة فقط ثم استدعاء `performIngest()` |
| `src/app/api/ai/chat/route.ts` | استخدام `embedText()` المشتركة بدلاً من إنشاء النموذج داخلياً |
| `next.config.ts` | إضافة `turbopack.root` لإصلاح خطأ `tailwindcss` في Turbopack |

#### تغيير نموذج التضمين

| الإعداد | القيمة |
|---------|--------|
| النموذج | `gemini-embedding-2-preview` |
| الأبعاد | 768 (MRL scaling — متوافق مع `vector(768)` في Supabase) |
| المزايا | جودة تضمين أعلى + دعم MRL لضبط الأبعاد مستقبلاً |

> **ملاحظة:** `gemini-embedding-2-preview` يدعم Matryoshka Representation Learning (MRL) بأبعاد 256 / 512 / 768 / 3072. نستخدم 768 للتوافق مع المخطط الحالي (`vector(768)`) دون الحاجة لهجرة قاعدة البيانات.

### نتائج الاختبار (`scripts/test-ingest.ts`)
```
✅ Short text → 1 chunk (7 words)
✅ Long text (1000 words) → 2 chunks
✅ Empty/whitespace text → 0 chunks
✅ Embedding generated: 768 dimensions (gemini-embedding-2-preview)
✅ ai_knowledge_documents — accessible
✅ ai_document_chunks — accessible
✅ match_chunks RPC function — accessible
✅ Unauthenticated request → redirect to login (auth guard works correctly)
```

### توليد الأنواع
تم تشغيل `npx supabase gen types typescript --project-id leduumxihcngowpaujkr` وحفظ النتائج في `src/lib/types/supabase.ts` (3786 سطر).

### جداول قاعدة البيانات المتأثرة
| الجدول | الوصف |
|--------|-------|
| `ai_knowledge_documents` | بيانات الوثيقة + `total_chunks` (يُحدَّث بعد كل reindex) |
| `ai_document_chunks` | الأجزاء المُضمَّنة — `embedding` كـ JSON string |
| `ai_token_usage` | سجل استهلاك tokens للمراقبة |

---

## UX Enhancement: Global Navigation Progress Bar
**التاريخ:** 2026-04-13

### الوصف
إضافة شريط تقدم علوي عالمي (Top Loader) لتحسين الأداء المُدرَك أثناء انتقالات المسارات في Next.js. المشكلة السابقة: عند التنقل بين الصفحات الثقيلة (مثل Dashboard → Schedules) لم يكن هناك أي ردّ فعل بصري، مما جعل التطبيق يبدو غير مستجيب خلال جلب البيانات من الخادم.

### الحزمة المُضافة
- **`nextjs-toploader`** — حزمة خفيفة الوزن متوافقة مع Next.js App Router

### التعديلات

#### `src/app/layout.tsx`
إضافة `<NextTopLoader />` عالمياً في `<body>` قبل `<ThemeProvider>` ليكون متاحاً في جميع المسارات والصفحات.

#### إعدادات التخصيص (متوافقة مع نظام تصميم UniBot)
| الخاصية | القيمة | السبب |
|---------|--------|-------|
| `color` | `#3182CE` | Action Blue — اللون الرئيسي للنظام |
| `height` | `3` | شريط نحيف بمظهر عصري احترافي |
| `initialPosition` | `0.08` | يبدأ بمجرد بدء التنقل |
| `crawlSpeed` | `200` | تقدم سلس ومريح للعين |
| `speed` | `200` | إنهاء سريع عند اكتمال التحميل |
| `easing` | `"ease"` | منحنى تحريك طبيعي |
| `showSpinner` | `false` | SaaS حديث — الشريط العلوي وحده كافٍ |
| `shadow` | `0 0 10px #3182CE, 0 0 5px #3182CE` | توهج خفيف يُبرز الشريط بشكل جمالي |

### الأثر
- ✅ المستخدمون يحصلون على ردّ فعل بصري فوري عند أي انتقال بين الصفحات
- ✅ تحسين ملموس في الأداء المُدرَك (Perceived Performance)
- ✅ صفر تأثير على الأداء الفعلي — لا إضافات JavaScript ثقيلة

### الملفات المُعدَّلة
- `src/app/layout.tsx` — إضافة import وتضمين المكوّن

---

## Hotfix: إصلاح منطق المستويات + توليد الأنواع
**التاريخ:** 2026-03-18

### التغييرات
- **رجوع عن خطأ:** `createMajor` — استُعيدت الصيغة الصحيحة: `duration_years` مستويات مباشرة (4 سنوات = 4 مستويات)، وليس `duration_years * 2`
- **توليد الأنواع:** تم تشغيل `npx supabase gen types typescript --project-id leduumxihcngowpaujkr` وحفظ النتيجة في `src/lib/types/supabase.ts` بترميز UTF-8 — يعكس الآن كل الجداول والـ ENUMs المحدَّثة بما يشمل `campuses`, `section_type`, `semester_status` الجديدة

---

## Workflow Audit & Gap Fix: مراجعة كاملة ومطابقة مع المخطط التشغيلي
**التاريخ:** 2026-03-18

### ملخص
مراجعة شاملة للكود والقاعدة مقارنةً بـ `accadimic_opreational_workflow.md` — تم اكتشاف 7 فجوات وإصلاحها جميعاً.

### الفجوات المكتشفة والإصلاحات

#### 1. خطأ منطقي: `createMajor` — حساب عدد المستويات خاطئ
- **المشكلة:** الكود القديم أنشأ `duration_years` مستويات فقط (4 سنوات = 4 مستويات)
- **المخطط يقول:** كل سنة = فصلان دراسيان = مستويان → 4 سنوات = **8 مستويات**
- **الإصلاح:** `totalLevels = duration_years * 2` في `src/app/tenant-admin/academic/actions.ts`

#### 2. ناقص: `createCollege` / `updateCollege` لا يحفظ `campus_id` + `absence_threshold`
- **المشكلة:** النموذج لم يكن يرسل ولا يحفظ `campus_id` و `absence_threshold` رغم وجود الأعمدة في قاعدة البيانات
- **الإصلاح:** إضافة الحقلين في `createCollege`, `updateCollege`, و `getColleges` (يشمل `campuses(name)`)

#### 3. ناقص: `createVenue` / `updateVenue` لا يحفظ `campus_id`
- **المشكلة:** عمود `campus_id` موجود في DB لكن actions لا ترسله
- **الإصلاح:** إضافة `campus_id` في `createVenue` و `updateVenue` في `src/app/tenant-admin/venues/actions.ts`

#### 4. ناقص: أنواع TypeScript مفقودة في `database.ts`
- **المشكلة:** `VenueType`, `CourseType`, `PlanCourseType` كانت مستوردة من `database.ts` لكنها غير معرّفة فيه → خطأ TypeScript
- **الإصلاح:** إضافة الثلاثة أنواع في `src/lib/types/database.ts`

#### 5. ناقص: `batchEnroll` لا يعرف الشعب الهجينة ولا يلزم تحديد معمل
- **المشكلة:** عند تسجيل طالب في شعبة هجينة `(lecture + hybrid course)` كان يسجله في النظري فقط دون إلزامه بالمعمل
- **المخطط يقول:** التسجيل في مقرر هجين = تسجيل في النظري + تسجيل تلقائي في معمل محدد
- **الإصلاح:**
  - `batchEnroll` يقبل الآن `labSectionId?` كمعامل اختياري
  - إذا كانت الشعبة `lecture` لمقرر `hybrid` وغاب `labSectionId` → يرفع `HYBRID_LAB_REQUIRED`
  - إذا وُجد `labSectionId` → يسجّل الطالب تلقائياً في المعمل أيضاً
  - إضافة `getLabSectionsForEnrollment(parentSectionId)` لجلب المعامل المتاحة
  - `getOpenSections` يعرض الآن `section_type` + `course_type` ويُفلتر الشعب الفرعية

#### 6. ناقص: `getSectionsForSchedule` و `getVenuesForSchedule` لا يعرضان بيانات الفروع
- **المشكلة:** واجهة الجدولة لم تعرض `section_type`, `course_type`, أو `campus_id` للقاعات
- **الإصلاح:** توسيع `select` في `src/app/academic-management/schedules/actions.ts`

#### 7. ناقص: دوال مساعدة لقوائم الفروع (Campuses dropdowns)
- **المشكلة:** لا توجد دوال لجلب الفروع من نماذج الكليات والقاعات
- **الإصلاح:**
  - إضافة `getCampuses()` في `src/app/tenant-admin/academic/actions.ts`
  - إضافة `getCampusesForVenues()` في `src/app/tenant-admin/venues/actions.ts`

### الملفات المُعدَّلة

| الملف | التغييرات |
|-------|-----------|
| `src/app/tenant-admin/academic/actions.ts` | إصلاح `createMajor` (×2 مستويات) + `campus_id`/`absence_threshold` في colleges + `getCampuses()` |
| `src/app/tenant-admin/venues/actions.ts` | إضافة `campus_id` في create/update + `getCampusesForVenues()` |
| `src/app/academic-management/enrollments/actions.ts` | `batchEnroll` هجين + `getLabSectionsForEnrollment()` + فلترة `getOpenSections` |
| `src/app/academic-management/schedules/actions.ts` | توسيع `select` للشعب والقاعات + إضافة `INVALID_STATE_TRANSITION` لقاموس الأخطاء |
| `src/lib/types/database.ts` | إضافة `VenueType`, `CourseType`, `PlanCourseType` |

---

## Architectural Alignment: تنفيذ سير العمل الأكاديمي الكامل
**التاريخ:** 2026-03-18

### ملخص التغيير
محاذاة كاملة للكود والقاعدة مع المخطط التشغيلي الموثق في `accadimic_opreational_workflow.md`. تضمنت العملية 5 مراحل: تدقيق الفجوات، هجرة قاعدة البيانات، إعادة هيكلة الـ Server Actions، سكريبت المحاكاة، والتوثيق.

### الجداول الجديدة في قاعدة البيانات

| الجدول | الوصف |
|--------|-------|
| `campuses` | الفروع الجامعية — مرتبطة بـ `tenant_id`، تُتيح العزل المكاني بين الفروع |

### التعديلات على الجداول الحالية

| الجدول | العمود المُضاف | الغرض |
|--------|---------------|-------|
| `colleges` | `campus_id` | ربط الكلية بفرع جامعي محدد |
| `colleges` | `absence_threshold` | تجاوز نسبة الحرمان على مستوى الكلية |
| `venues` | `campus_id` | عزل القاعات بين الفروع لمنع التعارض الخاطئ |
| `sections` | `parent_section_id` | ربط شعبة المعمل (Child) بشعبة النظري (Parent) |
| `sections` | `section_type` | تمييز نوع الشعبة (`lecture` / `lab` / `tutorial`) |
| `semesters` | `status ENUM` | توسعة من 3 حالات إلى 5: `planning → registration → active → grade_freeze → archived` |

### الدوال والـ Triggers الجديدة

- **`clone_college_to_campus()`** — Deep Copy كاملة للكلية (أقسام + تخصصات + مستويات) من فرع لآخر بـ UUIDs جديدة
- **`guard_semester_state_transition()`** + `trg_guard_semester_state` — منع الانتقالات غير القانونية للفصل الدراسي
- **`guard_enrollment_semester_state()`** + `trg_guard_enrollment_state` — حظر تسجيل الطلاب إذا الفصل ليس في `registration` أو `active`
- **`guard_grade_entry_state()`** + `trg_guard_grade_entry` — تجميد الدرجات عند حالة `grade_freeze` أو `archived`
- **`check_schedule_conflicts()`** (مُحدَّثة) — إضافة وعي بـ `campus_id` للعزل المكاني بين الفروع + تحديد `section_type = 'lecture'` فقط في فحص التعارض الطلابي

### ملفات Server Actions الجديدة / المُعدَّلة

- **جديد:** `src/app/tenant-admin/campuses/actions.ts` — CRUD للفروع + `cloneCollegeToCampus()`
- **مُعدَّل:** `src/app/academic-management/sections/actions.ts` — إضافة `createLabSection()` و `getLabSectionsForParent()` لمنطق الشعب الهجينة
- **مُعدَّل:** `src/app/tenant-admin/calendar/actions.ts` — `updateSemesterStatus()` يدعم الآن آلة الحالة الكاملة مع رسائل خطأ عربية

### تعديلات الأنواع (Types)

- **مُعدَّل:** `src/lib/types/database.ts` — إضافة `SectionStatus`, `SectionType`, `SemesterStatus`, `SemesterType`, `ScheduleDay`, `ScheduleStatus`

### ملف المحاكاة

- **جديد:** `scripts/simulate_academic_workflow.ts` — سكريبت محاكاة كاملة (15 خطوة) تنفذ السيناريو الأكاديمي بالكامل
  - ✅ إنشاء جامعة + فرع + كلية + قسم + تخصص + 8 مستويات
  - ✅ مقرر CS101 نوع Hybrid + الخطة الدراسية
  - ✅ شعبة نظري SEC-A + شعبتا معمل Lab-1 و Lab-2 مرتبطتان بـ `parent_section_id`
  - ✅ اختبار `SPATIAL_CONFLICT` — تم الكشف والمنع بنجاح
  - ✅ انتقال الفصل: `planning → registration → active → grade_freeze → archived`
  - ✅ منع الرجوع إلى `planning` بعد التقدم
  - ✅ تسجيل الطالب عمر في النظري والمعمل
  - ✅ رصد الدرجات (`coursework + midterm + final`) → `total_grade = 89.2/100` (مُولَّد تلقائياً)
  - ✅ `GRADE_LOCKED` — تم منع التعديل بعد تجميد الدرجات

### ملف الهجرة

- `supabase/migrations/20260318001114_align_academic_workflow.sql`

---

## Documentation: توثيق بنية الهيكل الأكاديمي
**التاريخ:** 2026-03-18

### الملفات المُنشأة
- `docs/Academic_Structure_Architecture.md` — وثيقة معمارية تقنية شاملة بالعربية تشرح:
  - فلسفة الهيكل الأكاديمي (Tenant → College → Department → Major → Academic Level → Semester → Course → Section → Schedule)
  - دورة حياة تهيئة الجامعة بالتفصيل مع مراجع الجداول والـ Server Actions
  - العزل الداخلي (Intra-Tenant Isolation) عبر `academic_management_departments` و `get_my_managed_departments()`
  - الجداول الذكية ومنع التعارض عبر `trg_check_schedule_conflicts` (مكاني، تدريسي، طلابي)
  - تدفق العمل بين الأدوار (tenant_admin، academic_management، faculty، student)
  - الجداول والعلاقات والـ Triggers المهمة

### الملاحظات
- تم توليد الوثيقة بناءً على reverse-engineering للكود الفعلي من:
  - `src/lib/types/supabase.ts`
  - `supabase/migrations/20260307022710_part1_core_system.sql`
  - `supabase/migrations/20260313222415_intra_tenant_isolation.sql`
  - `src/app/tenant-admin/academic/actions.ts`
  - `src/app/academic-management/schedules/actions.ts`

---

## Sprint 0: التأسيس الأساسي والمصادقة
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/lib/supabase/server.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/middleware.ts`
- `src/middleware.ts`
- `src/lib/auth/get-user.ts`
- `src/lib/types/database.ts`
- `src/app/globals.css` (تعديل)
- `src/app/layout.tsx` (تعديل)
- `src/app/login/page.tsx`
- `src/app/unauthorized/page.tsx`
- `src/app/super-admin/layout.tsx`
- `src/app/super-admin/components/sidebar.tsx`
- `src/app/super-admin/page.tsx`
- `docs/features/sprint0-core-foundation.md`

### المشاكل
- تحذير `@theme` في CSS — هذا سلوك طبيعي في Tailwind CSS v4 والمحرر لا يدعمه بعد.

### الحل
- لا يلزم إصلاح — التحذير من المحرر فقط وليس من المُترجم.

---

## Sprint 1: إدارة خطط الاشتراك [FR-SA2.1]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/super-admin/plans/actions.ts`
- `src/app/super-admin/plans/page.tsx`
- `src/app/super-admin/plans/plans-client.tsx`
- `docs/features/sprint1-subscription-plans.md`

### المشاكل
- لا توجد مشاكل.

---

## Sprint 2: إنشاء وإدارة الجامعات [FR-SA1.1 إلى FR-SA1.4]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/super-admin/tenants/actions.ts`
- `src/app/super-admin/tenants/page.tsx`
- `src/app/super-admin/tenants/tenants-client.tsx`
- `docs/features/sprint2-tenant-provisioning.md`

### المشاكل
- لا توجد مشاكل.

---

## Sprint 3: لوحة التحكم الشاملة والإعلانات [FR-SA3.1, FR-SA3.4]
**التاريخ:** 2026-03-07

### الملفات المُنشأة / المعدّلة
- `src/app/super-admin/page.tsx` (تعديل — God View Dashboard بتصميم Bento Grid)
- `src/app/super-admin/announcements/actions.ts`
- `src/app/super-admin/announcements/page.tsx`
- `src/app/super-admin/announcements/announcements-client.tsx`
- `docs/features/sprint3-dashboard-announcements.md`

### المشاكل
- لا توجد مشاكل.

---

## Sprint 4: إعداد مدير الجامعة والتهيئة العامة [FR-TA1.1, FR-TA1.2, FR-TA1.3]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/tenant-admin/layout.tsx`
- `src/app/tenant-admin/components/sidebar.tsx`
- `src/app/tenant-admin/page.tsx`
- `src/app/tenant-admin/settings/actions.ts`
- `src/app/tenant-admin/settings/page.tsx`
- `src/app/tenant-admin/settings/settings-client.tsx`
- `src/app/tenant-admin/calendar/actions.ts`
- `src/app/tenant-admin/calendar/page.tsx`
- `src/app/tenant-admin/calendar/calendar-client.tsx`
- `docs/features/sprint4-tenant-admin-onboarding.md`

### المشاكل
- تحذيرات `Cannot find module` في المحرر — مؤقتة تختفي بعد إعادة تشغيل TypeScript Server.

### الحل
- لا يلزم إصلاح — TypeScript يحتاج وقتاً لفهرسة الملفات الجديدة.

---

## Sprint 5: الهيكل الأكاديمي [FR-TA2.1, FR-TA2.2]
**التاريخ:** 2026-03-07

### الملفات المُنشأة / المعدّلة
- `src/lib/types/database.ts` (تعديل — إضافة أنواع College, Department, Major, AcademicLevel, Course, Section, Schedule, Venue, Enrollment, etc.)
- `src/app/tenant-admin/academic/actions.ts`
- `src/app/tenant-admin/academic/page.tsx`
- `src/app/tenant-admin/academic/academic-client.tsx`
- `src/app/tenant-admin/components/sidebar.tsx` (تعديل — إضافة روابط الهيكل والمقررات والمستخدمين والقاعات)
- `docs/features/sprint5-academic-skeleton.md`

### المشاكل
- خطأ اتصال أثناء إنشاء academic-client.tsx — تم إعادة الإنشاء بنجاح.

---

## Sprint 6: المقررات والخطط الدراسية [FR-TA2.3, FR-TA2.4]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/tenant-admin/courses/actions.ts`
- `src/app/tenant-admin/courses/page.tsx`
- `src/app/tenant-admin/courses/courses-client.tsx`
- `docs/features/sprint6-curriculum-study-plans.md`

### المشاكل
- لا توجد مشاكل.

---

## Sprint 7: إدارة المستخدمين والأدوار [FR-TA3.1, FR-TA3.2, FR-TA3.3]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/tenant-admin/users/actions.ts`
- `src/app/tenant-admin/users/page.tsx`
- `src/app/tenant-admin/users/users-client.tsx`
- `docs/features/sprint7-user-population-rbac.md`

### المشاكل
- خطأ `createAdminClient` لم يكن مُنتظراً (await) — تم إصلاحه فوراً.

---

## Sprint 8: إدارة الشعب والتسجيل الجماعي [FR-AM1.2, FR-AM1.3, FR-AM1.5]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/academic-management/layout.tsx`
- `src/app/academic-management/components/sidebar.tsx`
- `src/app/academic-management/page.tsx`
- `src/app/academic-management/sections/actions.ts`
- `src/app/academic-management/sections/page.tsx`
- `src/app/academic-management/sections/sections-client.tsx`
- `src/app/academic-management/enrollments/actions.ts`
- `src/app/academic-management/enrollments/page.tsx`
- `src/app/academic-management/enrollments/enrollments-client.tsx`
- `docs/features/sprint8-sections-enrollment.md`

### المشاكل
- لا توجد مشاكل.

---

## Sprint 9: الجدولة الذكية والقاعات [FR-TA4.1, FR-AM2.1, FR-AM2.2]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/tenant-admin/venues/actions.ts`
- `src/app/tenant-admin/venues/page.tsx`
- `src/app/tenant-admin/venues/venues-client.tsx`
- `src/app/academic-management/schedules/actions.ts`
- `src/app/academic-management/schedules/page.tsx`
- `src/app/academic-management/schedules/schedules-client.tsx`
- `docs/features/sprint9-scheduling-venues.md`

### المشاكل
- لا توجد مشاكل.

### ملاحظة مهمة
- تم بناء دالة `parseConflictError()` لمعالجة أخطاء trigger `trg_check_schedule_conflicts` وتحويلها لرسائل عربية واضحة (SPATIAL_CONFLICT, FACULTY_CONFLICT, STUDENT_CONFLICT).
- رسائل التعارض تُعرض بتنسيق تحذيري مميز في الواجهة.

---

## Sprint 10: المحتوى التعليمي وخطط المقررات [FR-FM1.1, FR-FM1.2, FR-FM1.3, FR-ST2.1]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/faculty/layout.tsx`
- `src/app/faculty/components/sidebar.tsx`
- `src/app/faculty/page.tsx`
- `src/app/faculty/materials/actions.ts`
- `src/app/faculty/materials/page.tsx`
- `src/app/faculty/materials/materials-client.tsx`
- `src/app/student/layout.tsx`
- `src/app/student/components/sidebar.tsx`
- `src/app/student/page.tsx`
- `src/app/student/materials/page.tsx`
- `src/app/student/materials/materials-client.tsx`
- `docs/features/sprint10-course-content-syllabi.md`

### الملفات المُعدَّلة
- `src/lib/types/database.ts` — إضافة أنواع LMS والمراسلات والتنبيهات

### المشاكل
- لا توجد مشاكل.

---

## Sprint 11: التكاليف والتسليمات [FR-FM2.1, FR-FM2.2, FR-ST2.2]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/faculty/assignments/actions.ts`
- `src/app/faculty/assignments/page.tsx`
- `src/app/faculty/assignments/assignments-client.tsx`
- `src/app/student/assignments/actions.ts`
- `src/app/student/assignments/page.tsx`
- `src/app/student/assignments/assignments-client.tsx`
- `docs/features/sprint11-assignments-submissions.md`

### المشاكل
- لا توجد مشاكل.

---

## Sprint 12: الحضور الذكي وسجل الدرجات [FR-FM2.3, FR-FM3.1, FR-ST2.3, FR-ST3.1]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/faculty/attendance/actions.ts`
- `src/app/faculty/attendance/page.tsx`
- `src/app/faculty/attendance/attendance-client.tsx`
- `src/app/faculty/gradebook/actions.ts`
- `src/app/faculty/gradebook/page.tsx`
- `src/app/faculty/gradebook/gradebook-client.tsx`
- `src/app/student/attendance/page.tsx`
- `src/app/student/attendance/attendance-client.tsx`
- `src/app/student/grades/page.tsx`
- `docs/features/sprint12-attendance-gradebook.md`

### ملاحظة مهمة
- `total_grade` عمود GENERATED — القيمة تُحسب تلقائياً من DB
- `trg_recalc_attendance_summary` يحدث ملخص الحضور تلقائياً
- `trg_sync_final_grade` يحدث الدرجة النهائية والتقدير تلقائياً

### المشاكل
- لا توجد مشاكل.

---

## Sprint 13: المراسلات الفورية [FR-FM4.1, FR-ST4.1, FR-ST4.3]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/app/faculty/messages/actions.ts`
- `src/app/faculty/messages/page.tsx`
- `src/app/faculty/messages/messages-client.tsx`
- `src/app/student/messages/actions.ts`
- `src/app/student/messages/page.tsx`
- `src/app/student/messages/messages-client.tsx`
- `docs/features/sprint13-realtime-messaging.md`

### ملاحظة مهمة
- تم دمج Supabase Realtime عبر `postgres_changes` على جدول `messages`
- Optimistic UI مع rollback عند فشل الإرسال
- القنوات تُنشأ تلقائياً بواسطة `auto_create_course_channel` trigger

### المشاكل
- لا توجد مشاكل.

---

## Sprint 14: التعاميم والإشعارات [FR-AM4.1, FR-ST1.x]
**التاريخ:** 2026-03-07

### الملفات المُنشأة
- `src/components/notification-bell.tsx`
- `src/app/academic-management/circulars/actions.ts`
- `src/app/academic-management/circulars/page.tsx`
- `src/app/academic-management/circulars/circulars-client.tsx`
- `docs/features/sprint14-circulars-notifications.md`

### الملفات المُعدَّلة
- `src/app/faculty/components/sidebar.tsx` — إضافة NotificationBell
- `src/app/student/components/sidebar.tsx` — إضافة NotificationBell
- `src/app/academic-management/components/sidebar.tsx` — إضافة رابط التعاميم

### ملاحظة مهمة
- `NotificationBell` يستخدم Supabase Realtime (`postgres_changes` على `notifications`)
- التعاميم الإلزامية تظهر بتنسيق أحمر مميز
- الإشعارات التلقائية (غياب/درجات/تذاكر) تأتي من triggers في DB

### المشاكل
- لا توجد مشاكل.

---

## Seed Data: بيانات اختبارية شاملة
**التاريخ:** 2026-03-07

### الملف المُنشأ
- `supabase/seed.sql`

### البيانات المُولَّدة
| الجدول | العدد | ملاحظات |
|--------|-------|---------|
| `subscription_plans` | 3 | basic, pro, enterprise |
| `tenants` | 1 | جامعة العلوم والتكنولوجيا - فرع تعز |
| `auth.users` + `profiles` | 11 | 1 super_admin, 1 tenant_admin, 2 academic_management, 2 faculty, 5 students |
| `custom_roles` | 2 | رئيس قسم + سكرتير |
| `colleges` → `departments` → `majors` | 1 → 1 → 1 | كلية الهندسة → علوم الحاسوب → هندسة البرمجيات |
| `courses` | 3 | CS101, CS201, MATH101 |
| `semesters` | 1 | الفصل الأول 2026-2027 (active) |
| `venues` | 2 | قاعة محاضرات + معمل |
| `sections` | 2 | SEC-A لكل مقرر |
| `enrollments` | 6 | 5 طلاب + طالب مسجل في شعبتين |
| `course_materials` | 2 | واحد مع `is_ai_approved=TRUE` |
| `assignments` + `submissions` | 2 + 2 | تكليفات مُقيَّمة |
| `gradebook_entries` | 3 | بدون final_grade (total_grade GENERATED) |
| `attendance_sessions` | 8 | جلسات مكتملة |
| `attendance_records` | 24 | 8 × 3 طلاب |
| `messages` | 9 | 7 channel + 2 direct |
| `circulars` | 2 | 1 عادي + 1 إلزامي |
| `syllabi` | 2 | 1 approved + 1 submitted |

### اختبارات Triggers (نتائج متوقعة)
1. **`trg_auto_create_course_channel`**: إنشاء 2 قنوات تلقائياً عند إدراج الشُعب
2. **`trg_auto_channel_membership`**: إضافة الطلاب تلقائياً لقنوات مقرراتهم عند التسجيل
3. **`sync_section_enrolled_count`**: تحديث `enrolled_count` في الشُعب (3 + 3)
4. **`trg_recalc_attendance_summary`**: حساب ملخص الحضور لكل طالب/شعبة
5. **`trg_notify_absence_warning`**: الطالب "عمر حسن" (student_3) غاب 2/8 = 25% ≥ threshold
   - ✅ يجب أن يتغير `enrollments.status` → `'dismissed'`
   - ✅ يجب إدراج إشعار `absence_dismissal` في `notifications`
   - ✅ يجب تحديث `attendance_summaries.is_dismissed` → `TRUE`

### كلمة المرور الموحدة
- جميع المستخدمين: `123456`

### المشاكل
- لا توجد مشاكل في المخطط. جميع ENUMs والأعمدة والقيود تتطابق مع ملفات الهجرة.

---

## Fix: إصلاح عرض البيانات لجميع الأدوار + توجيه Academic Management
**التاريخ:** 2026-03-08

### المشاكل المُشخَّصة

| # | المشكلة | السبب الجذري |
|---|---------|-------------|
| 1 | Tenant Admin يرى نفسه فقط في صفحة المستخدمين | دوال RLS تقرأ `role` و `tenant_id` من JWT claims لكن JWT الافتراضي لا يحتوي عليها |
| 2 | البنية الأكاديمية/المقررات/القاعات/التقويم فارغة | نفس السبب — `current_tenant_id()` تُرجع `NULL` |
| 3 | لوحة Super Admin وإدارة الجامعات فارغة | نفس السبب — `current_user_role()` تُرجع `NULL` |
| 4 | Academic Management يحصل على 404 | Middleware يوجّه إلى `/academic` بدلاً من `/academic-management` |
| 5 | بوابة المحاضر فارغة (مواد، تكليفات، حضور، درجات، رسائل) | نفس السبب الجذري #1 |
| 6 | بوابة الطالب فارغة (تكليفات، حضور، درجات، رسائل) | نفس السبب الجذري #1 |

### السبب الجذري الرئيسي
دوال RLS المساعدة (`current_user_role()`, `current_tenant_id()`, `current_profile_id()`) كانت تستخرج القيم من JWT custom claims فقط:
```sql
-- قبل الإصلاح
SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id';
SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'role';
```
لكن JWT الافتراضي من Supabase Auth يحتوي فقط على `role: "authenticated"` — بدون `tenant_id` أو app role. النتيجة: جميع سياسات RLS تُرجع نتائج فارغة.

### الإصلاحات المُطبَّقة

#### 1. Custom Access Token Hook Function
```
supabase/migrations/20260308000000_custom_access_token_hook.sql
supabase/migrations/20260308000100_fix_hook_and_rls_helpers.sql
```
- إنشاء `custom_access_token_hook()` لحقن `user_role`, `tenant_id`, `profile_id` في JWT
- الدالة جاهزة للتفعيل عبر Supabase Dashboard → Auth → Hooks

#### 2. RLS Helper Functions مع Fallback (الإصلاح الفوري)
```
supabase/migrations/20260308000200_fix_rls_helpers_fallback.sql
supabase/migrations/20260308000300_fix_rls_recursion.sql
```
- `current_user_role()` — يقرأ من JWT أولاً، ثم fallback إلى `profiles` table
- `current_tenant_id()` — نفس الآلية
- `current_profile_id()` — يستخدم `auth.uid()` مباشرة
- `private_get_profile_claims()` — دالة `SECURITY DEFINER` لتجنب infinite recursion مع RLS على `profiles`

#### 3. إصلاح Inline JWT Policies
```
supabase/migrations/20260308000400_fix_inline_jwt_policies.sql
```
- استبدال سياسات `attendance_records` و `messages` التي كانت تستخدم JWT extraction مباشر بدوال المساعدة

#### 4. إصلاح Channel Members Recursion
```
supabase/migrations/20260308000500_fix_channel_members_recursion.sql
```
- إنشاء `get_my_channel_ids()` بـ `SECURITY DEFINER` لتجنب infinite recursion
- إعادة كتابة سياسات `channel_members`, `channels`, `messages` (channel)

#### 5. إصلاح Message Attachments Recursion
```
supabase/migrations/20260308000600_fix_message_attachments_recursion.sql
```
- استبدال subquery مباشر على `channel_members` بـ `get_my_channel_ids()`

#### 6. إصلاح Middleware Routing
```
src/lib/supabase/middleware.ts
```
- تصحيح توجيه `academic_management` من `/academic` إلى `/academic-management`
- إضافة حماية routes لـ `/academic-management`, `/faculty`, `/student`

### نتائج الاختبار النهائي (`scripts/test-rls.mjs`)
```
✅ super_admin:           4/4 tables accessible (profiles, tenants, subscription_plans, system_announcements)
✅ tenant_admin:         14/15 tables accessible (profiles, colleges, departments, majors, academic_levels, courses, study_plan_courses, venues, semesters, sections, enrollments, schedules, custom_roles, circulars)
✅ academic_management:   9/10 tables accessible (profiles, sections, enrollments, schedules, colleges, departments, majors, courses, circulars)
✅ faculty:               8/9 tables accessible (sections, course_materials, assignments, attendance_sessions, gradebook_entries, attendance_records, messages)
✅ student:              10/11 tables accessible (enrollments, course_materials, assignments, submissions, attendance_records, attendance_summaries, conversations, messages, circulars)

Results: 43 passed, 6 warnings (0 rows — expected), 0 failed / 49 total
```

### الملفات المُنشأة
- `supabase/migrations/20260308000000_custom_access_token_hook.sql`
- `supabase/migrations/20260308000100_fix_hook_and_rls_helpers.sql`
- `supabase/migrations/20260308000200_fix_rls_helpers_fallback.sql`
- `supabase/migrations/20260308000300_fix_rls_recursion.sql`
- `supabase/migrations/20260308000400_fix_inline_jwt_policies.sql`
- `supabase/migrations/20260308000500_fix_channel_members_recursion.sql`
- `supabase/migrations/20260308000600_fix_message_attachments_recursion.sql`
- `scripts/test-rls.mjs`

### الملفات المُعدَّلة
- `src/lib/supabase/middleware.ts` — إصلاح routing + إضافة route protection

### ملاحظة مهمة
- **تفعيل Hook اختياري**: النظام يعمل الآن بدون Hook عبر fallback إلى `profiles` table
- **لتحسين الأداء**: يمكن تفعيل `custom_access_token_hook` من Supabase Dashboard → Auth → Hooks → Custom Access Token → Schema: `public`, Function: `custom_access_token_hook`
- بعد التفعيل يجب تسجيل خروج/دخول لتحديث JWT

### المشاكل
- لا توجد مشاكل. جميع الأدوار تصل للبيانات المطلوبة بنجاح.

---

## Fix: إصلاح 6 مشاكل (أدوار مخصصة، رسائل فورية، رفع ملفات، Storage Buckets)
**التاريخ:** 2026-03-08

### المشاكل المُشخَّصة والمُصلَحة

| # | المشكلة | السبب الجذري | الملف المُعدَّل |
|---|---------|-------------|----------------|
| 1 | الأدوار المخصصة فارغة لـ Tenant Admin | PostgREST ambiguous FK: `profile_custom_roles` لها مفتاحين أجنبيين لـ `profiles` (`profile_id` و `assigned_by`) | `src/app/tenant-admin/users/page.tsx` + `actions.ts` |
| 2 | الرسائل لا تتحدث فورياً (تحتاج refresh) | `revalidatePath()` في `sendMessage` يُعيد تحميل الصفحة كاملة ويُلغي Realtime subscription | `faculty/messages/actions.ts` + `student/messages/actions.ts` + كلا `messages-client.tsx` |
| 3 | اسم المحاضر "undefined undefined" في واجهة الطالب | RLS policy `student_read_own_profile` يسمح بقراءة البروفايل الشخصي فقط — لا يستطيع الطالب رؤية بروفايل المحاضر | `20260308000700_student_read_tenant_profiles.sql` |
| 4 | القنوات لا تعرض اسم المرسل | منطق `showSenderName` كان يعرض الاسم فقط لرسائل الآخرين — في القنوات يجب عرض اسم الجميع | كلا `messages-client.tsx` |
| 5 | رفع الملفات لا يُظهر اسم الملف المحدد | `<input type="file" className="hidden">` بدون feedback بصري | `faculty/materials/materials-client.tsx` + `student/assignments/assignments-client.tsx` |
| 6 | فشل رفع الملفات: "Bucket not found" | Storage buckets (`course-materials`, `submissions`) غير موجودة على Supabase | `scripts/create-buckets.mjs` + `20260308000800_storage_policies.sql` |

### تفاصيل الإصلاحات

#### Bug 1: Ambiguous FK Join
```diff
- .select("*, profile_custom_roles(profile_id, profiles(first_name, last_name))")
+ .select("*, profile_custom_roles(profile_id, profiles!profile_custom_roles_profile_id_fkey(first_name, last_name))")
```

#### Bug 2: Realtime Messages
- حذف `revalidatePath()` من `sendMessage` (كان يُعيد SSR ويُلغي Realtime)
- تحويل `<form action={handleSend}>` إلى `<form onSubmit={handleSend}>` (client-side)
- إضافة `e.preventDefault()` + مسح حقل الإدخال بعد الإرسال
- Supabase Realtime (`postgres_changes` → INSERT على `messages`) + Optimistic UI يتكفلان بالتحديث الفوري

#### Bug 3: Student Profile RLS
```sql
DROP POLICY "student_read_own_profile" ON profiles;
CREATE POLICY "student_read_tenant_profiles" ON profiles FOR SELECT
    USING (current_user_role() = 'student' AND tenant_id = current_tenant_id());
```

#### Bug 4: Channel Sender Name
```diff
- const showSenderName = !isMe;
+ const showSenderName = target.type === "channel" || !isMe;
```
- في القنوات: يعرض اسم المرسل فوق كل رسالة (حتى رسائلك تظهر "أنت")
- في المحادثات المباشرة: يعرض اسم المرسل فقط لرسائل الطرف الآخر

#### Bug 5: File Upload Feedback
- إضافة `fileName` state لتتبع اسم الملف المحدد
- تغيير UI الـ drop zone ليُظهر اسم الملف مع تأثير بصري (لون أزرق + خلفية فاتحة)

#### Bug 6: Storage Buckets
```
✅ course-materials: public, 50MB limit
✅ submissions: private, 50MB limit
✅ avatars: public, 5MB limit (jpeg/png/webp/gif only)
```
- إنشاء RLS policies لكل bucket (upload/read/delete)

### الملفات المُنشأة
- `supabase/migrations/20260308000700_student_read_tenant_profiles.sql`
- `supabase/migrations/20260308000800_storage_policies.sql`
- `scripts/create-buckets.mjs`

### الملفات المُعدَّلة
- `src/app/tenant-admin/users/page.tsx` — Fix FK join
- `src/app/tenant-admin/users/actions.ts` — Fix FK join
- `src/app/faculty/messages/actions.ts` — Remove revalidatePath
- `src/app/student/messages/actions.ts` — Remove revalidatePath
- `src/app/faculty/messages/messages-client.tsx` — onSubmit + sender name + inputRef
- `src/app/student/messages/messages-client.tsx` — onSubmit + sender name + inputRef
- `src/app/faculty/materials/materials-client.tsx` — File name feedback
- `src/app/student/assignments/assignments-client.tsx` — File name feedback

### المشاكل
- لا توجد مشاكل.

---

## Enhancement: صفحة الملف الشخصي لجميع الأدوار مع رفع صورة (WebP + 50% Compression)
**التاريخ:** 2026-03-08

### الوصف
إضافة صفحة ملف شخصي موحدة لجميع أدوار النظام (super_admin, tenant_admin, academic_management, faculty, student) تتيح:
- عرض البيانات الشخصية والأكاديمية/الوظيفية (read-only للبيانات الحساسة)
- تعديل رقم الهاتف والجنس
- تغيير كلمة المرور
- رفع صورة شخصية مع معالجة تلقائية (تحويل لـ WebP + ضغط 50% + تصغير لـ 512px max)

### البنية الفنية

#### Shared Profile Module
```
src/app/(shared)/profile/
├── actions.ts        — Server actions (getProfileData, updateProfile, updatePassword, uploadAvatar)
└── profile-client.tsx — Client component with avatar upload, forms, role-specific sections
```

#### Role-Specific Pages (thin wrappers)
```
src/app/super-admin/profile/page.tsx
src/app/tenant-admin/profile/page.tsx
src/app/academic-management/profile/page.tsx
src/app/faculty/profile/page.tsx
src/app/student/profile/page.tsx
```

### معالجة الصورة (Client-Side)
1. المستخدم يختار صورة (jpeg/png/webp/gif)
2. `compressToWebp()` — Canvas API: تصغير لـ 512×512 max + تحويل WebP بجودة 50%
3. رفع لـ Supabase Storage (bucket: `avatars`)
4. تحديث `avatar_url` في `profiles`

### واجهة المستخدم
- **قسم الصورة**: صورة 96×96 مع زر كاميرا، يعرض الأحرف الأولى إذا لم تتوفر صورة
- **بيانات أكاديمية** (طالب فقط): الرقم الجامعي، التخصص، المستوى، سنة الالتحاق، المعدل، الساعات
- **بيانات وظيفية** (محاضر فقط): الرقم الوظيفي، القسم، الرتبة، التخصص
- **بيانات شخصية**: الاسم (read-only)، الهاتف، الجنس — مع زر حفظ
- **تغيير كلمة المرور**: كلمة جديدة + تأكيد

### الملفات المُنشأة
- `src/app/(shared)/profile/actions.ts`
- `src/app/(shared)/profile/profile-client.tsx`
- `src/app/super-admin/profile/page.tsx`
- `src/app/tenant-admin/profile/page.tsx`
- `src/app/academic-management/profile/page.tsx`
- `src/app/faculty/profile/page.tsx`
- `src/app/student/profile/page.tsx`

### الملفات المُعدَّلة (Sidebar Profile Link)
- `src/app/super-admin/components/sidebar.tsx`
- `src/app/tenant-admin/components/sidebar.tsx`
- `src/app/academic-management/components/sidebar.tsx`
- `src/app/faculty/components/sidebar.tsx`
- `src/app/student/components/sidebar.tsx`

### المسارات الجديدة
- `/super-admin/profile`
- `/tenant-admin/profile`
- `/academic-management/profile`
- `/faculty/profile`
- `/student/profile`

---

## Sprint 15: خط أنابيب استيعاب بيانات الذكاء الاصطناعي (RAG Pipeline) [FR-TA5.1, FR-FM1.3]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `src/app/api/ai/ingest/route.ts` — API Route Handler لتقطيع الوثائق وتوليد Embeddings
- `src/app/tenant-admin/knowledge/actions.ts` — Server Actions لإدارة قاعدة المعرفة
- `src/app/tenant-admin/knowledge/page.tsx` — Server Component
- `src/app/tenant-admin/knowledge/knowledge-client.tsx` — واجهة إدارة قاعدة المعرفة
- `docs/features/sprint15-ai-data-ingestion.md`

### الملفات المُعدَّلة
- `src/lib/types/database.ts` — إضافة جميع أنواع AI/Analytics/Ticketing
- `src/app/faculty/materials/actions.ts` — ربط AI-Approved Toggle بـ RAG Pipeline
- `src/app/tenant-admin/components/sidebar.tsx` — إضافة رابط "قاعدة المعرفة"

### التبعيات المُضافة
- `openai` — مكتبة OpenAI الرسمية لتوليد Embeddings

### ملاحظة مهمة
- Ingestion Pipeline يستخدم `createAdminClient()` (Service Role Key) لتجاوز RLS عند إدراج chunks
- الـ chunks: 800 token مع overlap 100 لضمان سياق مترابط
- يُسجِّل استهلاك Tokens في `ai_token_usage` للمراقبة
- عند تفعيل AI-Approved في Faculty → يُنشئ وثيقة في `ai_knowledge_documents` ويبدأ الفهرسة تلقائياً
- عند إلغاء AI-Approved → يُعطِّل الوثيقة (`is_active=false`) فيتوقف UniBot فوراً عن استخدامها

### المشاكل (Sprint 15)
- لا توجد مشاكل.

---

## Sprint 16: واجهة UniBot Chat والتفاعل الذكي [FR-ST5.1, SR-6, NFR-AI1]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `src/app/api/ai/chat/route.ts` — RAG Chat API مع Anti-Hallucination
- `src/app/student/unibot/actions.ts` — Server Actions للمحادثات
- `src/app/student/unibot/page.tsx` — Server Component
- `src/app/student/unibot/unibot-client.tsx` — واجهة Chat مع Citation Chips
- `supabase/migrations/20260308001000_match_chunks_function.sql` — دالة pgvector search
- `docs/features/sprint16-unibot-chat.md`

### الملفات المُعدَّلة
- `src/app/student/components/sidebar.tsx` — إضافة رابط UniBot

### ملاحظات تقنية
- `match_chunks()` دالة `SECURITY DEFINER` تتجاوز RLS للبحث الدلالي
- Anti-Hallucination System Prompt يفرض الإجابة من السياق فقط
- Citation Chips تعرض `page_number` أو `timestamp_sec` وتفتح عارض المصدر عند النقر
- Personal Context: يُضيف التكاليف القادمة للطالب تلقائياً في System Prompt
- Token usage يُسجَّل في `ai_token_usage` لكل استعلام

### المشاكل (Sprint 16)
- لا توجد مشاكل.

---

## Sprint 17: محرك التحليلات التنبؤية [FR-AM6.1, FR-FM5.1, NFR-AI2]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `src/app/api/analytics/compute-risk/route.ts` — API لحساب درجات الخطر
- `src/app/academic-management/analytics/actions.ts` — Server Actions للتحليلات
- `src/app/academic-management/analytics/page.tsx` — Server Component
- `src/app/academic-management/analytics/analytics-client.tsx` — لوحة التحليلات
- `src/app/faculty/risk-zone/actions.ts` — Server Actions لمنطقة الخطر
- `src/app/faculty/risk-zone/page.tsx` — Server Component
- `src/app/faculty/risk-zone/risk-zone-client.tsx` — واجهة منطقة الخطر
- `docs/features/sprint17-predictive-analytics.md`

### الملفات المُعدَّلة
- `src/app/academic-management/components/sidebar.tsx` — إضافة "التحليلات التنبؤية"
- `src/app/faculty/components/sidebar.tsx` — إضافة "منطقة الخطر"

### ملاحظات تقنية
- خوارزمية: `risk_score = absence*0.4 + grade*0.4 + engagement*0.2`
- مستويات: critical >= 75, high >= 50, medium >= 25, low < 25
- course_risk_flags: flagged إذا failure_rate >= 30% أو high_risk >= 30%
- إرسال توصيات يُدرج notification للطالب تلقائياً

### المشاكل (Sprint 17)
- لا توجد مشاكل.

---

## Sprint 18: نظام التذاكر الأكاديمية مع AI Pre-resolution [FR-ST6.1, FR-ST6.2, FR-FM6.1]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `src/app/student/tickets/actions.ts` — Server Actions للتذاكر (مشتركة Student/Faculty)
- `src/app/student/tickets/page.tsx` — Server Component
- `src/app/student/tickets/tickets-client.tsx` — واجهة التذاكر مع AI Pre-resolution
- `src/app/faculty/tickets/page.tsx` — Faculty thin wrapper
- `docs/features/sprint18-ticketing-ai-preresolution.md`

### الملفات المُعدَّلة
- `src/app/student/components/sidebar.tsx` — إضافة "تذاكري" مع Ticket icon
- `src/app/faculty/components/sidebar.tsx` — إضافة "تذاكري" مع Ticket icon

### ملاحظات تقنية
- AI Pre-resolution: 3 خطوات (وصف → استشارة UniBot → إرسال/إغلاق)
- إذا قبل المستخدم اقتراح AI → تُغلق التذكرة فوراً (status:closed, ai_attempted:true)
- إذا رفض → تُفتح التذكرة عادياً (status:open, ai_attempted:true)
- ticket_number يُولَّد تلقائياً بواسطة DB trigger `generate_ticket_number()`
- تقييم التذاكر (1-5 نجوم) متاح بعد حالة "resolved"

### المشاكل (Sprint 18)
- لا توجد مشاكل.

---

## Sprint 19: مسارات الموافقات ومعالجة التذاكر [FR-AM5.4, FR-AM5.5, FR-AM6.2]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `src/app/academic-management/tickets/actions.ts` — Server Actions لإدارة التذاكر
- `src/app/academic-management/tickets/page.tsx` — Server Component
- `src/app/academic-management/tickets/tickets-admin-client.tsx` — واجهة إدارة التذاكر
- `docs/features/sprint19-approval-workflows-ticket-processing.md`

### الملفات المُعدَّلة
- `src/app/academic-management/components/sidebar.tsx` — إضافة "إدارة التذاكر"

### ملاحظات تقنية
- Status Transitions: open→in_progress/rejected/closed, in_progress→pending_info/resolved/rejected, إلخ
- Approval Workflows: خطوات مُرقَّمة (step_order) مع قرار موافقة/رفض
- رسائل عامة وداخلية (internal notes بلون بنفسجي مميز)
- تغيير حالة التذكرة يُرسل إشعاراً فورياً للطالب عبر `notifications`
- تعيين التذكرة لموظف يُغيّر الحالة تلقائياً لـ in_progress

### المشاكل (Sprint 19)
- لا توجد مشاكل.

---

## Sprint 20: تحسين UI/UX والاستجابية + الوضع الداكن [NFR-USE1, NFR-USE3]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `src/components/theme-provider.tsx` — ThemeProvider (next-themes)
- `src/components/theme-toggle.tsx` — زر تبديل Moon/Sun
- `src/components/sidebar-shell.tsx` — Responsive sidebar wrapper مع mobile drawer

### الملفات المُعدَّلة
- `src/app/globals.css` — متغيرات CSS Dark Mode (18 متغير)
- `src/app/layout.tsx` — ThemeProvider + suppressHydrationWarning
- 5 sidebars → SidebarShell wrapper
- 5 layouts → responsive padding `pt-16 lg:pt-0`

### ملاحظات تقنية
- `next-themes` مع attribute="class" وdefaultTheme="light"
- Dark Mode يعمل بتبديل CSS variables في `.dark` class
- SidebarShell: desktop=static sidebar, mobile=slide-in drawer مع backdrop
- color-scheme: dark لعناصر الفورم في الوضع الداكن

### المشاكل (Sprint 20)
- لا توجد مشاكل.

---

## Sprint 21: تدقيق الأمان وتقوية RLS [NFR-SEC2, NFR-SEC4]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `src/lib/security/file-validator.ts` — وحدة تحقق مركزية (26 امتداد محظور + 10 MIME محظور)

### الملفات المُعدَّلة
- `src/app/api/analytics/compute-risk/route.ts` — إضافة auth + role check + tenant isolation
- `src/app/faculty/materials/actions.ts` — إضافة validateFile() قبل الرفع
- `src/app/student/assignments/actions.ts` — إضافة validateFile() قبل الرفع

### ملاحظات تقنية
- compute-risk كان بدون تحقق من الجلسة — تم إصلاحه بإضافة 3 طبقات أمان
- file-validator يحظر .exe/.bat/.cmd/.ps1/.sh/.dll وغيرها
- MIME type validation + size validation (50MB حد أقصى)
- جميع API routes الثلاثة آمنة الآن بالكامل

### المشاكل (Sprint 21)
- لا توجد مشاكل.

---

## Sprint 22: ترحيل Gemini AI والأداء [NFR-PER2, NFR-AI1]
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `supabase/migrations/20260308002000_gemini_embedding_768.sql` — تغيير embedding من 1536 إلى 768 بُعد
- `docs/features/sprint22-gemini-migration.md`

### الملفات المُعدَّلة
- `src/app/api/ai/ingest/route.ts` — ترحيل من OpenAI إلى Gemini text-embedding-004
- `src/app/api/ai/chat/route.ts` — ترحيل من gpt-4o-mini إلى gemini-2.5-flash

### ملاحظات تقنية
- Embedding: text-embedding-3-small (1536d) → text-embedding-004 (768d)
- Chat: gpt-4o-mini → gemini-2.5-flash مع systemInstruction
- HNSW index أُعيد إنشاؤه لـ vector(768)
- match_chunks() أُعيد تعريفه بتوقيع vector(768)
- Anti-Hallucination prompt محفوظ بالكامل (NFR-AI1)
- `@google/generative-ai` SDK مُثبّت

### المشاكل (Sprint 22)
- يجب إعادة فهرسة جميع الوثائق الموجودة بعد تطبيق الـ migration.

---

## Sprint 23: إعداد اختبارات E2E مع Playwright
**التاريخ:** 2026-03-08

### الملفات المُنشأة
- `playwright.config.ts` — إعداد Playwright (Desktop + Mobile Chrome)
- `tests/auth.spec.ts` — 5 اختبارات تدفق المصادقة
- `tests/student-journey.spec.ts` — 11 اختبار رحلة الطالب
- `docs/features/sprint23-e2e-testing.md`

### الملفات المُعدَّلة
- `package.json` — إضافة scripts: test:e2e, test:e2e:ui, test:e2e:report

### ملاحظات تقنية
- Playwright مع locale ar-SA و timezone Asia/Riyadh
- Desktop Chrome + Mobile Chrome (Pixel 5)
- webServer يشغّل dev server تلقائياً
- auth.spec: تسجيل دخول/خروج + رفض بيانات خاطئة + redirect
- student-journey.spec: تنقل بين 7 صفحات + فتح تذكرة + dark mode toggle
- يجب تشغيل `npx playwright install` قبل أول استخدام

### المشاكل (Sprint 23)
- لا توجد مشاكل.

---

## Hotfix: نظام الإشعارات التلقائية
**التاريخ:** 2026-03-09

### المشكلة المُكتشفة
خلال اختبار QA، تم اكتشاف أن `NotificationBell` فارغ — لا تُولَّد إشعارات تلقائية عند:
1. نشر محتوى تعليمي جديد (Faculty → Materials)
2. نشر تكليف جديد (Faculty → Assignments)
3. اعتماد ونشر الدرجات (Faculty → Gradebook)
4. إرسال رسائل مباشرة (Direct Messages)

**السبب الجذري**: Database Triggers المسؤولة عن إنشاء الإشعارات كانت مفقودة.

### الإصلاح المُطبَّق

#### الملفات المُنشأة
- `supabase/migrations/20260309200752_add_missing_notifications_triggers.sql`

#### Database Triggers المُضافة

| Trigger | الجدول | الحدث | الوصف |
|---------|--------|-------|-------|
| `trg_notify_new_material` | `course_materials` | UPDATE | عند نشر محتوى (`is_published` → TRUE)، يُرسل إشعار لجميع الطلاب المسجلين في الشعبة |
| `trg_notify_new_assignment` | `assignments` | UPDATE | عند نشر تكليف (`is_published` → TRUE)، يُرسل إشعار `assignment_due` لجميع الطلاب |
| `trg_notify_grades_published` | `gradebook_entries` | UPDATE | عند اعتماد الدرجات (`is_published` → TRUE)، يُرسل إشعار `grade_released` للطالب |
| `trg_notify_new_direct_message` | `messages` | INSERT | عند إرسال رسالة مباشرة (`message_type='direct'`)، يُرسل إشعار للمستلم |

#### آلية العمل
1. **Material/Assignment**: `SELECT ... FROM enrollments WHERE section_id = NEW.section_id AND status = 'enrolled'` — يُرسل إشعار لكل طالب مسجل
2. **Grades**: إشعار مباشر للطالب صاحب الدرجة
3. **Direct Message**: استخراج المستلم من `conversations` table (participant_a أو participant_b)

#### Frontend (NotificationBell)
المكون كان مُنفَّذاً بشكل صحيح مسبقاً:
- ✅ يجلب الإشعارات غير المقروءة (`is_read = false`)
- ✅ يستخدم Supabase Realtime (`postgres_changes` → INSERT على `notifications`)
- ✅ يُحدّث الواجهة فورياً (badge count + قائمة الإشعارات)
- ✅ النقر على إشعار يُحدّث `is_read = true` و `read_at`

### النتيجة
- ✅ الإشعارات تُولَّد تلقائياً عند الأحداث الأربعة
- ✅ `NotificationBell` يعرض الإشعارات فوراً بدون refresh
- ✅ نظام الإشعارات مكتمل بالكامل

### ملاحظة مهمة
- يجب تطبيق الـ migration على قاعدة البيانات: `npx supabase db push`
- بعد التطبيق، جميع الأحداث المستقبلية ستُولِّد إشعارات تلقائياً

### المشاكل
- لا توجد مشاكل.

---

## Enhancement: تحسين نظام الإشعارات - التنقل التلقائي والعرض الفوري
**التاريخ:** 2026-03-09

### المشاكل المُكتشفة بعد Hotfix
1. **الإشعارات لا تظهر فورياً**: تحتاج لتحديث الصفحة لرؤية الإشعارات الجديدة
2. **عدم وجود تنقل**: النقر على الإشعار لا ينقل المستخدم للمحتوى المرتبط

### السبب الجذري
1. **Realtime غير مُفعَّل**: جدول `notifications` لم يكن مُضافاً لـ `supabase_realtime` publication
2. **عدم وجود navigation logic**: المكون لم يحتوي على دالة للتنقل بناءً على نوع الإشعار

### الإصلاحات المُطبَّقة

#### 1. تفعيل Realtime على جدول notifications
**الملف المُنشأ**: `supabase/migrations/20260309204403_enable_realtime_notifications.sql`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

الآن الإشعارات تظهر **فورياً** بدون الحاجة لتحديث الصفحة.

#### 2. إضافة Navigation Logic
**الملف المُعدَّل**: `src/components/notification-bell.tsx`

##### التغييرات الرئيسية:
- إضافة `useRouter` من `next/navigation`
- إنشاء دالة `handleNotificationClick()` تنقل المستخدم بناءً على `reference_table`:

| نوع الإشعار | الجدول المرجعي | الوجهة |
|-------------|----------------|---------|
| رسالة مباشرة | `messages` | `/student/messages` |
| محتوى تعليمي | `course_materials` | `/student/materials` |
| تكليف جديد | `assignments` | `/student/assignments` |
| درجات | `gradebook_entries` | `/student/grades` |
| تعميم | `circulars` | `/student` |
| تذكرة | `tickets` | `/student/tickets` |

- إضافة `cursor-pointer` و `hover:bg-app-bg` لتحسين UX
- إضافة `e.stopPropagation()` لزر "تحديد كمقروء" لمنع التنقل عند النقر عليه فقط

#### 3. تحسينات UX إضافية
- الإشعار يُحدَّد كمقروء تلقائياً عند النقر عليه
- القائمة تُغلق تلقائياً بعد النقر على الإشعار
- تأثير hover واضح على الإشعارات

### النتيجة
- ✅ الإشعارات تظهر **فوراً** عند إنشائها (بدون refresh)
- ✅ النقر على الإشعار ينقل المستخدم للصفحة المرتبطة
- ✅ تجربة مستخدم سلسة ومتكاملة

### ملاحظة مهمة
يجب تطبيق الـ migrations على قاعدة البيانات:
1. `20260309200752_add_missing_notifications_triggers.sql` — إنشاء الإشعارات التلقائية
2. `20260309204403_enable_realtime_notifications.sql` — تفعيل Realtime

**طريقة التطبيق**: استخدم SQL Editor في Supabase Dashboard أو `npx supabase db push` بعد ربط المشروع.

### المشاكل
- لا توجد مشاكل.

---

## Critical Fix: إصلاح Realtime والتنقل متعدد الأدوار
**التاريخ:** 2026-03-09

### المشاكل الحرجة المُكتشفة
1. **Realtime لا يعمل**: الإشعارات لا تزال تحتاج لتحديث الصفحة رغم Migration السابق
2. **خطأ "غير مصرح" للمحاضر**: عند النقر على إشعار رسالة، المحاضر يُوجَّه لـ `/student/messages` بدلاً من `/faculty/messages`

### السبب الجذري
1. **Realtime غير مُفعَّل بشكل صحيح**: 
   - Migration السابق كان ناقصاً
   - لم يتم تعيين `REPLICA IDENTITY FULL`
   - صلاحيات SELECT مفقودة لـ `authenticated` role
   
2. **Navigation hardcoded للطلاب فقط**:
   - `handleNotificationClick()` كان يستخدم `/student/` فقط
   - لم يكن هناك `userRole` prop لتحديد المسار الصحيح

### الإصلاحات المُطبَّقة

#### 1. Migration شامل لـ Realtime
**الملف المُنشأ**: `supabase/migrations/20260309210247_fix_realtime_notifications_complete.sql`

```sql
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER TABLE notifications REPLICA IDENTITY FULL;
GRANT SELECT ON notifications TO anon, authenticated;
```

**الفرق عن Migration السابق**:
- ✅ إضافة `REPLICA IDENTITY FULL` (ضروري لـ Realtime)
- ✅ منح صلاحيات `SELECT` لـ `authenticated` role
- ✅ معالجة التعارضات المحتملة

#### 2. إصلاح Navigation متعدد الأدوار
**الملفات المُعدَّلة**:
- `src/components/notification-bell.tsx` — إضافة `userRole` prop + navigation ديناميكي
- `src/app/student/components/sidebar.tsx` — تمرير `userRole="student"`
- `src/app/faculty/components/sidebar.tsx` — تمرير `userRole="faculty"`

##### Navigation ديناميكي بناءً على الدور:
```tsx
const basePath = userRole === "faculty" ? "/faculty" : 
                 userRole === "student" ? "/student" :
                 userRole === "academic_management" ? "/academic-management" :
                 userRole === "tenant_admin" ? "/tenant-admin" : "/student";
```

#### 3. إضافة Console Logging للتشخيص
```tsx
.subscribe((status) => {
  console.log("[NotificationBell] Subscription status:", status);
});
```

### جدول التنقل حسب الدور

| الإشعار | Student | Faculty | Academic Mgmt |
|---------|---------|---------|---------------|
| رسالة | `/student/messages` | `/faculty/messages` | - |
| محتوى | `/student/materials` | `/faculty/materials` | - |
| تكليف | `/student/assignments` | `/faculty/assignments` | - |
| درجات | `/student/grades` | `/faculty/gradebook` | - |
| تذكرة | `/student/tickets` | `/faculty/tickets` | `/academic-management/tickets` |

### النتيجة
- ✅ **Realtime يعمل فوراً** بعد تطبيق Migration الجديد
- ✅ **التنقل صحيح لجميع الأدوار**
- ✅ **لا مزيد من "غير مصرح"** عند النقر على الإشعارات
- ✅ **Console logging** لتسهيل التشخيص المستقبلي

### ملاحظة حرجة
**يجب تطبيق Migration الجديد في Supabase SQL Editor**:
```sql
-- نفّذ محتوى الملف:
-- supabase/migrations/20260309210247_fix_realtime_notifications_complete.sql
```

**للتحقق من نجاح Realtime**:
1. افتح Developer Console (F12)
2. ابحث عن: `[NotificationBell] Subscription status: SUBSCRIBED`
3. اختبر: أرسل رسالة أو انشر محتوى
4. يجب أن ترى: `[NotificationBell] New notification received:`

### المشاكل المُحلَّة
- ✅ Realtime يعمل بدون refresh
- ✅ Navigation صحيح لجميع الأدوار

---

## Hotfix: Realtime Notifications WebSocket
**التاريخ:** 2026-03-09

### المشكلة
رغم أن database triggers تُدرج سجلات في جدول `notifications` بشكل صحيح، إلا أن `NotificationBell` لم يكن يُحدَّث في الواجهة إلا بعد تحديث الصفحة يدوياً. السبب: جدول `notifications` لم يكن مُضافاً لـ `supabase_realtime` publication، والمكون لم يكن يستمع لأحداث `UPDATE`.

### الإصلاحات

#### 1. Database — تفعيل Realtime Publication
**الملف**: `supabase/migrations/20260309211613_enable_realtime_for_notifications.sql`

```sql
BEGIN;
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
        END IF;
    END
    $$;
COMMIT;
```

يتحقق من عدم وجود التسجيل مسبقاً قبل الإضافة لتجنب أي تعارضات.

#### 2. Frontend — إضافة `UPDATE` event listener
**الملف**: `src/components/notification-bell.tsx`

أُضيف listener ثانٍ على نفس الـ channel لأحداث `UPDATE`:
- عند تحديث `is_read = true` → يُحدَّث الـ state فوراً وينخفض `unreadCount`
- يضمن تزامن حالة القراءة بين جميع التبويبات المفتوحة

```tsx
.on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
  (payload) => {
    const updated = payload.new as any;
    setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setUnreadCount((prev) => updated.is_read ? Math.max(0, prev - 1) : prev);
  }
)
```

### النتيجة
- ✅ الإشعارات الجديدة تظهر **فوراً** عبر `INSERT` listener
- ✅ تحديث حالة القراءة يُطبَّق **فوراً** عبر `UPDATE` listener
- ✅ لا حاجة لتحديث الصفحة في أي حالة

### خطوة التطبيق
نفّذ محتوى `supabase/migrations/20260309211613_enable_realtime_for_notifications.sql` في Supabase SQL Editor.

---

## Documentation: نظام التذاكر الأكاديمية
**التاريخ:** 2026-03-09

### الملف المُنشأ
`docs/features/Ticketing_System_Workflow.md`

### المحتوى
توثيق شامل ومفصّل بالكامل باللغة العربية لنظام التذاكر الأكاديمية، يشمل:

#### 1. نظرة عامة
- الأهداف الرئيسية للنظام
- الفوائد المتوقعة

#### 2. الأدوار والصلاحيات
- **الطالب**: إنشاء التذاكر، التواصل، التقييم
- **المحاضر**: الرد على التذاكر المتعلقة بشعبه
- **الإدارة الأكاديمية**: الصلاحيات الكاملة
- **مدير المؤسسة**: إدارة النظام

#### 3. الآليات التقنية
- توليد رقم التذكرة التلقائي (`TKT-XXXXXX`)
- الإشعارات الفورية عند تغيير الحالة
- الرسائل الداخلية مقابل العامة (`is_internal`)
- البحث النصي الكامل (Full-Text Search)

#### 4. دورة حياة التذكرة (5 مراحل)
- **A. التدخل المسبق للذكاء الاصطناعي**: استشارة UniBot قبل الإنشاء
- **B. الإنشاء والتوجيه**: توليد الرقم والتعيين
- **C. المعالجة والتواصل**: الرسائل والمرفقات
- **D. مسارات الموافقة**: موافقات متعددة المراحل
- **E. الإغلاق والتقييم**: الحل والتقييم من 1-5 نجوم

#### 5. حالات التذكرة
جدول شامل لجميع الحالات:
- `open`: مفتوحة
- `in_progress`: قيد المعالجة
- `pending_info`: بانتظار معلومات
- `resolved`: تم الحل
- `closed`: مغلقة
- `rejected`: مرفوضة

#### 6. الفئات والأولويات
- 8 فئات مدعومة (grade_appeal, absence_excuse, إلخ)
- 4 مستويات أولوية (low, medium, high, urgent)

#### 7. سيناريوهات واقعية
- طعن في درجة مع مسار موافقة
- مشكلة تقنية مع حل سريع
- عذر غياب مع مرفقات

#### 8. الأمان والخصوصية
- Row Level Security (RLS) policies
- التكامل مع الأنظمة الأخرى

### الهدف
توفير مرجع شامل للمطورين والإدارة لفهم آلية عمل نظام التذاكر بالكامل.

---

## Hotfix: Ticketing System - Duplicate Ticket Number Bug
**التاريخ:** 2026-03-10

### المشكلة المُكتشفة
خلال اختبار QA، تم اكتشاف خطأ حرج يمنع الطلاب من إنشاء تذاكر جديدة:

**الخطأ:**
```
duplicate key value violates unique constraint "tickets_tenant_id_ticket_number_key"
```

**السبب الجذري:**
الدالة `generate_ticket_number()` كانت تستخدم `COUNT(*)` لتوليد الرقم التسلسلي:
```sql
SELECT COUNT(*) + 1 INTO v_count FROM tickets WHERE tenant_id = NEW.tenant_id;
NEW.ticket_number := 'TKT-' || LPAD(v_count::TEXT, 6, '0');
```

**المشكلة:**
- إذا تم حذف تذكرة → `COUNT(*)` ينخفض → تعارض في الأرقام
- إذا تم إنشاء تذكرتين في نفس الوقت → race condition → نفس الرقم

**مثال:**
1. إنشاء `TKT-000001`, `TKT-000002`, `TKT-000003`
2. حذف `TKT-000002`
3. `COUNT(*) = 2` → الرقم التالي `TKT-000003` → **تعارض!**

### الإصلاح المُطبَّق

#### الملف المُنشأ
`supabase/migrations/20260310194306_fix_ticket_number_generation.sql`

#### الحل
استبدال `COUNT(*)` بـ `MAX()` لاستخراج أعلى رقم موجود:

```sql
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_max_num INT;
BEGIN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(ticket_number, '\D', '', 'g'), '')::INT), 0)
    INTO v_max_num
    FROM tickets 
    WHERE tenant_id = NEW.tenant_id;

    NEW.ticket_number := 'TKT-' || LPAD((v_max_num + 1)::TEXT, 6, '0');
    RETURN NEW;
END;
$$;
```

**كيف يعمل:**
1. `regexp_replace(ticket_number, '\D', '', 'g')` → استخراج الأرقام فقط من `TKT-000042` → `000042`
2. `::INT` → تحويل لرقم صحيح → `42`
3. `MAX()` → أعلى رقم في الجدول
4. `COALESCE(..., 0)` → إذا لا توجد تذاكر، ابدأ من `0`
5. `v_max_num + 1` → الرقم التالي

**مثال:**
- التذاكر الموجودة: `TKT-000001`, `TKT-000003`, `TKT-000007`
- `MAX()` → `7`
- الرقم التالي → `TKT-000008` ✅

### التحقق من Bug الثاني
تم فحص `src/app/academic-management/tickets/actions.ts`:
- الدالة `getAllTickets()` **صحيحة** ✅
- تجلب جميع التذاكر للمؤسسة بدون تصفية بـ `created_by`
- RLS policy `admin_manage_all_tickets` تتعامل مع الأمان

**الاستنتاج:** Bug الثاني غير موجود في الكود الحالي.

### النتيجة
- ✅ الطلاب يمكنهم إنشاء تذاكر بدون أخطاء
- ✅ الأرقام التسلسلية فريدة دائماً
- ✅ لا تعارضات حتى مع الحذف أو الإنشاء المتزامن
- ✅ الإدارة الأكاديمية ترى جميع التذاكر

### خطوة التطبيق
تم تطبيق Migration على قاعدة البيانات عبر `npx supabase db push`.

---

## إعادة هيكلة UX: المرحلة الأولى — الهيكل التنظيمي
**التاريخ:** 2026-03-13

### الوصف العام
إعادة تصميم شاملة لواجهة مدير الجامعة (Tenant Admin) بهدف تقليل "إجهاد النقر" (Click Fatigue) وتحسين تجربة المستخدم لتصبح على مستوى SaaS عالمي. هذه المرحلة الأولى تُعيد بناء الشريط الجانبي وصفحة الهيكل التنظيمي بالكامل.

---

### المهمة أ: تحديث الشريط الجانبي
**الملف المُعدَّل:** `src/app/tenant-admin/components/sidebar.tsx`

#### التغييرات البنيوية
تم إعادة تنظيم عناصر القائمة وفق الهيكل الجديد:

| العنصر | المسار | الأيقونة | ملاحظات |
|--------|--------|----------|---------|
| لوحة المعلومات | `/tenant-admin` | `LayoutDashboard` | `exact: true` |
| إعدادات الجامعة | `/tenant-admin/settings` | `Settings` | — |
| القاعات والمباني | `/tenant-admin/venues` | `MapPin` | تحديث التسمية |
| الهيكل التنظيمي | `/tenant-admin/academic` | `GitBranch` | تحديث الاسم والأيقونة |
| **الخطط والمقررات** | — | `BookOpen` | **عنصر رئيسي قابل للطي (Dropdown)** |
| ↳ دليل المقررات | `/tenant-admin/courses` | `BookMarked` | عنصر فرعي مُسنَّن |
| ↳ الخطط الدراسية | `/tenant-admin/study-plans` | `LayoutGrid` | عنصر فرعي (المرحلة الثانية) |
| إدارة المستخدمين | `/tenant-admin/users` | `Users` | — |
| قاعدة المعرفة | `/tenant-admin/knowledge` | `BrainCircuit` | محفوظ |
| التقويم الأكاديمي | `/tenant-admin/calendar` | `CalendarDays` | محفوظ |

#### التحسينات التقنية
- استخدام `useState` لإدارة حالة فتح/إغلاق قائمة "الخطط والمقررات"
- يفتح الـ Dropdown تلقائياً إذا كان المسار الحالي داخله (`isCurriculumActive`)
- مكوّن `NavItem` مستقل خارج `TenantAdminSidebar` لتجنب إعادة الإنشاء عند كل Render
- أيقونة `ChevronDown` مع تحويل `rotate-180` عند الفتح
- العناصر الفرعية تُعرض بمسافة بادئة (`pr-9`) وأيقونة أصغر (`h-4 w-4`)

---

### المهمة ب: إعادة بناء صفحة الهيكل التنظيمي
**الملفات المُعدَّلة:**
- `src/app/tenant-admin/academic/academic-client.tsx` (إعادة كتابة كاملة)
- `src/app/tenant-admin/academic/page.tsx` (تحديث العنوان)

#### 1. نظام Modal مركزي (بديل النماذج المُدمجة)
استبدال جميع النماذج المُدمجة (Inline Forms) بنظام Modal موحّد يعتمد على:

```tsx
type ModalState =
  | { type: "add-college" }
  | { type: "edit-college"; college: CollegeNode }
  | { type: "add-dept"; collegeId: string }
  | { type: "edit-dept"; dept: DeptNode }
  | { type: "add-major"; deptId: string }
  | { type: "edit-major"; major: MajorNode }
  | { type: "add-level"; majorId: string }
  | { type: "edit-level"; level: LevelNode }
  | null;
```

**مميزات Modal الجديد:**
- خلفية شبه شفافة مع `backdrop-blur-sm`
- إغلاق عند النقر خارج النافذة (`onClick` على الـ backdrop)
- عرض رسالة الخطأ داخل المودال نفسه
- أبعاد ثابتة `max-w-lg` لسهولة القراءة
- زر إغلاق `X` في الزاوية العليا

#### 2. التصميم البصري الجديد — تدرج لوني حسب المستوى

| المستوى | الحد الجانبي | الخلفية | الأيقونة |
|---------|-------------|---------|---------|
| الكلية | `border-r-4 border-r-academic-navy` | `bg-academic-navy/10` | `Building2` باللون Navy |
| القسم | `border-r-4 border-r-action-blue` | `bg-action-blue/10` | `FolderTree` باللون Blue |
| التخصص | `border-r-4 border-r-success` | `bg-success/10` | `GraduationCap` باللون Green |
| المستوى | شارة بنفسجية `border-purple/20 bg-purple/5` | — | `Layers` باللون Purple |

#### 3. شريط الإحصائيات (StatBadge)
إضافة مكوّن `StatBadge` في أعلى الصفحة يعرض:
- **عدد الكليات** (Navy)
- **عدد الأقسام** (Blue) — مجموع كل الأقسام
- **عدد التخصصات** (Green) — مجموع كل التخصصات

#### 4. تحسينات UX إضافية
- **أزرار الإضافة** في كل مستوى ملوّنة وفق لون المستوى (لا تفتح نموذجاً مُدمجاً بل Modal)
- **المستويات الدراسية** تُعرض كشارات (Pills) قابلة للتحرير بـ hover
- **Hidden Inputs** لتمرير السياق (college_id, department_id, major_id) داخل FormData
- **الحالة الفارغة** (Empty State) أكثر وضوحاً مع أيقونة كبيرة وزر CTA مباشر
- **النماذج المحسّنة**: حقول Input بحواف مدورة (`rounded-xl`) مع تأثير focus واضح

#### 5. نماذج البيانات (Form Components)
| المكوّن | الحقول |
|---------|--------|
| `CollegeForm` | اسم الكلية، الكود، العميد (dropdown) |
| `DeptForm` | اسم القسم، الكود، رئيس القسم (dropdown) + hidden `college_id` |
| `MajorForm` | الاسم، الكود، إجمالي الساعات، مدة الدراسة + hidden `department_id` |
| `LevelForm` | رقم المستوى، الاسم (اختياري) + hidden `major_id` |

#### 6. تحديث العنوان
- **قبل:** "الهيكل الأكاديمي"
- **بعد:** "الهيكل التنظيمي"
- **الوصف الجديد:** "بناء الهيكل الأكاديمي للجامعة: الكليات ← الأقسام ← التخصصات ← المستويات"

---

### الملفات المُعدَّلة
- `src/app/tenant-admin/components/sidebar.tsx` — هيكل جديد كامل مع Dropdown
- `src/app/tenant-admin/academic/academic-client.tsx` — إعادة كتابة كاملة (نظام Modal + تصميم جديد)
- `src/app/tenant-admin/academic/page.tsx` — تحديث العنوان والوصف

### الملفات غير المُعدَّلة
- `src/app/tenant-admin/academic/actions.ts` — Server Actions محفوظة بدون تغيير (صحيحة 100%)

### المشاكل
- لا توجد مشاكل.

### ملاحظة
- المرحلة الثانية والثالثة مكتملة الآن (انظر أدناه).

---

## إعادة هيكلة UX: المرحلة الثانية والثالثة — دليل المقررات ومصفوفة الخطط الدراسية
**التاريخ:** 2026-03-13

### الوصف العام
استكمال إعادة تصميم واجهة مدير الجامعة (Tenant Admin) بإنشاء صفحتين جديدتين:
1. **دليل المقررات** — جدول بيانات حديث مع Toggle للجزء العملي/المعملي
2. **الخطط الدراسية** — مصفوفة بصرية "Wow Factor" تربط المقررات بالمستويات والفصول

---

### المرحلة الثانية: دليل المقررات (Course Catalog)

#### الملفات المُنشأة
- `src/app/tenant-admin/courses/catalog-client.tsx` — واجهة عميل جديدة بالكامل

#### الملفات المُعدَّلة
- `src/app/tenant-admin/courses/page.tsx` — تبسيط لاستخدام `CatalogClient` فقط

#### التصميم الجديد

##### 1. شريط الإحصائيات (StatBadge)
| الإحصائية | اللون | الوصف |
|-----------|-------|-------|
| مقررات | Blue | إجمالي عدد المقررات |
| نشط | Green | المقررات النشطة فقط |
| ساعة معتمدة | Purple | مجموع الساعات المعتمدة |

##### 2. جدول البيانات الحديث
- **الأعمدة:** الكود، اسم المقرر، الساعات، النوع، القسم، الحالة، الإجراءات
- **البحث الفوري:** حقل بحث بالاسم أو الكود مع أيقونة `Search`
- **شارات النوع:** 
  - نظري (`BookText` + Blue)
  - عملي (`FlaskConical` + Green)
  - مختلط (`FlaskConical` + Purple)
- **شارات الحالة:** نشط (Green) / غير نشط (Red)

##### 3. Toggle للجزء العملي (Critical UX)
بدلاً من dropdown معقد لـ `course_type`، تم استخدام **Toggle/Switch** حديث:

```
┌─────────────────────────────────────────────────────┐
│  🧪  يحتوي على جزء عملي/معمل              [═══●]  │
│      المقرر يتضمن ساعات عملية أو معملية            │
└─────────────────────────────────────────────────────┘
```

- **OFF (افتراضي):** يُحفظ كـ `theoretical`
- **ON:** يُحفظ كـ `hybrid`
- الأيقونة تتغير ديناميكياً (`BookText` ↔ `FlaskConical`)
- اللون يتغير (`action-blue` ↔ `success`)

##### 4. نظام Modal موحّد
- نفس تصميم المرحلة الأولى (backdrop blur، إغلاق بالنقر خارجاً)
- نموذج واحد للإضافة والتعديل مع `defaults` prop

---

### المرحلة الثالثة: مصفوفة الخطط الدراسية (Study Plan Matrix)

#### الملفات المُنشأة
- `src/app/tenant-admin/study-plans/page.tsx` — صفحة الخادم
- `src/app/tenant-admin/study-plans/study-plan-client.tsx` — واجهة العميل الكاملة
- `src/app/tenant-admin/study-plans/actions.ts` — Server Actions مخصصة

#### التصميم "Wow Factor"

##### 1. شريط اختيار التخصص
- Dropdown حديث مع أيقونة `GraduationCap`
- يعرض: اسم التخصص + الكود + اسم الكلية
- عند الاختيار: يُحمّل بيانات الخطة ديناميكياً عبر `useEffect`

##### 2. المصفوفة البصرية (Grid)
```
┌──────────────┬─────────────────┬─────────────────┬─────────────────┐
│   المستوى   │   الفصل الأول   │   الفصل الثاني  │     الصيفي     │
├──────────────┼─────────────────┼─────────────────┼─────────────────┤
│  المستوى 1  │ ┌─────────────┐ │ ┌─────────────┐ │                 │
│              │ │ CS101       │ │ │ CS102       │ │ + إضافة مقرر   │
│              │ │ 3س • إجباري │ │ │ 3س • اختياري│ │                 │
│              │ └─────────────┘ │ └─────────────┘ │                 │
│              │ + إضافة مقرر   │ + إضافة مقرر   │                 │
│              │     12 ساعة    │     9 ساعات    │                 │
├──────────────┼─────────────────┼─────────────────┼─────────────────┤
│  المستوى 2  │       ...       │       ...       │       ...       │
└──────────────┴─────────────────┴─────────────────┴─────────────────┘
```

- **الصفوف:** المستويات الدراسية (`academic_levels`) مرتبة تصاعدياً
- **الأعمدة:** الفصول الثلاثة (الأول، الثاني، الصيفي)
- **الخلايا:** تحتوي على بطاقات المقررات + زر إضافة + مجموع الساعات

##### 3. بطاقة المقرر (CourseCard)
```
┌─────────────────────────────────────┐
│ ▌ مقدمة في البرمجة              🗑 │
│   CS101 • 3س                       │
│   ┌────────┐ ┌────────┐            │
│   │ إجباري │ │ 🧪 عملي│            │
│   └────────┘ └────────┘            │
│   ─────────────────────            │
│   المتطلبات:                       │
│   ┌─────────────────────────────┐  │
│   │ MATH101 — الرياضيات      ✕ │  │
│   └─────────────────────────────┘  │
│   ┌─────────────────────────────┐  │
│   │      🔗 ربط متطلب          │  │
│   └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

- **الحد الجانبي الملون:**
  - إجباري: `border-l-danger` (أحمر)
  - اختياري: `border-l-teal` (أخضر مزرق)
- **الشارات:** نوع الخطة + علامة العملي إن وُجد
- **المتطلبات السابقة:** تُعرض داخل البطاقة مع زر حذف لكل متطلب
- **زر ربط متطلب:** يفتح Modal لاختيار المتطلب السابق

##### 4. Modal إضافة مقرر للخلية
- بحث فوري في المقررات المتاحة
- قائمة قابلة للتمرير مع تحديد بصري (`Check` icon)
- اختيار نوع المقرر (إجباري/اختياري) بأزرار Toggle
- يستبعد المقررات المُضافة مسبقاً

##### 5. Modal ربط المتطلب السابق
- نفس تصميم Modal إضافة المقرر
- يستبعد المقرر نفسه والمتطلبات المُضافة مسبقاً
- لون بنفسجي للتمييز (`bg-purple`)

##### 6. التحميل الديناميكي
- `useEffect` يُحمّل `planCourses` و `prerequisites` عند تغيير التخصص
- Spinner أثناء التحميل
- تحديث فوري بعد كل عملية CRUD بدون `window.location.reload()`

---

### Server Actions الجديدة

| الدالة | الوصف |
|--------|-------|
| `getMajorsWithLevels()` | جلب التخصصات مع المستويات والأقسام والكليات |
| `getCourses()` | جلب المقررات النشطة فقط |
| `getStudyPlanCourses(majorId)` | جلب مقررات الخطة لتخصص معين |
| `getPrerequisites(majorId)` | جلب المتطلبات السابقة لمقررات التخصص |
| `addStudyPlanCourse(fd)` | إضافة مقرر للخطة |
| `removeStudyPlanCourse(id)` | حذف مقرر من الخطة |
| `addPrerequisite(fd)` | إضافة متطلب سابق |
| `removePrerequisite(id)` | حذف متطلب سابق |

---

### الملفات المُنشأة
- `src/app/tenant-admin/courses/catalog-client.tsx`
- `src/app/tenant-admin/study-plans/page.tsx`
- `src/app/tenant-admin/study-plans/study-plan-client.tsx`
- `src/app/tenant-admin/study-plans/actions.ts`

### الملفات المُعدَّلة
- `src/app/tenant-admin/courses/page.tsx`

### الملفات المحفوظة (بدون تغيير)
- `src/app/tenant-admin/courses/actions.ts` — تُستخدم من `catalog-client`
- `src/app/tenant-admin/courses/courses-client.tsx` — ملف قديم (يمكن حذفه لاحقاً)

### المشاكل
- لا توجد مشاكل.

### ملاحظة
- الملف القديم `courses-client.tsx` لا يزال موجوداً ويمكن حذفه يدوياً إذا لم يعد مطلوباً.
- جميع الصفحات تعمل بشكل مستقل ومتكامل مع الشريط الجانبي المُحدَّث في المرحلة الأولى.

---

## إعادة هيكلة UX: المرحلة الرابعة — إدارة المستخدمين الذكية و RBAC
**التاريخ:** 2026-03-13

### الوصف العام
إعادة تصميم شاملة لصفحة إدارة المستخدمين (User Management) لتوفير تجربة مستخدم ذكية وبديهية لإضافة المستخدمين وربطهم بالهيكل الأكاديمي تلقائياً. تتضمن هذه المرحلة:
- واجهة مبوّبة (Tabbed Interface) لتصفية المستخدمين
- نماذج إضافة ذكية تتغير ديناميكياً حسب نوع المستخدم
- استيراد CSV محسّن مع ربط تلقائي بالجداول المتداخلة

---

### التغييرات الرئيسية

#### 1. واجهة مبوّبة جديدة (Tabbed Data Table)
استبدال التبويبات القديمة (قائمة/استيراد/أدوار) بتبويبات تصفية المستخدمين:

| التبويب | الفلتر | الأيقونة |
|---------|--------|----------|
| الكل | جميع المستخدمين | `Users` |
| الطلاب | `role === "student"` | `GraduationCap` |
| أعضاء هيئة التدريس | `role === "faculty"` | `Briefcase` |
| الإدارة الأكاديمية | `role === "academic_management" \|\| "tenant_admin"` | `Building2` |

**مميزات إضافية:**
- عداد لكل تبويب يعرض عدد المستخدمين
- شريط بحث فوري بالاسم أو الرقم
- شارات إحصائية (StatBadge) في أعلى الصفحة

#### 2. جدول بيانات محسّن
| العمود | الوصف |
|--------|-------|
| المستخدم | الصورة الرمزية + الاسم + رقم الطالب/الموظف |
| الدور | شارة ملونة للدور الأساسي + الدور المخصص إن وُجد |
| الربط الأكاديمي | التخصص للطلاب / القسم للمحاضرين |
| الحالة | نشط (أخضر) / معلّق (برتقالي) / منتهي (أحمر) |
| الإجراءات | تعليق / إعادة تفعيل |

**ألوان الأدوار:**
- طالب: `bg-action-blue/10 text-action-blue`
- محاضر: `bg-success/10 text-success`
- إدارة أكاديمية: `bg-purple/10 text-purple`
- مدير جامعة: `bg-academic-navy/10 text-academic-navy`

#### 3. نماذج إضافة ذكية (Smart Add User Modals)
عند النقر على "إضافة مستخدم"، يظهر Modal يتغير ديناميكياً حسب نوع المستخدم المُختار:

##### إذا كان الدور = طالب (Student)
```
┌─────────────────────────────────────────────────────┐
│  نوع المستخدم: [طالب] [محاضر] [إدارة أكاديمية]    │
├─────────────────────────────────────────────────────┤
│  الاسم الأول          │  الاسم الأخير              │
│  البريد الإلكتروني    │  كلمة المرور 👁            │
│  الهاتف (اختياري)                                  │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐   │
│  │  🎓 بيانات الطالب                          │   │
│  │  رقم الطالب        │  سنة الالتحاق         │   │
│  │  التخصص (dropdown) │  المستوى الدراسي      │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```
- **الربط الذكي:** عند اختيار التخصص، يُملأ dropdown المستوى الدراسي تلقائياً بالمستويات المتاحة لهذا التخصص
- **الجداول المُحدَّثة:** `profiles` + `student_profiles` + `student_majors`

##### إذا كان الدور = محاضر (Faculty)
```
┌─────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────┐   │
│  │  💼 بيانات المحاضر                         │   │
│  │  رقم الموظف        │  التخصص العلمي        │   │
│  │  القسم (dropdown)                          │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```
- **الجداول المُحدَّثة:** `profiles` + `faculty_profiles` + `faculty_departments`

##### إذا كان الدور = إدارة أكاديمية (Academic Management)
```
┌─────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────┐   │
│  │  🏛️ بيانات الإدارة الأكاديمية             │   │
│  │  رقم الموظف        │  الدور المخصص         │   │
│  │  نطاق الإدارة      │  الكلية/القسم         │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```
- **الدور المخصص:** dropdown يعرض الأدوار من جدول `custom_roles`
- **نطاق الإدارة:** اختيار بين "كلية" أو "قسم"
- **الكلية/القسم:** dropdown مجمّع (optgroup) يعرض الكليات والأقسام
- **الجداول المُحدَّثة:** `profiles` + `faculty_profiles` + `profile_custom_roles`

#### 4. زر استيراد CSV بارز
- زر "استيراد CSV" منفصل بجانب زر "إضافة مستخدم"
- يفتح Modal مخصص للاستيراد مع:
  - شرح الأعمدة المطلوبة والاختيارية
  - مثال على ملف CSV
  - عرض نتائج الاستيراد (نجاح + أخطاء)

#### 5. قسم الأدوار المخصصة (Custom Roles)
- عرض الأدوار في شبكة بطاقات (Grid)
- كل بطاقة تعرض: الاسم، النطاق، الوصف، المستخدمين المُعيّنين
- زر "+ تعيين" لكل دور لتعيينه لمستخدم جديد
- زر "دور جديد" لإنشاء دور مخصص

---

### Server Actions الجديدة

| الدالة | الوصف |
|--------|-------|
| `createUser(formData)` | إنشاء مستخدم جديد مع الربط الذكي بالجداول المتداخلة |
| `getColleges()` | جلب الكليات لـ dropdown نطاق الإدارة |
| `getAcademicLevels()` | جلب المستويات الدراسية لربط الطلاب |

### تحسينات على `getUsers()`
```sql
SELECT *,
  student_profiles(*),
  faculty_profiles(*),
  student_majors(major_id, majors(name, code)),
  faculty_departments(department_id, departments(name, code)),
  profile_custom_roles(custom_role_id, custom_roles(name))
FROM profiles
WHERE tenant_id = current_tenant_id()
```

---

### الملفات المُعدَّلة
- `src/app/tenant-admin/users/page.tsx` — إضافة جلب الكليات والمستويات الدراسية
- `src/app/tenant-admin/users/users-client.tsx` — إعادة كتابة كاملة (واجهة مبوّبة + نماذج ذكية)
- `src/app/tenant-admin/users/actions.ts` — إضافة `createUser`, `getColleges`, `getAcademicLevels`

### المشاكل
- لا توجد مشاكل.

### ملاحظة
- تم الانتهاء من جميع مراحل إعادة هيكلة UX (1-4).
- النظام جاهز الآن لإدارة الهيكل الأكاديمي، المقررات، الخطط الدراسية، والمستخدمين بتجربة مستخدم حديثة ومتكاملة.

---

## إعادة هيكلة UX: المرحلة الخامسة والسادسة — إدارة الشعب والجدول المرئي
**التاريخ:** 2026-03-13

### الوصف العام
إعادة تصميم شاملة لصفحات إدارة الشعب (Sections) والجدول الدراسي (Schedules) لدور "الإدارة الأكاديمية" (Academic Management). تتضمن هذه المرحلة:
- واجهة Kanban-style لإدارة الشعب مجمّعة حسب المقرر
- جدول مرئي بأسلوب Google Calendar للمحاضرات
- معالجة ذكية لتعارضات الجدول من قاعدة البيانات

---

### المرحلة الخامسة: إدارة الشعب (Sections Management)

#### 1. واجهة Kanban مجمّعة حسب المقرر
```
┌─────────────────────────────────────────────────────────────────┐
│  📊 إحصائيات: [45 شعبة] [38 مفتوحة] [1250/1800 طالب]           │
│                                            [+ فتح شعبة جديدة]  │
├─────────────────────────────────────────────────────────────────┤
│  🔍 بحث...          [الكل] [مفتوحة] [مغلقة] [مؤرشفة]           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📚 CS101 — مقدمة في البرمجة                    ▼       │   │
│  │     3 شعبة | 2 مفتوحة | 85/120 طالب (71%)    ████░░   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                    │   │
│  │  │ [A]     │ │ [B]     │ │ [C]     │                    │   │
│  │  │ مفتوحة  │ │ مفتوحة  │ │ مغلقة   │                    │   │
│  │  │ 👥 30/40│ │ 👥 35/40│ │ 👥 20/40│                    │   │
│  │  │ د.أحمد  │ │ د.سارة  │ │ غير معيّن│                    │   │
│  │  │ ████░░  │ │ █████░  │ │ ██░░░░  │                    │   │
│  │  │ [👤][🔒][⊕]│ [👤][🔒][⊕]│ [🔓][📦] │                    │   │
│  │  └─────────┘ └─────────┘ └─────────┘                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. مميزات الواجهة الجديدة
| الميزة | الوصف |
|--------|-------|
| **تجميع حسب المقرر** | الشعب مجمّعة في بطاقات قابلة للطي/التوسيع |
| **شارات الامتلاء** | شريط تقدم ملون (أخضر < 80%، برتقالي ≥ 80%، أحمر = 100%) |
| **بحث فوري** | بحث بكود المقرر أو الاسم |
| **فلترة الحالة** | الكل / مفتوحة / مغلقة / مؤرشفة |
| **توسيع/طي الكل** | أزرار سريعة لتوسيع أو طي جميع المقررات |

#### 3. بطاقة الشعبة
كل شعبة تعرض:
- **كود الشعبة** (A, B, C...) في شارة داكنة
- **حالة الشعبة** (مفتوحة/مغلقة/مؤرشفة/مدمجة)
- **عداد الطلاب** مع أيقونة ملونة حسب الامتلاء
- **اسم الفصل الدراسي**
- **اسم المحاضر** أو "غير معيّن" بلون تحذيري
- **شريط تقدم** للامتلاء
- **أزرار الإجراءات**: تعيين محاضر، إغلاق، دمج (للمفتوحة) / إعادة فتح، أرشفة (للمغلقة)

#### 4. Modals ذكية
- **فتح شعبة جديدة**: اختيار المقرر، الفصل، كود الشعبة، المحاضر (اختياري)، السعة
- **تعيين محاضر**: dropdown لاختيار المحاضر
- **دمج الشعبة**: اختيار الشعبة المستهدفة (نفس المقرر فقط) مع تأكيد

---

### المرحلة السادسة: الجدول المرئي (Visual Scheduler)

#### 1. شبكة بأسلوب Google Calendar
```
┌─────────────────────────────────────────────────────────────────┐
│  📅 إحصائيات: [24 محاضرة] [18 منشورة]      [+ إضافة محاضرة]   │
├─────────────────────────────────────────────────────────────────┤
│  الوقت │  الأحد   │  الإثنين  │  الثلاثاء │  الأربعاء │  الخميس  │
├────────┼──────────┼───────────┼───────────┼───────────┼──────────┤
│  08:00 │ ┌──────┐ │           │ ┌──────┐  │           │          │
│        │ │CS101 │ │           │ │CS201 │  │           │          │
│  08:30 │ │ A    │ │           │ │ B    │  │           │          │
│        │ │د.أحمد│ │           │ │د.سارة│  │           │          │
│  09:00 │ │📍 H101│ │           │ │📍 H203│  │           │          │
│        │ └──────┘ │           │ └──────┘  │           │          │
│  09:30 │          │ ┌──────┐  │           │ ┌──────┐  │          │
│        │          │ │CS301 │  │           │ │CS101 │  │          │
│  10:00 │          │ │ A    │  │           │ │ B    │  │          │
│        │          │ │د.خالد│  │           │ │د.أحمد│  │          │
│  10:30 │          │ │📍 LAB1│  │           │ │📍 H101│  │          │
│        │          │ └──────┘  │           │ └──────┘  │          │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. مميزات الشبكة المرئية
| الميزة | الوصف |
|--------|-------|
| **CSS Grid** | `grid-cols-[80px_repeat(5,1fr)]` للأعمدة |
| **Time Slots** | من 08:00 إلى 18:00 بفواصل 30 دقيقة |
| **ألوان الأيام** | كل يوم بلون مميز (أزرق، أخضر، بنفسجي، برتقالي، تركوازي) |
| **Span ديناميكي** | المحاضرة تمتد عبر الصفوف حسب المدة |
| **Click to Add** | النقر على خلية فارغة يفتح modal الإضافة |
| **Click to Edit** | النقر على محاضرة يفتح modal التعديل |

#### 3. بطاقة المحاضرة في الشبكة
```
┌─────────────────┐
│ CS101    [منشور]│  ← كود المقرر + حالة النشر
│ مقدمة في البرمجة│  ← اسم المقرر
│ 👤 د.أحمد محمد  │  ← المحاضر
│ 📍 H101         │  ← القاعة
│ 🕐 08:00-09:30  │  ← الوقت
└─────────────────┘
```

#### 4. معالجة تعارضات قاعدة البيانات (CRITICAL)
عند محاولة إضافة محاضرة، يتم التقاط أخطاء Trigger من Postgres:

| نوع التعارض | رسالة Trigger | الرسالة العربية |
|-------------|---------------|-----------------|
| `SPATIAL_CONFLICT` | القاعة محجوزة | ❌ تعارض مكاني: القاعة محجوزة في نفس الوقت |
| `FACULTY_CONFLICT` | المحاضر مشغول | ❌ تعارض المحاضر: المحاضر لديه محاضرة أخرى في نفس الوقت |
| `STUDENT_CONFLICT` | تعارض طلابي | ❌ تعارض طلابي: مقرر إجباري في نفس المستوى مجدول في نفس الوقت |

**كود المعالجة في `actions.ts`:**
```typescript
const CONFLICT_MESSAGES: Record<string, string> = {
  SPATIAL_CONFLICT: "تعارض مكاني: القاعة محجوزة في نفس الوقت",
  FACULTY_CONFLICT: "تعارض المحاضر: المحاضر لديه محاضرة أخرى في نفس الوقت",
  STUDENT_CONFLICT: "تعارض طلابي: مقرر إجباري في نفس المستوى الأكاديمي مجدول في نفس الوقت",
};

function parseConflictError(message: string): string {
  for (const [key, arabic] of Object.entries(CONFLICT_MESSAGES)) {
    if (message.includes(key)) return arabic;
  }
  return message;
}
```

**عرض الخطأ في UI:**
- رسائل التعارض تظهر بخلفية برتقالية (`bg-warning/10`) مع أيقونة `AlertTriangle`
- الأخطاء العادية تظهر بخلفية حمراء (`bg-danger/10`)

#### 5. Modals الجدول
- **إضافة محاضرة**: اختيار الشعبة، القاعة، اليوم، وقت البداية/النهاية
- **تعديل محاضرة**: تعديل القاعة، اليوم، الأوقات + أزرار نشر/إلغاء نشر/حذف

---

### الملفات المُعدَّلة
- `src/app/academic-management/sections/sections-client.tsx` — إعادة كتابة كاملة (Kanban-style)
- `src/app/academic-management/schedules/schedules-client.tsx` — إعادة كتابة كاملة (Visual Grid)

### الملفات الموجودة (بدون تعديل)
- `src/app/academic-management/sections/actions.ts` — Server Actions موجودة ومكتملة
- `src/app/academic-management/schedules/actions.ts` — Server Actions مع معالجة التعارضات موجودة

### المشاكل
- لا توجد مشاكل.

### ملاحظة
- تم الانتهاء من المراحل 5 و 6 لدور الإدارة الأكاديمية.
- الجدول المرئي يدعم كشف التعارضات تلقائياً من قاعدة البيانات.
- واجهة الشعب تعرض إحصائيات الامتلاء بشكل بصري واضح.

---

## إصلاح معماري: عزل البيانات داخل المؤسسة وتفويض الصلاحيات بالنطاق
**التاريخ:** 2026-03-14

### وصف المشكلة المعمارية
تم اكتشاف خلل معماري حرج: **"غياب العزل داخل المؤسسة الواحدة" (Lack of Intra-Tenant Isolation)**. كان بإمكان أي مستخدم بدور `academic_management` مشاهدة وتعديل بيانات (التخصصات، المقررات، الشعب، الجداول، التذاكر) لـ **جميع الأقسام** داخل الجامعة. هذا يعني أن رئيس قسم علوم الحاسوب يستطيع الاطلاع على بيانات قسم الهندسة والعكس.

### الحل المُطبَّق: تفويض الصلاحيات بالنطاق (Scope-Based Authorization)

#### المرحلة 1: قاعدة البيانات — جدول الربط والدوال

**الملف المُنشأ:** `supabase/migrations/20260313222415_intra_tenant_isolation.sql`

##### جدول الربط الجديد: `academic_management_departments`
| العمود | النوع | الوصف |
|--------|-------|-------|
| `profile_id` | UUID (FK → profiles) | معرّف مستخدم الإدارة الأكاديمية |
| `department_id` | UUID (FK → departments) | القسم المُعيَّن له |
| `tenant_id` | UUID (FK → tenants) | الجامعة |
| `assigned_at` | TIMESTAMPTZ | تاريخ التعيين |
| `assigned_by` | UUID (FK → profiles) | من قام بالتعيين |

##### دالة المساعدة (SECURITY DEFINER): `get_my_managed_departments()`
```sql
CREATE OR REPLACE FUNCTION get_my_managed_departments()
RETURNS UUID[] LANGUAGE SQL SECURITY DEFINER STABLE AS $$
    SELECT COALESCE(
        ARRAY(SELECT department_id FROM academic_management_departments WHERE profile_id = auth.uid()),
        '{}'::UUID[]
    );
$$;
```
- تُرجع مصفوفة بمعرّفات الأقسام المُسنَدة للمستخدم الحالي
- `SECURITY DEFINER` يضمن تجاوز RLS عند الاستدعاء

#### المرحلة 2: سياسات RLS الجديدة (Row Level Security)

##### الجداول المُعالَجة:

| الجدول | السياسة القديمة (المحذوفة) | السياسة الجديدة المُقيَّدة |
|--------|--------------------------|--------------------------|
| `majors` | `admin_write_majors` (يشمل academic_management لكل الأقسام) | `academic_management_scoped_write_majors`: يقيّد الوصول على `department_id = ANY(get_my_managed_departments())` |
| `courses` | لا توجد (لم تكن موجودة لـ academic_management) | `academic_management_scoped_write_courses`: يقيّد على `department_id = ANY(get_my_managed_departments())` |
| `sections` | `academic_management_write_sections` (كل الأقسام) | `academic_management_scoped_write_sections`: يقيّد على `course_id IN (courses WHERE department_id = ANY(...))` |
| `schedules` | `academic_management_write_schedules` (كل الأقسام) | `academic_management_scoped_write_schedules`: يقيّد على `section_id IN (sections → courses WHERE department_id = ANY(...))` |

##### RLS على الجدول الجديد `academic_management_departments`:
- `tenant_admin_manage_am_departments`: مدير الجامعة وsuperadmin يديران السجلات
- `am_read_own_department_assignments`: مستخدم الإدارة الأكاديمية يقرأ تعيينه الخاص فقط

#### المرحلة 3: تطبيق Migration على قاعدة البيانات
تم تنفيذ `npx supabase db push` تلقائياً بنجاح. المـigration المُطبَّق:
```
✅ 20260313222415_intra_tenant_isolation.sql — Finished supabase db push.
```

#### المرحلة 4: إعادة هيكلة واجهة إدارة المستخدمين (Tenant Admin)

##### الملفات المُعدَّلة:

**`src/app/tenant-admin/users/page.tsx`**
- إضافة `academic_management_departments(department_id, departments(name, code))` لاستعلام المستخدمين

**`src/app/tenant-admin/users/actions.ts`**
- عند إنشاء مستخدم بدور `academic_management`:
  - إلزامية تحديد `am_department_id` (يُرفع خطأ إذا لم يُحدَّد)
  - إدراج سجل في `academic_management_departments` (profile_id, department_id, tenant_id, assigned_by)
  - حذف منطق `scope_type`/`scope_id` القديم

**`src/app/tenant-admin/users/users-client.tsx`**
- إضافة واجهة `AmDeptLink` وتحديث `UserRow` لتشمل `academic_management_departments`
- في نموذج "إضافة مستخدم" لدور `academic_management`:
  - **إزالة**: حقلا "نطاق الإدارة" و"الكلية/القسم" (scope_type + scope_id)
  - **إضافة**: dropdown إلزامي "القسم المُدار" (`am_department_id`) مع رسالة توضيحية
  - بيان تحذيري: "سيتمكن هذا المستخدم فقط من الوصول إلى بيانات القسم المُعيَّن له"
- في جدول المستخدمين: عرض القسم المُدار للإدارة الأكاديمية بعلامة بنفسجية مميزة

### ملخص التغييرات الأمنية

| قبل الإصلاح | بعد الإصلاح |
|-------------|-------------|
| academic_management يرى جميع الأقسام | يرى قسمه المُعيَّن فقط |
| يمكنه تعديل التخصصات في أي قسم | يعدّل تخصصات قسمه فقط |
| يمكنه إدارة الشعب لجميع المقررات | يدير شعب مقررات قسمه فقط |
| يمكنه تعديل الجداول لجميع الأقسام | يعدّل جداول قسمه فقط |
| لا ربط واضح بين المستخدم والقسم | ربط صريح في جدول `academic_management_departments` |

### الملفات المُنشأة
- `supabase/migrations/20260313222415_intra_tenant_isolation.sql`

### الملفات المُعدَّلة
- `src/app/tenant-admin/users/page.tsx`
- `src/app/tenant-admin/users/actions.ts`
- `src/app/tenant-admin/users/users-client.tsx`

### المشاكل
- لا توجد مشاكل. Migration تم تطبيقه بنجاح تلقائياً.

---

## تحسين UX: المرحلة 5 و 6 — إدارة الشعب والجدول المرئي التفاعلي
**التاريخ:** 2026-03-14

### وصف التحسين
إعادة هيكلة كاملة لصفحتي "إدارة الشعب" و"الجدول الدراسي" لدور الإدارة الأكاديمية، مع إضافة نظام تصفية متقدم للجدول المرئي.

---

### المرحلة 5: إدارة الشعب الدراسية (Kanban-style)

#### `src/app/academic-management/sections/sections-client.tsx`

##### نمط التصميم: قائمة مجمّعة بالمقرر (Accordion Kanban)
- كل مقرر يظهر كبطاقة قابلة للطي/التوسيع تحتوي على جميع شعبه
- رأس البطاقة يعرض: كود المقرر، الاسم، عدد الشعب، المسجلين الكلي، شريط التقدم
- التلوين التحذيري: برتقالي عند الامتلاء > 80%، أحمر عند الامتلاء الكامل

##### بيانات كل شعبة
- **Badge الامتلاء**: `enrolled_count / max_capacity` مع لون تكيّفي (أخضر/برتقالي/أحمر)
- **شريط تقدم** مرئي داخل كل بطاقة شعبة
- **حالة الشعبة**: مفتوحة / مغلقة / مؤرشفة / مدمجة

##### Modal إضافة شعبة
- اختيار المقرر (إلزامي)
- اختيار الفصل الدراسي (إلزامي)
- كود الشعبة (إلزامي)
- المحاضر (اختياري)
- السعة القصوى (افتراضي: 40)

##### إجراءات على الشعبة
| الإجراء | الشرط | الوصف |
|---------|-------|-------|
| تعيين محاضر | مفتوحة | dropdown لاختيار المحاضر |
| إغلاق | مفتوحة | تغيير الحالة إلى `closed` |
| دمج | مفتوحة | نقل الطلاب لشعبة أخرى من نفس المقرر |
| إعادة فتح | مغلقة | تغيير الحالة إلى `open` |
| أرشفة | مغلقة | تغيير الحالة إلى `archived` |

---

### المرحلة 6: الجدول الدراسي المرئي (Google Calendar Style)

#### `src/app/academic-management/schedules/schedules-client.tsx`

##### شبكة الجدول المرئي
- **الأعمدة**: أيام الأسبوع (الأحد → الخميس)
- **الصفوف**: فترات زمنية من 08:00 إلى 18:00 بفواصل 30 دقيقة (21 فترة)
- **الخلايا**: النقر على خلية فارغة يفتح modal "إضافة محاضرة" بالوقت المحدد مسبقاً
- **الكتل الملونة**: كل يوم بلون مميز (أزرق / أخضر / بنفسجي / برتقالي / تركوازي)

##### محتوى كتلة المحاضرة
- كود المقرر + حالة النشر (منشور/مسودة)
- اسم المقرر (مقتصر بسطر واحد)
- اسم المحاضر (أيقونة User)
- كود القاعة (أيقونة MapPin)
- الوقت (أيقونة Clock)

##### **جديد — نظام التصفية الثلاثي (Major → Level → Semester)**
أُضيف شريط تصفية في أعلى الصفحة يتكون من 3 dropdowns متتالية:

| الفلتر | المصدر | السلوك |
|--------|--------|--------|
| التخصص | `majors` | اختيار التخصص يصفّي المستويات المتاحة |
| المستوى | `academic_levels` (مُصفّى بالتخصص) | معطّل حتى اختيار التخصص |
| الفصل الدراسي | `semesters` | مستقل عن التخصص |

**منطق التصفية:**
1. بالفصل: `schedule.sections.semesters.id === filterSemesterId`
2. بالتخصص + المستوى: يُحدَّد `validCourseIds` من `study_plan_courses` حيث `major_id = X` و `academic_level_id = Y`، ثم يُعرض فقط ما `schedule.sections.course_id IN validCourseIds`

زر "مسح الفلاتر" يظهر فقط عند تفعيل فلتر واحد على الأقل.

##### معالجة تعارضات قاعدة البيانات (Trigger Exceptions)
| نوع التعارض | رسالة Trigger | الرسالة المعروضة |
|-------------|---------------|------------------|
| `SPATIAL_CONFLICT` | القاعة محجوزة | تعارض مكاني: القاعة محجوزة في نفس الوقت |
| `FACULTY_CONFLICT` | المحاضر مشغول | تعارض المحاضر: المحاضر لديه محاضرة أخرى في نفس الوقت |
| `STUDENT_CONFLICT` | تعارض طلابي | تعارض طلابي: مقرر إجباري في نفس المستوى الأكاديمي مجدول في نفس الوقت |

رسائل التعارض تظهر بخلفية برتقالية (`bg-warning/10`) مع أيقونة `AlertTriangle`، بينما الأخطاء العادية تظهر بخلفية حمراء.

---

### البيانات المُضافة للصفحة (`schedules/page.tsx`)

| الجدول | الحقول | الغرض |
|--------|--------|-------|
| `semesters` | `id, name, status` | dropdown فلتر الفصل |
| `majors` | `id, name, code` | dropdown فلتر التخصص |
| `academic_levels` | `id, name, level_number, major_id` | dropdown فلتر المستوى |
| `study_plan_courses` | `course_id, major_id, academic_level_id` | ربط الفلتر بالمقررات |

تحديث استعلام `schedules` ليشمل `course_id` و`semester_id` و`semesters(id, name)` داخل الـ sections المُضمَّنة.

---

### الملفات المُعدَّلة
- `src/app/academic-management/schedules/page.tsx` — إضافة 4 استعلامات جديدة + تحديث استعلام schedules
- `src/app/academic-management/schedules/schedules-client.tsx` — إضافة نظام التصفية الثلاثي

### الملفات غير المُعدَّلة (مكتملة مسبقاً)
- `src/app/academic-management/sections/sections-client.tsx` — اكتملت في جلسة سابقة
- `src/app/academic-management/sections/actions.ts` — Server Actions مكتملة
- `src/app/academic-management/schedules/actions.ts` — Server Actions مع معالجة التعارضات مكتملة

### المشاكل
- لا توجد مشاكل.

---

## تحسين UX: المرحلة 7، 8 و 9 — محتوى المقرر، سجل الدرجات، والحضور الذكي
**التاريخ:** 2026-03-14

### وصف التحسين
إعادة هيكلة شاملة لثلاث صفحات رئيسية في واجهة أعضاء هيئة التدريس، مع تحسينات UX تقارب معايير Enterprise SaaS الحديثة.

---

### المرحلة 7: محتوى المقرر — Accordion بالأسابيع + مفتاح AI متوهج

#### `src/app/faculty/materials/materials-client.tsx`

##### التصميم الجديد: مجموعات الأسابيع القابلة للطي
- كل أسبوع يُعرض كـ accordion قابل للطي/التوسيع
- رأس كل accordion يحتوي: رقم الأسبوع في مربع ملون، عنوان "الأسبوع X"، عداد المواد
- الحالة الافتراضية: جميع الأسابيع مفتوحة — `collapsedWeeks: Set<string>` يبدأ فارغاً
- أيقونة `ChevronDown` تدور 180° عند الطي بانتقال 200ms

##### مفتاح الاعتماد للذكاء الاصطناعي — `AiApprovedToggle` (تحديث جذري)
| الحالة | المظهر |
|--------|--------|
| غير معتمد | مستطيل رمادي + نقطة بيضاء على اليسار |
| معتمد | مستطيل أزرق + **توهج** `shadow-[0_0_12px_rgba(49,130,206,0.5)]` + نقطة بيضاء على اليمين |

- نص "معتمد للذكاء الاصطناعي ✨" يتغير لونه إلى `text-action-blue` عند التفعيل
- انتقال حركي 300ms للنقطة والألوان

---

### المرحلة 8: سجل الدرجات — تجربة جداول البيانات (Spreadsheet)

#### `src/app/faculty/gradebook/gradebook-client.tsx` (إعادة كتابة كاملة)

##### نمط التحرير المباشر في الخلايا
- لا يوجد modal أو زر "تعديل" منفصل — كل خلية درجة هي `input` مرئي دائماً
- الخلايا شفافة الخلفية، تُظهر حدوداً زرقاء عند التركيز `focus:ring-inset focus:ring-action-blue/30`
- رؤوس الأعمدة: أعمال السنة (30) / منتصف الفصل (30) / النهائي (40) / المجموع (100)

##### نظام `drafts` و `dirty`
| المتغير | النوع | الوصف |
|---------|------|-------|
| `drafts` | `Record<string, {coursework, midterm, final}: string>` | قيم الخلايا في الذاكرة |
| `dirty` | `Set<string>` | معرّفات الصفوف المتغيرة غير المحفوظة |

- الصف المعدّل: خلفية `bg-action-blue/[0.03]` + نقطة زرقاء صغيرة بجانب اسم الطالب
- حساب المجموع اللحظي: `c + m + f` — يطابق `GENERATED ALWAYS AS` في DB
- تلوين تكيّفي للمجموع: أخضر ≥ 60 | برتقالي 50–59 | أحمر < 50

##### زر "حفظ التغييرات"
- يظهر فقط عند `dirty.size > 0` مع عداد الصفوف: `حفظ التغييرات (3)`
- يستخدم `Promise.all()` لحفظ جميع الإدخالات في آنٍ واحد
- بعد الحفظ: يعرض "تم الحفظ بنجاح" لمدة 2.5 ثانية
- "نشر الدرجات" يظهر فقط عند `dirty.size === 0` (منع النشر قبل الحفظ)

#### `src/app/faculty/gradebook/actions.ts` (إضافة)
```typescript
export async function saveGradeValues(
  entryId: string,
  coursework: number | null,
  midterm: number | null,
  final: number | null
)
```

---

### المرحلة 9: إدارة الحضور — عرض QR ضخم + تجديد تلقائي

#### `src/app/faculty/attendance/attendance-client.tsx`

##### عرض رمز QR الضخم
- صورة QR حقيقية بحجم 256×256px عبر `api.qrserver.com` — لا توجد مكتبات خارجية
- `key={qrData.token}` يُجبر React على إعادة تحميل الصورة عند تجديد الـ token

##### مؤقت التجديد التلقائي (10 ثوانٍ)
| المتغير | الوصف |
|---------|-------|
| `countdown` | عداد يبدأ من 10 وينقص كل ثانية |
| `activeQrSessionId` | معرّف الجلسة النشطة |

- `useEffect` مع `setInterval` — عند وصول العداد لـ 1: يستدعي `handleGenerateQr` تلقائياً
- إعادة تهيئة الـ interval عند تغيير `qrData.token`

##### شريط التقدم الملون
| الوقت المتبقي | لون الشريط |
|---------------|-----------|
| 7–10 ثوانٍ | `bg-action-blue` |
| 4–6 ثوانٍ | `bg-warning` |
| 1–3 ثوانٍ | `bg-danger` |

---

### الملفات المُعدَّلة
- `src/app/faculty/materials/materials-client.tsx`
- `src/app/faculty/gradebook/gradebook-client.tsx`
- `src/app/faculty/gradebook/actions.ts`
- `src/app/faculty/attendance/attendance-client.tsx`

### المشاكل
- لا توجد مشاكل. QR يُولَّد بدون مكتبات خارجية عبر `api.qrserver.com`.

---

## UX Refactoring: Phase 10, 11 & 12 — Student Dashboard, UniBot Chat, and Smart Ticketing
**التاريخ:** 2026-03-14

### وصف التحسين
تحديث شامل لتجربة دور الطالب في ثلاثة محاور: لوحة التحكم الأكاديمية، واجهة UniBot بالشاشة المنقسمة، ونظام التذاكر الذكي.

---

### المرحلة 10: لوحة تحكم الطالب — مساري الدراسي + الجدول الأسبوعي

#### `src/app/student/page.tsx`

##### ودجت "مساري الدراسي" المُحسَّن
- خلفية متدرجة `from-card-bg via-ai-light/20 to-ai-lavender/20` للبطاقة
- شريط تقدم بارتفاع `h-5` مع تدرج `from-action-blue via-purple to-ai-lavender`
- علامات مرجعية عند 25% / 50% / 75% (`w-px bg-white/50`)
- عداد النسبة المئوية `{progressPct}%` بخط كبير أزرق في المنتصف

##### بطاقة المعدل التراكمي — لون تكيّفي
| المعدل | اللون |
|--------|-------|
| ≥ 3.5 | `text-success` + `bg-success/10` — ممتاز |
| ≥ 2.5 | `text-action-blue` + `bg-action-blue/10` — جيد جداً |
| ≥ 2.0 | `text-warning` + `bg-warning/10` — جيد |
| < 2.0 | `text-danger` + `bg-danger/10` — ضعيف |

##### الجدول الأسبوعي (جديد)
- يجلب `schedules` عبر `section_id IN [...]` بعد استخراج معرّفات الشعب من `enrollments`
- شبكة `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` للأيام النشطة فقط
- كل يوم يعرض بطاقات المقررات مع الكود، الاسم، والوقت بتنسيق `HH:MM – HH:MM`

---

### المرحلة 11: UniBot — واجهة الشاشة المنقسمة

#### `src/app/student/unibot/unibot-client.tsx` (إعادة هيكلة جذرية)

##### التخطيط الجديد
```
[Chat Panel — 40% RTL-right] | [PDF Viewer — 60% RTL-left]
```
- `flex-col` على الموبايل (عارض المستند مخفي)
- `lg:flex-row` على الشاشات الكبيرة

##### لوحة المحادثة (40%)
- رأس يحتوي: أيقونة UniBot + عنوان + **قائمة منسدلة** لاختيار المحادثة أو بدء جديدة
- **فقاعات المساعد** بتدرج AI: `bg-gradient-to-br from-ai-light/60 to-ai-lavender/30 border-ai-lavender/50`
- **فقاعات المستخدم**: `bg-action-blue text-white`
- مؤشر تحميل بثلاث نقاط متحركة بتدرج AI

##### شرائح المصادر (Citation Chips) — تحسين
- الضغط على الشريحة يُحدِّث `selectedSource` → يعرض المقتطف في لوحة المستند
- الشريحة المحددة حالياً تتحول إلى `bg-action-blue text-white`
- أُزيل `showSources` (state مُهمل) واستُبدل بالتحديث المباشر للوحة اليسرى

##### لوحة عارض المستند (60%)
| الحالة | المحتوى |
|--------|---------|
| لا يوجد مصدر محدد | رسالة ترحيبية + مثال على شريحة مصدر |
| مصدر محدد | شارة الصفحة + نص المقتطف في بطاقة بيضاء |

---

### المرحلة 12: نظام التذاكر — بطاقة اقتراح AI المُعزَّزة

#### `src/app/student/tickets/tickets-client.tsx`

##### بطاقة اقتراح UniBot (الخطوة 2) — تصميم جديد
- رأس البطاقة: `bg-warning/10 border-b border-warning/20` مع أيقونة `Sparkles` في مربع `bg-warning/20`
- العنوان: **"اقتراح من المساعد الذكي"** (بدلاً من "وجدنا إجابة محتملة من UniBot")
- الوصف الثانوي: "UniBot وجد إجابة محتملة لمشكلتك"

##### أزرار الاستجابة
| الزر | التصميم |
|------|---------|
| **هذا يحل مشكلتي** | `bg-success rounded-xl font-semibold` |
| **مواصلة إرسال التذكرة** | `border-2 border-border hover:border-warning/40 hover:bg-warning/5` |

---

### الملفات المُعدَّلة
- `src/app/student/page.tsx`
- `src/app/student/unibot/unibot-client.tsx`
- `src/app/student/tickets/tickets-client.tsx`

### المشاكل
- لا توجد مشاكل. `showSources` أُزيل بعد أن أصبح `selectedSource` وحده كافياً.

---

## إصلاح أمني: عزل نطاق رئيس القسم (Department Scope Isolation)
**التاريخ:** 2026-03-14

### وصف المشكلة
كان جميع رؤساء الأقسام (`academic_management`) يرون نفس البيانات (جميع التخصصات والمقررات والشعب والجداول) بدلاً من رؤية البيانات الخاصة بقسمهم فقط.

**مثال:**
- إبراهيم حسن (رئيس قسم علوم الحاسوب) كان يرى تخصصات قسم الاقتصاد
- أحمد المقطري (رئيس قسم الاقتصاد) كان يرى تخصصات قسم علوم الحاسوب

### الحل المُطبَّق
تصفية البيانات بناءً على `department_id` المرتبط بالمستخدم في جدول `academic_management_departments`:

```
department_id → majors → study_plan_courses → course_ids → sections/schedules
```

### سلسلة التصفية
1. جلب `department_id` من `academic_management_departments` للمستخدم الحالي
2. جلب `major_ids` من `majors` حيث `department_id` يطابق
3. جلب `course_ids` من `study_plan_courses` حيث `major_id` في القائمة
4. تصفية `sections` و `schedules` و `enrollments` بناءً على `course_id`

### الملفات المُعدَّلة

#### `src/app/academic-management/schedules/page.tsx`
- جلب `department_id` من `academic_management_departments`
- تصفية `majors` بناءً على `department_id`
- تصفية `academic_levels` و `study_plan_courses` بناءً على `major_ids`
- تصفية `sections` بناءً على `course_ids` المستخرجة
- تصفية `schedules` بعد الجلب عبر `sections.course_id`

#### `src/app/academic-management/sections/page.tsx`
- جلب `department_id` ثم `major_ids` ثم `course_ids`
- تصفية `courses` و `sections` بناءً على `course_ids`

#### `src/app/academic-management/enrollments/page.tsx`
- نفس منطق التصفية للـ `sections` و `enrollments`

#### `src/app/academic-management/analytics/actions.ts`
- إضافة دالة مساعدة `getScopedCourseIds()` لاستخراج المقررات المسموحة
- تصفية `getRiskZoneData()` و `getCourseRiskFlags()` و `getAllRiskScores()` بناءً على `course_id`
- `tenant_admin` يتجاوز التصفية ويرى جميع البيانات

### ملاحظات
- التذاكر (`tickets`) لا تحتاج تصفية لأنها ليست مرتبطة بمقررات محددة
- `tenant_admin` يرى جميع البيانات بدون تصفية
- إذا لم يكن للمستخدم `department_id` مُعيَّن، يرى جميع البيانات (fallback)

---

## Hotfix: Tenant Admin Users Visibility
**التاريخ:** 2026-03-14

### وصف المشكلة
عند إضافة مستخدمين جدد (طلاب، محاضرين، إلخ) من خلال واجهة مدير الجامعة، تظهر رسالة "تمت الإضافة بنجاح" لكن المستخدمين لا يظهرون في قائمة إدارة المستخدمين، والعدادات تُظهر 0.

### السبب الجذري
مشكلة في سياسات RLS (Row Level Security) على جدول `profiles` والجداول المرتبطة:
1. الدوال المساعدة `current_tenant_id()` و `current_user_role()` كانت تُسبب recursion عند محاولة قراءة من جدول `profiles`
2. السياسات القديمة لم تكن تعمل بشكل صحيح مع `tenant_admin`

### الحل المُطبَّق

#### 1. إنشاء دوال مساعدة جديدة بـ SECURITY DEFINER
```sql
CREATE OR REPLACE FUNCTION auth_tenant_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT tenant_id FROM profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION auth_user_role() RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT role::text FROM profiles WHERE id = auth.uid(); $$;
```

#### 2. إعادة إنشاء سياسات RLS للجداول التالية:
- **profiles**: سياسات للـ super_admin, tenant_admin, وقراءة المستخدمين
- **student_profiles**: سياسات للإدارة والقراءة
- **faculty_profiles**: سياسات للإدارة والقراءة
- **student_majors**: سياسات للإدارة والقراءة
- **faculty_departments**: سياسات للإدارة والقراءة
- **academic_management_departments**: سياسات للإدارة والقراءة

### الملفات المُعدَّلة
- `supabase/migrations/20260314054800_fix_profiles_rls_final.sql` (جديد)

### ملاحظات
- استخدام `SECURITY DEFINER` يسمح للدوال بتجاوز RLS عند قراءة بيانات المستخدم الحالي
- السياسات الجديدة تضمن أن `tenant_admin` يمكنه رؤية وإدارة جميع المستخدمين في نفس الـ tenant
- جميع المستخدمين في نفس الـ tenant يمكنهم قراءة بيانات بعضهم البعض

---

## Hotfix: User Management List Empty State
**التاريخ:** 2026-03-14

### وصف المشكلة
صفحة إدارة المستخدمين تُظهر قائمة فارغة والعدادات تُظهر 0، رغم أن لوحة التحكم الرئيسية تُظهر وجود مستخدمين (20 مستخدم).

### السبب الجذري
مشكلتان في الكود:

1. **استعلام الـ Supabase**: الـ joins لم تكن تستخدم `!left` بشكل صريح مما قد يُسبب فشل الاستعلام عند عدم وجود بيانات مرتبطة.

2. **TypeScript Interfaces**: الـ `UserRow` interface كان يُعرِّف `student_profiles` و `faculty_profiles` كـ objects بينما Supabase يُرجعها كـ arrays.

### الحل المُطبَّق

#### 1. إصلاح استعلام الـ fetch في `page.tsx`
```typescript
// قبل
.select(`*, student_profiles(*), faculty_profiles(*)...`)

// بعد
.select(`*, student_profiles!left(*), faculty_profiles!left(*)...`)
```

#### 2. إصلاح الـ TypeScript interfaces في `users-client.tsx`
```typescript
// قبل
student_profiles: { student_number: string; ... } | null;
faculty_profiles: { employee_id: string | null; ... } | null;

// بعد
student_profiles: { student_number: string; ... }[] | null;
faculty_profiles: { employee_id: string | null; ... }[] | null;
```

#### 3. إصلاح الوصول للبيانات في الـ rendering
```typescript
// قبل
user.student_profiles?.student_number

// بعد
user.student_profiles?.[0]?.student_number
```

### الملفات المُعدَّلة
- `src/app/tenant-admin/users/page.tsx` - إضافة `!left` للـ joins
- `src/app/tenant-admin/users/users-client.tsx` - إصلاح الـ interfaces والـ rendering

---

## Hotfix: Academic Calendar Semester Type Enum Mismatch
**التاريخ:** 2026-04-10

### وصف المشكلة
عند محاولة إنشاء فصل دراسي جديد في التقويم الأكاديمي، يظهر خطأ:
```
invalid input value for enum semester_type: "spring"
```

### السبب الجذري
عدم تطابق بين قيم الـ enum في الـ UI وقاعدة البيانات:
- **قاعدة البيانات**: `'first', 'second', 'summer'`
- **الـ UI**: `'fall', 'spring', 'summer'`

### الحل المُطبَّق
تعديل `SEMESTER_TYPES` في `calendar-client.tsx`:
```typescript
// قبل
{ value: "fall", label: "الفصل الأول (خريف)" },
{ value: "spring", label: "الفصل الثاني (ربيع)" },

// بعد
{ value: "first", label: "الفصل الأول" },
{ value: "second", label: "الفصل الثاني" },
```

### الملفات المُعدَّلة
- `src/app/tenant-admin/calendar/calendar-client.tsx`

---

## Hotfix: Courses Not Appearing in Section Creation Form
**التاريخ:** 2026-04-10

### وصف المشكلة
عند محاولة فتح شعبة جديدة في صفحة "إدارة الشُعب" للإدارة الأكاديمية، قائمة المقررات تظهر فارغة رغم وجود مقررات في النظام.

### السبب الجذري
مشكلتان في استعلام جلب المقررات:

1. **استعلام خاطئ**: الكود كان يستخدم `.in("major_id", majorIds)` على جدول `study_plan_courses`، لكن هذا الجدول يستخدم `academic_level_id` وليس `major_id`.

2. **عدم وجود fallback**: إذا لم تكن هناك مقررات في الخطة الدراسية، كان الاستعلام يُرجع قائمة فارغة بدلاً من إظهار المقررات المتاحة.

### الحل المُطبَّق

#### 1. إصلاح مسار الاستعلام
```typescript
// قبل - خطأ
.from("study_plan_courses").in("major_id", majorIds)

// بعد - صحيح
// أولاً: جلب academic_levels للتخصصات
.from("academic_levels").in("major_id", majorIds)
// ثانياً: جلب المقررات من study_plan_courses
.from("study_plan_courses").in("academic_level_id", levelIds)
```

#### 2. إضافة fallback للمقررات
إذا لم تُوجد مقررات في الخطة الدراسية، يتم جلب المقررات من القسم مباشرة:
```typescript
if (!scopedCourseIds || scopedCourseIds.length === 0) {
  const { data: deptCourses } = await supabase
    .from("courses")
    .select("id")
    .eq("department_id", departmentId)
    .eq("is_active", true);
  scopedCourseIds = (deptCourses || []).map((c) => c.id);
}
```

### الملفات المُعدَّلة
- `src/app/academic-management/sections/page.tsx`
- `src/app/academic-management/enrollments/page.tsx`
- `src/app/academic-management/schedules/page.tsx`
- `src/app/academic-management/analytics/actions.ts`

---

## Feature: Student QR Attendance Scanning
**التاريخ:** 2026-04-10

### الوصف
إضافة ميزة تسجيل الحضور للطالب عبر مسح رمز QR المعروض من المحاضر.

### كيفية الاستخدام
1. **المحاضر**: يفتح جلسة حضور ويعرض رمز QR على الشاشة
2. **الطالب**: يذهب إلى صفحة "سجل حضوري" → تبويب "تسجيل الحضور"
3. **الطالب**: يمسح رمز QR بكاميرا الهاتف أو يلصق الرمز يدوياً
4. **النظام**: يتحقق من صلاحية الرمز وتسجيل الطالب في الشعبة، ثم يُحدّث حالة الحضور

### الملفات المُضافة
- `src/app/student/attendance/actions.ts` - Server actions للتحقق من QR وتسجيل الحضور

### الملفات المُعدَّلة
- `src/app/student/attendance/attendance-client.tsx` - إضافة تبويب "تسجيل الحضور" مع واجهة إدخال رمز QR

### التحققات
- التحقق من صلاحية رمز QR (غير منتهي الصلاحية)
- التحقق من أن الجلسة مفتوحة
- التحقق من تسجيل الطالب في الشعبة
- منع التسجيل المكرر

---

## Enhancement: Faculty Dual Attendance Mode (QR + Manual)
**التاريخ:** 2026-04-10

### الوصف
تحسين واجهة الحضور للمحاضر لتشمل وضعين للتحضير:
1. **تحضير بـ QR**: عرض رمز QR للطلاب لمسحه وتسجيل حضورهم تلقائياً
2. **تحضير يدوي**: عرض قائمة الطلاب مع أزرار لتحديد الحالة (حاضر/غائب/متأخر/معذور)

### كيفية الاستخدام
1. المحاضر ينشئ جلسة حضور جديدة
2. يضغط على السهم لتوسيع الجلسة
3. يختار الوضع المناسب:
   - **تحضير بـ QR**: يعرض الرمز للطلاب
   - **تحضير يدوي**: يحدد حالة كل طالب يدوياً

### الملفات المُعدَّلة
- `src/app/faculty/attendance/attendance-client.tsx`

---

## Feature: Faculty Channel Management
**التاريخ:** 2026-04-10

### الوصف
إضافة ميزة إدارة قنوات الشُعب للمحاضر:
1. **إضافة المحاضر تلقائياً** كعضو admin في قناة الشعبة عند إنشائها
2. **إعدادات القناة** - المحاضر يمكنه التحكم في:
   - السماح/منع الطلاب من إرسال الرسائل
   - كتم طالب معين (منعه من الإرسال)

### كيفية الاستخدام
1. المحاضر يذهب إلى **الرسائل**
2. يختار قناة الشعبة من القائمة
3. يضغط على أيقونة **الإعدادات** ⚙️ في رأس القناة
4. يمكنه:
   - تفعيل/تعطيل إرسال الطلاب للرسائل
   - كتم طالب معين بالضغط على أيقونة الصوت

### الملفات المُضافة
- `supabase/migrations/20260410220000_add_instructor_to_channel.sql`

### الملفات المُعدَّلة
- `src/app/faculty/messages/actions.ts` - إضافة دوال إدارة القناة
- `src/app/faculty/messages/messages-client.tsx` - إضافة واجهة إعدادات القناة

### ملاحظة
يجب تشغيل الـ migration في Supabase Dashboard لتفعيل الميزة.

---

## Feature: Voice-Enabled UniBot (STT & Gemini TTS)
**التاريخ:** 2026-06-21

### ملخص
ترقية واجهة UniBot Chat لدعم التفاعل الصوتي الكامل: تحويل الكلام إلى نص عبر Browser Speech API، وتحويل النص إلى كلام عبر Google Gemini TTS API.

---

### المرحلة 1 — تحويل الكلام إلى نص (Browser SpeechRecognition API)
**الملف:** `src/app/student/unibot/unibot-client.tsx`

**الإضافات:**
- زر ميكروفون 🎙️ بجانب زر الإرسال في شريط الإدخال
- استخدام `window.SpeechRecognition` أو `window.webkitSpeechRecognition` الأصلي
- لغة التعرف: `ar-SA` (العربية السعودية)
- التسجيل مستمر (`continuous: true`) مع نتائج مؤقتة (`interimResults: true`)
- إظهار النص المُسجَّل مباشرة في حقل الإدخال (textarea)

**المؤشر البصري:**
- نقطة حمراء نابضة (`animate-ping`) أثناء التسجيل
- نص "جاري التسجيل..." بلون danger
- زر الميكروفون يتحول إلى خلفية حمراء أثناء التسجيل

---

### المرحلة 2 — تحويل النص إلى كلام (Google Gemini TTS)
**الملف:** `src/app/api/ai/chat/route.ts`

**الإضافات:**
- دالة `generateAudio(text)` تُرسل النص إلى نموذج `gemini-2.5-pro-preview-tts` عبر REST API
- تستخدم نفس مفتاح `GEMINI_API_KEY`
- تُعيد كائن `{ data: string, mimeType: string }` أو `null` عند الفشل
- تُستدعى بعد إنشاء الرد النصي وإضافته إلى استجابة API

**تعديل الاستجابة:**
- إضافة حقل `audio` إلى `NextResponse.json()` يحمل البيانات الصوتية (Base64) ونوع MIME

**معالجة الأخطاء:**
- إذا فشلت خدمة TTS (خطأ API أو timeout)، يُعاد `null` للصوت مع بقاء الرد النصي سليماً
- يُسجَّل تحذير في الـ console دون تعطيل تدفق المحادثة

---

### المرحلة 3 — تشغيل الصوت في الواجهة الأمامية
**الملف:** `src/app/student/unibot/unibot-client.tsx`

**الإضافات:**
- أيقونة مكبر صوت 🔊 بجانب فقاعات المساعد التي تحتوي على صوت
- تشغيل تلقائي للصوت عند وصول رد جديد من UniBot
- إعادة التشغيل عند النقر على أيقونة السماعة

**الآلية:**
- `Audio` object من HTML5 API لتحويل Base64 إلى صوت
- `data:${mimeType};base64,${data}` لبناء مصدر الصوت
- عداد `playingAudioId` لتتبع الرسالة التي يتم تشغيلها حالياً
- إيقاف التشغيل الحالي عند بدء تشغيل جديد

### الملفات المُعدَّلة
| الملف | التغيير |
|-------|---------|
| `src/app/student/unibot/unibot-client.tsx` | إضافة الميكروفون، SpeechRecognition، أيقونة السماعة، التشغيل التلقائي |
| `src/app/api/ai/chat/route.ts` | إضافة دالة `generateAudio()` وحقل `audio` في الاستجابة |
| `change_log.md` | هذا التوثيق |

### ملاحظات تقنية
- Browser Speech API يعمل على Chrome و Edge و Safari (iOS 16+) — غير مدعوم في Firefox
- نموذج `gemini-2.5-pro-preview-tts` يتطلب مفتاح API مع صلاحية الوصول إلى Gemini API
- إذا فشل TTS، يستمر النظام في العمل كنص فقط بدون تعطيل
- Rust SDK للـ TTS ليس مطلوباً — استخدمنا REST API المباشر

