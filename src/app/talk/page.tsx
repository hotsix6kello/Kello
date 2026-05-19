export default function TalkPage() {
    return (
        <main
            style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                padding: "32px 20px 120px",
                background: "var(--background)",
            }}
        >
            <section
                style={{
                    width: "100%",
                    maxWidth: 420,
                    borderRadius: 24,
                    border: "1px solid #e2e8f0",
                    background: "white",
                    padding: "32px 24px",
                    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
                    textAlign: "center",
                }}
            >
                <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "#0f172a" }}>
                    소통
                </h1>
                <p style={{ margin: "12px 0 0", fontSize: "1rem", lineHeight: 1.6, color: "#475569" }}>
                    음성 대화 번역과 채팅 번역을 준비 중입니다.
                </p>
            </section>
        </main>
    );
}
