/**
 * Authentication Controller
 * Handles user authentication operations
 */

const { 
  createUser, 
  getUserByEmail, 
  verifyPassword, 
  updateLastLogin,
  changePassword: changeUserPassword
} = require('../database/user-repository');
const { 
  generateToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Register new user
 */
async function register(req, res) {
  const { email, password, name } = req.body;

  // Check if user already exists
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({
      error: 'User already exists',
      message: 'An account with this email already exists'
    });
  }

  // Create user
  const user = await createUser({ email, password, name, role: 'user' });

  // Generate tokens
  const accessToken = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  logger.info(`New user registered: ${email}`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    accessToken,
    refreshToken
  });
}

/**
 * User login
 */
async function login(req, res) {
  const { email, password } = req.body;

  // Get user
  const user = await getUserByEmail(email);
  if (!user) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid email or password'
    });
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid email or password'
    });
  }

  // Check if account is active
  if (!user.is_active) {
    return res.status(403).json({
      error: 'Account disabled',
      message: 'Your account has been disabled. Contact support.'
    });
  }

  // Update last login
  await updateLastLogin(user.id);

  // Generate tokens
  const accessToken = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  logger.info(`User logged in: ${email}`);

  res.json({
    success: true,
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    accessToken,
    refreshToken
  });
}

/**
 * Refresh access token
 */
async function refresh(req, res) {
  const { refreshToken } = req.body;

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Generate new access token
    const accessToken = generateToken(decoded.userId);

    res.json({
      success: true,
      accessToken
    });

  } catch (error) {
    return res.status(401).json({
      error: 'Invalid refresh token',
      message: 'Please login again'
    });
  }
}

/**
 * Get current user profile
 */
async function getProfile(req, res) {
  res.json({
    success: true,
    user: req.user
  });
}

/**
 * Logout (client-side token removal)
 */
async function logout(req, res) {
  logger.info(`User logged out: ${req.user.email}`);
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}

/**
 * Change password
 */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  try {
    await changeUserPassword(req.user.id, currentPassword, newPassword);

    logger.info(`Password changed: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({
        error: 'Invalid password',
        message: error.message
      });
    }
    throw error;
  }
}

module.exports = {
  register,
  login,
  refresh,
  getProfile,
  logout,
  changePassword
};
