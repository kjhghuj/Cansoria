import { FL_USP } from "@/lib/florencess-data";

export default function UspStrip() {
  return (
    <section className="fl-usp" aria-label="Store benefits">
      <div className="fl-container">
        <div className="fl-usp__row">
          {FL_USP.map((item) => (
            <div className="fl-usp__item" key={item}>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
