import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : [
      "http://localhost:3000",
      "http://localhost:5173",
      process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "",
    ].filter(Boolean);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== "production") return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
