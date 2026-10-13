'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SayfaKaydi } from '@/lib/data/ticaret';
import IcerikMetni from '@/components/IcerikMetni';
import { DurumMesaji, useIstek } from './ortak';

type Form = Omit<SayfaKaydi, 'id' | 'guncelleme'> & { id: number | null };
const HAZIR: { slug: string; baslik: string }[] = [
  { slug: 'gizlilik', baslik: 'Gizlilik Politikası' }, { slug: 'cerez', baslik: 'Çerez Politikası' }, { slug: 'kvkk', baslik: 'KVKK Aydınlatma Metni' },
  { slug: 'acik-riza', baslik: 'Açık Rıza Metni' }, { slug: 'uyelik-sozlesmesi', baslik: 'Üyelik Sözleşmesi' }, { slug: 'on-bilgilendirme', baslik: 'Ön Bilgilendirme Formu' },
  { slug: 'mesafeli-satis', baslik: 'Mesafeli Satış Sözleşmesi' }, { slug: 'iptal-iade', baslik: 'İptal ve İade Koşulları' }, { slug: 'teslimat', baslik: 'Teslimat Bilgileri' },
  { slug: 'odeme-guvenligi', baslik: 'Ödeme Güvenliği' }, { slug: 'hakkimizda', baslik: 'Hakkımızda' }, { slug: 'iletisim', baslik: 'İletişim' }, { slug: 'sss', baslik: 'Sıkça Sorulan Sorular' },
];

/** Kurumsal sayfalar ve e-ticaret sözleşmeleri: başlık, adres, metin, yayın ve alt bilgide gösterme */
export default function SayfaYonetimi({ sayfalar }: { sayfalar: SayfaKaydi[] }) {
  const router = useRouter();
  const { durum, bekliyor, gonder } = useIstek();
  const [form, setForm] = useState<Form | null>(null);
  const [onizle, setOnizle] = useState(false);
  const eksik = HAZIR.filter((h) => !sayfalar.some((s) => s.slug === h.slug));

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const { id, ...veri } = form;
    if (await gonder('/api/yonetim/ayarlar/kayit', 'POST', { tur: 'sayfa', id, veri }, 'Sayfa kaydedildi')) { setForm(null); router.refresh(); }
  }
  const yeni = (slug = '', baslik = ''): Form => ({ id: null, slug, baslik, icerik: '', yayinda: true, altBilgi: true, sira: ((sayfalar.at(-1)?.sira ?? 0) + 10) });

  return (
    <div className="flex flex-col gap-5">
      <DurumMesaji durum={durum} />
      <section className="kart overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF0F3] px-6 py-4">
          <h2 className="font-baslik text-lg font-extrabold">{sayfalar.length} sayfa</h2>
          <button type="button" className="btn-turuncu min-h-11" onClick={() => { setForm(yeni()); setOnizle(false); }}>+ Yeni sayfa</button>
        </div>
        <ul className="flex flex-col">
          {sayfalar.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF0F3] px-6 py-3 last:border-0">
              <div className="flex min-w-0 flex-col">
                <span className="font-bold">{s.baslik}</span>
                <span className="text-[13px] text-metin-3">/sayfa/{s.slug} · {s.yayinda ? 'yayında' : 'yayında değil'}{s.altBilgi ? ' · alt bilgide' : ''} · {new Date(s.guncelleme).toLocaleDateString('tr-TR')}</span>
              </div>
              <div className="flex gap-2">
                <a href={`/sayfa/${s.slug}`} target="_blank" rel="noopener" className="btn-cerceve min-h-10">Görüntüle</a>
                <button type="button" className="btn-koyu min-h-10" onClick={() => { setForm({ ...s }); setOnizle(false); }}>Düzenle</button>
              </div>
            </li>
          ))}
        </ul>
        {eksik.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[#EEF0F3] px-6 py-4">
            <span className="text-sm font-bold text-metin-2">E-ticaret için önerilen, henüz olmayan sayfalar:</span>
            {eksik.map((h) => <button key={h.slug} type="button" className="btn-cerceve min-h-10 px-3 text-sm" onClick={() => setForm(yeni(h.slug, h.baslik))}>+ {h.baslik}</button>)}
          </div>
        )}
      </section>

      {form && (
        <form onSubmit={kaydet} className="kart flex flex-col gap-4 border-2 border-lacivert p-6">
          <h2 className="font-baslik text-lg font-extrabold">{form.id ? `“${form.baslik}” düzenleniyor` : 'Yeni sayfa'}</h2>
          <div className="flex flex-wrap gap-4 [&>label]:flex-[1_1_220px]">
            <label className="flex flex-[2_1_300px] flex-col gap-1.5"><span className="etiket">Başlık</span><input className="girdi" value={form.baslik} onChange={(e) => setForm({ ...form, baslik: e.target.value })} /></label>
            <label className="flex flex-col gap-1.5"><span className="etiket">Adres</span>
              <span className="flex items-center gap-1"><span className="text-sm text-metin-3">/sayfa/</span><input className="girdi min-w-0 flex-1" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></span></label>
            <label className="flex flex-col gap-1.5"><span className="etiket">Sıra</span><input type="number" className="girdi" value={form.sira} onChange={(e) => setForm({ ...form, sira: Number(e.target.value) || 0 })} /></label>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist">
            <button type="button" role="tab" aria-selected={!onizle} onClick={() => setOnizle(false)} className={`min-h-10 rounded-[10px] border-2 px-3 text-sm font-bold ${!onizle ? 'border-lacivert bg-lacivert text-white' : 'border-kenar bg-white'}`}>Metin</button>
            <button type="button" role="tab" aria-selected={onizle} onClick={() => setOnizle(true)} className={`min-h-10 rounded-[10px] border-2 px-3 text-sm font-bold ${onizle ? 'border-lacivert bg-lacivert text-white' : 'border-kenar bg-white'}`}>Önizleme</button>
          </div>
          {onizle ? <div className="rounded-xl border border-cizgi p-5"><IcerikMetni metin={form.icerik || '(boş)'} /></div> : (
            <label className="flex flex-col gap-1.5"><span className="etiket">Metin</span>
              <textarea className="girdi min-h-[360px] py-3 font-mono text-[14px]" value={form.icerik} onChange={(e) => setForm({ ...form, icerik: e.target.value })} />
              <span className="text-[13px] text-metin-3">Boş satır yeni paragraf; &quot;## &quot; ile başlayan satır ara başlık; &quot;- &quot; ile başlayan satırlar madde listesi. HTML kullanılmaz.</span></label>
          )}
          <div className="flex flex-wrap gap-5">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 font-bold"><input type="checkbox" checked={form.yayinda} onChange={(e) => setForm({ ...form, yayinda: e.target.checked })} className="size-5 accent-lacivert" />Yayında</label>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 font-bold"><input type="checkbox" checked={form.altBilgi} onChange={(e) => setForm({ ...form, altBilgi: e.target.checked })} className="size-5 accent-lacivert" />Alt bilgide göster</label>
          </div>
          <div className="flex gap-2.5"><button type="submit" disabled={bekliyor} className="btn-koyu">Kaydet</button><button type="button" className="btn-cerceve" onClick={() => setForm(null)}>Vazgeç</button></div>
        </form>
      )}
    </div>
  );
}
