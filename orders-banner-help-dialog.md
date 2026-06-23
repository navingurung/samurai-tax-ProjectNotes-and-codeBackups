```jsx

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Divider,
  TextField,
  Button,
  Card,
  Backdrop,
  CircularProgress,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Tooltip,
  Tabs,
  Tab,
} from "@mui/material";
import { colors } from "../../shared/styles/colors";
import axios from "axios";
import { LoginShopContext } from "../../shared/providers/LoginShopProvider";
import { useContext } from "react";
import dayjs from "dayjs";
import { useCustomSnackbar } from "../../shared/providers/Snackbar";
import { useTranslation } from "react-i18next";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import MergeIcon from "@mui/icons-material/Merge";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HelpOutlineSharpIcon from "@mui/icons-material/HelpOutlineSharp";
import InventoryIcon from "@mui/icons-material/Inventory";
import FlightIcon from "@mui/icons-material/Flight";
import BuildIcon from "@mui/icons-material/Build";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { SmaregiTransactionSelector } from "../../features/steps/smaregi/SmaregiTransactionSelector";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type OrderProps = {
  code: string;
  onCodeChange: (val: string) => void;
  onOrderChange: (order: any) => void;
  orderData: any;
  tax: string;
  orderId: string;
  onTaxChange: (tax: string) => void;
  onOrderIdChange: (orderId: string) => void;
  setActiveStep: (step: number) => void;
  emailAddress: string;
  onEmailAddressChange: (email: string) => void;
  received: string;
  onReceivedChange: (received: string) => void;
  discounts: string;
  onDiscountChange: (discounts: string) => void;
  isShopify: boolean;
  isSmaregi?: boolean;
};

const format_jpy = (amount: number) => {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ── Reusable step item for the 対応方法 section ─────────────────────────────

const StepItem = ({
  number,
  title,
  children,
  success = false,
}: {
  number: number | string;
  title: string;
  children?: React.ReactNode;
  success?: boolean;
}) => (
  <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
    <Box
      sx={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        bgcolor: success ? "success.light" : "info.light",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        mt: 0.25,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: "bold",
          color: success ? "success.dark" : "info.dark",
          fontSize: 11,
        }}
      >
        {number}
      </Typography>
    </Box>
    <Box sx={{ flex: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: "bold", mb: children ? 0.75 : 0 }}>
        {title}
      </Typography>
      {children}
    </Box>
  </Box>
);

// ── Mini dropdown UI mockup to illustrate the goodsType change ───────────────

const DropdownMockup = ({
  from,
  to,
  label,
  fromLabel,
  toLabel,
  hint,
}: {
  from: string;
  to: string;
  label: string;
  fromLabel: string;
  toLabel: string;
  hint: string;
}) => (
  <Box
    sx={{
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 2,
      overflow: "hidden",
      bgcolor: "background.paper",
    }}
  >
    {/* Label row */}
    <Box
      sx={{
        px: 1.5,
        py: 0.75,
        bgcolor: "grey.100",
        borderBottom: "1px solid",
        borderColor: "divider",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{ color: "info.dark", fontWeight: "bold" }}
      >
        {hint}
      </Typography>
    </Box>
    {/* Current value */}
    <Box
      sx={{
        px: 1.5,
        py: 0.75,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        bgcolor: "error.50",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="caption" sx={{ color: "error.dark" }}>
        {fromLabel}：{from}
      </Typography>
      <SwapHorizIcon sx={{ fontSize: 14, color: "error.main" }} />
    </Box>
    {/* Target value */}
    <Box
      sx={{
        px: 1.5,
        py: 0.75,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        bgcolor: "success.50",
      }}
    >
      <Typography variant="caption" sx={{ color: "success.dark", fontWeight: "bold" }}>
        {toLabel}：{to}
      </Typography>
      <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />
    </Box>
  </Box>
);

// ── Staff / Customer info section ────────────────────────────────────────────
// Always shown at the bottom of the dialog, content changes per condition.

const StaffCustomerSection = ({
  staffText,
  customerText,
  staffTitle,
  customerTitle,
}: {
  staffText: string;
  customerText: string;
  staffTitle: string;
  customerTitle: string;
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
    <Divider />
    {/* For staff */}
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 2,
          bgcolor: "#E6F1FB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <InventoryIcon sx={{ fontSize: 18, color: "info.dark" }} />
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.25 }}>
          {staffTitle}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {staffText}
        </Typography>
      </Box>
    </Box>
    {/* For customer */}
    <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: 2,
          bgcolor: "#EAF3DE",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <FlightIcon sx={{ fontSize: 18, color: "success.dark" }} />
      </Box>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: "bold", mb: 0.25 }}>
          {customerTitle}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {customerText}
        </Typography>
      </Box>
    </Box>
  </Box>
);

export const Order: React.FC<OrderProps> = ({
  code,
  onCodeChange,
  onOrderChange,
  orderData,
  tax,
  orderId,
  onTaxChange,
  onOrderIdChange,
  setActiveStep,
  onEmailAddressChange,
  received,
  onReceivedChange,
  discounts,
  onDiscountChange,
  isShopify,
  isSmaregi,
}) => {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const context = useContext(LoginShopContext);
  if (!context) {
    throw new Error(t("headerError"));
  }
  const { loginShop } = context;
  if (!loginShop) {
    throw new Error(t("loginShopError"));
  }
  const [inputError, setInputError] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // NTA dialog — opened via floating help button or warning banner.
  // No agree/disagree flow; store staff adjusts items manually.
  const [ntaDialogOpen, setNtaDialogOpen] = useState(false);

  // Tab state for Condition 2 & 3 dialog (0 = Option A convert, 1 = Option B remove)
  const [ntaDialogTab, setNtaDialogTab] = useState(0);

  const purchaseInfoRef = useRef<HTMLDivElement | null>(null);

  // ── NTA eligibility scenario detection ───────────────────────────────────
  // All thresholds are based on 税抜 (tax-excluded) amounts per NTA rules.
  // generalTotal and consumTotal are already 税抜 values coming from the
  // SmaregiTransactionSelector or Shopify order handler.
  const THRESHOLD = 5000;
  const CONSUMABLE_MAX = 500000;

  const generalTotal = Number(orderData.generalTotal) || 0;
  const consumTotal = Number(orderData.consumTotal) || 0;
  const combinedTotal = generalTotal + consumTotal;

  const generalOk = generalTotal === 0 || generalTotal >= THRESHOLD;
  const consumOk =
    consumTotal === 0 ||
    (consumTotal >= THRESHOLD && consumTotal <= CONSUMABLE_MAX);

  // CONDITION 1 — both below ¥5,000 individually but combined ≥ ¥5,000
  // → NTA 合算ルール applies; staff must repackage all items as consumables
  const scenarioCombined =
    generalTotal > 0 &&
    consumTotal > 0 &&
    !generalOk &&
    !consumOk &&
    combinedTotal >= THRESHOLD;

  // CONDITION 2 — 一般物品 meets threshold but 消耗品 does not
  // → Staff must manually reclassify 消耗品 items as 一般物品, or vice versa
  const scenarioGeneralOnly =
    generalTotal > 0 && generalTotal < THRESHOLD && consumOk;

  // CONDITION 3 — 消耗品 meets threshold but 一般物品 does not
  // → Staff must manually reclassify 一般物品 items as 消耗品
  const scenarioConsumableOnly =
    consumTotal > 0 && consumTotal < THRESHOLD && generalOk;

  // Any of the three warning conditions → Next is disabled until staff fixes items
  const scenarioWarning =
    scenarioCombined || scenarioGeneralOnly || scenarioConsumableOnly;

  // FULLY INELIGIBLE — combined total still below ¥5,000; no path to tax-free
  const scenarioIneligible = combinedTotal > 0 && combinedTotal < THRESHOLD;

  // CONDITION 4 — all items meet thresholds; no warnings, Next is enabled
  const scenarioNormal = generalOk && consumOk;

  // ── End scenario detection ────────────────────────────────────────────────

  // Reset dialog tab when dialog opens
  const handleOpenDialog = () => {
    setNtaDialogTab(0);
    setNtaDialogOpen(true);
  };

  const scrollToPurchaseInfo = () => {
    if (!purchaseInfoRef.current) return;
    const y =
      purchaseInfoRef.current.getBoundingClientRect().top + window.scrollY - 20;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const fetchData = async () => {
    const response = await axios.get(`${API_BASE_URL}/company`, {
      withCredentials: true,
    });
    const data = response.data;
    if (!data) {
      showSnackbar({
        message:
          t("orders.fetchCompanyError"),
        variant: "error",
      });
      return;
    } else {
      onOrderChange({
        ...orderData,
        senderId: data.sender.sender_id,
        senderIdType: data.sender.sender_type,
        shopId: data.shop.shop_id,
        shopType: data.shop.shop_type,
        shopName: data.shop.shop_name,
        shopPlace: data.shop.shop_place,
        bizName: data.company.biz_name,
        bizPlace: data.company.biz_place,
      });
    }
  };

  const { showSnackbar } = useCustomSnackbar();

  useEffect(() => {
    fetchData();
  }, []);

  const handleGetOrder = async () => {
    setLoading(true);
    const digitCode = code;
    if (digitCode.length !== 6) {
      setLoading(false);
      setInputError(true);
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/orders/${digitCode}`, {
        params: {
          shop_id: loginShop.id,
        },
        withCredentials: true,
      });
      if (response.status !== 200) {
        return;
      }
      const data = response.data;
      const email =
        data?.order?.raw_payload?.customer?.defaultEmailAddress?.emailAddress ||
        "";
      onEmailAddressChange(email);
      const details = data.order.raw_payload.lineItems.edges.map(
        ({ node }: any, index: number) => {
          const quantity = node.quantity;
          const title = node.title.substring(0, 50);
          const price = node.originalUnitPriceSet?.shopMoney?.amount
            ? node.originalUnitPriceSet.shopMoney.amount
            : node.variant?.price || 0;
          return {
            serial: index + 1,
            goodsType: "1",
            goodsName: title,
            number: quantity,
            priceWithTax: Number(price) * Number(quantity),
            price: Math.floor((Number(price) * 100) / 110) * Number(quantity),
            reduced: 0,
            lqIndividual: 0,
          };
        },
      );

      const titleCount: Record<string, number> = {};
      const renamedDetails = details.map((item: any) => {
        const baseName = item.goodsName;
        if (titleCount[baseName]) {
          titleCount[baseName] += 1;
          return {
            ...item,
            goodsName: `#${titleCount[baseName]} ${baseName}`,
          };
        } else {
          titleCount[baseName] = 1;
          return item;
        }
      });
      const finalDetails = renamedDetails.map((item: any) => ({
        ...item,
        goodsName: item.goodsName.substring(0, 50),
      }));
      const receivedAmount = data.order.raw_payload.totalReceivedSet?.shopMoney
        ? data.order.raw_payload.totalReceivedSet.shopMoney.amount
        : data.order.raw_payload.totalReceived;
      const received = parseInt(receivedAmount, 10);
      onReceivedChange(received.toString());
      const discountAmount = data.order.raw_payload.totalDiscountsSet?.shopMoney
        ? data.order.raw_payload.totalDiscountsSet.shopMoney.amount
        : data.order.raw_payload.totalDiscounts;
      const discount = parseInt(discountAmount, 10);
      onDiscountChange(discount.toString());

      let taxRaw = data.order.raw_payload.totalTaxSet?.shopMoney
        ? data.order.raw_payload.totalTaxSet.shopMoney.amount
        : data.order.raw_payload.totalTax;
      let tax = parseInt(taxRaw, 10);
      // 0 / NaN / null / undefined の場合のフォールバック処理
      if (!tax || isNaN(tax) || tax === 0) {
        tax = Math.floor(received / 11);
      }
      onTaxChange(tax.toString());
      const netTotal = received - tax;
      const orderId = data.order_id.order_id;
      onOrderIdChange(orderId);
      const sellDate = dayjs(data.order.raw_payload.createdAt).format(
        "YYYYMMDD",
      );
      onOrderChange({
        details: finalDetails,
        sellDate: sellDate,
        // consumTotal: "0",
        generalTotal: netTotal.toString(),
        lqExemptOrNot: "0",
        transOrNot: "0",
      });
      requestAnimationFrame(() => {
        scrollToPurchaseInfo();
      });
    } catch (error) {
      showSnackbar({
        message: t("orders.fetchOrderError"),
        variant: "error",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 商品追加用のハンドラー
  const makeItem = (serial: number) => ({
    serial: serial,
    goodsType: "1",
    goodsName: "",
    number: "1",
    price: "",
    priceWithTax: "",
    reduced: 0,
    lqIndividual: 0,
  });

  const handleAddItem = () => {
    const nextSerial = (orderData.details?.length || 0) + 1;
    const next = [...(orderData.details || []), makeItem(nextSerial)];
    onOrderChange({ ...orderData, details: next });
  };

  const handleDeleteItem = (serial: number) => {
    const filtered = (orderData.details || []).filter(
      (it: any) => it.serial !== serial,
    );
    const renumbered = filtered.map((it: any, idx: number) => ({
      ...it,
      serial: idx + 1,
    }));
    onOrderChange({ ...orderData, details: renumbered });
  };

  // 各項目が「未入力（または不正）」かどうかを判定する。
  // Shopify 連携時は自動入力＆編集不可のため、基本的にエラーにはならない。
  const details = orderData.details ?? [];
  const orderIdError = !orderId || String(orderId).trim() === "";
  const sellDateError = !orderData.sellDate;
  const itemErrors = details.map((item: any) => ({
    goodsName: !item.goodsName || String(item.goodsName).trim() === "",
    number:
      !item.number ||
      !Number.isFinite(Number(item.number)) ||
      Number(item.number) <= 0,
    price:
      item.price === "" ||
      item.price === null ||
      item.price === undefined ||
      !Number.isFinite(Number(item.price)) ||
      Number(item.price) < 0,
  }));
  const hasItemError = itemErrors.some(
    (e: any) => e.goodsName || e.number || e.price,
  );
  const noItems = details.length === 0;

  const isFormValid =
    !orderIdError &&
    !sellDateError &&
    !noItems &&
    !hasItemError &&
    orderData.generalTotal !== "";

  // Next ボタンを押せる条件は、フォームが有効でかつ NTA 警告がない場合
  const canProceed = isFormValid && !scenarioWarning && !scenarioIneligible;

  const onNext = () => {
    if (!isFormValid) {
      // 未入力・不正な項目があれば、それらを赤く表示して先に進ませない
      setSubmitted(true);
      return;
    }
    if (!canProceed) return;
    setActiveStep(1);
  };

  // ──　警告バナーコンポーネント ────────────────────────────────────
  const WarningBanner = ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <Box
      sx={{
        p: 2,
        border: "1px solid",
        borderColor: "warning.main",
        borderRadius: 2,
        bgcolor: "#fff8f0",
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
      }}
    >
      <WarningAmberIcon
        sx={{
          color: "warning.dark",
          fontSize: 22,
          mt: 0.2,
          flexShrink: 0,
          "@keyframes pulse": {
            "0%, 100%": { opacity: 1 },
            "50%": { opacity: 0.4 },
          },
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <Box>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: "bold", color: "warning.dark" }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, lineHeight: 1.6 }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  );
  // ── 警告バナーコンポーネント 終了 ─────────────────────────────────────────────────────

  return (
    <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <Box
        sx={{
          mt: 2,
          mb: 4,
          textAlign: "left",
          width: {
            xs: "100%",
            md: "80%",
          },
        }}
      >
        <Backdrop
          sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
          open={loading}
        >
          <CircularProgress color="inherit" />
          <Typography sx={{ ml: 2 }}>{t("orders.fetchingOrder")}</Typography>
        </Backdrop>

      {/* NTAダイヤログは、右下のフローティングヘルプボタンまたは警告バナーから開きます。 */} 
       <Dialog
          open={ntaDialogOpen}
          onClose={() => setNtaDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          fullScreen={false}
          PaperProps={{
            sx: {
              borderRadius: { xs: 0, sm: 3 },
              p: { xs: 0, sm: 1 },
              m: { xs: 0, sm: 2 },
              maxHeight: { xs: "100dvh", sm: "90dvh" },
              width: { xs: "100%", sm: undefined },
            },
          }}
        >
          {/* Dialog header */}
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              pb: 1,
              pt: { xs: 2, sm: 2 },
            }}
          >
            <HelpOutlineSharpIcon sx={{ color: colors.darkBlue, fontSize: 28 }} />
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: "bold",
                  color: colors.darkBlue,
                  lineHeight: 1.2,
                  fontSize: { xs: 16, sm: 20 },
                }}
              >
                {t("orders.ntaDialogTitle")}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {t("orders.ntaDialogSubtitle")}
              </Typography>
            </Box>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 0, overflowY: "auto" }}>

            {/* ── 合計内訳: 一般物品 + 消耗品 = 合計 ────────── */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                p: 2,
                bgcolor: "grey.50",
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box sx={{ flex: 1, textAlign: "center" }}>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                  {t("orders.generalTotal")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {format_jpy(generalTotal)}
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ color: "text.secondary" }}>＋</Typography>
              <Box sx={{ flex: 1, textAlign: "center" }}>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                  {t("orders.consumableTotal")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                  {format_jpy(consumTotal)}
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ color: "text.secondary" }}>＝</Typography>
              <Box sx={{ flex: 1, textAlign: "center" }}>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                  {t("orders.ntaDialogCombined")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold", color: "success.dark" }}>
                  {format_jpy(combinedTotal)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ p: { xs: 2, sm: 2.5 }, display: "flex", flexDirection: "column", gap: 2.5 }}>

              {/* ── 条件 1: 両方 < ¥5,000, 合計 ≥ ¥5,000 ───────────
                  NTA 合算ルール — すべての一般物品を消耗品に変更し、一括梱包 */}
              {scenarioCombined && (
                <Box>
                  {/* Active badge */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                    <MergeIcon sx={{ fontSize: 18, color: "warning.dark" }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: "warning.dark", flex: 1 }}>
                      {t("orders.ntaSuggestionTitle")}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ border: "1px solid", borderColor: "warning.dark", color: "warning.dark", px: 1, py: 0.25, borderRadius: 1, fontWeight: "bold" }}
                    >
                      {t("orders.ntaActive")}
                    </Typography>
                  </Box>

                  {/* 対応方法 header */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      p: 1.25,
                      bgcolor: "warning.50",
                      borderRadius: "8px 8px 0 0",
                      border: "1px solid",
                      borderColor: "warning.light",
                      borderBottom: "none",
                    }}
                  >
                    <BuildIcon sx={{ fontSize: 16, color: "warning.dark" }} />
                    <Typography variant="body2" sx={{ fontWeight: "bold", color: "warning.dark" }}>
                      {t("orders.ntaHowToSolve")}
                    </Typography>
                  </Box>

                  {/* Steps */}
                  <Box
                    sx={{
                      p: 2,
                      border: "1px solid",
                      borderColor: "warning.light",
                      borderRadius: "0 0 8px 8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                    }}
                  >
                    <StepItem number={1} title={t("orders.ntaStep1FindGeneral")} />

                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      <ArrowDownwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    </Box>

                    <StepItem number={2} title={t("orders.ntaStep2ChangeToConsumable")}>
                      <DropdownMockup
                        from={t("orders.ntaDropdownFromGeneral")}
                        to={t("orders.ntaDropdownToConsumable")}
                        label={t("orders.ntaDropdownLabel")}
                        hint={t("orders.ntaDropdownHint")}
                        fromLabel={t("orders.ntaDropdownFrom")}
                        toLabel={t("orders.ntaDropdownTo")}
                      />
                    </StepItem>

                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      <ArrowDownwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    </Box>

                    <StepItem number={3} title={t("orders.ntaStep3CheckGeneralZero")}>
                      <Box
                        sx={{
                          mt: 0.5,
                          p: 1,
                          bgcolor: "success.50",
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "success.light",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {t("orders.ntaGeneralTotalLabel")}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: "bold", color: "success.dark" }}>
                          ¥0 ✓
                        </Typography>
                      </Box>
                    </StepItem>

                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      <ArrowDownwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                    </Box>

                    <StepItem number={4} title={t("orders.ntaStep4Proceed")} success />
                  </Box>

                  {/* Staff + Customer — always shown, Condition 1 content */}
                  <Box sx={{ mt: 2 }}>
                    <StaffCustomerSection
                      staffTitle={t("orders.ntaStaffTitle")}
                      customerTitle={t("orders.ntaCustomerTitle")}
                      staffText={t("orders.ntaStaffCombined")}
                      customerText={t("orders.ntaCustomerText")}
                    />
                  </Box>
                </Box>
              )}

              {/* ── 条件 2: 一般物品 < ¥5,000, 消耗品 ≥ ¥5,000 ───────────
                  スタッフは消耗品を一般物品に手動で再分類する必要があります、またはその逆 */}
              {scenarioGeneralOnly && (
                <Box>
                  {/* Active badge */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                    <SwapHorizIcon sx={{ fontSize: 18, color: "warning.dark" }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: "warning.dark", flex: 1 }}>
                      {t("orders.ntaConsumableOnlyTitle")}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ border: "1px solid", borderColor: "warning.dark", color: "warning.dark", px: 1, py: 0.25, borderRadius: 1, fontWeight: "bold" }}
                    >
                      {t("orders.ntaActive")}
                    </Typography>
                  </Box>

                  {/* Option tabs */}
                  <Tabs
                    value={ntaDialogTab}
                    onChange={(_, v) => setNtaDialogTab(v)}
                    sx={{ mb: 0, borderBottom: "1px solid", borderColor: "divider" }}
                    variant="fullWidth"
                  >
                    <Tab label={t("orders.ntaOptionAConvert")} sx={{ textTransform: "none", fontSize: 13 }} />
                    <Tab label={t("orders.ntaOptionBDeleteConsumable")} sx={{ textTransform: "none", fontSize: 13 }} />
                  </Tabs>

                  {/* Option A — convert all 一般物品 → 消耗品 */}
                  {ntaDialogTab === 0 && (
                    <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <StepItem number={1} title={t("orders.ntaStep1FindGeneral")} />
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <ArrowDownwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      </Box>
                      <StepItem number={2} title={t("orders.ntaStep2ChangeToConsumable")}>
                        <DropdownMockup
                          from={t("orders.ntaDropdownFromGeneral")}
                          to={t("orders.ntaDropdownToConsumable")}
                          label={t("orders.ntaDropdownLabel")}
                          hint={t("orders.ntaDropdownHint")}
                          fromLabel={t("orders.ntaDropdownFrom")}
                          toLabel={t("orders.ntaDropdownTo")}
                        />
                      </StepItem>
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <ArrowDownwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      </Box>
                      <StepItem number={3} title={t("orders.ntaStep3CheckGeneralZero")}>
                        <Box
                          sx={{
                            mt: 0.5, p: 1, bgcolor: "success.50", borderRadius: 1,
                            border: "1px solid", borderColor: "success.light",
                            display: "flex", justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {t("orders.ntaGeneralTotalLabel")}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: "bold", color: "success.dark" }}>¥0 ✓</Typography>
                        </Box>
                      </StepItem>
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <ArrowDownwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      </Box>
                      <StepItem number={4} title={t("orders.ntaStep4Proceed")} success />
                    </Box>
                  )}

                  {/* Option B — remove 消耗品 items from list */}
                  {ntaDialogTab === 1 && (
                    <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <StepItem number={1} title={t("orders.ntaStep1FindConsumable")} />
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <ArrowDownwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      </Box>
                      <StepItem number={2} title={t("orders.ntaStep2DeleteConsumable")}>
                        <Box
                          sx={{
                            mt: 0.75, p: 1, border: "1px solid", borderColor: "divider",
                            borderRadius: 1, display: "flex", justifyContent: "space-between",
                            alignItems: "center", bgcolor: "background.paper",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {t("orders.ntaDeleteConsumableItem")}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <DeleteOutlineIcon sx={{ fontSize: 16, color: "error.main" }} />
                            <Typography variant="caption" sx={{ color: "error.main" }}>
                              {t("orders.ntaDeleteLabel")}
                            </Typography>
                          </Box>
                        </Box>
                      </StepItem>
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <ArrowDownwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      </Box>
                      <StepItem number={3} title={t("orders.ntaStep3CheckConsumableZero")}>
                        <Box
                          sx={{
                            mt: 0.5, p: 1, bgcolor: "success.50", borderRadius: 1,
                            border: "1px solid", borderColor: "success.light",
                            display: "flex", justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {t("orders.ntaConsumableTotalLabel")}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: "bold", color: "success.dark" }}>¥0 ✓</Typography>
                        </Box>
                      </StepItem>
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <ArrowDownwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      </Box>
                      <StepItem number={4} title={t("orders.ntaStep4Proceed")} success />
                    </Box>
                  )}

                  {/* Staff + Customer — content changes per tab */}
                  <Box sx={{ mt: 2 }}>
                    <StaffCustomerSection
                      staffTitle={t("orders.ntaStaffTitle")}
                      customerTitle={t("orders.ntaCustomerTitle")}
                      staffText={ntaDialogTab === 0 ? t("orders.ntaStaffCombined") : t("orders.ntaStaffGeneralOnly")}
                      customerText={t("orders.ntaCustomerText")}
                    />
                  </Box>
                </Box>
              )}

              {/* ── CONDITION 3: 消耗品 ok, 一般物品 < ¥5,000 ────────────────
                  Two options — tabs: convert 一般物品 → 消耗品, or remove 一般物品 */}
              {scenarioConsumableOnly && (
                <Box>
                  {/* Active badge */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                    <DeleteOutlineIcon sx={{ fontSize: 18, color: "warning.dark" }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: "warning.dark", flex: 1 }}>
                      {t("orders.ntaGeneralOnlyTitle")}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ border: "1px solid", borderColor: "warning.dark", color: "warning.dark", px: 1, py: 0.25, borderRadius: 1, fontWeight: "bold" }}
                    >
                      {t("orders.ntaActive")}
                    </Typography>
                  </Box>

                  {/* Option tabs */}
                  <Tabs
                    value={ntaDialogTab}
                    onChange={(_, v) => setNtaDialogTab(v)}
                    sx={{ mb: 0, borderBottom: "1px solid", borderColor: "divider" }}
                    variant="fullWidth"
                  >
                    <Tab label={t("orders.ntaOptionAConvert")} sx={{ textTransform: "none", fontSize: 13 }} />
                    <Tab label={t("orders.ntaOptionBDeleteGeneral")} sx={{ textTransform: "none", fontSize: 13 }} />
                  </Tabs>

                  {/* Option A — convert 一般物品 → 消耗品 */}
                  {ntaDialogTab === 0 && (
                    <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <StepItem number={1} title={t("orders.ntaStep1FindGeneral")} />
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <ArrowDownwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      </Box>
                      <StepItem number={2} title={t("orders.ntaStep2ChangeToConsumable")}>
                        <DropdownMockup
                          from={t("orders.ntaDropdownFromGeneral")}
                          to={t("orders.ntaDropdownToConsumable")}
                          label={t("orders.ntaDropdownLabel")}
                          hint={t("orders.ntaDropdownHint")}
                          fromLabel={t("orders.ntaDropdownFrom")}
                          toLabel={t("orders.ntaDropdownTo")}
                        />
                      </StepItem>
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <ArrowDownwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      </Box>
                      <StepItem number={3} title={t("orders.ntaStep3CheckGeneralZero")}>
                        <Box
                          sx={{
                            mt: 0.5, p: 1, bgcolor: "success.50", borderRadius: 1,
                            border: "1px solid", borderColor: "success.light",
                            display: "flex", justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {t("orders.ntaGeneralTotalLabel")}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: "bold", color: "success.dark" }}>¥0 ✓</Typography>
                        </Box>
                      </StepItem>
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <ArrowDownwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      </Box>
                      <StepItem number={4} title={t("orders.ntaStep4Proceed")} success />
                    </Box>
                  )}

                  {/* Option B — remove 一般物品 items from list */}
                  {ntaDialogTab === 1 && (
                    <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <StepItem number={1} title={t("orders.ntaStep1FindGeneral")} />
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <ArrowDownwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      </Box>
                      <StepItem number={2} title={t("orders.ntaStep2DeleteGeneral")}>
                        <Box
                          sx={{
                            mt: 0.75, p: 1, border: "1px solid", borderColor: "divider",
                            borderRadius: 1, display: "flex", justifyContent: "space-between",
                            alignItems: "center", bgcolor: "background.paper",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {t("orders.ntaDeleteGeneralItem")}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <DeleteOutlineIcon sx={{ fontSize: 16, color: "error.main" }} />
                            <Typography variant="caption" sx={{ color: "error.main" }}>
                              {t("orders.ntaDeleteLabel")}
                            </Typography>
                          </Box>
                        </Box>
                      </StepItem>
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <ArrowDownwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      </Box>
                      <StepItem number={3} title={t("orders.ntaStep3CheckGeneralZero")}>
                        <Box
                          sx={{
                            mt: 0.5, p: 1, bgcolor: "success.50", borderRadius: 1,
                            border: "1px solid", borderColor: "success.light",
                            display: "flex", justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {t("orders.ntaGeneralTotalLabel")}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: "bold", color: "success.dark" }}>¥0 ✓</Typography>
                        </Box>
                      </StepItem>
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <ArrowDownwardIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                      </Box>
                      <StepItem number={4} title={t("orders.ntaStep4Proceed")} success />
                    </Box>
                  )}

                  {/* Staff + Customer — always shown, content changes per tab */}
                  <Box sx={{ mt: 2 }}>
                    <StaffCustomerSection
                      staffTitle={t("orders.ntaStaffTitle")}
                      customerTitle={t("orders.ntaCustomerTitle")}
                      staffText={t("orders.ntaStaffCombined")}
                      customerText={t("orders.ntaCustomerText")}
                    />
                  </Box>
                </Box>
              )}

              {/* ── CONDITION 4: both ok — no action needed ───────────────── */}
              {scenarioNormal && (
                <Box
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor: "success.main",
                    borderRadius: 2,
                    bgcolor: "#f1f8e9",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <CheckCircleIcon sx={{ color: "success.dark", fontSize: 24, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: "bold", color: "success.dark" }}>
                      {t("orders.ntaCondition4Title")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      {t("orders.ntaCondition4Text")}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* ── Fully ineligible — no conditions active ───────────────── */}
              {scenarioIneligible && (
                <Box
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor: "error.main",
                    borderRadius: 2,
                    bgcolor: "#fff5f5",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <ErrorOutlineIcon sx={{ color: "error.main", fontSize: 24, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: "bold", color: "error.dark" }}>
                      {t("orders.ntaIneligible")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      {t("orders.ntaIneligibleSub")}
                    </Typography>
                  </Box>
                </Box>
              )}

            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2 }}>
            <Button
              variant="contained"
              onClick={() => setNtaDialogOpen(false)}
              fullWidth
              sx={{
                borderRadius: 2,
                textTransform: "none",
                bgcolor: colors.darkBlue,
                "&:hover": { bgcolor: colors.darkBlue },
                minHeight: { xs: 48, sm: 40 },
              }}
            >
              {t("orders.ntaDialogClose")}
            </Button>
          </DialogActions>
        </Dialog>
        {/* ── End NTA Reference Dialog ─────────────────────────────────────── */}

        {isShopify && (
          <>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
              {t("orders.sixDigitCodeTitle")}
            </Typography>
            <Divider />
            <Box sx={{ textAlign: "center", mt: 4 }}>
              <Typography sx={{ mt: 2 }}>
                {t("orders.sixDigitCodeInstructions")}
              </Typography>
              <TextField
                variant="outlined"
                label={t("orders.sixDigitCodeLabel")}
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                sx={{ mt: 4, mb: 2, width: "100%" }}
                error={inputError}
                helperText={
                  inputError ? t("orders.sixDigitCodeError") : ""
                }
                autoComplete="off"
                slotProps={{
                  input: {
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.target.value;
                      onCodeChange(value);
                      const regex = /^[A-Z]{6}$/;
                      if (!regex.test(value)) {
                        setInputError(true);
                      } else {
                        setInputError(false);
                      }
                    },
                  },
                }}
              />
            </Box>
            <Box sx={{ textAlign: "center", mt: 2, mb: 8 }}>
              <Button
                variant="contained"
                sx={{
                  width: { xs: "100%", sm: "60%" },
                  bgcolor: `${colors.blue}`,
                  borderRadius: 3,
                  textTransform: "none",
                  minHeight: "120px",
                }}
                onClick={() => {
                  handleGetOrder();
                }}
                disabled={inputError}
              >
                <Typography
                  variant="h5"
                  sx={{ color: colors.white, fontWeight: "bold" }}
                  >
                  {t("orders.fetchOrder")}
                </Typography>
              </Button>
            </Box>
          </>
        )}

        {isSmaregi && (
          <>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ fontWeight: "bold" }}
            >
              {t("orders.smaregiTransaction")}
            </Typography>
            <Divider />
            <Box sx={{ mt: 4, mb: 4 }}>
              <SmaregiTransactionSelector
                onOrderChange={onOrderChange}
                onTaxChange={onTaxChange}
                onOrderIdChange={onOrderIdChange}
                onReceivedChange={onReceivedChange}
              />
            </Box>
          </>
        )}
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontWeight: "bold" }}
          ref={purchaseInfoRef}
        >
          {t("orders.purchaseInformation")}
        </Typography>
        <Divider />
        <Box
          sx={{
            textAlign: "center",
            mb: 2,
            mt: 2,
            gap: 4,
            pt: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <TextField
            variant="outlined"
            label={t("orders.storeName")}
            value={orderData.shopName}
            sx={{ width: "100%" }}
            autoComplete="off"
            disabled
          />
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label={t("orders.sellDate")}
              disableFuture
              format="LL"
              sx={{ width: "100%" }}
              value={orderData.sellDate ? dayjs(orderData.sellDate) : null}
              minDate={dayjs().subtract(180, "days")}
              onChange={(date) => {
                const formattedDate = date ? date.format("YYYYMMDD") : "";
                onOrderChange({
                  ...orderData,
                  sellDate: formattedDate,
                });
              }}
              slotProps={{
                textField: {
                  error: submitted && sellDateError,
                  helperText:
                    submitted && sellDateError ? t("requiredField") : undefined,
                },
              }}
            />
          </LocalizationProvider>
          <TextField
            variant="outlined"
            label={t("orders.orderIdOrReceiptNo")}
            value={orderId}
            sx={{ width: "100%" }}
            autoComplete="off"
            onChange={(e) => onOrderIdChange(e.target.value)}
            error={submitted && orderIdError}
            helperText={submitted && orderIdError ? t("requiredField") : undefined}
            required
          />
        </Box>
        <Box
          sx={{
            // textAlign: "left",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
          }}
        >
          {details.length > 0 && (
            <>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {t("orders.items")}
              </Typography>
              {details.map((product: any, index: number) => (
                <Card
                  sx={{ mt: 2, width: "100%", bgcolor: "#f5f5f5" }}
                  key={product.serial}
                >
                  <Box sx={{ padding: 2 }}>
                    <Box
                      sx={{
                        justifyContent: "space-between",
                        display: "flex",
                      }}
                    >
                      <Typography
                        sx={{
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {t("orders.serialNumber")}： {product.serial}
                      </Typography>
                      {product.serial > 1 && (
                        <IconButton
                          onClick={() => handleDeleteItem(product.serial)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                    <Box
                      sx={{
                        textAlign: "center",
                        gap: 2,
                        pt: 2,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <FormControl
                        sx={{ width: "100%", backgroundColor: colors.white }}
                      >
                        <InputLabel>{t("orders.goodsType")}</InputLabel>
                        <Select
                          label={t("orders.goodsType")}
                          value={product.goodsType}
                          onChange={(e) => {
                            const updatedDetails = details.map(
                              (item: any) =>
                                item.serial === product.serial
                                  ? { ...item, goodsType: e.target.value }
                                  : item,
                            );
                            onOrderChange({
                              ...orderData,
                              details: updatedDetails,
                            });
                          }}
                        >
                          <MenuItem value="1" sx={{ height: "60px" }}>
                            {t("orders.goodsTypeNormal")}
                          </MenuItem>
                          <MenuItem value="2" sx={{ height: "60px" }}>
                            {t("orders.goodsTypeConsumable")}
                          </MenuItem>
                        </Select>
                      </FormControl>
                      {isShopify || isSmaregi ? (
                        // Shopify: display-only. Smaregi: product names come from the
                        // transaction and won't be in loginShop.product_list, so a
                        // free-text field is needed to show (and optionally edit) them.
                        <TextField
                          variant="outlined"
                          label={t("orders.productName")}
                          type="text"
                          value={product.goodsName}
                          sx={{ width: "100%", backgroundColor: colors.white }}
                          autoComplete="off"
                          error={submitted && itemErrors[index]?.goodsName}
                          helperText={
                            submitted && itemErrors[index]?.goodsName
                              ? t("requiredField")
                              : undefined
                          }
                          onChange={(e) => {
                            const updatedDetails = details.map(
                              (item: any) =>
                                item.serial === product.serial
                                  ? { ...item, goodsName: e.target.value }
                                  : item,
                            );
                            onOrderChange({
                              ...orderData,
                              details: updatedDetails,
                            });
                          }}
                        />
                      ) : (
                        <FormControl
                          error={submitted && itemErrors[index]?.goodsName}
                          sx={{ width: "100%", backgroundColor: colors.white }}
                        >
                          <InputLabel error={submitted && itemErrors[index]?.goodsName}>
                            {t("orders.productName")}
                          </InputLabel>
                          <Select
                            label={t("orders.productName")}
                            value={product.goodsName}
                            onChange={(e) => {
                              const updatedDetails = details.map(
                                (item: any) =>
                                  item.serial === product.serial
                                    ? { ...item, goodsName: e.target.value }
                                    : item,
                              );
                              onOrderChange({
                                ...orderData,
                                details: updatedDetails,
                              });
                            }}
                          >
                            {(loginShop.product_list || []).map(
                              (prod: string, index: number) => (
                                <MenuItem
                                  key={index}
                                  value={prod}
                                  sx={{ height: "60px" }}
                                >
                                  {prod}
                                </MenuItem>
                              ),
                            )}
                          </Select>
                        </FormControl>
                      )}

                      <TextField
                        variant="outlined"
                        label={t("orders.quantity")}
                        value={product.number}
                        sx={{ width: "100%", backgroundColor: colors.white }}
                        autoComplete="off"
                        type="number"
                        error={submitted && itemErrors[index]?.number}
                        helperText={
                          submitted && itemErrors[index]?.number
                            ? t("orders.quantityMinError")
                            : undefined
                        }
                        onChange={(e) => {
                          const updatedDetails = details.map(
                            (item: any) =>
                              item.serial === product.serial
                                ? { ...item, number: e.target.value }
                                : item,
                          );
                          onOrderChange({
                            ...orderData,
                            details: updatedDetails,
                          });
                        }}
                      />
                      <Grid container spacing={2} sx={{ width: "100%" }}>
                        <Grid
                          size={{
                            xs: 12,
                            md: 6,
                          }}
                        >
                          <TextField
                            variant="outlined"
                            label={t("orders.priceExcTax")}
                            value={product.price}
                            type="number"
                            sx={{
                              width: "100%",
                              backgroundColor: colors.white,
                            }}
                            autoComplete="off"
                            error={submitted && itemErrors[index]?.price}
                            helperText={
                              submitted && itemErrors[index]?.price
                                ? t("requiredField")
                                : undefined
                            }
                            onChange={(e) => {
                              const taxRate =
                                product.reduced === 1 ? 0.08 : 0.1;
                              const priceExcTax = e.target.value;
                              const priceWithTax = Math.round(
                                Number(priceExcTax) * (1 + taxRate),
                              ).toString();
                              const updatedDetails = details.map(
                                (item: any) =>
                                  item.serial === product.serial
                                    ? {
                                        ...item,
                                        price: priceExcTax,
                                        priceWithTax: priceWithTax,
                                      }
                                    : item,
                              );
                              onOrderChange({
                                ...orderData,
                                details: updatedDetails,
                              });
                            }}
                          />
                        </Grid>
                        <Grid
                          size={{
                            xs: 12,
                            md: 6,
                          }}
                        >
                          <TextField
                            variant="outlined"
                            label={t("orders.priceIncTax")}
                            value={product.priceWithTax}
                            type="number"
                            sx={{
                              width: "100%",
                              backgroundColor: colors.white,
                            }}
                            autoComplete="off"
                            error={submitted && itemErrors[index]?.price}
                            helperText={
                              submitted && itemErrors[index]?.price
                                ? t("requiredField")
                                : undefined
                            }
                            onChange={(e) => {
                              const taxRate =
                                product.reduced === 1 ? 0.08 : 0.1;
                              const priceWithTax = e.target.value;
                              const priceExcTax = Math.floor(
                                (Number(priceWithTax) * 100) /
                                  (100 + taxRate * 100),
                              ).toString();
                              const updatedDetails = details.map(
                                (item: any) =>
                                  item.serial === product.serial
                                    ? {
                                        ...item,
                                        priceWithTax: priceWithTax,
                                        price: priceExcTax,
                                      }
                                    : item,
                              );
                              onOrderChange({
                                ...orderData,
                                details: updatedDetails,
                              });
                            }}
                          />
                        </Grid>
                      </Grid>

                      <FormControl
                        sx={{ width: "100%", backgroundColor: colors.white }}
                      >
                        <InputLabel>{t("orders.taxRateType")}</InputLabel>
                        <Select
                          label={t("orders.taxRateType")}
                          value={product.reduced}
                          onChange={(e) => {
                            const taxRate = e.target.value === 1 ? 0.08 : 0.1;
                            const priceExcTax = product.price
                              ? Number(product.price)
                              : 0;
                            const priceWithTax = Math.round(
                              priceExcTax * (1 + taxRate),
                            ).toString();
                            const updatedDetails = details.map(
                              (item: any) =>
                                item.serial === product.serial
                                  ? {
                                      ...item,
                                      reduced: e.target.value,
                                      priceWithTax: priceWithTax,
                                    }
                                  : item,
                            );
                            onOrderChange({
                              ...orderData,
                              details: updatedDetails,
                            });
                          }}
                        >
                          <MenuItem value={0} sx={{ height: "60px" }}>
                            10%
                          </MenuItem>
                          <MenuItem value={1} sx={{ height: "60px" }}>
                            8%
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                  </Box>
                </Card>
              ))}
            </>
          )}
          {/* 追加ボタンはガードの外に置く。明細が空でも最初の1件を
              手動追加できるようにするため（Shopify 連携時は disabled）。 */}
          {details.length <= 49 ? (
            <Box>
              <IconButton
                size="large"
                sx={{ mt: 2, mb: 2 }}
                onClick={handleAddItem}
              >
                <AddCircleIcon sx={{ fontSize: 60 }} />
              </IconButton>
            </Box>
          ) : (
            <Box>
              <Typography variant="body1" sx={{ mt: 2 }}>
                {t("orders.maxItemsWarning")}
              </Typography>
            </Box>
          )}
          {/* <Divider
          sx={{
            width: "80%",
          }}
        /> */}
          {/* <TextField
            variant="outlined"
            label="Discount / 割引"
            value={discounts}
            type="number"
            sx={{
              width: "100%",
              backgroundColor: colors.white,
            }}
            autoComplete="off"
            onChange={(e) => {
              const discount = e.target.value;
              onDiscountChange(discount);
            }}
            disabled={disabled}
          /> */}

          <Box sx={{ width: "100%", textAlign: "left", mt: 4, mb: 8, gap: 4 }}>
            <Box sx={{ justifyContent: "space-between", display: "flex" }}>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                {t("orders.generalTotal")}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                {format_jpy(Number(orderData.generalTotal)) || 0}
              </Typography>
            </Box>
            <Box sx={{ justifyContent: "space-between", display: "flex" }}>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                {t("orders.consumableTotal")}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                {format_jpy(Number(orderData.consumTotal)) || 0}
              </Typography>
            </Box>

            {/* ── NTA inline banners ──────────────────────────────────────────
                Shown under totals when items are present and there is a total.
                Staff must fix items manually — no auto-transform.

                CONDITION 1: both below ¥5,000, combined ≥ ¥5,000
                  → NTA 合算ルール may apply; staff must repackage all as consumables.
                CONDITION 2: 一般物品 ≥ ¥5,000, 消耗品 < ¥5,000
                  → Staff must reclassify 消耗品 items as 一般物品 to consolidate.
                CONDITION 3: 消耗品 ≥ ¥5,000, 一般物品 < ¥5,000
                  → Staff must reclassify 一般物品 items as 消耗品 to consolidate.
                FULLY INELIGIBLE: combined total still < ¥5,000
                  → Tax-free processing cannot be applied. */}
            {details.length > 0 && combinedTotal > 0 && (
              <Box
                sx={{
                  mt: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                {/* CONDITION 1 — combined ≥ ¥5,000 but neither individually */}
                {scenarioCombined && (
                  <WarningBanner
                    title={t("orders.ntaSuggestionTitle")}
                    description={t("orders.ntaSuggestionText")}
                  />
                )}

                {/* CONDITION 2 — 一般物品 ok, 消耗品 not */}
                {scenarioGeneralOnly && (
                  <WarningBanner
                    title={t("orders.ntaGeneralOnlyTitle")}
                    description={t("orders.ntaGeneralOnlyText")}
                  />
                )}

                {/* CONDITION 3 — 消耗品 ok, 一般物品 not */}
                {scenarioConsumableOnly && (
                  <WarningBanner
                    title={t("orders.ntaConsumableOnlyTitle")}
                    description={t("orders.ntaConsumableOnlyText")}
                  />
                )}

                {/* FULLY INELIGIBLE */}
                {scenarioIneligible && (
                  <Box
                    sx={{
                      p: 2,
                      border: "1px solid",
                      borderColor: "error.main",
                      borderRadius: 2,
                      bgcolor: "#fff5f5",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.5,
                    }}
                  >
                    <ErrorOutlineIcon
                      sx={{
                        color: "error.main",
                        fontSize: 22,
                        mt: 0.2,
                        flexShrink: 0,
                      }}
                    />
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: "bold", color: "error.dark" }}
                      >
                        {t("orders.ntaIneligible")}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "error.main", mt: 0.5, lineHeight: 1.6 }}
                      >
                        {t("orders.ntaIneligibleSub")}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
            {/* ── End NTA inline banners ────────────────────────────────────── */}

            <Divider sx={{ marginBlock: 5 }} />
            {isShopify && (
              <>
                <Box sx={{ justifyContent: "space-between", display: "flex" }}>
                  <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                    {t("orders.totalDiscounts")}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ fontWeight: "bold", color: colors.red }}
                  >
                    ▲ {format_jpy(Number(discounts)) || 0}
                  </Typography>
                </Box>
              </>
            )}
            <Box sx={{ justifyContent: "space-between", display: "flex" }}>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                {t("orders.totalPriceExcTax")}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                {format_jpy(
                  Number(orderData.generalTotal) +
                    Number(orderData.consumTotal),
                ) || 0}
              </Typography>
            </Box>
            <Box sx={{ justifyContent: "space-between", display: "flex" }}>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                {t("orders.tax")}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                {format_jpy(Number(tax)) || 0}
              </Typography>
            </Box>
            <Box sx={{ justifyContent: "space-between", display: "flex" }}>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                {t("orders.totalPaid")}
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                {isShopify
                  ? format_jpy(Number(received))
                  : format_jpy(
                      details.reduce(
                        (sum: number, item: any) =>
                          sum + Number(item.priceWithTax),
                        0,
                      ),
                    )}
              </Typography>
            </Box>
            {/* <Divider sx={{ marginBlock: 5 }} /> */}
            {/* <Box sx={{ justifyContent: "space-between", display: "flex" }}>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                Processing Fee / 手数料:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                {format_jpy(Math.round(Number(tax) * 0.4) || 0)}
              </Typography>
            </Box>
            <Box sx={{ justifyContent: "space-between", display: "flex" }}>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                Refund Amount / 払戻金額:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                {format_jpy(Number(tax) - Math.round(Number(tax) * 0.4)) || 0}
              </Typography>
            </Box> */}
          </Box>
        </Box>
        <Box sx={{ textAlign: "center" }}>
          {submitted && !isFormValid && (
            <Typography
              variant="body1"
              sx={{
                mb: 2,
                color: colors.red,
                fontWeight: "bold",
              }}
            >
              {noItems ? t("orders.noItemsError") : t("validationError")}
            </Typography>
          )}
          <Button
            variant="contained"
            sx={{
              width: { xs: "100%", sm: "50%" },
              bgcolor: canProceed ? colors.darkBlue : "#9e9e9e",
              borderRadius: 3,
              textTransform: "none",
              minHeight: "120px",
            }}
            onClick={onNext}
            disabled={!canProceed}
          >
            <Typography
              variant="h5"
              sx={{ color: colors.white, fontWeight: "bold" }}
            >
              {t("next")}
            </Typography>
          </Button>
        </Box>
      </Box>

      {/* ── Floating NTA Help Button (bottom-right) ─────────────────────────
          Always visible when there are items — opens the NTA reference dialog.
          Positioned fixed so it stays visible while scrolling. */}
      {details.length > 0 && !scenarioNormal && combinedTotal > 0 &&  (
        <Tooltip title={t("orders.ntaHelpTooltip")} placement="left">
          <Fab
            size="medium"
            onClick={handleOpenDialog}
            sx={{
              position: "fixed",
              bottom: 32,
              right: 32,
              bgcolor: colors.white,
              color: "white",
              boxShadow: 4,
              zIndex: 1200,
            }}
          >
            <HelpOutlineSharpIcon
              sx={{ color: colors.darkBlue, fontSize: 32 }}
            />
          </Fab>
        </Tooltip>
      )}
      {/* ── End Floating Help Button ─────────────────────────────────────── */}
    </Box>
  );
};


```
