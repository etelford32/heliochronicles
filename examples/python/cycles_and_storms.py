"""
HelioChronicles — cycles and storms, cross-referenced.

Loads the curated solar cycle table and the historical storm catalog,
joins them by cycle number, and prints a cycle-by-cycle summary showing
which storms each cycle produced.

Works against the committed JSON tables — no runtime data-fetching, no
external dependencies beyond pandas.

Run from the repo root:
    python examples/python/cycles_and_storms.py
"""
import json
import pathlib
import sys

import pandas as pd

REPO = pathlib.Path(__file__).resolve().parents[2]


def load(path):
    with open(REPO / path) as f:
        return json.load(f)


def main() -> int:
    cycles = pd.DataFrame(load("data/cycles/solar_cycles.json")["cycles"])
    storms = pd.DataFrame(load("data/events/historical_storms.json")["events"])
    regions = pd.DataFrame(load("data/regions/notable_regions.json")["regions"])

    # Storms per cycle
    storms_by_cycle = (
        storms.groupby("cycle")
        .agg(n_events=("id", "count"), event_names=("name", lambda s: "; ".join(s)))
        .reset_index()
    )
    joined = cycles.merge(storms_by_cycle, on="cycle", how="left").fillna(
        {"n_events": 0, "event_names": ""}
    )
    joined["n_events"] = joined["n_events"].astype(int)

    print(f"=== HelioChronicles — {len(cycles)} cycles × {len(storms)} storms × "
          f"{len(regions)} regions ===\n")

    print(f"{'Cycle':>5} | {'Peak SSN':>8} | {'Duration':>8} | {'Events':>6} | "
          "Named events")
    print("-" * 100)
    for _, r in joined.iterrows():
        dur = f"{r['duration_years']:.1f}yr" if pd.notna(r["duration_years"]) else "—"
        prov = "*" if r["provisional"] else " "
        print(
            f"{int(r['cycle']):>4}{prov} | {r['peak_ssn']:>8.1f} | {dur:>8} | "
            f"{r['n_events']:>6} | {r['event_names']}"
        )

    # Summary statistics
    finished = cycles[~cycles["provisional"]]
    print("\n=== Summary (completed cycles) ===")
    print(f"Mean cycle duration: {finished['duration_years'].mean():.2f} years")
    print(f"Mean peak SSN:       {finished['peak_ssn'].mean():.1f}")
    biggest = finished.loc[finished["peak_ssn"].idxmax()]
    smallest = finished.loc[finished["peak_ssn"].idxmin()]
    print(f"Biggest: SC{biggest['cycle']} ({biggest['max']}) peak {biggest['peak_ssn']:.1f}")
    print(f"Smallest: SC{smallest['cycle']} ({smallest['max']}) peak {smallest['peak_ssn']:.1f}")

    # Region → storm mapping
    print("\n=== Storm → Source region ===")
    for _, s in storms.iterrows():
        arr = s["source_region_ids"] or []
        if not arr:
            continue
        arnums = []
        for rid in arr:
            match = regions[regions["id"] == rid]
            if len(match):
                row = match.iloc[0]
                if row["numbering_scheme"] == "noaa":
                    arnums.append(f"AR {int(row['noaa_number'])}")
                else:
                    arnums.append(f"McMath {int(row['pre_noaa_number'])}")
        print(f"  {s['date_start']}  {s['name']:<40}  ←  {', '.join(arnums)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
