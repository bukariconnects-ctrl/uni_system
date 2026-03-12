import { getKnowledgeDocuments } from "./actions";
import { KnowledgeClient } from "./knowledge-client";

export default async function KnowledgePage() {
  const documents = await getKnowledgeDocuments();

  return <KnowledgeClient documents={documents} />;
}
