BEGIN TRY

BEGIN TRAN;

IF COL_LENGTH('dbo.User', 'onboardingCompletedAt') IS NULL
BEGIN
    ALTER TABLE [dbo].[User] ADD [onboardingCompletedAt] DATETIME2 NULL;
END;

IF OBJECT_ID(N'dbo.UserGenrePreference', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[UserGenrePreference] (
        [userId] NVARCHAR(1000) NOT NULL,
        [genreId] NVARCHAR(1000) NOT NULL,
        CONSTRAINT [UserGenrePreference_pkey] PRIMARY KEY CLUSTERED ([userId], [genreId])
    );

    ALTER TABLE [dbo].[UserGenrePreference]
        ADD CONSTRAINT [UserGenrePreference_userId_fkey]
            FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id])
            ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT [UserGenrePreference_genreId_fkey]
            FOREIGN KEY ([genreId]) REFERENCES [dbo].[Genre]([id])
            ON DELETE NO ACTION ON UPDATE NO ACTION;

    CREATE NONCLUSTERED INDEX [UserGenrePreference_genreId_idx]
        ON [dbo].[UserGenrePreference]([genreId]);
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
    ROLLBACK TRAN;
THROW;

END CATCH;
