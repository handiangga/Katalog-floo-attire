import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Heart, Instagram, Menu, X } from "lucide-react";
import "./header.css";

const navigation = [
  { to: "/katalog", label: "Katalog" },
  { to: "/about", label: "Tentang" },
  { to: "/rules", label: "Rules" },
];
const instagram = "https://instagram.com/floo_attire";

export default function Header() {
  const { pathname, key } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [key]);

  const links = navigation.map(({ to, label }) => {
    const active = pathname === to || (pathname === "/" && to === "/katalog");
    return (
      <Link key={to} to={to} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
        {label}
      </Link>
    );
  });

  function closeOnEscape(event) {
    if (!menuOpen || event.key !== "Escape") return;
    setMenuOpen(false);
    menuButton.current?.focus();
  }

  return (
    <header className="site-header" onKeyDown={closeOnEscape}>
      <div className="header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span>FLOO ATTIRE<small>KEBAYA RENTAL</small></span>
        </Link>
        <nav className="main-nav" aria-label="Navigasi utama">
          {links}
        </nav>
        <div className="header-actions">
          <a className="header-instagram" href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
            <Instagram size={19} aria-hidden="true" />
            <span>Instagram</span>
          </a>
          <span className="divider" aria-hidden="true" />
          <Link to="/katalog?favorit=1" aria-label="Favorit">
            <Heart size={20} aria-hidden="true" />
            <span>Favorit</span>
          </Link>
          <button
            ref={menuButton}
            type="button"
            className="menu-button"
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={menuOpen}
            aria-controls="site-mobile-navigation"
            onClick={() => setMenuOpen(open => !open)}
          >
            {menuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <nav id="site-mobile-navigation" className="mobile-nav" aria-label="Navigasi utama" hidden={!menuOpen}>
        {links}
        <a href={instagram} target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)}>
          <Instagram size={19} aria-hidden="true" />
          Instagram
        </a>
      </nav>
    </header>
  );
}
