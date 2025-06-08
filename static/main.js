document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT REFERENCES ---
    const restaurantsContainer = document.getElementById('restaurants-container');
    const searchInput = document.getElementById('restaurant-search-input');
    const micButton = document.getElementById('restaurant-mic-button');
    const searchBtn = document.getElementById('search-btn');
    const noResultsMessage = document.getElementById('no-results-message');

    // --- HELPER FUNCTION TO LOG SEARCHES ---
    function logSearchQuery(query, results_found, search_type) {
        fetch('/api/log-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query, 
                results_found, 
                search_type,
                location: 'homepage',
                restaurant_id: null 
            })
        }).catch(error => console.error('Failed to log search:', error));
    }

    // --- INITIAL DATA FETCH ---
    function loadInitialRestaurants() {
        restaurantsContainer.innerHTML = '<p>Loading restaurants...</p>';
        noResultsMessage.style.display = 'none';
        fetch('/api/restaurants')
            .then(response => response.json())
            .then(data => {
                renderRestaurants(data.restaurants || []);
            })
            .catch(error => {
                console.error('Error fetching initial restaurants:', error);
                restaurantsContainer.innerHTML = '<p class="error">Could not load restaurants. Please try again later.</p>';
            });
    }

    // --- RENDER FUNCTION ---
    function renderRestaurants(restaurants) {
        restaurantsContainer.innerHTML = '';
        if (!restaurants || restaurants.length === 0) {
            noResultsMessage.style.display = 'block';
        } else {
            noResultsMessage.style.display = 'none';
        }
        restaurants.forEach(restaurant => {
            const card = document.createElement('div');
            card.className = 'restaurant-card';
            card.innerHTML = `<h2>${restaurant.name}</h2><p>${(restaurant.cuisine || []).join(' / ')}</p>`;
            card.addEventListener('click', () => { window.location.href = `/restaurant/${restaurant.id}`; });
            restaurantsContainer.appendChild(card);
        });
    }

    // --- AI-POWERED SEARCH LOGIC ---
    function performSearch(searchType = 'text') {
        const query = searchInput.value.trim();
        if (!query) {
            loadInitialRestaurants();
            return;
        }
        restaurantsContainer.innerHTML = '<p>Searching...</p>';
        noResultsMessage.style.display = 'none';
        fetch('/api/smart-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        })
        .then(response => response.json())
        .then(data => {
            renderRestaurants(data);
            logSearchQuery(query, data.length, searchType); // Log the search
        })
        .catch(error => {
            console.error('Error during smart search:', error);
            restaurantsContainer.innerHTML = '<p class="error">Search failed. Please try again.</p>';
        });
    }

    // --- EVENT LISTENERS ---
    searchBtn.addEventListener('click', () => performSearch('text'));
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') { performSearch('text'); }
    });
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        micButton.addEventListener('click', () => { recognition.start(); });
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            searchInput.value = transcript;
            performSearch('voice'); // Pass 'voice' as the type
        };
    } else {
        micButton.style.display = 'none';
    }

    // --- INITIALIZE THE PAGE ---
    loadInitialRestaurants();
});