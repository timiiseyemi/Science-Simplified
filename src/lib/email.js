import nodemailer from "nodemailer";

export async function sendMagicLinkEmail({ tenant, email, url }) {
    const magicUrl = url; // EXACT URL passed from create route

    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: `"Simplified Login" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Magic Login Link",
        html: `
            <p>Click to sign in:</p>
            <a href="${magicUrl}" style="color: #4cb19f; font-size: 18px;">
                Login to your account
            </a>
            <p>This link expires in 30 days.</p>
        `,
    });

    return true;
}
