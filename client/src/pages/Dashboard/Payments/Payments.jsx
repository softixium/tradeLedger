import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import {
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import AddCardIcon from "@mui/icons-material/AddCard";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CallMadeIcon from "@mui/icons-material/CallMade";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PaymentIcon from "@mui/icons-material/Payment";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import SearchIcon from "@mui/icons-material/Search";
import BoltIcon from "@mui/icons-material/Bolt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import api from "../../../api/axios";
import { colors } from "../../../styles/theme";
import { paymentsStyles } from "./paymentsStyle";
import RecordPaymentModal from "./RecordPaymentModal";
import ReceiptModal from "../../../components/ReceiptModal/ReceiptModal";
import TransactionDetailsModal from "../../../components/TransactionModal/TransactionDetailsModal";
import AutoAllocateModal from "../../../components/AutoAllocateModal/AutoAllocateModal";
import DatePickerField from "../../../components/DatePickerField/DatePickerField";
import { formatDate } from "../../../utils/dateFormat";

const Payments = () => {
  const navigate = useNavigate();
  const styles = paymentsStyles();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [paymentsList, setPaymentsList] = useState([]);

  // History search state
  const [historySearch, setHistorySearch] = useState("");
  const [historyDateFilter, setHistoryDateFilter] = useState("");

  // Record Payment Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [targetPayment, setTargetPayment] = useState(null);

  // Delete Payment Modal State
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  // Receipt Modal State
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [receiptType, setReceiptType] = useState("payment");

  // Transaction Details Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [selectedTxType, setSelectedTxType] = useState("sale");

  // Auto Allocate Modal State
  const [autoAllocateOpen, setAutoAllocateOpen] = useState(false);
  const [selectedPartyForAllocate, setSelectedPartyForAllocate] = useState(null);
  const [partyPickerOpen, setPartyPickerOpen] = useState(false);

  const handleOpenTransactionDetails = (tx, type) => {
    setSelectedTx(tx);
    setSelectedTxType(type);
    setDetailModalOpen(true);
  };

  const handleStartAutoAllocate = (partyObj) => {
    if (partyObj) {
      setSelectedPartyForAllocate(partyObj);
      setAutoAllocateOpen(true);
    } else {
      setPartyPickerOpen(true);
    }
  };

  const fetchDashboardAndHistory = async () => {
    try {
      setLoading(true);
      const [summaryRes, paymentsRes] = await Promise.all([
        api.get("/payments/summary"),
        api.get("/payments"),
      ]);
      setSummaryData(summaryRes.data.data);
      setPaymentsList(paymentsRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load payment data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardAndHistory();
  }, []);

  const handleOpenPayment = (item, type) => {
    if (type === "inflow") {
      setTargetPayment({
        type: "inflow",
        partyName: item.buyer?.name || "Customer",
        partyId: item.buyer?._id || item.buyer,
        partyType: "Buyer",
        relatedType: "Sale",
        relatedId: item._id,
        referenceNumber: item.billNumber,
        remainingAmount: item.remainingAmount,
        itemName: item.itemName,
      });
    } else {
      setTargetPayment({
        type: "outflow",
        partyName: item.miller?.name || "Supplier",
        partyId: item.miller?._id || item.miller,
        partyType: "Miller",
        relatedType: "Stock",
        relatedId: item._id,
        referenceNumber: item.receiptNumber,
        remainingAmount: item.remainingAmount,
        itemName: item.itemName,
      });
    }
    setModalOpen(true);
  };

  const handleDeleteClick = (payment) => {
    setPaymentToDelete(payment);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!paymentToDelete) return;
    try {
      await api.delete(`/payments/${paymentToDelete._id}`);
      toast.success("Payment deleted and balance rolled back successfully");
      setDeleteOpen(false);
      setPaymentToDelete(null);
      fetchDashboardAndHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete payment");
    }
  };

  const renderDueDateBadge = (dueDate, isOverdue, daysOverdue) => {
    if (!dueDate) return <Chip size="small" label="No Due Date" sx={styles.onTrackChip} />;
    const formattedDate = formatDate(dueDate);

    if (isOverdue) {
      return (
        <Tooltip title={`Due date was ${formattedDate}`}>
          <Chip
            size="small"
            label={`${daysOverdue}d Overdue`}
            sx={styles.overdueChip}
            icon={<WarningAmberIcon style={{ fontSize: "16px", color: colors.errorDark }} />}
          />
        </Tooltip>
      );
    }

    return (
      <Tooltip title={`Due on ${formattedDate}`}>
        <Typography variant="body2" sx={{ fontSize: "13px", fontWeight: 500, color: colors.textSecondary }}>
          {formattedDate}
        </Typography>
      </Tooltip>
    );
  };

  const summary = summaryData?.summary || {};
  const overdueReceivables = summaryData?.overdueReceivables || [];
  const overduePayables = summaryData?.overduePayables || [];
  const upcomingReceivables = summaryData?.upcomingReceivables || [];
  const upcomingPayables = summaryData?.upcomingPayables || [];

  const allReceivables = [...overdueReceivables, ...upcomingReceivables];
  const allPayables = [...overduePayables, ...upcomingPayables];
  const allOverdue = [
    ...overdueReceivables.map((r) => ({ ...r, category: "Receivable" })),
    ...overduePayables.map((p) => ({ ...p, category: "Payable" })),
  ].sort((a, b) => b.daysOverdue - a.daysOverdue);

  return (
    <Box sx={styles.container}>
      {/* Header */}
      <Box sx={styles.header}>
        <Box>
          <Typography sx={styles.headerText}>Payments Center</Typography>
          <Typography variant="body2" color="textSecondary">Track receivables, payables, and transaction history</Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddCardIcon />}
          onClick={() => {
            if (allReceivables.length > 0) {
              handleOpenPayment(allReceivables[0], "inflow");
            } else if (allPayables.length > 0) {
              handleOpenPayment(allPayables[0], "outflow");
            } else {
              toast.info("No outstanding receivables or payables found.");
            }
          }}
        >
          Quick Payment
        </Button>
      </Box>

      {/* KPI Cards */}
      <Box sx={styles.kpiGrid}>
        {/* Total Receivables */}
        <Paper sx={{ ...styles.kpiCard, backgroundColor: colors.infoLight }}>
          <Typography sx={styles.kpiTitle}>Customer Receivables</Typography>
          <Typography sx={{ ...styles.kpiValue, color: colors.infoDark }}>
            Rs. {summary.totalReceivables?.toLocaleString() || 0}
          </Typography>
          <Typography sx={{ ...styles.kpiSubtext, color: summary.overdueReceivablesCount > 0 ? colors.error : colors.infoDark }}>
            {summary.overdueReceivablesCount > 0 
              ? `🚨 ${summary.overdueReceivablesCount} Overdue (Rs. ${summary.overdueReceivablesAmount?.toLocaleString()})`
              : "✅ All payments on track"}
          </Typography>
        </Paper>

        {/* Total Payables */}
        <Paper sx={{ ...styles.kpiCard, backgroundColor: colors.warningLight }}>
          <Typography sx={styles.kpiTitle}>Supplier Payables</Typography>
          <Typography sx={{ ...styles.kpiValue, color: colors.warningDark }}>
            Rs. {summary.totalPayables?.toLocaleString() || 0}
          </Typography>
          <Typography sx={{ ...styles.kpiSubtext, color: summary.overduePayablesCount > 0 ? colors.error : colors.warningDark }}>
             {summary.overduePayablesCount > 0 
              ? `🚨 ${summary.overduePayablesCount} Overdue (Rs. ${summary.overduePayablesAmount?.toLocaleString()})`
              : "✅ All payables on track"}
          </Typography>
        </Paper>

        {/* Total Collected Inflow */}
        <Paper sx={{ ...styles.kpiCard, backgroundColor: colors.successLight }}>
          <Typography sx={styles.kpiTitle}>Total Cash Collected</Typography>
          <Typography sx={{ ...styles.kpiValue, color: colors.successDark }}>
            Rs. {summary.totalReceived?.toLocaleString() || 0}
          </Typography>
          <Typography sx={{ ...styles.kpiSubtext, color: colors.successDark, opacity: 0.8 }}>
            From sales & invoices
          </Typography>
        </Paper>

        {/* Total Paid Outflow */}
        <Paper sx={{ ...styles.kpiCard, backgroundColor: colors.surfaceMuted }}>
          <Typography sx={styles.kpiTitle}>Total Cash Paid</Typography>
          <Typography sx={{ ...styles.kpiValue, color: colors.textPrimary }}>
            Rs. {summary.totalPaid?.toLocaleString() || 0}
          </Typography>
          <Typography sx={{ ...styles.kpiSubtext, color: colors.textSecondary }}>
            For stock & purchases
          </Typography>
        </Paper>
      </Box>

      {/* Tabs & Content */}
      <Paper sx={styles.tabsContainer}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{ borderBottom: `1px solid ${colors.border}` }}
        >
          <Tab label={`📥 Customers (${allReceivables.length})`} sx={{ fontWeight: 600, textTransform: "none" }} />
          <Tab label={`📤 Suppliers (${allPayables.length})`} sx={{ fontWeight: 600, textTransform: "none" }} />
          <Tab
            label={`⚠️ Overdue (${allOverdue.length})`}
            sx={{
              fontWeight: 600,
              textTransform: "none",
              color: allOverdue.length > 0 ? colors.error : "inherit",
            }}
          />
          <Tab label={`📜 History (${paymentsList.length})`} sx={{ fontWeight: 600, textTransform: "none" }} />
        </Tabs>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", padding: "60px" }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* TAB 0: Customer Receivables */}
            {activeTab === 0 && (
              <TableContainer sx={styles.tableContainer}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Bill #</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Item & Date</TableCell>
                      <TableCell>Due Status</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell>Remaining</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allReceivables.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 6, color: colors.textSecondary }}>
                          🎉 No outstanding customer receivables!
                        </TableCell>
                      </TableRow>
                    ) : (
                      allReceivables.map((sale) => (
                        <TableRow key={sale._id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>#{sale.billNumber}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{sale.buyer?.name || "N/A"}</Typography>
                            {sale.buyer?.phone && (
                              <Typography variant="caption" color="textSecondary">📞 {sale.buyer.phone}</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{sale.itemName}</Typography>
                            <Typography variant="caption" color="textSecondary">{formatDate(sale.date)}</Typography>
                          </TableCell>
                          <TableCell>
                            {renderDueDateBadge(sale.dueDate, sale.isOverdue, sale.daysOverdue)}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>Rs. {sale.totalAmount?.toLocaleString()}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: colors.error }}>
                            Rs. {sale.remainingAmount?.toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                             <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                              <Tooltip title="Collect Payment">
                                <IconButton
                                  size="small"
                                  sx={{ color: colors.success, bgcolor: colors.successLight }}
                                  onClick={() => handleOpenPayment(sale, "inflow")}
                                >
                                  <PointOfSaleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View Receipt">
                                <IconButton
                                  size="small"
                                  sx={{ color: colors.primary, bgcolor: colors.infoLight }}
                                  onClick={() => {
                                    setReceiptData(sale);
                                    setReceiptType("sale");
                                    setReceiptOpen(true);
                                  }}
                                >
                                  <ReceiptLongIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                             </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* TAB 1: Supplier Payables */}
            {activeTab === 1 && (
              <TableContainer sx={styles.tableContainer}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Receipt #</TableCell>
                      <TableCell>Supplier</TableCell>
                      <TableCell>Item & Date</TableCell>
                      <TableCell>Due Status</TableCell>
                      <TableCell>Total Cost</TableCell>
                      <TableCell>Remaining</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allPayables.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 6, color: colors.textSecondary }}>
                          🎉 No outstanding supplier payables!
                        </TableCell>
                      </TableRow>
                    ) : (
                      allPayables.map((stock) => (
                        <TableRow key={stock._id} hover>
                          <TableCell sx={{ fontWeight: 600 }}>#{stock.receiptNumber}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>{stock.miller?.name || "N/A"}</Typography>
                            {stock.miller?.phone && (
                              <Typography variant="caption" color="textSecondary">📞 {stock.miller.phone}</Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{stock.itemName}</Typography>
                            <Typography variant="caption" color="textSecondary">{formatDate(stock.date)}</Typography>
                          </TableCell>
                          <TableCell>
                            {renderDueDateBadge(stock.dueDate, stock.isOverdue, stock.daysOverdue)}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 500 }}>Rs. {stock.totalAmount?.toLocaleString()}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: colors.warningDark }}>
                            Rs. {stock.remainingAmount?.toLocaleString()}
                          </TableCell>
                          <TableCell align="right">
                             <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                              <Tooltip title="Pay Supplier">
                                <IconButton
                                  size="small"
                                  sx={{ color: colors.secondary, bgcolor: colors.surfaceMuted }}
                                  onClick={() => handleOpenPayment(stock, "outflow")}
                                >
                                  <PaymentIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View Receipt">
                                <IconButton
                                  size="small"
                                  sx={{ color: colors.primary, bgcolor: colors.infoLight }}
                                  onClick={() => {
                                    setReceiptData(stock);
                                    setReceiptType("stock");
                                    setReceiptOpen(true);
                                  }}
                                >
                                  <ReceiptLongIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                             </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* TAB 2: Overdue & Delayed Payments */}
            {activeTab === 2 && (
              <TableContainer sx={styles.tableContainer}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>Ref #</TableCell>
                      <TableCell>Party</TableCell>
                      <TableCell>Item</TableCell>
                      <TableCell>Delay</TableCell>
                      <TableCell>Amount Due</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allOverdue.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 6, color: colors.success }}>
                          ✅ Great news! No overdue or delayed payments.
                        </TableCell>
                      </TableRow>
                    ) : (
                      allOverdue.map((item) => {
                        const isReceivable = item.category === "Receivable";
                        const party = isReceivable ? item.buyer : item.miller;
                        const ref = isReceivable ? item.billNumber : item.receiptNumber;

                        return (
                          <TableRow key={item._id} hover>
                            <TableCell>
                              <Chip
                                size="small"
                                label={isReceivable ? "Receive" : "Pay"}
                                sx={{
                                  backgroundColor: isReceivable ? colors.infoLight : colors.warningLight,
                                  color: isReceivable ? colors.infoDark : colors.warningDark,
                                  fontWeight: 700,
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>#{ref}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>{party?.name || "N/A"}</Typography>
                            </TableCell>
                            <TableCell>{item.itemName}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={`🚨 ${item.daysOverdue} Days Late`}
                                sx={{ backgroundColor: colors.errorLight, color: colors.errorDark, fontWeight: 700 }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, color: colors.error, fontSize: "15px" }}>
                              Rs. {item.remainingAmount?.toLocaleString()}
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                variant="contained"
                                color={isReceivable ? "success" : "secondary"}
                                onClick={() => handleOpenPayment(item, isReceivable ? "inflow" : "outflow")}
                                sx={{ fontWeight: 600, textTransform: "none" }}
                              >
                                {isReceivable ? "Collect" : "Pay"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* TAB 3: Payment History Ledger */}
            {activeTab === 3 && (() => {
              const filteredHistory = paymentsList.filter((p) => {
                const partyName = p.partyId?.name?.toLowerCase() || "";
                const ref = (p.referenceNumber || "").toLowerCase();
                const method = (p.paymentMethod || "").toLowerCase();
                const notes = (p.notes || "").toLowerCase();
                const q = historySearch.toLowerCase();
                const textMatch = q === "" || partyName.includes(q) || ref.includes(q) || method.includes(q) || notes.includes(q);
                const dateMatch = historyDateFilter === "" ||
                  new Date(p.paymentDate).toLocaleDateString("en-CA") === historyDateFilter;
                return textMatch && dateMatch;
              });
              return (
                <Box>
                  {/* Search Bar */}
                  <Box sx={{ p: 2, display: "flex", gap: 2, flexWrap: "wrap", borderBottom: `1px solid ${colors.border}` }}>
                    <TextField
                      placeholder="Search by party, reference, method, notes..."
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      size="small"
                      sx={{ flex: 1, minWidth: "220px" }}
                      slotProps={{ input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: colors.textSecondary, fontSize: "18px" }} />
                          </InputAdornment>
                        ),
                      }}}
                    />
                    <DatePickerField
                      label="Filter by date"
                      value={historyDateFilter ? dayjs(historyDateFilter) : null}
                      onChange={(date) => setHistoryDateFilter(date?.isValid() ? date.format("YYYY-MM-DD") : "")}
                      sx={{ minWidth: "170px" }}
                      slotProps={{ textField: { size: "small" } }}
                    />
                    {(historySearch || historyDateFilter) && (
                      <Button size="small" variant="outlined" color="inherit"
                        onClick={() => { setHistorySearch(""); setHistoryDateFilter(""); }}
                        sx={{ textTransform: "none" }}
                      >
                        Clear
                      </Button>
                    )}
                  </Box>
                  <TableContainer sx={styles.tableContainer}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Party & Ref</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell>Notes</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredHistory.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 6, color: colors.textSecondary }}>
                              {historySearch || historyDateFilter
                                ? "No payments match the search/filter."
                                : "No payment transactions recorded yet."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredHistory.map((p) => {
                            const isInflow = p.type === "inflow";
                            return (
                              <TableRow key={p._id} hover>
                                <TableCell>{formatDate(p.paymentDate)}</TableCell>
                                <TableCell>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    {isInflow ? (
                                      <CallReceivedIcon sx={{ color: colors.successDark, fontSize: "18px" }} />
                                    ) : (
                                      <CallMadeIcon sx={{ color: colors.textPrimary, fontSize: "18px" }} />
                                    )}
                                    <Typography variant="body2" sx={isInflow ? styles.inflowBadge : styles.outflowBadge}>
                                      {isInflow ? "Received" : "Paid"}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600}>{p.partyId?.name || "N/A"}</Typography>
                                  <Typography variant="caption" color="textSecondary">Ref: {p.referenceNumber || "-"}</Typography>
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, color: isInflow ? colors.successDark : colors.textPrimary }}>
                                  Rs. {p.amount?.toLocaleString()}
                                </TableCell>
                                <TableCell sx={{ textTransform: "capitalize" }}>
                                  {p.paymentMethod?.replace("_", " ")}
                                </TableCell>
                                <TableCell sx={{ color: colors.textSecondary, maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {p.notes || "-"}
                                </TableCell>
                                <TableCell align="right">
                                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                                    <Tooltip title="View Receipt">
                                      <IconButton
                                        size="small"
                                        sx={{ color: colors.primary, bgcolor: colors.infoLight }}
                                        onClick={() => {
                                          setReceiptData(p);
                                          setReceiptType("payment");
                                          setReceiptOpen(true);
                                        }}
                                      >
                                        <ReceiptLongIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Revert Transaction">
                                      <IconButton
                                        size="small"
                                        sx={{ color: colors.error, bgcolor: colors.errorLight }}
                                        onClick={() => handleDeleteClick(p)}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              );
            })()}
          </>
        )}
      </Paper>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setTargetPayment(null);
        }}
        targetData={targetPayment}
        onSuccess={fetchDashboardAndHistory}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700, color: colors.error }}>Confirm Delete Payment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete this payment of{" "}
            <strong>Rs. {paymentToDelete?.amount?.toLocaleString()}</strong>? This will restore the
            ? The linked bill or purchase voucher will show this amount as still due.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} color="inherit">Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm} disableElevation>
            Delete Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Receipt Modal */}
      <ReceiptModal
        open={receiptOpen}
        onClose={() => {
          setReceiptOpen(false);
          setReceiptData(null);
        }}
        data={receiptData}
        type={receiptType}
      />
    </Box>
  );
};

export default Payments;
