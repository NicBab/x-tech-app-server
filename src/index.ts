import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

/*ROUTE IMPORTS*/
import authRoutes from "./routes/authRoutes"
import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import dlrRoutes from "./routes/dlrRoutes"
import timesRoutes from "./routes/timesRoutes";

/* CONFIGURATIONS */
dotenv.config();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(cors());


  /*AUTH ROUTES*/
app.use("/api/auth", authRoutes);
  /* ROUTES */
app.use("/users", userRoutes);
app.use("/products", productRoutes); // http://localhost:8000/products
app.use("/dlrs", dlrRoutes)
app.use("/times", timesRoutes);

  



/* SERVER */
const port = Number(process.env.PORT) || 3001;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
