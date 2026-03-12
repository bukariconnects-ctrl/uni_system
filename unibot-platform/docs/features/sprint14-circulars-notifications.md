# Sprint 14: التعاميم والإشعارات [FR-AM4.1, FR-ST1.x]

## الوصف
بناء نظام التعاميم الأكاديمية مع استهداف الجمهور، وجرس الإشعارات الفوري عبر Supabase Realtime.

## Server Actions

### الإدارة الأكاديمية — التعاميم
- `getCirculars()` — جلب جميع التعاميم
- `createCircular(formData)` — إنشاء تعميم مع استهداف الجمهور
- `publishCircular(id)` — نشر التعميم
- `deleteCircular(id)` — حذف التعميم

## مكونات UI

### NotificationBell (`src/components/notification-bell.tsx`)
- جرس إشعارات عالمي يُدمج في أي sidebar
- يستخدم Supabase Realtime (`postgres_changes` على `notifications`)
- عداد الإشعارات غير المقروءة
- قائمة منسدلة مع تمرير
- تحديد كمقروء (فردي/جماعي)
- ألوان مخصصة حسب `notification_type`

### CircularsClient
- إنشاء تعاميم مع اختيار الفئة المستهدفة (7 أنواع)
- دعم التعاميم الإلزامية (بانر أحمر)
- نشر/حذف التعاميم
- عرض حالة النشر والاستهداف

## الدمج
- `NotificationBell` مُدمج في:
  - `src/app/faculty/components/sidebar.tsx`
  - `src/app/student/components/sidebar.tsx`
- رابط "التعاميم" مُضاف لـ:
  - `src/app/academic-management/components/sidebar.tsx`

## الملفات
- `src/components/notification-bell.tsx`
- `src/app/academic-management/circulars/actions.ts`
- `src/app/academic-management/circulars/page.tsx`
- `src/app/academic-management/circulars/circulars-client.tsx`
