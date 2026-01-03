"use client";

import { useState } from "react";

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setData(null);

    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: "伦敦",
        days: 3,
        date_start: "2026-03-18",
        persona: {
          gender: "female",
          style_keywords: ["时尚", "经典", "休闲"],
          budget_level: "mid",
          walk_intensity: "medium"
        }
      })
    });

    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  return (
    <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Travel AI</h1>
      <p style={{ opacity: 0.7, marginTop: 8 }}>点击按钮生成行程 + 穿搭 JSON</p>

      <button
        onClick={generate}
        disabled={loading}
        style={{
          marginTop: 16,
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid #ddd",
          cursor: "pointer"
        }}
      >
        {loading ? "生成中..." : "Generate Plan"}
      </button>

      <pre
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 12,
          background: "#111",
          color: "#eee",
          overflowX: "auto",
          fontSize: 12,
          lineHeight: 1.5
        }}
      >
        {data ? JSON.stringify(data, null, 2) : "（这里会显示返回的 JSON）"}
      </pre>
    </main>
  );
}
