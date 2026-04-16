import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "HealthBridge Backend is running",
      database: "Firebase (Primary)"
    });
  });

  // User Session Tracking
  app.post("/api/auth/session", (req, res) => {
    const { uid, email } = req.body;
    console.log(`[Backend] User session initialized: ${email} (${uid})`);
    res.json({ status: "success", message: "Session tracked on backend" });
  });

  // Aadhar Verification Proxy (Surepass API)
  const SUREPASS_API_KEY = "key_live_1855a8a045ac48c28a65aa9cdb9d54b6";
  console.log(`[Backend] Using Surepass API Key: ${SUREPASS_API_KEY.substring(0, 10)}...`);

  app.post("/api/aadhar/generate-otp", async (req, res) => {
    try {
      const { id_number } = req.body;
      const response = await fetch("https://kyc-api.surepass.io/api/v1/aadhaar-v2/generate-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUREPASS_API_KEY}`
        },
        body: JSON.stringify({ id_number })
      });
      const data = await response.json();
      res.status(response.status).json({ ...data, debug_key: SUREPASS_API_KEY.substring(0, 10) + "..." });
    } catch (error) {
      console.error("Aadhar Generate OTP Error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  app.post("/api/aadhar/submit-otp", async (req, res) => {
    try {
      const { otp, client_id } = req.body;
      const response = await fetch("https://kyc-api.surepass.io/api/v1/aadhaar-v2/submit-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUREPASS_API_KEY}`
        },
        body: JSON.stringify({ otp, client_id })
      });
      const data = await response.json();
      res.status(response.status).json({ ...data, debug_key: SUREPASS_API_KEY.substring(0, 10) + "..." });
    } catch (error) {
      console.error("Aadhar Submit OTP Error:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
