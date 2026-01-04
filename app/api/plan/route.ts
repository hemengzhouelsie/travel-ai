import { NextResponse } from "next/server";

/**
 * ⚠️ 非常重要：
 * 强制使用 Node.js runtime，避免 Edge 环境行为不一致
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

    /**
     * 🧨 如果你还能看到旧的 gemini-1.5-flash-latest 报错，
     * 说明你请求根本没打到这份代码
     */
    const model = "gemini-2.0-flash";
    const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    /**
     * 🔎 调试标记：先直接返回，确认命中这份代码
     * —— 第一次测试一定要保留！
     */
    return NextResponse.json(
      {
        ok: true,
        marker: "HIT_NEW_ROUTE_2026-01-05",
        model,
        targetUrl,
        receivedBody: body,
      },
      { headers: corsHeaders }
    );

    /**
     * ⬇️⬇️⬇️
     * ⬇️⬇️⬇️
     * 确认 marker 正确后，把上面的 return 删掉，
     * 再启用下面的真实 Gemini 调用
     * ⬇️⬇️⬇️
     * ⬇️⬇️⬇️
     */

    /*
    const prompt = `你是旅行规划助手。请为 ${body.city} 生成 ${body.days} 天游玩行程和每日穿搭主题，输出中文。`;

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
      }),
    });

    const geminiText = await geminiRes.text();

    if (!geminiRes.ok) {
      return NextResponse.json(
        {
          error: "GEMINI_CALL_FAILED",
          status: geminiRes.status,
          detail: geminiText,
          attemptedUrl: targetUrl,
        },
        { status: geminiRes.status, headers: corsHeaders }
      );
    }

    const geminiJson = JSON.parse(geminiText);
    const aiText =
      geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "未生成内容";

    return NextResponse.json(
      {
        ok: true,
        ai_text: aiText,
      },
      { headers: corsHeaders }
    );
    */
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message: err?.message ?? "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
