import { Grid } from "@mui/material";
import { Outlet } from "react-router-dom";
import { authLayoutStyle } from "./authLayoutStyles";

export default function AuthLayout() {
  const styles = authLayoutStyle();
  return (
    <Grid sx={styles.container}>
      <Outlet />
    </Grid>
  );
}
