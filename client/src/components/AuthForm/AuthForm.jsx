import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Brand from "../Brand/Brand";
import api from "../../api/axios";
import { colors } from "../../styles/theme";

const usernamePattern = /^[a-zA-Z0-9._-]{3,30}$/;

const AuthForm = ({ mode = "login" }) => {
  const isSignup = mode === "signup";
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", lastName: "", username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("user")) navigate("/", { replace: true });
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: name === "username" ? value.replace(/\s/g, "") : value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setFormError("");
  };

  const validate = () => {
    const nextErrors = {};
    if (isSignup && !form.firstName.trim()) nextErrors.firstName = "First name is required.";
    if (isSignup && !form.lastName.trim()) nextErrors.lastName = "Last name is required.";
    if (!form.username.trim()) nextErrors.username = "Username is required.";
    else if (isSignup && !usernamePattern.test(form.username.trim())) nextErrors.username = "Use 3–30 letters, numbers, dots, underscores, or hyphens.";
    if (!form.password) nextErrors.password = "Password is required.";
    else if (isSignup && form.password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    else if (form.password.length > 72) nextErrors.password = "Password must be 72 characters or fewer.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || !validate()) return;
    setLoading(true);
    setFormError("");
    try {
      const payload = isSignup
        ? { firstName: form.firstName.trim(), lastName: form.lastName.trim(), username: form.username.trim().toLowerCase(), password: form.password }
        : { username: form.username.trim().toLowerCase(), password: form.password };
      const { data } = await api.post(isSignup ? "/auth/signup" : "/auth/login", payload);
      localStorage.setItem("user", JSON.stringify(data));
      navigate("/", { replace: true });
    } catch (error) {
      setFormError(error.response?.data?.message || (isSignup ? "Your account could not be created." : "We could not sign you in. Check your username and password."));
    } finally {
      setLoading(false);
    }
  };

  const fieldSx = {
    "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: "#fff" },
  };

  return (
    <Box sx={{ minHeight: "100%", width: "100%", display: "grid", placeItems: "center", px: { xs: 2, sm: 3 }, py: { xs: 3, sm: 5 }, bgcolor: "#F4F7FB", backgroundImage: "radial-gradient(circle at 12% 10%, rgba(37,99,235,.08), transparent 32%), radial-gradient(circle at 90% 90%, rgba(15,23,42,.05), transparent 28%)" }}>
      <Box sx={{ width: "100%", maxWidth: 440 }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}><Brand /></Box>
        <Paper component="form" onSubmit={handleSubmit} elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, border: `1px solid ${colors.border}`, borderRadius: 3, boxShadow: "0 18px 55px rgba(15,23,42,.08)" }}>
          <Box sx={{ mb: 3 }}>
            <Typography sx={{ fontSize: 25, fontWeight: 750, color: colors.textPrimary, letterSpacing: "-.5px" }}>{isSignup ? "Create your account" : "Welcome back"}</Typography>
            <Typography sx={{ color: colors.textSecondary, mt: 0.75, fontSize: 14 }}>{isSignup ? "Set up your business workspace in a few steps." : "Sign in to continue to your business workspace."}</Typography>
          </Box>

          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

          {isSignup && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, mb: 1.5 }}>
              <TextField label="First name" name="firstName" autoComplete="given-name" value={form.firstName} onChange={handleChange} error={!!errors.firstName} helperText={errors.firstName || " "} fullWidth required sx={fieldSx} />
              <TextField label="Last name" name="lastName" autoComplete="family-name" value={form.lastName} onChange={handleChange} error={!!errors.lastName} helperText={errors.lastName || " "} fullWidth required sx={fieldSx} />
            </Box>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <TextField
              label="Username"
              name="username"
              placeholder="yourname"
              autoComplete="username"
              value={form.username}
              onChange={handleChange}
              error={!!errors.username}
              helperText={errors.username || (isSignup ? "3–30 characters; letters, numbers, . _ -" : " ")}
              slotProps={{ htmlInput: { maxLength: 30, autoCapitalize: "none", spellCheck: false }}}
              fullWidth
              required
              sx={fieldSx}
            />
            <TextField
              label="Password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={form.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password || (isSignup ? "At least 8 characters." : " ")}
              fullWidth
              required
              sx={fieldSx}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} edge="end">
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ mt: 2.5, minHeight: 46, borderRadius: 1.5, textTransform: "none", fontSize: 15, fontWeight: 700, boxShadow: "none" }}>
            {loading ? <CircularProgress size={21} color="inherit" /> : isSignup ? "Create account" : "Sign in"}
          </Button>

          <Typography sx={{ mt: 2.5, textAlign: "center", color: colors.textSecondary, fontSize: 14 }}>
            {isSignup ? "Already have an account? " : "New to TradeLedger? "}
            <Link to={isSignup ? "/login" : "/signup"} style={{ color: colors.primary, fontWeight: 700, textDecoration: "none" }}>
              {isSignup ? "Sign in" : "Create an account"}
            </Link>
          </Typography>
        </Paper>
        <Typography sx={{ textAlign: "center", mt: 2, color: colors.textMuted, fontSize: 12 }}>Secure access to your business records</Typography>
      </Box>
    </Box>
  );
};

export default AuthForm;
