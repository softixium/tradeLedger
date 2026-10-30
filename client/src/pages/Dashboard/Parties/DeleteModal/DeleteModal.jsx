import { Grid, Box, Button, Typography, Modal, CircularProgress } from "@mui/material";
import React, { useState } from "react";
import { deleteModalStyles } from "./deleteModalStyles";
import api from "../../../../api/axios";
import { toast } from "react-toastify";

const DeleteModal = ({ open, close, id, onSuccess }) => {
  const styles = deleteModalStyles();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);

      const { data } = await api.delete(`/party/${id}`);

      toast.success(data.message || "Party deleted successfully");

      close();
      if (onSuccess) onSuccess(); 
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid>
      <Modal open={open} onClose={close}>
        <Box sx={styles.modal}>
          <Typography sx={styles.mainHeading}>Confirm Delete</Typography>

          <Typography sx={styles.message}>
            Delete this party from your list? This can’t be undone. Parties linked to invoices, stock purchases, or payments can’t be deleted.
          </Typography>

          <Box sx={styles.buttonsContainer}>
            <Button
              sx={styles.delBtn}
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? <>
              <CircularProgress sx={styles.loading} aria-label="Loading…" />
              </> : "Delete Party"}
            </Button>

            <Button sx={styles.cancelBtn} onClick={close} disabled={loading}>
              Cancel
            </Button>
          </Box>
        </Box>
      </Modal>
    </Grid>
  );
};

export default DeleteModal;
