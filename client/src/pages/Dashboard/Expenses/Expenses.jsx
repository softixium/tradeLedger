import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CategoryIcon from "@mui/icons-material/Category";
import DeleteIcon from "@mui/icons-material/Delete";
import PaymentsIcon from "@mui/icons-material/Payments";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SearchIcon from "@mui/icons-material/Search";
import { toast } from "react-toastify";
import api from "../../../api/axios";
import { colors } from "../../../styles/theme";
import DatePickerField from "../../../components/DatePickerField/DatePickerField";
import { formatDate } from "../../../utils/dateFormat";

const getLocalDate = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const emptyForm = () => ({ title: "", category: "", amount: "", date: getLocalDate(), notes: "" });

const metricCardSx = {
  p: 2.5,
  border: `1px solid ${colors.border}`,
  borderRadius: 2,
  boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 2,
  minHeight: 112,
};

const Expenses = () => {
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchExpenses = async ({ signal } = {}) => {
    setLoading(true);
    setLoadError("");
    try {
      // Fetch without date query parameters, then filter locally. This keeps the
      // initial list request independent of database date parsing/timezone rules.
      const { data } = await api.get("/expenses", { signal });
      if (!Array.isArray(data.data)) throw new Error("The expenses response was not a list.");
      setAllExpenses(data.data);
    } catch (error) {
      // Ignore a request canceled during unmount/StrictMode's development remount.
      if (!signal?.aborted && error.name !== "CanceledError") {
        setLoadError(error.response?.data?.message || error.message || "Expenses could not be loaded.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchExpenses({ signal: controller.signal });
    return () => controller.abort();
  }, []);

  const months = useMemo(() => [...new Set(allExpenses
    .map((expense) => String(expense.date || "").slice(0, 7))
    .filter((value) => /^\d{4}-\d{2}$/.test(value)))].sort((a, b) => b.localeCompare(a)), [allExpenses]);

  const periodExpenses = useMemo(() => allExpenses.filter((expense) => {
    const expenseMonth = String(expense.date || "").slice(0, 7);
    return !month || expenseMonth === month;
  }), [allExpenses, month]);

  const expenses = useMemo(() => periodExpenses.filter((expense) => {
    const searchText = `${expense.title} ${expense.category} ${expense.notes || ""}`.toLowerCase();
    return searchText.includes(search.trim().toLowerCase());
  }), [periodExpenses, search]);

  const periodLabel = month
    ? new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "All time";

  const periodTotal = useMemo(
    () => periodExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    [periodExpenses]
  );

  const categoryCount = useMemo(
    () => new Set(periodExpenses.map((expense) => String(expense.category || "").trim().toLowerCase()).filter(Boolean)).size,
    [periodExpenses]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || !form.category.trim() || !Number.isFinite(amount) || amount <= 0 || !form.date) {
      toast.warning("Enter a description, category, valid amount, and date.");
      return;
    }

    try {
      setSaving(true);
      const { data } = await api.post("/expenses", {
        ...form,
        title: form.title.trim(),
        category: form.category.trim(),
        amount,
      });
      setAllExpenses((previous) => [data.data, ...previous]);
      setSearch("");
      setFormOpen(false);
      setForm(emptyForm());
      toast.success("Expense added successfully.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Expense could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!expenseToDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/expenses/${expenseToDelete._id}`);
      setAllExpenses((previous) => previous.filter((expense) => expense._id !== expenseToDelete._id));
      setExpenseToDelete(null);
      toast.success("Expense deleted successfully.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Expense could not be deleted.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 27, fontWeight: 700, color: colors.textPrimary, letterSpacing: "-0.4px" }}>Expenses</Typography>
          <Typography sx={{ color: colors.textSecondary, mt: 0.5 }}>Record business costs and track their impact on net profit.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(emptyForm()); setFormOpen(true); }} sx={{ minHeight: 42, px: 2.2, textTransform: "none", fontWeight: 700 }}>
          Add expense
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ ...metricCardSx, backgroundColor: colors.errorLight }}>
            <Box><Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Total expenses · {periodLabel}</Typography><Typography variant="h5" sx={{ color: colors.errorDark, fontWeight: 750, mt: 0.5 }}>{money(periodTotal)}</Typography></Box>
            <Box sx={{ width: 44, height: 44, borderRadius: 2, display: "grid", placeItems: "center", color: colors.errorDark, bgcolor: "rgba(255,255,255,.7)" }}><PaymentsIcon /></Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={metricCardSx}>
            <Box><Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Expense entries · {periodLabel}</Typography><Typography variant="h5" sx={{ color: colors.textPrimary, fontWeight: 750, mt: 0.5 }}>{periodExpenses.length}</Typography></Box>
            <Box sx={{ width: 44, height: 44, borderRadius: 2, display: "grid", placeItems: "center", color: colors.infoDark, bgcolor: colors.infoLight }}><ReceiptLongIcon /></Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={metricCardSx}>
            <Box><Typography variant="caption" sx={{ color: colors.textSecondary, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Categories · {periodLabel}</Typography><Typography variant="h5" sx={{ color: colors.textPrimary, fontWeight: 750, mt: 0.5 }}>{categoryCount}</Typography></Box>
            <Box sx={{ width: 44, height: 44, borderRadius: 2, display: "grid", placeItems: "center", color: colors.primary, bgcolor: colors.surfaceMuted }}><CategoryIcon /></Box>
          </Paper>
        </Grid>
      </Grid>

      {loadError && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => fetchExpenses()}>Retry</Button>}>
          Could not load expenses: {loadError}
        </Alert>
      )}

      <Paper sx={{ p: { xs: 1.5, sm: 2 }, border: `1px solid ${colors.border}`, borderRadius: 2, boxShadow: "0 2px 10px rgba(15, 23, 42, 0.04)" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 700, color: colors.textPrimary }}>Expense history</Typography>
          <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 190 }}>
              <InputLabel id="expense-month-filter-label">Filter by month</InputLabel>
              <Select labelId="expense-month-filter-label" label="Filter by month" value={month} onChange={(event) => setMonth(event.target.value)}>
                <MenuItem value="">All months</MenuItem>
                {months.map((value) => (
                  <MenuItem key={value} value={value}>
                    {new Date(`${value}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" placeholder="Search expenses" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ width: { xs: "100%", sm: 230 } }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}} />
          </Box>
        </Box>

        <TableContainer sx={{ mt: 2, border: `1px solid ${colors.border}`, borderRadius: 1.5, overflowX: "auto" }}>
          <Table sx={{ minWidth: 720 }}>
            <TableHead sx={{ bgcolor: colors.surfaceMuted }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: colors.textSecondary }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700, color: colors.textSecondary }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700, color: colors.textSecondary }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700, color: colors.textSecondary }}>Notes</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: colors.textSecondary }}>Amount</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: colors.textSecondary }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 7 }}><CircularProgress size={30} /></TableCell></TableRow>
              ) : loadError ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: colors.textSecondary }}>Retry loading to view expense history.</TableCell></TableRow>
              ) : expenses.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 7 }}><CalendarMonthIcon sx={{ color: "text.disabled", fontSize: 34, mb: 1 }} /><Typography sx={{ color: colors.textPrimary, fontWeight: 650 }}>No expenses found</Typography><Typography variant="body2" sx={{ color: colors.textSecondary, mt: 0.5 }}>Add an expense or choose another month.</Typography></TableCell></TableRow>
              ) : expenses.map((expense) => (
                <TableRow key={expense._id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(expense.date)}</TableCell>
                  <TableCell sx={{ fontWeight: 650, color: colors.textPrimary }}>{expense.title}</TableCell>
                  <TableCell><Chip size="small" label={expense.category} sx={{ bgcolor: colors.surfaceMuted, color: colors.textSecondary, fontWeight: 600 }} /></TableCell>
                  <TableCell sx={{ maxWidth: 300, color: colors.textSecondary, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{expense.notes || "—"}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap", color: colors.errorDark }}>{money(expense.amount)}</TableCell>
                  <TableCell align="right"><IconButton aria-label={`Delete ${expense.title}`} color="error" onClick={() => setExpenseToDelete(expense)}><DeleteIcon /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={formOpen} onClose={() => !saving && setFormOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 700 }}>Add expense</DialogTitle>
          <DialogContent sx={{ pt: "12px !important" }}>
            <Grid container spacing={2}>
              <Grid size={12}><TextField autoFocus label="Description" placeholder="Fuel, equipment, utilities..." value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} fullWidth required slotProps={{ htmlInput: { maxLength: 120 }}} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Category" placeholder="Transport, utilities, equipment..." value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} fullWidth required slotProps={{ htmlInput: { maxLength: 80 }}} /></Grid>
              <Grid size={{ xs: 12, sm: 6 }}><TextField label="Amount (Rs.)" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} fullWidth required type="number" slotProps={{ htmlInput: { min: 0.01, step: "any" }}} /></Grid>
              <Grid size={12}><DatePickerField label="Date" value={form.date ? dayjs(form.date) : null} onChange={(date) => setForm({ ...form, date: date?.isValid() ? date.format("YYYY-MM-DD") : "" })} slotProps={{ textField: { required: true } }} /></Grid>
              <Grid size={12}><TextField label="Notes (optional)" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} fullWidth multiline minRows={2} slotProps={{ htmlInput: { maxLength: 1000 }}} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setFormOpen(false)} disabled={saving} sx={{ textTransform: "none" }}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddIcon />} sx={{ textTransform: "none", fontWeight: 700 }}>{saving ? "Saving..." : "Save expense"}</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={!!expenseToDelete} onClose={() => !deleting && setExpenseToDelete(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete expense?</DialogTitle>
        <DialogContent><Typography color="text.secondary">Delete “{expenseToDelete?.title}”? Net profit will be recalculated.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}><Button onClick={() => setExpenseToDelete(null)} disabled={deleting} sx={{ textTransform: "none" }}>Cancel</Button><Button color="error" variant="contained" onClick={handleDelete} disabled={deleting} sx={{ textTransform: "none" }}>{deleting ? "Deleting..." : "Delete expense"}</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default Expenses;
