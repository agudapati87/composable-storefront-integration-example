// Contentful Personalization (Ninetailed) data as stored in Spartacus CMS component data. Plain,
// serializable objects (the CMS store holds them), mapped from the Contentful entries by
// contentful-personalization.mapper.ts. No @ninetailed import here: this file is in the main bundle.

/** An EntryReplacement component of an experience: the baseline entry and its variant entries. */
export interface CmsExperienceComponent {
  baselineId: string;
  /** In variant order (variant index 1, 2, ...). A hidden variant hides the component. */
  variants: { id: string; hidden: boolean }[];
}

/** An experience (content type nt_experience). */
export interface CmsExperience {
  /** nt_experience_id, the id Ninetailed knows the experience by. */
  id: string;
  type: 'nt_personalization' | 'nt_experiment';
  name?: string;
  /** nt_audience_id of the audience; no audience means every visitor. */
  audienceId?: string;
  /** Share of the audience in the experience (0..1). */
  trafficAllocation: number;
  /** Share of each variant (0..1), baseline first. */
  distribution: number[];
  sticky: boolean;
  components: CmsExperienceComponent[];
}

/** Personalization of a baseline entry. */
export interface CmsPersonalization<TVariant> {
  baselineId: string;
  experiences: CmsExperience[];
  /** CMS data of the variant entries the Delivery API resolved (nt_variants), by entry id. */
  variants: Record<string, TVariant>;
}
