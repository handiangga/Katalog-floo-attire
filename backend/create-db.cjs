
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = '/postgres';

  const client = new Client({
    connectionString: url.toString()
  });

  try {
    await client.connect();
    await client.query('CREATE DATABASE floo_attire');
    console.log('Database floo_attire berhasil dibuat!');
  } catch (error) {
    if (error.code === '42P04') {
      console.log('Database sudah ada.');
    } else {
      console.error('Error:', error.message);
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main();
