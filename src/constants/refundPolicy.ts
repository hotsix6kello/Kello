export const REFUND_POLICY = [
  { daysBeforeAppointment: 4, refundRate: 100, label_ko: "예약일 4일 전까지", label_en: "4+ days before appointment" },
  { daysBeforeAppointment: 3, refundRate: 80,  label_ko: "예약일 3일 전",     label_en: "3 days before appointment" },
  { daysBeforeAppointment: 2, refundRate: 60,  label_ko: "예약일 2일 전",     label_en: "2 days before appointment" },
  { daysBeforeAppointment: 1, refundRate: 0,   label_ko: "예약일 1일 전",     label_en: "1 day before appointment" },
  { daysBeforeAppointment: 0, refundRate: 0,   label_ko: "당일 / No-show",   label_en: "Same day / No-show" },
] as const;

export const PLATFORM_FEE_RATE = 0.10;
export const PLATFORM_FEE_REFUNDABLE = false;

export function getRefundRate(daysBeforeAppointment: number): number {
  const tier = REFUND_POLICY.find(p => p.daysBeforeAppointment === daysBeforeAppointment);
  if (tier) return tier.refundRate;
  return daysBeforeAppointment >= 4 ? 100 : 0;
}
