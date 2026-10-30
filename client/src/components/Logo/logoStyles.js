export const logoStyle = () => {
  return {
    container: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      cursor: "pointer",
      userSelect: "none",
    },

    iconBox: {
      width: "auto",
      height: 46,
      borderRadius: "12px",
      background: "linear-gradient(135deg, #38bdf8, #6366f1, #0ea5e9)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0px 4px 12px rgba(56, 189, 248, 0.4)",
    },

    iconText: {
      color: "#fff",
      fontWeight: 800,
      fontSize: "16px",
      padding: "0 12px",
    },
  };
};
