import type { ItineraryItem } from "@/lib/contexts/TripContext";
import type { ServiceItem } from "@/app/explore/mock/data";

type TranslateFn = (
    key: string,
    options?: { defaultValue?: string; [key: string]: unknown }
) => string;

export type RecommendedPlanItemBase = Pick<
    ItineraryItem,
    "id" | "name" | "time" | "status" | "lat" | "lng" | "day" | "slot" | "type"
> & {
    area: string;
    price: string;
    desc?: string;
};

export type CatalogRecommendedPlanItem = RecommendedPlanItemBase & {
    sourceType: "catalog";
    sourceCatalogId: ServiceItem["id"];
};

export type PlannerRecommendedPlanItem = RecommendedPlanItemBase & {
    sourceType: "planner";
    sourceCatalogId?: undefined;
};

export type RecommendedPlanItem =
    | CatalogRecommendedPlanItem
    | PlannerRecommendedPlanItem;

export interface RecommendedPlan {
    id: string;
    duration: number;
    title: string;
    label: string;
    icon: string;
    items: RecommendedPlanItem[];
}

export function catalogPlanItem(
    item: RecommendedPlanItemBase & { id: ServiceItem["id"] }
): CatalogRecommendedPlanItem {
    return {
        ...item,
        sourceType: "catalog",
        sourceCatalogId: item.id,
    };
}

export function plannerPlanItem(
    item: RecommendedPlanItemBase
): PlannerRecommendedPlanItem {
    return {
        ...item,
        sourceType: "planner",
    };
}

export function isCatalogRecommendedPlanItem(
    item: RecommendedPlanItem
): item is CatalogRecommendedPlanItem {
    return item.sourceType === "catalog";
}

export function isPlannerRecommendedPlanItem(
    item: RecommendedPlanItem
): item is PlannerRecommendedPlanItem {
    return item.sourceType === "planner";
}

export function buildRecommendedPlans(t: TranslateFn): RecommendedPlan[] {
    return [
        {
            id: "plan-2d",
            duration: 2,
            title: t("home.plans.2d.title", {
                defaultValue: "2 Days: Seoul Essential",
            }),
            label: t("home.plans.2d.label", { defaultValue: "2 Days" }),
            icon: "⚡",
            items: [
                plannerPlanItem({
                    id: "p1-1",
                    name: t("explore_items.airport_arrival", {
                        defaultValue: "Incheon Airport Arrival",
                    }),
                    time: "10:00",
                    lat: 37.4602,
                    lng: 126.4407,
                    day: 1,
                    slot: "am",
                    status: "confirmed",
                    type: "attraction",
                    area: "Incheon",
                    price: "0",
                    desc: "Welcome to Korea",
                }),
                plannerPlanItem({
                    id: "p1-2",
                    name: t("explore_items.hotel_checkin", {
                        defaultValue: "Conrad Seoul (Hotel)",
                    }),
                    time: "13:00",
                    lat: 37.5252,
                    lng: 126.9254,
                    day: 1,
                    slot: "pm",
                    status: "confirmed",
                    type: "attraction",
                    area: "Yeouido",
                    price: "300,000",
                    desc: "Luxury stay",
                }),
                catalogPlanItem({
                    id: "f2",
                    name: t("explore_items.f2.title", {
                        defaultValue: "Gold Pig BBQ (Dinner)",
                    }),
                    time: "18:30",
                    lat: 37.554,
                    lng: 127.014,
                    day: 1,
                    slot: "night",
                    status: "draft",
                    type: "food",
                    area: "Yaksu",
                    price: "20,000",
                }),
                catalogPlanItem({
                    id: "a1",
                    name: t("explore_items.a1.title", {
                        defaultValue: "Gyeongbokgung Palace",
                    }),
                    time: "10:00",
                    lat: 37.5796,
                    lng: 126.977,
                    day: 2,
                    slot: "am",
                    status: "draft",
                    type: "attraction",
                    area: "Jongno",
                    price: "3,000",
                }),
                catalogPlanItem({
                    id: "b1",
                    name: t("explore_items.b1.title", {
                        defaultValue: "Jenny House Beauty",
                    }),
                    time: "14:30",
                    lat: 37.524,
                    lng: 127.044,
                    day: 2,
                    slot: "pm",
                    status: "draft",
                    type: "beauty",
                    area: "Cheongdam",
                    price: "150,000",
                }),
            ],
        },
        {
            id: "plan-3d",
            duration: 3,
            title: t("home.plans.3d.title", {
                defaultValue: "3 Days: K-Culture & Style",
            }),
            label: t("home.plans.3d.label", { defaultValue: "3 Days" }),
            icon: "✨",
            items: [
                plannerPlanItem({
                    id: "p2-1",
                    name: t("explore_items.airport_arrival", {
                        defaultValue: "Incheon Airport Arrival",
                    }),
                    time: "09:00",
                    lat: 37.4602,
                    lng: 126.4407,
                    day: 1,
                    slot: "am",
                    status: "confirmed",
                    type: "attraction",
                    area: "Incheon",
                    price: "0",
                }),
                plannerPlanItem({
                    id: "p2-2",
                    name: t("explore_items.hotel_checkin", {
                        defaultValue: "Hotel in Myeongdong",
                    }),
                    time: "12:00",
                    lat: 37.5635,
                    lng: 126.9837,
                    day: 1,
                    slot: "pm",
                    status: "confirmed",
                    type: "attraction",
                    area: "Myeongdong",
                    price: "200,000",
                }),
                catalogPlanItem({
                    id: "f1",
                    name: t("explore_items.f1.title", {
                        defaultValue: "Plant Cafe Seoul",
                    }),
                    time: "14:00",
                    lat: 37.534,
                    lng: 126.994,
                    day: 1,
                    slot: "pm",
                    status: "draft",
                    type: "food",
                    area: "Itaewon",
                    price: "15,000",
                }),
                catalogPlanItem({
                    id: "e2",
                    name: t("explore_items.e2.title", {
                        defaultValue: "Nanta Show Myeongdong",
                    }),
                    time: "17:00",
                    lat: 37.5645,
                    lng: 126.9845,
                    day: 1,
                    slot: "night",
                    status: "draft",
                    type: "event",
                    area: "Myeongdong",
                    price: "40,000",
                }),
                catalogPlanItem({
                    id: "a1",
                    name: t("explore_items.a1.title", {
                        defaultValue: "Gyeongbokgung Palace",
                    }),
                    time: "10:00",
                    lat: 37.5796,
                    lng: 126.977,
                    day: 2,
                    slot: "am",
                    status: "draft",
                    type: "attraction",
                    area: "Jongno",
                    price: "3,000",
                }),
                catalogPlanItem({
                    id: "b2",
                    name: t("explore_items.b2.title", {
                        defaultValue: "PPEUM Clinic Gangnam",
                    }),
                    time: "14:00",
                    lat: 37.498,
                    lng: 127.0276,
                    day: 2,
                    slot: "pm",
                    status: "draft",
                    type: "beauty",
                    area: "Gangnam",
                    price: "50,000",
                }),
                catalogPlanItem({
                    id: "e1",
                    name: t("explore_items.e1.title", {
                        defaultValue: "PSY Water Show",
                    }),
                    time: "19:00",
                    lat: 37.5148,
                    lng: 127.0736,
                    day: 2,
                    slot: "night",
                    status: "draft",
                    type: "event",
                    area: "Jamsil",
                    price: "140,000",
                }),
                catalogPlanItem({
                    id: "a2",
                    name: t("explore_items.a2.title", {
                        defaultValue: "Lotte World Tower",
                    }),
                    time: "11:00",
                    lat: 37.5125,
                    lng: 127.1025,
                    day: 3,
                    slot: "am",
                    status: "draft",
                    type: "attraction",
                    area: "Jamsil",
                    price: "27,000",
                }),
                catalogPlanItem({
                    id: "f3",
                    name: t("explore_items.f3.title", {
                        defaultValue: "Seafood Market",
                    }),
                    time: "14:00",
                    lat: 37.514,
                    lng: 126.924,
                    day: 3,
                    slot: "pm",
                    status: "draft",
                    type: "food",
                    area: "Nampo",
                    price: "40,000",
                }),
            ],
        },
        {
            id: "plan-5d",
            duration: 5,
            title: t("home.plans.5d.title", {
                defaultValue: "5 Days: The Grand Tour",
            }),
            label: t("home.plans.5d.label", { defaultValue: "5 Days" }),
            icon: "🏯",
            items: [
                plannerPlanItem({
                    id: "p3-1",
                    name: t("explore_items.airport_arrival", {
                        defaultValue: "Incheon Airport Arrival",
                    }),
                    time: "10:00",
                    lat: 37.4602,
                    lng: 126.4407,
                    day: 1,
                    slot: "am",
                    status: "confirmed",
                    type: "attraction",
                    area: "Incheon",
                    price: "0",
                }),
                plannerPlanItem({
                    id: "p3-2",
                    name: t("explore_items.hotel_checkin", {
                        defaultValue: "Stay in Hanok Village",
                    }),
                    time: "14:00",
                    lat: 37.5826,
                    lng: 126.9836,
                    day: 1,
                    slot: "pm",
                    status: "confirmed",
                    type: "attraction",
                    area: "Jongno",
                    price: "150,000",
                }),
                catalogPlanItem({
                    id: "a1",
                    name: t("explore_items.a1.title", {
                        defaultValue: "Gyeongbokgung Palace",
                    }),
                    time: "10:00",
                    lat: 37.5796,
                    lng: 126.977,
                    day: 2,
                    slot: "am",
                    status: "draft",
                    type: "attraction",
                    area: "Jongno",
                    price: "3,000",
                }),
                catalogPlanItem({
                    id: "fs1",
                    name: t("explore_items.fs1.title", {
                        defaultValue: "Seoul Lantern Festival",
                    }),
                    time: "19:00",
                    lat: 37.5724,
                    lng: 126.9768,
                    day: 2,
                    slot: "night",
                    status: "draft",
                    type: "festival",
                    area: "Gwanghwamun",
                    price: "Free",
                }),
                catalogPlanItem({
                    id: "b1",
                    name: t("explore_items.b1.title", {
                        defaultValue: "Jenny House Beauty",
                    }),
                    time: "11:00",
                    lat: 37.524,
                    lng: 127.044,
                    day: 3,
                    slot: "am",
                    status: "draft",
                    type: "beauty",
                    area: "Cheongdam",
                    price: "150,000",
                }),
                catalogPlanItem({
                    id: "f2",
                    name: t("explore_items.f2.title", {
                        defaultValue: "Gold Pig BBQ",
                    }),
                    time: "18:00",
                    lat: 37.554,
                    lng: 127.014,
                    day: 3,
                    slot: "night",
                    status: "draft",
                    type: "food",
                    area: "Yaksu",
                    price: "20,000",
                }),
                catalogPlanItem({
                    id: "a2",
                    name: t("explore_items.a2.title", {
                        defaultValue: "Lotte World Tower",
                    }),
                    time: "14:30",
                    lat: 37.5125,
                    lng: 127.1025,
                    day: 4,
                    slot: "pm",
                    status: "draft",
                    type: "attraction",
                    area: "Jamsil",
                    price: "27,000",
                }),
                catalogPlanItem({
                    id: "f1",
                    name: t("explore_items.f1.title", {
                        defaultValue: "Plant Cafe Seoul",
                    }),
                    time: "12:00",
                    lat: 37.534,
                    lng: 126.994,
                    day: 5,
                    slot: "am",
                    status: "draft",
                    type: "food",
                    area: "Itaewon",
                    price: "15,000",
                }),
            ],
        },
    ];
}
