# App Store screenshots (iPhone 6.9", 1320 × 2868)

Captured 2026-10-05 from the **Release** build (`expo run:ios --configuration Release`) on the
iPhone 18 Pro Max simulator with the status bar set to 9:41, full signal, charged battery. Because it
is a Release build, there is no development UI and the hotline numbers that have not been verified by
a person are hidden (so the emergency screen only appears from `06` on, once the four lines were verified).

| File | What it shows |
|---|---|
| `01-home` | Home: species toggle, barcode button, "chocolate" typed |
| `02-toxic` | Toxic result for a dog, source above the fold, "Call a vet now" |
| `03-no-known-toxicity` | A "no known toxicity" result (carrot / zanahoria) |
| `04-not-sure` | "Not sure — ask your vet" with a "Did you mean…?" suggestion |
| `05-settings` | Language and region as separate settings (es: Español + region US) |
| `06-emergency` | The emergency screen with the verified US poison lines (added 2026-10-05, after the hotlines were verified) |

`en/` and `es/` hold the same six screens. Apple takes up to 10 per localisation and also accepts
these for the smaller iPhone sizes (it scales them), so one 6.9" set is enough to submit.

To retake: build the Release app, set the status bar with `xcrun simctl status_bar <udid> override
--time 9:41 …`, and **navigate by tapping**, not with `xcrun simctl openurl`: iOS shows an "Open in
CanMy*EatThis?" confirmation for every URL and queues them up over the screenshot. The draft text
survives a relaunch (by design), so clear it with "Check something else" before typing a new query.

## Which folder to upload

App Store Connect shows a different size requirement per device class, and it names the sizes in the
error. If it says **1242 × 2688 or 1284 × 2778**, that is the **6.5-inch** slot: upload
`6.5-inch/{en,es}/` (1284 × 2778). If it offers the **6.9-inch** slot, upload `{en,es}/` (1320 × 2868).
You only need one class; Apple scales it to the other sizes.

The 6.5-inch images are the same screenshots scaled to 1284 px wide, with the 12 spare pixels of
height cropped (6 from the top, 6 from the bottom: status-bar margin and the home-indicator strip),
so nothing is stretched.
