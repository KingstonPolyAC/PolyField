import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronLeft, ChevronRight, Wind, Speaker, Target, Power, PowerOff, Compass, CheckCircle, XCircle, Ruler, Wifi, Usb, RotateCcw, TrendingUp
} from 'lucide-react';

// Wails Go Function Imports
import {
    ListSerialPorts, ConnectSerialDevice, ConnectNetworkDevice, DisconnectDevice, SetDemoMode,
    GetCalibration, SaveCalibration, SetCircleCentre, VerifyCircleEdge, MeasureThrow, ResetCalibration, SendToScoreboard, MeasureWind, ExportHeatmapData
} from '../wailsjs/go/main/App';

// ==================================================
// PERSISTENT STORAGE UTILITIES
// ==================================================

const STORAGE_KEYS = {
    CONNECTION_DETAILS: 'polyfield-connection-details',
    APP_SETTINGS: 'polyfield-app-settings'
};

// Safe localStorage utilities that handle errors gracefully
const StorageUtils = {
    save: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Error saving to localStorage (${key}):`, error);
            return false;
        }
    },
    
    load: (key, defaultValue = null) => {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (error) {
            console.error(`Error loading from localStorage (${key}):`, error);
            return defaultValue;
        }
    },
    
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing from localStorage (${key}):`, error);
            return false;
        }
    }
};

// Default connection details
const getDefaultConnectionDetails = () => ({
    edm: { 
        type: 'serial', 
        port: '', 
        ip: '192.168.1.100', 
        tcpPort: '10001',
        connected: false 
    },
    wind: { 
        type: 'serial', 
        port: '', 
        ip: '192.168.1.102', 
        tcpPort: '10001',
        connected: false 
    },
    scoreboard: { 
        type: 'serial', 
        port: '', 
        ip: '192.168.1.101', 
        tcpPort: '10001',
        connected: false 
    }
});

// Load stored connection details
const loadStoredConnectionDetails = () => {
    const stored = StorageUtils.load(STORAGE_KEYS.CONNECTION_DETAILS);
    const defaults = getDefaultConnectionDetails();
    
    if (!stored) {
        return defaults;
    }
    
    // Merge stored data with defaults to handle missing fields
    const merged = { ...defaults };
    Object.keys(defaults).forEach(deviceType => {
        if (stored[deviceType]) {
            merged[deviceType] = {
                ...defaults[deviceType],
                ...stored[deviceType],
                connected: false // Always start disconnected
            };
        }
    });
    
    return merged;
};

// Load stored app settings
const loadStoredAppSettings = () => {
    return StorageUtils.load(STORAGE_KEYS.APP_SETTINGS, {
        demoMode: false,
        lastEventType: null,
        lastScreen: 'SELECT_EVENT_TYPE'
    });
};

// ==================================================
// UI COMPONENTS
// ==================================================

const Card = ({ children, onClick, className = '', disabled = false }) => ( 
    <button onClick={onClick} disabled={disabled} className={`border-2 border-gray-300 hover:border-blue-400 bg-white text-gray-800 font-semibold p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ease-in-out flex flex-col items-center justify-center text-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
        {children}
    </button> 
);

const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled = false, size = 'md' }) => {
    const baseStyle = 'rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 ease-in-out flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-95';
    const sizeStyle = size === 'sm' ? 'px-3 py-1.5 text-sm' : (size === 'lg' ? 'px-8 py-4 text-xl' : 'px-6 py-3 text-lg');
    let variantStyle = '';
    switch (variant) {
        case 'secondary': variantStyle = 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-400'; break;
        case 'danger': variantStyle = 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'; break;
        case 'success': variantStyle = 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-400'; break;
        case 'heatmap': variantStyle = 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400'; break;
        default: variantStyle = 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500';
    }
    return ( 
        <button onClick={onClick} className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`} disabled={disabled}> 
            {Icon && <Icon size={size === 'sm' ? 16 : (size === 'lg' ? 24 : 20)} className={children ? "mr-2" : ""} />} 
            {children && <span>{children}</span>} 
        </button> 
    );
};

const Select = ({ label, value, onChange, options, className = '', disabled = false }) => (
    <div className={`mb-2 ${className}`}>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <select 
            value={value || ''} 
            onChange={(e) => {
                console.log('DEBUGGING Select: Raw event value:', e.target.value);
                onChange(e.target.value);
            }} 
            disabled={disabled} 
            className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-200"
        >
            <option value="">-- Select --</option>
            {options.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
        </select>
    </div>
);

const InputField = ({ label, type = "text", value, onChange, placeholder, className = '', disabled = false }) => (
    <div className={`mb-2 ${className}`}>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <input 
            type={type} 
            value={value || ''} 
            onChange={(e) => {
                console.log('DEBUGGING Input: Raw event value:', e.target.value);
                onChange(e.target.value);
            }} 
            placeholder={placeholder} 
            disabled={disabled} 
            className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-200" 
        />
    </div>
);

const ToggleSwitch = ({ label, enabled, onToggle }) => ( 
    <div className="flex items-center justify-between"> 
        <span className="text-base font-medium text-gray-700">{label}</span> 
        <button onClick={() => onToggle(!enabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}> 
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} /> 
        </button> 
    </div> 
);

const BottomNavBar = ({ children }) => ( 
    <div className="fixed bottom-0 left-0 right-0 bg-gray-100 p-3 border-t border-gray-300 shadow-top z-30 flex justify-between items-center">
        {children}
    </div> 
);

// ==================================================
// HEAT MAP COMPONENT
// ==================================================

const HeatMapScreen = ({ onNavigate, appState }) => {
    const canvasRef = useRef(null);
    const [heatmapData, setHeatmapData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [gridSize, setGridSize] = useState(0.5); // Default 0.5m grid
    const [currentCircleType, setCurrentCircleType] = useState('SHOT');

    // Get current circle type from calibration on component mount
    useEffect(() => {
        const fetchCurrentCircleType = async () => {
            try {
                const calData = await GetCalibration('edm');
                if (calData && calData.selectedCircleType) {
                    setCurrentCircleType(calData.selectedCircleType);
                    console.log('Heat map using circle type:', calData.selectedCircleType);
                }
            } catch (error) {
                console.error('Error fetching calibration:', error);
                // Fallback to SHOT if calibration fails
                setCurrentCircleType('SHOT');
            }
        };
        fetchCurrentCircleType();
    }, []);

    const fetchHeatmapData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await ExportHeatmapData(currentCircleType, gridSize);
            setHeatmapData(data);
        } catch (error) {
            console.error('Error fetching heatmap data:', error);
            // Handle the "no coordinates found" error gracefully
            if (error.toString().includes('no coordinates found')) {
                setHeatmapData({
                    circleType: currentCircleType,
                    gridSize: gridSize,
                    bounds: { minX: -10, maxX: 10, minY: -10, maxY: 10 }, // Default bounds to ensure circle is visible
                    gridWidth: 0,
                    gridHeight: 0,
                    heatmap: [],
                    totalThrows: 0,
                    coordinates: []
                });
                setError(null); // Clear error since this is expected behavior
            } else {
                setError(`Error loading heatmap data: ${error}`);
            }
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (currentCircleType) {
            fetchHeatmapData();
        }
    }, [currentCircleType, gridSize]);

    // Draw heatmap on canvas
    useEffect(() => {
        if (!heatmapData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Get target radius for the current circle type
        const UKA_RADII = { SHOT: 1.0675, DISCUS: 1.250, HAMMER: 1.0675, JAVELIN_ARC: 8.000 };
        const targetRadius = UKA_RADII[currentCircleType] || 1.0675;
        
        if (heatmapData.totalThrows === 0) {
            // Even with no data, draw the circle center and actual circle for reference
            const margin = 60;
            const centerX = width / 2;
            const centerY = height / 2;
            
            // Use a reasonable scale for empty display (e.g., 15 pixels per meter for better fit)
            const scale = 15;
            const circleRadiusPixels = targetRadius * scale;
            
            // Draw distance arcs for reference
            ctx.strokeStyle = 'rgba(128, 128, 128, 0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            
            let distanceArcs = [];
            if (currentCircleType === 'SHOT') {
                distanceArcs = [6, 8, 10, 12, 14];
            } else {
                distanceArcs = [10, 20, 30, 40, 50, 60];
            }
            
            distanceArcs.forEach(distance => {
                const arcRadius = (distance + targetRadius) * scale;
                if (arcRadius > 10 && arcRadius < Math.min(width - 100, height - 100)) {
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, arcRadius, 0, 2 * Math.PI);
                    ctx.stroke();
                    
                    ctx.fillStyle = 'rgba(100, 100, 100, 0.6)';
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(`${distance}m`, centerX, centerY - arcRadius - 5);
                }
            });
            
            ctx.setLineDash([]);
            
            // Draw actual circle outline
            ctx.strokeStyle = 'green';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, circleRadiusPixels, 0, 2 * Math.PI);
            ctx.stroke();
            
            // Draw circle center
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = 'green';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Draw center cross
            ctx.strokeStyle = 'green';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX - 6, centerY);
            ctx.lineTo(centerX + 6, centerY);
            ctx.moveTo(centerX, centerY - 6);
            ctx.lineTo(centerX, centerY + 6);
            ctx.stroke();
            
            // Draw circle type and radius label
            ctx.fillStyle = 'black';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${currentCircleType} Circle`, centerX, centerY - circleRadiusPixels - 40);
            ctx.font = '14px Arial';
            ctx.fillText(`Radius: ${targetRadius.toFixed(3)}m`, centerX, centerY - circleRadiusPixels - 25);
            
            // Draw "No Data" message
            ctx.fillStyle = '#666';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No throw data available', centerX, centerY + Math.max(circleRadiusPixels + 40, 80));
            
            return;
        }

        const { heatmap, bounds, gridWidth, gridHeight, coordinates } = heatmapData;
        
        // Calculate bounds that include ALL data points AND the circle center (0,0)
        let minX = Math.min(bounds.minX, 0);
        let maxX = Math.max(bounds.maxX, 0);
        let minY = Math.min(bounds.minY, 0);
        let maxY = Math.max(bounds.maxY, 0);
        
        // Ensure the circle outline is always visible by expanding bounds to include circle edge
        minX = Math.min(minX, -targetRadius);
        maxX = Math.max(maxX, targetRadius);
        minY = Math.min(minY, -targetRadius);
        maxY = Math.max(maxY, targetRadius);
        
        // Add padding around the data to ensure nothing is cut off
        const padding = Math.max((maxX - minX) * 0.1, (maxY - minY) * 0.1, 2.0); // At least 2m padding
        minX -= padding;
        maxX += padding;
        minY -= padding;
        maxY += padding;
        
        // Calculate scale and offset to center the heatmap
        const margin = 60; // Increased margin for labels
        const availableWidth = width - 2 * margin;
        const availableHeight = height - 2 * margin;
        
        const dataWidth = maxX - minX;
        const dataHeight = maxY - minY;
        
        const scaleX = availableWidth / dataWidth;
        const scaleY = availableHeight / dataHeight;
        const scale = Math.min(scaleX, scaleY);
        
        const offsetX = margin + (availableWidth - dataWidth * scale) / 2;
        const offsetY = margin + (availableHeight - dataHeight * scale) / 2;

        // Find max value for color scaling
        const maxValue = Math.max(...heatmap.flat(), 1); // Ensure at least 1 to avoid division by zero
        
        // Draw heatmap grid
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const value = heatmap[y][x];
                if (value > 0) {
                    const intensity = value / maxValue;
                    
                    // Color from blue (low) to red (high)
                    const red = Math.floor(255 * intensity);
                    const blue = Math.floor(255 * (1 - intensity));
                    const green = Math.floor(100 * (1 - intensity));
                    
                    ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${0.3 + 0.7 * intensity})`;
                    
                    const cellX = offsetX + (bounds.minX + x * gridSize - minX) * scale;
                    const cellY = offsetY + (maxY - (bounds.minY + y * gridSize) - minY) * scale;
                    const cellWidth = gridSize * scale;
                    const cellHeight = gridSize * scale;
                    
                    ctx.fillRect(cellX, cellY, cellWidth, cellHeight);
                    
                    // Draw value text if cell is large enough
                    if (cellWidth > 25 && cellHeight > 25) {
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 12px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText(value.toString(), cellX + cellWidth/2, cellY + cellHeight/2 + 4);
                    }
                }
            }
        }
        
        // Calculate circle center position in canvas coordinates
        const centerX = offsetX + (0 - minX) * scale;
        const centerY = offsetY + (maxY - 0 - minY) * scale;
        
        // Draw distance arcs based on event type
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.6)'; // Light gray
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // Dashed line
        
        let distanceArcs = [];
        if (currentCircleType === 'SHOT') {
            distanceArcs = [6, 8, 10, 12, 14]; // Shot put distances
        } else {
            // Discus, Hammer, Javelin - every 10m
            distanceArcs = [20, 30, 40, 50, 60];
        }
        
        // Draw distance arcs
        distanceArcs.forEach(distance => {
            const arcRadius = (distance + targetRadius) * scale; // Distance from center plus circle radius
            
            // Only draw if arc is within visible area
            if (arcRadius > 10 && arcRadius < Math.min(width, height)) {
                ctx.beginPath();
                ctx.arc(centerX, centerY, arcRadius, 0, 2 * Math.PI);
                ctx.stroke();
                
                // Add distance label at top of arc
                if (arcRadius < Math.min(width - 60, height - 60)) {
                    ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
                    ctx.font = '11px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(`${distance}m`, centerX, centerY - arcRadius - 5);
                }
            }
        });
        
        // Reset line dash for other elements
        ctx.setLineDash([]);
        
        // Draw actual circle outline to scale
        const circleRadiusPixels = targetRadius * scale;
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, circleRadiusPixels, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Draw circle center - ALWAYS visible and prominent
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw center cross
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - 6, centerY);
        ctx.lineTo(centerX + 6, centerY);
        ctx.moveTo(centerX, centerY - 6);
        ctx.lineTo(centerX, centerY + 6);
        ctx.stroke();
        
        // Draw legend (simplified)
        ctx.fillStyle = 'black';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${currentCircleType} Circle (${targetRadius.toFixed(3)}m radius)`, 10, height - 30);
        ctx.fillText(`Grid: ${gridSize}m | Distance Arcs: ${currentCircleType === 'SHOT' ? '6-14m' : '10-100m'}`, 10, height - 15);

    }, [heatmapData, currentCircleType]);

    const circleTypes = ['SHOT', 'DISCUS', 'HAMMER', 'JAVELIN_ARC'];
    const gridSizes = [0.5, 1.0, 2.0, 5.0];

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="text-lg mb-2">Loading heatmap...</div>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-full mx-auto" style={{ paddingBottom: '80px', maxHeight: 'calc(100vh - 60px)', overflowY: 'auto' }}>
            <h1 className="text-2xl font-bold text-center mb-4 text-gray-800">Landing Heat Map</h1>
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}
            
            <div className="grid grid-cols-1 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-800 mb-1">Current Event</div>
                    <div className="text-lg font-bold text-blue-900">{currentCircleType} Circle</div>
                </div>
                <Select
                    label="Grid Size"
                    value={gridSize}
                    onChange={(value) => setGridSize(parseFloat(value))}
                    options={gridSizes.map(size => ({ value: size, label: `${size}m` }))}
                />
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md border relative">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={450}
                    className="w-full h-auto border border-gray-300 rounded"
                    style={{ maxHeight: '45vh' }}
                />
                
                {/* Show helpful message when no data */}
                {heatmapData && heatmapData.totalThrows === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 rounded">
                        <div className="text-center p-6">
                            <TrendingUp size={48} className="mx-auto mb-3 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Throw Data</h3>
                            <p className="text-gray-500">
                                Start measuring throws to see the heat map.<br />
                                Data will appear here as you record measurements.
                            </p>
                        </div>
                    </div>
                )}
            </div>
            
            {heatmapData && heatmapData.totalThrows > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="bg-blue-100 p-3 rounded">
                        <div className="text-sm text-gray-600">Total Throws</div>
                        <div className="text-xl font-bold text-blue-700">{heatmapData.totalThrows}</div>
                    </div>
                    <div className="bg-green-100 p-3 rounded">
                        <div className="text-sm text-gray-600">Grid Size</div>
                        <div className="text-xl font-bold text-green-700">{gridSize}m</div>
                    </div>
                    <div className="bg-purple-100 p-3 rounded">
                        <div className="text-sm text-gray-600">Circle Radius</div>
                        <div className="text-xl font-bold text-purple-700">{(heatmapData.circleType === 'SHOT' ? 1.0675 : 
                            heatmapData.circleType === 'DISCUS' ? 1.250 : 
                            heatmapData.circleType === 'HAMMER' ? 1.0675 : 8.000).toFixed(3)}m</div>
                    </div>
                </div>
            )}

            <BottomNavBar>
                <Button onClick={() => onNavigate('STAND_ALONE_MODE')} variant="secondary" icon={ChevronLeft} size="lg">Back</Button>
                <Button onClick={fetchHeatmapData} variant="primary" size="lg">Refresh</Button>
            </BottomNavBar>
        </div>
    );
};

// ==================================================
// SCREEN COMPONENTS
// ==================================================

const SelectEventTypeScreen = ({ onNavigate, setAppState }) => (
    <div className="p-4 md:p-6 max-w-full mx-auto flex flex-col h-full">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">SELECT EVENT TYPE</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 flex-grow content-start">
            <Card onClick={() => { setAppState(prev => ({ ...prev, eventType: 'Throws' })); onNavigate('SELECT_DEVICES'); }} className="h-56 sm:h-64">
                <Target size={48} className="mb-2 text-blue-600" />
                <span className="text-xl md:text-2xl mt-2.5">Throws</span>
                <p className="text-base text-gray-600 mt-2">Shot, Discus, Hammer, Javelin</p>
            </Card>
            <Card onClick={() => { setAppState(prev => ({ ...prev, eventType: 'Horizontal Jumps' })); onNavigate('SELECT_DEVICES'); }} className="h-56 sm:h-64">
                <Wind size={48} className="mb-2 text-blue-600" />
                <span className="text-xl md:text-2xl mt-2.5">Horizontal Jumps</span>
                <p className="text-base text-gray-600 mt-2">Long Jump, Triple Jump</p>
            </Card>
        </div>
    </div>
);

const SelectDevicesScreen = ({ onNavigate, appState, setAppState }) => {
    const [serialPorts, setSerialPorts] = useState([]);
    const [status, setStatus] = useState({});

    useEffect(() => {
        ListSerialPorts().then(ports => setSerialPorts(ports.map(p => ({ value: p, label: p })))).catch(console.error);
    }, []);

    // Debug effect to monitor state changes
    useEffect(() => {
        console.log('DEBUGGING: appState.connectionDetails changed:', appState.connectionDetails);
    }, [appState.connectionDetails]);

    const handleToggleDemoMode = (enabled) => {
        setAppState(prev => ({ ...prev, demoMode: enabled }));
        SetDemoMode(enabled);
    };

    // Fixed connection detail changes with proper debugging
    const handleConnectionDetailChange = (deviceType, field, value) => {
        console.log('DEBUGGING: handleConnectionDetailChange called:', { deviceType, field, value, type: typeof value });
        
        const currentDetails = appState.connectionDetails[deviceType] || {};
        const newDetails = { ...currentDetails, [field]: value };
        
        console.log('DEBUGGING: Before setState:', { currentDetails, newDetails });
        
        setAppState(prev => ({ 
            ...prev, 
            connectionDetails: {
                ...prev.connectionDetails,
                [deviceType]: newDetails 
            }
        }));
        
        // Auto-connect for serial ports
        if (field === 'port' && newDetails.type === 'serial' && value) {
            handleConnect(deviceType);
        }
    };

    const handleConnect = async (deviceType) => {
        setStatus(prev => ({ ...prev, [deviceType]: "Connecting..." }));
        const details = appState.connectionDetails[deviceType];
        try {
            let result;
            if (details.type === 'serial') {
                if (!details.port) { 
                    setStatus(prev => ({ ...prev, [deviceType]: "Please select a port." })); 
                    return; 
                }
                result = await ConnectSerialDevice(deviceType, details.port);
            } else {
                result = await ConnectNetworkDevice(deviceType, details.ip, parseInt(details.tcpPort, 10));
            }
            
            // Update both devices and connectionDetails
            setAppState(prev => ({ 
                ...prev, 
                devices: { 
                    ...prev.devices, 
                    [deviceType]: { connected: true } 
                },
                connectionDetails: {
                    ...prev.connectionDetails,
                    [deviceType]: { ...details, connected: true }
                }
            }));
            setStatus(prev => ({ ...prev, [deviceType]: result }));
        } catch (error) {
            setStatus(prev => ({ ...prev, [deviceType]: `Error: ${error}` }));
        }
    };

    const handleDisconnect = async (deviceType) => {
        setStatus(prev => ({ ...prev, [deviceType]: "Disconnecting..." }));
        try {
            const result = await DisconnectDevice(deviceType);
            setAppState(prev => ({ 
                ...prev, 
                devices: { 
                    ...prev.devices, 
                    [deviceType]: { connected: false } 
                },
                connectionDetails: {
                    ...prev.connectionDetails,
                    [deviceType]: { ...prev.connectionDetails[deviceType], connected: false }
                }
            }));
            setStatus(prev => ({ ...prev, [deviceType]: result }));
        } catch (error) {
            setStatus(prev => ({ ...prev, [deviceType]: `Error: ${error}` }));
        }
    };

    const handleNext = () => {
        const edm = appState.devices.edm;
        const isEdmReady = edm && (edm.connected || appState.demoMode);
        if (appState.eventType === 'Throws' && isEdmReady) {
            onNavigate('CALIBRATE_EDM');
        } else {
            onNavigate('STAND_ALONE_MODE');
        }
    };

    const DevicePanel = ({ title, deviceType, icon, showCalibrateButton = false }) => {
        const deviceState = appState.devices[deviceType] || {};
        const details = appState.connectionDetails[deviceType] || {};
        const isConnected = deviceState.connected;

        console.log('DEBUGGING: DevicePanel details for', deviceType, ':', details);

        return (
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-blue-700 mb-2 flex items-center">{icon} {title}</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <Button 
                        size="sm" 
                        variant={details.type === 'serial' ? 'primary' : 'secondary'} 
                        onClick={() => handleConnectionDetailChange(deviceType, 'type', 'serial')} 
                        icon={Usb}
                    >
                        Serial
                    </Button>
                    <Button 
                        size="sm" 
                        variant={details.type === 'network' ? 'primary' : 'secondary'} 
                        onClick={() => handleConnectionDetailChange(deviceType, 'type', 'network')} 
                        icon={Wifi}
                    >
                        Network
                    </Button>
                </div>
                {details.type === 'serial' && (
                    <Select 
                        value={details.port || ''} 
                        onChange={(value) => {
                            console.log('DEBUGGING: Serial port selected:', value);
                            handleConnectionDetailChange(deviceType, 'port', value);
                        }} 
                        options={serialPorts} 
                        disabled={isConnected || appState.demoMode} 
                    /> 
                )}
                {details.type === 'network' && (
                    <div className="grid grid-cols-2 gap-2">
                        <InputField 
                            label="IP Address" 
                            value={details.ip || ''} 
                            onChange={(value) => {
                                console.log('DEBUGGING: IP changed to:', value);
                                handleConnectionDetailChange(deviceType, 'ip', value);
                            }} 
                            disabled={isConnected || appState.demoMode} 
                        />
                        <InputField 
                            label="Port" 
                            value={details.tcpPort || ''} 
                            onChange={(value) => {
                                console.log('DEBUGGING: Port changed to:', value);
                                handleConnectionDetailChange(deviceType, 'tcpPort', value);
                            }} 
                            disabled={isConnected || appState.demoMode} 
                        />
                    </div>
                )}
                <div className="mt-2">
                    <Button 
                        onClick={() => isConnected ? handleDisconnect(deviceType) : handleConnect(deviceType)} 
                        variant={isConnected ? 'danger' : 'success'} 
                        size="sm" 
                        icon={isConnected ? PowerOff : Power} 
                        disabled={appState.demoMode} 
                        className="w-full"
                    >
                        {isConnected ? 'Disconnect' : 'Connect'}
                    </Button>
                </div>
                {showCalibrateButton && (
                    <Button 
                        onClick={() => onNavigate('CALIBRATE_EDM')} 
                        variant="secondary" 
                        icon={Compass} 
                        size="sm" 
                        className="w-full mt-2" 
                        disabled={!isConnected && !appState.demoMode}
                    >
                        Calibrate EDM
                    </Button>
                )}
                {status[deviceType] && (
                    <p className={`mt-2 text-xs ${status[deviceType]?.includes('Error') ? 'text-red-500' : 'text-gray-600'}`}>
                        Status: {status[deviceType]}
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="p-3 md:p-4 max-w-full mx-auto" style={{ paddingBottom: '80px', maxHeight: 'calc(100vh - 60px)', overflowY: 'auto' }}>
            <h1 className="text-2xl font-bold text-center mb-1 text-gray-800">DEVICE SETUP</h1>
            <p className="text-center text-base text-gray-600 mb-4">Connect equipment or use Demo Mode.</p>
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 rounded-md mb-4">
                <ToggleSwitch label="Demo Mode" enabled={appState.demoMode} onToggle={handleToggleDemoMode} />
            </div>
            <div className="space-y-3">
                {appState.eventType === 'Throws' && <DevicePanel title="EDM" deviceType="edm" icon={<Target size={20} className="mr-1.5" />} showCalibrateButton={true} />}
                {appState.eventType === 'Horizontal Jumps' && <DevicePanel title="Wind Gauge" deviceType="wind" icon={<Wind size={20} className="mr-1.5" />} />}
                <DevicePanel title="Scoreboard" deviceType="scoreboard" icon={<Speaker size={20} className="mr-1.5" />} />
            </div>
            <BottomNavBar>
                <Button onClick={() => onNavigate('SELECT_EVENT_TYPE')} variant="secondary" icon={ChevronLeft} size="lg">Back</Button>
                <Button onClick={handleNext} icon={ChevronRight} size="lg">Next</Button>
            </BottomNavBar>
        </div>
    );
};

const CalibrateEDMScreen = ({ onNavigate, appState }) => {
    const [calData, setCalData] = useState(null);
    const [status, setStatus] = useState("Loading calibration data...");
    const [isLoading, setIsLoading] = useState(false);
    const deviceType = "edm";

    const UKA_DEFAULTS = { SHOT: 1.0675, DISCUS: 1.250, HAMMER: 1.0675, JAVELIN_ARC: 8.000 };

    // Debug effect to monitor calData changes
    useEffect(() => {
        console.log('DEBUGGING: calData changed:', calData);
    }, [calData]);

    const fetchCal = () => {
        setIsLoading(true);
        GetCalibration(deviceType).then(data => {
            console.log('DEBUGGING: Fetched calibration data:', data);
            if (!data.selectedCircleType) {
                data.selectedCircleType = "SHOT";
                data.targetRadius = UKA_DEFAULTS.SHOT;
            }
            setCalData(data);
            setStatus("Calibration data loaded.");
        }).catch(err => {
            console.error('DEBUGGING: Error fetching calibration:', err);
            setStatus(`Error: ${err}`);
        }).finally(() => setIsLoading(false));
    };

    useEffect(fetchCal, [deviceType]);

    const handleCircleTypeChange = async (selectedType) => {
        console.log('DEBUGGING: Circle type change called with:', selectedType, typeof selectedType);
        
        if (!selectedType || selectedType === '') {
            console.log('DEBUGGING: Empty selection, ignoring');
            return;
        }
        
        const radius = UKA_DEFAULTS[selectedType];
        if (!radius) {
            console.log('DEBUGGING: Invalid circle type:', selectedType);
            return;
        }
        
        console.log('DEBUGGING: Setting circle type to:', selectedType, 'with radius:', radius);
        
        const newCalData = { 
            ...calData, 
            selectedCircleType: selectedType, 
            targetRadius: radius, 
            isCentreSet: false, 
            edgeVerificationResult: null 
        };
        
        console.log('DEBUGGING: New calibration data:', newCalData);
        
        setCalData(newCalData);
        
        try {
            await SaveCalibration(deviceType, newCalData);
            console.log('DEBUGGING: Calibration saved successfully');
        } catch (error) {
            console.error('DEBUGGING: Error saving calibration:', error);
        }
    };

    const handleSetCentre = async () => {
        setIsLoading(true);
        setStatus("Setting centre... Aim at circle centre and wait.");
        try {
            const updatedCal = await SetCircleCentre(deviceType);
            setCalData(updatedCal);
            setStatus("Circle centre has been set.");
        } catch (error) { 
            setStatus(`Error setting centre: ${error}`); 
        }
        setIsLoading(false);
    };

    const handleVerifyEdge = async () => {
        setIsLoading(true);
        setStatus("Verifying edge... Aim at circle edge and wait.");
        try {
            const updatedCal = await VerifyCircleEdge(deviceType);
            setCalData(updatedCal);
            
            // Enhanced status messages based on tolerance check
            if (updatedCal.edgeVerificationResult) {
                const result = updatedCal.edgeVerificationResult;
                const diffMm = Math.abs(result.differenceMm);
                const toleranceMm = result.toleranceAppliedMm;
                
                if (result.isInTolerance) {
                    setStatus(`✅ Edge verification PASSED. Difference: ${diffMm.toFixed(1)}mm (within ±${toleranceMm.toFixed(1)}mm tolerance). Ready to measure.`);
                } else {
                    const advice = diffMm > 50 ? "Recalibrate centre position." : "Remeasure edge or check circle alignment.";
                    setStatus(`❌ Edge verification FAILED tolerance check. Difference: ${diffMm.toFixed(1)}mm (exceeds ±${toleranceMm.toFixed(1)}mm tolerance). ${advice}`);
                }
            } else {
                setStatus("❌ Edge verification failed - no result data received.");
            }
        } catch (error) { 
            setStatus(`❌ Error during edge verification: ${error}`); 
        }
        setIsLoading(false);
    };

    const handleReset = async () => {
        setIsLoading(true);
        setStatus("Resetting calibration...");
        try {
            await ResetCalibration(deviceType);
            fetchCal();
            setStatus("Calibration has been reset.");
        } catch (error) { 
            setStatus(`Error resetting: ${error}`); 
        }
        setIsLoading(false);
    };

    const formatTimestamp = (isoString) => {
        if (!isoString) return "";
        const date = new Date(isoString);
        return date.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' });
    };

    const getEdgeVerificationButtonStyle = (result) => {
        if (!result) return '';
        
        if (result.isInTolerance) {
            const diffMm = Math.abs(result.differenceMm);
            if (diffMm <= 1.0) {
                return 'border-4 border-green-600'; // Excellent - keep blue background
            } else if (diffMm <= 3.0) {
                return 'border-4 border-green-500'; // Good - keep blue background
            } else {
                return 'border-4 border-green-400'; // Acceptable - keep blue background
            }
        } else {
            return 'border-4 border-red-500'; // Failed - keep blue background
        }
    };
    
    if (!calData) return <div className="p-4 text-center">{isLoading ? "Loading..." : status}</div>;

    const isCalibrated = calData.isCentreSet && calData.edgeVerificationResult?.isInTolerance;

    return (
        <div className="p-4 md:p-6 max-w-full mx-auto" style={{ paddingBottom: '80px', maxHeight: 'calc(100vh - 60px)', overflowY: 'auto' }}>
            <h1 className="text-2xl font-bold text-center mb-4 text-gray-800">EDM Calibration</h1>
            
            <div className="space-y-4">
                <div className="p-4 bg-white border rounded-lg shadow-sm">
                    <h3 className="font-semibold text-lg mb-2">Step 1: Select Circle Type</h3>
                    <Select 
                        value={calData.selectedCircleType || ''} 
                        onChange={(value) => {
                            console.log('DEBUGGING: Select onChange called with:', value);
                            handleCircleTypeChange(value);
                        }} 
                        options={Object.keys(UKA_DEFAULTS).map(k => ({ value: k, label: k }))} 
                    />
                    <p className="text-sm text-gray-600">Target Radius: {calData.targetRadius ? calData.targetRadius.toFixed(4) : 'N/A'}m</p>
                    <p className="text-xs text-gray-500">Current Type: {calData.selectedCircleType || 'None'}</p>
                </div>
                <div className={`p-4 bg-white border rounded-lg shadow-sm ${!calData.targetRadius ? 'opacity-50' : ''}`}>
                    <h3 className="font-semibold text-lg mb-2">Step 2: Set Circle Centre</h3>
                    <p className="text-sm text-gray-600 mb-2">Aim EDM at the exact centre of the circle and press the button.</p>
                    <Button onClick={handleSetCentre} icon={Compass} className={`w-full ${calData.isCentreSet ? 'border-4 border-green-500' : ''}`} disabled={!calData.targetRadius || isLoading}>
                        {calData.isCentreSet ? `Centre Set - ${formatTimestamp(calData.timestamp)}` : 'Set Centre'}
                    </Button>
                </div>
                <div className={`p-4 bg-white border rounded-lg shadow-sm ${!calData.isCentreSet ? 'opacity-50' : ''}`}>
                    <h3 className="font-semibold text-lg mb-2">Step 3: Verify Circle Edge</h3>
                    <p className="text-sm text-gray-600 mb-2">Aim EDM at any point on the circle's edge and press the button.</p>
                    <Button 
                        onClick={handleVerifyEdge} 
                        icon={Ruler} 
                        className={`w-full ${getEdgeVerificationButtonStyle(calData.edgeVerificationResult)}`} 
                        disabled={!calData.isCentreSet || isLoading}
                    >
                        <span>Verify Edge</span>
                        {calData.edgeVerificationResult && (
                            <span className="flex items-center ml-2">
                                {calData.edgeVerificationResult.isInTolerance ? 
                                    <CheckCircle size={16} className="text-white"/> : 
                                    <XCircle size={16} className="text-white"/>
                                }
                                <span className="ml-1 text-white">
                                    {Math.abs(calData.edgeVerificationResult.differenceMm).toFixed(1)}mm 
                                    (±{calData.edgeVerificationResult.toleranceAppliedMm.toFixed(1)}mm)
                                </span>
                            </span>
                        )}
                    </Button>
                    
                    {calData.edgeVerificationResult && (
                        <div className={`mt-2 p-2 rounded-md text-sm text-center ${
                            calData.edgeVerificationResult.isInTolerance 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                        }`}>
                            <div className="flex items-center justify-center space-x-2">
                                <span className="font-medium">
                                    {calData.edgeVerificationResult.isInTolerance ? '✅ PASS' : '❌ FAIL'}
                                </span>
                                <span>
                                    {Math.abs(calData.edgeVerificationResult.differenceMm).toFixed(1)}mm difference
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-4 p-2 bg-gray-200 rounded-md text-center text-gray-700 text-sm truncate">Status: {status}</div>
            <BottomNavBar>
                <Button onClick={() => onNavigate('SELECT_DEVICES')} variant="secondary" icon={ChevronLeft} size="lg">Back</Button>
                <div className="flex-grow flex justify-center">
                    {calData.isCentreSet && <Button onClick={handleReset} icon={RotateCcw} size="lg" variant="danger">Reset</Button>}
                </div>
                {isCalibrated ? 
                    <Button onClick={() => onNavigate('STAND_ALONE_MODE')} icon={ChevronRight} size="lg">Next</Button>
                    : <div style={{width: '112px'}}></div>
                }
            </BottomNavBar>
        </div>
    );
};

const StandAloneModeScreen = ({ onNavigate, appState }) => {
    const [measurement, setMeasurement] = useState('');
    const [status, setStatus] = useState('Ready');
    const [isMeasuring, setIsMeasuring] = useState(false);
    const [countdown, setCountdown] = useState(0);

    const isThrows = appState.eventType === 'Throws';
    const isJumps = appState.eventType === 'Horizontal Jumps';

    const handleMeasure = async () => {
        setIsMeasuring(true);
        setStatus('Requesting measurement...');
        try {
            const result = isThrows ? await MeasureThrow("edm") : await handleWindMeasure();
            setMeasurement(result);
            setStatus(`Measurement received: ${result}`);
        } catch (error) {
            const errorMsg = `Error: ${error}`;
            setStatus(errorMsg);
            setMeasurement('');
        }
        setIsMeasuring(false);
    };

    const handleWindMeasure = () => {
        return new Promise((resolve, reject) => {
            setCountdown(5);
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        MeasureWind("wind").then(resolve).catch(reject);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        });
    };

    return (
        <div className="p-4 md:p-6 max-w-full mx-auto flex flex-col h-full">
            <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">MEASUREMENT MODE</h1>
            <p className="text-center text-lg text-gray-600 mb-4">Event Type: <span className="font-semibold">{appState.eventType}</span> {appState.demoMode && <span className="text-yellow-600 font-bold">(DEMO)</span>}</p>
            <div className="flex-grow grid grid-cols-1 gap-6 content-start">
                <div className="bg-white p-4 rounded-lg shadow-md border">
                    <h2 className="text-xl font-semibold text-blue-700 mb-4">Measure</h2>
                    <Button onClick={handleMeasure} disabled={isMeasuring} size="lg" className="w-full">
                        {isMeasuring ? (countdown > 0 ? `Measuring in ${countdown}...` : 'Measuring...') : `Measure ${isThrows ? 'Distance' : 'Wind'}`}
                    </Button>
                    <div className="mt-4 p-4 bg-gray-100 rounded-lg text-center">
                        <p className="text-lg font-medium text-gray-600">{isThrows ? 'Mark:' : 'Wind:'}</p>
                        <p className="text-7xl font-bold text-gray-800 h-24 flex items-center justify-center">{measurement}</p>
                    </div>
                </div>
            </div>
            <div className="mt-6 p-2 bg-gray-200 rounded-md text-center text-gray-700 text-sm truncate">Status: {status}</div>
            <BottomNavBar>
                <Button onClick={() => onNavigate('SELECT_DEVICES')} variant="secondary" icon={ChevronLeft} size="lg">Back</Button>
                {/* Show Heat Map button only for Throws */}
                {isThrows && (
                    <Button onClick={() => onNavigate('HEAT_MAP')} variant="heatmap" icon={TrendingUp} size="lg">Heat Map</Button>
                )}
            </BottomNavBar>
        </div>
    );
};

// ==================================================
// MAIN APP COMPONENT
// ==================================================

export default function App() {
    const [currentScreen, setCurrentScreen] = useState(() => {
        return 'SELECT_EVENT_TYPE';
    });
    
    const [appState, setAppState] = useState(() => {
        const storedSettings = loadStoredAppSettings();
        const storedConnections = loadStoredConnectionDetails();
        
        return {
            eventType: storedSettings.lastEventType,
            demoMode: storedSettings.demoMode,
            devices: {
                edm: { connected: false },
                wind: { connected: false },
                scoreboard: { connected: false }
            },
            connectionDetails: storedConnections
        };
    });

    // Save connection details whenever they change
    useEffect(() => {
        StorageUtils.save(STORAGE_KEYS.CONNECTION_DETAILS, appState.connectionDetails);
    }, [appState.connectionDetails]);

    // Save app settings whenever they change
    useEffect(() => {
        const settings = {
            demoMode: appState.demoMode,
            lastEventType: appState.eventType,
            lastScreen: currentScreen
        };
        StorageUtils.save(STORAGE_KEYS.APP_SETTINGS, settings);
    }, [appState.demoMode, appState.eventType, currentScreen]);

    // Initialize demo mode on startup
    useEffect(() => { 
        SetDemoMode(appState.demoMode); 
    }, []);

    const renderScreen = () => {
        switch (currentScreen) {
            case 'SELECT_EVENT_TYPE': 
                return <SelectEventTypeScreen onNavigate={setCurrentScreen} setAppState={setAppState} />;
            case 'SELECT_DEVICES': 
                return <SelectDevicesScreen onNavigate={setCurrentScreen} appState={appState} setAppState={setAppState} />;
            case 'CALIBRATE_EDM': 
                return <CalibrateEDMScreen onNavigate={setCurrentScreen} appState={appState} setAppState={setAppState} />;
            case 'STAND_ALONE_MODE': 
                return <StandAloneModeScreen onNavigate={setCurrentScreen} appState={appState} setAppState={setAppState} />;
            case 'HEAT_MAP':
                return <HeatMapScreen onNavigate={setCurrentScreen} appState={appState} setAppState={setAppState} />;
            default: 
                return <SelectEventTypeScreen onNavigate={setCurrentScreen} setAppState={setAppState} />;
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            <header className="bg-blue-700 text-white p-2.5 shadow-md sticky top-0 z-40">
                <h1 className="text-lg font-bold text-center">PolyField by KACPH</h1>
            </header>
            <main className="flex-grow overflow-hidden p-1.5 sm:p-2 w-full max-w-full">
                <div className="bg-white shadow-lg rounded-lg h-full overflow-hidden">{renderScreen()}</div>
            </main>
        </div>
    );
}