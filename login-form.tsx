"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { useState, useContext } from "react";
import { LoginCompanyContext } from "../providers/LoginCompanyProvider";
import { Spinner } from "@/components/ui/spinner";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// ── Defined OUTSIDE LoginForm to prevent remount on every render ──

interface FormPanelProps {
  isShop: boolean;
  loginInfo: { login_id: string; login_password: string };
  setLoginInfo: (v: { login_id: string; login_password: string }) => void;
  loading: boolean;
  onClickLogin: (e: React.MouseEvent<HTMLButtonElement>) => void;
  setLoginType: (v: "company" | "shop") => void;
}

// [CHANGED] FormPanel now has white background — form labels and inputs are dark colored
function FormPanel({ isShop, loginInfo, setLoginInfo, loading, onClickLogin, setLoginType }: FormPanelProps) {
  return (
    <div className="flex flex-col justify-center h-full px-8 py-10 bg-white relative overflow-hidden min-h-[420px]">

      <div className="relative z-10 flex flex-col gap-5">

        {/* Mobile only toggle */}
        <div className="flex md:hidden rounded-lg border border-gray-200 p-1 gap-1">
          <button
            type="button"
            onClick={() => setLoginType("shop")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isShop ? "bg-[#164d86] text-white" : "text-gray-500 hover:text-gray-900"
            )}
          >
            店舗
          </button>
          <button
            type="button"
            onClick={() => setLoginType("company")}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              !isShop ? "bg-[#164d86] text-white" : "text-gray-500 hover:text-gray-900"
            )}
          >
            会社
          </button>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-[#164d86]">
            {isShop ? "店舗" : "管理者"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isShop ? "店舗IDとパスワードを入力してください" : "メールアドレスとパスワードを入力してください"}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              {isShop ? "ID" : "メールアドレス"}
            </label>
            <Input
              type={isShop ? "text" : "email"}
              placeholder={isShop ? "店舗ID" : "m@example.com"}
              value={loginInfo.login_id}
              onChange={(e) => setLoginInfo({ ...loginInfo, login_id: e.target.value })}
              className="h-11 border-gray-200"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">パスワード</label>
            <Input
              type="password"
              value={loginInfo.login_password}
              onChange={(e) => setLoginInfo({ ...loginInfo, login_password: e.target.value })}
              className="h-11 border-gray-200"
            />
          </div>
        </div>

        <button
          onClick={onClickLogin}
          disabled={loading}
          className="w-full h-11 bg-[#164d86] hover:bg-[#1d69ba] disabled:opacity-60 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
        >
          {loading ? <Spinner className="h-4 w-4" /> : "ログイン"}
        </button>
      </div>
    </div>
  );
}

interface BrandPanelProps {
  isShop: boolean;
  handleSwitch: () => void;
}

// [CHANGED] BrandPanel now has blue background with animated blobs — use white logo here
function BrandPanel({ isShop, handleSwitch }: BrandPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-10 bg-[#164d86] relative overflow-hidden min-h-[420px]">

      {/* Animated blob shapes */}
      <motion.div
        className="absolute -top-16 -right-16 w-64 h-64 bg-[#1d69ba] opacity-40"
        style={{ borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%" }}
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 30, 0],
          y: [0, -30, 0],
          borderRadius: [
            "60% 40% 30% 70% / 60% 30% 70% 40%",
            "30% 60% 70% 40% / 50% 60% 30% 60%",
            "60% 40% 30% 70% / 60% 30% 70% 40%",
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#223f5d] opacity-40"
        style={{ borderRadius: "30% 60% 70% 40% / 50% 60% 30% 60%" }}
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -30, 0],
          y: [0, 30, 0],
          borderRadius: [
            "30% 60% 70% 40% / 50% 60% 30% 60%",
            "60% 40% 30% 70% / 60% 30% 70% 40%",
            "30% 60% 70% 40% / 50% 60% 30% 60%",
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 w-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">ようこそ</h1>
          <p className="text-sm text-blue-200 mt-1">SAMURAI TAX Dashboard</p>
        </div>

        {/* White logo — replace filename if different */}
        <img
          src="/SAMURAI_TAX_Logo_white.png"
          alt="SAMURAI TAX"
          className="w-80 m-auto object-contain"
        />

        <button
          type="button"
          onClick={handleSwitch}
          className="border-2 border-white text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-white hover:text-[#164d86] transition-all duration-200 w-full"
        >
          {isShop ? "管理者の方はこちら" : "店舗の方はこちら"}
        </button>
      </div>
    </div>
  );
}

// ── Main LoginForm component ──

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const context = useContext(LoginCompanyContext);
  if (!context) throw new Error("LoginForm must be used within a LoginCompanyProvider");

  const { setLoginCompany, setLoginShop, setIsLoggedIn } = context;
  const [loginInfo, setLoginInfo] = useState({ login_id: "", login_password: "" });
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState<"company" | "shop">("shop");

  const router = useRouter();
  const searchParams = useSearchParams();
  const isShop = loginType === "shop";

  const handleSwitch = () => {
    setLoginType(isShop ? "company" : "shop");
    setLoginInfo({ login_id: "", login_password: "" });
  };

  const handleSetLoginType = (type: "company" | "shop") => {
    setLoginType(type);
    setLoginInfo({ login_id: "", login_password: "" });
  };

  const onClickLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading) return;
    if (!loginInfo.login_id || !loginInfo.login_password) {
      alert("IDとパスワードを入力してください");
      return;
    }
    e.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("username", loginInfo.login_id);
      params.append("password", loginInfo.login_password);

      if (loginType === "company") {
        const response = await axios.post(
          `${API_BASE_URL}/auth/company-token`,
          params,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" }, withCredentials: true },
        );
        setLoginCompany(response.data);
        sessionStorage.setItem("authCompany", JSON.stringify(response.data));
      } else {
        const response = await axios.post(
          `${API_BASE_URL}/auth/shop-token`,
          params,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" }, withCredentials: true },
        );
        setLoginShop(response.data);
        sessionStorage.setItem("authShop", JSON.stringify(response.data));
      }

      setIsLoggedIn(true);
      const redirectTo = searchParams.get("redirect") || "/dashboard";
      router.push(redirectTo);
    } catch (error) {
      console.error(error);
      alert("ログインに失敗しました。IDとパスワードを確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const formProps = { isShop, loginInfo, setLoginInfo, loading, onClickLogin, setLoginType: handleSetLoginType };
  const brandProps = { isShop, handleSwitch };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="overflow-hidden rounded-2xl shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[420px]">

          {/* LEFT panel */}
          {/* Mobile: always FormPanel | Desktop: FormPanel (shop) or BrandPanel (company) */}
          <div className="min-h-[420px]">

            {/* Mobile — always show FormPanel */}
            <div className="block md:hidden h-full">
              <FormPanel {...formProps} />
            </div>

            {/* Desktop — animate between FormPanel and BrandPanel */}
            <div className="hidden md:block h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isShop ? "left-form" : "left-brand"}
                  initial={{ opacity: 0, x: isShop ? -40 : 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isShop ? 40 : -40 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="h-full"
                >
                  {isShop ? <FormPanel {...formProps} /> : <BrandPanel {...brandProps} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT panel — hidden on mobile, always visible on desktop */}
          <div className="hidden md:block min-h-[420px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={isShop ? "right-brand" : "right-form"}
                initial={{ opacity: 0, x: isShop ? 40 : -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isShop ? -40 : 40 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="h-full"
              >
                {isShop ? <BrandPanel {...brandProps} /> : <FormPanel {...formProps} />}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>

      <p className="px-6 text-center text-sm text-muted-foreground">
        ログインを押すことで、あなたは{" "}
        <a href="https://samurai-tax.com/terms" className="underline underline-offset-2">
          利用規約
        </a>{" "}
        と{" "}
        <a href="https://samurai-tax.com/privacy-policy" className="underline underline-offset-2">
          プライバシーポリシー
        </a>
        に同意したものとみなされます。
      </p>
    </div>
  );
}
