import {pool} from './db.js';
import {ensureSitePagesTable} from './site-pages.js';

try {
  await ensureSitePagesTable();
  console.log('Tabel konten halaman siap.');
} finally {
  await pool.end();
}
