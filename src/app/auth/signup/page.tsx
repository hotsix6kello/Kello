"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import styles from "./signup.module.css";
import { supabase } from "@/lib/supabaseClient";

const LANGUAGES = [
  { code: "ko", label: "한국", flag: "🇰🇷", phoneCode: "+82" },
  { code: "en", label: "United States / Global", flag: "🇺🇸", phoneCode: "+1" },
  { code: "ja", label: "日本", flag: "🇯🇵", phoneCode: "+81" },
  { code: "zh-CN", label: "中国", flag: "🇨🇳", phoneCode: "+86" },
  { code: "zh-TW", label: "台灣 / HK", flag: "🇭🇰", phoneCode: "+852" },
  { code: "vi", label: "Việt Nam", flag: "🇻🇳", phoneCode: "+84" },
  { code: "th", label: "ไทย", flag: "🇹🇭", phoneCode: "+66" },
  { code: "ar", label: "عربي / Middle East", flag: "🇸🇦", phoneCode: "+966" },
];

function validatePassword(pw: string) {
  const hasLength = pw.length >= 8;
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw);
  return { hasLength, hasSpecial, valid: hasLength && hasSpecial };
}

export default function SignupPage() {
  const router = useRouter();
  const { t } = useTranslation("common");

  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [country, setCountry] = useState("ko");
  const [phoneCode, setPhoneCode] = useState("+82");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [instagram, setInstagram] = useState("");
  const [termsRequired, setTermsRequired] = useState(false);
  const [privacyRequired, setPrivacyRequired] = useState(false);
  const [marketingOptional, setMarketingOptional] = useState(false);

  const [isGoogleFlow, setIsGoogleFlow] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user;
      if (user) {
        setIsGoogleFlow(true);
        setUserId(user.id);
        setEmail(user.email ?? "");
        setName(user.user_metadata?.full_name || user.user_metadata?.name || "");
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const lang = LANGUAGES.find((l) => l.code === country);
    if (lang) setPhoneCode(lang.phoneCode);
  }, [country]);

  const pwValidation = validatePassword(password);
  const isAllAgreed = termsRequired && privacyRequired && marketingOptional;

  const handleAgreeAll = (checked: boolean) => {
    setTermsRequired(checked);
    setPrivacyRequired(checked);
    setMarketingOptional(checked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsRequired || !privacyRequired) {
      setError(t("signup.error_terms"));
      return;
    }
    if (!pwValidation.valid) {
      setError(t("signup.error_password"));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let uid = userId;
      const fullPhone = phoneNumber ? `${phoneCode} ${phoneNumber}` : "";

      if (isGoogleFlow) {
        const { error: pwError } = await supabase.auth.updateUser({ password });
        if (pwError) throw pwError;
      } else {
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

      if (uid) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: uid,
            display_name: name,
            nickname,
            phone: fullPhone,
            sns: instagram,
            country,
          });
        if (profileError) throw profileError;
      }

      localStorage.setItem("user", JSON.stringify({ name, email }));
      localStorage.setItem("kello_lang", country);
      router.replace("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("User already registered") || msg.includes("already registered")) {
        setError(t("signup.error_duplicate_email"));
      } else if (msg.includes("Password should be")) {
        setError(t("signup.error_password"));
      } else if (msg.includes("Invalid email")) {
        setError(t("signup.error_invalid_email"));
      } else {
        setError(msg || t("signup.error_generic"));
      }
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
            {isGoogleFlow ? t("signup.title_google") : t("signup.title_new")}
          </h1>
          <p className={styles.subTitle}>
            {isGoogleFlow ? t("signup.subtitle_google") : t("signup.subtitle_new")}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>{t("signup.name_label")} *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              placeholder={t("signup.name_placeholder")}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>{t("signup.nickname_label")}</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={styles.input}
              placeholder={t("signup.nickname_placeholder")}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>{t("signup.email_label")} *</label>
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

          <div className={styles.inputGroup}>
            <label className={styles.label}>{t("signup.country_label")} *</label>
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

          <div className={styles.inputGroup}>
            <label className={styles.label}>{t("signup.phone_label")}</label>
            <div className={styles.phoneRow}>
              <select
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                className={styles.phoneCodeSelect}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.phoneCode}>
                    {lang.flag} {lang.phoneCode}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className={styles.phoneInput}
                placeholder="010-0000-0000"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>{t("signup.instagram_label")}</label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className={styles.input}
              placeholder="@username"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              {t("signup.password_label")} *{" "}
              {isGoogleFlow && (
                <span style={{ color: "var(--gray-400)", fontWeight: 400 }}>
                  {t("signup.password_for_email")}
                </span>
              )}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setPasswordTouched(true)}
              className={styles.input}
              placeholder="••••••••"
              required
            />
            {(passwordTouched || password.length > 0) && (
              <div className={styles.pwGuide}>
                <span className={pwValidation.hasLength ? styles.pwOk : styles.pwFail}>
                  {pwValidation.hasLength ? "✓" : "✗"} {t("signup.pw_min_length")}
                </span>
                <span className={pwValidation.hasSpecial ? styles.pwOk : styles.pwFail}>
                  {pwValidation.hasSpecial ? "✓" : "✗"} {t("signup.pw_special")}
                </span>
              </div>
            )}
          </div>

          <div className={styles.consentSection}>
            <label className={`${styles.consentItem} ${styles.allAgree}`}>
              <input
                type="checkbox"
                checked={isAllAgreed}
                onChange={(e) => handleAgreeAll(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.consentText}>{t("signup_consent.all_agree")}</span>
            </label>

            <div className={styles.consentItem}>
              <input
                type="checkbox"
                checked={termsRequired}
                onChange={(e) => setTermsRequired(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.consentText}>{t("signup_consent.terms_required")}</span>
              <span onClick={() => router.push("/terms")} className={styles.link}>
                {t("signup_consent.view_detail")}
              </span>
            </div>

            <div className={styles.consentItem}>
              <input
                type="checkbox"
                checked={privacyRequired}
                onChange={(e) => setPrivacyRequired(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.consentText}>{t("signup_consent.privacy_required")}</span>
              <span onClick={() => router.push("/privacy")} className={styles.link}>
                {t("signup_consent.view_detail")}
              </span>
            </div>

            <label className={styles.consentItem}>
              <input
                type="checkbox"
                checked={marketingOptional}
                onChange={(e) => setMarketingOptional(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.consentText}>{t("signup_consent.privacy_optional")}</span>
            </label>
          </div>

          {error && (
            <div style={{ fontSize: "0.875rem", textAlign: "center", marginBottom: "16px" }}>
              <span style={{ color: "#ef4444", wordBreak: "break-word" }}>{error}</span>
              {error === t("signup.error_duplicate_email") && (
                <div style={{ marginTop: "8px" }}>
                  <span
                    onClick={() => router.push("/auth/login")}
                    style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}
                  >
                    {t("signup.go_to_login")}
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !termsRequired || !privacyRequired}
            className={styles.submitBtn}
          >
            {submitting
              ? t("signup.processing")
              : isGoogleFlow
              ? t("signup.submit_google")
              : t("signup.submit")}
          </button>
        </form>

        {!isGoogleFlow && (
          <div style={{ marginTop: "20px", textAlign: "center", fontSize: "0.9rem", color: "var(--gray-500)" }}>
            {t("signup.login_prompt")}{" "}
            <span
              onClick={() => router.push("/auth/login")}
              style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600 }}
            >
              {t("signup.login_link")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
