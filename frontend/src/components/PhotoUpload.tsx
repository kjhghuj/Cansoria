"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Loader2, UploadCloud } from "lucide-react";
import { useCart } from "@/lib/providers";
import type { UploadedPhoto } from "@/lib/portrait";

export default function PhotoUpload({
  onChange,
}: {
  onChange?: (photo: UploadedPhoto | null) => void;
}) {
  const { cart, cartLoading, ensureCart } = useCart();
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const callback = useRef(onChange);
  const generation = useRef(0);
  const uploadController = useRef<AbortController | null>(null);
  const creatingCart = useRef(false);
  const uploadCartId = useRef<string | undefined>(undefined);
  const previousCart = useRef<string | undefined>(cart?.id);
  useEffect(() => {
    callback.current = onChange;
  }, [onChange]);
  useEffect(() => {
    const previous = previousCart.current;
    previousCart.current = cart?.id;
    // The selected photo is what created this cart. Keep that upload alive.
    if (!previous && cart?.id && (creatingCart.current || uploadCartId.current === cart.id)) return;
    uploadCartId.current = undefined;
    const controller = new AbortController();
    const version = ++generation.current;
    async function restore() {
      uploadController.current?.abort();
      uploadController.current = null;
      setBusy(false);
      setError("");
      setPhoto(null);
      callback.current?.(null);
      if (!cart?.id) return;
      try {
        const raw = sessionStorage.getItem(`portrait-photo:${cart.id}`);
        if (!raw) return;
        const saved: UploadedPhoto = JSON.parse(raw);
        if (saved.cartId !== cart.id || !/^[a-f0-9-]{36}$/.test(saved.id))
          return;
        const response = await fetch(
          `/api/medusa/store/carts/${cart.id}/photos/${saved.id}`,
          { signal: controller.signal },
        );
        if (
          !response.ok ||
          !response.headers.get("content-type")?.startsWith("image/")
        )
          return;
        if (!controller.signal.aborted && generation.current === version) {
          setPhoto(saved);
          callback.current?.(saved);
        }
      } catch {
        /* A new upload is available when a saved draft expires. */
      }
    }
    void restore();
    return () => { controller.abort(); };
  }, [cart?.id]);
  useEffect(() => () => { uploadController.current?.abort(); generation.current += 1; }, []);

  async function upload(file: File) {
    if (busy || cartLoading || uploadController.current) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      !file.size ||
      file.size > 10 * 1024 * 1024
    ) {
      setError(
        "Choose a JPG, PNG or WebP image, up to 10 MB. Export HEIC photos as JPG first.",
      );
      if (input.current) input.current.value = "";
      return;
    }
    setBusy(true);
    setError("");
    const version = ++generation.current;
    const controller = new AbortController();
    uploadController.current = controller;
    callback.current?.(null);
    try {
      creatingCart.current = !cart?.id;
      const activeCart = await ensureCart();
      if (controller.signal.aborted || generation.current !== version) return;
      uploadCartId.current = activeCart.id;
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("Unable to read this photo."));
        reader.readAsDataURL(file);
      });
      if (controller.signal.aborted || generation.current !== version) return;
      const response = await fetch(
        `/api/medusa/store/carts/${activeCart.id}/photos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, mime: file.type, content }),
          signal: controller.signal,
        },
      );
      const data = await response.json();
      if (!response.ok || !data.photo)
        throw new Error(data.message || "Upload failed. Please try again.");
      const saved = { ...data.photo, cartId: activeCart.id } as UploadedPhoto;
      if (controller.signal.aborted || generation.current !== version) return;
      setPhoto(saved);
      callback.current?.(saved);
      try {
        sessionStorage.setItem(
          `portrait-photo:${activeCart.id}`,
          JSON.stringify(saved),
        );
      } catch {
        /* Upload is still saved on the server. */
      }
    } catch (reason) {
      if (generation.current === version) {
        setError(reason instanceof Error ? reason.message : "Upload failed.");
        callback.current?.(photo);
      }
    } finally {
      if (uploadController.current === controller) uploadController.current = null;
      if (generation.current === version) {
        creatingCart.current = false;
        setBusy(false);
        if (input.current) input.current.value = "";
      }
    }
  }

  const currentPhoto = photo?.cartId === cart?.id ? photo : null;
  return (
    <div className="space-y-3">
      {currentPhoto && (
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-cream-card">
          <Image
            unoptimized
            src={`/api/medusa/store/carts/${currentPhoto.cartId}/photos/${currentPhoto.id}`}
            alt="Your uploaded pet reference photo"
            fill
            sizes="(max-width: 768px) 90vw, 420px"
            className="object-contain"
          />
        </div>
      )}
      <button
        type="button"
        disabled={busy || cartLoading}
        onClick={() => input.current?.click()}
        className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-toffee bg-cream-card/50 px-5 py-6 text-center disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="animate-spin text-toffee" />
        ) : currentPhoto ? (
          <Check className="text-toffee" />
        ) : (
          <UploadCloud className="text-toffee" />
        )}
        <span>
          {busy
            ? "Uploading your photo…"
            : currentPhoto
              ? "Photo saved · Replace photo"
              : cartLoading
                ? "Preparing your upload…"
                : "Choose your pet’s photo"}
        </span>
        <span className="text-xs text-charcoal-light">
          JPG, PNG or WebP · Up to 10 MB
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-label="Choose pet reference photo"
        disabled={busy || cartLoading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <div aria-live="polite" className="text-sm text-charcoal-light">
        {currentPhoto && <p className="break-all">{currentPhoto.name}</p>}
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
      </div>
      <p className="text-xs leading-5 text-charcoal-light">
        Your reference is stored privately and attached to the portrait you add
        to your cart.
      </p>
    </div>
  );
}
