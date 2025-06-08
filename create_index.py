# create_index.py
import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import pickle

print("Loading sentence transformer model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

print("Loading menu data from menu.json...")
with open('menu.json', 'r', encoding='utf-8') as f:
    restaurants_data = json.load(f).get('restaurants', [])

item_descriptions = []
item_sources = []

print("Creating searchable descriptions for each menu item...")
for restaurant in restaurants_data:
    for item in restaurant.get('menu', []):
        desc = (
            f"{item.get('name')} is a {item.get('cuisine', '')} {item.get('category', '')} dish "
            f"from {restaurant.get('name')}. "
            f"It is described as {item.get('description', '')}. "
            f"It is tagged with {', '.join(item.get('tags', []))}. "
            f"Key ingredients include {', '.join(item.get('ingredients', []))[:100]}."
        )
        item_descriptions.append(desc)
        item_sources.append({
            "restaurant_id": restaurant.get('id'),
            "restaurant_name": restaurant.get('name')
        })

print(f"Generated {len(item_descriptions)} descriptions. Now creating embeddings...")
embeddings = model.encode(item_descriptions, show_progress_bar=True)

print("Building FAISS index...")
dimension = embeddings.shape[1]

# --- THIS IS THE CORRECTED LOGIC ---
# 1. Create the base index that measures distance
base_index = faiss.IndexFlatL2(dimension)
# 2. Create the IndexIDMap wrapper that allows us to map vectors to our own custom IDs
#    This is the object that correctly supports .add_with_ids()
index = faiss.IndexIDMap(base_index)

# 3. FAISS requires IDs to be of type int64
ids_to_add = np.array(range(len(item_descriptions))).astype('int64')

# 4. Add the vectors and their corresponding IDs to the index
index.add_with_ids(embeddings.astype('float32'), ids_to_add)
# --- END OF CORRECTION ---

print(f"Index built successfully with {index.ntotal} items.")

print("Saving index and metadata to files...")
faiss.write_index(index, "menu.index")
with open("item_sources.pkl", "wb") as f:
    pickle.dump(item_sources, f)

print("--- Indexing Complete! ---")