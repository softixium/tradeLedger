import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import DownloadIcon from "@mui/icons-material/Download";
import DatePickerField from "../../../components/DatePickerField/DatePickerField";
import api from "../../../api/axios";
import { colors } from "../../../styles/theme";
import { formatDate, formatDateTime } from "../../../utils/dateFormat";

const initialEndDate = dayjs().startOf("day");
const initialStartDate = initialEndDate.subtract(6, "month");
const money = (value) => `Rs. ${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const displayDate = (value) => formatDate(value);
const partyName = (party) => party?.name || "Unknown party";
const idOf = (value) => String(value?._id || value || "");

const makeSections = (report) => {
  const purchases = report.purchases || [];
  const sales = report.sales || [];
  const payments = report.payments || [];
  const expenses = report.expenses || [];
  const bankTransactions = report.bankTransactions || [];

  const parties = (report.parties || []).map((party) => {
    const partyId = idOf(party);
    const partyPurchases = purchases.filter((row) => idOf(row.millerId) === partyId);
    const partySales = sales.filter((row) => idOf(row.buyerId) === partyId);
    const partyPayments = payments.filter((row) => idOf(row.partyId) === partyId);
    return {
      ...party,
      purchaseTotal: partyPurchases.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0),
      salesTotal: partySales.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0),
      paymentsIn: partyPayments.filter((row) => row.type === "inflow").reduce((sum, row) => sum + Number(row.amount || 0), 0),
      paymentsOut: partyPayments.filter((row) => row.type === "outflow").reduce((sum, row) => sum + Number(row.amount || 0), 0),
    };
  });

  return [
    {
      title: "Stock purchases",
      rows: purchases,
      columns: [
        { label: "Date", width: 24, value: (row) => displayDate(row.date) },
        { label: "Receipt #", width: 28, value: (row) => row.receiptNumber },
        { label: "Supplier", width: 34, value: (row) => partyName(row.millerId) },
        { label: "Item", width: 34, value: (row) => row.itemName },
        { label: "Qty", width: 16, value: (row) => Number(row.totalQuantity || 0).toLocaleString() },
        { label: "Weight (kg)", width: 24, value: (row) => Number(row.totalWeight || 0).toLocaleString() },
        { label: "Total", width: 30, value: (row) => money(row.totalAmount) },
        { label: "Paid", width: 28, value: (row) => money(row.paidAmount) },
        { label: "Outstanding", width: 32, value: (row) => money(row.remainingAmount) },
      ],
    },
    {
      title: "Sales",
      rows: sales,
      columns: [
        { label: "Date", width: 24, value: (row) => displayDate(row.date) },
        { label: "Bill #", width: 28, value: (row) => row.billNumber },
        { label: "Buyer", width: 32, value: (row) => partyName(row.buyerId) },
        { label: "Item", width: 32, value: (row) => row.itemName },
        { label: "Qty", width: 14, value: (row) => Number(row.quantity || 0).toLocaleString() },
        { label: "Weight (kg)", width: 22, value: (row) => Number(row.weight || 0).toLocaleString() },
        { label: "Total", width: 28, value: (row) => money(row.totalAmount) },
        { label: "Profit", width: 26, value: (row) => money(row.profit) },
        { label: "Outstanding", width: 34, value: (row) => money(row.remainingAmount) },
      ],
    },
    {
      title: "Expenses",
      rows: expenses,
      columns: [
        { label: "Date", width: 28, value: (row) => displayDate(row.date) },
        { label: "Description", width: 52, value: (row) => row.title },
        { label: "Category", width: 40, value: (row) => row.category },
        { label: "Amount", width: 34, value: (row) => money(row.amount) },
        { label: "Notes", width: 92, value: (row) => row.notes || "—" },
      ],
    },
    {
      title: "Payments received and made",
      rows: payments,
      columns: [
        { label: "Date", width: 28, value: (row) => displayDate(row.paymentDate) },
        { label: "Flow", width: 24, value: (row) => row.type === "inflow" ? "Received" : "Paid" },
        { label: "Party", width: 42, value: (row) => partyName(row.partyId) },
        { label: "Method", width: 34, value: (row) => row.paymentMethod },
        { label: "Reference", width: 44, value: (row) => row.referenceNumber || "—" },
        { label: "Amount", width: 38, value: (row) => money(row.amount) },
        { label: "Notes", width: 60, value: (row) => row.notes || "—" },
      ],
    },
    {
      title: "Bank and cash account activity",
      rows: bankTransactions,
      columns: [
        { label: "Date", width: 28, value: (row) => displayDate(row.date) },
        { label: "Account", width: 40, value: (row) => row.bankAccountId?.accountName || "—" },
        { label: "Type", width: 38, value: (row) => String(row.type || "").replaceAll("_", " ") },
        { label: "Party / Reference", width: 60, value: (row) => [row.partyName, row.referenceNumber].filter(Boolean).join(" · ") || "—" },
        { label: "Amount", width: 38, value: (row) => money(row.amount) },
        { label: "Balance after", width: 42, value: (row) => money(row.balanceAfter) },
      ],
    },
    {
      title: "Parties with activity in this period",
      rows: parties,
      columns: [
        { label: "Party", width: 46, value: (row) => row.name },
        { label: "Type", width: 28, value: (row) => row.type },
        { label: "Phone", width: 38, value: (row) => row.phone || "—" },
        { label: "Purchases", width: 38, value: (row) => money(row.purchaseTotal) },
        { label: "Sales", width: 38, value: (row) => money(row.salesTotal) },
        { label: "Received", width: 38, value: (row) => money(row.paymentsIn) },
        { label: "Paid", width: 38, value: (row) => money(row.paymentsOut) },
      ],
    },
  ];
};

const ReportSection = ({ section }) => (
  <Paper sx={{ overflow: "hidden", border: `1px solid ${colors.border}`, borderRadius: 2, boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)" }}>
    <Box sx={{ px: 2, py: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
      <Typography sx={{ fontSize: 16, fontWeight: 700, color: colors.textPrimary }}>{section.title}</Typography>
      <Typography variant="body2" sx={{ color: colors.textSecondary }}>{section.rows.length} records</Typography>
    </Box>
    <TableContainer sx={{ maxHeight: 420 }}>
      <Table size="small" stickyHeader sx={{ minWidth: 760 }}>
        <TableHead>
          <TableRow>{section.columns.map((column) => <TableCell key={column.label} sx={{ bgcolor: colors.surfaceMuted, color: colors.textSecondary, fontWeight: 700, whiteSpace: "nowrap" }}>{column.label}</TableCell>)}</TableRow>
        </TableHead>
        <TableBody>
          {section.rows.length === 0 ? (
            <TableRow><TableCell colSpan={section.columns.length} align="center" sx={{ py: 3, color: colors.textSecondary }}>No records in this date range.</TableCell></TableRow>
          ) : section.rows.map((row, index) => (
            <TableRow hover key={row._id || `${section.title}-${index}`}>
              {section.columns.map((column) => <TableCell key={column.label} sx={{ whiteSpace: "nowrap", color: colors.textPrimary }}>{column.value(row) || "—"}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

const drawPdfTable = (pdf, section, currentY) => {
  const left = 12;
  const tableWidth = 273;
  const cols = section.columns;
  const totalWeight = cols.reduce((sum, column) => sum + column.width, 0);
  const widths = cols.map((column) => tableWidth * column.width / totalWeight);
  let y = currentY;

  const drawHeader = () => {
    pdf.setFillColor(37, 99, 235);
    pdf.rect(left, y, tableWidth, 8, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);
    let x = left;
    cols.forEach((column, index) => {
      pdf.text(pdf.splitTextToSize(column.label, widths[index] - 3)[0] || "", x + 1.5, y + 5.3);
      x += widths[index];
    });
    y += 8;
  };

  drawHeader();
  if (!section.rows.length) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text("No records in this date range.", left + 2, y + 6);
    return y + 12;
  }

  section.rows.forEach((row) => {
    const cellLines = cols.map((column, index) => pdf.splitTextToSize(String(column.value(row) || "—"), widths[index] - 4));
    const rowHeight = Math.max(8, ...cellLines.map((lines) => lines.length * 3.6 + 3));
    if (y + rowHeight > 194) {
      pdf.addPage();
      y = 14;
      drawHeader();
    }
    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(left, y, tableWidth, rowHeight, "FD");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(30, 41, 59);
    let x = left;
    cellLines.forEach((lines, index) => {
      pdf.text(lines, x + 1.5, y + 4.8);
      x += widths[index];
    });
    y += rowHeight;
  });
  return y + 9;
};

const Reports = () => {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sections = useMemo(() => report ? makeSections(report) : [], [report]);

  const generateReport = async () => {
    if (!startDate?.isValid() || !endDate?.isValid()) {
      setError("Select a valid start date and end date.");
      return;
    }
    if (startDate.isAfter(endDate, "day")) {
      setError("Start date must be on or before the end date.");
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);
    try {
      const params = {
        startDate: startDate.startOf("day").toISOString(),
        endDate: endDate.endOf("day").toISOString(),
      };
      const { data } = await api.get("/reports/business", { params });
      setReport(data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "The report could not be generated.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    if (!report) return;
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const summary = report.summary;

    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, pageWidth, 34, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(19);
    pdf.text("Business Activity Report", 12, 15);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`${displayDate(report.period.startDate)} to ${displayDate(report.period.endDate)}`, 12, 23);
    pdf.text(`Generated ${formatDateTime(new Date())}`, pageWidth - 12, 23, { align: "right" });

    pdf.setTextColor(30, 41, 59);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Financial overview", 12, 44);
    const overview = [
      ["Purchases", money(summary.totalPurchases)],
      ["Sales", money(summary.totalSales)],
      ["Gross profit", money(summary.grossProfit)],
      ["Expenses", money(summary.totalExpenses)],
      ["Net profit", money(summary.netProfit)],
      ["Payments received", money(summary.paymentsIn)],
      ["Payments made", money(summary.paymentsOut)],
      ["Stock purchased", `${Number(summary.totalPurchasedQuantity || 0).toLocaleString()} units · ${Number(summary.totalPurchasedWeight || 0).toLocaleString()} kg`],
      ["Stock sold", `${Number(summary.totalSoldQuantity || 0).toLocaleString()} units · ${Number(summary.totalSoldWeight || 0).toLocaleString()} kg`],
    ];
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    overview.forEach(([label, value], index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = 12 + column * 91;
      const y = 52 + row * 8;
      pdf.setTextColor(100, 116, 139);
      pdf.text(`${label}:`, x, y);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text(String(value), x + 34, y);
      pdf.setFont("helvetica", "normal");
    });

    let y = 82;
    sections.forEach((section) => {
      if (y > 178) {
        pdf.addPage();
        y = 14;
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(37, 99, 235);
      pdf.text(`${section.title} (${section.rows.length})`, 12, y);
      y = drawPdfTable(pdf, section, y + 4);
    });

    pdf.save(`Business_Report_${startDate.format("YYYY-MM-DD")}_to_${endDate.format("YYYY-MM-DD")}.pdf`);
  };

  const summaryCards = report ? [
    { label: "Purchases", value: money(report.summary.totalPurchases), color: colors.infoDark, bg: colors.infoLight },
    { label: "Sales", value: money(report.summary.totalSales), color: colors.primary, bg: "#EFF6FF" },
    { label: "Gross profit", value: money(report.summary.grossProfit), color: colors.successDark, bg: colors.successLight },
    { label: "Expenses", value: money(report.summary.totalExpenses), color: colors.errorDark, bg: colors.errorLight },
    { label: "Net profit", value: money(report.summary.netProfit), color: report.summary.netProfit < 0 ? colors.errorDark : colors.successDark, bg: report.summary.netProfit < 0 ? colors.errorLight : colors.successLight },
    { label: "Payments received / made", value: `${money(report.summary.paymentsIn)} / ${money(report.summary.paymentsOut)}`, color: colors.textPrimary, bg: colors.surfaceMuted },
  ] : [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box sx={{ display: "flex", alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 27, fontWeight: 700, color: colors.textPrimary, letterSpacing: "-0.4px" }}>Business Reports</Typography>
          <Typography sx={{ color: colors.textSecondary, mt: 0.5 }}>Review purchases, sales, profit, payments, expenses, and party activity for any date range.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<AssessmentIcon />} disabled={!report} onClick={downloadPdf} sx={{ minHeight: 42, px: 2, textTransform: "none", fontWeight: 700 }}>
          <DownloadIcon sx={{ mr: 0.75 }} /> Download PDF
        </Button>
      </Box>

      <Paper sx={{ p: { xs: 1.5, sm: 2 }, border: `1px solid ${colors.border}`, borderRadius: 2, boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)" }}>
        <Grid container spacing={2} sx={{ alignItems: "center" }}>
          <Grid size={{ xs: 12, sm: 5, md: 4 }}>
            <DatePickerField label="Start date" value={startDate} onChange={(value) => { setStartDate(value); setReport(null); }} slotProps={{ textField: { size: "small" } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 5, md: 4 }}>
            <DatePickerField label="End date" value={endDate} onChange={(value) => { setEndDate(value); setReport(null); }} slotProps={{ textField: { size: "small" } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 2, md: 4 }}>
            <Button fullWidth variant="contained" onClick={generateReport} disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AssessmentIcon />} sx={{ minHeight: 40, textTransform: "none", fontWeight: 700 }}>
              {loading ? "Generating..." : "Generate report"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error">{error}</Alert>}

      {!report && !loading && !error && (
        <Paper sx={{ py: 7, px: 2, textAlign: "center", border: `1px solid ${colors.border}`, borderRadius: 2 }}>
          <AssessmentIcon sx={{ fontSize: 42, color: colors.primary, mb: 1 }} />
          <Typography sx={{ fontWeight: 700, color: colors.textPrimary }}>Choose a date range to build your report</Typography>
          <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 0.5 }}>The report includes all business records dated within the selected period.</Typography>
        </Paper>
      )}

      {report && (
        <>
          <Box>
            <Typography sx={{ mb: 1.5, fontWeight: 700, color: colors.textPrimary }}>Report overview · {displayDate(report.period.startDate)} – {displayDate(report.period.endDate)}</Typography>
            <Grid container spacing={2}>
              {summaryCards.map((card) => (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={card.label}>
                  <Paper sx={{ ...metricSx, backgroundColor: card.bg }}>
                    <Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.45 }}>{card.label}</Typography>
                    <Typography variant="h6" sx={{ color: card.color, fontWeight: 750, mt: 0.5 }}>{card.value}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
          {sections.map((section) => <ReportSection key={section.title} section={section} />)}
        </>
      )}
    </Box>
  );
};

const metricSx = {
  p: 2.25,
  minHeight: 104,
  border: `1px solid ${colors.border}`,
  borderRadius: 2,
  boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
};

export default Reports;
