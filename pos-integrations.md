```tsx
// pos-integrations/square/page.tsx

"use client";

import { SiteHeader } from "@/components/site-header";
import ConnectCard from "@/components/square/connect-card";
import squareLogoBlack from "@/public/Square_Logo_2025_Black.png";
import squareLogoWhite from "@/public/Square_Logo_2025_White.png";
import { LoginCompanyContext } from "@/providers/LoginCompanyProvider";
import { useContext, useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

const Page = () => {
  const context = useContext(LoginCompanyContext);
  const [isConnected, setIsConnected] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  useEffect(() => {
    const fetchConnectionStatus = async () => {
      const companyId = context?.loginCompany?.company_id;
      if (!companyId) return;

      try {
        const response = await axios.get(`${API_BASE_URL}/company/company-detail/${companyId}`,{
           withCredentials: true 
          });
        setIsConnected(response.data.square_merchant_id !== null);
      }
      catch (error){
        console.error("Failed to fetch Square connection status:", error);
        setIsConnected(false);
      }
      finally {
        setIsStatusLoading(false);
      }
    };

    // ステータスを取得して接続状態を更新
    fetchConnectionStatus();
  }, [context?.loginCompany?.company_id]);

  const companyId = context?.loginCompany?.company_id;
  console.log(companyId)
  return (
    <>
      <SiteHeader title="Square" />
      <main className="flex min-h-4/5 items-center justify-center bg-muted/30 p-4">
        <ConnectCard
          posName="Square"
          logoSrc={squareLogoBlack.src}
          logoSrcDark={squareLogoWhite.src}
          isConnected={isConnected}
          isStatusLoading={isStatusLoading}
          companyId={companyId}
        />
      </main>
    </>
  );
};

export default Page;

```



```tsx
//connect-card.tsx

"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import squareLogo from "@/public/Square_Logo_2025_Black.png";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8010";

type ConnectCardProps = {
  isConnected?: boolean;
  isStatusLoading?: boolean;
  posName: string;
  companyId?: number;
  logoSrc?: string;
  logoSrcDark?: string;
  logoClassName?: string;
  logoWrapperClassName?: string;
};

const ConnectCard = ({
  isConnected = false,
  isStatusLoading = false,
  posName,
  companyId,
  logoSrc,
  logoSrcDark,
  logoClassName,
  logoWrapperClassName,
}: ConnectCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError === "access_denied") {
      setError(`${posName}連携がキャンセルされました。再度お試しください。`);
    }
  }, [searchParams, posName]);

  const handleConnectWithSquare = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/square/oauth`, 
        {
          params: { company_id: companyId },
          withCredentials: true,
      });
      window.location.href = response.data.auth_url;
      
    } catch (error) {
      setError(`${posName}との接続に失敗しました。再度お試しください。`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md rounded-xl border-2 border-gray-100 bg-background px-1 py-6 shadow-sm sm:px-4 sm:py-12">
      <CardHeader className="space-y-2 text-center">
        <div
          className={logoWrapperClassName ?? "flex items-center justify-center"}
        >
          {logoSrcDark ? (
            <>
              <Image
                width={logoClassName ? undefined : 300}
                height={logoClassName ? undefined : 48}
                src={logoSrc || squareLogo.src}
                alt={`${posName} Logo`}
                className={`dark:hidden ${logoClassName ?? "mx-auto h-12 w-auto"}`}
              />
              <Image
                width={logoClassName ? undefined : 300}
                height={logoClassName ? undefined : 48}
                src={logoSrcDark}
                alt={`${posName} Logo`}
                className={`hidden dark:block ${logoClassName ?? "mx-auto h-12 w-auto"}`}
              />
            </>
          ) : (
            <Image
              width={logoClassName ? undefined : 300}
              height={logoClassName ? undefined : 48}
              src={logoSrc || squareLogo.src}
              alt={`${posName} Logo`}
              className={`dark:invert ${logoClassName ?? "mx-auto h-12 w-auto"}`}
            />
          )}
        </div>
        <div className="space-y-2">
          <CardDescription className="text-sm leading-6 mx-auto text-muted-foreground">
            <span className="font-bold">Samurai Tax</span>と
            <span className="font-bold">{posName}</span>
            を接続して、支払い、注文、
            <br />
            取引データを同期します。
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isStatusLoading ? (
          <Button className="w-full h-12 rounded-md text-lg font-bold" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          </Button>
        ) : isConnected ? (
          <Button
            className="w-full h-12 rounded-md text-lg bg-[#164d86] font-bold text-white cursor-default"
            disabled
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            接続済み
          </Button>
        ) : (
          <Button
            className="w-full h-12 rounded-md text-lg font-bold"
            disabled={isLoading}
            onClick={handleConnectWithSquare}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                接続中です、少々お待ちください...
              </>
            ) : (
              `${posName}に接続する`
            )}
          </Button>
        )}
        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-justify">
            <span className="font-bold">Samurai Tax</span>は
            <span className="font-bold">{posName}</span>との接続にOAuth
            2.0を使用しており、ユーザーの認証情報を安全に保護します。接続後、
            <span className="font-bold">{posName}</span>
            からのデータは暗号化され、安全な方法で
            <span className="font-bold">Samurai Tax</span>に転送されます。
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectCard;

```
