"use client";

import { useState, useRef } from "react";
import { updateProfile, updatePassword, uploadAvatar } from "./actions";
import {
  User,
  Camera,
  Lock,
  Phone,
  Mail,
  Building2,
  GraduationCap,
  BookOpen,
  Briefcase,
  Shield,
  Save,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "مدير النظام",
  tenant_admin: "مدير الجامعة",
  academic_management: "إدارة أكاديمية",
  faculty: "عضو هيئة تدريس",
  student: "طالب",
};

const GENDER_OPTIONS = [
  { value: "male", label: "ذكر" },
  { value: "female", label: "أنثى" },
];

async function compressToWebp(file: File, quality: number = 0.5): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_SIZE = 512;
      let w = img.width;
      let h = img.height;
      if (w > h) {
        if (w > MAX_SIZE) { h = (h * MAX_SIZE) / w; w = MAX_SIZE; }
      } else {
        if (h > MAX_SIZE) { w = (w * MAX_SIZE) / h; h = MAX_SIZE; }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error("Failed to compress image"));
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}

export function ProfileClient({
  profile,
  email,
  studentProfile,
  facultyProfile,
  tenantName,
}: {
  profile: any;
  email: string;
  studentProfile: any;
  facultyProfile: any;
  tenantName: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url || "");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleProfileUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const loadingToast = toast.loading("جاري حفظ البيانات...");
    try {
      const fd = new FormData(e.currentTarget);
      await updateProfile(fd);
      toast.dismiss(loadingToast);
      toast.success("تم تحديث البيانات بنجاح");
    } catch (err: unknown) {
      toast.dismiss(loadingToast);
      const msg = err instanceof Error ? err.message : "حدث خطأ";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const loadingToast = toast.loading("جاري تغيير كلمة المرور...");
    try {
      const fd = new FormData(e.currentTarget);
      await updatePassword(fd);
      toast.dismiss(loadingToast);
      toast.success("تم تغيير كلمة المرور بنجاح");
      e.currentTarget.reset();
    } catch (err: unknown) {
      toast.dismiss(loadingToast);
      const msg = err instanceof Error ? err.message : "حدث خطأ";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const loadingToast = toast.loading("جاري رفع الصورة...");

    try {
      const webpBlob = await compressToWebp(file, 0.5);
      const webpFile = new File([webpBlob], "avatar.webp", { type: "image/webp" });

      const fd = new FormData();
      fd.set("avatar", webpFile);

      const newUrl = await uploadAvatar(fd);
      setAvatarPreview(newUrl);
      toast.dismiss(loadingToast);
      toast.success("تم تحديث الصورة بنجاح");
    } catch (err: unknown) {
      toast.dismiss(loadingToast);
      const msg = err instanceof Error ? err.message : "فشل رفع الصورة";
      toast.error(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">


      <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-ai-light to-ai-lavender">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-action-blue">
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="absolute -bottom-1 -left-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card-bg bg-action-blue text-white shadow-sm hover:bg-action-blue/90 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              {profile.first_name} {profile.last_name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-action-blue/20 px-3 py-1 text-xs font-medium text-action-blue">
                {ROLE_LABELS[profile.role] || profile.role}
              </span>
              {tenantName && (
                <span className="flex items-center gap-1 text-xs text-text-secondary">
                  <Building2 className="h-3 w-3" />
                  {tenantName}
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1 text-sm text-text-secondary">
              <Mail className="h-3.5 w-3.5" />
              {email}
            </p>
          </div>
        </div>
      </div>

      {studentProfile && (
        <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-text-primary">
            <GraduationCap className="h-5 w-5 text-action-blue" />
            البيانات الأكاديمية
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoField label="الرقم الجامعي" value={studentProfile.student_number} />
            <InfoField label="التخصص" value={studentProfile.majors?.name || "—"} />
            <InfoField label="القسم" value={studentProfile.majors?.departments?.name || "—"} />
            <InfoField label="المستوى" value={studentProfile.academic_levels ? `المستوى ${studentProfile.academic_levels.level_number} — ${studentProfile.academic_levels.name}` : "—"} />
            <InfoField label="سنة الالتحاق" value={studentProfile.enrollment_year?.toString() || "—"} />
            <InfoField label="المعدل التراكمي" value={studentProfile.cumulative_gpa ? `${studentProfile.cumulative_gpa.toFixed(2)}` : "—"} />
            <InfoField label="الساعات المعتمدة" value={`${studentProfile.earned_credit_hours || 0} / ${studentProfile.total_credit_hours || 0}`} />
          </div>
        </div>
      )}

      {facultyProfile && (
        <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-text-primary">
            <Briefcase className="h-5 w-5 text-action-blue" />
            البيانات الوظيفية
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoField label="الرقم الوظيفي" value={facultyProfile.employee_id || "—"} />
            <InfoField label="القسم" value={facultyProfile.departments?.name || "—"} />
            <InfoField label="الرتبة" value={facultyProfile.academic_rank || "—"} />
            <InfoField label="التخصص" value={facultyProfile.specialization || "—"} />
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-text-primary">
          <User className="h-5 w-5 text-action-blue" />
          البيانات الشخصية
        </h3>
        <form onSubmit={handleProfileUpdate} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">الاسم الأول</label>
            <input
              type="text"
              value={profile.first_name || ""}
              disabled
              className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-secondary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">الاسم الأخير</label>
            <input
              type="text"
              value={profile.last_name || ""}
              disabled
              className="w-full rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-secondary"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-text-primary">
              <Phone className="h-3 w-3" />
              رقم الهاتف
            </label>
            <input
              type="tel"
              name="phone"
              defaultValue={profile.phone || ""}
              dir="ltr"
              placeholder="+967..."
              className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-medium text-text-primary">
              <Shield className="h-3 w-3" />
              الجنس
            </label>
            <select
              name="gender"
              defaultValue={profile.gender || ""}
              className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
            >
              <option value="">غير محدد</option>
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-action-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card-bg p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-text-primary">
          <Lock className="h-5 w-5 text-action-blue" />
          تغيير كلمة المرور
        </h3>
        <form onSubmit={handlePasswordUpdate} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">كلمة المرور الجديدة</label>
            <input
              type="password"
              name="new_password"
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-primary">تأكيد كلمة المرور</label>
            <input
              type="password"
              name="confirm_password"
              required
              minLength={6}
              className="w-full rounded-lg border border-border bg-card-bg px-3 py-2 text-sm outline-none focus:border-action-blue"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-action-blue px-6 py-2.5 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              {loading ? "جاري التحديث..." : "تغيير كلمة المرور"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-text-secondary">{label}</label>
      <p className="rounded-lg border border-border bg-app-bg px-3 py-2 text-sm text-text-primary">{value}</p>
    </div>
  );
}
