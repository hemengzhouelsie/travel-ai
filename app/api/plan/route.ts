import { NextResponse } from "next/server";

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

    // 强制使用这个全称，它是 v1beta 路径下最稳的模型 ID
    const model = "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;


    const tripSchema = {
      type: "object",
      properties: {
        meta: {
          type: "object",
          properties: {
            city: { type: "string" },
            days: { type: "integer" },
            date_start: { type: "string" },
            persona: {
              type: "object",
              properties: {
                gender: { type: "string" },
                style_keywords: { type: "array", items: { type: "string" } },
                budget_level: { type: "string" },
                walk_intensity: { type: "string" },
              },
            },
          },
          required: ["city", "days", "date_start"],
        },
        trip: {
          type: "object",
          properties: {
            title: { type: "string" },
            subtitle: { type: "string" },
            days: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day_index: { type: "integer" },
                  date: { type: "string" },
                  weekday_en: { type: "string" },
                  date_display: { type: "string" },
                  area: { type: "string" },
                  headline: { type: "string" },
                  one_liner: { type: "string" },
                  schedule: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        time_range: { type: "string" },
                        spot: { type: "string" },
                        map_query: { type: "string" },
                        what_to_do: { type: "array", items: { type: "string" } },
                        notes: { type: "string" },
                      },
                      required: ["time_range", "spot"],
                    },
                  },
                  outfit: {
                    type: "object",
                    properties: {
                      theme: { type: "string" },
                      image_card: {
                        type: "object",
                        properties: {
                          header_left: { type: "string" },
                          header_right: { type: "string" },
                          caption: { type: "string" },
                        },
                      },
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            slot: { type: "string" },
                            name: { type: "string" },
                            copy: { type: "string" },
                          },
                          required: ["slot", "name", "copy"],
                        },
                      },
                    },
                    required: ["theme", "items"],
                  },
                },
                required: ["day_index", "date", "headline", "outfit"],
              },
            },
          },
          required: ["title", "days"],
        },
      },
      required: ["meta", "trip"],
    };

    const prompt = `
你是“旅行行程 + 穿搭策划”助手。
用户信息：
- 城市：${body.city}
- 天数：${body.days}
- 出发日期：${body.date_start}
- persona：${JSON.stringify(body.persona ?? {})}

请输出符合 schema 的 JSON。
规则：
1) trip.days 数组长度等于 ${body.days}。
2) name 格式必须为: Female/jacket_02.jpeg 这种路径。
3) copy 写清楚选择理由。
`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: tripSchema,
        },
      }),
    });

    const rawText = await geminiRes.text();

    if (!geminiRes.ok) {
      return NextResponse.json(
        {
          error: "GEMINI_CALL_FAILED",
          status: geminiRes.status,
          detail: rawText,
          model,
        },
        { status: geminiRes.status, headers: corsHeaders }
      );
    }

    // ✅ 修复解析逻辑
    const asJson = JSON.parse(rawText);
    const aiContent = asJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiContent) {
      throw new Error("No content generated");
    }

    const parsed = JSON.parse(aiContent);
    return NextResponse.json(parsed, { headers: corsHeaders });

  } catch (err: any) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err?.message ?? "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

