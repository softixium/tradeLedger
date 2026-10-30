import { colors, borderRadius, shadows } from "../../../styles/theme";

export const bankStyles = () => ({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    paddingBottom: "40px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
  },
  headerText: {
    fontSize: "24px",
    fontWeight: 700,
    color: colors.textPrimary,
    letterSpacing: "-0.5px",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },
  kpiCard: {
    padding: "24px",
    borderRadius: borderRadius.lg,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    boxShadow: shadows.sm,
    border: `1px solid ${colors.border}`,
  },
  kpiTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  kpiValue: {
    fontSize: "28px",
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: colors.textPrimary,
    marginBottom: "16px",
  },
  accountsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
  },
  accountCard: {
    padding: "24px",
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    boxShadow: shadows.sm,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "16px",
    transition: "transform 0.2s, box-shadow 0.2s",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: shadows.md,
    }
  },
  accountHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  accountName: {
    fontSize: "18px",
    fontWeight: 700,
    color: colors.textPrimary,
  },
  accountBalance: {
    fontSize: "24px",
    fontWeight: 700,
    color: colors.primary,
  },
  panel: {
    padding: "24px",
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.border}`,
  },
  tableContainer: {
    borderRadius: borderRadius.md,
    overflow: "auto",
    border: `1px solid ${colors.border}`,
    marginTop: "16px",
  },
  tableCell: {
    fontSize: "14px",
    padding: "16px",
    borderBottom: `1px solid ${colors.border}`,
  },
});
