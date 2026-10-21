BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[User]
    ADD [payoutBlocked] BIT NOT NULL
        CONSTRAINT [User_payoutBlocked_df] DEFAULT 0;

CREATE TABLE [dbo].[CreatorRevenue] (
    [id] NVARCHAR(1000) NOT NULL,
    [creatorId] NVARCHAR(1000) NOT NULL,
    [purchaseId] NVARCHAR(1000) NOT NULL,
    [contentId] NVARCHAR(1000) NOT NULL,
    [grossCoins] INT NOT NULL,
    [sharePercent] INT NOT NULL,
    [creatorCoins] INT NOT NULL,
    [platformCoins] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [CreatorRevenue_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [CreatorRevenue_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CreatorRevenue_purchaseId_key] UNIQUE NONCLUSTERED ([purchaseId]),
    CONSTRAINT [CreatorRevenue_amounts_check]
        CHECK (
            [grossCoins] > 0
            AND [sharePercent] IN (60, 80)
            AND [creatorCoins] >= 0
            AND [platformCoins] >= 0
            AND [creatorCoins] + [platformCoins] = [grossCoins]
        )
);

CREATE NONCLUSTERED INDEX [CreatorRevenue_creatorId_createdAt_idx]
    ON [dbo].[CreatorRevenue]([creatorId], [createdAt]);

ALTER TABLE [dbo].[CreatorRevenue]
    ADD CONSTRAINT [CreatorRevenue_creatorId_fkey]
        FOREIGN KEY ([creatorId]) REFERENCES [dbo].[User]([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [CreatorRevenue_purchaseId_fkey]
        FOREIGN KEY ([purchaseId]) REFERENCES [dbo].[ContentPurchase]([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [CreatorRevenue_contentId_fkey]
        FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE [dbo].[PayoutProfile] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [bankName] NVARCHAR(100) NOT NULL,
    [bankBin] VARCHAR(20) NOT NULL,
    [bankAccountNumber] VARCHAR(30) NOT NULL,
    [bankAccountName] NVARCHAR(100) NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [PayoutProfile_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PayoutProfile_userId_key] UNIQUE NONCLUSTERED ([userId])
);

ALTER TABLE [dbo].[PayoutProfile]
    ADD CONSTRAINT [PayoutProfile_userId_fkey]
        FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE TABLE [dbo].[PayoutRequest] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [amountCoins] INT NOT NULL,
    [status] VARCHAR(20) NOT NULL CONSTRAINT [PayoutRequest_status_df] DEFAULT 'Pending',
    [bankName] NVARCHAR(100) NOT NULL,
    [bankBin] VARCHAR(20) NOT NULL,
    [bankAccountNumber] VARCHAR(30) NOT NULL,
    [bankAccountName] NVARCHAR(100) NOT NULL,
    [requestedAt] DATETIME2 NOT NULL CONSTRAINT [PayoutRequest_requestedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [processedAt] DATETIME2,
    [processedById] NVARCHAR(1000),
    [rejectionReason] NVARCHAR(500),
    CONSTRAINT [PayoutRequest_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PayoutRequest_amount_check] CHECK ([amountCoins] > 0),
    CONSTRAINT [PayoutRequest_status_check] CHECK ([status] IN ('Pending', 'Paid', 'Rejected'))
);

CREATE NONCLUSTERED INDEX [PayoutRequest_userId_requestedAt_idx]
    ON [dbo].[PayoutRequest]([userId], [requestedAt]);
CREATE NONCLUSTERED INDEX [PayoutRequest_status_requestedAt_idx]
    ON [dbo].[PayoutRequest]([status], [requestedAt]);

ALTER TABLE [dbo].[PayoutRequest]
    ADD CONSTRAINT [PayoutRequest_userId_fkey]
        FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [PayoutRequest_processedById_fkey]
        FOREIGN KEY ([processedById]) REFERENCES [dbo].[User]([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION;

IF NOT EXISTS (
    SELECT 1 FROM [dbo].[SystemSetting] WHERE [key] = 'payout.minimumCoins'
)
BEGIN
    INSERT INTO [dbo].[SystemSetting] ([key], [value], [updatedAt])
    VALUES ('payout.minimumCoins', '10', CURRENT_TIMESTAMP);
END;

IF NOT EXISTS (
    SELECT 1 FROM [dbo].[SystemSetting] WHERE [key] = 'payout.holdDays'
)
BEGIN
    INSERT INTO [dbo].[SystemSetting] ([key], [value], [updatedAt])
    VALUES ('payout.holdDays', '0', CURRENT_TIMESTAMP);
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
    ROLLBACK TRAN;
THROW;

END CATCH;
