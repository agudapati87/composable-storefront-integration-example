import { Entry, EntrySkeletonType } from 'contentful';

import { toCmsExperience, toCmsPersonalization } from './contentful-personalization.mapper';

type AnyEntry = Entry<EntrySkeletonType, undefined, string>;

const entry = (id: string, contentType: string, fields: Record<string, unknown>): AnyEntry =>
  ({ sys: { id, type: 'Entry', contentType: { sys: { id: contentType } } }, fields, metadata: { tags: [] } }) as unknown as AnyEntry;

const audience = entry('aud', 'nt_audience', { nt_audience_id: 'aud-id', nt_name: 'Northeast US' });

const experience = (fields: Record<string, unknown> = {}) =>
  entry('exp', 'nt_experience', {
    nt_name: 'Personalization example',
    nt_type: 'nt_personalization',
    nt_experience_id: 'exp-id',
    nt_audience: audience,
    nt_config: {
      traffic: 1,
      distribution: [0, 1],
      components: [{ type: 'EntryReplacement', baseline: { id: 'hero' }, variants: [{ id: 'variant', hidden: false }] }],
    },
    ...fields,
  });

describe('contentful-personalization.mapper', () => {
  describe('toCmsExperience', () => {
    it('should map an experience entry', () => {
      expect(toCmsExperience(experience(), 'hero')).toEqual({
        id: 'exp-id',
        type: 'nt_personalization',
        name: 'Personalization example',
        audienceId: 'aud-id',
        trafficAllocation: 1,
        distribution: [0, 1],
        sticky: false,
        components: [{ baselineId: 'hero', variants: [{ id: 'variant', hidden: false }] }],
      });
    });

    it('should keep only the components of the baseline', () => {
      const config = {
        traffic: 1,
        distribution: [0.5, 0.5],
        components: [
          { type: 'EntryReplacement', baseline: { id: 'other' }, variants: [{ id: 'x' }] },
          { type: 'EntryReplacement', baseline: { id: 'hero' }, variants: [{ id: 'v' }, { id: 'hidden', hidden: true }, { nope: 1 }] },
          { type: 'InlineVariable', key: 'k' },
        ],
      };
      expect(toCmsExperience(experience({ nt_config: config }), 'hero')?.components).toEqual([
        { baselineId: 'hero', variants: [{ id: 'v', hidden: false }, { id: 'hidden', hidden: true }] },
      ]);
    });

    it('should skip an experience whose audience link is not resolved', () => {
      // Without the audience, Ninetailed would show the variant to every visitor.
      const unresolved = { sys: { type: 'Link', linkType: 'Entry', id: 'aud' } };
      expect(toCmsExperience(experience({ nt_audience: unresolved }), 'hero')).toBeUndefined();
    });

    it('should accept an experience without audience (all visitors)', () => {
      expect(toCmsExperience(experience({ nt_audience: undefined }), 'hero')?.audienceId).toBeUndefined();
    });

    it('should reject invalid entries', () => {
      expect(toCmsExperience(experience({ nt_type: 'other' }), 'hero')).toBeUndefined();
      expect(toCmsExperience(experience({ nt_config: { traffic: 2, distribution: [1], components: [] } }), 'hero')).toBeUndefined();
      expect(toCmsExperience(experience({ nt_config: { traffic: 1, distribution: [], components: [] } }), 'hero')).toBeUndefined();
      expect(toCmsExperience(experience(), 'not-the-baseline')).toBeUndefined();
      expect(toCmsExperience(entry('x', 'vwrHeroBanner', {}), 'hero')).toBeUndefined();
      expect(toCmsExperience({ sys: { type: 'Link', id: 'exp' } }, 'hero')).toBeUndefined();
    });
  });

  describe('toCmsPersonalization', () => {
    const mapVariant = (variant: AnyEntry) => ({ headline: (variant.fields as Record<string, unknown>)['headline'] });

    it('should map the experiences and the resolved variants of a baseline', () => {
      const variant = entry('variant', 'vwrHeroBanner', { headline: 'For you' });
      const unrelated = entry('unrelated', 'vwrHeroBanner', { headline: 'Other' });
      const hero = entry('hero', 'vwrHeroBanner', { nt_experiences: [experience({ nt_variants: [variant, unrelated] })] });

      const result = toCmsPersonalization(hero, mapVariant);

      expect(result?.baselineId).toBe('hero');
      expect(result?.experiences.map((e) => e.id)).toEqual(['exp-id']);
      expect(result?.variants).toEqual({ variant: { headline: 'For you' } });
    });

    it('should leave variants that nt_variants does not resolve to be fetched by id', () => {
      const hero = entry('hero', 'vwrHeroBanner', { nt_experiences: [experience()] });
      expect(toCmsPersonalization(hero, mapVariant)?.variants).toEqual({});
    });

    it('should be undefined without valid experiences', () => {
      expect(toCmsPersonalization(entry('hero', 'vwrHeroBanner', {}), mapVariant)).toBeUndefined();
      expect(toCmsPersonalization(entry('hero', 'vwrHeroBanner', { nt_experiences: [{ sys: { type: 'Link', id: 'exp' } }] }), mapVariant)).toBeUndefined();
    });
  });
});
