
async function test() {
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

  console.log("--- Sending Booking Request ---");
  try {
    const res = await fetch("http://localhost:3000/api/bookings/beauty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    console.log("Status Code:", res.status);
    const data = await res.json();
    console.log("Response Body:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch Error:", err.message);
  }
}

test();
