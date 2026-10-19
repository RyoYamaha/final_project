import { ContentPricingType, OwnershipTier } from '../../common/constants/content.enum';

const COMMUNITY_TRANSLATION_GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

export function isCommunityTranslationVisible(content: {
  ownershipTier: string;
  parentContent?: {
    pricingType: string;
    pricingChangedAt: Date | null;
  } | null;
}, now = Date.now()): boolean {
  if (content.ownershipTier !== OwnershipTier.FanTranslation) return true;
  if (!content.parentContent) return false;
  if (content.parentContent.pricingType !== ContentPricingType.Paid) return true;

  return (
    content.parentContent.pricingChangedAt !== null &&
    content.parentContent.pricingChangedAt.getTime() >=
      now - COMMUNITY_TRANSLATION_GRACE_PERIOD_MS
  );
}
