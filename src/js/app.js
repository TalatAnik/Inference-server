// Alpine.js is already loaded, so no additional JS is required here for basic functionality
// You could add extra JavaScript here for further customization or functionality as needed
document.addEventListener("alpine:init", () => {
    Alpine.data('tabs', () => ({
        currentTab: 1,
    }));
});
