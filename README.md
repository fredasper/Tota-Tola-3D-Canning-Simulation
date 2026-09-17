# Popa Cola Small Canning Factory

A Next.js and Three.js digital twin of a small carbonated-beverage canning factory. The default line models a 330 mL, 6,000 cans/hour operation from empty-can handling through finished-goods pallet dispatch.

It is designed for simulation coursework: the material flow is visible in 3D, line parameters can be changed for controlled tests, and finite runs generate an OEE-style production report.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a production check:

```bash
npm run type-check
npm run build
```

## What is modeled

```text
Empty-can pallet -> depalletizer -> rinse / empty-can inspection -> filler
-> seamer -> full-can QA / reject lane -> case packer -> pallet dispatch

Water + syrup + CO2 -> blending -> carbonation -> filler
```

- Small-line default: 330 mL standard can, 24-can case, 6,000 cans/hour, 12 m/min conveyor.
- Editable test settings: can format, case format, nameplate rate, conveyor rate, playback rate, and run duration.
- Duration supports minutes, hours, and continuous operation.
- The model uses conveyor speed and can pitch to constrain actual simulated capacity.
- Visual can geometry updates for 250 mL slim, 330 mL standard, and 500 mL standard formats.
- A finite run generates packed-output, reject, bottleneck, and OEE metrics.

## 3D controls

The camera is stationary by default; it does not rotate on its own.

- Drag: orbit
- Mouse wheel: zoom
- Right-drag: pan
- On-scene shortcut buttons: jump to overview, infeed, blend, carbonation, filler, seamer, inspection, packer, or pallet station.

## Model basis

The project is a representative teaching model rather than a manufacturer's proprietary layout. See [REAL_WORLD_MODEL.md](REAL_WORLD_MODEL.md) for the calibrated production assumptions, facility-scale dimensions, report assumptions, and source links.

The default rate is based on a Krones-documented 6,000 containers/hour craft beverage line, while the 330 mL can dimensions use a published 202/211 can specification. [Krones line reference](https://www.krones.com/en/company/press/magazine/reference/can-and-bottle-craft-brewery-in-budapest-relies-on-combined-filler-from-kosme.php) · [330 mL can specification](https://www.agronetbrewing.com/wp-content/uploads/2025/02/33cl-standard-Ball-Can-Spec.pdf)

## Project structure

```text
src/app/             Next.js page and styling
src/components/      3D facility, controls, metrics, status, report
src/lib/             Simulation engine and calibrated configuration
src/hooks/           React simulation lifecycle
src/types/           Shared TypeScript types
```

The older root-level `index.html`, `script.js`, and legacy `src/core` / `src/graphics` files are not used by the active Next.js app.
