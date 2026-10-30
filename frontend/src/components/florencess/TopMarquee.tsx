import { FL_TOPBAR_ITEMS } from "@/lib/florencess-data";

/**
 * Reference announcement bar: a continuous 75px/s leftward scroll of the four
 * messages, separated by 44px of empty space (no bullets or pipes), on a 45px
 * black strip. The original track repeats the message set many times so the
 * strip can never expose an empty edge; the same repetition count and the same
 * 150s/one-group duration are used here so the speed matches exactly.
 */
const SETS_PER_GROUP = 12;

function MarqueeGroup({ hidden }: { hidden?: boolean }) {
  return (
    <div className="fl-topbar__group">
      {Array.from({ length: SETS_PER_GROUP }, (_, set) => (
        <span className="fl-topbar__set" key={set} aria-hidden={hidden || set > 0 || undefined}>
          {FL_TOPBAR_ITEMS.map((item) => (
            <span className="fl-topbar__item" key={`${set}-${item}`}>
              {item}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

export default function TopMarquee() {
  return (
    <div className="fl-topbar">
      <div className="fl-topbar__track">
        <MarqueeGroup />
        <MarqueeGroup hidden />
      </div>
    </div>
  );
}