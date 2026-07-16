```jsximport { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Stack,
  Link,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  FormGroup,
  Backdrop,
  Divider,
  ButtonGroup,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { colors } from "../../styles/colors";
import { AdminHeader } from "../template/AdminHeader";
import { useCustomSnackbar } from "../providers/Snackbar";
import { useParams, useLocation } from "react-router-dom";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CircularProgress from "@mui/material/CircularProgress";
import Autocomplete from "@mui/material/Autocomplete";
import Switch from "@mui/material/Switch";
import smaregiLogo from "../../../public/assets/smaregi_logo_black.png";
import squareLogo from "../../../public/assets/square_logo_black.png";
import shopifyLogo from "../../../public/assets/shopify_logo_black.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const DASHBOARD_SERVICES = [
  { key: "smaregi", label: "スマレジ", logo: smaregiLogo, logoScale: 1.8 },
  { key: "square", label: "Square", logo: squareLogo, logoScale: 1 },
  { key: "shopify", label: "Shopify", logo: shopifyLogo, logoScale: 1 },
];

export const CompanyDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const state = location.state || {};
  const { companyName, companyId } = state;
  const navigate = useNavigate();
  const showSnackbar = useCustomSnackbar().showSnackbar;
  const [editCompany, setEditCompany] = useState({
    id: companyId,
    sender_id: "",
    biz_name: "",
    biz_place: "",
    biz_name_kana: "",
    biz_place_kana: "",
    manager_name: "",
    manager_name_kana: "",
    manager_email: "",
    manager_phone: "",
    login_id: "",
    login_password: "",
  });
  const [trjInfo, setTrjInfo] = useState({
    trj_organization_id: "",
    trj_code: "",
    trj_email: "",
    trj_phone: "",
    trj_bank_name: "",
    trj_branch_code: "",
    trj_branch_name: "",
    trj_branch_name_kana: "",
    trj_account_number: "",
    trj_account_name_kana: "",
    trj_status: null,
    trj_registered_at: "",
    trj_updated_at: "",
  });
  const [loading, setLoading] = useState(false);
  const [onEditing, setOnEditing] = useState(false);
  const [onEditingLoginInfo, setOnEditingLoginInfo] = useState(false);
  const [smaregiContractId, setSmaregiContractId] = useState("");
  const [smaregiInputValue, setSmaregiInputValue] = useState("");
  const [smaregiConnectedAt, setSmaregiConnectedAt] = useState("");
  const [smaregiTokenExpiresAt, setSmaregiTokenExpiresAt] = useState("");
  const [onEditingSmaregi, setOnEditingSmaregi] = useState(false);
  const [squareMerchantId, setSquareMerchantId] = useState("");
  const [squareMerchantInputValue, setSquareMerchantInputValue] = useState("");
  const [squareMerchants, setSquareMerchants] = useState([]);
  const [squareConnectedAt, setSquareConnectedAt] = useState("");
  const [onEditingSquare, setOnEditingSquare] = useState(false);
  const [dashboardVisibility, setDashboardVisibility] = useState({});

  const toJST = (dateStr) => {
    if (!dateStr) return "";
    const iso = dateStr.endsWith("Z") ? dateStr : dateStr + "Z";
    return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  };

  const isExpired = (dateStr) => {
    if (!dateStr) return false;
    const iso = dateStr.endsWith("Z") ? dateStr : dateStr + "Z";
    return new Date(iso) < new Date();
  };

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/company/detail/${id}`, {
        withCredentials: true,
      });
      setEditCompany(res.data);
      setSmaregiContractId(res.data.smaregi_contract_id ?? "");
      setSmaregiConnectedAt(res.data.smaregi_connected_at ?? "");
      setSmaregiTokenExpiresAt(res.data.smaregi_token_expires_at ?? "");
      setSquareMerchantId(res.data.square_merchant_id ?? "");
      setSquareConnectedAt(res.data.square_connected_at ?? "");
    } catch (error) {
      showSnackbar({
        message: "会社情報の取得に失敗しました",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTrjInfo = async () => {
    try {
      setLoading(true);
      // TRJ連携情報の取得APIエンドポイントは仮置きです。実際のエンドポイントに置き換えてください。
      const res = await axios.get(`${API_BASE_URL}/company/trj-detail/${id}`, {
        withCredentials: true,
      });
      // OrganizationListの最初の要素を取得
      const organization = res.data.OrganizationList?.[0];
      if (organization) {
        setTrjInfo(organization);
      }
    } catch (error) {
      showSnackbar({
        message: "TRJ情報の取得に失敗しました",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const editTrjInfo = async () => {
    try {
      setOnEditing(false);
      const payload = {
        biz_name: editCompany.biz_name,
        trj_code: trjInfo.Code,
        trj_email: trjInfo.Email,
        trj_phone: trjInfo.PhoneNumber,
        trj_status: trjInfo.Status,
      };
      setLoading(true);
      await axios.post(`${API_BASE_URL}/company/trj-update/${id}`, payload, {
        withCredentials: true,
      });
      fetchTrjInfo();
      showSnackbar({
        message: "TRJ情報を更新しました",
        variant: "success",
      });
    } catch (error) {
      showSnackbar({
        message: "TRJ情報の更新に失敗しました",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Smaregi connect with contract ID as body through company ID as query parameter
  const handleSmaregiConnect = async () => {
    try {
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/smaregi/connect?company_id=${id}`,
        { contract_id: smaregiInputValue },
        { withCredentials: true },
      );
      setSmaregiInputValue("");
      await fetchCompanyDetails();
      showSnackbar({ message: "Smaregi連携しました", variant: "success" });
    } catch (error) {
      showSnackbar({ message: "Smaregi連携に失敗しました", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Smaregi disconnect through company ID as query parameter and delete contract ID and backend remove access token
  const handleSmaregiDisconnect = async () => {
    try {
      setLoading(true);
      await axios.delete(
        `${API_BASE_URL}/smaregi/disconnect?company_id=${id}`,
        { withCredentials: true },
      );
      setSmaregiContractId("");
      setSmaregiInputValue("");
      setSmaregiConnectedAt("");
      setSmaregiTokenExpiresAt("");
      setOnEditingSmaregi(false);
      showSnackbar({
        message: "Smaregi連携を解除しました",
        variant: "success",
      });
    } catch (error) {
      showSnackbar({
        message: "Smaregi連携解除に失敗しました",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSmaregiInfo = async () => {
    try {
      setLoading(true);
      setOnEditingSmaregi(false);
      await axios.post(
        `${API_BASE_URL}/smaregi/connect?company_id=${id}`,
        { contract_id: smaregiContractId },
        { withCredentials: true },
      );
      await fetchCompanyDetails();
      showSnackbar({
        message: "Smaregi情報を更新しました",
        variant: "success",
      });
    } catch (error) {
      showSnackbar({
        message: "Smaregi情報の更新に失敗しました",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSquareMerchants = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/square/merchants?company_id=${id}`,
        { withCredentials: true },
      );
      const merchants = Array.isArray(res.data)
        ? res.data
        : res.data
          ? [res.data]
          : [];
      setSquareMerchants(merchants.filter((m) => m?.merchant_id));
    } catch (error) {
      setSquareMerchants([]);
      showSnackbar({
        message: "Squareマーチャント一覧の取得に失敗しました",
        variant: "error",
      });
    }
  };

  // Square connect with merchant ID as body through company ID as query parameter
  const handleSquareConnect = async () => {
    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/square/company/connect?company_id=${id}`,
        { merchant_id: squareMerchantInputValue },
        { withCredentials: true },
      );
      setSquareMerchantId(res.data.merchant_id ?? "");
      setSquareConnectedAt(res.data.connected_at ?? "");
      setSquareMerchantInputValue("");
      showSnackbar({ message: "Square連携しました", variant: "success" });
    } catch (error) {
      showSnackbar({ message: "Square連携に失敗しました", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Square disconnect through company ID as query parameter and delete merchant ID and backend remove access token
  const handleSquareDisconnect = async () => {
    try {
      setLoading(true);
      await axios.delete(`${API_BASE_URL}/square/disconnect?company_id=${id}`, {
        withCredentials: true,
      });
      setSquareMerchantId("");
      setSquareMerchantInputValue("");
      setSquareConnectedAt("");
      setOnEditingSquare(false);
      showSnackbar({ message: "Square連携を解除しました", variant: "success" });
    } catch (error) {
      showSnackbar({
        message: "Square連携解除に失敗しました",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };
  // Square save merchant ID through company ID as query parameter
  const handleSaveSquareInfo = async () => {
    try {
      setLoading(true);
      setOnEditingSquare(false);
      await axios.post(
        `${API_BASE_URL}/square/company/connect?company_id=${id}`,
        { merchant_id: squareMerchantId },
        { withCredentials: true },
      );
      await fetchCompanyDetails();
      showSnackbar({ message: "Square情報を更新しました", variant: "success" });
    } catch (error) {
      showSnackbar({
        message: "Square情報の更新に失敗しました",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const editLoginInfo = async () => {
    try {
      setOnEditingLoginInfo(false);
      const payload = {
        login_id: editCompany.login_id,
        login_password: editCompany.login_password,
      };
      setLoading(true);
      await axios.post(
        `${API_BASE_URL}/company/logininfo_update/${id}`,
        payload,
        {
          withCredentials: true,
        },
      );
      fetchCompanyDetails();
      showSnackbar({
        message: "ログイン情報を更新しました",
        variant: "success",
      });
    } catch (error) {
      showSnackbar({
        message: "ログイン情報の更新に失敗しました",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetails();
    fetchTrjInfo();
    fetchSquareMerchants();
  }, []);

  const handleEditCompany = async () => {
    try {
      setLoading(true);
      const payload = {
        sender_id: editCompany.sender_id,
        biz_name: editCompany.biz_name,
        biz_place: editCompany.biz_place,
        biz_name_kana: editCompany.biz_name_kana,
        biz_place_kana: editCompany.biz_place_kana,
        manager_name: editCompany.manager_name,
        manager_name_kana: editCompany.manager_name_kana,
        manager_email: editCompany.manager_email,
        manager_phone: editCompany.manager_phone,
        trj_code: editCompany.trj_code,
        trj_email: editCompany.trj_email,
        trj_phone: editCompany.trj_phone,
        trj_status: editCompany.trj_status,
      };
      const res = await axios.put(
        `${API_BASE_URL}/company/${editCompany.id}`,
        payload,
        {
          withCredentials: true,
        },
      );
      showSnackbar({
        message: "会社情報を更新しました",
        variant: "success",
      });
    } catch (error) {
      showSnackbar({
        message: "会社情報の更新に失敗しました",
        variant: "error",
      });
    } finally {
      fetchCompanyDetails();
      setLoading(false);
    }
  };

  const breadcrumbs = [
    <Link underline="hover" color="inherit" key="1" href="/companies">
      会社一覧
    </Link>,
    <Typography key="2" color="text.primary">
      {companyName}
    </Typography>,
  ];

  return (
    <>
      <AdminHeader />
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress />
      </Backdrop>
      <Box
        sx={{
          backgroundColor: "white",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <Container maxWidth="lg" sx={{ paddingBlock: 2 }}>
          <Box sx={{ mt: 0 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
              会社情報を編集
            </Typography>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Stack>
              <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small" />}
                aria-label="breadcrumb"
              >
                {breadcrumbs}
              </Breadcrumbs>
            </Stack>
          </Box>
          <Box sx={{ flex: 1, width: "100%", mt: 4 }}>
            <FormGroup sx={{ mb: 4 }}>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={12} sx={{ display: "flex" }}>
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    基本情報
                  </Typography>
                </Grid>
                <Grid size={12} sx={{ display: "flex" }}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel id="sender-type-label">送信者</InputLabel>
                    <Select
                      labelId="sender-type-label"
                      id="sender-type"
                      label="送信者"
                      value={editCompany.sender_id ?? ""}
                      onChange={(e) =>
                        setEditCompany({
                          ...editCompany,
                          sender_id: e.target.value,
                        })
                      }
                    >
                      <MenuItem value="1">TAIMATSU自社</MenuItem>
                      <MenuItem value="2">他事業者</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                  <TextField
                    fullWidth
                    label="会社名"
                    variant="outlined"
                    value={editCompany.biz_name}
                    onChange={(e) =>
                      setEditCompany({
                        ...editCompany,
                        biz_name: e.target.value,
                      })
                    }
                    autoComplete="off"
                    slotProps={{
                      inputProps: { maxLength: 50 },
                    }}
                    helperText={`${editCompany.biz_name.length}/50文字`}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                  <TextField
                    fullWidth
                    label="会社名フリガナ"
                    variant="outlined"
                    value={editCompany.biz_name_kana}
                    onChange={(e) =>
                      setEditCompany({
                        ...editCompany,
                        biz_name_kana: e.target.value,
                      })
                    }
                    slotProps={{
                      InputLabel: { shrink: true },
                    }}
                    autoComplete="off"
                  />
                </Grid>
                <Grid size={12} sx={{ display: "flex" }}>
                  <TextField
                    fullWidth
                    label="会社所在地"
                    variant="outlined"
                    value={editCompany.biz_place}
                    onChange={(e) =>
                      setEditCompany({
                        ...editCompany,
                        biz_place: e.target.value,
                      })
                    }
                    slotProps={{
                      InputLabel: { shrink: true },
                      inputProps: { maxLength: 50 },
                    }}
                    autoComplete="off"
                    helperText={`${editCompany.biz_place.length}/50文字`}
                  />
                </Grid>
                <Grid size={12} sx={{ display: "flex" }}>
                  <TextField
                    fullWidth
                    label="会社所在地フリガナ"
                    variant="outlined"
                    value={editCompany.biz_place_kana}
                    onChange={(e) =>
                      setEditCompany({
                        ...editCompany,
                        biz_place_kana: e.target.value,
                      })
                    }
                    autoComplete="off"
                  />
                </Grid>
                <Divider sx={{ width: "100%", my: 2 }} />
                <Grid size={12} sx={{ display: "flex" }}>
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    代表者情報
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                  <TextField
                    fullWidth
                    label="代表者名"
                    variant="outlined"
                    value={editCompany.manager_name}
                    onChange={(e) =>
                      setEditCompany({
                        ...editCompany,
                        manager_name: e.target.value,
                      })
                    }
                    autoComplete="off"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                  <TextField
                    fullWidth
                    label="代表者名フリガナ"
                    variant="outlined"
                    value={editCompany.manager_name_kana}
                    onChange={(e) =>
                      setEditCompany({
                        ...editCompany,
                        manager_name_kana: e.target.value,
                      })
                    }
                    autoComplete="off"
                  />
                </Grid>
                <Grid size={12} sx={{ display: "flex" }}>
                  <TextField
                    fullWidth
                    label="代表電話番号"
                    variant="outlined"
                    value={editCompany.manager_phone}
                    onChange={(e) =>
                      setEditCompany({
                        ...editCompany,
                        manager_phone: e.target.value,
                      })
                    }
                    autoComplete="off"
                  />
                </Grid>
                <Grid size={12} sx={{ display: "flex" }}>
                  <TextField
                    fullWidth
                    label="代表Eメールアドレス"
                    variant="outlined"
                    value={editCompany.manager_email}
                    onChange={(e) =>
                      setEditCompany({
                        ...editCompany,
                        manager_email: e.target.value,
                      })
                    }
                    autoComplete="off"
                  />
                </Grid>
                <Divider sx={{ width: "100%", my: 3 }} />
                <Grid size={12}>
                  <Stack spacing={0.5} sx={{ width: "100%" }}>
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                      ダッシュボードに表示 (Show on Dashboard)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ダッシュボードに表示するサービスを選択してください。
                    </Typography>
                  </Stack>

                  <Box
                    sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 2 }}
                  >
                    {DASHBOARD_SERVICES.map((service) => {
                      const checked = !!dashboardVisibility[service.key];
                      return (
                        <Box
                          key={service.key}
                          onClick={() =>
                            handleToggleDashboardService(service.key, !checked)
                          }
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            px: 2,
                            py: 1.5,
                            minWidth: 220,
                            border: "1px solid",
                            borderColor: checked ? "primary.main" : "divider",
                            borderRadius: 2,
                            cursor: "pointer",
                            bgcolor: checked
                              ? "primary.50"
                              : "background.paper",
                            transition:
                              "border-color 0.15s ease, background-color 0.15s ease",
                            "&:hover": {
                              borderColor: "primary.main",
                              bgcolor: checked ? "primary.100" : "action.hover",
                            },
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1.5}
                            alignItems="center"
                          >
                            <Box
                              sx={{
                                width: 80,
                                height: 32,
                                borderRadius: 1.5,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: "grey.50",
                                border: "1px solid",
                                borderColor: "grey.200",
                                overflow: "hidden",
                                flexShrink: 0,
                                p: 0.5,
                              }}
                            >
                              <Box
                                component="img"
                                src={service.logo}
                                alt={`${service.label} logo`}
                                sx={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "contain",
                                  transform: `scale(${service.logoScale ?? 1})`,
                                }}
                              />
                            </Box>
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: 500 }}
                            >
                              {service.label}
                            </Typography>
                          </Stack>

                          <Box onClick={(e) => e.stopPropagation()}>
                            <Switch  />
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Grid>

                <Divider sx={{ width: "100%", my: 3 }} />
                <Grid size={12}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Grid
                      sx={{ display: "flex", alignItems: "center", gap: 2 }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                        Smaregi連携
                      </Typography>
                      {smaregiConnectedAt && (
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary" }}
                        >
                          「接続日時 :{" "}
                          <strong>{toJST(smaregiConnectedAt)}</strong>」
                        </Typography>
                      )}
                      {smaregiTokenExpiresAt && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: isExpired(smaregiTokenExpiresAt)
                              ? "red"
                              : "text.secondary",
                          }}
                        >
                          「
                          <span style={{ color: "#c31212" }}>
                            トークン有効期限
                          </span>{" "}
                          : <strong>{toJST(smaregiTokenExpiresAt)}</strong>」
                        </Typography>
                      )}
                    </Grid>
                    {smaregiContractId && (
                      <Typography
                        variant="body2"
                        sx={{ color: "green", fontWeight: "bold" }}
                      >
                        ● 接続中
                      </Typography>
                    )}
                  </Box>
                  {smaregiContractId ? (
                    <Grid container spacing={2}>
                      <Grid size={12}>
                        <ButtonGroup>
                          <Button
                            variant="outlined"
                            onClick={() => setOnEditingSmaregi(true)}
                            sx={{
                              color: "white",
                              backgroundColor: !onEditingSmaregi
                                ? colors.darkBlue
                                : "transparent",
                            }}
                            disabled={onEditingSmaregi}
                          >
                            編集
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => setOnEditingSmaregi(false)}
                            sx={{
                              color: "white",
                              backgroundColor: onEditingSmaregi
                                ? "gray"
                                : "transparent",
                            }}
                            disabled={!onEditingSmaregi}
                          >
                            キャンセル
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={handleSaveSmaregiInfo}
                            sx={{
                              backgroundColor: onEditingSmaregi
                                ? colors.blue
                                : "transparent",
                              color: "white",
                            }}
                            disabled={!onEditingSmaregi}
                          >
                            保存
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={handleSmaregiDisconnect}
                            sx={{ backgroundColor: "#d32f2f", color: "white" }}
                          >
                            連携解除
                          </Button>
                        </ButtonGroup>
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          fullWidth
                          label="Smaregi契約ID"
                          variant="outlined"
                          value={smaregiContractId}
                          onChange={(e) => setSmaregiContractId(e.target.value)}
                          autoComplete="off"
                          disabled={!onEditingSmaregi}
                        />
                      </Grid>
                    </Grid>
                  ) : (
                    <Grid container spacing={2}>
                      <Grid size={12}>
                        <TextField
                          fullWidth
                          label="Smaregi契約ID"
                          variant="outlined"
                          value={smaregiInputValue}
                          onChange={(e) => setSmaregiInputValue(e.target.value)}
                          autoComplete="off"
                        />
                      </Grid>
                      <Grid size={12}>
                        <Button
                          variant="contained"
                          onClick={handleSmaregiConnect}
                          disabled={!smaregiInputValue}
                          sx={{ backgroundColor: colors.blue, color: "white" }}
                        >
                          接続
                        </Button>
                      </Grid>
                    </Grid>
                  )}
                </Grid>
                <Divider sx={{ width: "100%", my: 2 }} />
                <Grid size={12}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Grid
                      sx={{ display: "flex", alignItems: "center", gap: 2 }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                        Square連携
                      </Typography>
                      {squareConnectedAt && (
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary" }}
                        >
                          「接続日時 :{" "}
                          <strong>{toJST(squareConnectedAt)}</strong>」
                        </Typography>
                      )}
                    </Grid>
                    {squareMerchantId && (
                      <Typography
                        variant="body2"
                        sx={{ color: "green", fontWeight: "bold" }}
                      >
                        ● 接続中
                      </Typography>
                    )}
                  </Box>
                  {squareMerchantId ? (
                    <Grid container spacing={2}>
                      <Grid size={12}>
                        <ButtonGroup>
                          <Button
                            variant="outlined"
                            onClick={() => setOnEditingSquare(true)}
                            sx={{
                              color: "white",
                              backgroundColor: !onEditingSquare
                                ? colors.darkBlue
                                : "transparent",
                            }}
                            disabled={onEditingSquare}
                          >
                            編集
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => setOnEditingSquare(false)}
                            sx={{
                              color: "white",
                              backgroundColor: onEditingSquare
                                ? "gray"
                                : "transparent",
                            }}
                            disabled={!onEditingSquare}
                          >
                            キャンセル
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={handleSaveSquareInfo}
                            sx={{
                              backgroundColor: onEditingSquare
                                ? colors.blue
                                : "transparent",
                              color: "white",
                            }}
                            disabled={!onEditingSquare}
                          >
                            保存
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={handleSquareDisconnect}
                            sx={{ backgroundColor: "#d32f2f", color: "white" }}
                          >
                            連携解除
                          </Button>
                        </ButtonGroup>
                      </Grid>
                      <Grid size={12}>
                        <TextField
                          fullWidth
                          label="Square マーチャントID"
                          variant="outlined"
                          value={squareMerchantId}
                          onChange={(e) => setSquareMerchantId(e.target.value)}
                          autoComplete="off"
                          disabled={!onEditingSquare}
                        />
                      </Grid>
                    </Grid>
                  ) : (
                    <Grid container spacing={2}>
                      <Grid size={12}>
                        <Autocomplete
                          options={squareMerchants}
                          getOptionLabel={(option) =>
                            typeof option === "string"
                              ? option
                              : (option.merchant_id ?? "")
                          }
                          inputValue={squareMerchantInputValue}
                          onInputChange={(_, newInputValue) =>
                            setSquareMerchantInputValue(newInputValue)
                          }
                          freeSolo
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              fullWidth
                              label="Square マーチャントID"
                              variant="outlined"
                              autoComplete="off"
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={12}>
                        <Button
                          variant="contained"
                          onClick={handleSquareConnect}
                          disabled={!squareMerchantInputValue}
                          sx={{ backgroundColor: colors.blue, color: "white" }}
                        >
                          接続
                        </Button>
                      </Grid>
                    </Grid>
                  )}
                </Grid>
                <Grid size={12} sx={{ display: "flex" }}>
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    ダッシュボードログイン情報
                  </Typography>
                </Grid>
                <Grid size={12} sx={{ display: "flex" }}>
                  <ButtonGroup sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setOnEditingLoginInfo(true);
                      }}
                      sx={{
                        color: "white",
                        backgroundColor: !onEditingLoginInfo
                          ? colors.darkBlue
                          : "transparent",
                      }}
                      disabled={onEditingLoginInfo}
                    >
                      編集
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setOnEditingLoginInfo(false);
                      }}
                      sx={{
                        color: "white",
                        backgroundColor: onEditingLoginInfo
                          ? "gray"
                          : "transparent",
                      }}
                      disabled={!onEditingLoginInfo}
                    >
                      キャンセル
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        editLoginInfo();
                      }}
                      sx={{
                        backgroundColor: onEditingLoginInfo
                          ? colors.blue
                          : "transparent",
                        color: "white",
                      }}
                      disabled={!onEditingLoginInfo}
                    >
                      保存
                    </Button>
                  </ButtonGroup>
                </Grid>
                <Grid size={12} sx={{ display: "flex" }}>
                  <TextField
                    fullWidth
                    label="ログインID"
                    variant="outlined"
                    value={editCompany.login_id}
                    onChange={(e) =>
                      setEditCompany({
                        ...editCompany,
                        login_id: e.target.value,
                      })
                    }
                    autoComplete="off"
                    disabled={!onEditingLoginInfo}
                  />
                </Grid>
                <Grid size={12} sx={{ display: "flex" }}>
                  <TextField
                    fullWidth
                    label="パスワード"
                    variant="outlined"
                    value={editCompany.login_password}
                    onChange={(e) =>
                      setEditCompany({
                        ...editCompany,
                        login_password: e.target.value,
                      })
                    }
                    autoComplete="off"
                    disabled={!onEditingLoginInfo}
                  />
                </Grid>
                <Divider sx={{ width: "100%", my: 3 }} />
                <Grid size={12} sx={{ display: "flex" }}>
                  <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    TRJ連携情報
                  </Typography>
                </Grid>
                {/* {trjInfo.OrganizationID && ( */}
                <>
                  <Grid size={12} sx={{ display: "flex" }}>
                    <ButtonGroup sx={{ mb: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setOnEditing(true);
                        }}
                        sx={{
                          color: "white",
                          backgroundColor: !onEditing
                            ? colors.darkBlue
                            : "transparent",
                        }}
                        disabled={onEditing}
                      >
                        編集
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setOnEditing(false);
                        }}
                        sx={{
                          color: "white",
                          backgroundColor: onEditing ? "gray" : "transparent",
                        }}
                        disabled={!onEditing}
                      >
                        キャンセル
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          editTrjInfo();
                        }}
                        sx={{
                          backgroundColor: onEditing
                            ? colors.blue
                            : "transparent",
                          color: "white",
                        }}
                        disabled={!onEditing}
                      >
                        保存
                      </Button>
                    </ButtonGroup>
                  </Grid>
                  <Grid size={12} sx={{ display: "flex" }}>
                    <TextField
                      fullWidth
                      label="TRJコード"
                      variant="outlined"
                      value={trjInfo.Code ?? ""}
                      onChange={(e) =>
                        setTrjInfo({
                          ...trjInfo,
                          Code: e.target.value,
                        })
                      }
                      slotProps={{
                        inputLabel: { shrink: true },
                      }}
                      autoComplete="off"
                      disabled={!onEditing}
                    />
                  </Grid>
                  <Grid size={12} sx={{ display: "flex" }}>
                    <TextField
                      fullWidth
                      label="TRJ連携用Eメールアドレス"
                      variant="outlined"
                      value={trjInfo.Email ?? ""}
                      onChange={(e) =>
                        setTrjInfo({
                          ...trjInfo,
                          Email: e.target.value,
                        })
                      }
                      slotProps={{
                        inputLabel: { shrink: true },
                      }}
                      autoComplete="off"
                      disabled={!onEditing}
                    />
                  </Grid>
                  <Grid size={12} sx={{ display: "flex" }}>
                    <TextField
                      fullWidth
                      label="TRJ連携用電話番号"
                      variant="outlined"
                      value={trjInfo.PhoneNumber ?? ""}
                      onChange={(e) =>
                        setTrjInfo({
                          ...trjInfo,
                          PhoneNumber: e.target.value,
                        })
                      }
                      slotProps={{
                        inputLabel: { shrink: true },
                      }}
                      autoComplete="off"
                      disabled={!onEditing}
                    />
                  </Grid>
                  <Grid size={12} sx={{ display: "flex" }}>
                    <FormControl
                      fullWidth
                      variant="outlined"
                      disabled={!onEditing}
                    >
                      <InputLabel id="trj-status-label">
                        連携口座ステータス
                      </InputLabel>
                      <Select
                        labelId="trj-status-label"
                        id="trj-status"
                        label="連携口座ステータス"
                        value={trjInfo.Status ?? ""}
                        onChange={(e) =>
                          setTrjInfo({
                            ...trjInfo,
                            Status: e.target.value,
                          })
                        }
                      >
                        <MenuItem value="">未設定</MenuItem>
                        <MenuItem value={0}>停止中</MenuItem>
                        <MenuItem value={1}>アクティブ</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                    <Typography sx={{ fontWeight: "bold" }}>銀行名</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                    <Typography>{trjInfo.BankName || "未設定"}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                    <Typography sx={{ fontWeight: "bold" }}>
                      支店コード
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                    <Typography>{trjInfo.BranchCode || "未設定"}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                    <Typography sx={{ fontWeight: "bold" }}>支店名</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                    <Typography>{trjInfo.BranchName || "未設定"}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                    <Typography sx={{ fontWeight: "bold" }}>
                      支店名カナ
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                    <Typography>
                      {trjInfo.BranchNameKana || "未設定"}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                    <Typography sx={{ fontWeight: "bold" }}>
                      口座番号
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                    <Typography>{trjInfo.AccountNumber || "未設定"}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                    <Typography sx={{ fontWeight: "bold" }}>
                      口座名義カナ
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex" }}>
                    <Typography>
                      {trjInfo.AccountNameKana || "未設定"}
                    </Typography>
                  </Grid>
                </>
                {/* )} */}
              </Grid>
            </FormGroup>
            <Divider sx={{ width: "100%", my: 6 }} />
            <Stack direction="row" spacing={2} justifyContent="space-between">
              <Button
                variant="contained"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/companies")}
                sx={{
                  backgroundColor: `${colors.darkBlue}`,
                  height: "40px",
                }}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="large"
                sx={{
                  backgroundColor: `${colors.blue}`,
                  height: "40px",
                }}
                onClick={handleEditCompany}
              >
                保存
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>
    </>
  );
};

```


```
