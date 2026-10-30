import Link from "next/link";
import { FL_TILES } from "@/lib/florencess-data";

export default function CategoryMosaic() {
  return (
    <div className="fl-mosaic">
      {FL_TILES.map((tile) => (
        <Link
          className={`fl-tile${tile.wide ? " fl-tile--wide" : ""}`}
          href={tile.href}
          key={`${tile.title}-${tile.image}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="fl-tile__img" src={tile.image} alt={tile.title} loading="lazy" />
          <span className="fl-tile__inner">
            {tile.kicker ? <span className="fl-tile__kicker">{tile.kicker}</span> : null}
            <span className="fl-tile__title">{tile.title}</span>
            {tile.meta ? <span className="fl-tile__meta">{tile.meta}</span> : null}
          </span>
        </Link>
      ))}
    </div>
  );
}
