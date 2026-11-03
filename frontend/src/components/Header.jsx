import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";
export default function Header() {
  return (
    <header className="bg-white/90 border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
        <Link to="/" className="brand text-2xl tracking-widest text-wine">
          FLOO <span className="text-ink">ATTIRE</span>
          <span className="block font-sans text-[9px] tracking-[.38em] text-stone-500">
            KEBAYA RENTAL
          </span>
        </Link>
        <a
          href="https://instagram.com/floo_attire"
          target="_blank"
          rel="noreferrer"
          className="flex gap-2 text-sm items-center text-stone-600"
        >
          <Instagram size={18} /> Instagram
        </a>
      </div>
    </header>
  );
}
