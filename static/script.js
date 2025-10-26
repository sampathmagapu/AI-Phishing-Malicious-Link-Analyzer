// --- DOM Elements ---
const urlInput = document.getElementById('urlInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const scanQrBtn = document.getElementById('scanQrBtn');
const qrSection = document.getElementById('qr-section');
const resultsSection = document.getElementById('resultsSection');
const verdictText = document.getElementById('verdictText');
const scoreText = document.getElementById('gaugeScoreText');
const riskFactorsList = document.getElementById('riskFactorsList');
const riskGaugeCanvas = document.getElementById('riskGauge');
const qrReaderDiv = document.getElementById('qr-reader');
const qrResultsDiv = document.getElementById('qr-reader-results');
const highRecallToggle = document.getElementById('highRecallToggle');
const hrThresholdText = document.getElementById('hrThresholdText');

let riskChart = null;
let currentResult = null;
let highRecallThreshold = 0.1;
let html5QrCode = null;
const STANDARD_THRESHOLD = 0.5;

// --- Particles.js Initialization ---
particlesJS('particles-js', {
    "particles": {
        "number": {"value": 150, "density": {"enable": true, "value_area": 800}},
        "color": {"value": "#3b82f6"},
        "shape": {"type": "circle", "stroke": {"width": 0, "color": "#000000"}, "polygon": {"nb_sides": 5}},
        "opacity": {"value": 0.7, "random": true, "anim": {"enable": false, "speed": 1, "opacity_min": 0.1, "sync": false}},
        "size": {"value": 4, "random": true, "anim": {"enable": false, "speed": 40, "size_min": 0.1, "sync": false}},
        "line_linked": {"enable": true, "distance": 120, "color": "#60a5fa", "opacity": 0.6, "width": 1},
        "move": {"enable": true, "speed": 2, "direction": "none", "random": true, "straight": false, "out_mode": "out", "bounce": false, "attract": {"enable": false, "rotateX": 600, "rotateY": 1200}}
    },
    "interactivity": {
        "detect_on": "canvas",
        "events": {"onhover": {"enable": true, "mode": "repulse"}, "onclick": {"enable": true, "mode": "push"}, "resize": true},
        "modes": {
            "grab": {"distance": 400, "line_linked": {"opacity": 1}},
            "bubble": {"distance": 100, "size": 6, "duration": 2, "opacity": 0.8, "speed": 3},
            "repulse": {"distance": 150, "duration": 0.4},
            "push": {"particles_nb": 2},
            "remove": {"particles_nb": 2}
        }
    },
    "retina_detect": true
});

// --- 3D Tilt Effect for Cards ---
const cards = document.querySelectorAll(".glass-card");
const tiltIntensity = 10;
cards.forEach(card => {
    card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        const midX = rect.width / 2; const midY = rect.height / 2;
        const rotateX = -(y - midY) / midY * tiltIntensity;
        const rotateY = (x - midX) / midX * tiltIntensity;
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
    });
});

// --- Chart.js Gauge Configuration ---
function createOrUpdateGauge(score) {
    const percentage = Math.round(score * 100);
    let gaugeColor = '#10B981';
    if (percentage > 75) {
        gaugeColor = '#EF4444';
    } else if (percentage > 40) {
        gaugeColor = '#F59E0B';
    }

    const data = {
        datasets: [{
            data: [percentage, 100 - percentage],
            backgroundColor: [gaugeColor, '#E5E7EB'],
            borderColor: 'rgba(255, 255, 255, 0.6)', 
            borderWidth: 2,
            circumference: 180,
            rotation: 270,
            cutout: '75%'
        }]
    };

    if (riskChart) {
        riskChart.data.datasets[0].data = [percentage, 100 - percentage];
        riskChart.data.datasets[0].backgroundColor[0] = gaugeColor;
        riskChart.update();
    } else {
        riskChart = new Chart(riskGaugeCanvas.getContext('2d'), {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: true, 
                aspectRatio: 2, 
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false },
                },
                animation: {
                    animateRotate: true,
                    animateScale: false,
                    duration: 1000
                }
            }
        });
    }
     scoreText.textContent = `${percentage}%`;
     scoreText.style.color = gaugeColor;
}

// --- Helper to Create Risk Factor Badges ---
function createBadge(text, type = 'gray') {
    let bgColor, textColor, icon;
    switch (type) {
        case 'red':
            bgColor = 'bg-red-100'; textColor = 'text-red-800'; icon = '🔥'; break;
        case 'yellow':
            bgColor = 'bg-yellow-100'; textColor = 'text-yellow-800'; icon = '⚠️'; break;
        case 'blue':
            bgColor = 'bg-blue-100'; textColor = 'text-blue-800'; icon = 'ℹ️'; break;
        default:
            bgColor = 'bg-gray-200'; textColor = 'text-gray-800'; icon = '✅'; break;
    }
    return `<span class="inline-flex items-center ${bgColor} rounded-full px-3 py-1 text-xs font-semibold ${textColor}">${icon} ${text}</span>`;
}

// --- Mapping Features to Readable Factors ---
function mapFeaturesToFactors(features) {
    const factors = [];
    if (!features) return factors;
    
    const getFeature = (key, defaultValue = 0) => features.hasOwnProperty(key) ? features[key] : defaultValue;

    if (getFeature('BrandMismatchHint') === 1) factors.push(createBadge('Potential Brand Lookalike', 'red'));
    if (getFeature('IsDomainIP') === 1) factors.push(createBadge('Uses IP Address Host', 'red'));
    
    if (getFeature('HasObfuscation') === 1 || getFeature('ContainsAt') === 1) factors.push(createBadge('Contains Obfuscation (@ or %)', 'yellow'));
    if (getFeature('HasRedirectWord') === 1) factors.push(createBadge('Contains Sensitive Keywords (login, verify etc.)', 'yellow'));
    if (getFeature('NoOfSubDomain', 0) > 2) factors.push(createBadge(`Multiple Subdomains (${Math.round(getFeature('NoOfSubDomain', 0))})`, 'yellow'));
    if (getFeature('IsHTTPS') === 0) factors.push(createBadge('Not HTTPS', 'yellow'));
    if (getFeature('SpacialCharRatioInURL', 0) > 0.25) factors.push(createBadge('High Special Character Ratio', 'yellow')); 
    
    if (getFeature('URLLength', 0) > 75) factors.push(createBadge('Very Long URL', 'blue'));
    if (getFeature('TLD') === 'other' && getFeature('IsDomainIP') === 0) factors.push(createBadge('Uncommon/Invalid TLD', 'blue')); 

    return factors;
}

// --- Update UI ---
function updateUI(result) {
    currentResult = result;
    const score = result.probability;
    
    highRecallThreshold = result.high_recall_threshold !== undefined ? result.high_recall_threshold : highRecallThreshold;
    hrThresholdText.textContent = parseFloat(highRecallThreshold).toFixed(4);

    const isHighRecallMode = highRecallToggle.checked;
    const activeThreshold = isHighRecallMode ? highRecallThreshold : STANDARD_THRESHOLD;

    scoreText.textContent = `${(score * 100).toFixed(0)}%`;
    createOrUpdateGauge(score);

    verdictText.classList.remove('text-green-500', 'text-yellow-500', 'text-red-500', 'text-gray-900');
    if (score >= 0.75) {
        verdictText.textContent = "High Risk";
        verdictText.classList.add('text-red-500');
    } else if (score >= 0.40) { 
        verdictText.textContent = "Suspicious";
        verdictText.classList.add('text-yellow-500');
    } else {
        verdictText.textContent = "Likely Benign";
        verdictText.classList.add('text-green-500');
    }
    
    if (score >= activeThreshold) {
        if (score < 0.40) {
            verdictText.textContent = isHighRecallMode ? "ALERT (High Recall)" : "Suspicious (Standard)";
            verdictText.classList.add('text-red-500'); 
        }
    }

    riskFactorsList.innerHTML = '';
    let factorsHtml = [];
    if (result.features) {
         factorsHtml = mapFeaturesToFactors(result.features);
    }

    if (result.risk_factors && result.risk_factors.length > 0) {
         if (result.risk_factors[0] === "No valid URL found in input.") {
              riskFactorsList.innerHTML = createBadge(`ℹ️ ${result.risk_factors[0]}`, 'blue');
              verdictText.textContent = "Check Input";
              verdictText.classList.remove('text-red-500', 'text-yellow-500', 'text-green-500');
              verdictText.classList.add('text-gray-500');
              createOrUpdateGauge(0);
         } else {
             riskFactorsList.innerHTML = factorsHtml.join(' ');
         }
    } else if (factorsHtml.length === 0 && score < 0.40) {
         riskFactorsList.innerHTML = createBadge('✅ No significant risk factors identified', 'gray');
    } else if (factorsHtml.length === 0) {
        riskFactorsList.innerHTML = createBadge('⚠️ Risk score based on complex model patterns', 'yellow');
    }

    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// --- API Call ---
async function analyzeUrl(urlOrText) {
    verdictText.textContent = 'Analyzing...';
    verdictText.classList.remove('text-green-500', 'text-yellow-500', 'text-red-500');
    verdictText.classList.add('text-gray-900');
    scoreText.textContent = '--%';
    scoreText.style.color = '#111827';
    riskFactorsList.innerHTML = createBadge('Processing...', 'gray');
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth' });
    createOrUpdateGauge(0);
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing...";

    try {
        // *** CRITICAL FIX: Changed from '/score' to '/api/score' ***
        const apiUrl = '/api/score';
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json' 
            },
            body: JSON.stringify({ text: urlOrText }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        updateUI(result);

    } catch (error) {
        console.error('Error fetching analysis:', error);
        verdictText.textContent = 'Error';
        verdictText.classList.remove('text-gray-900');
        verdictText.classList.add('text-red-500');
        scoreText.textContent = 'ERR';
        riskFactorsList.innerHTML = createBadge(`🔥 Analysis Error: ${error.message.substring(0, 50)}...`, 'red');
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = "Analyze 🔍";
    }
}

// --- QR Code Scanning Logic ---
function onScanSuccess(decodedText, decodedResult) {
    qrResultsDiv.textContent = `✅ Scanned successfully! Analyzing...`;
    urlInput.value = decodedText;
    stopQrScanner();
    analyzeUrl(decodedText);
}

function onScanFailure(error) {
    // Ignore intermittent errors
}

function startQrScanner() {
     if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("qr-reader");
     }
     qrSection.classList.remove('hidden'); 
     qrReaderDiv.style.display = 'block';
     qrResultsDiv.textContent = 'Align QR Code within the frame...';
     scanQrBtn.textContent = 'Stop Scanning ⏹️'; 
     analyzeBtn.disabled = true;

     const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
     const cameraConfig = { facingMode: "environment" };

     html5QrCode.start(cameraConfig, config, onScanSuccess, onScanFailure)
        .catch((err) => {
            console.error("Unable to start QR scanning.", err);
            qrResultsDiv.textContent = `Scanner Error. Please ensure camera permissions.`;
            qrResultsDiv.classList.add('text-red-500');
             scanQrBtn.textContent = 'Scan QR 📷'; 
             analyzeBtn.disabled = false;
        });
}

function stopQrScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            // Success
        }).catch((err) => {
            console.warn("Scanner stop failed, hiding anyway.", err);
        }).finally(() => {
             qrSection.classList.add('hidden'); 
             qrReaderDiv.style.display = 'none';
             qrResultsDiv.textContent = ''; 
             scanQrBtn.textContent = 'Scan QR 📷'; 
             analyzeBtn.disabled = false;
             html5QrCode = null; 
        });
    } else {
         qrSection.classList.add('hidden');
         qrReaderDiv.style.display = 'none';
         qrResultsDiv.textContent = '';
         scanQrBtn.textContent = 'Scan QR 📷';
         analyzeBtn.disabled = false;
    }
}

// --- Event Listeners ---
analyzeBtn.addEventListener('click', () => {
    const input = urlInput.value.trim();
    if (input) {
        stopQrScanner(); 
        analyzeUrl(input);
    } else {
        urlInput.classList.add('border-red-500', 'animate-pulse');
        setTimeout(() => urlInput.classList.remove('border-red-500', 'animate-pulse'), 1000);
        resultsSection.classList.add('hidden');
    }
});

urlInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); 
        analyzeBtn.click(); 
    }
});

highRecallToggle.addEventListener('change', () => {
    if (currentResult) {
        updateUI(currentResult);
    }
});

scanQrBtn.addEventListener('click', () => {
    if (qrSection.classList.contains("hidden")) {
         if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
             navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                     stream.getTracks().forEach(track => track.stop()); 
                     startQrScanner();
                })
                .catch(err => {
                     console.error("Camera permission denied or error:", err);
                     qrSection.classList.remove('hidden');
                     qrResultsDiv.textContent = "Camera permission denied or unavailable.";
                     qrReaderDiv.style.display = 'none';
                });
        } else {
             alert("Camera access not supported by this browser.");
        }
    } else {
        stopQrScanner();
    }
});

// --- Initial Setup ---
createOrUpdateGauge(0); 
stopQrScanner();