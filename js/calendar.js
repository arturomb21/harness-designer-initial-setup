/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HARNESS DESIGNER — calendar.js                                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Calendario desplegable personalizado con navegación mensual.              
 * ║  Secciones: 40                                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 40: CALENDARIO PERSONALIZADO
 * Calendario desplegable para selección de fechas con navegación
 * mensual, resaltado de hoy y formato DD/MM/AAAA.
 * ══════════════════════════════════════════════════════════════════════════ */
let calendarCurrentDate = new Date();
let calendarSelectedDate = null;
let calendarTargetInput = null;

// Spanish month names
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function openCustomCalendar(inputElement) {
  calendarTargetInput = inputElement;
  calendarSelectedDate = inputElement.value ? new Date(inputElement.value) : new Date();
  calendarCurrentDate = new Date(calendarSelectedDate);
  renderCalendar();
  calendarModal.style.display = 'flex';
}

function renderCalendar() {
  const year = calendarCurrentDate.getFullYear();
  const month = calendarCurrentDate.getMonth();
  
  // Update month/year display
  calendarMonthYear.textContent = `${monthNames[month]} ${year}`;
  
  // Clear calendar days
  calendarDays.innerHTML = '';
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  // Add previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const dayElement = createCalendarDay(day, true, new Date(year, month - 1, day));
    calendarDays.appendChild(dayElement);
  }
  
  // Add current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayElement = createCalendarDay(day, false, date);
    calendarDays.appendChild(dayElement);
  }
  
  // Add next month days to fill the grid
  const totalDays = firstDay + daysInMonth;
  const nextMonthDays = totalDays % 7 === 0 ? 0 : 7 - (totalDays % 7);
  for (let day = 1; day <= nextMonthDays; day++) {
    const dayElement = createCalendarDay(day, true, new Date(year, month + 1, day));
    calendarDays.appendChild(dayElement);
  }
}

function createCalendarDay(day, isOtherMonth, date) {
  const dayElement = document.createElement('div');
  dayElement.className = 'calendar-day';
  dayElement.textContent = day;
  
  if (isOtherMonth) {
    dayElement.classList.add('other-month');
  }
  
  // Check if today
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    dayElement.classList.add('today');
  }
  
  // Check if selected
  if (calendarSelectedDate && date.toDateString() === calendarSelectedDate.toDateString()) {
    dayElement.classList.add('selected');
  }
  
  dayElement.addEventListener('click', () => selectDate(date));
  return dayElement;
}

function selectDate(date) {
  calendarSelectedDate = date;
  // Format date as DD/MM/YYYY for display
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;
  calendarTargetInput.value = formattedDate;
  calendarTargetInput.dataset.isoDate = date.toISOString().split('T')[0]; // Store ISO format for saving
  calendarModal.style.display = 'none';
  saveFieldValueToProjectData(calendarTargetInput);
}

function navigateMonth(direction) {
  calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + direction);
  renderCalendar();
}

function goToToday() {
  const today = new Date();
  calendarCurrentDate = new Date(today);
  calendarSelectedDate = today;
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;
  calendarTargetInput.value = formattedDate;
  calendarTargetInput.dataset.isoDate = today.toISOString().split('T')[0];
  calendarModal.style.display = 'none';
  saveFieldValueToProjectData(calendarTargetInput);
}

// Calendar event listeners
calendarPrevMonth.addEventListener('click', () => navigateMonth(-1));
calendarNextMonth.addEventListener('click', () => navigateMonth(1));
calendarCancel.addEventListener('click', () => {
  calendarModal.style.display = 'none';
});
calendarToday.addEventListener('click', goToToday);

// Close calendar on backdrop click
calendarModal.addEventListener('click', (e) => {
  if (e.target === calendarModal) {
    calendarModal.style.display = 'none';
  }
});

// Only open calendar on icon click
document.querySelector('.calendar-icon').addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  openCustomCalendar(requiredDateInput);
});


// Connection Labels Table Multi-Harness Management
