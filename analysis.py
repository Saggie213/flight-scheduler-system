"""
analysis.py
===============

This module contains a complete, documented example of how to load and analyse
one week of flight‑schedule data from Mumbai's Chhatrapati Shivaji Maharaj
International Airport (CSMIA), compute key metrics and build a simple
predictive model.  It also demonstrates a schedule‑tuning function that
suggests alternative departure slots to minimise delays.

Functions are written with clear inputs and outputs so that you can import
them into a notebook or command‑line script.  Each function includes a
docstring describing its purpose and parameters.

Usage example (from a Python REPL):

>>> from analysis import load_flight_data, build_delay_model, recommend_slot
>>> df = load_flight_data('flight_data_cleaned.csv')
>>> model = build_delay_model(df)
>>> # Predict the delay for a two‑hour flight scheduled at 06:00 on a Monday
>>> delay = model.predict([[6, 120, 0]])[0]
>>> # Recommend a better slot for flight WY202 on a Wednesday (day_of_week=2)
>>> new_hour = recommend_slot(df, 'WY202', model, day_of_week=2)

The accompanying report.md explains the context and findings of the analysis
and should be read alongside this code.
"""

from __future__ import annotations

import os
from typing import Tuple, List, Optional, Callable

import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error


def load_flight_data(path: str) -> pd.DataFrame:
    """Load and clean the flight data from a CSV file.

    The raw CSV file contains flight schedule information with departure and arrival times.
    This function cleans the data, converts times to minutes since midnight, and computes delays.

    Parameters
    ----------
    path : str
        Path to the CSV file.  Relative or absolute paths are accepted.

    Returns
    -------
    pd.DataFrame
        A cleaned dataframe with the following additional columns:

        * `STD_mins`, `ATD_mins`, `STA_mins`, `ATA_mins` – times in minutes
        * `DepartureDelay` – ATD_mins − STD_mins (minutes)
        * `ArrivalDelay` – ATA_mins − STA_mins (minutes)
        * `ScheduledHour` – integer hour of scheduled departure
        * `ArrivalHour` – integer hour of scheduled arrival
    """
    # Read the CSV file
    df = pd.read_csv(path)
    
    # Clean flight numbers: replace empty values and forward fill
    df['Flight Number'] = df['Flight Number'].ffill()
    
    # Keep only rows with a date and scheduled departure time
    data = df[~df['Date'].isna() & ~df['STD'].isna()].copy()
    
    # Rename columns for clarity
    data.rename(columns={
        'Origin': 'Origin', 
        'Destination': 'Destination',
        'FlightTime': 'FlightTime'
    }, inplace=True)

    # Helper to convert a time string to minutes since midnight
    def parse_time(time_str: Optional[str]) -> Optional[float]:
        if pd.isna(time_str):
            return np.nan
        t_str = str(time_str).strip()
        # Remove prefixes such as 'Landed'
        if t_str.lower().startswith('landed'):
            t_str = t_str.split(' ', 1)[1]
        for fmt in ('%I:%M %p', '%H:%M:%S', '%H:%M'):
            try:
                parsed = datetime.strptime(t_str, fmt)
                return parsed.hour * 60 + parsed.minute
            except Exception:
                continue
        # If parsing fails, return NaN
        return np.nan

    # Convert all relevant times
    for col in ['STD', 'ATD', 'STA', 'ATA']:
        data[f'{col}_mins'] = data[col].apply(parse_time)
    
    # Compute delays (may be negative for early operations)
    data['DepartureDelay'] = data['ATD_mins'] - data['STD_mins']
    data['ArrivalDelay'] = data['ATA_mins'] - data['STA_mins']
    
    # Extract hours for grouping
    data['ScheduledHour'] = (data['STD_mins'] / 60).astype(int)
    data['ArrivalHour'] = (data['STA_mins'] / 60).astype(int)
    
    # Parse date and day of week
    data['Date'] = pd.to_datetime(data['Date'])
    data['DayOfWeek'] = data['Date'].dt.dayofweek
    
    # Convert flight duration to minutes
    def duration_to_minutes(dur) -> Optional[float]:
        if pd.isna(dur):
            return np.nan
        try:
            # Handle datetime.time objects
            if hasattr(dur, 'hour') and hasattr(dur, 'minute') and hasattr(dur, 'second'):
                return dur.hour * 60 + dur.minute + dur.second / 60
            # Handle string format
            elif isinstance(dur, str):
                t = datetime.strptime(dur, '%H:%M:%S')
                return t.hour * 60 + t.minute + t.second / 60
            else:
                return np.nan
        except Exception:
            return np.nan
    
    data['FlightDuration_mins'] = data['FlightTime'].apply(duration_to_minutes)
    
    # Impute any missing flight durations with the mean
    if data['FlightDuration_mins'].isna().any():
        mean_duration = data['FlightDuration_mins'].mean()
        data['FlightDuration_mins'] = data['FlightDuration_mins'].fillna(mean_duration)
    
    return data


def build_delay_model(data: pd.DataFrame, test_size: float = 0.2,
                      random_state: int = 42) -> LinearRegression:
    """Train a linear‑regression model to predict departure delays.

    The model uses the scheduled hour of departure, flight duration and day
    of week to predict the delay in minutes.  It returns the fitted model,
    but also prints basic evaluation metrics for transparency.

    Parameters
    ----------
    data : pd.DataFrame
        Cleaned flight data returned by :func:`load_flight_data`.
    test_size : float, optional
        Proportion of the dataset to include in the test split (default 0.2).
    random_state : int, optional
        Random seed for reproducible splitting (default 42).

    Returns
    -------
    LinearRegression
        Fitted scikit‑learn linear regression model.
    """
    # Feature matrix and target vector
    X = data[['ScheduledHour', 'FlightDuration_mins', 'DayOfWeek']].copy()
    y = data['DepartureDelay']
    
    # Remove rows with NaN values in features or target
    valid_mask = ~(X.isna().any(axis=1) | y.isna())
    X = X[valid_mask]
    y = y[valid_mask]
    
    print(f"Using {len(X)} complete records for training (removed {len(data) - len(X)} incomplete records)")
    
    # Split into train and test sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )
    
    # Fit the model
    model = LinearRegression()
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    print(f"Mean absolute error of delay model: {mae:.2f} min")
    print("Coefficients:", dict(zip(X.columns, model.coef_)))
    print("Intercept:", model.intercept_)
    
    return model


def recommend_slot(data: pd.DataFrame, flight_number: str, model: LinearRegression,
                   day_of_week: int,
                   hours: Optional[List[int]] = None) -> Tuple[int, float]:
    """Recommend a departure hour that minimises the predicted delay for a flight.

    This function computes the predicted delay for the specified flight if it were
    scheduled at each hour in `hours` (default: 5–22) and returns the hour
    with the minimum predicted delay.  If the flight's current scheduled hour
    already produces the minimal delay, that hour is returned.

    Parameters
    ----------
    data : pd.DataFrame
        Cleaned flight data.
    flight_number : str
        Flight number (e.g., 'AI101').
    model : LinearRegression
        Fitted delay‑prediction model from :func:`build_delay_model`.
    day_of_week : int
        Day of week (0=Monday, 6=Sunday) for which to recommend the slot.
    hours : list of int, optional
        List of candidate hours to evaluate.  If None, hours 5–22 are used.

    Returns
    -------
    (int, float)
        Tuple of (recommended hour, predicted delay at that hour) in minutes.
    """
    if hours is None:
        hours = list(range(5, 23))
    
    # Extract the flight's average duration from the data
    flight_rows = data[data['Flight Number'] == flight_number]
    if flight_rows.empty:
        raise ValueError(f"Flight number {flight_number} not found in data.")
    
    duration = float(flight_rows['FlightDuration_mins'].mean())
    
    # Evaluate predicted delays for each candidate hour
    best_hour = None
    best_delay = float('inf')
    
    for h in hours:
        # Create feature array with proper column names to avoid warnings
        features = pd.DataFrame([[h, duration, day_of_week]], 
                              columns=['ScheduledHour', 'FlightDuration_mins', 'DayOfWeek'])
        pred_delay = model.predict(features)[0]
        
        if pred_delay < best_delay:
            best_delay = pred_delay
            best_hour = h
    
    return best_hour, best_delay


def classify_delay(delay: float) -> str:
    """Categorise a delay value into minor, major or critical.

    Parameters
    ----------
    delay : float
        Absolute value of the delay in minutes.

    Returns
    -------
    str
        One of 'minor', 'major' or 'critical'.
    """
    d = abs(delay)
    if d < 15:
        return 'minor'
    elif d < 60:
        return 'major'
    else:
        return 'critical'


def summarise_delays(data: pd.DataFrame) -> pd.DataFrame:
    """Return a summary of departure delays by flight.

    The summary includes the average departure delay and the delay category
    (minor, major or critical) for each flight number.

    Parameters
    ----------
    data : pd.DataFrame
        Cleaned flight data.

    Returns
    -------
    pd.DataFrame
        Summary with columns: Flight Number, AvgDepartureDelay, Category.
    """
    group = data.groupby('Flight Number')['DepartureDelay'].mean().reset_index()
    group.rename(columns={'DepartureDelay': 'AvgDepartureDelay'}, inplace=True)
    group['Category'] = group['AvgDepartureDelay'].apply(classify_delay)
    return group.sort_values('AvgDepartureDelay', ascending=False)


def get_peak_hours(data: pd.DataFrame) -> pd.DataFrame:
    """Analyze peak hours based on flight frequency.

    Parameters
    ----------
    data : pd.DataFrame
        Cleaned flight data.

    Returns
    -------
    pd.DataFrame
        Peak hour analysis with hourly flight counts.
    """
    hourly_counts = data.groupby('ScheduledHour').size().reset_index(name='FlightCount')
    hourly_counts = hourly_counts.sort_values('FlightCount', ascending=False)
    return hourly_counts


def get_airport_stats(data: pd.DataFrame) -> dict:
    """Get comprehensive airport statistics.

    Parameters
    ----------
    data : pd.DataFrame
        Cleaned flight data.

    Returns
    -------
    dict
        Airport statistics including total flights, delays, etc.
    """
    total_flights = len(data)
    delayed_flights = len(data[data['DepartureDelay'] > 0])
    avg_delay = data['DepartureDelay'].mean()
    
    # Get peak hour
    hourly_counts = data.groupby('ScheduledHour').size()
    peak_hour = hourly_counts.idxmax()
    peak_flights = hourly_counts.max()
    
    # Delay distribution
    delay_categories = data['DepartureDelay'].apply(classify_delay).value_counts()
    
    return {
        'total_flights': total_flights,
        'delayed_flights': delayed_flights,
        'avg_delay': avg_delay,
        'peak_hour': peak_hour,
        'peak_flights': peak_flights,
        'delay_distribution': delay_categories.to_dict(),
        'capacity_utilization': (total_flights / (peak_flights * 24)) * 100  # Simplified calculation
    }


if __name__ == '__main__':
    # Example usage when running this file directly
    # Assume the CSV file is in the same directory
    csv_path = os.environ.get('FLIGHT_DATA_PATH', 'flight_data_cleaned.csv')
    if not os.path.exists(csv_path):
        print(f"Flight data file not found: {csv_path}")
    else:
        df = load_flight_data(csv_path)
        print(f"Loaded {len(df)} flight instances")
        model = build_delay_model(df)
        print("\nTop flights by average delay:")
        print(summarise_delays(df).head())
        
        # Example recommendation for the first flight in the data
        first_flight = df['Flight Number'].iloc[0]
        recommended_hour, predicted = recommend_slot(df, first_flight, model, day_of_week=0)
        print(f"\nRecommended hour for {first_flight}: {recommended_hour} (predicted delay {predicted:.1f} min)")
        
        # Peak hours analysis
        print("\nPeak hours analysis:")
        print(get_peak_hours(df).head())
        
        # Airport stats
        print("\nAirport statistics:")
        stats = get_airport_stats(df)
        for key, value in stats.items():
            print(f"{key}: {value}")