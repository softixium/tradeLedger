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
import EditIcon from "@mui/icons-material/Edit";
import MovieEditIcon from "@mui/icons-material/MovieEdit";
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AddIcon from "@mui/icons-material/Add";
import PaymentIcon from "@mui/icons-material/Payment";
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
import { stockStyles } from "./stockStyles";

const Stock = () => {
  const styles = stockStyles();
  const navigate = useNavigate();

  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Search state
  const [searchMiller, setSearchMiller] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchReceipt, setSearchReceipt] = useState("");
  const [searchItem, setSearchItem] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // "all", "inStock", "outOfStock"

  // Record Payment Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [targetPayment, setTargetPayment] = useState(null);

  // Receipt Modal State
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Transaction Details Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  const handleOpenDetails = (stock) => {
    setSelectedStock(stock);
    setDetailModalOpen(true);
  };

  const handleOpenReceipt = async (stock) => {
    try {
      const res = await api.get(`/stock/stocks/${stock._id}`);
      setReceiptData(res.data.data);
    } catch {
      setReceiptData(stock);
    }
    setReceiptOpen(true);
  };

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/stock/stocks");
      let sales = [];
      let salesLoaded = false;
      try {
        const salesResponse = await api.get("/sales");
        sales = salesResponse.data.data || [];
        salesLoaded = true;
      } catch {
        // Keep the stock API response if the sales list is temporarily unavailable.
      }
      const soldByStock = sales.reduce((totals, sale) => {
        const stockId = sale.stockId?._id || sale.stockId;
        if (!stockId) return totals;
        const total = totals.get(String(stockId)) || { quantity: 0, weight: 0 };
        total.quantity += Number(sale.quantity || 0);
        total.weight += Number(sale.weight || 0);
        totals.set(String(stockId), total);
        return totals;
      }, new Map());
      const reconciledStocks = (data.data || []).map((stock) => {
        const sold = soldByStock.get(String(stock._id)) || { quantity: 0, weight: 0 };
        if (!salesLoaded) return stock;
        return {
          ...stock,
          remainingQuantity: Math.max(0, Number(stock.totalQuantity || 0) - sold.quantity),
          remainingWeight: Math.max(0, Number(stock.totalWeight || 0) - sold.weight),
        };
      });
      // Sort newest first
      const sorted = reconciledStocks.sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setStocks(sorted);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch stocks");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setOpenDelete(true);
  };

  const deleteStock = async () => {
    try {
      await api.delete(`/stock/stocks/${selectedId}`);
      toast.success("Stock deleted successfully");
      setOpenDelete(false);
      setSelectedId(null);
      fetchStocks();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete stock");
    }
  };

  const handlePaySupplier = (stock) => {
    setTargetPayment({
      type: "outflow",
      partyName: stock.millerId?.name || "Supplier",
      partyId: stock.millerId?._id || stock.millerId,
      partyType: "Miller",
      relatedType: "Stock",
      relatedId: stock._id,
      referenceNumber: stock.receiptNumber,
      remainingAmount: stock.remainingAmount,
      itemName: stock.itemName,
    });
    setModalOpen(true);
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  // Filter and search logic
  const filteredStocks = stocks.filter((stock) => {
    const millerName = stock.millerId?.name?.toLowerCase() || "";
    const itemName = stock.itemName?.toLowerCase() || "";
    const receiptNo = String(stock.receiptNumber || "").toLowerCase();
    const dateStr = stock.date ? new Date(stock.date).toLocaleDateString("en-CA") : "";

    const millerMatch = searchMiller === "" || millerName.includes(searchMiller.toLowerCase());
    const itemMatch = searchItem === "" || itemName.includes(searchItem.toLowerCase());
    const receiptMatch = searchReceipt === "" || receiptNo.includes(searchReceipt.toLowerCase());
    const dateMatch = searchDate === "" || dateStr === searchDate;

    const inStock = stock.remainingQuantity > 0;
    const stockStatusMatch =
      stockFilter === "all" ||
      (stockFilter === "inStock" && inStock) ||
      (stockFilter === "outOfStock" && !inStock);

    return millerMatch && itemMatch && receiptMatch && dateMatch && stockStatusMatch;
  });

  const hasFilters = searchMiller || searchDate || searchReceipt || searchItem || stockFilter !== "all";

  const clearFilters = () => {
    setSearchMiller("");
    setSearchDate("");
    setSearchReceipt("");
    setSearchItem("");
    setStockFilter("all");
  };

  const renderDueDate = (stock) => {
    const remaining = Number(stock.remainingAmount || 0);
    if (remaining <= 0) {
      return (
        <Chip
          size="small"
          label="Settled"
          sx={{ backgroundColor: colors.successLight, color: colors.successDark, fontWeight: 700 }}
        />
      );
    }

    const stockDate = new Date(stock.date);
    let dueDate = stock.dueDate ? new Date(stock.dueDate) : null;
    if (!dueDate) {
      const days = Number(stock.dueDays || 0);
      dueDate = new Date(stockDate.getTime() + days * 24 * 60 * 60 * 1000);
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
      <Box sx={styles.headingContainer}>
        <Typography sx={styles.heading}>Stock Purchases</Typography>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AddIcon />}
          onClick={() => navigate("/stocks/add")}
        >
          Add New Stock
        </Button>
      </Box>

      {/* Search & Filter Controls */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-end", mb: 1 }}>
        <TextField
          placeholder="Miller / Supplier"
          value={searchMiller}
          onChange={(e) => setSearchMiller(e.target.value)}
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
          placeholder="Receipt #"
          value={searchReceipt}
          onChange={(e) => setSearchReceipt(e.target.value)}
          size="small"
          sx={{ minWidth: "130px", flex: "1 1 130px" }}
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
          value={stockFilter}
          exclusive
          onChange={(e, val) => { if (val !== null) setStockFilter(val); }}
          size="small"
        >
          <ToggleButton value="all" sx={{ textTransform: "none", fontSize: "12px", px: 1.5 }}>All</ToggleButton>
          <ToggleButton value="inStock" sx={{ textTransform: "none", fontSize: "12px", px: 1.5, color: colors.successDark }}>In Stock</ToggleButton>
          <ToggleButton value="outOfStock" sx={{ textTransform: "none", fontSize: "12px", px: 1.5, color: colors.errorDark }}>Out of Stock</ToggleButton>
        </ToggleButtonGroup>
        {hasFilters && (
          <Button size="small" variant="outlined" color="inherit" onClick={clearFilters} sx={{ textTransform: "none", height: "36px" }}>
            Clear
          </Button>
        )}
      </Box>

      {hasFilters && (
        <Typography variant="caption" sx={{ color: colors.textSecondary, mb: 1 }}>
          Showing {filteredStocks.length} of {stocks.length} records
        </Typography>
      )}

      <TableContainer component={Paper} sx={{ ...styles.tableContainer, overflowX: "auto" }}>
        <Table sx={{ minWidth: "700px" }}>
          <TableHead>
            <TableRow>
              <TableCell>Receipt #</TableCell>
              <TableCell>Date / Due</TableCell>
              <TableCell>Miller / Supplier</TableCell>
              <TableCell>Item & Qty</TableCell>
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
            ) : filteredStocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6, color: colors.textSecondary }}>
                  {hasFilters
                    ? "No stock records match the current filters."
                    : "No Stock Found. Click 'Add New Stock' to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredStocks.map((stock) => {
                const date = formatDate(stock.date);
                const remaining = Number(stock.remainingAmount || 0);

                return (
                  <TableRow
                    key={stock._id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => handleOpenDetails(stock)}
                  >
                    <TableCell>
                      <Chip
                        icon={<ReceiptLongIcon style={{ fontSize: "14px", color: colors.primary }} />}
                        label={`#${stock.receiptNumber}`}
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(stock);
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
                        <Box mt={0.5}>{renderDueDate(stock)}</Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {stock.millerId ? (
                        <Typography
                          variant="body2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/parties/${stock.millerId._id || stock.millerId}`);
                          }}
                          sx={{
                            fontWeight: 600,
                            color: colors.primary,
                            cursor: "pointer",
                            "&:hover": { textDecoration: "underline" },
                          }}
                        >
                          {stock.millerId?.name}
                        </Typography>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>{stock.itemName}</Typography>
                      <Box sx={{ display: "flex", gap: 0.8, alignItems: "center", mt: 0.5, flexWrap: "wrap" }}>
                        <Chip
                          label={`Purchased: ${stock.totalQuantity} Qty`}
                          size="small"
                          sx={{
                            backgroundColor: colors.surfaceMuted,
                            color: colors.textPrimary,
                            fontWeight: 600,
                            fontSize: "11px",
                            height: "22px",
                            border: `1px solid ${colors.border}`,
                          }}
                        />
                        <Chip
                          label={`Remaining: ${stock.remainingQuantity} Qty`}
                          size="small"
                          sx={{
                            backgroundColor: stock.remainingQuantity > 0 ? colors.successLight : colors.errorLight,
                            color: stock.remainingQuantity > 0 ? colors.successDark : colors.errorDark,
                            fontWeight: 700,
                            fontSize: "11px",
                            height: "22px",
                          }}
                        />
                      </Box>
                      <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 0.3 }}>
                        {stock.weightPerKatta} kg/katta • Total: {stock.totalWeight} kg
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      Rs. {stock.totalAmount?.toLocaleString()}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color: remaining > 0 ? colors.error : colors.success,
                      }}
                    >
                      {remaining === 0 ? "-" : `Rs. ${remaining.toLocaleString()}`}
                        </TableCell>
                    <TableCell>
                      {stock.remainingQuantity > 0 ? (
                        <Box sx={styles.inStock}>In Stock</Box>
                      ) : (
                        <Box sx={styles.outOfStock}>Out of Stock</Box>
                      )}
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.8 }}>
                        <Tooltip title="View Transaction & Stock Movement Details">
                          <IconButton
                            size="small"
                            sx={{ color: colors.primary, bgcolor: colors.surfaceMuted }}
                            onClick={() => handleOpenDetails(stock)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {remaining > 0 && (
                          <Tooltip title="Pay Supplier">
                            <IconButton
                              size="small"
                              sx={{ color: colors.secondary, bgcolor: colors.surfaceMuted }}
                              onClick={() => handlePaySupplier(stock)}
                            >
                              <PaymentIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="View Receipt">
                          <IconButton
                            size="small"
                            sx={{ color: colors.primary, bgcolor: colors.infoLight }}
                            onClick={() => handleOpenReceipt(stock)}
                          >
                            <ReceiptLongIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Stock (Metadata)">
                          <IconButton
                            size="small"
                            sx={{ color: colors.textSecondary }}
                            onClick={() => navigate(`/stocks/edit/${stock._id}`)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete Stock">
                          <IconButton
                            size="small"
                            sx={{ color: colors.error, bgcolor: colors.errorLight }}
                            onClick={() => handleDeleteClick(stock._id)}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle sx={{ fontWeight: 700, color: colors.error }}>Confirm Delete Purchase</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete this stock purchase? It can’t be restored. Any sales or payments linked to it may prevent deletion.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDelete(false)} color="inherit">Cancel</Button>
          <Button color="error" variant="contained" onClick={deleteStock} disableElevation>
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
        onSuccess={fetchStocks}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        open={receiptOpen}
        onClose={() => {
          setReceiptOpen(false);
          setReceiptData(null);
        }}
        data={receiptData}
        type="stock"
      />

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedStock(null);
        }}
        initialData={selectedStock}
        transactionId={selectedStock?._id}
        type="stock"
        onRecordPayment={(stk) => {
          setDetailModalOpen(false);
          handlePaySupplier(stk);
        }}
        onOpenReceipt={(stk) => {
          setReceiptData(stk);
          setReceiptOpen(true);
        }}
      />
    </Box>
  );
};

export default Stock;
