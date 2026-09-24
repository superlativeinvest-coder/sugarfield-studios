# Production Storage Audit — 2026-09-22

Status: **PASS — storage gate complete; downstream approvals still required**
Target: `https://lbbxdvszykxdaytqmqnl.supabase.co`
Bucket: `digital-products`
Mode: read-only; no uploads, overwrites, signed-URL persistence, or delivery-map changes

## Summary

| Product | Required objects | Hash matches | Missing | Mismatched |
|---|---:|---:|---:|---:|
| P06 | 2 | 2 | 0 | 0 |
| P16 | 4 | 4 | 0 | 0 |
| P13 | 2 | 2 | 0 | 0 |
| P17 | 3 | 3 | 0 | 0 |
| P18 | 22 | 22 | 0 | 0 |
| **Total** | **33** | **33** | **0** | **0** |

## Hash evidence

| Product | Object path | Expected SHA-256 | Observed SHA-256 | Result |
|---|---|---|---|---|
| P06 | `pokopia/daily-reset/pokopia-daily-reset-checklist-a4.pdf` | `ED05041A3107203A97A97BBE2E45B83FD49884E7A00F85204710D445B17677D0` | `ED05041A3107203A97A97BBE2E45B83FD49884E7A00F85204710D445B17677D0` | PASS |
| P06 | `pokopia/daily-reset/pokopia-daily-reset-checklist-print-2026-05.pdf` | `403CCC973569B58A16E872827DA0D4CFB56EDC5F69CFDECF56F21BBE248AEC1F` | `403CCC973569B58A16E872827DA0D4CFB56EDC5F69CFDECF56F21BBE248AEC1F` | PASS |
| P16 | `pokopia/companion/pokopia-adventure-companion-p14-cloud-islands-planner-a4.pdf` | `DF9491B555D2AFE024C8660EC895F14B9C3F079D771A898E1F89DB06A4D206FD` | `DF9491B555D2AFE024C8660EC895F14B9C3F079D771A898E1F89DB06A4D206FD` | PASS |
| P16 | `pokopia/companion/pokopia-adventure-companion-p14-cloud-islands-planner-letter.pdf` | `5DB00EA5284F65996EDE7EEDBFC6B03E256427D4D7FCC670D26015E3FACA5962` | `5DB00EA5284F65996EDE7EEDBFC6B03E256427D4D7FCC670D26015E3FACA5962` | PASS |
| P16 | `pokopia/companion/pokopia-adventure-companion-p15-spawn-tracker-guide-a4.pdf` | `F111D6A95B83F77703A1B87C954AC1F4A188D479F37DB5293E0C0A00C217AE8D` | `F111D6A95B83F77703A1B87C954AC1F4A188D479F37DB5293E0C0A00C217AE8D` | PASS |
| P16 | `pokopia/companion/pokopia-adventure-companion-p15-spawn-tracker-guide-letter.pdf` | `0C23152F26C6F6E9AE95A795D06215B32BA738C38EF1487559CD8BCCDD71370A` | `0C23152F26C6F6E9AE95A795D06215B32BA738C38EF1487559CD8BCCDD71370A` | PASS |
| P17 | `pokopia/completionist-kit/v2-corrected-20260908/Pokopia-Field-Guide-US-Letter.pdf` | `7B060DDC9B3F0FC946E4271CCA65197FC2945E19C549798CE7C2B791E216FFAF` | `7B060DDC9B3F0FC946E4271CCA65197FC2945E19C549798CE7C2B791E216FFAF` | PASS |
| P17 | `pokopia/completionist-kit/v2-corrected-20260908/Pokopia-Field-Guide-A4.pdf` | `72799BC69CE5A0633E9CE782996952C30782A56C09DBC6A147711DB46F37D97D` | `72799BC69CE5A0633E9CE782996952C30782A56C09DBC6A147711DB46F37D97D` | PASS |
| P17 | `pokopia/completionist-kit/v2-corrected-20260908/Pokopia-26-Card-Reference-Collection.pdf` | `FCDB5427378E564E5B7EADB395C40032680F204C4F0D08CDC93276D3CCF212CB` | `FCDB5427378E564E5B7EADB395C40032680F204C4F0D08CDC93276D3CCF212CB` | PASS |

## Missing objects

- P13: both `P16_V3_19_99_CUSTOMER_DELIVERY_REFRESH_20260919_STAGED` Event Tracker objects.
- P18: all 22 objects under `P18_V4_24_99_CUSTOMER_DELIVERY_REFRESH_20260919_STAGED`.

The initial P16 comparison used staged V3 hashes against legacy production paths; the corrected comparison above uses the approved legacy P16 production hashes. P13 V4.3 and P18 V4 were then promoted to the new production prefixes shown above and re-audited. All 33 required objects now exist and hash-match. Objects remain private; no delivery map or deployment activation was performed by the audit.
