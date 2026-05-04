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

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKSTDateOnly(d: Date): Date {
  const kst = new Date(d.getTime() + KST_OFFSET_MS);
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
}

export type RefundCalculation = {
  daysUntil: number;
  refundRate: number;
  refundAmount: number;
  penaltyAmount: number;
  platformFee: number;
  totalDeducted: number;
  totalRefund: number;
  isRefundable: boolean;
};

export function calculateRefund(input: {
  appointmentDate: Date;
  cancelDate: Date;
  serviceFee: number;
  platformFee: number;
}): RefundCalculation {
  const { appointmentDate, cancelDate, serviceFee, platformFee } = input;

  const apptDay = toKSTDateOnly(appointmentDate);
  const cancelDay = toKSTDateOnly(cancelDate);
  const daysUntil = Math.max(
    Math.floor((apptDay.getTime() - cancelDay.getTime()) / (24 * 60 * 60 * 1000)),
    0,
  );

  const refundRate = getRefundRate(daysUntil);
  const refundAmount = Math.floor((serviceFee * refundRate) / 100);
  const penaltyAmount = serviceFee - refundAmount;
  const totalDeducted = penaltyAmount + platformFee;
  const totalRefund = refundAmount;

  return {
    daysUntil,
    refundRate,
    refundAmount,
    penaltyAmount,
    platformFee,
    totalDeducted,
    totalRefund,
    isRefundable: refundRate > 0,
  };
}
