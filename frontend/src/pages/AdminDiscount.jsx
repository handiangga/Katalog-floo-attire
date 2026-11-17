import {useEffect, useState} from 'react';
import {ChevronLeft, ChevronRight, Save, Search} from 'lucide-react';
import {request, rupiah} from '../lib/api';
import {notifySuccess} from '../lib/adminAlerts';
import './admin-discount.css';

const pageSize = 8;
const maxFlatPrice = 2147483647;
const maxSelectedProducts = 5000;

function ProductPicker({productIds, onToggle}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [result, setResult] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const selectedPageCount = Math.max(1, Math.ceil(productIds.length / pageSize));
  const selectedPage = Math.min(page, selectedPageCount);
  const start = (selectedPage - 1) * pageSize;
  const selectedPageIds = productIds.slice(start, start + pageSize);
  const params = selectedOnly
    ? new URLSearchParams({page: '1', limit: String(pageSize), ids: selectedPageIds.join(',')})
    : new URLSearchParams({page: String(page), limit: String(pageSize), q: query.trim()});
  const url = '/products?' + params;
  const emptySelection = selectedOnly && !productIds.length;

  useEffect(() => {
    if (emptySelection) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await request(url, {signal: controller.signal});
        if (!controller.signal.aborted) setResult({url, retryCount, data});
      } catch (error) {
        if (!controller.signal.aborted) setResult({url, retryCount, error: error.message});
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [url, emptySelection, retryCount]);

  const loading = !emptySelection && (result?.url !== url || result.retryCount !== retryCount);
  const error = loading || emptySelection ? '' : result?.error;
  const data = loading || emptySelection ? null : result?.data;
  const products = data?.items ?? [];
  const currentPage = selectedOnly ? selectedPage : (data?.page ?? 1);
  const pageCount = selectedOnly ? selectedPageCount : Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  const missingIds = selectedOnly && data
    ? selectedPageIds.filter(id => !products.some(product => Number(product.id) === id))
    : [];

  return (
    <section className="discount-products" aria-labelledby="discount-products-title" aria-busy={loading}>
      <div className="discount-products-header">
        <h3 id="discount-products-title">Pilih Produk</h3>
        <span className="dashboard-tag" aria-live="polite">{productIds.length} terpilih</span>
      </div>
      <div className="discount-product-tools">
        {!selectedOnly && (
          <label className="search-field">
            <Search size={18} aria-hidden="true"/>
            <input type="search" aria-label="Cari produk untuk diskon" placeholder="Cari nama produk..."
              value={query} onChange={event => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </label>
        )}
        <label>
          <input type="checkbox" checked={selectedOnly} onChange={event => {
            setSelectedOnly(event.target.checked);
            setPage(1);
          }}/>
          Tampilkan produk terpilih
        </label>
      </div>
      {loading && <p role="status">Memuat produk...</p>}
      {error && (
        <p role="status">Gagal memuat produk. {error}{' '}
          <button type="button" className="dashboard-secondary" onClick={() => setRetryCount(count => count + 1)}>Coba lagi</button>
        </p>
      )}
      {emptySelection && <p>Belum ada produk yang dipilih.</p>}
      {data && !products.length && !missingIds.length && <p>Tidak ada produk yang cocok.</p>}
      <div className="discount-product-list">
        {products.map(product => {
          const id = Number(product.id);
          return (
            <label key={id}>
              <input type="checkbox" checked={productIds.includes(id)} onChange={() => onToggle(id)}/>
              <span><strong>{product.name}</strong>{product.category && <small>{product.category}</small>}</span>
              <span>{rupiah(product.price)}</span>
            </label>
          );
        })}
        {missingIds.map(id => (
          <label key={id}>
            <input type="checkbox" checked onChange={() => onToggle(id)}/>
            <span>Produk #{id} sudah dihapus</span>
          </label>
        ))}
      </div>
      {pageCount > 1 && (
        <div className="dashboard-pagination discount-pagination" aria-label="Paginasi pilihan produk">
          <span>Halaman {currentPage} dari {pageCount}</span>
          <div>
            <button type="button" aria-label="Halaman pilihan sebelumnya" disabled={loading || currentPage === 1}
              onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18} aria-hidden="true"/></button>
            <button type="button" aria-label="Halaman pilihan berikutnya" disabled={loading || currentPage === pageCount}
              onClick={() => setPage(currentPage + 1)}><ChevronRight size={18} aria-hidden="true"/></button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function AdminDiscount({token}) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    request('/admin/discount', {
      headers: {Authorization: 'Bearer ' + token},
      signal: controller.signal,
    }).then(settings => {
      if (!controller.signal.aborted) {
        setForm(settings);
        setError('');
      }
    }).catch(error => {
      if (!controller.signal.aborted) setError(error.message);
    });
    return () => controller.abort();
  }, [token, retryCount]);

  function change(update) {
    setForm(current => ({...current, ...update}));
  }

  function toggleProduct(id) {
    if (form.productIds.length >= maxSelectedProducts && !form.productIds.includes(id)) {
      setError('Pilih maksimal 5.000 produk.');
      return;
    }
    setForm(current => ({
      ...current,
      productIds: current.productIds.includes(id)
        ? current.productIds.filter(productId => productId !== id)
        : [...current.productIds, id],
    }));
  }

  async function save(event) {
    event.preventDefault();
    const value = Number(form.value);
    const maximum = form.type === 'percent' ? 100 : maxFlatPrice;
    if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
      setError(form.type === 'percent'
        ? 'Masukkan persentase bulat 1 sampai 100.'
        : 'Masukkan harga akhir dari Rp1 sampai Rp2.147.483.647.');
      return;
    }
    if (form.enabled && form.scope === 'selected' && !form.productIds.length) {
      setError('Pilih minimal satu produk untuk mengaktifkan diskon.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const settings = await request('/admin/discount', {
        method: 'PUT',
        headers: {Authorization: 'Bearer ' + token},
        body: JSON.stringify({...form, value, productIds: form.scope === 'selected' ? form.productIds : []}),
      });
      setForm(settings);
      void notifySuccess('Pengaturan diskon berhasil disimpan');
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="dashboard-panel discount-panel">
      <h2>Pengaturan Diskon</h2>
      <p className="discount-help">Simpan untuk memperbarui satu promo yang berlaku di katalog.</p>
      {!form && !error && <p role="status">Memuat pengaturan diskon...</p>}
      {error && (
        <p className="dashboard-notice" role="alert">
          {error}{' '}
          {!form && (
            <button type="button" className="dashboard-secondary" onClick={() => {
              setError('');
              setRetryCount(count => count + 1);
            }}>Coba lagi</button>
          )}
        </p>
      )}
      {form && (
        <form onSubmit={save}>
          <fieldset className="dashboard-fields discount-fields" disabled={saving}>
            <label className="discount-checkbox">
              <input type="checkbox" checked={form.enabled} onChange={event => change({enabled: event.target.checked})}/>
              Aktifkan diskon
            </label>
            <div className="dashboard-pair">
              <label>Jenis Diskon
                <select className="field" value={form.type} onChange={event => change({type: event.target.value, value: ''})}>
                  <option value="percent">Persentase (%)</option>
                  <option value="flat">Harga Flat (Rp)</option>
                </select>
              </label>
              <label>{form.type === 'percent' ? 'Persentase (%)' : 'Harga Akhir (Rp)'}
                {form.type === 'flat' ? (
                  <input className="field" type="text" inputMode="numeric" required
                    value={String(form.value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    placeholder="100.000"
                    onChange={event => change({value: event.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')})}
                  />
                ) : (
                  <input className="field" type="number" inputMode="numeric" value={form.value}
                    min={1} max={100} step={1} required onChange={event => change({value: event.target.value})}/>
                )}
              </label>
            </div>
            {form.type === 'flat' && <p className="discount-help">Harga akhir berlaku untuk produk dengan harga awal yang lebih tinggi.</p>}
            <label>Berlaku Untuk
              <select className="field" value={form.scope} onChange={event => change({scope: event.target.value})}>
                <option value="all">Semua produk</option>
                <option value="selected">Produk pilihan</option>
              </select>
            </label>
            {form.scope === 'selected' && <ProductPicker productIds={form.productIds} onToggle={toggleProduct}/>}
            <div className="dashboard-actions">
              <button type="submit" className="btn"><Save size={17} aria-hidden="true"/>
                {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  );
}
