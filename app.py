import sqlite3
import json
import datetime
import uuid
from flask import Flask, jsonify, render_template, request
# AI Imports
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import pickle
import os
from dotenv import load_dotenv

# --- APP SETUP & AI MODEL LOADING ---
app = Flask(__name__)
load_dotenv()

print("Loading AI search engine...")
model = SentenceTransformer('all-MiniLM-L6-v2')
index = faiss.read_index("menu.index")
with open("item_sources.pkl", "rb") as f:
    item_sources = pickle.load(f)
print("AI search engine loaded successfully.")


# --- DATABASE FUNCTIONS ---
def init_databases():
    """Initializes TWO separate databases: one for orders, one for analytics."""
    # Create and setup the orders.db
    with sqlite3.connect('orders.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT, order_group_id TEXT NOT NULL,
                customer_name TEXT NOT NULL, table_number INTEGER NOT NULL,
                restaurant_id INTEGER NOT NULL, item_id INTEGER NOT NULL, item_name TEXT NOT NULL,
                base_price REAL NOT NULL, dynamic_price REAL NOT NULL, profit REAL NOT NULL,
                weekend_premium REAL DEFAULT 0, peak_hour_surcharge REAL DEFAULT 0,
                popularity_premium REAL DEFAULT 0, scarcity_premium REAL DEFAULT 0, surplus_discount REAL DEFAULT 0,
                day_of_week TEXT NOT NULL, hour_of_day INTEGER NOT NULL, applied_factors_list TEXT,
                order_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    print("Database 'orders.db' initialized successfully.")

    # Create and setup the analytics.db
    with sqlite3.connect('analytics.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query_text TEXT NOT NULL,
                results_found INTEGER NOT NULL,
                search_type TEXT NOT NULL,
                search_location TEXT NOT NULL,
                restaurant_id INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
    print("Database 'analytics.db' for search history initialized successfully.")


# --- PRICING ENGINE ---
def calculate_dynamic_price(menu_item, restaurant_id):
    base_price = menu_item.get('base_price', 0)
    adjustments = {"weekend_premium": 0, "peak_hour_surcharge": 0, "popularity_premium": 0, "scarcity_premium": 0, "surplus_discount": 0}
    now = datetime.datetime.now()
    
    if now.weekday() in [4, 5]: adjustments["weekend_premium"] = base_price * 0.07
    if 12 <= now.hour <= 14 or 19 <= now.hour <= 21: adjustments["peak_hour_surcharge"] = base_price * 0.10
    try:
        with sqlite3.connect('orders.db') as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM orders WHERE item_id = ? AND restaurant_id = ? AND date(order_timestamp) >= date('now', '-30 days')", (menu_item.get('id'), restaurant_id))
            order_count = cursor.fetchone()[0]
            if order_count > 50: adjustments["popularity_premium"] = base_price * 0.15
            elif order_count > 20: adjustments["popularity_premium"] = base_price * 0.08
    except Exception as e:
        print(f"Database query failed for demand pricing: {e}")
    if 'curry' in menu_item.get('name', '').lower() and 'chicken' in menu_item.get('ingredients', []):
        adjustments["surplus_discount"] = base_price * -0.10
    dynamic_price = base_price + sum(adjustments.values())
    applied_factors_list = [key for key, value in adjustments.items() if value != 0]
    return {
        "base_price": round(base_price, 2), "dynamic_price": round(dynamic_price, 2),
        "profit": round(dynamic_price - base_price, 2), "applied_factors": ", ".join(applied_factors_list),
        "adjustments": {k: round(v, 2) for k, v in adjustments.items()}
    }

# --- UTILITY and PAGE ROUTES ---
def load_menu():
    with open('menu.json', 'r', encoding='utf-8') as f:
        return json.load(f)

@app.route('/')
def home(): return render_template('index.html')

@app.route('/restaurant/<int:restaurant_id>')
def restaurant_page(restaurant_id): return render_template('restaurant.html', restaurant_id=restaurant_id)

# --- API ENDPOINTS ---
@app.route('/api/restaurants')
def get_restaurants(): return jsonify(load_menu())

@app.route('/api/smart-search', methods=['POST'])
def smart_search():
    query = request.json.get('query')
    if not query:
        return jsonify(load_menu().get('restaurants', []))
    try:
        query_vector = model.encode([query])
        distances, indices = index.search(query_vector.astype('float32'), k=15)
        found_restaurant_ids = set()
        for i in indices[0]:
            if i != -1:
                source = item_sources[i]
                found_restaurant_ids.add(source['restaurant_id'])
        all_restaurants = load_menu().get('restaurants', [])
        matching_restaurants = [r for r in all_restaurants if r.get('id') in found_restaurant_ids]
        return jsonify(matching_restaurants)
    except Exception as e:
        print(f"Error during smart search: {e}")
        return jsonify({"error": "Failed to perform search."}), 500

@app.route('/api/restaurant/<int:restaurant_id>')
def get_restaurant_details(restaurant_id):
    menu_data = load_menu()
    restaurant = next((r for r in menu_data.get('restaurants', []) if r.get('id') == restaurant_id), None)
    if restaurant:
        for item in restaurant.get('menu', []):
            pricing_details = calculate_dynamic_price(item, restaurant_id)
            item.update(pricing_details)
        return jsonify(restaurant)
    return jsonify({"error": "Restaurant not found"}), 404

@app.route('/api/order', methods=['POST'])
def place_order():
    order_data = request.get_json()
    customer_name, table_number = order_data.get('customer_name'), order_data.get('table_number')
    restaurant_id, items = order_data.get('restaurant_id'), order_data.get('items', [])
    order_group_id, now = str(uuid.uuid4()), datetime.datetime.now()
    day_of_week, hour_of_day = now.strftime('%A'), now.hour
    if not all([customer_name, table_number, restaurant_id, items]):
        return jsonify({"success": False, "message": "Missing required order information."}), 400
    try:
        with sqlite3.connect('orders.db') as conn:
            cursor = conn.cursor()
            for item in items:
                adjustments = item.get('adjustments', {})
                cursor.execute(
                    """INSERT INTO orders (order_group_id, customer_name, table_number, restaurant_id, item_id, item_name, base_price, dynamic_price, profit, weekend_premium, peak_hour_surcharge, popularity_premium, scarcity_premium, surplus_discount, day_of_week, hour_of_day, applied_factors_list) 
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (order_group_id, customer_name, table_number, restaurant_id, item.get('id'), item.get('name'), item.get('base_price'), item.get('dynamic_price'), item.get('profit'), adjustments.get('weekend_premium', 0), adjustments.get('peak_hour_surcharge', 0), adjustments.get('popularity_premium', 0), adjustments.get('scarcity_premium', 0), adjustments.get('surplus_discount', 0), day_of_week, hour_of_day, item.get('applied_factors'))
                )
            conn.commit()
        return jsonify({"success": True, "message": "Order placed successfully!"})
    except Exception as e:
        print(f"Error placing order: {e}")
        return jsonify({"success": False, "message": "An error occurred while saving the order."}), 500

@app.route('/api/log-search', methods=['POST'])
def log_search():
    data = request.get_json()
    query, count = data.get('query'), data.get('results_found')
    search_type, location = data.get('search_type'), data.get('location')
    restaurant_id = data.get('restaurant_id', None)
    if query is None or count is None or search_type is None or location is None:
        return jsonify({"success": False, "message": "Missing data"}), 400
    try:
        with sqlite3.connect('analytics.db') as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO search_history (query_text, results_found, search_type, search_location, restaurant_id) VALUES (?, ?, ?, ?, ?)",
                (query, count, search_type, location, restaurant_id)
            )
            conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error logging search query: {e}")
        return jsonify({"success": False}), 500

# --- APP INITIALIZATION ---
if __name__ == '__main__':
    init_databases()
    app.run(debug=True)