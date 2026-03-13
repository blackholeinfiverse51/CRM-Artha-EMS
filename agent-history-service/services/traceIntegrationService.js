const axios = require('axios');
const TraceMiddleware = require('../middleware/traceMiddleware');

class TraceIntegrationService {
  constructor() {
    this.services = {
      workflow: 'http://localhost:5001/api',
      crm: 'http://localhost:8000/api', 
      finance: 'http://localhost:5002/api'
    };
  }

  // Propagate trace to Workflow EMS
  async propagateToWorkflow(trace_id, action_data) {
    try {
      const config = TraceMiddleware.propagateTrace(trace_id, {
        method: 'POST',
        url: `${this.services.workflow}/agent-integration/action`,
        data: {
          ...action_data,
          trace_id,
          source: 'agent-history-service'
        }
      });

      const response = await axios(config);
      
      TraceMiddleware.logWithTrace(trace_id, 'info', 'Trace propagated to Workflow EMS', {
        response_status: response.status,
        workflow_trace_id: response.data?.trace_id
      });

      return response.data;
    } catch (error) {
      TraceMiddleware.logWithTrace(trace_id, 'error', 'Failed to propagate to Workflow EMS', {
        error: error.message
      });
      throw error;
    }
  }

  // Propagate trace to AI CRM
  async propagateToCRM(trace_id, action_data) {
    try {
      const config = TraceMiddleware.propagateTrace(trace_id, {
        method: 'POST',
        url: `${this.services.crm}/agent-integration/action`,
        data: {
          ...action_data,
          trace_id,
          source: 'agent-history-service'
        }
      });

      const response = await axios(config);
      
      TraceMiddleware.logWithTrace(trace_id, 'info', 'Trace propagated to AI CRM', {
        response_status: response.status,
        crm_trace_id: response.data?.trace_id
      });

      return response.data;
    } catch (error) {
      TraceMiddleware.logWithTrace(trace_id, 'error', 'Failed to propagate to AI CRM', {
        error: error.message
      });
      throw error;
    }
  }

  // Propagate trace to Artha Finance
  async propagateToFinance(trace_id, action_data) {
    try {
      const config = TraceMiddleware.propagateTrace(trace_id, {
        method: 'POST',
        url: `${this.services.finance}/agent-integration/action`,
        data: {
          ...action_data,
          trace_id,
          source: 'agent-history-service'
        }
      });

      const response = await axios(config);
      
      TraceMiddleware.logWithTrace(trace_id, 'info', 'Trace propagated to Artha Finance', {
        response_status: response.status,
        finance_trace_id: response.data?.trace_id
      });

      return response.data;
    } catch (error) {
      TraceMiddleware.logWithTrace(trace_id, 'error', 'Failed to propagate to Artha Finance', {
        error: error.message
      });
      throw error;
    }
  }

  // Propagate trace to all relevant services
  async propagateToAllServices(trace_id, action_data) {
    const results = {};
    const { action_type } = action_data;

    try {
      // Determine which services need the trace based on action type
      const serviceMap = {
        'employee_': ['workflow'],
        'attendance_': ['workflow'],
        'customer_': ['crm'],
        'lead_': ['crm'],
        'expense_': ['finance'],
        'transaction_': ['finance'],
        'inventory_': ['workflow', 'crm'],
        'order_': ['crm', 'finance']
      };

      const targetServices = [];
      for (const [prefix, services] of Object.entries(serviceMap)) {
        if (action_type.startsWith(prefix)) {
          targetServices.push(...services);
          break;
        }
      }

      // If no specific mapping, propagate to all services
      if (targetServices.length === 0) {
        targetServices.push('workflow', 'crm', 'finance');
      }

      // Propagate to target services
      const propagationPromises = [];
      
      if (targetServices.includes('workflow')) {
        propagationPromises.push(
          this.propagateToWorkflow(trace_id, action_data)
            .then(result => { results.workflow = result; })
            .catch(error => { results.workflow = { error: error.message }; })
        );
      }

      if (targetServices.includes('crm')) {
        propagationPromises.push(
          this.propagateToCRM(trace_id, action_data)
            .then(result => { results.crm = result; })
            .catch(error => { results.crm = { error: error.message }; })
        );
      }

      if (targetServices.includes('finance')) {
        propagationPromises.push(
          this.propagateToFinance(trace_id, action_data)
            .then(result => { results.finance = result; })
            .catch(error => { results.finance = { error: error.message }; })
        );
      }

      await Promise.all(propagationPromises);

      TraceMiddleware.logWithTrace(trace_id, 'info', 'Trace propagation completed', {
        target_services: targetServices,
        propagation_results: Object.keys(results)
      });

      return {
        success: true,
        trace_id,
        propagated_to: targetServices,
        results
      };
    } catch (error) {
      TraceMiddleware.logWithTrace(trace_id, 'error', 'Trace propagation failed', {
        error: error.message
      });
      
      return {
        success: false,
        trace_id,
        error: error.message,
        partial_results: results
      };
    }
  }

  // Collect trace from all services
  async collectTraceFromAllServices(trace_id) {
    const traceData = {
      trace_id,
      services: {},
      collection_timestamp: new Date().toISOString()
    };

    try {
      // Collect from each service
      const collectionPromises = [
        this.collectFromWorkflow(trace_id),
        this.collectFromCRM(trace_id),
        this.collectFromFinance(trace_id)
      ];

      const results = await Promise.allSettled(collectionPromises);
      
      results.forEach((result, index) => {
        const serviceNames = ['workflow', 'crm', 'finance'];
        const serviceName = serviceNames[index];
        
        if (result.status === 'fulfilled') {
          traceData.services[serviceName] = result.value;
        } else {
          traceData.services[serviceName] = { 
            error: result.reason?.message || 'Collection failed' 
          };
        }
      });

      TraceMiddleware.logWithTrace(trace_id, 'info', 'Trace collection completed', {
        services_collected: Object.keys(traceData.services)
      });

      return traceData;
    } catch (error) {
      TraceMiddleware.logWithTrace(trace_id, 'error', 'Trace collection failed', {
        error: error.message
      });
      throw error;
    }
  }

  // Helper methods for collecting from individual services
  async collectFromWorkflow(trace_id) {
    const config = TraceMiddleware.propagateTrace(trace_id, {
      method: 'GET',
      url: `${this.services.workflow}/agent-integration/trace/${trace_id}`
    });
    
    const response = await axios(config);
    return response.data;
  }

  async collectFromCRM(trace_id) {
    const config = TraceMiddleware.propagateTrace(trace_id, {
      method: 'GET',
      url: `${this.services.crm}/agent-integration/trace/${trace_id}`
    });
    
    const response = await axios(config);
    return response.data;
  }

  async collectFromFinance(trace_id) {
    const config = TraceMiddleware.propagateTrace(trace_id, {
      method: 'GET',
      url: `${this.services.finance}/agent-integration/trace/${trace_id}`
    });
    
    const response = await axios(config);
    return response.data;
  }
}

module.exports = new TraceIntegrationService();