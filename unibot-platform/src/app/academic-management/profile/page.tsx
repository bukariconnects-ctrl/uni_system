import { getProfileData } from "@/app/(shared)/profile/actions";
import { ProfileClient } from "@/app/(shared)/profile/profile-client";

export default async function AcademicManagementProfilePage() {
  const { user, profile, studentProfile, facultyProfile, tenantName } = await getProfileData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">الملف الشخصي</h1>
        <p className="mt-1 text-sm text-text-secondary">عرض وتعديل بياناتك الشخصية</p>
      </div>
      <ProfileClient
        profile={profile}
        email={user.email!}
        studentProfile={studentProfile}
        facultyProfile={facultyProfile}
        tenantName={tenantName}
      />
    </div>
  );
}
