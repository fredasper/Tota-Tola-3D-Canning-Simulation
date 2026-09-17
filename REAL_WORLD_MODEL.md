# Small Can-Beverage Factory Model Basis

This project represents a compact, starting carbonated-beverage canning factory. It is a teaching digital twin, not a copy of a manufacturer's proprietary CAD layout or control system. Equipment is drawn procedurally, but the material flow, container geometry, production rate, conveyor constraint, and installation envelopes are grounded in published equipment information.

## Default operating point

The default is a 330 mL standard can at 6,000 cans/hour (100 cans/minute) packed into 24-can cases. This is deliberately a small-factory configuration, not a high-speed industrial line. Krones documents a craft producer using a 6,000 containers/hour line for 0.33 litre cans, with depalletising, filling, downstream inspection, CIP, and packaging in the scope. [Krones craft-line reference](https://www.krones.com/en/company/press/magazine/reference/can-and-bottle-craft-brewery-in-budapest-relies-on-combined-filler-from-kosme.php)

| Parameter | Default | Model behaviour |
| --- | --- | --- |
| Can format | 330 mL standard | 66 mm body diameter, 115.2 mm open-can height. The 3D can geometry changes with format. |
| Nameplate rate | 6,000 cans/hour | 100 cans/minute before the modeled line-efficiency factor. |
| Can pitch | 0.12 m | Centre-to-centre pitch used to calculate conveyor capacity. |
| Conveyor speed | 0.20 m/s (12 m/min) | Matches 100 cans/minute at a 0.12 m pitch. Reducing speed below this capacity limits the line. |
| Case format | 24 cans | User selectable 12, 24, or 48 cans per case. |
| Quality loss | 0.3% nominal | Deterministic for repeatable test runs. |

The standard 330 mL can dimensions are based on a published 202/211 specification. [Ball 330 mL can specification](https://www.agronetbrewing.com/wp-content/uploads/2025/02/33cl-standard-Ball-Can-Spec.pdf)

## Facility flow and 3D scope

```text
Empty-can pallet
  -> depalletizer -> air rinse / empty-can inspection -> counter-pressure filler
  -> can seamer -> full-can inspection + reject lane + date coding
  -> case packer -> finished-goods pallet -> dispatch

Water / syrup / CO2 -> blending -> carbonation ----------------> filler
```

The layout is a compact facility footprint with a roughly 55 m packaging flow. It includes representative installation envelopes: a small empty-can infeed, rinse/inspection module, blending and carbonation skid, 12-valve filler, seamer, QA module, 4.6 m x 2.4 m case-packer footprint, and pallet dispatch. The renderer uses metres for facility-scale geometry. Cans retain their real relative geometry, so they appear small in the overview and are easier to examine with the station camera shortcuts.

The packer envelope is informed by a published compact wraparound case packer at 4,600 mm x 2,400 mm x 2,470 mm. [Case-packer dimensions](https://www.et-pack.com/en/product/case-packing-etc20/)

## Test controls and production logic

The control panel lets a student change the can format, case format, nameplate rate (3,000–10,500 cans/hour), conveyor rate (4.8–24 m/min), and run duration in minutes, hours, or continuous mode. These affect the model directly:

- Changing can format changes the can geometry and required conveyor pitch.
- The effective rate is the lower of the selected nameplate rate and conveyor capacity, then applies station efficiency.
- Filled cans remain in a downstream transport queue for the physical conveyor travel time before becoming packed output.
- Finite runs create an OEE-style report. Continuous runs have no automatic end report.

The rate range is intentionally limited to the published 3,000–10,500 cans/hour range of the compact Krones Canto system, rather than pretending that a starter factory is a 40,000+ cans/hour plant. [Krones Canto capacity range](https://www.krones.com/en/company/press/magazine/innovation/kosme-canto-fills-cans-at-speeds-of-3_000-containers-and-upwards.php)

## Camera and navigation

The camera is stationary by default and never auto-rotates. Users can drag to orbit, scroll to zoom, and right-drag to pan. The on-scene shortcuts frame the overview, infeed, blending, carbonation, filler, seamer, inspection, packer, and pallet-dispatch stations.

## Report assumption

```text
OEE = Availability x Performance x Quality
```

The baseline assumes a warm start with no unplanned downtime, so availability is 100%. The report makes that assumption visible. Fault scenarios and changeovers would be a valid later extension if the project needs dynamic availability rather than a controlled validation run.
