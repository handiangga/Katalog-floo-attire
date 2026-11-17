import {pool} from './db.js';
import {ensureDiscountCampaignTables} from './discount-campaigns.js';

try {
  await ensureDiscountCampaignTables();
  console.log('Tabel campaign diskon siap.');
} catch (error) {
  console.error('Migrasi campaign diskon gagal:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
