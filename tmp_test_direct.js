
const { createBeautyBookingRequest } = require('./src/lib/bookings/beautyBookingServer.ts');

async function runTest() {
  const payload = {
    category: "beauty",
    beautyCategory: "hair",
    region: "gangnam",
    storeId: "beauty_hair_1",
    storeName: "헤어살롱 강남",
    bookingDate: "2026-04-01",
    bookingTime: "14:30",
    designerId: "designer_hair_1",
    designerName: "지우 원장",
    primaryServiceId: "cut_woman",
    primaryServiceName: "여성 컷",
    addOnIds: ["shampoo"],
    addOnNames: ["두피 스케일링"],
    priceSummary: {
      basePrice: 35000,
      addOnPrice: 15000,
      designerSurcharge: 5000,
      totalPrice: 55000
    },
    customer: {
      name: "테스트 유저",
      email: "test@example.com",
      phone: "+8201012345678",
      request: "잘 부탁드립니다.",
      snsId: "@test_sns",
      imageUrls: []
    },
    communication: {
      language: "ko",
      intent: "booking_confirm",
      messages: {
         korean: "결제 완료되었습니다.",
         localized: "Payment confirmed."
      }
    },
    agreements: {
      bookingConfirmed: true,
      privacyConsent: true
    },
    createdFrom: {
      flow: "beauty-explore"
    }
  };

  console.log("--- Executing createBeautyBookingRequest Directly ---");
  try {
    const result = await createBeautyBookingRequest(payload, null);
    console.log("Success! Result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Execution Failed:", err.message);
    if (err.details) console.error("Details:", JSON.stringify(err.details, null, 2));
  }
}

runTest();
