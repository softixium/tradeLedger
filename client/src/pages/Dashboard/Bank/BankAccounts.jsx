import React, { useState, useEffect } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  DialogContentText,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import ReceiptIcon from "@mui/icons-material/Receipt";
import DeleteIcon from '@mui/icons-material/Delete';
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import CallMadeIcon from "@mui/icons-material/CallMade";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import DatePickerField from "../../../components/DatePickerField/DatePickerField";
import { formatDate } from "../../../utils/dateFormat";
import dayjs from "dayjs";
import { toast } from "react-toastify";

import api from "../../../api/axios";
import { colors } from "../../../styles/theme";
import { bankStyles } from "./bankStyles";
import ReceiptModal from "../../../components/ReceiptModal/ReceiptModal";

const BankAccounts = () => {
  const styles = bankStyles();

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  // Add Account Modal
  const [addAccOpen, setAddAccOpen] = useState(false);
  const [newAcc, setNewAcc] = useState({
    accountName: "",
    bankName: "",
    accountNumber: "",
    initialBalance: "",
    notes: "",
  });

  // Deposit / Withdraw Modal
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    bankAccountId: "",
    type: "deposit",
    amount: "",
    paymentMethod: "bank_transfer",
    referenceNumber: "",
    date: dayjs(),
    notes: "",
  });

  // Delete Transaction Modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState(null);

  // Receipt Modal
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const fetchBankData = async () => {
    try {
      setLoading(true);
      const [accRes, txRes] = await Promise.all([
        api.get("/bank/accounts"),
        api.get("/bank/transactions"),
      ]);
      setAccounts(accRes.data.data || []);
      setTotalBalance(accRes.data.totalBalance || 0);
      setTransactions(txRes.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load bank data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankData();
  }, []);

  // 1. Create Bank Account
  const handleCreateAccount = async () => {
    if (!newAcc.accountName.trim()) {
      toast.error("Please enter an account name");
      return;
    }

    try {
      await api.post("/bank/accounts", newAcc);
      toast.success("Bank account created successfully!");
      setAddAccOpen(false);
      setNewAcc({
        accountName: "",
        bankName: "",
        accountNumber: "",
        initialBalance: "",
        notes: "",
      });
      fetchBankData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create account");
    }
  };

  // 2. Open Deposit/Withdraw Modal
  const handleOpenTxModal = (accId = "", type = "deposit") => {
    document.activeElement?.blur();
    setTxForm({
      bankAccountId: accId || (accounts.length > 0 ? accounts[0]._id : ""),
      type,
      amount: "",
      paymentMethod: type === "deposit" ? "bank_transfer" : "cash",
      referenceNumber: "",
      date: dayjs(),
      notes: "",
    });
    setTxModalOpen(true);
  };

  const handleOpenAddAccount = () => {
    document.activeElement?.blur();
    setAddAccOpen(true);
  };

  // 3. Submit Deposit / Withdraw
  const handleSaveTransaction = async () => {
    const numAmount = Number(txForm.amount);
    if (!txForm.bankAccountId) {
      toast.error("Please select a bank account");
      return;
    }
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      await api.post("/bank/transactions", {
        ...txForm,
        amount: numAmount,
        date: txForm.date ? txForm.date.toDate() : new Date(),
      });
      toast.success(
        `${txForm.type === "deposit" ? "Deposit" : "Withdrawal"} of Rs. ${numAmount} recorded!`
      );
      setTxModalOpen(false);
      fetchBankData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record transaction");
    }
  };

  // 4. Delete Transaction
  const handleDeleteTxConfirm = async () => {
    if (!txToDelete) return;
    try {
      await api.delete(`/bank/transactions/${txToDelete._id}`);
      toast.success("Transaction deleted and balance restored!");
      setDeleteOpen(false);
      setTxToDelete(null);
      fetchBankData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete transaction");
    }
  };

  // 5. Open Receipt
  const handleOpenReceipt = (tx) => {
    setReceiptData(tx);
    setReceiptOpen(true);
  };

  return (
    <Box sx={styles.container}>
      {/* Header */}
      <Box sx={styles.header}>
        <Box>
          <Typography sx={styles.headerText}>Bank & Cash Accounts</Typography>
          <Typography variant="body2" color="textSecondary">
            Manage balances, deposits, withdrawals, and bank transaction ledger.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Button
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={() => handleOpenTxModal("", "deposit")}
            sx={{
              backgroundColor: colors.successDark,
              color: colors.white,
              fontWeight: 700,
              "&:hover": { backgroundColor: colors.success },
            }}
          >
            Deposit
          </Button>

          <Button
            variant="contained"
            startIcon={<RemoveCircleIcon />}
            onClick={() => handleOpenTxModal("", "withdrawal")}
            sx={{
              backgroundColor: colors.errorDark,
              color: colors.white,
              fontWeight: 700,
              "&:hover": { backgroundColor: colors.error },
            }}
          >
            Withdraw
          </Button>

          <Button
            variant="outlined"
            startIcon={<AddBusinessIcon />}
            color="primary"
            onClick={handleOpenAddAccount}
            sx={{ fontWeight: 700 }}
          >
            New Account
          </Button>
        </Box>
      </Box>

      {/* Top Balance KPI Cards */}
      <Box sx={styles.kpiGrid}>
        <Paper sx={{ ...styles.kpiCard, backgroundColor: colors.infoLight }}>
          <Typography sx={styles.kpiTitle}>Total Available Balance</Typography>
          <Typography sx={{ ...styles.kpiValue, color: colors.infoDark }}>
            Rs. {totalBalance?.toLocaleString() || 0}
          </Typography>
          <Typography variant="caption" sx={{ color: colors.infoDark, fontWeight: 700 }}>
            Across {accounts.length} Accounts
          </Typography>
        </Paper>

        <Paper sx={{ ...styles.kpiCard, backgroundColor: colors.successLight }}>
          <Typography sx={styles.kpiTitle}>Total Transactions</Typography>
          <Typography sx={{ ...styles.kpiValue, color: colors.successDark }}>
            {transactions.length}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Deposits, Withdrawals, & Invoices
          </Typography>
        </Paper>
      </Box>

      {/* Bank Accounts Grid */}
      <Box>
        <Typography sx={styles.sectionTitle}>🏦 Your Accounts</Typography>
        {accounts.length === 0 ? (
          <Paper sx={{ padding: "40px", textAlign: "center", borderRadius: "12px", border: `1px dashed ${colors.border}` }}>
            <Typography variant="body1" color="textSecondary" sx={{ marginBottom: "16px" }}>
              No bank or cash accounts configured yet.
            </Typography>
            <Button variant="contained" color="primary" onClick={handleOpenAddAccount}>
              Add First Account
            </Button>
          </Paper>
        ) : (
          <Box sx={styles.accountsGrid}>
            {accounts.map((acc) => (
              <Paper key={acc._id} sx={styles.accountCard}>
                <Box sx={styles.accountHeader}>
                  <Box>
                    <Typography sx={styles.accountName}>{acc.accountName}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {acc.bankName ? `${acc.bankName} | ` : ""}
                      {acc.accountNumber ? `A/C: ${acc.accountNumber}` : "Cash Account"}
                    </Typography>
                  </Box>
                  {acc.isDefault && (
                    <Chip size="small" label="Primary" sx={{ fontWeight: 700, backgroundColor: colors.infoLight, color: colors.infoDark }} />
                  )}
                </Box>

                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Available Balance
                  </Typography>
                  <Typography sx={styles.accountBalance}>
                    Rs. {acc.currentBalance?.toLocaleString() || 0}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: "12px" }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleOpenTxModal(acc._id, "deposit")}
                    sx={{ textTransform: "none", flex: 1, fontWeight: 700, color: colors.success, borderColor: colors.success }}
                  >
                    + Deposit
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleOpenTxModal(acc._id, "withdrawal")}
                    sx={{ textTransform: "none", flex: 1, fontWeight: 700, color: colors.error, borderColor: colors.error }}
                  >
                    - Withdraw
                  </Button>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      {/* Bank Transaction Ledger */}
      <Paper sx={styles.panel}>
        <Typography sx={styles.sectionTitle}>
          📜 Transaction Ledger
        </Typography>

        <TableContainer sx={styles.tableContainer}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Particulars</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Balance After</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ padding: "40px" }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ padding: "30px", color: colors.textSecondary }}>
                    No bank transactions recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const isInflow =
                    tx.type === "deposit" ||
                    tx.type === "customer_receipt" ||
                    tx.type === "initial_balance";

                  return (
                    <TableRow key={tx._id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {tx.bankAccountId?.accountName || "Bank"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {isInflow ? (
                            <CallReceivedIcon sx={{ color: colors.successDark, fontSize: "16px" }} />
                          ) : (
                            <CallMadeIcon sx={{ color: colors.textPrimary, fontSize: "16px" }} />
                          )}
                          <Chip 
                            size="small"
                            label={tx.type.replace("_", " ")}
                            sx={{
                              fontWeight: 700,
                              textTransform: "capitalize",
                              backgroundColor: isInflow ? colors.successLight : colors.surfaceMuted,
                              color: isInflow ? colors.successDark : colors.textPrimary,
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{tx.notes || tx.referenceNumber || "-"}</Typography>
                        {tx.partyName && (
                          <Typography variant="caption" color="textSecondary">
                            Party: {tx.partyName}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          color: isInflow ? colors.successDark : colors.textPrimary,
                          fontSize: "15px",
                        }}
                      >
                        {isInflow ? "+" : "-"} Rs. {tx.amount?.toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: colors.primary }}>
                        Rs. {tx.balanceAfter?.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                          <Tooltip title="View Receipt">
                            <IconButton
                              size="small"
                              sx={{ color: colors.primary, bgcolor: colors.infoLight }}
                              onClick={() => handleOpenReceipt(tx)}
                            >
                              <ReceiptLongIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Revert Transaction">
                            <IconButton
                              size="small"
                              sx={{ color: colors.error, bgcolor: colors.errorLight }}
                              onClick={() => {
                                setTxToDelete(tx);
                                setDeleteOpen(true);
                              }}
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
      </Paper>

      {/* Add Bank Account Dialog */}
      <Dialog open={addAccOpen} onClose={() => setAddAccOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: `1px solid ${colors.border}`, pb: 2 }}>
          🏦 Add Bank or Cash Account
        </DialogTitle>
        <DialogContent sx={{ mt: 2, pt: 2 }}>
          <Box sx={{ height: 18, flexShrink: 0 }} />
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid size={12}>
              <TextField
                label="Account Title / Display Name *"
                variant="outlined"
                fullWidth
                placeholder="e.g. Meezan Bank - Main, Cash in Hand"
                value={newAcc.accountName}
                onChange={(e) => setNewAcc({ ...newAcc, accountName: e.target.value })}
                required
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Bank Name (Optional)"
                variant="outlined"
                fullWidth
                placeholder="e.g. Meezan Bank, HBL, Allied Bank"
                value={newAcc.bankName}
                onChange={(e) => setNewAcc({ ...newAcc, bankName: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Account Number (Optional)"
                variant="outlined"
                fullWidth
                placeholder="e.g. 010203040506"
                value={newAcc.accountNumber}
                onChange={(e) => setNewAcc({ ...newAcc, accountNumber: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Opening / Initial Balance (Rs.)"
                variant="outlined"
                fullWidth
                type="number"
                value={newAcc.initialBalance}
                onChange={(e) => setNewAcc({ ...newAcc, initialBalance: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Notes (Optional)"
                variant="outlined"
                fullWidth
                multiline
                rows={2}
                value={newAcc.notes}
                onChange={(e) => setNewAcc({ ...newAcc, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ padding: "16px 24px", borderTop: `1px solid ${colors.border}` }}>
          <Button onClick={() => setAddAccOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateAccount}
            disableElevation
          >
            Create Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deposit / Withdraw Dialog */}
      <Dialog open={txModalOpen} onClose={() => setTxModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, borderBottom: `1px solid ${colors.border}`, pb: 2 }}>
          {txForm.type === "deposit" ? "💰 Deposit Money" : "💸 Withdraw Money"}
        </DialogTitle>
        <DialogContent sx={{ mt: 2, pt: 2 }}>
          <Box sx={{ height: 18, flexShrink: 0 }} />
          <Grid container spacing={3} sx={{ mt: 0 }}>
            <Grid size={12}>
              {accounts.length === 0 ? (
                <TextField
                  label="Select Account *"
                  value="No accounts available. Create a bank or cash account first."
                  fullWidth
                  disabled
                />
              ) : (
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Select Account *</InputLabel>
                  <Select
                    label="Select Account *"
                    value={txForm.bankAccountId}
                    onChange={(e) => setTxForm({ ...txForm, bankAccountId: e.target.value })}
                  >
                  {accounts.map((acc) => (
                    <MenuItem key={acc._id} value={acc._id}>
                      {acc.accountName} (Bal: Rs. {acc.currentBalance?.toLocaleString()})
                    </MenuItem>
                  ))}
                  </Select>
                </FormControl>
              )}
            </Grid>

            <Grid size={12}>
              <TextField
                label="Amount (Rs.) *"
                variant="outlined"
                fullWidth
                type="number"
                value={txForm.amount}
                onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                required
              />
            </Grid>

            <Grid size={12}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Payment Mode</InputLabel>
                <Select
                  label="Payment Mode"
                  value={txForm.paymentMethod}
                  onChange={(e) => setTxForm({ ...txForm, paymentMethod: e.target.value })}
                >
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                  <MenuItem value="online">Online / UPI</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={12}>
              <DatePickerField
                label="Transaction Date"
                value={txForm.date}
                onChange={(date) => setTxForm({ ...txForm, date })}
                slotProps={{ textField: { fullWidth: true, variant: "outlined" } }}
              />
            </Grid>

            <Grid size={12}>
              <TextField
                label="Reference / Cheque # (Optional)"
                variant="outlined"
                fullWidth
                value={txForm.referenceNumber}
                onChange={(e) => setTxForm({ ...txForm, referenceNumber: e.target.value })}
              />
            </Grid>

            <Grid size={12}>
              <TextField
                label="Remarks / Notes"
                variant="outlined"
                fullWidth
                multiline
                rows={2}
                value={txForm.notes}
                onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ padding: "16px 24px", borderTop: `1px solid ${colors.border}` }}>
          <Button onClick={() => setTxModalOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveTransaction}
            disableElevation
            disabled={!txForm.bankAccountId || !txForm.amount}
            sx={{
              backgroundColor: txForm.type === "deposit" ? colors.successDark : colors.errorDark,
              color: colors.white,
              fontWeight: 700,
              "&:hover": { backgroundColor: txForm.type === "deposit" ? colors.success : colors.error }
            }}
          >
            {txForm.type === "deposit" ? "Confirm Deposit" : "Confirm Withdrawal"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete / Revert Confirmation Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700, color: colors.error }}>Confirm Delete Transaction</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete this bank transaction of{" "}
            <strong>Rs. {txToDelete?.amount?.toLocaleString()}</strong>? The account balance will be adjusted to undo it.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} color="inherit">Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteTxConfirm} disableElevation>
            Delete Transaction
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
        type="bank"
      />
    </Box>
  );
};

export default BankAccounts;
