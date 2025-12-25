/* =========================================
   1. AUTH & CONFIG
   ========================================= */
const CREDENTIALS = { "Brandy Foods": "707707" };

let config = { target: 208, standardDays: 26, penaltyPerHour: 2 };
let allEmployees = []; 
let currentSelectedEmp = null; 
let barChartInstance = null;
let pieChartInstance = null;

// Dark Mode & Init
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
    
    loadConfig();
    loadArchivesList();
    if (!sessionStorage.getItem('isLoggedIn')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.getElementById('loginOverlay').style.display = 'none';
        loadData();
    }
});

const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
});

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const icon = document.querySelector('#themeToggle i');
    if(icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function loadConfig() {
    const saved = localStorage.getItem('bf_config');
    if (saved) config = JSON.parse(saved);
    updateConfigUI();
}

function updateConfigUI() {
    document.getElementById('configDisplay').innerText = `Target: ${config.target}h | Days: ${config.standardDays} | Penalty: ${config.penaltyPerHour}h`;
    document.getElementById('conf_target').value = config.target;
    document.getElementById('conf_days').value = config.standardDays;
    document.getElementById('conf_penalty').value = config.penaltyPerHour;
}

function attemptLogin() {
    const user = document.getElementById('usernameInput').value.trim();
    const pass = document.getElementById('passwordInput').value.trim();
    if (CREDENTIALS[user] && CREDENTIALS[user] === pass) {
        sessionStorage.setItem('isLoggedIn', 'true');
        const overlay = document.getElementById('loginOverlay');
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; document.body.style.overflow = 'auto'; }, 500);
        Swal.fire({ icon: 'success', title: 'Welcome Back!', timer: 1500, showConfirmButton: false });
        loadData();
    } else { Swal.fire({ icon: 'error', title: 'Access Denied', confirmButtonColor: '#d33' }); }
}
function logout() { sessionStorage.removeItem('isLoggedIn'); location.reload(); }
document.getElementById('passwordInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') attemptLogin(); });

/* =========================================
   2. SETTINGS & ARCHIVE
   ========================================= */
function openSettings() { new bootstrap.Modal(document.getElementById('settingsModal')).show(); }

function saveSettings() {
    const getVal = (id, def) => {
        const val = parseFloat(document.getElementById(id).value);
        return isNaN(val) ? def : val;
    };

    config.target = getVal('conf_target', 208);
    config.standardDays = getVal('conf_days', 26);
    config.penaltyPerHour = getVal('conf_penalty', 2);

    localStorage.setItem('bf_config', JSON.stringify(config));
    updateConfigUI();
    
    if(allEmployees.length > 0) { 
        finalizeProcessing(allEmployees); 
        Swal.fire('Saved', 'Recalculated', 'success'); 
    }
    bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
}

function loadArchivesList() {
    const archives = JSON.parse(localStorage.getItem('bf_archives') || '[]');
    const selector = document.getElementById('archiveSelector');
    const currentVal = selector.value;
    
    selector.innerHTML = '<option value="current">📂 Current</option>';
    archives.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.name; opt.text = `🗄️ ${a.name}`;
        selector.add(opt);
    });
    
    if (archives.some(a => a.name === currentVal) || currentVal === 'current') {
        selector.value = currentVal;
    }
}

function archiveCurrentMonth() {
    if(!allEmployees.length) return Swal.fire('No Data', 'Nothing to save', 'warning');
    Swal.fire({
        title: 'Archive Month',
        input: 'text',
        inputLabel: 'Name (e.g. Jan 2025)',
        showCancelButton: true,
        confirmButtonText: 'Save'
    }).then((r) => {
        if(r.isConfirmed && r.value) {
            let archives = JSON.parse(localStorage.getItem('bf_archives') || '[]');
            if(archives.some(a => a.name === r.value)) return Swal.fire('Error', 'Name exists!', 'error');
            archives.push({ name: r.value, data: allEmployees });
            localStorage.setItem('bf_archives', JSON.stringify(archives));
            loadArchivesList();
            Swal.fire('Saved', 'Archived successfully', 'success');
        }
    });
}

function deleteArchivedMonth() {
    const selector = document.getElementById('archiveSelector');
    const name = selector.value;
    if(name === 'current') return;

    Swal.fire({
        title: `Delete ${name}?`,
        text: "This cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Delete'
    }).then((result) => {
        if (result.isConfirmed) {
            let archives = JSON.parse(localStorage.getItem('bf_archives') || '[]');
            archives = archives.filter(a => a.name !== name);
            localStorage.setItem('bf_archives', JSON.stringify(archives));
            
            loadArchivesList();
            selector.value = 'current';
            loadArchive('current');
            Swal.fire('Deleted', 'Archive removed.', 'success');
        }
    });
}

function loadArchive(name) {
    const delBtn = document.getElementById('deleteArchiveBtn');
    if(name === 'current') {
        loadData();
        document.getElementById('uploadBtn').classList.remove('d-none');
        document.getElementById('clearBtn').classList.remove('d-none');
        document.getElementById('archiveBtn').classList.remove('d-none');
        delBtn.classList.add('d-none');
    } else {
        const archives = JSON.parse(localStorage.getItem('bf_archives') || '[]');
        const arch = archives.find(a => a.name === name);
        if(arch) {
            allEmployees = arch.data;
            renderDashboard(allEmployees);
            document.getElementById('uploadBtn').classList.add('d-none');
            document.getElementById('clearBtn').classList.add('d-none');
            document.getElementById('archiveBtn').classList.add('d-none');
            delBtn.classList.remove('d-none');
            Swal.fire({ icon: 'info', title: 'Archive View', text: name, timer: 1000, showConfirmButton: false });
        }
    }
}

function loadData() {
    const saved = localStorage.getItem('bf_data');
    if (saved) { 
        allEmployees = JSON.parse(saved); 
        renderDashboard(allEmployees); 
        document.getElementById('dashboardContent').classList.remove('d-none');
        document.getElementById('dropZone').style.display = 'none';
        document.getElementById('archiveBtn').classList.remove('d-none');
        document.getElementById('clearBtn').classList.remove('d-none');
    } else {
        document.getElementById('dashboardContent').classList.add('d-none');
        document.getElementById('dropZone').style.display = 'block';
    }
}

/* =========================================
   3. FILE PROCESSING
   ========================================= */
document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).Sheets[XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).SheetNames[0]], {defval:""}); 
            determineAndProcess(data);
            Swal.fire({ icon: 'success', title: 'Processed', timer: 1000, showConfirmButton: false });
        } catch(err) { Swal.fire('Error', 'File Error', 'error'); }
    };
    reader.readAsArrayBuffer(file);
});

function determineAndProcess(data) {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    if (keys.some(k => k.includes('Time long'))) processProcessedData(data);
    else if (keys.some(k => k.includes('State'))) processRawData(data);
}

function fixArabicEncoding(str) {
    if (!str) return "";
    if (!/[\u00C0-\u00FF]/.test(str)) return str;
    try {
        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
        return new TextDecoder('windows-1256').decode(bytes);
    } catch (e) { return str; }
}
function timeStringToDecimal(s) { if(!s)return 0; if(typeof s==='number')return s*24; const p=String(s).split(':'); return parseInt(p[0])+(parseInt(p[1])/60); }
function decimalToTimeString(d) { const h=Math.floor(Math.abs(d)); const m=Math.round((Math.abs(d)-h)*60); return `${h}:${m.toString().padStart(2,'0')}`; }
function parseCustomDate(d){ try{const[x,t,m]=d.split(' ');const[D,M,Y]=x.split('/').map(Number);let[h,n]=t.split(':').map(Number);if(m=='PM'&&h<12)h+=12;if(m=='AM'&&h==12)h=0;return new Date(Y,M-1,D,h,n);}catch(e){return null;}}

function processProcessedData(data) {
    const map = {};
    data.forEach(row => {
        const id = row['AC-No.'] || row['AC-No'] || row['No'];
        if (id && row['Time long']) {
            if (!map[id]) map[id] = { id: id, name: fixArabicEncoding(row['Name']), totalHours: 0, dates: new Set(), logs: [] };
            const hours = timeStringToDecimal(row['Time long']);
            map[id].totalHours += hours;
            map[id].dates.add(row['Date']);
            map[id].logs.push({ date: row['Date'], hours: hours });
        }
    });
    finalizeProcessing(Object.values(map).map(e => ({...e, datesCount: e.dates.size})));
}

function processRawData(data) {
    const map = {}; const group = {};
    data.forEach(row => {
        const id = row['AC-No.'] || row['AC-No'] || row['No'];
        if (id && row['Time'] && row['State']) {
            if (!group[id]) group[id] = { name: fixArabicEncoding(row['Name']), events: [] };
            const date = parseCustomDate(String(row['Time']).replace(/Õ/g,'AM').replace(/ã/g,'PM').replace(/ص/g,'AM').replace(/م/g,'PM').trim());
            if (date) group[id].events.push({ time: date, state: row['State'] });
        }
    });
    Object.keys(group).forEach(id => {
        const emp = group[id];
        emp.events.sort((a, b) => a.time - b.time);
        let total = 0, dates = new Set(), logs = [];
        for (let i = 0; i < emp.events.length; i++) {
            if (emp.events[i].state === 'C/In') {
                for (let j = i+1; j < emp.events.length; j++) {
                    if (emp.events[j].state === 'C/Out') {
                        const diff = (emp.events[j].time - emp.events[i].time) / 36e5;
                        if (diff > 0 && diff < 24) { 
                            total += diff; 
                            const dateStr = emp.events[i].time.toLocaleDateString('en-GB');
                            dates.add(dateStr); 
                            logs.push({ date: dateStr, hours: diff });
                            i = j; 
                        }
                        break;
                    }
                }
            }
        }
        if (total > 0 || dates.size > 0) map[id] = { id: id, name: emp.name, totalHours: total, datesCount: dates.size, logs: logs };
    });
    finalizeProcessing(Object.values(map));
}

function finalizeProcessing(arr) {
    const FORGIVENESS = 8 - config.penaltyPerHour; 
    arr.sort((a, b) => a.id - b.id);
    allEmployees = arr.map(e => {
        const days = e.datesCount || 0;
        const absent = Math.max(0, config.standardDays - days);
        const balance = (e.totalHours + (absent * FORGIVENESS)) - config.target;
        return {
            ...e, daysWorked: days, daysAbsent: absent, balance: balance,
            netAmount: Math.abs(balance),
            status: balance > 0.01 ? 'overtime' : (balance < -0.01 ? 'deficit' : 'balanced'),
            logs: e.logs || []
        };
    });
    localStorage.setItem('bf_data', JSON.stringify(allEmployees));
    renderDashboard(allEmployees);
}

/* =========================================
   4. RENDER & BADGES
   ========================================= */
function renderDashboard(data) {
    document.getElementById('dashboardContent').classList.remove('d-none');
    document.getElementById('dropZone').style.display = 'none';
    document.getElementById('clearBtn').classList.remove('d-none');
    document.getElementById('archiveBtn').classList.remove('d-none');
    
    let ot = 0, def = 0;
    data.forEach(e => { if(e.status=='overtime') ot+=e.netAmount; if(e.status=='deficit') def+=e.netAmount; });
    document.getElementById('totalEmployees').innerText = data.length;
    document.getElementById('totalOvertimeDisplay').innerText = decimalToTimeString(ot);
    document.getElementById('totalDeficitDisplay').innerText = decimalToTimeString(def);

    const maxOt = Math.max(...data.filter(e => e.status === 'overtime').map(e => e.netAmount), 0);

    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    data.forEach(emp => {
        let statusBadge = emp.status === 'overtime' ? '<span class="badge-custom badge-ot">Overtime</span>' : 
                          (emp.status === 'deficit' ? '<span class="badge-custom badge-deficit">Deficit</span>' : '<span class="badge-custom badge-neutral">Balanced</span>');
        let colorClass = emp.status === 'overtime' ? 'text-success' : (emp.status === 'deficit' ? 'text-danger' : '');
        let sign = emp.status === 'deficit' ? '-' : '+';

        let badgesHtml = '';
        if (emp.status === 'overtime' && emp.netAmount === maxOt && maxOt > 0) badgesHtml += ' <span class="emp-badge" title="Top Performer">🚀</span>';
        if (emp.daysWorked >= config.standardDays) badgesHtml += ' <span class="emp-badge" title="Full Attendance">⭐</span>';
        if (emp.daysAbsent > 5) badgesHtml += ' <span class="emp-badge" title="High Absence">⚠️</span>';

        const row = `
            <tr onclick="openSidebar('${emp.id}')" style="cursor: pointer;">
                <td class="fw-bold text-primary">#${emp.id}</td>
                <td class="fw-medium">${emp.name || 'Unknown'}${badgesHtml}</td>
                <td>${emp.daysWorked}</td>
                <td class="fw-bold">${decimalToTimeString(emp.totalHours)}</td>
                <td class="fw-bold ${colorClass}">${sign}${decimalToTimeString(emp.netAmount)}</td>
                <td>${statusBadge}</td>
                <td><button class="btn btn-sm btn-light border"><i class="fas fa-chevron-right"></i></button></td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
    updateCharts(data);
}

// --- MASTER SHEET PRINT ---
function printMasterSheet() {
    if(!allEmployees.length) return Swal.fire('No Data', 'Upload data first', 'warning');
    
    const date = new Date().toLocaleDateString('en-GB');
    let rows = '';
    
    allEmployees.forEach(emp => {
        let balSign = emp.status === 'deficit' ? '-' : '+';
        let balColor = emp.status === 'deficit' ? 'red' : 'green';
        rows += `
            <tr>
                <td>#${emp.id}</td>
                <td style="text-align:left">${emp.name}</td>
                <td>${emp.daysWorked} / ${config.standardDays}</td>
                <td>${emp.daysAbsent}</td>
                <td>${decimalToTimeString(emp.totalHours)}</td>
                <td style="color:${balColor}; font-weight:bold">${balSign}${decimalToTimeString(emp.netAmount)}</td>
                <td></td> 
                <td></td>
            </tr>
        `;
    });

    // FIXED: Logo Path Updated
    const html = `
        <div class="landscape-sheet">
            <div class="text-center mb-4 pb-2 border-bottom border-dark">
                <img src="logo/logo-white-sq.png" alt="Logo" style="height:60px; margin-bottom:10px;" class="bg-black p-2 rounded">
                <h2 class="m-0 fw-bold text-uppercase">BRANDY FOODS - PAYROLL MASTER SHEET</h2>
                <p class="mb-0 text-muted">Generated on: ${date} | Target: ${config.target}h | Penalty: ${config.penaltyPerHour}h</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width:5%">ID</th>
                        <th style="width:20%">Name</th>
                        <th style="width:10%">Attendance</th>
                        <th style="width:8%">Absent</th>
                        <th style="width:10%">Total Hrs</th>
                        <th style="width:10%">Balance (Hrs)</th>
                        <th style="width:15%">Basic Salary (EGP)</th>
                        <th style="width:15%">Net Salary (EGP)</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="d-flex justify-content-between mt-5 pt-5">
                <div class="text-center" style="width:30%; border-top:1px solid #000"><strong>HR Manager</strong></div>
                <div class="text-center" style="width:30%; border-top:1px solid #000"><strong>Accountant</strong></div>
                <div class="text-center" style="width:30%; border-top:1px solid #000"><strong>CEO Approval</strong></div>
            </div>
        </div>
    `;
    
    const style = document.createElement('style');
    style.innerHTML = `@page { size: landscape; }`;
    document.head.appendChild(style);
    
    document.getElementById('reportContent').innerHTML = html;
    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
    
    document.getElementById('reportModal').addEventListener('hidden.bs.modal', () => {
        style.remove();
    });
    
    modal.show();
}

function openSidebar(empId) {
    const emp = allEmployees.find(e => e.id == empId);
    if (!emp) return;
    currentSelectedEmp = emp;
    
    const maxOt = Math.max(...allEmployees.filter(e => e.status === 'overtime').map(e => e.netAmount), 0);
    let b = '';
    if (emp.status === 'overtime' && emp.netAmount === maxOt && maxOt > 0) b += '🚀 Top Performer ';
    if (emp.daysWorked >= config.standardDays) b += '⭐ Perfect Attendance ';
    if (emp.daysAbsent > 5) b += '⚠️ High Absence';
    document.getElementById('sb_badges').innerHTML = b ? `<small class="text-warning">${b}</small>` : '';

    document.getElementById('sb_avatar').innerText = (emp.name || 'U').charAt(0).toUpperCase();
    document.getElementById('sb_name').innerText = emp.name || 'Unknown';
    document.getElementById('sb_id').innerText = '#' + emp.id;
    document.getElementById('sb_days').innerText = emp.daysWorked;
    document.getElementById('sb_absent').innerText = emp.daysAbsent;
    document.getElementById('sb_hours').innerText = decimalToTimeString(emp.totalHours);
    const balEl = document.getElementById('sb_balance');
    balEl.innerText = (emp.status === 'deficit' ? '-' : '+') + decimalToTimeString(emp.netAmount);
    balEl.className = emp.status === 'deficit' ? 'text-danger fw-bold' : 'text-success fw-bold';
    
    // --- Log Render (FIXED COLORS) ---
    const logBody = document.getElementById('sb_log_body');
    logBody.innerHTML = '';
    const sortedLogs = (emp.logs || []).sort((x, y) => new Date(x.date) - new Date(y.date)); 

    if (sortedLogs.length > 0) {
        sortedLogs.forEach(log => {
            const h = decimalToTimeString(log.hours);
            const color = log.hours < 8 ? '#ef4444' : (log.hours > 8 ? '#10b981' : '#fff');
            
            // Fixed: Changed text-white-50 to text-white for visibility
            const row = `<tr><td class="ps-3 text-white">${log.date}</td><td class="text-end pe-3 fw-bold" style="color: ${color}">${h}</td></tr>`;
            logBody.innerHTML += row;
        });
    } else {
        logBody.innerHTML = '<tr><td colspan="2" class="text-center text-muted p-3">No logs available</td></tr>';
    }

    document.getElementById('sb_basic_salary').value = '';
    document.getElementById('sb_rate').innerText = '0.00';
    document.getElementById('sb_variable').innerText = '0.00';
    document.getElementById('sb_net').innerText = '0.00';
    document.getElementById('salarySidebar').classList.add('active');
    document.body.classList.add('sidebar-open');
}

function closeSidebar() { document.getElementById('salarySidebar').classList.remove('active'); document.body.classList.remove('sidebar-open'); }

function calculateSidebar() {
    if (!currentSelectedEmp) return;
    const basic = parseFloat(document.getElementById('sb_basic_salary').value) || 0;
    const rate = basic / config.target; 
    const variablePay = currentSelectedEmp.balance * rate;
    const net = basic + variablePay;
    document.getElementById('sb_rate').innerText = rate.toFixed(2);
    const varEl = document.getElementById('sb_variable');
    varEl.innerText = (variablePay > 0 ? '+' : '') + variablePay.toFixed(2);
    varEl.className = variablePay < 0 ? 'fw-bold text-danger' : 'fw-bold text-success';
    document.getElementById('sb_net').innerText = net.toFixed(2);
}

function printSidebarReport() {
    if (!currentSelectedEmp) return;
    const basic = parseFloat(document.getElementById('sb_basic_salary').value) || 0;
    if(basic <= 0) return Swal.fire({ icon: 'warning', title: 'Salary Required', confirmButtonColor: '#4f46e5' });

    const emp = currentSelectedEmp;
    const rate = basic / config.target;
    const variable = emp.balance * rate;
    const net = basic + variable;
    const date = new Date().toLocaleDateString('en-GB');
    let statusColor = emp.status === 'overtime' ? 'green' : (emp.status === 'deficit' ? 'red' : 'black');

    // FIXED: Logo Path Updated
    const html = `
        <div class="payslip-container a4-format">
            <div class="payslip-header d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-2 border-dark">
                <div class="company-info text-start">
                    <img src="logo/logo-white-sq.png" alt="Logo" class="report-logo-img mb-2 bg-black p-2 rounded">
                    <h2 class="payslip-company fw-bold m-0">BRANDY FOODS</h2>
                </div>
                <div class="report-title text-end"><h4 class="text-uppercase m-0">Official Payroll Slip</h4><small class="text-muted">Date: ${date}</small></div>
            </div>
            <div class="row g-3 mb-4">
                <div class="col-6"><div class="report-box p-3 border rounded"><label class="d-block text-muted fw-bold small text-uppercase">Employee Name</label><span class="fs-5 fw-bold">${emp.name}</span></div></div>
                <div class="col-6"><div class="report-box p-3 border rounded"><label class="d-block text-muted fw-bold small text-uppercase">ID</label><span class="fs-5 fw-bold">#${emp.id}</span></div></div>
                <div class="col-6"><div class="report-box p-3 border rounded"><label class="d-block text-muted fw-bold small text-uppercase">Attendance</label><span class="fs-5 fw-bold">${emp.daysWorked} Days / ${emp.daysAbsent} Absent</span></div></div>
                <div class="col-6"><div class="report-box p-3 border rounded"><label class="d-block text-muted fw-bold small text-uppercase">Status</label><span class="fs-5 fw-bold text-capitalize" style="color: ${statusColor}">${emp.status}</span></div></div>
            </div>
            <div class="report-summary bg-light p-4 border rounded mb-4">
                <h5 class="mb-3 text-decoration-underline fw-bold">Payroll Calculation</h5>
                <div class="d-flex justify-content-between mb-2"><span>Total Hours:</span><strong>${decimalToTimeString(emp.totalHours)} hrs</strong></div>
                <div class="d-flex justify-content-between mb-3 pb-3 border-bottom"><span>Balance (vs ${config.target}h):</span><strong style="color: ${statusColor}">${(emp.balance > 0 ? '+' : '') + (emp.balance).toFixed(2)} hrs</strong></div>
                <div class="d-flex justify-content-between mb-2"><span>Basic Salary:</span><strong>${basic.toLocaleString()} EGP</strong></div>
                <div class="d-flex justify-content-between mb-2 text-muted small"><span>Rate (Basic ÷ ${config.target}):</span><strong>${rate.toFixed(2)} EGP</strong></div>
                <div class="d-flex justify-content-between mb-3 pb-3 border-bottom"><span>Variable Pay:</span><strong style="color: ${statusColor}">${variable > 0 ? '+' : ''}${variable.toFixed(2)} EGP</strong></div>
                <div class="d-flex justify-content-between pt-2" style="font-size: 1.4rem;"><span>Net Salary:</span><strong class="text-dark">${net.toFixed(2)} EGP</strong></div>
            </div>
            <div class="signatures d-flex justify-content-between mt-5 pt-4">
                <div class="sig-box text-center" style="width: 40%; border-top: 2px solid #000; padding-top: 10px;"><strong>HR Manager</strong></div>
                <div class="sig-box text-center" style="width: 40%; border-top: 2px solid #000; padding-top: 10px;"><strong>Employee</strong></div>
            </div>
        </div>
    `;
    document.getElementById('reportContent').innerHTML = html;
    new bootstrap.Modal(document.getElementById('reportModal')).show();
}

/* =========================================
   5. BACKUP & RESTORE SYSTEM
   ========================================= */
function exportBackup() {
    const backup = {
        config: localStorage.getItem('bf_config'),
        data: localStorage.getItem('bf_data'),
        archives: localStorage.getItem('bf_archives'),
        theme: localStorage.getItem('theme'),
        date: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "Workpulse_Backup_" + new Date().toISOString().slice(0,10) + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    Swal.fire({ icon: 'success', title: 'Backup Downloaded', text: 'Keep this file safe!', timer: 2000, showConfirmButton: false });
}

function importBackup(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            if (!backup.date) throw new Error("Invalid Backup File");

            if(backup.config) localStorage.setItem('bf_config', backup.config);
            if(backup.data) localStorage.setItem('bf_data', backup.data);
            if(backup.archives) localStorage.setItem('bf_archives', backup.archives);
            if(backup.theme) localStorage.setItem('theme', backup.theme);

            Swal.fire({
                title: 'Restore Successful!',
                text: 'System will reload to apply changes.',
                icon: 'success',
                confirmButtonText: 'Reload Now'
            }).then(() => {
                location.reload();
            });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Corrupt File', text: 'Cannot restore from this file.' });
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function clearData() { 
    Swal.fire({ title: 'Clear data?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Yes' }).then((r) => { if (r.isConfirmed) { localStorage.removeItem('bf_data'); location.reload(); } }); 
}

function updateCharts(data) {
    const ctxBarEl = document.getElementById('barChart'); const ctxPieEl = document.getElementById('pieChart'); if (!ctxBarEl || !ctxPieEl) return; 
    if(barChartInstance) barChartInstance.destroy(); if(pieChartInstance) pieChartInstance.destroy();
    const otCount = data.filter(e => e.status === 'overtime').length; const defCount = data.filter(e => e.status === 'deficit').length; const balCount = data.length - otCount - defCount;
    pieChartInstance = new Chart(ctxPieEl.getContext('2d'), { type: 'doughnut', data: { labels: ['Overtime', 'Deficit', 'Balanced'], datasets: [{ data: [otCount, defCount, balCount], backgroundColor: ['#10b981', '#ef4444', '#6b7280'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false } });
    const topOvertime = [...data].filter(e => e.status === 'overtime').sort((a,b) => b.netAmount - a.netAmount).slice(0, 5);
    barChartInstance = new Chart(ctxBarEl.getContext('2d'), { type: 'bar', data: { labels: topOvertime.map(e => e.name), datasets: [{ label: 'Overtime Hours', data: topOvertime.map(e => e.netAmount), backgroundColor: '#4f46e5', borderRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } } });
}
function filterData(type, btn) { document.querySelectorAll('.table-controls button').forEach(b => b.classList.remove('active-filter')); btn.classList.add('active-filter'); renderDashboard(type === 'all' ? allEmployees : allEmployees.filter(e => e.status === type)); }
function searchTable() { const term = document.getElementById('searchInput').value.toLowerCase(); renderDashboard(allEmployees.filter(e => (e.name && e.name.toLowerCase().includes(term)) || String(e.id).includes(term))); }
function exportTableToExcel(id){ var wb = XLSX.utils.table_to_book(document.getElementById(id)); XLSX.writeFile(wb, 'Workpulse_Report.xlsx'); }