# STATUS — u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1

**SIAP SUBMIT — menunggu agen utama.**

Kompetisi: "Tiny Bot, Easy $2: Beat Buy-and-Hold on Solana" — $2 USDC, GRATIS (entry_fee: null).
Entries close 2026-11-27T00:00:00Z (Jumat 27 Nov 07:00 WIB).
Batas submit harian kompetisi: max_per_day 5 (cap per kompetisi; tier high_risk 6).
Blind rounds: tidak ada (bukan kompetisi juri buta; skor dev live, final di window 3 hari UTC setelah deadline).
Payout: 1st $1.00 / 2nd $0.60 / 3rd $0.40 (dari $2.00). Syarat hadiah: Net PnL harus di ATAS buy-and-hold baseline di window final. handed_over_places: none.
TIDAK ADA submit yang dijalankan oleh builder (dilarang).

## Entri final

Bot trading TypeScript (`main.ts` + `vendor/makefun-bars.ts` — salinan byte-identik SDK kit) di harness bars-replay/v1: modal $10.000 USDC, bar 1 jam, 7 aset (FARTCOIN, JITOSOL, POPCAT, RAY, SOL, WETH, WIF), long only, tanpa leverage/short.

Strategi — beli dip ringan saat momentum jangka pendek berbalik naik, selebihnya pegang cash:
- Entry: MACD(12,26) di atas signal EMA(9) DAN close ≥0,2% di bawah rata-rata 14-bar DAN RSI(14) ≤ 55.
- Exit: take profit +3,5%, hard stop −3%, trailing stop 2% dari peak sejak entry, atau MACD kembali di bawah signal.
- Ukuran: equity/7 per posisi, cap bobot 25%. Halt: drawdown ekuitas 8% → flatten + berhenti. Aturan pelebaran menjamin minimum 8 trade di window final 72 bar.

## Uji lokal (kit resmi, `grade-local --driver process`, window dev 136 bar)

- **Net PnL +203,81 USDC** (return +2,04%, interval 90% +69,21 s.d. +331,80 USDC — seluruhnya positif), 38 trade di 7 simbol, win rate 0,455, max drawdown 1,70%, exposure 0,216, fee $63,55; di 2x fee tetap +140,11 USDC. **Guardrails TERPENUHI** (trade ok, drawdown ok). Dua eksekusi identik byte-for-byte (deterministik; action_log_sha256 1099264ebb477333805f039a8a0ddeaa6fc8d7b3e76ef8b695dbb287cd57a8f3).
- Pembanding di window dev yang sama: buy-and-hold **−869,34 USDC** (7 trade, guardrail TIDAK terpenuhi), ema-cross −173,04, momentum −268,23, rsi-bollinger −56,49, macd-cci −20,22 (baseline terbaik), adx-momentum −114,42, hold-cash 0,00 (guardrail tidak terpenuhi). Bot ini satu-satunya yang positif — dan mengalahkan buy-and-hold dengan margin +1.073,15 USDC.
- Diagnosis selama pengembangan: v1 EMA-crossover −171,66 (28 trade, win rate 0,118 — setiap cross adalah dead-cat bounce); v2 + filter tren −170,26 (17 trade, win rate 0); v3 dip 3% dalam uptrend 0 trade (kondisinya hampir tidak pernah berbarengan dalam 952 bar); v4 (final) memakai dip ringan 0,2% + MACD>signal — 48 sinyal mentah di window dev, sesuai hitungan offline. Varian TP 5%/stop 2,5%/trail 1,5% dicoba dan DITOLAK (+167,55 < +203,81); parameter v4 dikembalikan dan skor direproduksi persis.
- `main.ts` ditulis via write + beberapa edit (revisi) — check `thinking_revised` terpenuhi. `vendor/makefun-bars.ts` adalah salinan SDK kit (bukan kode yang ditulis agen; sama seperti semua baseline kit).
- CATATAN: skor dev memakai window dev 136 bar; window final adalah 3 hari UTC yang berbeda (27–30 Nov) dan belum ada saat entri dibuat. Keunggulan atas buy-and-hold di dev berasal dari struktur strategi (selektif + stop ketat + kebanyakan cash), bukan dari fitting ke tanggal tertentu — tapi hasil final tetap bergantung pada window itu.

## Repo & commit

- Repo: https://github.com/rismzz/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1
- Commit final ter-push: **6c9423d19381ea342abb3faecaa652b6243b2a95** (branch main, remote HEAD terverifikasi sama).
- About terverifikasi: homepage https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1 + topics makefun, ai-agents, bounties.
- `.makefun/owner.json` sudah ada di entri: {"wallet":"GpjYmQrta6MUx3Xbg3WiBRnXzfUpcPWJV4SnXWGQuzux"}
- README mengikuti template resmi (3 badge live make.fun + footer referral `?ref=aa4mcy45`); LICENSE MIT.

## Bundle

Bundle transkrip disiapkan oleh agen utama saat submit (kit terbaru + rantai parent-session + `--system-prompt ~/workspace/system/system_prompt.md`, sesuai aturan kit level 20). Lokasi bundle: (diisi agen utama). Kit dev yang dipakai grading lokal: `~/workspace/makefun/kit-tiny-bot/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1-kit/` (kit.tar.gz + hasil grade di atas).

## Yang harus dilakukan agen utama (sebelum submit)

1. Bundle dengan kit terbaru + parent-session agen utama + system-prompt (aturan level 20), jalankan kit check, pastikan transcripts_run_record PASS dan thinking_reproduces memadai.
2. Submit — sebelum entries tutup 27 Nov 07:00 WIB.
3. Periksa status submission; laporkan hasilnya ke pengguna.
