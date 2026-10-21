BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[ContentPurchase] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [contentId] NVARCHAR(1000) NOT NULL,
    [priceCoins] INT NOT NULL,
    [purchasedAt] DATETIME2 NOT NULL CONSTRAINT [ContentPurchase_purchasedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ContentPurchase_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ContentPurchase_userId_contentId_key] UNIQUE NONCLUSTERED ([userId], [contentId])
);

CREATE NONCLUSTERED INDEX [ContentPurchase_contentId_purchasedAt_idx]
    ON [dbo].[ContentPurchase]([contentId], [purchasedAt]);

ALTER TABLE [dbo].[ContentPurchase]
    ADD CONSTRAINT [ContentPurchase_userId_fkey]
    FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[ContentPurchase]
    ADD CONSTRAINT [ContentPurchase_contentId_fkey]
    FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
    ROLLBACK TRAN;
THROW;

END CATCH;
