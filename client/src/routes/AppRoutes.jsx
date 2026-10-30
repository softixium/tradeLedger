import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import GuestRoute from "./GuestRoute";

const Login = lazy(() => import("../pages/Login/Login"));
const Signup = lazy(() => import("../pages/Signup/Signup"));
const Dashboard = lazy(() => import("../pages/Dashboard/Dashboard"));
const Parties = lazy(() => import("../pages/Dashboard/Parties/Parties"));
const AddParty = lazy(() => import("../pages/Dashboard/Parties/AddParty/AddParty"));
const EditParty = lazy(() => import("../pages/Dashboard/Parties/EditParty/EditParty"));
const PartyDetails = lazy(() => import("../pages/Dashboard/Parties/PartyDetails/PartyDetails"));
const AuthLayout = lazy(() => import("../layouts/AuthLayout/AuthLayout"));
const AppLayout = lazy(() => import("../layouts/AppLayout/AppLayout"));
const AddStock = lazy(() => import("../pages/Dashboard/Stock/AddStock/AddStock"));
const Stock = lazy(() => import("../pages/Dashboard/Stock/Stock"));
const EditStock = lazy(() => import("../pages/Dashboard/Stock/EditStock/EditStock"));
const UpdateStock = lazy(() => import("../pages/Dashboard/Stock/UpdateStock/UpdateStock"));
const Sales = lazy(() => import("../pages/Dashboard/Sales/Sales"));
const CreateInvoice = lazy(() => import("../pages/Dashboard/Sales/createInvoice/CreateInvoice"));
const EditInvoice = lazy(() => import("../pages/Dashboard/Sales/EditInvoice/EditInvoice"));
const Payments = lazy(() => import("../pages/Dashboard/Payments/Payments"));
const BankAccounts = lazy(() => import("../pages/Dashboard/Bank/BankAccounts"));
const Expenses = lazy(() => import("../pages/Dashboard/Expenses/Expenses"));
const Reports = lazy(() => import("../pages/Dashboard/Reports/Reports"));

const RouteLoader = () => <div className="route-loader">Loading...</div>;

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
      {/* Public Routes */}
      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/parties/add" element={<AddParty />} />
          <Route path="/parties/edit/:id" element={<EditParty />} />
          <Route path="/parties/:id" element={<PartyDetails />} />
          <Route path="/stocks/add" element={<AddStock />} />
          <Route path="/stocks/edit/:id" element={<EditStock />} />
          <Route path="/stocks/update/:id" element={<UpdateStock />} />
          <Route path="/stocks" element={<Stock />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/createInvoice" element={<CreateInvoice />} />
          <Route path="/sales/edit/:id" element={<EditInvoice />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/bank" element={<BankAccounts />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Route>
      </Routes>
    </Suspense>
  );
}
