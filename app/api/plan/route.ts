// app/api/plan/route.ts
import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

type PlanReq = {
  city: string;
  days: number;
  date_start: string;
  persona?: {
    gender?: string; // "male" | "female"
    style_keywords?: string[];
    budget_level?: string;
    walk_intensity?: string;
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PlanReq;
    const { city, days, date_start, persona } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "MISSING_GEMINI_API_KEY", message: "No GEMINI_API_KEY in Vercel env." },
        { status: 500, headers: corsHeaders }
      );
    }

    // 你也可以换成别的模型；这里用 flash 类模型速度快、便宜
    // Gemini 的 REST 形式是 .../models/<model>:generateContent，并用 X-goog-api-key 传 key
    const model = "gemini-1.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // 让 Gemini “只输出 JSON（不要 markdown）”，否则你 parse 会炸
    const systemInstruction = `
You are a travel + outfit planning API.
Return ONLY valid JSON (no markdown, no code fences).
The JSON MUST follow this schema:

{
  "meta": {
    "city": string,
    "days": number,
    "date_start": string,
    "persona": {
      "gender": "male" | "female",
      "style_keywords": string[],
      "budget_level": string,
      "walk_intensity": string
    }
  },
  "trip": {
    "title": string,
    "subtitle": string,
    "days": [
      {
        "day_index": number,
        "date": string,
        "weekday_en": string,
        "date_display": string,
        "area": string,
        "headline": string,
        "one_liner": string,
        "schedule": [
          {
            "time_range": string,
            "spot": string,
            "map_query": string,
            "what_to_do": string[],
            "notes": string
          }
        ],
        "outfit": {
          "theme": string,
          "title_zh": string,
          "subtitle_en": string,
          "hero_images": {
            "left": { "name": string },
            "right": { "name": string }
          },
          "items": [
            {
              "slot": "jacket" | "top" | "bottom" | "bag" | "shoes",
              "name": string,
              "display_name_zh": string,
              "copy": string
            }
          ]
        }
      }
    ]
  }
}

IMPORTANT:
- outfit.items[].name must be ONE OF:
  jacket_01.jpeg, jacket_02.jpeg, top_01.jpeg, top_02.jpeg, bot_01.jpeg, bot_02.jpeg, bag_01.jpeg, bag_02.jpeg, shoe_01.jpeg, shoe_02.jpeg
- Use "bot_XX.jpeg" for bottom.
- days length must equal meta.days.
`;

    const userPrompt = `
Input:
city=${city}
days=${days}
date_start=${date_start}
persona=${JSON.stringify(persona || {})}

Generate a stylish itinerary + outfit plan.
`;

    const geminiRes = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey as string,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: systemInstruction + "\n\n" + userPrompt }] }],
        generationConfig: {
          temperature: 0.7,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "");
      return NextResponse.json(
        { error: "GEMINI_CALL_FAILED", status: geminiRes.status, detail: errText },
        { status: 500, headers: corsHeaders }
      );
    }

    const data = await geminiRes.json();

    // Gemini 返回文本一般在 candidates[0].content.parts[0].text
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n") || "";

    if (!text) {
      return NextResponse.json(
        { error: "EMPTY_GEMINI_RESPONSE", raw: data },
        { status: 500, headers: corsHeaders }
      );
    }

    // 兜底：有时模型会多吐前后空白
    const jsonStr = text.trim();
    const plan = JSON.parse(jsonStr);

    return NextResponse.json(plan, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { error: "PLAN_GENERATION_FAILED", message: err?.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
