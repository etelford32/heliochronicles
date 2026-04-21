# Upstream sources and attribution

HelioChronicles is a compilation. Every value ultimately comes from a
scientific institution that does the hard work of observing, calibrating,
and publishing. Credit them.

## Daily sunspot number (1818–present)

- **Provider:** WDC-SILSO, Royal Observatory of Belgium, Brussels
- **Dataset:** Total sunspot number, daily values, version 2.0
- **URL:** https://www.sidc.be/SILSO/datafiles
- **Direct CSV:** https://www.sidc.be/SILSO/INFO/sndtotcsv.php
- **License:** CC BY-NC 4.0 (redistribution with attribution allowed for non-commercial use; commercial use requires permission from SILSO)
- **Citation:** SILSO World Data Center. Sunspot Number and Long-term Solar Observations, Royal Observatory of Belgium, online Sunspot Number catalogue.
- **Notes:** `-1` in the upstream indicates a missing day; we normalize to `null` in JSON and empty-field in CSV. Days with `definitive=0` are provisional and may change in future revisions.

## Geomagnetic Kp/ap/Ap (1932–present)

- **Provider:** GFZ German Research Centre for Geosciences, Helmholtz Centre Potsdam, in cooperation with the International Service of Geomagnetic Indices (ISGI)
- **Dataset:** Kp index, ap index, Ap daily average
- **URL:** https://kp.gfz-potsdam.de/
- **Direct text file:** https://kp.gfz-potsdam.de/app/files/Kp_ap_Ap_SN_F107_since_1932.txt
- **License:** CC BY 4.0
- **Citation:** Matzka, J., Stolle, C., Yamazaki, Y., Bronkalla, O. and Morschhauser, A. (2021). The geomagnetic Kp index and derived indices of geomagnetic activity. Space Weather, 19, e2020SW002641.

## Planned, not yet integrated

- **Solar wind & IMF (1963–present):** NASA OMNI via OMNIWeb (GSFC/SPDF). https://omniweb.gsfc.nasa.gov/
- **F10.7 radio flux (1947–present):** LASP LISIRD, mirrored from DRAO/NRCan. https://lasp.colorado.edu/lisird/
- **aa geomagnetic index (1868–present):** ISGI/BGS. https://isgi.unistra.fr/
- **CME catalog (1996–present):** CDAW/LASCO at NASA GSFC. https://cdaw.gsfc.nasa.gov/CME_list/
- **Flares and events (2010–present):** NASA DONKI. https://kauai.ccmc.gsfc.nasa.gov/DONKI/

Each will be added in its own minor version with its own entry in this file and the CHANGELOG. No source is merged without a direct URL, a cited license, and a parser that round-trips against the upstream file.
