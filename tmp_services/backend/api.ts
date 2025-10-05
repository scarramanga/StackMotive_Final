import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { isAuthenticated, AuthenticatedRequest, User } from '../middleware/auth';
import { tradeSchema } from '../validation/trade.schema';
import { strategySchema } from '../validation/strategy.schema';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import type { Request, Response } from 'express';
import bcryptjs from 'bcryptjs';
import { insertUserSchema } from '@shared/schema';
import taxRouter from './tax';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate';
import { Prisma } from '@prisma/client';

const router = Router();

interface Holding {
  symbol: string;
  exchange: string;
  broker: string | undefined;
  quantity: number;
  averagePrice: number;
  totalValue: number;
  trades: {
    id: number;
    entryPrice: string | number;
    amount: string | number;
    entryTime: Date;
    strategy?: string;
  }[];
}

interface Trade {
  id: number;
  symbol: string;
  exchange: string | null;
  amount: Prisma.Decimal | number;
  entryPrice: Prisma.Decimal | number;
  entryTime: Date;
  vaultId?: string;
  tradingAccount?: { broker: string } | null;
  strategy?: { name: string; riskPercentage: Prisma.Decimal | null } | null;
}

// Error handler middleware
const handleError = (res: Response, error: unknown) => {
  console.error('API Error:', error);
  if (error instanceof ZodError) {
    return res.status(400).json({ 
      message: 'Validation error', 
      errors: fromZodError(error).message 
    });
  }
  res.status(500).json({ message: 'Internal server error' });
};

// Mount tax routes
router.use('/tax', taxRouter);

// Get all strategies for the authenticated user
router.get('/strategies', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const strategies = await prisma.strategy.findMany({
      where: { userId: user.id },
      include: {
        tradingAccount: true,
        trades: {
          orderBy: { entryTime: 'desc' },
          take: 5,
        },
      },
    });
    res.json(strategies);
  } catch (error) {
    handleError(res, error);
  }
});

// Get holdings (aggregated positions) for the authenticated user
router.get('/holdings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const vaultId = req.query.vaultId as string | undefined;
    const tradeWhere: any = {
      userId: user.id,
      status: 'open',
    };
    if (vaultId) {
      tradeWhere.vaultId = vaultId;
    }
    const trades = await prisma.trade.findMany({
      where: tradeWhere,
      include: {
        tradingAccount: true,
        strategy: {
          select: {
            name: true,
            riskPercentage: true,
          },
        },
      },
    });

    // Aggregate holdings by symbol
    const holdings = trades.reduce((acc: Record<string, Holding>, trade: Trade) => {
      const key = `${trade.symbol}-${trade.exchange ?? ''}-${trade.tradingAccount?.broker ?? ''}`;
      if (!acc[key]) {
        acc[key] = {
          symbol: trade.symbol,
          exchange: trade.exchange ?? '',
          broker: trade.tradingAccount?.broker ?? '',
          quantity: 0,
          averagePrice: 0,
          totalValue: 0,
          trades: [],
        };
      }
      
      const holding = acc[key];
      const tradeValue = Number(trade.amount) * Number(trade.entryPrice);
      const newTotalValue = holding.totalValue + tradeValue;
      const newQuantity = holding.quantity + Number(trade.amount);
      
      holding.quantity = newQuantity;
      holding.totalValue = newTotalValue;
      holding.averagePrice = newTotalValue / newQuantity;
      holding.trades.push({
        id: trade.id,
        entryPrice: Number(trade.entryPrice),
        amount: Number(trade.amount),
        entryTime: trade.entryTime,
        strategy: trade.strategy?.name,
      });

      return acc;
    }, {});

    res.json(Object.values(holdings));
  } catch (error) {
    handleError(res, error);
  }
});

// Get user profile and account summary
router.get('/user', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        tradingAccounts: {
          select: {
            id: true,
            name: true,
            broker: true,
            balance: true,
            currency: true,
            isActive: true,
            lastSynced: true,
          },
        },
        taxSettings: {
          select: {
            country: true,
            taxYear: true,
            accountingMethod: true,
          },
        },
        paperTradingAccounts: {
          select: {
            name: true,
            initialBalance: true,
            currentBalance: true,
            currency: true,
          },
        },
      },
    });

    if (!userProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove sensitive data
    const { password, ...userWithoutPassword } = userProfile;
    res.json(userWithoutPassword);
  } catch (error) {
    handleError(res, error);
  }
});

// Create a new trade
router.post('/trade', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const validatedData = tradeSchema.parse(req.body);

    // Get the strategy to verify ownership and get the account
    if (validatedData.strategyId) {
      const strategy = await prisma.strategy.findUnique({
        where: { id: validatedData.strategyId },
        include: { tradingAccount: true },
      });

      if (!strategy) {
        return res.status(404).json({ message: 'Strategy not found' });
      }

      if (strategy.userId !== user.id) {
        return res.status(403).json({ message: 'Not authorized to trade with this strategy' });
      }
    }

    const trade = await prisma.trade.create({
      data: {
        ...validatedData,
        userId: user.id,
        entryTime: new Date(),
      },
      include: {
        strategy: true,
        tradingAccount: true,
      },
    });

    res.status(201).json(trade);
  } catch (error) {
    handleError(res, error);
  }
});

// Create a new strategy
router.post('/strategies', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const validatedData = strategySchema.parse(req.body);

    const strategy = await prisma.strategy.create({
      data: {
        ...validatedData,
        userId: user.id,
      },
      include: {
        tradingAccount: true,
      },
    });

    res.status(201).json(strategy);
  } catch (error) {
    handleError(res, error);
  }
});

// Update a strategy
router.put('/strategies/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const strategyId = parseInt(req.params.id);
    const validatedData = strategySchema.partial().parse(req.body);

    // Check if strategy exists and belongs to user
    const existingStrategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
    });

    if (!existingStrategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }

    if (existingStrategy.userId !== user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const strategy = await prisma.strategy.update({
      where: { id: strategyId },
      data: validatedData,
      include: {
        tradingAccount: true,
      },
    });

    res.json(strategy);
  } catch (error) {
    handleError(res, error);
  }
});

// Delete a strategy
router.delete('/strategies/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const strategyId = parseInt(req.params.id);

    // Check if strategy exists and belongs to user
    const existingStrategy = await prisma.strategy.findUnique({
      where: { id: strategyId },
    });

    if (!existingStrategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }

    if (existingStrategy.userId !== user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await prisma.strategy.delete({
      where: { id: strategyId },
    });

    res.status(204).send();
  } catch (error) {
    handleError(res, error);
  }
});

// Tester registration route
router.post("/register/tester", async (req: Request, res: Response) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: userData.username },
          { email: userData.email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: existingUser.username === userData.username 
          ? "Username already exists" 
          : "Email already exists" 
      });
    }
    
    // Hash password using bcryptjs
    const hashedPassword = await bcryptjs.hash(userData.password, 10);
    
    // Calculate trial dates
    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7-day trial
    
    // Create tester user
    const user = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        role: "tester",
        trialStartedAt: now,
        trialEndsAt,
        onboardingComplete: false,
        onboardingStep: 1
      }
    });

    // Create paper trading account
    await prisma.paperTradingAccount.create({
      data: {
        userId: user.id,
        name: "Test Portfolio",
        initialBalance: 100000,
        currentBalance: 100000,
        currency: "USD",
        isActive: true
      }
    });

    // Set session data after registration
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    // Save session
    await new Promise<void>((resolve, reject) => {
      req.session.save((err: Error | null) => {
        if (err) {
          console.error('[Register Debug] Session save error:', err);
          reject(err);
        } else {
          console.log('[Register Debug] Session saved successfully');
          resolve();
        }
      });
    });

    // Remove sensitive data
    const { password: _, ...userWithoutPassword } = user;
    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: fromZodError(error).message });
    }
    res.status(500).json({ message: "Error creating user" });
  }
});

// Onboarding progress route
router.post("/user/onboarding/progress", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { step } = req.body;
    const user = (req as AuthenticatedRequest).user;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { onboardingStep: step }
    });

    res.json({ step: updatedUser.onboardingStep });
  } catch (error) {
    res.status(500).json({ message: "Error updating onboarding progress" });
  }
});

// Complete onboarding route
router.post("/user/onboarding/complete", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { 
        onboardingComplete: true,
        onboardingStep: 4 // Final step
      }
    });

    res.json({ onboardingComplete: updatedUser.onboardingComplete });
  } catch (error) {
    res.status(500).json({ message: "Error completing onboarding" });
  }
});

// Trial status route
router.get("/user/trial-status", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;

    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        role: true,
        trialStartedAt: true,
        trialEndsAt: true
      }
    });

    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      trialStartedAt: userProfile.trialStartedAt,
      trialEndsAt: userProfile.trialEndsAt,
      isActive: userProfile.role === "tester" && userProfile.trialEndsAt 
        ? new Date(userProfile.trialEndsAt) > new Date() 
        : false
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching trial status" });
  }
});

// Login validation schema
const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});

// Add session type declaration
declare module 'express-session' {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}

// Login route
router.post("/login", validateRequest({ body: loginSchema }), async (req: Request, res: Response) => {
  console.log('[Login Debug] Starting login process');
  console.log('[Login Debug] Request headers:', req.headers);
  console.log('[Login Debug] Request cookies:', req.cookies);
  console.log('[Login Debug] Initial session:', {
    sessionID: req.sessionID,
    session: req.session,
    cookie: req.session?.cookie
  });
  
  try {
    const { username, password } = req.body;
    console.log('[Login Debug] Login attempt for username:', username);

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      console.log('[Login Debug] User not found:', username);
      return res.status(401).json({ 
        success: false,
        message: "Invalid username or password" 
      });
    }

    // Verify password
    const isValid = await bcryptjs.compare(password, user.password);
    if (!isValid) {
      console.log('[Login Debug] Invalid password for user:', username);
      return res.status(401).json({ 
        success: false,
        message: "Invalid username or password" 
      });
    }

    console.log('[Login Debug] Password verified successfully');

    // Regenerate session to prevent session fixation
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) {
          console.error('[Login Debug] Session regeneration error:', err);
          reject(err);
        } else {
          console.log('[Login Debug] Session regenerated successfully');
          resolve();
        }
      });
    });

    // Set session data
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    // Save session
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('[Login Debug] Session save error:', err);
          reject(err);
        } else {
          console.log('[Login Debug] Session saved successfully');
          resolve();
        }
      });
    });

    // Log session state for debugging
    console.log('[Login Debug] Final session state:', {
      sessionID: req.sessionID,
      userId: req.session.userId,
      username: req.session.username,
      role: req.session.role,
      cookie: req.session.cookie
    });

    // Remove sensitive data
    const { password: _, ...userWithoutPassword } = user;

    // Return success response with user data
    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('[Login Debug] Login error:', error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
});

// Logout route
router.post("/logout", async (req: Request, res: Response) => {
  try {
    // Destroy the session
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          console.error('[Logout Debug] Session destruction error:', err);
          reject(err);
        } else {
          console.log('[Logout Debug] Session destroyed successfully');
          resolve();
        }
      });
    });

    // Clear the session cookie
    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });

    res.json({ 
      success: true,
      message: "Logged out successfully" 
    });
  } catch (error) {
    console.error('[Logout Debug] Logout error:', error);
    res.status(500).json({ 
      success: false,
      message: "Error logging out" 
    });
  }
});

// Add or update the /summary endpoint to support vaultId filtering
router.get('/summary', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const vaultId = req.query.vaultId as string | undefined;
    const tradeWhere: any = {
      userId: user.id,
      status: 'open',
    };
    if (vaultId) {
      tradeWhere.vaultId = vaultId;
    }
    const trades = await prisma.trade.findMany({ where: tradeWhere });
    // Calculate summary metrics
    let totalValue = 0;
    let netWorth = 0;
    let changeValue = 0;
    let changePercent = 0;
    let assetCount = 0;
    // Example calculation (replace with your real logic)
    trades.forEach(trade => {
      const value = Number(trade.amount) * Number(trade.entryPrice);
      totalValue += value;
    });
    assetCount = new Set(trades.map(t => t.symbol)).size;
    // TODO: Add real netWorth, changeValue, changePercent calculations
    res.json({ totalValue, netWorth, changeValue, changePercent, assetCount });
  } catch (error) {
    handleError(res, error);
  }
});

export default router; 