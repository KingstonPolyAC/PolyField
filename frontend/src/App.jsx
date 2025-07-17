import React, { useState, useEffect } from 'react';
import {
    ChevronLeft, ChevronRight, Wind, Speaker, Target, Power, PowerOff, Compass, CheckCircle, XCircle, Ruler, Wifi, Usb, RotateCcw
} from 'lucide-react';

// Wails Go Function Imports
import {
    ListSerialPorts, ConnectSerialDevice, ConnectNetworkDevice, DisconnectDevice, SetDemoMode,
    GetCalibration, SaveCalibration, SetCircleCentre, VerifyCircleEdge, MeasureThrow, ResetCalibration, SendToScoreboard, MeasureWind
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
            onChange={(e) => onChange(e.target.value)} 
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
            onChange={(e) => onChange(e.target.value)} 
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

    const handleToggleDemoMode = (enabled) => {
        setAppState(prev => ({ ...prev, demoMode: enabled }));
        SetDemoMode(enabled);
    };

    // Persistent connection detail changes
    const handleConnectionDetailChange = (deviceType, field, value) => {
        const currentDetails = appState.connectionDetails[deviceType];
        const newDetails = { ...currentDetails, [field]: value };
        
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
        const details = appState.connectionDetails[deviceType];
        const isConnected = deviceState.connected;

        return (
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-blue-700 mb-2 flex items-center">{icon} {title}</h3>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <Button size="sm" variant={details.type === 'serial' ? 'primary' : 'secondary'} onClick={() => handleConnectionDetailChange(deviceType, 'type', 'serial')} icon={Usb}>Serial</Button>
                    <Button size="sm" variant={details.type === 'network' ? 'primary' : 'secondary'} onClick={() => handleConnectionDetailChange(deviceType, 'type', 'network')} icon={Wifi}>Network</Button>
                </div>
                {details.type === 'serial' && (
                    <Select 
                        value={details.port || ''} 
                        onChange={(value) => handleConnectionDetailChange(deviceType, 'port', value)} 
                        options={serialPorts} 
                        disabled={isConnected || appState.demoMode} 
                    /> 
                )}
                {details.type === 'network' && (
                    <div className="grid grid-cols-2 gap-2">
                        <InputField 
                            label="IP Address" 
                            value={details.ip} 
                            onChange={(value) => handleConnectionDetailChange(deviceType, 'ip', value)} 
                            disabled={isConnected || appState.demoMode} 
                        />
                        <InputField 
                            label="Port" 
                            value={details.tcpPort} 
                            onChange={(value) => handleConnectionDetailChange(deviceType, 'tcpPort', value)} 
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

    const fetchCal = () => {
        setIsLoading(true);
        GetCalibration(deviceType).then(data => {
            if (!data.selectedCircleType) {
                data.selectedCircleType = "SHOT";
                data.targetRadius = UKA_DEFAULTS.SHOT;
            }
            setCalData(data);
            setStatus("Calibration data loaded.");
        }).catch(err => setStatus(`Error: ${err}`)).finally(() => setIsLoading(false));
    };

    useEffect(fetchCal, [deviceType]);

    const handleCircleTypeChange = async (e) => {
        const type = e.target.value;
        const radius = UKA_DEFAULTS[type] || 0;
        const newCalData = { ...calData, selectedCircleType: type, targetRadius: radius, isCentreSet: false, edgeVerificationResult: null };
        setCalData(newCalData);
        await SaveCalibration(deviceType, newCalData);
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
                return 'border-4 border-green-600 bg-green-50'; // Excellent
            } else if (diffMm <= 3.0) {
                return 'border-4 border-green-500 bg-green-50'; // Good
            } else {
                return 'border-4 border-green-400 bg-green-50'; // Acceptable
            }
        } else {
            return 'border-4 border-red-500 bg-red-50'; // Failed
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
                    <Select value={calData.selectedCircleType} onChange={handleCircleTypeChange} options={Object.keys(UKA_DEFAULTS).map(k => ({ value: k, label: k }))} />
                    <p className="text-sm text-gray-600">Target Radius: {calData.targetRadius.toFixed(4)}m</p>
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
                                    <CheckCircle size={16} className="text-green-600"/> : 
                                    <XCircle size={16} className="text-red-600"/>
                                }
                                <span className="ml-1">
                                    {Math.abs(calData.edgeVerificationResult.differenceMm).toFixed(1)}mm 
                                    (±{calData.edgeVerificationResult.toleranceAppliedMm.toFixed(1)}mm)
                                </span>
                            </span>
                        )}
                    </Button>
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
                    : <div style={{width: '112px'}}></div> // Placeholder to balance the layout
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
            </BottomNavBar>
        </div>
    );
};

// ==================================================
// MAIN APP COMPONENT
// ==================================================

export default function App() {
    const [currentScreen, setCurrentScreen] = useState(() => {
        // Optionally restore last screen (comment out if you don't want this)
        // const settings = loadStoredAppSettings();
        // return settings.lastScreen || 'SELECT_EVENT_TYPE';
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