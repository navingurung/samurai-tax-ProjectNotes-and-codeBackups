// Login.tsx


```tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import axios from "axios";
import { Backdrop, CircularProgress, Typography } from "@mui/material";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import { LoginShopContext } from "../../shared/providers/LoginShopProvider";
import { useTranslation } from "react-i18next";

interface ShopCredentials {
  login_id: string;
  login_password: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const context = useContext(LoginShopContext);
  if (!context) throw new Error(t("login.noContextError"));
  const { setLoginShop, setIsLoggedIn } = context;

  const navigate = useNavigate();
  const [shop, setShop] = useState<ShopCredentials>({
    login_id: "",
    login_password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShop((prev) => ({ ...prev, [name]: value }));
  };

  const onClickLogin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("username", shop.login_id);
      params.append("password", shop.login_password);
      const response = await axios.post(`${API_BASE_URL}/auth/token`, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        withCredentials: true,
      });
      setLoginShop({
        id: response.data.shop_id,
        shop_name: response.data.shop_name,
        use_shopify: response.data.use_shopify,
        product_list: response.data.product_list,
        use_trj: response.data.use_trj,
      });
      setIsLoggedIn(true);
      navigate("/", { replace: true });
    } catch {
      setError(t("login.loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <CircularProgress color="inherit" />
        <Typography sx={{ ml: 2 }}>{t("login.processing")}</Typography>
      </Backdrop>

      {/* Full-page blue background — breaks out of any parent padding */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "#1a4fa8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Organic blobs */}
        <div style={{
          position: "absolute", width: 500, height: 500,
          borderRadius: "60% 40% 70% 30% / 50% 60% 40% 50%",
          background: "rgba(255,255,255,0.06)",
          top: -140, left: -120, pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", width: 380, height: 380,
          borderRadius: "40% 60% 30% 70% / 60% 40% 60% 40%",
          background: "rgba(255,255,255,0.05)",
          bottom: -100, right: -80, pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", width: 220, height: 220,
          borderRadius: "70% 30% 50% 50% / 40% 60% 40% 60%",
          background: "rgba(255,255,255,0.04)",
          top: 80, right: 60, pointerEvents: "none",
        }} />

        {/* Login card */}
        <div style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 380,
          padding: "0 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
          {/* Brand icon */}
          <div style={{
            width: 68, height: 68,
            background: "rgba(255,255,255,0.15)",
            borderRadius: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 14,
          }}>
            <StorefrontOutlinedIcon sx={{ fontSize: 36, color: "#fff" }} />
          </div>

          {/* Brand name */}
          <Typography sx={{
            color: "#fff", fontSize: "1.7rem",
            fontWeight: 500, mb: 0.5, letterSpacing: "0.01em",
          }}>
            ようこそ！
          </Typography>

          {/* Error */}
          {error && (
            <Typography sx={{
              color: "#fca5a5", fontSize: "0.85rem",
              mb: 2, textAlign: "center", fontWeight: 500,
            }}>
              {error}
            </Typography>
          )}

          {/* Fields */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{
                display: "block", color: "rgba(255,255,255,0.75)",
                fontSize: "0.7rem", fontWeight: 600,
                letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6,
              }}>
                {t("login.id")}
              </label>
              <input
                type="text"
                name="login_id"
                placeholder={t("login.idPlaceholder")}
                autoComplete="username"
                autoFocus
                onChange={handleChange}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#fff", border: "none",
                  borderRadius: 10, padding: "12px 14px",
                  fontSize: "0.98rem", color: "#1a1a2e",
                  outline: "none", fontFamily: "inherit",
                }}
                onFocus={(e) => e.target.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.35)"}
                onBlur={(e) => e.target.style.boxShadow = "none"}
              />
            </div>

            <div>
              <label style={{
                display: "block", color: "rgba(255,255,255,0.75)",
                fontSize: "0.7rem", fontWeight: 600,
                letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6,
              }}>
                {t("login.password")}
              </label>
              <input
                type="password"
                name="login_password"
                placeholder="••••••••"
                autoComplete="current-password"
                onChange={handleChange}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#fff", border: "none",
                  borderRadius: 10, padding: "12px 14px",
                  fontSize: "0.98rem", color: "#1a1a2e",
                  outline: "none", fontFamily: "inherit",
                }}
                onFocus={(e) => e.target.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.35)"}
                onBlur={(e) => e.target.style.boxShadow = "none"}
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            onClick={onClickLogin}
            disabled={loading}
            style={{
              width: "100%", background: "#fff",
              color: "#1a4fa8", border: "none",
              borderRadius: 10, padding: "12px",
              fontSize: "1rem", fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              fontFamily: "inherit",
              transition: "opacity 0.15s",
            }}
          >
            {t("login.signIn")}
          </button>
        </div>

        {/* Footer */}
        <Typography sx={{
          position: "absolute", bottom: 16,
          color: "white", fontSize: "0.9rem",
        }}>
          © {new Date().getFullYear()} Samurai Tax · All rights reserved
        </Typography>
      </div>
    </>
  );
};

```



