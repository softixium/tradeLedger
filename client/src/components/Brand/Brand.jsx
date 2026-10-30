import { Box, Typography } from "@mui/material";
import InventoryIcon from "@mui/icons-material/Inventory";

const Brand = ({ light = false, compact = false }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
    <Box sx={{
      width: 38,
      height: 38,
      flex: "0 0 auto",
      display: "grid",
      placeItems: "center",
      borderRadius: 1.5,
      color: "#fff",
      bgcolor: "#2563EB",
      boxShadow: "0 5px 14px rgba(37, 99, 235, 0.25)",
    }}>
      <InventoryIcon sx={{ fontSize: 22 }} />
    </Box>
    {!compact && (
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: light ? "#fff" : "#0F172A", fontSize: 18, fontWeight: 750, lineHeight: 1.15, letterSpacing: "-0.35px", whiteSpace: "nowrap" }}>
          TradeLedger
        </Typography>
        <Typography sx={{ color: light ? "rgba(255,255,255,.65)" : "#64748B", fontSize: 10, fontWeight: 600, letterSpacing: ".8px", textTransform: "uppercase", mt: 0.25 }}>
          Business Management
        </Typography>
      </Box>
    )}
  </Box>
);

export default Brand;
