////////////////////////////////PAYMENTSERVICE/////////////////////////////////////////
// PaymentService dùng để quản lý việc tạo đơn nạp tiền,
// cấu hình tài khoản ngân hàng nhận tiền và xử lý tự động webhook từ
// SePay để đối chiếu giao dịch, cộng coin vào ví người dùng.

///////////////////////////////MỤC LỤC CÁC HÀM/////////////////////////////////////////

//1. BANK_SETTING_KEYS: Tập trung các key cấu hình hệ thống ngân hàng trong CSDL (tên ngân hàng, mã BIN, số tài khoản, tên chủ tài khoản).
// SepayEvent: Khai báo cấu trúc dữ liệu của một giao dịch chuyển khoản SePay sau khi đã qua bước phân tích và chuẩn hóa.
// BankSettings: Khai báo định dạng kiểu dữ liệu cho thông tin cấu hình tài khoản ngân hàng nhận tiền.

//2. isUniqueConstraintError(): Kiểm tra lỗi Prisma P2002
// (vi phạm ràng buộc duy nhất), hỗ trợ xử lý trường hợp mã giao dịch hoặc đơn nạp trùng lặp.

//3. isRecord(): Kiểm tra dữ liệu đầu vào có phải là một đối tượng (Object) hợp lệ trước khi phân tích.

//4. asText(): Kiểm tra và chuẩn hóa dữ liệu dạng chuỗi, loại bỏ các khoảng trắng thừa.

//5. parseSepayEvent(): Phân tích payload từ SePay gửi về,
// trích xuất và kiểm tra tính hợp lệ của mã giao dịch, số tiền, nội dung và mã nạp tiền (NM...).

//6. createDeposit(): Tạo đơn nạp tiền mới cho người dùng,
// sinh mã chuyển khoản duy nhất (NM...), tính thời hạn đơn và trả về URL VietQR để thanh toán.

//7. getPaymentOrder(): Lấy chi tiết thông tin đơn nạp tiền của người dùng và kiểm tra đơn đã hết hạn hay chưa.

//8. getBankSettings(): Lấy thông tin tài khoản ngân hàng dùng để nhận tiền thanh toán đã được cấu hình trong hệ thống.

//9. updateBankSettings(): Cập nhật hoặc khởi tạo mới các cấu hình tài khoản ngân hàng nhận tiền vào CSDL thông qua Prisma Transaction.

//10. handleSepayWebhook(): Xử lý webhook từ SePay: kiểm tra trùng lặp,
// lưu giao dịch ngân hàng, đối chiếu đơn nạp, ghi nhận thanh toán thành công,
// cộng coin vào ví và lưu lịch sử biến động số dư.

//11. readBankSettings(): Hàm nội bộ lấy và kiểm tra tính đầy đủ của thông tin
//  cấu hình ngân hàng từ bảng cài đặt hệ thống (systemSetting).

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AssignBankTransactionDto } from './dto/assign-bank-transaction.dto';
import { ConfirmPaymentOrderDto } from './dto/confirm-payment-order.dto';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { QueryAdminBankTransactionsDto } from './dto/query-admin-bank-transactions.dto';
import { UpdateBankSettingsDto } from './dto/update-bank-settings.dto';


// //////4. CÁC BIẾN VÀ CẤU TRÚC HỖ TRỢ/////////
//////// CÁC BIẾN VÀ CẤU TRÚC HỖ TRỢ/////////

//BANK_SETTING_KEYS: NƠI TẬP TRUNG CÁC KEY CÀI ĐẶT NGÂN HÀNG ĐỂ SỬ DỤNG TRONG CODE
//được sử dụng ở updatebanksetting
//đây là 1 object chứa 4 cặp key - value
const BANK_SETTING_KEYS = {
  bankName: 'payment.bankName',
  bankBin: 'payment.bankBin',
  bankAccountNumber: 'payment.bankAccountNumber',
  bankAccountName: 'payment.bankAccountName',
} as const;

//BankSettings: Đặt tên kiểu dữ liệu cho thông tin ngân hàng
//dòng này không cần thiết . sửa lại trong code dùng 1 tên thôi
type BankSettings = UpdateBankSettingsDto;

//SepayEvent: Quy định cấu trúc dữ liệu giao dịch sau khi phân tích
//tác dụng: được hàm parsesepayevent dùng để định nghĩa dự liệu được trả về
interface SepayEvent {
  externalId: string;
  transferType: string;
  transferAmount: number;
  description: string;
  rawPayload: string;
  transferCode: string | null;
  accountNumber: string | null;
}

//isUniqueConstraintError(): Nhận diện lỗi vi phạm ràng buộc duy nhất của Prisma
//Kiểm tra lỗi Prisma P2002, chẳng hạn lỗi trùng mã giao dịch
function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

// //////2. LUỒNG NHẬN VÀ XỬ LÝ WEBHOOK SEPAY/////////

//isRecord(): Kiểm tra payload có phải object hợp lệ để xử lý không
function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object') {
    return false;
  }

  if (value === null) {
    return false;
  }

  if (Array.isArray(value)) {
    return false;
  }

  return true;
}

//asText(): Kiểm tra giá trị có phải chuỗi không rỗng và loại bỏ khoảng trắng
function asText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return trimmedValue;
}

//parseSepayEvent(): Phân tích payload, lấy mã giao dịch, số tiền, nội dung chuyển khoản
//Lưu ý: isRecord() và asText() được gọi bên trong parseSepayEvent()
function parseSepayEvent(payload: unknown): SepayEvent | null {
  if (!isRecord(payload)) {
    return null;
  }

  //BƯỚC 1: lấy mã giao dịch từ payload.id , chuyển nó thành chuỗi hợp lệ
  //loại bỏ các trường hợp điền sai và chuẩn hóa dữ liệu nhập vào

    const rawId = payload.id;
    let externalId: string | null = null;

    //xác định nó phải là chuỗi , cắt khoảng trống
    if (typeof rawId === 'string') {
      const trimmedId = rawId.trim();
      //lưu id lại
      if (trimmedId !== '') {
        externalId = trimmedId;
      }
      // và kiểm tra số nguyên an toàn và không âm
    } else if (typeof rawId === 'number') {
      if (Number.isSafeInteger(rawId) && rawId >= 0) {
        externalId = String(rawId);
      }
    }
  //BƯỚC 2: lấy số tiền và loại giao dịch
  const amount = payload.transferAmount;
  const transferType = asText(payload.transferType)?.toLowerCase();


  //BƯỚC 3: KIỂM TRA DỮ LIỆU TRƯỚC KHI XỬ LÝ TIẾP
  if (
    !externalId || //không có mã giao dịch hợp lệ
    externalId.length > 100 || //mã giao dịch kéo dài quá 100 kí tự
    typeof amount !== 'number' || //số tiền không phải kiêu số
    !Number.isSafeInteger(amount) || //số tiền không phải số nguyên an toàn
    amount < 0 || //số tiền nhỏ hơn 0
    amount > 2_147_483_647 || //số tiên lớn quá mức quy định
    !transferType
  ) {
    return null;
  }

  //BƯỚC 4: GOM CÁC TRƯỜNG NỘI DUNG CHUYỂN KHOẢN
  const textFields = [payload.code, payload.content, payload.description].map(asText)
  //map lại các trường nội dung thành mảng text

  .filter((value): value is string => value !== null);
  //giữ lại các phần tử đáp ứn đủ điều kiện


  const description = textFields.join(' | '); //ngăn cách các phần tử thành 1 chuỗi ngăn bằng |
  //vd description = 'NM12345678 | Thanh toan don hang';

  //tìm mã đơn chuyển khoản trong description , tách chúng ra lưu vào biến
  const transferCode = description.match(/(?:^|[^A-Z0-9])(NM[A-F0-9]{8})(?:$|[^A-Z0-9])/i,)?.[1]?.toUpperCase();
  const accountNumber = asText(payload.accountNumber);

  return {
    externalId,
    transferType,
    transferAmount: amount,
    description,
    rawPayload: JSON.stringify(payload),
    transferCode: transferCode ?? null,
    accountNumber,
  };
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly prisma: PrismaService) {}



  ///////////////////NGƯỜI DÙNG DÙNG TẠO ĐƠN NẠP TIỀN/////////////////////////////
  async createDeposit(userId: string, dto: CreateDepositDto) {

    //BƯỚC 1: KIỂM TRA THÔNG TIN NGÂN HÀNG NHẬN TIỀN ĐÃ ĐƯỢC CẤU HÌNH

    const settings = await this.readBankSettings();
    //gọi hàm readBankSetting để kiểm tra xem thông tin nhận tiền đã đầy đủ

    //nếu biến setting không tồn tại -> chạy hàm if từ chối
    if (!settings) {
      throw new ServiceUnavailableException(
        'Thông tin tài khoản nhận tiền chưa được cấu hình',
      );
    }
    //BƯỚC 2: TẠO MÃ QR VÀ LƯU THÔNG TIN THANH TOÁN VÀO TRONG DB


    for (let attempt = 0; attempt < 3; attempt += 1) {
    //Để attemp bằng 0, tăng 1 lần mỗi vòng, miễn là nhỏ hơn 3
    //cần chạy 3 lần để đảm bảo là mã không bị trùng


      const transferCode = `NM${randomBytes(4).toString('hex').toUpperCase()}`;
      //tạo mã chuyển khoản


      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); //mỗi 30 phút có 60 giây ,mỗi giây có 1000 mili giây
      //tạo thời hạn cho đơn nạp tiền


      // tạo bản ghi trong database
      //+ thông tin số tiền của người dùng và thông tin của người được nhận
      try {
        const order = await this.prisma.paymentOrder.create({
          data: {
            userId,
            expectedAmount: dto.amountVnd,
            transferCode,
            bankBin: settings.bankBin,
            bankName: settings.bankName,
            bankAccountNumber: settings.bankAccountNumber,
            bankAccountName: settings.bankAccountName,
            expiresAt,
          },
        });

        //trả dữ liệu cho frontend

        return {
          id: order.id,
          expectedAmount: order.expectedAmount,
          expectedCoins: order.expectedAmount / 1000,
          status: order.status,
          transferCode: order.transferCode,
          bankName: order.bankName,
          bankAccountNumber: order.bankAccountNumber,
          bankAccountName: order.bankAccountName,
          qrUrl: this.createQrUrl(order),
          expiresAt: order.expiresAt,
        };
      } catch (error) {

        //kiểm tra xem bị trùng ở các phần unique không , nếu bị trùng thì đổi sang lần 2
        if (!isUniqueConstraintError(error) || attempt === 2) {
          throw error;
        }
      }
    }

    throw new ConflictException('Không thể tạo mã chuyển khoản duy nhất');
  }



  //////////////////LẤY THÔNG TIN THANH TOÁN////////////////////////
  async getPaymentOrder(userId: string, paymentOrderId: string) {
    const order = await this.prisma.paymentOrder.findFirst({
      where: { id: paymentOrderId, userId },
      select: {
        id: true,
        expectedAmount: true,
        paidAmount: true,
        paidCoins: true,
        status: true,
        transferCode: true,
        expiresAt: true,
        paidAt: true,
        createdAt: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy yêu cầu nạp tiền');
    }

    return {
      ...order,
      isExpired:
        order.status === 'Pending' && order.expiresAt.getTime() < Date.now(),
    };
  }

  //////////////////LẤY THÔNG TIN TÀI KHOẢN NGÂN HÀNG NHẬN TIỀN////////////////////////
  async getBankSettings() {
    const settings = await this.readBankSettings();
    return {
      configured: settings !== null,
      bankName: settings?.bankName ?? null,
      bankBin: settings?.bankBin ?? null,
      bankAccountNumber: settings?.bankAccountNumber ?? null,
      bankAccountName: settings?.bankAccountName ?? null,
    };
  }


  ////////////////SỬA LẠI THÔNG TIN TÀI KHOẢN NGÂN HÀNG NHẬN TIỀN//////////////////////////
  async updateBankSettings(dto: UpdateBankSettingsDto) {

    //BƯỚC 1: TẠO 1 MẢNG LƯU CÁC CẶP GIÁ TRỊ

    //mảng entries gán từng giá trị trong dto vào trong BANK_SETTING_KEYS
    //mục đích: gom 4 cặp khóa giá trị thành 1 mảng để có thể xử lý bằng vòng lặp
    //vd bankname key có value là dto.bankname
    const entries = [
      [BANK_SETTING_KEYS.bankName, dto.bankName],
      [BANK_SETTING_KEYS.bankBin, dto.bankBin],
      [BANK_SETTING_KEYS.bankAccountNumber, dto.bankAccountNumber],
      [BANK_SETTING_KEYS.bankAccountName, dto.bankAccountName],
    ] as const;


    ///////////////////BƯỚC 2: DUYỆT QUA CÁC CẶP GIÁ TRỊ ĐỂ UPDATE HOẶC THÊM MỚI/////////////
    await this.prisma.$transaction(
      entries.map(([key, value]) => //duyệt qua từng mảng
      //từ mảng [bankname, Mbbank] theo dạng key value -> key = 'bankname' ; value 'MB Bank'

      //upsert: nếu bản ghi đã tồn tại thì update, không thì tạo mới
        this.prisma.systemSetting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );

    return this.getBankSettings();
  }

  async getAdminPaymentOrders(page: number, limit: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.paymentOrder.findMany({
        where: { status: 'Pending' },
        select: {
          id: true,
          userId: true,
          expectedAmount: true,
          transferCode: true,
          bankName: true,
          bankAccountNumber: true,
          expiresAt: true,
          createdAt: true,
          user: {
            select: { username: true, email: true },
          },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.paymentOrder.count({ where: { status: 'Pending' } }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAdminBankTransactions(query: QueryAdminBankTransactionsDto) {
    const page = query.page;
    const limit = query.limit;
    let statuses = ['Unmatched', 'NeedsReview', 'WrongAccount', 'OrderAlreadyPaid'];
    if (query.status) {
      statuses = [query.status];
    }
    const where: Prisma.BankTransactionWhereInput = {
      processingStatus: { in: statuses },
      transferType: 'in',
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.bankTransaction.findMany({
        where,
        select: {
          id: true,
          externalId: true,
          paymentOrderId: true,
          transferAmount: true,
          destinationAccountNumber: true,
          description: true,
          processingStatus: true,
          adminNote: true,
          receivedAt: true,
          paymentOrder: {
            select: {
              id: true,
              status: true,
              expectedAmount: true,
              user: {
                select: { id: true, username: true, email: true },
              },
            },
          },
        },
        orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.bankTransaction.count({ where }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async assignBankTransaction(
    adminId: string,
    bankTransactionId: string,
    dto: AssignBankTransactionDto,
  ) {
    const reason = dto.reason.trim();
    if (reason.length < 3) {
      throw new BadRequestException('Vui lòng nhập lý do đối soát hợp lệ');
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const bankTransaction = await tx.bankTransaction.findUnique({
            where: { id: bankTransactionId },
          });

          if (!bankTransaction) {
            throw new NotFoundException('Không tìm thấy giao dịch ngân hàng');
          }

          if (
            bankTransaction.transferType !== 'in' ||
            bankTransaction.processingStatus !== 'Unmatched' ||
            bankTransaction.paymentOrderId !== null
          ) {
            throw new ConflictException(
              'Chỉ giao dịch tiền vào chưa khớp mới được gán vào đơn nạp',
            );
          }

          const paymentOrder = await tx.paymentOrder.findUnique({
            where: { id: dto.paymentOrderId },
          });

          if (!paymentOrder) {
            throw new NotFoundException('Không tìm thấy đơn nạp tiền');
          }

          if (
            bankTransaction.destinationAccountNumber !== null &&
            bankTransaction.destinationAccountNumber !==
              paymentOrder.bankAccountNumber
          ) {
            throw new BadRequestException(
              'Giao dịch được chuyển vào tài khoản ngân hàng khác với đơn nạp',
            );
          }

          if (
            bankTransaction.transferAmount <= 0 ||
            bankTransaction.transferAmount % 1_000 !== 0
          ) {
            throw new BadRequestException(
              'Số tiền giao dịch chưa thể quy đổi chính xác thành coin',
            );
          }

          if (paymentOrder.status !== 'Pending') {
            await tx.bankTransaction.update({
              where: { id: bankTransaction.id },
              data: {
                paymentOrderId: paymentOrder.id,
                processingStatus: 'OrderAlreadyPaid',
                processedById: adminId,
                adminNote: reason,
              },
            });

            return {
              success: true,
              creditedCoins: 0,
              processingStatus: 'OrderAlreadyPaid',
            };
          }

          await tx.bankTransaction.update({
            where: { id: bankTransaction.id },
            data: {
              paymentOrderId: paymentOrder.id,
              processingStatus: 'Received',
              processedById: adminId,
              adminNote: reason,
            },
          });

          return this.applyConfirmedDeposit(
            tx,
            paymentOrder,
            bankTransaction.id,
            bankTransaction.externalId,
            bankTransaction.transferAmount,
            `Admin matched bank transaction ${bankTransaction.externalId} to order ${paymentOrder.id}`,
          );
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Mã giao dịch ngân hàng đã được sử dụng',
        );
      }

      throw error;
    }
  }

  async confirmPaymentOrderManually(
    adminId: string,
    paymentOrderId: string,
    dto: ConfirmPaymentOrderDto,
  ) {
    const externalId = dto.externalId.trim();
    const reason = dto.reason.trim();

    if (!externalId || externalId.length > 100) {
      throw new BadRequestException('Mã giao dịch ngân hàng không hợp lệ');
    }

    if (reason.length < 3) {
      throw new BadRequestException('Vui lòng nhập lý do xác nhận hợp lệ');
    }

    if (
      !Number.isSafeInteger(dto.paidAmount) ||
      dto.paidAmount <= 0 ||
      dto.paidAmount % 1_000 !== 0
    ) {
      throw new BadRequestException(
        'Số tiền xác nhận phải là số nguyên dương chia hết cho 1.000 đồng',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const paymentOrder = await tx.paymentOrder.findUnique({
            where: { id: paymentOrderId },
          });

          if (!paymentOrder) {
            throw new NotFoundException('Không tìm thấy đơn nạp tiền');
          }

          if (paymentOrder.status !== 'Pending') {
            throw new ConflictException(
              'Đơn nạp tiền không còn ở trạng thái chờ thanh toán',
            );
          }

          const existingTransaction = await tx.bankTransaction.findUnique({
            where: { externalId },
            select: { id: true, processingStatus: true },
          });

          if (existingTransaction) {
            throw new ConflictException(
              `Giao dịch ngân hàng đã tồn tại với trạng thái ${existingTransaction.processingStatus}`,
            );
          }

          const bankTransaction = await tx.bankTransaction.create({
            data: {
              externalId,
              paymentOrderId: paymentOrder.id,
              transferType: 'in',
              transferAmount: dto.paidAmount,
              destinationAccountNumber: paymentOrder.bankAccountNumber,
              description: `Manual payment confirmation for order ${paymentOrder.id}`,
              rawPayload: JSON.stringify({
                source: 'admin_manual_confirmation',
                adminId,
                reason,
              }),
              processingStatus: 'Received',
              processedById: adminId,
              adminNote: reason,
            },
          });

          return this.applyConfirmedDeposit(
            tx,
            paymentOrder,
            bankTransaction.id,
            externalId,
            dto.paidAmount,
            `Admin manually confirmed bank transaction ${externalId} for order ${paymentOrder.id}`,
          );
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Mã giao dịch ngân hàng đã được sử dụng',
        );
      }

      throw error;
    }
  }



  ///////////////////HÀM XỬ LÝ WEBHOOK: GHI NHẬN GIAO DỊCH VÀ CỘNG COIN///////////////////

  //LƯU Ý: đơn nạp tiền là yêu cầu người dùng
  //còn giao dịch ngân hàng là sự kiện chuyển tiền xảy ra từ ngân hàng

  // BƯỚC 1–4: Kiểm tra và phân tích dữ liệu webhook SePay gửi lên
  // BƯỚC 5: Lưu lịch sử giao dịch ngân hàng vào database
  // BƯỚC 6–7: Tìm đơn nạp tiền tương ứng, cập nhật trạng thái đơn và xác nhận đơn chưa được xử lý trước đó
  // BƯỚC 8–9: Cộng coin vào ví người dùng và lưu lịch sử biến động số dư

  async handleSepayWebhook(payload: unknown) {

    //payload: dữ liệu SePay gửi đến API webhook
    //unknow: typescript chưa cho phép dữ liệu nhận vào có cấu trúc chính xác


    //BƯỚC 1: NHẬN VÀ KIỂM TRA DỮ LIỆU WEBHOOK
    const event = parseSepayEvent(payload);
    //hàm kiểm tra và phân tích dữ liệu , trả về thông tin giao dịch

    //nếu không hợp lệ thì báo lỗi
    if (!event) {
      this.logger.warn('Ignored malformed SePay webhook payload');
      return { success: true, ignored: true };
    }

    //BƯỚC 2: KIỂM TRA GIAO DỊCH ĐÃ TỒN TẠI CHƯA

    //2.1: kiểm tra lần 1 (tránh việc thông tin đã được tạo trước)
    const existing = await this.prisma.bankTransaction.findUnique({where: { externalId: event.externalId },
      select: { processingStatus: true },
    });

    //nếu đã tồn tại, trả lại
    if (existing) {
      return {
        success: true,
        duplicate: true,
        processingStatus: existing.processingStatus,
      };
    }

    //2.2: kiểm tra lần 2  (tránh việc thông tin nó bị duplicate khi xử lý đồng thời với cái khác)
    //giúp tránh tiến trình khác đang xử lý đồng thời (cùng bị trùng)
    try {
      return await this.prisma.$transaction(async (tx) => {
        //tx: đối tượng Prisma dùng để thực hiện truy vấn nằm trong transaction đó

        const duplicate = await tx.bankTransaction.findUnique({
          where: { externalId: event.externalId },
          select: { processingStatus: true },
        });

        if (duplicate) {
          return {
            success: true,
            duplicate: true,
            processingStatus: duplicate.processingStatus,
          };
        }
        //BƯỚC 3: KIỂM TRA XEM GIAO DỊCH CÓ VÀI CHUYỂN TIỀN VÀO VÀ CÓ MÃ CHUYỂN KHOẢN HAY KHÔNG

        //? và : tương đương với if và else
        const order = event.transferType === 'in' && event.transferCode
          //điều kiện (giống như điều kiện if else)
          //trasfertype = in : giao dịch tiền vào
          //và giao dịch có mã chuyển khoản để đối chiếu
          // (kiểu trong bảng nó có cột là transferocde , tương tự với transfer type)

             ? await tx.paymentOrder.findUnique({where: { transferCode: event.transferCode }})
            //tìm đơn nạp tiền có mã transfercode tương ứng, nếu có thì lưu lại vào order

            : null;
            //nếu không có thì order ==null


        //BƯỚC 4: XÁC ĐỊNH PROCESSINGSTATUS


        let processingStatus = 'Ignored';
        if (event.transferType === 'in') {
          processingStatus = 'Unmatched';
        }
        //giao dịch tiền vào mặc địch là unmantched
        //nếu là giao dịch tiền khác kiểu ra thì ignored

        //nếu số tiền không chia hết cho 1000 thì cần review lại
        if (
          order &&
          event.accountNumber !== null &&
          event.accountNumber !== order.bankAccountNumber
        ) {
          processingStatus = 'WrongAccount';
        } else if (order && event.transferAmount % 1000 !== 0) {
          processingStatus = 'NeedsReview';

        //nếu số tiền bằng 0 thì cần review lại (không hợp lệ để nạp)
        } else if (order && event.transferAmount === 0) {
          processingStatus = 'NeedsReview';

        //có đơn và trạng thái không phải pending ,
        //đơn không còn chờ thanh toán vì thanh toán thành công
        } else if (order && order.status !== 'Pending') {
          processingStatus = 'OrderAlreadyPaid';

        //thỏa mãn được tất cả các điều kiện trene
        //đã nhận giao dịch và chuyển sang bước tiếp theo
        } else if (order) {
          processingStatus = 'Received';
        }


        //BƯỚC 5: TẠO BẢN GHI VỀ GIAO DỊCH CHO VIỆC TRA CỨU VÀ ĐỐI CHIẾU SAU NÀY (LỊCH SỬ )
        const bankTransaction = await tx.bankTransaction.create({
          data: {
            externalId: event.externalId, //id của giao dịch
            paymentOrderId: order?.id, //liên kết với đơn nạp tiền nếu tìm thấy đơn
            transferType: event.transferType,
            transferAmount: event.transferAmount, //số tiền chuyển khoản
            destinationAccountNumber: event.accountNumber,
            description: event.description,
            rawPayload: event.rawPayload, //lưu dữ liệu webhook gốc (để kiểm tra lỗi)
            processingStatus, //trạng thái vừa xác định ở bước 4
          },
        });



        //BƯỚC 6: KIỂM TRA VÀ CHUYỂN ĐỔI TIỀN THÀNH XU


        //nếu không tìm thấy đơn nạp tiền (order) hoặc processing status khác recevied
        if (!order || processingStatus !== 'Received') {
          return {
            success: true,
            ignored: processingStatus !== 'Received',
            processingStatus,
          };
        }


        //chuyển số tiền người dùng nạp vào thành coin
        //vd 50.000 % 1000 = 500
        //lưu thời điểm thanh toán được ghi nhận
        //BƯỚC 7: KIỂM TRA ĐƠN NẠP TIỀN ĐÃ ĐƯỢC THANH TOÁN HAY CHƯA
        //đảm bảo đơn nạp tiền chỉ ghi nhận thanh toán 1 lần
        //trong trường hợp không cập nhật được
        //đổi trạng thái giao địch sang orderalreadypaid
        //không thực hiện + xu
        //BƯỚC 8: CỘNG XU VÀO VÍ
        //cộng xu vào ví bằng upsert
        //nếu ví chưa tồn tại thì tạo không thì cập nhật ví
        //BƯỚC 9: GHI LỊCH SỬ THAY ĐỔI SỐ DƯ VÀO WALLETLEDGER
        //BƯỚC 10: ĐÁNH DẤU GIAO DỊCH ĐÃ ĐƯỢC THỰC HIỆN THÀNH CÔNG
        return this.applyConfirmedDeposit(
          tx,
          order,
          bankTransaction.id,
          event.externalId,
          event.transferAmount,
          `SePay deposit for order ${order.id}`,
        );
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const duplicate = await this.prisma.bankTransaction.findUnique({
          where: { externalId: event.externalId },
          select: { processingStatus: true },
        });
        if (duplicate) {
          return {
            success: true,
            duplicate: true,
            processingStatus: duplicate.processingStatus,
          };
        }
      }
      throw error;
    }
  }

  private async applyConfirmedDeposit(
    tx: Prisma.TransactionClient,
    paymentOrder: { id: string; userId: string },
    bankTransactionId: string,
    externalId: string,
    paidAmount: number,
    description: string,
  ) {
    if (
      !Number.isSafeInteger(paidAmount) ||
      paidAmount <= 0 ||
      paidAmount % 1_000 !== 0
    ) {
      throw new BadRequestException(
        'Số tiền xác nhận phải là số nguyên dương chia hết cho 1.000 đồng',
      );
    }

    const paidCoins = paidAmount / 1_000;
    const paymentClaim = await tx.paymentOrder.updateMany({
      where: { id: paymentOrder.id, status: 'Pending' },
      data: {
        status: 'Paid',
        paidAmount,
        paidCoins,
        paidAt: new Date(),
      },
    });

    if (paymentClaim.count !== 1) {
      await tx.bankTransaction.update({
        where: { id: bankTransactionId },
        data: { processingStatus: 'OrderAlreadyPaid' },
      });

      return {
        success: true,
        ignored: true,
        processingStatus: 'OrderAlreadyPaid',
      };
    }

    const wallet = await tx.wallet.upsert({
      where: { userId: paymentOrder.userId },
      create: {
        userId: paymentOrder.userId,
        balance: paidCoins,
      },
      update: {
        balance: { increment: paidCoins },
      },
    });

    await tx.walletLedger.create({
      data: {
        walletId: wallet.id,
        userId: paymentOrder.userId,
        amountCoins: paidCoins,
        balanceAfter: wallet.balance,
        transactionType: 'Deposit',
        sourceType: 'Payment',
        sourceReference: externalId,
        description,
      },
    });

    await tx.bankTransaction.update({
      where: { id: bankTransactionId },
      data: { processingStatus: 'Applied' },
    });

    return {
      success: true,
      creditedCoins: paidCoins,
      paidAmount,
    };
  }


    ////////////////lấy thông tin tài khoản đã được cấu hình sẵn trong database///////////////
    private async readBankSettings(): Promise<BankSettings | null> {

      //BƯỚC 1: lấy thông tin ngân hàng từ database
      const rows = await this.prisma.systemSetting.findMany({
        where: { key: { in: Object.values(BANK_SETTING_KEYS) } },
      });

      //BƯỚC 2: chuyển dữ liệu được trả về thành dạng map key-value (cho dễ tìm kiếm ở buốc 3)
      const values = new Map(rows.map(({ key, value }) => [key, value]));

      //BƯỚC 3: lấy thông tin từng ngân hàng
      const bankName = values.get(BANK_SETTING_KEYS.bankName);
      const bankBin = values.get(BANK_SETTING_KEYS.bankBin);
      const bankAccountNumber = values.get(BANK_SETTING_KEYS.bankAccountNumber,);
      const bankAccountName = values.get(BANK_SETTING_KEYS.bankAccountName);

      //nếu lỗi gì đó thì trả vveef null
      if (!bankName || !bankBin || !bankAccountNumber || !bankAccountName) {
        return null;
      }

      return { bankName, bankBin, bankAccountNumber, bankAccountName };
    }
  ///////////////////////TẠO MÃ QR////////////////////////////
  private createQrUrl(order: {
    bankBin: string;
    bankAccountNumber: string;
    bankAccountName: string;
    expectedAmount: number;
    transferCode: string;
  }) {
    const query = new URLSearchParams({
      amount: String(order.expectedAmount),
      addInfo: order.transferCode,
      accountName: order.bankAccountName,
    });
    return `https://img.vietqr.io/image/${encodeURIComponent(order.bankBin)}-${encodeURIComponent(order.bankAccountNumber)}-compact2.png?${query.toString()}`;
  }
}
