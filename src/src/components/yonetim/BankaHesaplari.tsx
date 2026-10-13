'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { BankaHesabiKaydi } from '@/lib/data/ticaret';
import { DurumMesaji, FormKarti, useIstek } from './ortak';

const BOS = { banka: '', hesapAdi: '', iban: '', sube: '', hesapNo: '', paraBirimi: 'TRY' as const, sira: 10, aktif: true };
const ibanGoster = (i: string) => i.replace(/(.{4})/g, '$1 ').trim();

/** Havale / EFT ekranında veliye gösterilen banka hesapları */
export default function BankaHesaplari({ hesaplar }: { hesaplar: BankaHesabiKaydi[] }) {
  const router = useRouter();
  const { durum, bekliyor, gonder } = useIstek();
  const [form, setForm] = useState<(Omit<BankaHesabiKaydi, 'id' | 'sube' | 'hesapNo'> & { id: number | null; sube: string; hesapNo: string }) | null>(null);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { id, ...veri } = form;
    if (await gonder('/api/yonetim/ayarlar/kayit', 'POST', { tur: 'banka', id, veri }, id ? 'Hesap güncellendi' : 'Hesap eklendi')) { setForm(null); router.refresh(); }
  }

  return (
    <FormKarti ust="HAVALE / EFT" baslik="Banka hesapları" aksiyon={<button type="button" className="btn-turuncu min-h-11" onClick={() => setForm({ id: null, ...BOS, sira: (hesaplar.length + 1) * 10 })}>+ Hesap ekle</button>}>
      <DurumMesaji durum={durum} />
      {hesaplar.length ? (
        <ul className="flex flex-col rounded-xl border border-cizgi">
          {hesaplar.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF0F3] px-4 py-3 last:border-0">
              <div className="flex min-w-0 flex-col">
                <span className="font-bold">{h.banka}{h.sube ? ` · ${h.sube}` : ''} {!h.aktif && <span className="text-sm text-kirmizi">(gösterilmiyor)</span>}</span>
                <span className="font-mono text-[15px]">{ibanGoster(h.iban)}</span>
                <span className="text-[13px] text-metin-3">{h.hesapAdi} · {h.paraBirimi}{h.hesapNo ? ` · Hesap no ${h.hesapNo}` : ''}</span>
              </div>
              <button type="button" className="btn-cerceve min-h-11" onClick={() => setForm({ ...h, sube: h.sube ?? '', hesapNo: h.hesapNo ?? '' })}>Düzenle</button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-metin-2">Henüz hesap yok. Havale ile ödeme için en az bir hesap ekleyin.</p>}
      {form && (
        <form onSubmit={kaydet} className="flex flex-col gap-4 rounded-xl border-2 border-lacivert p-4">
          <div className="flex flex-wrap gap-4 [&>*]:flex-[1_1_220px]">
            <label className="flex flex-col gap-1.5"><span className="etiket">Banka</span><input className="girdi" value={form.banka} onChange={(e) => setForm({ ...form, banka: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5"><span className="etiket">Şube</span><input className="girdi" value={form.sube} onChange={(e) => setForm({ ...form, sube: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5"><span className="etiket">Hesap adı (alıcı)</span><input className="girdi" value={form.hesapAdi} onChange={(e) => setForm({ ...form, hesapAdi: e.target.value })} /></label>
          </div>
          <div className="flex flex-wrap gap-4 [&>*]:flex-[1_1_220px]">
            <label className="flex flex-[2_1_320px] flex-col gap-1.5"><span className="etiket">IBAN</span>
              <input className="girdi font-mono" value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="TR00 0000 0000 0000 0000 0000 00" /></label>
            <label className="flex flex-col gap-1.5"><span className="etiket">Hesap no</span><input className="girdi" value={form.hesapNo} onChange={(e) => setForm({ ...form, hesapNo: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5"><span className="etiket">Para birimi</span>
              <select className="girdi" value={form.paraBirimi} onChange={(e) => setForm({ ...form, paraBirimi: e.target.value as 'TRY' })}><option>TRY</option><option>USD</option><option>EUR</option></select></label>
            <label className="flex flex-col gap-1.5"><span className="etiket">Sıra</span><input type="number" className="girdi" value={form.sira} onChange={(e) => setForm({ ...form, sira: Number(e.target.value) || 0 })} /></label>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 font-bold"><input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} className="size-5 accent-lacivert" />Havale ekranında göster</label>
          <div className="flex gap-2.5"><button type="submit" disabled={bekliyor} className="btn-koyu">Kaydet</button><button type="button" className="btn-cerceve" onClick={() => setForm(null)}>Vazgeç</button></div>
        </form>
      )}
    </FormKarti>
  );
}
