"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { portraitSummary } from "@/lib/portrait";

export default function PortraitOrderDetails({
  metadata,
  orderId,
  token,
}: {
  metadata?: Record<string, unknown> | null;
  orderId: string;
  token?: string;
}) {
  const portrait = portraitSummary(metadata);
  const [preview, setPreview] = useState<{
    src: string;
    key: string;
  } | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const objectUrl = useRef<string | null>(null);
  const previewKey = JSON.stringify([orderId, portrait?.photoId, token]);
  const currentPreview = preview?.key === previewKey ? preview : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(
    () => () => {
      requestController.current?.abort();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    },
    [previewKey],
  );
  if (!portrait) return null;
  async function showPhoto() {
    if (!portrait?.photoId || busy) return;
    setBusy(true);
    setError("");
    const controller = new AbortController();
    requestController.current = controller;
    try {
      const response = await fetch(
        `/api/medusa/store/orders/${encodeURIComponent(orderId)}/photos/${portrait.photoId}`,
        { headers: token ? { "x-order-access-token": token } : {}, signal: controller.signal },
      );
      if (
        !response.ok ||
        !response.headers.get("content-type")?.startsWith("image/")
      )
        throw new Error(
          "Unable to load your reference. Request a new order access link or contact the studio.",
        );
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      const src = URL.createObjectURL(blob);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = src;
      setPreview({ src, key: previewKey });
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Photo unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-2 space-y-1 text-xs text-charcoal-light">
      <p>{portrait.style}</p>
      <p className="break-all">Photo: {portrait.photoName}</p>
      {portrait.photoId && (
        <button
          type="button"
          disabled={busy}
          className="text-toffee underline"
          onClick={() => {
            if (currentPreview) {
              URL.revokeObjectURL(currentPreview.src);
              objectUrl.current = null;
              setPreview(null);
            } else void showPhoto();
          }}
        >
          {busy
            ? "Loading…"
            : currentPreview
              ? "Hide reference photo"
              : "View reference photo"}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {currentPreview && (
        <div className="relative mt-2 h-40 w-40">
          <Image
            src={currentPreview.src}
            alt="Your order’s uploaded reference photo"
            unoptimized
            fill
            className="object-contain"
          />
        </div>
      )}
    </div>
  );
}
