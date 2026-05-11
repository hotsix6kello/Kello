"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./signup.module.css";
import { supabase } from "@/lib/supabaseClient";

const LANGUAGES = [
  { code: "ko", label: "한국", flag: "🇰🇷" },
  { code: "en", label: "United States / Global", flag: "🇺🇸" },
  { code: "ja", label: "日本", flag: "🇯🇵" },
  { code: "zh-CN", label: "中国", flag: "🇨🇳" },
  { code: "zh-TW", label: "台灣 / HK", flag: "🇭🇰" },
  { code: "vi", label: "Việt Nam", flag: "🇻🇳" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "ar", label: "عربي / Middle East", flag: "🇸🇦" },
];

export default function SignupPage() {
  const router = useRouter();

  // 폼 필드
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("ko");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [termsRequired, setTermsRequired] = useState(false);
  const [privacyRequired, setPrivacyRequired] = useState(false);
  const [marketingOptional, setMarketingOptional] = useState(false);

  // 상태
  const [isGoogleFlow, setIsGoogleFlow] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 구글 OAuth 완료 후 세션이 있는 경우 감지
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user;
      if (user) {
        setIsGoogleFlow(true);
        setUserId(user.id);
        setEmail(user.email ?? "");
        setName(
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          ""
        );
      }
      setLoading(false);
    });
  }, []);

  const isAllAgreed = termsRequired && privacyRequired && marketingOptional;

  const handleAgreeAll = (checked: boolean) => {
    setTermsRequired(checked);
    setPrivacyRequired(checked);
    setMarketingOptional(checked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsRequired || !privacyRequired) {
      setError("필수 약관에 동의해주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let uid = userId;

      if (isGoogleFlow) {
        // 구글 유저 → 비밀번호 설정
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) throw pwError;
      } else {
        // 이메일 + 비밀번호 신규 가입
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (signUpError) throw signUpError;
        uid = data.user?.id ?? null;

        if (uid) {
          await supabase.rpc("issue_signup_coupon", { p_user_id: uid });
        }
      }

      // 프로필 저장 (트리거가 id만 생성했으므로 나머지 필드 upsert)
      if (uid) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: uid,
            display_name: name,
            nickname,
            phone,
            sns: instagram,
            country,
          });
        if (profileError) throw profileError;
      }

      localStorage.setItem("user", JSON.stringify({ name, email }));
      localStorage.setItem("kello_lang", country);
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className={styles.container}>
      <div className={`${styles.orb} ${styles.orbTop}`} />
      <div className={`${styles.orb} ${styles.orbBottom}`} />

      <div className={styles.formCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            {isGoogleFlow ? "프로필 완성하기" : "Kello 가입하기"}
          </h1>
          <p className={styles.subTitle}>
            {isGoogleFlow
              ? "추가 정보를 입력하고 Kello를 시작해보세요"
              : "이메일과 정보를 입력해 가입하세요"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 이름 */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>이름 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              placeholder="홍길동"
              required
            />
          </div>

          {/* 별명 */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>별명 (닉네임)</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={styles.input}
              placeholder="사용할 별명"
            />
          </div>

          {/* 이메일 */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>이메일 *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="user@example.com"
              required
              readOnly={isGoogleFlow}
              style={isGoogleFlow ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            />
          </div>

          {/* 국가 */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>국가 / 언어 *</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={styles.select}
              required
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* 핸드폰번호 */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>핸드폰번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={styles.input}
              placeholder="010-0000-0000"
            />
          </div>

          {/* 인스타그램 */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>인스타그램 계정</label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className={styles.input}
              placeholder="@username"
            />
          </div>

          {/* 비밀번호 */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>
              비밀번호 * {isGoogleFlow && <span style={{ color: "var(--gray-400)", fontWeight: 400 }}>(이메일 로그인용)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {/* 약관 동의 */}
          <div className={styles.consentSection}>
            <label className={`${styles.consentItem} ${styles.allAgree}`}>
              <input
                type="checkbox"
                checked={isAllAgreed}
                onChange={(e) => handleAgreeAll(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.consentText}>전체 동의</span>
            </label>

            <div className={styles.consentItem}>
              <input
                type="checkbox"
                checked={termsRequired}
                onChange={(e) => setTermsRequired(e.target.checked)}
                className={styles.checkbox}
                required
              />
              <span className={styles.consentText}>[필수] 이용약관 동의</span>
              <span onClick={() => router.push("/terms")} className={styles.link}>
                보기
              </span>
            </div>

            <div className={styles.consentItem}>
              <input
                type="checkbox"
                checked={privacyRequired}
                onChange={(e) => setPrivacyRequired(e.target.checked)}
                className={styles.checkbox}
                required
              />
              <span className={styles.consentText}>[필수] 개인정보 처리방침 동의</span>
              <span onClick={() => router.push("/privacy")} className={styles.link}>
                보기
              </span>
            </div>

            <label className={styles.consentItem}>
              <input
                type="checkbox"
                checked={marketingOptional}
                onChange={(e) => setMarketingOptional(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.consentText}>[선택] 마케팅 정보 수신 동의</span>
            </label>
          </div>

          {error && (
            <div style={{ color: "#ef4444", fontSize: "0.875rem", textAlign: "center", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !termsRequired || !privacyRequired}
            className={styles.submitBtn}
          >
            {submitting ? "처리 중..." : isGoogleFlow ? "프로필 완성하기" : "가입하기"}
          </button>
        </form>

        {!isGoogleFlow && (
          <div style={{ marginTop: "20px", textAlign: "center", fontSize: "0.9rem", color: "var(--gray-500)" }}>
            이미 계정이 있으신가요?{" "}
            <span
              onClick={() => router.push("/auth/login")}
              style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}
            >
              로그인
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
