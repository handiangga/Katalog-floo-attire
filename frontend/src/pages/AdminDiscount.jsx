import {useEffect, useState} from 'react';
import {Eye, Pencil, Plus, Search} from 'lucide-react';
import {request} from '../lib/api';
import AdminDiscountEditor from './AdminDiscountEditor';
import './admin-discount.css';

const endpoint = '/admin/discount-campaigns';
const statuses = {all: 'Semua', scheduled: 'Terjadwal', active: 'Berjalan', ended: 'Selesai'};
const dateFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short',
});

export default function AdminDiscount({token}) {
  const [items, setItems] = useState(null);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState(null);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const listVisible = view === null;

  useEffect(() => {
    if (!listVisible) return;
    const controller = new AbortController();
    const fetchList = async () => {
      try {
        const campaigns = await request(endpoint, {
          headers: {Authorization: 'Bearer ' + token}, signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setItems(campaigns);
          setError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      }
    };
    void fetchList();
    const interval = setInterval(fetchList, 60_000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [token, listVisible, reload]);

  async function openCampaign(id, readOnly) {
    setOpening(true);
    setError('');
    try {
      const campaign = await request(endpoint + '/' + id, {headers: {Authorization: 'Bearer ' + token}});
      setView({campaign, readOnly});
      window.scrollTo({top: 0});
    } catch (err) {
      setError(err.message);
    } finally {
      setOpening(false);
    }
  }

  function returnToList() {
    setItems(null);
    setError('');
    setView(null);
    window.scrollTo({top: 0});
  }

  if (view) return <AdminDiscountEditor token={token} {...view} onCancel={returnToList} onSaved={() => {
    setStatus('all');
    setQuery('');
    returnToList();
  }}/>;

  const filtered = items?.filter(item => (status === 'all' || item.status === status) &&
    item.name.toLocaleLowerCase('id-ID').includes(query.trim().toLocaleLowerCase('id-ID')));

  return (
    <section className="dashboard-panel campaign-list-panel">
      <header className="campaign-toolbar">
        <h2>Daftar Campaign Diskon</h2>
        <button type="button" className="btn" disabled={opening} onClick={() => {
          setView({campaign: null, readOnly: false});
          window.scrollTo({top: 0});
        }}><Plus size={18}/> Buat Campaign</button>
      </header>
      <div className="campaign-list-tools">
        <div className="campaign-tabs" role="group" aria-label="Filter status campaign">
          {Object.entries(statuses).map(([id, label]) => (
            <button type="button" key={id} aria-pressed={status === id}
              onClick={() => setStatus(id)}>{label}</button>
          ))}
        </div>
        <label className="search-field">
          <Search size={17} aria-hidden="true"/>
          <input type="search" aria-label="Cari nama campaign" placeholder="Cari nama campaign..."
            value={query} onChange={event => setQuery(event.target.value)}/>
        </label>
      </div>
      {error && <p className="campaign-error" role="alert">{error}{' '}
        <button className="dashboard-secondary" type="button" onClick={() => setReload(value => value + 1)}>Muat ulang</button>
      </p>}
      {!items && !error && <p className="campaign-empty" role="status">Memuat campaign...</p>}
      {filtered?.length === 0 && <p className="campaign-empty">{items.length
        ? 'Tidak ada campaign yang cocok.' : 'Belum ada campaign diskon.'}</p>}
      {!!filtered?.length && (
        <ul className="campaign-list">
          {filtered.map(item => (
            <li key={item.id} className="campaign-list-row">
              <div>
                <span className={'campaign-status campaign-status-' + item.status}>{statuses[item.status]}</span>
                <strong className="campaign-name">{item.name}</strong>
              </div>
              <div className="campaign-period">
                <small>Periode (WIB)</small>
                <span>Mulai {dateFormat.format(new Date(item.startsAt))}</span>
                <span>Selesai {item.endsAt ? dateFormat.format(new Date(item.endsAt)) : 'belum ditentukan'}</span>
              </div>
              <span>{item.productCount} produk</span>
              <div className="campaign-actions">
                <button type="button" className="dashboard-secondary campaign-icon" disabled={opening}
                  title="Rincian campaign" aria-label={'Rincian ' + item.name} onClick={() => openCampaign(item.id, true)}>
                  <Eye size={17}/>
                </button>
                <button type="button" className="dashboard-secondary campaign-icon" disabled={opening}
                  title="Edit campaign" aria-label={'Edit ' + item.name} onClick={() => openCampaign(item.id, false)}>
                  <Pencil size={17}/>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
