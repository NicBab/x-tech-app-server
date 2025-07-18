import bcrypt from "bcryptjs";
import prisma from "../prisma/client";
import dotenv from "dotenv";
dotenv.config();
import { RegisterInput, LoginInput } from "../types/authTypes";
import { generateToken } from "../utils/jwt";
import { Role } from "@prisma/client";

// Converts frontend role to Prisma Role enum
const toPrismaRole = (role?: string): Role => {
  if (role?.toLowerCase() === "admin") return Role.ADMIN;
  return Role.EMPLOYEE;
};

export const registerUser = async (input: RegisterInput) => {
  const { name, email, password, phoneNumber, role } = input;
  const hashedPassword = await bcrypt.hash(password, 10);

const existingUser = await prisma.users.findUnique({ where: { email } });
if (existingUser) {
  throw new Error("Email is already registered.");
}

  const user = await prisma.users.create({
    data: {
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      role: toPrismaRole(role), //converts string to Prisma enum
    },
  });

  const token = generateToken({
    userId: user.userId,
    role: user.role
  });

  return { user, token };
};

export const loginUser = async (input: LoginInput) => {
  const { email, password } = input;

  const user = await prisma.users.findUnique({ where: { email } });
  if (!user) throw new Error("Invalid credentials");

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw new Error("Invalid credentials");

  const token = generateToken({
    userId: user.userId,
    role: user.role
  });

  return { user, token };
};
