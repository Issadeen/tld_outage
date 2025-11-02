/* Offline-ready maintenance request console */
const $ = (id) => document.getElementById(id);

const state = {
  entries: [],
  deferredPrompt: null,
};

function loadEntries(){
  try{ state.entries = JSON.parse(localStorage.getItem('entries')||'[]'); }catch{ state.entries=[] }
  renderEntries();
}
function saveEntries(){ localStorage.setItem('entries', JSON.stringify(state.entries)); }

function sanitizeEmailList(s){
  if(!s) return '';
  return s.split(/[;,\s]+/).map(x=>x.trim()).filter(Boolean).join(', ');
}
function parsePhone(s){
  if(!s) return '';
  const d = s.replace(/[^+\d]/g,'');
  if(d.startsWith('07')) return '+254'+d.slice(1);
  if(d.startsWith('01')) return '+254'+d.slice(1);
  if(d.startsWith('254')) return '+'+d;
  return d;
}
function parseInput(raw){
  const lines = (raw||'').replace(/\t/g,' ').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const result = { reg:'', name:'', phone:'', company:'', email:'', notes:'', entry_no:'', duration:24, team:'Eldoret' };
  if(lines.length){
    result.reg = lines[0];
  }
  // Try to detect email line
  const emailLine = lines.find(l=>/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/.test(l));
  if(emailLine) result.email = sanitizeEmailList(emailLine.replace(/,$/,''));
  // Try phone
  const phoneLine = lines.find(l=>/[+]?\d[\d\s-]{7,}/.test(l));
  if(phoneLine) result.phone = parsePhone(phoneLine);
  // Name likely second line if not phone/email
  if(lines[1] && lines[1]!==result.phone && !lines[1].includes('@')) result.name = lines[1];
  // Company likely 3rd or 4th line
  const companyCand = lines.find(l=>l && l!==result.reg && l!==result.name && l!==result.phone && !l.includes('@') && !l.includes(':'));
  if(companyCand) result.company = companyCand;
  
  // Parse optional fields: entry:, hours:, team:
  lines.forEach(line => {
    const kvMatch = line.match(/^([a-zA-Z]+):\s*(.+)$/);
    if(kvMatch){
      const [, key, value] = kvMatch;
      if(/^entry$/i.test(key)) result.entry_no = value;
      else if(/^hours$/i.test(key)){
        const h = parseInt(value, 10);
        if(!isNaN(h) && [24,48].includes(h)) result.duration = h;
      }
      else if(/^team$/i.test(key)) result.team = value || 'Eldoret';
    }
  });
  
  return result;
}

function renderEntries(){
  const tbody = document.querySelector('#entries-table tbody');
  tbody.innerHTML = '';
  state.entries.slice().reverse().forEach((e, idx)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${new Date(e.ts).toLocaleString()}</td>
      <td>${e.reg||''}</td>
      <td>${e.name||''}</td>
      <td>${e.phone||''}</td>
      <td>${e.company||''}</td>
      <td>${e.email||''}</td>
      <td>
        <button data-act="pdf" data-id="${e.id}">PDF</button>
        <button data-act="del" data-id="${e.id}" class="danger">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function addEntry(entry){
  const id = crypto.randomUUID();
  const rec = { id, ts: Date.now(), ...entry };
  state.entries.push(rec);
  saveEntries();
  renderEntries();
  return rec;
}

function buildQrPayload(entry){
  return JSON.stringify({
    id: entry.id,
    timestamp: entry.ts,
    reg: entry.reg,
    to: entry.email,
    phone: entry.phone
  });
}

async function generatePdf(entry){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const title = 'Maintenance Request';
  doc.setFont('helvetica','bold');
  doc.setFontSize(18);
  doc.text(title, 14, 18);
  doc.setDrawColor(11,92,255);
  doc.line(14, 21, 196, 21);

  doc.setFont('helvetica','normal');
  doc.setFontSize(12);
  const y0 = 32;
  const lines = [
    ['Registration(s)', entry.reg],
    ['Driver Name', entry.name],
    ['Phone', entry.phone],
    ['Location/Company', entry.company],
    ['Email(s)', entry.email],
    ['Entry Number', entry.entry_no || 'N/A'],
    ['Duration (hours)', entry.duration || 24],
    ['Team', entry.team || 'Eldoret'],
    ['Notes', entry.notes || ''],
    ['Created At', new Date(entry.ts).toLocaleString()]
  ];
  let y = y0;
  lines.forEach(([k,v])=>{
    doc.text(`${k}:`, 14, y);
    doc.text(String(v||''), 64, y);
    y += 8;
  });

  // QR code
  const qrPayload = buildQrPayload(entry);
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, qrPayload, { width: 120, margin: 1 });
  const imgData = qrCanvas.toDataURL('image/png');
  doc.addImage(imgData, 'PNG', 150, y0 - 4, 40, 40);

  doc.save(`${(entry.reg||'request').replace(/[^A-Za-z0-9_-]+/g,'_')}.pdf`);
}

// Build PDF and return base64 (no download)
async function buildPdfBase64(entry){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const title = 'Maintenance Request';
  doc.setFont('helvetica','bold');
  doc.setFontSize(18);
  doc.text(title, 14, 18);
  doc.setDrawColor(11,92,255);
  doc.line(14, 21, 196, 21);

  doc.setFont('helvetica','normal');
  doc.setFontSize(12);
  const y0 = 32;
  const lines = [
    ['Registration(s)', entry.reg],
    ['Driver Name', entry.name],
    ['Phone', entry.phone],
    ['Location/Company', entry.company],
    ['Email(s)', entry.email],
    ['Entry Number', entry.entry_no || 'N/A'],
    ['Duration (hours)', entry.duration || 24],
    ['Team', entry.team || 'Eldoret'],
    ['Notes', entry.notes || ''],
    ['Created At', new Date(entry.ts).toLocaleString()]
  ];
  let y = y0;
  lines.forEach(([k,v])=>{
    doc.text(`${k}:`, 14, y);
    doc.text(String(v||''), 64, y);
    y += 8;
  });

  // QR code
  const qrPayload = buildQrPayload(entry);
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, qrPayload, { width: 120, margin: 1 });
  const imgData = qrCanvas.toDataURL('image/png');
  doc.addImage(imgData, 'PNG', 150, y0 - 4, 40, 40);

  // Return base64 string only (strip prefix)
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.split(',')[1] || '';
  return base64;
}

function buildEmailBody(entry){
  const dateStr = new Date(entry.ts).toLocaleDateString('en-GB', { timeZone: 'Africa/Nairobi' });
  const entryInfo = entry.entry_no ? `\n• Entry Number: ${entry.entry_no}` : '';
  const team = entry.team || 'Eldoret';
  const duration = entry.duration || 24;
  
  return `Date: ${dateStr}

Dear RRU Team ${team},

TRUCK MAINTENANCE NOTIFICATION - ${entry.reg}

The truck below has developed a mechanical problem and will be undergoing repairs.

Vehicle & Driver Details:
----------------------
• Registration Number: ${entry.reg}${entryInfo}
• Driver's Name: ${entry.name}
• Mobile Number: ${entry.phone}

Maintenance Information:
---------------------
• Location: ${entry.company}
• Site Details: Along Uganda Road
• Cargo Type: WET CARGO
• Expected Duration: ${duration} hours

Thank you for your attention to this matter.`;
}

async function sendEmailWithPdf(entry){
  try{
    let apiUrl = localStorage.getItem('EMAIL_API_URL') || '';
    if(!apiUrl){
      apiUrl = prompt('Enter Email API URL (e.g., https://your-email-endpoint.example.com/api/send-email):') || '';
      if(apiUrl) localStorage.setItem('EMAIL_API_URL', apiUrl);
    }
    if(!apiUrl) throw new Error('Email API URL not configured');

    const to = sanitizeEmailList($('email').value.trim());
    if(!to) throw new Error('Please enter recipient email(s) in the Email(s) field');

    const entryForPdf = {
      id: entry.id || crypto.randomUUID(),
      ts: entry.ts || Date.now(),
      reg: entry.reg, name: entry.name, phone: entry.phone,
      company: entry.company, email: to, notes: entry.notes,
      entry_no: entry.entry_no, duration: entry.duration, team: entry.team
    };

    const filename = `${(entryForPdf.reg||'request').replace(/[^A-Za-z0-9_-]+/g,'_')}.pdf`;
    const pdfBase64 = await buildPdfBase64(entryForPdf);
    const subject = `Repair Report - ${entryForPdf.reg || 'Truck'}`;
    const text = buildEmailBody(entryForPdf);

    const apiKey = localStorage.getItem('EMAIL_API_KEY') || '';
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['X-Email-Api-Key'] = apiKey;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to, subject, text, filename, pdfBase64 })
    });
    if(!res.ok){
      const t = await res.text();
      throw new Error(`API error: ${res.status} ${t}`);
    }
    alert('Email sent successfully');
  } catch(err){
    console.error(err);
    // Fallback: open mail client with prefilled subject/body and download PDF locally
    try {
      const to = sanitizeEmailList($('email').value.trim());
      const entryForPdf = {
        id: entry.id || crypto.randomUUID(),
        ts: entry.ts || Date.now(),
        reg: entry.reg, name: entry.name, phone: entry.phone,
        company: entry.company, email: to, notes: entry.notes
      };
      const subject = `Repair Report - ${entryForPdf.reg || 'Truck'}`;
      const text = buildEmailBody(entryForPdf);
      // Trigger PDF download so user can attach manually
      generatePdf(entryForPdf);
      const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      window.location.href = mailto;
      alert('Email API not configured/failed. Opened your mail client and downloaded the PDF for manual sending.');
    } catch (e) {
      alert('Email send failed: ' + err.message);
    }
  }
}

function toCSV(rows){
  const headers = ['id','timestamp','reg','name','phone','company','email','notes'];
  const esc = (s)=>`"${String(s||'').replace(/"/g,'""')}"`;
  const body = rows.map(r=>[r.id,r.ts,r.reg,r.name,r.phone,r.company,r.email,r.notes].map(esc).join(','));
  return [headers.join(','), ...body].join('\n');
}

function download(filename, content, type='text/plain'){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], {type}));
  a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

// UI events
window.addEventListener('DOMContentLoaded', ()=>{
  // online/offline indicator
  function updateOnline(){
    const el = $('online-status');
    if(navigator.onLine){ el.textContent='Online'; el.className='badge online'; }
    else { el.textContent='Offline'; el.className='badge offline'; }
  }
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
  updateOnline();

  // PWA install prompt
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    state.deferredPrompt = e;
    const btn = $('install-btn');
    btn.hidden = false;
    btn.onclick = async ()=>{
      btn.hidden = true;
      state.deferredPrompt?.prompt();
      const res = await state.deferredPrompt?.userChoice;
      state.deferredPrompt = null;
    };
  });

  $('parse-btn').onclick = () => {
    const raw = $('raw-input').value;
    const parsed = parseInput(raw);
    $('reg').value = parsed.reg || '';
    $('name').value = parsed.name || '';
    $('phone').value = parsed.phone || '';
    $('company').value = parsed.company || '';
    $('email').value = parsed.email || '';
    $('entry_no').value = parsed.entry_no || '';
    $('duration').value = parsed.duration || 24;
    $('team').value = parsed.team || 'Eldoret';
    $('notes').value = parsed.notes || '';
  };

  $('clear-btn').onclick = ()=>{ $('raw-input').value=''; };

  $('save-btn').onclick = ()=>{
    const entry = {
      reg: $('reg').value.trim(),
      name: $('name').value.trim(),
      phone: $('phone').value.trim(),
      company: $('company').value.trim(),
      email: sanitizeEmailList($('email').value.trim()),
      entry_no: $('entry_no').value.trim(),
      duration: parseInt($('duration').value, 10) || 24,
      team: $('team').value.trim() || 'Eldoret',
      notes: $('notes').value.trim(),
    };
    const rec = addEntry(entry);
    generatePdf(rec); // also generate immediately for convenience
  };

  $('pdf-btn').onclick = ()=>{
    const entry = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      reg: $('reg').value.trim(),
      name: $('name').value.trim(),
      phone: $('phone').value.trim(),
      company: $('company').value.trim(),
      email: sanitizeEmailList($('email').value.trim()),
      entry_no: $('entry_no').value.trim(),
      duration: parseInt($('duration').value, 10) || 24,
      team: $('team').value.trim() || 'Eldoret',
      notes: $('notes').value.trim(),
    };
    generatePdf(entry);
  };

  $('email-btn').onclick = ()=>{
    const entry = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      reg: $('reg').value.trim(),
      name: $('name').value.trim(),
      phone: $('phone').value.trim(),
      company: $('company').value.trim(),
      email: sanitizeEmailList($('email').value.trim()),
      entry_no: $('entry_no').value.trim(),
      duration: parseInt($('duration').value, 10) || 24,
      team: $('team').value.trim() || 'Eldoret',
      notes: $('notes').value.trim(),
    };
    sendEmailWithPdf(entry);
  };

  document.querySelector('#entries-table tbody').addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const id = btn.dataset.id; const act = btn.dataset.act;
    const rec = state.entries.find(x=>x.id===id); if(!rec) return;
    if(act==='del'){
      state.entries = state.entries.filter(x=>x.id!==id); saveEntries(); renderEntries();
    } else if(act==='pdf'){
      generatePdf(rec);
    }
  });

  $('export-json').onclick = ()=>{
    download('entries.json', JSON.stringify(state.entries, null, 2), 'application/json');
  };
  $('export-csv').onclick = ()=>{
    download('entries.csv', toCSV(state.entries), 'text/csv');
  };
  $('clear-entries').onclick = ()=>{
    if(confirm('Clear all saved entries?')){ state.entries=[]; saveEntries(); renderEntries(); }
  };

  loadEntries();
});
