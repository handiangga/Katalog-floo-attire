import {useEffect, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight, Search, X} from 'lucide-react';
import {request, rupiah} from '../lib/api';

export const maxCampaignProducts = 1000;
const pageSize = 10;

async function loadEligibleCatalog(existing, reservations) {
  const products = new Map();
  let page = 1;
  let result;
  do {
    result = await request('/products?' + new URLSearchParams({page, limit: 100, sort: 'oldest'}));
    for (const product of result.items) {
      if (!existing.has(product.id) && !reservations.has(product.id)) products.set(product.id, product);
    }
    if (existing.size + products.size > maxCampaignProducts) throw new Error('Campaign dibatasi hingga 1.000 produk.');
    page += 1;
  } while (page <= Math.ceil(result.total / result.limit));
  return [...products.values()];
}

export default function DiscountProductPicker({token, campaignId, existing, onClose, onAdd}) {
  const dialog = useRef(null);
  const [selected, setSelected] = useState(new Map());
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [addingAll, setAddingAll] = useState(false);
  const [reservations, setReservations] = useState(null);
  const [reservationError, setReservationError] = useState('');

  useEffect(() => {
    const modal = dialog.current;
    modal.showModal();
    return () => modal.close();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    request('/categories', {signal: controller.signal}).then(setCategories).catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    request('/admin/discount-campaigns/reservations', {
      headers: {Authorization: 'Bearer ' + token},
      signal: controller.signal,
    }).then(items => {
      if (controller.signal.aborted) return;
      const byProduct = new Map();
      for (const item of items) {
        if (item.campaignId !== campaignId) byProduct.set(item.productId, item.campaignName);
      }
      setReservations(byProduct);
    }).catch(err => {
      if (!controller.signal.aborted) setReservationError('Gagal memeriksa produk yang terpakai. ' + err.message);
    });
    return () => controller.abort();
  }, [token, campaignId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const result = await request('/products?' + new URLSearchParams({page, limit: pageSize, q: query, category}), {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setData(result);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, category, page]);

  function toggle(product) {
    if (!reservations || reservations.has(product.id) || existing.has(product.id)) return;
    const next = new Map(selected);
    if (next.has(product.id)) next.delete(product.id);
    else if (existing.size + next.size < maxCampaignProducts) next.set(product.id, product);
    else {
      setError('Campaign dibatasi hingga 1.000 produk.');
      return;
    }
    setSelected(next);
  }

  async function addAll() {
    if (!reservations) return;
    setAddingAll(true);
    setError('');
    try {
      const eligible = await loadEligibleCatalog(existing, reservations);
      setSelected(new Map(eligible.map(product => [product.id, product])));
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingAll(false);
    }
  }

  const currentPage = data?.page ?? 1;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  return (
    <dialog className="campaign-picker" ref={dialog} aria-labelledby="campaign-picker-title"
      onCancel={event => { event.preventDefault(); if (!addingAll) onClose(); }}>
      <header className="campaign-toolbar">
        <h3 id="campaign-picker-title">Pilih Produk</h3>
        <button className="dashboard-secondary campaign-icon" type="button" aria-label="Tutup pemilih produk"
          disabled={addingAll} onClick={onClose}><X size={18}/></button>
      </header>
      <div className="campaign-picker-filters">
        <label className="search-field">
          <Search size={18} aria-hidden="true"/>
          <input aria-label="Cari nama produk" type="search" placeholder="Cari nama produk..." value={query}
            onChange={event => { setQuery(event.target.value); setPage(1); }}/>
        </label>
        <select className="field" aria-label="Kategori produk" value={category}
          onChange={event => { setCategory(event.target.value); setPage(1); }}>
          <option value="">Semua kategori</option>
          {categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <button className="dashboard-secondary" type="button" onClick={addAll} disabled={addingAll || !reservations}>
        {addingAll ? 'Memilih produk...' : 'Pilih semua produk yang bisa ditambahkan'}
      </button>
      {error && <p className="campaign-error" role="alert">{error}</p>}
      {reservationError && <p className="campaign-error" role="alert">{reservationError}</p>}
      {!reservations && !reservationError && <p className="discount-help" role="status">Memeriksa produk yang terpakai...</p>}
      <div className="campaign-picker-results" aria-busy={loading}>
        {loading && <p role="status">Memuat produk...</p>}
        {!loading && data?.items.map(product => {
          const reservedBy = reservations?.get(product.id);
          const alreadyAdded = existing.has(product.id);
          return (
            <label className="campaign-picker-row" key={product.id} data-reserved={Boolean(reservedBy)}>
              <input type="checkbox" checked={alreadyAdded || selected.has(product.id)}
                disabled={addingAll || !reservations || Boolean(reservedBy) || alreadyAdded}
                onChange={() => toggle(product)}/>
              <span>
                <strong>{product.name}</strong>
                <small>{reservedBy ? 'Terpakai di campaign ' + reservedBy : alreadyAdded ? 'Sudah ditambahkan' : product.category}</small>
              </span>
              <span>{rupiah(product.price)}</span>
            </label>
          );
        })}
        {!loading && data?.total === 0 && <p>Tidak ada produk yang sesuai.</p>}
      </div>
      {totalPages > 1 && (
        <div className="campaign-toolbar campaign-picker-pagination">
          <button type="button" className="dashboard-secondary campaign-icon" aria-label="Halaman sebelumnya"
            disabled={loading || currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18}/></button>
          <span>Halaman {currentPage} dari {totalPages}</span>
          <button type="button" className="dashboard-secondary campaign-icon" aria-label="Halaman berikutnya"
            disabled={loading || currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={18}/></button>
        </div>
      )}
      <footer className="campaign-toolbar campaign-picker-footer">
        <span aria-live="polite">{selected.size} produk dipilih</span>
        <div className="campaign-actions">
          <button type="button" className="dashboard-secondary" disabled={addingAll} onClick={onClose}>Batal</button>
          <button type="button" className="btn" disabled={!selected.size || addingAll || !reservations}
            onClick={() => onAdd([...selected.values()])}>Tambahkan</button>
        </div>
      </footer>
    </dialog>
  );
}
