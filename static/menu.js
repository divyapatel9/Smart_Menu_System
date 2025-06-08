document.addEventListener('DOMContentLoaded', () => {
    // --- 1. ELEMENT REFERENCES ---
    const menuContainer = document.getElementById('menu-container');
    const restaurantNameH1 = document.getElementById('restaurant-name');
    const micButton = document.getElementById('mic-button');
    const voiceStatus = document.getElementById('voice-status');
    const resetFilterButton = document.getElementById('reset-filter-button');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalSpan = document.getElementById('cart-total');
    const placeOrderButton = document.getElementById('place-order-button');
    const userDetailsModal = document.getElementById('user-details-modal');
    const confirmDetailsButton = document.getElementById('confirm-details-button');
    const customerNameInput = document.getElementById('customer-name-input');
    const tableNumberInput = document.getElementById('table-number-input');

    // --- 2. STATE MANAGEMENT ---
    let fullMenu = [];
    let cart = [];
    let customerName = null;
    let tableNumber = null;
    let pendingItemId = null;

    // --- NEW: HELPER FUNCTION TO LOG SEARCHES ON THIS PAGE---
    function logSearchQuery(query, results_found, search_type) {
        fetch('/api/log-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query,
                results_found,
                search_type,
                location: 'restaurant_menu', // The location is this specific menu
                restaurant_id: RESTAURANT_ID  // We know which restaurant it is
            })
        }).catch(error => console.error('Failed to log search:', error));
    }

    // --- 3. INITIAL DATA FETCH ---
    fetch(`/api/restaurant/${RESTAURANT_ID}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) { return handleFetchError(data.error); }
            document.title = data.name;
            restaurantNameH1.textContent = data.name + (data.cuisine && Array.isArray(data.cuisine) ? ` (${data.cuisine.join(' / ')})` : '');
            fullMenu = data.menu || [];
            renderMenuItems(fullMenu);
        })
        .catch(handleFetchError);

    // --- 4. HELPER & RENDERING FUNCTIONS ---
    function addItemToCartById(itemId) {
        const itemToAdd = fullMenu.find(item => item.id === itemId);
        if (itemToAdd) {
            cart.push(itemToAdd);
            renderCart();
        }
    }

    function renderMenuItems(menu) {
        menuContainer.innerHTML = menu.length === 0 ? '<p class="no-results">No items match your criteria.</p>' : '';
        menu.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'menu-item-card';
            itemDiv.innerHTML = `
                <h3>${item.name}</h3>
                <p class="item-description">${item.description || ''}</p>
                <p class="item-category">Category: ${item.category || ''}</p>
                <p class="item-price">$${item.dynamic_price.toFixed(2)}</p>
                <button class="add-to-order-btn" data-item-id="${item.id}">Add to Order</button>
            `;
            menuContainer.appendChild(itemDiv);
        });
    }

    function renderCart() {
        cartItemsContainer.innerHTML = '';
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
        } else {
            cart.forEach(item => {
                const cartItemDiv = document.createElement('div');
                cartItemDiv.className = 'cart-item';
                cartItemDiv.innerHTML = `<span>${item.name}</span><span>$${item.dynamic_price.toFixed(2)}</span>`;
                cartItemsContainer.appendChild(cartItemDiv);
            });
        }
        const total = cart.reduce((sum, item) => sum + item.dynamic_price, 0);
        cartTotalSpan.textContent = total.toFixed(2);
    }
    
    // --- 5. QUERY PARSING & FILTERING ---
    function parseQuery(transcript) {
        let text = transcript.toLowerCase();
        const filters = { booleans: {}, spice_level: null, priceFilter: null, calorieFilter: null, negations: [], keywords: [] };
        const stopWords = ['show', 'me', 'give', 'a', 'an', 'the', 'items', 'item', 'i', 'want', 'like', 'feel', 'dishes', 'dish', 'foods', 'food', 'with', 'is', 'are', 'that', 'can', 'have', 'something'];
        if (/\bvegetarian\b/.test(text)) filters.booleans.is_vegetarian = true;
        if (/\bvegan\b/.test(text)) filters.booleans.is_vegan = true;
        if (/\bgluten free\b|\bgluten-free\b/.test(text)) filters.booleans.is_gluten_free = true;
        const spiceMatch = text.match(/\b(mild|medium|hot|spicy)\b/);
        if (spiceMatch) {
            if (spiceMatch[1] === 'mild') filters.spice_level = { op: '<=', val: 1 };
            else if (spiceMatch[1] === 'medium') filters.spice_level = { op: '==', val: 2 };
            else if (spiceMatch[1] === 'hot') filters.spice_level = { op: '>=', val: 3 };
        }
        const priceRegex = /(below|under|less than|over|above|more than|around|for|about)\s*\$?(\d+(\.\d+)?)/i;
        const priceMatch = text.match(priceRegex);
        if (priceMatch) {
            const opWord = priceMatch[1], val = parseFloat(priceMatch[2]);
            let op = '==';
            if (['below', 'under', 'less than'].includes(opWord)) op = '<';
            if (['over', 'above', 'more than'].includes(opWord)) op = '>';
            if (['around', 'for', 'about'].includes(opWord)) op = 'around';
            filters.priceFilter = { op, val };
            text = text.replace(priceRegex, '');
        }
        const calRegex = /(below|under|less than|over|above|more than)\s*(\d+)\s*calories/i;
        const calMatch = text.match(calRegex);
        if (calMatch) {
            const opWord = calMatch[1], val = parseInt(calMatch[2]);
            filters.calorieFilter = { op: (opWord.startsWith('under') || opWord.startsWith('less') ? '<' : '>'), val };
            text = text.replace(calRegex, '');
        }
        const negRegex = /(not|without)\s+(\w+)/g;
        let negMatch;
        while ((negMatch = negRegex.exec(text)) !== null) { filters.negations.push(negMatch[2]); }
        text = text.replace(negRegex, '');
        filters.keywords = text.split(' ').filter(k => k && !stopWords.includes(k));
        return filters;
    }

    // MODIFIED: This function now returns the filtered array
    function getFilteredMenu(filters) {
        let filteredMenu = [...fullMenu];
        Object.keys(filters.booleans).forEach(key => { filteredMenu = filteredMenu.filter(item => item[key] === true); });
        if (filters.spice_level) {
            const { op, val } = filters.spice_level;
            filteredMenu = filteredMenu.filter(item => item.hasOwnProperty('spice_level') && (op === '<=' ? item.spice_level <= val : op === '>=' ? item.spice_level >= val : item.spice_level === val));
        }
        if (filters.priceFilter) {
            const { op, val } = filters.priceFilter;
            filteredMenu = filteredMenu.filter(item => op === '<' ? item.dynamic_price < val : op === '>' ? item.dynamic_price > val : Math.abs(item.dynamic_price - val) <= 2);
        }
        if (filters.calorieFilter) {
            const { op, val } = filters.calorieFilter;
            filteredMenu = filteredMenu.filter(item => item.calories && (op === '<' ? item.calories < val : item.calories > val));
        }
        const getSearchableText = (item) => [item.name, item.description, item.category, item.cuisine, ...(item.tags || []), ...(item.ingredients || [])].join(' ').toLowerCase();
        if (filters.keywords.length > 0) {
            filteredMenu = filteredMenu.filter(item => {
                const searchableText = getSearchableText(item);
                return filters.keywords.every(k => searchableText.includes(k));
            });
        }
        if (filters.negations.length > 0) {
            filteredMenu = filteredMenu.filter(item => {
                const searchableText = getSearchableText(item);
                const allergens = item.allergens || [];
                return filters.negations.every(neg => !searchableText.includes(neg) && !allergens.includes(neg));
            });
        }
        return filteredMenu;
    }
    
    // --- 6. EVENT HANDLERS ---
    menuContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-order-btn')) {
            const itemId = parseInt(e.target.dataset.itemId);
            if (!customerName || !tableNumber) {
                pendingItemId = itemId;
                userDetailsModal.style.display = 'flex';
                return;
            }
            addItemToCartById(itemId);
        }
    });
    confirmDetailsButton.addEventListener('click', () => {
        const name = customerNameInput.value.trim();
        const table = tableNumberInput.value;
        if (name && table) {
            customerName = name;
            tableNumber = table;
            userDetailsModal.style.display = 'none';
            if (pendingItemId !== null) {
                addItemToCartById(pendingItemId);
                pendingItemId = null;
            }
        } else {
            alert('Please enter both your name and table number.');
        }
    });
    placeOrderButton.addEventListener('click', () => {
        if (cart.length === 0) return alert("Your cart is empty!");
        if (!customerName || !tableNumber) {
            alert("An issue occurred. Please provide your details before placing an order.");
            userDetailsModal.style.display = 'flex';
            return;
        }
        fetch('/api/order', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                restaurant_id: RESTAURANT_ID, 
                items: cart,
                customer_name: customerName,
                table_number: tableNumber
            }) 
        })
        .then(res => res.json()).then(data => {
            alert(data.message);
            if (data.success) { cart = []; renderCart(); }
        });
    });
    resetFilterButton.addEventListener('click', () => { 
        renderMenuItems(fullMenu); 
        voiceStatus.textContent = 'Filters cleared. Click the mic and ask a question.'; 
    });

    // --- 7. VOICE RECOGNITION ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        micButton.addEventListener('click', () => recognition.start());
        recognition.onstart = () => { voiceStatus.textContent = 'Listening...'; micButton.classList.add('is-listening'); };
        
        // MODIFIED: This now calls the logging function
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            voiceStatus.textContent = `Showing results for: "${transcript}"`;
            
            const filters = parseQuery(transcript);
            const filteredMenu = getFilteredMenu(filters);
            renderMenuItems(filteredMenu);

            // NEW: Log the search after results are calculated
            logSearchQuery(transcript, filteredMenu.length, 'voice');
        };
        recognition.onerror = (event) => { voiceStatus.textContent = `Error: ${event.error}. Please try again.`; };
        recognition.onend = () => { micButton.classList.remove('is-listening'); };
    } else {
        micButton.style.display = 'none';
        resetFilterButton.style.display = 'none';
        voiceStatus.textContent = "Sorry, your browser doesn't support voice commands.";
    }
    
    // --- 8. UTILITY FUNCTIONS ---
    function handleFetchError(error) { 
        console.error('Error fetching data:', error); 
        restaurantNameH1.textContent = 'Failed to load data.'; 
    }
});