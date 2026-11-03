import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {request} from '../lib/api';
import {aboutDefaultContent} from './About';
import {rulesDefaultContent} from './Rules';

const pages = [
  {slug: 'about', title: 'Tentang', defaults: aboutDefaultContent,
    labels: ['Deskripsi pembuka', 'Tentang Floo Attire']},
  {slug: 'rules', title: 'Rules', defaults: rulesDefaultContent,
    labels: ['Booking & Payment', 'Apa Saja yang Kamu Dapatkan?', 'Kerusakan Kebaya', 'Prosedur Fitting']},
];

function splitContent(page, content) {
  const groups = content.split(/\r?\n[ \t]*\r?\n/);
  if (page.slug === 'about' && groups.length === 1) {
    return [page.defaults.split('\n\n')[0], content];
  }
  const last = page.labels.length - 1;
  return page.labels.map((_, index) =>
    index === last ? groups.slice(index).join('\n\n') : (groups[index] ?? ''),
  );
}

function Editor({page, token}) {
  const [fields, setFields] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    request('/pages/' + page.slug).then(({content}) => {
      if (active) setFields(splitContent(page, content ?? page.defaults));
    }).catch(error => {
      if (active) setMessage('Gagal memuat isi halaman. ' + error.message);
    });
    return () => { active = false; };
  }, [page]);

  async function save(event) {
    event.preventDefault();
    const values = fields.map(text => text.trim().replace(/\n[ \t]*\n+/g, '\n'));
    const content = values.join('\n\n');
    if (values.some(text => !text) || content.length > 10000) {
      setMessage('Isi semua bagian dengan total maksimal 10.000 karakter.');
      return;
    }
    setSaving(true);
    setMessage('Menyimpan...');
    try {
      const saved = await request('/admin/pages/' + page.slug, {
        method: 'PUT',
        headers: {Authorization: 'Bearer ' + token},
        body: JSON.stringify({content}),
      });
      setFields(splitContent(page, saved.content));
      setMessage('Perubahan tersimpan dan sudah tampil di halaman publik.');
    } catch (error) {
      setMessage('Gagal menyimpan. ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg text-wine">Edit {page.title}</h3>
        <Link to={'/' + page.slug} target="_blank" rel="noopener" className="text-sm underline">
          Lihat halaman
        </Link>
      </div>
      {page.slug === 'rules' && (
        <p className="text-sm">Tulis satu aturan per baris. Untuk dua bagian pertama, gunakan format Judul | Penjelasan jika perlu.</p>
      )}
      {fields && page.labels.map((label, index) => (
        <label key={label} className="block text-sm font-medium">
          {label}
          <textarea className="field mt-1" required rows={4} disabled={saving} value={fields[index]}
            onChange={event => setFields(fields.map((value, position) =>
              position === index ? event.target.value : value,
            ))}
          />
        </label>
      ))}
      {fields && <button className="btn" disabled={saving}>Simpan {page.title}</button>}
      <p role="status" className="text-sm">{message || (!fields && 'Memuat isi halaman...')}</p>
    </form>
  );
}

export default function PageContentEditor({token}) {
  return (
    <details className="mb-6 rounded-2xl border border-rose-200 bg-white p-4">
      <summary className="cursor-pointer font-semibold text-wine">Edit Halaman Tentang &amp; Rules</summary>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {pages.map(page => <Editor key={page.slug} page={page} token={token}/>)}
      </div>
    </details>
  );
}
