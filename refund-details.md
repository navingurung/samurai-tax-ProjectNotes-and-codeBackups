```javascript
import {
  IconAlertTriangle,
  IconCircleCheckFilled,
  IconLoader,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type BadgeVariant = "success" | "info" | "warning" | "cancelled";

const getStatusVariant = (status: string): BadgeVariant => {
  switch (status) {
    case "送金済":
      return "success";
    case "税関審査待ち":
      return "warning";
    case "キャンセル":
    case "免税不可":
      return "cancelled";
    case "処理待ち":
    case "処理中":
    default:
      return "info";
  }
};

const renderStatusIcon = (variant?: BadgeVariant) => {
  switch (variant) {
    case "success":
      return (
        <IconCircleCheckFilled className="h-4 w-4 fill-green-500 dark:fill-green-400" />
      );
    case "warning":
      return <IconAlertTriangle className="h-4 w-4 text-yellow-500" />;
    case "cancelled":
      return <IconX className="h-4 w-4 text-red-500" />;
    case "info":
    default:
      return <IconLoader className="h-4 w-4 animate-spin duration-700" />;
  }
};

const statuses = [
  "処理待ち",
  "処理中",
  "税関審査待ち",
  "送金済",
  "キャンセル",
  "免税不可",
];

const currentStatus = "税関審査待ち";

export default function TaxFreeApplicationDetailPage() {
  const currentVariant = getStatusVariant(currentStatus);

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 rounded-xl border bg-background p-6 shadow-sm md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">免税申請詳細</h1>
              <p className="text-sm text-muted-foreground">
                申請内容の詳細をご確認いただけます。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">申請ID</p>
                <p className="font-medium">54</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">作成日時</p>
                <p className="font-medium">2026/03/31 07:08:46</p>
              </div>
            </div>
          </div>

          <Badge
            variant={currentVariant}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
          >
            {renderStatusIcon(currentVariant)}
            <span>{currentStatus}</span>
          </Badge>
        </div>

        {/* Top cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Passport Info */}
          <Card>
            <CardHeader>
              <CardTitle>パスポート情報</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <InfoItem label="パスポート番号" value="AAA1234" />
              <InfoItem label="氏名" value="AAAA AAAA" />
              <InfoItem label="国籍" value="USA" />
              <InfoItem label="生年月日" value="2000/03/01" />
              <InfoItem label="在留資格" value="短期滞在" />
              <InfoItem label="入国日" value="2026/03/29" />
            </CardContent>
          </Card>

          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle>注文情報</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <InfoItem label="注文ID" value="10507104977190" />
              <InfoItem label="合計（税込）" value="¥10,000" />
              <InfoItem label="消費税額" value="¥909" />
            </CardContent>
          </Card>
        </div>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>ステータス</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">現在のステータス</p>
              <Badge
                variant={currentVariant}
                className="inline-flex items-center gap-1.5 px-3 py-1.5"
              >
                {renderStatusIcon(currentVariant)}
                <span>{currentStatus}</span>
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => {
                const variant = getStatusVariant(status);
                const isActive = status === currentStatus;

                return (
                  <Badge
                    key={status}
                    variant={variant}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${
                      isActive ? "" : "opacity-60"
                    }`}
                  >
                    {renderStatusIcon(variant)}
                    <span>{status}</span>
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* NTA Info */}
        <Card>
          <CardHeader>
            <CardTitle>NTA送信情報</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InfoItem label="送信済リクエスト" value="送信済" />
            <InfoItem label="国税庁レスポンス" value="－" />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button asChild variant="outline">
            <Link href="/dashboard">ダッシュボードへ戻る</Link>
          </Button>

          <Button variant="destructive">申請を取り消す</Button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1 rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
```
