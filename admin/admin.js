class AdminDashboard {
    constructor() {
        this.baseURL = window.location.origin;
        this.appointments = [];
        this.availability = {};
        this.selectedTimes = [];
        this.notificationsOpen = false;
        this.init();
    }

    init() {
        this.setMinDate();
        this.loadAppointments();
        this.loadAvailability();
        this.createTimePicker();
        this.setupEventListeners();
        this.updateNotifications();
        
        // רענן התראות כל דקה
        setInterval(() => this.updateNotifications(), 60000);
    }

    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        const quickDateInput = document.getElementById('quickDate');
        if (quickDateInput) {
            quickDateInput.min = today;
        }
    }

    createTimePicker() {
        const timePicker = document.getElementById('timePicker');
        if (!timePicker) return;

        const times = [];
        for (let h = 8; h <= 20; h++) {
            for (let m = 0; m < 60; m += 30) {
                const hour = String(h).padStart(2, '0');
                const minute = String(m).padStart(2, '0');
                times.push(`${hour}:${minute}`);
            }
        }

        timePicker.innerHTML = times.map(time => `
            <div class="time-checkbox">
                <input type="checkbox" id="time-${time}" value="${time}">
                <label for="time-${time}">${time}</label>
            </div>
        `).join('');
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const statusFilter = document.getElementById('statusFilter');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterAppointments(e.target.value, statusFilter.value);
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterAppointments(searchInput.value, e.target.value);
            });
        }

        // סגירת התראות בלחיצה מחוץ לפאנל
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notificationsPanel');
            const badge = document.querySelector('.notifications-badge');
            if (this.notificationsOpen && panel && !panel.contains(e.target) && !badge.contains(e.target)) {
                this.toggleNotifications();
            }
        });
    }

    async loadAppointments() {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/appointments`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();

            this.appointments = data.appointments;
            this.updateStats(data);
            this.displayAppointments(this.appointments);
            this.updateNotifications();

        } catch (error) {
            console.error('Error loading appointments:', error);
            const container = document.getElementById('appointmentsContainer');
            if (container) {
                container.innerHTML = '<div class="error">שגיאה בטעינת הנתונים</div>';
            }
        }
    }

    async loadAvailability() {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/availability`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            
            this.availability = data.availability;
            this.displayCurrentAvailability();

        } catch (error) {
            console.error('Error loading availability:', error);
            const container = document.getElementById('currentAvailabilityList');
            if (container) {
                container.innerHTML = '<div class="error">שגיאה בטעינת הזמינות</div>';
            }
        }
    }

    updateNotifications() {
        const upcomingAppointments = this.getUpcomingAppointments();
        const count = upcomingAppointments.length;
        
        const countBadge = document.getElementById('notificationCount');
        if (countBadge) {
            countBadge.textContent = count;
            countBadge.style.display = count > 0 ? 'flex' : 'none';
        }

        this.displayNotifications(upcomingAppointments);
    }

    getUpcomingAppointments() {
        const now = new Date();
        const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        return this.appointments
            .filter(apt => {
                if (apt.status !== 'confirmed') return false;
                
                const aptDate = new Date(apt.date + 'T' + apt.time);
                return aptDate >= now && aptDate <= next7Days;
            })
            .sort((a, b) => {
                const dateA = new Date(a.date + 'T' + a.time);
                const dateB = new Date(b.date + 'T' + b.time);
                return dateA - dateB;
            })
            .slice(0, 10); // הצג רק 10 הראשונות
    }

    displayNotifications(appointments) {
        const container = document.getElementById('notificationsList');
        if (!container) return;

        if (appointments.length === 0) {
            container.innerHTML = '<div class="empty-notification">אין פגישות קרובות ב-7 הימים הקרובים</div>';
            return;
        }

        const now = new Date();
        
        container.innerHTML = appointments.map(apt => {
            const aptDate = new Date(apt.date + 'T' + apt.time);
            const diffMs = aptDate - now;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHours / 24);
            
            let timeText = '';
            if (diffHours < 1) {
                timeText = '🔴 בקרוב מאוד!';
            } else if (diffHours < 24) {
                timeText = `🟡 בעוד ${diffHours} שעות`;
            } else {
                timeText = `🟢 בעוד ${diffDays} ימים`;
            }

            const dateFormatted = aptDate.toLocaleDateString('he-IL', {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            });

            return `
                <div class="notification-item ${diffHours < 24 ? 'urgent' : ''}">
                    <div class="notification-time">${timeText}</div>
                    <div class="notification-details">
                        <div class="notification-name">👤 ${apt.name}</div>
                        <div class="notification-date">📅 ${dateFormatted} | ⏰ ${apt.time}</div>
                        <div class="notification-contact">📧 ${apt.email}</div>
                        ${apt.phone ? `<div class="notification-contact">📞 ${apt.phone}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    toggleNotifications() {
        const panel = document.getElementById('notificationsPanel');
        if (!panel) return;

        this.notificationsOpen = !this.notificationsOpen;
        
        if (this.notificationsOpen) {
            panel.classList.add('active');
            this.updateNotifications();
        } else {
            panel.classList.remove('active');
        }
    }

    displayCurrentAvailability() {
        const container = document.getElementById('currentAvailabilityList');
        if (!container) return;

        if (!this.availability || Object.keys(this.availability).length === 0) {
            container.innerHTML = '<div class="empty-state">אין זמינות מוגדרת</div>';
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let html = '';
        const dates = [];

        Object.keys(this.availability).forEach(year => {
            Object.keys(this.availability[year]).forEach(month => {
                Object.keys(this.availability[year][month]).forEach(day => {
                    const dateObj = new Date(year, month - 1, day);
                    if (dateObj >= today) {
                        dates.push({
                            dateObj,
                            year,
                            month,
                            day,
                            slots: this.availability[year][month][day]
                        });
                    }
                });
            });
        });

        dates.sort((a, b) => a.dateObj - b.dateObj);

        if (dates.length === 0) {
            container.innerHTML = '<div class="empty-state">אין זמינות עתידית</div>';
            return;
        }

        dates.forEach(({ dateObj, year, month, day, slots }) => {
            const dateString = dateObj.toLocaleDateString('he-IL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            html += `
                <div class="availability-item">
                    <div class="availability-date">${dateString}</div>
                    <div class="availability-slots">
                        ${slots.map(slot => `<span class="slot-badge">${slot}</span>`).join('')}
                    </div>
                    <button class="btn-delete" onclick="admin.deleteAvailability('${year}', '${month}', '${day}')">
                        🗑️ מחק
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async addQuickAvailability() {
        const dateInput = document.getElementById('quickDate');
        const date = dateInput.value;

        if (!date) {
            this.showMessage('אנא בחר תאריך', 'error');
            return;
        }

        const selectedTimes = [];
        document.querySelectorAll('#timePicker input[type="checkbox"]:checked').forEach(checkbox => {
            selectedTimes.push(checkbox.value);
        });

        if (selectedTimes.length === 0) {
            this.showMessage('אנא בחר לפחות שעה אחת', 'error');
            return;
        }

        const [year, month, day] = date.split('-');

        try {
            const response = await fetch(`${this.baseURL}/api/admin/availability`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    year: year,
                    month: month,
                    day: day,
                    slots: selectedTimes
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network error');
            }

            const result = await response.json();

            if (result.success) {
                this.showMessage('✅ זמינות נוספה!', 'success');
                dateInput.value = '';
                
                document.querySelectorAll('#timePicker input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = false;
                });

                this.loadAvailability();
            }
        } catch (error) {
            console.error('Error setting availability:', error);
            this.showMessage('❌ שגיאה בשמירה', 'error');
        }
    }

    async deleteAvailability(year, month, day) {
        if (!confirm('למחוק זמינות זו?')) {
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/api/admin/availability`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    year: year,
                    month: month,
                    day: day,
                    slots: []
                })
            });

            if (!response.ok) {
                throw new Error('Network error');
            }

            this.showMessage('✅ נמחק בהצלחה!', 'success');
            this.loadAvailability();

        } catch (error) {
            console.error('Error deleting availability:', error);
            this.showMessage('❌ שגיאה במחיקה', 'error');
        }
    }

    updateStats(data) {
        document.getElementById('totalAppointments').textContent = data.total;
        document.getElementById('confirmedAppointments').textContent = data.confirmed;
        document.getElementById('cancelledAppointments').textContent = data.cancelled;
    }

    displayAppointments(appointments) {
        const container = document.getElementById('appointmentsContainer');
        if (!container) return;
        
        if (appointments.length === 0) {
            container.innerHTML = '<div class="empty-state">אין תורים</div>';
            return;
        }

        container.innerHTML = appointments.map(apt => this.createAppointmentCard(apt)).join('');
    }

    createAppointmentCard(appointment) {
        const date = new Date(appointment.date).toLocaleDateString('he-IL');
        const statusClass = appointment.status === 'confirmed' ? 'confirmed' : 'cancelled';
        const statusText = appointment.status === 'confirmed' ? 'מאושר' : 'מבוטל';

        return `
            <div class="appointment-card ${statusClass}">
                <div class="appointment-header">
                    <div class="appointment-name">👤 ${appointment.name}</div>
                    <div class="appointment-status">${statusText}</div>
                </div>
                <div class="appointment-details">
                    <div>📅 ${date} | ⏰ ${appointment.time}</div>
                    <div>📧 ${appointment.email}</div>
                    ${appointment.phone ? `<div>📞 ${appointment.phone}</div>` : ''}
                </div>
                <div class="appointment-actions">
                    ${appointment.status === 'confirmed' ? 
                        `<button class="btn btn-cancel" onclick="admin.updateAppointmentStatus('${appointment.id}', 'cancelled')">
                            ❌ בטל
                        </button>` : 
                        `<button class="btn btn-confirm" onclick="admin.updateAppointmentStatus('${appointment.id}', 'confirmed')">
                            ✅ אשר
                        </button>`
                    }
                </div>
            </div>
        `;
    }

    filterAppointments(searchTerm, statusFilter) {
        let filtered = this.appointments;

        if (searchTerm) {
            filtered = filtered.filter(apt => 
                apt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                apt.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(apt => apt.status === statusFilter);
        }

        this.displayAppointments(filtered);
    }

    async updateAppointmentStatus(appointmentId, newStatus) {
        try {
            const response = await fetch(`${this.baseURL}/api/admin/appointments/${appointmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network error');
            }

            const result = await response.json();

            if (result.success) {
                this.showMessage('✅ עודכן!', 'success');
                this.loadAppointments();
            }
        } catch (error) {
            console.error('Error updating appointment:', error);
            this.showMessage('❌ שגיאה בעדכון', 'error');
        }
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('availabilityMessage');
        if (!messageDiv) return;
        
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}

function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');

    if (tabName === 'appointments' && admin) {
        admin.loadAppointments();
    }
}

const admin = new AdminDashboard();
