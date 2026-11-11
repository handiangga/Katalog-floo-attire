import {useEffect, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight, Search} from 'lucide-react';
import {useSearchParams} from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import {request} from '../lib/api';
import {getFavorites} from '../lib/favorites';
import './catalog.css';

const pageSize = 24;

function CatalogPagination({page, totalPages, onPageChange}) {
  const pages = Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter(number => number >= 1 && number <= totalPages)
    .sort((a, b) => a - b);

  return (
    <nav className="catalog-pagination" aria-label="Halaman katalog">
      <button type="button" aria-label="Halaman sebelumnya" disabled={page === 1}
        onClick={() => onPageChange(page - 1)}><ChevronLeft size={18}/></button>
      <span className="catalog-pagination-numbers">
        {pages.map((number, index) => (
          <span key={number}>
            {number - pages[index - 1] > 1 && <span className="catalog-page-gap" aria-hidden="true">…</span>}
            <button type="button" aria-label={'Halaman ' + number} disabled={page === number}
              aria-current={page === number ? 'page' : undefined} onClick={() => onPageChange(number)}>
              {number}
            </button>
          </span>
        ))}
      </span>
      <span className="catalog-page-position">{page} dari {totalPages}</span>
      <button type="button" aria-label="Halaman berikutnya" disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}><ChevronRight size={18}/></button>
    </nav>
  );
}

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [whatsapp, setWhatsapp] = useState('');
  const [favorites, setFavorites] = useState(getFavorites);
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const results = useRef(null);
  const onlyFav = params.get('favorit') === '1';
  const filters = {
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    sort: params.get('sort') || 'newest',
    color: params.get('color') ?? '',
    size: params.get('size') ?? '',
  };
  const apiParams = new URLSearchParams({...filters, page: params.get('page') || '1', limit: pageSize});
  if (onlyFav) apiParams.set('ids', favorites.join(','));
  const query = apiParams.toString();
  const current = result?.query === query ? result : null;

  useEffect(() => {
    request('/categories').then(setCategories).catch(() => {});
    request('/settings').then(settings => setWhatsapp(settings.whatsapp)).catch(() => {});
    const update = () => setFavorites(getFavorites());
    window.addEventListener('floo-favorites-changed', update);
    return () => window.removeEventListener('floo-favorites-changed', update);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await request('/products?' + query, {signal: controller.signal});
        if (!controller.signal.aborted) setResult({query, data});
      } catch (error) {
        if (!controller.signal.aborted) setResult({query, error: error.message});
      }
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, attempt]);

  function changeFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next, {replace: true});
  }

  function changePage(page) {
    const next = new URLSearchParams(params);
    if (page === 1) next.delete('page');
    else next.set('page', page);
    setParams(next);
    results.current?.focus({preventScroll: true});
    results.current?.scrollIntoView({block: 'start'});
  }

  function resetFilters() {
    setParams(onlyFav ? {favorit: '1'} : {}, {replace: true});
  }

  const data = current?.data;
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <main className="catalog-page">
      <div className="catalog-title">
        <p className="ornament" aria-hidden="true">⌁</p>
        <h1>Katalog Sewa Kebaya</h1>
      </div>
      <section className="catalog-filters" aria-label="Filter katalog">
        <label className="search-field">
          <Search size={19} aria-hidden="true"/>
          <input aria-label="Cari nama kebaya" placeholder="Cari nama kebaya..." value={filters.q}
            onChange={event => changeFilter('q', event.target.value)}/>
        </label>
        <select aria-label="Kategori" value={filters.category} onChange={event => changeFilter('category', event.target.value)}>
          <option value="">Semua Kategori</option>
          {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <input aria-label="Warna" placeholder="Semua Warna" value={filters.color}
          onChange={event => changeFilter('color', event.target.value)}/>
        <input aria-label="Ukuran" placeholder="Ukuran (S - XL)" value={filters.size}
          onChange={event => changeFilter('size', event.target.value)}/>
        <select aria-label="Urutan produk" value={filters.sort} onChange={event => changeFilter('sort', event.target.value)}>
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="price_asc">Harga terendah</option>
          <option value="price_desc">Harga tertinggi</option>
          <option value="name">Nama A-Z</option>
        </select>
      </section>
      <div className="catalog-utility">
        <button type="button" onClick={resetFilters}>Reset filter</button>
        <label>
          <input type="checkbox" checked={onlyFav} onChange={event => changeFilter('favorit', event.target.checked ? '1' : '')}/>
          {' '}Favorit Saya
        </label>
      </div>
      <section className="catalog-results" ref={results} tabIndex={-1} aria-label="Hasil katalog">
        {!current && <p className="catalog-count" role="status">Memuat koleksi...</p>}
        {current?.error && (
          <div className="text-red-700">
            <p role="alert">{current.error}</p>
            <button type="button" className="underline" onClick={() => { setResult(null); setAttempt(value => value + 1); }}>
              Coba lagi
            </button>
          </div>
        )}
        {data && (
          <>
            <p className="catalog-count" role="status">
              {data.total > 0
                ? 'Menampilkan ' + ((data.page - 1) * data.limit + 1) + '–' +
                  ((data.page - 1) * data.limit + data.items.length) + ' dari ' + data.total + ' koleksi'
                : '0 koleksi ditemukan'}
            </p>
            <div className="catalog-grid">
              {data.items.map(product => <ProductCard key={product.id} product={product} whatsapp={whatsapp}/>)}
            </div>
            {data.total === 0 && (
              <p className="text-center py-12 text-stone-600">
                {onlyFav ? 'Tidak ada favorit yang sesuai.' : 'Belum ada koleksi yang sesuai. Coba ubah filter.'}
              </p>
            )}
            {totalPages > 1 && <CatalogPagination page={data.page} totalPages={totalPages} onPageChange={changePage}/>}
          </>
        )}
      </section>
    </main>
  );
}
