"use client";

import { useRef, useState, useEffect } from "react";

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
  const [cleanBg, setCleanBg] = useState<string>("");

  /* Load Great Vibes cursive font */
  useEffect(() => {
    if (
      typeof document !== "undefined" &&
      !document.getElementById("cert-gv-font")
    ) {
      const el = document.createElement("link");
      el.id = "cert-gv-font";
      el.rel = "stylesheet";
      el.href =
        "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap";
      document.head.appendChild(el);
    }
  }, []);

  /*
   * Load Certificate.jpeg → blur-erase the baked-in placeholder text →
   * store as a clean data-URL background. Feathered edges make the
   * erasure invisible.
   */
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const W = img.width;
      const H = img.height;

      /* ---- sharp original ---- */
      const cvs = document.createElement("canvas");
      cvs.width = W;
      cvs.height = H;
      const ctx = cvs.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      /* ---- region that contains placeholder text (image-px) ---- */
      const rx = Math.round(W * 0.42);
      const ry = Math.round(H * 0.29);
      const rr = Math.round(W * 0.99);
      const rb = Math.round(H * 0.80);
      const rw = rr - rx;
      const rh = rb - ry;

      /* ---- heavily blurred copy ---- */
      const tmp = document.createElement("canvas");
      tmp.width = W;
      tmp.height = H;
      const tmpCtx = tmp.getContext("2d")!;
      tmpCtx.filter = "blur(50px)";
      tmpCtx.drawImage(img, 0, 0);
      tmpCtx.filter = "none";

      /* ---- feathered blend: original at edges → blurred in centre ---- */
      const FEATHER = 60;
      const orig = ctx.getImageData(rx, ry, rw, rh);
      const blur = tmpCtx.getImageData(rx, ry, rw, rh);
      const out = ctx.createImageData(rw, rh);

      for (let y = 0; y < rh; y++) {
        const dT = Math.min(y / FEATHER, 1);
        const dB = Math.min((rh - 1 - y) / FEATHER, 1);
        for (let x = 0; x < rw; x++) {
          const i = (y * rw + x) * 4;
          const dL = Math.min(x / FEATHER, 1);
          const dR = Math.min((rw - 1 - x) / FEATHER, 1);
          const a = Math.min(dL, dR, dT, dB); // 0 at edge → 1 inside
          out.data[i] = Math.round(
            orig.data[i] * (1 - a) + blur.data[i] * a
          );
          out.data[i + 1] = Math.round(
            orig.data[i + 1] * (1 - a) + blur.data[i + 1] * a
          );
          out.data[i + 2] = Math.round(
            orig.data[i + 2] * (1 - a) + blur.data[i + 2] * a
          );
          out.data[i + 3] = 255;
        }
      }

      ctx.putImageData(out, rx, ry);
      setCleanBg(cvs.toDataURL("image/jpeg", 0.97));
    };
    img.src = "/Certificate.jpeg";
  }, []);

  const handleDownload = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      await document.fonts.ready;
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(certRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const a = document.createElement("a");
      a.download = `Certificate_${userName.replace(/\s+/g, "_")}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch {
      alert("Failed to download certificate. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (!cleanBg) {
    return (
      <div
        style={{
          width: "900px",
          height: "636px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9f9f9",
          borderRadius: "12px",
        }}
      >
        <p style={{ color: "#888", fontSize: "14px" }}>
          Loading certificate\u2026
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Certificate — 900 \u00d7 636 with cleaned image background */}
      <div
        ref={certRef}
        style={{
          width: "900px",
          height: "636px",
          position: "relative",
          overflow: "hidden",
          backgroundImage: `url(${cleanBg})`,
          backgroundSize: "900px 636px",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* "This is to certify that" */}
        <div
          style={{
            position: "absolute",
            top: "242px",
            left: "335px",
            right: "15px",
            textAlign: "center",
            zIndex: 10,
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: "#444",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontStyle: "italic",
              fontWeight: 600,
              margin: 0,
              lineHeight: 1,
            }}
          >
            This is to certify that
          </p>
        </div>

        {/* Dynamic user name */}
        <div
          style={{
            position: "absolute",
            top: "265px",
            left: "335px",
            right: "15px",
            textAlign: "center",
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontSize: "52px",
              fontFamily: "'Great Vibes', cursive",
              fontWeight: 400,
              color: "#1a1a2e",
              lineHeight: 1.15,
              display: "inline-block",
              maxWidth: "490px",
              wordBreak: "break-word",
            }}
          >
            {userName}
          </span>
        </div>

        {/* Dynamic body paragraph */}
        <div
          style={{
            position: "absolute",
            top: "355px",
            left: "335px",
            right: "15px",
            textAlign: "center",
            zIndex: 10,
          }}
        >
          <p
            style={{
              fontSize: "15px",
              color: "#444",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              lineHeight: 1.8,
              textAlign: "center",
              maxWidth: "420px",
              margin: "0 auto",
              fontStyle: "italic",
            }}
          >
            has successfully participated in and completed the{" "}
            <strong style={{ color: "#1a1a2e", fontStyle: "italic" }}>
              {programName}
            </strong>{" "}
            held on{" "}
            <strong style={{ color: "#1a1a2e", fontStyle: "italic" }}>
              {completionDate}
            </strong>
            .
            <br />
            We appreciate their active involvement and commitment
            <br />
            throughout the training program.
          </p>
        </div>
      </div>

      {/* Download button */}
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
