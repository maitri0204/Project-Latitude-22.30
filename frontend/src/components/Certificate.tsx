"use client";

import { useRef, useState } from "react";

interface CertificateProps {
  userName: string;
  programName: string;
  completionDate: string;
}

export default function Certificate({
  userName,
  programName,
  completionDate,
}: CertificateProps) {
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(certRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `Certificate_${userName.replace(/\s+/g, "_")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      alert("Failed to download certificate. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  /* ── colour tokens matching the Certificate.jpeg ── */
  const NAVY = "#152049";
  const GOLD = "#c8a44e";
  const GOLD_LIGHT = "#d4b65c";
  const DARK_TEXT = "#1a1a2e";

  return (
    <div>
      {/* ═══ Certificate card — 900 × 636 fixed ═══ */}
      <div
        ref={certRef}
        style={{
          width: "900px",
          height: "636px",
          position: "relative",
          overflow: "hidden",
          background: "#ffffff",
          fontFamily: "'Georgia', 'Times New Roman', serif",
        }}
      >
        {/* ── LEFT : upper navy panel (angled with curve) ── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "340px",
            height: "100%",
            zIndex: 1,
          }}
        >
          {/* Gold border edge — slightly wider to peek behind navy */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: `linear-gradient(180deg, ${GOLD} 0%, ${GOLD_LIGHT} 50%, ${GOLD} 100%)`,
              clipPath:
                "path('M0,0 L310,0 Q280,320 330,636 L0,636 Z')",
              zIndex: 1,
            }}
          />
          {/* Navy main fill */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: `linear-gradient(180deg, ${NAVY} 0%, #1b3068 40%, ${NAVY} 100%)`,
              clipPath:
                "path('M0,0 L305,0 Q275,320 322,636 L0,636 Z')",
              zIndex: 2,
            }}
          />
        </div>

        {/* ── LEFT : lower navy curve (bottom-left) ── */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "280px",
            height: "260px",
            zIndex: 3,
          }}
        >
          {/* Gold border edge */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`,
              clipPath:
                "path('M0,260 L0,80 Q160,80 270,260 Z')",
              zIndex: 3,
            }}
          />
          {/* Navy fill */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: `linear-gradient(135deg, ${NAVY} 0%, #1b3068 100%)`,
              clipPath:
                "path('M0,260 L0,90 Q155,90 262,260 Z')",
              zIndex: 4,
            }}
          />
        </div>

        {/* ── BADGE : gold starburst ── */}
        <div
          style={{
            position: "absolute",
            top: "42px",
            left: "48px",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            style={{ display: "block" }}
          >
            {/* Starburst rays */}
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = (i * 360) / 20;
              const rad = (angle * Math.PI) / 180;
              const nextAngle = ((i + 1) * 360) / 20;
              const nextRad = (nextAngle * Math.PI) / 180;
              const midAngle = (((angle + nextAngle) / 2) * Math.PI) / 180;
              const outerR = 60;
              const innerR = 48;
              const cx = 60,
                cy = 67;
              const x1 = cx + outerR * Math.cos(rad);
              const y1 = cy + outerR * Math.sin(rad);
              const mx = cx + innerR * Math.cos(midAngle);
              const my = cy + innerR * Math.sin(midAngle);
              const x2 = cx + outerR * Math.cos(nextRad);
              const y2 = cy + outerR * Math.sin(nextRad);
              return (
                <polygon
                  key={i}
                  points={`${cx},${cy} ${x1},${y1} ${mx},${my} ${x2},${y2}`}
                  fill={GOLD}
                />
              );
            })}
            {/* Inner circle — dark blue */}
            <circle
              cx="60"
              cy="67"
              r="44"
              fill={NAVY}
              stroke={GOLD}
              strokeWidth="3"
            />
            {/* Badge text */}
            <text
              x="60"
              y="48"
              textAnchor="middle"
              fill={GOLD}
              fontSize="8"
              fontFamily="Arial, sans-serif"
              letterSpacing="1"
            >
              ★★★★★
            </text>
            <text
              x="60"
              y="64"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="18"
              fontWeight="900"
              fontFamily="'Arial Black', Arial, sans-serif"
              letterSpacing="1.5"
            >
              BEST
            </text>
            <text
              x="60"
              y="78"
              textAnchor="middle"
              fill={GOLD_LIGHT}
              fontSize="10"
              fontWeight="700"
              fontFamily="Arial, sans-serif"
              letterSpacing="2.5"
            >
              CANDIDATE
            </text>
            <text
              x="60"
              y="90"
              textAnchor="middle"
              fill={GOLD}
              fontSize="8"
              fontFamily="Arial, sans-serif"
              letterSpacing="1"
            >
              ★★★★★
            </text>
          </svg>
          {/* Ribbon */}
          <svg
            width="72"
            height="26"
            viewBox="0 0 72 26"
            style={{ marginTop: "-3px" }}
          >
            <polygon points="0,0 30,0 36,13 30,26 0,18" fill={NAVY} />
            <polygon points="72,0 42,0 36,13 42,26 72,18" fill={NAVY} />
          </svg>
        </div>

        {/* ── LOGO : bottom-left over navy ── */}
        <div
          style={{
            position: "absolute",
            bottom: "28px",
            left: "24px",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: "3px",
          }}
        >
          {/* ADMITra text logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            {/* Triangle icon */}
            <span
              style={{
                color: "#ffffff",
                fontSize: "22px",
                fontWeight: 800,
                fontFamily: "'Arial Black', Arial, sans-serif",
                letterSpacing: "0.5px",
                lineHeight: 1,
              }}
            >
              ADMIT
              <span style={{ fontWeight: 400, fontFamily: "Arial, sans-serif" }}>
                ra
              </span>
            </span>
          </div>
          <span
            style={{
              color: GOLD_LIGHT,
              fontSize: "8px",
              fontFamily: "Arial, sans-serif",
              letterSpacing: "1.5px",
              paddingLeft: "2px",
              fontStyle: "italic",
            }}
          >
            Tests to Transform
          </span>
        </div>

        {/* ═══ RIGHT CONTENT AREA ═══ */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "590px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            paddingRight: "40px",
            paddingLeft: "10px",
            zIndex: 5,
          }}
        >
          {/* ── CERTIFICATE heading ── */}
          <h1
            style={{
              fontSize: "52px",
              fontWeight: 700,
              fontFamily: "'Georgia', 'Times New Roman', serif",
              color: DARK_TEXT,
              letterSpacing: "8px",
              lineHeight: 1,
              margin: 0,
              textTransform: "uppercase",
              fontStyle: "italic",
            }}
          >
            CERTIFICATE
          </h1>

          {/* ── OF PARTICIPATION with gold lines ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginTop: "10px",
              width: "100%",
              maxWidth: "460px",
            }}
          >
            <div
              style={{
                flex: 1,
                height: "1.5px",
                background: `linear-gradient(to right, transparent, ${GOLD})`,
              }}
            />
            <span
              style={{
                fontSize: "15px",
                fontWeight: 600,
                fontFamily: "'Georgia', serif",
                color: DARK_TEXT,
                letterSpacing: "6px",
                whiteSpace: "nowrap",
              }}
            >
              OF PARTICIPATION
            </span>
            <div
              style={{
                flex: 1,
                height: "1.5px",
                background: `linear-gradient(to left, transparent, ${GOLD})`,
              }}
            />
          </div>

          {/* ── "This is to certify that" ── */}
          <p
            style={{
              fontSize: "14px",
              color: "#444",
              fontFamily: "'Georgia', serif",
              marginTop: "40px",
              marginBottom: "6px",
              fontStyle: "italic",
              fontWeight: 400,
            }}
          >
            This is to certify that
          </p>

          {/* ── USER NAME (dynamic, cursive) ── */}
          <h2
            style={{
              fontSize: "44px",
              fontFamily:
                "'Segoe Script', 'Dancing Script', 'Brush Script MT', cursive",
              fontWeight: 400,
              fontStyle: "italic",
              color: DARK_TEXT,
              margin: "0 0 18px 0",
              lineHeight: 1.2,
              textAlign: "center",
              maxWidth: "480px",
              wordBreak: "break-word",
            }}
          >
            {userName}
          </h2>

          {/* ── Body paragraph with dynamic program + date ── */}
          <p
            style={{
              fontSize: "13px",
              color: "#444",
              fontFamily: "'Georgia', serif",
              lineHeight: 1.8,
              textAlign: "center",
              maxWidth: "420px",
              margin: 0,
              fontStyle: "italic",
            }}
          >
            has successfully participated in and completed the{" "}
            <strong style={{ color: DARK_TEXT, fontStyle: "italic" }}>
              {programName}
            </strong>{" "}
            held on{" "}
            <strong style={{ color: DARK_TEXT, fontStyle: "italic" }}>
              {completionDate}
            </strong>
            .
            <br />
            We appreciate their active involvement and commitment
            <br />
            throughout the training program.
          </p>

          {/* ── Signatures ── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              maxWidth: "440px",
              marginTop: "50px",
            }}
          >
            {["SIGNATURE", "SIGNATURE"].map((label, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "140px",
                    borderTop: "1.5px solid #666",
                    marginBottom: "8px",
                  }}
                />
                <span
                  style={{
                    fontSize: "11px",
                    color: "#555",
                    fontFamily: "'Georgia', serif",
                    letterSpacing: "3px",
                    fontWeight: 600,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* ── Footer ── */}
          <div style={{ marginTop: "22px", textAlign: "center" }}>
            <span
              style={{
                fontSize: "10px",
                color: "#888",
                fontFamily: "Arial, sans-serif",
                letterSpacing: "0.5px",
                fontStyle: "italic",
              }}
            >
              admitra.io &nbsp;|&nbsp; hello@admitra.io
            </span>
          </div>
        </div>

        {/* ── Subtle decorative grey curve (right side of template) ── */}
        <svg
          width="300"
          height="636"
          viewBox="0 0 300 636"
          style={{
            position: "absolute",
            top: 0,
            left: "280px",
            zIndex: 0,
            opacity: 0.06,
          }}
        >
          <path
            d="M 100 0 Q 0 318 100 636"
            fill="none"
            stroke="#888"
            strokeWidth="180"
          />
        </svg>
      </div>

      {/* ═══ Download button ═══ */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {downloading ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download Certificate
            </>
          )}
        </button>
      </div>
    </div>
  );
}
