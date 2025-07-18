"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = __importDefault(require("../prisma/client"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const jwt_1 = require("../utils/jwt");
const client_2 = require("@prisma/client");
// Converts frontend role to Prisma Role enum
const toPrismaRole = (role) => {
    if ((role === null || role === void 0 ? void 0 : role.toLowerCase()) === "admin")
        return client_2.Role.ADMIN;
    return client_2.Role.EMPLOYEE;
};
const registerUser = (input) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password, phoneNumber, role } = input;
    const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
    const existingUser = yield client_1.default.users.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error("Email is already registered.");
    }
    const user = yield client_1.default.users.create({
        data: {
            name,
            email,
            phoneNumber,
            password: hashedPassword,
            role: toPrismaRole(role), //converts string to Prisma enum
        },
    });
    const token = (0, jwt_1.generateToken)({
        userId: user.userId,
        role: user.role
    });
    return { user, token };
});
exports.registerUser = registerUser;
const loginUser = (input) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = input;
    const user = yield client_1.default.users.findUnique({ where: { email } });
    if (!user)
        throw new Error("Invalid credentials");
    const isValid = yield bcryptjs_1.default.compare(password, user.password);
    if (!isValid)
        throw new Error("Invalid credentials");
    const token = (0, jwt_1.generateToken)({
        userId: user.userId,
        role: user.role.toLowerCase(),
    });
    return { user, token };
});
exports.loginUser = loginUser;
