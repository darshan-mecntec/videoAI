import {
  PromptRenderRequest,
  PromptRenderResult,
  PromptLintRequest,
  PromptLintResult,
  AppError
} from './types';

export class PromptService {
  renderPrompt(req: PromptRenderRequest): PromptRenderResult {
    if (!req.template_text) {
      throw new AppError(400, 'INVALID_INPUT', 'Field template_text is required');
    }

    const variables = req.variables || {};
    const variablesUsed: string[] = [];
    const missingVariables: string[] = [];

    // Find all {{var_name}} matches
    const variablePattern = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    let match: RegExpExecArray | null;
    const requiredVarsSet = new Set<string>();

    while ((match = variablePattern.exec(req.template_text)) !== null) {
      requiredVarsSet.add(match[1]);
    }

    let rendered = req.template_text;

    for (const varName of requiredVarsSet) {
      if (Object.prototype.hasOwnProperty.call(variables, varName) && variables[varName] !== undefined) {
        variablesUsed.push(varName);
        const replaceRegex = new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g');
        rendered = rendered.replace(replaceRegex, String(variables[varName]));
      } else {
        missingVariables.push(varName);
      }
    }

    // Estimate token count (~4 characters per token average)
    const estimatedTokens = Math.ceil(rendered.length / 4);

    return {
      rendered_text: rendered,
      estimated_tokens: estimatedTokens,
      variables_used: variablesUsed.sort(),
      missing_variables: missingVariables.sort(),
    };
  }

  lintPrompt(req: PromptLintRequest): PromptLintResult {
    if (!req.prompt) {
      throw new AppError(400, 'INVALID_INPUT', 'Field prompt is required');
    }

    const estimatedTokens = Math.ceil(req.prompt.length / 4);
    const warnings: string[] = [];
    const bannedWordsFound: string[] = [];

    const maxTokens = req.max_tokens || 1000;
    if (estimatedTokens > maxTokens) {
      warnings.push(`Prompt estimated tokens (${estimatedTokens}) exceeds maximum budget (${maxTokens}).`);
    }

    const defaultBanned = ['malware', 'exploit', 'hack', 'nsfw_explicit'];
    const bannedWords = req.banned_words && req.banned_words.length > 0 ? req.banned_words : defaultBanned;

    const lowerPrompt = req.prompt.toLowerCase();
    for (const word of bannedWords) {
      if (lowerPrompt.includes(word.toLowerCase())) {
        bannedWordsFound.push(word);
        warnings.push(`Banned word or unsafe phrase detected: "${word}".`);
      }
    }

    return {
      is_valid: bannedWordsFound.length === 0 && warnings.length === 0,
      estimated_tokens: estimatedTokens,
      warnings,
      banned_words_found: bannedWordsFound,
    };
  }
}
