BEGIN TRY

BEGIN TRAN;

IF COL_LENGTH('dbo.ReadingProgress', 'lastPageNumber') IS NULL
BEGIN
    ALTER TABLE [dbo].[ReadingProgress]
    ADD [lastPageNumber] INT NULL;
END;

IF OBJECT_ID(N'dbo.ChapterRead', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ChapterRead] (
        [id] NVARCHAR(1000) NOT NULL,
        [userId] NVARCHAR(1000) NOT NULL,
        [chapterId] NVARCHAR(1000) NOT NULL,
        [completedAt] DATETIME2 NOT NULL CONSTRAINT [ChapterRead_completedAt_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [ChapterRead_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [ChapterRead_userId_chapterId_key] UNIQUE NONCLUSTERED ([userId], [chapterId])
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE [name] = N'ChapterRead_userId_idx'
      AND [object_id] = OBJECT_ID(N'dbo.ChapterRead')
)
BEGIN
    CREATE NONCLUSTERED INDEX [ChapterRead_userId_idx] ON [dbo].[ChapterRead]([userId]);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE [name] = N'ChapterRead_userId_fkey'
      AND [parent_object_id] = OBJECT_ID(N'dbo.ChapterRead')
)
BEGIN
    ALTER TABLE [dbo].[ChapterRead]
    ADD CONSTRAINT [ChapterRead_userId_fkey]
    FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE [name] = N'ChapterRead_chapterId_fkey'
      AND [parent_object_id] = OBJECT_ID(N'dbo.ChapterRead')
)
BEGIN
    ALTER TABLE [dbo].[ChapterRead]
    ADD CONSTRAINT [ChapterRead_chapterId_fkey]
    FOREIGN KEY ([chapterId]) REFERENCES [dbo].[Chapter]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

INSERT INTO [dbo].[ChapterRead] ([id], [userId], [chapterId], [completedAt])
SELECT CONVERT(NVARCHAR(1000), NEWID()), [userId], [lastChapterId], [lastReadAt]
FROM [dbo].[ReadingProgress] AS progress
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[ChapterRead] AS chapterRead
    WHERE chapterRead.[userId] = progress.[userId]
      AND chapterRead.[chapterId] = progress.[lastChapterId]
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
    ROLLBACK TRAN;
THROW;

END CATCH;
