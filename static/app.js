// This ensures our script runs only after the full HTML document has been loaded.
document.addEventListener('DOMContentLoaded', () => {

    // This is the modern JavaScript way to make an API request.
    fetch('/api/restaurants')
        .then(response => response.json()) // 1. Get the response and parse it as JSON
        .then(data => {                   // 2. Work with the parsed JSON data
            
            // Get the container element from our HTML where we will display restaurants
            const container = document.getElementById('restaurants-container');
            
            // Clear the "Loading restaurants..." message
            container.innerHTML = '';

            // Loop through each restaurant in the data we received
            // Loop through each restaurant in the data we received
            data.restaurants.forEach(restaurant => {
    const restaurantDiv = document.createElement('div');
    restaurantDiv.className = 'restaurant-card';
    restaurantDiv.innerHTML = `<h2>${restaurant.name}</h2>`;

    // When a card is clicked, navigate to the specific restaurant's page
    restaurantDiv.addEventListener('click', () => {
        window.location.href = `/restaurant/${restaurant.id}`;
    });

    container.appendChild(restaurantDiv);
});
        })
        .catch(error => {
            // If anything goes wrong with the fetch request, log an error to the console.
            console.error('Error fetching restaurants:', error);
            const container = document.getElementById('restaurants-container');
            container.innerHTML = '<p>Error loading restaurants. Please try again later.</p>';
        });
});