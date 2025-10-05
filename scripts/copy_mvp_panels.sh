#!/bin/bash

# Create panels directory if it doesn't exist
mkdir -p /Users/andrewboss/StackMotive_Final/client/src/components/panels

# List of MVP panels to copy
MVP_PANELS=(
    "PortfolioOverviewPanel.tsx"
    "MarketOverviewPanel.tsx"
    "NewsStreamRelayPanel.tsx"
    "WatchlistPanel.tsx"
    "SimplePerformancePanel.tsx"
    "StackAIChatPanel.tsx"
    "SentimentDashboardPanel.tsx"
    "AlertPanel.tsx"
    "CorrelationMatrixPanel.tsx"
    "EarningsCalendarPanel.tsx"
    "TechnicalIndicatorsPanel.tsx"
    "PortfolioHealthPanel.tsx"
    "DcaStopLossPanel.tsx"
    "NotificationCenter.tsx"
    "PreferencesPanel.tsx"
    "DarkPoolPanel.tsx"
    "SmartMoneyTrackerPanel.tsx"
    "OptionsFlowPanel.tsx"
    "InstitutionalFlowTrackerPanel.tsx"
    "VolumeAnalysisPanel.tsx"
    "RebalancePromptPanel.tsx"
    "BacktestPanel.tsx"
    "WhaleWatcherPanel.tsx"
    "InsiderTradingPanel.tsx"
    "SovereignSignalPanel.tsx"
    "RiskMetricsPanel.tsx"
)

# Source directory for V12 panels
V12_PANELS_DIR="/Users/andrewboss/Downloads/StackMotive-V12/client/src/components/panels"

# Destination directory
DEST_DIR="/Users/andrewboss/StackMotive_Final/client/src/components/panels"

# Copy each MVP panel
for panel in "${MVP_PANELS[@]}"; do
    if [ -f "$V12_PANELS_DIR/$panel" ]; then
        cp "$V12_PANELS_DIR/$panel" "$DEST_DIR/"
        echo "Copied $panel"
    else
        echo "Warning: $panel not found in V12"
    fi
done
