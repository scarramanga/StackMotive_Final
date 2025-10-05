import { Router } from 'express';
import { TaxCalculationService } from '../tax/tax-calculation-service';
import { isAuthenticated, type AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate.ts';
import { Request, Response } from 'express';

const router = Router();
const taxCalculationService = new TaxCalculationService();

// Schema for tax calculation options
const taxOptionsSchema = z.object({
  taxYear: z.string().optional(),
  accountingMethod: z.enum(['FIFO', 'LIFO']).optional(),
  includeFees: z.boolean().optional(),
  includeForeignTax: z.boolean().optional(),
  offsetLosses: z.boolean().optional(),
  carryForward: z.boolean().optional(),
  previousYearLosses: z.number().optional()
});

// GET /api/tax/preview - Get tax calculation preview
router.get('/preview', 
  isAuthenticated,
  validateRequest({ query: taxOptionsSchema }),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const options = req.query;

      const result = await taxCalculationService.calculateTax(userId, options);

      res.json({
        success: true,
        data: {
          taxableIncome: result.taxableIncome,
          taxOwed: result.taxOwed,
          foreignIncome: result.foreignIncome,
          feesPaid: result.feesPaid,
          yearBreakdown: result.yearBreakdown
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate tax preview'
      });
    }
  }
);

// GET /api/tax/report - Generate full tax report
router.get('/report',
  isAuthenticated,
  validateRequest({ query: taxOptionsSchema }),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthenticatedRequest).user.id;
      const options = req.query;

      const result = await taxCalculationService.calculateTax(userId, options);

      // Format detailed report
      const report = {
        summary: {
          taxableIncome: result.taxableIncome,
          taxOwed: result.taxOwed,
          totalGains: result.totalGains,
          totalLosses: result.totalLosses,
          netIncome: result.netIncome,
          carryForwardLosses: result.carryForwardLosses,
          foreignIncome: result.foreignIncome,
          feesPaid: result.feesPaid
        },
        yearBreakdown: result.yearBreakdown,
        taxLots: result.taxLots.map(lot => ({
          symbol: lot.symbol,
          quantity: lot.quantity,
          costBasis: lot.costBasis,
          proceeds: lot.proceeds,
          gain: lot.proceeds - lot.costBasis,
          acquiredDate: lot.acquiredDate,
          disposedDate: lot.disposedDate,
          holdingPeriod: lot.disposedDate ? 
            Math.floor((lot.disposedDate.getTime() - lot.acquiredDate.getTime()) / (1000 * 60 * 60 * 24)) : 
            0
        }))
      };

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate tax report'
      });
    }
  }
);

export default router; 