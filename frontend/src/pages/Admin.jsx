import {useEffect, useRef, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {
  BookOpen, ChevronLeft, ChevronRight, CirclePlus, CloudUpload, Eye, House,
  Image, LogOut, Menu, Pencil, Save, Search, Shirt, Tag, Trash2, X,
} from 'lucide-react';
import {request, imageUrl, rupiah} from '../lib/api';
import PageContentEditor from './PageContentEditor';
import {notifySuccess} from '../lib/adminAlerts';

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
  const [productResult, setProductResult] = useState(null);
  const [totalProducts, setTotalProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [summaryError, setSummaryError] = useState('');
  const productParams = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    q: query.trim(),
    category,
  });
  const productUrl = '/products?' + productParams;

  useEffect(() => {
    if (!token) navigate('/admin/login', {replace: true});
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const options = {signal: controller.signal};
    Promise.all([
      request('/products?page=1&limit=1', options),
      request('/categories', options),
    ]).then(([products, categoryList]) => {
      if (controller.signal.aborted) return;
      setTotalProducts(products.total);
      setCategories(categoryList);
      setSummaryError('');
    }).catch(error => {
      if (!controller.signal.aborted) setSummaryError('Gagal memuat ringkasan katalog. ' + error.message);
    });
    return () => controller.abort();
  }, [token, revision]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await request(productUrl, {signal: controller.signal});
        if (!controller.signal.aborted) setProductResult({...result, productUrl, revision});
      } catch (error) {
        if (!controller.signal.aborted) {
          setProductResult({items: [], total: 0, page: 1, productUrl, revision, error: error.message});
        }
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [token, productUrl, revision]);

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
      setMessage('');
      void notifySuccess(editing ? 'Produk berhasil diedit' : 'Produk berhasil ditambahkan');
    } catch (error) {
      if (saved) setEditing({...editing, ...saved});
      setMessage(saved ? 'Data produk tersimpan, tetapi foto gagal diunggah. ' + error.message : error.message);
    } finally {
      if (saved) refreshCatalog();
      setBusy(false);
    }
  }

  async function removeProduct(product) {
    if (!window.confirm('Hapus produk ' + product.name + '?')) return;
    setBusy(true);
    try {
      await request('/admin/products/' + product.id, {method: 'DELETE', headers: auth});
      if (editing?.id === product.id) reset();
      setMessage('');
      void notifySuccess('Produk berhasil dihapus');
      refreshCatalog();
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
      refreshCatalog();
      setMessage('Foto berhasil dihapus.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function resetCategory() {
    setNewCategory('');
    setEditingCategory(null);
  }

  async function saveCategory(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await request('/admin/categories' + (editingCategory ? '/' + editingCategory.id : ''), {
        method: editingCategory ? 'PUT' : 'POST',
        headers: auth,
        body: JSON.stringify({name: newCategory}),
      });
      resetCategory();
      refreshCatalog();
      setMessage(editingCategory ? 'Kategori berhasil diperbarui.' : 'Kategori berhasil ditambahkan.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeCategory(item) {
    if (!window.confirm('Hapus kategori ' + item.name + '?')) return;
    setBusy(true);
    try {
      await request('/admin/categories/' + item.id, {method: 'DELETE', headers: auth});
      if (editingCategory?.id === item.id) resetCategory();
      if (category === String(item.id)) {
        setCategory('');
        setPage(1);
      }
      refreshCatalog();
      setMessage('Kategori berhasil dihapus.');
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

  function refreshCatalog() {
    setRevision(current => current + 1);
  }

  if (!token) return null;

  const loading = productResult?.productUrl !== productUrl || productResult.revision !== revision;
  const productError = loading ? '' : productResult.error;
  const products = loading ? [] : productResult.items;
  const total = productResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = productResult?.page ?? 1;
  const pageNumbers = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])]
    .filter(number => number >= 1 && number <= totalPages)
    .sort((first, second) => first - second);
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
        <label><span>Nama Produk <span aria-hidden="true">*</span></span>
          <input className="field" required placeholder="Melati Lavender" {...field('name')}/>
        </label>
        <label><span>Harga Sewa (Rp) <span aria-hidden="true">*</span></span>
          <input className="field" required type="text" inputMode="numeric" placeholder="250.000"
            value={String(form.price).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            onChange={event => setForm(current => ({
              ...current,
              price: event.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''),
            }))}
          />
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
        <table className="dashboard-table" role="table" aria-label="Daftar produk" aria-busy={loading}>
          <thead role="rowgroup"><tr role="row">
            <th role="columnheader" scope="col">Foto</th><th role="columnheader" scope="col">Nama Produk</th><th role="columnheader" scope="col">Kategori</th>
            <th role="columnheader" scope="col">Harga Sewa</th><th role="columnheader" scope="col">Aksi</th>
          </tr></thead>
          <tbody role="rowgroup">
            {products.map(product => (
              <tr key={product.id} role="row">
                <td role="cell">{product.images?.[0] ? (
                  <img src={imageUrl(product.images[0].url)} alt={product.name}/>
                ) : <span className="dashboard-no-photo"><Image size={20} aria-label="Tanpa foto"/></span>}</td>
                <td role="cell"><strong>{product.name}</strong><small>{product.description}</small></td>
                <td role="cell"><span className="dashboard-tag">{product.category || 'Tanpa kategori'}</span></td>
                <td role="cell">{rupiah(product.price)}</td>
                <td role="cell"><div className="dashboard-row-actions">
                  <Link to={'/produk/' + product.slug} title="Lihat produk" aria-label={'Lihat ' + product.name}>
                    <Eye size={16}/>
                  </Link>
                  <button type="button" title="Edit produk" aria-label={'Edit ' + product.name}
                    disabled={busy} onClick={() => edit(product)}><Pencil size={16}/></button>
                  <button type="button" title="Hapus produk" aria-label={'Hapus ' + product.name}
                    disabled={busy} onClick={() => removeProduct(product)}><Trash2 size={16}/></button>
                </div></td>
              </tr>
            ))}
            {!products.length && <tr role="row"><td role="cell" className="dashboard-empty" colSpan={5}>
              {loading && 'Memuat produk...'}
              {productError && (
                <div role="status">
                  Gagal memuat produk. {productError}{' '}
                  <button type="button" className="dashboard-secondary" onClick={refreshCatalog}>Coba lagi</button>
                </div>
              )}
              {!loading && !productError && 'Tidak ada produk yang cocok.'}
            </td></tr>}
          </tbody>
        </table>
      </div>
      <div className="dashboard-pagination">
        <span>{!loading && !productError && (total
          ? `Menampilkan ${start + 1}–${start + products.length} dari ${total} produk`
          : '0 produk')}</span>
        {totalPages > 1 && <div aria-label="Paginasi produk">
          <button type="button" aria-label="Halaman sebelumnya" disabled={loading || currentPage === 1}
            onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17}/></button>
          {pageNumbers
            .map((number, index, numbers) => (
              <span key={number}>
                {index > 0 && number - numbers[index - 1] > 1 && <span aria-hidden="true">…</span>}
                <button type="button" className={number === currentPage ? 'active' : ''} disabled={loading}
                  aria-current={number === currentPage ? 'page' : undefined} onClick={() => setPage(number)}>
                  {number}
                </button>
              </span>
            ))}
          <button type="button" aria-label="Halaman berikutnya" disabled={loading || currentPage === totalPages}
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
          void notifySuccess('Logout berhasil');
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
        {summaryError && <p role="status" className="dashboard-notice">{summaryError}</p>}
        {view === 'dashboard' && <>
          <section className="dashboard-stats" aria-label="Ringkasan katalog">
            <article><Shirt size={39}/><div><span>Total Produk</span><b>{totalProducts ?? '–'}</b><small>produk kebaya</small></div></article>
            <article><Tag size={39}/><div><span>Kategori</span><b>{totalProducts === null ? '–' : categories.length}</b><small>kategori produk</small></div></article>
          </section>
          <div className="dashboard-grid">{productForm}{productTable}</div>
        </>}
        {view === 'products' && productTable}
        {view === 'form' && productForm}
        {view === 'categories' && (
          <section className="dashboard-panel">
            <h2>Kelola Kategori</h2>
            <form className="dashboard-fields" onSubmit={saveCategory}>
              <label>Nama kategori
                <input className="field" required value={newCategory} onChange={event => setNewCategory(event.target.value)}/>
              </label>
              <div className="dashboard-actions">
                {editingCategory && <button type="button" className="dashboard-secondary" disabled={busy} onClick={resetCategory}>Batal</button>}
                <button className="btn" disabled={busy}>{editingCategory ? 'Simpan Kategori' : 'Tambah Kategori'}</button>
              </div>
            </form>
            <ul className="dashboard-category-list">
              {categories.map(item => (
                <li key={item.id}>
                  <span className="dashboard-tag">{item.name}</span>
                  <div className="dashboard-row-actions">
                    <button type="button" title="Lihat produk dalam kategori" aria-label={'Lihat produk dalam kategori ' + item.name}
                      disabled={busy} onClick={() => {
                        search('');
                        setCategory(String(item.id));
                        selectView('products');
                      }}><Eye size={16}/></button>
                    <button type="button" title="Edit kategori" aria-label={'Edit kategori ' + item.name}
                      disabled={busy} onClick={() => {
                        setEditingCategory(item);
                        setNewCategory(item.name);
                      }}><Pencil size={16}/></button>
                    <button type="button" title="Hapus kategori" aria-label={'Hapus kategori ' + item.name}
                      disabled={busy} onClick={() => removeCategory(item)}><Trash2 size={16}/></button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {view === 'pages' && <PageContentEditor token={token}/>}
      </main>
    </div>
  );
}
