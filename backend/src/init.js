import {pool} from './db.js';
import bcrypt from 'bcryptjs';
if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.startsWith('CHANGE_')) {
  console.error('Set ADMIN_PASSWORD yang kuat di .env sebelum inisialisasi.'); process.exit(1);
}
await pool.query(`
CREATE TABLE IF NOT EXISTS admins (
 id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
 id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
 id SERIAL PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
 category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
 price INTEGER NOT NULL CHECK (price >= 0),
 color TEXT NOT NULL DEFAULT '', sizes TEXT NOT NULL DEFAULT '',
 description TEXT NOT NULL DEFAULT '', available BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS product_images (
 id SERIAL PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 path TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0
);
`);
const hash=await bcrypt.hash(process.env.ADMIN_PASSWORD,12);
await pool.query('INSERT INTO admins(email,password_hash) VALUES($1,$2) ON CONFLICT(email) DO UPDATE SET password_hash=EXCLUDED.password_hash',[process.env.ADMIN_EMAIL,hash]);
for(const name of ['Kebaya','One Set','Dress','Rok']) await pool.query('INSERT INTO categories(name) VALUES($1) ON CONFLICT DO NOTHING',[name]);
console.log('Database siap, akun admin berhasil disiapkan.');
await pool.end();
