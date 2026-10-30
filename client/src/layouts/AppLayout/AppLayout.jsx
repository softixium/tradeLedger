import Grid from "@mui/material/Grid";
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  IconButton,
  Backdrop,
  Button,
  Avatar,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import LogoutIcon from "@mui/icons-material/Logout";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import InventoryIcon from "@mui/icons-material/Inventory";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PaymentsIcon from "@mui/icons-material/Payments";
import AssessmentIcon from "@mui/icons-material/Assessment";
import Brand from "../../components/Brand/Brand";

import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";

import { appLayoutStyle } from "./appLayoutStyles";
import { ExtraSmallMobileView, SmallMobileView } from "../../styles/theme";

export default function AppLayout() {
  const isMobileView = useMediaQuery(SmallMobileView);
  const isSmallMobileView = useMediaQuery(ExtraSmallMobileView);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const styles = appLayoutStyle(isMobileView, isSmallMobileView);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const user = localStorage.getItem("user");
  const userData = user ? JSON.parse(user) : null;
  const userName = userData ? userData.name : "Guest";
  const userInitials = userName.substring(0, 2).toUpperCase();

  const menuItems = [
    { text: "Dashboard", path: "/", icon: <DashboardIcon /> },
    { text: "Parties", path: "/parties", icon: <PeopleIcon /> },
    { text: "Stock", path: "/stocks", icon: <InventoryIcon /> },
    { text: "Sales", path: "/sales", icon: <PointOfSaleIcon /> },
    { text: "Payments", path: "/payments", icon: <ReceiptIcon /> },
    { text: "Bank & Accounts", path: "/bank", icon: <AccountBalanceIcon /> },
    { text: "Expenses", path: "/expenses", icon: <PaymentsIcon /> },
    { text: "Reports", path: "/reports", icon: <AssessmentIcon /> },
  ];

  const currentDate = dayjs().format("dddd, DD/MM/YYYY");

  return (
    <Box sx={styles.mainContainer}>
      {/* BACKDROP FOR MOBILE */}
      {isMobileView && (
        <Backdrop
          sx={styles.backdrop}
          open={sidebarOpen}
          onClick={handleCloseSidebar}
        />
      )}

      {/* SIDEBAR */}
      <Box sx={styles.sidebarWrapper(sidebarOpen)}>
        <Box sx={styles.logoContainer}>
          <Brand light />
          {isMobileView && (
            <IconButton onClick={handleCloseSidebar} sx={styles.closeButton}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>

        {/* User Profile Area */}
        <Box sx={styles.userProfileContainer}>
          <Avatar sx={styles.userAvatar}>{userInitials}</Avatar>
          <Box>
            <Typography sx={styles.userName}>{userName}</Typography> 
            <Typography sx={styles.userRole}>Administrator</Typography>
          </Box>
        </Box>
        <Divider sx={styles.divider} />

        <List sx={{ flexGrow: 1, pt: 2 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <ListItemButton
                key={item.text}
                component={Link}
                to={item.path}
                sx={styles.menuItem(isActive)}
                onClick={handleCloseSidebar}
              >
                <ListItemIcon sx={styles.menuIcon(isActive)}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  slotProps={{ primary: { sx: { fontWeight: isActive ? 600 : 500 } } }}
                />
              </ListItemButton>
            );
          })}
        </List>

        <Button
          sx={styles.logoutButton}
          onClick={handleLogout}
          startIcon={<LogoutIcon />}
          fullWidth
        >
          Logout
        </Button>
      </Box>

      {/* MAIN CONTENT */}
      <Box sx={styles.contentWrapper}>
        {/* TOPBAR */}
        <Box sx={styles.topbar}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {isMobileView && (
              <IconButton onClick={handleSidebarToggle} sx={styles.menuButton}>
                <MenuIcon />
              </IconButton>
            )}
            <Box>
              <Typography sx={styles.pageTitle}>
                {menuItems.find(i => i.path === location.pathname || (i.path !== "/" && location.pathname.startsWith(i.path)))?.text || "Dashboard"}
              </Typography>
              {!isSmallMobileView && (
                <Typography sx={styles.dateSubtitle}>{currentDate}</Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* PAGE CONTENT */}
        <Box sx={styles.outletContainer}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
