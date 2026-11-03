import { Link, NavLink } from "react-router-dom";
import { Heart, Instagram, Menu } from "lucide-react";
export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand"><span className="brand-mark">F</span><span>FLOO ATTIRE<small>KEBAYA RENTAL</small></span></Link>
        <nav className="main-nav"><NavLink to="/katalog">Katalog</NavLink><NavLink to="/about">Tentang</NavLink><NavLink to="/rules">Rules</NavLink></nav>
        <div className="header-actions"><a href="https://instagram.com/floo_attire" target="_blank" rel="noreferrer"><Instagram size={19}/><span>Instagram</span></a><span className="divider"/><button aria-label="Favorit"><Heart size={20}/><span>Favorit</span></button><button className="menu-button" aria-label="Menu"><Menu size={21}/></button></div>
      </div>
    </header>
  );
}
