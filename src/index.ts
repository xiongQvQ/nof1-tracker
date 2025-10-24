#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import {
  handleAnalyzeCommand,
  handleExecuteCommand,
  handleListCommand,
  handleAgentsCommand,
  handleFollowCommand,
  handleStatusCommand
} from './commands';
import { handleError } from './utils/command-helpers';

// Load environment variables
dotenv.config();

// ============================================================================
// CLI Program Setup
// ============================================================================

const program = new Command();

program
  .name('nof1-trade')
  .description('CLI tool for automated contract trading based on nof1 AI agents')
  .version('1.0.0');

// ============================================================================
// Command Registration
// ============================================================================

// Analyze command
program
  .command('analyze')
  .description('Analyze trading plans from nof1 API')
  .option('-r, --risk-only', 'only perform risk assessment without executing trades')
  .option('-t, --price-tolerance <percentage>', 'set price tolerance threshold (default: 0.5%)', parseFloat)
  .option('-m, --total-margin <amount>', 'set total margin for futures trading (default: 1000 USDT)', parseFloat)
  .action(async (options) => {
    try {
      await handleAnalyzeCommand(options);
    } catch (error) {
      handleError(error, 'Analysis failed');
    }
  });

// Execute command
program
  .command('execute <plan-id>')
  .description('Execute a specific trading plan by ID')
  .option('-f, --force', 'execute trade even if risk assessment fails')
  .option('-t, --price-tolerance <percentage>', 'set price tolerance threshold (default: 0.5%)', parseFloat)
  .option('-m, --total-margin <amount>', 'set total margin for futures trading (default: 1000 USDT)', parseFloat)
  .action(async (planId, options) => {
    try {
      await handleExecuteCommand(planId, options);
    } catch (error) {
      handleError(error, 'Execution failed');
    }
  });

// List command
program
  .command('list')
  .description('List available trading plans without execution')
  .action(async () => {
    try {
      await handleListCommand();
    } catch (error) {
      handleError(error, 'Failed to list plans');
    }
  });

// List agents command
program
  .command('agents')
  .description('List all available AI agents')
  .action(async () => {
    try {
      await handleAgentsCommand();
    } catch (error) {
      handleError(error, 'Failed to fetch agents');
    }
  });

// Follow agent command
program
  .command('follow <agent-name>')
  .description('Follow a specific AI agent and copy their trades')
  .option('-r, --risk-only', 'only perform risk assessment without executing trades')
  .option('-i, --interval <seconds>', 'polling interval in seconds for continuous monitoring', '30')
  .option('-t, --price-tolerance <percentage>', 'set price tolerance threshold (default: 0.5%)', parseFloat)
  .option('-m, --total-margin <amount>', 'set total margin for futures trading (default: 1000 USDT)', parseFloat)
  .action(async (agentName, options) => {
    try {
      await handleFollowCommand(agentName, options);
    } catch (error) {
      handleError(error, 'Follow agent failed');
    }
  });

// Status command
program
  .command('status')
  .description('Check system status and configuration')
  .action(() => {
    handleStatusCommand();
  });

// ============================================================================
// Parse CLI Arguments
// ============================================================================

program.parse();
