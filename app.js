const STORAGE_KEY = "employee-attendance-tracker-state";

const DEFAULT_EMPLOYEES = [
  {
    id: "emp-001",
    name: "Aisha Khan",
    department: "Operations",
    role: "Shift Lead",
  },
  {
    id: "emp-002",
    name: "Miguel Santos",
    department: "Customer Support",
    role: "Support Specialist",
  },
  {
    id: "emp-003",
    name: "Priya Raman",
    department: "Finance",
    role: "Payroll Analyst",
  },
];

const STATUS_LABELS = {
  "not-started": "Not started",
  present: "Present",
  "checked-out": "Checked out",
  absent: "Absent",
};

const state = loadState();
let selectedDate = toDateInputValue(new Date());
let searchTerm = "";

const elements = {
  attendanceDate: document.querySelector("#attendance-date"),
  employeeForm: document.querySelector("#employee-form"),
  employeeName: document.querySelector("#employee-name"),
  employeeDepartment: document.querySelector("#employee-department"),
  employeeRole: document.querySelector("#employee-role"),
  employeeSearch: document.querySelector("#employee-search"),
  employeeList: document.querySelector("#employee-list"),
  employeeTemplate: document.querySelector("#employee-card-template"),
  attendanceLog: document.querySelector("#attendance-log"),
  exportCsv: document.querySelector("#export-csv"),
  totalEmployees: document.querySelector("#total-employees"),
  presentCount: document.querySelector("#present-count"),
  absentCount: document.querySelector("#absent-count"),
  totalHours: document.querySelector("#total-hours"),
};

elements.attendanceDate.value = selectedDate;

elements.attendanceDate.addEventListener("change", (event) => {
  selectedDate = event.target.value || toDateInputValue(new Date());
  render();
});

elements.employeeSearch.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  renderEmployees();
});

elements.employeeForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const employee = {
    id: createId(),
    name: elements.employeeName.value.trim(),
    department: elements.employeeDepartment.value.trim(),
    role: elements.employeeRole.value.trim(),
  };

  if (!employee.name || !employee.department || !employee.role) {
    return;
  }

  state.employees.push(employee);
  saveState();
  elements.employeeForm.reset();
  elements.employeeName.focus();
  render();
});

elements.exportCsv.addEventListener("click", exportAttendanceCsv);

render();
setInterval(render, 60 * 1000);

function loadState() {
  const fallbackState = {
    employees: DEFAULT_EMPLOYEES,
    attendance: {},
  };

  try {
    const storedState = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!storedState || !Array.isArray(storedState.employees)) {
      return fallbackState;
    }

    return {
      employees: storedState.employees,
      attendance: storedState.attendance || {},
    };
  } catch (error) {
    console.warn("Could not load saved attendance data.", error);
    return fallbackState;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  renderSummary();
  renderEmployees();
  renderLog();
}

function renderSummary() {
  const records = state.employees.map((employee) => getAttendance(employee.id));
  const presentCount = records.filter((record) => record.status === "present").length;
  const absentCount = records.filter((record) => record.status === "absent").length;
  const totalHours = records.reduce(
    (sum, record) => sum + getHoursWorked(record),
    0,
  );

  elements.totalEmployees.textContent = state.employees.length;
  elements.presentCount.textContent = presentCount;
  elements.absentCount.textContent = absentCount;
  elements.totalHours.textContent = formatHours(totalHours);
}

function renderEmployees() {
  elements.employeeList.replaceChildren();

  const filteredEmployees = state.employees.filter((employee) => {
    const searchableText = `${employee.name} ${employee.department} ${employee.role}`;
    return searchableText.toLowerCase().includes(searchTerm);
  });

  if (filteredEmployees.length === 0) {
    elements.employeeList.append(createEmptyState("No employees match your search."));
    return;
  }

  filteredEmployees.forEach((employee) => {
    const record = getAttendance(employee.id);
    const card = elements.employeeTemplate.content.firstElementChild.cloneNode(true);
    const statusLabel = STATUS_LABELS[record.status];
    const statusPill = card.querySelector(".status-pill");
    const clockInButton = card.querySelector(".clock-in-button");
    const clockOutButton = card.querySelector(".clock-out-button");
    const absentButton = card.querySelector(".absent-button");
    const resetButton = card.querySelector(".reset-button");

    card.querySelector("h3").textContent = employee.name;
    card.querySelector(".employee-meta").textContent =
      `${employee.role} - ${employee.department}`;
    statusPill.textContent = statusLabel;
    statusPill.className = `status-pill ${record.status}`;
    card.querySelector(".clock-in").textContent = formatTime(record.clockIn);
    card.querySelector(".clock-out").textContent = formatTime(record.clockOut);
    card.querySelector(".hours-worked").textContent = formatHours(
      getHoursWorked(record),
    );

    clockInButton.disabled = record.status === "present" || record.status === "checked-out";
    clockOutButton.disabled = !record.clockIn || record.status === "checked-out";
    absentButton.disabled = record.status === "absent";
    resetButton.disabled = record.status === "not-started";

    clockInButton.addEventListener("click", () => markClockIn(employee.id));
    clockOutButton.addEventListener("click", () => markClockOut(employee.id));
    absentButton.addEventListener("click", () => markAbsent(employee.id));
    resetButton.addEventListener("click", () => resetAttendance(employee.id));

    elements.employeeList.append(card);
  });
}

function renderLog() {
  elements.attendanceLog.replaceChildren();

  if (state.employees.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="6">No employees have been added yet.</td>';
    elements.attendanceLog.append(row);
    return;
  }

  state.employees.forEach((employee) => {
    const record = getAttendance(employee.id);
    const row = document.createElement("tr");

    row.append(
      createCell(employee.name),
      createCell(employee.department),
      createCell(STATUS_LABELS[record.status]),
      createCell(formatTime(record.clockIn)),
      createCell(formatTime(record.clockOut)),
      createCell(formatHours(getHoursWorked(record))),
    );

    elements.attendanceLog.append(row);
  });
}

function markClockIn(employeeId) {
  const records = ensureDateRecords();
  const existingRecord = getAttendance(employeeId);

  records[employeeId] = {
    status: "present",
    clockIn: existingRecord.clockIn || timestampForSelectedDate(),
    clockOut: null,
  };

  saveState();
  render();
}

function markClockOut(employeeId) {
  const records = ensureDateRecords();
  const existingRecord = getAttendance(employeeId);

  if (!existingRecord.clockIn) {
    return;
  }

  records[employeeId] = {
    ...existingRecord,
    status: "checked-out",
    clockOut: timestampForSelectedDate(),
  };

  saveState();
  render();
}

function markAbsent(employeeId) {
  ensureDateRecords()[employeeId] = {
    status: "absent",
    clockIn: null,
    clockOut: null,
  };

  saveState();
  render();
}

function resetAttendance(employeeId) {
  const records = ensureDateRecords();
  delete records[employeeId];
  saveState();
  render();
}

function ensureDateRecords() {
  if (!state.attendance[selectedDate]) {
    state.attendance[selectedDate] = {};
  }

  return state.attendance[selectedDate];
}

function getAttendance(employeeId) {
  return (
    state.attendance[selectedDate]?.[employeeId] || {
      status: "not-started",
      clockIn: null,
      clockOut: null,
    }
  );
}

function getHoursWorked(record) {
  if (!record.clockIn || record.status === "absent") {
    return 0;
  }

  const startTime = new Date(record.clockIn).getTime();
  const endTime = record.clockOut
    ? new Date(record.clockOut).getTime()
    : selectedDate === toDateInputValue(new Date())
      ? Date.now()
      : startTime;

  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime < startTime) {
    return 0;
  }

  return (endTime - startTime) / 36e5;
}

function exportAttendanceCsv() {
  const header = ["Date", "Employee", "Department", "Role", "Status", "Clock in", "Clock out", "Hours"];
  const rows = state.employees.map((employee) => {
    const record = getAttendance(employee.id);

    return [
      selectedDate,
      employee.name,
      employee.department,
      employee.role,
      STATUS_LABELS[record.status],
      formatTime(record.clockIn),
      formatTime(record.clockOut),
      formatHours(getHoursWorked(record)),
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `attendance-${selectedDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function createCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function createEmptyState(message) {
  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";
  emptyState.textContent = message;
  return emptyState;
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `emp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function timestampForSelectedDate() {
  const now = new Date();
  const [year, month, day] = selectedDate.split("-").map(Number);

  return new Date(
    year,
    month - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ).toISOString();
}

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatTime(timestamp) {
  if (!timestamp) {
    return "--";
  }

  return new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatHours(hours) {
  return hours.toFixed(1);
}

function escapeCsvValue(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
