import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from "@/lib/admin/adminRouteAccess.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAuthenticatedRouteAccess(request);
  } catch (error) {
    if (error instanceof AdminRouteAccessError) {
      return NextResponse.json({ error: "login_required" }, { status: 401 });
    }
    throw error;
  }

  try {
    const { message } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY || process.env.TRANSLATION_PROVIDER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        replyKo: "우와! 질문해줘서 고마워. 한국 여행이나 예약에 대해 궁금한 점이 있다면 언제든 물어봐!",
        replyEn: "Wow! Thanks for asking. Feel free to ask me anything about traveling or booking in Korea!"
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const systemInstruction = `
      You are Kello, a friendly Korean local friend helping foreign travelers in Korea.
      
      CRITICAL INSTRUCTIONS:
      1. Keep your answer EXTREMELY concise (1-2 short sentences max).
      2. Be warm but skip unnecessary greetings or fluff.
      3. Reply about the user's query: "${message}".
      
      Return ONLY a raw JSON object (no markdown, no code block):
      {"replyKo":"Korean response","replyEn":"English translation"}
    `;

    const result = await model.generateContent(systemInstruction);
    const text = result.response.text().trim();

    // Strip markdown code blocks if present
    let cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Extract JSON object via regex as last resort
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleaned = jsonMatch[0];

    const parsed = JSON.parse(cleaned);

    return NextResponse.json({
      replyKo: parsed.replyKo,
      replyEn: parsed.replyEn
    });
  } catch (error) {
    console.error("Kello AI Error:", error);
    return NextResponse.json({
      replyKo: "조금 더 자세히 말해줄 수 있어? 더 잘 도와줄게!",
      replyEn: "Could you tell me a bit more? I'd love to help better!"
    });
  }
}
