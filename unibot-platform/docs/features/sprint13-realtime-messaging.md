# Sprint 13: المراسلات الفورية [FR-FM4.1, FR-ST4.1, FR-ST4.3]

## الوصف
بناء نظام المراسلات الفورية مع قنوات المقررات والمحادثات المباشرة، مدعوم بـ Supabase Realtime.

## Server Actions (مشتركة بين المحاضر والطالب)
- `getChannels()` — قنوات المستخدم عبر `channel_members`
- `getConversations()` — المحادثات المباشرة مع عرض الطرف الآخر
- `getMessages(type, targetId)` — رسائل قناة أو محادثة (آخر 100)
- `sendMessage(formData)` — إرسال رسالة (channel/direct)
- `startConversation(targetUserId)` — بدء محادثة جديدة أو استرجاع القائمة
- `searchUsers(query)` — بحث عن مستخدمين للمحادثة

## Supabase Realtime
- الاشتراك في `postgres_changes` على جدول `messages`
- فلترة بـ `channel_id` أو `conversation_id`
- Optimistic UI: الرسالة تظهر فوراً ثم تُزال عند الفشل
- Auto-scroll لآخر رسالة

## مكونات UI
- **Split Screen**: قائمة المحادثات (يسار) + نافذة الدردشة (يمين)
- **قنوات المقررات**: تُنشأ تلقائياً بواسطة `auto_create_course_channel` trigger
- **محادثات مباشرة**: بدء محادثة جديدة عبر البحث
- **Optimistic Messages**: رسائل فورية مع rollback عند الخطأ

## الملفات
- `src/app/faculty/messages/actions.ts`
- `src/app/faculty/messages/page.tsx`
- `src/app/faculty/messages/messages-client.tsx`
- `src/app/student/messages/actions.ts`
- `src/app/student/messages/page.tsx`
- `src/app/student/messages/messages-client.tsx`
