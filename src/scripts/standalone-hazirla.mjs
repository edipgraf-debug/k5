// "next build" sonrası çalışır: bağımsız sunucu klasörüne (.next/standalone) statik dosyaları,
// public klasörünü ve örnek okul logosunu kopyalar. Windows, macOS ve Linux'ta aynı şekilde çalışır.
import { cpSync, existsSync } from 'node:fs';

const hedef = '.next/standalone';
if (!existsSync(hedef)) {
  console.error('.next/standalone bulunamadı. Önce "npm run build" çalıştırın (next.config.ts içinde output: "standalone" olmalı).');
  process.exit(1);
}
cpSync('.next/static', `${hedef}/.next/static`, { recursive: true });
cpSync('public', `${hedef}/public`, { recursive: true });
if (existsSync('veri')) cpSync('veri', `${hedef}/veri`, { recursive: true });
console.log('Bağımsız sunucu hazır: node .next/standalone/server.js');
