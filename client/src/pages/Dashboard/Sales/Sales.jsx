import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  Box,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import api from "../../../api/axios";
import { colors } from "../../../styles/theme";
import DatePickerField from "../../../components/DatePickerField/DatePickerField";
import { formatDate } from "../../../utils/dateFormat";
import RecordPaymentModal from "../Payments/RecordPaymentModal";
import ReceiptModal from "../../../components/ReceiptModal/ReceiptModal";
import TransactionDetailsModal from "../../../components/TransactionModal/TransactionDetailsModal";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import { SalesStyles } from "./salesStyle";

const Sales = () => {
  const styles = SalesStyles();
  const navigate = useNavigate();

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Search state
  const [searchBuyer, setSearchBuyer] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchBill, setSearchBill] = useState("");
  const [searchItem, setSearchItem] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all", "paid", "unpaid", "partial"

  // Record Payment Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [targetPayment, setTargetPayment] = useState(null);

  // Receipt Modal State
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Transaction Details Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  const handleOpenDetails = (sale) => {
    setSelectedSale(sale);
    setDetailModalOpen(true);
  };

  const handleOpenReceipt = async (sale) => {
    try {
      const res = await api.get(`/sales/${sale._id}`);
      setReceiptData(res.data.data);
    } catch {
      setReceiptData(sale);
    }
    setReceiptOpen(true);
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/sales");
      // Sort newest first
      const sorted = (data.data || []).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setSales(sorted);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setOpenDelete(true);
  };

  const deleteSale = async () => {
    try {
      await api.delete(`/sales/${selectedId}`);
      toast.success("Invoice deleted successfully");
      setOpenDelete(false);
      setSelectedId(null);
      fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete invoice");
    }
  };

  const handleCollectPayment = (sale) => {
    setTargetPayment({
      type: "inflow",
      partyName: sale.buyerId?.name || "Customer",
      partyId: sale.buyerId?._id || sale.buyerId,
      partyType: "Buyer",
      relatedType: "Sale",
      relatedId: sale._id,
      referenceNumber: sale.billNumber,
      remainingAmount: sale.remainingAmount,
      itemName: sale.itemName,
    });
    setModalOpen(true);
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // Filter and search logic
  const filteredSales = sales.filter((sale) => {
    const buyerName = sale.buyerId?.name?.toLowerCase() || "";
    const itemName = sale.itemName?.toLowerCase() || "";
    const billNo = String(sale.billNumber || "").toLowerCase();
    const dateStr = sale.date ? new Date(sale.date).toLocaleDateString("en-CA") : "";

    const buyerMatch = searchBuyer === "" || buyerName.includes(searchBuyer.toLowerCase());
    const itemMatch = searchItem === "" || itemName.includes(searchItem.toLowerCase());
    const billMatch = searchBill === "" || billNo.includes(searchBill.toLowerCase());
    const dateMatch = searchDate === "" || dateStr === searchDate;

    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "paid" && sale.status === "paid") ||
      (statusFilter === "unpaid" && sale.status === "unpaid") ||
      (statusFilter === "partial" && sale.status === "partial");

    return buyerMatch && itemMatch && billMatch && dateMatch && statusMatch;
  });

  const hasFilters = searchBuyer || searchDate || searchBill || searchItem || statusFilter !== "all";

  const clearFilters = () => {
    setSearchBuyer("");
    setSearchDate("");
    setSearchBill("");
    setSearchItem("");
    setStatusFilter("all");
  };

  const renderStatus = (status) => {
    if (status === "paid") {
      return <Box sx={styles.paidStatus}>Paid</Box>;
    } else if (status === "partial") {
      return <Box sx={styles.partialStatus}>Partial</Box>;
    } else {
      return <Box sx={styles.unpaidStatus}>Unpaid</Box>;
    }
  };

  const renderDueDate = (sale) => {
    const remaining = Number(sale.remainingAmount || 0);
    if (remaining <= 0) {
      return (
        <Chip
          size="small"
          label="Settled"
          sx={{ backgroundColor: colors.successLight, color: colors.successDark, fontWeight: 700 }}
        />
      );
    }

    const saleDate = new Date(sale.date);
    let dueDate = sale.dueDate ? new Date(sale.dueDate) : null;
    if (!dueDate) {
      const days = Number(sale.dueDays || 0);
      dueDate = new Date(saleDate.getTime() + days * 24 * 60 * 60 * 1000);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = dueDate < today;

    if (isOverdue) {
      const diffMs = today.getTime() - dueDate.getTime();
      const daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      return (
        <Chip
          size="small"
          label={`${daysOverdue}d Late`}
          sx={{ backgroundColor: colors.errorLight, color: colors.errorDark, fontWeight: 700 }}
          icon={<WarningAmberIcon style={{ fontSize: "16px", color: colors.errorDark }} />}
        />
      );
    }

    return (
      <Typography variant="body2" sx={{ fontSize: "13px", fontWeight: 500, color: colors.textSecondary }}>
        {formatDate(dueDate)}
      </Typography>
    );
  };

  return (
    <Box sx={styles.container}>
      <Box sx={styles.header}>
        <Typography sx={styles.headerText}>Invoices</Typography>
        <Button
          sx={styles.createInvoiceButton}
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate("/createInvoice")}
        >
          Add Invoice
        </Button>
      </Box>

      {/* Search & Filter Controls */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end", mb: 1 }}>
        <TextField
          placeholder="Buyer Name"
          value={searchBuyer}
          onChange={(e) => setSearchBuyer(e.target.value)}
          size="small"
          sx={{ minWidth: "150px", flex: "1 1 150px" }}
          slotProps={{ input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: colors.textSecondary, fontSize: "18px" }} />
              </InputAdornment>
            ),
          }}}
        />
        <TextField
          placeholder="Item Name"
          value={searchItem}
          onChange={(e) => setSearchItem(e.target.value)}
          size="small"
          sx={{ minWidth: "150px", flex: "1 1 150px" }}
          slotProps={{ input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: colors.textSecondary, fontSize: "18px" }} />
              </InputAdornment>
            ),
          }}}
        />
        <TextField
          placeholder="Bill #"
          value={searchBill}
          onChange={(e) => setSearchBill(e.target.value)}
          size="small"
          sx={{ minWidth: "120px", flex: "1 1 120px" }}
          slotProps={{ input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: colors.textSecondary, fontSize: "18px" }} />
              </InputAdornment>
            ),
          }}}
        />
        <DatePickerField
          label="Date"
          value={searchDate ? dayjs(searchDate) : null}
          onChange={(date) => setSearchDate(date?.isValid() ? date.format("YYYY-MM-DD") : "")}
          sx={{ minWidth: "150px", flex: "1 1 150px" }}
          slotProps={{ textField: { size: "small" } }}
        />
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(e, val) => { if (val !== null) setStatusFilter(val); }}
          size="small"
        >
          <ToggleButton value="all" sx={{ textTransform: "none", fontSize: "12px", px: 1.5 }}>All</ToggleButton>
          <ToggleButton value="paid" sx={{ textTransform: "none", fontSize: "12px", px: 1.5, color: colors.successDark }}>Paid</ToggleButton>
          <ToggleButton value="partial" sx={{ textTransform: "none", fontSize: "12px", px: 1.5, color: colors.warningDark }}>Partial</ToggleButton>
          <ToggleButton value="unpaid" sx={{ textTransform: "none", fontSize: "12px", px: 1.5, color: colors.errorDark }}>Unpaid</ToggleButton>
        </ToggleButtonGroup>
        {hasFilters && (
          <Button size="small" variant="outlined" color="inherit" onClick={clearFilters} sx={{ textTransform: "none", height: "36px" }}>
            Clear
          </Button>
        )}
      </Box>

      {hasFilters && (
        <Typography variant="caption" sx={{ color: colors.textSecondary, mb: 1 }}>
          Showing {filteredSales.length} of {sales.length} records
        </Typography>
      )}

      <TableContainer component={Paper} sx={{ ...styles.tableContainer, overflowX: "auto" }}>
        <Table sx={{ minWidth: "700px" }}>
          <TableHead>
            <TableRow>
              <TableCell>Bill #</TableCell>
              <TableCell>Date / Due</TableCell>
              <TableCell>Buyer</TableCell>
              <TableCell>Item</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Remaining</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6, color: colors.textSecondary }}>
                  {hasFilters
                    ? "No invoices match the current filters."
                    : "No Invoices Found. Click 'New Invoice' to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((sale) => {
                const date = formatDate(sale.date);
                const remaining = Number(sale.remainingAmount || 0);

                return (
                  <TableRow
                    key={sale._id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => handleOpenDetails(sale)}
                  >
                    <TableCell>
                      <Chip
                        icon={<ReceiptLongIcon style={{ fontSize: "14px", color: colors.primary }} />}
                        label={`#${sale.billNumber}`}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(sale);
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
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{date}</Typography>
                        <Box mt={0.5}>{renderDueDate(sale)}</Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {sale.buyerId ? (
                        <Typography
                          variant="body2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/parties/${sale.buyerId._id || sale.buyerId}`);
                          }}
                          sx={{
                            fontWeight: 600,
                            color: colors.primary,
                            cursor: "pointer",
                            "&:hover": { textDecoration: "underline" },
                          }}
                        >
                          {sale.buyerId?.name}
                        </Typography>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{sale.itemName}</Typography>
                      <Box sx={{ display: "flex", gap: 0.8, alignItems: "center", mt: 0.5, flexWrap: "wrap" }}>
                        <Chip
                          label={`Sold: ${sale.quantity} Katte`}
                          size="small"
                          sx={{
                            backgroundColor: colors.infoLight,
                            color: colors.infoDark,
                            fontWeight: 700,
                            fontSize: "11px",
                            height: "22px",
                          }}
                        />
                        <Typography variant="caption" color="textSecondary">
                          {sale.weight} kg @ Rs.{sale.rate}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      Rs. {sale.totalAmount?.toLocaleString()}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: remaining > 0 ? colors.error : colors.success,
                      }}
                    >
                      Rs. {remaining?.toLocaleString()}
                    </TableCell>
                    <TableCell>{renderStatus(sale.status)}</TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.8 }}>
                        <Tooltip title="View Invoice & Traceability Details">
                          <IconButton
                            size="small"
                            sx={{ color: colors.primary, bgcolor: colors.surfaceMuted }}
                            onClick={() => handleOpenDetails(sale)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Edit invoice item">
                          <IconButton
                            size="small"
                            sx={{ color: colors.primary, bgcolor: colors.infoLight }}
                            onClick={() => navigate(`/sales/edit/${sale._id}`)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {remaining > 0 && (
                          <Tooltip title="Collect Payment">
                            <IconButton
                              size="small"
                              sx={{ color: colors.success, bgcolor: colors.successLight }}
                              onClick={() => handleCollectPayment(sale)}
                            >
                              <PointOfSaleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="View Receipt">
                          <IconButton
                            size="small"
                            sx={{ color: colors.primary, bgcolor: colors.infoLight }}
                            onClick={() => handleOpenReceipt(sale)}
                          >
                            <ReceiptLongIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Invoice">
                          <IconButton
                            size="small"
                            sx={{ color: colors.error, bgcolor: colors.errorLight }}
                            onClick={() => handleDeleteClick(sale._id)}
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

      {/* Delete Confirmation Modal */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle sx={{ fontWeight: 700, color: colors.error }}>Confirm Delete Invoice</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete this invoice? The sold items will be returned to stock, and this action can’t be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDelete(false)} color="inherit">Cancel</Button>
          <Button color="error" variant="contained" onClick={deleteSale} disableElevation>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setTargetPayment(null);
        }}
        targetData={targetPayment}
        onSuccess={fetchSales}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        open={receiptOpen}
        onClose={() => {
          setReceiptOpen(false);
          setReceiptData(null);
        }}
        data={receiptData}
        type="sale"
      />

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedSale(null);
        }}
        initialData={selectedSale}
        transactionId={selectedSale?._id}
        type="sale"
        onRecordPayment={(sl) => {
          setDetailModalOpen(false);
          handleCollectPayment(sl);
        }}
        onOpenReceipt={(sl) => {
          setReceiptData(sl);
          setReceiptOpen(true);
        }}
      />
    </Box>
  );
};

export default Sales;
