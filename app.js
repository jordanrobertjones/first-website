// Debug: Check if script is loaded
console.log('app.js loaded');

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing app...');
    initializeApp();
});

function initializeApp() {
    // Set current date and time in date/time fields
    const now = new Date();
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - timezoneOffset)).toISOString().slice(0, 16);
    const localISODate = (new Date(now - timezoneOffset)).toISOString().split('T')[0];
    
    // Set current date/time in forms
    document.querySelectorAll('input[type="datetime-local"]').forEach(input => {
        input.value = localISOTime;
    });
    
    document.getElementById('diary-date').value = localISODate;
    
    // Initialize navigation
    setupNavigation();
    
    // Initialize forms
    setupForms();
    
    // Load and display data
    updateDashboard();
}

function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and pages
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Show corresponding page
            const pageId = this.getAttribute('data-page');
            document.getElementById(pageId).classList.add('active');
        });
    });
}

function setupForms() {
    console.log('Setting up forms...');
    
    // Check if diary form exists
    const diaryForm = document.getElementById('diary-form');
    console.log('Diary form element:', diaryForm);
    
    // Nutrition form
    document.getElementById('nutrition-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        saveEntry('nutrition', {
            datetime: document.getElementById('nutrition-datetime').value,
            calories: document.getElementById('calories').value,
            protein: document.getElementById('protein').value,
            carbs: document.getElementById('carbs').value,
            fats: document.getElementById('fats').value,
            alcohol: document.getElementById('alcohol').value
        });
        this.reset();
        updateDashboard();
    });
    
    // Health form
    document.getElementById('health-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        saveEntry('health', {
            datetime: document.getElementById('health-datetime').value,
            systolic: document.getElementById('systolic').value,
            diastolic: document.getElementById('diastolic').value,
            pulse: document.getElementById('pulse').value,
            notes: document.getElementById('health-notes').value
        });
        this.reset();
        updateDashboard();
    });
    
    // Exercise form
    document.getElementById('exercise-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        saveEntry('exercise', {
            datetime: document.getElementById('exercise-datetime').value,
            type: document.getElementById('exercise-type').value,
            duration: document.getElementById('duration').value,
            intensity: document.getElementById('intensity').value,
            notes: document.getElementById('exercise-notes').value
        });
        this.reset();
        updateDashboard();
    });
    
    // Diary form submit handler
    console.log('Setting up diary form submit handler...');
    if (!diaryForm) {
        console.error('Diary form not found!');
    } else {
        console.log('Found diary form, adding submit event listener...');
        diaryForm.addEventListener('submit', function(e) {
            console.log('=== Form Submission Started ===');
            console.log('Form submit event triggered');
            console.log('Form element:', this);
            console.log('Form elements:', this.elements);
        e.preventDefault();
        const dateInput = document.getElementById('diary-date');
        const moodInput = document.getElementById('mood');
        const entryContent = document.getElementById('diary-entry').innerHTML;
        
        // Format the date to YYYY-MM-DD format
        let formattedDate = '';
        let displayDate = '';
        
        if (dateInput.value) {
            // Convert date input to YYYY-MM-DD format
            const date = new Date(dateInput.value);
            formattedDate = date.toISOString().split('T')[0] + 'T00:00';
            displayDate = date.toISOString().split('T')[0];
        } else {
            const today = new Date();
            formattedDate = today.toISOString().split('T')[0] + 'T00:00';
            displayDate = today.toISOString().split('T')[0];
        }
        
        try {
            console.log('=== Form Data ===');
            console.log('Date input value:', dateInput ? dateInput.value : 'dateInput is null');
            console.log('Mood input value:', moodInput ? moodInput.value : 'moodInput is null');
            console.log('Entry content:', entryContent);
            
            if (!dateInput || !moodInput) {
                throw new Error('Required form elements not found');
            }
            
            console.log('Attempting to save diary entry...');
            
            const entryData = {
                datetime: formattedDate,
                date: displayDate,  // This will be in YYYY-MM-DD format
                mood: moodInput.value,
                entry: entryContent,
                timestamp: new Date().toISOString()
            };
            
            console.log('Saving entry data:', entryData);
            saveEntry('diary', entryData);
            
            // Verify the entry was saved
            const savedEntries = JSON.parse(localStorage.getItem('diary') || '[]');
            console.log('All saved entries after save:', savedEntries);
            
            if (savedEntries.some(entry => entry.timestamp === entryData.timestamp)) {
                console.log('Diary entry saved successfully!');
                alert('Entry saved successfully!');
            } else {
                throw new Error('Entry was not saved to localStorage');
            }
        } catch (error) {
            console.error('Error saving diary entry:', error);
        }
        
            this.reset();
            document.getElementById('diary-entry').innerHTML = '';
            updateDashboard();
        });
        
        console.log('Diary form submit handler attached successfully');
    }
    
    // Text formatting for diary
    document.querySelectorAll('.toolbar button').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const command = this.getAttribute('data-command');
            document.execCommand(command, false, null);
        });
    });
}

function saveEntry(type, data) {
    try {
        console.log('Saving entry type:', type);
        console.log('Entry data:', data);
        
        // Get existing entries or initialize empty array
        const entries = JSON.parse(localStorage.getItem(type) || '[]');
        console.log('Existing entries:', entries);
        
        // Add new entry with timestamp if not already present
        if (!data.timestamp) {
            data.timestamp = new Date().toISOString();
        }
        
        // Add the new entry
        entries.push(data);
        
        // Save back to localStorage
        localStorage.setItem(type, JSON.stringify(entries));
        console.log('Successfully saved entry. Total entries:', entries.length);
        
        // Verify the save worked
        const verify = JSON.parse(localStorage.getItem(type) || '[]');
        console.log('Verify save - last entry:', verify[verify.length - 1]);
        
        return true;
    } catch (error) {
        console.error('Error in saveEntry:', error);
        return false;
    }
}

function updateDashboard() {
    // Update nutrition stats
    const nutritionEntries = JSON.parse(localStorage.getItem('nutrition') || '[]');
    const today = new Date().toISOString().split('T')[0];
    const todayNutrition = nutritionEntries.filter(entry => entry.datetime && entry.datetime.startsWith(today));
    
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;
    
    todayNutrition.forEach(entry => {
        totalCalories += parseInt(entry.calories || 0);
        totalProtein += parseInt(entry.protein || 0);
        totalCarbs += parseInt(entry.carbs || 0);
        totalFats += parseInt(entry.fats || 0);
    });
    
    const macroStats = document.getElementById('macro-stats');
    if (macroStats) {
        macroStats.innerHTML = `
            <p>Calories: ${totalCalories}</p>
            <p>Protein: ${totalProtein}g</p>
            <p>Carbs: ${totalCarbs}g</p>
            <p>Fats: ${totalFats}g</p>
        `;
    }
    
    // Update blood pressure stats
    const bpEntries = JSON.parse(localStorage.getItem('health') || '[]');
    const todayBP = bpEntries.filter(entry => entry.datetime && entry.datetime.startsWith(today));
    
    const bpStats = document.getElementById('bp-stats');
    if (bpStats && todayBP.length > 0) {
        const latestBP = todayBP[todayBP.length - 1];
        bpStats.innerHTML = `
            <p>${latestBP.systolic}/${latestBP.diastolic}</p>
            <p>Pulse: ${latestBP.pulse}</p>
        `;
    }
    
    // Update exercise stats
    const exerciseEntries = JSON.parse(localStorage.getItem('exercise') || '[]');
    const todayExercises = exerciseEntries.filter(entry => entry.datetime && entry.datetime.startsWith(today));
    
    const exerciseStats = document.getElementById('exercise-stats');
    if (exerciseStats) {
        exerciseStats.innerHTML = todayExercises.length > 0 
            ? `<p>${todayExercises.length} activities logged</p>`
            : '<p>No exercises today</p>';
    }
    
    // Update mood stats
    console.log('=== Updating Mood Stats ===');
    const diaryEntries = JSON.parse(localStorage.getItem('diary') || '[]');
    console.log('All diary entries:', diaryEntries);
    
    // Sort entries by timestamp in descending order (newest first)
    const sortedEntries = [...diaryEntries].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Try to find today's entry
    const todayDiary = sortedEntries.find(entry => {
        const entryDate = entry.date || (entry.datetime ? entry.datetime.split('T')[0] : null);
        console.log(`Checking entry date: ${entryDate} against today: ${today}`);
        return entryDate === today;
    });
    
    console.log('Most recent diary entry:', sortedEntries[0]);
    console.log('Today\'s diary entry:', todayDiary);
    
    const moodStats = document.getElementById('mood-stats');
    if (moodStats) {
        if (todayDiary) {
            console.log('Displaying mood:', todayDiary.mood);
            moodStats.innerHTML = `
                <p>Mood: ${todayDiary.mood || 'N/A'}</p>
                <p>${todayDiary.entry ? 'Entry saved' : 'No entry content'}</p>
            `;
        } else if (sortedEntries.length > 0) {
            console.log('No entry for today, showing most recent entry');
            moodStats.innerHTML = `
                <p>Last mood: ${sortedEntries[0].mood || 'N/A'}</p>
                <p>Last entry: ${new Date(sortedEntries[0].timestamp).toLocaleDateString()}</p>
            `;
        } else {
            console.log('No diary entries found');
            moodStats.innerHTML = '<p>No entries yet</p>';
        }
    }
}

// Set up a basic password protection
function checkPassword() {
    const password = prompt('Enter password:');
    if (password !== 'fuckingpassword') {
        window.location.href = 'about:blank';
    }
}

// Enable password protection
checkPassword();