import { getConversations } from "./actions";
import { UnibotClient } from "./unibot-client";
import { requireRole } from "@/lib/auth/get-user";

export default async function UnibotPage() {
  const { profile } = await requireRole(["student"]);
  const conversations = await getConversations();

  return (
    <UnibotClient
      conversations={conversations}
      profileId={profile.id}
      tenantId={profile.tenant_id!}
      studentName={`${profile.first_name} ${profile.last_name}`}
    />
  );
}
