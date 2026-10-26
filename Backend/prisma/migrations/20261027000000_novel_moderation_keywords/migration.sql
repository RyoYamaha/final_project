BEGIN TRY

BEGIN TRAN;

IF OBJECT_ID(N'dbo.NovelModerationKeyword', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[NovelModerationKeyword] (
        [id] NVARCHAR(1000) NOT NULL,
        [keyword] NVARCHAR(200) NOT NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [NovelModerationKeyword_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [NovelModerationKeyword_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [NovelModerationKeyword_keyword_key] UNIQUE NONCLUSTERED ([keyword])
    );
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
    ROLLBACK TRAN;
THROW;

END CATCH;
