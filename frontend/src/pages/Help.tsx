import { useState } from 'react';

interface HelpSection {
  title: string;
  icon: string;
  items: { q: string; a: string }[];
}

const helpContent: HelpSection[] = [
  {
    title: 'Dashboard',
    icon: '📊',
    items: [
      { q: 'Dashboard ne gösteriyor?', a: 'Bugünkü/haftalık/aylık satışlar, aktif siparişler, kritik stok uyarıları, stok değeri ve en çok satan ürünleri gösterir. Her karta tıklayarak ilgili sayfaya gidebilirsiniz.' },
      { q: 'Kritik stok uyarısı nedir?', a: 'Stok miktarı minimum seviyeye düşen ürünler sarı uyarı ile gösterilir. Karta tıklayınca stok listesi otomatik filtrelenir.' },
      { q: 'Stok tükendi uyarısı nedir?', a: 'Stok sıfıra düşen varyantlar kırmızı uyarı ile gösterilir. Karta tıklayınca stok listesi filtrelenir.' },
    ]
  },
  {
    title: 'Satış Ekranı',
    icon: '💰',
    items: [
      { q: 'Nasıl satış yapılır?', a: '1) Sol taraftan ürün arayın ve tıklayarak sepete ekleyin. 2) Sağ tarafta müşteri adını yazın veya mevcut müşteri seçin. 3) Gerekirse birim fiyatı değiştirin. 4) "💰 SAT" butonuna basın.' },
      { q: '"SAT" ile "SİPARİŞ OLUŞTUR" farkı nedir?', a: 'SAT: Anında satış yapar, stoktan düşer, satış kaydı oluşur. SİPARİŞ OLUŞTUR: Rezervasyon oluşturur, stoktan düşer ama müşteri sonra teslim alır.' },
      { q: 'Fiyatı nasıl değiştiririm?', a: 'Sepette her ürünün birim fiyat kutusuna tıklayıp yeni fiyatı yazabilirsiniz. Orijinal liste fiyatına dönmek için ↺ butonuna basın.' },
      { q: 'Müşteri listede yoksa ne yapmalıyım?', a: 'Müşteri adını yazın, listede çıkmazsa "yeni müşteri olarak kaydedilir" mesajı görünür. Satışı tamamladığınızda otomatik kayıt oluşturulur.' },
      { q: 'Stokta olmayan ürün neden eklenemiyor?', a: 'Stok sıfır olan ürünler soluk görünür ve sepete eklenemez. Önce stok girişi yapmanız gerekir.' },
    ]
  },
  {
    title: 'Stok Yönetimi',
    icon: '📦',
    items: [
      { q: 'Stok girişi nasıl yapılır?', a: '"+ Stok Girişi" butonuna basın veya tablodaki ürün satırında "Giriş" linkine tıklayın. Ürün adını yazarak arama yapabilirsiniz.' },
      { q: 'Stok çıkışı nasıl yapılır?', a: '"- Stok Çıkışı" butonuna basın veya tablodaki "Çıkış" linkine tıklayın. Sadece stokta olan ürünler listelenir.' },
      { q: 'Stok hareketlerini nasıl görürüm?', a: 'Tablodaki herhangi bir ürünün "Detay" linkine tıklayın. Tüm giriş/çıkış hareketleri tarih sırasıyla listelenir. Her hareketin hangi müşteriye ait olduğu da görünür.' },
      { q: 'Renk kodları ne anlama geliyor?', a: '🟢 Yeşil: Yeterli stok | 🟡 Sarı: Kritik (minimum seviyede) | 🔴 Kırmızı: Stok yok' },
      { q: 'Sütunlara göre sıralama yapabilir miyim?', a: 'Evet! Tablo başlıklarına (Ürün Adı, Marka, Stok vb.) tıklayarak sıralama yapabilirsiniz. Tekrar tıklayınca ters sıralama olur.' },
      { q: 'İkinci kalite stok nedir?', a: 'Hasarlı veya kusurlu ürünler için stok girişinde "İkinci Kalite" kutusunu işaretleyin. Bu ürünler normal stoktan ayrı takip edilir ve tabloda "2. Kalite" sütununda görünür.' },
    ]
  },
  {
    title: 'Sipariş Yönetimi',
    icon: '📝',
    items: [
      { q: 'Özel üretim siparişi nedir?', a: 'Müşteri stokta olmayan, özel ölçü/özellikte ürün sipariş ettiğinde kullanılır. Stoktan düşmez. Durum akışı: Sipariş Alındı → Üretimde → Tamamlandı.' },
      { q: 'Rezervasyon siparişi nedir?', a: 'Müşteri stokta olan ürünü ön ödemeyle ayırtır. Stoktan hemen düşer. Müşteri geldiğinde "Teslim Et" butonuyla satış kaydı oluşturulur.' },
      { q: 'Rezervasyonu nasıl teslim ederim?', a: 'Sipariş listesinde rezervasyon satırında "🚚 Teslim Et" butonuna basın. Onay ekranında ürünleri ve tutarı göreceksiniz. Onaylayınca satış kaydı otomatik oluşur.' },
      { q: 'Termin tarihi kırmızı görünüyor, ne yapmalıyım?', a: 'Termin tarihi geçmiş demektir. Siparişi tamamlayın veya müşteriyle yeni tarih belirleyin.' },
    ]
  },
  {
    title: 'Müşteriler',
    icon: '👤',
    items: [
      { q: 'Yeni müşteri nasıl eklenir?', a: '"+ Yeni Müşteri" butonuna basın. Ad zorunlu, telefon, e-posta ve adres opsiyoneldir. Satış/sipariş ekranında müşteri adı yazıldığında da otomatik oluşturulur.' },
      { q: 'Müşterinin satış geçmişini nasıl görürüm?', a: 'Müşteriler sayfasında listeden müşteriye tıklayın. Sağ tarafta toplam harcama, tüm satış ve sipariş geçmişi görünür.' },
      { q: 'Müşteri silinemiyorsa ne yapmalıyım?', a: 'Satış, sipariş veya iade kaydı olan müşteriler silinemez. Bunun yerine bilgilerini güncelleyebilirsiniz.' },
    ]
  },
  {
    title: 'İade Yönetimi',
    icon: '↩️',
    items: [
      { q: 'İade nasıl kaydedilir?', a: '1) Müşteri seçin. 2) İade sebebini yazın. 3) Ürün arama kutusundan ürünü bulup ekleyin. 4) "↩️ İadeyi Kaydet" butonuna basın. Stok otomatik güncellenir.' },
      { q: 'İkinci kalite iade nedir?', a: 'Hasarlı veya kusurlu ürünler için "2. Kalite" seçeneğini işaretleyin. Bu ürünler normal stoktan ayrı takip edilir.' },
      { q: 'İade geçmişini nasıl görürüm?', a: '"İade Geçmişi" sekmesine tıklayın. Tüm iade kayıtları tarih, müşteri ve ürün bilgileriyle listelenir.' },
    ]
  },
  {
    title: 'Raporlar',
    icon: '📈',
    items: [
      { q: 'Hangi raporlar mevcut?', a: '1) En Çok Satan Ürünler — tarih aralığına göre filtrelenebilir. 2) Stokta Bekleyen Ürünler — kaç gündür stokta olduğu. 3) Aylık Satış Raporu — aylık gelir ve işlem sayısı.' },
      { q: 'Tarih aralığına göre rapor alabilir miyim?', a: 'Evet. Rapor sayfasında başlangıç ve bitiş tarihi seçerek filtreleyebilirsiniz.' },
      { q: 'Stokta bekleyen ürünlerde renkler ne anlama geliyor?', a: '🔴 Kırmızı: 90+ gün stokta | 🟡 Sarı: 30-90 gün stokta | 🟢 Yeşil: 30 günden az' },
    ]
  },
  {
    title: 'İpuçları',
    icon: '💡',
    items: [
      { q: 'Koyu/Açık tema nasıl değiştirilir?', a: 'Sol menünün altındaki 🌙 / ☀️ butonuyla tema değiştirilebilir. Tercih tarayıcıya kaydedilir, sayfa yenilenince korunur.' },
      { q: 'Tablet ve telefonda nasıl kullanılır?', a: 'Sol üstteki ☰ (hamburger) butonuna tıklayarak menüyü açabilirsiniz. Tüm işlevler mobil ve tablette çalışır.' },
      { q: 'Stok listesini hızlı filtrelemek için ne yapabilirim?', a: 'Dashboard\'daki ⚠️ Kritik Stok veya 🔴 Stok Tükendi kartlarına tıklayınca stok listesi otomatik filtrelenir.' },
      { q: 'Ürün arama ne kadar hızlı?', a: 'Arama kutusu 500ms gecikmeyle çalışır — yazmayı bıraktıktan yarım saniye sonra sonuçlar güncellenir.' },
      { q: 'Stok hareketi silebilir miyim?', a: 'Sadece manuel giriş/çıkışlar silinebilir. Satış veya sipariş kaynaklı hareketler silinemez.' },
    ]
  },
];

export default function Help() {
  const [activeSection, setActiveSection] = useState(0);
  const [openItem, setOpenItem] = useState<number | null>(null);

  const section = helpContent[activeSection];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Yardım Merkezi</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          WinDoor Stok ve Satış Yönetim Sistemi — Sık sorulan sorular ve kullanım kılavuzu
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Sol: Bölüm listesi */}
        <div
          className="lg:col-span-1 rounded-xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', height: 'fit-content' }}
        >
          <div
            className="px-4 py-3 text-xs font-bold uppercase tracking-wider"
            style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            Konular
          </div>
          <nav className="p-2 space-y-0.5">
            {helpContent.map((s, idx) => (
              <button
                key={idx}
                onClick={() => { setActiveSection(idx); setOpenItem(null); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all"
                style={{
                  background: activeSection === idx ? 'var(--brand-light)' : 'transparent',
                  color: activeSection === idx ? 'var(--brand-text)' : 'var(--sidebar-text)',
                  borderLeft: activeSection === idx ? '2px solid var(--brand)' : '2px solid transparent',
                  minHeight: '44px',
                  fontFamily: 'inherit',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span className="text-base w-5 text-center flex-shrink-0">{s.icon}</span>
                <span>{s.title}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Sağ: Soru-Cevap */}
        <div
          className="lg:col-span-3 rounded-xl overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Başlık */}
          <div
            className="px-6 py-4 flex items-center gap-3"
            style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}
          >
            <span className="text-2xl">{section.icon}</span>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{section.title}</h2>
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--brand-light)', color: 'var(--brand-text)' }}
            >
              {section.items.length} konu
            </span>
          </div>

          {/* Accordion */}
          <div className="p-4 space-y-2">
            {section.items.map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg overflow-hidden"
                style={{ border: '1px solid var(--border)' }}
              >
                <button
                  onClick={() => setOpenItem(openItem === idx ? null : idx)}
                  className="w-full text-left px-4 py-3 flex items-center justify-between transition-colors"
                  style={{
                    background: openItem === idx ? 'var(--brand-light)' : 'var(--surface)',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    border: 'none',
                    minHeight: '48px',
                  }}
                >
                  <span
                    className="font-medium text-sm pr-4"
                    style={{ color: openItem === idx ? 'var(--brand-text)' : 'var(--text)' }}
                  >
                    {item.q}
                  </span>
                  <span
                    className="flex-shrink-0 text-xs font-bold"
                    style={{ color: 'var(--muted)' }}
                  >
                    {openItem === idx ? '▲' : '▼'}
                  </span>
                </button>
                {openItem === idx && (
                  <div
                    className="px-4 py-3"
                    style={{
                      background: 'var(--surface-2)',
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alt bilgi */}
      <div
        className="rounded-xl px-5 py-3 text-xs flex items-center justify-between"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
      >
        <span>WinDoor v1.0 · Stok ve Satış Yönetim Sistemi</span>
        <span>{helpContent.reduce((s, c) => s + c.items.length, 0)} konu · {helpContent.length} bölüm</span>
      </div>
    </div>
  );
}
