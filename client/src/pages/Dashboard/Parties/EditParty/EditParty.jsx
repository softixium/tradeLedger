import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import React, { useState, useEffect } from "react";
import { addPartyStyle } from "../AddParty/addPartyStyles";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../../api/axios";
import { toast } from "react-toastify";

const EditParty = () => {
  const styles = addPartyStyle();
  const navigate = useNavigate();
  const { id } = useParams();

  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const fetchParty = async () => {
    try {
      setLoading(true);

      const { data } = await api.get(`/party/${id}`);

      setForm({
        name: data.data.name || "",
        phone: data.data.phone || "",
        address: data.data.address || "",
      });

      setType(data.data.type || "");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load party");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParty();
  }, [id]);

  const handleChangeInput = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleChange = (event) => {
    setType(event.target.value);
  };

  const handleEditParty = async () => {
    try {
      setLoading(true);

      const { data } = await api.put(`/party/${id}`, {
        ...form,
        type,
      });

      toast.success(data.message || "Party updated successfully");

      navigate("/parties");
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container sx={styles.container}>
      <Box sx={{ width: "100%", maxWidth: 520, mb: 1 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/parties")} sx={{ textTransform: "none" }}>
          Back to Parties
        </Button>
      </Box>
      <Box sx={styles.header}>
        <Typography sx={styles.heading}>Edit Party</Typography>
        <Typography sx={styles.description}>Update this party’s contact details and account type.</Typography>
      </Box>

      <Grid sx={styles.form}>
        <TextField
          id="party-name"
          label="Name"
          variant="outlined"
          fullWidth
          name="name"
          value={form.name}
          onChange={handleChangeInput}
        />

        <TextField
          id="party-phone"
          label="Phone Number"
          variant="outlined"
          fullWidth
          name="phone"
          value={form.phone}
          onChange={handleChangeInput}
        />

        <TextField
          id="party-address"
          label="Address"
          variant="outlined"
          fullWidth
          name="address"
          value={form.address}
          onChange={handleChangeInput}
        />

        <FormControl variant="outlined" fullWidth>
          <InputLabel id="party-type-label">Type</InputLabel>
          <Select labelId="party-type-label" id="party-type" label="Type" name="type" value={type} onChange={handleChange}>
            <MenuItem value={"Miller"}>Miller</MenuItem>
            <MenuItem value={"Buyer"}>Buyer</MenuItem>
          </Select>
        </FormControl>

        <Button variant="contained" fullWidth sx={styles.button} onClick={handleEditParty} disabled={loading || !form.name || !form.phone || !form.address || !type}>
          {loading ? (
            <>
              <CircularProgress sx={styles.loading} aria-label="Loading…" />
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </Grid>
    </Grid>
  );
};

export default EditParty;
