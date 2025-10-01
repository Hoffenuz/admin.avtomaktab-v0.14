// Convert ISO (yyyy-mm-dd) to dd/mm/yyyy
export function isoToDisplay(isoString) {
  if (!isoString) return '';
  const [year, month, day] = isoString.split('-');
  return `${day}/${month}/${year}`;
}

// Convert dd/mm/yyyy to ISO (yyyy-mm-dd)
export function displayToIso(displayString) {
  if (!displayString) return '';
  const [day, month, year] = displayString.split('/');
  return `${year}-${month}-${day}`;
}

// Validate dd/mm/yyyy format
export function isValidDisplayDate(str) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(str);
}

// Format for display (accepts ISO or dd/mm/yyyy)
export function formatDate(dateString) {
  if (!dateString) return '';
  if (dateString.includes('/')) return dateString;
  return isoToDisplay(dateString);
}

// Format for input (accepts ISO or dd/mm/yyyy)
export function toInputDateFormat(dateString) {
  if (!dateString) return '';
  if (dateString.includes('/')) {
    // dd/mm/yyyy -> yyyy-mm-dd
    return displayToIso(dateString);
  }
  return dateString;
}

// From input (yyyy-mm-dd) to dd/mm/yyyy
export function fromInputDateFormat(inputValue) {
  if (!inputValue) return '';
  if (inputValue.includes('-')) {
    return isoToDisplay(inputValue);
  }
  return inputValue;
}

// To'liq sana va vaqt formatini dd/mm/yyyy hh:mm ga o'zgartirish
export function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
} 