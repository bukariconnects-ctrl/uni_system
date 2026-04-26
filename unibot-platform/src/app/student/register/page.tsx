import { getAvailableSections } from "./actions";
import { RegisterClient } from "./register-client";
import { BookOpen } from "lucide-react";

export default async function StudentRegisterPage() {
  const { semester, sections, labSections } = await getAvailableSections();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-action-blue/10">
          <BookOpen className="h-6 w-6 text-action-blue" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">التسجيل الذاتي</h1>
          <p className="text-sm text-text-secondary">سجّل في المقررات المتاحة لهذا الفصل الدراسي</p>
        </div>
      </div>

      <RegisterClient
        semester={semester}
        sections={sections as any}
        labSections={labSections as any}
      />
    </div>
  );
}
