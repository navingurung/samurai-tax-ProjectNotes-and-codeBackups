```javascript

"use client";

import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { STATUS, type Status } from "@/lib/constants/status";
import { AccordionDemo } from "@/app/dashboard/refund/[id]/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Refund = {
  id: string;
  status: Status;
  created_at: string;
  passport_no: string;
  name: string;
  nation: string;
  birth_date: string;
  land_status: string;
  land_date: string;
  email: string;
  residence_country: string;
  chinese_state: string;
  total_tax: number;
  total_received: number;
  order_id: string;
  request_body?: string;
  response_body?: string;
  delete_request_body?: string;
  delete_response_body?: string;
  deleted_at?: string;
};

// 2026-02-20T06:56:19.663114(UTC)を 2026/02/20 15:56:19(JST)の形式に変換する関数
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const landStatusMap: Record<string, string> = {
  "11": "短期滞在",
  "14": "外交",
  "17": "公用",
  "99": "その他",
  "96": "米軍構成員",
  "91": "上陸許可書による入国",
  "95": "非居住者に該当する日本国籍の者",
};

// YYYYMMDD を YYYY/MM/DD に変換する関数
const formatDateCompact = (dateStr: string) => {
  if (dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(0, 4)}/${dateStr.slice(4, 6)}/${dateStr.slice(6)}`;
};

export default function RefundDetailClient({ refund }: { refund: Refund }) {
  if (!refund) {
    return null;
  }

  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  // 画面を即時更新するためのローカル状態
  const [status, setStatus] = useState<Status>(refund.status);
  const [deletedAt, setDeletedAt] = useState<string | undefined>(
    refund.deleted_at,
  );

  const router = useRouter();

  {
    /* 取消可能なステータスのリストを定義（STATUS オブジェクトのキーから） */
  }
  const cancelableStatuses: Status[] = [
    "requested",
    "customs_review_pending",
    "trj_customer_registration_pending",
    "trj_transaction_registration_pending",
  ];

  const handleRefundDelete = async () => {
    if (!refund?.id) return;

    try {
      setIsDeleting(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/refund_delete/dashboard/${refund.id}`,
        {},
        {
          withCredentials: true,
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (response.status === 200) {
        toast.success("申請を取り消しました。", {
          className: "bg-green-500 text-white border-green-600",
        });
        setOpen(false);
        router.refresh();
        // 取消成功後、画面表示を即時更新
        setStatus("cancelled");
        setDeletedAt(new Date().toISOString());
      } else {
        toast.error("取消に失敗しました。");
      }
    } catch (error: any) {
      console.log("refund削除失敗", error);
      toast.error(
        error.response?.data?.details || "取消処理中にエラーが発生しました。",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  { /* 申請のステータスが取消可能なステータスのいずれかに該当するかを判定する変数 */ }
  const canCancel = cancelableStatuses.includes(status);
  { /* 取消処理中の場合も取消ボタンを無効化するための変数 */}
  const disable = !canCancel || isDeleting;

  return (
    <div className="max-w-3xl w-full mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">免税申請詳細</h1>
      </div>
      <div>
        <ID label="申請ID" value={refund.id} />
        <ID label="作成日時" value={formatDate(refund.created_at)} />
        {deletedAt && (
          <ID label="取消日時" value={formatDate(deletedAt)} />
        )}
        <Badge variant={STATUS[status]?.variant as any}>
          {STATUS[status]?.label || status}
        </Badge>
      </div>

      {/* パスポート情報 */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h2 className="font-semibold">パスポート情報</h2>
          <Separator />
          <Info label="パスポート番号" value={refund.passport_no} />
          <Info label="氏名" value={refund.name} />
          <Info label="国籍" value={refund.nation} />
          <Info label="生年月日" value={formatDateCompact(refund.birth_date)} />
          <Info label="在留資格" value={landStatusMap[refund.land_status]} />
          <Info label="入国日" value={formatDateCompact(refund.land_date)} />
          {/* <Info label="メールアドレス" value={refund.emailAddress} /> */}
          {refund.residence_country && (
            <Info label="居住国" value={refund.residence_country} />
          )}
          {refund.chinese_state && (
            <Info label="居住州" value={refund.chinese_state} />
          )}
        </CardContent>
      </Card>

      {/* 金額情報 */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h2 className="font-semibold">注文情報</h2>
          <Separator />
          <Info label="注文ID" value={refund.order_id || "-"} />
          <Info
            label="合計（税込）"
            value={`¥${(refund.total_received ?? 0).toLocaleString()}`}
          />
          <Info
            label="消費税額"
            value={`¥${(refund.total_tax ?? 0).toLocaleString()}`}
          />
        </CardContent>
      </Card>

      {/* NTA送信情報 */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <h2 className="font-semibold">NTA送信情報</h2>
          <Separator />
          <AccordionDemo
            sent_request_json={refund.request_body}
            response_request_json={refund.response_body}
            sent_delete_json={refund.delete_request_body}
            response_delete_json={refund.delete_response_body}
          />
        </CardContent>
      </Card>

      {/* アクション */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard">ダッシュボードへ戻る</Link>
        </Button>

        {/* 取消可能なステータスの場合のみ取消ボタンを表示 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={disable ? 0 : -1}>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" disabled={disable}>
                      申請を取り消す
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>この申請を取り消しますか？</DialogTitle>
                      <DialogDescription>
                        取り消し後、この申請はキャンセルとして記録されます。
                      </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <DialogClose asChild>
                        <Button variant="outline">キャンセル</Button>
                      </DialogClose>

                      <Button
                        variant="destructive"
                        disabled={isDeleting}
                        onClick={handleRefundDelete}
                      >
                        {isDeleting ? "取消中..." : "取り消す"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </span>
            </TooltipTrigger>
            {!canCancel && !isDeleting && (
              <TooltipContent>
                <p>このステータスでは、申請を取り消すことができません。</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

/_ ---------- 小コンポーネント ---------- _/;

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ID({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}



```
