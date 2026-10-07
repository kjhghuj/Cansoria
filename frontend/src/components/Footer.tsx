import Link from "next/link";
import { ArrowRightIcon, HeartIcon, PaletteIcon, ShieldCheckIcon, TruckIcon } from "@phosphor-icons/react/ssr";
import { COMPANY_INFO } from "@/lib/constants";

const columns = [
  { title: "Find Your Portrait", links: [{ name: "Pet Portraits", href: "/shop?category=pet-portraits" }, { name: "Dog Portraits", href: "/shop?category=dogs" }, { name: "Cat Portraits", href: "/shop?category=cats" }, { name: "Human Portraits", href: "/product/custom-portrait-from-photo" }, { name: "Memorial Keepsakes", href: "/shop?category=memorial" }] },
  { title: "Our Little Studio", links: [{ name: "Our Story & Artists", href: "/about" }, { name: "How It Works", href: "/#process" }, { name: "Happy Pet Parents", href: "/#reviews" }, { name: "The Journal", href: "/journal" }] },
  { title: "Here to Help", links: [{ name: "Track Your Order", href: "/order/lookup" }, { name: "Shipping & Delivery", href: "/shipping" }, { name: "Returns & Our Promise", href: "/returns" }, { name: "Contact Us", href: `mailto:${COMPANY_INFO.supportEmail}` }] },
];

export default function Footer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <footer className="pet-oil-footer">
        <div className="pet-oil-footer-inner">
          <Link href="/" className="portrait-wordmark">CANSORIA</Link>
          <div className="pet-oil-footer-links">
            <p>© {new Date().getFullYear()} Cansoria</p>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="portrait-footer">
      <div className="portrait-footer-promises"><span><PaletteIcon weight="light" />Made by real artists</span><span><ShieldCheckIcon weight="light" />Made to be loved</span><span><TruckIcon weight="light" />Delivered with care</span></div>
      <div className="portrait-container">
        <div className="portrait-footer-main">
          <div className="portrait-footer-brand"><Link href="/" className="portrait-wordmark">CANSORIA</Link><p>A favorite face. A thousand memories.<br />A little piece of love, painted forever.</p><a href={`mailto:${COMPANY_INFO.supportEmail}`} className="portrait-footer-contact">Let’s create something meaningful <ArrowRightIcon weight="light" /></a></div>
          {columns.map(column => <div className="portrait-footer-column" key={column.title}><h2>{column.title}</h2><ul>{column.links.map(link => <li key={link.href}><Link href={link.href}>{link.name}</Link></li>)}</ul></div>)}
        </div>
        <div className="portrait-footer-bottom"><p>© {new Date().getFullYear()} Cansoria. All rights reserved.</p><span className="footer-love">Painted with love <HeartIcon weight="light" /></span><div><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms & Conditions</Link></div></div>
      </div>
    </footer>
  );
}
