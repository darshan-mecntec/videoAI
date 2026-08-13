import { PromptService } from '../../src/domain/promptService';
import { AppError } from '../../src/domain/types';

describe('PromptService', () => {
  let promptService: PromptService;

  beforeEach(() => {
    promptService = new PromptService();
  });

  describe('renderPrompt', () => {
    it('should interpolate {{variable}} placeholders with provided values', () => {
      const result = promptService.renderPrompt({
        template_text: 'Studio photo of {{product_name}} in {{setting}} at {{time_of_day}}',
        variables: {
          product_name: 'Wireless Earbuds',
          setting: 'minimalist marble studio',
          time_of_day: 'golden hour',
        },
      });

      expect(result.rendered_text).toBe('Studio photo of Wireless Earbuds in minimalist marble studio at golden hour');
      expect(result.variables_used).toEqual(['product_name', 'setting', 'time_of_day']);
      expect(result.missing_variables).toEqual([]);
      expect(result.estimated_tokens).toBeGreaterThan(0);
    });

    it('should track missing variables when not supplied in request', () => {
      const result = promptService.renderPrompt({
        template_text: 'Photo of {{product}} with {{background}}',
        variables: {
          product: 'Watch',
        },
      });

      expect(result.rendered_text).toBe('Photo of Watch with {{background}}');
      expect(result.variables_used).toEqual(['product']);
      expect(result.missing_variables).toEqual(['background']);
    });

    it('should throw AppError 400 when template_text is missing', () => {
      expect(() => promptService.renderPrompt({ template_text: '' })).toThrow(AppError);
    });
  });

  describe('lintPrompt', () => {
    it('should pass linting for safe prompts within token budget', () => {
      const result = promptService.lintPrompt({
        prompt: 'Futuristic sci-fi city with flying vehicles in 8k resolution',
        max_tokens: 100,
      });

      expect(result.is_valid).toBe(true);
      expect(result.warnings).toEqual([]);
      expect(result.banned_words_found).toEqual([]);
    });

    it('should flag warnings when token limit or banned words are encountered', () => {
      const result = promptService.lintPrompt({
        prompt: 'Unsafe prompt containing exploit malware',
        max_tokens: 5,
      });

      expect(result.is_valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.banned_words_found).toContain('exploit');
      expect(result.banned_words_found).toContain('malware');
    });

    it('should throw AppError 400 when prompt is missing', () => {
      expect(() => promptService.lintPrompt({ prompt: '' })).toThrow(AppError);
    });
  });
});
