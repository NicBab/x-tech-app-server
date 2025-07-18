export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  role?: "admin" | "employee";
}

export interface LoginInput {
  email: string;
  password: string;
}
