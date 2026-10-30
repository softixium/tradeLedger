import { colors } from "../../../../styles/theme";

export const updateStockStyles = () => ({
  container: {
    display: "flex",
    flexDirection: "column",
    padding: "20px",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors["100"],
    borderRadius: "8px",
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
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    width: "100%",
    maxWidth: "400px",
    paddingY: "20px",
  },
  button: {
    backgroundColor: colors["300"],
    fontWeight: "bold",
    color: colors["950"],
    "&:hover": { backgroundColor: colors["200"] },
  },
  summary: {
    marginTop: "20px",
    padding: "10px",
    backgroundColor: colors["200"],
    borderRadius: "8px",
  },
  summaryText: {
    fontWeight: "bold",
    marginBottom: "10px",
  },
  subTxt: {
    marginBottom: "5px",
  },
});
