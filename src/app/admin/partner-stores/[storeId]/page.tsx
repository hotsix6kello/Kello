import AdminPartnerStoreDetailContent from './AdminPartnerStoreDetailContent';

export default async function AdminPartnerStoreDetailPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;

  return <AdminPartnerStoreDetailContent storeId={storeId} />;
}
