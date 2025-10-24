import { handleExecuteCommand } from '../../commands/execute';

describe('Execute Command', () => {
  it('should be defined', () => {
    expect(handleExecuteCommand).toBeDefined();
    expect(typeof handleExecuteCommand).toBe('function');
  });

  it('should be an async function', () => {
    expect(handleExecuteCommand.constructor.name).toBe('AsyncFunction');
  });

  it('should accept planId and options parameters', () => {
    expect(handleExecuteCommand.length).toBe(2);
  });
});
