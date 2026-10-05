# App Store listing — first release (typed lookups and barcode scanning)

Paste-ready text for App Store Connect. Character limits are Apple's; `scripts/check-store-listing.mjs`
verifies them and the banned-word rule (AGENTS.md #3: no bare "safe"). **The Spanish has not been
read by a native speaker**; it must be, like every Spanish string in this project, before it ships.

Screenshots are in `docs/store-screenshots/{en,es}/` (1320 × 2868, iPhone 6.9"). They come from the
Release build, so they show real release behaviour (no development-only UI).

## Fields

| Field | Limit | Value |
|---|---|---|
| Support URL | — | https://jasalguero.github.io/canmy_eatthis/ |
| Marketing URL | optional | (leave empty) |
| Privacy Policy URL | — | en: https://jasalguero.github.io/canmy_eatthis/en/privacy.html · es: https://jasalguero.github.io/canmy_eatthis/es/privacy.html |
| App name (store) | 30 | en: **CanMyEatThis: Pet Food Check** (chosen 2026-10-05; "CanMy EatThis" was not used) · es: CanMyEatThis. The name inside the app and on the phone's home screen stays "CanMy*EatThis". |
| Primary category | — | Utilities (alternative: Lifestyle) |
| Copyright | — | 2026 Jose Salguero |
| Price | — | Free |
| Age rating | — | 4+ (no objectionable content; see questionnaire below) |

## English (U.S.)

<!-- field:name -->
CanMyEatThis: Pet Food Check
<!-- field:subtitle -->
Answers from vet sources
<!-- field:promo -->
Did your dog or cat eat something? Look up what published veterinary sources say, in seconds, and reach a poison line if it is serious.
<!-- field:keywords -->
dog,cat,pet,toxic,poison,food,plant,chocolate,grapes,xylitol,vet,barcode,emergency
<!-- field:description -->
Your dog or cat just ate something? CanMy*EatThis is a fast way to look up what published veterinary sources say about a food, plant or product, and to reach someone who can actually help.

WHAT YOU GET
• Type what it was, or scan a barcode, and see a clear answer: toxic, a concern, no known toxicity, or "not sure — ask your vet".
• Every answer shows where it comes from, with a link to the source.
• Dogs and cats are answered separately.
• Works offline. The emergency screen, with the poison lines for your region, needs no internet connection.
• English and Spanish. Language and region are separate settings, so a Spanish speaker in the United States gets Spanish text and US phone numbers.
• No account, no ads, no tracking.

WHAT IT IS NOT
CanMy*EatThis is not a vet, a diagnosis or an emergency service. It reports what published sources say, and when it is not sure it says so and sends you to a professional. If your pet may have eaten something harmful, call your vet or a poison line now. Do not wait for signs.

PRIVACY
Lookups you type stay on your phone. Scanning a barcode sends the barcode number to Open Food Facts to read the ingredients. We do not collect or store anything about you.
<!-- field:whatsnew -->
First release.

## Español (España)

<!-- field:name -->
CanMy EatThis
<!-- field:subtitle -->
Comida de mascotas con fuentes
<!-- field:promo -->
¿Tu perro o gato ha comido algo? Consulta en segundos qué dicen las fuentes veterinarias publicadas y llama a un servicio de toxicología si es grave.
<!-- field:keywords -->
perro,gato,mascota,tóxico,veneno,alimento,planta,chocolate,uvas,xilitol,veterinario,código,urgencias
<!-- field:description -->
¿Tu perro o gato acaba de comer algo? CanMy*EatThis es una forma rápida de consultar qué dicen las fuentes veterinarias publicadas sobre un alimento, una planta o un producto, y de llegar a alguien que pueda ayudarte de verdad.

QUÉ OFRECE
• Escribe qué era, o escanea un código de barras, y obtén una respuesta clara: tóxico, motivo de preocupación, sin toxicidad conocida, o «no estoy seguro: consulta a tu veterinario».
• Cada respuesta muestra de dónde viene, con un enlace a la fuente.
• Las respuestas para perros y para gatos son independientes.
• Funciona sin conexión. La pantalla de emergencia, con los teléfonos de toxicología de tu región, no necesita internet.
• Español e inglés. El idioma y la región son ajustes distintos, así que alguien que hable español en Estados Unidos ve el texto en español y los teléfonos de Estados Unidos.
• Sin cuenta, sin anuncios, sin seguimiento.

QUÉ NO ES
CanMy*EatThis no es un veterinario, ni un diagnóstico, ni un servicio de urgencias. Cuenta lo que dicen las fuentes publicadas y, cuando no está seguro, lo dice y te dirige a un profesional. Si tu mascota ha podido comer algo dañino, llama ya a tu veterinario o a un servicio de toxicología. No esperes a que aparezcan síntomas.

PRIVACIDAD
Lo que escribes se queda en tu teléfono. Al escanear un código de barras se envía el número a Open Food Facts para leer los ingredientes. No recogemos ni guardamos nada sobre ti.
<!-- field:whatsnew -->
Primera versión.

## App Review information

<!-- field:review -->
CanMy*EatThis is a free reference tool that shows what published veterinary sources say about whether a food, plant or product is toxic to dogs or cats. It is not a diagnostic tool and says so on first launch and on every result. Every result shows the source it comes from.

No account or login is needed. Nothing about the user is stored on a server: lookups run on the device. Scanning a barcode sends only the barcode number to Open Food Facts to read the ingredients. The camera is used only for that.

To review: choose Dog or Cat, type "chocolate" and tap Check. You will see a "Toxic" result with a source and a "Call a vet now" button. Tap that button to see the regional poison lines. For a barcode, tap "Scan a barcode" and scan any food product.

This version has no AI or photo-identification feature. The app contains no in-app purchases, ads or tracking.

Contact: canmy_eatthis@jasalguero.com

## Age rating questionnaire (answers)

Everything "None" / "No": cartoon or fantasy violence, realistic violence, sexual content, profanity,
horror, medical/treatment information (**answer carefully**: the app gives *pet* toxicity reference
information, not human medical advice or treatment; choose the "infrequent/mild" option only if the
questionnaire's wording for "medical or treatment information" covers pet information), alcohol/tobacco/drug
references (the app names alcohol, nicotine and cannabis as things that are toxic to pets; if asked about
"references", answer infrequent/mild), gambling, unrestricted web access (No: sources open in the browser,
the app has no browser), user-generated content (No). Expected result: 4+.

## Screenshot captions (optional, not burned into the images)

1. Look up anything your pet may have eaten
2. Clear answers, with the source above the fold
3. No known toxicity — and when it is not sure, it says so
4. Spanish or English; language and region are separate
5. Poison lines for your region, one tap away, and they work offline
