// Block 35: AI Override Explainer - Engine
// Core engine for AI decision explanation and manual overrides

import {
  AIOverrideExplainer,
  AIDecision,
  OverrideDetails,
  ExplanationData,
  OverrideValidation,
  OverrideStatus,
  DecisionType,
  OverrideType,
  OverrideError
} from '../types/aiOverrideExplainer';

export class AIOverrideExplainerEngine {
  private static instance: AIOverrideExplainerEngine;
  private explainers: Map<string, AIOverrideExplainer> = new Map();
  private aiDecisions: Map<string, AIDecision> = new Map();
  private eventHandlers: Map<string, Function[]> = new Map();
  private explanationTemplates: Map<string, any> = new Map();

  private constructor() {
    this.initializeEngine();
  }

  public static getInstance(): AIOverrideExplainerEngine {
    if (!AIOverrideExplainerEngine.instance) {
      AIOverrideExplainerEngine.instance = new AIOverrideExplainerEngine();
    }
    return AIOverrideExplainerEngine.instance;
  }

  private initializeEngine(): void {
    this.loadExplanationTemplates();
    console.log('AI Override Explainer Engine initialized');
  }

  // AI Decision Management
  public registerAIDecision(decision: AIDecision): AIDecision {
    this.aiDecisions.set(decision.id, decision);
    this.emit('decisionRegistered', decision);
    return decision;
  }

  public getAIDecision(id: string): AIDecision | undefined {
    return this.aiDecisions.get(id);
  }

  public getAllAIDecisions(): AIDecision[] {
    return Array.from(this.aiDecisions.values());
  }

  // Override Management
  public createOverride(
    decisionId: string,
    overrideDetails: OverrideDetails,
    userId: string
  ): AIOverrideExplainer {
    const decision = this.aiDecisions.get(decisionId);
    if (!decision) {
      throw new OverrideError('AI decision not found', 'DECISION_NOT_FOUND', { decisionId });
    }

    const explainer: AIOverrideExplainer = {
      id: this.generateId(),
      decisionId,
      userId,
      aiDecision: decision,
      override: overrideDetails,
      explanation: this.generateExplanation(decision, overrideDetails),
      validation: this.validateOverride(decision, overrideDetails),
      status: 'draft',
      createdAt: new Date(),
      metadata: {
        source: 'user',
        environment: 'production',
        version: '1.0.0',
        correlationId: this.generateId(),
        userAgent: 'web',
        location: 'unknown',
        session: 'current',
        systemState: {},
        modelVersion: decision.model.version,
        confidence: overrideDetails.justification.evidence.reduce((avg, e) => avg + e.reliability, 0) / overrideDetails.justification.evidence.length,
        auditTrail: [{
          timestamp: new Date(),
          action: 'override_created',
          user: userId,
          details: { decisionId, overrideType: overrideDetails.type },
          impact: 'medium'
        }]
      }
    };

    this.explainers.set(explainer.id, explainer);
    this.emit('overrideCreated', explainer);
    
    return explainer;
  }

  public getOverride(id: string): AIOverrideExplainer | undefined {
    return this.explainers.get(id);
  }

  public getAllOverrides(): AIOverrideExplainer[] {
    return Array.from(this.explainers.values());
  }

  public updateOverride(id: string, updates: Partial<AIOverrideExplainer>): AIOverrideExplainer {
    const explainer = this.explainers.get(id);
    if (!explainer) {
      throw new OverrideError('Override not found', 'OVERRIDE_NOT_FOUND', { id });
    }

    const updatedExplainer = { ...explainer, ...updates };
    
    // Update audit trail
    updatedExplainer.metadata.auditTrail.push({
      timestamp: new Date(),
      action: 'override_updated',
      user: explainer.userId,
      details: updates,
      impact: 'low'
    });

    this.explainers.set(id, updatedExplainer);
    this.emit('overrideUpdated', updatedExplainer);
    
    return updatedExplainer;
  }

  public approveOverride(id: string, approverId: string, comment?: string): AIOverrideExplainer {
    const explainer = this.explainers.get(id);
    if (!explainer) {
      throw new OverrideError('Override not found', 'OVERRIDE_NOT_FOUND', { id });
    }

    // Update approval status
    const approval = explainer.validation.approvals.find(a => a.approver === approverId);
    if (approval) {
      approval.status = 'approved';
      approval.comment = comment;
      approval.timestamp = new Date();
    }

    // Check if all required approvals are received
    const requiredApprovals = explainer.validation.approvals.filter(a => a.status === 'pending');
    const newStatus: OverrideStatus = requiredApprovals.length === 0 ? 'approved' : 'pending';

    return this.updateOverride(id, {
      status: newStatus,
      validation: explainer.validation
    });
  }

  public activateOverride(id: string): AIOverrideExplainer {
    const explainer = this.explainers.get(id);
    if (!explainer) {
      throw new OverrideError('Override not found', 'OVERRIDE_NOT_FOUND', { id });
    }

    if (explainer.status !== 'approved') {
      throw new OverrideError('Override not approved', 'NOT_APPROVED', { id, status: explainer.status });
    }

    return this.updateOverride(id, {
      status: 'active',
      appliedAt: new Date()
    });
  }

  public revokeOverride(id: string, reason: string): AIOverrideExplainer {
    const explainer = this.explainers.get(id);
    if (!explainer) {
      throw new OverrideError('Override not found', 'OVERRIDE_NOT_FOUND', { id });
    }

    return this.updateOverride(id, {
      status: 'revoked',
      metadata: {
        ...explainer.metadata,
        auditTrail: [
          ...explainer.metadata.auditTrail,
          {
            timestamp: new Date(),
            action: 'override_revoked',
            user: 'system',
            details: { reason },
            impact: 'high'
          }
        ]
      }
    });
  }

  // Explanation Generation
  public generateExplanation(decision: AIDecision, override: OverrideDetails): ExplanationData {
    const template = this.explanationTemplates.get(decision.type) || this.getDefaultTemplate();
    
    return {
      summary: this.generateSummaryExplanation(decision, override),
      detailed: this.generateDetailedExplanation(decision, override),
      visualizations: this.generateVisualizations(decision, override),
      interactive: this.generateInteractiveExplanations(decision, override),
      comparisons: this.generateComparisons(decision, override),
      scenarios: this.generateScenarios(decision, override),
      resources: this.generateLearningResources(decision, override)
    };
  }

  private generateSummaryExplanation(decision: AIDecision, override: OverrideDetails): string {
    const aiAction = decision.decision.action;
    const overrideAction = override.action;
    const confidence = Math.round(decision.confidence * 100);
    
    return `The AI recommended ${aiAction} with ${confidence}% confidence, but you chose to ${overrideAction}. ` +
           `This override is based on ${override.justification.reason} and is expected to have ` +
           `${override.impact.financial.netImpact > 0 ? 'positive' : 'negative'} financial impact.`;
  }

  private generateDetailedExplanation(decision: AIDecision, override: OverrideDetails): string {
    let explanation = `## AI Decision Analysis\n\n`;
    
    // AI reasoning
    explanation += `### AI Recommendation: ${decision.decision.action}\n`;
    explanation += `The AI analysis considered ${decision.analysis.primaryFactors.length} primary factors:\n`;
    decision.analysis.primaryFactors.forEach(factor => {
      explanation += `- **${factor.name}**: ${factor.value.toFixed(2)} (weight: ${factor.weight.toFixed(2)})\n`;
    });
    
    explanation += `\n### Override Justification\n`;
    explanation += `**Reason**: ${override.justification.reason}\n\n`;
    explanation += `**Rationale**:\n`;
    override.justification.rationale.forEach(point => {
      explanation += `- ${point}\n`;
    });
    
    explanation += `\n### Impact Assessment\n`;
    explanation += `- **Financial**: ${override.impact.financial.netImpact > 0 ? 'Positive' : 'Negative'} impact of $${Math.abs(override.impact.financial.netImpact).toLocaleString()}\n`;
    explanation += `- **Risk**: ${override.impact.risk.overallRiskChange > 0 ? 'Increased' : 'Decreased'} risk by ${Math.abs(override.impact.risk.overallRiskChange * 100).toFixed(1)}%\n`;
    explanation += `- **Operational**: ${override.impact.operational.complexity}/10 complexity score\n`;
    
    return explanation;
  }

  private generateVisualizations(decision: AIDecision, override: OverrideDetails): any[] {
    return [
      {
        type: 'factor_importance',
        title: 'AI Decision Factors',
        data: {
          factors: decision.analysis.primaryFactors.map(f => ({
            name: f.name,
            importance: f.weight,
            value: f.value,
            impact: f.impact
          }))
        },
        config: {
          chart: 'bar',
          xAxis: 'name',
          yAxis: 'importance',
          color: 'impact'
        },
        insights: ['The AI weighted these factors in its decision making process']
      },
      {
        type: 'risk_comparison',
        title: 'Risk Profile Comparison',
        data: {
          ai_risk: decision.riskScore,
          override_risk: decision.riskScore + override.impact.risk.overallRiskChange,
          threshold: 0.7
        },
        config: {
          chart: 'gauge',
          min: 0,
          max: 1,
          zones: [
            { min: 0, max: 0.3, color: 'green' },
            { min: 0.3, max: 0.7, color: 'yellow' },
            { min: 0.7, max: 1, color: 'red' }
          ]
        },
        insights: ['Risk levels before and after override']
      }
    ];
  }

  private generateInteractiveExplanations(decision: AIDecision, override: OverrideDetails): any[] {
    return [
      {
        type: 'parameter_simulator',
        title: 'What-If Analysis',
        component: 'ParameterSimulator',
        props: {
          parameters: decision.analysis.sensitivityAnalysis.parameters,
          baseline: decision.decision.parameters,
          override: override.parameters
        },
        description: 'Adjust parameters to see how they would affect the AI decision'
      },
      {
        type: 'scenario_explorer',
        title: 'Scenario Explorer',
        component: 'ScenarioExplorer',
        props: {
          scenarios: decision.analysis.riskAssessment.scenarios,
          current: decision.decision.action,
          override: override.action
        },
        description: 'Explore different market scenarios and their outcomes'
      }
    ];
  }

  private generateComparisons(decision: AIDecision, override: OverrideDetails): any[] {
    return [
      {
        title: 'AI vs Override Comparison',
        items: [
          {
            name: 'Action',
            value: { ai: decision.decision.action, override: override.action },
            comparison: decision.decision.action === override.action ? 'Same' : 'Different',
            significance: decision.decision.action === override.action ? 0 : 1
          },
          {
            name: 'Risk Level',
            value: { ai: decision.riskScore, override: decision.riskScore + override.impact.risk.overallRiskChange },
            comparison: override.impact.risk.overallRiskChange > 0 ? 'Higher' : 'Lower',
            significance: Math.abs(override.impact.risk.overallRiskChange)
          },
          {
            name: 'Expected Return',
            value: { ai: decision.analysis.performanceProjection.expectedReturn, override: override.impact.financial.expectedBenefit },
            comparison: override.impact.financial.expectedBenefit > decision.analysis.performanceProjection.expectedReturn ? 'Higher' : 'Lower',
            significance: Math.abs(override.impact.financial.expectedBenefit - decision.analysis.performanceProjection.expectedReturn)
          }
        ],
        insights: ['Key differences between AI recommendation and your override']
      }
    ];
  }

  private generateScenarios(decision: AIDecision, override: OverrideDetails): any[] {
    return [
      {
        scenario: 'AI Decision Followed',
        description: `If the AI recommendation (${decision.decision.action}) was followed`,
        outcome: `Expected return: ${decision.analysis.performanceProjection.expectedReturn.toFixed(2)}%, Risk: ${decision.riskScore.toFixed(2)}`,
        probability: decision.confidence,
        implications: [`AI confidence: ${Math.round(decision.confidence * 100)}%`]
      },
      {
        scenario: 'Override Applied',
        description: `With your override (${override.action}) applied`,
        outcome: `Expected return: ${override.impact.financial.expectedBenefit.toFixed(2)}%, Risk: ${(decision.riskScore + override.impact.risk.overallRiskChange).toFixed(2)}`,
        probability: override.justification.evidence.reduce((avg, e) => avg + e.reliability, 0) / override.justification.evidence.length,
        implications: [`Based on ${override.justification.evidence.length} pieces of evidence`]
      }
    ];
  }

  private generateLearningResources(decision: AIDecision, override: OverrideDetails): any[] {
    return [
      {
        type: 'article',
        title: 'Understanding AI Investment Decisions',
        content: 'Learn how AI makes investment decisions and when to override them',
        difficulty: 'beginner',
        duration: 10
      },
      {
        type: 'video',
        title: 'Portfolio Rebalancing Strategies',
        url: 'https://example.com/rebalancing-video',
        difficulty: 'intermediate',
        duration: 15
      },
      {
        type: 'interactive',
        title: 'Risk Assessment Tutorial',
        content: 'Interactive tutorial on assessing investment risks',
        difficulty: 'intermediate',
        duration: 20
      }
    ];
  }

  // Validation
  private validateOverride(decision: AIDecision, override: OverrideDetails): OverrideValidation {
    const validation: OverrideValidation = {
      isValid: true,
      warnings: [],
      requirements: [],
      approvals: []
    };

    // Check risk thresholds
    const newRisk = decision.riskScore + override.impact.risk.overallRiskChange;
    if (newRisk > 0.8) {
      validation.warnings.push({
        type: 'risk',
        message: 'Override significantly increases portfolio risk',
        severity: 'warning',
        dismissible: false
      });
    }

    // Check financial impact
    if (Math.abs(override.impact.financial.netImpact) > 10000) {
      validation.requirements.push({
        requirement: 'manager_approval',
        satisfied: false,
        description: 'Large financial impact requires manager approval',
        action: 'Request manager approval'
      });
      
      validation.approvals.push({
        approver: 'portfolio_manager',
        status: 'pending'
      });
    }

    // Check complexity
    if (override.impact.operational.complexity > 7) {
      validation.warnings.push({
        type: 'complexity',
        message: 'Override has high operational complexity',
        severity: 'warning',
        dismissible: true
      });
    }

    validation.isValid = validation.warnings.filter(w => w.severity === 'error').length === 0;
    
    return validation;
  }

  // Analytics
  public getOverrideAnalytics(): {
    total: number;
    byStatus: Record<OverrideStatus, number>;
    byType: Record<OverrideType, number>;
    byDecisionType: Record<DecisionType, number>;
    successRate: number;
    averageImpact: number;
  } {
    const overrides = this.getAllOverrides();
    
    const analytics = {
      total: overrides.length,
      byStatus: {} as Record<OverrideStatus, number>,
      byType: {} as Record<OverrideType, number>,
      byDecisionType: {} as Record<DecisionType, number>,
      successRate: 0,
      averageImpact: 0
    };

    // Count by status
    overrides.forEach(override => {
      analytics.byStatus[override.status] = (analytics.byStatus[override.status] || 0) + 1;
      analytics.byType[override.override.type] = (analytics.byType[override.override.type] || 0) + 1;
      analytics.byDecisionType[override.aiDecision.type] = (analytics.byDecisionType[override.aiDecision.type] || 0) + 1;
    });

    // Calculate success rate (approved + active / total)
    const successful = (analytics.byStatus.approved || 0) + (analytics.byStatus.active || 0);
    analytics.successRate = overrides.length > 0 ? successful / overrides.length : 0;

    // Calculate average impact
    const totalImpact = overrides.reduce((sum, override) => sum + override.override.impact.financial.netImpact, 0);
    analytics.averageImpact = overrides.length > 0 ? totalImpact / overrides.length : 0;

    return analytics;
  }

  // Utilities
  private loadExplanationTemplates(): void {
    // Load templates for different decision types
    this.explanationTemplates.set('allocation', {
      summary: 'Asset allocation decision',
      factors: ['market_conditions', 'risk_tolerance', 'returns'],
      visualizations: ['pie_chart', 'risk_return_scatter']
    });

    this.explanationTemplates.set('rebalance', {
      summary: 'Portfolio rebalancing decision',
      factors: ['drift', 'costs', 'market_timing'],
      visualizations: ['drift_chart', 'cost_analysis']
    });
  }

  private getDefaultTemplate(): any {
    return {
      summary: 'Investment decision',
      factors: ['general_factors'],
      visualizations: ['basic_chart']
    };
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }

  public on(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  public off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
      this.eventHandlers.set(event, handlers);
    }
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 