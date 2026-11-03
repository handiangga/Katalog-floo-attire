import {Link} from 'react-router-dom';
import {ArrowRight,Heart,Shirt,Sparkles} from 'lucide-react';
import usePageContent from '../lib/usePageContent';
import heroPhoto from '../assets/about-kebaya-hero.webp';
import storyPhoto from '../assets/about-kebaya-collection.webp';
import './about-photos.css';
const values=[{icon:Shirt,title:'Koleksi Premium',text:'Pilihan kebaya terbaik dengan desain elegan, detail cantik, dan kualitas terjaga.'},{icon:Sparkles,title:'Fitting Nyaman',text:'Nikmati proses fitting yang tenang agar setiap detail terasa pas untukmu.'},{icon:Heart,title:'Didampingi Sepenuh Hati',text:'Kami siap menemani kamu tampil percaya diri di setiap acara istimewa.'}];
const heroDescription = 'Lengkapi momen spesialmu dengan koleksi kebaya pilihan terbaik dari Floo Attire. Tampil anggun, nyaman, dan percaya diri di setiap acara istimewa.';
const storyDescription = 'Floo Attire adalah layanan kebaya rental yang hadir untuk membantumu tampil anggun di berbagai momen spesial. Dengan koleksi yang terkurasi, pelayanan yang personal, dan perhatian pada setiap detail, kami berkomitmen menghadirkan pengalaman sewa kebaya yang mudah, nyaman, dan berkesan.';

export const aboutDefaultContent = [heroDescription, storyDescription].join('\n\n');

export default function About() {
  const content = usePageContent('about', aboutDefaultContent);
  const divider = /\r?\n[^\S\r\n]*\r?\n/.exec(content);
  const hero = divider ? content.slice(0, divider.index) : heroDescription;
  const story = divider ? content.slice(divider.index + divider[0].length) : content;

  return (
    <main className="page-shell about-page">
      <section className="about-hero">
        <div className="about-photo">
          <img className="about-hero-image" src={heroPhoto} alt="Ilustrasi kebaya dusty rose berpayet pada manekin" width="960" height="1440" fetchPriority="high"/>
        </div>
        <div className="about-copy">
          <p className="eyebrow">Kebaya Rental</p>
          <h1>Floo Attire</h1>
          <p className="script-copy">Ciptakan Momen<br/><em>Tak Terlupakan</em></p>
          <p className="whitespace-pre-line break-words">{hero}</p>
          <Link className="btn rounded-pill" to="/katalog">Lihat Katalog <ArrowRight size={18}/></Link>
        </div>
      </section>
      <section className="value-grid">
        {values.map(({ icon: Icon, title, text }) => (
          <article key={title} className="value-card">
            <span className="value-icon"><Icon size={28}/></span>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>
      <section className="about-story">
        <div>
          <p className="eyebrow">Tentang Kami</p>
          <h2>Tentang Floo Attire</h2>
          <p className="whitespace-pre-line break-words">{story}</p>
        </div>
        <img className="about-story-image" src={storyPhoto} alt="Ilustrasi deretan kebaya renda warna blush, ivory, mauve, dan burgundy" width="1200" height="800" loading="lazy"/>
      </section>
    </main>
  );
}
