import { Entry, EntrySkeletonType } from 'contentful';

import { isEntry } from '../../contentful/core/type-guards';
import { CmsExperience, CmsExperienceComponent, CmsPersonalization } from './personalization.model';

type AnyEntry = Entry<EntrySkeletonType, undefined, string>;

const fieldsOf = (entry: AnyEntry): Record<string, unknown> => (entry.fields ?? {}) as Record<string, unknown>;
const contentTypeOf = (entry: AnyEntry): string | undefined => entry.sys.contentType?.sys?.id;
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const isShare = (value: unknown): value is number => typeof value === 'number' && value >= 0 && value <= 1;
const nonEmptyString = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value : undefined);

function toComponent(value: unknown): CmsExperienceComponent | undefined {
  if (!isRecord(value) || value['type'] !== 'EntryReplacement' || !isRecord(value['baseline'])) return undefined;
  const baselineId = nonEmptyString(value['baseline']['id']);
  if (!baselineId || !Array.isArray(value['variants'])) return undefined;
  const variants = value['variants'].filter(isRecord).flatMap((variant) => {
    const id = nonEmptyString(variant['id']);
    return id ? [{ id, hidden: variant['hidden'] === true }] : [];
  });
  return { baselineId, variants };
}

/**
 * An experience entry (nt_experience) as CmsExperience, limited to the components of the baseline.
 * Undefined when the entry is invalid, or when its audience is linked but not resolved (e.g. not
 * published): without an audience, Ninetailed would show the variants to every visitor.
 */
export function toCmsExperience(entry: unknown, baselineId: string): CmsExperience | undefined {
  if (!isEntry(entry) || contentTypeOf(entry) !== 'nt_experience') return undefined;
  const fields = fieldsOf(entry);
  const type = fields['nt_type'];
  const config = fields['nt_config'];
  if ((type !== 'nt_personalization' && type !== 'nt_experiment') || !isRecord(config)) return undefined;

  const { traffic, distribution } = config;
  if (!isShare(traffic) || !Array.isArray(distribution) || !distribution.length || !distribution.every(isShare)) return undefined;

  const components = (Array.isArray(config['components']) ? config['components'] : [])
    .map(toComponent)
    .filter((component): component is CmsExperienceComponent => component?.baselineId === baselineId);
  if (!components.length) return undefined;

  let audienceId: string | undefined;
  const audience = fields['nt_audience'];
  if (audience) {
    if (!isEntry(audience)) return undefined;
    audienceId = nonEmptyString(fieldsOf(audience)['nt_audience_id']) ?? audience.sys.id;
  }

  return {
    id: nonEmptyString(fields['nt_experience_id']) ?? entry.sys.id,
    type,
    name: nonEmptyString(fields['nt_name']),
    audienceId,
    trafficAllocation: traffic,
    distribution: [...distribution],
    sticky: config['sticky'] === true,
    components,
  };
}

/**
 * Personalization of a baseline entry from its resolved `nt_experiences` field. Variant entries the
 * Delivery API resolved (experience field `nt_variants`) are mapped with mapVariant; variants that
 * are only named in the experience config are fetched by id when selected. Undefined when the entry
 * takes part in no valid experience.
 */
export function toCmsPersonalization<TEntry extends AnyEntry, TVariant>(baseline: TEntry, mapVariant: (entry: TEntry) => TVariant): CmsPersonalization<TVariant> | undefined {
  const linked = fieldsOf(baseline)['nt_experiences'];
  if (!Array.isArray(linked)) return undefined;

  const experiences: CmsExperience[] = [];
  const variants: Record<string, TVariant> = {};
  for (const experienceEntry of linked) {
    const experience = toCmsExperience(experienceEntry, baseline.sys.id);
    if (!experience || !isEntry(experienceEntry)) continue;
    experiences.push(experience);
    const variantIds = new Set(experience.components.flatMap((component) => component.variants.map((variant) => variant.id)));
    const resolved = fieldsOf(experienceEntry)['nt_variants'];
    for (const variant of Array.isArray(resolved) ? resolved : []) {
      if (isEntry(variant) && variantIds.has(variant.sys.id)) {
        variants[variant.sys.id] = mapVariant(variant as TEntry);
      }
    }
  }
  return experiences.length ? { baselineId: baseline.sys.id, experiences, variants } : undefined;
}
