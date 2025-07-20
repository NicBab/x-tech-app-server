import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

/*ROUTE IMPORTS*/
import authRoutes from "./routes/authRoutes"
import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";

/* CONFIGURATIONS */
dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(cors());

  /* ROUTES */
app.use("/users", userRoutes);
  /*AUTH*/
app.use("/api/auth", authRoutes);
  /*CONTROLLERS*/
app.use("/products", productRoutes); // http://localhost:8000/products


/* SERVER */
const port = Number(process.env.PORT) || 3001;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
