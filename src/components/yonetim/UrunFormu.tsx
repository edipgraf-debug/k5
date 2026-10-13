'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { UrunKaydi } from '@/lib/data/ticaret';
import { Alan, Anahtar, DurumMesaji, FormKarti, Satir, useIstek } from './ortak';

const tl = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

/** Ürünün sitede düzenlenen alanları ve kapak görseli */
export default function UrunFormu({ urun }: { urun: UrunKaydi }) {
  const router = useRouter();
  const { durum, setDurum, bekliyor, gonder } = useIstek();
  const [aktif, setAktif] = useState(urun.aktif);
  const [web, setWeb] = useState(urun.webFiyati != null ? String(urun.webFiyati).replace('.', ',') : '');
  const [aciklama, setAciklama] = useState(urun.aciklama ?? '');
  const [kapakDurum, setKapakDurum] = useState('');
  const dosya = useRef<HTMLInputElement>(null);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    const w = web.trim() ? Number(web.replace(/\./g, '').replace(',', '.')) : null;
    if (w != null && (!Number.isFinite(w) || w < 0)) { setDurum({ tip: 'hata', m: 'Web fiyatı geçerli bir tutar olmalı' }); return; }
    if (await gonder(`/api/yonetim/urunler/${urun.id}`, 'PUT', { aktif, webFiyati: w, aciklama }, 'Ürün kaydedildi')) router.refresh();
  }
  async function kapakYukle() {
    const f = dosya.current?.files?.[0];
    if (!f) return;
    setKapakDurum('Yükleniyor…');
    const fd = new FormData(); fd.append('kapak', f);
    const r = await fetch(`/api/yonetim/urunler/${urun.id}/kapak`, { method: 'POST', body: fd });
    const v = await r.json().catch(() => ({}));
    setKapakDurum(r.ok ? '✓ Kapak yüklendi' : v.hata ?? 'Yüklenemedi');
    if (r.ok) router.refresh();
  }
  async function kapakKaldir() {
    const r = await fetch(`/api/yonetim/urunler/${urun.id}/kapak`, { method: 'DELETE' });
    setKapakDurum(r.ok ? 'Kapak kaldırıldı' : 'Kaldırılamadı');
    if (r.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={kaydet} noValidate>
        <FormKarti ust="SİTEDE SATIŞ" baslik="Satış bilgileri">
          <DurumMesaji durum={durum} />
          <Anahtar etiket="Satışta" aciklama="Kapalıysa katalogda, aramada ve yeni sepetlerde görünmez; yayındaki sepetlerde kalır." deger={aktif} degistir={setAktif} />
          <Satir>
            <Alan id="u-web" etiket="Web fiyatı (KDV dahil)" ipucu={`Boş bırakılırsa Opak liste fiyatı geçerli: ${tl(urun.listeFiyati)}`}>
              <input id="u-web" className="girdi" inputMode="decimal" value={web} onChange={(e) => setWeb(e.target.value)} placeholder={String(urun.listeFiyati).replace('.', ',')} />
            </Alan>
          </Satir>
          <Alan id="u-ac" etiket="Açıklama" ipucu="Ürün sayfasında görünür. Boş satır paragraf, '## ' ara başlık, '- ' madde.">
            <textarea id="u-ac" className="girdi min-h-[140px] py-3" value={aciklama} onChange={(e) => setAciklama(e.target.value)} maxLength={2000} />
          </Alan>
          <div><button type="submit" disabled={bekliyor} className="btn-koyu">{bekliyor ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
        </FormKarti>
      </form>
      <FormKarti ust="GÖRSEL" baslik="Kapak görseli">
        <div className="flex flex-wrap items-center gap-5">
          {urun.kapakDosya
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={`/api/kapak/${urun.id}?v=${encodeURIComponent(urun.kapakDosya)}`} alt="Kapak" className="h-40 w-auto rounded-md border border-cizgi" />
            : <span className="flex h-40 w-28 items-center justify-center rounded-md bg-[#E9ECF1] text-sm font-bold text-metin-3">Görsel yok</span>}
          <div className="flex flex-col gap-2">
            <label htmlFor="u-kapak" className="etiket">PNG, JPG veya WEBP · en fazla 1 MB</label>
            <input id="u-kapak" ref={dosya} type="file" accept="image/png,image/jpeg,image/webp" onChange={kapakYukle} className="text-sm" />
            {urun.kapakDosya && <button type="button" onClick={kapakKaldir} className="btn-cerceve min-h-11 self-start">Kapağı kaldır</button>}
            {kapakDurum && <span role="status" className="text-sm font-bold">{kapakDurum}</span>}
          </div>
        </div>
      </FormKarti>
    </div>
  );
}
