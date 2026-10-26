import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { QueryContentDto } from './dto/query-content.dto';
import { QueryCatalogSortDto } from './dto/query-catalog-sort.dto';
import { QueryRankingContentDto, type RankingCategory } from './dto/query-ranking-content.dto';
import { QueryRecommendationsDto } from './dto/query-recommendations.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentPricingType, OwnershipTier, PublicationStatus } from '../../common/constants/content.enum';
import { NotificationService } from '../../notification/notification.service';
import { NotificationType } from '../../common/constants/notification.enum';
import { isCommunityTranslationVisible } from './content-visibility';
import { ContentValidationService } from './content-validation.service';



@Injectable() //cho nestjs là class này có thể được inject vào các thành phần khác 
export class ContentService implements OnModuleInit {

  //hằng số quy định thời gian tính độ phổ biến là 7 ngày 

  private static readonly POPULARITY_WINDOW_DAYS = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly contentValidationService: ContentValidationService,
  ) {}

  ////////////////////////////KHỞI TẠO GENRE VÀ TAG MẶC ĐỊNH///////////////////////////

  //1: khi nestjs khởi tạo service này thì nó phải gọi seedDefault đầu tiên 
  async onModuleInit() {
    await this.seedDefaults();
  }

  //2 DANH SÁCH DỮ LIỆU MẶC ĐỊNH ĐƯỢC VIẾT TRONG CODE 
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
////////////////////////////////HÀM TẠO CONTENT//////////////////////////////////////////


  async createContent( contentData: CreateContentDto, uploaderId: string, ownershipTier: OwnershipTier, publisherId?: string, parentContentId?: string) {
    // Tham số	Ý nghĩa: 
    // contentData	Dữ liệu truyện gửi lên: tên, mô tả, ảnh bìa, thể loại, tag, giá...
    //uploaderId	ID người đang đăng truyện
    // ownershipTier	Phân loại quyền sở hữu nội dung
    // publisherId?	ID Publisher nếu có
    // parentContentId?	ID truyện gốc nếu đây là bản dịch cộng đồng

    // BƯỚC 1: Kiểm tra quy tắc theo loại truyện.
    // Fan Translation cần truyện gốc hợp lệ và phải miễn phí; Original không gắn truyện gốc;
    // chỉ Licensed (bản quyền) mới được bật dịch cộng đồng. Điều kiện cụ thể nằm trong ContentValidationService.
    this.contentValidationService.validateCreateContentInput( contentData, ownershipTier, parentContentId);

    // BƯỚC 2: Chuẩn bị giá, số coin, chương miễn phí và quyền dịch cộng đồng theo ownershipTier.
    // Fan Translation mặc định miễn phí, 0 coin và 0 chương đọc thử; truyện khác dùng giá trị mặc định
    // hoặc giá trị người tạo gửi lên. Hàm này cũng kiểm tra tính hợp lệ của cấu hình giá.
    const contentSettings = this.contentValidationService.prepareCreateContentSettings( contentData, ownershipTier );
    

    // BƯỚC 3: Chuẩn bị quan hệ nhiều-nhiều giữa truyện với Genre và Tag.
    // Prisma sẽ tạo các bản ghi quan hệ cùng lúc với Content ở cuối transaction.
    // Dùng create + connect để liên kết đến Genre/Tag đã có trong database.
    const genresData = this.buildCreateContentGenreRelations(contentData.genreIds);
    const tagsData = this.buildCreateContentTagRelations(contentData.tagIds);


    //BƯỚC 4: TẠO TRUYỆN TỪ NHỮNG THÔNG TIN NG ƯỜI DÙNG GỬI LÊN
    return this.prisma.$transaction( async (transactionClient) => {


        // BƯỚC 4.1 Kiểm tra lại truyện gốc (Licensed, Published, miễn phí, cho phép dịch),
        // Publisher (đúng chủ sở hữu và đã Approved) và payout nếu nội dung trả phí.
        // Kiểm tra trong transaction để dữ liệu/quyền truy cập còn hợp lệ ngay tại thời điểm tạo.

        await this.contentValidationService.validateCreateContentTransactionRules( transactionClient, uploaderId, ownershipTier,
          publisherId,parentContentId, contentSettings.pricingType,);

        // Tạo Content ở trạng thái PendingApproval cùng Genre/Tag trong cùng transaction.
        return transactionClient.content.create({
          data: {
            title: contentData.title,
            synopsis: contentData.synopsis,
            type: contentData.type,
            ownershipTier,
            publicationStatus: PublicationStatus.PendingApproval,
            coverImageUrl: contentData.coverImageUrl,
            pricingType: contentSettings.pricingType,
            priceCoins: contentSettings.priceCoins,
            freeChapters: contentSettings.freeChapters,
            allowCommunityTranslation: contentSettings.allowCommunityTranslation,
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


  //chuẩn bị dữ liệu để liên kết Content với Genre và Tag đã tồn tại trong database.

  private buildCreateContentGenreRelations(genreIds?: string[]) {
    //vì mối quan hệ giữa 2 bảng content và tag / genre là nhiều nhiều
    //-> suy ra ta phải tạo bảng trung gian cho dễ truy vấn sau này, liên kết giữa 2 bảng tốt hơn

    if (!genreIds) {
      return undefined;
    }

    //genre: chỉ ra quan hệ genre bản ghi quan hệ đang tạo 
    //connect: yêu cầu prisma kết nối với một genre đã tồn tại 
    //name: xác định genre cần liên kết thông qua trường name 
    return { create: genreIds.map((genreName) => ({ genre: { connect: { name: genreName } },})),
    } satisfies Prisma.ContentCreateInput['genres'];
    //create: tạo bản ghi quan hệ Content Genre 
    //connect: liên kết bản ghi quan hệ với genre đã tồn tại 

    //tóm lại : hãy duyệt từng genrename trong genreid, kết nối nó với genrename thật có sẵn trong database 
  }

  private buildCreateContentTagRelations(tagIds?: string[]) {
    if (!tagIds) {
      return undefined;
    }

    return {
      create: tagIds.map((tagName) => ({
        tag: { connect: { name: tagName } },
      })),
    } satisfies Prisma.ContentCreateInput['tags'];
  }

  // Trả danh sách truyện đã xuất bản theo bộ lọc và phân trang.
  async findAll(contentQuery: QueryContentDto) {
    //BƯỚC 1: SAU KHI ĐƯỢC TRUYỀN DỮ LIỆU VÀO -> XÁC ĐỊNH BẢN GHI VÀ SỐ BẢN GHI
    const pageNumber = contentQuery.page;
    const pageSize = contentQuery.limit;

    //BƯỚC 2: TẠO BIẾN CONTENTFILTER ĐỂ TẠO ĐIỀU KIỆN LỌC KHÁC NHAU ĐỂ SỬ DỤNG WHERE KHI TRUY VẤN TỐT HƠN
    const contentFilter: Prisma.ContentWhereInput = {publicationStatus: contentQuery.publicationStatus || PublicationStatus.Published};
      //tạo bộ lọc content, mặc địch là published còn không thì là lấy theo tham số 

    contentFilter.AND = [this.communityTranslationVisibilityFilter()]; //thêm 1 bộ lọc 
    //Nếu là bản dịch cộng đồng, truyện gốc trả phí và đã quá thời gian chuyển tiếp, bản dịch sẽ không vượt qua bộ lọc này.


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
      throw new NotFoundException('Fan Translation này đã hết thời hạn');
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


    if (sortOrder !== 'popular') return tags;

    //BƯỚC 2: LẤY DANH SÁCH TAGS POPULAR


    //BƯỚC 2.1: LẤY THÔNG KÊ ĐỘC GIẢ GẦN ĐÂY, NHỮNG CONTENT NÀO CÓ NHIỀU NGƯỜI ĐỌC NHẤT 
    const recentContentReadCounts = await this.getRecentContentReadCounts();

    //BƯỚC 2.2: DUYỆT QUA TỪNG PHẦN TỬ MẢNG VÀ LẤY RA CONTENTID ĐỂ DÙNG NÓ LẤY RA TAGS CỦA MỖI CONTENT
    const contentIds = recentContentReadCounts.map((contentReadCount) => contentReadCount.contentId);


      let contentTagAssociations = [];

      if (contentIds.length > 0) { 
          contentTagAssociations = await this.prisma.contentTag.findMany({ where: { contentId: {in: contentIds,},},
            select: { contentId: true, tagId: true,},});
      }

    
    
    
    //BƯỚC 2.4; DUYỆT QUA TỪNG PHẦN TỬ CỦA BIẾN NGƯỜI ĐỌC GẦN ĐÂY GÁN NÓ THÀNH KEY VALUE 
    //KEY LÀ CONTENTID, VALUE LÀ ACTIVEREADERCOUNT (SỐ LƯỢNG NGƯỜI ĐỌC)
    const activeReadersByContentId = new Map(
      recentContentReadCounts.map((contentReadCount) => [contentReadCount.contentId, contentReadCount.activeReaderCount,]),
    );

    //BƯỚC 2.5 SET KEY VALUE, MỖI TAGSID CÓ BAO NHIỀU NGƯỜI ĐANG ĐỌC 
    const activeReadsByTagId = new Map<string, number>();

    for (const contentTagAssociation of contentTagAssociations) { 
      //duyệt qua từng phần tử, contenttagassociation sẽ chứa phần tử đang được duyệt đấy 
      const activeReaders = activeReadersByContentId.get(contentTagAssociation.contentId) ?? 0; // Lấy số độc giả của Content hiện tại dựa vào contentId
      const currentActiveReads = activeReadsByTagId.get(contentTagAssociation.tagId) ?? 0;  // Lấy điểm đã tích lũy trước đó của Tag hiện tại
      activeReadsByTagId.set(contentTagAssociation.tagId, currentActiveReads + activeReaders);  // Cộng số độc giả của Content hiện tại vào tổng điểm của Tag tương ứng


      // Ví dụ: Truyện A có 50 độc giả, Truyện B có 30 độc giả.
      // Cả hai đều gắn Tag Action nên điểm của Action bằng 80.
      // Lần 1: 0 + 50 = 50 (Truyện A)
      // Lần 2: 50 + 30 = 80 (Truyện B)
      // Vòng for chạy theo số lượng phần tử trong contentTagAssociations.
    }


    // Đoạn code này có nhiệm vụ thêm điểm phổ biến cho từng Tag, sau đó sắp xếp Tag từ phổ biến nhất đến ít phổ biến nhất.
    return tags
      .map((tag) => ({ ...tag, activeReads: activeReadsByTagId.get(tag.id) ?? 0 }))
      .sort((firstTag, secondTag) => secondTag.activeReads - firstTag.activeReads || firstTag.name.localeCompare(secondTag.name),);
      //.map() — Thêm activeReads vào mỗi Tag.
      //.sort() — Sắp xếp Tag theo độ phổ bi++ến giảm dần.
      //|| firstTag.name.localeCompare(secondTag.name) — Nếu bằng điểm thì sắp xếp theo tên A → Z.
  }

  async getPublishers(sortOrder: QueryCatalogSortDto['sort'] = 'name') {

    //BƯỚC 1: TÌM PUBLISHER CÓ ÍT NHẤT 1 TRUYỆN ĐÃ XUẤT BẢN 

    const publisherRecords = await this.prisma.publisher.findMany({
      where: { contents: { some: { publicationStatus: PublicationStatus.Published } } },
      //some: phải có ít nhất 1 
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
    
    //BƯỚC 2: LẤY DANH SÁCH THEO TÊN , ĐỒNG THỜI ĐẾM SỐ CONTENT ĐƯỢC TRẢ LẠI 

    if (sortOrder !== 'popular') {
      //map duyệt từng phẩn tử trong mảng publisherrecored
      //chia 1 object ra biến content: chứa publihserContent, còn biến publihser sẽ chứa toàn bộ các thuộc tính còn lại của 1 object 
      //return được 2 biến chứa 2 mảng  + số content 
      return publisherRecords.map(({ contents: publishedContents, ...publisher }) => ({...publisher,
        publishedContentCount: publishedContents.length,
      }));
    }

    //BƯỚC 3: LẤY DANH SÁCH THEO ĐỘ NỔI TIẾNG 

    //BƯỚC 3.1 LẤY SỐ NGƯỜI ĐỌC CỦA MỖI CONTENT 
    const recentContentReadCounts = await this.getRecentContentReadCounts();

    //BƯỚC 3.2 DUYỆT QUA TỪNG PHẦN TỬ CỦA BIẾN CHỨA MẢNG, RỒI GOM LẠI THÀNH BIẾN CHỨA CẶP GIÁ TRỊ KEYVALUE CHO DỄ TRA CỨU SAU NÀY
    const activeReadersByContentId = new Map( recentContentReadCounts.map((contentReadCount) => [ contentReadCount.contentId, contentReadCount.activeReaderCount,]),);
    

    return publisherRecords.map(({ contents: publishedContents, ...publisher }) => {
      let activeReads = 0;

      for (const publishedContent of publishedContents) {
        activeReads += activeReadersByContentId.get(publishedContent.id) ?? 0;
      }

      return {
        ...publisher, //tạo ra object publisher (không còn thuộc tính content)
        //với các thuộc tính bổ sung 
        activeReads,
        publishedContentCount: publishedContents.length,
      };
    })

    //sort() duyệt và so sánh từng cặp phần tử để sắp xếp mảng.
      //Quy tắc của sort(): số lớn hơn thì đứng trước 
      //- Kết quả âm: firstPublisher đứng trước -> tức là first lớn hơn second .
      //- Kết quả dương: secondPublisher đứng trước -> tức là second lớn hơn first.

      .sort((firstPublisher, secondPublisher) =>
        secondPublisher.activeReads - firstPublisher.activeReads
        || firstPublisher.organizationName.localeCompare(secondPublisher.organizationName),
        //nếu 2 số bằng nhau thì so sánh bằng tên của first và second
        //vd first: abc so sánh với second def , vì abc đứng trước def thì trả về âm, tức là second đứng trước 
        
      );
  }

  // Xếp hạng dựa trên người đọc có hoạt động trong khoảng thời gian phổ biến đã cấu hình.
  async getRankedContents(rankingQuery: QueryRankingContentDto) {
    const pageNumber = rankingQuery.page ?? 1;
    const pageSize = rankingQuery.limit ?? 20;

    //BƯỚC 1: LẤY THỐNG KÊ LƯỢT ĐỘC GẦN ĐÂY 
    const recentContentReadCounts = await this.getRecentContentReadCounts(rankingQuery.category);

    //BƯỚC 2 SẮP XẾP NHỮNG CONTENT THEO LƯỢNG NGƯỜI ĐỌC TỪ CAO ĐẾN THẤP 
    const rankedContentReadCounts = [...recentContentReadCounts].sort(
      (firstContentReadCount, secondContentReadCount) =>
        secondContentReadCount.activeReaderCount - firstContentReadCount.activeReaderCount
        || firstContentReadCount.contentId.localeCompare(secondContentReadCount.contentId),
    );

    //BƯỚC 3: LẤY SỐ TRANG , MỖI TRANG CÓ BAO NHIÊU CONTENT . VÀ NÓ CHỨA CONTENT ĐÃ ĐƯỢC RANK 
    const currentPageContentReadCounts = rankedContentReadCounts.slice(
      (pageNumber - 1) * pageSize,
      pageNumber * pageSize,
    );

    //BƯỚC 4: DUYỆT QUA TỪNG TRANG, LẤY CONTENTID TRONG ĐÓ
    const contentIds = currentPageContentReadCounts.map((contentReadCount) => contentReadCount.contentId);
    //nó trả lại 1 mảng chứa toàn các id trong đấy 
    
    //BƯỚC 5: TÌM CONTENT THEO CONTENTID + GENRE VÀ TAGS
    const contentRecords = await this.prisma.content.findMany({
      where: { id: { in: contentIds }, AND: [this.communityTranslationVisibilityFilter()],},
      include: {
        genres: { include: { genre: true } },
        tags: { include: { tag: true } },
        uploader: { select: { id: true, username: true } },
      },
    });


    //BƯỚC 6

    const contentById = new Map(contentRecords.map((contentRecord) => [contentRecord.id, contentRecord]));
    //TẠO THÀNH CẶP GIÁ TRỊ
    
      // BƯỚC 6.1: Tạo mảng chứa content của trang hiện tại
      const items = [];

      for (const contentReadCount of currentPageContentReadCounts) {
        // BƯỚC 6.2: lấy object content dựa theo contentId
        const content = contentById.get(contentReadCount.contentId);

        if (!content) {
          continue;
        }

        // BƯỚC 4: thêm toàn bộ object của toàn bộ các trường content + activereaders vào items 
        items.push({
          ...content,
          activeReaders: contentReadCount.activeReaderCount,
        });
      }

      // BƯỚC 5: Trả kết quả
      return {
        items: items,
        meta: {
          page: pageNumber,
          limit: pageSize,
          total: rankedContentReadCounts.length,
          totalPages: Math.ceil(rankedContentReadCounts.length / pageSize),
        },
        popularityWindowDays: ContentService.POPULARITY_WINDOW_DAYS,
      };
    }

  async getRecommendations(userId: string, query: QueryRecommendationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    //BƯỚC 1 LẤY SỞ THÍCH THỂ LOẠI CỦA NGƯỜI DÙNG 
    const preferences = await this.prisma.userGenrePreference.findMany({ where: { userId }, select: { genreId: true }, });
    //trả về 1 mảng object 
    const genreIds = preferences.map(({ genreId }) => genreId);
    //trích 1 mảng genreid riêng 

    const recentWindowStart = new Date(
      Date.now() - ContentService.POPULARITY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    //BƯỚC 2: LỌC TRUYỆN CÓ THỂ ĐỀ XUẤT (người dùng phải chưa đọc, chưa lưu chưa yêu thích )
    const contentFilter: Prisma.ContentWhereInput = { 
      publicationStatus: PublicationStatus.Published, //chỉ lấy truyện đã xuất bản 
      AND: [this.communityTranslationVisibilityFilter()], //áp dụng bộ lọc 
      readingProgress: { none: { userId } }, //người dùng chưa có bản ghi tiến độ 
      bookmarks: { none: { userId } }, //người dùng chưa bookmark truyện 
      favorites: { none: { userId } }, //người dùng chưa yêu thích 
    };

    
    //khai báo điều kiện where để prisma truy vấn 
    if (genreIds.length > 0) {
      contentFilter.genres = { some: { genreId: { in: genreIds } } }; 
      //tìm được ít nhất 1 genreid khớp với genreids người dùng gửi vào 
    }

    //BƯỚC 3: TRUY VẤN DANH SÁCH TRUYỆN ĐÃ VƯỢT QUA CÁC ĐIỀU KIỆN Ở TRÊN 

    const candidates = await this.prisma.content.findMany({
      where: contentFilter,
      include: {
        genres: { include: { genre: true } },
        tags: { include: { tag: true } },
        uploader: { select: { id: true, username: true } },
      },
    });

    //TẠO BIẾN LƯU MẢNG CHỨA CÁC ID CỦA CANDICATES 
    const contentIds = candidates.map(({ id }) => id);

    //NẾU CONTENTID KHÔNG CÓ GÌ TRẢ VỀ RỖNG 
    if (contentIds.length === 0) {
      return {
        items: [],
        meta: { page, limit, total: 0, totalPages: 0 },
        fallback: genreIds.length === 0,
      };
    }

    //BƯỚC 4: LẤY ĐỂM ĐÁNH GIÁ VÀ LƯỢT ĐỌC GẦN ĐÂY 

    const [ratingGroups, readGroups] = await Promise.all([
      //ĐÁNH GIÁ 
      this.prisma.rating.groupBy({
        by: ['contentId'], //nhóm bản ghi đánh gia theo từng contentid
        where: { contentId: { in: contentIds } }, 
        _avg: { score: true }, //tính điểm trung bình các đánh giá
      }),
      //TIÉN TRÌNH ĐỌC 
      this.prisma.readingProgress.groupBy({
        by: ['contentId'], //nhóm bản ghi đánh giá theo từng contentid 
        where: { //có id bằng contentids và nằm trong thời gian gần đây 
          contentId: { in: contentIds }, 
          lastReadAt: { gte: recentWindowStart },
        },
        _count: { userId: true }, //tính số lượng userId của mỗi contentid được gom lại 
      }),
    ]);

    //BƯỚC 5 Bổ sung dữ liệu và tính điểm cho Content phục vụ xếp hạng.
    const ratingsByContentId = new Map( ratingGroups.map(({ contentId, _avg }) => [contentId, _avg.score ?? 0]),);
    //map lại thành dạng key: content, value: điểm trung bình 

    const readsByContentId = new Map( readGroups.map(({ contentId, _count }) => [contentId, _count.userId]),);
    //key: content, value: số người dùng đọc 

    const rankedCandidates = [];

    for (const content of candidates) {
      //duyệt qua từng object trong candidates
      
      let matchingGenres = 0;

      //5.1 đếm số genre khớp với sở thích người dùng 
      for (const contentGenre of content.genres) {
        if (genreIds.includes(contentGenre.genreId)) { 
          //xem content (được duyệt) có những genreid nào bằng genreid của người dùng 
          matchingGenres++;
        }
      }

      // Lấy điểm đánh giá trung bình
      const rating = ratingsByContentId.get(content.id) ?? 0;

      // Lấy số lượt đọc gần đây
      const recentReads = readsByContentId.get(content.id) ?? 0;

      // Đưa Content và các thông tin bổ sung vào danh sách
      rankedCandidates.push({
        content,
        matchingGenres,
        rating,
        recentReads,
      });
    }

    // BƯỚC 5.2: Sắp xếp danh sách Content
    rankedCandidates.sort((first, second) => {
      // Nếu người dùng có sở thích genre
      if (genreIds.length > 0) {
        // Ưu tiên Content khớp nhiều genre hơn
        if (first.matchingGenres !== second.matchingGenres) {
          return second.matchingGenres - first.matchingGenres;
        }
      }

      // Nếu các tiêu chí trên bằng nhau, so sánh điểm đánh giá
      if (first.rating !== second.rating) {
        return second.rating - first.rating;
      }

      // Nếu điểm đánh giá bằng nhau, ưu tiên lượt đọc gần đây
      if (first.recentReads !== second.recentReads) {
        return second.recentReads - first.recentReads;
      }

      // Nếu tất cả tiêu chí đều bằng nhau, so sánh ID
      return first.content.id.localeCompare(second.content.id);
    });
    const pageItems = rankedCandidates.slice((page - 1) * limit, page * limit);

    return {
      items: pageItems.map(({ content, matchingGenres, rating, recentReads }) => ({
        ...content,
        matchingGenres,
        averageRating: rating,
        activeReaders: recentReads,
      })),
      meta: {
        page,
        limit,
        total: rankedCandidates.length,
        totalPages: Math.ceil(rankedCandidates.length / limit),
      },
      fallback: genreIds.length === 0,
    };
  }

  private async getRecentContentReadCounts(rankingCategory?: RankingCategory) {

    //BƯỚC 1 BỘ LỌC CONTENT PHIIR BIẾN 
    //khai báo biến contentFilter có kiểu dữ liệu contentwhereinput
    const contentFilter: Prisma.ContentWhereInput = {publicationStatus: PublicationStatus.Published,
      AND: [this.communityTranslationVisibilityFilter()],};
      //tạo điều kiện lọc content , chỉ lấy nội dung đã xuẩt bản và phải thỏa mãn điều kiện của communitytransaltionvibiliterfilter

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

    //BƯỚC 2 THỐNG KÊ SỐ LƯỢNG NGƯỜI ĐỌC TRONG TỪNG CONTENT TRONG 24H GẦN ĐÂY 
    const contentReadCounts = await this.prisma.readingProgress.groupBy({
      by: ['contentId'], //nhóm bản ghi thành nhiều trường để tính toán thống kê
      //vd: 
      //
      // userId	contentId	lastReadAt -> CONTENT A: U1, U2 / CONTENT B U3, U1
      // U1	    A	        Hôm nay
      // U2	    A	        Hôm nay
      // U3	    B	        Hôm nay
      // U1	    B	        Hôm nay

      where: { lastReadAt: { gte: popularityWindowStart }, content: { is: contentFilter },},
      _count: { userId: true }, // đếm số userId cho mỗi nhóm 
    });

    return contentReadCounts.map((contentReadCount) =>
      ({ contentId: contentReadCount.contentId, activeReaderCount: contentReadCount._count.userId,}));
  }


  //Hàm này tạo ra quy tắc hiển thị gồm ba nhánh:
 // 1. Không phải bản dịch cộng đồng → cho qua.
 // 2. Là bản dịch cộng đồng nhưng truyện gốc miễn phí → cho qua.
  // 3. Truyện gốc đã chuyển sang trả phí nhưng chưa quá thời gian chuyển tiếp 14 ngày → cho qua.
  private communityTranslationVisibilityFilter(): Prisma.ContentWhereInput {
    return { 
      OR: [ //1 trong 3 điều kiện này đúng thì content sẽ vượt qua bộ lọc này 
        
        { ownershipTier: { not: OwnershipTier.FanTranslation } }, //nếu không phải fan translation 

        {parentContent: { is: { pricingType: ContentPricingType.Free },},}, //bản dịch cộng đồng có content gốc là free

        { parentContent: { is: { //nếu truyện gốc trả phí trong vòng 14 ngày
              pricingType: ContentPricingType.Paid,
              pricingChangedAt: {
                gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),},},},},
      ],
    };
  }

  // Chỉnh sửa truyện (Title, Synopsis, Cover, Status, Genres, Tags)
  async updateContent(contentId: string, uploaderId: string, updateData: UpdateContentDto) {
    //contentId	ID của truyện cần cập nhật
    //uploaderId	ID người đăng truyện
    //updateData	Những thông tin người dùng muốn thay đổi


    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) { throw new NotFoundException('Không tìm thấy Content');}

    // BƯỚC 2: KIỂM TRA GIÁ TRỊ MỚI TRƯỚC KHI LƯU 

    // 2.1 NẾU TRUYỆN LÀ FAN TRANSLATION THÌ PHẢI FREE, KHÔNG PHẢI THÌ UPDATE LOẠI TRẢ PHÍ

    let nextPricingType = content.pricingType;
    if (content.ownershipTier === OwnershipTier.FanTranslation) {
      nextPricingType = ContentPricingType.Free;
    
    } else if (updateData.pricingType !== undefined) {
      nextPricingType = updateData.pricingType;
    }

    // 2.2 NẾU TRUYỆN LÀ FANTRASLATION HOẶC LÀ LOẠI FREE THÌ ĐỂ GIÁ TIỀN =0 , CÒN KHÔNG THÌ TRẢ PHÍ 
    let nextPriceCoins = content.priceCoins;
    if (content.ownershipTier === OwnershipTier.FanTranslation) {
      nextPriceCoins = 0;
    } else if (nextPricingType === ContentPricingType.Free) {
      nextPriceCoins = 0;
    } else if (updateData.priceCoins !== undefined) {
      nextPriceCoins = updateData.priceCoins;
    }

    // 2.3 NẾU TRUYỆN LÀ TRANSLATION THÌ KHÔNG SET CHAP ĐỌC FREE, CÒN KHÔNG THÌ PHẢI THÌ 
    let nextFreeChapters = content.freeChapters;
    if (content.ownershipTier === OwnershipTier.FanTranslation) {
      nextFreeChapters = 0;
    } else if (updateData.freeChapters !== undefined) {
      nextFreeChapters = updateData.freeChapters;
    }

    // BƯỚC 3 Kiểm tra quyền và các quy tắc giá, dịch cộng đồng trước khi cập nhật Content.
    await this.contentValidationService.validateUpdateContent( content, uploaderId, updateData, nextPricingType, nextPriceCoins, nextFreeChapters,);

    // BƯỚC 4 Cập nhật Content cùng các quan hệ Genre/Tag trong một transaction để tránh lưu dở dang.
    return this.prisma.$transaction(async (transactionClient) => {

      //4.1 KIỂM TRA HỒ SƠ NHẬN TIỀN TRƯỚC KHI CHUYỂN SANG PAID
      if ( content.pricingType !== ContentPricingType.Paid && nextPricingType === ContentPricingType.Paid) {
        //nếu truyện hiện tại không phải pay mà người dùng muốn update là pay 

        await this.contentValidationService.validateContentPayoutProfile(transactionClient, uploaderId);
      }

      //4.2 CẬP NHẬT GENRE VÀ TAGS

      if (updateData.genreIds) {
        //XÓA HẾT GENRE CŨ ĐI 
        await transactionClient.contentGenre.deleteMany({ where: { contentId } });
        if (updateData.genreIds.length > 0) {
          const genreRecords = await transactionClient.genre.findMany({
            where: { name: { in: updateData.genreIds } },
            select: { id: true },
          });
          //TẠO CONTENT VỚI GENRE MỚI 
          await transactionClient.contentGenre.createMany({
            data: genreRecords.map((genreRecord) => ({ contentId, genreId: genreRecord.id })),
          });
        }
      }
      
      //4.3 CẬP NHẬT TAGS
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

      //BƯỚC 5: CHUẨN BỊ DỮ LIỆU TRƯỚC KHI CẬP NHẬT CONTENT 
      const contentUpdateData: Prisma.ContentUpdateInput = { publicationStatus: PublicationStatus.PendingApproval,reviewFeedback: null,};

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
          contentUpdateData.allowCommunityTranslation = updateData.allowCommunityTranslation;
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

  /** Chỉ Admin gọi — duyệt Content từ PendingApproval -> Published */
  async approve(contentId: string) {
    const content = await this.updateStatusGuarded( contentId, PublicationStatus.PendingApproval,PublicationStatus.Published,);
    await this.createNotificationSafely( content.uploaderId, NotificationType.ContentApproved,
    `Truyện "${content.title}" đã được duyệt và xuất bản.`,);
    return content;
  }

  /** Chỉ Admin gọi */
  async reject(contentId: string, rejectionReason?: string) {
    // Kiểm tra và chuẩn hóa lý do từ chối trước khi chuyển trạng thái.
    const normalizedRejectionReason = this.contentValidationService.validateRejectContentReason(rejectionReason);

    const content = await this.updateStatusGuarded( contentId, PublicationStatus.PendingApproval, PublicationStatus.Rejected,
      normalizedRejectionReason,);

    const message = `Truyện "${content.title}" đã bị từ chối. Lý do: ${normalizedRejectionReason}`;
    await this.createNotificationSafely(content.uploaderId, NotificationType.ContentRejected, message);
    return content;
  }

  async hide(contentId: string) {
    const content = await this.updateStatusGuarded( contentId, PublicationStatus.Published, PublicationStatus.Hidden,);
    await this.createNotificationSafely( content.uploaderId, NotificationType.ContentHidden, `Truyện "${content.title}" đã bị ẩn.`,);
    return content;
  }

  async restore(contentId: string) {
    const content = await this.updateStatusGuarded( contentId, PublicationStatus.Hidden, PublicationStatus.Published,);
    await this.createNotificationSafely( content.uploaderId, NotificationType.ContentRestored, `Truyện "${content.title}" đã được khôi phục.`,);
    return content;
  }

  /** Author/Publisher resubmit sau khi bị Reject */
  async resubmit(contentId: string, uploaderId: string) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) {
      throw new NotFoundException('Không tìm thấy Content');
    }

    // Chỉ người tạo nội dung được gửi lại truyện đang bị từ chối.
    this.contentValidationService.validateResubmitContent(content, uploaderId);

    return this.prisma.content.update({ where: { id: contentId }, data: { publicationStatus: PublicationStatus.PendingApproval, reviewFeedback: null },});
  }

  private async updateStatusGuarded( contentId: string, expectedPublicationStatus: PublicationStatus, nextPublicationStatus: PublicationStatus,
    rejectionReason?: string,) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) {
      throw new NotFoundException('Không tìm thấy Content');
    }

    // Kiểm tra trạng thái hiện tại trước khi chuyển sang trạng thái tiếp theo.
    this.contentValidationService.validateContentStatusTransition(
      content.publicationStatus,
      expectedPublicationStatus,
      nextPublicationStatus,
    );

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
  private async createNotificationSafely(userId: string,notificationType: NotificationType, message: string,) {
    try {
      await this.notificationService.create(userId, notificationType, message);
    } catch (error) {
      console.error('Failed to create notification', error);
    }
  }
}