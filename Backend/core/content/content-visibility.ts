

import { ContentPricingType, OwnershipTier } from '../../common/constants/content.enum';


//1. HẰNG SỐ THỜI GIAN
//khai báo khoảng thời gian gia hạn là 14 ngày
const COMMUNITY_TRANSLATION_GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;
//14 ngày, mỗi ngày 24h , mỗi giờ 60 phút, mỗi phút 60 giây , mỗi giâu 1000mili giây


/////////////////HÀM TIỆN ÍCH GIÚP PHẦN KHÁC BACKEND BIẾT CÓ NÊN HIỂN THỊ TRUYỆN CỘNG ĐỒNG KHÔNG////////////////
//tính toán số ngày còn lại nếu truyện chuyển qua trả phí, quá 14 ngày thì nó tự ẩn
export function isCommunityTranslationVisible(content: {
//hàm nhận vào 2 tham số bao gồm content (thông tin truyện cần kiểm tra)
//
  ownershipTier: string;
  parentContent?: {
    pricingType: string;
    pricingChangedAt: Date | null;
  } | null;
}, now = Date.now()): boolean {

  //kiểm tra phải bản dịch cộng đồng hay không
  if (content.ownershipTier !== OwnershipTier.FanTranslation) {
    return true;
  }
  //kiểm tra có bản gốc bố mẹ hay không
  if (!content.parentContent){
    return false;
  }
  //nếu bản dịch là free, tiếp tục chạy
  if (content.parentContent.pricingType !== ContentPricingType.Paid){
     return true;
  }

  return (
    content.parentContent.pricingChangedAt !== null && //phải có thời điểm thay đổi giá
    content.parentContent.pricingChangedAt.getTime() >=  now - COMMUNITY_TRANSLATION_GRACE_PERIOD_MS
    //thời điểm thay đổi giá phải nằm trong khoảng 14 ngày gần nhất
  );
}
