import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/get-user";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function chunkText(text: string, maxTokens = 800, overlap = 100): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + maxTokens, words.length);
    chunks.push(words.slice(start, end).join(" "));
    start = end - overlap;
    if (start >= words.length) break;
    if (end === words.length) break;
  }

  return chunks.filter((c) => c.trim().length > 0);
}

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

export async function POST(request: NextRequest) {
  try {
    const { profile } = await requireRole([
      "tenant_admin",
      "faculty",
      "super_admin",
    ]);

    const body = await request.json();
    const { document_id } = body;

    if (!document_id) {
      return NextResponse.json(
        { error: "document_id مطلوب" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: doc, error: docError } = await supabase
      .from("ai_knowledge_documents")
      .select("*")
      .eq("id", document_id)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { error: "الوثيقة غير موجودة" },
        { status: 404 }
      );
    }

    let fullText = "";

    if (doc.file_url) {
      try {
        const response = await fetch(doc.file_url);
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("text") || contentType.includes("json")) {
          fullText = await response.text();
        } else {
          const buffer = await response.arrayBuffer();
          const uint8 = new Uint8Array(buffer);
          let textContent = "";
          for (let i = 0; i < uint8.length; i++) {
            if (uint8[i] >= 32 && uint8[i] <= 126) {
              textContent += String.fromCharCode(uint8[i]);
            } else if (uint8[i] === 10 || uint8[i] === 13) {
              textContent += "\n";
            } else {
              textContent += " ";
            }
          }
          fullText = textContent
            .replace(/\s{3,}/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
        }
      } catch {
        return NextResponse.json(
          { error: "فشل تنزيل الملف" },
          { status: 500 }
        );
      }
    }

    if (!fullText || fullText.trim().length < 10) {
      return NextResponse.json(
        { error: "لا يوجد محتوى نصي كافٍ للمعالجة" },
        { status: 400 }
      );
    }

    const chunks = chunkText(fullText);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "لا يوجد أجزاء نصية للمعالجة" },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();

    await adminClient
      .from("ai_document_chunks")
      .delete()
      .eq("document_id", document_id);

    let totalTokens = 0;

    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    const batchSize = 20;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      const embeddings: number[][] = [];
      for (const chunk of batch) {
        const result = await embeddingModel.embedContent(chunk);
        embeddings.push(result.embedding.values);
        totalTokens += estimateTokens(chunk);
      }

      const insertData = embeddings.map((emb, idx) => ({
        tenant_id: doc.tenant_id,
        document_id: document_id,
        chunk_index: i + idx,
        content: batch[idx],
        page_number: Math.floor((i + idx) / 3) + 1,
        timestamp_sec: null,
        embedding: JSON.stringify(emb),
        token_count: estimateTokens(batch[idx]),
      }));

      const { error: insertError } = await adminClient
        .from("ai_document_chunks")
        .insert(insertData);

      if (insertError) {
        return NextResponse.json(
          { error: "فشل إدراج الأجزاء: " + insertError.message },
          { status: 500 }
        );
      }
    }

    await adminClient
      .from("ai_knowledge_documents")
      .update({ total_chunks: chunks.length })
      .eq("id", document_id);

    await adminClient.from("ai_token_usage").insert({
      tenant_id: doc.tenant_id,
      user_id: profile.id,
      model: "gemini-embedding-001",
      prompt_tokens: totalTokens,
      completion_tokens: 0,
      total_tokens: totalTokens,
      cost_usd: 0,
    });

    return NextResponse.json({
      success: true,
      total_chunks: chunks.length,
      tokens_used: totalTokens,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "خطأ غير متوقع";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
