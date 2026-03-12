import { requireRole } from "@/lib/auth/get-user";
import { getChannels, getConversations } from "./actions";
import { StudentMessagesClient } from "./messages-client";

export default async function StudentMessagesPage() {
  const { profile } = await requireRole(["student"]);
  const [channels, conversations] = await Promise.all([
    getChannels(),
    getConversations(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">الرسائل</h1>
        <p className="mt-1 text-sm text-text-secondary">المحادثات المباشرة وقنوات المقررات</p>
      </div>
      <StudentMessagesClient
        channels={channels}
        conversations={conversations}
        currentUserId={profile.id}
        tenantId={profile.tenant_id!}
      />
    </div>
  );
}
