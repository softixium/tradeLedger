import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, CircularProgress, Grid, Paper, TextField, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import api from "../../../../api/axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { colors, borderRadius, shadows } from "../../../../styles/theme";
import dayjs from "dayjs";

const EditInvoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sale, setSale] = useState(null);
  const [form, setForm] = useState({ itemName: "", quantity: "", weight: "", rate: "", bhardana: "" });

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/sales/${id}`);
        const item = data.data;
        setSale(item);
        setForm({
          itemName: item.itemName || "",
          quantity: item.quantity ?? "",
          weight: item.weight ?? "",
          rate: item.rate ?? "",
          bhardana: item.bhardana ?? 0,
        });
      } catch (error) {
        toast.error(error.response?.data?.message || "Could not load this invoice item.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const calculations = useMemo(() => {
    const weight = Number(form.weight || 0);
    const rate = Number(form.rate || 0);
    const bhardana = Number(form.bhardana || 0);
    const total = weight * rate + bhardana;
    const paid = Number(sale?.paidAmount || 0);
    return { goods: weight * rate, bhardana, total, paid, remaining: Math.max(0, total - paid) };
  }, [form.weight, form.rate, form.bhardana, sale?.paidAmount]);

  const update = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.itemName.trim() || Number(form.quantity) <= 0 || Number(form.weight) <= 0 || Number(form.rate) <= 0 || Number(form.bhardana) < 0) {
      toast.warning("Enter an item name and valid positive quantity, weight, and rate.");
      return;
    }

    try {
      setSaving(true);
      const { data } = await api.put(`/sales/${id}`, form);
      toast.success(data.message || "Invoice item updated.");
      navigate("/sales");
    } catch (error) {
      const responseMessage = error.response?.data?.message || error.response?.data?.error;
      const message = responseMessage || (
        error.response?.status === 404
          ? "The invoice update service was not found. Restart the backend and try again."
          : error.response?.status
            ? `Invoice item could not be saved (error ${error.response.status}).`
            : "Could not connect to the server. Check that the backend is running and try again."
      );
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;
  if (!sale) return <Box sx={{ p: 3 }}><Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/sales")}>Back to Invoices</Button><Typography sx={{ mt: 2 }}>Invoice item could not be found.</Typography></Box>;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, pb: 4 }}>
      <Box sx={{ display: "flex", alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" }, gap: 1.5 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/sales")} sx={{ textTransform: "none" }}>Back to Invoices</Button>
        <Box>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: colors.textPrimary }}>Edit Invoice Item</Typography>
          <Typography variant="body2" color="text.secondary">Update item details on bill #{sale.billNumber}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 2fr) minmax(280px, 1fr)" }, gap: 2.5, alignItems: "start" }}>
        <Paper component="form" onSubmit={handleSave} elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: `1px solid ${colors.border}`, borderRadius: borderRadius.lg, boxShadow: shadows.sm, display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 650, color: colors.textPrimary }}>Item details</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Only this item changes. Bill, buyer, and source receipt remain the same.</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField label="Item name" value={form.itemName} onChange={update("itemName")} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Quantity" type="number" value={form.quantity} onChange={update("quantity")} fullWidth required inputProps={{ min: 0.01, step: "any" }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Weight (kg)" type="number" value={form.weight} onChange={update("weight")} fullWidth required inputProps={{ min: 0.01, step: "any" }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Rate per kg" type="number" value={form.rate} onChange={update("rate")} fullWidth required inputProps={{ min: 0.01, step: "any" }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Bhardana" type="number" value={form.bhardana} onChange={update("bhardana")} fullWidth inputProps={{ min: 0, step: "any" }} />
            </Grid>
          </Grid>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <Button type="submit" variant="contained" disabled={saving} sx={{ minWidth: 150, py: 1.1, textTransform: "none", fontWeight: 700 }}>
              {saving ? <CircularProgress size={20} color="inherit" /> : "Save Changes"}
            </Button>
            <Button variant="outlined" color="inherit" onClick={() => navigate("/sales")} disabled={saving} sx={{ textTransform: "none" }}>Cancel</Button>
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: 2.5, border: `1px solid ${colors.primary}`, borderRadius: borderRadius.lg, boxShadow: shadows.sm, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography sx={{ fontSize: 17, fontWeight: 700, color: colors.primary }}>Invoice summary</Typography>
          {[
            ["Bill number", `#${sale.billNumber}`],
            ["Buyer", sale.buyerId?.name || "Buyer"],
            ["Invoice date", dayjs(sale.date).format("DD/MM/YYYY")],
            ["Source receipt", sale.stockId?.receiptNumber ? `#${sale.stockId.receiptNumber}` : "—"],
            ["Item amount", `Rs. ${calculations.goods.toLocaleString()}`],
            ["Bhardana", `Rs. ${calculations.bhardana.toLocaleString()}`],
            ["Already paid", `Rs. ${calculations.paid.toLocaleString()}`],
          ].map(([label, value]) => (
            <Box key={label} sx={{ display: "flex", justifyContent: "space-between", gap: 1, borderBottom: `1px dashed ${colors.border}`, pb: 1 }}>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
              <Typography variant="body2" fontWeight={600} textAlign="right">{value}</Typography>
            </Box>
          ))}
          <Box sx={{ borderTop: `2px solid ${colors.border}`, pt: 1.5, display: "flex", justifyContent: "space-between", gap: 1 }}>
            <Typography fontWeight={700}>New item total</Typography>
            <Typography fontWeight={750} color="primary.main">Rs. {calculations.total.toLocaleString()}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">Remaining after save</Typography>
            <Typography variant="body2" fontWeight={700}>Rs. {calculations.remaining.toLocaleString()}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            If this bill has any recorded payments, remove or correct them before editing its items.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default EditInvoice;
