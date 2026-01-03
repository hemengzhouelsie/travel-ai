// app/api/plan/route.ts
import { NextResponse } from "next/server";

// 允许跨域（给前端 fetch 用）
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// 处理浏览器的预检请求
export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

// 真实接口
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { city, days, date_start, persona } = body;

    const response = {
      meta: {
        city,
        days,
        date_start,
        persona,
      },
      trip: {
        title: `${city} 行程与穿搭`,
        subtitle: `${days} 日旅行 · Outfit Plan`,
        days: [
          {
            day_index: 1,
            date: date_start,
            weekday_en: "WEDNESDAY",
            date_display: date_start,
            area: "市中心",
            headline: "城市漫步",
            one_liner: "轻松探索城市风景",
            schedule: [
              {
                time_range: "09:00-12:00",
                spot: "城市地标",
                map_query: city,
                what_to_do: ["拍照", "散步"],
                notes: "适合轻松出行",
              },
            ],
            outfit: {
              theme: "city chic",
              title_zh: "城市轻搭",
              subtitle_en: "City Casual",
              hero_images: {
                left: { name: "jacket_01.jpeg" },
                right: { name: "bag_01.jpeg" },
              },
              items: [
                {
                  slot: "jacket",
                  name: "jacket_01.jpeg",
                  display_name_zh: "外套",
                  copy: "适合城市步行的轻外套",
                },
                {
                  slot: "top",
                  name: "top_01.jpeg",
                  display_name_zh: "上衣",
                  copy: "舒适百搭",
                },
                {
                  slot: "bottom",
                  name: "bot_01.jpeg",
                  display_name_zh: "下装",
                  copy: "适合长时间步行",
                },
                {
                  slot: "shoes",
                  name: "shoe_01.jpeg",
                  display_name_zh: "鞋子",
                  copy: "舒适耐走",
                },
              ],
            },
          },
        ],
      },
    };

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { error: "PLAN_GENERATION_FAILED", message: err?.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
