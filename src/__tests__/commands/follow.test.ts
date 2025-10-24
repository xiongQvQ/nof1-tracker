import { handleFollowCommand } from '../../commands/follow';

describe('Follow Command', () => {
  it('should be defined', () => {
    expect(handleFollowCommand).toBeDefined();
    expect(typeof handleFollowCommand).toBe('function');
  });

  it('should be an async function', () => {
    expect(handleFollowCommand.constructor.name).toBe('AsyncFunction');
  });

  it('should accept agentName and options parameters', () => {
    expect(handleFollowCommand.length).toBe(2);
  });
});
