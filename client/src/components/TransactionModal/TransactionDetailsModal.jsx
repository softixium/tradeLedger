import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Chip,
  Grid,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";
import PaymentIcon from "@mui/icons-material/Payment";
import PersonIcon from "@mui/icons-material/Person";
import InventoryIcon from "@mui/icons-material/Inventory";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useNavigate } from "react-router-dom";

import api from "../../api/axios";
import { colors, borderRadius, shadows } from "../../styles/theme";
import { formatDate as formatDisplayDate } from "../../utils/dateFormat";

const TransactionDetailsModal = ({
  open,
  onClose,
  transactionId,
  initialData = null,
  type = "sale", // "sale" | "stock"
  onRecordPayment,
  onOpenReceipt,
}) => {
  const navigate = useNavigate();
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setData(initialData);
      }
      if (transactionId) {
        fetchDetails(transactionId);
      }
    } else {
      setData(null);
    }
  }, [open, transactionId, initialData]);

  const fetchDetails = async (id) => {
    try {
      setLoading(true);
      const endpoint = type === "sale" ? `/sales/${id}` : `/stock/stocks/${id}`;
      const res = await api.get(endpoint);
      setData(res.data.data);
    } catch (err) {
      console.error("Failed to fetch transaction details", err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const isSale = type === "sale";
  const itemData = data || initialData;

  const formatCurrency = (val) =>
    `Rs. ${(Number(val) || 0).toLocaleString()}`;

  const formatDate = (d) => {
    return formatDisplayDate(d, "N/A");
  };

  const getStatusChip = (status, remaining = 0) => {
    const s = (status || "").toLowerCase();
    let bg = colors.errorLight;
    let fg = colors.errorDark;
    let label = "Unpaid";

    if (s === "paid" || remaining <= 0) {
      bg = colors.successLight;
      fg = colors.successDark;
      label = "Paid in Full";
    } else if (s === "partial" || (s !== "unpaid" && remaining > 0)) {
      bg = colors.warningLight;
      fg = colors.warningDark;
      label = "Partial";
    }

    return (
      <Chip
        label={label}
        size="small"
        sx={{
          backgroundColor: bg,
          color: fg,
          fontWeight: 700,
          fontSize: "12px",
          px: 0.5,
        }}
      />
    );
  };

  // Extract party info
  const party = isSale
    ? itemData?.buyerId || itemData?.buyer
    : itemData?.millerId || itemData?.miller;

  const partyName = party?.name || "N/A";
  const partyPhone = party?.phone || "No phone added";
  const partyAddress = party?.address || "No address added";
  const partyId = party?._id || party?.id;

  // Extract stock info for sale
  const stockSource = itemData?.stockId;
  const sourceMiller = stockSource?.millerId?.name || "Supplier";

  // Payments list
  const payments = itemData?.payments || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: borderRadius.lg,
          boxShadow: shadows.xl,
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          backgroundColor: isSale ? "#EFF6FF" : "#F0FDF4",
          borderBottom: `1px solid ${colors.border}`,
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: borderRadius.md,
              backgroundColor: isSale ? colors.primary : colors.success,
              color: colors.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isSale ? <PointOfSaleIcon /> : <InventoryIcon />}
          </Box>
          <Box>
            <Typography sx={{ fontSize: "18px", fontWeight: 800, color: colors.textPrimary }}>
              {isSale
                ? `Invoice #${itemData?.billNumber || "N/A"}`
                : `Stock Purchase #${itemData?.receiptNumber || "N/A"}`}
            </Typography>
            <Typography sx={{ fontSize: "12px", color: colors.textSecondary }}>
              {isSale ? "Customer Sale Transaction" : "Supplier Inbound Stock Receipt"}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {itemData && getStatusChip(itemData.status, itemData.remainingAmount)}
          <Chip
            label={itemData?.paymentType?.toUpperCase() || "CASH"}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: "11px" }}
          />
          <IconButton size="small" onClick={onClose} sx={{ color: colors.textSecondary }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ padding: "24px", backgroundColor: "#FAFAFA" }}>
        {loading && !itemData ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : !itemData ? (
          <Typography sx={{ py: 4, textAlign: "center", color: colors.textSecondary }}>
            Transaction details not available.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* Top Cards: Financial Summary */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                gap: 2,
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.white,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Typography sx={{ fontSize: "12px", fontWeight: 600, color: colors.textSecondary }}>
                  Total Transaction Amount
                </Typography>
                <Typography sx={{ fontSize: "20px", fontWeight: 800, color: colors.textPrimary, mt: 0.5 }}>
                  {formatCurrency(itemData.totalAmount)}
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.white,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Typography sx={{ fontSize: "12px", fontWeight: 600, color: colors.textSecondary }}>
                  Total Amount Paid / Received
                </Typography>
                <Typography sx={{ fontSize: "20px", fontWeight: 800, color: colors.successDark, mt: 0.5 }}>
                  {formatCurrency(itemData.paidAmount)}
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: borderRadius.md,
                  backgroundColor: itemData.remainingAmount > 0 ? colors.errorLight : colors.successLight,
                  border: `1px solid ${itemData.remainingAmount > 0 ? "#FCA5A5" : "#86EFAC"}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: itemData.remainingAmount > 0 ? colors.errorDark : colors.successDark,
                  }}
                >
                  Remaining Outstanding Balance
                </Typography>
                <Typography
                  sx={{
                    fontSize: "20px",
                    fontWeight: 800,
                    color: itemData.remainingAmount > 0 ? colors.errorDark : colors.successDark,
                    mt: 0.5,
                  }}
                >
                  {formatCurrency(itemData.remainingAmount)}
                </Typography>
              </Paper>
            </Box>

            {/* Grid: Overview & Party Details */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              {/* Transaction Metadata */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.white,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Typography sx={{ fontSize: "14px", fontWeight: 700, color: colors.textPrimary, mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                  <CalendarTodayIcon sx={{ fontSize: "18px", color: colors.primary }} />
                  Dates & Timeline
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, fontSize: "13px" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="textSecondary">Transaction Date:</Typography>
                    <Typography fontWeight={600}>{formatDate(itemData.date)}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="textSecondary">Due Date:</Typography>
                    <Typography fontWeight={600}>
                      {itemData.dueDate ? formatDate(itemData.dueDate) : `${itemData.dueDays || 0} Days (Immediate/Cash)`}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="textSecondary">Terms / Type:</Typography>
                    <Typography fontWeight={600} sx={{ textTransform: "capitalize" }}>
                      {itemData.paymentType || "Cash"}
                    </Typography>
                  </Box>
                  {isSale && itemData.profit !== undefined && (
                    <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1, borderTop: `1px dashed ${colors.border}` }}>
                      <Typography color="textSecondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <TrendingUpIcon sx={{ fontSize: "16px", color: colors.successDark }} />
                        Net Profit:
                      </Typography>
                      <Typography fontWeight={700} color={colors.successDark}>
                        {formatCurrency(itemData.profit)}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>

              {/* Connected Party Profile */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.white,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                  <Typography sx={{ fontSize: "14px", fontWeight: 700, color: colors.textPrimary, display: "flex", alignItems: "center", gap: 1 }}>
                    <PersonIcon sx={{ fontSize: "18px", color: colors.primary }} />
                    {isSale ? "Customer / Buyer Info" : "Supplier / Miller Info"}
                  </Typography>
                  {partyId && (
                    <Button
                      size="small"
                      endIcon={<OpenInNewIcon sx={{ fontSize: "14px" }} />}
                      onClick={() => {
                        onClose();
                        navigate(`/parties/${partyId}`);
                      }}
                      sx={{ textTransform: "none", fontSize: "12px", py: 0.2 }}
                    >
                      View Ledger
                    </Button>
                  )}
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, fontSize: "13px" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="textSecondary">Name:</Typography>
                    <Typography fontWeight={700} color={colors.primary}>
                      {partyName}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="textSecondary">Phone:</Typography>
                    <Typography fontWeight={500}>{partyPhone}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography color="textSecondary">Address:</Typography>
                    <Typography fontWeight={500}>{partyAddress}</Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>

            {/* Item & Commercial Specifications */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: borderRadius.md,
                backgroundColor: colors.white,
                border: `1px solid ${colors.border}`,
              }}
            >
              <Typography sx={{ fontSize: "14px", fontWeight: 700, color: colors.textPrimary, mb: 2 }}>
                📦 Item & Quantity Specifications
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: colors.surfaceMuted }}>
                      <TableCell sx={{ fontWeight: 700 }}>Item Name</TableCell>
                      {isSale ? (
                        <>
                          <TableCell sx={{ fontWeight: 700 }}>Sold Quantity</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Total Weight</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Sale Rate</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Purchase Rate</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Bhardana</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell sx={{ fontWeight: 700 }}>Purchased Qty</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Remaining Qty</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Weight / Katta</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Total Weight</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Purchase Rate</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(Array.isArray(itemData.items) && itemData.items.length > 0 ? itemData.items : [itemData]).map((rowItem, rIdx) => (
                      <TableRow key={rowItem._id || rIdx}>
                        <TableCell sx={{ fontWeight: 700 }}>{rowItem.itemName}</TableCell>
                        {isSale ? (
                          <>
                            <TableCell>
                              <Chip
                                label={`${rowItem.quantity} Qty (Katte)`}
                                size="small"
                                sx={{ bgcolor: colors.infoLight, color: colors.infoDark, fontWeight: 700 }}
                              />
                            </TableCell>
                            <TableCell>{rowItem.weight} kg</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Rs. {rowItem.rate}</TableCell>
                            <TableCell sx={{ color: colors.textSecondary }}>Rs. {rowItem.purchaseRate}</TableCell>
                            <TableCell>
                              {rowItem.bhardana ? `Rs. ${rowItem.bhardana} (@${rowItem.bhardanaRate})` : "—"}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: colors.primary }}>
                              {formatCurrency(rowItem.totalAmount)}
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>
                              <Chip
                                label={`${rowItem.totalQuantity} Qty`}
                                size="small"
                                sx={{ bgcolor: colors.surfaceMuted, fontWeight: 700 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${rowItem.remainingQuantity} Qty`}
                                size="small"
                                sx={{
                                  bgcolor: rowItem.remainingQuantity > 0 ? colors.successLight : colors.errorLight,
                                  color: rowItem.remainingQuantity > 0 ? colors.successDark : colors.errorDark,
                                  fontWeight: 700,
                                }}
                              />
                            </TableCell>
                            <TableCell>{rowItem.weightPerKatta} kg</TableCell>
                            <TableCell>{rowItem.totalWeight} kg</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Rs. {rowItem.purchaseRate}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: colors.primary }}>
                              {formatCurrency(rowItem.totalAmount)}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Stock Movement & Connected Traceability */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: borderRadius.md,
                backgroundColor: colors.white,
                border: `1px solid ${colors.border}`,
              }}
            >
              <Typography sx={{ fontSize: "14px", fontWeight: 700, color: colors.textPrimary, mb: 1.5 }}>
                🔄 Inventory Movement & Traceability
              </Typography>

              {isSale ? (
                <Box sx={{ p: 1.5, backgroundColor: colors.surfaceMuted, borderRadius: borderRadius.md }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: colors.textPrimary, mb: 0.5 }}>
                    Stock Source Batch:
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block" }}>
                    This sale was fulfilled from Stock Batch{" "}
                    <strong>#{stockSource?.receiptNumber || "Original Stock"}</strong> supplied by{" "}
                    <strong>{sourceMiller}</strong> at purchase rate{" "}
                    <strong>Rs. {itemData.purchaseRate}</strong>.
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Inventory Stock Level:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: colors.primary }}>
                      {itemData.remainingQuantity} / {itemData.totalQuantity} Bags Remaining (
                      {itemData.totalQuantity > 0
                        ? Math.round((itemData.remainingQuantity / itemData.totalQuantity) * 100)
                        : 0}
                      %)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={
                      itemData.totalQuantity > 0
                        ? (itemData.remainingQuantity / itemData.totalQuantity) * 100
                        : 0
                    }
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.border,
                      "& .MuiLinearProgress-bar": {
                        backgroundColor:
                          itemData.remainingQuantity > 0 ? colors.success : colors.error,
                      },
                    }}
                  />

                  {/* If sales exist against this stock */}
                  {itemData.sales && itemData.sales.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: colors.textSecondary, textTransform: "uppercase" }}>
                        Sales Deducted From This Batch ({itemData.sales.length})
                      </Typography>
                      <TableContainer sx={{ mt: 1 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={{ backgroundColor: colors.surfaceMuted }}>
                              <TableCell sx={{ fontWeight: 600 }}>Bill #</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Buyer</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Sold Qty</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>Sale Amount</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {itemData.sales.map((s) => (
                              <TableRow key={s._id} hover>
                                <TableCell sx={{ fontWeight: 600 }}>#{s.billNumber}</TableCell>
                                <TableCell>{formatDate(s.date)}</TableCell>
                                <TableCell>{s.buyerId?.name || "Customer"}</TableCell>
                                <TableCell>{s.quantity} Qty</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  {formatCurrency(s.totalAmount)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  )}
                </Box>
              )}
            </Paper>

            {/* Payment History Ledger with Dates */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: borderRadius.md,
                backgroundColor: colors.white,
                border: `1px solid ${colors.border}`,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                <Typography sx={{ fontSize: "14px", fontWeight: 700, color: colors.textPrimary, display: "flex", alignItems: "center", gap: 1 }}>
                  <PaymentIcon sx={{ fontSize: "18px", color: colors.primary }} />
                  Payment History & Ledger (with Payment Dates)
                </Typography>
                <Chip
                  label={`${payments.length} Transaction(s)`}
                  size="small"
                  sx={{ fontWeight: 600, fontSize: "11px" }}
                />
              </Box>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: colors.surfaceMuted }}>
                      <TableCell sx={{ fontWeight: 700 }}>Payment Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Payment Method</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3, color: colors.textSecondary }}>
                          No payment transactions recorded for this invoice yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((p) => (
                        <TableRow key={p._id || p.paymentDate} hover>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {formatDate(p.paymentDate)}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: colors.successDark }}>
                            {formatCurrency(p.amount)}
                          </TableCell>
                          <TableCell sx={{ textTransform: "capitalize" }}>
                            <Chip
                              label={p.paymentMethod?.replace("_", " ") || "Cash"}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: "11px" }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: colors.textSecondary, fontSize: "12px" }}>
                            {p.referenceNumber || "—"}
                          </TableCell>
                          <TableCell sx={{ color: colors.textSecondary, fontSize: "12px" }}>
                            {p.notes || "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}
      </DialogContent>

      {/* Footer Actions */}
      <DialogActions
        sx={{
          padding: "16px 24px",
          backgroundColor: colors.white,
          borderTop: `1px solid ${colors.border}`,
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => onOpenReceipt && onOpenReceipt(itemData, isSale ? "sale" : "stock")}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            Print / Share Receipt
          </Button>

          {itemData?.remainingAmount > 0 && onRecordPayment && (
            <Button
              variant="contained"
              color={isSale ? "primary" : "secondary"}
              startIcon={<PaymentIcon />}
              onClick={() => onRecordPayment(itemData, isSale ? "inflow" : "outflow")}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {isSale ? "Collect Payment" : "Pay Supplier"}
            </Button>
          )}
        </Box>

        <Button
          variant="contained"
          color="inherit"
          onClick={onClose}
          sx={{ textTransform: "none", bgcolor: colors.surfaceMuted, color: colors.textPrimary }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransactionDetailsModal;
