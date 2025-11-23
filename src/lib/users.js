import { tenantQuery } from "./tenantDb";

export async function findUserByEmail(tenant, email) {
    const res = await tenantQuery(
        tenant,
        "SELECT * FROM users WHERE email = $1",
        [email]
    );
    return res.rows[0] || null;
}

export async function createUserIfNotExists(tenant, email) {
    let user = await findUserByEmail(tenant, email);

    if (!user) {
        const insert = await tenantQuery(
            tenant,
            "INSERT INTO users (email, role, first_name, last_name) VALUES ($1, 'user', '', '') RETURNING *",
            [email]
        );
        user = insert.rows[0];
    }

    return user;
}
