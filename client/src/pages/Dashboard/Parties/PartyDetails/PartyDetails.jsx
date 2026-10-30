import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  useMediaQuery,
  Tooltip,
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import CallMadeIcon from "@mui/icons-material/CallMade";
import BoltIcon from "@mui/icons-material/Bolt";
import PaymentIcon from "@mui/icons-material/Payment";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { colors, borderRadius, shadows, SmallMobileView } from "../../../../styles/theme";
import api from "../../../../api/axios";
import TransactionDetailsModal from "../../../../components/TransactionModal/TransactionDetailsModal";
import AutoAllocateModal from "../../../../components/AutoAllocateModal/AutoAllocateModal";
import RecordPaymentModal from "../../../Dashboard/Payments/RecordPaymentModal";
import ReceiptModal from "../../../../components/ReceiptModal/ReceiptModal";
import BuyerPaymentHistoryModal from "../../../../components/PaymentHistoryModal/BuyerPaymentHistoryModal";
import DatePickerField from "../../../../components/DatePickerField/DatePickerField";
import { formatDate } from "../../../../utils/dateFormat";

const StatCard = ({ label, value, color, bg, onClick, clickable, tooltip }) => {
  const content = (
    <Paper
      onClick={onClick}
      sx={{
        padding: "20px 24px",
        borderRadius: borderRadius.lg,
        backgroundColor: bg || colors.surfaceMuted,
        boxShadow: shadows.sm,
        flex: "1 1 160px",
        minWidth: "140px",
        cursor: clickable ? "pointer" : "default",
        transition: "all 0.2s ease-in-out",
        "&:hover": clickable
          ? {
              transform: "translateY(-2px)",
              boxShadow: shadows.md,
              borderColor: color || colors.primary,
            }
          : {},
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
        <Typography
          sx={{ fontSize: "12px", fontWeight: 700, color: colors.textSecondary, textTransform: "uppercase" }}
        >
          {label}
        </Typography>
        {clickable && (
          <Chip
            label="View History"
            size="small"
            sx={{
              fontSize: "10px",
              height: "18px",
              backgroundColor: colors.successLight,
              color: colors.successDark,
              fontWeight: 700,
              cursor: "pointer",
            }}
          />
        )}
      </Box>
      <Typography sx={{ fontSize: "20px", fontWeight: 800, color: color || colors.textPrimary }}>
        Rs. {(value || 0).toLocaleString()}
      </Typography>
    </Paper>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow>
        {content}
      </Tooltip>
    );
  }
  return content;
};

const PartyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const mobileView = useMediaQuery(SmallMobileView);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Payment history search
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentDateFilter, setPaymentDateFilter] = useState("");

  // Modals state
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [transactionType, setTransactionType] = useState("sale");

  const [autoAllocateOpen, setAutoAllocateOpen] = useState(false);

  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [targetPaymentData, setTargetPaymentData] = useState(null);

  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState(null);
  const [receiptModalType, setReceiptModalType] = useState("sale");

  const [paymentHistoryModalOpen, setPaymentHistoryModalOpen] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const { data: res } = await api.get(`/party/${id}/details`);
      setData(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch party details");
      navigate("/parties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) return null;

  const { party, financials, sales = [], stocks = [], payments = [] } = data;
  const isBuyer = party.type?.toLowerCase() === "buyer";
  const isMiller = party.type?.toLowerCase() === "miller";

  const totalOutstanding = isBuyer
    ? Number(financials.totalSalesRemaining || 0)
    : Number(financials.totalPurchasesRemaining || 0);

  // Open transaction detail modal
  const handleOpenTransactionDetails = (tx, type) => {
    setSelectedTransaction(tx);
    setTransactionType(type);
    setTransactionModalOpen(true);
  };

  // Open record payment modal
  const handleOpenRecordPayment = (item, payType) => {
    if (payType === "inflow") {
      setTargetPaymentData({
        type: "inflow",
        partyName: party.name,
        partyId: party._id,
        partyType: "Buyer",
        relatedType: "Sale",
        relatedId: item._id,
        referenceNumber: item.billNumber,
        remainingAmount: item.remainingAmount,
        itemName: item.itemName,
      });
    } else {
      setTargetPaymentData({
        type: "outflow",
        partyName: party.name,
        partyId: party._id,
        partyType: "Miller",
        relatedType: "Stock",
        relatedId: item._id,
        referenceNumber: item.receiptNumber,
        remainingAmount: item.remainingAmount,
        itemName: item.itemName,
      });
    }
    setRecordPaymentOpen(true);
  };

  // Open receipt modal
  const handleOpenReceipt = async (item, type) => {
    let completeData = item;
    try {
      if (type === "sale" && item._id) {
        const res = await api.get(`/sales/${item._id}`);
        completeData = res.data.data;
      } else if (type === "stock" && item._id) {
        const res = await api.get(`/stock/stocks/${item._id}`);
        completeData = res.data.data;
      }
    } catch {
      completeData = item;
    }
    setReceiptModalData(completeData);
    setReceiptModalType(type);
    setReceiptModalOpen(true);
  };

  // Filter payments for history tab
  const filteredPayments = payments.filter((p) => {
    const partyNameMatch =
      p.partyId?.name?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      p.referenceNumber?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      p.notes?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      paymentSearch === "";

    const dateMatch = paymentDateFilter
      ? new Date(p.paymentDate).toLocaleDateString("en-CA") === paymentDateFilter
      : true;

    return partyNameMatch && dateMatch;
  });

  return (
    <Box sx={{ maxWidth: "1200px", margin: "0 auto", pb: 4 }}>
      {/* Header & Back Navigation */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Box>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/parties")}
            sx={{ textTransform: "none", color: colors.textSecondary, mb: 1, pl: 0 }}
          >
            Back to Parties Directory
          </Button>

          <Typography sx={{ fontSize: "28px", fontWeight: 800, color: colors.textPrimary, lineHeight: 1.2 }}>
            {party.name}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mt: 1 }}>
            <Chip
              label={party.type}
              size="small"
              sx={{
                backgroundColor: isBuyer ? colors.infoLight : colors.warningLight,
                color: isBuyer ? colors.infoDark : colors.warningDark,
                fontWeight: 700,
                fontSize: "12px",
              }}
            />
            {party.phone && (
              <Typography variant="body2" sx={{ color: colors.textSecondary, display: "flex", alignItems: "center", gap: 0.5 }}>
                <LocalPhoneIcon fontSize="inherit" /> {party.phone}
              </Typography>
            )}
            {party.address && (
              <Typography variant="body2" sx={{ color: colors.textSecondary, display: "flex", alignItems: "center", gap: 0.5 }}>
                <LocationOnIcon fontSize="inherit" /> {party.address}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Quick Action Buttons */}
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: { xs: 2, sm: 0 } }}>
          {totalOutstanding > 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<BoltIcon />}
              onClick={() => setAutoAllocateOpen(true)}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                backgroundColor: "#2563EB",
                boxShadow: shadows.md,
                "&:hover": { backgroundColor: "#1D4ED8" },
              }}
            >
              Pay Multiple Bills at Once
            </Button>
          )}

          {isMiller && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => navigate("/stocks/add")}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              + Add Stock Purchase
            </Button>
          )}

          {isBuyer && (
            <Button
              variant="outlined"
              color="primary"
              onClick={() => navigate("/createInvoice")}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              + New Sale Invoice
            </Button>
          )}
        </Box>
      </Box>

      {/* Financial Summary Cards */}
      {isBuyer && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "14px", color: colors.textSecondary, textTransform: "uppercase" }}>
              Sales & Receivables Overview
            </Typography>
            {totalOutstanding > 0 && (
              <Chip
                label={`Outstanding: Rs. ${totalOutstanding.toLocaleString()}`}
                size="small"
                sx={{ bgcolor: colors.errorLight, color: colors.errorDark, fontWeight: 700 }}
              />
            )}
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <StatCard label="Total Sales Value" value={financials.totalSales} color={colors.infoDark} bg={colors.infoLight} />
            <StatCard label="Total Profit Generated" value={financials.totalProfit} color={colors.successDark} bg={colors.successLight} />
            <StatCard
              label="Total Cash Collected"
              value={financials.totalSalesCollected}
              color={colors.successDark}
              bg={colors.successLight}
              clickable
              onClick={() => setPaymentHistoryModalOpen(true)}
              tooltip="Click to view complete payment breakdown & bill allocations"
            />
            <StatCard
              label="Remaining Receivables"
              value={financials.totalSalesRemaining}
              color={financials.totalSalesRemaining > 0 ? colors.errorDark : colors.successDark}
              bg={financials.totalSalesRemaining > 0 ? colors.errorLight : colors.successLight}
            />
          </Box>
        </Box>
      )}

      {isMiller && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "14px", color: colors.textSecondary, textTransform: "uppercase" }}>
              Purchases & Payables Overview
            </Typography>
            {totalOutstanding > 0 && (
              <Chip
                label={`Payable: Rs. ${totalOutstanding.toLocaleString()}`}
                size="small"
                sx={{ bgcolor: colors.errorLight, color: colors.errorDark, fontWeight: 700 }}
              />
            )}
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <StatCard label="Total Purchases" value={financials.totalPurchases} color={colors.warningDark} bg={colors.warningLight} />
            <StatCard
              label="Total Paid to Supplier"
              value={financials.totalPurchasesPaid}
              color={colors.successDark}
              bg={colors.successLight}
              clickable
              onClick={() => setPaymentHistoryModalOpen(true)}
              tooltip="Click to view payments and purchase vouchers covered"
            />
            <StatCard
              label="Remaining Payable"
              value={financials.totalPurchasesRemaining}
              color={financials.totalPurchasesRemaining > 0 ? colors.errorDark : colors.successDark}
              bg={financials.totalPurchasesRemaining > 0 ? colors.errorLight : colors.successLight}
            />
          </Box>
        </Box>
      )}

      {/* Tabs Ledger */}
      <Paper sx={{ borderRadius: borderRadius.lg, boxShadow: shadows.sm, border: `1px solid ${colors.border}`, overflow: "hidden" }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: "#FAFAFA" }}
        >
          {isBuyer && <Tab label={`📋 Sales Invoices (${sales.length})`} sx={{ fontWeight: 700, textTransform: "none", fontSize: "14px" }} />}
          {isMiller && <Tab label={`📦 Stock Purchases (${stocks.length})`} sx={{ fontWeight: 700, textTransform: "none", fontSize: "14px" }} />}
          <Tab label={`💳 Payment History (${payments.length})`} sx={{ fontWeight: 700, textTransform: "none", fontSize: "14px" }} />
        </Tabs>

        {/* 1. Sales Tab (for Buyers) */}
        {isBuyer && activeTab === 0 && (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: colors.surfaceMuted }}>
                  <TableCell sx={{ fontWeight: 700 }}>Bill #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Item & Qty</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Stock Source</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Paid</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Remaining</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6, color: colors.textSecondary }}>
                      No sales found for this party. Click "+ New Sale Invoice" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((s) => {
                    const remaining = Number(s.remainingAmount || 0);
                    return (
                      <TableRow
                        key={s._id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => handleOpenTransactionDetails(s, "sale")}
                      >
                        {/* Bill # Clickable */}
                        <TableCell>
                          <Chip
                            icon={<ReceiptLongIcon style={{ fontSize: "15px", color: colors.primary }} />}
                            label={`#${s.billNumber}`}
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTransactionDetails(s, "sale");
                            }}
                            sx={{
                              fontWeight: 700,
                              cursor: "pointer",
                              bgcolor: colors.infoLight,
                              color: colors.primary,
                              "&:hover": { bgcolor: "#BFDBFE" },
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {formatDate(s.date)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {s.itemName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                            Sold: {s.quantity} Katte • {s.weight} kg
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ color: colors.textSecondary, display: "block" }}>
                            Batch: #{s.stockId?.receiptNumber || "Stock"}
                          </Typography>
                          <Typography variant="caption" sx={{ color: colors.textMuted }}>
                            Supplier: {s.stockId?.millerId?.name || "Supplier"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          Rs. {s.totalAmount?.toLocaleString()}
                        </TableCell>
                        <TableCell sx={{ color: colors.successDark, fontWeight: 600 }}>
                          Rs. {s.paidAmount?.toLocaleString()}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: remaining > 0 ? colors.errorDark : colors.successDark,
                            fontWeight: 800,
                          }}
                        >
                          Rs. {remaining?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={s.status}
                            size="small"
                            sx={{
                              backgroundColor:
                                s.status === "paid"
                                  ? colors.successLight
                                  : s.status === "partial"
                                  ? colors.warningLight
                                  : colors.errorLight,
                              color:
                                s.status === "paid"
                                  ? colors.successDark
                                  : s.status === "partial"
                                  ? colors.warningDark
                                  : colors.errorDark,
                              fontWeight: 700,
                              textTransform: "capitalize",
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                            <Tooltip title="View Transaction History">
                              <IconButton
                                size="small"
                                sx={{ color: colors.primary, bgcolor: colors.surfaceMuted }}
                                onClick={() => handleOpenTransactionDetails(s, "sale")}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            {remaining > 0 && (
                              <Tooltip title="Collect Payment">
                                <IconButton
                                  size="small"
                                  sx={{ color: colors.successDark, bgcolor: colors.successLight }}
                                  onClick={() => handleOpenRecordPayment(s, "inflow")}
                                >
                                  <PaymentIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* 2. Stock Purchases Tab (for Millers) */}
        {isMiller && activeTab === 0 && (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: colors.surfaceMuted }}>
                  <TableCell sx={{ fontWeight: 700 }}>Receipt #</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Item & Inventory</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Paid</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Remaining</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stocks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: colors.textSecondary }}>
                      No purchases found for this party. Click "+ Add Stock Purchase" to add one.
                    </TableCell>
                  </TableRow>
                ) : (
                  stocks.map((s) => {
                    const remaining = Number(s.remainingAmount || 0);
                    return (
                      <TableRow
                        key={s._id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => handleOpenTransactionDetails(s, "stock")}
                      >
                        {/* Receipt # Clickable */}
                        <TableCell>
                          <Chip
                            icon={<ReceiptLongIcon style={{ fontSize: "15px", color: colors.successDark }} />}
                            label={`#${s.receiptNumber}`}
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTransactionDetails(s, "stock");
                            }}
                            sx={{
                              fontWeight: 700,
                              cursor: "pointer",
                              bgcolor: colors.successLight,
                              color: colors.successDark,
                              "&:hover": { bgcolor: "#BBF7D0" },
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {formatDate(s.date)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {s.itemName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                            Purchased: {s.totalQuantity} Qty • Remaining: {s.remainingQuantity} Qty
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          Rs. {s.totalAmount?.toLocaleString()}
                        </TableCell>
                        <TableCell sx={{ color: colors.successDark, fontWeight: 600 }}>
                          Rs. {s.paidAmount?.toLocaleString()}
                        </TableCell>
                        <TableCell
                          sx={{
                            color: remaining > 0 ? colors.errorDark : colors.successDark,
                            fontWeight: 800,
                          }}
                        >
                          Rs. {remaining?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={remaining <= 0 ? "Settled" : s.paidAmount > 0 ? "Partial" : "Unpaid"}
                            size="small"
                            sx={{
                              backgroundColor:
                                remaining <= 0
                                  ? colors.successLight
                                  : s.paidAmount > 0
                                  ? colors.warningLight
                                  : colors.errorLight,
                              color:
                                remaining <= 0
                                  ? colors.successDark
                                  : s.paidAmount > 0
                                  ? colors.warningDark
                                  : colors.errorDark,
                              fontWeight: 700,
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                            <Tooltip title="View Transaction History">
                              <IconButton
                                size="small"
                                sx={{ color: colors.primary, bgcolor: colors.surfaceMuted }}
                                onClick={() => handleOpenTransactionDetails(s, "stock")}
                              >
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            {remaining > 0 && (
                              <Tooltip title="Pay Supplier">
                                <IconButton
                                  size="small"
                                  sx={{ color: colors.secondary, bgcolor: colors.surfaceMuted }}
                                  onClick={() => handleOpenRecordPayment(s, "outflow")}
                                >
                                  <PaymentIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* 3. Payments Ledger Tab (with Dates displayed everywhere) */}
        {((isBuyer && activeTab === 1) || (isMiller && activeTab === 1) || (!isBuyer && !isMiller && activeTab === 0)) && (
          <Box>
            {/* Payments Search & Date Filter */}
            <Box sx={{ p: 2, display: "flex", gap: 2, flexWrap: "wrap", borderBottom: `1px solid ${colors.border}`, backgroundColor: "#FAFAFA" }}>
              <TextField
                placeholder="Search by reference, notes, method..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                size="small"
                sx={{ minWidth: "220px", flex: 1 }}
                slotProps={{ input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: colors.textSecondary, fontSize: "18px" }} />
                    </InputAdornment>
                  ),
                }}}
              />
              <DatePickerField
                label="Filter by Payment Date"
                value={paymentDateFilter ? dayjs(paymentDateFilter) : null}
                onChange={(date) => setPaymentDateFilter(date?.isValid() ? date.format("YYYY-MM-DD") : "")}
                sx={{ minWidth: "190px" }}
                slotProps={{ textField: { size: "small" } }}
              />
              {(paymentSearch || paymentDateFilter) && (
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  onClick={() => { setPaymentSearch(""); setPaymentDateFilter(""); }}
                  sx={{ textTransform: "none" }}
                >
                  Clear Filters
                </Button>
              )}
            </Box>

            <TableContainer sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: colors.surfaceMuted }}>
                    <TableCell sx={{ fontWeight: 700 }}>Payment Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reference / Bill #</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Receipt</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: colors.textSecondary }}>
                        {paymentSearch || paymentDateFilter ? "No payments match the search/date filter." : "No payment records found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((p) => {
                      const isInflow = p.type === "inflow";
                      return (
                        <TableRow key={p._id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {formatDate(p.paymentDate)}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              {isInflow ? (
                                <CallReceivedIcon sx={{ color: colors.successDark, fontSize: "16px" }} />
                              ) : (
                                <CallMadeIcon sx={{ color: colors.textPrimary, fontSize: "16px" }} />
                              )}
                              <Chip
                                label={isInflow ? "Received" : "Paid"}
                                size="small"
                                sx={{
                                  backgroundColor: isInflow ? colors.successLight : colors.surfaceMuted,
                                  color: isInflow ? colors.successDark : colors.textPrimary,
                                  fontWeight: 700,
                                  fontSize: "11px",
                                }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            {p.referenceNumber ? (
                              <Chip
                                label={p.referenceNumber}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 600, fontSize: "11px" }}
                              />
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: isInflow ? colors.successDark : colors.textPrimary }}>
                            Rs. {p.amount?.toLocaleString()}
                          </TableCell>
                          <TableCell sx={{ textTransform: "capitalize" }}>
                            {p.paymentMethod?.replace("_", " ") || "Cash"}
                          </TableCell>
                          <TableCell sx={{ color: colors.textSecondary, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.notes || "—"}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View & Print Payment Voucher">
                              <IconButton
                                size="small"
                                sx={{ color: colors.primary, bgcolor: colors.surfaceMuted }}
                                onClick={() => handleOpenReceipt(p, "payment")}
                              >
                                <ReceiptLongIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* 1. Transaction Details Modal */}
      <TransactionDetailsModal
        open={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        initialData={selectedTransaction}
        transactionId={selectedTransaction?._id}
        type={transactionType}
        onRecordPayment={(tx, pType) => {
          setTransactionModalOpen(false);
          handleOpenRecordPayment(tx, pType);
        }}
        onOpenReceipt={(tx, rType) => {
          handleOpenReceipt(tx, rType);
        }}
      />

      {/* 2. Pay Multiple Bills at Once modal */}
      <AutoAllocateModal
        open={autoAllocateOpen}
        onClose={() => setAutoAllocateOpen(false)}
        party={party}
        onSuccess={() => {
          fetchDetails();
        }}
      />

      {/* 3. Record Payment Modal for single invoices */}
      <RecordPaymentModal
        open={recordPaymentOpen}
        onClose={() => setRecordPaymentOpen(false)}
        targetData={targetPaymentData}
        onSuccess={() => {
          fetchDetails();
        }}
      />

      {/* 4. Receipt Modal */}
      <ReceiptModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        data={receiptModalData}
        type={receiptModalType}
      />

      {/* Payment and grouped bill history for buyers and suppliers */}
      <BuyerPaymentHistoryModal
        open={paymentHistoryModalOpen}
        onClose={() => setPaymentHistoryModalOpen(false)}
        party={party}
        sales={sales}
        payments={payments}
        financials={financials}
        onOpenReceipt={(tx, rType) => {
          handleOpenReceipt(tx, rType);
        }}
      />
    </Box>
  );
};

export default PartyDetails;
