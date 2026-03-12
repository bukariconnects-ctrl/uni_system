# Sprint 18: Ticketing & AI Pre-resolution
## [FR-ST6.1, FR-ST6.2, FR-FM6.1]

### الوصف
بناء نظام التذاكر الأكاديمية مع خطوة AI Pre-resolution التي تستشير UniBot أولاً قبل فتح التذكرة.

### المكونات

#### 1. Ticket Actions (Student/Faculty Shared)
- `src/app/student/tickets/actions.ts`
- `getMyTickets()` — جلب تذاكر المستخدم
- `createTicket()` — إنشاء تذكرة مع دعم AI Pre-resolution
- `getTicketMessages()` — جلب رسائل التذكرة (non-internal فقط)
- `sendTicketMessage()` — إرسال رد على التذكرة
- `rateTicket()` — تقييم خدمة التذكرة (1-5 نجوم)
- `getAiSuggestion()` — استدعاء UniBot Chat API للحصول على اقتراح
- `getStudentSections()` — جلب شعب الطالب/المحاضر

#### 2. Multi-Step Ticket Creation UI
- `src/app/student/tickets/tickets-client.tsx`
- **خطوة 1:** نموذج الوصف (نوع/عنوان/وصف/شعبة)
- **خطوة 2:** AI Pre-resolution — استشارة UniBot
  - إذا وُجد اقتراح → عرضه بإطار أصفر مع زرين: "يحل مشكلتي" / "سأواصل فتح التذكرة"
  - إذا قبل المستخدم → إغلاق التذكرة فوراً (`status: closed`, `ai_attempted: true`)
  - إذا لم يوجد اقتراح → الانتقال للخطوة 3
- **خطوة 3:** تأكيد وإرسال التذكرة
- Progress Steps UI (3 خطوات مُرقَّمة)

#### 3. Ticket List UI
- بطاقات قابلة للتوسيع مع أيقونات الحالة الملوّنة
- عرض: ticket_number, category, status badge, AI badge
- توسيع: الوصف, AI suggestion, الرسائل, نموذج رد, تقييم النجوم

#### 4. Faculty Tickets (Thin Wrapper)
- `src/app/faculty/tickets/page.tsx` — يستورد من student/tickets

#### 5. Sidebar Updates
- Student: إضافة "تذاكري" مع أيقونة Ticket
- Faculty: إضافة "تذاكري" مع أيقونة Ticket

### AI Pre-resolution Flow
```
User types description → getAiSuggestion(description) → Chat API
  ├─ AI has answer → Show suggestion card
  │   ├─ User accepts → Create ticket with status:"closed", ai_attempted:true
  │   └─ User rejects → Create ticket with status:"open", ai_attempted:true
  └─ AI has no answer → Skip to step 3
      └─ Create ticket with status:"open", ai_attempted:false
```
