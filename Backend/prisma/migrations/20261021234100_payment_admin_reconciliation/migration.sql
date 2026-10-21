BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[BankTransaction]
    ADD [destinationAccountNumber] VARCHAR(30) NULL,
        [processedById] NVARCHAR(1000) NULL,
        [adminNote] NVARCHAR(500) NULL;

ALTER TABLE [dbo].[BankTransaction]
    ADD CONSTRAINT [BankTransaction_processedById_fkey]
        FOREIGN KEY ([processedById]) REFERENCES [dbo].[User]([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE NONCLUSTERED INDEX [BankTransaction_processingStatus_receivedAt_idx]
    ON [dbo].[BankTransaction]([processingStatus], [receivedAt]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
    ROLLBACK TRAN;
THROW;

END CATCH;
