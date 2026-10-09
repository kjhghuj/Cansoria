import Link from "next/link";
import BrandLogo from "./BrandLogo";
import Newsletter from "./Newsletter";
import { COMPANY_INFO, FOOTER_LINKS } from "@/lib/constants";
import { portraitStylesUrl } from "@/lib/portrait";

export default function Footer() {
  const columns = [
    { title: "Pet Portraits", links: FOOTER_LINKS.shop },
    { title: "Our Studio", links: FOOTER_LINKS.company },
    { title: "Help & Support", links: FOOTER_LINKS.support },
  ];

  return (
    <footer className="cansoria-footer">
      <Newsletter />
      <div className="cansoria-footer-container">
        <div className="cansoria-footer-main">
          <div className="cansoria-footer-brand">
            <Link href="/" className="cansoria-footer-logo">
              <BrandLogo />
            </Link>
            <p>A home for pet portrait inspiration, celebrating the companions you love.</p>
            <p>Commissions are in preparation.</p>
            <a href={`mailto:${COMPANY_INFO.supportEmail}`} className="cansoria-footer-contact">
              {COMPANY_INFO.supportEmail}
            </a>
          </div>
          {columns.map((column) => (
            <nav className="cansoria-footer-column" key={column.title} aria-label={column.title}>
              <h2>{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.href === portraitStylesUrl ? (
                      <a href={link.href}>{link.name}</a>
                    ) : (
                      <Link href={link.href}>{link.name}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="cansoria-footer-bottom">
          <p>© {new Date().getFullYear()} Cansoria. All rights reserved.</p>
          <nav aria-label="Legal">
            {FOOTER_LINKS.legal.map((link) => (
              <Link key={link.href} href={link.href}>{link.name}</Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
