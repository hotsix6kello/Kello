
$path = "c:\Users\KumA\Desktop\Kello\src\app\explore\page.tsx"
$lines = Get-Content -Path $path -Encoding UTF8

# Line 881 to 909 (1-indexed) is index 880 to 908 in 0-indexed array
$startIndex = 880
$endIndex = 908

$newBlock = @'
    rating: 4.8,
    reviewCount: 156,
    priceLabel: '69,000원',
    shortDescription: 'Beauty shop in Seongsu.',
    tags: ['Lash', 'Tinting'],
  },
];

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createBookingDateOptions(t: any, count = 6): BeautyDateOption[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);

    const locale = t('common.locale') === 'ko-KR' ? 'ko-KR' : 'en-US';

    return {
      key: toLocalDateKey(date),
      shortLabel: index === 0 ? t('beauty_explore:label_today') : index === 1 ? t('beauty_explore:label_tomorrow') : new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
      label: new Intl.DateTimeFormat(locale, {
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
      }).format(date),
    };
  });
}

const SLOT_TEMPLATE_SET: string[][] = [
  ['10:00', '11:00', '13:00', '14:00', '16:00', '17:00', '19:00', '20:00'],
  ['10:30', '11:30', '13:30', '14:30', '16:30', '17:30', '19:30'],
  ['11:00', '12:00', '14:00', '15:00', '17:00', '18:00', '20:00'],
  ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
];

function buildBeautyAvailability(
  slotPattern: number[],
  unavailableOffsets: number[] = [],
  emptySlotOffsets: number[] = [],
) {
  const slotsByIndex: Record<number, string[]> = {};
'@

# Construct target content
$result = $lines[0..($startIndex-1)] + $newBlock + $lines[($endIndex+1)..($lines.Length-1)]

Set-Content -Path $path -Value $result -Encoding UTF8
