import React, { useEffect, useState } from "react";
import {
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import InventoryIcon from "@mui/icons-material/Inventory";
import AddCardIcon from "@mui/icons-material/AddCard";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PaymentIcon from "@mui/icons-material/Payment";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { toast } from "react-toastify";

import api from "../../api/axios";
import { colors } from "../../styles/theme";
import { dashboardStyles } from "./dashboardStyles";
import RecordPaymentModal from "./Payments/RecordPaymentModal";
import { formatDate } from "../../utils/dateFormat";

const Dashboard = () => {
  const styles = dashboardStyles();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  // Quick Payment Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [targetPayment, setTargetPayment] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/payments/summary");
      setDashboardData(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("user")) {
      navigate("/login");
      return;
    }
    fetchDashboard();
  }, [navigate]);

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

  if (loading && !dashboardData) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  const summary = dashboardData?.summary || {};
  const overdueReceivables = dashboardData?.overdueReceivables || [];
  const overduePayables = dashboardData?.overduePayables || [];
  const upcomingReceivables = dashboardData?.upcomingReceivables || [];
  const upcomingPayables = dashboardData?.upcomingPayables || [];
  const recentPayments = dashboardData?.recentPayments || [];

  return (
    <Grid sx={styles.container}>
      {/* Header & Quick Action Buttons */}
      <Box sx={styles.header}>
        <Box>
          <Typography sx={styles.headerTitle}>Business Dashboard</Typography>
          <Typography sx={styles.headerSubtitle}>
            Overview of your sales, purchases, and cashflow
          </Typography>
        </Box>
      </Box>

      {/* KPI Metric Cards */}
      <Box sx={styles.metricsGrid}>
        {/* Total Sales */}
        <Paper sx={{ ...styles.metricCard, backgroundColor: colors.infoLight }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Typography sx={styles.metricLabel}>Total Sales</Typography>
            <TrendingUpIcon sx={{ color: colors.infoDark }} />
          </Box>
          <Typography sx={{ ...styles.metricValue, color: colors.infoDark }}>
            Rs. {summary.totalSalesAmount?.toLocaleString() || 0}
          </Typography>
        </Paper>
        {/* Gross Profit */}
        <Paper sx={{ ...styles.metricCard, backgroundColor: colors.infoLight }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Typography sx={styles.metricLabel}>Gross Profit</Typography>
            <TrendingUpIcon sx={{ color: colors.infoDark }} />
          </Box>
          <Typography sx={{ ...styles.metricValue, color: colors.infoDark }}>
            Rs. {summary.totalProfit?.toLocaleString() || 0}
          </Typography>
        </Paper>

        <Paper sx={{ ...styles.metricCard, backgroundColor: colors.errorLight }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Typography sx={styles.metricLabel}>Total Expenses</Typography>
            <TrendingDownIcon sx={{ color: colors.errorDark }} />
          </Box>
          <Typography sx={{ ...styles.metricValue, color: colors.errorDark }}>
            Rs. {summary.totalExpenses?.toLocaleString() || 0}
          </Typography>
        </Paper>

        <Paper sx={{ ...styles.metricCard, backgroundColor: colors.successLight }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Typography sx={styles.metricLabel}>Net Profit</Typography>
            <TrendingUpIcon sx={{ color: colors.successDark }} />
          </Box>
          <Typography sx={{ ...styles.metricValue, color: colors.successDark }}>
            Rs. {summary.netProfit?.toLocaleString() || 0}
          </Typography>
        </Paper>

        {/* Total Stock Cost */}
        <Paper sx={{ ...styles.metricCard, backgroundColor: "#F3E8FF" }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Typography sx={styles.metricLabel}>Total Purchases</Typography>
            <InventoryIcon sx={{ color: "#7E22CE" }} />
          </Box>
          <Typography sx={{ ...styles.metricValue, color: "#7E22CE" }}>
            Rs. {summary.totalStockAmount?.toLocaleString() || 0}
          </Typography>
        </Paper>

        {/* Customer Receivables */}
        <Paper sx={{ ...styles.metricCard, backgroundColor: colors.warningLight }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Typography sx={styles.metricLabel}>Receivables</Typography>
            <PointOfSaleIcon sx={{ color: colors.warningDark }} />
          </Box>
          <Typography sx={{ ...styles.metricValue, color: colors.warningDark }}>
            Rs. {summary.totalReceivables?.toLocaleString() || 0}
          </Typography>
        </Paper>

        {/* Supplier Payables */}
        <Paper sx={{ ...styles.metricCard, backgroundColor: colors.errorLight }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Typography sx={styles.metricLabel}>Payables</Typography>
            <TrendingDownIcon sx={{ color: colors.errorDark }} />
          </Box>
          <Typography sx={{ ...styles.metricValue, color: colors.errorDark }}>
            Rs. {summary.totalPayables?.toLocaleString() || 0}
          </Typography>
        </Paper>

        {/* Total Inflow Collected */}
        <Paper sx={{ ...styles.metricCard, backgroundColor: colors.successLight }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Typography sx={styles.metricLabel}>Collected Cash</Typography>
            <PaymentIcon sx={{ color: colors.successDark }} />
          </Box>
          <Typography sx={{ ...styles.metricValue, color: colors.successDark }}>
            Rs. {summary.totalReceived?.toLocaleString() || 0}
          </Typography>
        </Paper>
      </Box>

      {/* Urgent Attention / Overdue Balances Section */}
      {(overdueReceivables.length > 0 || overduePayables.length > 0) && (
        <Paper sx={{ ...styles.cardPanel, border: `1px solid ${colors.errorLight}` }}>

          <Grid container sx={{ marginBottom: "16px", justifyContent: "space-between" }}>
            <Typography sx={{ ...styles.sectionTitle, color: colors.error }}>
              <WarningAmberIcon color="error" /> Overdue Payments
            </Typography>
            <Button
              size="small"
              onClick={() => navigate("/payments")}
              endIcon={<ArrowForwardIcon />}
            >
              View All Overdue
            </Button>
          </Grid>

          <Box sx={{ width: "100%", display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" }, gap: 3 }}>
              {/* Overdue Receivables */}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: colors.warningDark, marginBottom: "12px" }}>
                  Overdue Customer Payments ({overdueReceivables.length})
                </Typography>
                {overdueReceivables.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    No overdue receivables.
                  </Typography>
                ) : (
                  overdueReceivables.slice(0, 3).map((item) => (
                    <Box key={item._id} sx={styles.overdueAlertCard}>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: "14px", color: colors.textPrimary }}>
                          {item.buyer?.name || "Customer"} (Bill #{item.billNumber})
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Due: {formatDate(item.dueDate)} |{" "}
                          <span style={{ color: colors.error, fontWeight: 600 }}>
                            {item.daysOverdue} Days Late
                          </span>
                        </Typography>
                        <Typography sx={{ fontWeight: 700, color: colors.error, fontSize: "15px", mt: 0.5 }}>
                          Rs. {item.remainingAmount?.toLocaleString()}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => handleOpenPayment(item, "inflow")}
                      >
                        Collect
                      </Button>
                    </Box>
                  ))
                )}
              </Box>
              {/* Overdue Payables */}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: colors.errorDark, marginBottom: "12px" }}>
                  Overdue Supplier Dues ({overduePayables.length})
                </Typography>
                {overduePayables.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    No overdue payables.
                  </Typography>
                ) : (
                  overduePayables.slice(0, 3).map((item) => (
                    <Box
                      key={item._id}
                      sx={{ ...styles.overdueAlertCard, borderLeftColor: colors.errorDark }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: "14px", color: colors.textPrimary }}>
                          {item.miller?.name || "Supplier"} (Receipt #{item.receiptNumber})
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Due: {formatDate(item.dueDate)} |{" "}
                          <span style={{ color: colors.errorDark, fontWeight: 600 }}>
                            {item.daysOverdue} Days Late
                          </span>
                        </Typography>
                        <Typography sx={{ fontWeight: 700, color: colors.errorDark, fontSize: "15px", mt: 0.5 }}>
                          Rs. {item.remainingAmount?.toLocaleString()}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="contained"
                        color="error"
                        onClick={() => handleOpenPayment(item, "outflow")}
                      >
                        Pay Now
                      </Button>
                    </Box>
                  ))
                )}
              </Box>
          </Box>
        </Paper>
      )}

      {/* Two Column Layout: Upcoming Dues & Recent Transactions */}
      <Box sx={{ width: "100%", display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" }, gap: 3 }}>
        {/* Upcoming Dues */}
        <Box sx={{ minWidth: 0 }}>
          <Paper sx={styles.cardPanel}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <Typography sx={styles.sectionTitle}>
                Upcoming Due Dates
              </Typography>
            </Box>

            <TableContainer sx={styles.tableContainer}>
              <Table size="small" sx={{ minWidth: { xs: 520, md: "100%" } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Party</TableCell>
                    <TableCell>Due</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    ...upcomingReceivables.map((r) => ({ ...r, role: "Customer", type: "inflow" })),
                    ...upcomingPayables.map((p) => ({ ...p, role: "Supplier", type: "outflow" })),
                  ].length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: colors.textSecondary }}>
                        No upcoming dues in queue.
                      </TableCell>
                    </TableRow>
                  ) : (
                    [
                      ...upcomingReceivables.map((r) => ({ ...r, role: "Customer", type: "inflow" })),
                      ...upcomingPayables.map((p) => ({ ...p, role: "Supplier", type: "outflow" })),
                    ]
                      .slice(0, 5)
                      .map((item) => {
                        const isInflow = item.type === "inflow";
                        const party = isInflow ? item.buyer : item.miller;
                        return (
                          <TableRow key={item._id} hover>
                            <TableCell>
                              <Chip
                                size="small"
                                label={isInflow ? "Receive" : "Pay"}
                                sx={{
                                  backgroundColor: isInflow ? colors.infoLight : colors.errorLight,
                                  color: isInflow ? colors.infoDark : colors.errorDark,
                                  fontWeight: 600,
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <strong>{party?.name || "N/A"}</strong>
                            </TableCell>
                            <TableCell>
                              {formatDate(item.dueDate, "N/A")}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>
                              Rs. {item.remainingAmount?.toLocaleString()}
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleOpenPayment(item, item.type)}
                              >
                                {isInflow ? "Collect" : "Pay"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>

        {/* Recent Payment Transactions */}
        <Box sx={{ minWidth: 0 }}>
          <Paper sx={styles.cardPanel}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <Typography sx={styles.sectionTitle}>
                Recent Transactions
              </Typography>
              <Button
                size="small"
                onClick={() => navigate("/payments")}
              >
                View All
              </Button>
            </Box>

            <TableContainer sx={styles.tableContainer}>
              <Table size="small" sx={{ minWidth: { xs: 440, md: "100%" } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Party</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: colors.textSecondary }}>
                        No recent payments recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentPayments.slice(0, 5).map((p) => {
                      const isInflow = p.type === "inflow";
                      return (
                        <TableRow key={p._id} hover>
                          <TableCell>{formatDate(p.paymentDate)}</TableCell>
                          <TableCell>
                            <strong>{p.partyId?.name || "N/A"}</strong>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={isInflow ? "Received" : "Paid"}
                              sx={{
                                backgroundColor: isInflow ? colors.successLight : colors.surfaceMuted,
                                color: isInflow ? colors.successDark : colors.textSecondary,
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 600,
                              color: isInflow ? colors.successDark : colors.textPrimary,
                            }}
                          >
                            Rs. {p.amount?.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setTargetPayment(null);
        }}
        targetData={targetPayment}
        onSuccess={fetchDashboard}
      />
    </Grid>
  );
};

export default Dashboard;
