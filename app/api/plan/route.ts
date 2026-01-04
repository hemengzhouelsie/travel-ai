// app/api/plan/route.ts
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

type PlanReq = {
  city: string;
  days: number;
  date_start: string;
  persona: {
    gender: "female" | "male";
    style_keywords: string[];
    budget_level: "mid";
    walk_intensity: "low" | "medium" | "high";
  };
};

const pad2 = (n: number) => String(n).padStart(2, "0");

const weekdayEn = (d: Date) => {
  const w = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
  return w[d.getDay()];
};

function addDays(dateStr: string, plus: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + plus);
  return d;
}

// 这里按你的文件夹：public/assets/Female/xxx.jpeg
function imgPath(gender: "female" | "male", file: string) {
  const folder = gender === "female" ? "Female" : "Male";
  return `${folder}/${file}`; // 注意：只返回 name，不带 /assets/，前端自己拼
}

// 简单选图（你可以之后做更复杂的挑选）
function pick(index: number, arr: string[]) {
  return arr[index % arr.length];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PlanReq;

    const city = body.city || "城市";
    const days = Math.max(1, Math.min(7, Number(body.days || 2)));
    const dateStart = body.date_start || "2026-01-01";

    const gender = body.persona?.gender === "male" ? "male" : "female";

    // 你现有图片命名（按你 repo 里那些）
    const jackets = ["jacket_01.jpeg","jacket_02.jpeg","jacket_03.jpeg","jacket_04.jpeg"];
    const tops = ["top_01.jpeg","top_02.jpeg","top_03.jpeg","top_04.jpeg","top_05.jpeg"];
    const bots = ["bot_01.jpeg","bot_02.jpeg","bot_03.jpeg","bot_04.jpeg","bot_05.jpeg","bot_06.jpeg","bot_07.jpeg"];
    const dresses = ["dress_01.jpeg","dress_02.jpeg","dress_03.jpeg","dress_04.jpeg"];
    const bags = ["bag_01.jpeg","bag_02.jpeg","bag_03.jpeg","bag_04.jpeg","bag_05.jpeg"];
    const shoes = ["shoe_01.jpeg","shoe_02.jpeg","shoe_03.jpeg","shoe_04.jpeg","shoe_05.jpeg","shoe_06.jpeg"];
    const topNone = "Top_none.jpeg"; // 你 repo 里是 Female/Top_none.jpeg（大小写这样）

    const tripDays = Array.from({ length: days }).map((_, i) => {
      const d = addDays(dateStart, i);
      const date = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
      const dateDisplay = `${d.getFullYear()}/${pad2(d.getMonth()+1)}/${pad2(d.getDate())}`;
      const weekday = weekdayEn(d);

      // 每 2 天给一天连衣裙（示例）
      const useDress = gender === "female" && i % 2 === 1;

      const jacketFile = pick(i, jackets);
      const bagFile = pick(i, bags);

      const bottomFile = useDress ? pick(i, dresses) : pick(i, bots);
      const topFile = useDress ? topNone : pick(i, tops);

      const items = [
        {
          slot: "jacket",
          name: imgPath(gender, jacketFile),
          display_name_zh: "外套/外搭",
          copy: "今天行程会在室内外来回切换、且可能有风或小雨；轻薄外搭便于叠穿与随时穿脱，走路时也更灵活。",
        },
        {
          slot: "top",
          name: imgPath(gender, topFile),
          display_name_zh: useDress ? "（无上装）" : "上衣",
          copy: useDress
            ? "连衣裙已包含上半身造型，因此上装位留空；如需保暖可用外套叠穿，应对早晚温差或空调房。"
            : "今天会有较多步行/参观场景，上衣选舒适、透气且易活动的版型；与外套叠穿不臃肿。",
        },
        {
          slot: "bottom",
          name: imgPath(gender, bottomFile),
          display_name_zh: useDress ? "连衣裙" : "下装",
          copy: useDress
            ? "一件成套省心，适合白天逛街/博物馆与拍照；搭配外套即可应对温差，整体更干净利落。"
            : "下装以耐走、好搭为主，适合景点间频繁步行与乘坐公共交通；深色更耐脏。",
        },
        {
          slot: "bag",
          name: imgPath(gender, bagFile),
          display_name_zh: "包袋",
          copy: "今天在不同地点移动，包要能装水、充电宝、票据和雨伞；解放双手更适合拍照与赶路。",
        },
        {
          slot: "shoes",
          name: imgPath(gender, pick(i, shoes)),
          display_name_zh: "鞋履",
          copy: "预计有较多行走与久站（排队/观景/逛街），优先选择缓震与稳定性好的鞋，脚感更轻松。",
        },
      ];

      return {
        day_index: i + 1,
        date,
        weekday_en: weekday,
        date_display: dateDisplay,
        area: "市中心",
        headline: i === 0 ? "城市经典动线" : i === 1 ? "艺术与街区氛围" : "购物与漫游",
        one_liner: "按顺路动线安排，节省体力，把时间留给最想逛的地方。",
        schedule: [
          {
            time_range: "09:00-12:00",
            spot: "城市地标",
            map_query: city,
            what_to_do: ["拍照打卡", "步行探索", "咖啡补给"],
            notes: "建议穿好走的鞋；室外风大可加外套。",
          },
          {
            time_range: "12:30-14:00",
            spot: "当地市场/午餐",
            map_query: `${city} market`,
            what_to_do: ["吃午餐", "逛摊位", "买小纪念品"],
            notes: "人多注意随身物品；建议用斜挎/肩背。",
          },
          {
            time_range: "14:30-17:00",
            spot: "博物馆/展馆",
            map_query: `${city} museum`,
            what_to_do: ["参观展览", "室内休息", "拍建筑"],
            notes: "室内空调偏冷，外套可随身备着。",
          },
        ],
        outfit: {
          theme: "city chic",
          title_zh: useDress ? "一件成套的轻松优雅" : "经典城市叠穿",
          subtitle_en: useDress ? "One-piece Ease" : "Classic Layering",
          hero_images: {
            left: { name: imgPath(gender, jacketFile) },
            right: { name: imgPath(gender, bagFile) },
          },
          items,
          image_card: {
            type: "outfit_of_the_day",
            lang_mix: "zh_en",
            header_left: `${city} NOTES`,
            header_center: "OUTFIT OF THE DAY",
            header_right: `${weekday} ${dateDisplay}`,
            caption: useDress ? "一件成套，轻松穿出旅行的松弛感。" : "用叠穿与好走的鞋，把城市节奏穿在身上。",
            layout: "magazine_collage_v1",
          },
        },
      };
    });

    const response = {
      meta: {
        city,
        days,
        date_start: dateStart,
        persona: {
          gender,
          style_keywords: body.persona?.style_keywords?.length ? body.persona.style_keywords : ["时尚","经典","休闲"],
          budget_level: "mid",
          walk_intensity: body.persona?.walk_intensity || "medium",
        },
      },
      trip: {
        title: `${city} 行程与穿搭`,
        subtitle: `${days}日 · 旅行路线 + Outfit of the Day`,
        days: tripDays,
      },
    };

    return NextResponse.json(response, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { error: "PLAN_GENERATION_FAILED", message: err?.message ?? "unknown" },
      { status: 500, headers: corsHeaders }
    );
  }
}
