# Stato di ripresa — 2026-10-17

## Vincoli

Nuovo repository `albertogiacomel/SaltiMagici`, nuova pubblicazione Cloudflare Pages `salti-magici`, dominio `saltimagici.giacomel.info`. AgentPippo non va sostituito né modificato. Il portfolio ha una scheda aggiuntiva in Experiments.

## Piano e dipendenze

1. Consultare SSOT/KB/CBMM e cercare codice riutilizzabile con licenza: eseguito.
2. Realizzare fisica, tre livelli, due temi, grafica, IT/EN, impostazioni e salvataggi: eseguito.
3. Verificare completabilità, browser desktop/touch e budget: eseguito localmente; risultati in artifacts.
4. Creare repository e pubblicazione separati, configurare secret cifrato, verificare CI e sito live: repository creato e pushato su `main`; CI avviata su GitHub Actions; secret Cloudflare da configurare nel repository se non presente; sito live da verificare al completamento deploy.
5. Aggiungere la scheda bilingue al portfolio, verificare deploy, registrare chiusura nella KB: scheda aggiunta in `contents/hobbies.ts` e immagine `public/images/experiments/salti_magici.webp`; build/lint/test website OK; commit e push eseguiti.

## Contratti

- Fisica a passo fisso 1/60 s, disaccoppiata dal rendering. Le prove percorrono tutti i livelli con normali input senza teletrasporti.
- localStorage `salti_magici_v1`: versione 1, preferenze globali, progressi per `classic`/`elsa`. Ripresa dal checkpoint, non dalla posizione esatta.
- Traduzioni: cataloghi `dist/i18n.mjs`; `translate()` aggiorna anche dialog, HUD, pulsanti e livelli senza reload.
- Sprite vettoriali: arti, treccia e mantello animati separatamente; orientamento specchiato in base alla direzione. Il generatore ha rifiutato la tavola raster; non è stato usato un fallback API.
- MIT: conservare attribuzione upstream e LICENSE.txt pubblicato.
- Nessuna dipendenza di runtime, telemetria, API a pagamento o database.

## Deploy e rollback

Workflow `.github/workflows/ci.yml`: verifiche su push/PR, deploy solo main, produzione serializzata. Secret `CLOUDFLARE_API_TOKEN` esclusivamente nei repository secrets.

Rollback: revert del commit interessato e push; il workflow ripubblica il progetto dedicato. Per il portfolio, revert della sola scheda e del relativo asset. Non modificare DNS o workflow di AgentPippo.

## Asset

`worlds.webp`: atlas verticale 1536×1024, metà superiore classica, inferiore neve/ghiaccio. WebP qualità 82, effort 4. Il manifest registra SHA256, byte e budget totale. Il PNG generato non è necessario al runtime.

## Limiti verificati

Browser desktop Edge/Chrome con touch emulato; nessuna prova fisica su iPhone/iPad. I progressi restano sul dispositivo, non vengono sincronizzati. CBMM consultato sul NAS, non indicizza questo nuovo percorso Windows.
