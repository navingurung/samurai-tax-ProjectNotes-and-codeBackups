### AuthGuard

```jsx

"use client";

import { useContext, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoginCompanyContext } from "@/providers/LoginCompanyProvider";

// 認証なしでアクセス可能なパス（/contact-form: Shopifyユーザーが問い合わせできるように）
const PUBLIC_ROUTES = ["/login", "/contact-form"];


export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const context = useContext(LoginCompanyContext);
  const router = useRouter();
  const pathname = usePathname();


  if (!context) {
    throw new Error("AuthGuard must be used within a LoginCompanyProvider");
  }

  const { isLoggedIn, isInitialized, isAuthChecking } = context;

  useEffect(() => {
    // 初期化完了後、認証チェック完了後、ログインページ以外でログインしていない場合はログインページにリダイレクト
    if (
      isInitialized &&
      !isAuthChecking &&
      !isLoggedIn &&
      !PUBLIC_ROUTES.includes(pathname)
    ) {
      // リダイレクト元のパスを保存
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isInitialized, isAuthChecking, isLoggedIn, pathname, router]);

  // 初期化が完了していない、または認証チェック中の場合は何も表示しない
  if (!isInitialized || isAuthChecking) {
    return null;
  }

  // ログインしていない場合は何も表示しない（リダイレクト中）
  if (!isLoggedIn && !PUBLIC_ROUTES.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
};

```


`contact-form/page.tsx`
```jsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { IconArrowLeft, IconCheck } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { ContactForm } from "./contact-form";

export default function ContactFormPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <div className="w-full max-w-xl sm:max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto px-5 sm:px-6 py-6 sm:py-10">
      <div className="relative mb-6 sm:mb-8 flex justify-center">
        <Link
          href="/login"
          className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm text-[#0E1F3D] hover:text-[#C41E3A]"
        >
          <IconArrowLeft size={16} />
          戻る
        </Link>
        <Image
          src="/SAMURAI TAX_Logo_header.png"
          alt="SAMURAI TAX"
          width={180}
          height={36}
          className="h-9 w-auto"
          priority
        />
      </div>

      {isSubmitted ? (
        <div className="rounded-lg border bg-white/80 backdrop-blur-sm p-10 sm:p-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#0E1F3D]/10">
            <IconCheck size={24} color="#0E1F3D" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0E1F3D]">
            ありがとうございます！
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground">
            送信内容を受け付けました。
          </p>
          <p className="mt-1 text-sm sm:text-base text-muted-foreground">
            内容を確認の上、2〜3営業日以内に担当者よりご連絡させていただきます。
          </p>
          <Link href="/login" className="mt-6 inline-block">
            <Button className="bg-neutral-900 hover:bg-neutral-800 text-white">
              ログイン画面に戻る
            </Button>
          </Link>
        </div>
      ) : (
        <ContactForm onSuccess={() => setIsSubmitted(true)} />
      )}
    </div>
  );
}
```


`contact-form/contact-form.tsx`

```jsx
"use client";

import { useState, type FormEvent } from "react";
import { IconExternalLink } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const DEPARTMENTS = [
  "経営・役員",
  "財務・経理",
  "人事・労務",
  "総務・法務",
  "情報システム・IT推進・DX推進",
  "マーケティング・営業",
  "その他",
] as const;

const INQUIRY_TYPES = [
  "導入に関して",
  "セールスパートナー制度に関して",
  "メディア取材に関して",
  "その他",
] as const;

const HEARD_FROM = [
  "公式サイト",
  "SNS",
  "広告",
  "知人・取引先からの紹介",
  "その他",
] as const;

type FormState = {
  companyName: string;
  department: string;
  name: string;
  email: string;
  phone: string;
  inquiryType: string;
  heardFrom: string[];
  message: string;
  privacyAgreed: boolean;
};

const INITIAL_STATE: FormState = {
  companyName: "",
  department: "",
  name: "",
  email: "",
  phone: "",
  inquiryType: "",
  heardFrom: [],
  message: "",
  privacyAgreed: false,
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!values.companyName.trim()) errors.companyName = "会社名を入力してください";
  if (!values.department) errors.department = "部署名を選択してください";
  if (!values.name.trim()) errors.name = "お名前を入力してください";

  if (!values.email.trim()) {
    errors.email = "メールアドレスを入力してください";
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email = "正しいメールアドレスを入力してください";
  }

  if (!values.phone.trim()) errors.phone = "電話番号を入力してください";
  if (!values.inquiryType) errors.inquiryType = "お問い合わせの種類を選択してください";
  if (!values.privacyAgreed) errors.privacyAgreed = "プライバシーポリシーへの同意が必要です";

  return errors;
}

function RequiredBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-[#C41E3A] px-2 py-0.5 text-xs font-medium text-white">
      必須
    </span>
  );
}

function OptionalBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      任意
    </span>
  );
}

type ContactFormProps = {
  onSuccess: () => void;
};

export function ContactForm({ onSuccess }: ContactFormProps) {
  const [values, setValues] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FormErrors>({});

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function toggleHeardFrom(value: string) {
    setValues((prev) => {
      const exists = prev.heardFrom.includes(value);
      return {
        ...prev,
        heardFrom: exists
          ? prev.heardFrom.filter((v) => v !== value)
          : [...prev.heardFrom, value],
      };
    });
  }

  // TODO: wire up to backend submission endpoint later
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      console.log("contact form submit (stub):", values);
      onSuccess();
    }
  }

  return (
    <>
      <div className="mb-8 sm:mb-10 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0E1F3D]">
          お問い合わせ
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          導入のご相談や、セールスパートナーについてのご相談など、何でもお気軽にお問い合わせください。
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 sm:space-y-6 rounded-lg border bg-white/80 backdrop-blur-sm p-4 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          <div className="space-y-2">
            <label htmlFor="companyName" className="text-sm font-medium flex items-center gap-2">
              会社名 <RequiredBadge />
            </label>
            <Input
              id="companyName"
              placeholder="SAMURAI TAX 株式会社"
              value={values.companyName}
              onChange={(e) => setField("companyName", e.target.value)}
            />
            {errors.companyName && (
              <p className="text-sm text-[#C41E3A]">{errors.companyName}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              部署名 <RequiredBadge />
            </label>
            <Select
              value={values.department}
              onValueChange={(value) => setField("department", value)}
            >
              <SelectTrigger className={`w-full ${values.department ? "" : "text-muted-foreground"}`}>
                <SelectValue placeholder="お選びください" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.department && (
              <p className="text-sm text-[#C41E3A]">{errors.department}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
              お名前 <RequiredBadge />
            </label>
            <Input
              id="name"
              placeholder="田中 太郎"
              value={values.name}
              onChange={(e) => setField("name", e.target.value)}
            />
            {errors.name && <p className="text-sm text-[#C41E3A]">{errors.name}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
              メールアドレス <RequiredBadge />
            </label>
            <Input
              id="email"
              type="email"
              placeholder="example@abc.com"
              value={values.email}
              onChange={(e) => setField("email", e.target.value)}
            />
            {errors.email && <p className="text-sm text-[#C41E3A]">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
              電話番号 <RequiredBadge />
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="+81-00-123-4567"
              value={values.phone}
              onChange={(e) => setField("phone", e.target.value)}
            />
            {errors.phone && <p className="text-sm text-[#C41E3A]">{errors.phone}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              お問い合わせの種類 <RequiredBadge />
            </label>
            <div className="space-y-2">
              {INQUIRY_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="radio"
                    name="inquiryType"
                    value={type}
                    checked={values.inquiryType === type}
                    onChange={() => setField("inquiryType", type)}
                    className="h-4 w-4 accent-[#0E1F3D]"
                  />
                  {type}
                </label>
              ))}
            </div>
            {errors.inquiryType && (
              <p className="text-sm text-[#C41E3A]">{errors.inquiryType}</p>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              当サービスを知ったきっかけ <OptionalBadge />
            </label>
            <div className="space-y-2">
              {HEARD_FROM.map((source) => (
                <label
                  key={source}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={values.heardFrom.includes(source)}
                    onCheckedChange={() => toggleHeardFrom(source)}
                  />
                  {source}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-medium flex items-center gap-2">
            お問い合わせ内容 <OptionalBadge />
          </label>
          <Textarea
            id="message"
            rows={5}
            placeholder="お問い合わせ内容は、こちらに記載ください"
            value={values.message}
            onChange={(e) => setField("message", e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm underline underline-offset-2 hover:text-[#0E1F3D]"
          >
            プライバシーポリシーを開く
            <IconExternalLink size={14} />
          </a>

          <label htmlFor="privacyAgreed" className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              id="privacyAgreed"
              checked={values.privacyAgreed}
              onCheckedChange={(checked) => setField("privacyAgreed", checked === true)}
            />
            プライバシーポリシーに同意する
          </label>
          {errors.privacyAgreed && (
            <p className="text-sm text-[#C41E3A]">{errors.privacyAgreed}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-neutral-900 hover:bg-neutral-800 text-white"
        >
          送信する
        </Button>
      </form>
    </>
  );
}

```

