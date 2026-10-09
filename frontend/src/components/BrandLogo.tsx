import Image from "next/image";

export default function BrandLogo({ priority = false }: { priority?: boolean }) {
  return (
    <Image
      src="/brand/cansoria-wordmark.png"
      alt="Cansoria"
      width={1375}
      height={529}
      className="brand-logo-image"
      priority={priority}
      unoptimized
    />
  );
}
