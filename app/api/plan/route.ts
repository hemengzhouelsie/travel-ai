import { NextResponse } from "next/server";

/**
 * 强制使用 Node.js runtime，确保稳定性
 */
export const runtime = "nodejs";

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
      return NextResponse.json(
        { error: "MISSING_GEMINI_API_KEY" },
        { status: 500, headers: corsHeaders }
      );
    }

    // 使用已经确认跑通的 Gemini 2.0 路径
    const model = "gemini-2.0-flash";
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // 1. 构建 Prompt
    const prompt = `你是旅行规划助手。请为 ${body.city} 生成 ${body.days} 天详细游玩行程和每日穿搭主题。
    要求：输出中文，结构清晰。包含景点名称、活动建议和穿搭推荐。`;

    // 2. 正式调用 Gemini API
    const geminiRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
        }
      }),
    });

    const geminiText = await geminiRes.text();

    // 3. 错误处理
    if (!geminiRes.ok) {
      return NextResponse.json(
        {
          error: "GEMINI_CALL_FAILED",
          status: geminiRes.status,
          detail: geminiText,
        },
        { status: geminiRes.status, headers: corsHeaders }
      );
    }

    // 4. 解析 AI 返回内容
    const geminiJson = JSON.parse(geminiText);
    const aiText =
      geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "未生成内容";

    /**
     * 5. ✅ 关键修复：返回前端预期的数据结构
     * 确保包含了 days 等前端渲染必须读取的字段
     */
    return NextResponse.json(
      {
        ok: true,
        ai_text: aiText,
        // 下面是补充给前端的元数据，防止渲染时 undefined 报错
        city: body.city,
        days: body.days,
        date_start: body.date_start,
      },
      { headers: corsHeaders }
    );

  } catch (err: any) {
    console.error("API Route Error:", err);
    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message: err?.message ?? "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}