import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AppError, Errors } from '../utils/AppError';
// AppError imported above — used directly in updateProfile / changePassword
import { catchAsync } from '../utils/catchAsync';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token
 */
const generateToken = (userId: string, name: string, email: string): string => {
  return jwt.sign(
    { userId, name, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );
};

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(Errors.conflict('User with this email already exists'));
  }

  // Create user
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: 'recruiter',
  });

  // Generate token
  const token = generateToken(user._id.toString(), user.name, user.email);

  // Remove password from response
  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  res.status(201).json({
    success: true,
    data: {
      user: userResponse,
      token,
    },
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    return next(Errors.unauthorized('Invalid email or password'));
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(Errors.unauthorized('Invalid email or password'));
  }

  // Generate token
  const token = generateToken(user._id.toString(), user.name, user.email);

  // Remove password from response
  const userResponse = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  res.json({
    success: true,
    data: {
      user: userResponse,
      token,
    },
  });
});

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const user = await User.findById(req.user?._id);

  if (!user) {
    return next(Errors.notFound('User'));
  }

  res.json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

/**
 * @desc    Update current user profile (name / email)
 * @route   PUT /api/auth/me
 * @access  Private
 */
export const updateProfile = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { name, email } = req.body as { name?: string; email?: string };

  if (!name && !email) {
    return next(new AppError('Provide at least name or email to update', 400));
  }

  const updates: Record<string, string> = {};
  if (name?.trim()) updates.name = name.trim();
  if (email?.trim()) {
    const normalised = email.toLowerCase().trim();
    const conflict = await User.findOne({ email: normalised, _id: { $ne: req.user?._id } });
    if (conflict) return next(Errors.conflict('Email is already in use'));
    updates.email = normalised;
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!user) return next(Errors.notFound('User'));

  res.json({
    success: true,
    data: { _id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
export const changePassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword) {
    return next(new AppError('currentPassword and newPassword are required', 400));
  }
  if (newPassword.length < 8) {
    return next(new AppError('New password must be at least 8 characters', 400));
  }

  const user = await User.findById(req.user?._id).select('+password');
  if (!user) return next(Errors.notFound('User'));

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) return next(Errors.unauthorized('Current password is incorrect'));

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password updated successfully' });
});
