type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

type RelativeTimeOptions = {
    fallback?: string | null;
    fallbackKey?: string;
};

type DayTimeOptions = {
    separator?: "dot" | "dash";
    fallback?: string;
};

export function titleCase(value: string): string {
    return value
        .split(/[_-\s]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

export function formatRelativeTime(
    t: TranslateFn,
    value?: string | null,
    options: RelativeTimeOptions = {}
): string {
    const fallbackText =
        options.fallback?.trim() ||
        t(options.fallbackKey || "common.states.recently_viewed");

    if (!value) {
        return fallbackText;
    }

    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();

    if (Number.isNaN(diffMs) || diffMs < 0) {
        return fallbackText;
    }

    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) {
        return t("common.runtime.relative.just_now");
    }

    if (diffMinutes < 60) {
        return t("common.runtime.relative.minutes_ago", { count: diffMinutes });
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return t("common.runtime.relative.hours_ago", { count: diffHours });
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
        return t("common.runtime.relative.days_ago", { count: diffDays });
    }

    return new Intl.DateTimeFormat(t("common.locale"), {
        month: "short",
        day: "numeric",
    }).format(date);
}

export function formatTripDayLabel(
    t: TranslateFn,
    day?: number | null,
    fallback?: string
): string {
    if (!day) {
        return fallback || "";
    }

    return t("common.runtime.trip.day_label", { day });
}

export function formatTripDayTimeLabel(
    t: TranslateFn,
    day: number | null | undefined,
    time: string,
    options: DayTimeOptions = {}
): string {
    if (!day) {
        return options.fallback ? `${options.fallback} - ${time}` : time;
    }

    return t(
        options.separator === "dash"
            ? "common.runtime.trip.day_time_dash"
            : "common.runtime.trip.day_time_dot",
        { day, time }
    );
}

export function formatCountLabel(
    t: TranslateFn,
    count: number,
    unit: "comments" | "stops" | "days"
): string {
    return t(`common.runtime.counts.${unit}`, { count });
}

export function formatItineraryStatusLabel(
    t: TranslateFn,
    status: string | null | undefined
): string {
    if (!status) {
        return t("common.states.not_available_yet");
    }

    switch (status) {
        case "in_progress":
            return t("common.states.in_progress");
        case "canceled":
            return t("common.states.canceled");
        case "draft":
            return t("common.states.draft");
        case "confirmed":
        case "submitted":
        case "completed":
        case "unavailable":
            return t(`planner_page.status.${status}`);
        default:
            return t(`planner_page.status.${status}`, {
                defaultValue: titleCase(status),
            });
    }
}
