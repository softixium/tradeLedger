import app from "../app.js";
import connectDB from "../config/db.js";

await connectDB();

export default app;
