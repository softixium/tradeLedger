import { colors } from "../../../../styles/theme";

export const editPartyStyle = () => ({
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
  loading: {
    color: colors["950"],
  },
});
