import React, { useEffect, useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import api from "../../../../api/axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { updateStockStyles } from "./updateStockStyles";

const UpdateStock = () => {
    const styles = updateStockStyles();

  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState({
      remainingQuantity: "",
      remainingWeight: "",
  });

  const [weightPerKatta, setWeightPerKatta] = useState(0);

  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({});
  
  const [maxQuantity, setMaxQuantity] = useState(0);

  const fetchStock = async () => {
    try {
      setLoading(true);

      const { data } = await api.get(`/stock/stocks/${id}`);

      const stock = data.data;

      setMaxQuantity(stock.totalQuantity);
      setWeightPerKatta(stock.weightPerKatta);

      setForm({
        remainingQuantity: stock.remainingQuantity,
        remainingWeight: stock.remainingWeight,
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load stock");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === "remainingQuantity") {
        updated.remainingWeight =
          Number(value || 0) * Number(weightPerKatta || 0);
      }

      return updated;
    });
  };

  const validate = () => {
    let temp = {};

    if (!form.remainingQuantity) {
      temp.remainingQuantity = "Enter remaining quantity";
    } else if (Number(form.remainingQuantity) < 0) {
      temp.remainingQuantity = "Invalid quantity";
    }
    if (Number(form.remainingQuantity) > maxQuantity) {
      temp.remainingQuantity = `Remaining quantity cannot exceed ${maxQuantity}`;
    }

    setErrors(temp);

    return Object.keys(temp).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      await api.put(`/stock/stocks/update/${id}`, {
        remainingQuantity: Number(form.remainingQuantity),
        remainingWeight: Number(form.remainingWeight),
      });

      toast.success("Stock updated successfully");

      setTimeout(() => {
        navigate("/stocks");
      }, 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update stock");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);
  return (
    <Grid container sx={styles.container}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/stocks")} sx={{ alignSelf: "flex-start", textTransform: "none" }}>
        Back to Stock
      </Button>
      <Typography sx={styles.heading}>Update Stock</Typography>
      <Grid sx={styles.form}>
        {/* Remaining Quantity */}
        <TextField
          id="standard-basic"
          label="Remaining Quantity"
          variant="standard"
          name="remainingQuantity"
          value={form.remainingQuantity}
          onChange={handleChange}
          error={!!errors.remainingQuantity}
          helperText={errors.remainingQuantity}
          type="number"
        />

        {/* Remaining Weight */}
        <TextField
          id="standard-basic"
          label="Remaining Weight"
          variant="standard"
          name="remainingWeight"
          value={form.remainingWeight}
          onChange={handleChange}
          error={!!errors.remainingWeight}
          helperText={errors.remainingWeight}
          type="number"
          disabled
        />
        <Button sx={styles.button} onClick={handleSubmit} disabled={loading}>
          {loading ? "Updating..." : "Update Stock"}
        </Button>
      </Grid>
    </Grid>
  );
};
export default UpdateStock;
