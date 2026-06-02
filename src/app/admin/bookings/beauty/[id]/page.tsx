import AdminBeautyBookingDetailContent from './AdminBeautyBookingDetailContent';

export default async function AdminBeautyBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AdminBeautyBookingDetailContent bookingId={id} />;
}
