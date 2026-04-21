# Upstream sources and attribution

HelioChronicles is a compilation. Every value ultimately comes from a
scientific institution that does the hard work of observing, calibrating,
and publishing. Credit them.

The `sources` column in each daily row records which of these providers
contributed to that row, using the tokens in the "Source token" fields below.

## Group Number reconstruction (1610–1995)

- **Source token:** `gsn`
- **Provider:** Hoyt-Schatten (1998) original compilation, updated by Svalgaard & Schatten (2016) and Chatzistergos et al. (2017); SILSO publishes the community-maintained V2.0 that harmonizes these onto the modern SSN scale.
- **Dataset:** Yearly mean Group Number (GN) from 1610 — the telescopic era. Extends the numerical record 208 years before SILSO's daily SSN and 90 years before SILSO's yearly SSN. Captures the Maunder Minimum as numerical data rather than narrative.
- **URL:** https://www.sidc.be/SILSO/groupnumberv3
- **Direct CSV:** https://www.sidc.be/SILSO/DATA/GN_y_V2.0.csv
- **License:** CC BY-NC 4.0 (follows SILSO's terms).
- **Citations:**
  - Hoyt, D. V. & Schatten, K. H. (1998). *Group Sunspot Numbers: A new solar activity reconstruction.* Solar Physics 179, 189. doi:10.1023/A:1005007527816
  - Svalgaard, L. & Schatten, K. H. (2016). *Reconstruction of the Sunspot Group Number: The Backbone Method.* Solar Physics 291, 2653. doi:10.1007/s11207-015-0815-8
  - Chatzistergos, T. et al. (2017). *New reconstruction of the sunspot group numbers since 1739 using direct calibration and backbone methods.* Astronomy & Astrophysics 602, A69. doi:10.1051/0004-6361/201630045
- **Notes:** Before 1700, the Group Number is the only numerical source; the `gsn_observers` field on each yearly row signals how many historical observer records underlie that year's mean. For Maunder-Minimum years, `gsn_observers` is often as low as 1–3, and the value itself is near zero — this is signal, not noise.

## SILSO sunspot number — daily, monthly, yearly (1700–present)

- **Source token:** `silso`
- **Provider:** WDC-SILSO, Royal Observatory of Belgium, Brussels
- **Datasets used:**
  - Daily total SSN (V2.0), 1818+ — https://www.sidc.be/SILSO/INFO/sndtotcsv.php
  - Monthly mean total SSN (V2.0), 1749+ — https://www.sidc.be/SILSO/INFO/snmtotcsv.php
  - Yearly mean total SSN (V2.0), 1700+ — https://www.sidc.be/SILSO/INFO/snytotcsv.php
- **Landing page:** https://www.sidc.be/SILSO/datafiles
- **License:** CC BY-NC 4.0 (redistribution with attribution allowed for non-commercial use; commercial use requires permission from SILSO).
- **Citation:** SILSO World Data Center. Sunspot Number and Long-term Solar Observations, Royal Observatory of Belgium, online Sunspot Number catalogue.
- **Notes:** `-1` in the upstream indicates a missing day/value; normalized to null in our CSVs. `definitive=0` in the upstream indicates a provisional value; inverted to `ssn_provisional=true` in our CSVs (flag the exception, not the norm).

## Geomagnetic Kp/ap/Ap (1932–present) and F10.7 convenience columns

- **Source tokens:** `gfz` (Kp, ap), `drao` (F10.7 observed and adjusted, from 1947)
- **Provider:** GFZ German Research Centre for Geosciences, Helmholtz Centre Potsdam, in cooperation with the International Service of Geomagnetic Indices (ISGI). GFZ re-packages DRAO's (NRCan, Penticton) F10.7 values in the same file for convenience; the `drao` source token credits the originating observatory.
- **Dataset:** Kp index, ap index, Ap daily average, and F10.7 (observed + adjusted)
- **URL:** https://kp.gfz-potsdam.de/
- **Direct text file:** https://kp.gfz-potsdam.de/app/files/Kp_ap_Ap_SN_F107_since_1932.txt
- **License:** CC BY 4.0
- **Citation:** Matzka, J., Stolle, C., Yamazaki, Y., Bronkalla, O. and Morschhauser, A. (2021). The geomagnetic Kp index and derived indices of geomagnetic activity. Space Weather, 19, e2020SW002641.
- **F10.7 original provider:** Dominion Radio Astrophysical Observatory (DRAO), Penticton, operated by the National Research Council of Canada. https://www.spaceweather.gc.ca/forecast-prevision/solar-solaire/solarflux/sx-en.php

## Solar cycle boundaries (1755–present)

- **Source token:** `cycles`
- **Provider:** SIDC-SILSO published cycle table (WDC-SILSO, Royal Observatory of Belgium)
- **URL:** https://www.sidc.be/SILSO/cyclesminmax
- **Format in this repo:** `data/cycles/solar_cycles.json`, hand-authored from the SIDC-SILSO table. Updated only when a new cycle minimum is officially declared (roughly every 11 years).
- **License:** CC BY-NC 4.0 (follows SILSO's terms on the derived cycle table).

## Grand solar minima (pre-instrumental to 1920)

- **Format in this repo:** `data/cycles/grand_minima.json`, hand-authored from the peer-reviewed literature cited on each entry.
- **Primary references:**
  - Eddy, J. A. (1976). *The Maunder Minimum.* Science 192, 1189–1202. doi:10.1126/science.192.4245.1189
  - Usoskin, I. G. (2023). *A history of solar activity over millennia.* Living Reviews in Solar Physics 20, 2. doi:10.1007/s41116-023-00036-z
  - Clette, F. & Lefèvre, L. (2016). *The New Sunspot Number: assembling all corrections.* Solar Physics 291, 2629. doi:10.1007/s11207-016-1014-y
  - Vaquero, J. M. et al. (2015). *A revised collection of sunspot group numbers.* Solar Physics 291, 3061. doi:10.1007/s11207-015-0711-2
  - Feynman, J. & Ruzmaikin, A. (2011). *The Sun's Strange Behavior: Maunder Minimum or Gleissberg Cycle?* Solar Physics 272, 351. doi:10.1007/s11207-011-9828-0
- **License:** CC BY 4.0 for the compiled table. The underlying reconstructions remain the intellectual property of their authors; follow the journal's reuse terms for direct quotation.

## Pre-instrumental aurora observations (660 BCE – 1847 CE)

- **Format in this repo:** `data/events/aurora_observations.json`, hand-authored from peer-reviewed paleoaurora literature. Identifications — distinguishing aurora from meteor, comet, eclipse, and atmospheric optical phenomena — are attributed per entry to the cited researcher, not made by this catalog.
- **Scope and limitations:** Cannot be used for quantitative space-weather reconstruction. There are no magnetograms before the 1830s and no systematic instrumental record before 1868. The lowest latitude at which aurora was reported is the only available qualitative indicator of storm strength. The file's `_notes_on_antiquity` block documents what is *not* here, including the absence of peer-reviewed aurora identifications in ancient Egyptian sources.
- **Primary references:**
  - Stephenson, F. R., Willis, D. M. & Hallinan, T. (2004). *The earliest datable observation of the aurora borealis.* Astronomy & Geophysics 45, 6.15. doi:10.1046/j.1468-4004.2004.45615.x — the ~660 BCE Assyrian tablet identification.
  - Miyake, F. et al. (2012). *A signature of cosmic-ray increase in AD 774–775 from tree rings in Japan.* Nature 486, 240. doi:10.1038/nature11123 — cosmogenic cross-reference to Anglo-Saxon Chronicle aurora record.
  - O'Hare, P. et al. (2019). *Multiradionuclide evidence for an extreme solar proton event around 2,610 BP (~660 BC).* PNAS 116, 5961. doi:10.1073/pnas.1815725116 — cross-reference to Assyrian tablets.
  - Hayakawa, H. et al. (2017). *Long-lasting extreme magnetic storm activities in 1770 found in historical documents.* ApJ Letters 850, L31. doi:10.3847/2041-8213/aa9661 — the pre-Carrington benchmark event.
  - Hayakawa, H. et al. (2016). *East Asian observations of low-latitude aurora during the Carrington magnetic storm.* PASJ 68, 99. doi:10.1093/pasj/psw097.
  - Hayakawa, H. et al. (2019). *Records of sunspot and aurora during CE 960–1279 in the Chinese chronicle of the Song dynasty.* Earth, Planets & Space 71, 83. doi:10.1186/s40623-019-1062-2.
  - Lee, E. H., Ahn, Y. S., Yang, H. J. & Chen, K. Y. (2004). *The sunspot and auroral activity cycle derived from Korean historical records of the 11th–18th century.* Solar Phys. 224, 373. doi:10.1007/s11207-005-4974-x.
  - Usoskin, I. G. et al. (2013). *The AD775 cosmic event revisited: the Sun is to blame.* Astron. Astrophys. 552, L3. doi:10.1051/0004-6361/201321080.
  - Halley, E. (1716). *An Account of the late surprizing Appearance of the Lights seen in the Air.* Phil. Trans. Roy. Soc. London 29, 406. doi:10.1098/rstl.1714.0050 — the first scientific monograph on aurora.
  - Eddy, J. A. (1976). *The Maunder Minimum.* Science 192, 1189. doi:10.1126/science.192.4245.1189 — used the aurora-record gap as evidence of genuine solar quiescence.
- **License:** CC BY 4.0 for the compiled catalog. Individual descriptions quote or paraphrase cited works under fair-use for commentary and reference; full citations are provided on every entry.

## Historical storms and events (1859–present)

- **Format in this repo:** `data/events/historical_storms.json`, hand-authored from peer-reviewed sources and official agency reports. Every event entry carries its own `sources` array with citations.
- **Key references** (not exhaustive — see each event's `sources` for primary):
  - Cliver, E. W. & Dietrich, W. F. (2013). *The 1859 space weather event revisited: limits of extreme activity.* J. Space Weather Space Clim. 3, A31. doi:10.1051/swsc/2013053
  - Hayakawa, H. et al. (2018). *The Great Space Weather Event during 1872 February Recorded in East Asia.* ApJ 862, 15. doi:10.3847/1538-4357/aaca40
  - Hapgood, M. (2019). *The Great Storm of May 1921: An Exemplar of a Dangerous Space Weather Event.* Space Weather 17, 950. doi:10.1029/2019SW002195
  - Knipp, D. J. et al. (2018). *On the Little-Known Consequences of the 4 August 1972 Ultra-Fast Coronal Mass Ejecta.* Space Weather 16, 1635. doi:10.1029/2018SW002024
  - Boteler, D. H. (2019). *A 21st Century View of the March 1989 Magnetic Storm.* Space Weather 17, 1427. doi:10.1029/2019SW002278
  - Baker, D. N. et al. (2013). *A major solar eruptive event in July 2012.* Space Weather 11, 585. doi:10.1002/swe.20097
  - NOAA SWPC event archive and storm reports: https://www.swpc.noaa.gov/
- **License:** CC BY 4.0 for the compiled table. Individual event descriptions may quote cited works under fair-use for commentary and reference; full citations are provided for every entry.

## aa geomagnetic index (1868–present)

- **Source token:** `isgi`
- **Provider:** International Service of Geomagnetic Indices (ISGI), in cooperation with the British Geological Survey (BGS, Edinburgh). aa was introduced by Mayaud (1972); the modern series is maintained through two nearly antipodal observatories (Hartland, UK and Canberra, Australia since 1957; earlier via Greenwich/Melbourne and Kew/Toolangi).
- **Dataset:** Daily aa index (nT), derived from the 8 three-hourly aa values.
- **URL:** https://isgi.unistra.fr/indices_aa.php
- **Direct text file (BGS canonical dump):** https://geomag.bgs.ac.uk/data_service/data/magnetic_indices/aaindex/aaindex.txt
- **License:** CC BY 4.0 (ISGI data terms). The BGS-hosted text file is distributed under the same terms.
- **Citation:** Mayaud, P. N. (1972). The aa indices: A 100-year series characterizing the magnetic activity. J. Geophys. Res. 77, 6870. doi:10.1029/JA077i034p06870
- **Notes:** aa extends the geomagnetic record 64 years before Kp (1932+). Sentinel values -1, 999, and 9999 all appear in historical dumps; all normalized to null. The Parser in `scripts/sources/isgi-aa.mjs` accepts both the 12-field full format (`YYYY MM DD aa1..aa8 Aa`) and the 4-field daily-only form (`YYYY MM DD Aa`).

## Planned, not yet integrated

### Solar wind & IMF (1963–present)

- **Proposed source token:** (TBD — likely `omni`)
- **Provider:** NASA OMNI / SPDF, Goddard Space Flight Center.
- **URL:** https://omniweb.gsfc.nasa.gov/
- **Status:** not yet in scope. Native cadence is hourly; will live in a separate `data/hourly/` table, not shoehorned into the daily layer.
- **License:** public domain (NASA works are not subject to copyright in the United States).

### Event catalogs (CME, flare, storm)

- **CMEs:** CDAW/LASCO at NASA GSFC. https://cdaw.gsfc.nasa.gov/CME_list/
- **Flares and DONKI events (2010+):** NASA CCMC. https://kauai.ccmc.gsfc.nasa.gov/DONKI/
- **Status:** not yet in scope. Events are per-event records with timestamps, not daily aggregates; will live in `data/events/` with their own schema.

---

Each source is added in its own minor version with its own entry in this file and the CHANGELOG. No source is merged without a direct URL, a cited license, and a parser that round-trips against the upstream file.
