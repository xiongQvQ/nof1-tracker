import { handleListCommand } from '../../commands/list';

describe('List Command', () => {
  it('should be defined', () => {
    expect(handleListCommand).toBeDefined();
    expect(typeof handleListCommand).toBe('function');
  });

  it('should be an async function', () => {
    expect(handleListCommand.constructor.name).toBe('AsyncFunction');
  });

  it('should accept no parameters', () => {
    expect(handleListCommand.length).toBe(0);
  });
});
