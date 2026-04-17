import { NextResponse } from 'next/server';
import { AdminRouteAccessError, requireAuthenticatedRouteAccess } from '@/lib/admin/adminRouteAccess.ts';
import { getSupabaseServerClient } from '@/lib/supabaseServer.ts';

export const runtime = 'nodejs';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_code:     '존재하지 않는 추천인 코드입니다.',
  self_referral:    '본인의 추천인 코드는 입력할 수 없습니다.',
  already_referred: '이미 추천인 코드를 사용하셨습니다.',
};

export async function POST(request: Request) {
  // 1. 세션 확인
  let userId: string;
  try {
    ({ userId } = await requireAuthenticatedRouteAccess(request));
  } catch (err) {
    if (err instanceof AdminRouteAccessError) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }

  // 2. body에서 code 추출
  let code: string;
  try {
    const body = await request.json();
    code = typeof body?.code === 'string' ? body.code.trim() : '';
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ success: false, error: '추천인 코드를 입력해주세요.' }, { status: 400 });
  }

  // 3. RPC 호출
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.rpc('apply_referral_code', {
      p_referrer_code: code.toUpperCase(),
      p_referred_id:   userId,
    });

    if (error) {
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }

    // 4. RPC 결과 반환
    const result = data as { success: boolean; error: string | null };

    if (result.success) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const message = result.error ? (ERROR_MESSAGES[result.error] ?? result.error) : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });

  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
