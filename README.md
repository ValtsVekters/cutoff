# Cutoff

Know exactly when your last coffee or energy drink should be, so it doesn't wreck your sleep.

**Live app:** https://cutoff-nu.vercel.app

Log what you drank and Cutoff shows a live curve of the caffeine in your body. It predicts how much will be left at bedtime and gives you a personal caffeine cutoff time for today.

> Your 16:00 coffee is still in your body at midnight. Cutoff shows you when to stop.

## Features

- Quick-add drinks (Cola, Bloom, Red Bull, Monster, coffee, espresso, green tea) or a custom mg amount
- Edit the time of any logged drink
- Caffeine curve from 06:00 to 06:00, with "now", "bed" and a 50 mg sleep-safe line
- Bedtime card with a traffic light: green < 50 mg, yellow 50–100 mg, red > 100 mg
- Caffeine budget: "You can still take X mg until HH:MM" — the most you can drink now and stay under 50 mg at bedtime (and 400 mg/day), with no caffeine in the 6 h before bed
- "In your body now" with an absorbing indicator showing when a new drink will peak
- Daily total against the 400 mg/day guideline
- Metabolism: Manual slider (half-life 3–7 h) or Auto, which learns it from Apple Health sleep data (iPhone app, coming soon; sample data for the demo)
- Everything is stored locally in the browser: no login, no backend
- Calendar tab: daily caffeine totals coloured against 400 mg, with monthly stats
- Scan tab (preview): scan a can's barcode with the camera or a photo; caffeine comes from built-in verified cans (Bloom Crisp Apple, Coca-Cola Zero Sugar US cans), else Open Food Facts label data or a brand estimate. Photo recognition of any drink comes later
- Demo day: tap "Load demo day" in the footer, or triple-tap the logo

## The model

A one-compartment pharmacokinetic model with first-order absorption. For each drink with dose D mg, Δt hours after drinking:

```
A(Δt) = D · ka / (ka − ke) · (e^(−ke·Δt) − e^(−ka·Δt))
ke = ln 2 / half-life   (5 h → 0.139 /h)
ka = 4 /h               (peak ≈ 50 min after drinking)
```

The total in your body is the sum over all drinks. See [`src/lib/caffeine.ts`](src/lib/caffeine.ts).

## Run it

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # model tests
npm run build
```

Built with Vite, React, TypeScript, Tailwind CSS and Recharts.

---

Educational tool, not medical advice. The 50 mg bedtime threshold is a heuristic.
