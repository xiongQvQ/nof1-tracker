#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import {
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
