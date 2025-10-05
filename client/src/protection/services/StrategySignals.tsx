// Block 5 Implementation: Unified Strategy & Signals component
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap } from 'lucide-react';

export interface StrategySignalsProps {
  strategies: Array<{ name: string; label: string; color: string; description?: string }>;
  signals: Array<{ type: string; symbol: string; action: string; confidence: string }>;
  contextLabel?: string;
  activeStrategy: string;
  onStrategyChange: (strategy: string) => void;
}

const confidenceColor = (confidence: string) => {
  switch (confidence) {
    case 'high': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const StrategySignals: React.FC<StrategySignalsProps> = ({
  strategies,
  signals,
  contextLabel,
  activeStrategy,
  onStrategyChange,
}) => {
  return (
    <TooltipProvider delayDuration={100}>
      <Card className="mb-4">
        <CardHeader className="pb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Strategy & Signals {contextLabel && <span className="ml-2 text-xs font-normal text-muted-foreground">({contextLabel})</span>}</CardTitle>
            <CardDescription>Active strategies and recommendations</CardDescription>
          </div>
          <Select value={activeStrategy} onValueChange={onStrategyChange}>
            <SelectTrigger className="h-8 text-xs bg-white border-purple-200 w-36">
              <SelectValue placeholder="Select Strategy" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Trading Strategies</SelectLabel>
                {strategies.map((s) => (
                  <SelectItem key={s.name} value={s.name}>{s.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-2">
            {strategies.map((s) => (
              <Tooltip key={s.name}>
                <TooltipTrigger asChild>
                  <span className="cursor-pointer">
                    <Badge
                      variant={activeStrategy === s.name ? 'default' : 'outline'}
                      className={
                        activeStrategy === s.name
                          ? `${s.color} text-white`
                          : `border ${s.color.replace('bg-', 'border-')} text-${s.color.split('-')[1]}-700`
                      }
                    >
                      {s.label}
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-xs">{s.description || s.label}</span>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
          <div>
            <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Active Signals</h4>
            {signals.length === 0 ? (
              <div className="text-xs text-muted-foreground">No signals at this time.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {signals.map((sig, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50">
                    <span className="font-semibold text-foreground">{sig.symbol}</span>
                    <span className="uppercase font-bold text-primary">{sig.action}</span>
                    <span className="text-muted-foreground">{sig.type}</span>
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-xs ${confidenceColor(sig.confidence)}`}>{sig.confidence}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default StrategySignals; 