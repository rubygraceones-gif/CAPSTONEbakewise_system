# CHAPTER IV: METHODOLOGY AND DESIGN

This chapter presents the methodology and design employed in the development of BakeWise: An Artificial Intelligence-Powered Bakery Management System for Bread Waste Reduction and Production Optimization. It describes the research design, data gathering procedures, sampling technique, software development methodology, requirements analysis, system design, development process, system testing and validation, deployment and monitoring plan, and ethical considerations guiding the implementation of the system.

## 4.1 Research Design
The study employed a combination of developmental research, descriptive research, and mixed-method research to support the design, development, and evaluation of the BakeWise system. 

### 4.1.1 Developmental Research
Developmental research was utilized as the primary approach to systematically design, develop, and evaluate the BakeWise system. This approach provided a structured process for transforming identified operational requirements into a functional software solution. The completed system provides bakery personnel with intelligent tools for forecasting customer demand, monitoring product shelf life, analyzing inventory conditions, and reducing unnecessary bread waste through data-driven decision support.

### 4.1.2 Descriptive Research
Descriptive research was employed to obtain a comprehensive understanding of the existing operational processes of Rose Bakeshop – Lasang Branch. The researchers documented current workflows related to sales recording, production scheduling, inventory management, product monitoring, and waste handling to determine the functional requirements and system features necessary to support bakery personnel.

### 4.1.3 Mixed Method Research
A mixed-method approach integrated qualitative and quantitative methods. Qualitative components involved consultations and direct observations to understand operational experiences and expectations. Quantitative components involved the collection and analysis of numerical information generated during system testing, including forecasting accuracy measurements and software quality assessments.

## 4.2 Data Gathering Procedures
A systematic data gathering process focused on identifying operational requirements, documenting workflows, and determining system features. 

### 4.2.1 Historical Data Collection and Preparation for Machine Learning
Historical operational records from Rose Bakeshop – Lasang Branch were collected to serve as the primary dataset for the demand forecasting model. The dataset included transaction dates, product names, quantities produced, quantities sold, unsold quantities, and calendar variables (weekdays, weekends, holidays). The dataset underwent preprocessing, including cleaning, formatting, handling of missing values, and feature engineering (e.g., day of the week, moving averages) to serve as predictors for the Random Forest Regression algorithm.

### 4.2.2 Machine Learning Dataset Updating and Model Retraining
Following the initial deployment, BakeWise continuously records new sales, inventory, and waste data. These records expand the historical dataset, allowing future retraining of the Random Forest Regression model to continuously incorporate newer customer-demand patterns and adapt to seasonal changes.

## 4.3 Sampling Technique
Purposive sampling was utilized to select participants who possessed direct knowledge and practical experience in bakery operations. Participants included the Branch Manager (for overall operations and system expectations), Production Personnel (for production schedules and challenges), Inventory Personnel (for stock movement and shelf-life management), and Sales Personnel (for daily transactions and purchasing patterns).

## 4.4 Software Development Methodology
The development of BakeWise followed the **Agile Scrum** software development methodology. Agile Scrum promoted iterative development, continuous improvement, and flexibility. 

### 4.4.1 Agile Scrum Development Process
The methodology consisted of iterative cycles (Sprints) encompassing Planning, Requirements Analysis, System Design, Development, Testing, Sprint Review, and Deployment. This allowed continuous verification of system functionality, reducing development risks and ensuring that the demand forecasting, inventory analytics, and multiple user modules satisfied the identified operational requirements.

## 4.5 Requirements Analysis
Requirements were categorized to define how users interact with the system and how the system processes bakery information.

### 4.5.1 Functional Requirements
- **User Authentication & Management**: Secure login, role-based access control, and administrator management.
- **Sales & Product Management**: Recording of daily sales transactions and management of product pricing and categories.
- **Inventory & Production Management**: Monitoring stock movements, recording production schedules, and managing inventory levels.
- **Demand Forecasting**: Generation of demand forecasts using Random Forest Regression based on historical sales.
- **Shelf-Life Prediction**: Estimation of remaining shelf-life using production dates and predefined freshness rules.
- **Waste Monitoring**: Categorization and logging of bread waste and disposal reasons.
- **Product Repurposing**: Rule-based recommendations for repurposing eligible unsold bakery products (e.g., croutons) before expiration.

### 4.5.2 Non-Functional Requirements
- **Usability**: Intuitive, responsive web interface suitable for different devices.
- **Reliability & Data Integrity**: Accurate handling of records and dependable outputs.
- **Security**: Secure authentication, authorization, and data protection.
- **Performance Efficiency**: Fast processing of AI predictions and report generation.

## 4.6 System Design
BakeWise integrates an AI Processing Engine with a robust data management framework to provide decision support.

### 4.6.1 Conceptual Framework
The Input-Process-Output (IPO) framework illustrates the transformation of bakery operational data into actionable insights:
- **Input**: Sales Data, Production Data, Inventory Data, Waste Records, Product Information.
- **Process**: Database Storage, AI Data Processing, Demand Forecasting, Shelf-Life Prediction, Inventory Analytics.
- **Output**: Forecast Reports, Inventory Insights, Alerts, AI Recommendations, Management Dashboard.

### 4.6.2 System Architecture Design
The system follows a modern Web Application architecture:
- **User Layer (Client-Side)**: Developed using HTML5, CSS3, and Vanilla JavaScript with a responsive Single Page Application (SPA) approach.
- **Application Layer (Server-Side)**: Developed using Node.js and Express.js, providing robust RESTful APIs to process business logic.
- **Artificial Intelligence Layer**: A dedicated microservice implemented in Python using Scikit-learn, executing Random Forest Regression for accurate predictive analytics.
- **Database Layer**: Relational data management using MySQL to maintain data integrity across inventory, sales, users, and waste.
- **Management Layer**: Dashboard reporting and visual representations generated via Chart.js.

## 4.7 Development
BakeWise was implemented as a web-based client-server architecture:
- **Frontend**: Developed using standard web technologies (HTML5, CSS3, Vanilla JavaScript) to ensure a lightweight, fast, and accessible user interface without relying on heavy frameworks.
- **Backend API**: Node.js and Express.js handle API requests, user authentication, and data routing.
- **Machine Learning Component**: Python (with Pandas and Scikit-learn) processes historical sales data using a Random Forest Regression algorithm to predict demand, running as an independent process invoked by the Node.js backend.
- **Database**: MySQL serves as the primary relational database, securing transactional integrity for inventory and sales.

## 4.8 System Testing and Validation
Testing ensured BakeWise performed accurately according to the specified requirements.

### 4.8.1 Testing Strategy
- **Module & Integration Testing**: Each module (Sales, Inventory, Production, AI Engine) was tested individually before end-to-end integration testing.
- **Usability & Performance Testing**: Evaluated intuitive navigation and system response times.
- **Validation**: Feedback gathered from intended users determined the suitability of the features for addressing operational challenges.

### 4.8.2 Machine Learning Model Evaluation
The predictive performance of the Random Forest Regression model was evaluated using:
- **Mean Absolute Error (MAE)**: Measures average absolute difference between predicted and actual demand.
- **Root Mean Squared Error (RMSE)**: Identifies significant forecasting inaccuracies by weighting larger errors heavily.
- **Weighted Absolute Percentage Error (WAPE)**: Evaluates forecasting error relative to total actual sales volume.
- **Coefficient of Determination (R²)**: Measures how well the model explains demand variability.

## 4.9 Deployment and Monitoring Plan
The initial implementation of BakeWise is focused on the Rose Bakeshop – Lasang Branch. Deployment involves configuring the application servers, initializing the MySQL database, and migrating initial historical data. Post-deployment monitoring tracks system stability, AI prediction accuracy, and user interaction. Feedback will guide iterative improvements according to Agile Scrum principles.

## 4.10 Ethical Considerations
All ethical principles and data privacy standards are strictly observed:
- **Data Protection**: Compliance with Republic Act No. 10173 (Data Privacy Act of 2012) ensures personal and organizational information is securely processed and stored.
- **Responsible AI Use**: The Random Forest Regression model functions strictly as a decision-support tool. Final operational decisions, including product repurposing and production quantities, remain under the authority of human management.
- **Confidentiality**: Operational data from Rose Bakeshop is treated as confidential business information, restricted via robust Role-Based Access Control (RBAC).
