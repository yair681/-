class AppointmentBooking {
    constructor() {
        this.baseURL = window.location.origin;
        this.selectedTime = null;
        this.init();
    }

    init() {
        this.setMinDate();
        this.setupEventListeners();
    }

    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('datePicker').min = today;
    }

    setupEventListeners() {
        document.getElementById('datePicker').addEventListener('change', (e) => {
            this.loadAvailableSlots(e.target.value);
        });

        document.getElementById('submitBtn').addEventListener('click', () => {
            this.submitAppointment();
        });
    }

    async loadAvailableSlots(date) {
        if (!date) return;

        const timeSlotsContainer = document.getElementById('timeSlots');
        timeSlotsContainer.innerHTML = '<div class="loading">טוען שעות פנויות...</div>';

        try {
            const response = await fetch(`${this.baseURL}/api/availability?date=${date}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();

            this.displayTimeSlots(data.availableSlots);
        } catch (error) {
            console.error('Error loading slots:', error);
            timeSlotsContainer.innerHTML = '<div class="error-message">שגיאה בטעינת השעות הפנויות</div>';
        }
    }

    displayTimeSlots(slots) {
        const timeSlotsContainer = document.getElementById('timeSlots');
        timeSlotsContainer.innerHTML = '';

        if (slots.length === 0) {
            timeSlotsContainer.innerHTML = '<div class="error-message">אין שעות פנויות בתאריך זה</div>';
            return;
        }

        slots.forEach(slot => {
            const slotElement = document.createElement('div');
            slotElement.className = 'time-slot';
            slotElement.textContent = slot;
            slotElement.addEventListener('click', () => this.selectTimeSlot(slot, slotElement));
            timeSlotsContainer.appendChild(slotElement);
        });
    }

    selectTimeSlot(selectedTime, clickedElement) {
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected');
        });

        clickedElement.classList.add('selected');
        this.selectedTime = selectedTime;
    }

    async submitAppointment() {
        const date = document.getElementById('datePicker').value;
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;

        if (!date || !this.selectedTime || !name || !email) {
            this.showError('אנא מלא את כל השדות הדרושים');
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
                date: date,
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
        const errorDiv = document.getElementById('dateError');
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
        document.getElementById('datePicker').value = '';
        document.getElementById('name').value = '';
        document.getElementById('email').value = '';
        document.getElementById('phone').value = '';
        document.getElementById('timeSlots').innerHTML = '';
        this.selectedTime = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AppointmentBooking();
});