import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "MISSING_GEMINI_API_KEY" }, { status: 500, headers: corsHeaders });
    }

    // 💡 核心改动：直接定义最终的 API 完整路径
    // 强制使用 v1 版本和 gemini-1.5-flash-latest，避开 v1beta 的 404 问题
    const targetUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const prompt = `你是旅行规划助手。请为 ${body.city} 生成 ${body.days} 天游玩行程和每日穿搭主题，输出中文。`;

    const geminiRes = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      }),
    });

    const geminiText = await geminiRes.text();

    if (!geminiRes.ok) {
      // 这里的 detail 会展示 Google 返回的真实错误
      return NextResponse.json({
        error: "GEMINI_CALL_FAILED",
        status: geminiRes.status,
        detail: geminiText,
        attemptedUrl: "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest..." 
      }, { status: 500, headers: corsHeaders });
    }

    const geminiJson = JSON.parse(geminiText);
    const aiText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "未生成内容";

    return NextResponse.json({ ok: true, ai_text: aiText }, { headers: corsHeaders });

  } catch (err: any) {
    return NextResponse.json({ error: "SERVER_ERROR", message: err?.message }, { status: 500, headers: corsHeaders });
  }
}