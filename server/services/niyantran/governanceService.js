class GovernanceService {
  async checkPermission(action, context = {}) {
    // Phase 2 mock hook for Sarathi PDP. Real endpoint call will replace this.
    return {
      allowed: true,
      decision: {
        engine: 'sarathi-mock',
        decision: 'allow',
        action,
        policyId: 'PDP-NIYANTRAN-MOCK-001',
        evaluatedAt: new Date().toISOString(),
        context,
      },
    };
  }
}

module.exports = new GovernanceService();
