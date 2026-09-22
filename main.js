// Search Modal & UI interaction script
document.addEventListener("DOMContentLoaded", function() {
    const searchBtn = document.getElementById("search-btn");
    const searchModal = document.getElementById("search-modal");
    const closeSearch = document.getElementById("close-search");
    const searchInput = document.getElementById("search-input");

    // Open Search Modal
    if (searchBtn && searchModal) {
        searchBtn.addEventListener("click", function() {
            searchModal.classList.add("active");
            setTimeout(() => searchInput.focus(), 100);
        });
    }

    // Close Search Modal
    if (closeSearch && searchModal) {
        closeSearch.addEventListener("click", function() {
            searchModal.classList.remove("active");
        });
    }

    // Close search on backdrop click
    window.addEventListener("click", function(event) {
        if (event.target === searchModal) {
            searchModal.classList.remove("active");
        }
    });

    // Quick Search Input Navigation
    if (searchInput) {
        searchInput.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                const query = searchInput.value.trim().toLowerCase();
                if (query === "home" || query === "contact" || query === "projects") {
                    window.location.hash = "#" + query;
                    searchModal.classList.remove("active");
                    searchInput.value = "";
                }
            }
        });
    }
});
