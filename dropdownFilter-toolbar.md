```mermaid
flowchart LR
    A[System Status<br/>(English)] --> B[Translate to Japanese Label]
    B --> C[Display in Table]

    D[User selects a Japanese status<br/>from dropdown] --> E[System checks which English statuses match]
    A --> E

    E --> F{Match?}
    F -->|Yes| G[Show row in table]
    F -->|No| H[Hide row]
```
