import { createServiceClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = "gemini-2.5-flash";

export async function generateAutoRecommendation({
  studentId,
  courseId,
  courseName,
  grade,
  maxGrade,
  tenantId,
}: {
  studentId: string;
  courseId: string;
  courseName: string;
  grade: number;
  maxGrade: number;
  tenantId: string;
}) {
  if (maxGrade <= 0) return;

  const percentage = (grade / maxGrade) * 100;

  if (percentage >= 60 && percentage <= 90) return;

  let title: string;
  let systemPrompt: string;

  if (percentage < 60) {
    title = "توصية تعليمية — تحسين الأداء";
    systemPrompt = `أنت مستشار أكاديمي خبير في منصة UniBot. الطالب حصل على درجة ${Math.round(percentage)}% في مادة "${courseName}" وهي درجة ضعيفة.

ممنوع منعاً باتاً الاكتفاء بالتشجيع العام. يجب أن تتكون إجابتك من الأقسام التالية حصراً بتنسيق Markdown:

1. **تحليل سريع:** جملة تشجيعية واحدة قصيرة.
2. **قنوات يوتيوب مقترحة:** اذكر أسماء 3 قنوات يوتيوب (عربية أو أجنبية) مشهورة بشرح مادة ${courseName}، مع وصف مختصر لكل قناة.
3. **مراجع وكتب:** اذكر اسم كتاب عالمي مرجعي لفهم ${courseName} مع اسم المؤلف إن أمكن.
4. **منصات تدريب:** اقترح منصة تفاعلية (مثل Coursera، W3Schools، Khan Academy، أو منصات متخصصة) للتدريب العملي.

تنبيهات هامة:
- لا تكتب روابط (URLs) — اكتب أسماء القنوات والكتب والمنصات فقط.
- لا تضف أي أقسام غير المذكورة أعلاه.
- استخدم تنسيق Markdown النظيف (عناوين، نقاط، تنسيق غامق).`;
  } else {
    title = "توصية تعليمية — إثراء معرفي";
    systemPrompt = `أنت مستشار أكاديمي خبير في منصة UniBot. الطالب حصل على درجة ممتازة ${Math.round(percentage)}% في مادة "${courseName}".

ممنوع منعاً باتاً الاكتفاء بالتهنئة العامة. يجب أن تتكون إجابتك من الأقسام التالية حصراً بتنسيق Markdown:

1. **تهنئة:** جملة تهنئة قصيرة.
2. **مواضيع متقدمة:** اشرح 3 مواضيع متقدمة يمكن للطالب استكشافها بعد ${courseName} (مثل شهادات مهنية: CCNA، AWS، وما يشابهها).
3. **قنوات يوتيوب:** اذكر قنوات يوتيوب متخصصة تقدم محتوى متقدماً في هذه المواضيع.
4. **منصات تدريب متقدمة:** اقترح منصات مثل LeetCode، HackerRank، Coursera، Udemy للتعمق.

تنبيهات هامة:
- لا تكتب روابط (URLs) — اكتب أسماء القنوات والمنصات فقط.
- لا تضف أي أقسام غير المذكورة أعلاه.
- استخدم تنسيق Markdown النظيف (عناوين، نقاط، تنسيق غامق).`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: systemPrompt });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `قدّم توصيات للطالب في مادة ${courseName}` }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 2048 },
    });

    const bodyText = result.response.text();

    const serviceClient = createServiceClient();
    await serviceClient.from("student_recommendations").insert({
      tenant_id: tenantId,
      student_id: studentId,
      course_id: courseId,
      sent_by: null,
      title,
      body: bodyText,
      is_read: false,
    });
  } catch (err) {
    console.error("[RecommendationEngine] Failed:", err);
  }
}
