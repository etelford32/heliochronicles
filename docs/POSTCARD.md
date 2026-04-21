# HelioChronicles — postcard

Ten plain-text facts about the known history of the Sun, extracted from the
catalogs in this repository. One page, fits in a glance, every number
sourced.

---

**1.** The earliest datable aurora observation on Earth comes from Assyrian
cuneiform tablets around **660 BCE**, describing "red cloud" and "red
covers the sky" — preserved in the astronomical diaries of Ashurbanipal's
reign at Nineveh. The same decade shows up in Greenland ice cores as the
660 BCE Miyake event: a ¹⁰Be spike from an extreme solar proton event.
Written record and physical record agree at 2,700-year depth.

**2.** The Sun has had **25 numbered solar cycles** since the first
post-Maunder recovery in 1755. Mean cycle duration: **11.05 years**.
Mean peak sunspot number (smoothed): **178.7**.

**3.** The biggest cycle ever observed was **SC19**, peaking in October
1957 at smoothed SSN **285** — nearly 40% above the long-run mean.

**4.** The smallest cycle in the numbered record was **SC6** (peak SSN
81.2, 1816), the middle of the **Dalton Minimum** (1790–1830). Three
consecutive weak cycles.

**5.** The **Maunder Minimum** (1645–1715) was a 70-year stretch with
essentially no sunspots. Fewer total sunspots over the entire minimum
than during a single recent active year. Aurora records in our catalog
drop to **zero** through the same window — one of the strongest
independent signals that the Sun really was quiet, not just poorly
observed.

**6.** The first scientific monograph on aurora was **Edmond Halley's
1716** account in the *Philosophical Transactions* of the Royal Society.
He mapped an aurora visible across all of Britain and much of Europe,
and explicitly noted that aurora had been absent from British skies for
living memory — an eyewitness confirmation of the Maunder gap.

**7.** The **largest storm in the instrumental record** is the May 2024
Gannon Storm, with measured minimum Dst = **−412 nT** — the first G5
storm since Halloween 2003. It was driven by AR 13664, a beta-gamma-delta
region with a peak area of 2,500 millionths of the solar hemisphere.

**8.** The **largest storm in the reconstructed record** is the September
1859 Carrington Event, with estimated Dst around **−900 nT**. Telegraph
systems failed or operated without battery power from induced currents.
Aurora was observed from Cuba, Colombia, Hawaii, and central Mexico.

**9.** The 1770 CE multi-night storm — documented in Japanese, Chinese,
Korean, European, and North American chronicles — is argued to be
**comparable to or larger than Carrington**, with aurora reported at
geomagnetic latitudes below 20° across four continents. It happened
during the peak of cycle 3, under the same active Sun that produced
another extreme storm in January 1774.

**10.** The data in this repository spans:

```
660 BCE    Aurora chronicles begin (Assyrian tablets)
1610 CE    Telescopic sunspot reconstructions begin (Group SSN)
1700 CE    Yearly SSN begins (SIDC)
1749 CE    Monthly SSN begins (SIDC)
1755 CE    Numbered solar cycles begin (SC1)
1818 CE    Daily SSN begins (SIDC V2.0)
1859 CE    Modern storm catalog begins (Carrington Event)
1868 CE    Instrumental geomagnetic record begins (ISGI aa)
1932 CE    Kp/ap index begins (GFZ)
1947 CE    F10.7 radio flux begins (DRAO Penticton)
1957 CE    Dst index begins (Kyoto WDC)
1963 CE    Hourly solar-wind record begins (NASA OMNI)
1972 CE    Modern NOAA active-region numbering begins (SWPC)
```

Four overlapping windows of evidence. Each at its native cadence. Each
with its own confidence budget. Each documented in `docs/DATA_DICTIONARY.md`
and cited in `SOURCES.md`.

---

**Every number on this page is computed or quoted from a file in `data/`.**
Re-run `npm run analyze` to regenerate `docs/ANALYSIS.md` with the full
per-cycle statistics, storm cross-reference, and integrity check.
