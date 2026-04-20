import Link from "next/link";

export const metadata = {
    title: "서비스 이용약관 | Kello",
    description: "Kello(mykello.com) 서비스 이용약관",
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

export default function TermsPage() {
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
                        서비스 이용약관
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
                    <Section title="제1조 (목적)">
                        <p>
                            이 약관은 Kello(이하 "회사")가 <strong>mykello.com</strong>을 통해 제공하는 서비스(이하 "서비스")의 이용 조건 및
                            절차, 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
                        </p>
                    </Section>

                    <Section title="제2조 (용어의 정의)">
                        <ul style={{ paddingLeft: "1.25rem" }}>
                            <Li><strong>"서비스"</strong>란 회사가 mykello.com을 통해 제공하는 한국 뷰티 서비스 예약, 다국어 통역 지원, 커뮤니티 등 모든 서비스를 의미합니다.</Li>
                            <Li><strong>"이용자"</strong>란 회사의 서비스에 접속하여 이 약관에 따라 서비스를 이용하는 회원 및 비회원을 의미합니다.</Li>
                            <Li><strong>"회원"</strong>이란 이 약관에 동의하고 이메일 또는 소셜 계정으로 회원가입을 완료한 자를 의미합니다.</Li>
                            <Li><strong>"예약"</strong>이란 이용자가 서비스 내 뷰티샵에 서비스 예약을 신청하는 행위를 의미합니다.</Li>
                        </ul>
                    </Section>

                    <Section title="제3조 (약관의 효력 및 변경)">
                        <p style={{ marginBottom: "0.75rem" }}>
                            이 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다.
                            회사는 합리적인 사유가 있는 경우 관련 법령에 위배되지 않는 범위에서 약관을 변경할 수 있으며,
                            변경된 약관은 서비스 내 공지사항을 통해 사전 공지합니다.
                        </p>
                        <p>변경 약관은 공지 후 7일이 경과한 날부터 효력이 발생합니다.</p>
                    </Section>

                    <Section title="제4조 (서비스의 내용)">
                        <p style={{ marginBottom: "0.75rem" }}>회사가 제공하는 서비스의 주요 내용은 다음과 같습니다.</p>
                        <ul style={{ paddingLeft: "1.25rem" }}>
                            <Li>한국 내 뷰티 서비스(네일, 헤어, 피부 관리 등) 예약 신청 중개</Li>
                            <Li>다국어 실시간 통역 지원</Li>
                            <Li>여행자 커뮤니티 및 정보 공유</Li>
                            <Li>뷰티 서비스 검색 및 장소 탐색</Li>
                            <Li>기타 회사가 추가로 개발하거나 제공하는 서비스</Li>
                        </ul>
                    </Section>

                    <Section title="제5조 (회원가입)">
                        <p style={{ marginBottom: "0.75rem" }}>
                            이용자는 이메일 주소 입력 또는 소셜 계정(Google, X, Facebook)으로 간편하게 회원가입을 할 수 있습니다.
                            회원가입 시 이 약관 및 개인정보처리방침에 동의하는 것으로 간주합니다.
                        </p>
                        <p>다음에 해당하는 경우 회원가입이 제한될 수 있습니다.</p>
                        <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
                            <Li>만 14세 미만인 경우</Li>
                            <Li>이전에 서비스 이용 제한·정지 처분을 받은 경우</Li>
                            <Li>타인의 정보를 도용한 경우</Li>
                        </ul>
                    </Section>

                    <Section title="제6조 (이용자의 의무)">
                        <p style={{ marginBottom: "0.75rem" }}>이용자는 다음 행위를 해서는 안 됩니다.</p>
                        <ul style={{ paddingLeft: "1.25rem" }}>
                            <Li>타인의 계정, 개인정보를 도용하는 행위</Li>
                            <Li>서비스 운영을 방해하는 행위 (해킹, 바이러스 유포 등)</Li>
                            <Li>허위 예약 신청 또는 노쇼(no-show)를 반복하는 행위</Li>
                            <Li>타인 또는 회사의 명예를 훼손하는 행위</Li>
                            <Li>음란물·폭력적 콘텐츠 등 불법 정보를 유포하는 행위</Li>
                            <Li>기타 관련 법령 및 이 약관을 위반하는 행위</Li>
                        </ul>
                    </Section>

                    <Section title="제7조 (예약 및 취소)">
                        <ul style={{ paddingLeft: "1.25rem" }}>
                            <Li>Kello의 예약 서비스는 이용자와 뷰티샵 간의 예약 신청을 중개하는 플랫폼입니다. 최종 예약 확정은 해당 업체에 의해 이루어집니다.</Li>
                            <Li>예약 취소 및 변경 정책은 각 업체의 정책에 따르며, 취소로 인한 분쟁은 이용자와 업체 간에 해결합니다.</Li>
                            <Li>노쇼(no-show)가 반복되는 경우 서비스 이용이 제한될 수 있습니다.</Li>
                        </ul>
                    </Section>

                    <Section title="제8조 (서비스 이용 제한)">
                        <p style={{ marginBottom: "0.75rem" }}>
                            회사는 이용자가 이 약관을 위반하거나 서비스의 정상적인 운영을 방해하는 경우 사전 통보 없이
                            서비스 이용을 일시 중단하거나 계정을 삭제할 수 있습니다.
                        </p>
                        <p>서비스 이용 제한에 대한 이의가 있는 경우 고객센터를 통해 이의를 제기할 수 있습니다.</p>
                    </Section>

                    <Section title="제9조 (서비스 중단)">
                        <p>
                            회사는 시스템 정기 점검, 설비 교체·장애, 천재지변 등 불가피한 사유로 서비스를 일시 중단할 수 있습니다.
                            이 경우 사전 공지하며, 불가피한 경우 사후 공지할 수 있습니다.
                        </p>
                    </Section>

                    <Section title="제10조 (지적재산권)">
                        <p>
                            서비스에 게재된 콘텐츠(텍스트, 이미지, 로고, UI 등)에 대한 저작권 및 지적재산권은 회사에 귀속됩니다.
                            이용자는 회사의 사전 서면 동의 없이 서비스의 콘텐츠를 복제·배포·수정·전시하는 행위를 할 수 없습니다.
                        </p>
                    </Section>

                    <Section title="제11조 (면책 조항)">
                        <ul style={{ paddingLeft: "1.25rem" }}>
                            <Li>회사는 이용자와 뷰티샵 간의 분쟁에 대해 책임을 지지 않습니다.</Li>
                            <Li>회사는 천재지변, 전쟁, 해킹 등 불가항력으로 인한 서비스 장애에 대해 책임을 지지 않습니다.</Li>
                            <Li>이용자가 서비스를 통해 제공한 정보의 정확성에 대한 책임은 이용자 본인에게 있습니다.</Li>
                        </ul>
                    </Section>

                    <Section title="제12조 (준거법 및 관할)">
                        <p>
                            이 약관은 대한민국 법률에 따라 해석·적용됩니다.
                            회사와 이용자 간 분쟁이 발생할 경우 서울중앙지방법원을 제1심 관할 법원으로 합니다.
                        </p>
                    </Section>

                    <Section title="부칙">
                        <p>이 약관은 2025년 4월 20일부터 시행합니다.</p>
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
                        문의: <a href="mailto:support@mykello.com" style={{ color: "var(--primary)", fontWeight: 600 }}>support@mykello.com</a>
                        &nbsp;|&nbsp; © 2025 Kello. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
}
