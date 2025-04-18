import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import ExpressMongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import cors from "cors";
import healthRoute from './routes/health.route.js'
import userRoute from './routes/user.route.js'
dotenv.config();

const app = express();
const PORT = process.env.PORT;

//Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Lnpm initimit each IP to 100 requests per `window` (here, per 15 minutes).
  message: "Too many request from this IP, please try later",
});

//Security middleware
app.use(helmet());
app.use(ExpressMongoSanitize());
app.use(hpp());

app.use("/api", limiter);

//logging middleware
if (process.env.NODE_ENV === "devlopment") {
  app.use(morgan("dev"));
}

//Body Parser Middleware
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());
//Global Handlar
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal Server Error",
    ...PORT(process.env.NODE_ENV === "devlopment" && { stack: err.stack }),
  });
});

//CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTION"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "device-remember-token",
      "Access-Control-Allow-Origin",
      "Origin",
      "Accept",
    ],
  })
);

//API Rutes 

//API Routes
app.use("/health", healthRoute)
app.use("/api/v1/user", userRoute)

// it should be always at bottom
//404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at ${PORT} in ${process.env.NODE_ENV}`);
});
