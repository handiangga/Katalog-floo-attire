import {useEffect, useRef, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {
  BookOpen, ChevronLeft, ChevronRight, CirclePlus, CloudUpload, House,
  Image, LogOut, Menu, Pencil, Save, Search, Shirt, Tag, Trash2, X,
} from 'lucide-react';
import {request, imageUrl, rupiah} from '../lib/api';
import PageContentEditor from './PageContentEditor';

const emptyForm = {name: '', price: '', category_id: '', color: '', sizes: '', description: ''};
const pageSize = 5;
const views = [
  {id: 'dashboard', label: 'Dashboard', icon: House},
  {id: 'products', label: 'Produk', icon: Shirt},
  {id: 'form', label: 'Tambah Produk', icon: CirclePlus},
  {id: 'categories', label: 'Kategori', icon: Tag},
  {id: 'pages', label: 'Tentang & Rules', icon: BookOpen},
];

export default function Admin() {
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const menuToggle = useRef(null);
  const heading = useRef(null);
  const token = sessionStorage.getItem('floo_admin_token');
  const auth = {Authorization: 'Bearer ' + token};
  const [view, setView] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [productList, categoryList] = await Promise.all([request('/products'), request('/categories')]);
    setProducts(productList);
    setCategories(categoryList);
  }

  useEffect(() => {
    if (!token) {
      navigate('/admin/login', {replace: true});
      return;
    }
    refresh().catch(error => setMessage(error.message)).finally(() => setLoading(false));
  }, [token, navigate]);

  useEffect(() => {
    if (!photo) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function clearPhoto() {
    setPhoto(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  function reset() {
    setEditing(null);
    setForm(emptyForm);
    clearPhoto();
  }

  function selectView(id) {
    if (id === 'form') reset();
    setView(id);
    if (menuOpen) heading.current?.focus({preventScroll: true});
    setMenuOpen(false);
    setMessage('');
    window.scrollTo({top: 0});
  }

  function edit(product) {
    setEditing(product);
    setForm({
      name: product.name,
      price: product.price,
      category_id: product.category_id ?? '',
      color: product.color ?? '',
      sizes: product.sizes ?? '',
      description: product.description ?? '',
    });
    clearPhoto();
    setMessage('');
    if (view !== 'dashboard') setView('form');
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  function selectPhoto(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setMessage('Pilih foto JPG, PNG, atau WebP dengan ukuran maksimal 10 MB.');
      return;
    }
    setMessage('');
    setPhoto(file);
  }

  async function saveProduct(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('Menyimpan produk...');
    let saved;
    try {
      const body = {
        ...form,
        price: Number(form.price),
        category_id: form.category_id ? Number(form.category_id) : null,
      };
      saved = await request('/admin/products' + (editing ? '/' + editing.id : ''), {
        method: editing ? 'PUT' : 'POST',
        headers: auth,
        body: JSON.stringify(body),
      });
      if (photo) {
        const data = new FormData();
        data.append('image', photo);
        await request('/admin/products/' + saved.id + '/images', {method: 'POST', headers: auth, body: data});
      }
      reset();
      setMessage('Produk berhasil disimpan.');
    } catch (error) {
      if (saved) setEditing({...editing, ...saved});
      setMessage(saved ? 'Data produk tersimpan, tetapi foto gagal diunggah. ' + error.message : error.message);
    } finally {
      if (saved) await refresh().catch(error => setMessage('Gagal memuat ulang daftar produk. ' + error.message));
      setBusy(false);
    }
  }

  async function removeProduct(product) {
    if (!window.confirm('Hapus produk ' + product.name + '?')) return;
    setBusy(true);
    try {
      await request('/admin/products/' + product.id, {method: 'DELETE', headers: auth});
      if (editing?.id === product.id) reset();
      await refresh();
      setMessage('Produk berhasil dihapus.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(id) {
    if (!window.confirm('Hapus foto produk ini?')) return;
    setBusy(true);
    try {
      await request('/admin/images/' + id, {method: 'DELETE', headers: auth});
      setEditing(current => ({...current, images: []}));
      await refresh();
      setMessage('Foto berhasil dihapus.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function addCategory(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await request('/admin/categories', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({name: newCategory}),
      });
      setNewCategory('');
      await refresh();
      setMessage('Kategori berhasil ditambahkan.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function search(value) {
    setQuery(value);
    setPage(1);
  }

  if (!token) return null;

  const searchTerm = query.trim().toLowerCase();
  const filtered = products.filter(product =>
    (!category || String(product.category_id) === category) &&
    product.name.toLowerCase().includes(searchTerm),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const existingPhoto = editing?.images?.[0];
  const photoUrl = photo ? preview : imageUrl(existingPhoto?.url);

  const field = key => ({
    value: form[key],
    onChange: event => setForm({...form, [key]: event.target.value}),
  });

  const productForm = (
    <section className="dashboard-panel">
      <h2>{editing ? 'Edit Produk' : 'Tambah Produk'}</h2>
      <form onSubmit={saveProduct} className="dashboard-fields">
        <label>Nama Produk <span aria-hidden="true">*</span>
          <input className="field" required placeholder="Melati Lavender" {...field('name')}/>
        </label>
        <label>Harga Sewa (Rp) <span aria-hidden="true">*</span>
          <input className="field" required type="number" min="0" placeholder="250000" {...field('price')}/>
        </label>
        <div className="dashboard-pair">
          <label>Kategori
            <select className="field" {...field('category_id')}>
              <option value="">Pilih kategori</option>
              {categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>Warna<input className="field" placeholder="Lavender" {...field('color')}/></label>
        </div>
        <label>Ukuran<input className="field" placeholder="S, M, L, XL" {...field('sizes')}/></label>
        <label>Deskripsi<textarea className="field" rows={3} placeholder="Detail kebaya" {...field('description')}/></label>
        <div>
          <label htmlFor="admin-product-photo">Upload Foto</label>
          <div className="dashboard-upload" onDragOver={event => event.preventDefault()}
            onDrop={event => {
              event.preventDefault();
              if (!busy) selectPhoto(event.dataTransfer.files[0]);
            }}>
            {photoUrl && (
              <div className="dashboard-upload-preview">
                <img src={photoUrl} alt="Pratinjau foto produk"/>
                <button type="button" aria-label={photo ? 'Batalkan pilihan foto' : 'Hapus foto produk'}
                  disabled={busy} onClick={() => photo ? clearPhoto() : removeImage(existingPhoto.id)}>
                  <X size={15}/>
                </button>
              </div>
            )}
            <label className="dashboard-upload-target">
              <input id="admin-product-photo" className="sr-only" ref={fileInput} type="file" disabled={busy}
                accept="image/jpeg,image/png,image/webp" onChange={event => selectPhoto(event.target.files[0])}/>
              <CloudUpload size={28} aria-hidden="true"/>
              <span>Pilih foto produk</span>
              <span className="hidden md:inline">Atau seret foto ke sini</span>
              <small>JPG, PNG, WebP · Maks. 10 MB</small>
            </label>
          </div>
        </div>
        <div className="dashboard-actions">
          <button type="button" className="dashboard-secondary" disabled={busy} onClick={reset}>Reset</button>
          <button className="btn" disabled={busy}><Save size={17}/> Simpan Produk</button>
        </div>
      </form>
    </section>
  );

  const productTable = (
    <section className="dashboard-panel">
      <h2>Daftar Produk</h2>
      <div className="dashboard-filters">
        <label className="search-field"><Search size={17}/>
          <input aria-label="Cari nama produk" placeholder="Cari nama produk..."
            value={query} onChange={event => search(event.target.value)}/>
        </label>
        <select className="field" aria-label="Filter kategori" value={category}
          onChange={event => { setCategory(event.target.value); setPage(1); }}>
          <option value="">Semua Kategori</option>
          {categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <div className="dashboard-table-wrap">
        <table className="dashboard-table">
          <thead><tr>
            <th scope="col">Foto</th><th scope="col">Nama Produk</th><th scope="col">Kategori</th>
            <th scope="col">Harga Sewa</th><th scope="col">Aksi</th>
          </tr></thead>
          <tbody>
            {filtered.slice(start, start + pageSize).map(product => (
              <tr key={product.id}>
                <td>{product.images?.[0] ? (
                  <img src={imageUrl(product.images[0].url)} alt={product.name}/>
                ) : <span className="dashboard-no-photo"><Image size={20} aria-label="Tanpa foto"/></span>}</td>
                <td><strong>{product.name}</strong><small>{product.description}</small></td>
                <td><span className="dashboard-tag">{product.category || 'Tanpa kategori'}</span></td>
                <td>{rupiah(product.price)}</td>
                <td><div className="dashboard-row-actions">
                  <button type="button" title="Edit produk" aria-label={'Edit ' + product.name}
                    disabled={busy} onClick={() => edit(product)}><Pencil size={16}/></button>
                  <button type="button" title="Hapus produk" aria-label={'Hapus ' + product.name}
                    disabled={busy} onClick={() => removeProduct(product)}><Trash2 size={16}/></button>
                </div></td>
              </tr>
            ))}
            {!filtered.length && <tr><td className="dashboard-empty" colSpan={5}>
              {loading ? 'Memuat produk...' : 'Tidak ada produk yang cocok.'}
            </td></tr>}
          </tbody>
        </table>
      </div>
      <div className="dashboard-pagination">
        <span>{filtered.length
          ? `Menampilkan ${start + 1}–${Math.min(start + pageSize, filtered.length)} dari ${filtered.length} produk`
          : '0 produk'}</span>
        {totalPages > 1 && <div aria-label="Paginasi produk">
          <button type="button" aria-label="Halaman sebelumnya" disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17}/></button>
          {Array.from({length: totalPages}, (_, index) => index + 1)
            .filter(number => number === 1 || number === totalPages || Math.abs(number - currentPage) <= 1)
            .map((number, index, numbers) => (
              <span key={number}>
                {index > 0 && number - numbers[index - 1] > 1 && <span aria-hidden="true">…</span>}
                <button type="button" className={number === currentPage ? 'active' : ''}
                  aria-current={number === currentPage ? 'page' : undefined} onClick={() => setPage(number)}>
                  {number}
                </button>
              </span>
            ))}
          <button type="button" aria-label="Halaman berikutnya" disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}><ChevronRight size={17}/></button>
        </div>}
      </div>
    </section>
  );

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar" data-menu-open={menuOpen} onKeyDown={event => {
        if (event.key !== 'Escape' || !menuOpen) return;
        setMenuOpen(false);
        menuToggle.current?.focus();
      }}>
        <Link to="/katalog" className="dashboard-brand" aria-label="Buka katalog Floo Attire">
          <span>F</span><strong>FLOO ATTIRE</strong><small>KEBAYA RENTAL</small>
        </Link>
        <button type="button" className="dashboard-menu-toggle" ref={menuToggle}
          aria-label={menuOpen ? 'Tutup menu admin' : 'Buka menu admin'}
          aria-expanded={menuOpen} aria-controls="dashboard-menu"
          onClick={() => setMenuOpen(open => !open)}>
          {menuOpen ? <X size={23} aria-hidden="true"/> : <Menu size={23} aria-hidden="true"/>}
        </button>
        <div id="dashboard-menu" className="dashboard-menu-panel">
        <nav className="dashboard-nav" aria-label="Navigasi admin">
          {views.map(({id, label, icon: Icon}) => (
            <button key={id} type="button" className={id === view ? 'active' : ''}
              aria-current={id === view ? 'page' : undefined} disabled={busy} onClick={() => selectView(id)}>
              <Icon size={21}/> {label}
            </button>
          ))}
        </nav>
        <button type="button" className="dashboard-logout" onClick={() => {
          sessionStorage.removeItem('floo_admin_token');
          navigate('/admin/login', {replace: true});
        }}><LogOut size={21}/> Keluar</button>
        </div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1 ref={heading} tabIndex={-1}>{view === 'dashboard' ? 'Dashboard Admin' : views.find(item => item.id === view).label}</h1>
          {(view === 'dashboard' || view === 'products') && (
            <label className="search-field"><Search size={18}/>
              <input aria-label="Cari di dashboard" placeholder="Cari di dashboard..."
                value={query} onChange={event => search(event.target.value)}/>
            </label>
          )}
        </header>
        {message && <p role="status" className="dashboard-notice">{message}</p>}
        {view === 'dashboard' && <>
          <section className="dashboard-stats" aria-label="Ringkasan katalog">
            <article><Shirt size={39}/><div><span>Total Produk</span><b>{loading ? '–' : products.length}</b><small>produk kebaya</small></div></article>
            <article><Tag size={39}/><div><span>Kategori</span><b>{loading ? '–' : categories.length}</b><small>kategori produk</small></div></article>
          </section>
          <div className="dashboard-grid">{productForm}{productTable}</div>
        </>}
        {view === 'products' && productTable}
        {view === 'form' && productForm}
        {view === 'categories' && (
          <section className="dashboard-panel">
            <h2>Kelola Kategori</h2>
            <form className="dashboard-fields" onSubmit={addCategory}>
              <label>Nama kategori
                <input className="field" required value={newCategory} onChange={event => setNewCategory(event.target.value)}/>
              </label>
              <div className="dashboard-actions"><button className="btn" disabled={busy}>Tambah Kategori</button></div>
            </form>
            <ul className="flex flex-wrap gap-2 mt-4">
              {categories.map(item => <li className="dashboard-tag" key={item.id}>{item.name}</li>)}
            </ul>
          </section>
        )}
        {view === 'pages' && <PageContentEditor token={token}/>}
      </main>
    </div>
  );
}
