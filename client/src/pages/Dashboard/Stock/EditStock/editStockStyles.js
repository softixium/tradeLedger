import { colors } from "../../../../styles/theme";

export const editStockStyle = () => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
    maxWidth: "860px",
    margin: "0 auto",
    padding: { xs: "20px", sm: "32px" },
    alignItems: "stretch",
    backgroundColor: "#FFFFFF",
    border: `1px solid ${colors.border}`,
    borderRadius: "16px",
    boxShadow: "0 8px 28px rgba(15, 23, 42, 0.08)",
  },
  heading: {
    fontSize: "24px",
    fontWeight: "bold",
  },
  date: {
    width: "100%",
    maxWidth: "400px",
    marginBottom: "20px",
  },
  
  form: {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
    gap: "20px",
    width: "100%",
    paddingY: "12px",
  },
  summary: {
    gridColumn: { xs: "auto", sm: "1 / -1" },
    marginTop: "20px",
    padding: "10px",
    backgroundColor: colors["200"],
    borderRadius: "8px",
  },
  button: {
    gridColumn: { xs: "auto", sm: "1 / -1" },
    backgroundColor: colors["300"],
    fontWeight: "bold",
    color: colors["950"],
    "&:hover": { backgroundColor: colors["200"] },
  },
  summaryText: {
    fontWeight: "bold",
    marginBottom: "10px",
  },
  subTxt: {
    marginBottom: "5px",
  },
});
