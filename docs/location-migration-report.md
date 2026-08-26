# Location migration report

Mode: **apply**
Ran at: 2026-08-26T10:08:52.106Z
Taxonomy backup: `/Users/user/Projects/stays/.data/taxonomy-backups/taxonomy-2026-08-26T10-08-51-518Z.json`

## Catalog snapshot

- Countries in PlatformCatalog: 1
- States in PlatformCatalog: 36
- Districts in PlatformCatalog: 763

## Summary

- countries found: 1
- states found: 36
- districts found: 763
- locations to create: 799
- locations already existing: 0
- duplicates: 0 skipped sibling names, 0 ambiguous listings
- unmatched records: 11
- errors: 0

## Import

- Countries created: 0
- Countries updated: 1
- Countries skipped: 0
- Admin-level-1 locations (states/emirates/regions): 36
- Admin-level-2 locations (districts): 763
- Location rows skipped: 0
- Location rows already in Postgres: 0

### Countries imported

- India (`IN`) id=`c-lgd-in` launch=true active=true

### Skip reasons

Sample skipped nodes:

- none

## Listing mapping

- Mapped to a location: 1
- Country only (no locationId): 0
- Unmatched: 11
- Ambiguous (not assigned): 0

### Mapped

- `L-TEST-IDUKKI` LGD mapping test — Idukki → Idukki (mapped_to_admin_level_2)

### Country only

- none

### Unmatched / ambiguous (manual review)

- `L-A02` Spice Garden Cottage — country="United Arab Emirates" state="Sharjah" district="Kalba" — country_not_in_taxonomy
- `L-A01` Green Valley Farmhouse — country="United Arab Emirates" state="Abu Dhabi" district="Al Ain" — country_not_in_taxonomy
- `L-003` Mountain BBQ Experience — country="United Arab Emirates" state="Dubai" district="Hatta" — country_not_in_taxonomy
- `L-002` Oasis Heritage Home — country="United Arab Emirates" state="Abu Dhabi" district="Al Ain" — country_not_in_taxonomy
- `L-001` Sunset Desert Camp — country="United Arab Emirates" state="Abu Dhabi" district="Al Dhafra" — country_not_in_taxonomy
- `L-MSXPA1PR` wow — country="United Arab Emirates" state="Dubai" district="Hatta" — country_not_in_taxonomy
- `L-MT46VQO8` Roses Homestay Cozy Entire First Floor — country="United Arab Emirates" state="Abu Dhabi" district="Liwa" — country_not_in_taxonomy
- `L-MT47AEQO` Roses Homestay Cozy Entire First Floor — country="United Arab Emirates" state="Dubai" district="Hatta" — country_not_in_taxonomy
- `1` Green Valley Farmhouse — country="" state="" district="Al Ain, Abu Dhabi, UAE" — composite_location_string
- `11` Palm Grove Wedding Lawn — country="" state="" district="Dubai, UAE" — composite_location_string
- `6` Al Raha Farm Estate — country="" state="" district="Abu Dhabi, UAE" — composite_location_string

## Warnings

- none

## Errors

- none

## Notes

- PlatformCatalog.taxonomy JSON was not deleted.
- Unmatched listings did not receive a locationId.
- Search still uses Listing.country/state/district strings until a later phase.

