import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import SyncIcon from "@mui/icons-material/Sync";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ClearIcon from "@mui/icons-material/Clear";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { fetchSquareTransactions } from "./squareApi";
import type { SquareTransaction } from "./types";
import { colors } from "../../../shared/styles/colors";

const format_jpy = (amount: number) =>
  new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    minimumFractionDigits: 0,
  }).format(amount);

type Props = {
  onSelect: (tx: SquareTransaction) => void;
  selectedPaymentId?: string;
};

export const SquareTransactionSelector: React.FC<Props> = ({
  onSelect,
  selectedPaymentId,
}) => {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<SquareTransaction[]>([]);
  const [locationName, setLocationName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<dayjs.Dayjs | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSquareTransactions({
        date: dateFilter || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        query: searchQuery || undefined,
      });
      setTransactions(data.transactions);
      setLocationName(data.location_name);
      setLastSync(dayjs());
    } catch {
      setError(t("square.fetchError", "Failed to load Square transactions"));
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter, searchQuery, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setDateFilter("");
    setStatusFilter("ALL");
  };

  const hasFilters = searchQuery || dateFilter || statusFilter !== "ALL";

  const statusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "success";
      case "FAILED":
        return "error";
      case "CANCELED":
        return "default";
      default:
        return "default";
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{ mb: 3, borderRadius: 2, borderColor: colors.silver ?? "#e0e0e0" }}
    >
      <CardContent sx={{ p: 0 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 3,
            py: 2,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {/* Square logo mark */}
            <Box
              sx={{
                width: 32,
                height: 32,
                bgcolor: "#000",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  width: 18,
                  height: 18,
                  border: "3px solid #fff",
                  borderRadius: 0.5,
                }}
              />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Square
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="caption" color="text.secondary">
                {t("square.lastSync", "Last Sync")}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {lastSync
                  ? `${dayjs().diff(lastSync, "minute")} ${t("square.minutesAgo", "分前")}`
                  : "-"}
              </Typography>
            </Box>
            <Tooltip title={t("square.sync", "Sync")}>
              <IconButton
                onClick={load}
                disabled={loading}
                sx={{
                  bgcolor: colors.darkBlue ?? "#1a3c6e",
                  color: "#fff",
                  "&:hover": { bgcolor: colors.blue ?? "#1565c0" },
                  "&.Mui-disabled": { bgcolor: "#ccc", color: "#fff" },
                  width: 40,
                  height: 40,
                }}
              >
                <SyncIcon
                  sx={{
                    fontSize: 20,
                    animation: loading ? "spin 1s linear infinite" : "none",
                    "@keyframes spin": {
                      "0%": { transform: "rotate(0deg)" },
                      "100%": { transform: "rotate(360deg)" },
                    },
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Location name */}
        {locationName && (
          <Box sx={{ px: 3, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="body2" color="text.secondary">
              {locationName}
            </Typography>
          </Box>
        )}

        {/* Transactions section */}
        <Box sx={{ px: 3, py: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <ReceiptLongIcon sx={{ fontSize: 20, color: "text.secondary" }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("square.transactions", "Transactions")}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {loading
              ? t("square.loading", "Loading...")
              : `${transactions.length} ${t("square.paymentsFound", "Square payments found")}${locationName ? ` from ${locationName}` : ""}.`}
          </Typography>

          {/* Filters */}
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              flexWrap: "wrap",
              alignItems: "center",
              mb: 2,
            }}
          >
            <TextField
              size="small"
              placeholder={t(
                "square.searchPlaceholder",
                "Search payment ID, order ID...",
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1, minWidth: 220 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              size="small"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              sx={{ width: 180 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarTodayIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>{t("square.status", "Status")}</InputLabel>
              <Select
                label={t("square.status", "Status")}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="ALL">{t("square.allStatus", "All status")}</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="FAILED">Failed</MenuItem>
                <MenuItem value="CANCELED">Canceled</MenuItem>
              </Select>
            </FormControl>
            {hasFilters && (
              <Button
                size="small"
                variant="outlined"
                onClick={handleClearFilters}
                startIcon={<ClearIcon />}
                sx={{ textTransform: "none", borderColor: "#ccc", color: "text.secondary" }}
              >
                {t("square.clear", "Clear")}
              </Button>
            )}
          </Box>

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Loading skeleton */}
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          )}

          {/* Transaction list */}
          {!loading && transactions.length === 0 && !error && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary">
                {t("square.noTransactions", "No transactions found")}
              </Typography>
            </Box>
          )}

          {!loading &&
            transactions.map((tx) => {
              const isSelected = tx.payment.id === selectedPaymentId;
              return (
                <Card
                  key={tx.payment.id}
                  variant="outlined"
                  sx={{
                    mb: 1.5,
                    borderRadius: 2,
                    cursor: "pointer",
                    borderColor: isSelected ? colors.darkBlue ?? "#1a3c6e" : "divider",
                    borderWidth: isSelected ? 2 : 1,
                    bgcolor: isSelected ? "#f0f4ff" : "background.paper",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      borderColor: colors.darkBlue ?? "#1a3c6e",
                      bgcolor: "#f7f9ff",
                    },
                  }}
                  onClick={() => onSelect(tx)}
                >
                  <Box sx={{ p: 2 }}>
                    {/* Top row: receipt + status + detail button */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        mb: 0.5,
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: "#2e7d5e",
                              fontSize: "0.7rem",
                              letterSpacing: 0.5,
                            }}
                          >
                            SALES RECEIPT #{tx.payment.receipt_number}
                          </Typography>
                          <Chip
                            label={tx.payment.status}
                            size="small"
                            color={statusColor(tx.payment.status) as any}
                            sx={{ height: 18, fontSize: "0.65rem" }}
                          />
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, mt: 0.25 }}
                        >
                          {tx.order.line_items?.[0]?.name ?? "Custom Amount"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Order ID: {tx.payment.order_id}
                        </Typography>
                      </Box>
                      <Tooltip title={t("square.detail", "詳細")}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            // open receipt URL if available
                          }}
                          sx={{ ml: 1 }}
                        >
                          <OpenInNewIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    {/* Detail row */}
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(5, 1fr)",
                        gap: 1,
                      }}
                    >
                      {[
                        {
                          label: "DATE",
                          value: dayjs(tx.payment.created_at).format("MMM D, YYYY, hh:mm A"),
                        },
                        {
                          label: "QTY",
                          value: tx.order.line_items?.[0]?.quantity ?? "1",
                        },
                        {
                          label: "UNIT PRICE",
                          value: format_jpy(tx.payment.total_money.amount),
                        },
                        {
                          label: "TAXES & FEES",
                          value: tx.order.total_tax_money
                            ? format_jpy(tx.order.total_tax_money.amount)
                            : "-",
                        },
                        {
                          label: "TOTAL",
                          value: format_jpy(tx.payment.total_money.amount),
                        },
                      ].map(({ label, value }) => (
                        <Box key={label}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: "0.65rem", letterSpacing: 0.5 }}
                          >
                            {label}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, fontSize: "0.85rem" }}
                          >
                            {value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Card>
              );
            })}

          {/* Pagination hint */}
          {!loading && transactions.length > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              {t("square.showing", "Showing")} 1–{transactions.length}{" "}
              {t("square.of", "of")} {transactions.length}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
