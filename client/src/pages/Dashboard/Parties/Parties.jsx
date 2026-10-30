import {
  Button,
  CircularProgress,
  IconButton,
  Typography,
  useMediaQuery,
  Box,
  Tooltip,
  TextField,
  InputAdornment,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { partiesStyle } from "./partiesStyles";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import { SmallMobileView, colors } from "../../../styles/theme";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../api/axios";
import ArrowRightAltIcon from "@mui/icons-material/ArrowRightAlt";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from '@mui/icons-material/Delete';

import LocalPhoneIcon from "@mui/icons-material/LocalPhone";
import DeleteModal from "./DeleteModal/DeleteModal";

const Parties = () => {
  const mobileView = useMediaQuery(SmallMobileView);
  const styles = partiesStyle(mobileView);
  const navigate = useNavigate();

  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
  };
  const handleOpenDeleteModal = (id) => {
    setSelectedId(id);
    setDeleteModalOpen(true);
  };

  const handleAddParty = () => {
    navigate("/parties/add");
  };

  const fetchParties = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/party");
      // Sort newest first by createdAt
      const sorted = (data.data || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setParties(sorted);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch parties");
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    fetchParties();
  };

  useEffect(() => {
    fetchParties();
  }, []);

  // Filter parties by search query
  const filteredParties = parties.filter((party) =>
    party.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box>
      <Box sx={styles.top}>
        <Box>
          <Typography sx={styles.heading}>Parties Directory</Typography>
          <Typography variant="body2" color="textSecondary">Manage your buyers and suppliers</Typography>
        </Box>
        <Button
          sx={styles.button}
          startIcon={mobileView ? null : <AddIcon />}
          onClick={handleAddParty}
        >
          {mobileView ? "Add" : "Add New Party"}
        </Button>
      </Box>

      {/* Search Bar */}
      <Box sx={{ marginBottom: "20px" }}>
        <TextField
          placeholder="Search party by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          fullWidth
          slotProps={{ input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: colors.textSecondary }} />
              </InputAdornment>
            ),
          }}}
          sx={{
            maxWidth: "400px",
            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              backgroundColor: colors.surface,
            },
          }}
        />
      </Box>

      <Box sx={styles.partiesContainer}>
        {loading ? (
          <Box sx={styles.loadingCont}>
            <CircularProgress />
          </Box>
        ) : filteredParties.length === 0 ? (
          <Box sx={styles.noPartiesCont}>
            <Typography sx={styles.noPartiesText}>
              {searchQuery
                ? `No parties found matching "${searchQuery}".`
                : 'No parties found. Click "Add New Party" to create one.'}
            </Typography>
          </Box>
        ) : (
          <Box sx={styles.partyCont}>
            {filteredParties.map((party) => (
              <Box key={party._id} sx={styles.partyCard}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                  <Box>
                    <Typography sx={styles.name}>{party.name}</Typography>
                    <Typography 
                      sx={party.type.toLowerCase() === "buyer" ? styles.chipBuyer : styles.chipMiller}
                      style={{ display: "inline-block", marginTop: "8px" }}
                    >
                      {party.type}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title="Edit Party">
                      <IconButton
                        size="small"
                        sx={{ color: colors.textSecondary, bgcolor: colors.surfaceMuted }}
                        onClick={() => navigate(`/parties/edit/${party._id}`)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Party">
                      <IconButton
                        size="small"
                        sx={{ color: colors.error, bgcolor: colors.errorLight }}
                        onClick={() => handleOpenDeleteModal(party._id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Typography sx={styles.phone}>
                  <LocalPhoneIcon fontSize="small" sx={{ color: colors.textSecondary }} /> 
                  {party.phone || "No phone added"}
                </Typography>

                <Button
                  sx={styles.detailButton}
                  endIcon={<ArrowRightAltIcon />}
                  disableRipple
                  onClick={() => navigate(`/parties/${party._id}`)}
                >
                  View Details
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      <DeleteModal
        open={deleteModalOpen}
        close={handleCloseDeleteModal}
        onSuccess={handleSuccess}
        id={selectedId}
      />
    </Box>
  );
};

export default Parties;
