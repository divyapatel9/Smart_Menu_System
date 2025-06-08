Smart Menu System
An intelligent, interactive restaurant menu designed to create a personalized dining experience. This application leverages AI-powered semantic search, voice commands, and a rule-based dynamic pricing engine to enhance customer interaction and restaurant profitability.

This project is a full-stack web application built with Python and Flask on the backend and vanilla JavaScript on the frontend. It moves beyond traditional static menus by providing an intelligent platform that understands natural language queries and adapts to real-time business conditions.

Key Features
Semantic Search Engine: Instead of simple keyword matching, the system uses Sentence-Transformers and FAISS to understand the meaning behind a user's query. A search for "hearty meal" can match dishes tagged as "comfort food" or "large portion."
Voice Control: Users can interact with the menu using natural language voice commands on both the homepage (for finding restaurants) and the menu page (for filtering dishes).
Rule-Based Dynamic Pricing: Menu prices are not static. The Python backend adjusts item prices in real-time based on a set of rules, including:
Time of Day: Premiums for peak lunch and dinner rushes.
Day of Week: Higher prices for busy weekends.
Item Popularity: Surcharges for best-selling items based on order history.
Inventory: Simulated discounts for items with surplus ingredients.
Detailed Data & Analytics: The system uses two separate SQLite databases to keep transactional and analytical data clean:
orders.db: Stores detailed order information, including customer details and a full breakdown of which pricing factors were applied to each item.
analytics.db: Logs all user search queries (both text and voice) to provide insights into customer demand and intent.
Pre-Order Validation: Implements a professional workflow where users are prompted to enter their name and table number via a modal before they can add items to their order.
Multi-Cuisine Data Model: The menu structure supports multi-cuisine restaurants, allowing for both broad filtering (e.g., "Show me Asian Fusion restaurants") and specific queries ("Find the Thai dishes at this restaurant").
Technology Stack
Backend:
Python 3
Flask
Sentence-Transformers (for generating text embeddings)
Faiss (for efficient similarity search)
spaCy & NLTK (for NLP tasks like synonym expansion)
NumPy
SQLite (for database storage)
Frontend:
HTML5
CSS3
Vanilla JavaScript (for all client-side logic)
APIs:
Web Speech API (for voice recognition in the browser)
