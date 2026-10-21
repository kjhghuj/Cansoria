import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { STUDIO, STUDIO_OPEN, collectionsUrl } from "@/lib/studio-content";


export function StudioPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="studio-page">
      <header className="studio-intro">
        <p className="studio-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <div className="studio-container">{children}</div>
    </div>
  );
}
export function StudioCTA({ ordersOpen = false }: { ordersOpen?: boolean }) {
  return (
    <section className="studio-cta">
      <p className="studio-eyebrow">A personal starting point</p>
      <h2>Imagine a watch that feels like yours.</h2>
      <p>{ordersOpen ? STUDIO_OPEN.readiness : STUDIO.readiness}</p>
      <div className="studio-cta-actions">
        <a href={collectionsUrl} className="studio-button">
          {ordersOpen ? "Shop Watches →" : "Explore Watches →"}
        </a>
        <Link href="/contact" className="studio-secondary-button">
          Contact Us →
        </Link>
      </div>
    </section>
  );
}
export function StudioImage({
  src,
  alt,
  caption,
  priority = false,
}: {
  src: string;
  alt: string;
  caption?: string;
  priority?: boolean;
}) {
  const image = (
    <div className="studio-image">
      <Image
        src={src}
        priority={priority}
        alt={alt}
        fill
        sizes="(max-width: 700px) 90vw, 45vw"
        className="object-cover"
      />
    </div>
  );
  return caption ? (
    <figure className="studio-figure">
      {image}
      <figcaption className="studio-image-caption">{caption}</figcaption>
    </figure>
  ) : (
    image
  );
}
