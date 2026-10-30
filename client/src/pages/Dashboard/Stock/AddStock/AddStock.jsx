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
  Divider,
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
import InventoryIcon from "@mui/icons-material/Inventory";

import api from "../../../../api/axios";
import { addStockStyle } from "./addStockStyles";
import { colors, borderRadius, shadows } from "../../../../styles/theme";

const createEmptyItem = () => ({
  id: Date.now() + Math.random(),
  itemName: "",
  totalQuantity: "",
  weightPerKatta: "",
  totalWeight: "",
  purchaseRate: "",
  bhardanaRate: "",
});

const AddStock = () => {
  const styles = addStockStyle();
  const navigate = useNavigate();

  const [millers, setMillers] = useState([]);
  const [millersLoading, setMillersLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Bill-level common settings
  const [billDate, setBillDate] = useState(dayjs());
  const [millerId, setMillerId] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [status, setStatus] = useState("unpaid");
  const [paidAmount, setPaidAmount] = useState("");
  const [dueDays, setDueDays] = useState("");

  // Multi-item list
  const [items, setItems] = useState([createEmptyItem()]);

  const fetchMillers = async () => {
    try {
      setMillersLoading(true);
      const { data } = await api.get("/stock/millers");
      setMillers(data.data || []);
    } catch (error) {
      toast.error("Failed to load millers");
    } finally {
      setMillersLoading(false);
    }
  };

  useEffect(() => {
    fetchMillers();
  }, []);

  // Update item field
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === "totalQuantity" || field === "weightPerKatta") {
        const qty = field === "totalQuantity" ? Number(value || 0) : Number(item.totalQuantity || 0);
        const wpk = field === "weightPerKatta" ? Number(value || 0) : Number(item.weightPerKatta || 0);
        item.totalWeight = qty * wpk || "";
      }

      updated[index] = item;
      return updated;
    });

    if (errors[`item_${index}_${field}`]) {
      setErrors((prev) => ({ ...prev, [`item_${index}_${field}`]: "" }));
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) {
      toast.warning("A purchase bill must have at least one stock item");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations for all items
  const calculatedItems = items.map((it) => {
    const qty = Number(it.totalQuantity || 0);
    const wpk = Number(it.weightPerKatta || 0);
    const weight = Number(it.totalWeight || qty * wpk);
    const rate = Number(it.purchaseRate || 0);
    const bhardanaRate = Number(it.bhardanaRate || 0);
    const grossAmount = weight * rate;
    const bhardana = qty * bhardanaRate;
    const totalAmount = grossAmount + bhardana;

    return {
      ...it,
      calcWeight: weight,
      grossAmount,
      bhardana,
      totalAmount,
    };
  });

  const totalBillQuantity = calculatedItems.reduce((sum, it) => sum + Number(it.totalQuantity || 0), 0);
  const totalBillWeight = calculatedItems.reduce((sum, it) => sum + it.calcWeight, 0);
  const totalBillGross = calculatedItems.reduce((sum, it) => sum + it.grossAmount, 0);
  const totalBillBhardana = calculatedItems.reduce((sum, it) => sum + it.bhardana, 0);
  const totalBillAmount = totalBillGross + totalBillBhardana;

  const remainingAmount =
    status === "paid"
      ? 0
      : status === "partial"
      ? Math.max(0, totalBillAmount - Number(paidAmount || 0))
      : totalBillAmount;

  // Validation
  const validate = () => {
    let temp = {};

    if (!billDate) temp.date = "Purchase date is required";
    if (!millerId) temp.millerId = "Select Miller (Supplier)";

    items.forEach((it, index) => {
      if (!it.itemName?.trim()) temp[`item_${index}_itemName`] = "Item name is required";
      if (!it.totalQuantity || Number(it.totalQuantity) <= 0) {
        temp[`item_${index}_totalQuantity`] = "Quantity must be > 0";
      }
      if (!it.weightPerKatta || Number(it.weightPerKatta) <= 0) {
        temp[`item_${index}_weightPerKatta`] = "Weight must be > 0";
      }
      if (!it.purchaseRate || Number(it.purchaseRate) <= 0) {
        temp[`item_${index}_purchaseRate`] = "Rate must be > 0";
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
        itemName: it.itemName.trim(),
        totalQuantity: Number(it.totalQuantity),
        weightPerKatta: Number(it.weightPerKatta),
        totalWeight: it.calcWeight,
        purchaseRate: Number(it.purchaseRate),
        bhardanaRate: Number(it.bhardanaRate || 0),
        bhardana: it.bhardana,
        totalAmount: it.totalAmount,
        remainingQuantity: Number(it.totalQuantity),
        remainingWeight: it.calcWeight,
      }));

      const res = await api.post("/stock", {
        date: billDate.toDate(),
        millerId,
        paymentType,
        status,
        dueDays: Number(dueDays || 0),
        paidAmount: status === "paid" ? totalBillAmount : Number(paidAmount || 0),
        items: payloadItems,
      });

      toast.success(res.data?.message || "Stock items purchased successfully!");
      setTimeout(() => navigate("/stocks"), 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add stock purchase");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={styles.container}>
      <Box sx={styles.header}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/stocks")}>
            Back
          </Button>
          <Box>
            <Typography sx={styles.heading}>Add Stock Purchase</Typography>
            <Typography variant="body2" color="textSecondary">
              Purchase single or multiple stock items in a single purchase receipt
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={styles.formLayout}>
        {/* Left Side: Supplier & Multiple Items */}
        <Box sx={styles.formSection}>
          <Typography sx={styles.sectionTitle}>1. Supplier & Purchase Date</Typography>

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

            {millersLoading || millers.length === 0 ? (
              <TextField
                label="Select Miller (Supplier)"
                value={millersLoading ? "Loading suppliers…" : "No suppliers found. Add a Miller party first."}
                size="medium"
                fullWidth
                disabled
                error={!!errors.millerId}
                helperText={errors.millerId}
              />
            ) : (
              <FormControl error={!!errors.millerId} fullWidth>
                <InputLabel>Select Miller (Supplier)</InputLabel>
                <Select
                  value={millerId}
                  onChange={(e) => {
                    setMillerId(e.target.value);
                    if (errors.millerId) setErrors({ ...errors, millerId: "" });
                  }}
                  label="Select Miller (Supplier)"
                >
                {millers.map((m) => (
                  <MenuItem key={m._id} value={m._id}>
                    {m.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.millerId && <FormHelperText>{errors.millerId}</FormHelperText>}
              </FormControl>
            )}
          </Box>

          {/* Section 2: Multiple Stock Items */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1, mb: 1 }}>
            <Typography sx={{ ...styles.sectionTitle, mb: 0, borderBottom: "none", pb: 0 }}>
              2. Stock Items ({items.length})
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

          {items.map((item, index) => {
            const itemCalc = calculatedItems[index] || {};

            return (
              <Paper
                key={item.id}
                sx={{
                  p: 2.5,
                  mb: 2,
                  borderRadius: borderRadius.md,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: "#FAFAFA",
                  position: "relative",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                      label={`Item #${index + 1}`}
                      size="small"
                      sx={{
                        backgroundColor: colors.secondary,
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "11px",
                      }}
                    />
                    {item.itemName && (
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {item.itemName}
                      </Typography>
                    )}
                  </Box>

                  {items.length > 1 && (
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

                <TextField
                  label="Item Name / Variety (e.g. Super Basmati Rice)"
                  value={item.itemName}
                  onChange={(e) => handleItemChange(index, "itemName", e.target.value)}
                  error={!!errors[`item_${index}_itemName`]}
                  helperText={errors[`item_${index}_itemName`]}
                  fullWidth
                  sx={{ mb: 2 }}
                />

                <Box sx={styles.gridRow}>
                  <TextField
                    label="Total Quantity (Kattas)"
                    type="number"
                    value={item.totalQuantity}
                    onChange={(e) => handleItemChange(index, "totalQuantity", e.target.value)}
                    error={!!errors[`item_${index}_totalQuantity`]}
                    helperText={errors[`item_${index}_totalQuantity`]}
                    fullWidth
                  />
                  <TextField
                    label="Weight per Katta (kg)"
                    type="number"
                    value={item.weightPerKatta}
                    onChange={(e) => handleItemChange(index, "weightPerKatta", e.target.value)}
                    error={!!errors[`item_${index}_weightPerKatta`]}
                    helperText={errors[`item_${index}_weightPerKatta`]}
                    fullWidth
                  />
                </Box>

                <Box sx={{ ...styles.gridRow, mt: 2 }}>
                  <TextField
                    label="Purchase Rate (Rs per kg)"
                    type="number"
                    value={item.purchaseRate}
                    onChange={(e) => handleItemChange(index, "purchaseRate", e.target.value)}
                    error={!!errors[`item_${index}_purchaseRate`]}
                    helperText={errors[`item_${index}_purchaseRate`]}
                    fullWidth
                  />
                  <TextField
                    label="Calculated Weight (kg)"
                    type="number"
                    value={item.totalWeight}
                    onChange={(e) => handleItemChange(index, "totalWeight", e.target.value)}
                    helperText="Calculated weight (auto or manual)"
                    fullWidth
                  />
                </Box>

                <Box sx={{ ...styles.gridRow, mt: 2 }}>
                  <TextField
                    label="Bhardana Rate (Optional Rs/Katta)"
                    type="number"
                    value={item.bhardanaRate}
                    onChange={(e) => handleItemChange(index, "bhardanaRate", e.target.value)}
                    fullWidth
                  />
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: 2,
                      py: 1,
                      bgcolor: "#EFF6FF",
                      borderRadius: borderRadius.sm,
                      border: "1px dashed #BFDBFE",
                    }}
                  >
                    <Typography variant="body2" color="textSecondary">
                      Item Total:
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={800} color={colors.primary}>
                      Rs. {(itemCalc.totalAmount || 0).toLocaleString()}
                    </Typography>
                  </Box>
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
            + Add Another Stock Item to This Receipt
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

        {/* Right Side: Live Combined Purchase Receipt Summary */}
        <Box sx={styles.summarySection}>
          <Typography sx={styles.summaryTitle}>
            <ReceiptIcon color="secondary" /> Purchase Receipt Summary
          </Typography>

          {/* Line items preview */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: colors.textSecondary, textTransform: "uppercase" }}>
              Items on Receipt ({items.length})
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
                  {it.itemName || `Item #${idx + 1}`} ({it.totalQuantity || 0} Katte)
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: colors.secondary }}>
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
              <Typography>Total Net Weight</Typography>
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
              <Typography variant="h6">Total Payable</Typography>
              <Typography variant="h6">Rs. {totalBillAmount.toLocaleString()}</Typography>
            </Box>

            {status === "partial" && (
              <Box sx={{ ...styles.billSummaryDetail, borderBottom: "none", mt: 1 }}>
                <Typography color="success.main">Paid Amount</Typography>
                <Typography sx={{ ...styles.detailValue, color: "success.main" }}>
                  - Rs. {Number(paidAmount || 0).toLocaleString()}
                </Typography>
              </Box>
            )}

            {(status === "partial" || status === "unpaid") && (
              <Box sx={{ ...styles.totalRow, borderTop: "none", paddingTop: 0, marginTop: 0 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  Remaining Balance
                </Typography>
                <Typography variant="subtitle1" fontWeight={700} color="error.main">
                  Rs. {remainingAmount.toLocaleString()}
                </Typography>
              </Box>
            )}
          </Box>

          <Button
            variant="contained"
            color="secondary"
            sx={styles.button}
            onClick={handleSubmit}
            disabled={loading}
            fullWidth
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : `Save & Purchase (${items.length} Items)`}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default AddStock;
