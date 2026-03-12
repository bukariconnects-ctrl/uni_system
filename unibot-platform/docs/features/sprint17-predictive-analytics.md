# Sprint 17: Predictive Analytics Engine
## [FR-AM6.1, FR-FM5.1, NFR-AI2]

### الوصف
بناء محرك التحليلات التنبؤية الذي يحسب درجات الخطر الأكاديمي للطلاب ويعرضها في لوحات تحكم للإدارة الأكاديمية والمحاضرين مع إمكانية إرسال توصيات.

### المكونات

#### 1. Risk Score Computation API
- `src/app/api/analytics/compute-risk/route.ts`
- خوارزمية: `risk_score = absence_factor*0.4 + grade_factor*0.4 + engagement_factor*0.2`
- يحسب لكل (student, section, semester) ويُدرج في `student_risk_scores`
- يحسب `course_risk_flags` لكل شعبة (flagged إذا failure_rate >= 30% أو high_risk >= 30%)
- يستخدم `createAdminClient()` (Service Role) لتجاوز RLS

#### 2. Academic Management Analytics Dashboard
- `src/app/academic-management/analytics/actions.ts` — جلب بيانات الخطر + إرسال توصيات
- `src/app/academic-management/analytics/page.tsx` — Server Component
- `src/app/academic-management/analytics/analytics-client.tsx` — واجهة كاملة:
  - 4 بطاقات إحصائية (إجمالي/منخفض/مرتفع/حرج)
  - شريط توزيع مستويات الخطر بالألوان
  - بطاقات المقررات المُعلَّمة بالخطر (حد أحمر)
  - قائمة Risk Zone مع Progress Bar + عوامل الخطر
  - زر "إعادة حساب" لتشغيل compute-risk
  - فلتر بالفصل الدراسي
  - Modal إرسال توصية

#### 3. Faculty Risk Zone
- `src/app/faculty/risk-zone/actions.ts` — جلب درجات خطر طلاب شعب المحاضر
- `src/app/faculty/risk-zone/page.tsx` + `risk-zone-client.tsx`
- يعرض فقط طلاب شعب المحاضر (عبر RLS)
- كل صف: Avatar + اسم + Risk Badge + Progress Bar + عوامل + زر توصية

#### 4. Sidebar Updates
- Academic Management: إضافة "التحليلات التنبؤية" مع أيقونة BarChart3
- Faculty: إضافة "منطقة الخطر" مع أيقونة AlertTriangle

### خوارزمية الحساب
```
absence_factor = absence_percentage (من attendance_summaries)
grade_factor = MAX(0, (60 - total_grade) / 60 * 100)
engagement_factor = (1 - submitted/total_assignments) * 100
risk_score = absence*0.4 + grade*0.4 + engagement*0.2
risk_level: >= 75 critical, >= 50 high, >= 25 medium, else low
```
