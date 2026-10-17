# Verifica

- 19 test Node: collisioni, salto variabile/buffer, ricompense, danni, checkpoint, salvataggi e completamento dei tre livelli con input simulati ordinari.
- Browser reale: temi, traduzioni immediate, difficoltà, movimento/salto da tastiera, pausa, ripresa dopo reload, progressi indipendenti, touch simultaneo e layout mobile.
- Build: controllo sintassi di tutti i moduli pubblicati, MIT incluso, manifest SHA256 e limite totale 1.400.000 byte.
- Benchmark: 25 campioni dopo 5 warmup, 600 passi per campione; mean/p50/p95 e ops/s registrati in `artifacts/benchmark.json`. Misura la simulazione, non GPU, rendering o rete.

## Baseline

Non applicabile: nuovo progetto senza versione precedente sullo stesso carico. Non viene dichiarato uno speedup. Il benchmark iniziale è un riferimento per successive ottimizzazioni.

## Prevenzione regressioni

Il test di completamento ha rilevato due blocchi troppo vicini alla scala finale: sono stati riposizionati nei livelli 2 e 3. Il test rimane obbligatorio in CI. I controlli del menu gestiscono anche un clic prima del caricamento delle immagini. Durante l'invulnerabilità il personaggio resta visibile con opacità alternata.
