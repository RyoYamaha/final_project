BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[Wallet] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [balance] INT NOT NULL CONSTRAINT [Wallet_balance_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Wallet_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Wallet_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Wallet_userId_key] UNIQUE NONCLUSTERED ([userId]),
    CONSTRAINT [Wallet_balance_nonnegative] CHECK ([balance] >= 0)
);

CREATE TABLE [dbo].[PaymentOrder] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [expectedAmount] INT NOT NULL,
    [paidAmount] INT,
    [paidCoins] INT,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [PaymentOrder_status_df] DEFAULT 'Pending',
    [transferCode] VARCHAR(32) NOT NULL,
    [bankBin] VARCHAR(20) NOT NULL,
    [bankName] NVARCHAR(1000) NOT NULL,
    [bankAccountNumber] VARCHAR(30) NOT NULL,
    [bankAccountName] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [paidAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [PaymentOrder_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PaymentOrder_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [PaymentOrder_transferCode_key] UNIQUE NONCLUSTERED ([transferCode])
);

CREATE TABLE [dbo].[BankTransaction] (
    [id] NVARCHAR(1000) NOT NULL,
    [externalId] VARCHAR(100) NOT NULL,
    [paymentOrderId] NVARCHAR(1000),
    [transferType] VARCHAR(10) NOT NULL,
    [transferAmount] INT NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [rawPayload] NVARCHAR(max) NOT NULL,
    [processingStatus] VARCHAR(32) NOT NULL,
    [receivedAt] DATETIME2 NOT NULL CONSTRAINT [BankTransaction_receivedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [BankTransaction_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [BankTransaction_externalId_key] UNIQUE NONCLUSTERED ([externalId])
);

CREATE TABLE [dbo].[WalletLedger] (
    [id] NVARCHAR(1000) NOT NULL,
    [walletId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [amountCoins] INT NOT NULL,
    [balanceAfter] INT NOT NULL,
    [transactionType] VARCHAR(32) NOT NULL,
    [sourceType] VARCHAR(32) NOT NULL,
    [sourceReference] VARCHAR(100) NOT NULL,
    [description] NVARCHAR(500) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [WalletLedger_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [WalletLedger_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [WalletLedger_sourceType_sourceReference_key] UNIQUE NONCLUSTERED ([sourceType], [sourceReference])
);

CREATE TABLE [dbo].[SystemSetting] (
    [key] VARCHAR(100) NOT NULL,
    [value] NVARCHAR(1000) NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SystemSetting_pkey] PRIMARY KEY CLUSTERED ([key])
);

CREATE NONCLUSTERED INDEX [PaymentOrder_userId_createdAt_idx]
    ON [dbo].[PaymentOrder]([userId], [createdAt]);
CREATE NONCLUSTERED INDEX [PaymentOrder_status_expiresAt_idx]
    ON [dbo].[PaymentOrder]([status], [expiresAt]);
CREATE NONCLUSTERED INDEX [BankTransaction_paymentOrderId_idx]
    ON [dbo].[BankTransaction]([paymentOrderId]);
CREATE NONCLUSTERED INDEX [WalletLedger_userId_createdAt_idx]
    ON [dbo].[WalletLedger]([userId], [createdAt]);

ALTER TABLE [dbo].[Wallet]
    ADD CONSTRAINT [Wallet_userId_fkey]
    FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[PaymentOrder]
    ADD CONSTRAINT [PaymentOrder_userId_fkey]
    FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[BankTransaction]
    ADD CONSTRAINT [BankTransaction_paymentOrderId_fkey]
    FOREIGN KEY ([paymentOrderId]) REFERENCES [dbo].[PaymentOrder]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[WalletLedger]
    ADD CONSTRAINT [WalletLedger_walletId_fkey]
    FOREIGN KEY ([walletId]) REFERENCES [dbo].[Wallet]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE [dbo].[WalletLedger]
    ADD CONSTRAINT [WalletLedger_userId_fkey]
    FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
    ROLLBACK TRAN;
THROW;

END CATCH;
