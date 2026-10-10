import { useRef, useState, type SubmitEvent } from "react";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  FieldCount,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/ui/FormField";
import { useContactTurnstile } from "./useContactTurnstile";
import { contactSchema } from "./contact.schema";
import { budgetLabels } from "./contact.constants";

const nameSchema = contactSchema.shape.name;
const emailInputSchema = contactSchema.shape.email.in;
const messageSchema = contactSchema.shape.message;

const TURNSTILE_SITE_KEY = import.meta.env.DEV
  ? "1x00000000000000000000AA"
  : "0x4AAAAAAE-rObFDOjPxEuUD";

export function ContactForm() {
  const [contactMessage, setContactMessage] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const contactSubmission = useRef<{ content: string; id: string } | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    containerRef: turnstileContainerRef,
    error: turnstileError,
    verified: turnstileVerified,
    reset: resetTurnstile,
  } = useContactTurnstile(TURNSTILE_SITE_KEY);

  const handleContactSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !turnstileVerified) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSubmitting(true);
    toast.dismiss("contact-submit");

    try {
      const fields = {
        name: String(formData.get("name") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim(),
        budget: formData.get("budget"),
        message: String(formData.get("message") ?? "").trim(),
      };
      const content = JSON.stringify(fields);
      // 再送時は同じIDを使う。Turnstileトークンの更新は内容の変更に含めない。
      if (contactSubmission.current?.content !== content) {
        contactSubmission.current = { content, id: crypto.randomUUID() };
      }
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          submissionId: contactSubmission.current.id,
          turnstileToken: formData.get("cf-turnstile-response"),
        }),
      });

      if (!response.ok) throw new Error("Contact submission failed");

      contactSubmission.current = null;
      form.reset();
      setContactMessage("");
      setContactName("");
      setContactEmail("");
      toast.success(
        "お問い合わせを受け付けました。2〜3営業日以内にご返信します。",
        { id: "contact-submit" },
      );
    } catch {
      toast.error(
        "送信できませんでした。時間をおいてもう一度お試しください。",
        {
          id: "contact-submit",
        },
      );
    } finally {
      setIsSubmitting(false);
      resetTurnstile();
    }
  };

  return (
    <>
      <form onSubmit={handleContactSubmit} className="m-contact-form">
        <div className="m-contact-form__fields">
          <div>
            <TextField
              id="name"
              layout="responsive"
              info={
                <FieldCount
                  id="name-count"
                  value={contactName}
                  min={nameSchema.minLength ?? 0}
                  max={nameSchema.maxLength ?? Infinity}
                />
              }
              name="name"
              label="お名前"
              type="text"
              autoComplete="name"
              placeholder="例）山田 太郎"
              value={contactName}
              onChange={(event) => {
                const value = event.currentTarget.value;
                const length = value.trim().length;
                setContactName(value);
                event.currentTarget.setCustomValidity(
                  length < (nameSchema.minLength ?? 0)
                    ? "お名前を入力してください"
                    : length > (nameSchema.maxLength ?? Infinity)
                      ? `お名前は${nameSchema.maxLength ?? Infinity}文字以内で入力してください`
                      : "",
                );
              }}
              aria-describedby="name-count"
              required
            />
          </div>
          <div>
            <TextField
              id="email"
              layout="responsive"
              info={
                <FieldCount
                  id="email-count"
                  value={contactEmail}
                  min={emailInputSchema.minLength ?? 0}
                  max={emailInputSchema.maxLength ?? Infinity}
                />
              }
              name="email"
              label="メールアドレス"
              type="email"
              autoComplete="email"
              placeholder="例）tomo@example.com"
              value={contactEmail}
              onChange={(event) => {
                const value = event.currentTarget.value;
                const length = value.trim().length;
                setContactEmail(value);
                event.currentTarget.setCustomValidity(
                  length < (emailInputSchema.minLength ?? 0)
                    ? "メールアドレスを入力してください"
                    : length > (emailInputSchema.maxLength ?? Infinity)
                      ? `メールアドレスは${emailInputSchema.maxLength ?? Infinity}文字以内で入力してください`
                      : "",
                );
              }}
              aria-describedby="email-count"
              required
            />
          </div>
          <SelectField
            id="budget"
            layout="responsive"
            name="budget"
            label="ご予算"
            defaultValue=""
            required
          >
            <option value="">選択してください</option>
            {contactSchema.shape.budget.options.map((value) => (
              <option key={value} value={value}>
                {budgetLabels[value]}
              </option>
            ))}
          </SelectField>
          <div>
            <TextareaField
              id="message"
              layout="responsive"
              info={
                <FieldCount
                  id="message-count"
                  value={contactMessage}
                  min={messageSchema.minLength ?? 0}
                  max={messageSchema.maxLength ?? Infinity}
                />
              }
              name="message"
              label="お問い合わせ内容"
              placeholder="ご相談内容やご依頼の概要をご記入ください"
              value={contactMessage}
              onChange={(event) => {
                const value = event.currentTarget.value;
                const length = value.trim().length;
                setContactMessage(value);
                event.currentTarget.setCustomValidity(
                  length < (messageSchema.minLength ?? 0)
                    ? `お問い合わせ内容は${messageSchema.minLength ?? 0}文字以上で入力してください`
                    : length > (messageSchema.maxLength ?? Infinity)
                      ? `お問い合わせ内容は${messageSchema.maxLength ?? Infinity}文字以内で入力してください`
                      : "",
                );
              }}
              minLength={messageSchema.minLength ?? 0}
              aria-describedby="message-count"
              required
            />
          </div>

          <div
            ref={turnstileContainerRef}
            className="m-contact-form__verification"
          />
          {turnstileError ? (
            <p role="alert" className="m-contact-form__error">
              {turnstileError === "unsupported"
                ? "お使いのブラウザーでは認証できません。ブラウザーを最新版に更新するか、別のブラウザーでお試しください。"
                : "認証を読み込めませんでした。通信環境を確認してページを再読み込みしてください。"}
            </p>
          ) : null}
        </div>

        <p className="m-contact-form__privacy">
          個人情報の取り扱いについては、
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="c-link c-link--text c-link--underline"
          >
            プライバシーポリシー
            <span className="m-contact-form__new-tab">
              （新しいタブで開きます）
            </span>
          </a>
          をご確認ください。
        </p>

        <div className="m-contact-form__action">
          <Button
            type="submit"
            size="lg"
            className="m-contact-form__submit"
            disabled={isSubmitting || !turnstileVerified}
          >
            {isSubmitting ? "送信中…" : "送信する"}
          </Button>
        </div>
      </form>
      <Toaster
        position="bottom-left"
        style={{ fontFamily: "inherit" }}
        richColors
        closeButton
        duration={5000}
        containerAriaLabel="通知"
        toastOptions={{ closeButtonAriaLabel: "通知を閉じる" }}
      />
    </>
  );
}
