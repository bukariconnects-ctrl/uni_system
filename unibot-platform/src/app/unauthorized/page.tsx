import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10">
          <span className="text-3xl">🚫</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary">غير مصرح</h1>
        <p className="mt-2 text-sm text-text-secondary">
          ليس لديك صلاحية للوصول إلى هذه الصفحة
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-action-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
