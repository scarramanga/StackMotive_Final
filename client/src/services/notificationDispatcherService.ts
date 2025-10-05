import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  recipients: NotificationRecipient[];
  data: NotificationData;
  triggers: NotificationTrigger[];
  scheduling: NotificationScheduling;
  delivery: DeliveryConfig;
  status: NotificationStatus;
  metadata: NotificationMetadata;
  created: string;
  sent: string;
  acknowledged: string;
}

export interface NotificationConfig {
  id: string;
  userId: string;
  preferences: NotificationPreferences;
  channels: ChannelConfig[];
  rules: NotificationRule[];
  templates: NotificationTemplate[];
  filters: NotificationFilter[];
  quotas: NotificationQuota[];
  escalation: EscalationConfig;
  metadata: ConfigMetadata;
}

export interface NotificationPreferences {
  globalEnabled: boolean;
  defaultChannels: NotificationChannel[];
  quietHours: QuietHours;
  frequency: FrequencyLimits;
  categories: CategoryPreferences;
  format: FormatPreferences;
}

export interface DispatchResult {
  id: string;
  eventId: string;
  channel: NotificationChannel;
  recipient: string;
  status: DispatchStatus;
  deliveryTime: number;
  attempts: number;
  errors: DispatchError[];
  metadata: DispatchMetadata;
  timestamp: string;
}

export interface NotificationQueue {
  id: string;
  name: string;
  priority: QueuePriority;
  events: QueuedEvent[];
  config: QueueConfig;
  metrics: QueueMetrics;
  status: QueueStatus;
}

export type NotificationType = 'signal_alert' | 'rebalance_event' | 'execution_alert' | 'system_alert' | 'user_message' | 'compliance_alert';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app' | 'webhook' | 'slack';
export type NotificationStatus = 'pending' | 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
export type DispatchStatus = 'success' | 'failed' | 'retry' | 'cancelled';
export type QueuePriority = 'low' | 'normal' | 'high' | 'realtime';
export type QueueStatus = 'active' | 'paused' | 'error' | 'maintenance';

export interface NotificationData {
  payload: Record<string, any>;
  attachments: Attachment[];
  links: NotificationLink[];
  actions: NotificationAction[];
}

export interface NotificationTrigger {
  condition: string;
  threshold: number;
  cooldown: number;
  repeat: boolean;
}

export interface NotificationScheduling {
  immediate: boolean;
  delayed: number;
  recurring: RecurringConfig;
  timezone: string;
}

export interface DeliveryConfig {
  retries: number;
  timeout: number;
  fallback: NotificationChannel[];
  confirmation: boolean;
}

export interface NotificationMetadata {
  source: string;
  category: string;
  tags: string[];
  tracking: TrackingInfo;
}

export interface NotificationRecipient {
  id: string;
  type: RecipientType;
  address: string;
  preferences: RecipientPreferences;
}

export interface ChannelConfig {
  channel: NotificationChannel;
  enabled: boolean;
  provider: string;
  credentials: Record<string, string>;
  settings: ChannelSettings;
  quotas: ChannelQuota;
}

export interface NotificationRule {
  id: string;
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  isActive: boolean;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject: string;
  body: string;
  variables: TemplateVariable[];
  styling: TemplateStyle;
}

export interface NotificationFilter {
  id: string;
  name: string;
  criteria: FilterCriteria;
  action: FilterAction;
  isActive: boolean;
}

export interface NotificationQuota {
  channel: NotificationChannel;
  limit: number;
  period: string;
  current: number;
  resetTime: string;
}

export interface EscalationConfig {
  enabled: boolean;
  levels: EscalationLevel[];
  timeout: number;
  fallback: EscalationAction;
}

export interface QueuedEvent {
  event: NotificationEvent;
  priority: number;
  scheduledTime: string;
  attempts: number;
  lastAttempt: string;
}

export interface QueueConfig {
  maxSize: number;
  batchSize: number;
  processingInterval: number;
  retryPolicy: RetryPolicy;
  priorityHandling: PriorityHandling;
}

export interface QueueMetrics {
  totalProcessed: number;
  successRate: number;
  averageDeliveryTime: number;
  currentSize: number;
  maxWaitTime: number;
  errorRate: number;
}

export interface AgentLogPayload {
  blockId: string;
  userId: string;
  action: string;
  timestamp: string;
  details: Record<string, any>;
}

type RecipientType = 'user' | 'group' | 'role' | 'external';

interface RecipientPreferences {
  channels: NotificationChannel[];
  frequency: string;
  format: string;
}

interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

interface FrequencyLimits {
  maxPerHour: number;
  maxPerDay: number;
  cooldown: number;
}

interface CategoryPreferences {
  [key: string]: {
    enabled: boolean;
    channels: NotificationChannel[];
    priority: NotificationPriority;
  };
}

interface FormatPreferences {
  html: boolean;
  markdown: boolean;
  plainText: boolean;
}

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface NotificationLink {
  text: string;
  url: string;
  type: LinkType;
}

interface NotificationAction {
  id: string;
  label: string;
  action: string;
  style: ActionStyle;
}

interface RecurringConfig {
  enabled: boolean;
  pattern: string;
  endDate: string;
  maxOccurrences: number;
}

interface TrackingInfo {
  opened: boolean;
  clicked: boolean;
  delivered: boolean;
  bounced: boolean;
}

interface ChannelSettings {
  format: string;
  template: string;
  encryption: boolean;
  compression: boolean;
}

interface ChannelQuota {
  daily: number;
  hourly: number;
  burst: number;
}

interface RuleCondition {
  field: string;
  operator: string;
  value: any;
  logic: string;
}

interface RuleAction {
  type: string;
  parameters: Record<string, any>;
}

interface TemplateVariable {
  name: string;
  type: string;
  required: boolean;
  defaultValue: any;
}

interface TemplateStyle {
  theme: string;
  colors: Record<string, string>;
  fonts: Record<string, string>;
}

interface FilterCriteria {
  field: string;
  operator: string;
  value: any;
}

interface FilterAction {
  type: 'block' | 'modify' | 'redirect' | 'delay';
  parameters: Record<string, any>;
}

interface EscalationLevel {
  level: number;
  delay: number;
  recipients: string[];
  channels: NotificationChannel[];
}

interface EscalationAction {
  type: string;
  recipients: string[];
}

interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  maxDelay: number;
}

interface PriorityHandling {
  strategy: 'fifo' | 'priority' | 'weighted';
  weights: Record<NotificationPriority, number>;
}

interface ConfigMetadata {
  version: string;
  lastUpdated: string;
  updatedBy: string;
}

interface DispatchError {
  code: string;
  message: string;
  timestamp: string;
  retryable: boolean;
}

interface DispatchMetadata {
  provider: string;
  messageId: string;
  cost: number;
  region: string;
}

type LinkType = 'action' | 'external' | 'internal';
type ActionStyle = 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

const API_BASE = '/api/notification-dispatcher';

async function fetchNotifications(userId: string): Promise<NotificationEvent[]> {
  const response = await fetch(`${API_BASE}/notifications?userId=${userId}`);
  if (!response.ok) throw new Error(`Failed to fetch notifications: ${response.statusText}`);
  return response.json();
}

async function fetchNotificationConfig(userId: string): Promise<NotificationConfig> {
  const response = await fetch(`${API_BASE}/config?userId=${userId}`);
  if (!response.ok) throw new Error(`Failed to fetch notification config: ${response.statusText}`);
  return response.json();
}

async function dispatchEvent(event: NotificationEvent): Promise<DispatchResult[]> {
  const response = await fetch(`${API_BASE}/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!response.ok) throw new Error(`Failed to dispatch event: ${response.statusText}`);
  return response.json();
}

async function updateNotificationConfig(config: NotificationConfig): Promise<NotificationConfig> {
  const response = await fetch(`${API_BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) throw new Error(`Failed to update notification config: ${response.statusText}`);
  return response.json();
}

async function getQueueStatus(): Promise<NotificationQueue[]> {
  const response = await fetch(`${API_BASE}/queues`);
  if (!response.ok) throw new Error(`Failed to get queue status: ${response.statusText}`);
  return response.json();
}

async function logAgentAction(payload: AgentLogPayload): Promise<void> {
  const response = await fetch('/api/agent/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Failed to log agent action: ${response.statusText}`);
}

export function useNotifications(userId: string) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => fetchNotifications(userId),
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
}

export function useNotificationConfig(userId: string) {
  return useQuery({
    queryKey: ['notification-config', userId],
    queryFn: () => fetchNotificationConfig(userId),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });
}

export function useDispatchEvent(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (event: NotificationEvent) => dispatchEvent(event),
    onSuccess: (results, event) => {
      logAgentAction({
        blockId: 'block-58',
        userId,
        action: 'dispatch_event',
        timestamp: new Date().toISOString(),
        details: {
          eventId: event.id,
          type: event.type,
          priority: event.priority,
          channels: event.channels,
          recipientCount: event.recipients.length,
          results: results.map(r => ({ channel: r.channel, status: r.status })),
          successRate: results.filter(r => r.status === 'success').length / results.length,
        },
      });
      
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });
}

export function useUpdateNotificationConfig(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: NotificationConfig) => updateNotificationConfig(config),
    onSuccess: (updatedConfig) => {
      logAgentAction({
        blockId: 'block-58',
        userId,
        action: 'update_notification_config',
        timestamp: new Date().toISOString(),
        details: {
          configId: updatedConfig.id,
          globalEnabled: updatedConfig.preferences.globalEnabled,
          channelsEnabled: updatedConfig.channels.filter(c => c.enabled).length,
          rulesActive: updatedConfig.rules.filter(r => r.isActive).length,
          quotasConfigured: updatedConfig.quotas.length,
        },
      });
      
      queryClient.setQueryData(['notification-config', userId], updatedConfig);
    },
  });
}

export function useQueueStatus() {
  return useQuery({
    queryKey: ['notification-queues'],
    queryFn: getQueueStatus,
    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 30,
  });
}

export function useNotificationDispatcherUtils(userId: string) {
  const formatNotificationType = useCallback((type: NotificationType): string => {
    const labels: Record<NotificationType, string> = {
      signal_alert: 'Signal Alert',
      rebalance_event: 'Rebalance Event',
      execution_alert: 'Execution Alert',
      system_alert: 'System Alert',
      user_message: 'User Message',
      compliance_alert: 'Compliance Alert',
    };
    return labels[type] || type;
  }, []);

  const formatNotificationChannel = useCallback((channel: NotificationChannel): string => {
    const labels: Record<NotificationChannel, string> = {
      email: 'Email',
      sms: 'SMS',
      push: 'Push',
      in_app: 'In-App',
      webhook: 'Webhook',
      slack: 'Slack',
    };
    return labels[channel] || channel;
  }, []);

  const getPriorityColor = useCallback((priority: NotificationPriority): string => {
    const colors: Record<NotificationPriority, string> = {
      low: '#6B7280',
      normal: '#10B981',
      high: '#F59E0B',
      urgent: '#EF4444',
      critical: '#7C2D12',
    };
    return colors[priority] || '#6B7280';
  }, []);

  return useMemo(() => ({
    formatNotificationType,
    formatNotificationChannel,
    getPriorityColor,
  }), [formatNotificationType, formatNotificationChannel, getPriorityColor]);
}

export const notificationDispatcherService = {
  fetchNotifications,
  fetchNotificationConfig,
  dispatchEvent,
  updateNotificationConfig,
  getQueueStatus,
  logAgentAction,
  
  queryKeys: {
    notifications: (userId: string) => ['notifications', userId],
    config: (userId: string) => ['notification-config', userId],
    queues: () => ['notification-queues'],
  },
  
  utils: {
    formatNotificationType: (type: NotificationType) => {
      const labels: Record<NotificationType, string> = {
        signal_alert: 'Signal Alert',
        rebalance_event: 'Rebalance Event',
        execution_alert: 'Execution Alert',
        system_alert: 'System Alert',
        user_message: 'User Message',
        compliance_alert: 'Compliance Alert',
      };
      return labels[type] || type;
    },
  },
}; 