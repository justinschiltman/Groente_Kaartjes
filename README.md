# Groente Kaartjes

Windows-app om prijskaartjes voor verse producten te ontwerpen, te vullen vanuit een
Excel-bestand, en in één keer als PDF te exporteren.

## Ontwikkelen

Vereist [Node.js](https://nodejs.org) (LTS).

```bash
npm install
npm run dev
```

Dit opent de app in een ontwikkelvenster met live-reload.

## Een Windows-installer bouwen

```bash
npm run build:win
```

De installer (`.exe`) komt terecht in de map `release/`. Omdat de installer niet
digitaal ondertekend is, toont Windows bij de eerste keer openen een SmartScreen-
waarschuwing ("Windows heeft uw pc beschermd"). Klik op **Meer info** en dan
**Toch uitvoeren** om te installeren.

## Typecontrole

```bash
npm run typecheck
```
