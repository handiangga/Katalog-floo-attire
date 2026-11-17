import {pool} from './db.js';
import {ensureCatalogDiscountTable} from './catalog-discount.js';

try {
  await ensureCatalogDiscountTable();
  console.log('Tabel diskon katalog siap.');
} finally {
  await pool.end();
}
