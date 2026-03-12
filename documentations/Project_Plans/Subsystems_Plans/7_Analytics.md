# 📊 النظام الفرعي 7: التحليلات والتنبؤ — v2.0
### Analytics & Predictive Risk System
**محدَّث بمراجع قاعدة البيانات الفعلية**

---

## 📌 نظرة عامة

| الحقل | التفاصيل |
|---|---|
| **هدف النظام** | الدماغ التحليلي: تحويل بيانات الحضور والدرجات والتفاعل إلى قرارات استباقية |
| **الأدوار المرتبطة** | `academic_management` (لوحات التحكم) + `faculty` (منطقة الخطر بشعبه) |
| **الأولوية** | 🟡 متوسطة-عالية |
| **المتطلق الرئيسي** | SR-7 / FR-AM6 / FR-FM5 / NFR-AI2 |
| **ملف SQL** | `part2_lms_messaging_ai_ticketing.sql` — القسمان 11 + 13 |

---

## 🗄️ خريطة مخطط قاعدة البيانات

| الجدول | الغرض | حقول مهمة |
|---|---|---|
| `student_risk_scores` | درجات الخطر المحسوبة لكل طالب/شعبة/فصل | `risk_level ENUM`, `risk_score NUMERIC(5,2)`, `absence_factor`, `grade_factor`, `engagement_factor`, `alert_sent BOOLEAN` |
| `course_risk_flags` | مؤشرات الخطر على مستوى المقرر | `avg_risk_score`, `high_risk_count`, `failure_rate_pct`, `engagement_drop BOOLEAN`, `flagged BOOLEAN` |
| `student_recommendations` | التوصيات الأكاديمية للطلاب | `sent_by=NULL` → تلقائي / `material_url TEXT` |
| `student_profiles` | يحمل `risk_level + risk_score + risk_updated_at` | يُحدَّث من pg_cron يومياً |
| `attendance_summaries` | مصدر `absence_factor` | `absence_percentage` |
| `gradebook_entries` | مصدر `grade_factor` | `total_grade (Generated Column)` |
| `course_materials` | مصدر `engagement_factor` | `view_count INT` |

### ENUMs ذات الصلة

```sql
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
-- يُستخدم في: student_risk_scores.risk_level + student_profiles.risk_level
```

### pg_cron Jobs الحرجة (NFR-AI2)

```sql
-- 1. تحديث risk_level في student_profiles من student_risk_scores (يومياً 02:00)
CREATE OR REPLACE FUNCTION refresh_student_risk_levels() ...
SELECT cron.schedule('refresh-student-risk-levels', '0 2 * * *',
    $$ SELECT refresh_student_risk_levels(); $$);

-- 2. إرسال تنبيهات المحاضرين عن الطلاب في الخطر (يومياً 02:30)
CREATE OR REPLACE FUNCTION send_risk_alerts() ...
SELECT cron.schedule('send-risk-alerts', '30 2 * * *',
    $$ SELECT send_risk_alerts(); $$);
```

### كيف تعمل `refresh_student_risk_levels()` (من SQL)

```sql
UPDATE student_profiles sp
SET risk_level      = srs.risk_level,
    risk_score      = srs.risk_score,
    risk_updated_at = NOW()
FROM (
    SELECT DISTINCT ON (student_id)
           student_id, risk_level, risk_score
    FROM student_risk_scores
    ORDER BY student_id, computed_at DESC  -- أحدث درجة
) srs
WHERE sp.profile_id = srs.student_id;
```

### كيف تعمل `send_risk_alerts()` (من SQL)

```sql
INSERT INTO notifications (tenant_id, recipient_id, notification_type, title, body, ...)
SELECT DISTINCT ON (srs.section_id, srs.student_id)
    srs.tenant_id,
    sec.instructor_id,   -- يُرسَل للمحاضر
    'risk_alert',
    'تحذير: طالب في منطقة الخطر',
    'الطالب ' || p.first_name || ' في خطر بمقرر ' || c.name, ...
FROM student_risk_scores srs
WHERE srs.risk_level IN ('high', 'critical')
  AND srs.alert_sent = FALSE
  AND sec.instructor_id IS NOT NULL;

UPDATE student_risk_scores SET alert_sent = TRUE WHERE ...;  -- منع الإرسال المكرر
```

---

## 🔐 سياسات RLS المُطبَّقة

| السياسة | الجدول | النطاق |
|---|---|---|
| `student_read_own_risk_score` | `student_risk_scores` | الطالب: درجة خطره فقط |
| `faculty_admin_read_risk_scores` | `student_risk_scores` | Faculty + Academic Management: قراءة كل درجات الجامعة |
| `admin_read_course_risk_flags` | `course_risk_flags` | Academic Management + Tenant Admin: قراءة |
| `faculty_read_own_course_risk_flags` | `course_risk_flags` | المحاضر: مؤشرات شعبه فقط (`section_id IN (sections WHERE instructor_id=me)`) |
| `student_read_own_recommendations` | `student_recommendations` | الطالب: توصياته فقط |
| `faculty_admin_manage_recommendations` | `student_recommendations` | Faculty + Admin: إنشاء وإدارة التوصيات |

---

## ✅ قائمة المهام التفصيلية للمطورين

### 🧮 محرك حساب درجة الخطر (Edge Function)

- [ ] **[NFR-AI2]** بناء Edge Function `compute-risk-scores` (يُستدعى يومياً من pg_cron أو عند تحديث درجات):

  **خوارزمية الحساب:**
  ```
  لكل (student_id, section_id, semester_id):

  1. absence_factor (40% من الوزن):
     SELECT absence_percentage FROM attendance_summaries
     WHERE student_id=X AND section_id=Y
     → absence_factor = absence_percentage / 100 * 100

  2. grade_factor (40% من الوزن):
     SELECT total_grade FROM gradebook_entries WHERE student_id=X AND section_id=Y
     → grade_factor = MAX(0, (60 - total_grade) / 60 * 100)
     -- كلما انخفضت الدرجة عن 60، زاد grade_factor

  3. engagement_factor (20% من الوزن):
     SELECT COUNT(*) submitted, COUNT(*) total_assignments FROM assignments WHERE section_id=Y
     → engagement_factor = (1 - submitted/total) * 100

  4. risk_score = absence_factor*0.40 + grade_factor*0.40 + engagement_factor*0.20

  5. risk_level:
     - risk_score >= 75 → 'critical'
     - risk_score >= 50 → 'high'
     - risk_score >= 25 → 'medium'
     - else             → 'low'

  6. UPSERT INTO student_risk_scores (tenant_id, student_id, section_id, semester_id,
                                       risk_level, risk_score, absence_factor, grade_factor,
                                       engagement_factor, alert_sent=FALSE, computed_at=NOW())
     ON CONFLICT (student_id, section_id, semester_id) DO UPDATE SET ...
  ```

- [ ] **[NFR-AI2]** التحقق من تشغيل pg_cron `refresh-student-risk-levels` يومياً 02:00:
  - ينسخ `risk_level + risk_score` من `student_risk_scores` → `student_profiles`

- [ ] **[FR-AM6.2]** بناء Edge Function `compute-course-risk-flags`:
  - `UPSERT INTO course_risk_flags (section_id, semester_id, avg_risk_score, high_risk_count, failure_rate_pct, flagged, ...)`
  - `flagged = TRUE` إذا `failure_rate_pct >= 30%` أو `high_risk_count >= 30% of enrolled_count`

### 📡 APIs التحليلات

- [ ] **[FR-AM3.1]** بناء `GET /api/analytics/department-pulse`:
  - إحصائيات مباشرة من `sections`, `attendance_summaries`, `assignments`
  - يُعيد: محاضرات نشطة الآن + متوسط حضور اليوم + تسليمات اليوم
- [ ] **[FR-AM6.1]** بناء `GET /api/analytics/risk-zone?section_id=&semester_id=`:
  - `SELECT srs.*, p.first_name, p.last_name FROM student_risk_scores srs JOIN profiles p ON p.id=srs.student_id`
  - `WHERE srs.semester_id=X AND srs.section_id=Y AND srs.risk_level IN ('high','critical')`
  - `ORDER BY srs.risk_score DESC`
  - سياسة `faculty_admin_read_risk_scores` تضمن العزل
- [ ] **[FR-AM6.2]** بناء `GET /api/analytics/course-risk-flags`:
  - من `course_risk_flags WHERE flagged=TRUE AND semester_id=X`
- [ ] **[FR-FM5.2]** بناء `POST /api/recommendations`:
  - `INSERT INTO student_recommendations (tenant_id, student_id, section_id, sent_by=current_profile_id(), title, body, material_url)`
  - يُدرج `notifications` للطالب بـ `'recommendation'` type

### 📊 واجهات التحليلات الأمامية

- [ ] **[FR-AM3.1]** صفحة **لوحة التحليلات** (Academic Management) — Bento Grid Layout:
  - **بطاقة نبض القسم:** `Live Stats` من `/department-pulse`
  - **Donut Chart:** توزيع الحضور (حاضر/غائب/متأخر) من `attendance_summaries`
  - **Line Chart:** تطور `avg_risk_score` أسبوعياً من `student_risk_scores`
  - **Risk Zone Widget:** قائمة الطلاب بـ `risk_level='high/critical'` مع Risk Badge مُلوَّن
- [ ] **[FR-FM5.1]** قسم **Risk Zone 🚨** داخل صفحة إدارة الشعبة (Faculty):
  - يقرأ من `student_risk_scores` بسياسة `faculty_admin_read_risk_scores` (شعبته فقط)
  - كل صف: Avatar + اسم + `risk_score` Bar + الأسباب (Absence/Grade/Engagement) + زر "إرسال توصية"
- [ ] **[FR-AM6.2]** مكوّن **Course Risk Alert Card**:
  - بطاقة بحد أحمر لـ `course_risk_flags WHERE flagged=TRUE`
  - تُعرض في لوحة الإدارة الأكاديمية

---

## 🔗 الروابط مع أنظمة أخرى

| النظام | طبيعة العلاقة |
|---|---|
| **LMS (Attendance)** | يسحب `attendance_summaries.absence_percentage` لحساب `absence_factor` |
| **LMS (Gradebook)** | يسحب `gradebook_entries.total_grade` لحساب `grade_factor` |
| **UniBot AI** | يُزوِّد الطالب ببياناته (`risk_score`) لتوليد نصائح مُخصَّصة |
| **التعاميم** | `send_risk_alerts()` يُدرج `risk_alert` في `notifications` |

---

## 🧪 خطة الاختبار

- [ ] اختبار وحدة: خوارزمية `compute-risk-scores` — طالب غياب 30% + درجة 40 → risk_score محدد ومستوى `high`
- [ ] اختبار pg_cron: تشغيل `refresh_student_risk_levels()` → التحقق من تحديث `student_profiles.risk_level`
- [ ] اختبار pg_cron: تشغيل `send_risk_alerts()` → التحقق من إنشاء `notifications` + `alert_sent=TRUE`
- [ ] اختبار RLS: المحاضر يرى فقط درجات الخطر لشعبه (`faculty_read_own_course_risk_flags`)
- [ ] اختبار UNIQUE: `(student_id, section_id, semester_id)` — لا يمكن تكرار الدرجة

---

*🔗 العودة إلى: [Master_Project_Plan.md](../Master_Project_Plan.md)*
