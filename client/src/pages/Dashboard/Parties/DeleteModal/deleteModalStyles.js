import { colors } from "../../../../styles/theme";

export const deleteModalStyles = () => ({
  modal: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,

    background: colors["100"],

    border: `1px solid ${colors["300"]}`,
    boxShadow: 24,
    p: 4,
    borderRadius: "8px",
  },

  mainHeading: {
    fontSize: "20px",
    fontWeight: "bold",
    textAlign: "center",
    color: colors["950"],
  },

  message: {
    fontSize: "16px",
    textAlign: "center",
    marginTop: "16px",
    color: colors["950"],
  },
  buttonsContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
    marginTop: "24px",
  },
  delBtn: {
    backgroundColor: colors["300"],
    fontWeight: "bold",
    color: colors["950"],
  },
  cancelBtn: {
    backgroundColor: colors["200"],
    fontWeight: "bold",
    color: colors["950"],
  },
  loading: {
    color: colors["950"],
  },
});
