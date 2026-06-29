import { getMyCoursesForRegistration } from "./actions";
import { RegisterClient } from "./register-client";
import { BookOpen } from "lucide-react";

export default async function StudentRegisterPage() {
  const data = await getMyCoursesForRegistration();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-action-blue/20">
          <BookOpen className="h-6 w-6 text-action-blue" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">التسجيل الذاتي</h1>
          <p className="text-sm text-text-secondary">سجّل في المقررات المتاحة حسب خطتك الدراسية</p>
        </div>
      </div>

      <RegisterClient
        semester={data.semester}
        courses={data.courses as any}
      />
    </div>
  );
}
