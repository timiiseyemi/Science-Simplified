import { sign } from "jsonwebtoken";
import { serialize } from "cookie";

export function createAuthCookie(user) {
    const token = sign(
        {
            email: user.email,
            id: user.id,
            role: user.role,
            name: `${user.first_name} ${user.last_name}`,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    return serialize("auth", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 86400,
        path: "/",
    });
}
