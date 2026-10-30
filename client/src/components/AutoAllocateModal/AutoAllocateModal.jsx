import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Chip,
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  IconButton,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import BoltIcon from "@mui/icons-material/Bolt";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import dayjs from "dayjs";
import { toast } from "react-toastify";

import api from "../../api/axios";
import { colors, borderRadius, shadows } from "../../styles/theme";
import DatePickerField from "../DatePickerField/DatePickerField";
import { formatDate } from "../../utils/dateFormat";

const AutoAllocateModal = ({
  open,
  onClose,
  party,
  onSuccess,
}) => {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);

  // Fetch unpaid items & bank accounts
  useEffect(() => {
    if (open && party?._id) {
      loadPartyUnpaidItems();
      fetchBankAccounts();
      setAmount("");
      setPaymentDate(dayjs().format("YYYY-MM-DD"));
      setPaymentMethod("cash");
      setNotes("");
    }
  }, [open, party]);

  const fetchBankAccounts = async () => {
    try {
      const { data } = await api.get("/bank/accounts");
      setBankAccounts(data.data || []);
      if (data.data && data.data.length > 0) {
        const defaultAcc = data.data.find((a) => a.isDefault) || data.data[0];
        setBankAccountId(defaultAcc._id);
      }
    } catch (err) {
      console.error("Failed to load bank accounts", err);
    }
  };

  const loadPartyUnpaidItems = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/party/${party._id}/details`);
      const partyData = res.data.data;
      const isBuyer = party.type?.toLowerCase() === "buyer";

      let items = [];
      if (isBuyer) {
      // Unpaid sales, sorted oldest first so the earliest bill is paid first.
        items = (partyData.sales || [])
          .filter((s) => Number(s.remainingAmount || 0) > 0)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
      } else {
        // Unpaid stocks for miller/supplier, sorted oldest first
        items = (partyData.stocks || [])
          .filter((s) => Number(s.remainingAmount || 0) > 0)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
      }

      setInvoices(items);
      const total = items.reduce(
        (sum, item) => sum + Number(item.remainingAmount || 0),
        0
      );
      setTotalOutstanding(total);
    } catch (err) {
      toast.error("Failed to load outstanding balance");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !party) return null;

  const isBuyer = party.type?.toLowerCase() === "buyer";
  const numAmount = Number(amount || 0);

  // Preview how the payment will cover the oldest outstanding items first.
  let remainingToAllocate = numAmount;
  const previewRows = invoices.map((inv) => {
    const outstanding = Number(inv.remainingAmount || 0);
    let willApply = 0;
    let projectedRemaining = outstanding;

    if (remainingToAllocate > 0) {
      willApply = Math.min(remainingToAllocate, outstanding);
      projectedRemaining = outstanding - willApply;
      remainingToAllocate -= willApply;
    }

    const isFullyPaid = projectedRemaining <= 0 && willApply > 0;
    const isPartial = willApply > 0 && projectedRemaining > 0;

    return {
      ...inv,
      outstanding,
      willApply,
      projectedRemaining,
      isFullyPaid,
      isPartial,
    };
  });

  const fullyClearedCount = previewRows.filter((r) => r.isFullyPaid).length;
  const partiallyClearedCount = previewRows.filter((r) => r.isPartial).length;

  const handleQuickAmount = (val) => {
    setAmount(val.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid positive payment amount.");
      return;
    }

    if (numAmount > totalOutstanding) {
      toast.error(
        `Amount cannot exceed total outstanding balance of Rs. ${totalOutstanding.toLocaleString()}.`
      );
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post("/payments/allocate", {
        partyId: party._id,
        amount: numAmount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod,
        bankAccountId: bankAccountId || undefined,
        notes,
      });

      const coveredCount = previewRows.filter((row) => row.willApply > 0).length;
      toast.success(
        `Payment of Rs. ${numAmount.toLocaleString()} shared across ${coveredCount} ${isBuyer ? "bill(s)" : "purchase voucher(s)"}.`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Payment could not be shared across the bills. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

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
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: "#F8FAFC",
          borderBottom: `1px solid ${colors.border}`,
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: colors.primary,
              color: colors.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BoltIcon />
          </Box>
          <Box>
            <Typography sx={{ fontSize: "18px", fontWeight: 800, color: colors.textPrimary }}>
              Pay Multiple Bills at Once
            </Typography>
            <Typography sx={{ fontSize: "12px", color: colors.textSecondary }}>
              Settles oldest unpaid {isBuyer ? "invoices" : "purchases"} first automatically
            </Typography>
          </Box>
        </Box>

        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
          {/* Party Banner */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: borderRadius.md,
              backgroundColor: "#EFF6FF",
              border: "1px solid #BFDBFE",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: "12px", fontWeight: 600, color: colors.primary, textTransform: "uppercase" }}>
                {isBuyer ? "Customer / Buyer" : "Supplier / Miller"}
              </Typography>
              <Typography sx={{ fontSize: "18px", fontWeight: 800, color: colors.textPrimary }}>
                {party.name}
              </Typography>
            </Box>

            <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
              <Typography sx={{ fontSize: "12px", color: colors.textSecondary }}>
                Total Outstanding Balance
              </Typography>
              <Typography sx={{ fontSize: "20px", fontWeight: 800, color: colors.errorDark }}>
                Rs. {totalOutstanding.toLocaleString()}
              </Typography>
            </Box>
          </Paper>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : invoices.length === 0 ? (
            <Alert severity="success" sx={{ borderRadius: borderRadius.md }}>
              🎉 Great news! {party.name} has no outstanding unpaid invoices. All accounts are settled!
            </Alert>
          ) : (
            <>
              {/* Payment Input Section */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1.2fr 1fr" }, gap: 2 }}>
                <Box>
                  <TextField
                    label="Payment Amount to Allocate (Rs.)"
                    type="number"
                    fullWidth
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount..."
                    helperText={
                      numAmount > 0 && numAmount <= totalOutstanding
                        ? `Rs. ${numAmount.toLocaleString()} will be distributed across oldest invoices`
                        : numAmount > totalOutstanding
                        ? `Amount exceeds total balance of Rs. ${totalOutstanding.toLocaleString()}`
                        : "Enter the amount collected/paid"
                    }
                    error={numAmount > totalOutstanding}
                    slotProps={{ input: {
                      startAdornment: (
                        <Typography sx={{ mr: 1, fontWeight: 700, color: colors.textSecondary }}>
                          Rs.
                        </Typography>
                      ),
                    }}}
                  />

                  {/* Quick-fill chips */}
                  <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                    <Chip
                      label="Full Balance"
                      size="small"
                      clickable
                      onClick={() => handleQuickAmount(totalOutstanding)}
                      sx={{ fontWeight: 600, bgcolor: colors.surfaceMuted }}
                    />
                    {totalOutstanding > 1 && (
                      <Chip
                        label="50% Half"
                        size="small"
                        clickable
                        onClick={() => handleQuickAmount(Math.round(totalOutstanding / 2))}
                        sx={{ fontWeight: 600, bgcolor: colors.surfaceMuted }}
                      />
                    )}
                    {invoices.length > 0 && (
                      <Chip
                        label={`Oldest: Rs. ${invoices[0].remainingAmount?.toLocaleString()}`}
                        size="small"
                        clickable
                        onClick={() => handleQuickAmount(invoices[0].remainingAmount)}
                        sx={{ fontWeight: 600, bgcolor: colors.surfaceMuted }}
                      />
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <DatePickerField
                    label="Payment Date"
                    value={paymentDate ? dayjs(paymentDate) : null}
                    onChange={(date) => setPaymentDate(date?.isValid() ? date.format("YYYY-MM-DD") : "")}
                    slotProps={{ textField: { fullWidth: true, required: true, size: "small" } }}
                  />

                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Payment Method</InputLabel>
                      <Select
                        value={paymentMethod}
                        label="Payment Method"
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <MenuItem value="cash">Cash</MenuItem>
                        <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                        <MenuItem value="online">Online</MenuItem>
                        <MenuItem value="cheque">Cheque</MenuItem>
                      </Select>
                    </FormControl>

                    {paymentMethod === "bank_transfer" && (
                      bankAccounts.length === 0 ? (
                        <TextField
                          label="Bank Account"
                          value="No bank accounts available. Add one first."
                          fullWidth
                          size="small"
                          disabled
                        />
                      ) : (
                        <FormControl fullWidth size="small">
                          <InputLabel>Bank Account</InputLabel>
                          <Select
                            value={bankAccountId}
                            label="Bank Account"
                            onChange={(e) => setBankAccountId(e.target.value)}
                          >
                          {bankAccounts.map((acc) => (
                            <MenuItem key={acc._id} value={acc._id}>
                              {acc.bankName} - {acc.accountNumber?.slice(-4)}
                            </MenuItem>
                          ))}
                          </Select>
                        </FormControl>
                      )
                    )}
                  </Box>
                </Box>
              </Box>

              <TextField
                label="Notes (Optional)"
                fullWidth
                size="small"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Received via cheque #4519, verified by manager"
              />

          {/* Payment preview across oldest unpaid bills */}
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography sx={{ fontSize: "14px", fontWeight: 700, color: colors.textPrimary }}>
                    📋 How this payment will be shared ({previewRows.length} unpaid {isBuyer ? "bills" : "purchase vouchers"})
                  </Typography>

                  {numAmount > 0 && (
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Chip
                        label={`${fullyClearedCount} Will Be Paid`}
                        size="small"
                        sx={{ bgcolor: colors.successLight, color: colors.successDark, fontWeight: 700 }}
                      />
                      {partiallyClearedCount > 0 && (
                        <Chip
                          label={`${partiallyClearedCount} Partial`}
                          size="small"
                          sx={{ bgcolor: colors.warningLight, color: colors.warningDark, fontWeight: 700 }}
                        />
                      )}
                    </Box>
                  )}
                </Box>

                <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${colors.border}`, maxHeight: "280px" }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Order</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{isBuyer ? "Bill #" : "Receipt #"}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Outstanding</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: colors.primary }}>Allocated</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Remaining</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>New Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewRows.map((row, idx) => (
                        <TableRow
                          key={row._id}
                          sx={{
                            backgroundColor: row.isFullyPaid
                              ? "#F0FDF4"
                              : row.isPartial
                              ? "#FFFBEB"
                              : "inherit",
                          }}
                        >
                          <TableCell sx={{ fontWeight: 600, color: colors.textSecondary }}>
                            #{idx + 1}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {row.billNumber || row.receiptNumber}
                          </TableCell>
                          <TableCell>
                            {formatDate(row.date)}
                          </TableCell>
                          <TableCell>{row.itemName}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Rs. {row.outstanding.toLocaleString()}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: colors.primary }}>
                            {row.willApply > 0 ? `Rs. ${row.willApply.toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 700,
                              color: row.projectedRemaining > 0 ? colors.errorDark : colors.successDark,
                            }}
                          >
                            Rs. {row.projectedRemaining.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {row.isFullyPaid ? (
                              <Chip
                                label="PAID"
                                size="small"
                                sx={{ bgcolor: colors.successLight, color: colors.successDark, fontWeight: 700, fontSize: "11px" }}
                              />
                            ) : row.isPartial ? (
                              <Chip
                                label="PARTIAL"
                                size="small"
                                sx={{ bgcolor: colors.warningLight, color: colors.warningDark, fontWeight: 700, fontSize: "11px" }}
                              />
                            ) : (
                              <Chip
                                label="UNPAID"
                                size="small"
                                sx={{ bgcolor: colors.surfaceMuted, color: colors.textSecondary, fontWeight: 600, fontSize: "11px" }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 2.5,
            borderTop: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Button
            variant="outlined"
            color="inherit"
            onClick={onClose}
            sx={{ textTransform: "none" }}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <BoltIcon />}
            disabled={
              submitting ||
              invoices.length === 0 ||
              !numAmount ||
              numAmount <= 0 ||
              numAmount > totalOutstanding
            }
            sx={{ textTransform: "none", fontWeight: 700, px: 3 }}
          >
            {submitting ? "Saving payment..." : "Confirm Payment"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AutoAllocateModal;
