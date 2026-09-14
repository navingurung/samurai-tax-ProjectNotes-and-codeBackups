import React, { useState, useEffect, useContext } from "react";
import { Header } from "../../shared/components/Header";
import { Order } from "../steps/Orders";
import { Passport } from "../steps/Passport";
import { Refund } from "../steps/Refund";
import { PrivacyPolicy } from "../steps/PrivacyPolicy";
import { Quote } from "../steps/Quote";
import {
  Container,
  Box,
  Button,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Backdrop,
  CircularProgress,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LoginShopContext } from "../../shared/providers/LoginShopProvider";
import { colors } from "../../shared/styles/colors";
import { useCustomSnackbar } from "../../shared/providers/Snackbar";
import { styled } from "@mui/material/styles";
import StepConnector, {
  stepConnectorClasses,
} from "@mui/material/StepConnector";
import type { StepIconProps } from "@mui/material/StepIcon";
import Check from "@mui/icons-material/Check";
import dayjs from "dayjs";
import axios from "axios";
import wadaikoSound from "../../assets/wadaiko.mp3";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_LANG_CODE,
  type LangCode,
} from "../../shared/constants/languages";
import { isV3Sale } from "../../shared/nta/version";
import { calculateRefundTotals } from "./refundTotals";
import { isHighValueV3Item } from "../../shared/nta/highValueProduct";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const isTestEnv: boolean =
  String(import.meta.env.VITE_DEV ?? "")
    .trim()
    .toLowerCase() === "true";

// SAM-437: v3はNTAへ送る値を全て文字列にする必要がある（別紙1-3の注記）。
// v2側は既存のNumber()変換をそのまま維持するため、この関数はv3分岐でのみ使用する。
const toV3Field = (v: unknown) => String(v ?? "");

const Connector = styled(StepConnector)(() => ({
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: colors.darkBlue,
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: colors.darkBlue,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    borderColor: colors.silver,
    borderTopWidth: 3,
    borderRadius: 1,
  },
}));

const QontoStepIconRoot = styled("div")<{ ownerState: { active?: boolean } }>(
  () => ({
    color: colors.silver,
    display: "flex",
    height: 22,
    alignItems: "center",
    "& .QontoStepIcon-completedIcon": {
      color: colors.darkBlue,
    },
    "& .QontoStepIcon-circle": {
      color: colors.silver,
      width: 22,
      height: 22,
      borderRadius: "50%",
      backgroundColor: "currentColor",
    },
    variants: [
      {
        props: ({ ownerState }) => ownerState.active,
        style: {
          color: colors.darkBlue,
          "& .QontoStepIcon-circle": {
            backgroundColor: colors.darkBlue,
          },
        },
      },
    ],
  }),
);

function QontoStepIcon(props: StepIconProps) {
  const { active, completed, className } = props;

  return (
    <QontoStepIconRoot ownerState={{ active }} className={className}>
      {completed ? (
        <Check className="QontoStepIcon-completedIcon" />
      ) : (
        <div className="QontoStepIcon-circle" />
      )}
    </QontoStepIconRoot>
  );
}

export const Home: React.FC = () => {
  const context = useContext(LoginShopContext);
  if (!context) {
    throw new Error("Header must be used within a LoginShopProvider");
  }
  const { loginShop, isLoading } = context;
  // 認証解決中またはログアウト遷移中はスピナーを表示
  if (isLoading || !loginShop) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();
  const { showSnackbar } = useCustomSnackbar();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const isShopify = loginShop.use_shopify || false;
  const isSmaregi = loginShop.use_smaregi || false;
  const isSquare = loginShop.use_square || false;
  const isShopifyPublic = loginShop.use_shopify_public || false;

  const today = dayjs();
  const formattedDate = today.format("YYYYMMDD");

  // Order用
  const [code, setCode] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [tax, setTax] = useState("");
  const [received, setReceived] = useState("");
  const [discounts, setDiscounts] = useState("");
  const [orderId, setOrderId] = useState("");
  const [orderData, setOrderData] = useState({
    senderId: "",
    senderIdType: "",
    shopId: "",
    shopType: "",
    shopName: "",
    shopPlace: "",
    bizName: "",
    bizPlace: "",
    sellDate: formattedDate,
    transOrNot: "0",
    generalTotal: "",
    consumTotal: "",
    lqExemptOrNot: "0",
    details: [
      {
        serial: 1,
        goodsType: isV3Sale(formattedDate) ? "" : "1",
        goodsName: "",
        number: "1",
        price: "",
        priceWithTax: "",
        reduced: 0,
        lqIndividual: 0,
        goodsInfo: "",
        serialNumber: "",
      },
    ],
  });

  const { t } = useTranslation();

  const steps = [
    { label: t("order"), component: Order as React.ComponentType<any> },
    { label: t("passport"), component: Passport as React.ComponentType<any> },
    { label: t("refundMethod"), component: Refund as React.ComponentType<any> },
    {
      label: t("termsOfUse"),
      component: PrivacyPolicy as React.ComponentType<any>,
    },
    { label: t("review"), component: Quote as React.ComponentType<any> },
  ];

  const handleOrderChange = (newOrder: any) => {
    setOrderData((prev) => ({ ...prev, ...newOrder }));
  };
  useEffect(() => {
    let generalTotal = 0;
    let consumTotal = 0;
    let taxTotal = 0;
    const isV3 = isV3Sale(orderData.sellDate);

    orderData.details.forEach((item) => {
      const price = parseFloat(item.price || "0");
      const priceWithTax = parseFloat(item.priceWithTax || "0");

      if (!isV3 && item.goodsType === "1") {
        // 一般物品
        generalTotal += price;
      } else if (!isV3 && item.goodsType === "2") {
        // 消耗品
        consumTotal += price;
      }

      // 税込価格 - 税抜価格の差額を集計
      taxTotal += priceWithTax - price;
    });

    // 値が変わったときだけ更新
    if (
      (isV3 ? "" : generalTotal.toString()) !== orderData.generalTotal ||
      (isV3 ? "" : consumTotal.toString()) !== orderData.consumTotal ||
      taxTotal.toString() !== tax
    ) {
      setOrderData((prev) => ({
        ...prev,
        generalTotal: isV3 ? "" : generalTotal.toString(),
        consumTotal: isV3 ? "" : consumTotal.toString(),
      }));
      if (!isShopify) {
        setTax(taxTotal.toString());
      }
    }
  }, [orderData.details, orderData.sellDate]);

  // Passport用
  const [passportInfo, setPassportInfo] = useState({
    name: "",
    nation: "",
    birth: null,
    docType: "1",
    passportNo: "",
    landingPermitNo: "",
    status: "",
    landDate: null,
  });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [issuedCountry, setIssuedCountry] = useState("");
  const [passportValidUntil, setPassportValidUntil] = useState("");
  const [note, setNote] = useState("");

  // Refund Method用
  const name = `${firstName} ${lastName}`;
  const [targetAccountId, setTargetAccountId] = useState<string>("");
  const [targetCurrency, setTargetCurrency] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [residenceCountry, setResidenceCountry] = useState<string>("");
  const [chineseState, setChineseState] = useState<string>("");
  const [preferredLanguage, setPreferredLanguage] =
    useState<LangCode>(DEFAULT_LANG_CODE);

  // Privacy Policy用
  const [privacyAccepted, setPrivacyAccepted] = useState<boolean>(false);

  // Complete用
  const handleConfirm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // orderDataから必要な情報だけを抜き取る
    const buildRefundPayload = () => {
      // 商品名の重複カウント用マップ
      const nameCountMap: Record<string, number> = {};
      const cleanedDetails = orderData.details.map((item) => {
        let finalGoodsName = item.goodsName;
        // 同じ商品名が既に出現している場合、番号を付ける
        if (nameCountMap[item.goodsName] !== undefined) {
          nameCountMap[item.goodsName] += 1;
          const suffix = `#${String(nameCountMap[item.goodsName]).padStart(2, "0")}`;
          // 50文字を超えないように調整
          const maxBaseLength = 50 - suffix.length;
          const baseName = item.goodsName.substring(0, maxBaseLength);
          finalGoodsName = baseName + suffix;
        } else {
          // 初回出現
          nameCountMap[item.goodsName] = 1;
        }

        // SAM-437: v3は全項目を文字列で送る（別紙1-3）。v2の数値変換ロジックは
        // 一切変更せず、v3用の分岐を別に用意する。
        const cleanedDetail = isV3Sale(orderData.sellDate)
          ? {
              serial: toV3Field(item.serial),
              // TODO(SAM-437): goodsTypeはまだプレースホルダー。v3の実際のコード値
              // マッピング（"10"/"11"等）は別途対応が必要。
              goodsType: toV3Field(item.goodsType),
              goodsName: finalGoodsName,
              number: toV3Field(item.number),
              price: toV3Field(item.price),
              reduced: toV3Field(item.reduced),
              lqIndividual: toV3Field(item.lqIndividual),
              // TODO(SAM-437): unit/janCodeはv3サンプルに存在するが、
              // orderData.detailsにまだ収集する項目がない。UI対応待ち。
            }
          : {
              serial: Number(item.serial) || 0,
              goodsType: Number(item.goodsType) || 0,
              goodsName: finalGoodsName,
              number: Number(item.number) || 0,
              price: Number(item.price) || 0,
              reduced: Number(item.reduced) || 0,
              lqIndividual: Number(item.lqIndividual) || 0,
            };

        return isHighValueV3Item(item, orderData.sellDate)
          ? {
              ...cleanedDetail,
              goodsInfo: item.goodsInfo || "",
              serialNumber: item.serialNumber || "",
            }
          : cleanedDetail;
      });

      return {
        ...orderData,
        details: cleanedDetails,
      };
    };

    const sendNo = dayjs().format("YYYYMMDDHHmmss") + "001";
    const { totalPrice, totalReceived } = calculateRefundTotals({
      details: orderData.details,
      tax,
      received,
    });

    const nameRaw = `${lastName.toUpperCase()} ${firstName.toUpperCase()}`;
    // 39文字以内に制限
    const name = nameRaw.length > 39 ? nameRaw.slice(0, 39) : nameRaw;

    // SAM-437: v3販売はリクエスト形状が変わるため分岐する。
    // v2側（elseブランチ）は既存の実装から1バイトも変更しない。
    const isV3 = isV3Sale(orderData.sellDate);
    // landingPermitNoはv3で廃止。passportInfoから除いたものをv3用に使う。
    const { landingPermitNo, ...passportInfoV3Safe } = passportInfo;

    const form = isV3
      ? (() => {
          // transOrNot/generalTotal/consumTotalはv3で廃止。
          // buildRefundPayload()の戻り値から除いてv3用に使う。
          const {
            transOrNot,
            generalTotal,
            consumTotal,
            ...v3SafeOrderPayload
          } = buildRefundPayload();
          return {
            ...v3SafeOrderPayload,
            ...passportInfoV3Safe,
            senderIdType: toV3Field(orderData.senderIdType),
            shopType: toV3Field(orderData.shopType),
            name: name,
            sendNo: sendNo,
            proceduresId: "A",
            version: "3",
            // crudType: 登録取消区分。キャンセル/取消フローは現状存在しないため常に"1"（登録）。
            crudType: "1",
            note: note || "",
          };
        })()
      : {
          ...buildRefundPayload(),
          ...passportInfo,
          senderIdType: Number(orderData.senderIdType) || 0,
          shopType: Number(orderData.shopType) || 0,
          landingPermitNo: passportInfo.landingPermitNo,
          name: name,
          sendNo: sendNo,
          proceduresId: "A",
          version: 2,
          note: note || "",
        };

    const discountsAmount = discounts ? parseInt(discounts) : 0;

    try {
      await axios.post(
        `${API_BASE_URL}/refund/`,
        {
          form,
          metadata_: {
            orderId: orderId,
            tax: Number(tax) || 0,
            email: emailAddress,
            targetCurrency: targetCurrency,
            targetAccountId: targetAccountId,
            totalReceived: Number(totalReceived) || 0,
            totalPrice,
            totalDiscount: Number(discountsAmount) || 0,
            residenceCountry: residenceCountry,
            chineseState: chineseState,
            first_name: firstName || "",
            last_name: lastName || "",
            passport_issued_country: issuedCountry || "",
            passport_valid_until: passportValidUntil || "",
            gender: gender || "",
            phone: "",
            phone_country_code: "",
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        },
      );
      {
        isShopify &&
          (await axios.delete(`${API_BASE_URL}/orders/${code}`, {
            withCredentials: true,
          }));
      }
      const audio = new Audio(wadaikoSound);
      audio.play();
      navigate("/completed");
    } catch (error) {
      showSnackbar({
        message: "An error occurred while creating the refund",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [activeStep]);

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };
  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const StepComponent = steps[activeStep].component;
  const stepProps = () => {
    switch (activeStep) {
      case 0:
        return {
          code,
          onCodeChange: setCode,
          orderData,
          onOrderChange: handleOrderChange,
          tax,
          onTaxChange: setTax,
          orderId,
          onOrderIdChange: setOrderId,
          setActiveStep,
          onEmailAddressChange: setEmailAddress,
          received,
          onReceivedChange: setReceived,
          discounts,
          onDiscountChange: setDiscounts,
          isShopify,
          isSmaregi,
          isSquare,
          isShopifyPublic,
        };
      case 1:
        return {
          passportInfo,
          onPassportInfoChange: setPassportInfo,
          firstName,
          onFirstNameChange: setFirstName,
          lastName,
          onLastNameChange: setLastName,
          gender,
          onGenderChange: setGender,
          issuedCountry,
          onIssuedCountryChange: setIssuedCountry,
          passportValidUntil,
          onPassportValidUntilChange: setPassportValidUntil,
          setActiveStep,
          note,
          onNoteChange: setNote,
          onSetSaved: setSaved,
          onEmailAddressChange: setEmailAddress,
        };
      case 2:
        return {
          emailAddress,
          onEmailAddressChange: setEmailAddress,
          setActiveStep,
          targetAccountId,
          onSetTargetAccountId: setTargetAccountId,
          targetCurrency,
          onSetTargetCurrency: setTargetCurrency,
          name,
          saved,
          onSetSaved: setSaved,
          residenceCountry,
          onSetResidenceCountry: setResidenceCountry,
          chineseState,
          onSetChineseState: setChineseState,
          orderId,
          onSetPreferredLanguage: setPreferredLanguage,
          preferredLanguage,
        };
      case 3:
        return {
          privacyAccepted,
          onPrivacyAcceptedChange: setPrivacyAccepted,
          setActiveStep,
          onSetPreferredLanguage: setPreferredLanguage,
          preferredLanguage,
        };
      case 4:
        return {
          tax,
          passportInfo,
          orderData,
          name,
          gender,
          issuedCountry,
          passportValidUntil,
          handleConfirm,
          orderId,
          emailAddress,
          setActiveStep,
          received,
          discounts,
          targetCurrency,
          targetAccountId,
          note,
        };
      default:
        return {};
    }
  };

  // ダイアログ用
  const openDialog = () => {
    setDialogOpen(true);
  };
  const closeDialog = () => {
    setDialogOpen(false);
  };

  const handleCancel = () => {
    navigate("/");
    setActiveStep(0);
    window.location.reload();
    closeDialog();
  };

  useEffect(() => {
    const digitParam = searchParams.get("digit");
    if (digitParam) {
      setCode(digitParam); // テキストフィールドに反映
    }
  }, [searchParams]);
  return (
    <Box
      sx={{
        flexGrow: 1,
      }}
    >
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
        <Typography sx={{ ml: 2 }}>{t("login.processing")}</Typography>
      </Backdrop>
      <Header />
      <Container
        maxWidth="md"
        sx={{
          textAlign: "center",
          // px: { xs: 0, sm: 3, md: 4 },
          py: { xs: 2, md: 4 },
        }}
      >
        {isTestEnv && (
          <Box
            sx={{
              border: 1,
              borderColor: "red",
              borderRadius: 2,
              p: 2,
              mb: 4,
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: "bold", color: "red" }}>
              これはテスト環境です
            </Typography>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: 2,
                mt: 2,
              }}
            >
              {activeStep > 0 && (
                <Button
                  variant="outlined"
                  onClick={handleBack}
                  sx={{
                    bgcolor: colors.blue,
                    textTransform: "none",
                    minHeight: "50px",
                    width: "10%",
                    borderRadius: 3,
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ color: colors.white, fontWeight: "bold" }}
                  >
                    {t("back")}
                  </Typography>
                </Button>
              )}
              {activeStep < steps.length - 1 && (
                <Button
                  variant="outlined"
                  onClick={handleNext}
                  sx={{
                    bgcolor: colors.blue,
                    textTransform: "none",
                    minHeight: "50px",
                    width: "10%",
                    borderRadius: 3,
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ color: colors.white, fontWeight: "bold" }}
                  >
                    {t("next")}
                  </Typography>
                </Button>
              )}
            </Box>
          </Box>
        )}
        <Box sx={{ mb: 4 }}>
          <Stepper
            activeStep={activeStep}
            alternativeLabel
            connector={<Connector />}
          >
            {steps.map((step) => (
              <Step key={step.label}>
                <StepLabel
                  slots={{
                    stepIcon: QontoStepIcon,
                  }}
                >
                  {step.label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        <StepComponent {...stepProps()} />
        <Divider sx={{ mt: 4, mb: 4 }} />
        <Button
          onClick={openDialog}
          sx={{
            textTransform: "none",
          }}
        >
          <Typography variant="body1" sx={{ color: colors.red }}>
            {t("cancelApplication")}
          </Typography>
        </Button>
        <Dialog
          open={dialogOpen}
          onClose={closeDialog}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          maxWidth="xs"
          sx={{ textAlign: "center" }}
        >
          <Box sx={{ p: 2 }}>
            <DialogTitle id="alert-dialog-title">
              {t("cancelApplication")}
            </DialogTitle>
            <DialogContent>
              <DialogContentText id="alert-dialog-description">
                {t("undoneWarning")}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-around",
                  marginInline: 2,
                }}
                gap={2}
              >
                <Button
                  sx={{
                    color: "gray",
                    textTransform: "none",
                    borderColor: "gray",
                    border: 1,
                    minHeight: "50px",
                  }}
                  onClick={closeDialog}
                  autoFocus
                  fullWidth
                >
                  {t("dismiss")}
                </Button>

                <Button
                  sx={{
                    color: colors.red,
                    textTransform: "none",
                    borderColor: "gray",
                    border: 1,
                    minHeight: "50px",
                  }}
                  onClick={handleCancel}
                  fullWidth
                >
                  {t("cancelApplication")}
                </Button>
              </Box>
            </DialogActions>
          </Box>
        </Dialog>

        {isTestEnv && (
          <Box
            sx={{ display: "flex", justifyContent: "center", mt: 4, gap: 2 }}
          >
            {activeStep > 0 && (
              <Button
                variant="outlined"
                onClick={handleBack}
                sx={{
                  bgcolor: colors.blue,
                  textTransform: "none",
                  minHeight: "50px",
                  width: "10%",
                  borderRadius: 3,
                }}
              >
                <Typography
                  variant="body1"
                  sx={{ color: colors.white, fontWeight: "bold" }}
                >
                  {t("back")}
                </Typography>
              </Button>
            )}
            {activeStep < steps.length - 1 && (
              <Button
                variant="outlined"
                onClick={handleNext}
                sx={{
                  bgcolor: colors.blue,
                  textTransform: "none",
                  minHeight: "50px",
                  width: "10%",
                  borderRadius: 3,
                }}
              >
                <Typography
                  variant="body1"
                  sx={{ color: colors.white, fontWeight: "bold" }}
                >
                  {t("next")}
                </Typography>
              </Button>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
};
