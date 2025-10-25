// ============================================
// APP.JS - VERSIÓN MEJORADA CON QR REAL
// ============================================

// Variables globales
let map = null;
let busMarkers = [];
let routePolylines = [];
let userBalance = 10000;
let tripHistory = [];
let currentBusData = null;
let selectedRechargeAmount = 0;
let html5QrCode = null;
let isScanning = false;

// ============================================
// INICIALIZACIÓN
// ============================================

function init() {
    updateBalance();
    loadHistory();
    generateDemoQRCodes();
}

// ============================================
// NAVEGACIÓN
// ============================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    document.getElementById(screenId).classList.add('active');
    
    if (screenId === 'map-screen' && !map) {
        setTimeout(initMap, 100);
    }
    
    if (screenId === 'scanner-screen') {
        startQRScanner();
    } else {
        stopQRScanner();
    }
    
    if (screenId === 'history-screen') {
        displayHistory();
    }
}

// ============================================
// MAPA CON RUTAS QUE SIGUEN CALLES
// ============================================

function initMap() {
    map = L.map('map').setView([5.5401, -73.3678], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
    
    drawRoutesWithStreets();
    drawBuses();
    startBusSimulation();
}

function drawRoutesWithStreets() {
    routes.forEach(route => {
        // Usar Leaflet Routing Machine para seguir calles
        const waypoints = route.waypoints.map(coord => L.latLng(coord[0], coord[1]));
        
        const routingControl = L.Routing.control({
            waypoints: waypoints,
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            showAlternatives: false,
            lineOptions: {
                styles: [{ color: route.color, opacity: 0.8, weight: 5 }]
            },
            createMarker: function() { return null; }, // No mostrar marcadores de waypoints
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            })
        }).addTo(map);
        
        // Ocultar el panel de instrucciones
        const container = routingControl.getContainer();
        if (container) {
            container.style.display = 'none';
        }
        
        routePolylines.push({ id: route.id, control: routingControl });
    });
}

function drawBuses() {
    buses.forEach(bus => {
        const route = routes.find(r => r.id === bus.routeId);
        
        const busIcon = L.divIcon({
            className: 'custom-bus-marker',
            html: `
                <div style="
                    background: ${route.color}; 
                    color: white; 
                    padding: 8px 14px; 
                    border-radius: 20px; 
                    font-weight: bold;
                    box-shadow: 0 3px 8px rgba(0,0,0,0.3);
                    border: 2px solid white;
                    font-size: 13px;
                ">
                    🚌 ${bus.number}
                </div>
            `,
            iconSize: [70, 35],
            iconAnchor: [35, 17]
        });
        
        const marker = L.marker([bus.latitude, bus.longitude], {
            icon: busIcon
        }).addTo(map);
        
        marker.bindPopup(`
            <div style="text-align: center; min-width: 150px;">
                <h4 style="margin: 0 0 8px 0; font-size: 1.1em;">Bus ${bus.number}</h4>
                <p style="margin: 4px 0; color: #666;">${route.name}</p>
                <p style="margin: 8px 0 0 0; font-weight: bold; color: ${route.color};">
                    Tarifa: ${route.fare.toLocaleString()}
                </p>
            </div>
        `);
        
        busMarkers.push({ id: bus.id, marker, data: bus });
    });
    
    updateActiveBusesCount();
}

function startBusSimulation() {
    setInterval(() => {
        busMarkers.forEach(({ marker, data }) => {
            const route = routes.find(r => r.id === data.routeId);
            const currentPos = marker.getLatLng();
            
            // Movimiento más realista siguiendo la ruta
            const waypointIndex = Math.floor(Math.random() * route.waypoints.length);
            const targetWaypoint = route.waypoints[waypointIndex];
            
            // Mover hacia el waypoint gradualmente
            const latDiff = (targetWaypoint[0] - currentPos.lat) * 0.05;
            const lngDiff = (targetWaypoint[1] - currentPos.lng) * 0.05;
            
            const newLat = currentPos.lat + latDiff;
            const newLng = currentPos.lng + lngDiff;
            
            marker.setLatLng([newLat, newLng]);
            data.latitude = newLat;
            data.longitude = newLng;
        });
    }, 2000);
}

function filterRoute() {
    const selectedRoute = document.getElementById('route-filter').value;
    
    busMarkers.forEach(({ marker, data }) => {
        if (selectedRoute === 'all' || data.routeId === selectedRoute) {
            marker.addTo(map);
        } else {
            marker.remove();
        }
    });
    
    updateActiveBusesCount();
}

function updateActiveBusesCount() {
    const selectedRoute = document.getElementById('route-filter')?.value || 'all';
    let count = buses.length;
    
    if (selectedRoute !== 'all') {
        count = buses.filter(b => b.routeId === selectedRoute).length;
    }
    
    const element = document.getElementById('active-buses');
    if (element) {
        element.textContent = count;
    }
}

// ============================================
// SCANNER QR REAL
// ============================================

function startQRScanner() {
    if (isScanning) return;
    
    const config = { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    html5QrCode = new Html5Qrcode("qr-reader");
    
    Html5Qrcode.getCameras().then(cameras => {
        if (cameras && cameras.length) {
            const cameraId = cameras[cameras.length - 1].id;
            
            html5QrCode.start(
                cameraId,
                config,
                onScanSuccess,
                onScanFailure
            ).then(() => {
                isScanning = true;
            }).catch(err => {
                console.error("Error al iniciar cámara:", err);
                showSuccessModal('⚠️', 'Error de Cámara', 'No se pudo acceder a la cámara. Usa los códigos QR de prueba.');
            });
        } else {
            showSuccessModal('⚠️', 'Sin Cámara', 'No se detectó ninguna cámara. Usa los códigos QR de prueba.');
        }
    }).catch(err => {
        console.error("Error al obtener cámaras:", err);
        showSuccessModal('⚠️', 'Error', 'No se pudo acceder a la cámara. Asegúrate de dar permisos.');
    });
}

function stopQRScanner() {
    if (html5QrCode && isScanning) {
        html5QrCode.stop().then(() => {
            isScanning = false;
        }).catch(err => {
            console.error("Error al detener escáner:", err);
        });
    }
}

function onScanSuccess(decodedText, decodedResult) {
    console.log("QR detectado:", decodedText);
    
    // Detener el scanner
    stopQRScanner();
    
    // Procesar el código QR
    processQRCode(decodedText);
}

function onScanFailure(error) {
    // No hacer nada, es normal que falle mientras busca
}

function processQRCode(qrData) {
    try {
        // Intentar parsear como JSON
        const data = JSON.parse(qrData);
        
        if (data.busId) {
            const bus = buses.find(b => b.id === data.busId);
            if (bus) {
                const route = routes.find(r => r.id === bus.routeId);
                showPaymentScreen(bus, route);
            } else {
                showSuccessModal('❌', 'Error', 'Código QR no válido');
            }
        }
    } catch (e) {
        // Si no es JSON, buscar por ID directo
        const bus = buses.find(b => b.id === qrData);
        if (bus) {
            const route = routes.find(r => r.id === bus.routeId);
            showPaymentScreen(bus, route);
        } else {
            showSuccessModal('❌', 'Error', 'Código QR no reconocido');
        }
    }
}

// Generar códigos QR de prueba
function generateDemoQRCodes() {
    const qrBuses = [
        { id: 'qr-bus-1', busId: 'BUS-001' },
        { id: 'qr-bus-2', busId: 'BUS-002' },
        { id: 'qr-bus-3', busId: 'BUS-003' }
    ];
    
    qrBuses.forEach(item => {
        const canvas = document.getElementById(item.id);
        if (canvas && typeof QRCode !== 'undefined') {
            new QRCode(canvas, {
                text: JSON.stringify({ busId: item.busId }),
                width: 180,
                height: 180,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            
            // Hacer clickeable para simular escaneo
            canvas.parentElement.style.cursor = 'pointer';
            canvas.parentElement.onclick = () => {
                processQRCode(JSON.stringify({ busId: item.busId }));
            };
        }
    });
}

// ============================================
// PAGO
// ============================================

function showPaymentScreen(bus, route) {
    currentBusData = {
        busId: bus.id,
        busNumber: bus.number,
        routeName: route.name,
        fare: route.fare
    };
    
    document.getElementById('payment-bus-number').textContent = bus.number;
    document.getElementById('payment-route').textContent = route.name;
    document.getElementById('payment-fare').textContent = `${route.fare.toLocaleString()} COP`;
    document.getElementById('payment-balance').textContent = `${userBalance.toLocaleString()}`;
    
    showScreen('payment-screen');
}

function processPayment() {
    if (userBalance >= currentBusData.fare) {
        userBalance -= currentBusData.fare;
        
        const trip = {
            date: new Date().toLocaleString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            bus: currentBusData.busNumber,
            route: currentBusData.routeName,
            amount: currentBusData.fare
        };
        
        tripHistory.unshift(trip);
        saveHistory();
        updateBalance();
        
        showSuccessModal('✅', '¡Pago Exitoso!', `Has pagado ${currentBusData.fare.toLocaleString()} por tu viaje en el bus ${currentBusData.busNumber}`);
        
        setTimeout(() => {
            closeModal();
            showScreen('home-screen');
        }, 2500);
    } else {
        showSuccessModal('⚠️', 'Saldo Insuficiente', 'Por favor recarga tu saldo para continuar');
    }
}

// ============================================
// RECARGA
// ============================================

function selectAmount(amount) {
    selectedRechargeAmount = amount;
    
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    event.target.classList.add('selected');
}

function rechargeBalance() {
    let amount = selectedRechargeAmount;
    
    const customAmount = document.getElementById('custom-amount').value;
    if (customAmount && parseInt(customAmount) > 0) {
        amount = parseInt(customAmount);
    }
    
    if (amount > 0) {
        userBalance += amount;
        updateBalance();
        saveHistory();
        
        showSuccessModal('✅', '¡Recarga Exitosa!', `Se han agregado ${amount.toLocaleString()} a tu saldo`);
        
        document.getElementById('custom-amount').value = '';
        selectedRechargeAmount = 0;
        
        document.querySelectorAll('.amount-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        setTimeout(() => {
            closeModal();
            showScreen('home-screen');
        }, 2500);
    } else {
        showSuccessModal('❌', 'Error', 'Por favor selecciona un monto válido');
    }
}

// ============================================
// SALDO E HISTORIAL
// ============================================

function updateBalance() {
    const balanceElements = document.querySelectorAll('#user-balance');
    balanceElements.forEach(el => {
        el.textContent = `${userBalance.toLocaleString()} COP`;
    });
}

function displayHistory() {
    const historyList = document.getElementById('history-list');
    
    if (tripHistory.length === 0) {
        historyList.innerHTML = `
            <div style="background: white; padding: 60px 40px; border-radius: 12px; text-align: center; border: 1px solid #e0e0e0;">
                <span style="font-size: 5em; opacity: 0.3;">🚌</span>
                <h3 style="margin-top: 20px; color: #000;">No hay viajes registrados</h3>
                <p style="color: #666; margin-top: 10px;">Escanea un código QR para realizar tu primer viaje</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = tripHistory.map(trip => `
        <div class="history-item">
            <div class="history-info">
                <h4>Bus ${trip.bus} - ${trip.route}</h4>
                <p>${trip.date}</p>
            </div>
            <div class="history-amount">-${trip.amount.toLocaleString()}</div>
        </div>
    `).join('');
}

function saveHistory() {
    localStorage.setItem('tripHistory', JSON.stringify(tripHistory));
    localStorage.setItem('userBalance', userBalance.toString());
}

function loadHistory() {
    const savedHistory = localStorage.getItem('tripHistory');
    const savedBalance = localStorage.getItem('userBalance');
    
    if (savedHistory) {
        try {
            tripHistory = JSON.parse(savedHistory);
        } catch (e) {
            console.error('Error al cargar historial:', e);
            tripHistory = [];
        }
    }
    
    if (savedBalance) {
        userBalance = parseInt(savedBalance);
        updateBalance();
    }
}

// ============================================
// MODAL
// ============================================

function showSuccessModal(icon, title, message) {
    document.getElementById('modal-icon').textContent = icon;
    document.getElementById('success-title').textContent = title;
    document.getElementById('success-message').textContent = message;
    document.getElementById('success-modal').classList.add('active');
}

function closeModal() {
    document.getElementById('success-modal').classList.remove('active');
}

// ============================================
// INICIAR
// ============================================

window.addEventListener('DOMContentLoaded', init);