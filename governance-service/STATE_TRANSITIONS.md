# 🔄 Governance Lifecycle - State Transitions

## Visual Flow Diagram

```mermaid
stateDiagram-v2
    [*] --> CREATED: Agent submits proposal
    
    CREATED --> REVIEWED: Validation Service
    
    REVIEWED --> APPROVED: Approval granted
    REVIEWED --> REJECTED: Approval denied
    
    APPROVED --> EXECUTED: Workflow Engine
    
    EXECUTED --> COMPLETED: Outcome recorded
    
    REJECTED --> [*]: Terminal state
    COMPLETED --> [*]: Terminal state
    
    note right of CREATED
        trace_id generated here
        Agent has NO execution rights
    end note
    
    note right of REVIEWED
        Business rules checked
        Policy validation
    end note
    
    note right of APPROVED
        Auto or manual approval
        Required for execution
    end note
    
    note right of REJECTED
        STOPS HERE
        Cannot proceed to execution
    end note
    
    note right of EXECUTED
        Deterministic workflow
        Immutable logs created
    end note
    
    note right of COMPLETED
        Final outcome logged
        Metrics recorded
    end note
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant Agent
    participant Governance
    participant Validation
    participant Approval
    participant Workflow
    participant TargetService
    participant Database
    
    Agent->>Governance: POST /proposals/create
    Governance->>Database: Save proposal (CREATED)
    Governance-->>Agent: {proposal_id, trace_id}
    
    Agent->>Governance: POST /proposals/review
    Governance->>Validation: Validate business rules
    Validation->>Database: Update status (REVIEWED)
    Validation-->>Governance: {valid: true}
    Governance-->>Agent: Review complete
    
    Agent->>Governance: POST /proposals/approve
    Governance->>Approval: Check approval rules
    Approval->>Database: Update status (APPROVED)
    Approval-->>Governance: Approved
    Governance-->>Agent: Approval granted
    
    Agent->>Governance: POST /workflow/execute
    Governance->>Workflow: Execute with trace_id
    Workflow->>TargetService: HTTP call (X-Trace-ID header)
    TargetService-->>Workflow: Result
    Workflow->>Database: Update status (EXECUTED)
    Workflow->>Database: Save execution logs
    Workflow-->>Governance: Execution complete
    Governance-->>Agent: {execution_id, status}
    
    Workflow->>Database: Update status (COMPLETED)
    Workflow->>Database: Save outcome metrics
```

## Data Flow

```mermaid
flowchart TD
    A[Agent Creates Proposal] -->|trace_id: xyz-789| B[Proposal CREATED]
    B --> C{Validation Service}
    C -->|Pass| D[Status: REVIEWED]
    C -->|Fail| E[Status: REVIEWED + Invalid]
    
    D --> F{Approval Service}
    E --> F
    
    F -->|Approved| G[Status: APPROVED]
    F -->|Rejected| H[Status: REJECTED - STOP]
    
    G --> I{Workflow Engine}
    I -->|Check Status| J{Is APPROVED?}
    J -->|No| K[Error: Not Approved]
    J -->|Yes| L[Execute Action]
    
    L -->|Success| M[Status: EXECUTED]
    L -->|Failure| N[Status: EXECUTED + Errors]
    
    M --> O[Record Outcome]
    N --> O
    
    O --> P[Status: COMPLETED]
    
    style H fill:#f66
    style K fill:#f66
    style P fill:#6f6
    style B fill:#ff9
```

## trace_id Propagation

```mermaid
flowchart LR
    A[Proposal Created<br/>trace_id: xyz-789] --> B[Validation Service<br/>trace_id: xyz-789]
    B --> C[Approval Service<br/>trace_id: xyz-789]
    C --> D[Workflow Engine<br/>trace_id: xyz-789]
    D --> E[Target Service<br/>X-Trace-ID: xyz-789]
    E --> F[Execution Logs<br/>trace_id: xyz-789]
    F --> G[Outcome Record<br/>trace_id: xyz-789]
    
    style A fill:#9cf
    style G fill:#9f9
```

## System Architecture

```mermaid
graph TB
    subgraph "Agent Layer"
        A1[CRM Agent]
        A2[ERP Agent]
        A3[Finance Agent]
    end
    
    subgraph "Governance Service :5003"
        G1[Proposal API]
        G2[Validation Service]
        G3[Approval Service]
        G4[Workflow Engine]
    end
    
    subgraph "Target Services"
        T1[Workflow :5001]
        T2[AI CRM :8000]
        T3[Artha Finance :5002]
    end
    
    subgraph "Database"
        DB[(MongoDB<br/>proposals collection)]
    end
    
    A1 -->|Create Proposal| G1
    A2 -->|Create Proposal| G1
    A3 -->|Create Proposal| G1
    
    G1 --> G2
    G2 --> G3
    G3 --> G4
    
    G4 -->|Execute| T1
    G4 -->|Execute| T2
    G4 -->|Execute| T3
    
    G1 -.->|Persist| DB
    G2 -.->|Update| DB
    G3 -.->|Update| DB
    G4 -.->|Log| DB
    
    style G1 fill:#9cf
    style G2 fill:#fc9
    style G3 fill:#f9c
    style G4 fill:#9f9
```

---

## Key Constraints

1. **No Direct Execution**: Agents → Governance → Target Services
2. **Status Enforcement**: APPROVED required for EXECUTED
3. **Immutable Logs**: Execution records cannot be modified
4. **trace_id Required**: Every stage must propagate trace_id
5. **Audit Trail**: All state transitions logged with timestamps
