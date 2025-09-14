// src/models/user.mjs

import pool from '../config/db.mjs';

export async function findUserByEmail(email) {
    const res = await pool.query(
        `SELECT u.*, r.name as role_name 
         FROM users u 
         LEFT JOIN roles r on u.role_id = r.id 
         WHERE email = $1`,
        [email]
    );
    return res.rows[0];
}

export async function findUserById(id) {
  const result = await pool.query(
    'SELECT u.*, r.name as role_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
    [id]
  );
  return result.rows[0];
}

export async function createUser({ full_name, email, role_id = null, password_hash = null }) {
    const res = await pool.query(
        `INSERT INTO users (full_name, email, role_id, password_hash) 
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [full_name, email, role_id, password_hash]
    );
    return res.rows[0];
}

// New helper: fetch role name by userId
export async function getUserRoleById(userId) {
    const res = await pool.query(
        `SELECT r.name 
         FROM users u 
         LEFT JOIN roles r ON u.role_id = r.id 
         WHERE u.id = $1`,
        [userId]
    );
    return res.rows[0]?.name || null;
}

// Updated listUsers → show is_logged_in only to Super Admins
export async function listUsers(requestingUserId) {
    const role = await getUserRoleById(requestingUserId);

    if (role === 'Super Admin') {
        const res = await pool.query(
            `SELECT u.id, u.full_name, u.email, r.name as role, 
                    u.is_active, u.is_logged_in, u.created_at
             FROM users u 
             LEFT JOIN roles r on u.role_id = r.id 
             ORDER BY u.id DESC`
        );
        return res.rows;
    } else {
        const res = await pool.query(
            `SELECT u.id, u.full_name, u.email, r.name as role, 
                    u.is_active, u.created_at
             FROM users u 
             LEFT JOIN roles r on u.role_id = r.id 
             ORDER BY u.id DESC`
        );
        return res.rows;
    }
}

export async function updateUserRole(userId, roleId) {
    const res = await pool.query(
        `UPDATE users SET role_id = $1 WHERE id = $2 RETURNING *`,
        [roleId, userId]
    );
    return res.rows[0];
}

// Update user active/inactive status
export async function updateUserStatus(userId, isActive) {
    const res = await pool.query(
        `UPDATE users SET is_active = $1 WHERE id = $2 RETURNING *`,
        [isActive, userId]
    );
    return res.rows[0];
}