class AdminDashboard {
    constructor() {
        this.baseURL = window.location.origin;
        this.appointments = [];
        this.init();
    }

    init() {
        this.setMinDate();
        this.loadAppointments();
        this.setupEventListeners();
    }

    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('availDate').min = today;
    }

    setupEventListeners() {
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterAppointments(e.target.value, document.getElementById('statusFilter').value);
        });

        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filterAppointments(document.getElementById('searchInput').value, e.target.value);
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

        } catch (error) {
            console.error('Error loading appointments:', error);
            this.showMessage('שגיאה בטעינת הנתונים', 'error');
        }
    }

    updateStats(data) {
        document.getElementById('totalAppointments').textContent = data.total;
        document.getElementById('confirmedAppointments').textContent = data.confirmed;
        document.getElementById('cancelledAppointments').textContent = data.cancelled;
    }

    displayAppointments(appointments) {
        const container = document.getElementById('appointmentsContainer');
        
        if (appointments.length === 0) {
            container.innerHTML = '<div class="loading">אין תורים להצגה</div>';
            return;
        }

        container.innerHTML = appointments.map(apt => this.createAppointmentCard(apt)).join('');
    }

    createAppointmentCard(appointment) {
        const date = new Date(appointment.date).toLocaleDateString('he-IL');
        const statusClass = appointment.status === 'confirmed' ? 'confirmed' : 'cancelled';
        const statusText = appointment.status === 'confirmed' ? 'מאושר' : 'מבוטל';

        return `
            <div class="appointment-card">
                <div class="appointment-header">
                    <div class="appointment-name">${appointment.name}</div>
                    <div class="appointment-time ${statusClass}">
                        ${date} | ${appointment.time} | ${statusText}
                    </div>
                </div>
                <div class="appointment-details">
                    <div>📧 ${appointment.email}</div>
                    ${appointment.phone ? `<div>📞 ${appointment.phone}</div>` : ''}
                    <div>📅 נוצר ב: ${new Date(appointment.createdAt).toLocaleString('he-IL')}</div>
                </div>
                <div class="appointment-actions">
                    ${appointment.status === 'confirmed' ? 
                        `<button class="btn btn-cancel" onclick="admin.updateAppointmentStatus('${appointment.id}', 'cancelled')">
                            ❌ בטל תור
                        </button>` : 
                        `<button class="btn btn-confirm" onclick="admin.updateAppointmentStatus('${appointment.id}', 'confirmed')">
                            ✅ אשר תור
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
                this.showMessage('סטטוס התור עודכן בהצלחה!', 'success');
                this.loadAppointments();
            } else {
                throw new Error('Failed to update appointment');
            }
        } catch (error) {
            console.error('Error updating appointment:', error);
            this.showMessage('שגיאה בעדכון הסטטוס', 'error');
        }
    }

    async setAvailability() {
        const dateInput = document.getElementById('availDate');
        const slotsInput = document.getElementById('availSlots');
        
        const date = dateInput.value;
        const slots = slotsInput.value.split(',').map(slot => slot.trim()).filter(slot => slot);

        if (!date || slots.length === 0) {
            this.showMessage('אנא מלא את כל השדות', 'error');
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
                    slots: slots
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network error');
            }

            const result = await response.json();

            if (result.success) {
                this.showMessage('זמינות נשמרה בהצלחה!', 'success');
                dateInput.value = '';
                slotsInput.value = '';
            } else {
                throw new Error('Failed to set availability');
            }
        } catch (error) {
            console.error('Error setting availability:', error);
            this.showMessage('שגיאה בשמירת הזמינות', 'error');
        }
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('availabilityMessage');
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
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
}

const admin = new AdminDashboard();