import React, { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { addPartyStyle } from "./addPartyStyles";
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
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const AddParty = () => {
  const styles = addPartyStyle();
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (event) => {
    setType(event.target.value);
  };

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const handleChangeInput = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddParty = async () => {
    if (!form.name || !type || !form.phone || !form.address) {
      toast.error("All fields are required");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...form,
        type,
      };

      await api.post("/party/create", payload);

      toast.success("Party added successfully ");

      // reset form
      setForm({
        name: "",
        phone: "",
        address: "",
      });
      setType("");

      navigate("/parties");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add party");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Grid container sx={styles.container}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/parties")} sx={{ alignSelf: "flex-start", textTransform: "none" }}>
        Back to Parties
      </Button>
      <Typography sx={styles.heading}>Add Party</Typography>
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
          <Select
            labelId="party-type-label"
            id="party-type"
            label="Type"
            value={type}
            onChange={handleChange}
            name="type"
          >
            <MenuItem value={"Miller"}>Miller</MenuItem>
            <MenuItem value={"Buyer"}>Buyer</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" fullWidth sx={styles.button} onClick={handleAddParty} disabled={loading}>
          Add Party
        </Button>
      </Grid>
    </Grid>
  );
};

export default AddParty;
