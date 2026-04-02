class GovernanceService {
  async checkPermissionWithDecision(action, context = {}) {
    // Phase 7 mock hook for Sarathi PDP. Real endpoint call will replace this.
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

  async checkPermission(action, context = {}) {
    const evaluation = await this.checkPermissionWithDecision(action, context);
    return Boolean(evaluation.allowed);
  }
}

module.exports = new GovernanceService();
