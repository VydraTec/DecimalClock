// Полный JS код - идентичный вашему, но в отдельном файле
const canvas = document.getElementById('clock');
const ctx = canvas.getContext('2d');
const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const radius = 220;

const timeSystems = [
    { name: "Decimal (10/100/100)", hours: 10, hourDiv: 100, minDiv: 100, color: '#FF6B6B' }
];

let currentSystem = 0;
let isPinned = true;
let lastHour = -1;
let selectedZone = '0';

// === ИНИЦИАЛИЗАЦИЯ СЛАЙДЕРА ===
function initSlider() {
    const slider = document.getElementById('utcSlider');
    const tzLabel = document.getElementById('tzLabel');
    const select = document.getElementById('timezoneSelect');
    
    // Заполняем скрытый select (для обратной совместимости)
    if (select) {
        select.innerHTML = '';
        for (let h = -12; h <= 14; h++) {
            const o = document.createElement('option');
            o.value = h.toString();
            o.textContent = `UTC${h >= 0 ? '+' : ''}${h}`;
            select.appendChild(o);
        }
    }
    
    // Определяем смещение пользователя
    const detectedOffset = -new Date().getTimezoneOffset() / 60;
    const defaultVal = (detectedOffset >= -12 && detectedOffset <= 14) ? detectedOffset : 0;
    slider.value = defaultVal;
    selectedZone = defaultVal.toString();
    updateTzLabel(defaultVal);
    
    // Обработчик изменения слайдера
    slider.addEventListener('input', function() {
        selectedZone = this.value;
        updateTzLabel(selectedZone);
        if (select) select.value = selectedZone;
    });
    
    // Клик по label для ручного ввода
    tzLabel.addEventListener('click', function() {
        const newValue = prompt('Введите смещение UTC (-12 до +14):', selectedZone);
        const numValue = parseInt(newValue);
        if (!isNaN(numValue) && numValue >= -12 && numValue <= 14) {
            slider.value = numValue;
            selectedZone = numValue.toString();
            updateTzLabel(numValue);
            if (select) select.value = numValue.toString();
        } else if (newValue !== null) {
            alert('Введите число от -12 до +14');
        }
    });
    
    // Сохраняем выбор пользователя
    const saved = localStorage.getItem('decimalClockTimezone');
    if (saved !== null) {
        const savedNum = parseInt(saved);
        if (!isNaN(savedNum) && savedNum >= -12 && savedNum <= 14) {
            slider.value = savedNum;
            selectedZone = savedNum.toString();
            updateTzLabel(savedNum);
        }
    }
}

function updateTzLabel(value) {
    const num = parseInt(value);
    const sign = num >= 0 ? '+' : '';
    const tzText = `UTC${sign}${num}`;
    
    // Обновляем два места:
    document.querySelector('.time-label').textContent = tzText;
    document.querySelector('.current-tz').textContent = tzText;
    
    localStorage.setItem('decimalClockTimezone', num.toString());
}

// Получить локальные часы/мин/сек в указанной UTC зоне
function getZoneLocalParts(timeZone, now = new Date()) {
    const offset = parseInt(timeZone, 10);
    const utcMs = now.getTime();
    const targetMs = utcMs + offset * 3600000;
    const d = new Date(targetMs);
    return { 
        hour: d.getUTCHours(), 
        minute: d.getUTCMinutes(), 
        second: d.getUTCSeconds(), 
        ms: d.getUTCMilliseconds() 
    };
}

// Конвертация в десятичное время
function computeDecimalFromZoneParts(parts, system) {
    const totalSeconds = parts.hour*3600 + parts.minute*60 + parts.second + parts.ms/1000;
    const progress = totalSeconds / 86400;
    const totalDecimalSecondsFloat = progress * (system.hours * system.hourDiv * system.minDiv);
    const totalDecimalSecondsInt = Math.floor(totalDecimalSecondsFloat) % (system.hours * system.hourDiv * system.minDiv);
    const decH = Math.floor(totalDecimalSecondsInt / (system.hourDiv * system.minDiv));
    const decR = totalDecimalSecondsInt % (system.hourDiv * system.minDiv);
    const decM = Math.floor(decR / system.minDiv);
    const decS = decR % system.minDiv;
    return { progress, totalDecimalSecondsFloat, totalDecimalSecondsInt, decH, decM, decS };
}

function drawClock() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sys = timeSystems[currentSystem];
    const zoneParts = getZoneLocalParts(selectedZone, new Date());
    const time = computeDecimalFromZoneParts(zoneParts, sys);

    // Обновление текстовой информации
    if (document.getElementById('realTime')) {
        const fmt = new Intl.DateTimeFormat('ru-RU', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        document.getElementById('realTime').textContent = fmt.format(new Date());
    }
    
    document.getElementById('decimalTime').textContent = 
        `${time.decH.toString().padStart(2,'0')}h ${time.decM.toString().padStart(2,'0')}m ${time.decS.toString().padStart(2,'0')}s`;
    
    const pct = (time.progress * 100).toFixed(4);
    const parts = pct.split('.');
    document.getElementById('progress').textContent = `${parts[0].padStart(2,'0')},${parts[1]}%`;

    // Метки часов
    ctx.save();
    ctx.translate(centerX, centerY);
    for (let i = 0; i < sys.hours; i++) {
        const angle = (i / sys.hours) * Math.PI * 2 - Math.PI / 2;
        const tickInner = radius - 20;
        const tickOuter = radius - 5;
        const ix = Math.cos(angle) * tickInner;
        const iy = Math.sin(angle) * tickInner;
        const ox = Math.cos(angle) * tickOuter;
        const oy = Math.sin(angle) * tickOuter;
        ctx.strokeStyle = i % Math.max(1, Math.floor(sys.hours / 5)) === 0 ? '#fff' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ix, iy);
        ctx.lineTo(ox, oy);
        ctx.stroke();

        const labelRadius = radius - 40;
        const lx = Math.cos(angle) * labelRadius;
        const ly = Math.sin(angle) * labelRadius;
        const displayLabel = (i === 0) ? sys.hours : i;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayLabel.toString(), lx, ly);
    }
    ctx.restore();

    // Градиентный фон
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(255,255,255,0.05)');
    gradient.addColorStop(0.7, 'rgba(0,0,0,0.2)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Стрелки
    ctx.save();
    ctx.translate(centerX, centerY);
    const fullCycle = sys.hours * sys.hourDiv * sys.minDiv;

    // Часовая стрелка
    const hourAngle = (time.totalDecimalSecondsFloat / fullCycle) * Math.PI * 2;
    ctx.save(); ctx.rotate(hourAngle);
    ctx.fillStyle = sys.color; 
    ctx.shadowColor = sys.color; 
    ctx.shadowBlur = 10;
    ctx.fillRect(-4, -radius * 0.6, 8, radius * 0.6);
    ctx.shadowBlur = 0; ctx.restore();

    // Минутная стрелка
    const minuteFrac = (time.totalDecimalSecondsFloat % (sys.hourDiv * sys.minDiv)) / sys.minDiv;
    const minuteAngle = (minuteFrac / sys.hourDiv) * Math.PI * 2;
    ctx.save(); ctx.rotate(minuteAngle);
    ctx.strokeStyle = '#BB86FC'; 
    ctx.lineWidth = 3; 
    ctx.lineCap = 'round'; 
    ctx.shadowColor = '#BB86FC'; 
    ctx.shadowBlur = 8;
    ctx.beginPath(); 
    ctx.moveTo(0,0); 
    ctx.lineTo(0, -radius * 0.75); 
    ctx.stroke(); 
    ctx.shadowBlur = 0; 
    ctx.restore();

    // Секундная стрелка
    const secFloat = time.totalDecimalSecondsFloat % sys.minDiv;
    const secAngle = (secFloat / sys.minDiv) * Math.PI * 2;
    ctx.save(); ctx.rotate(secAngle);
    ctx.strokeStyle = '#FF9800'; 
    ctx.lineWidth = 2; 
    ctx.lineCap = 'round'; 
    ctx.shadowColor = '#FF9800'; 
    ctx.shadowBlur = 12;
    ctx.beginPath(); 
    ctx.moveTo(0,0); 
    ctx.lineTo(0, -radius * 0.85); 
    ctx.stroke(); 
    ctx.shadowBlur = 0; 
    ctx.restore();

    // Центр
    ctx.fillStyle = '#fff'; 
    ctx.shadowColor = '#fff'; 
    ctx.shadowBlur = 15;
    ctx.beginPath(); 
    ctx.arc(0, 0, 10, 0, Math.PI * 2); 
    ctx.fill(); 
    ctx.shadowBlur = 0;
    ctx.restore();
}

// Анимация
let _animRunning = false;
function renderOnce() {
    drawClock();
}

function startAnimation() {
    if (_animRunning) return;
    _animRunning = true;
    function raf() {
        renderOnce();
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
}

// Инициализация
initSlider();
startAnimation();