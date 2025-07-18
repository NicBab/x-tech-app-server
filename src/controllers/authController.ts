import { Request, Response } from "express";
import { registerUser, loginUser } from "../services/authService";

export const register = async (req: Request, res: Response) => {
  try {
    const { user, token } = await registerUser(req.body);
    res.status(201).json({ user, token });
    
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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
