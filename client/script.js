class AppointmentBooking {
    constructor() {
        this.baseURL = window.location.origin;
        this.selectedDate = null;
        this.selectedTime = null;
        this.init();
    }

    init() {
        this.loadAllAvailableSlots();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('submitBtn').addEventListener('click', () => {
            this.submitAppointment();
        });
    }

    async loadAllAvailableSlots() {
        const container = document.getElementById('availableSlots');
        container.innerHTML = '<div class="loading">טוען זמנים פנויים...</div>';

        try {
            // קבלת כל הזמינות מהשרת
            const response = await fetch(`${this.baseURL}/api/admin/availability`);
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            
            if (!data.availability || Object.keys(data.availability).length === 0) {
                container.innerHTML = '<div class="no-slots">אין זמנים פנויים כרגע. אנא חזור מאוחר יותר.</div>';
                return;
            }

            this.displayAllSlots(data.availability);
        } catch (error) {
            console.error('Error loading slots:', error);
            container.innerHTML = '<div class="error-message">שגיאה בטעינת הזמנים הפנויים</div>';
        }
    }

    displayAllSlots(availability) {
        const container = document.getElementById('availableSlots');
        container.innerHTML = '';

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let hasSlots = false;

        // מיון לפי תאריך
        Object.keys(availability).sort((a, b) => parseInt(a) - parseInt(b)).forEach(year => {
            Object.keys(availability[year]).sort((a, b) => parseInt(a) - parseInt(b)).forEach(month => {
                Object.keys(availability[year][month]).sort((a, b) => parseInt(a) - parseInt(b)).forEach(day => {
                    const dateObj = new Date(year, month - 1, day);
                    
                    // הצג רק תאריכים עתידיים
                    if (dateObj >= today) {
                        const slots = availability[year][month][day];
                        
                        if (slots && slots.length > 0) {
                            hasSlots = true;
                            const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            
                            const dateBlock = document.createElement('div');
                            dateBlock.className = 'date-block';
                            
                            const dateHeader = document.createElement('div');
                            dateHeader.className = 'date-header';
                            dateHeader.textContent = this.formatDate(dateObj);
                            dateBlock.appendChild(dateHeader);
                            
                            const timeSlotsContainer = document.createElement('div');
                            timeSlotsContainer.className = 'time-slots-grid';
                            
                            slots.forEach(time => {
                                const slotElement = document.createElement('div');
                                slotElement.className = 'time-slot';
                                slotElement.textContent = time;
                                slotElement.dataset.date = dateString;
                                slotElement.dataset.time = time;
                                slotElement.addEventListener('click', () => this.selectSlot(dateString, time, slotElement));
                                timeSlotsContainer.appendChild(slotElement);
                            });
                            
                            dateBlock.appendChild(timeSlotsContainer);
                            container.appendChild(dateBlock);
                        }
                    }
                });
            });
        });

        if (!hasSlots) {
            container.innerHTML = '<div class="no-slots">אין זמנים פנויים כרגע. אנא חזור מאוחר יותר.</div>';
        }
    }

    formatDate(date) {
        const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        
        return `יום ${days[date.getDay()]}, ${date.getDate()} ב${months[date.getMonth()]} ${date.getFullYear()}`;
    }

    selectSlot(date, time, clickedElement) {
        // הסרת הבחירה הקודמת
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected');
        });

        // סימון הבחירה החדשה
        clickedElement.classList.add('selected');
        this.selectedDate = date;
        this.selectedTime = time;
    }

    async submitAppointment() {
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;

        if (!this.selectedDate || !this.selectedTime || !name || !email) {
            this.showError('אנא בחר תאריך ושעה ומלא את כל השדות הדרושים');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showError('אנא הכנס אימייל תקין');
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.textContent;
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'קובע תור...';

        try {
            const appointmentData = {
                date: this.selectedDate,
                time: this.selectedTime,
                name: name,
                email: email,
                phone: phone,
                timestamp: new Date().toISOString()
            };

            const response = await fetch(`${this.baseURL}/api/appointments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(appointmentData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Network error');
            }

            const result = await response.json();

            if (result.success) {
                this.showSuccess('✅ התור נקבע בהצלחה! ניצור איתך קשר בהקדם.');
                this.resetForm();
                // טען מחדש את הזמנים הפנויים
                setTimeout(() => {
                    this.loadAllAvailableSlots();
                }, 2000);
            } else {
                this.showError(result.error || 'אירעה שגיאה בקביעת התור');
            }
        } catch (error) {
            console.error('Error submitting appointment:', error);
            this.showError(error.message || 'אירעה שגיאה בקביעת התור. אנא נסה שוב.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 10000);
    }

    resetForm() {
        document.getElementById('name').value = '';
        document.getElementById('email').value = '';
        document.getElementById('phone').value = '';
        this.selectedDate = null;
        this.selectedTime = null;
        
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AppointmentBooking();
});
