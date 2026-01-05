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

    // ✅ 用官方文档示例中出现的可用模型
    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // ✅ 你的前端要的结构（TripResponse）
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
                            slot: { type: "string" },   // jacket/top/bottom/bag/shoes 或 dress 等
                            name: { type: "string" },   // 例如 "Female/jacket_02.jpeg"
                            copy: { type: "string" },   // ✅ 这里放“选择理由”
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

请输出【严格符合 schema 的 JSON】（不要 Markdown，不要多余文字）。

规则：
1) trip.days 数组长度必须等于 meta.days，每天 day_index 从 1 开始递增。
2) 每天 outfit.items 给出 4~5 个单品（可包含 jacket/top/bottom/dress/bag/shoes），
   name 必须是“可访问的静态资源路径片段”，格式类似：
   - Female/jacket_02.jpeg
   - Female/dress_01.jpeg
   - Male/top_03.jpeg
3) copy 字段写清楚“为什么选这件”：结合当天行程/天气感/步行强度/风格关键词（这是你最重要的输出）。
4) 如果某天不需要某类单品，就不要输出那个 slot（不要给 top_none 这种占位）。
`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey, // ✅ 官方 REST 示例用这个 header
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
          attemptedUrl: url,
          model,
        },
        { status: 500, headers: corsHeaders }
      );
    }

    // ✅ 兼容两种情况：
    // 1) 返回是 { candidates: [ { content: { parts:[{text:"{...json...}"}] } } ] }
    // 2) 直接就是 JSON（少见，但做个兼容）
    let parsed: any;
    try {
      const asJson = JSON.parse(rawText);
      const maybeText = asJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      parsed = maybeText ? JSON.parse(maybeText) : asJson;
    } catch {
      // 如果 rawText 本身就是 JSON 字符串但被转义，兜底再试一次
      parsed = JSON.parse(rawText.replace(/\\"/g, '"'));
    }

    return NextResponse.json(parsed, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: err?.message ?? "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
