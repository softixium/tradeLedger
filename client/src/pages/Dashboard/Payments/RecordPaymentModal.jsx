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
} from "@mui/material";
import DatePickerField from "../../../components/DatePickerField/DatePickerField";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import api from "../../../api/axios";
import { paymentsStyles } from "./paymentsStyle";

const RecordPaymentModal = ({ open, onClose, targetData, onSuccess }) => {
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(dayjs());
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isInflow = targetData?.type === "inflow";
  const remaining = Number(targetData?.remainingAmount || 0);
  const styles = paymentsStyles();

  const fetchBankAccounts = async () => {
    try {
      const { data } = await api.get("/bank/accounts");
      setBankAccounts(data.data || []);
      if (data.data && data.data.length > 0) {
        const defaultAcc = data.data.find((a) => a.isDefault) || data.data[0];
        setBankAccountId(defaultAcc._id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchBankAccounts();
    }
  }, [open]);

  useEffect(() => {
    if (open && targetData) {
      setAmount(targetData.remainingAmount || "");
      setPaymentDate(dayjs());
      setPaymentMethod("cash");
      setNotes("");
      setError("");
    }
  }, [open, targetData]);

  if (!targetData) return null;

  const handleFullAmount = () => {
    setAmount(remaining.toString());
    setError("");
  };

  const handleAmountChange = (e) => {
    const val = e.target.value;
    setAmount(val);
    if (Number(val) <= 0) {
      setError("Amount must be greater than 0");
    } else if (Number(val) > remaining) {
      setError(`Amount cannot exceed outstanding balance of Rs. ${remaining}`);
    } else {
      setError("");
    }
  };

  const handleSubmit = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Please enter a valid payment amount");
      return;
    }
    if (numAmount > remaining) {
      setError(`Amount cannot exceed outstanding balance of Rs. ${remaining}`);
      return;
    }

    try {
      setLoading(true);
      await api.post("/payments", {
        type: targetData.type,
        partyId: targetData.partyId,
        partyType: targetData.partyType,
        relatedType: targetData.relatedType,
        relatedId: targetData.relatedId,
        referenceNumber: targetData.referenceNumber,
        paymentDate: paymentDate ? paymentDate.toDate() : new Date(),
        amount: numAmount,
        paymentMethod,
        bankAccountId: bankAccountId || undefined,
        notes,
      });

      toast.success(
        isInflow
          ? `Received Rs. ${numAmount} from ${targetData.partyName} successfully!`
          : `Paid Rs. ${numAmount} to ${targetData.partyName} successfully!`
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: styles.modalPaper }}
    >
      <DialogTitle sx={styles.modalTitle}>
        {isInflow ? "Collect Customer Payment" : "Pay Supplier / Miller"}
      </DialogTitle>

      <DialogContent sx={styles.modalContent}>
        <Box sx={styles.modalInfoBanner(isInflow)}>
          <Box>
            <Typography sx={styles.modalPartyName}>
              {targetData.partyName}
            </Typography>
            <Typography sx={styles.modalReference}>
              Ref #: <strong>{targetData.referenceNumber || "N/A"}</strong>
              {targetData.itemName ? ` | Item: ${targetData.itemName}` : ""}
            </Typography>
          </Box>
          <Chip label={`Due: Rs. ${remaining.toLocaleString()}`} sx={styles.modalDueChip} />
        </Box>

        <Box sx={styles.modalFullBalanceRow}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleFullAmount}
            sx={styles.modalFullBalanceButton}
          >
            Fill Full Balance (Rs. {remaining.toLocaleString()})
          </Button>
        </Box>

        <Box sx={styles.modalFormGrid}>
          <Box>
            <TextField
              label="Payment Amount (Rs.)"
              variant="outlined"
              fullWidth
              type="number"
              value={amount}
              onChange={handleAmountChange}
              error={!!error}
              helperText={error}
              required
              slotProps={{ htmlInput: { min: 1, max: remaining, step: "any" } }}
            />
          </Box>

          <Box>
            <DatePickerField
              label="Payment Date"
              value={paymentDate}
              onChange={(date) => setPaymentDate(date)}
              slotProps={{ textField: { fullWidth: true, variant: "outlined", sx: styles.modalDateField } }}
            />
          </Box>

          {!isInflow && (
            <Box sx={styles.modalFieldFull}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="bank-account-select-label">
                  Deduct From Bank / Cash Account
                </InputLabel>
                <Select
                  labelId="bank-account-select-label"
                  label="Deduct From Bank / Cash Account"
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                >
                  {bankAccounts.length === 0 ? (
                    <MenuItem value="">Default Cash Account</MenuItem>
                  ) : (
                    bankAccounts.map((acc) => (
                      <MenuItem key={acc._id} value={acc._id}>
                        {acc.accountName} (Balance: Rs. {acc.currentBalance})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Box>
          )}

          <Box>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="payment-method-label">Payment Method</InputLabel>
              <Select
                labelId="payment-method-label"
                value={paymentMethod}
                label="Payment Method"
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
                <MenuItem value="online">Online / UPI / Card</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={styles.modalFieldFull}>
            <TextField
              label="Transaction Notes / Cheque # / Bank Ref"
              variant="outlined"
              fullWidth
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid via Meezan Online Transfer, Cheque #49281..."
              sx={styles.modalNotes}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={styles.modalActions}>
        <Button onClick={onClose} disabled={loading} sx={styles.modalCancelButton}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !!error || !amount}
          disableElevation
          sx={styles.modalSubmitButton(isInflow)}
        >
          {loading ? "Recording..." : isInflow ? "Confirm Received" : "Confirm Payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecordPaymentModal;
