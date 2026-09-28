import { type Hotline, HotlineSchema } from './schemas/hotline.js';

/**
 * The hotline registry, bundled with the app so the emergency path works offline (AGENTS.md #4).
 *
 * Every entry was taken from the service's own official page, recorded in `source`, on
 * 2026-09-28. None is verified yet: `verifiedAt` is set only after a person has dialled the number
 * and confirmed it reaches this service and takes calls about pets. Re-verify before every
 * release (docs/03, docs/05 §3).
 *
 * Regions with no entry are deliberate, not gaps to fill with a guess:
 * - **MX**: no single national poison line; the centres are per hospital.
 * - **AR**: the Centro Nacional de Intoxicaciones (0800-333-0160) is confirmed as 24 h and free,
 *   but its official page does not say it takes calls about animals.
 * Users there get their own vet and the "find an emergency vet" search, which every region gets.
 *
 * The two US lines are not offered outside the US: they are US toll-free numbers.
 */
const REGISTRY: Hotline[] = [
  {
    id: 'sit_intcf_es',
    name: 'Servicio de Información Toxicológica (INTCF)',
    phone: '+34915620420',
    display: '91 562 04 20',
    regions: ['ES'],
    languages: ['es'],
    cost: 'standard_rate',
    hours24: true,
    // The service's animal-poisoning page urges calling SIT for any toxic exposure of an animal.
    source:
      'https://www.mjusticia.gob.es/es/institucional/organismos/instituto-nacional/servicios/servicio-informacion/intoxicaciones-frecuentes/veterinarias',
    verifiedAt: null,
  },
  {
    id: 'animal_poisonline_gb',
    name: 'Animal PoisonLine',
    phone: '+441202509000',
    display: '01202 509000',
    regions: ['GB'],
    languages: ['en'],
    cost: 'fee',
    hours24: true,
    source: 'https://www.animalpoisonline.co.uk/',
    verifiedAt: null,
  },
  {
    id: 'aspca_apcc_us',
    name: 'ASPCA Animal Poison Control Center',
    phone: '+18884264435',
    display: '(888) 426-4435',
    regions: ['US'],
    languages: ['en'],
    cost: 'fee',
    hours24: true,
    source: 'https://www.aspca.org/pet-care/animal-poison-control',
    verifiedAt: null,
  },
  {
    id: 'pet_poison_helpline_us',
    name: 'Pet Poison Helpline',
    phone: '+18557647661',
    display: '(855) 764-7661',
    regions: ['US'],
    languages: ['en'],
    cost: 'fee',
    hours24: true,
    source: 'https://www.petpoisonhelpline.com/',
    verifiedAt: null,
  },
];

export const HOTLINES: readonly Hotline[] = REGISTRY.map((h) => HotlineSchema.parse(h));

/**
 * The lines for a region, in registry order. Unverified lines are left out unless
 * `includeUnverified` is set, which only a development build may do.
 */
export function hotlinesForRegion(
  region: string,
  options: { includeUnverified?: boolean } = {},
): Hotline[] {
  return HOTLINES.filter(
    (h) => h.regions.includes(region) && (options.includeUnverified || h.verifiedAt !== null),
  );
}
