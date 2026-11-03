import {CalendarDays,Camera,Clock3,HeartHandshake,ShieldCheck,Shirt,MessageCircle,Gift,AlarmClock,Undo2} from 'lucide-react';
import usePageContent from '../lib/usePageContent';
const booking=[['Booking Mudah & Pasti','Fix booking cukup dengan DP Rp100.000.',CalendarDays],['Harga Sewa Jelas & Adil','Harga sewa mulai dari Rp500.000, cukup DP Rp200.000.',Camera],['Komitmen Kedua Belah Pihak','Customer wajib menunjukkan KTP asli saat pengambilan kebaya.',ShieldCheck],['Waktu Sewa Fleksibel','Pemesanan maksimal H-2 minggu sebelum pengambilan atau pengiriman.',Clock3]];
const benefits=[['Free Fitting','Jika sudah fitting wajib sewa. Lihat detail perbolehkan tanpa fitting.',Shirt],['Free Inner Manset & Hijab','Biar makin nyaman dan tetap syari.',Gift],['Free Konsultasi','Kami bantu pilihkan kebaya yang paling cocok untukmu.',MessageCircle],['Didampingi Saat Pemakaian','Tim kami siap membantu agar kamu tampil sempurna.',HeartHandshake]];
const damage=['Jika terjadi kerusakan atau kehilangan pada kebaya dan aksesoris, customer wajib mengganti sesuai harga barang yang rusak atau hilang.','Customer tidak diperkenankan menggunakan jarum pentul atau peniti yang dapat merusak kebaya.','Customer tidak diperkenankan mencuci kebaya setelah pemakaian, karena kami menyediakan FREE Laundry.','Dilarang menggunakan hairspray atau parfum langsung pada kebaya.'];
const fitting=['Wajib memakai kaos tipis atau manset saat fitting agar lebih akurat.','Wajib DP terlebih dahulu sebelum tanggal booking.','Sewa kebaya dihitung tiga hari: diambil H-1 dan dikembalikan H+1.','Jika pengembalian terlambat, dikenakan denda Rp50.000 per hari.','Jika customer membatalkan secara sepihak, maka DP hangus.','Resize kebaya dikenakan biaya Rp15.000, sedangkan resize kebaya dan bawahan Rp25.000.'];
const sections = [
  { title: 'Booking & Payment', icon: CalendarDays, items: booking },
  { title: 'Apa Saja yang Kamu Dapatkan?', icon: Gift, items: benefits },
  { title: 'Kerusakan Kebaya', icon: ShieldCheck, items: damage },
  { title: 'Prosedur Fitting', icon: Undo2, items: fitting },
];

export const rulesDefaultContent = sections
  .map(({ items }) => items.map((item) => typeof item === 'string' ? item : item.slice(0, 2).join(' | ')).join('\n'))
  .join('\n\n');

function RuleCard({ title, icon: Icon, items, entries }) {
  const titled = typeof items[0] !== 'string';
  return (
    <section className="rule-card">
      <h2><span className="rule-title-icon"><Icon size={23}/></span>{title}</h2>
      {titled ? (
        <div className="rule-list">
          {entries.map((entry, index) => {
            const separator = entry.indexOf(' | ');
            const ItemIcon = items[index]?.[2] ?? Icon;
            return (
              <div className="rule-item" key={index}>
                <span className="number">{index + 1}</span>
                <ItemIcon size={20}/>
                <p className="break-words min-w-0">
                  {separator === -1 ? entry : <><b>{entry.slice(0, separator)}</b><br/>{entry.slice(separator + 3)}</>}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-rule-list">
          {entries.map((entry, index) => (
            <p key={index}><span className="number">{index + 1}</span><span className="min-w-0 break-words">{entry}</span></p>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Rules() {
  const content = usePageContent('rules', rulesDefaultContent);
  const groups = content.trim().split(/\r?\n(?:[^\S\r\n]*\r?\n)+/);

  return (
    <main className="page-shell rules-page">
      <section className="rules-heading">
        <p className="eyebrow">Panduan Sewa Kebaya di Floo Attire</p>
        <h1>Rules &amp; Information</h1>
        <p className="ribbon">Mudah, Aman, &amp; Transparan</p>
      </section>
      <div className="rules-grid">
        {sections.map((section, index) => {
          const text = index === sections.length - 1 ? groups.slice(index).join('\n') : groups[index];
          const entries = text?.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
          return entries?.length ? <RuleCard key={section.title} {...section} entries={entries}/> : null;
        })}
      </div>
      <p className="rules-note"><AlarmClock size={16}/> Setiap detail kami siapkan dengan sepenuh hati. Terima kasih sudah memilih Floo Attire.</p>
    </main>
  );
}
