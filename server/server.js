const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// הגשה סטטית
app.use('/client', express.static(path.join(__dirname, '..', 'client')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
app.use(express.static(path.join(__dirname, '..', 'client'))); // דף ראשי

// נתונים
let appointments = [];
let availability = {};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// קבלת שעות פנויות
app.get('/api/availability', (req, res) => {
    try {
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({ error: 'תאריך חסר' });
        }

        const [year, month, day] = date.split('-');
        const availableSlots = availability?.[year]?.[month]?.[day] || [];

        // הסרת שעות שכבר נתפסו
        const bookedAppointments = appointments.filter(apt => 
            apt.date === date && apt.status !== 'cancelled'
        );

        const bookedTimes = bookedAppointments.map(apt => apt.time);
        const finalAvailableSlots = availableSlots.filter(slot => !bookedTimes.includes(slot));

        res.json({
            date,
            availableSlots: finalAvailableSlots
        });

    } catch (error) {
        console.error('Error getting availability:', error);
        res.status(500).json({ error: 'שגיאה בקבלת הנתונים' });
    }
});

// קביעת תור חדש
app.post('/api/appointments', (req, res) => {
    try {
        const { date, time, name, email, phone } = req.body;

        if (!date || !time || !name || !email) {
            return res.status(400).json({ error: 'כל השדות הדרושים חייבים להיות מלאים' });
        }

        // בדיקה אם התור כבר תפוס
        const existingAppointment = appointments.find(apt => 
            apt.date === date && apt.time === time && apt.status !== 'cancelled'
        );

        if (existingAppointment) {
            return res.status(400).json({ error: 'מצטערים, התור כבר תפוס' });
        }

        // יצירת תור חדש
        const newAppointment = {
            id: Date.now().toString(),
            date,
            time,
            name,
            email,
            phone: phone || '',
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };

        appointments.push(newAppointment);

        console.log(`📅 תור חדש: ${name} - ${date} ${time}`);

        res.status(201).json({
            success: true,
            appointment: newAppointment,
            message: 'התור נקבע בהצלחה!'
        });

    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ error: 'שגיאה בקביעת התור' });
    }
});

// קבלת כל התורים
app.get('/api/admin/appointments', (req, res) => {
    try {
        const sortedAppointments = appointments.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.json({
            appointments: sortedAppointments,
            total: sortedAppointments.length,
            confirmed: sortedAppointments.filter(apt => apt.status === 'confirmed').length,
            cancelled: sortedAppointments.filter(apt => apt.status === 'cancelled').length
        });

    } catch (error) {
        console.error('Error getting appointments:', error);
        res.status(500).json({ error: 'שגיאה בקבלת הנתונים' });
    }
});

// עדכון סטטוס תור
app.put('/api/admin/appointments/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['confirmed', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'סטטוס לא תקין' });
        }

        const appointmentIndex = appointments.findIndex(apt => apt.id === id);

        if (appointmentIndex === -1) {
            return res.status(404).json({ error: 'תור לא נמצא' });
        }

        appointments[appointmentIndex].status = status;
        appointments[appointmentIndex].updatedAt = new Date().toISOString();

        res.json({
            success: true,
            appointment: appointments[appointmentIndex]
        });

    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({ error: 'שגיאה בעדכון התור' });
    }
});

// הגדרת זמינות חדשה
app.post('/api/admin/availability', (req, res) => {
    try {
        const { year, month, day, slots } = req.body;

        if (!availability[year]) availability[year] = {};
        if (!availability[year][month]) availability[year][month] = {};
        
        availability[year][month][day] = slots;

        res.json({
            success: true,
            message: 'זמינות עודכנה בהצלחה'
        });

    } catch (error) {
        console.error('Error setting availability:', error);
        res.status(500).json({ error: 'שגיאה בעדכון הזמינות' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🏠 Home page: http://localhost:${PORT}`);
    console.log(`📊 Admin dashboard: http://localhost:${PORT}/admin`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
});