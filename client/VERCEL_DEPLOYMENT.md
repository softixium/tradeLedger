# Deploy the frontend to Vercel

Import this GitHub repository as a new Vercel project and set:

| Setting | Value |
| --- | --- |
| Root Directory | `client` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` (default) |

Add `VITE_API_URL` in the Vercel project's Environment Variables for Production (and Preview if needed):

```text
https://trade-ledger-flax.vercel.app/api
```

Vite embeds environment values at build time, so redeploy after adding or changing this variable. The source also uses this backend URL as its fallback. Once Vercel assigns the frontend a domain, add that exact origin to `FRONTEND_URL` in the backend project's Production environment and redeploy the backend so its CORS allowlist includes the frontend.
