import { ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { UpdateBankSettingsDto } from './dto/update-bank-settings.dto';


// //////4. CÁC BIẾN VÀ CẤU TRÚC HỖ TRỢ/////////

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

  return {
    externalId,
    transferType,
    transferAmount: amount,
    description,
    rawPayload: JSON.stringify(payload),
    transferCode: transferCode ?? null,
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


        let processingStatus = event.transferType === 'in' ? 'Unmatched' : 'Ignored';
        //giao dịch tiền vào mặc địch là unmantched
        //nếu là giao dịch tiền khác kiểu ra thì ignored

        //nếu số tiền không chia hết cho 1000 thì cần review lại 
        if (order && event.transferAmount % 1000 !== 0) {
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
        const paidCoins = event.transferAmount / 1000; 

        //lưu thời điểm thanh toán được ghi nhận 
        const paidAt = new Date();

        //BƯỚC 7: KIỂM TRA ĐƠN NẠP TIỀN ĐÃ ĐƯỢC THANH TOÁN HAY CHƯA 
        //đảm bảo đơn nạp tiền chỉ ghi nhận thanh toán 1 lần 


        const paymentClaim = await tx.paymentOrder.updateMany({
          where: { id: order.id, status: 'Pending' },
          //cập nhật đơn theo điều kiện id và phải pending
           
          //LƯU Ý: bình thường update chỉ cho tìm theo id thôi 
          //nhưng update cho phép tìm theo nhiều điều kiện hơn update thường



          data: {
            status: 'Paid',
            paidAmount: event.transferAmount,
            paidCoins,
            paidAt,
          },
        });
        

        //trong trường hợp không cập nhật được 
        //đổi trạng thái giao địch sang orderalreadypaid 
        //không thực hiện + xu 
        if (paymentClaim.count === 0) { //nếu không đoạn code nào được cập nhật , trả lại thì chạy if
          await tx.bankTransaction.update({
            where: { id: bankTransaction.id },
            data: { processingStatus: 'OrderAlreadyPaid' },
          });
          return {
            success: true,
            ignored: true,
            processingStatus: 'OrderAlreadyPaid',
          };
        }


        //BƯỚC 8: CỘNG XU VÀO VÍ 

        //cộng xu vào ví bằng upsert
        //nếu ví chưa tồn tại thì tạo không thì cập nhật ví 
        const wallet = await tx.wallet.upsert({
          where: { userId: order.userId },
          create: {
            userId: order.userId,
            balance: paidCoins,
          },
          update: {
            balance: { increment: paidCoins },
          },
        });

        //BƯỚC 9: GHI LỊCH SỬ THAY ĐỔI SỐ DƯ VÀO WALLETLEDGER

        await tx.walletLedger.create({
          data: {
            walletId: wallet.id,
            userId: order.userId,
            amountCoins: paidCoins,
            balanceAfter: wallet.balance,
            transactionType: 'Deposit',
            sourceType: 'Payment',
            sourceReference: event.externalId,
            description: `SePay deposit for order ${order.id}`,
          },
        });

        //BƯỚC 10: ĐÁNH DẤU GIAO DỊCH ĐÃ ĐƯỢC THỰC HIỆN THÀNH CÔNG 
        await tx.bankTransaction.update({
          where: { id: bankTransaction.id },
          data: { processingStatus: 'Applied' },
        });

        return {
          success: true,
          creditedCoins: paidCoins,
          paidAmount: event.transferAmount,
        };
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
