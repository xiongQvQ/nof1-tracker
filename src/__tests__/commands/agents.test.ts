import { handleAgentsCommand } from '../../commands/agents';

describe('Agents Command', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(handleAgentsCommand).toBeDefined();
    expect(typeof handleAgentsCommand).toBe('function');
  });

  it('should be an async function', () => {
    expect(handleAgentsCommand.constructor.name).toBe('AsyncFunction');
  });
});
