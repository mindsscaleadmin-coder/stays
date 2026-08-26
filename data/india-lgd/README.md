# India LGD State / District source

Authoritative administrative units for India, used to replace the invalid Admin taxonomy upload (serial numbers as “states”).

## Source

- **Publisher:** Ministry of Panchayati Raj, Government of India
- **System:** [Local Government Directory (LGD)](https://lgdirectory.gov.in)
- **Catalog:** [data.gov.in — Local Government Directory (LGD)](https://www.data.gov.in/catalog/local-government-directory-lgd)
- **LGD downloads:** “All States of India” and “All Districts of India” from [lgdirectory.gov.in/downloadDirectory.do](https://lgdirectory.gov.in/downloadDirectory.do)
- **Files in this folder:** CSV export of those LGD entities, retrieved 2026-08-26 via the public dump [planemad/india-local-government-directory](https://github.com/planemad/india-local-government-directory) (`administrative/1-state.csv`, `administrative/2-district.csv`), which is derived from LGD (not Google Places).

## Files

| File | Contents |
|---|---|
| `lgd-states.csv` | 36 States/UTs with LGD state codes |
| `lgd-districts.csv` | 763 districts with LGD district codes and parent state codes |
| `india-state-district.csv` | Cleaned `country,state,district` (+ LGD codes) written by `scripts/prepare-india-lgd.ts` |

Homonymous districts (e.g. Aurangabad in Bihar and Maharashtra) are **not** merged. Identity is `state LGD code + district LGD code`.

## Do not

- Upload a spreadsheet whose first column is `Sl. No.` / `1` / `2`
- Treat district name as globally unique
