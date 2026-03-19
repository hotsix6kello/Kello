export type ScheduleStatus = "completed" | "active" | "next" | "future";
export type ItemType = "move" | "activity" | "food" | "beauty" | "stay";
export type TransportMode = "subway" | "bus" | "taxi" | "walk";

export interface TransportDetail {
    mode: TransportMode;
    line?: string; // e.g. "2", "Bundang"
    lineColor?: string;
    startLocation?: string;
    endLocation?: string;
    duration?: string;
    exitInfo?: string; // e.g. "Exit 3"
}

export interface BookingDetail {
    reservationId?: string;
    provider?: string; // e.g. "CatchTable", "Klook"
    status: "confirmed" | "pending" | "canceled";
    ticketUrl?: string; // For QR code modal
}

export interface ItineraryItem {
    id: string;
    type: ItemType;
    time: string;
    endTime?: string;
    title: Record<string, string>; // Multi-language title
    description: Record<string, string>; // Multi-language description
    status: ScheduleStatus;
    location?: string;
    price?: string; // e.g. "35,000 KRW"
    // Use clear separation for details
    transport?: TransportDetail;
    booking?: BookingDetail;
}

export interface Recommendation {
    id: string;
    type: "popup" | "cafe" | "food" | "culture" | "shop";
    title: Record<string, string>;
    description?: Record<string, string>;
    imageColor: string; // Placeholder for image
    location: Record<string, string>;
    rating?: number;
    tags?: string[];
}

// Mock: User is currently moving from Gangnam to Seongsu
export const mockItinerary: ItineraryItem[] = [
    {
        id: "1",
        type: "food",
        time: "09:30",
        endTime: "10:30",
        title: {
            ko: "호텔 조식", en: "Hotel Breakfast", jp: "ホテル朝食", cn: "酒店早餐",
            fr: "Petit-déjeuner à l'hôtel", de: "Hotelfrühstück", es: "Desayuno del Hotel"
        },
        description: {
            ko: "인터컨티넨탈 파르나스", en: "InterContinental Parnas", jp: "インターコンチネンタル", cn: "洲际酒店",
            fr: "InterContinental Parnas", de: "InterContinental Parnas", es: "InterContinental Parnas"
        },
        status: "completed",
        location: "Gangnam",
    },
    {
        id: "2",
        type: "move",
        time: "10:45",
        endTime: "11:15",
        title: {
            ko: "성수로 이동", en: "Move to Seongsu", jp: "ソンスへ移動", cn: "前往圣水",
            fr: "Aller à Seongsu", de: "Nach Seongsu fahren", es: "Ir a Seongsu"
        },
        description: {
            ko: "지하철 2호선 (삼성역 탑승)", en: "Subway Line 2 from Samseong", jp: "地下鉄2号線 (サムソン駅)", cn: "地铁2号线 (三成站)",
            fr: "Métro ligne 2 depuis Samseong", de: "U-Bahn Linie 2 von Samseong", es: "Línea 2 del metro desde Samseong"
        },
        status: "active", // USER IS HERE
        transport: {
            mode: "subway",
            line: "2",
            lineColor: "#3cb44a", // Green Line
            startLocation: "Samseong Stn",
            endLocation: "Seongsu Stn",
            duration: "22m",
            exitInfo: "Exit 3"
        }
    },
    {
        id: "3",
        type: "activity",
        time: "11:30",
        endTime: "13:00",
        title: {
            ko: "탬버린즈 팝업스토어", en: "Tamburins Pop-up", jp: "タンバリンズ ポップアップ", cn: "Tamburins 快闪店",
            fr: "Pop-up Tamburins", de: "Tamburins Pop-up", es: "Pop-up de Tamburins"
        },
        description: {
            ko: "예약 확정 (QR 준비)", en: "Reservation Confirmed", jp: "予約確定", cn: "预订确认",
            fr: "Réservation confirmée", de: "Reservierung bestätigt", es: "Reserva confirmada"
        },
        status: "next",
        location: "Seongsu-dong",
        booking: {
            reservationId: "TB-20231018-001",
            status: "confirmed",
            provider: "Naver Booking"
        }
    },
    {
        id: "4",
        type: "food",
        time: "13:30",
        title: {
            ko: "성수 감자탕", en: "Seongsu Gamjatang", jp: "ソンス カムジャタン", cn: "圣水 土豆汤",
            fr: "Seongsu Gamjatang", de: "Seongsu Gamjatang", es: "Seongsu Gamjatang"
        },
        description: {
            ko: "현지인 맛집 (대기 예상)", en: "Local Favorite (Queue expected)", jp: "地元の名店 (並ぶ可能性あり)", cn: "本地맛집 (预计排队)",
            fr: "Favori local (Attente prévue)", de: "Einheimischer Favorit (Wartezeit erwartet)", es: "Favorito local (Se espera cola)"
        },
        status: "future",
        location: "Seongsu-dong",
        price: "12,000 KRW"
    },
    {
        id: "5",
        type: "beauty",
        time: "15:00",
        title: {
            ko: "제니하우스 헤어 & 메이크업", en: "Jenny House Hair & Makeup", jp: "ジェニーハウス ヘア＆メイク", cn: "Jenny House 发型 & 化妆",
            fr: "Coiffure et Maquillage Jenny House", de: "Jenny House Frisur & Make-up", es: "Peinado y Maquillaje Jenny House"
        },
        description: {
            ko: "K-Pop 아이돌 스타일링", en: "K-Pop Idol Styling", jp: "K-POP アイドルスタイリング", cn: "K-Pop 爱豆造型",
            fr: "Style Idole K-Pop", de: "K-Pop Idol Styling", es: "Estilo de ídolo de K-Pop"
        },
        status: "future",
        location: "Cheongdam-dong",
        booking: {
            reservationId: "JH-99283",
            status: "confirmed",
            provider: "Creatrip"
        },
        price: "150,000 KRW"
    }
];

export const mockRecommendations: Recommendation[] = [
    {
        id: "r1",
        type: "cafe",
        title: {
            ko: "누데이크 성수", en: "Nudake Seongsu", jp: "ヌデイク ソンス", cn: "Nudake 圣水",
            fr: "Nudake Seongsu", de: "Nudake Seongsu", es: "Nudake Seongsu"
        },
        description: {
            ko: "시그니처 피크 케이크", en: "Signature Peak Cake", jp: "シグネチャー ピークケーキ", cn: "招牌 Peak 蛋糕",
            fr: "Gâteau Peak Signature", de: "Signature Peak Kuchen", es: "Pastel Peak Exclusivo"
        },
        imageColor: "#111",
        location: {
            ko: "성수동 카페거리", en: "Seongsu Cafe St.", jp: "ソンス洞 カフェ通り", cn: "圣水洞 咖啡街",
            fr: "Rue des cafés de Seongsu", de: "Seongsu Café-Straße", es: "Calle de Cafés Seongsu"
        },
        rating: 4.8,
        tags: ["Instagrammable", "Dessert"]
    },
    {
        id: "r2",
        type: "popup",
        title: {
            ko: "디올 성수", en: "Dior Seongsu", jp: "ディオール ソンス", cn: "Dior 圣水",
            fr: "Dior Seongsu", de: "Dior Seongsu", es: "Dior Seongsu"
        },
        description: {
            ko: "도슨트 투어 가능", en: "Docent Tour Available", jp: "ドセントツアー可能", cn: "提供导览游",
            fr: "Visite guidée disponible", de: "Dozentenführung verfügbar", es: "Visita guiada disponible"
        },
        imageColor: "#f5f5f5",
        location: {
            ko: "성수역 3번 출구", en: "Seongsu Stn Exit 3", jp: "ソンス駅 3番出口", cn: "圣水站 3号出口",
            fr: "Sortie 3 station Seongsu", de: "Seongsu Station Ausgang 3", es: "Salida 3 estación Seongsu"
        },
        rating: 4.9,
        tags: ["Luxury", "Photo Spot"]
    },
    {
        id: "r3",
        type: "shop",
        title: {
            ko: "아더에러 성수", en: "Ader Error Seongsu", jp: "アーダーエラー ソンス", cn: "Ader Error 圣水",
            fr: "Ader Error Seongsu", de: "Ader Error Seongsu", es: "Ader Error Seongsu"
        },
        description: {
            ko: "우주 테마 전시형 스토어", en: "Space Themed Store", jp: "宇宙テーマ 展示型ストア", cn: "太空主题 展示型商店",
            fr: "Magasin à thème spatial", de: "Weltraum-Themen-Shop", es: "Tienda con temática espacial"
        },
        imageColor: "#0000ff",
        location: {
            ko: "성수동", en: "Seongsu-dong", jp: "ソンス洞", cn: "圣水洞",
            fr: "Seongsu-dong", de: "Seongsu-dong", es: "Seongsu-dong"
        },
        rating: 4.7,
        tags: ["Fashion", "Art"]
    },
];
