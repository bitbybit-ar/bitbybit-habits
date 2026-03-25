import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BitByBit — Earn sats. Build habits.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image({ params }: { params: { locale: string } }) {
  const isEn = params.locale === "en";

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(247, 168, 37, 0.1)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(247, 168, 37, 0.08)",
            display: "flex",
          }}
        />

        {/* Lightning emoji */}
        <div
          style={{
            fontSize: 120,
            marginBottom: 10,
            display: "flex",
          }}
        >
          ⚡
        </div>

        {/* App name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#F7A825",
            letterSpacing: "-2px",
            display: "flex",
          }}
        >
          BitByBit
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: "#E0E0E0",
            marginTop: 16,
            display: "flex",
          }}
        >
          {isEn
            ? "Earn sats. Build habits. Change lives."
            : "Ganá sats. Creá hábitos. Cambiá vidas."}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#888",
            fontSize: 20,
          }}
        >
          <span>bitbybit.com.ar</span>
          <span style={{ color: "#F7A825" }}>•</span>
          <span>Bitcoin Lightning Network</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
