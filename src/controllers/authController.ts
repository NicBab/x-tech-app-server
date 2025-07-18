import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/authService";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phoneNumber, role } = req.body;
    const result = await registerUser({
      name,
      email,
      password,
      phoneNumber,
      role,
    });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { user, token } = await loginUser(req.body);
    res.status(200).json({ user, token });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};
