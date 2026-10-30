# Deploy the backend to Vercel

Create a new Vercel project from this GitHub repository and use these settings:

| Setting | Value |
| --- | --- |
| Root Directory | `server` |
| Framework Preset | Other (Vercel can detect the Express app from `server.js`) |
| Build Command | Leave the project setting at **Override** / use the value from `vercel.json`: `npm run migrate:receipt-indexes && npm run migrate:username-auth` |
| Output Directory | Leave empty / default |
| Install Command | `npm install` (default) |

Add these Environment Variables for **Production** (and Preview too if you will test preview deployments):

| Name | Value |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string for the production database |
| `JWT_SECRET` | A long, random secret used to sign login tokens; do not reuse a public/example value |
| `FRONTEND_URL` | Exact deployed frontend origin, e.g. `https://your-frontend.vercel.app` (no `/api` and no trailing slash) |

The build command runs the two existing database migrations, so `MONGODB_URI` must be configured for the deployment environment before the first build. In MongoDB Atlas, ensure the database user/password in the URI are correct and the network access rules permit Vercel's connections (for a quick setup Atlas commonly uses `0.0.0.0/0`; use stronger network controls if your Atlas plan/setup supports them).

After adding or changing environment variables, redeploy. Check `https://<backend-domain>/` for `{ "status": "ok", ... }`. The API routes are under `/api` (for example `/api/auth`). Set the frontend project's `VITE_API_URL` to `https://<backend-domain>/api`, then redeploy the frontend because Vite embeds that value at build time.

Never commit `.env` or paste its contents into chat. `.env.example` lists the required variable names without real credentials.
