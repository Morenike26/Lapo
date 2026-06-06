import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Lapo — On-Chain Credit on Arc";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#030712",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -60%)",
            width: 700,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(0,107,255,0.22) 0%, rgba(0,71,150,0.12) 45%, transparent 70%)",
          }}
        />

        {/* Logo mark (SVG inline) */}
        <svg width="96" height="96" viewBox="0 0 40 40" fill="none">
          <defs>
            <linearGradient id="og-arc" x1="5" y1="31" x2="35" y2="7" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#004796" />
              <stop offset="55%"  stopColor="#006bff" />
              <stop offset="100%" stopColor="#0ae8f0" />
            </linearGradient>
          </defs>
          <line x1="5" y1="32" x2="22" y2="32" stroke="#006bff" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.35" />
          <line x1="5" y1="22" x2="5" y2="32" stroke="url(#og-arc)" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M5 22 C5 10 18 7 35 7" stroke="url(#og-arc)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="35" cy="7" r="3.2" fill="#0ae8f0" />
          <circle cx="35" cy="7" r="1.4" fill="white" fillOpacity="0.8" />
        </svg>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "white",
            letterSpacing: "-0.04em",
            marginTop: 16,
            lineHeight: 1,
          }}
        >
          lapo
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            color: "#7090b0",
            marginTop: 20,
            letterSpacing: "-0.01em",
            textAlign: "center",
            maxWidth: 600,
            lineHeight: 1.4,
          }}
        >
          Your credit score, on-chain. Lend. Borrow. Build.
        </div>

        {/* Bottom stat strip */}
        <div
          style={{
            position: "absolute",
            bottom: 56,
            display: "flex",
            gap: 60,
            alignItems: "center",
          }}
        >
          {[
            { label: "Origination fee", value: "0.5%" },
            { label: "Interest to lenders", value: "90%" },
            { label: "Network", value: "Arc Testnet" },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#006bff", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 14, color: "#7090b0", marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bottom border glow */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background: "linear-gradient(90deg, transparent 0%, #006bff 40%, #0ae8f0 60%, transparent 100%)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
