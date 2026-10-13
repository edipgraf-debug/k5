import 'server-only';

/**
 * Opak entegrasyon istemcisi — Kalıtım B2B'nin kullandığı action tabanlı sözleşme:
 *   POST {OPAK_API_URL}/{uc}  gövde: { action, data }  yanıt: { success, errorMessage, data }
 *
 * Okuma uçları B2B'de gözlendiği haliyle tanımlıdır. Sipariş/tahsilat aktarımının resmi yolu
 * (API action'ı mı, aktarım tablosu mu) Opak ile netleşince siparisAktar() doldurulacak.
 */

export interface OpakYanit<T> { success: boolean; errorMessage: string; data: T }

export class OpakHatasi extends Error {}

async function cagir<T>(uc: string, action: string, data?: unknown): Promise<T> {
  const taban = process.env.OPAK_API_URL;
  if (!taban) throw new OpakHatasi('OPAK_API_URL tanımlı değil');
  const r = await fetch(`${taban.replace(/\/$/, '')}/${uc}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.OPAK_API_KEY ? { Authorization: `Bearer ${process.env.OPAK_API_KEY}` } : {}),
    },
    body: JSON.stringify(data === undefined ? { action } : { action, data }),
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) throw new OpakHatasi(`Opak ${uc}/${action}: HTTP ${r.status}`);
  const y = (await r.json()) as OpakYanit<T>;
  if (!y.success) throw new OpakHatasi(`Opak ${uc}/${action}: ${y.errorMessage || 'bilinmeyen hata'}`);
  return y.data;
}

export interface OpakStok {
  id: number; code: string; name: string; merchant: string; barcode1: string;
  price1: number; gross_price: number; net_price: number; vat: number; vat_included_net_price: number;
  category1: string; quantity: number; images_id: number; warehouses: string;
}

export const opak = {
  stokAra(cariKodu: string, arama: string, sayfa = 1, adet = 50) {
    return cagir<OpakStok[]>('stok', 'StokAll', {
      customer_code: cariKodu, product_code: '', search_text: arama, altHesapId: 1, pay_plan_id: 0,
      page_item_count: adet, page: sayfa, oem_search: false, category_search: false, p_filter_extra: 0, p_order_by: 0, in_stock: false,
    });
  },
  stokDetay(cariKodu: string, stokKodu: string) {
    return cagir<OpakStok>('stok', 'StokDetayGetir', { customer_code: cariKodu, product_code: stokKodu, altHesapId: 1, pay_plan_id: 0 });
  },
  cariEkstre(cariKodu: string, baslangic: string, bitis: string) {
    return cagir<unknown[]>('rapor', 'CariEkstre', { customer_code: cariKodu, startDate: baslangic, endDate: bitis });
  },
  /** Opak ile resmi aktarım yolu netleşince doldurulacak. */
  async siparisAktar(_siparisNo: string): Promise<never> {
    throw new OpakHatasi('Sipariş aktarımı henüz yapılandırılmadı (Opak ile netleşecek).');
  },
};
