import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config(); 

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in .env");
}

export interface JwtPayload {
  userId: string;
  role: string; // use lowercase "admin" | "employee"
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
};


