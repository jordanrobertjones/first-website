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
    
    // Set default date range for history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    document.getElementById('history-start-date').value = thirtyDaysAgo.toISOString().split('T')[0];
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

function loadHistory() {
    const typeFilter = document.getElementById('history-type').value;
    const startDate = document.getElementById('history-start-date').value;
    const endDate = document.getElementById('history-end-date').value;
    
    const entryTypes = ['nutrition', 'health', 'exercise', 'diary'];
    let allEntries = [];
    
    entryTypes.forEach(type => {
        if (typeFilter === 'all' || typeFilter === type) {
            const entries = JSON.parse(localStorage.getItem(type) || '[]');
            entries.forEach(entry => {
                entry.entryType = type;
                allEntries.push(entry);
            });
        }
    });
    
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
                <button class="btn view-entry" data-type="${entry.entryType}" data-id="${entry.timestamp}">View</button>
                <button class="btn delete-entry" data-type="${entry.entryType}" data-id="${entry.timestamp}">Delete</button>
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

function viewEntry(type, id) {
    const entries = JSON.parse(localStorage.getItem(type) || '[]');
    const entry = entries.find(e => e.timestamp === id);
    
    if (!entry) {
        alert('Entry not found');
        return;
    }
    
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

function deleteEntry(type, id) {
    let entries = JSON.parse(localStorage.getItem(type) || '[]');
    const initialLength = entries.length;
    
    entries = entries.filter(entry => entry.timestamp !== id);
    
    if (entries.length < initialLength) {
        localStorage.setItem(type, JSON.stringify(entries));
        alert('Entry deleted successfully');
        loadHistory();
        updateDashboard();
    } else {
        alert('Error: Entry not found');
    }
}

function setupForms() {
    console.log('Setting up forms...');
    
    // Nutrition form
    document.getElementById('nutrition-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Nutrition form submitted');
        
        const saved = saveEntry('nutrition', {
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
            // Reset datetime to current
            const now = new Date();
            const timezoneOffset = now.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(now - timezoneOffset)).toISOString().slice(0, 16);
            document.getElementById('nutrition-datetime').value = localISOTime;
            updateDashboard();
        }
    });
    
    // Health form
    document.getElementById('health-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Health form submitted');
        
        const saved = saveEntry('health', {
            datetime: document.getElementById('health-datetime').value,
            systolic: document.getElementById('systolic').value,
            diastolic: document.getElementById('diastolic').value,
            pulse: document.getElementById('pulse').value,
            notes: document.getElementById('health-notes').value
        });
        
        if (saved) {
            alert('Health entry saved!');
            this.reset();
            const now = new Date();
            const timezoneOffset = now.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(now - timezoneOffset)).toISOString().slice(0, 16);
            document.getElementById('health-datetime').value = localISOTime;
            updateDashboard();
        }
    });
    
    // Exercise form
    document.getElementById('exercise-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('Exercise form submitted');
        
        const saved = saveEntry('exercise', {
            datetime: document.getElementById('exercise-datetime').value,
            type: document.getElementById('exercise-type').value,
            duration: document.getElementById('duration').value,
            intensity: document.getElementById('intensity').value,
            notes: document.getElementById('exercise-notes').value
        });
        
        if (saved) {
            alert('Exercise entry saved!');
            this.reset();
            const now = new Date();
            const timezoneOffset = now.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(now - timezoneOffset)).toISOString().slice(0, 16);
            document.getElementById('exercise-datetime').value = localISOTime;
            updateDashboard();
        }
    });
    
    // Diary form
    const diaryForm = document.getElementById('diary-form');
    if (diaryForm) {
        console.log('Setting up diary form...');
        diaryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Diary form submitted');
            
            const dateInput = document.getElementById('diary-date');
            const moodInput = document.getElementById('mood');
            const entryContent = document.getElementById('diary-entry').innerHTML;
            
            if (!dateInput.value) {
                alert('Please select a date');
                return;
            }
            
            // Create datetime from date input
            const selectedDate = new Date(dateInput.value + 'T12:00:00');
            const datetime = selectedDate.toISOString();
            const dateOnly = dateInput.value; // Already in YYYY-MM-DD format
            
            console.log('Diary data:', {
                datetime: datetime,
                date: dateOnly,
                mood: moodInput.value,
                entry: entryContent
            });
            
            const saved = saveEntry('diary', {
                datetime: datetime,
                date: dateOnly,
                mood: moodInput.value,
                entry: entryContent
            });
            
            if (saved) {
                alert('Diary entry saved!');
                this.reset();
                document.getElementById('diary-entry').innerHTML = '';
                // Reset date to today
                const today = new Date();
                const localISODate = today.toISOString().split('T')[0];
                document.getElementById('diary-date').value = localISODate;
                updateDashboard();
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

function saveEntry(type, data) {
    try {
        console.log('=== SAVING ENTRY ===');
        console.log('Type:', type);
        console.log('Data:', data);
        
        // Get existing entries
        const entries = JSON.parse(localStorage.getItem(type) || '[]');
        console.log('Existing entries:', entries.length);
        
        // Add timestamp if not present
        if (!data.timestamp) {
            data.timestamp = new Date().toISOString();
        }
        
        // Add the new entry
        entries.push(data);
        
        // Save to localStorage
        localStorage.setItem(type, JSON.stringify(entries));
        console.log('Saved! Total entries now:', entries.length);
        
        // Verify
        const verify = JSON.parse(localStorage.getItem(type) || '[]');
        console.log('Verification - entries in storage:', verify.length);
        console.log('Last saved entry:', verify[verify.length - 1]);
        
        return true;
    } catch (error) {
        console.error('ERROR saving entry:', error);
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
        result.push(d.toISOString().split('T')[0]);
    }
    return result;
}

function getDataForDate(entries, date) {
    return entries.filter(entry => {
        const entryDate = entry.datetime ? entry.datetime.split('T')[0] : '';
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

function updateCharts() {
    const days = 7;
    const dateLabels = getLastNDays(days);
    
    // Nutrition data
    const nutritionEntries = JSON.parse(localStorage.getItem('nutrition') || '[]');
    const caloriesData = dateLabels.map(date => {
        const dayEntries = getDataForDate(nutritionEntries, date);
        return dayEntries.reduce((sum, entry) => sum + (parseInt(entry.calories) || 0), 0);
    });
    createCaloriesChart(dateLabels, caloriesData);
    
    // Blood pressure data
    const healthEntries = JSON.parse(localStorage.getItem('health') || '[]');
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
    
    // Exercise data
    const exerciseEntries = JSON.parse(localStorage.getItem('exercise') || '[]');
    const exerciseData = dateLabels.map(date => {
        const dayEntries = getDataForDate(exerciseEntries, date);
        return dayEntries.reduce((sum, entry) => sum + (parseInt(entry.duration) || 0), 0);
    });
    createExerciseChart(dateLabels, exerciseData);
    
    // Mood data
    const diaryEntries = JSON.parse(localStorage.getItem('diary') || '[]');
    const moodData = [];
    const moodMap = {};
    
    diaryEntries.forEach(entry => {
        if (entry.mood) {
            const date = entry.date || (entry.datetime ? entry.datetime.split('T')[0] : '');
            moodMap[date] = entry.mood;
        }
    });
    
    dateLabels.forEach(date => {
        moodData.push(moodMap[date] || null);
    });
    
    createMoodChart(dateLabels, moodData);
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
    if (bpStats) {
        if (todayBP.length > 0) {
            const latestBP = todayBP[todayBP.length - 1];
            bpStats.innerHTML = `
                <p>${latestBP.systolic}/${latestBP.diastolic}</p>
                <p>Pulse: ${latestBP.pulse}</p>
            `;
        } else {
            bpStats.innerHTML = '<p>No readings today</p>';
        }
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
    const sortedEntries = [...diaryEntries].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    const todayDiary = sortedEntries.find(entry => {
        const entryDate = entry.date || (entry.datetime ? entry.datetime.split('T')[0] : null);
        return entryDate === today;
    });
    
    const moodStats = document.getElementById('mood-stats');
    if (moodStats) {
        if (todayDiary) {
            moodStats.innerHTML = `
                <p>Mood: ${todayDiary.mood || 'N/A'}</p>
                <p>${todayDiary.entry ? 'Entry saved' : 'No entry content'}</p>
            `;
        } else if (sortedEntries.length > 0) {
            const lastEntry = sortedEntries[0];
            const lastDate = new Date(lastEntry.timestamp);
            moodStats.innerHTML = `
                <p>Last mood: ${lastEntry.mood || 'N/A'}</p>
                <p>${lastDate.toLocaleDateString()}</p>
            `;
        } else {
            moodStats.innerHTML = '<p>No entries yet</p>';
        }
    }
    
    updateCharts();
}

// OPTIONAL: Password protection (commented out by default)
// Uncomment the lines below if you want password protection
/*
function checkPassword() {
    const password = prompt('Enter password:');
    if (password !== 'your_password_here') {
        window.location.href = 'about:blank';
    }
}
checkPassword();
*/
