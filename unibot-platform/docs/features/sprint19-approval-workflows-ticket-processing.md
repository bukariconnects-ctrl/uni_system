# Sprint 19: Approval Workflows & Ticket Processing
## [FR-AM5.4, FR-AM5.5, FR-AM6.2]

### الوصف
بناء واجهة إدارة التذاكر للإدارة الأكاديمية مع مسارات الموافقات متعددة الخطوات والإشعارات في الوقت الفعلي.

### المكونات

#### 1. Ticket Processing Actions
- `src/app/academic-management/tickets/actions.ts`
- `getAllTickets()` — جلب كل التذاكر مع فلتر الحالة
- `getTicketDetail()` — جلب تذكرة + رسائل + مسارات موافقة
- `updateTicketStatus()` — تغيير حالة التذكرة + إشعار للطالب
- `assignTicket()` — تعيين التذكرة لموظف
- `sendAdminTicketMessage()` — إرسال رد (عام/داخلي)
- `createApprovalWorkflow()` — إضافة خطوة موافقة
- `decideApproval()` — اتخاذ قرار (موافقة/رفض)
- `getStaffMembers()` — جلب قائمة موظفي الإدارة

#### 2. Ticket Admin UI
- `src/app/academic-management/tickets/page.tsx` — Server Component
- `src/app/academic-management/tickets/tickets-admin-client.tsx` — واجهة كاملة:
  - 4 بطاقات إحصائية (إجمالي/مفتوحة/قيد المعالجة/تم الحل)
  - فلتر بالحالة (7 أزرار)
  - قائمة تذاكر قابلة للتوسيع
  - Status Transition Buttons (حسب المسار المسموح)
  - Assign dropdown لتعيين الموظفين
  - Approval Workflow UI (خطوات مرقّمة مع أزرار موافقة/رفض)
  - رسائل عامة/داخلية (internal notes بلون بنفسجي)
  - AI suggestion badge (Sparkles icon)
  - Star rating display

#### 3. Status Transitions
```
open → in_progress, rejected, closed
in_progress → pending_info, resolved, rejected
pending_info → in_progress, resolved, closed
resolved → closed
closed → (لا انتقالات)
rejected → (لا انتقالات)
```

#### 4. Approval Workflow Flow
```
Admin adds approver → Creates workflow step (pending)
Approver clicks approve/reject → Updates step status + notes
Multiple steps supported (step_order ascending)
```

#### 5. Notifications
- تغيير حالة التذكرة → إشعار فوري للطالب عبر `notifications` table
- DB trigger `notify_ticket_status_change` يعمل بالتوازي

#### 6. Sidebar Updates
- Academic Management: إضافة "إدارة التذاكر" مع أيقونة Ticket
