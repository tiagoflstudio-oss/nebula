import { supabase } from '../lib/supabaseClient';

/**
 * Usage Service - Track token consumption and quotas
 */

const PRICING = {
  'gpt-4o': { input: 5, output: 15 }, // per 1M tokens
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4.1-mini': { input: 0.15, output: 0.60 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'claude-3-5-sonnet-20240620': { input: 3, output: 15 },
  'gemini-1.5-pro': { input: 3.5, output: 10.5 },
  'default': { input: 0, output: 0 }
};

/**
 * Log AI request usage to Supabase
 */
export async function trackUsage(userId, provider, model, tokens) {
  if (!supabase || !userId) return;

  const prompt_tokens = tokens?.prompt_tokens || 0;
  const completion_tokens = tokens?.completion_tokens || 0;
  const total_tokens = prompt_tokens + completion_tokens;

  // Calculate approximate cost
  const modelPricing = PRICING[model] || PRICING['default'];
  const cost = ((prompt_tokens * modelPricing.input) + (completion_tokens * modelPricing.output)) / 1000000;

  try {
    const { error } = await supabase
      .from('usage_logs')
      .insert([{
        user_id: userId,
        provider,
        model,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        cost
      }]);

    if (error) throw error;
    
    // Atualiza a cota total gasta pelo usuário
    const { data: quota } = await supabase
      .from('user_quotas')
      .select('used_tokens')
      .eq('user_id', userId)
      .single();
      
    if (quota) {
      await supabase
        .from('user_quotas')
        .update({ used_tokens: Number(quota.used_tokens) + total_tokens })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('user_quotas')
        .insert([{ user_id: userId, used_tokens: total_tokens }]);
    }

    console.log(`📊 [Usage Tracker] ${total_tokens} tokens tracked for ${model}`);
  } catch (err) {
    console.error('❌ [Usage Tracker Error]:', err.message);
  }
}

/**
 * Get user quota and usage summary
 */
export async function getUserQuota(userId) {
  if (!supabase || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_quotas')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (!data) {
      // Create default quota if not exists
      const { data: newQuota, error: createError } = await supabase
        .from('user_quotas')
        .insert([{ user_id: userId }])
        .select()
        .single();
      
      if (createError) throw createError;
      return newQuota;
    }

    return data;
  } catch (err) {
    console.error('❌ [Quota Service Error]:', err.message);
    return null;
  }
}

/**
 * Get recent usage history
 */
export async function getUsageHistory(userId, limit = 50) {
  if (!supabase || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('usage_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('❌ [Usage History Error]:', err.message);
    return [];
  }
}
