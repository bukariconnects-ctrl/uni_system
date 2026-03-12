# نظام التذاكر الأكاديمية (Academic Ticketing System)

## نظرة عامة

نظام التذاكر الأكاديمية في UniBot هو نظام متكامل لإدارة طلبات الطلاب والمحاضرين والاستفسارات الأكاديمية. يوفر النظام آلية منظمة للتواصل بين الطلاب والإدارة الأكاديمية، مع دعم كامل للذكاء الاصطناعي للحل المسبق للمشاكل، ومسارات الموافقة متعددة المراحل، والإشعارات الفورية.

### الأهداف الرئيسية
- **تنظيم الطلبات**: توحيد قناة التواصل بين الطلاب والإدارة
- **الحل الذكي**: استخدام الذكاء الاصطناعي لحل المشاكل الشائعة قبل إنشاء التذكرة
- **الشفافية**: تتبع كامل لحالة الطلب من الإنشاء حتى الإغلاق
- **الكفاءة**: تقليل الوقت المستغرق في معالجة الطلبات الروتينية
- **المساءلة**: سجل كامل لجميع التفاعلات والقرارات

---

## الأدوار والصلاحيات

### 1. الطالب (Student)
**الصلاحيات:**
- ✅ إنشاء تذاكر جديدة في جميع الفئات
- ✅ استشارة UniBot AI قبل إنشاء التذكرة (إلزامي)
- ✅ عرض جميع تذاكره الشخصية
- ✅ إرسال رسائل داخل التذكرة
- ✅ رفع مرفقات (صور، مستندات، إلخ)
- ✅ تقييم التذكرة بعد الحل (1-5 نجوم)
- ✅ عرض حالة التذكرة في الوقت الفعلي

**القيود:**
- ❌ لا يمكن تعيين التذكرة لشخص معين
- ❌ لا يمكن تغيير حالة التذكرة (ما عدا الإغلاق بعد الحل)
- ❌ لا يمكن عرض الرسائل الداخلية (`is_internal = true`)
- ❌ لا يمكن عرض تذاكر الطلاب الآخرين

---

### 2. المحاضر (Faculty)
**الصلاحيات:**
- ✅ إنشاء تذاكر (نادراً، عادة للمشاكل التقنية أو الإدارية)
- ✅ عرض التذاكر المتعلقة بشعبه الدراسية
- ✅ الرد على التذاكر المتعلقة بطلابه
- ✅ إرسال رسائل عامة وداخلية

**القيود:**
- ❌ لا يمكن تعيين أو إعادة توجيه التذاكر
- ❌ لا يمكن تغيير حالة التذكرة إلى `resolved` أو `rejected`
- ❌ لا يمكن الموافقة على مسارات الموافقة (ما لم يكن مُعيَّناً كموافق)

---

### 3. الإدارة الأكاديمية (Academic Management)
**الصلاحيات الكاملة:**
- ✅ عرض **جميع** التذاكر في المؤسسة
- ✅ تعيين التذاكر لأعضاء الإدارة (`assigned_to`)
- ✅ تغيير حالة التذكرة (`open` → `in_progress` → `resolved` → `closed`)
- ✅ رفض التذاكر (`rejected`) مع تقديم سبب
- ✅ إنشاء مسارات موافقة متعددة المراحل
- ✅ إرسال رسائل داخلية (غير مرئية للطلاب)
- ✅ عرض الإحصائيات والتقارير
- ✅ البحث النصي الكامل في جميع التذاكر

---

### 4. مدير المؤسسة (Tenant Admin)
**صلاحيات مماثلة للإدارة الأكاديمية** + القدرة على:
- ✅ تعديل إعدادات النظام
- ✅ حذف التذاكر (في حالات نادرة)
- ✅ الوصول الكامل لجميع البيانات

---

## آلية العمل التقنية

### 1. توليد رقم التذكرة التلقائي
**الآلية:** Database Trigger `trg_generate_ticket_number`

```sql
CREATE TRIGGER trg_generate_ticket_number
    BEFORE INSERT ON tickets
    FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();
```

**الوظيفة:**
- يتم توليد رقم فريد لكل تذكرة بصيغة `TKT-XXXXXX`
- الترقيم تسلسلي لكل مؤسسة (`tenant_id`)
- مثال: `TKT-000001`, `TKT-000002`, ..., `TKT-000150`

**الفائدة:**
- سهولة الإشارة للتذكرة في المحادثات
- تتبع تسلسلي للطلبات
- تجنب التعارضات بين المؤسسات

---

### 2. الإشعارات الفورية عند تغيير الحالة
**الآلية:** Database Trigger `trg_notify_ticket_status`

```sql
CREATE TRIGGER trg_notify_ticket_status
    AFTER UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION notify_ticket_status_change();
```

**الوظيفة:**
- عند تغيير `status` (مثل `open` → `in_progress`)
- يُرسل إشعار فوري لمُنشئ التذكرة (`created_by`)
- الإشعار يظهر في `NotificationBell` بدون الحاجة لتحديث الصفحة

**مثال على الإشعار:**
```
العنوان: تحديث التذكرة: TKT-000042
الرسالة: تم تغيير حالة تذكرتك إلى: in_progress
```

---

### 3. الرسائل الداخلية مقابل العامة
**الحقل:** `ticket_messages.is_internal`

| القيمة | الوصف | من يراها |
|--------|-------|----------|
| `false` | رسالة عامة | الطالب + الإدارة + المحاضر (إن وُجد) |
| `true` | رسالة داخلية | الإدارة الأكاديمية فقط |

**حالات الاستخدام للرسائل الداخلية:**
- تنسيق داخلي بين أعضاء الإدارة
- ملاحظات حساسة لا يجب أن يراها الطالب
- طلب استشارة من قسم آخر

---

### 4. البحث النصي الكامل (Full-Text Search)
**الآلية:** PostgreSQL `tsvector` + GIN Index

```sql
ALTER TABLE tickets ADD COLUMN search_vector tsvector;
CREATE INDEX idx_tickets_search_vector ON tickets USING GIN(search_vector);
```

**الوظيفة:**
- يتم فهرسة `title` + `description` + `ticket_number` تلقائياً
- البحث السريع في آلاف التذاكر
- دعم البحث الجزئي والكلمات المفتاحية

**مثال:**
```sql
SELECT * FROM tickets 
WHERE search_vector @@ to_tsquery('english', 'grade & appeal');
```

---

## دورة حياة التذكرة (Ticket Lifecycle)

### المرحلة A: التدخل المسبق للذكاء الاصطناعي

**الهدف:** حل المشاكل الشائعة قبل إنشاء التذكرة

#### الخطوات:
1. **الطالب يبدأ بإنشاء تذكرة جديدة**
   - يختار الفئة (`category`)
   - يكتب العنوان (`title`)
   - يكتب الوصف (`description`)

2. **النظام يستشير UniBot AI (إلزامي)**
   ```typescript
   const aiSuggestion = await getAiSuggestion(title, description, category);
   ```
   - يتم إرسال البيانات لـ Gemini AI
   - الـ AI يحلل المشكلة ويقدم:
     - ✅ حل فوري (إن أمكن)
     - ✅ روابط لمصادر مفيدة
     - ✅ خطوات استكشاف الأخطاء

3. **الطالب يراجع اقتراح الـ AI**
   - إذا حُلت المشكلة → لا حاجة لإنشاء التذكرة ✅
   - إذا لم تُحل → يتابع إنشاء التذكرة

4. **تسجيل محاولة الـ AI**
   ```sql
   ai_attempted = TRUE
   ai_suggestion = "نص الاقتراح من Gemini"
   ```

**الفوائد:**
- تقليل عدد التذاكر بنسبة 30-40%
- حل فوري للمشاكل الشائعة
- تحسين تجربة المستخدم

---

### المرحلة B: الإنشاء والتوجيه

#### 1. إنشاء التذكرة
```sql
INSERT INTO tickets (
    tenant_id, created_by, category, priority, status,
    title, description, related_section_id,
    ai_attempted, ai_suggestion
) VALUES (...);
```

**الحقول الإلزامية:**
- `tenant_id`: معرف المؤسسة
- `created_by`: معرف الطالب
- `category`: الفئة (grade_appeal, absence_excuse, إلخ)
- `priority`: الأولوية (low, medium, high, urgent)
- `title`: عنوان مختصر
- `description`: وصف تفصيلي

**الحقول الاختيارية:**
- `related_section_id`: ربط بشعبة دراسية معينة
- `ai_suggestion`: نص اقتراح الـ AI

#### 2. التوجيه التلقائي
- الحالة الافتراضية: `open`
- `assigned_to`: `NULL` (غير مُعيَّنة بعد)
- الإدارة الأكاديمية تستلم إشعاراً فورياً

#### 3. توليد رقم التذكرة
```
TKT-000001 → تُعرض للطالب فوراً
```

---

### المرحلة C: المعالجة والتواصل

#### 1. تعيين التذكرة
```sql
UPDATE tickets 
SET assigned_to = 'uuid-of-admin', status = 'in_progress'
WHERE id = 'ticket-id';
```
- الطالب يستلم إشعاراً: "تذكرتك قيد المعالجة"

#### 2. التواصل الداخلي
**سيناريو: الإدارة تحتاج معلومات إضافية**

```sql
-- رسالة عامة للطالب
INSERT INTO ticket_messages (ticket_id, sender_id, body, is_internal)
VALUES ('ticket-id', 'admin-id', 'نحتاج صورة من كشف الدرجات', false);

-- تغيير الحالة
UPDATE tickets SET status = 'pending_info' WHERE id = 'ticket-id';
```

**سيناريو: تنسيق داخلي بين الإدارة**

```sql
-- رسالة داخلية (الطالب لا يراها)
INSERT INTO ticket_messages (ticket_id, sender_id, body, is_internal)
VALUES ('ticket-id', 'admin1-id', 'يجب استشارة رئيس القسم قبل الموافقة', true);
```

#### 3. رفع المرفقات
```sql
INSERT INTO ticket_attachments (
    ticket_id, uploaded_by, file_name, file_url, file_size_bytes, mime_type
) VALUES (...);
```

**الأنواع المدعومة:**
- صور: JPG, PNG, PDF
- مستندات: DOCX, XLSX, PDF
- الحد الأقصى: يُحدد في إعدادات Supabase Storage

---

### المرحلة D: مسارات الموافقة (Approval Workflows)

**متى تُستخدم؟**
- طلبات حساسة مثل:
  - طعن في درجة (`grade_appeal`)
  - تغيير جدول (`schedule_change`)
  - عذر غياب متأخر (`absence_excuse`)

#### الآلية:
1. **الإدارة تُنشئ مسار موافقة متعدد المراحل**

```sql
-- المرحلة 1: موافقة المحاضر
INSERT INTO approval_workflows (ticket_id, approver_id, step_order, status)
VALUES ('ticket-id', 'faculty-id', 1, 'pending');

-- المرحلة 2: موافقة رئيس القسم
INSERT INTO approval_workflows (ticket_id, approver_id, step_order, status)
VALUES ('ticket-id', 'dept-head-id', 2, 'pending');

-- المرحلة 3: موافقة العميد
INSERT INTO approval_workflows (ticket_id, approver_id, step_order, status)
VALUES ('ticket-id', 'dean-id', 3, 'pending');
```

2. **الموافق يستلم إشعاراً**
   - "لديك طلب موافقة جديد: TKT-000042"

3. **الموافق يتخذ قراراً**

```sql
-- موافقة
UPDATE approval_workflows
SET status = 'approved', 
    decision_notes = 'الطالب لديه عذر مقبول',
    decided_at = NOW()
WHERE id = 'workflow-id';

-- أو رفض
UPDATE approval_workflows
SET status = 'rejected',
    decision_notes = 'لا يوجد دليل كافٍ',
    decided_at = NOW()
WHERE id = 'workflow-id';
```

4. **الانتقال للمرحلة التالية**
   - إذا `approved` → الموافق التالي يستلم إشعاراً
   - إذا `rejected` → التذكرة تُرفض فوراً

5. **إتمام جميع المراحل**
   - إذا جميع الموافقين وافقوا → التذكرة تُحل (`resolved`)

---

### المرحلة E: الإغلاق والتقييم

#### 1. حل التذكرة
```sql
UPDATE tickets
SET status = 'resolved', resolved_at = NOW()
WHERE id = 'ticket-id';
```
- الطالب يستلم إشعاراً: "تم حل تذكرتك"

#### 2. التقييم (اختياري)
```sql
UPDATE tickets
SET rating = 5  -- من 1 إلى 5
WHERE id = 'ticket-id';
```

**واجهة التقييم:**
```
⭐⭐⭐⭐⭐ (5 نجوم)
كيف كانت تجربتك مع نظام التذاكر؟
```

#### 3. الإغلاق النهائي
```sql
UPDATE tickets
SET status = 'closed', closed_at = NOW()
WHERE id = 'ticket-id';
```

**الفرق بين `resolved` و `closed`:**
- `resolved`: الإدارة حلت المشكلة
- `closed`: الطالب أكد الحل أو مرت فترة زمنية

---

## حالات التذكرة (Ticket Statuses)

| الحالة | الوصف | متى تُستخدم | من يستطيع تعيينها |
|--------|-------|-------------|-------------------|
| `open` | مفتوحة | عند الإنشاء، لم تُعالج بعد | النظام (افتراضي) |
| `in_progress` | قيد المعالجة | تم تعيين التذكرة لموظف | الإدارة الأكاديمية |
| `pending_info` | بانتظار معلومات | نحتاج رداً أو مرفقات من الطالب | الإدارة الأكاديمية |
| `resolved` | تم الحل | المشكلة حُلت من قبل الإدارة | الإدارة الأكاديمية |
| `closed` | مغلقة | الطالب أكد الحل أو انتهت المدة | الإدارة / الطالب |
| `rejected` | مرفوضة | الطلب غير مقبول (مع ذكر السبب) | الإدارة الأكاديمية |

---

## الفئات المدعومة (Ticket Categories)

| الفئة | الوصف | أمثلة |
|------|-------|-------|
| `grade_appeal` | طعن في درجة | "درجتي في الامتحان النهائي غير صحيحة" |
| `absence_excuse` | عذر غياب | "كنت مريضاً يوم الامتحان" |
| `registration_issue` | مشكلة تسجيل | "لا أستطيع التسجيل في المادة" |
| `schedule_change` | طلب تغيير جدول | "تعارض بين محاضرتين" |
| `venue_issue` | مشكلة قاعة | "القاعة مغلقة / الجهاز لا يعمل" |
| `technical_problem` | مشكلة تقنية | "لا أستطيع الدخول للنظام" |
| `administrative` | إداري عام | "طلب إفادة / وثيقة" |
| `other` | أخرى | أي طلب لا يندرج تحت الفئات السابقة |

---

## مستويات الأولوية (Priority Levels)

| الأولوية | الوصف | وقت الاستجابة المتوقع |
|---------|-------|----------------------|
| `low` | منخفضة | 3-5 أيام عمل |
| `medium` | متوسطة (افتراضي) | 1-2 يوم عمل |
| `high` | عالية | 4-8 ساعات |
| `urgent` | عاجلة | أقل من ساعة |

**ملاحظة:** الأولوية يمكن أن تُعدَّل من قبل الإدارة بناءً على طبيعة الطلب.

---

## الإحصائيات والتقارير

### مؤشرات الأداء الرئيسية (KPIs)

1. **متوسط وقت الاستجابة**
   ```sql
   SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) AS avg_hours
   FROM tickets WHERE status = 'resolved';
   ```

2. **معدل الحل من المحاولة الأولى**
   ```sql
   SELECT 
       COUNT(*) FILTER (WHERE ai_attempted = true AND status = 'closed') * 100.0 / 
       COUNT(*) AS ai_success_rate
   FROM tickets;
   ```

3. **التوزيع حسب الفئة**
   ```sql
   SELECT category, COUNT(*) AS count
   FROM tickets
   GROUP BY category
   ORDER BY count DESC;
   ```

4. **متوسط التقييم**
   ```sql
   SELECT AVG(rating) AS avg_rating
   FROM tickets
   WHERE rating IS NOT NULL;
   ```

---

## أمثلة على سيناريوهات واقعية

### السيناريو 1: طعن في درجة (Grade Appeal)

**الخطوات:**
1. الطالب يُنشئ تذكرة من فئة `grade_appeal`
2. UniBot AI يقترح: "تحقق من كشف الدرجات أولاً"
3. الطالب يتابع ويُنشئ التذكرة
4. الإدارة تُنشئ مسار موافقة:
   - المرحلة 1: المحاضر يراجع الدرجة
   - المرحلة 2: رئيس القسم يوافق
5. المحاضر يوافق: "خطأ في الجمع، الدرجة الصحيحة 95"
6. رئيس القسم يوافق
7. التذكرة تُحل → الطالب يُقيّم 5 نجوم

---

### السيناريو 2: مشكلة تقنية (Technical Problem)

**الخطوات:**
1. الطالب: "لا أستطيع تحميل المحاضرة"
2. AI يقترح: "جرّب مسح الـ cache أو استخدم متصفحاً آخر"
3. الطالب يجرب → لم تُحل المشكلة
4. يُنشئ التذكرة
5. الدعم التقني يُعيّن التذكرة لنفسه
6. يكتشف مشكلة في الرابط → يُصلحها
7. يُرسل رسالة: "تم إصلاح الرابط، جرّب الآن"
8. الطالب يؤكد الحل → `resolved`

---

### السيناريو 3: عذر غياب (Absence Excuse)

**الخطوات:**
1. الطالب يُنشئ تذكرة `absence_excuse`
2. يرفع صورة من التقرير الطبي
3. الإدارة تُنشئ مسار موافقة:
   - المحاضر يوافق على قبول العذر
4. المحاضر يوافق
5. النظام يُحدّث سجل الغياب تلقائياً
6. التذكرة تُحل

---

## الأمان والخصوصية

### Row Level Security (RLS)

**الطلاب:**
```sql
CREATE POLICY "students_read_own_tickets"
    ON tickets FOR SELECT
    USING (created_by = current_profile_id());
```

**الإدارة:**
```sql
CREATE POLICY "admin_manage_all_tickets"
    ON tickets FOR ALL
    USING (tenant_id = current_tenant_id() AND 
           current_user_role() IN ('academic_management', 'tenant_admin'));
```

**الموافقون:**
```sql
CREATE POLICY "approver_read_own_workflow"
    ON approval_workflows FOR SELECT
    USING (approver_id = current_profile_id());
```

---

## التكامل مع الأنظمة الأخرى

### 1. نظام الإشعارات
- كل تغيير في الحالة → إشعار فوري
- الإشعارات تظهر في `NotificationBell`
- دعم Realtime عبر Supabase WebSocket

### 2. نظام المراسلة
- التذاكر مرتبطة بـ `conversations` (اختياري)
- يمكن تحويل محادثة مباشرة إلى تذكرة

### 3. نظام الملفات
- رفع المرفقات عبر Supabase Storage
- دعم جميع أنواع الملفات
- حد أقصى: 10 MB لكل ملف

---

## الخلاصة

نظام التذاكر الأكاديمية في UniBot يوفر:
- ✅ **حل ذكي مسبق** عبر Gemini AI
- ✅ **تواصل منظم** بين الطلاب والإدارة
- ✅ **مسارات موافقة مرنة** لأي نوع من الطلبات
- ✅ **إشعارات فورية** لجميع الأطراف
- ✅ **تتبع كامل** لدورة حياة التذكرة
- ✅ **أمان متقدم** عبر RLS
- ✅ **تقارير وإحصائيات** لتحسين الخدمة

النظام مُصمم ليكون قابلاً للتوسع، سهل الاستخدام، ويُحسّن تجربة الطلاب والإدارة على حد سواء.
