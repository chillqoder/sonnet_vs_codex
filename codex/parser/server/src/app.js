import cors from "cors";
import express from "express";
import helmet from "helmet";
import { searchRouter } from "./routes/search.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: true,
    credentials: false
  })
);
app.use(express.json({ limit: "500kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", searchRouter);

app.use((err, _req, res, _next) => {
  res.status(500).json({
    error: "Search failed",
    message: err?.message ?? "Unexpected error"
  });
});

export { app };
