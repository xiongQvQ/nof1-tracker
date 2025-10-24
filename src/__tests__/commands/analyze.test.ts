import { handleAnalyzeCommand } from '../../commands/analyze';

describe('Analyze Command', () => {
  it('should be defined', () => {
    expect(handleAnalyzeCommand).toBeDefined();
    expect(typeof handleAnalyzeCommand).toBe('function');
  });

  it('should be an async function', () => {
    expect(handleAnalyzeCommand.constructor.name).toBe('AsyncFunction');
  });

  it('should accept options parameter', () => {
    expect(handleAnalyzeCommand.length).toBe(1);
  });
});
