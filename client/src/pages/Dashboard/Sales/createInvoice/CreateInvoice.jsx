import React, { useEffect, useState } from "react";
import {
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  Paper,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import DatePickerField from "../../../../components/DatePickerField/DatePickerField";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from "@mui/icons-material/Delete";

import api from "../../../../api/axios";
import { createInvoiceStyles } from "./createInvoiceStyle";
import { colors, borderRadius, shadows } from "../../../../styles/theme";

const createEmptySaleItem = () => ({
  id: Date.now() + Math.random(),
  stockId: "",
  quantity: "",
  weight: "",
  rate: "",
  purchaseRate: 0,
  bhardanaRate: "",
});

const CreateInvoice = () => {
  const styles = createInvoiceStyles();
  const navigate = useNavigate();

  const [buyers, setBuyers] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Bill-level common fields
  const [billDate, setBillDate] = useState(dayjs());
  const [buyerId, setBuyerId] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [status, setStatus] = useState("unpaid");
  const [paidAmount, setPaidAmount] = useState("");
  const [dueDays, setDueDays] = useState("");

  // Multiple sale line items
  const [saleItems, setSaleItems] = useState([createEmptySaleItem()]);

  const fetchBuyers = async () => {
    try {
      const { data } = await api.get("/sales/buyers");
      setBuyers(data.data || []);
    } catch (error) {
      toast.error("Failed to load buyers");
    }
  };

  const fetchStocks = async () => {
    try {
      const { data } = await api.get("/stock/stocks");
      let sales = [];
      let salesLoaded = false;
      try {
        const salesResponse = await api.get("/sales");
        sales = salesResponse.data.data || [];
        salesLoaded = true;
      } catch {
        // Fall back to stock API balances if sales history cannot be loaded.
      }
      const soldByStock = sales.reduce((totals, sale) => {
        const stockId = sale.stockId?._id || sale.stockId;
        if (!stockId) return totals;
        totals.set(String(stockId), (totals.get(String(stockId)) || 0) + Number(sale.quantity || 0));
        return totals;
      }, new Map());
      setStocks((data.data || [])
        .map((stock) => ({
          ...stock,
          remainingQuantity: salesLoaded
            ? Math.max(0, Number(stock.totalQuantity || 0) - (soldByStock.get(String(stock._id)) || 0))
            : Number(stock.remainingQuantity || 0),
        }))
        .filter((stock) => stock.remainingQuantity > 0));
    } catch (error) {
      toast.error("Failed to load stocks");
    }
  };

  useEffect(() => {
    fetchBuyers();
    fetchStocks();
  }, []);

  const handleItemChange = (index, field, value) => {
    setSaleItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === "stockId") {
        const stock = stocks.find((s) => s._id === value);
        if (stock) {
          item.purchaseRate = stock.purchaseRate || 0;
          item.weightPerKatta = stock.weightPerKatta || 0;
          if (item.quantity) {
            item.weight = Number(item.quantity) * Number(stock.weightPerKatta || 0);
          }
        }
      }

      if (field === "quantity") {
        const stock = stocks.find((s) => s._id === item.stockId);
        if (stock) {
          item.weight = Number(value || 0) * Number(stock.weightPerKatta || 0);
        }
      }

      updated[index] = item;
      return updated;
    });

    if (errors[`item_${index}_${field}`]) {
      setErrors((prev) => ({ ...prev, [`item_${index}_${field}`]: "" }));
    }
  };

  const handleAddItem = () => {
    setSaleItems((prev) => [...prev, createEmptySaleItem()]);
  };

  const handleRemoveItem = (index) => {
    if (saleItems.length <= 1) {
      toast.warning("An invoice must have at least one line item");
      return;
    }
    setSaleItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations for each line item
  const calculatedItems = saleItems.map((item) => {
    const stock = stocks.find((s) => s._id === item.stockId);
    const qty = Number(item.quantity || 0);
    const weight = Number(item.weight || (stock ? qty * Number(stock.weightPerKatta || 0) : 0));
    const rate = Number(item.rate || 0);
    const purchaseRate = Number(item.purchaseRate || stock?.purchaseRate || 0);
    const bhardanaRate = Number(item.bhardanaRate || 0);
    const grossAmount = weight * rate;
    const bhardana = qty * bhardanaRate;
    const totalAmount = grossAmount + bhardana;
    const profit = (rate - purchaseRate) * weight;

    return {
      ...item,
      stock,
      calcWeight: weight,
      grossAmount,
      bhardana,
      totalAmount,
      profit,
    };
  });

  const totalBillQuantity = calculatedItems.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  const totalBillWeight = calculatedItems.reduce((sum, it) => sum + it.calcWeight, 0);
  const totalBillGross = calculatedItems.reduce((sum, it) => sum + it.grossAmount, 0);
  const totalBillBhardana = calculatedItems.reduce((sum, it) => sum + it.bhardana, 0);
  const totalBillAmount = totalBillGross + totalBillBhardana;
  const totalBillProfit = calculatedItems.reduce((sum, it) => sum + it.profit, 0);

  const remainingAmount =
    status === "paid"
      ? 0
      : status === "partial"
      ? Math.max(0, totalBillAmount - Number(paidAmount || 0))
      : totalBillAmount;

  const validate = () => {
    let temp = {};
    const requestedByStock = saleItems.reduce((totals, item) => {
      if (item.stockId) totals.set(item.stockId, (totals.get(item.stockId) || 0) + Number(item.quantity || 0));
      return totals;
    }, new Map());

    if (!billDate) temp.date = "Date is required";
    if (!buyerId) temp.buyerId = "Select Buyer";

    saleItems.forEach((item, index) => {
      if (!item.stockId) {
        temp[`item_${index}_stockId`] = "Select Stock Item";
      }

      const stock = stocks.find((s) => s._id === item.stockId);

      if (!item.quantity) {
        temp[`item_${index}_quantity`] = "Enter Quantity";
      } else if (Number(item.quantity) <= 0) {
        temp[`item_${index}_quantity`] = "Quantity must be > 0";
      } else if (stock && requestedByStock.get(item.stockId) > Number(stock.remainingQuantity)) {
        temp[`item_${index}_quantity`] = `Combined quantity exceeds stock (${stock.remainingQuantity} available across these lines)`;
      }

      if (!item.rate) {
        temp[`item_${index}_rate`] = "Enter Sale Rate";
      } else if (Number(item.rate) <= 0) {
        temp[`item_${index}_rate`] = "Rate must be > 0";
      }
    });

    if (status === "partial") {
      if (!paidAmount || Number(paidAmount) <= 0) {
        temp.paidAmount = "Enter Paid Amount";
      } else if (Number(paidAmount) >= totalBillAmount) {
        temp.paidAmount = "Must be less than Total Amount";
      }
    }

    if (paymentType === "udhar") {
      if (!dueDays || Number(dueDays) <= 0) {
        temp.dueDays = "Enter valid Due Days";
      }
    }

    setErrors(temp);
    return Object.keys(temp).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.warning("Please fill all required item details");
      return;
    }

    try {
      setLoading(true);

      const payloadItems = calculatedItems.map((it) => ({
        stockId: it.stockId,
        itemName: it.stock?.itemName || "Item",
        quantity: Number(it.quantity),
        weight: it.calcWeight,
        rate: Number(it.rate),
        purchaseRate: Number(it.purchaseRate || it.stock?.purchaseRate || 0),
        bhardanaRate: Number(it.bhardanaRate || 0),
        bhardana: it.bhardana,
        totalAmount: it.totalAmount,
        profit: it.profit,
      }));

      const res = await api.post("/sales", {
        date: billDate.toDate(),
        buyerId,
        paymentType,
        status,
        dueDays: Number(dueDays || 0),
        paidAmount: status === "paid" ? totalBillAmount : Number(paidAmount || 0),
        remainingAmount,
        items: payloadItems,
      });

      toast.success(res.data?.message || "Sale Invoice created successfully!");
      setTimeout(() => navigate("/sales"), 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={styles.container}>
      <Box sx={styles.header}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/sales")}>
            Back
          </Button>
          <Box>
            <Typography sx={styles.heading}>Create Sales Invoice</Typography>
            <Typography variant="body2" color="textSecondary">
              Sell multiple stock items from different purchase batches to a buyer in a single invoice
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={styles.formLayout}>
        {/* Left Side: Form Details */}
        <Box sx={styles.formSection}>
          <Typography sx={styles.sectionTitle}>1. Buyer & Invoice Date</Typography>

          <Box sx={styles.gridRow}>
            <DatePickerField
              value={billDate}
              onChange={(date) => {
                setBillDate(date);
                if (errors.date) setErrors({ ...errors, date: "" });
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.date,
                  helperText: errors.date,
                },
              }}
            />

            <FormControl error={!!errors.buyerId} fullWidth>
              <InputLabel>Select Buyer</InputLabel>
              <Select
                value={buyerId}
                onChange={(e) => {
                  setBuyerId(e.target.value);
                  if (errors.buyerId) setErrors({ ...errors, buyerId: "" });
                }}
                label="Select Buyer"
              >
                {buyers.map((b) => (
                  <MenuItem key={b._id} value={b._id}>
                    {b.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.buyerId && <FormHelperText>{errors.buyerId}</FormHelperText>}
            </FormControl>
          </Box>

          {/* Section 2: Line Items */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1, mb: 1 }}>
            <Typography sx={{ ...styles.sectionTitle, mb: 0, borderBottom: "none", pb: 0 }}>
              2. Items to Sell ({saleItems.length})
            </Typography>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<AddCircleIcon />}
              onClick={handleAddItem}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              + Add Another Item
            </Button>
          </Box>

          {saleItems.map((item, index) => {
            const itemCalc = calculatedItems[index] || {};
            const stock = itemCalc.stock;
            const quantityUsedEarlier = saleItems
              .slice(0, index)
              .filter((previous) => previous.stockId === item.stockId)
              .reduce((sum, previous) => sum + Number(previous.quantity || 0), 0);
            const availableForThisLine = stock
              ? Math.max(0, Number(stock.remainingQuantity || 0) - quantityUsedEarlier)
              : 0;

            return (
              <Paper
                key={item.id}
                sx={{
                  p: 2.5,
                  mb: 2,
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: "#FAFAFA",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                      label={`Item #${index + 1}`}
                      size="small"
                      sx={{
                        backgroundColor: colors.primary,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "11px",
                      }}
                    />
                    {stock && (
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {stock.itemName} (Purchased from: {stock.millerId?.name || "Supplier"})
                      </Typography>
                    )}
                  </Box>

                  {saleItems.length > 1 && (
                    <Tooltip title="Remove this item">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveItem(index)}
                        sx={{ bgcolor: colors.errorLight }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                {/* Stock Selector */}
                <FormControl error={!!errors[`item_${index}_stockId`]} fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Stock Batch to Sell From</InputLabel>
                  <Select
                    value={item.stockId}
                    onChange={(e) => handleItemChange(index, "stockId", e.target.value)}
                    label="Select Stock Batch to Sell From"
                  >
                    {stocks.map((s) => (
                      <MenuItem key={s._id} value={s._id}>
                        <Box sx={styles.stockDetailsContainer}>
                          <Typography sx={styles.stockName}>{s.itemName}</Typography>
                          <Box sx={styles.stockDetails}>
                            <Typography sx={styles.stockDetail}>
                              Available: <strong>{Math.max(0, Number(s.remainingQuantity || 0) - (s._id === item.stockId ? quantityUsedEarlier : 0))} Kattas</strong> ({s._id === item.stockId ? Math.max(0, Number(s.remainingWeight || 0) - calculatedItems.slice(0, index).filter((previous) => previous.stockId === item.stockId).reduce((sum, previous) => sum + Number(previous.calcWeight || 0), 0)) : s.remainingWeight} kg)
                            </Typography>
                            <Typography sx={styles.stockDetail}>• Cost: Rs. {s.purchaseRate}/kg</Typography>
                            <Typography sx={styles.stockDetail}>• Rcpt: #{s.receiptNumber}</Typography>
                            <Typography sx={styles.stockDetail}>• Miller: {s.millerId?.name || "N/A"}</Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                  {errors[`item_${index}_stockId`] && (
                    <FormHelperText>{errors[`item_${index}_stockId`]}</FormHelperText>
                  )}
                </FormControl>

                <Box sx={styles.gridRow}>
                  <TextField
                    label="Quantity to Sell (Kattas)"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                    slotProps={{ htmlInput: { min: 0, max: availableForThisLine }}}
                    error={!!errors[`item_${index}_quantity`]}
                    helperText={errors[`item_${index}_quantity`]}
                    fullWidth
                  />
                  <TextField
                    label="Sale Rate (Rs per kg)"
                    type="number"
                    value={item.rate}
                    onChange={(e) => handleItemChange(index, "rate", e.target.value)}
                    error={!!errors[`item_${index}_rate`]}
                    helperText={errors[`item_${index}_rate`]}
                    fullWidth
                  />
                </Box>

                <Box sx={{ ...styles.gridRow, mt: 2 }}>
                  <TextField
                    label="Calculated Weight (kg)"
                    type="number"
                    value={itemCalc.calcWeight || item.weight}
                    onChange={(e) => handleItemChange(index, "weight", e.target.value)}
                    helperText={stock ? `${stock.weightPerKatta} kg/katta from stock batch` : "Weight (kg)"}
                    fullWidth
                  />
                  <TextField
                    label="Bhardana Rate (Optional Rs/Katta)"
                    type="number"
                    value={item.bhardanaRate}
                    onChange={(e) => handleItemChange(index, "bhardanaRate", e.target.value)}
                    fullWidth
                  />
                </Box>

                {/* Live row subtotal & profit */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mt: 2,
                    p: 1.5,
                    bgcolor: "#EFF6FF",
                    borderRadius: borderRadius.sm,
                    border: "1px dashed #BFDBFE",
                  }}
                >
                  <Typography variant="body2" color="textSecondary">
                    Est. Profit:{" "}
                    <strong style={{ color: itemCalc.profit >= 0 ? colors.successDark : colors.errorDark }}>
                      Rs. {(itemCalc.profit || 0).toLocaleString()}
                    </strong>
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={800} color={colors.primary}>
                    Row Total: Rs. {(itemCalc.totalAmount || 0).toLocaleString()}
                  </Typography>
                </Box>
              </Paper>
            );
          })}

          <Button
            variant="outlined"
            color="primary"
            startIcon={<AddCircleIcon />}
            onClick={handleAddItem}
            sx={{ textTransform: "none", fontWeight: 700, py: 1, mb: 3 }}
            fullWidth
          >
            + Add Another Stock Item to This Invoice
          </Button>

          {/* Section 3: Payment Details */}
          <Typography sx={styles.sectionTitle} mt={1}>
            3. Payment Details
          </Typography>

          <Box sx={styles.gridRow}>
            <FormControl fullWidth>
              <InputLabel>Payment Type</InputLabel>
              <Select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                label="Payment Type"
              >
                <MenuItem value="cash">Cash / Bank Transfer</MenuItem>
                <MenuItem value="udhar">Udhar (Credit)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Payment Status</InputLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                label="Payment Status"
              >
                <MenuItem value="paid">Fully Paid</MenuItem>
                <MenuItem value="partial">Partial Payment</MenuItem>
                <MenuItem value="unpaid">Unpaid</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={styles.gridRow}>
            {paymentType === "udhar" && (
              <TextField
                label="Due In (Days)"
                type="number"
                value={dueDays}
                onChange={(e) => setDueDays(e.target.value)}
                error={!!errors.dueDays}
                helperText={errors.dueDays}
                fullWidth
              />
            )}

            {status === "partial" && (
              <TextField
                label="Paid Amount (Rs)"
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                error={!!errors.paidAmount}
                helperText={errors.paidAmount}
                fullWidth
              />
            )}
          </Box>
        </Box>

        {/* Right Side: Live Combined Invoice Summary */}
        <Box sx={styles.summarySection}>
          <Typography sx={styles.summaryTitle}>
            <ReceiptIcon color="primary" /> Invoice Summary
          </Typography>

          {/* Line items preview */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: colors.textSecondary, textTransform: "uppercase" }}>
              Items on Invoice ({saleItems.length})
            </Typography>
            {calculatedItems.map((it, idx) => (
              <Box
                key={it.id}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                  py: 0.5,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, color: colors.textPrimary }}>
                  {it.stock?.itemName || `Item #${idx + 1}`} ({it.quantity || 0} Katte)
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: colors.primary }}>
                  Rs. {it.totalAmount.toLocaleString()}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box sx={styles.billSummaryDetails}>
            <Box sx={styles.billSummaryDetail}>
              <Typography>Total Items / Kattas</Typography>
              <Typography sx={styles.detailValue}>{totalBillQuantity} Kattas</Typography>
            </Box>
            <Box sx={styles.billSummaryDetail}>
              <Typography>Total Weight</Typography>
              <Typography sx={styles.detailValue}>{totalBillWeight.toLocaleString()} kg</Typography>
            </Box>
            <Box sx={styles.billSummaryDetail}>
              <Typography>Gross Amount</Typography>
              <Typography sx={styles.detailValue}>Rs. {totalBillGross.toLocaleString()}</Typography>
            </Box>
            <Box sx={styles.billSummaryDetail}>
              <Typography>Total Bhardana</Typography>
              <Typography sx={styles.detailValue}>+ Rs. {totalBillBhardana.toLocaleString()}</Typography>
            </Box>

            <Box sx={styles.totalRow}>
              <Typography variant="h6">Total Bill</Typography>
              <Typography variant="h6">Rs. {totalBillAmount.toLocaleString()}</Typography>
            </Box>

            {status === "partial" && (
              <Box sx={{ ...styles.billSummaryDetail, borderBottom: "none", mt: 1 }}>
                <Typography color="error">Paid Amount</Typography>
                <Typography sx={{ ...styles.detailValue, color: "error.main" }}>
                  - Rs. {Number(paidAmount || 0).toLocaleString()}
                </Typography>
              </Box>
            )}

            {(status === "partial" || status === "unpaid") && (
              <Box sx={{ ...styles.totalRow, borderTop: "none", paddingTop: 0, marginTop: 0 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Remaining Balance
                </Typography>
                <Typography variant="subtitle1" fontWeight={700}>
                  Rs. {remainingAmount.toLocaleString()}
                </Typography>
              </Box>
            )}

            <Box sx={styles.profitRow}>
              <Typography variant="body2">Est. Gross Profit</Typography>
              <Typography
                variant="body2"
                fontWeight={700}
                color={totalBillProfit >= 0 ? "success.main" : "error.main"}
              >
                Rs. {totalBillProfit.toLocaleString()}
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            color="primary"
            sx={styles.button}
            onClick={handleSubmit}
            disabled={loading}
            fullWidth
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : `Save & Generate Invoice (${saleItems.length} Items)`}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default CreateInvoice;
