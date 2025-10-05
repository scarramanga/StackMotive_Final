import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

// ================================
// TYPES & INTERFACES
// ================================

export interface OnboardingState {
  currentStep: number;
  completedSteps: number[];
  persona: 'observer' | 'operator' | 'sovereign' | null;
  intent: 'growth' | 'stability' | 'autonomy' | null;
  selectedOverlays: string[];
  isComplete: boolean;
}

export interface PersonaOption {
  id: 'observer' | 'operator' | 'sovereign';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
}

export interface IntentOption {
  id: 'growth' | 'stability' | 'autonomy';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export interface StrategyOverlay {
  id: string;
  name: string;
  performance: number;
  totalValue: number;
  enabled: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
}

export interface OverlayData {
  overlays: StrategyOverlay[];
  totalAvailable: number;
  recommendedCount: number;
}

export interface RebalanceRecommendation {
  hasRecommendation: boolean;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  suggestedActions: string[];
  timeframe: string;
}

export interface OnboardingProgress {
  userId: number;
  currentStep: number;
  completedSteps: number[];
  persona: string | null;
  intent: string | null;
  selectedOverlays: string[];
  isComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

// ================================
// CONSTANTS
// ================================

export const PERSONAS: PersonaOption[] = [
  {
    id: 'observer',
    title: 'Observer',
    description: 'Monitor portfolio performance and receive insights',
    icon: null, // Will be set by component
    color: 'text-blue-600 bg-blue-100',
    features: ['Read-only access', 'Performance tracking', 'Alert notifications']
  },
  {
    id: 'operator',
    title: 'Operator',
    description: 'Actively manage strategies and execute trades',
    icon: null,
    color: 'text-green-600 bg-green-100',
    features: ['Strategy management', 'Trade execution', 'Portfolio optimization']
  },
  {
    id: 'sovereign',
    title: 'Sovereign',
    description: 'Full control with advanced features and automation',
    icon: null,
    color: 'text-purple-600 bg-purple-100',
    features: ['Full automation', 'Advanced analytics', 'Custom strategies']
  }
];

export const INTENTS: IntentOption[] = [
  {
    id: 'growth',
    title: 'Growth Focus',
    description: 'Maximize returns with higher risk tolerance',
    icon: null,
    color: 'text-green-600 bg-green-100'
  },
  {
    id: 'stability',
    title: 'Stability Focus',
    description: 'Preserve capital with lower volatility',
    icon: null,
    color: 'text-blue-600 bg-blue-100'
  },
  {
    id: 'autonomy',
    title: 'Autonomous Management',
    description: 'Let AI handle all portfolio decisions',
    icon: null,
    color: 'text-purple-600 bg-purple-100'
  }
];

export const ONBOARDING_STEPS = {
  PERSONA_SELECTION: 1,
  INTENT_DEFINITION: 2,
  OVERLAY_PREVIEW: 3,
  AI_CONFIGURATION: 4,
  COMPLETION: 5
} as const;

export const TOTAL_STEPS = 5;

// ================================
// ONBOARDING FLOW SERVICE CLASS
// ================================

export class OnboardingFlowService {
  private static readonly STORAGE_KEY = 'stackmotive_onboarding';
  private static readonly COMPLETION_KEY = 'stackmotive_onboarding_complete';

  // Local Storage Management
  static saveOnboardingState(state: OnboardingState): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
    }
  }

  static loadOnboardingState(): OnboardingState {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
    }
    
    return this.getInitialState();
  }

  static getInitialState(): OnboardingState {
    return {
      currentStep: 1,
      completedSteps: [],
      persona: null,
      intent: null,
      selectedOverlays: [],
      isComplete: false
    };
  }

  static setCompletionFlag(): void {
    localStorage.setItem(this.COMPLETION_KEY, 'true');
  }

  static isOnboardingCompleted(): boolean {
    return localStorage.getItem(this.COMPLETION_KEY) === 'true';
  }

  // Progress Calculations
  static calculateProgress(completedSteps: number[]): number {
    return (completedSteps.length / TOTAL_STEPS) * 100;
  }

  static validateStepCompletion(step: number, state: OnboardingState): boolean {
    switch (step) {
      case 1:
        return state.persona !== null;
      case 2:
        return state.intent !== null;
      case 3:
        return state.selectedOverlays.length > 0;
      case 4:
        return true; // AI configuration is always completable
      case 5:
        return state.completedSteps.includes(1, 2, 3, 4);
      default:
        return false;
    }
  }

  // State Transitions
  static completeStep(currentState: OnboardingState, stepNumber: number): OnboardingState {
    const newState = {
      ...currentState,
      completedSteps: [...new Set([...currentState.completedSteps, stepNumber])],
      currentStep: Math.min(stepNumber + 1, TOTAL_STEPS)
    };
    
    this.saveOnboardingState(newState);
    return newState;
  }

  static navigateToStep(currentState: OnboardingState, stepNumber: number): OnboardingState {
    const newState = {
      ...currentState,
      currentStep: Math.max(1, Math.min(stepNumber, TOTAL_STEPS))
    };
    
    this.saveOnboardingState(newState);
    return newState;
  }

  static selectPersona(currentState: OnboardingState, persona: 'observer' | 'operator' | 'sovereign'): OnboardingState {
    const newState = {
      ...currentState,
      persona
    };
    
    this.saveOnboardingState(newState);
    return this.completeStep(newState, 1);
  }

  static selectIntent(currentState: OnboardingState, intent: 'growth' | 'stability' | 'autonomy'): OnboardingState {
    const newState = {
      ...currentState,
      intent
    };
    
    this.saveOnboardingState(newState);
    return this.completeStep(newState, 2);
  }

  static toggleOverlay(currentState: OnboardingState, overlayId: string): OnboardingState {
    const selected = currentState.selectedOverlays.includes(overlayId)
      ? currentState.selectedOverlays.filter(id => id !== overlayId)
      : [...currentState.selectedOverlays, overlayId];
    
    const newState = {
      ...currentState,
      selectedOverlays: selected
    };
    
    this.saveOnboardingState(newState);
    return newState;
  }

  static confirmOverlays(currentState: OnboardingState): OnboardingState {
    return this.completeStep(currentState, 3);
  }

  static completeGPTWizard(currentState: OnboardingState): OnboardingState {
    return this.completeStep(currentState, 4);
  }

  static completeOnboarding(currentState: OnboardingState): OnboardingState {
    const newState = {
      ...currentState,
      isComplete: true,
      completedSteps: [1, 2, 3, 4, 5],
      currentStep: 5
    };
    
    this.saveOnboardingState(newState);
    this.setCompletionFlag();
    return newState;
  }

  // API Calls
  static async fetchStrategyOverlays(vaultId?: string): Promise<OverlayData> {
    const url = vaultId 
      ? `/api/strategy/overlays?vaultId=${vaultId}`
      : '/api/strategy/overlays';
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch strategy overlays');
    }
    
    return response.json();
  }

  static async fetchRebalanceRecommendations(vaultId?: string): Promise<RebalanceRecommendation> {
    const url = vaultId 
      ? `/api/portfolio/rebalance-recommendations?vaultId=${vaultId}`
      : '/api/portfolio/rebalance-recommendations';
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch rebalance recommendations');
    }
    
    return response.json();
  }

  static async saveOnboardingProgress(userId: number, state: OnboardingState): Promise<OnboardingProgress> {
    const response = await fetch('/api/user/onboarding/progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        persona: state.persona,
        intent: state.intent,
        selectedOverlays: state.selectedOverlays,
        isComplete: state.isComplete
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save onboarding progress');
    }

    return response.json();
  }

  static async completeOnboardingAPI(userId: number): Promise<{ success: boolean }> {
    const response = await fetch('/api/user/onboarding/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to complete onboarding');
    }

    return response.json();
  }

  // Agent Memory Logging
  static async logAgentMemory(action: string, details: any): Promise<void> {
    try {
      await fetch('/api/agent/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          component: 'OnboardingFlowPanel',
          action,
          details,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to log agent memory:', error);
    }
  }
}

// ================================
// REACT QUERY HOOKS
// ================================

export const useOnboardingState = () => {
  const [state, setState] = useState<OnboardingState>(() => 
    OnboardingFlowService.loadOnboardingState()
  );

  useEffect(() => {
    OnboardingFlowService.saveOnboardingState(state);
  }, [state]);

  const updateState = (newState: OnboardingState) => {
    setState(newState);
    OnboardingFlowService.logAgentMemory('state_update', {
      previousStep: state.currentStep,
      newStep: newState.currentStep,
      completedSteps: newState.completedSteps,
      persona: newState.persona,
      intent: newState.intent,
      selectedOverlays: newState.selectedOverlays.length
    });
  };

  return { state, updateState };
};

export const useStrategyOverlays = (vaultId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['onboarding', 'strategy-overlays', vaultId],
    queryFn: () => OnboardingFlowService.fetchStrategyOverlays(vaultId),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useRebalanceRecommendations = (vaultId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['onboarding', 'rebalance-recommendations', vaultId],
    queryFn: () => OnboardingFlowService.fetchRebalanceRecommendations(vaultId),
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useOnboardingProgress = (userId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (state: OnboardingState) => 
      OnboardingFlowService.saveOnboardingProgress(userId, state),
    onSuccess: () => {
      queryClient.invalidateQueries(['onboarding', 'progress']);
      OnboardingFlowService.logAgentMemory('progress_saved', {
        userId,
        timestamp: new Date().toISOString()
      });
    },
  });
};

export const useCompleteOnboarding = (userId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => OnboardingFlowService.completeOnboardingAPI(userId),
    onSuccess: () => {
      queryClient.invalidateQueries(['onboarding']);
      OnboardingFlowService.logAgentMemory('onboarding_completed', {
        userId,
        timestamp: new Date().toISOString()
      });
    },
  });
};

// ================================
// UTILITY FUNCTIONS
// ================================

export const getPersonaById = (id: string): PersonaOption | undefined => {
  return PERSONAS.find(p => p.id === id);
};

export const getIntentById = (id: string): IntentOption | undefined => {
  return INTENTS.find(i => i.id === id);
};

export const getStepTitle = (step: number): string => {
  const titles = {
    1: 'Choose Your Persona',
    2: 'Define Your Intent',
    3: 'Preview Strategy Overlays',
    4: 'AI Portfolio Setup',
    5: 'Portfolio Ready'
  };
  return titles[step as keyof typeof titles] || 'Unknown Step';
};

export const getStepDescription = (step: number): string => {
  const descriptions = {
    1: 'How do you want to interact with StackMotive?',
    2: 'What\'s your primary investment goal?',
    3: 'Select overlays that match your intent',
    4: 'Let AI configure your portfolio based on your preferences',
    5: 'Your portfolio is configured and ready for monitoring'
  };
  return descriptions[step as keyof typeof descriptions] || 'Unknown Step';
};

export default OnboardingFlowService; 