BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Content] (
    [id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [synopsis] NVARCHAR(max),
    [type] NVARCHAR(1000) NOT NULL,
    [ownershipTier] NVARCHAR(1000) NOT NULL,
    [publicationStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [Content_publicationStatus_df] DEFAULT 'Draft',
    [storyStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [Content_storyStatus_df] DEFAULT 'Ongoing',
    [coverImageUrl] NVARCHAR(1000),
    [uploaderId] NVARCHAR(1000) NOT NULL,
    [publisherId] NVARCHAR(1000),
    [parentContentId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Content_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Content_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[MangaDetail] (
    [id] NVARCHAR(1000) NOT NULL,
    [contentId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [MangaDetail_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [MangaDetail_contentId_key] UNIQUE NONCLUSTERED ([contentId])
);

-- CreateTable
CREATE TABLE [dbo].[NovelDetail] (
    [id] NVARCHAR(1000) NOT NULL,
    [contentId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [NovelDetail_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NovelDetail_contentId_key] UNIQUE NONCLUSTERED ([contentId])
);

-- CreateTable
CREATE TABLE [dbo].[Chapter] (
    [id] NVARCHAR(1000) NOT NULL,
    [contentId] NVARCHAR(1000) NOT NULL,
    [number] INT NOT NULL,
    [title] NVARCHAR(1000),
    [moderationStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [Chapter_moderationStatus_df] DEFAULT 'Published',
    [publishedAt] DATETIME2,
    CONSTRAINT [Chapter_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Chapter_contentId_number_key] UNIQUE NONCLUSTERED ([contentId],[number])
);

-- CreateTable
CREATE TABLE [dbo].[ChapterPage] (
    [id] NVARCHAR(1000) NOT NULL,
    [chapterId] NVARCHAR(1000) NOT NULL,
    [pageNumber] INT NOT NULL,
    [imageUrl] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [ChapterPage_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ChapterPage_chapterId_pageNumber_key] UNIQUE NONCLUSTERED ([chapterId],[pageNumber])
);

-- CreateTable
CREATE TABLE [dbo].[ChapterContent] (
    [id] NVARCHAR(1000) NOT NULL,
    [chapterId] NVARCHAR(1000) NOT NULL,
    [textBody] NVARCHAR(max) NOT NULL,
    CONSTRAINT [ChapterContent_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ChapterContent_chapterId_key] UNIQUE NONCLUSTERED ([chapterId])
);

-- CreateTable
CREATE TABLE [dbo].[Genre] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Genre_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Genre_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[Tag] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Tag_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Tag_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[ContentGenre] (
    [contentId] NVARCHAR(1000) NOT NULL,
    [genreId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [ContentGenre_pkey] PRIMARY KEY CLUSTERED ([contentId],[genreId])
);

-- CreateTable
CREATE TABLE [dbo].[ContentTag] (
    [contentId] NVARCHAR(1000) NOT NULL,
    [tagId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [ContentTag_pkey] PRIMARY KEY CLUSTERED ([contentId],[tagId])
);

-- CreateTable
CREATE TABLE [dbo].[Publisher] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [organizationName] NVARCHAR(1000) NOT NULL,
    [verificationStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [Publisher_verificationStatus_df] DEFAULT 'Pending',
    CONSTRAINT [Publisher_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Publisher_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [username] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'Reader',
    [bio] NVARCHAR(1000),
    [isLocked] BIT NOT NULL CONSTRAINT [User_isLocked_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_username_key] UNIQUE NONCLUSTERED ([username]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Bookmark] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [contentId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Bookmark_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Bookmark_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Bookmark_userId_contentId_key] UNIQUE NONCLUSTERED ([userId],[contentId])
);

-- CreateTable
CREATE TABLE [dbo].[Favorite] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [contentId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Favorite_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Favorite_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Favorite_userId_contentId_key] UNIQUE NONCLUSTERED ([userId],[contentId])
);

-- CreateTable
CREATE TABLE [dbo].[Rating] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [contentId] NVARCHAR(1000) NOT NULL,
    [score] INT NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Rating_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Rating_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Rating_userId_contentId_key] UNIQUE NONCLUSTERED ([userId],[contentId])
);

-- CreateTable
CREATE TABLE [dbo].[Comment] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [contentId] NVARCHAR(1000) NOT NULL,
    [parentCommentId] NVARCHAR(1000),
    [body] NVARCHAR(max) NOT NULL,
    [moderationStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [Comment_moderationStatus_df] DEFAULT 'Published',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Comment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Comment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ReadingProgress] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [contentId] NVARCHAR(1000) NOT NULL,
    [lastChapterId] NVARCHAR(1000) NOT NULL,
    [lastReadAt] DATETIME2 NOT NULL CONSTRAINT [ReadingProgress_lastReadAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ReadingProgress_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ReadingProgress_userId_contentId_key] UNIQUE NONCLUSTERED ([userId],[contentId])
);

-- CreateTable
CREATE TABLE [dbo].[Notification] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(1000) NOT NULL,
    [isRead] BIT NOT NULL CONSTRAINT [Notification_isRead_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Notification_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Notification_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Report] (
    [id] NVARCHAR(1000) NOT NULL,
    [reporterId] NVARCHAR(1000) NOT NULL,
    [targetType] NVARCHAR(1000) NOT NULL,
    [targetId] NVARCHAR(1000) NOT NULL,
    [reason] NVARCHAR(1000) NOT NULL,
    [evidence] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [Report_status_df] DEFAULT 'Pending',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Report_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Report_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RefreshToken] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [tokenHash] NVARCHAR(1000) NOT NULL,
    [isRevoked] BIT NOT NULL CONSTRAINT [RefreshToken_isRevoked_df] DEFAULT 0,
    [expiresAt] DATETIME2 NOT NULL,
    CONSTRAINT [RefreshToken_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RefreshToken_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateTable
CREATE TABLE [dbo].[ContentKnowledgeBase] (
    [id] NVARCHAR(1000) NOT NULL,
    [contentId] NVARCHAR(1000) NOT NULL,
    [summaryText] NVARCHAR(max) NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ContentKnowledgeBase_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ContentKnowledgeBase_contentId_key] UNIQUE NONCLUSTERED ([contentId])
);

-- CreateTable
CREATE TABLE [dbo].[AIConversation] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [contentId] NVARCHAR(1000) NOT NULL,
    [messages] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AIConversation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AIConversation_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RecommendationCache] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [contentId] NVARCHAR(1000) NOT NULL,
    [score] FLOAT(53) NOT NULL,
    [generatedAt] DATETIME2 NOT NULL CONSTRAINT [RecommendationCache_generatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RecommendationCache_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RecommendationCache_userId_contentId_key] UNIQUE NONCLUSTERED ([userId],[contentId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Content_type_publicationStatus_idx] ON [dbo].[Content]([type], [publicationStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Content_ownershipTier_idx] ON [dbo].[Content]([ownershipTier]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Content_parentContentId_idx] ON [dbo].[Content]([parentContentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Chapter_moderationStatus_idx] ON [dbo].[Chapter]([moderationStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Comment_contentId_idx] ON [dbo].[Comment]([contentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Comment_moderationStatus_idx] ON [dbo].[Comment]([moderationStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Notification_userId_isRead_idx] ON [dbo].[Notification]([userId], [isRead]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Report_targetType_targetId_idx] ON [dbo].[Report]([targetType], [targetId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Report_status_idx] ON [dbo].[Report]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshToken_userId_idx] ON [dbo].[RefreshToken]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AIConversation_userId_contentId_idx] ON [dbo].[AIConversation]([userId], [contentId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RecommendationCache_userId_score_idx] ON [dbo].[RecommendationCache]([userId], [score]);

-- AddForeignKey
ALTER TABLE [dbo].[Content] ADD CONSTRAINT [Content_uploaderId_fkey] FOREIGN KEY ([uploaderId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Content] ADD CONSTRAINT [Content_publisherId_fkey] FOREIGN KEY ([publisherId]) REFERENCES [dbo].[Publisher]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Content] ADD CONSTRAINT [Content_parentContentId_fkey] FOREIGN KEY ([parentContentId]) REFERENCES [dbo].[Content]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[MangaDetail] ADD CONSTRAINT [MangaDetail_contentId_fkey] FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[NovelDetail] ADD CONSTRAINT [NovelDetail_contentId_fkey] FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Chapter] ADD CONSTRAINT [Chapter_contentId_fkey] FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ChapterPage] ADD CONSTRAINT [ChapterPage_chapterId_fkey] FOREIGN KEY ([chapterId]) REFERENCES [dbo].[Chapter]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ChapterContent] ADD CONSTRAINT [ChapterContent_chapterId_fkey] FOREIGN KEY ([chapterId]) REFERENCES [dbo].[Chapter]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContentGenre] ADD CONSTRAINT [ContentGenre_contentId_fkey] FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContentGenre] ADD CONSTRAINT [ContentGenre_genreId_fkey] FOREIGN KEY ([genreId]) REFERENCES [dbo].[Genre]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContentTag] ADD CONSTRAINT [ContentTag_contentId_fkey] FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContentTag] ADD CONSTRAINT [ContentTag_tagId_fkey] FOREIGN KEY ([tagId]) REFERENCES [dbo].[Tag]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Publisher] ADD CONSTRAINT [Publisher_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Bookmark] ADD CONSTRAINT [Bookmark_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Bookmark] ADD CONSTRAINT [Bookmark_contentId_fkey] FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Favorite] ADD CONSTRAINT [Favorite_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Favorite] ADD CONSTRAINT [Favorite_contentId_fkey] FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Rating] ADD CONSTRAINT [Rating_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Rating] ADD CONSTRAINT [Rating_contentId_fkey] FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Comment] ADD CONSTRAINT [Comment_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Comment] ADD CONSTRAINT [Comment_contentId_fkey] FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Comment] ADD CONSTRAINT [Comment_parentCommentId_fkey] FOREIGN KEY ([parentCommentId]) REFERENCES [dbo].[Comment]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReadingProgress] ADD CONSTRAINT [ReadingProgress_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReadingProgress] ADD CONSTRAINT [ReadingProgress_contentId_fkey] FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ReadingProgress] ADD CONSTRAINT [ReadingProgress_lastChapterId_fkey] FOREIGN KEY ([lastChapterId]) REFERENCES [dbo].[Chapter]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Report] ADD CONSTRAINT [Report_reporterId_fkey] FOREIGN KEY ([reporterId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RefreshToken] ADD CONSTRAINT [RefreshToken_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ContentKnowledgeBase] ADD CONSTRAINT [ContentKnowledgeBase_contentId_fkey] FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AIConversation] ADD CONSTRAINT [AIConversation_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AIConversation] ADD CONSTRAINT [AIConversation_contentId_fkey] FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationCache] ADD CONSTRAINT [RecommendationCache_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RecommendationCache] ADD CONSTRAINT [RecommendationCache_contentId_fkey] FOREIGN KEY ([contentId]) REFERENCES [dbo].[Content]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
