// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAApzVL1VKaurTa--cy8TM_vx7b1Hc2Lss",
  authDomain: "personal-metrics-tracker.firebaseapp.com",
  projectId: "personal-metrics-tracker",
  storageBucket: "personal-metrics-tracker.firebasestorage.app",
  messagingSenderId: "98508924201",
  appId: "1:98508924201:web:08fab1c57685cbab474338",
  measurementId: "G-PFEHG9Y0KH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// User ID for this device (generates once and stores locally)
let userId = localStorage.getItem('userId');
if (!userId) {
    userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', userId);
}

console.log('Firebase initialized. User ID:', userId);

// Helper function to get local date string (YYYY-MM-DD) accounting for timezone
function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to get local datetime string for datetime-local input
function getLocalDateTimeString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Helper function to extract date from datetime string
function extractDate(datetimeString) {
    if (!datetimeString) return '';
    // Handle both "YYYY-MM-DDTHH:mm" format and ISO format
    return datetimeString.split('T')[0];
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing app...');
    initializeApp();
});

function initializeApp() {
    // Set current date and time in date/time fields
    const now = new Date();
    const localISOTime = getLocalDateTimeString(now);
    const localISODate = getLocalDateString(now);
    
    // Set current date/time in forms
    document.querySelectorAll('input[type="datetime-local"]').forEach(input => {
        input.value = localISOTime;
    });
    
    document.getElementById('diary-date').value = localISODate;
    
    // Set default date range for history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    document.getElementById('history-start-date').value = getLocalDateString(thirtyDaysAgo);
    document.getElementById('history-end-date').value = localISODate;
    
    // Initialize navigation
    setupNavigation();
    
    // Initialize forms
    setupForms();
    
    // Initialize history page
    setupHistoryPage();
    
    // Load and display data
    updateDashboard();
    
    // Update charts when dashboard tab is clicked
    document.querySelector('[data-page="dashboard"]').addEventListener('click', function() {
        setTimeout(updateCharts, 100);
    });
    
    // Set up real-time listeners for data changes
    setupRealtimeListeners();
}

function setupRealtimeListeners() {
    // Listen for changes to all entry types
    ['nutrition', 'health', 'exercise', 'diary'].forEach(type => {
        db.collection(type)
            .where('userId', '==', userId)
            .onSnapshot((snapshot) => {
                console.log(`Real-time update: ${type} changed`);
                updateDashboard();
            });
    });
}

function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            
            this.classList.add('active');
            
            const pageId = this.getAttribute('data-page');
            document.getElementById(pageId).classList.add('active');
        });
    });
}

function setupHistoryPage() {
    document.querySelector('[data-page="history"]')?.addEventListener('click', function() {
        loadHistory();
    });
    
    document.getElementById('apply-filters')?.addEventListener('click', function(e) {
        e.preventDefault();
        loadHistory();
    });
}

async function loadHistory() {
    const typeFilter = document.getElementById('history-type').value;
    const startDate = document.getElementById('history-start-date').value;
    const endDate = document.getElementById('history-end-date').value;
    
    const entryTypes = typeFilter === 'all' ? ['nutrition', 'health', 'exercise', 'diary'] : [typeFilter];
    let allEntries = [];
    
    for (const type of entryTypes) {
        const snapshot = await db.collection(type)
            .where('userId', '==', userId)
            .get();
        
        snapshot.forEach(doc => {
            const entry = doc.data();
            entry.id = doc.id;
            entry.entryType = type;
            allEntries.push(entry);
        });
    }
    
    // Filter by date range
    if (startDate) {
        const start = new Date(startDate);
        allEntries = allEntries.filter(entry => {
            const entryDate = new Date(entry.datetime || entry.timestamp);
            return entryDate >= start;
        });
    }
    
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        allEntries = allEntries.filter(entry => {
            const entryDate = new Date(entry.datetime || entry.timestamp);
            return entryDate <= end;
        });
    }
    
    // Sort by date (newest first)
    allEntries.sort((a, b) => {
        const dateA = new Date(a.datetime || a.timestamp);
        const dateB = new Date(b.datetime || b.timestamp);
        return dateB - dateA;
    });
    
    displayHistoryEntries(allEntries);
}

function displayHistoryEntries(entries) {
    const tbody = document.getElementById('history-entries');
    tbody.innerHTML = '';
    
    if (entries.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4" class="no-entries">No entries found matching your filters.</td>`;
        tbody.appendChild(row);
        return;
    }
    
    entries.forEach(entry => {
        const row = document.createElement('tr');
        const entryDate = new Date(entry.datetime || entry.timestamp);
        const formattedDate = entryDate.toLocaleString();
        
        let details = '';
        switch(entry.entryType) {
            case 'nutrition':
                details = `Calories: ${entry.calories || 0} | Protein: ${entry.protein || 0}g | Carbs: ${entry.carbs || 0}g | Fats: ${entry.fats || 0}g`;
                if (entry.alcohol) details += ` | Alcohol: ${entry.alcohol} drinks`;
                break;
            case 'health':
                details = `BP: ${entry.systolic || '--'}/${entry.diastolic || '--'}`;
                if (entry.pulse) details += ` | Pulse: ${entry.pulse}`;
                if (entry.notes) details += ` | ${entry.notes}`;
                break;
            case 'exercise':
                details = `${entry.type || 'Exercise'}`;
                if (entry.duration) details += ` | ${entry.duration} min`;
                if (entry.intensity) details += ` | ${entry.intensity}`;
                if (entry.notes) details += ` | ${entry.notes}`;
                break;
            case 'diary':
                details = entry.mood ? `Mood: ${entry.mood}` : 'Diary entry';
                if (entry.entry) {
                    const temp = document.createElement('div');
                    temp.innerHTML = entry.entry;
                    const textContent = temp.textContent || temp.innerText || '';
                    details += ` | ${textContent.substring(0, 50)}${textContent.length > 50 ? '...' : ''}`;
                }
                break;
        }
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td><span class="entry-type ${entry.entryType}">${entry.entryType}</span></td>
            <td class="entry-details" title="${details}">${details}</td>
            <td class="actions">
                <button class="btn view-entry" data-type="${entry.entryType}" data-id="${entry.id}">View</button>
                <button class="btn delete-entry" data-type="${entry.entryType}" data-id="${entry.id}">Delete</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    document.querySelectorAll('.view-entry').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            const id = this.getAttribute('data-id');
            viewEntry(type, id);
        });
    });
    
    document.querySelectorAll('.delete-entry').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete this entry?')) {
                const type = this.getAttribute('data-type');
                const id = this.getAttribute('data-id');
                deleteEntry(type, id);
            }
        });
    });
}

async function viewEntry(type, id) {
    const doc = await db.collection(type).doc(id).get();
    
    if (!doc.exists) {
        alert('Entry not found');
        return;
    }
    
    const entry = doc.data();
    let message = '';
    const entryDate = new Date(entry.datetime || entry.timestamp);
    
    switch(type) {
        case 'nutrition':
            message = `Date: ${entryDate.toLocaleString()}
Calories: ${entry.calories || 0}
Protein: ${entry.protein || 0}g
Carbs: ${entry.carbs || 0}g
Fats: ${entry.fats || 0}g`;
            if (entry.alcohol) message += `\nAlcohol: ${entry.alcohol} drinks`;
            break;
        case 'health':
            message = `Date: ${entryDate.toLocaleString()}
Blood Pressure: ${entry.systolic || '--'}/${entry.diastolic || '--'}
Pulse: ${entry.pulse || '--'}`;
            if (entry.notes) message += `\nNotes: ${entry.notes}`;
            break;
        case 'exercise':
            message = `Date: ${entryDate.toLocaleString()}
Type: ${entry.type || '--'}
Duration: ${entry.duration || '--'} minutes
Intensity: ${entry.intensity || '--'}`;
            if (entry.notes) message += `\nNotes: ${entry.notes}`;
            break;
        case 'diary':
            message = `Date: ${entryDate.toLocaleString()}
Mood: ${entry.mood || '--'}

${entry.entry || ''}`;
            break;
    }
    
    alert(message);
}

async function deleteEntry(type, id) {
    try {
        await db.collection(type).doc(id).delete();
        alert('Entry deleted successfully');
        loadHistory();
        updateDashboard();
    } catch (error) {
        console.error('Error deleting entry:', error);
        alert('Error deleting entry: ' + error.message);
    }
}

function setupForms() {
    console.log('Setting up forms...');
    
    // Nutrition form
    document.getElementById('nutrition-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Nutrition form submitted');
        
        const saved = await saveEntry('nutrition', {
            datetime: document.getElementById('nutrition-datetime').value,
            calories: document.getElementById('calories').value,
            protein: document.getElementById('protein').value,
            carbs: document.getElementById('carbs').value,
            fats: document.getElementById('fats').value,
            alcohol: document.getElementById('alcohol').value
        });
        
        if (saved) {
            alert('Nutrition entry saved!');
            this.reset();
            document.getElementById('nutrition-datetime').value = getLocalDateTimeString();
        }
    });
    
    // Health form
    document.getElementById('health-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('=== HEALTH FORM SUBMITTED ===');
        
        const datetime = document.getElementById('health-datetime').value;
        const systolic = document.getElementById('systolic').value;
        const diastolic = document.getElementById('diastolic').value;
        const pulse = document.getElementById('pulse').value;
        const notes = document.getElementById('health-notes').value;
        
        console.log('Health form data:', {
            datetime: datetime,
            systolic: systolic,
            diastolic: diastolic,
            pulse: pulse,
            notes: notes
        });
        
        const saved = await saveEntry('health', {
            datetime: datetime,
            systolic: systolic,
            diastolic: diastolic,
            pulse: pulse,
            notes: notes
        });
        
        if (saved) {
            alert('Health entry saved and syncing!');
            console.log('Health entry saved successfully');
            this.reset();
            document.getElementById('health-datetime').value = getLocalDateTimeString();
        } else {
            console.error('Failed to save health entry');
        }
    });
    
    // Exercise form
    document.getElementById('exercise-form')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Exercise form submitted');
        
        const saved = await saveEntry('exercise', {
            datetime: document.getElementById('exercise-datetime').value,
            type: document.getElementById('exercise-type').value,
            duration: document.getElementById('duration').value,
            intensity: document.getElementById('intensity').value,
            notes: document.getElementById('exercise-notes').value
        });
        
        if (saved) {
            alert('Exercise entry saved!');
            this.reset();
            document.getElementById('exercise-datetime').value = getLocalDateTimeString();
        }
    });
    
    // Diary form
    const diaryForm = document.getElementById('diary-form');
    if (diaryForm) {
        console.log('Setting up diary form...');
        diaryForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Diary form submitted');
            
            const dateInput = document.getElementById('diary-date');
            const moodInput = document.getElementById('mood');
            const entryContent = document.getElementById('diary-entry').innerHTML;
            
            if (!dateInput.value) {
                alert('Please select a date');
                return;
            }
            
            const selectedDate = new Date(dateInput.value + 'T12:00:00');
            const datetime = selectedDate.toISOString();
            const dateOnly = dateInput.value;
            
            const saved = await saveEntry('diary', {
                datetime: datetime,
                date: dateOnly,
                mood: moodInput.value,
                entry: entryContent
            });
            
            if (saved) {
                alert('Diary entry saved!');
                this.reset();
                document.getElementById('diary-entry').innerHTML = '';
                document.getElementById('diary-date').value = getLocalDateString();
            }
        });
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

async function saveEntry(type, data) {
    try {
        console.log('=== SAVING TO FIREBASE ===');
        console.log('Type:', type);
        console.log('Data:', data);
        
        // Add metadata
        data.userId = userId;
        data.timestamp = new Date().toISOString();
        
        // Save to Firestore
        const docRef = await db.collection(type).add(data);
        console.log('Saved to Firebase with ID:', docRef.id);
        
        return true;
    } catch (error) {
        console.error('ERROR saving to Firebase:', error);
        alert('Error saving entry: ' + error.message);
        return false;
    }
}

// Chart instances
let charts = {
    caloriesChart: null,
    bpChart: null,
    exerciseChart: null,
    moodChart: null
};

function getLastNDays(n) {
    const result = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        result.push(getLocalDateString(d));
    }
    return result;
}

function getDataForDate(entries, date) {
    return entries.filter(entry => {
        const entryDate = extractDate(entry.datetime);
        return entryDate === date;
    });
}

function createCaloriesChart(labels, data) {
    const ctx = document.getElementById('caloriesChart').getContext('2d');
    if (charts.caloriesChart) {
        charts.caloriesChart.destroy();
    }
    
    charts.caloriesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Calories',
                data: data,
                borderColor: '#ff4d00',
                backgroundColor: 'rgba(255, 77, 0, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                }
            }
        }
    });
}

function createBPChart(labels, systolicData, diastolicData) {
    const ctx = document.getElementById('bpChart').getContext('2d');
    if (charts.bpChart) {
        charts.bpChart.destroy();
    }
    
    charts.bpChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Systolic',
                    data: systolicData,
                    borderColor: '#ff4d00',
                    backgroundColor: 'transparent',
                    tension: 0.3
                },
                {
                    label: 'Diastolic',
                    data: diastolicData,
                    borderColor: '#4d9eff',
                    backgroundColor: 'transparent',
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#a0a0a0'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                }
            }
        }
    });
}

function createExerciseChart(labels, data) {
    const ctx = document.getElementById('exerciseChart').getContext('2d');
    if (charts.exerciseChart) {
        charts.exerciseChart.destroy();
    }
    
    charts.exerciseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Minutes',
                data: data,
                backgroundColor: 'rgba(255, 77, 0, 0.7)',
                borderColor: '#ff4d00',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                }
            }
        }
    });
}

function createMoodChart(labels, data) {
    const moodValues = {
        '😊': 5,
        '🙂': 4,
        '😐': 3,
        '🙁': 2,
        '😞': 1
    };
    
    const moodData = data.map(mood => moodValues[mood] || 0);
    
    const ctx = document.getElementById('moodChart').getContext('2d');
    if (charts.moodChart) {
        charts.moodChart.destroy();
    }
    
    charts.moodChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Mood',
                data: moodData,
                borderColor: '#ff4d00',
                backgroundColor: 'transparent',
                tension: 0.3,
                pointBackgroundColor: '#ff4d00',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const moodIndex = moodData[context.dataIndex];
                            const moodText = Object.keys(moodValues).find(key => moodValues[key] === moodIndex);
                            return `Mood: ${moodText || 'N/A'}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 6,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#a0a0a0',
                        callback: function(value) {
                            const moodMap = {
                                1: '😞',
                                2: '🙁',
                                3: '😐',
                                4: '🙂',
                                5: '😊'
                            };
                            return moodMap[value] || '';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                }
            }
        }
    });
}

async function updateCharts() {
    const days = 7;
    const dateLabels = getLastNDays(days);
    
    // Get nutrition data from Firebase
    const nutritionSnapshot = await db.collection('nutrition')
        .where('userId', '==', userId)
        .get();
    const nutritionEntries = [];
    nutritionSnapshot.forEach(doc => nutritionEntries.push(doc.data()));
    
    const caloriesData = dateLabels.map(date => {
        const dayEntries = getDataForDate(nutritionEntries, date);
        return dayEntries.reduce((sum, entry) => sum + (parseInt(entry.calories) || 0), 0);
    });
    createCaloriesChart(dateLabels, caloriesData);
    
    // Get health data from Firebase
    const healthSnapshot = await db.collection('health')
        .where('userId', '==', userId)
        .get();
    const healthEntries = [];
    healthSnapshot.forEach(doc => healthEntries.push(doc.data()));
    
    const systolicData = [];
    const diastolicData = [];
    
    dateLabels.forEach(date => {
        const dayEntries = getDataForDate(healthEntries, date);
        if (dayEntries.length > 0) {
            const lastEntry = dayEntries[dayEntries.length - 1];
            systolicData.push(parseInt(lastEntry.systolic) || null);
            diastolicData.push(parseInt(lastEntry.diastolic) || null);
        } else {
            systolicData.push(null);
            diastolicData.push(null);
        }
    });
    createBPChart(dateLabels, systolicData, diastolicData);
    
    // Get exercise data from Firebase
    const exerciseSnapshot = await db.collection('exercise')
        .where('userId', '==', userId)
        .get();
    
    let exerciseCount = 0;
    
    exerciseSnapshot.forEach(doc => {
        const entry = doc.data();
        const entryDate = extractDate(entry.datetime);
        if (entryDate === today) {
            exerciseCount++;
        }
    });
    
    const exerciseStats = document.getElementById('exercise-stats');
    if (exerciseStats) {
        exerciseStats.innerHTML = exerciseCount > 0 
            ? `<p>${exerciseCount} activities logged</p>`
            : '<p>No exercises today</p>';
    }
    
    // Get diary data from Firebase
    const diarySnapshot = await db.collection('diary')
        .where('userId', '==', userId)
        .get();
    
    let todayDiary = null;
    let latestDiary = null;
    
    diarySnapshot.forEach(doc => {
        const entry = doc.data();
        const entryDate = entry.date || extractDate(entry.datetime);
        
        if (entryDate === today) {
            todayDiary = entry;
        }
        
        if (!latestDiary || new Date(entry.timestamp) > new Date(latestDiary.timestamp)) {
            latestDiary = entry;
        }
    });
    
    const moodStats = document.getElementById('mood-stats');
    if (moodStats) {
        if (todayDiary) {
            moodStats.innerHTML = `
                <p>Mood: ${todayDiary.mood || 'N/A'}</p>
                <p>${todayDiary.entry ? 'Entry saved' : 'No entry content'}</p>
            `;
        } else if (latestDiary) {
            const lastDate = new Date(latestDiary.timestamp);
            moodStats.innerHTML = `
                <p>Last mood: ${latestDiary.mood || 'N/A'}</p>
                <p>${lastDate.toLocaleDateString()}</p>
            `;
        } else {
            moodStats.innerHTML = '<p>No entries yet</p>';
        }
    }
    
    updateCharts();
} Firebase
    const exerciseSnapshot = await db.collection('exercise')
        .where('userId', '==', userId)
        .get();
    const exerciseEntries = [];
    exerciseSnapshot.forEach(doc => exerciseEntries.push(doc.data()));
    
    const exerciseData = dateLabels.map(date => {
        const dayEntries = getDataForDate(exerciseEntries, date);
        return dayEntries.reduce((sum, entry) => sum + (parseInt(entry.duration) || 0), 0);
    });
    createExerciseChart(dateLabels, exerciseData);
    
    // Get diary data from Firebase
    const diarySnapshot = await db.collection('diary')
        .where('userId', '==', userId)
        .get();
    const diaryEntries = [];
    diarySnapshot.forEach(doc => diaryEntries.push(doc.data()));
    
    const moodData = [];
    const moodMap = {};
    
    diaryEntries.forEach(entry => {
        if (entry.mood) {
            const date = entry.date || extractDate(entry.datetime);
            moodMap[date] = entry.mood;
        }
    });
    
    dateLabels.forEach(date => {
        moodData.push(moodMap[date] || null);
    });
    
    createMoodChart(dateLabels, moodData);
}

async function updateDashboard() {
    console.log('=== UPDATING DASHBOARD ===');
    const today = getLocalDateString();
    console.log('Today\'s date (local):', today);
    
    // Get nutrition data from Firebase
    const nutritionSnapshot = await db.collection('nutrition')
        .where('userId', '==', userId)
        .get();
    
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFats = 0;
    
    nutritionSnapshot.forEach(doc => {
        const entry = doc.data();
        const entryDate = extractDate(entry.datetime);
        if (entryDate === today) {
            totalCalories += parseInt(entry.calories || 0);
            totalProtein += parseInt(entry.protein || 0);
            totalCarbs += parseInt(entry.carbs || 0);
            totalFats += parseInt(entry.fats || 0);
        }
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
    
    // Get blood pressure data from Firebase - FIXED VERSION
    const bpSnapshot = await db.collection('health')
        .where('userId', '==', userId)
        .get();
    
    let todayBP = null;
    let latestBP = null;
    let latestTimestamp = null;
    
    bpSnapshot.forEach(doc => {
        const entry = doc.data();
        const entryDate = extractDate(entry.datetime);
        const timestamp = new Date(entry.datetime || entry.timestamp);
        
        // Check if entry is from today
        if (entryDate === today) {
            todayBP = entry;
        }
        
        // Track the most recent entry overall
        if (!latestTimestamp || timestamp > latestTimestamp) {
            latestBP = entry;
            latestTimestamp = timestamp;
        }
    });
    
    console.log('Today BP:', todayBP);
    console.log('Latest BP:', latestBP);
    
    const bpStats = document.getElementById('bp-stats');
    if (bpStats) {
        if (todayBP) {
            // Show today's reading
            bpStats.innerHTML = `
                <p>${todayBP.systolic}/${todayBP.diastolic}</p>
                <p>Pulse: ${todayBP.pulse || '--'}</p>
            `;
        } else if (latestBP) {
            // Show most recent reading with date
            const latestDate = new Date(latestBP.datetime || latestBP.timestamp);
            const dateStr = latestDate.toLocaleDateString();
            bpStats.innerHTML = `
                <p>${latestBP.systolic}/${latestBP.diastolic}</p>
                <p>Pulse: ${latestBP.pulse || '--'}</p>
                <p class="reading-date">Last reading: ${dateStr}</p>
            `;
        } else {
            bpStats.innerHTML = '<p>No readings yet</p>';
        }
    }
    
    // Get exercise data from
