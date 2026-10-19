BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[Content]
    ADD [pricingType] VARCHAR(10) NOT NULL
        CONSTRAINT [Content_pricingType_df] DEFAULT 'free',
        [priceCoins] INT NOT NULL
        CONSTRAINT [Content_priceCoins_df] DEFAULT 0,
        [freeChapters] INT NOT NULL
        CONSTRAINT [Content_freeChapters_df] DEFAULT 3,
        [allowCommunityTranslation] BIT NOT NULL
        CONSTRAINT [Content_allowCommunityTranslation_df] DEFAULT 0,
        [pricingChangedAt] DATETIME2;

ALTER TABLE [dbo].[Content]
    ADD CONSTRAINT [Content_pricingType_check]
        CHECK ([pricingType] IN ('free', 'paid')),
    CONSTRAINT [Content_priceCoins_check]
        CHECK (
            ([pricingType] = 'free' AND [priceCoins] = 0)
            OR ([pricingType] = 'paid' AND [priceCoins] > 0)
        ),
    CONSTRAINT [Content_fanTranslation_price_check]
        CHECK (
            [ownershipTier] <> 'FanTranslation'
            OR ([pricingType] = 'free' AND [priceCoins] = 0)
        ),
    CONSTRAINT [Content_freeChapters_check]
        CHECK ([freeChapters] >= 0),
    CONSTRAINT [Content_communityTranslation_check]
        CHECK (
            [allowCommunityTranslation] = 0
            OR ([ownershipTier] = 'Licensed' AND [pricingType] = 'free')
        );

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
    ROLLBACK TRAN;
THROW;

END CATCH;
