// Test script to verify container click functionality
console.log('=== Testing Container Click Functionality ===');

// Test 1: Check if implementation cards exist
const cards = document.querySelectorAll('.implementation-card');
console.log(`Found ${cards.length} implementation cards`);

cards.forEach((card, index) => {
    const implementation = card.dataset.implementation;
    console.log(`Card ${index + 1}: ${implementation} - Classes: ${card.className}`);
});

// Test 2: Check if launcher instance exists
const launcher = window.launcher;
if (launcher) {
    console.log('Launcher instance found');
    console.log('Current selected implementation:', launcher.selectedImplementation);
    console.log('Running implementation:', launcher.runningImplementation);
} else {
    console.error('Launcher instance not found!');
}

// Test 3: Simulate click on first card
if (cards.length > 0 && launcher) {
    const firstCard = cards[0];
    const implementation = firstCard.dataset.implementation;
    
    console.log(`\n=== Simulating click on ${implementation} ===`);
    
    // Check state before click
    console.log('Before click - selectedImplementation:', launcher.selectedImplementation);
    console.log('Before click - card classes:', firstCard.className);
    
    // Simulate click
    firstCard.click();
    
    // Check state after click
    setTimeout(() => {
        console.log('After click - selectedImplementation:', launcher.selectedImplementation);
        console.log('After click - card classes:', firstCard.className);
        
        // Check if selected class was added
        if (firstCard.classList.contains('selected')) {
            console.log('✅ SUCCESS: Card received selected class');
        } else {
            console.log('❌ FAILED: Card did not receive selected class');
        }
        
        // Test 4: Check launch button update
        const launchBtn = document.getElementById('launchBtn');
        if (launchBtn) {
            console.log('Launch button text:', launchBtn.innerHTML);
        }
        
        // Test 5: Check localStorage
        try {
            const saved = localStorage.getItem('spaceAnalyzerLauncher');
            if (saved) {
                const state = JSON.parse(saved);
                console.log('Saved state:', state);
                console.log('✅ SUCCESS: State saved to localStorage');
            } else {
                console.log('❌ FAILED: No state found in localStorage');
            }
        } catch (error) {
            console.error('Error checking localStorage:', error);
        }
        
    }, 100);
}

// Test 6: Check event listeners
console.log('\n=== Checking Event Listeners ===');
if (cards.length > 0) {
    const firstCard = cards[0];
    const listeners = getEventListeners ? getEventListeners(firstCard) : 'Not available';
    console.log('Event listeners on first card:', listeners);
}

console.log('\n=== Test Complete ===');