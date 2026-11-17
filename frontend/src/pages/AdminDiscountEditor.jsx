import {useState} from 'react';
import {ArrowLeft, Plus, Save, Trash2} from 'lucide-react';
import {request, rupiah} from '../lib/api';
import {notifySuccess} from '../lib/adminAlerts';
import DiscountProductPicker, {maxCampaignProducts} from './DiscountProductPicker';

const maxFlatPrice = 2_147_483_647;
const jakartaOffset = 7 * 60 * 60 * 1000;
const formatInputDate = timestamp => timestamp
  ? new Date(new Date(timestamp).getTime() + jakartaOffset).toISOString().slice(0, 16)
  : '';

function priceAfterDiscount(price, type, value) {
  const number = Number(value);
  const max = type === 'percent' ? 100 : maxFlatPrice;
  if (!Number.isInteger(number) || number < 1 || number > max) return null;
  const result = type === 'percent' ? Math.round(price * (100 - number) / 100) : number;
  return result < price ? result : null;
}

function DiscountFields({type, value, onChange, label, disabled}) {
  const flat = type === 'flat';
  return (
    <div className="campaign-discount-fields">
      <select className="field" aria-label={'Jenis diskon ' + label} value={type} disabled={disabled}
        onChange={event => onChange({type: event.target.value, value: ''})}>
        <option value="percent">Persen (%)</option>
        <option value="flat">Harga Flat (Rp)</option>
      </select>
      <input type="text" className="field" aria-label={(flat ? 'Harga akhir ' : 'Persentase diskon ') + label}
        inputMode="numeric" placeholder={flat ? '150.000' : '10%'} disabled={disabled}
        value={flat ? String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : value}
        onChange={event => onChange({
          value: event.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, flat ? 10 : 3),
        })}/>
    </div>
  );
}

export default function AdminDiscountEditor({token, campaign, readOnly, onCancel, onSaved}) {
  const [name, setName] = useState(campaign?.name ?? '');
  const [startsAt, setStartsAt] = useState(() => formatInputDate(campaign?.startsAt ?? Date.now()));
  const [endsAt, setEndsAt] = useState(() => formatInputDate(campaign ? campaign.endsAt : Date.now() + 86_400_000));
  const [products, setProducts] = useState(campaign?.products ?? []);
  const [checked, setChecked] = useState(new Set());
  const [bulk, setBulk] = useState({type: 'percent', value: ''});
  const [bulkError, setBulkError] = useState('');
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const canLeaveEndOpen = campaign?.endsAt === null;

  function addProducts(picked) {
    setProducts(current => [
      ...current,
      ...picked.map(({id, name, price}) => ({productId: id, name, price, type: 'percent', value: ''})),
    ]);
    setPicking(false);
    setError('');
  }

  function toggleChecked(id) {
    setChecked(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeProduct(id) {
    setProducts(current => current.filter(product => product.productId !== id));
    if (checked.has(id)) toggleChecked(id);
  }

  function applyBulk(all) {
    const targets = products.filter(product => !product.removed && (all || checked.has(product.productId)));
    if (!targets.length) return;
    const invalid = targets.find(product => priceAfterDiscount(product.price, bulk.type, bulk.value) === null);
    if (invalid) {
      setBulkError('Diskon massal harus menghasilkan harga yang lebih rendah. Cek nilai diskon untuk ' + invalid.name + '.');
      return;
    }
    const ids = new Set(targets.map(product => product.productId));
    setProducts(current => current.map(product => ids.has(product.productId) ? {...product, ...bulk} : product));
    setBulkError('');
  }

  async function save(event) {
    event.preventDefault();
    if (saving || readOnly) return;
    if (!name.trim()) return setError('Masukkan nama campaign.');
    if (!startsAt || (!endsAt && !canLeaveEndOpen) || (endsAt && endsAt <= startsAt)) {
      return setError('Waktu selesai harus setelah waktu mulai.');
    }
    if (!campaign && !products.length) return setError('Tambahkan minimal satu produk.');
    if (products.length > maxCampaignProducts) return setError('Campaign dibatasi hingga 1.000 produk.');
    const invalid = products.find(product => product.removed || priceAfterDiscount(product.price, product.type, product.value) === null);
    if (invalid) return setError(invalid.removed
      ? 'Keluarkan produk ' + invalid.name + ' yang sudah dihapus dari katalog.'
      : 'Isi diskon yang valid untuk ' + invalid.name + '.');

    setSaving(true);
    setError('');
    try {
      const path = '/admin/discount-campaigns' + (campaign ? '/' + campaign.id : '');
      await request(path, {
        method: campaign ? 'PUT' : 'POST',
        headers: {Authorization: 'Bearer ' + token},
        body: JSON.stringify({
          name: name.trim(),
          startsAt: startsAt + '+07:00',
          endsAt: endsAt ? endsAt + '+07:00' : null,
          products: products.map(({productId, type, value}) => ({productId, type, value: Number(value)})),
        }),
      });
      onSaved();
      void notifySuccess(campaign ? 'Campaign diperbarui' : 'Campaign dibuat');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="campaign-editor">
      <button type="button" onClick={onCancel} className="dashboard-secondary campaign-back" disabled={saving}>
        <ArrowLeft size={17}/> Kembali ke daftar
      </button>
      <form onSubmit={save}>
        <fieldset disabled={saving || readOnly} className="campaign-editor-fields">
          <section className="dashboard-panel campaign-info">
            <h2>{readOnly ? 'Rincian Campaign' : campaign ? 'Edit Campaign' : 'Buat Campaign'}</h2>
            <div className="dashboard-fields">
              <label>Nama Campaign
                <input className="field" maxLength={150} required value={name} onChange={event => setName(event.target.value)}/>
              </label>
              <div className="dashboard-pair campaign-dates">
                <label>Mulai (WIB)
                  <input className="field" type="datetime-local" required value={startsAt}
                    onChange={event => setStartsAt(event.target.value)}/>
                </label>
                <label>Selesai (WIB)
                  <input className="field" type="datetime-local" required={!canLeaveEndOpen} value={endsAt}
                    onChange={event => setEndsAt(event.target.value)}/>
                </label>
              </div>
              {canLeaveEndOpen && <p className="discount-help">Isi waktu selesai jika ingin menjadwalkan akhir promo sebelumnya.</p>}
            </div>
          </section>
          <section className="dashboard-panel">
            <header className="campaign-toolbar campaign-product-header">
              <div><h3>Produk dalam Campaign</h3><p className="discount-help">{products.length} produk</p></div>
              {!readOnly && <button type="button" className="dashboard-secondary campaign-back" onClick={() => setPicking(true)}>
                <Plus size={17}/> Tambah Produk
              </button>}
            </header>
            {!readOnly && products.length > 0 && (
              <div className="campaign-bulk">
                <div><strong>Edit Massal</strong><p className="discount-help">{checked.size} produk dicentang</p></div>
                <DiscountFields {...bulk} label="massal" onChange={update => {
                  setBulk(current => ({...current, ...update}));
                  setBulkError('');
                }}/>
                <div className="campaign-actions">
                  <button type="button" className="dashboard-secondary" disabled={!checked.size} onClick={() => applyBulk(false)}>
                    Terapkan ke pilihan
                  </button>
                  <button type="button" className="dashboard-secondary" onClick={() => applyBulk(true)}>Terapkan ke semua</button>
                </div>
                {bulkError && <p className="campaign-error campaign-bulk-error" role="alert">{bulkError}</p>}
              </div>
            )}
            {!products.length && <p className="campaign-empty">
              {campaign && !readOnly
                ? 'Campaign kosong. Simpan untuk mengeluarkan semua produk dari campaign ini.'
                : 'Belum ada produk dalam campaign ini.'}
            </p>}
            <ul className="campaign-product-list">
              {products.map(product => {
                const preview = priceAfterDiscount(product.price, product.type, product.value);
                return (
                  <li key={product.productId} className="campaign-product-row">
                    <div className="campaign-product-name">
                      {!readOnly && <input type="checkbox" checked={checked.has(product.productId)}
                        aria-label={'Pilih untuk edit massal: ' + product.name}
                        disabled={product.removed} onChange={() => toggleChecked(product.productId)}/>}
                      <div><strong>{product.name}</strong><small>
                        {product.removed ? 'Produk dihapus dari katalog' : 'Harga asli ' + rupiah(product.price)}
                      </small></div>
                    </div>
                    {readOnly ? <span>{product.type === 'percent' ? product.value + '%' : rupiah(product.value)}</span>
                      : <DiscountFields type={product.type} value={product.value} label={product.name}
                        disabled={product.removed} onChange={update => setProducts(current =>
                          current.map(item => item.productId === product.productId ? {...item, ...update} : item),
                        )}/>}
                    <div className="campaign-product-price"><small>Harga promo</small><strong>{preview === null ? '—' : rupiah(preview)}</strong></div>
                    {!readOnly && <button type="button" className="dashboard-secondary campaign-icon"
                      aria-label={'Keluarkan ' + product.name + ' dari campaign'} onClick={() => removeProduct(product.productId)}>
                      <Trash2 size={16}/>
                    </button>}
                  </li>
                );
              })}
            </ul>
          </section>
          {!readOnly && (
            <div className="campaign-save">
              {error && <p className="campaign-error" role="alert">{error}</p>}
              <div className="campaign-actions">
                <button type="button" className="dashboard-secondary" onClick={onCancel}>Batal</button>
                <button type="submit" className="btn"><Save size={17}/> {saving ? 'Menyimpan...' : 'Simpan Campaign'}</button>
              </div>
            </div>
          )}
        </fieldset>
      </form>
      {picking && <DiscountProductPicker token={token} campaignId={campaign?.id}
        existing={new Set(products.map(product => product.productId))}
        onClose={() => setPicking(false)} onAdd={addProducts}/>}
    </div>
  );
}
