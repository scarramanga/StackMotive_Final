import OpenAI from 'openai';

// Block 93 Implementation: Strong types
export interface Signal {
  signal_id: string;
  user_id: string;
  vault_id: string;
  symbol: string;
  signal_type: string;
  confidence?: number;
  action?: string;
  headline?: string;
  source?: string;
  timestamp: string;
}

export interface Decision {
  action: 'buy' | 'sell' | 'hold' | 'alert';
  asset: string;
  confidence: number;
  rationale?: string;
}

export interface AuthSession {
  userId: string;
  email: string;
}

export interface SignalGPTAgentConfig {
  systemPrompt?: string;
  model?: string;
  temperature?: number;
}

// Block 93 Implementation: In-memory cache (vault/session scoped)
const agentCache = new Map<string, Decision[]>();

// Block 104 Implementation
const LEGAL_DISCLAIMER = 'This response is for informational purposes only and should not be interpreted as financial advice. Use of StackMotive is subject to the full disclaimer at /legal/disclaimer.';

export class SignalGPTAgent {
  private vaultId: string;
  private session: AuthSession;
  private config: SignalGPTAgentConfig;
  private openai: OpenAI;

  constructor(vaultId: string, session: AuthSession, config: SignalGPTAgentConfig = {}) {
    this.vaultId = vaultId;
    this.session = session;
    this.config = {
      systemPrompt: config.systemPrompt || `You are a financial decision agent. Given a list of signals, output structured trade decisions.\n\n${LEGAL_DISCLAIMER}`,
      model: config.model || 'gpt-4o',
      temperature: config.temperature ?? 0.2,
    };
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // Block 93 Implementation: Main run method
  async run(signals: Signal[]): Promise<Decision[]> {
    // SSR-safe, Vault-context-bound
    if (!this.vaultId || !this.session?.userId) return [];
    const cacheKey = this._getCacheKey(signals);
    if (agentCache.has(cacheKey)) {
      return agentCache.get(cacheKey)!;
    }
    // Format messages for GPT
    const messages = this._formatMessages(signals);
    const req = {
      model: this.config.model!,
      messages,
      temperature: this.config.temperature,
      max_tokens: 512,
      functions: [
        {
          name: 'make_decision',
          description: 'Make a structured trading decision for a signal',
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['buy', 'sell', 'hold', 'alert'] },
              asset: { type: 'string' },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              rationale: { type: 'string' },
            },
            required: ['action', 'asset', 'confidence'],
          },
        },
      ],
    };
    let response;
    try {
      response = await this.openai.chat.completions.create(req);
    } catch (err) {
      // Retry once on failure
      response = await this.openai.chat.completions.create(req);
    }
    const decisions = this._postProcess(response);
    agentCache.set(cacheKey, decisions);
    return decisions;
  }

  // Block 93 Implementation: Message formatting
  private _formatMessages(signals: Signal[]) {
    return [
      { role: 'system' as const, content: this.config.systemPrompt! },
      {
        role: 'user' as const,
        content:
          `Signals for vault ${this.vaultId} (user: ${this.session.userId}):\n` +
          signals
            .map(
              s =>
                `- [${s.signal_type}] ${s.symbol} (${s.confidence !== undefined ? (s.confidence * 100).toFixed(1) + '%' : 'N/A'}) at ${s.timestamp}`
            )
            .join('\n'),
      },
    ];
  }

  // Block 93 Implementation: Post-processing
  private _postProcess(data: any): Decision[] {
    // Parse function call results or message content
    if (!data || !data.choices) return [];
    const out: Decision[] = [];
    for (const choice of data.choices) {
      if (choice.message?.function_call?.arguments) {
        try {
          const args = JSON.parse(choice.message.function_call.arguments);
          if (args && args.action && args.asset && typeof args.confidence === 'number') {
            out.push({
              action: args.action,
              asset: args.asset,
              confidence: args.confidence,
              rationale: args.rationale,
            });
          }
        } catch {}
      }
    }
    return out;
  }

  // Block 93 Implementation: Cache key
  private _getCacheKey(signals: Signal[]): string {
    return `${this.vaultId}:${this.session.userId}:${signals.map(s => s.signal_id).join(',')}`;
  }
} 