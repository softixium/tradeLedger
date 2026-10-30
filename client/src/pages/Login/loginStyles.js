import { colors, borderRadius, shadows } from "../../styles/theme";

export const loginStyles = (mobileView) => ({
  pageWrapper: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    backgroundColor: colors.background,
  },
  leftPanel: {
    flex: 1,
    backgroundColor: colors.secondary,
    display: mobileView ? "none" : "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
    color: colors.white,
  },
  brandingTitle: {
    fontSize: "36px",
    fontWeight: 700,
    marginBottom: "16px",
    letterSpacing: "-1px",
  },
  brandingSubtitle: {
    fontSize: "18px",
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: "400px",
  },
  rightPanel: {
    flex: mobileView ? 1 : "0 0 500px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
    backgroundColor: colors.white,
    boxShadow: mobileView ? "none" : shadows.xl,
    zIndex: 1,
  },
  formWrapper: {
    width: "100%",
    maxWidth: "400px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  headerBox: {
    marginBottom: "8px",
    textAlign: mobileView ? "center" : "left",
  },
  title: {
    fontSize: "28px",
    fontWeight: 700,
    color: colors.textPrimary,
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "15px",
    color: colors.textSecondary,
  },
  formContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  loginButton: {
    padding: "12px",
    fontSize: "16px",
    marginTop: "8px",
  },
  loginText: {
    fontSize: "14px",
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: "16px",
  },
  loginLink: {
    color: colors.primary,
    textDecoration: "none",
    fontWeight: 600,
    "&:hover": {
      textDecoration: "underline",
    },
  },
});
