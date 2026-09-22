import type { ResolvedKbEntry } from '@canmyeatthis/shared';

/**
 * Mock knowledge-base entries for Phase 2. **Generated — do not edit by hand.**
 *
 * Phase 2 builds every screen against hardcoded mock data with no network and no bundled KB
 * (docs/07 Phase 2) — bundling `kb.json` as an app asset is H3's job (docs/10 §7). But the
 * screens still have to be reviewed against content that behaves like the real thing: Spanish
 * that actually runs 20–30% longer than the English, real source labels long enough to wrap, and
 * the real controlled-vocabulary ids so the Result screen's signs list is exercised.
 *
 * So this file is generated from the Phase 1 build artefacts (`packages/kb/dist/kb.<lang>.json`)
 * rather than invented: same entries, same prose, same ids, projected onto `ResolvedKbEntry`.
 * Regenerate with `pnpm mock:kb`. When H3 bundles the real KB, this file and its generator are
 * deleted and nothing else changes — the screens already consume `ResolvedKbEntry` and
 * `resolveVerdict()`.
 *
 * The chosen entries cover every verdict and every severity, plus the two cases that matter most
 * for review: `lily` (caution for dogs, severe toxic for cats — the species toggle changes the
 * answer) and `macadamia_nuts` (toxic for dogs, genuinely `unknown` for cats).
 */

export type MockLanguage = 'en' | 'es';

export const MOCK_KB_VERSION: Record<MockLanguage, string> = {
  en: '6145cd30a3ed',
  es: '6145cd30a3ed',
};

export const MOCK_ENTRIES: Record<MockLanguage, Record<string, ResolvedKbEntry>> = {
  en: {
    carrot: {
      id: 'carrot',
      displayName: 'Carrot',
      species: {
        dog: {
          verdict: 'safe',
          severity: null,
          headline: 'No known risk from carrot.',
          summary:
            'Raw or cooked carrot is a low-calorie snack many dogs enjoy. Cut it into bite-sized pieces to avoid a choking risk, especially for small dogs or puppies.',
          signs: [],
          onset_hours: null,
          emergency_actions: [],
        },
        cat: {
          verdict: 'safe',
          severity: null,
          headline: 'No known risk from carrot.',
          summary:
            'A small amount of cooked, plain carrot is not known to cause harm to cats, though as an obligate carnivore a cat has little use for it nutritionally.',
          signs: [],
          onset_hours: null,
          emergency_actions: [],
        },
      },
      sources: [],
    },
    cheese: {
      id: 'cheese',
      displayName: 'Cheese',
      species: {
        dog: {
          verdict: 'caution',
          severity: null,
          headline: 'Fine as an occasional small treat.',
          summary:
            'Most adult dogs lose some ability to digest lactose as they grow up, so cheese can cause loose stools, gas or vomiting in larger amounts. A small piece now and then is usually fine; a lot is not.',
          signs: ['diarrhoea', 'vomiting', 'bloating'],
          onset_hours: {
            min: 2,
            max: 12,
          },
          emergency_actions: [],
        },
        cat: {
          verdict: 'caution',
          severity: null,
          headline: 'Best kept to a tiny amount, if any.',
          summary:
            'Cats lose lactase — the enzyme that digests milk sugar — as kittens grow into adults, and are, if anything, more prone to an upset stomach from dairy than dogs are.',
          signs: ['diarrhoea', 'vomiting', 'bloating'],
          onset_hours: {
            min: 2,
            max: 12,
          },
          emergency_actions: [],
        },
      },
      sources: [
        {
          label:
            'Merck Veterinary Manual — Cutaneous Food Allergy in Animals (dairy as a common trigger)',
          url: 'https://www.merckvetmanual.com/integumentary-system/food-allergy/cutaneous-food-allergy-in-animals',
        },
        {
          label: 'Cornell University College of Veterinary Medicine — Feeding Your Cat',
          url: 'https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feeding-your-cat',
        },
      ],
    },
    chocolate_milk: {
      id: 'chocolate_milk',
      displayName: 'Milk chocolate',
      species: {
        dog: {
          verdict: 'toxic',
          severity: 'mild',
          headline: 'Toxic to dogs. Call your vet.',
          summary:
            'Milk chocolate has much less theobromine than dark chocolate, so a dog usually needs to eat a lot more of it to get seriously ill — but a whole bar or more is still a real risk, especially for a small dog.',
          signs: ['vomiting', 'diarrhoea', 'restlessness', 'tachycardia', 'tremors'],
          onset_hours: {
            min: 6,
            max: 12,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
        cat: {
          verdict: 'toxic',
          severity: 'mild',
          headline: 'Toxic to cats. Call your vet.',
          summary:
            'Cats are sensitive to the same theobromine found in milk chocolate, even though the concentration is lower than in dark chocolate.',
          signs: ['vomiting', 'diarrhoea', 'restlessness', 'tachycardia', 'tremors'],
          onset_hours: {
            min: 6,
            max: 12,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
      },
      sources: [
        {
          label: 'Merck Veterinary Manual — Chocolate Toxicosis in Animals',
          url: 'https://www.merckvetmanual.com/toxicology/food-hazards/chocolate-toxicosis-in-animals',
        },
        {
          label:
            'Kovalkovičová et al., "Some food toxic for pets", Interdisciplinary Toxicology (2009)',
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2984110/',
        },
      ],
    },
    chocolate_dark: {
      id: 'chocolate_dark',
      displayName: 'Dark chocolate',
      species: {
        dog: {
          verdict: 'toxic',
          severity: 'moderate',
          headline: 'Toxic to dogs. Call your vet.',
          summary:
            'Dark chocolate is rich in theobromine, a stimulant dogs clear far more slowly than people do. Even a modest amount of dark or baking chocolate can bring on vomiting, a racing heart, tremors or seizures.',
          signs: [
            'vomiting',
            'diarrhoea',
            'restlessness',
            'tachycardia',
            'tremors',
            'seizures',
            'hyperthermia',
          ],
          onset_hours: {
            min: 6,
            max: 12,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
        cat: {
          verdict: 'toxic',
          severity: 'moderate',
          headline: 'Toxic to cats. Call your vet.',
          summary:
            'Cats rarely choose to eat chocolate, but if one does, the same theobromine that harms dogs harms cats too, and cats are at least as sensitive.',
          signs: [
            'vomiting',
            'diarrhoea',
            'restlessness',
            'tachycardia',
            'tremors',
            'seizures',
            'hyperthermia',
          ],
          onset_hours: {
            min: 6,
            max: 12,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
      },
      sources: [
        {
          label: 'Merck Veterinary Manual — Chocolate Toxicosis in Animals',
          url: 'https://www.merckvetmanual.com/toxicology/food-hazards/chocolate-toxicosis-in-animals',
        },
        {
          label:
            'Kovalkovičová et al., "Some food toxic for pets", Interdisciplinary Toxicology (2009)',
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2984110/',
        },
      ],
    },
    grapes_raisins: {
      id: 'grapes_raisins',
      displayName: 'Grapes and raisins',
      species: {
        dog: {
          verdict: 'toxic',
          severity: 'severe',
          headline: 'Toxic to dogs. Call your vet.',
          summary:
            "Grapes, raisins and currants can cause sudden kidney failure in dogs. No amount is known to be reliably safe, and some dogs are affected by very small quantities while others tolerate more — there's no way to tell in advance.",
          signs: [
            'vomiting',
            'diarrhoea',
            'lethargy',
            'abdominal_pain',
            'increased_thirst',
            'increased_urination',
            'kidney_failure_signs',
          ],
          onset_hours: {
            min: 6,
            max: 24,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
        cat: {
          verdict: 'toxic',
          severity: 'severe',
          headline: 'Toxic to cats. Call your vet.',
          summary:
            "Cats eat grapes and raisins far less often than dogs, so there's less documented experience, but the same kidney-failure risk is assumed to apply and is treated the same way.",
          signs: [
            'vomiting',
            'diarrhoea',
            'lethargy',
            'abdominal_pain',
            'increased_thirst',
            'increased_urination',
            'kidney_failure_signs',
          ],
          onset_hours: {
            min: 6,
            max: 24,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
      },
      sources: [
        {
          label: 'Merck Veterinary Manual — Grape, Raisin, and Tamarind Toxicosis in Dogs',
          url: 'https://www.merckvetmanual.com/toxicology/food-hazards/grape-raisin-and-tamarind-vitis-spp-tamarindus-spp-toxicosis-in-dogs',
        },
        {
          label:
            'Kovalkovičová et al., "Some food toxic for pets", Interdisciplinary Toxicology (2009)',
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2984110/',
        },
      ],
    },
    lily: {
      id: 'lily',
      displayName: 'Lily',
      species: {
        dog: {
          verdict: 'caution',
          severity: null,
          headline: 'Best kept away from dogs.',
          summary:
            "Lilies cause milder stomach upset in dogs than in cats — dogs are not known to develop the severe kidney failure cats do — but it's still worth keeping these plants out of reach and calling your vet if a dog eats a large amount.",
          signs: ['vomiting', 'diarrhoea', 'hypersalivation'],
          onset_hours: {
            min: 0,
            max: 12,
          },
          emergency_actions: [],
        },
        cat: {
          verdict: 'toxic',
          severity: 'severe',
          headline: 'Toxic to cats. Call your vet now.',
          summary:
            'True lilies (Lilium species) and daylilies are severely toxic to cats — even a small bite of leaf or petal, a lick of pollen, or drinking vase water can cause fatal kidney failure. This is one of the most dangerous common houseplants for cats.',
          signs: [
            'lethargy',
            'hypersalivation',
            'vomiting',
            'loss_of_appetite',
            'increased_thirst',
            'increased_urination',
            'kidney_failure_signs',
          ],
          onset_hours: {
            min: 0,
            max: 12,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
      },
      sources: [
        {
          label:
            'Langston, "Acute renal failure caused by lily ingestion in six cats", J Am Vet Med Assoc (2002) — PubMed',
          url: 'https://pubmed.ncbi.nlm.nih.gov/12680447/',
        },
        {
          label: 'FDA — Lovely Lilies and Curious Cats: A Dangerous Combination',
          url: 'https://www.fda.gov/animal-veterinary/animal-health-literacy/lovely-lilies-and-curious-cats-dangerous-combination',
        },
      ],
    },
    macadamia_nuts: {
      id: 'macadamia_nuts',
      displayName: 'Macadamia nuts',
      species: {
        dog: {
          verdict: 'toxic',
          severity: 'moderate',
          headline: 'Toxic to dogs. Call your vet.',
          summary:
            "Macadamia nuts cause a strange but usually short-lived syndrome in dogs — weakness, especially in the back legs, along with tremors and a raised temperature. The exact toxin isn't known, but the cases are well documented.",
          signs: ['weakness', 'ataxia', 'tremors', 'hyperthermia', 'lethargy', 'vomiting'],
          onset_hours: {
            min: 0,
            max: 12,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
        cat: {
          verdict: 'unknown',
          severity: null,
          headline: 'Not sure — no reported cases in cats, but ask your vet.',
          summary:
            "Macadamia toxicosis has only been documented in dogs; there isn't good evidence either way for cats, so treat any real ingestion as worth a call to your vet rather than assuming it's fine.",
          signs: [],
          onset_hours: null,
          emergency_actions: [],
        },
      },
      sources: [
        {
          label: 'Merck Veterinary Manual — Macadamia Nut Toxicosis in Dogs',
          url: 'https://www.merckvetmanual.com/toxicology/food-hazards/macadamia-nut-toxicosis-in-dogs',
        },
        {
          label:
            'Kovalkovičová et al., "Some food toxic for pets", Interdisciplinary Toxicology (2009)',
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2984110/',
        },
      ],
    },
  },
  es: {
    carrot: {
      id: 'carrot',
      displayName: 'Zanahoria',
      species: {
        dog: {
          verdict: 'safe',
          severity: null,
          headline: 'Sin riesgo conocido con zanahoria.',
          summary:
            'La zanahoria cruda o cocida es un aperitivo bajo en calorías que a muchos perros les gusta. Córtala en trozos pequeños para evitar el riesgo de atragantamiento, sobre todo en perros pequeños o cachorros.',
          signs: [],
          onset_hours: null,
          emergency_actions: [],
        },
        cat: {
          verdict: 'safe',
          severity: null,
          headline: 'Sin riesgo conocido con zanahoria.',
          summary:
            'Una pequeña cantidad de zanahoria cocida y sin condimentar no se conoce que perjudique a los gatos, aunque al ser carnívoros estrictos les aporta poco a nivel nutricional.',
          signs: [],
          onset_hours: null,
          emergency_actions: [],
        },
      },
      sources: [],
    },
    cheese: {
      id: 'cheese',
      displayName: 'Queso',
      species: {
        dog: {
          verdict: 'caution',
          severity: null,
          headline: 'Bien como premio ocasional y en poca cantidad.',
          summary:
            'La mayoría de los perros adultos pierden parte de su capacidad para digerir la lactosa al crecer, así que el queso en cantidad puede causar heces blandas, gases o vómitos. Un trozo pequeño de vez en cuando suele estar bien; mucha cantidad no.',
          signs: ['diarrhoea', 'vomiting', 'bloating'],
          onset_hours: {
            min: 2,
            max: 12,
          },
          emergency_actions: [],
        },
        cat: {
          verdict: 'caution',
          severity: null,
          headline: 'Mejor limitarlo a una cantidad mínima, si acaso.',
          summary:
            'Los gatos pierden la lactasa —la enzima que digiere el azúcar de la leche— al pasar de gatitos a adultos, y en todo caso son más propensos que los perros a sufrir molestias digestivas por los lácteos.',
          signs: ['diarrhoea', 'vomiting', 'bloating'],
          onset_hours: {
            min: 2,
            max: 12,
          },
          emergency_actions: [],
        },
      },
      sources: [
        {
          label:
            'Merck Veterinary Manual — Cutaneous Food Allergy in Animals (dairy as a common trigger)',
          url: 'https://www.merckvetmanual.com/integumentary-system/food-allergy/cutaneous-food-allergy-in-animals',
        },
        {
          label: 'Cornell University College of Veterinary Medicine — Feeding Your Cat',
          url: 'https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center/health-information/feline-health-topics/feeding-your-cat',
        },
      ],
    },
    chocolate_milk: {
      id: 'chocolate_milk',
      displayName: 'Chocolate con leche',
      species: {
        dog: {
          verdict: 'toxic',
          severity: 'mild',
          headline: 'Tóxico para perros. Llama a tu veterinario.',
          summary:
            'El chocolate con leche tiene mucha menos teobromina que el chocolate negro, así que un perro suele necesitar comer mucho más para enfermar gravemente, pero una tableta entera o más sigue siendo un riesgo real, sobre todo para un perro pequeño.',
          signs: ['vomiting', 'diarrhoea', 'restlessness', 'tachycardia', 'tremors'],
          onset_hours: {
            min: 6,
            max: 12,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
        cat: {
          verdict: 'toxic',
          severity: 'mild',
          headline: 'Tóxico para gatos. Llama a tu veterinario.',
          summary:
            'Los gatos son sensibles a la misma teobromina presente en el chocolate con leche, aunque su concentración sea menor que en el chocolate negro.',
          signs: ['vomiting', 'diarrhoea', 'restlessness', 'tachycardia', 'tremors'],
          onset_hours: {
            min: 6,
            max: 12,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
      },
      sources: [
        {
          label: 'Merck Veterinary Manual — Chocolate Toxicosis in Animals',
          url: 'https://www.merckvetmanual.com/toxicology/food-hazards/chocolate-toxicosis-in-animals',
        },
        {
          label:
            'Kovalkovičová et al., "Some food toxic for pets", Interdisciplinary Toxicology (2009)',
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2984110/',
        },
      ],
    },
    chocolate_dark: {
      id: 'chocolate_dark',
      displayName: 'Chocolate negro',
      species: {
        dog: {
          verdict: 'toxic',
          severity: 'moderate',
          headline: 'Tóxico para perros. Llama a tu veterinario.',
          summary:
            'El chocolate negro es rico en teobromina, un estimulante que los perros eliminan mucho más despacio que las personas. Incluso una cantidad moderada de chocolate negro o de repostería puede causar vómitos, taquicardia, temblores o convulsiones.',
          signs: [
            'vomiting',
            'diarrhoea',
            'restlessness',
            'tachycardia',
            'tremors',
            'seizures',
            'hyperthermia',
          ],
          onset_hours: {
            min: 6,
            max: 12,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
        cat: {
          verdict: 'toxic',
          severity: 'moderate',
          headline: 'Tóxico para gatos. Llama a tu veterinario.',
          summary:
            'Los gatos rara vez comen chocolate por voluntad propia, pero si lo hacen, la misma teobromina que afecta a los perros también les afecta a ellos, y son al menos igual de sensibles.',
          signs: [
            'vomiting',
            'diarrhoea',
            'restlessness',
            'tachycardia',
            'tremors',
            'seizures',
            'hyperthermia',
          ],
          onset_hours: {
            min: 6,
            max: 12,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
      },
      sources: [
        {
          label: 'Merck Veterinary Manual — Chocolate Toxicosis in Animals',
          url: 'https://www.merckvetmanual.com/toxicology/food-hazards/chocolate-toxicosis-in-animals',
        },
        {
          label:
            'Kovalkovičová et al., "Some food toxic for pets", Interdisciplinary Toxicology (2009)',
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2984110/',
        },
      ],
    },
    grapes_raisins: {
      id: 'grapes_raisins',
      displayName: 'Uvas y pasas',
      species: {
        dog: {
          verdict: 'toxic',
          severity: 'severe',
          headline: 'Tóxico para perros. Llama a tu veterinario.',
          summary:
            'Las uvas, las pasas y las grosellas de Corinto pueden provocar un fallo renal repentino en perros. No se conoce ninguna cantidad que sea claramente segura, y algunos perros se ven afectados con cantidades muy pequeñas mientras que otros toleran más, sin forma de saberlo de antemano.',
          signs: [
            'vomiting',
            'diarrhoea',
            'lethargy',
            'abdominal_pain',
            'increased_thirst',
            'increased_urination',
            'kidney_failure_signs',
          ],
          onset_hours: {
            min: 6,
            max: 24,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
        cat: {
          verdict: 'toxic',
          severity: 'severe',
          headline: 'Tóxico para gatos. Llama a tu veterinario.',
          summary:
            'Los gatos comen uvas y pasas con mucha menos frecuencia que los perros, por lo que hay menos casos documentados, pero se asume el mismo riesgo de fallo renal y se trata de la misma manera.',
          signs: [
            'vomiting',
            'diarrhoea',
            'lethargy',
            'abdominal_pain',
            'increased_thirst',
            'increased_urination',
            'kidney_failure_signs',
          ],
          onset_hours: {
            min: 6,
            max: 24,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
      },
      sources: [
        {
          label: 'Merck Veterinary Manual — Grape, Raisin, and Tamarind Toxicosis in Dogs',
          url: 'https://www.merckvetmanual.com/toxicology/food-hazards/grape-raisin-and-tamarind-vitis-spp-tamarindus-spp-toxicosis-in-dogs',
        },
        {
          label:
            'Kovalkovičová et al., "Some food toxic for pets", Interdisciplinary Toxicology (2009)',
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2984110/',
        },
      ],
    },
    lily: {
      id: 'lily',
      displayName: 'Lirio',
      species: {
        dog: {
          verdict: 'caution',
          severity: null,
          headline: 'Mejor mantenerlo alejado de los perros.',
          summary:
            'En los perros, los lirios provocan molestias digestivas más leves que en los gatos — no se sabe que los perros desarrollen el fallo renal grave que sufren los gatos —, pero conviene mantener estas plantas fuera de su alcance y llamar al veterinario si un perro come una cantidad grande.',
          signs: ['vomiting', 'diarrhoea', 'hypersalivation'],
          onset_hours: {
            min: 0,
            max: 12,
          },
          emergency_actions: [],
        },
        cat: {
          verdict: 'toxic',
          severity: 'severe',
          headline: 'Tóxico para gatos. Llama ahora a tu veterinario.',
          summary:
            'Los lirios verdaderos (género Lilium) y las hemerocallis son gravemente tóxicos para los gatos — incluso un pequeño mordisco de hoja o pétalo, lamer el polen o beber el agua del jarrón pueden causar un fallo renal mortal. Es una de las plantas de interior más peligrosas para los gatos.',
          signs: [
            'lethargy',
            'hypersalivation',
            'vomiting',
            'loss_of_appetite',
            'increased_thirst',
            'increased_urination',
            'kidney_failure_signs',
          ],
          onset_hours: {
            min: 0,
            max: 12,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
      },
      sources: [
        {
          label:
            'Langston, "Acute renal failure caused by lily ingestion in six cats", J Am Vet Med Assoc (2002) — PubMed',
          url: 'https://pubmed.ncbi.nlm.nih.gov/12680447/',
        },
        {
          label: 'FDA — Lovely Lilies and Curious Cats: A Dangerous Combination',
          url: 'https://www.fda.gov/animal-veterinary/animal-health-literacy/lovely-lilies-and-curious-cats-dangerous-combination',
        },
      ],
    },
    macadamia_nuts: {
      id: 'macadamia_nuts',
      displayName: 'Nueces de macadamia',
      species: {
        dog: {
          verdict: 'toxic',
          severity: 'moderate',
          headline: 'Tóxico para perros. Llama a tu veterinario.',
          summary:
            'Las nueces de macadamia provocan en los perros un síndrome extraño pero normalmente pasajero — debilidad, sobre todo en las patas traseras, junto con temblores y fiebre. No se conoce la toxina exacta, pero los casos están bien documentados.',
          signs: ['weakness', 'ataxia', 'tremors', 'hyperthermia', 'lethargy', 'vomiting'],
          onset_hours: {
            min: 0,
            max: 12,
          },
          emergency_actions: ['call_vet_now', 'do_not_induce_vomiting', 'bring_packaging'],
        },
        cat: {
          verdict: 'unknown',
          severity: null,
          headline:
            'No estoy seguro — no hay casos descritos en gatos, pero consulta a tu veterinario.',
          summary:
            'La toxicosis por macadamia solo está documentada en perros; no hay buena evidencia sobre su efecto en gatos, así que cualquier ingestión real merece una llamada a tu veterinario en lugar de asumir que no pasa nada.',
          signs: [],
          onset_hours: null,
          emergency_actions: [],
        },
      },
      sources: [
        {
          label: 'Merck Veterinary Manual — Macadamia Nut Toxicosis in Dogs',
          url: 'https://www.merckvetmanual.com/toxicology/food-hazards/macadamia-nut-toxicosis-in-dogs',
        },
        {
          label:
            'Kovalkovičová et al., "Some food toxic for pets", Interdisciplinary Toxicology (2009)',
          url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2984110/',
        },
      ],
    },
  },
};

/** Entry ids present in the mock set, in the order the gallery lists them. */
export const MOCK_ENTRY_IDS = [
  'carrot',
  'cheese',
  'chocolate_milk',
  'chocolate_dark',
  'grapes_raisins',
  'lily',
  'macadamia_nuts',
] as const;
