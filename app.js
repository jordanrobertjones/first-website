// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Diary form
    document.getElementById('diary-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        saveEntry('diary', {
            date: document.getElementById('diary-date').value,
            mood: document.getElementById('mood').value,
            entry: document.getElementById('diary-entry').innerHTML
        });
        this.reset();
        document.getElementById('diary-entry').innerHTML = '';
        updateDashboard();
    });
    
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
    const entries = JSON.parse(localStorage.getItem(type) || '[]');
    entries.push({ ...data, timestamp: new Date().toISOString() });
    localStorage.setItem(type, JSON.stringify(entries));
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
    const diaryEntries = JSON.parse(localStorage.getItem('diary') || '[]');
    const todayDiary = diaryEntries.find(entry => entry.date === today);
    
    const moodStats = document.getElementById('mood-stats');
    if (moodStats) {
        moodStats.innerHTML = todayDiary 
            ? `<p>Mood: ${todayDiary.mood}</p>` 
            : '<p>No entry today</p>';
    }
}

// Set up a basic password protection
function checkPassword() {
    const password = prompt('Enter password:');
    if (password !== 'mySecurePassword') { // Change 'mySecurePassword' to your desired password
        window.location.href = 'about:blank';
    }
}

// Enable password protection
checkPassword();