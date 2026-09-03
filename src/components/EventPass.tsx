"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { CheckinSuccess } from "@/lib/checkin";
import { EVENT } from "@/lib/config";

export default function EventPass({ pass }: { pass: CheckinSuccess }) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const passCardRef = useRef<HTMLDivElement>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  // Draw QR
  useEffect(() => {
    if (!qrRef.current) return;
    QRCode.toCanvas(qrRef.current, `CHECKIN:${pass.playerCode}`, {
      width: 180,
      margin: 1,
      color: { dark: "#050505", light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).catch(() => {});
  }, [pass.playerCode]);

  const handleSave = async () => {
    // Rasterize the pass card to PNG for download
    const card = passCardRef.current;
    if (!card) return;
    try {
      const { default: htmlToImage } = await import("html-to-image");
      const dataUrl = await htmlToImage.toPng(card, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `event-pass-${pass.playerCode}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setShareMsg("Không lưu được — vui lòng chụp màn hình.");
    }
  };

  const handleShare = async () => {
    const text = `Tôi đã check-in tại ${EVENT.title}! Mã người chơi: ${pass.playerCode}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: EVENT.title, text });
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareMsg("Đã sao chép — dán lên story của bạn!");
    } catch {
      setShareMsg("Không thể sao chép tự động.");
    }
    setTimeout(() => setShareMsg(null), 3000);
  };

  return (
    <div>
      <div
        ref={passCardRef}
        className="pass-card relative overflow-hidden p-6 md:p-8"
      >
        {/* header strip */}
        <div className="flex items-center justify-between border-b border-accent/30 pb-4">
          <div>
            <p className="display text-xs font-semibold tracking-[0.25em] text-muted">
              {EVENT.title}
            </p>
            <p className="display text-2xl md:text-3xl font-bold">EVENT PASS</p>
          </div>
          <span className="display border border-accent px-2.5 py-1 text-xs font-bold tracking-[0.2em] text-accent">
            {EVENT.subtitle}
          </span>
        </div>

        {/* body */}
        <div className="mt-6 flex items-center gap-6">
          <div className="rounded bg-white p-2">
            <canvas ref={qrRef} className="block h-[120px] w-[120px] md:h-[160px] md:w-[160px]" />
          </div>
          <div className="min-w-0">
            <p className="label !mb-1">Player Code</p>
            <p className="display truncate text-3xl md:text-4xl font-bold text-accent">
              {pass.playerCode}
            </p>
            <p className="mt-3 label !mb-1">Checked in as</p>
            <p className="truncate font-semibold">{pass.fullName}</p>
          </div>
        </div>

        {/* footer strip */}
        <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
          <span>✓ CHECKED IN</span>
          <span className="font-mono">#{pass.playerCode}</span>
        </div>

        {/* decorative corner */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent/10 blur-2xl" />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={handleSave} className="btn-accent !py-2.5 !px-5 text-xs md:text-sm">
          ⬇ Lưu Pass
        </button>
        <button type="button" onClick={handleShare} className="btn-ghost !py-2.5 !px-5 text-xs md:text-sm">
          Chia sẻ
        </button>
      </div>
      {shareMsg && <p className="mt-3 text-xs text-accent">{shareMsg}</p>}
    </div>
  );
}
