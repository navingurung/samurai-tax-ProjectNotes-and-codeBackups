```javascript
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
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
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
  const { showSnackbar } = useCustomSnackbar();

  // NTA combined rule: controls the confirm dialog and whether the operator
  // has agreed to reclassify general goods as consumables for this transaction.
  const [ntaDialogOpen, setNtaDialogOpen] = useState(false);
  const [ntaCombinedAgreed, setNtaCombinedAgreed] = useState(false);

  const purchaseInfoRef = useRef<HTMLDivElement | null>(null);

  // ── NTA eligibility scenario detection ───────────────────────────────────
  // Declared early so all derived values, handlers, and JSX below can use them.
  const THRESHOLD = 5000;

  const generalTotal = Number(orderData.generalTotal) || 0;
  const consumTotal = Number(orderData.consumTotal) || 0;
  const combinedTotal = generalTotal + consumTotal;

  const generalOk = generalTotal >= THRESHOLD;
  const consumOk = consumTotal >= THRESHOLD;

  // SCENARIO A — at least one category independently meets the threshold → normal flow, no banner
  const scenarioNormal = generalOk || consumOk;

  // SCENARIO B — neither meets threshold individually, but combined does → show suggestion banner
  const scenarioCombined = !generalOk && !consumOk && combinedTotal >= THRESHOLD;

  // SCENARIO C — everything below threshold even combined → fully ineligible, block Next
  const scenarioIneligible = !generalOk && !consumOk && combinedTotal < THRESHOLD;
  // ── End scenario detection ────────────────────────────────────────────────

  // Reset agreement whenever the transaction data changes so a new order
  // doesn't carry over a previous confirmation.
  useEffect(() => {
    setNtaCombinedAgreed(false);
  }, [orderData.generalTotal, orderData.consumTotal]);

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
        message: t("orders.fetchCompanyError"),
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

  // Next is enabled when:
  //   - form is valid, AND
  //   - not fully ineligible, AND
  //   - if combined rule applies, the operator has agreed to reclassify
  const canProceed =
    isFormValid &&
    !scenarioIneligible &&
    (scenarioNormal || (scenarioCombined && ntaCombinedAgreed));

  // Called when operator clicks "Agree" inside the NTA combined rule dialog.
  // Transforms the order data immediately:
  //   - All goodsType "1" (general goods) items → "2" (consumable)
  //   - generalTotal zeroed out
  //   - consumTotal becomes the combined sum
  const handleNtaAgree = () => {
    const transformedDetails = (orderData.details || []).map((item: any) =>
      String(item.goodsType) === "1" ? { ...item, goodsType: "2" } : item,
    );
    onOrderChange({
      ...orderData,
      details: transformedDetails,
      generalTotal: "0",
      consumTotal: combinedTotal.toString(),
    });
    setNtaCombinedAgreed(true);
    setNtaDialogOpen(false);
  };

  // Called when operator clicks "Disagree" — closes dialog, no data change,
  // Next remains disabled.
  const handleNtaDisagree = () => {
    setNtaCombinedAgreed(false);
    setNtaDialogOpen(false);
  };

  const onNext = () => {
    if (!isFormValid) {
      // 未入力・不正な項目があれば、それらを赤く表示して先に進ませない
      setSubmitted(true);
      return;
    }
    if (!canProceed) return;
    setActiveStep(1);
  };

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

        {/* ── NTA Combined Rule Dialog ────────────────────────────────────────
            Opened only when the operator clicks the suggestion link in the
            banner below the totals. Agree → transforms data and enables Next.
            Disagree → closes dialog, Next stays disabled. */}
        <Dialog
          open={ntaDialogOpen}
          onClose={handleNtaDisagree}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
        >
          <DialogTitle
            sx={{ display: "flex", alignItems: "center", gap: 1.5, pb: 1 }}
          >
            <WarningAmberIcon sx={{ color: "#ed6c02", fontSize: 28 }} />
            <Box>
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", color: "#e65100", lineHeight: 1.2 }}
              >
                {t("orders.ntaDialogTitle")}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                NTA combined packaging rule
              </Typography>
            </Box>
          </DialogTitle>

          <DialogContent dividers>
            {/* Description */}
            <Typography variant="body2" sx={{ mb: 2, color: "text.primary" }}>
              {t("orders.ntaDialogDesc")}
            </Typography>

            {/* Totals breakdown: general + consumable = combined */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 2,
                p: 1.5,
                bgcolor: "#fff8f0",
                borderRadius: 2,
                border: "1px solid #ffcc80",
              }}
            >
              <Box sx={{ flex: 1, textAlign: "center" }}>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", display: "block" }}
                >
                  {t("orders.normalTotal")}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                  {format_jpy(generalTotal)}
                </Typography>
              </Box>
              <Typography
                variant="h6"
                sx={{ color: "#ed6c02", fontWeight: "bold" }}
              >
                ＋
              </Typography>
              <Box sx={{ flex: 1, textAlign: "center" }}>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", display: "block" }}
                >
                  {t("orders.consumableTotal")}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                  {format_jpy(consumTotal)}
                </Typography>
              </Box>
              <Typography
                variant="h6"
                sx={{ color: "#ed6c02", fontWeight: "bold" }}
              >
                ＝
              </Typography>
              <Box sx={{ flex: 1, textAlign: "center" }}>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", display: "block" }}
                >
                  {t("orders.ntaDialogCombined")}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: "bold", color: "#2e7d32" }}
                >
                  {format_jpy(combinedTotal)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Store clerk packaging instruction */}
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                alignItems: "flex-start",
                mb: 2,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  bgcolor: "#E6F1FB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 16,
                }}
              >
                📦
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: "bold", mb: 0.25 }}
                >
                  {t("orders.ntaDialogPackagingTitle")}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {t("orders.ntaDialogPackagingDesc")}
                </Typography>
              </Box>
            </Box>

            {/* Tourist warning */}
            <Box
              sx={{
                display: "flex",
                gap: 1.5,
                alignItems: "flex-start",
                mb: 2,
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  bgcolor: "#EAF3DE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 16,
                }}
              >
                ✈️
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: "bold", mb: 0.25 }}
                >
                  {t("orders.ntaDialogTouristTitle")}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {t("orders.ntaDialogTouristDesc")}
                </Typography>
              </Box>
            </Box>

            {/* Note explaining what agreeing will do to the data */}
            <Box
              sx={{
                p: 1.5,
                bgcolor: "background.default",
                borderLeft: "3px solid #378ADD",
                mt: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", lineHeight: 1.6 }}
              >
                {t("orders.ntaDialogTransformNote")}
              </Typography>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2, gap: 1 }}>
            {/* Disagree — closes dialog, Next stays disabled */}
            <Button
              variant="outlined"
              onClick={handleNtaDisagree}
              sx={{
                flex: 1,
                borderRadius: 2,
                textTransform: "none",
                borderColor: "divider",
                color: "text.secondary",
              }}
            >
              {t("orders.ntaDialogDisagree")}
            </Button>
            {/* Agree — transforms data and enables Next */}
            <Button
              variant="contained"
              onClick={handleNtaAgree}
              sx={{
                flex: 2,
                borderRadius: 2,
                textTransform: "none",
                bgcolor: colors.darkBlue,
                "&:hover": { bgcolor: colors.darkBlue },
              }}
            >
              {t("orders.ntaDialogAgree")}
            </Button>
          </DialogActions>
        </Dialog>
        {/* ── End NTA Combined Rule Dialog ──────────────────────────────────── */}

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
                helperText={inputError ? t("orders.sixDigitCodeError") : ""}
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
            <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
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
              disabled={isShopify}
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
            disabled={isShopify}
            error={submitted && orderIdError}
            helperText={
              submitted && orderIdError ? t("requiredField") : undefined
            }
            required
          />
        </Box>
        <Box
          sx={{
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
                          disabled={isShopify}
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
                        disabled={isShopify}
                        sx={{ width: "100%", backgroundColor: colors.white }}
                      >
                        <InputLabel>{t("orders.goodsType")}</InputLabel>
                        <Select
                          label={t("orders.goodsType")}
                          value={product.goodsType}
                          onChange={(e) => {
                            const updatedDetails = details.map((item: any) =>
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
                            const updatedDetails = details.map((item: any) =>
                              item.serial === product.serial
                                ? { ...item, goodsName: e.target.value }
                                : item,
                            );
                            onOrderChange({
                              ...orderData,
                              details: updatedDetails,
                            });
                          }}
                          disabled={isShopify}
                        />
                      ) : (
                        <FormControl
                          disabled={isShopify}
                          error={submitted && itemErrors[index]?.goodsName}
                          sx={{ width: "100%", backgroundColor: colors.white }}
                        >
                          <InputLabel
                            error={submitted && itemErrors[index]?.goodsName}
                          >
                            {t("orders.productName")}
                          </InputLabel>
                          <Select
                            label={t("orders.productName")}
                            value={product.goodsName}
                            onChange={(e) => {
                              const updatedDetails = details.map((item: any) =>
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
                          const updatedDetails = details.map((item: any) =>
                            item.serial === product.serial
                              ? { ...item, number: e.target.value }
                              : item,
                          );
                          onOrderChange({
                            ...orderData,
                            details: updatedDetails,
                          });
                        }}
                        disabled={isShopify}
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
                              const updatedDetails = details.map((item: any) =>
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
                            disabled={isShopify}
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
                              const updatedDetails = details.map((item: any) =>
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
                            disabled={isShopify}
                          />
                        </Grid>
                      </Grid>

                      <FormControl
                        disabled={isShopify}
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
                            const updatedDetails = details.map((item: any) =>
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
                disabled={isShopify}
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

          <Box sx={{ width: "100%", textAlign: "left", mt: 4, mb: 4, gap: 4 }}>
            <Box sx={{ justifyContent: "space-between", display: "flex" }}>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                {t("orders.normalTotal")}
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

            {/* ── NTA inline banners — shown directly under the totals ────────
                SCENARIO B: neither category meets ¥5,000 but combined does.
                Shows a suggestion with a clickable link to open the dialog.
                Only shown when both are below threshold — hidden for scenarioNormal.

                SCENARIO C: fully ineligible — red error, Next is disabled.

                Nothing is shown for scenarioNormal (one category already eligible). */}
            {details.length > 0 && combinedTotal > 0 && (
              <Box sx={{ mt: 2 }}>
                {scenarioCombined && !ntaCombinedAgreed && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1,
                      p: 1.5,
                      border: "1px solid #ed6c02",
                      borderRadius: 2,
                      bgcolor: "#fff8f0",
                    }}
                  >
                    <WarningAmberIcon
                      sx={{ color: "#ed6c02", fontSize: 20, mt: "1px", flexShrink: 0 }}
                    />
                    <Box>
                      <Typography variant="body2" sx={{ color: "#e65100" }}>
                        {t("orders.ntaSuggestionText")}{" "}
                        <Typography
                          component="span"
                          variant="body2"
                          sx={{
                            color: colors.darkBlue,
                            fontWeight: "bold",
                            textDecoration: "underline",
                            cursor: "pointer",
                          }}
                          onClick={() => setNtaDialogOpen(true)}
                        >
                          {t("orders.ntaSuggestionLink")}
                        </Typography>
                      </Typography>
                    </Box>
                  </Box>
                )}

                {/* After agreeing: show green confirmation in place of the orange banner */}
                {scenarioCombined && ntaCombinedAgreed && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      p: 1.5,
                      border: "1px solid #2e7d32",
                      borderRadius: 2,
                      bgcolor: "#f1f8e9",
                    }}
                  >
                    <CheckCircleOutlineIcon
                      sx={{ color: "#2e7d32", fontSize: 20, flexShrink: 0 }}
                    />
                    <Typography variant="body2" sx={{ color: "#2e7d32" }}>
                      {t("orders.ntaAgreedConfirmation")}
                    </Typography>
                  </Box>
                )}

                {scenarioIneligible && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      p: 1.5,
                      border: "1px solid #d32f2f",
                      borderRadius: 2,
                      bgcolor: "#fff5f5",
                    }}
                  >
                    <ErrorOutlineIcon
                      sx={{ color: "#d32f2f", fontSize: 20, flexShrink: 0 }}
                    />
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: "bold", color: "#c62828" }}
                      >
                        {t("orders.ntaIneligible")}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "#d32f2f", display: "block" }}
                      >
                        {t("orders.ntaIneligibleSub")}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
            {/* ── End NTA inline banners ──────────────────────────────────── */}

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

        <Box sx={{ textAlign: "center", mb: 8 }}>
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
              "&:hover": {
                bgcolor: canProceed ? colors.darkBlue : "#9e9e9e",
              },
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
    </Box>
  );
};

 ```


