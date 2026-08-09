import sys
import json
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime, timedelta

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({"predicted_demand": 30, "error": "No input data provided"}))
            return
            
        data = json.loads(input_data)
        
        sales_records = data.get('sales', [])
        target_date_str = data.get('target_date', datetime.now().strftime('%Y-%m-%d'))
        
        if not sales_records or len(sales_records) == 0:
            # Fallback if no sales data
            print(json.dumps({"predicted_demand": 30, "error": None}))
            return

        df = pd.DataFrame(sales_records)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        # Aggregate by date in case of multiple records per day
        df = df.groupby('date')['qty'].sum().reset_index()
        
        # Feature Engineering
        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        
        df['lag_1'] = df['qty'].shift(1)
        # Fill NA
        df['lag_1'] = df['lag_1'].bfill().fillna(df['qty'].mean())
        
        # We need at least 1 sample to train
        X = df[['day_of_week', 'day_of_month', 'month', 'lag_1']]
        y = df['qty']
        
        # Train Random Forest Regressor
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)
        
        # Prepare target date features
        target_date = pd.to_datetime(target_date_str)
        target_features = pd.DataFrame({
            'day_of_week': [target_date.dayofweek],
            'day_of_month': [target_date.day],
            'month': [target_date.month],
            'lag_1': [df.iloc[-1]['qty']] # Yesterday's sales
        })
        
        prediction = model.predict(target_features)[0]
        
        # Output JSON result
        print(json.dumps({
            "predicted_demand": int(round(max(0, prediction))), 
            "error": None
        }))
        
    except Exception as e:
        # Fallback in case of failure
        print(json.dumps({"predicted_demand": 30, "error": str(e)}))

if __name__ == '__main__':
    main()
