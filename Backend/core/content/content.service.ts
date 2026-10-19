import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { QueryContentDto } from './dto/query-content.dto';
import { QueryCatalogSortDto } from './dto/query-catalog-sort.dto';
import { QueryRankingContentDto, type RankingCategory } from './dto/query-ranking-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentPricingType, OwnershipTier, PublicationStatus } from '../../common/constants/content.enum';
import { NotificationService } from '../../notification/notification.service';
import { NotificationType } from '../../common/constants/notification.enum';
import { isCommunityTranslationVisible } from './content-visibility';

@Injectable()
export class ContentService implements OnModuleInit {
  private static readonly POPULARITY_WINDOW_DAYS = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }
  //HÀM CHỌN TAG GENRE CỦA NGƯỜI DÙNG 
  //- nếu có sẵn data thì cập nhập thêm tag genre của người dùng , nếu không có thì tạo mới
  private async seedDefaults() {

    //BƯỚC 1: KHAI BÁO DANH SÁCH TRONG CODE
    const defaultTags = ['Magic', 'War', 'Adventure', 'School Life', 'Slice of Life', 'Comedy', 'Drama', 'Romance', 'Fantasy', 'Sci-Fi'];
    const defaultGenres = ['Action', 'Fantasy', 'Romance', 'Isekai', 'Horror', 'Mystery', 'Thriller', 'Historical'];

    //BƯỚC 2: ĐƯA DANH SÁCH VÀO DATABASE

    // Khởi tạo các Tag mặc định: nếu đã tồn tại thì giữ nguyên, nếu chưa có thì tạo mới.
    for (const name of defaultTags) {
      await this.prisma.tag.upsert({  
        where: { name },
        update: {},
        create: { name }
      });
    }
    // Khởi tạo các Genre mặc định: nếu đã tồn tại thì giữ nguyên, nếu chưa có thì tạo mới.
    for (const name of defaultGenres) {
      await this.prisma.genre.upsert({
        where: { name },
        update: {},
        create: { name }
      });
    }
    console.log('Default Genres and Tags seeded successfully from ContentService');
  }

  async createContent( contentData: CreateContentDto, uploaderId: string, ownershipTier: OwnershipTier, publisherId?: string, parentContentId?: string) {
    let parentContent: {
      ownershipTier: string;
      publicationStatus: string;
      pricingType: string;
      allowCommunityTranslation: boolean;
    } | null = null;

    if (ownershipTier === OwnershipTier.FanTranslation) {
      if (!parentContentId) {
        throw new ForbiddenException('Fan Translation phải chọn Content gốc (parentContentId)');
      }
      parentContent = await this.prisma.content.findUnique({
        where: { id: parentContentId },
        select: {
          ownershipTier: true,
          publicationStatus: true,
          pricingType: true,
          allowCommunityTranslation: true,
        },
      });
      if (!parentContent || parentContent.ownershipTier !== OwnershipTier.Licensed) {
        throw new ForbiddenException('Content gốc không hợp lệ hoặc không phải Licensed');
      }
      if (parentContent.publicationStatus !== PublicationStatus.Published) {
        throw new ForbiddenException('Content gốc chưa được duyệt, chưa thể dịch');
      }
      if (
        parentContent.pricingType !== ContentPricingType.Free ||
        !parentContent.allowCommunityTranslation
      ) {
        throw new ForbiddenException(
          'Publisher chưa cho phép dịch cộng đồng cho Content này',
        );
      }

      if (
        (contentData.pricingType !== undefined &&
          contentData.pricingType !== ContentPricingType.Free) ||
        (contentData.priceCoins !== undefined && contentData.priceCoins !== 0) ||
        contentData.allowCommunityTranslation === true
      ) {
        throw new BadRequestException(
          'Fan Translation phải miễn phí và không thể bật dịch cộng đồng',
        );
      }
    }

    if (ownershipTier === OwnershipTier.Original && parentContentId) {
      throw new ForbiddenException('Truyện sáng tác gốc không được gắn Content gốc (parentContentId)');
    }

    if (ownershipTier === OwnershipTier.Licensed) {
      if (!publisherId) {
        throw new ForbiddenException('Licensed Content phải thuộc Publisher đã xác minh');
      }
      const publisher = await this.prisma.publisher.findUnique({
        where: { id: publisherId },
        select: { userId: true, verificationStatus: true },
      });
      if (
        !publisher ||
        publisher.userId !== uploaderId ||
        publisher.verificationStatus !== 'Approved'
      ) {
        throw new ForbiddenException('Chỉ Publisher đã xác minh mới được tạo Licensed Content');
      }
    }

    const pricingType =
      ownershipTier === OwnershipTier.FanTranslation
        ? ContentPricingType.Free
        : contentData.pricingType ?? ContentPricingType.Free;
    const priceCoins =
      ownershipTier === OwnershipTier.FanTranslation ||
      pricingType === ContentPricingType.Free
        ? 0
        : contentData.priceCoins ?? 0;
    const freeChapters =
      ownershipTier === OwnershipTier.FanTranslation
        ? 0
        : contentData.freeChapters ?? 3;
    const allowCommunityTranslation =
      ownershipTier === OwnershipTier.Licensed &&
      (contentData.allowCommunityTranslation ?? false);

    if (
      contentData.allowCommunityTranslation === true &&
      ownershipTier !== OwnershipTier.Licensed
    ) {
      throw new BadRequestException(
        'Chỉ Licensed Content mới có thể bật dịch cộng đồng',
      );
    }

    this.validatePricing(pricingType, priceCoins, freeChapters);
    if (
      allowCommunityTranslation &&
      pricingType !== ContentPricingType.Free
    ) {
      throw new BadRequestException(
        'Chỉ có thể bật dịch cộng đồng khi Content đang miễn phí',
      );
    }

    //BƯỚC 2: 
    //vì mối quan hệ giữa 2 bảng content và tag / genre là nhiều nhiều
    //-> suy ra ta phải tạo bảng trung gian cho dễ truy vấn sau này, liên kết giữa 2 bảng tốt hơn 

    //BƯỚC 2.1: CHUẨN BỊ DỮ LIỆU MẪU CHO PRISMA LIÊN KẾT CONTENT VỚI GENRE VÀ TAG (từ tham số người dùng)
    // -> khi gọi prisma.content.create() tạo ra bản ghi tương ứng được gọi ở hàm create ở dưới

    //xét genre mặc định là undefinced
    let genresData: Prisma.ContentCreateInput['genres'] = undefined;

    //kiểm tra xem người dùng có chọn genre hay không 
    if (contentData.genreIds) { 
      genresData = { create: contentData.genreIds.map((genreName) => ({
          genre: {connect: { name: genreName }}, 
        })),
      };
    }
    //- create: chỉ dẫn cho prisma tạo bản ghi quan hệ 
    //- connect: chỉ dẫn cho prisma liên kết với genre đã tồn tại qua cái name genre người dùng gửi theo


    let tagsData: Prisma.ContentCreateInput['tags'] = undefined;
    if (contentData.tagIds) {
      tagsData = {
        create: contentData.tagIds.map((tagName) => ({
          tag: { connect: { name: tagName }},
        })),
      };
    }
    //BƯỚC 3: TẠO TRUYỆN TỪ NHỮNG THÔNG TIN NGƯỜI DÙNG GỬI LÊN
    return this.prisma.$transaction(
      async (transactionClient) => {
        if (ownershipTier === OwnershipTier.FanTranslation) {
          const currentParent = await transactionClient.content.findUnique({
            where: { id: parentContentId },
            select: {
              ownershipTier: true,
              publicationStatus: true,
              pricingType: true,
              allowCommunityTranslation: true,
            },
          });
          if (
            !currentParent ||
            currentParent.ownershipTier !== OwnershipTier.Licensed ||
            currentParent.publicationStatus !== PublicationStatus.Published ||
            currentParent.pricingType !== ContentPricingType.Free ||
            !currentParent.allowCommunityTranslation
          ) {
            throw new ForbiddenException(
              'Content gốc hiện không cho phép tạo Fan Translation',
            );
          }
        }

        if (ownershipTier === OwnershipTier.Licensed) {
          const currentPublisher = await transactionClient.publisher.findUnique({
            where: { id: publisherId },
            select: { userId: true, verificationStatus: true },
          });
          if (
            !currentPublisher ||
            currentPublisher.userId !== uploaderId ||
            currentPublisher.verificationStatus !== 'Approved'
          ) {
            throw new ForbiddenException(
              'Chỉ Publisher đã xác minh mới được tạo Licensed Content',
            );
          }
        }

        return transactionClient.content.create({
          data: {
            title: contentData.title,
            synopsis: contentData.synopsis,
            type: contentData.type,
            ownershipTier,
            publicationStatus: PublicationStatus.PendingApproval,
            coverImageUrl: contentData.coverImageUrl,
            pricingType,
            priceCoins,
            freeChapters,
            allowCommunityTranslation,
            uploaderId,
            publisherId,
            parentContentId,
            genres: genresData,
            tags: tagsData,
          },
          include: {
            genres: { include: { genre: true } },
            tags: { include: { tag: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  // Trả danh sách truyện đã xuất bản theo bộ lọc và phân trang.
  async findAll(contentQuery: QueryContentDto) {
    //BƯỚC 1: SAU KHI ĐƯỢC TRUYỀN DỮ LIỆU VÀO -> XÁC ĐỊNH BẢN GHI VÀ SỐ BẢN GHI 
    const pageNumber = contentQuery.page;
    const pageSize = contentQuery.limit;
    
    //BƯỚC 2: TẠO BIẾN CONTENTFILTER ĐỂ TẠO ĐIỀU KIỆN LỌC KHÁC NHAU ĐỂ SỬ DỤNG WHERE KHI TRUY VẤN TỐT HƠN
    const contentFilter: Prisma.ContentWhereInput = {publicationStatus: contentQuery.publicationStatus 
      //trường trạng thái xuất bản cần lọc 
      || PublicationStatus.Published};
      // trường trạng thái mặc định nếu tham số không có trạng thái cần lọc 

    contentFilter.AND = [this.communityTranslationVisibilityFilter()];
    

    //lọc theo loại nội dung  
    if (contentQuery.type) {
      contentFilter.type = contentQuery.type;
    }
    //lọc theo ownership tier
    if (contentQuery.ownershipTier) {
      contentFilter.ownershipTier = contentQuery.ownershipTier;
    }
    // tương tự 
    if (contentQuery.search) {
      contentFilter.title = { contains: contentQuery.search };
    }

    if (contentQuery.genreId) {
      contentFilter.genres = { some: { genreId: contentQuery.genreId } };
    }

    if (contentQuery.tagId) {
      contentFilter.tags = { some: { tagId: contentQuery.tagId } };
    }

    //BƯỚC 3 TÌM DATA THEO BỘ LỌC + ĐẾM SỐ CONTENT

    const [contentItems, totalContentCount] = await this.prisma.$transaction([
      //countentItemt nhận kết quả từ truy vấn findmany 
      //totalcontentcount nhận kết quả sau khi đếm toàn bộ lượng content 
      this.prisma.content.findMany({ where: contentFilter, 
        skip: (pageNumber - 1) * pageSize,
        //kiểu đây lấy theo trang
        //vd: người dùng sang trang 2, pagesize chỉ được hiển thị 10
        //-> (2-1) *10 = 10 -> skip 10 bản ghi và bắt đầu từ bản ghi số 11
        take: pageSize, //quy định số bản ghi tối đa muốn lấy từ database
        orderBy: { createdAt: 'desc' },
        include: {
          genres: { include: { genre: true } },
          tags: { include: { tag: true } },
          uploader: { select: { id: true, username: true } },
        },
      }),
      this.prisma.content.count({ where: contentFilter }),
    ]);

    //BƯỚC 4: TRẢ DATA VỀ CHO FRONTEND HIỂN THỊ

    return {
      items: contentItems,
      meta: {
        page: pageNumber,
        limit: pageSize,
        total: totalContentCount,
        totalPages: Math.ceil(totalContentCount / pageSize),
      },
    };
  }

  async findOne(contentId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        genres: { include: { genre: true } },
        tags: { include: { tag: true } },
        chapters: { orderBy: { number: 'asc' }},
        uploader: { select: { id: true, username: true } },
        publisher: true,
        parentContent: {
          select: {
            id: true,
            title: true,
            pricingType: true,
            pricingChangedAt: true,
          },
        },
      },
    });

    if (!content) throw new NotFoundException('Không tìm thấy Content');
    if (!isCommunityTranslationVisible(content)) {
      throw new NotFoundException('Fan Translation này đã hết thời gian ân hạn');
    }
    return content;
  }

  // Dữ liệu danh mục
  async getGenres() {
    return this.prisma.genre.findMany({ orderBy: { name: 'asc' } });
  }

  async getTags(sortOrder: QueryCatalogSortDto['sort'] = 'name') {
    //BƯỚC 1: LẤY DANH SÁCH TAG
    const tags = await this.prisma.tag.findMany({ orderBy: { name: 'asc' } });

    //BƯỚC 2: KIỂM TRA CÓ KÈM POPULAR KHÔNG, NẾU KHÔNG TRẢ VỀ DANH SÁCH TAGS
    if (sortOrder !== 'popular') return tags;


    //BƯỚC 3: LẤY THÔNG KÊ ĐỘC GIẢ GẦN ĐÂY 
    const recentContentReadCounts = await this.getRecentContentReadCounts();

    //BƯỚC 4: TÌM TAG THUỘC NHỮNG NỘI DUNG CỦA THỐNG KÊ
    const contentIds = recentContentReadCounts.map((contentReadCount) => contentReadCount.contentId);



    const contentTagAssociations = contentIds.length
      ? await this.prisma.contentTag.findMany({
          where: { contentId: { in: contentIds } },
          select: { contentId: true, tagId: true },
        })
      : [];

    //
    const activeReadsByTagId = new Map<string, number>();
    const activeReadersByContentId = new Map(
      recentContentReadCounts.map((contentReadCount) => [
        contentReadCount.contentId,
        contentReadCount.activeReaderCount,
      ]),
    );

    for (const contentTagAssociation of contentTagAssociations) {
      const activeReaders = activeReadersByContentId.get(contentTagAssociation.contentId) ?? 0;
      const currentActiveReads = activeReadsByTagId.get(contentTagAssociation.tagId) ?? 0;
      activeReadsByTagId.set(contentTagAssociation.tagId, currentActiveReads + activeReaders);
    }

    return tags
      .map((tag) => ({ ...tag, activeReads: activeReadsByTagId.get(tag.id) ?? 0 }))
      .sort((firstTag, secondTag) =>
        secondTag.activeReads - firstTag.activeReads
        || firstTag.name.localeCompare(secondTag.name),
      );
  }

  async getPublishers(sortOrder: QueryCatalogSortDto['sort'] = 'name') {
    const publisherRecords = await this.prisma.publisher.findMany({
      where: { contents: { some: { publicationStatus: PublicationStatus.Published } } },
      select: {
        id: true,
        organizationName: true,
        contents: {
          where: { publicationStatus: PublicationStatus.Published },
          select: { id: true },
        },
      },
      orderBy: { organizationName: 'asc' },   
    });
    if (sortOrder !== 'popular') {
      return publisherRecords.map(({ contents: publishedContents, ...publisher }) => ({
        ...publisher,
        publishedContentCount: publishedContents.length,
      }));            
    }

    const recentContentReadCounts = await this.getRecentContentReadCounts();
    const activeReadersByContentId = new Map(
      recentContentReadCounts.map((contentReadCount) => [
        contentReadCount.contentId,
        contentReadCount.activeReaderCount,
      ]),
    );

    return publisherRecords
      .map(({ contents: publishedContents, ...publisher }) => ({
        ...publisher,
        activeReads: publishedContents.reduce(
          (totalActiveReads, publishedContent) =>
            totalActiveReads + (activeReadersByContentId.get(publishedContent.id) ?? 0),
          0,
        ),
        publishedContentCount: publishedContents.length,
      }))
      .sort((firstPublisher, secondPublisher) =>
        secondPublisher.activeReads - firstPublisher.activeReads
        || firstPublisher.organizationName.localeCompare(secondPublisher.organizationName),
      );
  }

  // Xếp hạng dựa trên người đọc có hoạt động trong khoảng thời gian phổ biến đã cấu hình.
  async getRankedContents(rankingQuery: QueryRankingContentDto) {
    const pageNumber = rankingQuery.page ?? 1;
    const pageSize = rankingQuery.limit ?? 20;
    const recentContentReadCounts = await this.getRecentContentReadCounts(rankingQuery.category);
    const rankedContentReadCounts = [...recentContentReadCounts].sort(
      (firstContentReadCount, secondContentReadCount) =>
        secondContentReadCount.activeReaderCount - firstContentReadCount.activeReaderCount
        || firstContentReadCount.contentId.localeCompare(secondContentReadCount.contentId),
    );
    const currentPageContentReadCounts = rankedContentReadCounts.slice(
      (pageNumber - 1) * pageSize,
      pageNumber * pageSize,
    );
    const contentIds = currentPageContentReadCounts.map((contentReadCount) => contentReadCount.contentId);
    const contentRecords = await this.prisma.content.findMany({
      where: {
        id: { in: contentIds },
        AND: [this.communityTranslationVisibilityFilter()],
      },
      include: {
        genres: { include: { genre: true } },
        tags: { include: { tag: true } },
        uploader: { select: { id: true, username: true } },
      },
    });
    const contentById = new Map(contentRecords.map((contentRecord) => [contentRecord.id, contentRecord]));

    return {
      items: currentPageContentReadCounts.flatMap((contentReadCount) => {
        const content = contentById.get(contentReadCount.contentId);
        return content
          ? [{ ...content, activeReaders: contentReadCount.activeReaderCount }]
          : [];
      }),
      meta: {
        page: pageNumber,
        limit: pageSize,
        total: rankedContentReadCounts.length,
        totalPages: Math.ceil(rankedContentReadCounts.length / pageSize),
      },
      popularityWindowDays: ContentService.POPULARITY_WINDOW_DAYS,
    };
  }

  private async getRecentContentReadCounts(rankingCategory?: RankingCategory) {
    const contentFilter: Prisma.ContentWhereInput = {
      publicationStatus: PublicationStatus.Published,
      AND: [this.communityTranslationVisibilityFilter()],
    };

    if (rankingCategory === 'ongoing') {
      contentFilter.storyStatus = 'Ongoing';
    }

    if (rankingCategory === 'popular-manga') {
      contentFilter.type = 'Manga';
    }

    if (rankingCategory === 'popular-novel') {
      contentFilter.type = 'Novel';
    }

    const popularityWindowStart = new Date(
      Date.now() - ContentService.POPULARITY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const contentReadCounts = await this.prisma.readingProgress.groupBy({
      by: ['contentId'],
      where: {
        lastReadAt: { gte: popularityWindowStart },
        content: { is: contentFilter },
      },
      _count: { userId: true },
    });

    return contentReadCounts.map((contentReadCount) => ({
      contentId: contentReadCount.contentId,
      activeReaderCount: contentReadCount._count.userId,
    }));
  }

  private communityTranslationVisibilityFilter(): Prisma.ContentWhereInput {
    return {
      OR: [
        { ownershipTier: { not: OwnershipTier.FanTranslation } },
        {
          parentContent: {
            is: { pricingType: ContentPricingType.Free },
          },
        },
        {
          parentContent: {
            is: {
              pricingType: ContentPricingType.Paid,
              pricingChangedAt: {
                gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      ],
    };
  }

  // Chỉnh sửa truyện (Title, Synopsis, Cover, Status, Genres, Tags)
  async updateContent(contentId: string, uploaderId: string, updateData: UpdateContentDto) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw new NotFoundException('Không tìm thấy Content');
    if (content.uploaderId !== uploaderId) {
      throw new ForbiddenException('Không có quyền chỉnh sửa Content này');
    }
    if (
      updateData.allowCommunityTranslation !== undefined &&
      typeof updateData.allowCommunityTranslation !== 'boolean'
    ) {
      throw new BadRequestException('allowCommunityTranslation phải là boolean');
    }

    const nextPricingType =
      content.ownershipTier === OwnershipTier.FanTranslation
        ? ContentPricingType.Free
        : updateData.pricingType ?? content.pricingType;
    const nextPriceCoins =
      content.ownershipTier === OwnershipTier.FanTranslation ||
      nextPricingType === ContentPricingType.Free
        ? 0
        : updateData.priceCoins ?? content.priceCoins;
    const nextFreeChapters =
      content.ownershipTier === OwnershipTier.FanTranslation
        ? 0
        : updateData.freeChapters ?? content.freeChapters;

    if (content.ownershipTier === OwnershipTier.FanTranslation) {
      if (
        (updateData.pricingType !== undefined &&
          updateData.pricingType !== ContentPricingType.Free) ||
        (updateData.priceCoins !== undefined && updateData.priceCoins !== 0) ||
        updateData.allowCommunityTranslation === true
      ) {
        throw new BadRequestException(
          'Fan Translation phải miễn phí và không thể bật dịch cộng đồng',
        );
      }
    }

    this.validatePricing(
      nextPricingType,
      nextPriceCoins,
      nextFreeChapters,
    );

    if (
      updateData.priceCoins !== undefined &&
      nextPricingType === ContentPricingType.Free &&
      updateData.priceCoins !== 0
    ) {
      throw new BadRequestException('Content miễn phí phải có giá bằng 0 coin');
    }

    if (
      updateData.allowCommunityTranslation === true &&
      (content.ownershipTier !== OwnershipTier.Licensed ||
        nextPricingType !== ContentPricingType.Free)
    ) {
      throw new BadRequestException(
        'Chỉ Publisher mới được bật dịch cộng đồng và chỉ khi Content miễn phí',
      );
    }
    if (updateData.allowCommunityTranslation === true) {
      const publisher = await this.prisma.publisher.findUnique({
        where: { userId: uploaderId },
        select: { verificationStatus: true },
      });
      if (!publisher || publisher.verificationStatus !== 'Approved') {
        throw new ForbiddenException(
          'Chỉ Publisher đã xác minh mới được bật dịch cộng đồng',
        );
      }
    }

    return this.prisma.$transaction(async (transactionClient) => {
      if (updateData.genreIds) {
        await transactionClient.contentGenre.deleteMany({ where: { contentId } });
        if (updateData.genreIds.length > 0) {
          const genreRecords = await transactionClient.genre.findMany({
            where: { name: { in: updateData.genreIds } },
            select: { id: true },
          });
          await transactionClient.contentGenre.createMany({
            data: genreRecords.map((genreRecord) => ({ contentId, genreId: genreRecord.id })),
          });
        }
      }

      if (updateData.tagIds) {
        await transactionClient.contentTag.deleteMany({ where: { contentId } });
        if (updateData.tagIds.length > 0) {
          const tagRecords = await transactionClient.tag.findMany({
            where: { name: { in: updateData.tagIds } },
            select: { id: true },
          });
          await transactionClient.contentTag.createMany({
            data: tagRecords.map((tagRecord) => ({ contentId, tagId: tagRecord.id })),
          });
        }
      }

      const contentUpdateData: Prisma.ContentUpdateInput = {
        publicationStatus: PublicationStatus.PendingApproval,
        reviewFeedback: null,
      };

      if (updateData.title !== undefined) {
        contentUpdateData.title = updateData.title;
      }

      if (updateData.synopsis !== undefined) {
        contentUpdateData.synopsis = updateData.synopsis;
      }

      if (updateData.coverImageUrl !== undefined) {
        contentUpdateData.coverImageUrl = updateData.coverImageUrl;
      }

      if (updateData.storyStatus !== undefined) {
        contentUpdateData.storyStatus = updateData.storyStatus;
      }

      contentUpdateData.pricingType = nextPricingType;
      contentUpdateData.priceCoins = nextPriceCoins;
      contentUpdateData.freeChapters = nextFreeChapters;

      if (content.ownershipTier === OwnershipTier.FanTranslation) {
        contentUpdateData.allowCommunityTranslation = false;
      } else if (nextPricingType === ContentPricingType.Paid) {
        contentUpdateData.allowCommunityTranslation = false;
        if (content.pricingType !== ContentPricingType.Paid) {
          contentUpdateData.pricingChangedAt = new Date();
        }
      } else {
        if (content.pricingType === ContentPricingType.Paid) {
          contentUpdateData.pricingChangedAt = null;
        }
        if (updateData.allowCommunityTranslation !== undefined) {
          contentUpdateData.allowCommunityTranslation =
            updateData.allowCommunityTranslation;
        }
      }

      return transactionClient.content.update({
        where: { id: contentId },
        data: contentUpdateData,
        include: {
          genres: { include: { genre: true } },
          tags: { include: { tag: true } },
          uploader: { select: { id: true, username: true } },
        },
      });
    });
  }

  private validatePricing(
    pricingType: string,
    priceCoins: number,
    freeChapters: number,
  ) {
    if (
      pricingType !== ContentPricingType.Free &&
      pricingType !== ContentPricingType.Paid
    ) {
      throw new BadRequestException('pricingType không hợp lệ');
    }

    if (
      !Number.isSafeInteger(freeChapters) ||
      freeChapters < 0 ||
      freeChapters > 2_147_483_647
    ) {
      throw new BadRequestException('freeChapters phải là số nguyên không âm');
    }

    if (pricingType === ContentPricingType.Free && priceCoins !== 0) {
      throw new BadRequestException('Content miễn phí phải có giá bằng 0 coin');
    }

    if (
      pricingType === ContentPricingType.Paid &&
      (!Number.isSafeInteger(priceCoins) ||
        priceCoins <= 0 ||
        priceCoins > 2_147_483_647)
    ) {
      throw new BadRequestException(
        'Content trả phí phải có giá từ 1 coin trở lên',
      );
    }
  }

  /** Chỉ Admin gọi — duyệt Content từ PendingApproval -> Published */
  async approve(contentId: string) {
    const content = await this.updateStatusGuarded( contentId, PublicationStatus.PendingApproval,PublicationStatus.Published,);
    await this.createNotificationSafely(
      content.uploaderId,
      NotificationType.ContentApproved,
      `Truyện "${content.title}" đã được duyệt và xuất bản.`,
    );
    return content;
  }

  /** Chỉ Admin gọi */
  async reject(contentId: string, rejectionReason?: string) {
    const normalizedRejectionReason = rejectionReason?.trim();
    if (!normalizedRejectionReason) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối Content');
    }

    const content = await this.updateStatusGuarded(
      contentId,
      PublicationStatus.PendingApproval,
      PublicationStatus.Rejected,
      normalizedRejectionReason,
    );

    const message = `Truyện "${content.title}" đã bị từ chối. Lý do: ${normalizedRejectionReason}`;
    await this.createNotificationSafely(content.uploaderId, NotificationType.ContentRejected, message);
    return content;
  }

  async hide(contentId: string) {
    const content = await this.updateStatusGuarded(
      contentId,
      PublicationStatus.Published,
      PublicationStatus.Hidden,
    );
    await this.createNotificationSafely(
      content.uploaderId,
      NotificationType.ContentHidden,
      `Truyện "${content.title}" đã bị ẩn.`,
    );
    return content;
  }

  async restore(contentId: string) {
    const content = await this.updateStatusGuarded(
      contentId,
      PublicationStatus.Hidden,
      PublicationStatus.Published,
    );
    await this.createNotificationSafely(
      content.uploaderId,
      NotificationType.ContentRestored,
      `Truyện "${content.title}" đã được khôi phục.`,
    );
    return content;
  }

  /** Author/Publisher resubmit sau khi bị Reject */
  async resubmit(contentId: string, uploaderId: string) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) {
      throw new NotFoundException('Không tìm thấy Content');
    }

    if (content.uploaderId !== uploaderId) {
      throw new ForbiddenException('Không có quyền resubmit Content này');
    }

    if (content.publicationStatus !== PublicationStatus.Rejected) {
      throw new ForbiddenException('Chỉ resubmit được Content đang ở trạng thái Rejected');
    }

    return this.prisma.content.update({
      where: { id: contentId },
      data: { publicationStatus: PublicationStatus.PendingApproval, reviewFeedback: null },
    });
  }

  private async updateStatusGuarded(
    contentId: string,
    expectedPublicationStatus: PublicationStatus,
    nextPublicationStatus: PublicationStatus,
    rejectionReason?: string,
  ) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) {
      throw new NotFoundException('Không tìm thấy Content');
    }

    if (content.publicationStatus !== expectedPublicationStatus) {
      throw new ForbiddenException(
        `Content phải ở trạng thái ${expectedPublicationStatus} mới chuyển sang ${nextPublicationStatus} được (hiện tại: ${content.publicationStatus})`,
      );
    }

    const contentStatusUpdateData: {
      publicationStatus: PublicationStatus;
      reviewFeedback?: string;
    } = {
      publicationStatus: nextPublicationStatus,
    };

    if (rejectionReason !== undefined) {
      contentStatusUpdateData.reviewFeedback = rejectionReason;
    }

    return this.prisma.content.update({
      where: { id: contentId },
      data: contentStatusUpdateData,
    });
  }
  private async createNotificationSafely(
    userId: string,
    notificationType: NotificationType,
    message: string,
  ) {
    try {
      await this.notificationService.create(userId, notificationType, message);
    } catch (error) {
      console.error('Failed to create notification', error);
    }
  }
}