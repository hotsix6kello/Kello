import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { input, language } = await request.json();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    try {
        // language 파라미터가 없으면 Google이 현지 언어로 장소명 반환
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
        };
        // 알파 인터페이스 언어(language)를 넘기면 해당 언어로 들어오므로 생략 → 현지어 표시
        // (ex. 도쿠 검색 → 東京, 볼리비아 검색 → Bali)

        const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                input: input,
                // includedRegionCodes 제거: 전 세계 장소 검색 허용
            }),
        });

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch autocomplete' }, { status: 500 });
    }
}
