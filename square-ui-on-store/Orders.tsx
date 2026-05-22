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
} from "@mui/material";
import { colors } from "../../shared/styles/colors";
import axios from "axios";
import { LoginShopContext } from "../../shared/providers/LoginShopProvider";
import { useContext } from "react";
import dayjs from "dayjs";
import { useCustomSnackbar } from "../../shared/providers/Snackbar";
import { SquareTransactionSelector } from "../../features/steps/square/SquareTransactionSelector";
import type { SquareTransaction } from "../../features/steps/square/types";
import { useTranslation } from "react-i18next";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import DeleteIcon from "@mui/icons-material/Delete";

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
  isSquare: boolean; // New prop for Square integration
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
  isSquare, // New prop for Square integration
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
  const { showSnackbar } = useCustomSnackbar();
  const purchaseInfoRef = useRef<HTMLDivElement | null>(null);
  const [slectedPaymentId, setSelectedPaymentId] = useState<string>(""); // State for selected Square payment ID

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

  // ── Square: map transaction → order form ──────────────────────────────────
  const handleSquareTransactionSelect = (tx: SquareTransaction) => {
    setSelectedPaymentId(tx.payment.id);

    const totalAmount = tx.payment.total_money.amount;
    const taxAmount =
      tx.order.total_tax_money.amount > 0
        ? tx.order.total_tax_money.amount
        : Math.floor(totalAmount / 11);
    const netTotal = totalAmount - taxAmount;

    onTaxChange(taxAmount.toString());
    onReceivedChange(totalAmount.toString());
    onOrderIdChange(tx.payment.receipt_number);

    const details =
      tx.order.line_items.length > 0
        ? tx.order.line_items.map((item, index) => {
            const priceWithTax = item.total_money.amount;
            const price = item.base_price_money.amount * Number(item.quantity);
            return {
              serial: index + 1,
              goodsType: "1",
              goodsName: item.name.substring(0, 50),
              number: item.quantity,
              priceWithTax,
              price,
              reduced: 0,
              lqIndividual: 0,
            };
          })
        : [
            {
              serial: 1,
              goodsType: "1",
              goodsName: "Custom Amount",
              number: "1",
              priceWithTax: totalAmount,
              price: netTotal,
              reduced: 0,
              lqIndividual: 0,
            },
          ];

    onOrderChange({
      ...orderData,
      sellDate: dayjs(tx.payment.created_at).format("YYYYMMDD"),
      generalTotal: netTotal.toString(),
      consumTotal: "0",
      lqExemptOrNot: "0",
      transOrNot: "0",
      details,
    });

    requestAnimationFrame(() => scrollToPurchaseInfo());
  };
  // ─────────────────────────────────────────────────────────────────────────

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

  const onNext = () => {
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

        {/* Shopify店舗の場合は6桁コード入力を表示 * */}
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

        {/* Square店舗の場合は取引選択コンポーネントを表示 * */}
        {isSquare && (
          <SquareTransactionSelector
            onSelect={handleSquareTransactionSelect}
            selectedPaymentId={slectedPaymentId}
          />
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
              disabled={isShopify || isSquare}
            />
          </LocalizationProvider>
          <TextField
            variant="outlined"
            label={t("orders.orderIdOrReceiptNo")}
            value={orderId}
            sx={{ width: "100%" }}
            autoComplete="off"
            onChange={(e) => onOrderIdChange(e.target.value)}
            disabled={isShopify || isSquare}
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
          {(orderData.details?.length ?? 0) > 0 && (
            <>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {t("orders.items")}
              </Typography>
              {orderData.details.map((product: any) => (
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
                          disabled={isShopify || isSquare}
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
                        disabled={isShopify || isSquare}
                        sx={{ width: "100%", backgroundColor: colors.white }}
                      >
                        <InputLabel>{t("orders.goodsType")}</InputLabel>
                        <Select
                          label={t("orders.goodsType")}
                          value={product.goodsType}
                          onChange={(e) => {
                            const updatedDetails = orderData.details.map(
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
                      {isShopify ? (
                        <TextField
                          variant="outlined"
                          label={t("orders.productName")}
                          type="text"
                          value={product.goodsName}
                          sx={{ width: "100%", backgroundColor: colors.white }}
                          autoComplete="off"
                          onChange={(e) => {
                            const updatedDetails = orderData.details.map(
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
                          disabled={isShopify}
                        />
                      ) : (
                        <FormControl
                          disabled={isShopify}
                          sx={{ width: "100%", backgroundColor: colors.white }}
                        >
                          <InputLabel>{t("orders.productName")}</InputLabel>
                          <Select
                            label={t("orders.productName")}
                            value={product.goodsName}
                            onChange={(e) => {
                              const updatedDetails = orderData.details.map(
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
                        onChange={(e) => {
                          const updatedDetails = orderData.details.map(
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
                            onChange={(e) => {
                              const taxRate =
                                product.reduced === 1 ? 0.08 : 0.1;
                              const priceExcTax = e.target.value;
                              const priceWithTax = Math.round(
                                Number(priceExcTax) * (1 + taxRate),
                              ).toString();
                              const updatedDetails = orderData.details.map(
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
                            onChange={(e) => {
                              const taxRate =
                                product.reduced === 1 ? 0.08 : 0.1;
                              const priceWithTax = e.target.value;
                              const priceExcTax = Math.floor(
                                (Number(priceWithTax) * 100) /
                                  (100 + taxRate * 100),
                              ).toString();
                              const updatedDetails = orderData.details.map(
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
                            const updatedDetails = orderData.details.map(
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
              {orderData.details.length <= 49 ? (
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
            </>
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
                {isShopify || isSquare
                  ? format_jpy(Number(received))
                  : format_jpy(
                      orderData.details.reduce(
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
          <Button
            variant="contained"
            sx={{
              width: { xs: "100%", sm: "50%" },
              bgcolor: `${colors.darkBlue}`,
              borderRadius: 3,
              textTransform: "none",
              minHeight: "120px",
            }}
            onClick={() => {
              onNext();
            }}
            disabled={orderData.generalTotal === ""}
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
