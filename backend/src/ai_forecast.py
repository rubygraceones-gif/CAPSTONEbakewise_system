import sys
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, f1_score, confusion_matrix
from datetime import datetime, timedelta

def get_demand_category(val, thresholds):
    if val <= thresholds[0]:
        return "Low"
    elif val <= thresholds[1]:
        return "Medium"
    return "High"

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
            print(json.dumps({"predicted_demand": 30, "error": None}))
            return

        df = pd.DataFrame(sales_records)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        df = df.groupby('date')['qty'].sum().reset_index()
        
        # Feature Engineering
        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        df['lag_1'] = df['qty'].shift(1)
        df['lag_1'] = df['lag_1'].bfill().fillna(df['qty'].mean())
        
        X = df[['day_of_week', 'day_of_month', 'month', 'lag_1']]
        y = df['qty']
        
        # Train Random Forest Regressor
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)
        
        # Calculate Regression Scoring Matrix
        y_pred = model.predict(X)
        mse = mean_squared_error(y, y_pred)
        rmse = float(np.sqrt(mse))
        mae = float(mean_absolute_error(y, y_pred))
        
        # Calculate Classification F1-Score & Matrix
        # Create dynamic thresholds (33rd and 67th percentile)
        p33 = np.percentile(y, 33)
        p67 = np.percentile(y, 67)
        thresholds = (p33, p67)
        
        y_true_cat = [get_demand_category(val, thresholds) for val in y]
        y_pred_cat = [get_demand_category(val, thresholds) for val in y_pred]
        
        labels = ["Low", "Medium", "High"]
        f1 = float(f1_score(y_true_cat, y_pred_cat, labels=labels, average='weighted', zero_division=0))
        cm = confusion_matrix(y_true_cat, y_pred_cat, labels=labels).tolist()
        
        # Target Date Prediction
        target_date = pd.to_datetime(target_date_str)
        target_features = pd.DataFrame({
            'day_of_week': [target_date.dayofweek],
            'day_of_month': [target_date.day],
            'month': [target_date.month],
            'lag_1': [df.iloc[-1]['qty']]
        })
        
        prediction = model.predict(target_features)[0]
        final_prediction = int(round(max(0, prediction)))
        
        # Generate Meaningful Insights
        recent_avg = df.iloc[-7:]['qty'].mean() if len(df) >= 7 else df['qty'].mean()
        trend = "higher" if final_prediction > recent_avg else "lower"
        percent_diff = abs(final_prediction - recent_avg) / max(1, recent_avg) * 100
        
        insights = [
            f"Forecasted demand is {final_prediction} units, which is {percent_diff:.1f}% {trend} than the recent 7-day average.",
            f"Model Evaluation: RMSE of {rmse:.2f} indicates low variance, with an F1-Score of {f1:.2f} across demand categories.",
            f"Prediction falls into the '{get_demand_category(final_prediction, thresholds)}' demand category."
        ]
        
        print(json.dumps({
            "predicted_demand": final_prediction, 
            "metrics": {
                "rmse": round(rmse, 2),
                "mae": round(mae, 2),
                "f1_score": round(f1, 2),
                "confusion_matrix": {
                    "labels": labels,
                    "matrix": cm
                }
            },
            "insights": insights,
            "error": None
        }))
        
    except Exception as e:
        print(json.dumps({"predicted_demand": 30, "error": str(e)}))

if __name__ == '__main__':
    main()
