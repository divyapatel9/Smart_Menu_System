# 🍽️ Smart Menu System

An intelligent, interactive restaurant menu designed to create a personalized dining experience. This full-stack AI-powered application enhances customer satisfaction and restaurant profitability by integrating **semantic search**, **voice commands**, and a **rule-based dynamic pricing engine**.

Built using **Python + Flask** on the backend and **Vanilla JavaScript** on the frontend, the system goes far beyond static menus by understanding natural language queries and adapting prices based on real-time business conditions.

---

## 🔑 Key Features

### 🔍 Semantic Search Engine
- Understands the **intent** behind user queries using Sentence Transformers and FAISS.
- Example: Searching for _"hearty meal"_ may return dishes tagged as _"comfort food"_ or _"large portion"_.

### 🗣️ Voice Control
- Voice-enabled interaction via the Web Speech API.
- Available on both:
  - **Homepage**: Find restaurants by voice.
  - **Menu page**: Filter dishes via spoken queries.

### 💰 Rule-Based Dynamic Pricing
Menu item prices dynamically adjust in real-time based on:
- ⏰ **Time of Day** – Lunch/dinner surcharges during peak hours.
- 📆 **Day of Week** – Higher weekend prices.
- 🔥 **Item Popularity** – Premiums on best-selling items.
- 🧊 **Inventory Simulation** – Discounts for overstocked ingredients.

### 📊 Data & Analytics (SQLite Dual-DB Setup)
- `orders.db`: Tracks orders with pricing breakdowns, customer info, and timestamps.
- `analytics.db`: Logs all search queries (voice/text) for user behavior analysis.

### ✅ Pre-Order Validation
- Modal input ensures user provides:
  - Name
  - Table number  
Before items can be added to the cart.

### 🍱 Multi-Cuisine Menu Structure
- Broad filters: e.g., _“Show me Asian Fusion restaurants”_
- Specific filters: e.g., _“Find Thai dishes at this restaurant”_

---

## 🧠 Tech Stack

### Backend:
- **Python 3**, **Flask**
- **Sentence-Transformers** – text embeddings
- **FAISS** – fast vector similarity search
- **spaCy**, **NLTK** – NLP processing
- **NumPy**
- **SQLite** – lightweight DB storage

### Frontend:
- **HTML5**
- **CSS3**
- **Vanilla JavaScript**

### APIs:
- **Web Speech API** – in-browser voice recognition

