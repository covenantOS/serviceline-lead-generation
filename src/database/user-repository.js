/**
 * User Repository
 * Handles user CRUD operations
 */

const { supabase } = require('./supabase-client');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

/**
 * Create new user
 */
async function createUser(userData) {
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);

    const { data, error } = await supabase
      .from('users')
      .insert([{
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        name: userData.name,
        role: userData.role || 'user',
        is_active: true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    logger.info(`User created: ${data.email}`);
    
    // Remove password from response
    delete data.password;
    return data;

  } catch (error) {
    logger.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Find user by email
 */
async function getUserByEmail(email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;

  } catch (error) {
    logger.error('Error finding user by email:', error);
    throw error;
  }
}

/**
 * Find user by ID
 */
async function getUserById(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, is_active, created_at, last_login')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;

  } catch (error) {
    logger.error('Error finding user by ID:', error);
    throw error;
  }
}

/**
 * Verify user password
 */
async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Update user's last login time
 */
async function updateLastLogin(userId) {
  try {
    const { error } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

  } catch (error) {
    logger.error('Error updating last login:', error);
  }
}

/**
 * Update user
 */
async function updateUser(userId, updates) {
  try {
    const allowedUpdates = ['name', 'email', 'role', 'is_active'];
    const filteredUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (filteredUpdates.email) {
      filteredUpdates.email = filteredUpdates.email.toLowerCase();
    }

    filteredUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(filteredUpdates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    delete data.password;
    return data;

  } catch (error) {
    logger.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Change user password
 */
async function changePassword(userId, oldPassword, newPassword) {
  try {
    // Get user with password
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    // Verify old password
    const isValid = await verifyPassword(oldPassword, user.password);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    logger.info(`Password changed for user: ${userId}`);
    return true;

  } catch (error) {
    logger.error('Error changing password:', error);
    throw error;
  }
}

/**
 * Delete user
 */
async function deleteUser(userId) {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    logger.info(`User deleted: ${userId}`);
    return true;

  } catch (error) {
    logger.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * List all users (admin only)
 */
async function listUsers(filters = {}, pagination = {}) {
  try {
    const limit = pagination.limit || 50;
    const offset = pagination.offset || 0;

    let query = supabase
      .from('users')
      .select('id, email, name, role, is_active, created_at, last_login', { count: 'exact' });

    // Apply filters
    if (filters.role) {
      query = query.eq('role', filters.role);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters.search) {
      query = query.or(`email.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      users: data,
      total: count,
      limit,
      offset
    };

  } catch (error) {
    logger.error('Error listing users:', error);
    throw error;
  }
}

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  verifyPassword,
  updateLastLogin,
  updateUser,
  changePassword,
  deleteUser,
  listUsers
};
