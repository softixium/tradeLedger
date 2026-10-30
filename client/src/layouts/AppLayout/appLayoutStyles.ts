import { colors, shadows, borderRadius } from "../../styles/theme";

export const appLayoutStyle = (
  isMobileView: boolean,
  isSmallMobileView: boolean,
) => ({
  mainContainer: {
    width: "100%",
    minHeight: "100vh",
    height: "100dvh",
    backgroundColor: colors.background,
    display: "flex",
    overflow: "hidden",
    minWidth: 0,
    position: "relative",
  },

  backdrop: {
    position: "fixed",
    zIndex: 1200,
    backgroundColor: "rgba(15, 23, 42, 0.6)", // Darker backdrop
    backdropFilter: "blur(2px)",
  },

  sidebarWrapper: (sidebarOpen: boolean) => ({
    backgroundColor: colors.secondary, // Dark Navy
    color: colors.white,
    padding: isSmallMobileView ? "20px 16px" : "24px 20px",
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    overflowY: "auto",
    width: isMobileView ? "280px" : "260px",
    flex: isMobileView ? undefined : "0 0 260px",
    position: isMobileView ? "fixed" : "relative",
    left: 0,
    top: 0,
    zIndex: 1300,
    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    transform: isMobileView
      ? `translateX(${sidebarOpen ? "0" : "-100%"})`
      : "translateX(0)",
    boxShadow: isMobileView ? shadows.xl : "none",
  }),

  logoContainer: {
    marginBottom: "32px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logoText: {
    fontSize: "22px",
    fontWeight: 700,
    color: colors.white,
    letterSpacing: "-0.5px",
  },

  closeButton: {
    display: isMobileView ? "flex" : "none",
    color: colors.textMuted,
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.1)",
    },
  },

  userProfileContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    padding: "8px 0",
  },

  userAvatar: {
    bgcolor: colors.primary,
    color: colors.white,
    width: 40,
    height: 40,
    fontWeight: 600,
    fontSize: "16px",
  },

  userName: {
    fontSize: "15px",
    fontWeight: 600,
    color: colors.white,
    lineHeight: 1.2,
  },

  userRole: {
    fontSize: "12px",
    color: colors.textMuted,
    marginTop: "2px",
  },

  divider: {
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: "16px",
  },

  menuItem: (isActive: boolean) => ({
    borderRadius: borderRadius.md,
    marginBottom: "4px",
    padding: "10px 16px",
    color: colors.white,
    backgroundColor: isActive ? colors.primary : "transparent",
    "& .MuiListItemText-primary": {
      color: colors.white,
    },
    "&:hover": {
      backgroundColor: isActive ? colors.primary : "rgba(255,255,255,0.05)",
      color: colors.white,
    },
    transition: "all 0.2s ease",
  }),

  menuIcon: (isActive: boolean) => ({
    minWidth: "40px",
    color: colors.white,
  }),

  logoutButton: {
    marginTop: "auto",
    color: colors.errorLight,
    justifyContent: "flex-start",
    padding: "10px 16px",
    textTransform: "none",
    fontWeight: 500,
    borderRadius: borderRadius.md,
    "&:hover": {
      backgroundColor: "rgba(220, 38, 38, 0.1)", // Light red hover
      color: colors.errorLight,
    },
  },

  contentWrapper: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    padding: isSmallMobileView ? "12px" : "24px",
    width: isMobileView ? "100%" : "auto",
    height: "100dvh",
    overflow: "hidden",
  },

  topbar: {
    minHeight: "64px",
    backgroundColor: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: isSmallMobileView ? "12px" : "20px",
    padding: "0 4px",
  },

  menuButton: {
    color: colors.textPrimary,
    display: isMobileView ? "flex" : "none",
    backgroundColor: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.md,
    "&:hover": {
      backgroundColor: colors.surfaceMuted,
    },
  },

  pageTitle: {
    fontSize: isSmallMobileView ? "20px" : "24px",
    fontWeight: 700,
    color: colors.textPrimary,
    letterSpacing: "-0.5px",
  },

  dateSubtitle: {
    fontSize: "13px",
    color: colors.textSecondary,
    fontWeight: 500,
    marginTop: "2px",
  },

  outletContainer: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    minHeight: 0,
    overflowY: "auto",
    padding: "0 8px 24px 0",
    marginRight: "-8px",
  },
});
