# BakeWise System Diagrams

This document contains the visual diagrams that illustrate the architecture, processes, and structure of the BakeWise System, developed in accordance with the System Design methodology. 

You can render these diagrams using any standard Markdown viewer that supports Mermaid.js (like GitHub, VS Code, or Notion).

## 1. Conceptual Framework (IPO)

```mermaid
flowchart LR
    subgraph Input ["INPUT"]
        I1[Sales Data]
        I2[Production Data]
        I3[Inventory Data]
        I4[Waste Records]
        I5[Product Information]
        I6[User Information]
    end

    subgraph Process ["PROCESS"]
        P1[Data Collection]
        P2[Database Storage]
        P3[AI Data Processing]
        P4[Demand Forecasting]
        P5[Shelf-Life Prediction]
        P6[Inventory Analytics]
        P7[Production Optimization]
        P8[Recommendation Generation]
    end

    subgraph Output ["OUTPUT"]
        O1[Forecast Reports]
        O2[Inventory Insights]
        O3[Alerts]
        O4[AI Recommendations]
        O5[Management Dashboard]
    end

    subgraph Benefits ["BENEFITS"]
        B1[Reduced Bread Waste]
        B2[Improved Operational Efficiency]
        B3[Better Decision-Making]
        B4[Sustainable Bakery Operations]
    end

    Input --> Process
    Process --> Output
    Output --> Benefits

    style Input fill:#e1f5fe,stroke:#311b92,stroke-width:2px
    style Process fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style Output fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    style Benefits fill:#fce4ec,stroke:#004d40,stroke-width:2px
```

## 2. Use Case Diagram

```mermaid
flowchart LR
    %% Actors
    Admin(["Administrator"])
    Manager(["Branch Manager"])
    Sales(["Sales Personnel"])
    Inventory(["Inventory Personnel"])
    Production(["Production Personnel"])
    Jathnier(["Future Jathnier Corp Mgmt"])

    %% System Boundary
    subgraph System ["BakeWise System"]
        UC1(Manage User Accounts)
        UC2(Configure System Settings)
        UC3(View Dashboards and Reports)
        UC4(Review AI Demand Forecasts)
        UC5(Review Waste Analytics)
        UC6(Record Sales Transactions)
        UC7(Update Customer Info)
        UC8(Monitor Stock Levels)
        UC9(Receive Expiration Alerts)
        UC10(Encode Production Schedules)
        UC11(Receive Production Recommendations)
        UC12(Access Centralized Multi-Branch Reports)
    end

    %% Administrator Connections
    Admin --> UC1
    Admin --> UC2

    %% Branch Manager Connections
    Manager --> UC3
    Manager --> UC4
    Manager --> UC5

    %% Sales Personnel Connections
    Sales --> UC6
    Sales --> UC7

    %% Inventory Personnel Connections
    Inventory --> UC8
    Inventory --> UC9

    %% Production Personnel Connections
    Production --> UC10
    Production --> UC11

    %% Future Integration
    Jathnier -.-> UC12
```

## 3. Context Flow Diagram (DFD Level 0)

```mermaid
flowchart TD
    %% External Entities
    Sales(Sales Personnel)
    Inventory(Inventory Personnel)
    Production(Production Personnel)
    Waste(Waste Records)
    Manager(Branch Manager)

    %% System
    System(((BAKEWISE SYSTEM)))

    %% Data Flows
    Sales -- "Sales Information" --> System
    Inventory -- "Inventory Information" --> System
    Production -- "Production Information" --> System
    Waste -- "Waste Information" --> System

    System -- "Reports, Alerts, Recommendations" --> Manager
```

## 4. Data Flow Diagram (DFD Level 1)

```mermaid
flowchart TD
    %% External Entities
    Sales(Sales Personnel)
    Inventory(Inventory Personnel)
    Production(Production Personnel)
    Waste(Waste Records)
    Manager(Branch Manager)

    %% Processes
    P1((1.0\nData Input &\nValidation))
    P2((2.0\nData Storage\nManagement))
    P3((3.0\nAI Processing\nEngine))
    P4((4.0\nReport & Output\nGeneration))

    %% Data Stores
    D1[(Sales Database)]
    D2[(Inventory Database)]
    D3[(Production Database)]
    D4[(Waste Database)]
    D5[(Product Database)]
    D6[(User Database)]

    %% Data Flows
    Sales -- "Sales Reports" --> P1
    Inventory -- "Inventory Reports" --> P1
    Production -- "Production Reports" --> P1
    Waste -- "Waste Analytics" --> P1

    P1 -- "Validated Data" --> P2
    
    P2 <--> D1
    P2 <--> D2
    P2 <--> D3
    P2 <--> D4
    P2 <--> D5
    P2 <--> D6

    P2 -- "Stored Data" --> P3

    P3 -- "Processed Results" --> P4

    P4 -- "Reports, Alerts, AI Recommendations" --> Manager

    %% Sub-processes in P3 (Visual grouping)
    subgraph AI_Engine [AI Modules inside 3.0]
        Demand[Demand Forecasting]
        Shelf[Shelf-Life Prediction]
        InvAnal[Inventory Analytics]
        ProdOpt[Production Optimization]
        Repurp[Recommendation Generation]
    end
    P3 -.-> AI_Engine
```

## 5. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    bw_branches {
        int id PK
        string name
        decimal latitude
        decimal longitude
        string address
        string store_hours
        string contact_no
        string status
    }
    
    bw_users {
        int id PK
        string name
        string email
        string password
        string role
        int branch_id FK
    }
    
    bw_products {
        int id PK
        string name
        string category
        decimal price
        decimal cost
        int shelfLifeDays
        string repurposeRecipe
        int branch_id FK
    }
    
    bw_inventory {
        int id PK
        string product_id FK
        int stockLevel
        date productionDate
        date expiryDate
        int branch_id FK
    }
    
    bw_sales {
        string id PK
        string product_id FK
        int qty
        decimal price
        date date
        string cashier
        int branch_id FK
    }
    
    bw_production {
        string id PK
        string product_id FK
        int planned
        int actual
        date date
        string baker
        string status
        string code
        int branch_id FK
    }
    
    bw_waste {
        string id PK
        string product_id FK
        int qty
        decimal cost
        string reason
        date date
        int branch_id FK
    }

    bw_branches ||--o{ bw_users : has
    bw_branches ||--o{ bw_products : sells
    bw_branches ||--o{ bw_inventory : holds
    bw_branches ||--o{ bw_sales : logs
    bw_branches ||--o{ bw_production : bakes
    bw_branches ||--o{ bw_waste : logs
    
    bw_products ||--o{ bw_inventory : "stocked as"
    bw_products ||--o{ bw_sales : "sold in"
    bw_products ||--o{ bw_production : "produced in"
    bw_products ||--o{ bw_waste : "wasted as"
```

## 6. Activity Diagram (AI Demand Forecasting & Repurposing)

```mermaid
flowchart TD
    Start([Start Daily Operations]) --> ViewDash[User accesses Management Dashboard]
    
    subgraph Forecasting [Demand Forecasting Process]
        ViewDash --> ReqForecast[System requests Forecast for Product]
        ReqForecast --> FetchSales[Fetch 6-12 Months Historical Sales]
        FetchSales --> Train[Python Model (Random Forest) Analyzes Data]
        Train --> Pred[Generate Predicted Demand Quantity]
    end

    subgraph Inventory_ShelfLife [Inventory & Shelf-Life Process]
        Pred --> EvalInv[System evaluates current Inventory Levels]
        EvalInv --> ChkExpiry[System checks Expiry Dates]
        ChkExpiry -->|Freshness < 30%| Repurpose[Generate Product Repurposing Alert]
        ChkExpiry -->|Freshness >= 30%| Optimize[Calculate Net Production Requirement]
    end

    Repurpose --> Display
    Optimize --> Display[Display Production Recommendations on Dashboard]

    Display --> Review[Branch Manager Reviews AI Suggestions]
    Review --> End([End Daily Planning])
```

## 7. System Architecture Design

```mermaid
flowchart TD
    subgraph UserLayer ["1. User Layer (Client-Side Interface)"]
        Browser[Web Browser / Device]
        Sales[Sales Interface]
        Inv[Inventory Interface]
        Prod[Production Interface]
        Dash[Management Dashboard]
    end

    subgraph AppLayer ["2. Application Layer (Backend Server)"]
        Node[Node.js / Express.js Server]
        Auth[User Authentication Module]
        Logic[Business Logic Modules]
    end

    subgraph AILayer ["3. Artificial Intelligence Layer"]
        Python[Python Microservice]
        RF[Random Forest Algorithm]
        DataPrep[Data Preprocessing (Pandas/Scikit-learn)]
    end

    subgraph DataLayer ["4. Database Layer"]
        DB[(MySQL Database)]
        DB_Sales[(Sales Tables)]
        DB_Inv[(Inventory Tables)]
    end

    %% Connections
    Browser --> Node
    Sales --> Node
    Inv --> Node
    Prod --> Node
    Dash --> Node

    Node <--> Auth
    Node <--> Logic

    Logic <--> DB
    DB <--> DB_Sales
    DB <--> DB_Inv

    Logic -- "Triggers Prediction Script" --> Python
    Python <--> DataPrep
    DataPrep <--> RF
    RF -- "Returns Forecast Results" --> Logic
```
