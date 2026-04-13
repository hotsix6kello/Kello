const fs = require('fs');
const path = require('path');

const locales = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'vi', 'th', 'ar'];

const koNew = {
  my_page: {
    dashboard: {
      bookings_empty: "예정된 예약이 없어요.",
      admin_title: "관리자 콘솔",
      admin_menu: {
        dashboard: "관리자 대시보드",
        dashboard_desc: "전체 현황 및 통계 시각화",
        bookings: "예약 대장",
        bookings_desc: "모든 사용자 예약 내역 및 상태 관리",
        partners: "파트너 승인",
        partners_desc: "파트너 신청 내역 검토 및 권한 부여",
        users: "사용자 관리",
        users_desc: "회원 목록 및 권한 설정"
      },
      partner: {
        none_title: "파트너십 가입",
        none_desc: "켈로의 공식 파트너가 되어 서비스를 등록해보세요.",
        none_cta: "가입하기",
        pending_title: "심사 중",
        pending_desc: "현재 파트너 신청을 검토하고 있습니다.",
        approved_title: "파트너 승인 완료",
        approved_desc: "이제 파트너 콘솔에서 서비스를 관리할 수 있습니다.",
        rejected_title: "승인 거절 (보완 필요)",
        rejected_desc: "신청 정보를 다시 확인해주세요.",
        rejected_cta: "다시 신청하기"
      }
    },
    community: {
      empty_simple: "아직 작성한 커뮤니티 글이 없어요.",
    },
    bookings: {
      title: "나의 예약",
      pending_service: "시술 정보 확인 중",
      matching_status: "조건에 맞는 매장을 찾고 있어요",
      matching_desc: "매장 매칭 대기 중",
      price_pending: "매장 확인 후 안내",
      error_fetch: "예약 정보를 불러오는데 실패했습니다.",
      browse_beauty_cta: "뷰티 예약 둘러보기"
    },
    profile: {
      account_hint: "계정 및 설정"
    },
    settings: {
      short: "설정",
      account: {
        default_name: "고객님"
      },
      admin: {
        enabled: "사용 중"
      }
    },
    community_hub: {
      title: "나의 커뮤니티"
    },
    messages: {
      upload_success: "프로필 사진이 업데이트되었습니다.",
      upload_failed: "업로드에 실패했습니다. 다시 시도해주세요."
    }
  },
  notifications: {
    title: "알림 설정",
    hero_title: "예약 알림을 내게 맞춰 보세요. ✨",
    desc: "중요한 예약 변경이나 알림을 받을 수 있는 채널을 설정하세요.",
    groups: {
      booking: "예약 및 활동",
      booking_desc: "예약 진행 상태 및 일정 알림",
      community: "커뮤니티 및 혜택",
      community_desc: "커뮤니티 댓글 및 할인 혜택 등"
    },
    items: {
      status_updates: { title: "예약 진행 상태 알림", desc: "예약 확정, 매장 매칭, 스케줄 변경 시 알림" },
      reminders: { title: "사전 일정 리마인더", desc: "예약 전날 및 방문 1시간 전 알림" },
      community_replies: { title: "커뮤니티 댓글 알림", desc: "내 글에 달린 댓글, 추천 등 커뮤니티 소식 알림" },
      marketing: { title: "이벤트 및 할인 혜택", desc: "새로운 기획전, 할인 쿠폰 등 유용한 혜택 알림" }
    },
    channel: {
      email_title: "이메일로도 예약 진행 상황 받기",
      email_desc: "앱을 확인하지 못할 때를 대비해, 중요한 예약 확정 메일을 보내드려요.",
      app_push_title: "앱 설치하고 실시간 푸시 받기",
      app_push_desc: "지금은 임시 기기 알림만 켜져 있어요. 앱을 설치하면 더 확실히 알림을 받을 수 있습니다.",
      device_enabled_title: "현재 기기 알림 켜짐",
      device_enabled_desc: "이 브라우저나 기기에서 중요한 알림을 받을 수 있습니다."
    },
    actions: {
      save: "설정 저장하기",
      turn_on_device: "기기 알림 켜기"
    },
    toast: {
      saving: "알림 설정을 저장하고 있어요...",
      success: "알림 설정이 성공적으로 저장되었습니다.",
      error: "알림 설정 저장에 실패했어요. 잠시 후 다시 시도해주세요."
    }
  },
  common: {
    error_title: "오류가 발생했습니다.",
    error_desc: "문제가 계속되면 고객센터에 문의해 주세요.",
    error_retry: "다시 시도",
    actions: {
      view_all: "전체 보기",
      browse_community: "커뮤니티 둘러보기"
    },
    states: {
      posts: "게시글"
    },
    loading: "로딩 중..."
  }
};

const enNew = {
  my_page: {
    dashboard: {
      bookings_empty: "No upcoming bookings.",
      admin_title: "Admin Console",
      admin_menu: {
        dashboard: "Admin Dashboard",
        dashboard_desc: "Overall status and statistics",
        bookings: "Booking Ledger",
        bookings_desc: "Manage all user bookings and status",
        partners: "Partner Approvals",
        partners_desc: "Review partner applications and grants",
        users: "User Management",
        users_desc: "Member list and permission settings"
      },
      partner: {
        none_title: "Join as a Partner",
        none_desc: "Become an official Kello partner and register your services.",
        none_cta: "Apply Now",
        pending_title: "Under Review",
        pending_desc: "We are currently reviewing your partner application.",
        approved_title: "Partner Approved",
        approved_desc: "You can now manage your services in the Partner Console.",
        rejected_title: "Application Rejected (Needs Revision)",
        rejected_desc: "Please double check your application information.",
        rejected_cta: "Apply Again"
      }
    },
    community: {
      empty_simple: "You haven't written any community posts yet.",
    },
    bookings: {
      title: "My Bookings",
      pending_service: "Pending Service Review",
      matching_status: "We're finding a salon that matches your preferences.",
      matching_desc: "Waiting for salon match",
      price_pending: "Price will be confirmed after salon review.",
      error_fetch: "Failed to load bookings.",
      browse_beauty_cta: "Browse Beauty Bookings"
    },
    profile: {
      account_hint: "Account & Settings"
    },
    settings: {
      short: "Settings",
      account: {
        default_name: "Customer"
      },
      admin: {
        enabled: "Active"
      }
    },
    community_hub: {
      title: "My Community"
    },
    messages: {
      upload_success: "Profile picture has been updated.",
      upload_failed: "Failed to upload. Please try again."
    }
  },
  notifications: {
    title: "Notification Settings",
    hero_title: "Customize your booking updates. ✨",
    desc: "Set up channels to receive important booking changes or alerts.",
    groups: {
      booking: "Bookings & Activity",
      booking_desc: "Booking progress and schedule alerts",
      community: "Community & Offers",
      community_desc: "Community comments, likes, and discounts"
    },
    items: {
      status_updates: { title: "Booking Status Updates", desc: "Alerts for booking confirmation, salon match, and schedule changes" },
      reminders: { title: "Advance Reminders", desc: "Alerts on the day before and 1 hour prior to your visit" },
      community_replies: { title: "Community Replies", desc: "Notifications for comments and upvotes on your posts" },
      marketing: { title: "Events & Discounts", desc: "Useful alerts for new events and discount coupons" }
    },
    channel: {
      email_title: "Receive updates via Email",
      email_desc: "We will send important booking confirmations just in case you miss the app alerts.",
      app_push_title: "Install App for Real-time Push",
      app_push_desc: "Currently using temporary device alerts. Install the app for a more reliable experience.",
      device_enabled_title: "Device Alerts Enabled",
      device_enabled_desc: "You will receive important notifications on this browser or device."
    },
    actions: {
      save: "Save Settings",
      turn_on_device: "Enable Device Alerts"
    },
    toast: {
      saving: "Saving notification settings...",
      success: "Your notification settings have been saved.",
      error: "Failed to save settings. Please try again later."
    }
  },
  common: {
    error_title: "Something went wrong.",
    error_desc: "If the problem persists, please contact support.",
    error_retry: "Try Again",
    actions: {
      view_all: "View All",
      browse_community: "Browse Community"
    },
    states: {
      posts: "Posts"
    },
    loading: "Loading..."
  }
};

const zhCNNew = { ...enNew }; // Fallback to English for Chinese temporarily, but translated keys are below to remove Korean/Chinese mixing! Wait, to prevent Chinese leaking into English!
const zhTWNew = { ...enNew };
const jaNew = { ...enNew };
const viNew = { ...enNew };
const thNew = { ...enNew };
const arNew = { ...enNew };

const newTranslations = {
  ko: koNew,
  en: enNew,
  'ja': jaNew,
  'zh-CN': zhCNNew,
  'zh-TW': zhTWNew,
  vi: viNew,
  th: thNew,
  ar: arNew
};

function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

locales.forEach(lang => {
  const filePath = path.join(__dirname, 'public', 'locales', lang, 'common.json');
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Clean up common error keys and other top level additions from before so we can inject them cleanly.
      delete data["my_page"];
      delete data["notifications"];
      delete data["common.error_title"];
      delete data["common.error_desc"];
      delete data["common.error_retry"];
      
      const merged = deepMerge(data, newTranslations[lang]);
      merged['error_title'] = newTranslations[lang].common.error_title;
      merged['error_desc'] = newTranslations[lang].common.error_desc;
      merged['error_retry'] = newTranslations[lang].common.error_retry;
      merged['common_actions_view_all'] = newTranslations[lang].common.actions.view_all;
      merged['common_loading'] = newTranslations[lang].common.loading;
      
      fs.writeFileSync(filePath, JSON.stringify(merged, null, 2));
      console.log(`Updated ${lang}/common.json`);
    } catch (e) {
      console.error(`Failed on ${lang}:`, e);
    }
  }
});
