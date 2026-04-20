import Link from "next/link";

export const metadata = {
    title: "개인정보처리방침 | Kello",
    description: "Kello(mykello.com) 개인정보처리방침",
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section style={{ marginBottom: "2rem" }}>
        <h2 style={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "var(--foreground)",
            marginBottom: "0.75rem",
            paddingBottom: "0.5rem",
            borderBottom: "1.5px solid var(--warm-sand)",
        }}>
            {title}
        </h2>
        <div style={{ fontSize: "0.9rem", color: "var(--soft-ink)", lineHeight: 1.8 }}>
            {children}
        </div>
    </section>
);

const Li = ({ children }: { children: React.ReactNode }) => (
    <li style={{ marginBottom: "0.4rem", paddingLeft: "0.25rem" }}>{children}</li>
);

export default function PrivacyPage() {
    return (
        <div style={{
            minHeight: "100vh",
            background: "var(--background)",
            padding: "40px 20px 80px",
            position: "relative",
            overflow: "hidden",
        }}>
            {/* Background orbs */}
            <div style={{
                position: "absolute", top: "-10%", left: "-20%",
                width: 300, height: 300, borderRadius: "50%",
                background: "var(--primary)", filter: "blur(80px)", opacity: 0.08, zIndex: 0,
            }} />
            <div style={{
                position: "absolute", bottom: "10%", right: "-10%",
                width: 250, height: 250, borderRadius: "50%",
                background: "var(--secondary)", filter: "blur(80px)", opacity: 0.08, zIndex: 0,
            }} />

            <div style={{
                maxWidth: 680,
                margin: "0 auto",
                position: "relative",
                zIndex: 10,
            }}>
                {/* 홈 바로가기 */}
                <div style={{ marginBottom: "1.5rem" }}>
                    <Link href="/" style={{
                        display: "inline-flex", alignItems: "center", gap: "6px",
                        color: "var(--gray-500)", textDecoration: "none",
                        fontSize: "0.9rem", fontWeight: 600,
                        padding: "8px 12px", borderRadius: 12,
                        background: "rgba(0,0,0,0.03)",
                        transition: "all 0.2s",
                    }}>
                        ← 홈 바로가기
                    </Link>
                </div>

                {/* 제목 카드 */}
                <div style={{
                    background: "var(--glass-bg)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid var(--glass-border)",
                    borderTop: "1px solid var(--glass-highlight)",
                    borderRadius: 24,
                    padding: "32px 32px 12px",
                    marginBottom: "1.5rem",
                    boxShadow: "0 10px 40px -10px rgba(43,35,29,0.1)",
                }}>
                    <h1 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "0.5rem", color: "var(--foreground)" }}>
                        개인정보처리방침
                    </h1>
                    <p style={{ fontSize: "0.85rem", color: "var(--gray-500)" }}>
                        최종 업데이트: 2025년 4월 20일 &nbsp;|&nbsp; 시행일: 2025년 4월 20일
                    </p>
                </div>

                {/* 본문 카드 */}
                <div style={{
                    background: "var(--glass-bg)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid var(--glass-border)",
                    borderTop: "1px solid var(--glass-highlight)",
                    borderRadius: 24,
                    padding: "32px",
                    boxShadow: "0 10px 40px -10px rgba(43,35,29,0.1)",
                }}>
                    <Section title="1. 개요">
                        <p>
                            Kello(이하 "회사")는 <strong>mykello.com</strong>을 통해 제공하는 서비스(이하 "서비스")와 관련하여
                            이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리하기 위해 다음과 같이
                            개인정보처리방침을 수립·공개합니다.
                        </p>
                    </Section>

                    <Section title="2. 수집하는 개인정보 항목 및 수집 방법">
                        <p style={{ marginBottom: "0.75rem" }}>회사는 서비스 제공을 위해 아래의 개인정보를 수집합니다.</p>
                        <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>① 회원가입 및 소셜 로그인 시 수집 항목</p>
                        <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
                            <Li>이메일 주소 (필수)</Li>
                            <Li>소셜 로그인 정보: Google, X(트위터), Facebook 계정의 프로필 식별자 및 이메일</Li>
                            <Li>닉네임 / 표시 이름 (소셜 계정에서 자동 제공되는 경우 포함)</Li>
                        </ul>
                        <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>② 서비스 이용 과정에서 자동 수집되는 정보</p>
                        <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
                            <Li>IP 주소, 브라우저 종류, 방문 일시, 서비스 이용 기록</Li>
                            <Li>기기 정보 (모바일 기기 식별자 등)</Li>
                        </ul>
                        <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>③ 수집 방법</p>
                        <ul style={{ paddingLeft: "1.25rem" }}>
                            <Li>회원가입 페이지 및 소셜 로그인(OAuth 2.0)을 통한 직접 수집</Li>
                            <Li>Supabase Auth를 통한 인증 과정에서의 자동 수집</Li>
                        </ul>
                    </Section>

                    <Section title="3. 개인정보 수집·이용 목적">
                        <ul style={{ paddingLeft: "1.25rem" }}>
                            <Li>회원 가입 및 본인 확인</Li>
                            <Li>서비스 제공 및 예약 처리</Li>
                            <Li>서비스 관련 공지사항 및 안내 메일 발송</Li>
                            <Li>부정 이용 방지 및 보안 운영</Li>
                            <Li>통계 분석을 통한 서비스 개선</Li>
                        </ul>
                    </Section>

                    <Section title="4. 개인정보 보유 및 이용 기간">
                        <p style={{ marginBottom: "0.75rem" }}>
                            이용자의 개인정보는 원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 지체 없이 파기합니다.
                            단, 관련 법령에 따라 아래와 같이 일정 기간 보존합니다.
                        </p>
                        <ul style={{ paddingLeft: "1.25rem" }}>
                            <Li>회원 탈퇴 시: 즉시 파기 (단, 부정 이용 방지를 위한 최소 정보는 30일간 보관)</Li>
                            <Li>전자상거래법에 의한 거래 기록: 5년</Li>
                            <Li>소비자 불만 및 분쟁 처리 기록: 3년</Li>
                            <Li>접속 로그 기록: 3개월 (통신비밀보호법)</Li>
                        </ul>
                    </Section>

                    <Section title="5. 개인정보 제3자 제공">
                        <p>
                            회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.
                            단, 아래의 경우에는 예외로 합니다.
                        </p>
                        <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
                            <Li>이용자가 사전에 동의한 경우 (예: 뷰티샵 예약 시 해당 업체에 예약자 정보 제공)</Li>
                            <Li>법령의 규정에 의거하거나, 수사 기관의 요구가 있는 경우</Li>
                        </ul>
                    </Section>

                    <Section title="6. 개인정보 처리 위탁">
                        <p style={{ marginBottom: "0.75rem" }}>
                            회사는 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁합니다.
                        </p>
                        <table style={{
                            width: "100%", borderCollapse: "collapse",
                            fontSize: "0.85rem", marginBottom: "0.5rem",
                        }}>
                            <thead>
                                <tr style={{ background: "var(--gray-100)" }}>
                                    <th style={{ padding: "8px 12px", textAlign: "left", borderRadius: "8px 0 0 0", border: "1px solid var(--warm-sand)" }}>수탁 업체</th>
                                    <th style={{ padding: "8px 12px", textAlign: "left", border: "1px solid var(--warm-sand)" }}>위탁 업무 내용</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: "8px 12px", border: "1px solid var(--warm-sand)" }}>Supabase Inc.</td>
                                    <td style={{ padding: "8px 12px", border: "1px solid var(--warm-sand)" }}>회원 인증 및 데이터베이스 관리</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: "8px 12px", border: "1px solid var(--warm-sand)" }}>Google LLC</td>
                                    <td style={{ padding: "8px 12px", border: "1px solid var(--warm-sand)" }}>소셜 로그인 인증 (Google OAuth)</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: "8px 12px", border: "1px solid var(--warm-sand)" }}>Meta Platforms Inc.</td>
                                    <td style={{ padding: "8px 12px", border: "1px solid var(--warm-sand)" }}>소셜 로그인 인증 (Facebook OAuth)</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: "8px 12px", border: "1px solid var(--warm-sand)" }}>X Corp.</td>
                                    <td style={{ padding: "8px 12px", border: "1px solid var(--warm-sand)" }}>소셜 로그인 인증 (X OAuth)</td>
                                </tr>
                            </tbody>
                        </table>
                    </Section>

                    <Section title="7. 이용자의 권리 및 행사 방법">
                        <p style={{ marginBottom: "0.75rem" }}>
                            이용자는 언제든지 자신의 개인정보에 대해 다음의 권리를 행사할 수 있습니다.
                        </p>
                        <ul style={{ paddingLeft: "1.25rem" }}>
                            <Li>개인정보 열람 요청</Li>
                            <Li>개인정보 수정·삭제 요청 (회원 탈퇴 포함)</Li>
                            <Li>개인정보 처리 정지 요청</Li>
                        </ul>
                        <p style={{ marginTop: "0.75rem" }}>
                            권리 행사는 아래 개인정보 보호 담당자에게 이메일로 요청하실 수 있으며,
                            회사는 요청 접수 후 10영업일 이내에 처리합니다.
                        </p>
                    </Section>

                    <Section title="8. 개인정보 보호 담당자">
                        <ul style={{ paddingLeft: "1.25rem" }}>
                            <Li>담당자: Kello 개인정보 보호팀</Li>
                            <Li>이메일: privacy@mykello.com</Li>
                            <Li>서비스 주소: mykello.com</Li>
                        </ul>
                    </Section>

                    <Section title="9. 쿠키(Cookie) 사용">
                        <p style={{ marginBottom: "0.75rem" }}>
                            회사는 이용자에게 맞춤형 서비스를 제공하기 위해 쿠키를 사용합니다.
                            쿠키는 로그인 상태 유지, 언어 설정, 서비스 이용 통계 등에 활용됩니다.
                        </p>
                        <p>
                            브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 일부 서비스 이용이 제한될 수 있습니다.
                        </p>
                    </Section>

                    <Section title="10. 개인정보처리방침 변경">
                        <p>
                            이 개인정보처리방침은 법령·정책 변경 또는 서비스 변경에 따라 내용이 추가·삭제·수정될 수 있습니다.
                            변경 시 서비스 내 공지사항을 통해 사전 고지하며, 변경된 방침은 공지 후 7일이 지난 날부터 효력이 발생합니다.
                        </p>
                    </Section>

                    <div style={{
                        marginTop: "2rem",
                        padding: "16px 20px",
                        background: "var(--gray-100)",
                        borderRadius: 12,
                        fontSize: "0.82rem",
                        color: "var(--gray-500)",
                        textAlign: "center",
                    }}>
                        문의: <a href="mailto:privacy@mykello.com" style={{ color: "var(--primary)", fontWeight: 600 }}>privacy@mykello.com</a>
                        &nbsp;|&nbsp; © 2025 Kello. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
}
