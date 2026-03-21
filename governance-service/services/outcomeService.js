const Outcome = require('../models/Outcome');

class OutcomeService {
  calculateScore(result) {
    if (!result) return 0;
    if (result.error) return 0.2;
    if (result.success === true) return 1.0;
    return 0.5;
  }

  determineEffectiveness(score, resolutionTime) {
    if (score >= 0.8 && resolutionTime < 5000) return 'high';
    if (score >= 0.5 && resolutionTime < 10000) return 'medium';
    return 'low';
  }

  async recordOutcome(trace_id, proposal_id, action_type, result, startTime) {
    const resolution_time = Date.now() - startTime;
    const success_score = this.calculateScore(result);
    const failure_signal = result?.error ? true : false;
    const action_effectiveness = this.determineEffectiveness(success_score, resolution_time);

    const outcome = new Outcome({
      trace_id,
      proposal_id,
      action_type,
      success_score,
      resolution_time,
      failure_signal,
      action_effectiveness,
      execution_result: result
    });

    await outcome.save();
    return outcome;
  }

  async getOutcomes(filters = {}) {
    return await Outcome.find(filters).sort({ created_at: -1 });
  }

  async getMetrics() {
    const outcomes = await Outcome.find();
    const total = outcomes.length;
    const avgScore = outcomes.reduce((sum, o) => sum + o.success_score, 0) / total || 0;
    const avgTime = outcomes.reduce((sum, o) => sum + o.resolution_time, 0) / total || 0;
    const failureRate = outcomes.filter(o => o.failure_signal).length / total || 0;

    return { total, avgScore, avgTime, failureRate };
  }
}

module.exports = new OutcomeService();
