import * as commands from '../../commands';

describe('Commands Index', () => {
  it('should export all command handlers', () => {
    expect(commands.handleAnalyzeCommand).toBeDefined();
    expect(commands.handleExecuteCommand).toBeDefined();
    expect(commands.handleListCommand).toBeDefined();
    expect(commands.handleAgentsCommand).toBeDefined();
    expect(commands.handleFollowCommand).toBeDefined();
    expect(commands.handleStatusCommand).toBeDefined();
  });

  it('should export functions', () => {
    expect(typeof commands.handleAnalyzeCommand).toBe('function');
    expect(typeof commands.handleExecuteCommand).toBe('function');
    expect(typeof commands.handleListCommand).toBe('function');
    expect(typeof commands.handleAgentsCommand).toBe('function');
    expect(typeof commands.handleFollowCommand).toBe('function');
    expect(typeof commands.handleStatusCommand).toBe('function');
  });
});
