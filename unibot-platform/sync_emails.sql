-- =============================================================
-- مزامنة الإيميلات من auth.users إلى public.profiles
-- تشغّل هذا الـ Script مرة واحدة في Supabase SQL Editor
-- =============================================================

-- 1. عرض المقارنة قبل التعديل
SELECT
  p.id,
  p.first_name || ' ' || p.last_name AS full_name,
  p.role,
  p.email        AS profile_email,
  u.email        AS auth_email,
  CASE
    WHEN p.email IS NULL THEN '⚠️ مفقود في profiles'
    WHEN p.email <> u.email THEN '❌ غير متطابق'
    ELSE '✅ متطابق'
  END AS status
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY status DESC, full_name;

-- =============================================================
-- 2. تحديث كل إيميلات profiles لتطابق auth.users
--    (يعدّل فقط السجلات التي تختلف أو تكون فارغة)
-- =============================================================
UPDATE public.profiles p
SET
  email      = u.email,
  updated_at = now()
FROM auth.users u
WHERE u.id = p.id
  AND (p.email IS DISTINCT FROM u.email);

-- =============================================================
-- 3. التحقق بعد التعديل
-- =============================================================
SELECT
  p.id,
  p.first_name || ' ' || p.last_name AS full_name,
  p.role,
  p.email       AS profile_email,
  u.email       AS auth_email,
  CASE
    WHEN p.email = u.email THEN '✅ متزامن'
    ELSE '❌ لا يزال مختلفاً'
  END AS sync_status
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY sync_status, full_name;

-- =============================================================
-- 4. إنشاء Trigger لمزامنة تلقائية مستقبلاً
--    يتفعّل عند تغيير الإيميل في auth.users
-- =============================================================

CREATE OR REPLACE FUNCTION sync_auth_email_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- عند تغيير إيميل المستخدم في auth.users نزامنه تلقائياً
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
    SET email = NEW.email, updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- تفعيل الـ Trigger على auth.users
DROP TRIGGER IF EXISTS on_auth_email_change ON auth.users;
CREATE TRIGGER on_auth_email_change
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_email_to_profile();

-- رسالة تأكيد
DO $$
BEGIN
  RAISE NOTICE '✅ تمت مزامنة الإيميلات وإنشاء Trigger التلقائي بنجاح';
END $$;
