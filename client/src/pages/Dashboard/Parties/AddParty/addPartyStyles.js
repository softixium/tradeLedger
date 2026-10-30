import { colors, borderRadius, shadows } from "../../../../styles/theme";

export const addPartyStyle = () => ({
  container: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxWidth: "620px",
    margin: "8px auto 24px",
    padding: { xs: "20px", sm: "28px" },
    gap: "20px",
    alignItems: "center",
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
  },
  heading: {
    fontSize: "24px",
    fontWeight: 700,
    color: colors.textPrimary,
    letterSpacing: "-0.4px",
  },
  header: {
    width: "100%",
    textAlign: "center",
  },
  description: {
    marginTop: "4px",
    color: colors.textSecondary,
    fontSize: "14px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
    width: "100%",
    maxWidth: "440px",
  },
  button: {
    minHeight: "46px",
    fontWeight: 700,
    textTransform: "none",
  },
});
