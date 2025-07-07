import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Settings, Wind, TrendingUp, ListChecks, User, Users, Edit3, CheckCircle, XCircle, RefreshCw, BarChart2, Trophy, PlayCircle, StopCircle, Zap, Thermometer, Speaker, ArrowLeftRight, Maximize2, Minimize2, Target, CheckSquare, Square, FileText, Sliders, DownloadCloud, List, EyeOff, Trash2, Filter, Delete, AlertTriangle, Check, RotateCcw, Edit } from 'lucide-react';

// --- API Configuration ---
// These will be updated by the App component's state
let SERVER_IP = 'localhost'; 
let SERVER_PORT = '8080'; 

const getApiBaseUrl = () => `http://${SERVER_IP}:${SERVER_PORT}/api/v1`;
const getWsUrl = () => `ws://${SERVER_IP}:${SERVER_PORT}/ws`;


// --- API Service Functions ---
const apiService = {
  async getEvents() {
    const url = `${getApiBaseUrl()}/events`;
    console.log(`[ApiService] GET ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status} at ${url}`);
      const data = await response.json();
      console.log(`[ApiService] Response from GET ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`[ApiService] Error fetching events from ${url}:`, error);
      throw error;
    }
  },
  async getEventById(eventId) {
    const url = `${getApiBaseUrl()}/events/${eventId}`;
    console.log(`[ApiService] GET ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status} at ${url}`);
      const data = await response.json();
      console.log(`[ApiService] Response from GET ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`[ApiService] Error fetching event ${eventId} from ${url}:`, error);
      throw error;
    }
  },
  async getAthletesForEvent(eventId) {
    const url = `${getApiBaseUrl()}/events/${eventId}/athletes`;
    console.log(`[ApiService] GET ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status} at ${url}`);
      const data = await response.json();
      console.log(`[ApiService] Response from GET ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`[ApiService] Error fetching athletes for event ${eventId} from ${url}:`, error);
      throw error;
    }
  },
  async getDevices() {
    const url = `${getApiBaseUrl()}/devices`;
    console.log(`[ApiService] GET ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status} at ${url}`);
      const data = await response.json();
      console.log(`[ApiService] Response from GET ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`[ApiService] Error fetching devices from ${url}:`, error);
      throw error;
    }
  },
  async getCalibrationData(eventId, deviceId) {
    const url = `${getApiBaseUrl()}/calibration/${eventId}/${deviceId}`;
    console.log(`[ApiService] GET ${url}`);
    try {
      const response = await fetch(url);
      if (response.status === 404) {
        console.log(`[ApiService] No calibration data found for ${eventId}/${deviceId} (404)`);
        return null;
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status} at ${url}`);
      const data = await response.json();
      console.log(`[ApiService] Response from GET ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`[ApiService] Error fetching calibration for ${eventId}/${deviceId} from ${url}:`, error);
      throw error;
    }
  },
  async updateCalibrationData(eventId, deviceId, calibrationData) {
    const url = `${getApiBaseUrl()}/calibration/${eventId}/${deviceId}`;
    console.log(`[ApiService] PUT ${url} with data:`, calibrationData);
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(calibrationData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.error || `Failed to update calibration: ${response.statusText} (URL: ${url})`);
      }
      const data = await response.json();
      console.log(`[ApiService] Response from PUT ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`[ApiService] Error updating calibration at ${url}:`, error);
      throw error;
    }
  },
  async measureAndRecordEDM(eventId, deviceId, payload) {
    const url = `${getApiBaseUrl()}/events/${eventId}/devices/${deviceId}/measure-record-edm`;
    console.log(`[ApiService] POST ${url} with payload:`, payload);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
          throw new Error(errorData.error || `Failed to measure/record EDM: ${response.statusText} (URL: ${url})`);
      }
      const data = await response.json(); 
      console.log(`[ApiService] Response from POST ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`[ApiService] Error in measureAndRecordEDM at ${url}:`, error);
      throw error;
    }
  },
  async updateAthleteCheckIn(athleteId, eventId, checkedIn) {
    const url = `${getApiBaseUrl()}/athlete/${athleteId}/checkin?eventId=${eventId}`;
    console.log(`[ApiService] POST ${url} with payload:`, { checkedIn });
    try {
      const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json'},
          body: JSON.stringify({ checkedIn })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status} at ${url}`);
      const data = await response.json();
      console.log(`[ApiService] Response from POST ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`[ApiService] Error updating check-in at ${url}:`, error);
      throw error;
    }
  },
  async savePerformance(eventId, athleteId, performanceData) {
    const url = `${getApiBaseUrl()}/event/${eventId}/athlete/${athleteId}/performance`;
    console.log(`[ApiService] POST ${url} with payload:`, performanceData);
    try {
      const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json'},
          body: JSON.stringify(performanceData)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status} at ${url}`);
      const data = await response.json();
      console.log(`[ApiService] Response from POST ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`[ApiService] Error saving performance at ${url}:`, error);
      throw error;
    }
  },
  async establishCircleCentre(eventId, deviceId, payload) {
    const url = `${getApiBaseUrl()}/calibration/${eventId}/${deviceId}/establish-centre`;
    console.log(`[ApiService] POST ${url} with payload:`, payload);
    try {
      const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload) 
      });
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
          throw new Error(errorData.error || `Failed to establish circle centre: ${response.statusText} (URL: ${url})`);
      }
      const data = await response.json();
      console.log(`[ApiService] Response from POST ${url}:`, data);
      return data; 
    } catch (error) {
      console.error(`[ApiService] Error establishing circle centre at ${url}:`, error);
      throw error;
    }
  },
  async triggerServerEDMRead(deviceId, measurementContextPayload) {
    const url = `${getApiBaseUrl()}/devices/${deviceId}/trigger-calibration-read`;
    console.log(`[ApiService] POST ${url} with payload:`, measurementContextPayload);
    try {
      const response = await fetch(url, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(measurementContextPayload) 
      });
      if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
          throw new Error(errorData.error || `Failed to trigger EDM read: ${response.statusText} (URL: ${url})`);
      }
      const data = await response.json();
      console.log(`[ApiService] Response from POST ${url}:`, data);
      return data; 
    } catch (error) {
      console.error(`[ApiService] Error triggering server EDM read at ${url}:`, error);
      throw error;
    }
  },
};


// UKA Standard Radii (in meters)
const UKA_RADII = {
    SHOT: 1.0675,
    DISCUS: 1.25,
    HAMMER: 1.0675,
    JAVELIN_ARC: 8.00,
    CUSTOM: 0, 
};

// Function to get edge tolerance based on circle type
const getEdgeTolerance = (circleType) => {
    if (circleType === 'JAVELIN_ARC') {
        return 0.010; 
    }
    return 0.005; 
};

// Mock data for initial device list population if API fails in SelectDevicesScreen
const MOCK_DISCOVERED_EDMS = [{ id: 'edm1', name: 'Leica EDM Pro', ipAddress: '192.168.0.10', port: 10001, type: 'EDM' }, { id: 'edm2', name: 'Topcon EDM Lite', ipAddress: '192.168.0.11', port: 10002, type: 'EDM' }];
const MOCK_DISCOVERED_WINDGAUGES = [{ id: 'wg1', name: 'Gill WindSonic', ipAddress: '192.168.0.20', port: 20001, type: 'WindGauge' }, { id: 'wg2', name: 'Davis Anemometer', ipAddress: '192.168.0.21', port: 20002, type: 'WindGauge' }];
const MOCK_DISCOVERED_SCOREBOARDS = [{ id: 'sb1', name: 'Daktronics LED', ipAddress: '192.168.0.30', port: 30001, type: 'Scoreboard' }, { id: 'sb2', name: 'Omega Display', ipAddress: '192.168.0.31', port: 30002, type: 'Scoreboard' }];


// Helper component for consistent card styling
const Card = ({ children, onClick, className = '', disabled = false, selected = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`border-2 ${selected ? 'border-blue-500 ring-2 ring-blue-400' : 'border-gray-300 hover:border-blue-400'} bg-white text-gray-800 font-semibold p-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 ease-in-out flex flex-col items-center justify-center text-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`} 
  >
    {children}
  </button>
);

// Helper component for consistent button styling
const Button = ({ children, onClick, variant = 'primary', className = '', icon: Icon, disabled = false, size = 'md' }) => {
  const baseStyle = 'rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 ease-in-out flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-95'; 
  let variantStyle = '';
  let sizeStyle = '';

  switch (size) {
    case 'sm':
      sizeStyle = 'px-4 py-2 text-base'; 
      break;
    case 'lg':
      sizeStyle = 'px-8 py-4 text-xl'; 
      break;
    default: // md
      sizeStyle = 'px-6 py-3 text-lg'; 
  }

  switch (variant) {
    case 'secondary':
      variantStyle = 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-400';
      break;
    case 'danger':
      variantStyle = 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500';
      break;
    case 'success':
      variantStyle = 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-400';
      break;
    default: // primary
      variantStyle = 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500';
  }
  return (
    <button onClick={onClick} className={`${baseStyle} ${variantStyle} ${sizeStyle} ${className}`} disabled={disabled}>
      {Icon && <Icon size={size === 'sm' ? 20 : (size === 'lg' ? 24 : 22)} className={children ? "mr-2" : ""} />} 
      {children && <span className="truncate max-w-[120px] sm:max-w-[180px]">{children}</span>} 
    </button>
  );
};

// Helper component for input fields
const InputField = ({ label, type = 'text', value, onChange, placeholder, className = '', min, max, step, readOnly = false, onClick }) => (
  <div className={`mb-3 ${className}`}> 
    {label && <label className="block text-base font-medium text-gray-700 mb-1">{label}</label>} 
    <input
      type={type}
      value={value}
      onChange={onChange}
      onClick={onClick}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      readOnly={readOnly}
      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" 
      disabled={readOnly}
    />
  </div>
);

const Select = ({ label, value, onChange, options, className = '' }) => (
    <div className={`mb-3 ${className}`}> 
        {label && <label className="block text-base font-medium text-gray-700 mb-1">{label}</label>}
        <select
            value={value}
            onChange={onChange}
            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
        >
            <option value="">-- Select --</option>
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);

// Bottom Navigation Bar Component
const BottomNavBar = ({ children }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-100 p-3 border-t border-gray-300 shadow-top z-30 flex justify-between items-center"> 
            {children}
        </div>
    );
};

// Number Keypad Component
const NumberKeypad = ({ currentValue, onKeyPress, onBackspace, onClear, onEnter, onClose }) => {
    const keys = [
        '1', '2', '3',
        '4', '5', '6',
        '7', '8', '9',
        '.', '0'
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-4 rounded-lg shadow-2xl w-full max-w-sm"> 
                <div className="bg-gray-100 p-3 rounded-md mb-4 text-right text-3xl font-mono min-h-[50px]"> 
                    {currentValue || <span className="text-gray-400">0</span>}
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3"> 
                    {keys.map((key) => (
                        <Button
                            key={key}
                            onClick={() => onKeyPress(key)}
                            variant="secondary"
                            size="lg" 
                            className="text-2xl aspect-square !p-0"
                        >
                            {key}
                        </Button>
                    ))}
                     <Button
                        onClick={onBackspace}
                        variant="secondary"
                        size="lg"
                        className="text-2xl aspect-square !p-0"
                        icon={Delete}
                    />
                </div>
                <div className="grid grid-cols-2 gap-3"> 
                    <Button onClick={onClear} variant="danger" size="lg">Clear</Button>
                    <Button onClick={onEnter} variant="success" size="lg">Enter</Button>
                </div>
                 <Button onClick={onClose} variant="secondary" size="md" className="w-full mt-3">Close</Button>
            </div>
        </div>
    );
};

// SVG Circle for Calibration Visual
const CalibrationCircleVisual = ({ radiusSet, centreSet, edgeMeasured, checkMarkSet }) => {
    const viewBoxSize = 140; 
    const circleRadius = 50; 
    const centerX = viewBoxSize / 2;
    const centerY = viewBoxSize / 2;
    const sectorAngle = 34.92 * (Math.PI / 180); 
    const halfSectorAngle = sectorAngle / 2;
    const sectorLineLength = viewBoxSize * 0.55; 

    const line1X = centerX + sectorLineLength * Math.sin(-halfSectorAngle);
    const line1Y = centerY - sectorLineLength * Math.cos(-halfSectorAngle);
    const line2X = centerX + sectorLineLength * Math.sin(halfSectorAngle);
    const line2Y = centerY - sectorLineLength * Math.cos(halfSectorAngle);

    const checkMarkDistance = circleRadius * 1.2; 
    const checkMarkX = centerX; 
    const checkMarkY = centerY - checkMarkDistance; 


    return (
        <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="w-full h-auto max-w-[200px] md:max-w-[240px] mx-auto"> 
            {radiusSet && (
                <>
                    <line x1={centerX} y1={centerY} x2={line1X} y2={line1Y} stroke="lightcoral" strokeWidth="1.5" />
                    <line x1={centerX} y1={centerY} x2={line2X} y2={line2Y} stroke="lightcoral" strokeWidth="1.5" />
                </>
            )}
            <circle
                cx={centerX}
                cy={centerY}
                r={circleRadius}
                stroke={edgeMeasured ? "blue" : (radiusSet ? "black" : "lightgray")}
                strokeWidth="2" 
                fill="rgba(200, 200, 255, 0.1)" 
            />
            {radiusSet && (
                <circle
                    cx={centerX}
                    cy={centerY}
                    r="3" 
                    fill={centreSet ? "green" : "black"}
                />
            )}
            {checkMarkSet && (
                 <>
                    <line x1={checkMarkX - 5} y1={checkMarkY - 5} x2={checkMarkX + 5} y2={checkMarkY + 5} stroke="red" strokeWidth="2" /> 
                    <line x1={checkMarkX + 5} y1={checkMarkY - 5} x2={checkMarkX - 5} y2={checkMarkY + 5} stroke="red" strokeWidth="2" />
                </>
            )}
        </svg>
    );
};


// Screen 1: Select Event Type
const SelectEventTypeScreen = ({ onNavigate, appState, setAppState, serverIP, serverPort, handleServerIPChange, handleServerPortChange }) => {
  const eventTypes = [
    { name: 'Throws', icon: <Maximize2 size={44} className="mb-2 text-blue-600" />, description: "Javelin, Shot Put, etc." }, 
    { name: 'Vertical Jumps', icon: <ArrowLeftRight size={44} className="mb-2 text-gray-400 transform rotate-90" />, description: "High Jump, Pole Vault", disabled: true },
    { name: 'Horizontal Jumps', icon: <ArrowLeftRight size={44} className="mb-2 text-blue-600" />, description: "Long Jump, Triple Jump" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-full mx-auto flex flex-col" style={{ height: 'calc(100vh - 60px)'}}> 
      <div className="mb-4 p-3 bg-gray-100 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-700 mb-2 text-center">Server Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField
                label="Server IP Address:"
                type="text"
                value={serverIP}
                onChange={handleServerIPChange}
                placeholder="e.g., 192.168.1.100"
            />
            <InputField
                label="Server Port:"
                type="number"
                value={serverPort}
                onChange={handleServerPortChange}
                placeholder="e.g., 8080"
            />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-center mb-4 text-gray-800">SELECT EVENT TYPE</h1> 
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 flex-grow content-start"> 
        {eventTypes.map((event) => (
          <Card 
            key={event.name} 
            onClick={() => {
              if (event.disabled) return;
              setAppState(prev => ({ 
                ...prev, 
                eventType: event.name,
                devices: { edm: null, windGauge: null, scoreboard: null },
                eventModeConfig: { ...prev.eventModeConfig, selectedEventId: null, attempts: 6, cut: 8, reorder: false },
                athletes: [], 
                calibrationData: { 
                    selectedCircleType: event.name === 'Throws' ? 'SHOT' : '', 
                    targetRadius: UKA_RADII.SHOT,
                    isCentreSet: false, isEdgeMeasured: false, edgeMeasurement: null, edgeDifference: null,
                    isEdgeInTolerance: false, checkMarkStartValue: null, calibrationStep: 1,
                }
              }));
              onNavigate('SELECT_EVENT_MODE');
            }} 
            className="h-52 sm:h-64" 
            disabled={event.disabled}
          >
            {event.icon}
            <span className="text-xl md:text-2xl mt-2.5">{event.name}</span> 
            <p className="text-base text-gray-600 mt-2">{event.description}</p> 
            {event.disabled && <span className="text-sm text-orange-500 font-semibold mt-1.5">Coming Soon</span>}
          </Card>
        ))}
      </div>
    </div>
  );
};

// Screen 2: Select Event Mode
const SelectEventModeScreen = ({ onNavigate, appState, setAppState }) => {
  const [attempts, setAttempts] = useState(appState.eventModeConfig?.attempts || 6); 
  const [cut, setCut] = useState(appState.eventModeConfig?.cut || 8);
  const [reorder, setReorder] = useState(appState.eventModeConfig?.reorder || false);
  const [localEvents, setLocalEvents] = useState([]); 
  
  const [selectedPopulatedEventId, setSelectedPopulatedEventId] = useState(() => {
    const initialSelectedId = appState.eventModeConfig?.selectedEventId;
    if (localEvents.length > 0) {
        const currentEvent = localEvents.find(e => e.id === initialSelectedId); 
        if (currentEvent) { 
            return initialSelectedId;
        }
    }
    return ''; 
  });


  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsData = await apiService.getEvents();
        console.log("[SelectEventModeScreen] Fetched events from server:", eventsData);
        setLocalEvents(eventsData || []);
        const initialSelectedId = appState.eventModeConfig?.selectedEventId;
        if (initialSelectedId) {
            const currentEvent = (eventsData || []).find(e => e.id === initialSelectedId);
            if (currentEvent) { 
                setSelectedPopulatedEventId(initialSelectedId);
            } else {
                setSelectedPopulatedEventId(''); 
            }
        }

      } catch (error) {
        console.error("Error fetching events:", error);
        setModalMessage(`Error fetching events: ${error.message}`);
        setShowModal(true);
        setLocalEvents([]); 
      }
    };
    fetchEvents();
  }, [appState.eventModeConfig?.selectedEventId]); 

  const handleModeSelection = async (mode) => {
    if (mode === 'populated' && !selectedPopulatedEventId) {
        setModalMessage("Please select a pre-populated event.");
        setShowModal(true);
        return;
    }
    const eventConfigForMode = mode === 'populated' 
        ? { attempts, cut, reorder, selectedEventId: selectedPopulatedEventId } 
        : { attempts:6, cut:8, reorder:false, selectedEventId: null};
    
    let athletesForEvent = [];
    if (mode === 'populated' && selectedPopulatedEventId) {
        try {
            athletesForEvent = await apiService.getAthletesForEvent(selectedPopulatedEventId);
            console.log("[SelectEventModeScreen] Fetched athletes for event:", selectedPopulatedEventId, athletesForEvent);
        } catch (error) {
            console.error("Error fetching athletes:", error);
            setModalMessage(`Error fetching athletes: ${error.message}`);
            setShowModal(true);
            athletesForEvent = [];
        }
    }
    
    setAppState(prev => ({ 
        ...prev, 
        eventMode: mode, 
        eventModeConfig: eventConfigForMode, 
        athletes: athletesForEvent 
    }));
    onNavigate('SELECT_DEVICES');
  };
  
  const populatedEventOptions = localEvents 
    .map(event => ({ value: event.id, label: event.name })); 

  const Modal = ({ message, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white p-5 rounded-lg shadow-xl max-w-xs w-full">
            <h3 className="text-base font-semibold mb-3 text-gray-800">Notification</h3>
            <p className="text-xs text-gray-600 mb-4">{message}</p>
            <Button onClick={onClose} className="w-full" size="md">OK</Button>
        </div>
    </div>
  );

  return (
    <>
    <div className="p-3 md:p-4 max-w-full mx-auto" style={{ paddingBottom: '80px', maxHeight: 'calc(100vh - 60px)', overflowY: 'auto' }}> 
      {showModal && <Modal message={modalMessage} onClose={() => setShowModal(false)} />}
      <h1 className="text-2xl font-bold text-center mb-4 text-gray-800">SELECT EVENT MODE</h1>
      <p className="text-center text-base text-gray-600 mb-3">Event Type: <span className="font-semibold">{appState.eventType || 'N/A'}</span></p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start"> 
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200"> 
          <h2 className="text-xl font-semibold text-blue-700 mb-2 text-center">Populated Events</h2> 
          {populatedEventOptions.length > 0 ? (
            <>
              <Select 
                label="Select Pre-populated Event:"
                value={selectedPopulatedEventId}
                onChange={(e) => {
                    setSelectedPopulatedEventId(e.target.value);
                }}
                options={populatedEventOptions}
              />
              <InputField
                label="Attempts (default 6):" type="number" value={attempts}
                onChange={(e) => setAttempts(Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))} min="1" max="6"
              />
              <InputField
                label="Cut (No. to remain after 3 rounds):" type="number" value={cut}
                onChange={(e) => setCut(Math.max(0, parseInt(e.target.value) || 0))} min="0"
              />
              <div className="flex items-center my-2.5"> 
                <input type="checkbox" id="reorder" checked={reorder} onChange={(e) => setReorder(e.target.checked)}
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
                />
                <label htmlFor="reorder" className="ml-2.5 block text-base text-gray-700">Re-order for final rounds</label> 
              </div>
              <Button onClick={() => handleModeSelection('populated')} className="w-full mt-2" icon={DownloadCloud} disabled={!selectedPopulatedEventId} size="lg">
                Use Selected Event
              </Button>
            </>
          ) : (
            <p className="text-base text-gray-500 text-center py-4">No pre-populated events found. You can use Stand Alone Mode.</p>
          )}
        </div>

        <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center justify-center min-h-[250px]"> 
          <h2 className="text-xl font-semibold text-blue-700 mb-2 text-center">Stand Alone Mode</h2>
          <Card onClick={() => handleModeSelection('standalone')} className="w-48 h-40"> 
            <RefreshCw size={40} className="mb-1.5 text-blue-600" />
            <span className="text-xl">Activate</span>
          </Card>
        </div>
      </div>
    </div>
    <BottomNavBar>
        <Button onClick={() => onNavigate('SELECT_EVENT_TYPE')} variant="secondary" icon={ChevronLeft} size="lg">
          Back
        </Button>
    </BottomNavBar>
    </>
  );
};

// Screen 3: Select Devices
const SelectDevicesScreen = ({ onNavigate, appState, setAppState }) => {
  const [localDiscoveredDevices, setLocalDiscoveredDevices] = useState({ edm: [], windGauge: [], scoreboard: [] });

  useEffect(() => {
    const fetchDevices = async () => {
        try {
            // Use mock data if API call fails or for offline development
            const devicesFromServer = await apiService.getDevices().catch(err => {
                console.warn("API call to getDevices failed, using mock device data:", err);
                return [
                    ...MOCK_DISCOVERED_EDMS, 
                    ...MOCK_DISCOVERED_WINDGAUGES, 
                    ...MOCK_DISCOVERED_SCOREBOARDS
                ];
            });
            const edms = devicesFromServer.filter(d => d.type === 'EDM');
            const wgs = devicesFromServer.filter(d => d.type === 'WindGauge');
            const sbs = devicesFromServer.filter(d => d.type === 'Scoreboard');
            setLocalDiscoveredDevices({ edm: edms, windGauge: wgs, scoreboard: sbs });
        } catch (error) { 
            console.error("Error fetching devices (outer catch):", error);
            setLocalDiscoveredDevices({ 
                edm: MOCK_DISCOVERED_EDMS, 
                windGauge: MOCK_DISCOVERED_WINDGAUGES, 
                scoreboard: MOCK_DISCOVERED_SCOREBOARDS 
            });
        }
    };
    fetchDevices();
  }, []);


  const isThrowsEvent = appState.eventType === 'Throws';
  const isHorizontalJumpsEvent = appState.eventType === 'Horizontal Jumps';

  const handleSelect = (deviceType, device) => { 
    setAppState(prev => ({
      ...prev,
      devices: {
        ...prev.devices,
        [deviceType]: prev.devices[deviceType]?.id === device?.id ? null : device,
      }
    }));
  };

  const DeviceCategory = ({ title, devices, selectedDevice, onSelect, icon }) => {
    return (
    <div className="bg-gray-50 p-3 rounded-lg shadow-sm border border-gray-200"> 
      <h3 className="text-lg font-semibold text-blue-700 mb-2 flex items-center">{icon} {title}</h3> 
      {devices.length > 0 ? (
        <ul className="space-y-2"> 
          {devices.map(device => (
            <li key={device.id}>
              <button
                onClick={() => onSelect(device)} 
                className={`w-full text-left p-3 rounded-lg border text-base transition-colors ${selectedDevice?.id === device.id ? 'bg-blue-500 text-white border-blue-600 ring-2 ring-blue-300' : 'bg-white hover:bg-blue-50 border-gray-300'}`} 
              >
                {device.name} ({device.ipAddress}:{device.port})
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-gray-500">No {title.toLowerCase()} discovered/configured.</p>}
    </div>
  )};
  
  const availableDeviceCategories = [
    !isHorizontalJumpsEvent && { key: 'edm', title: 'EDM', devices: localDiscoveredDevices.edm, selected: appState.devices.edm, onSelect: (dev) => handleSelect('edm', dev), icon: <Target size={20} className="mr-1.5"/> },
    !isThrowsEvent && { key: 'wind', title: 'Wind Gauge', devices: localDiscoveredDevices.windGauge, selected: appState.devices.windGauge, onSelect: (dev) => handleSelect('windGauge', dev), icon: <Wind size={20} className="mr-1.5"/> },
    { key: 'sb', title: 'Scoreboard', devices: localDiscoveredDevices.scoreboard, selected: appState.devices.scoreboard, onSelect: (dev) => handleSelect('scoreboard', dev), icon: <Speaker size={20} className="mr-1.5"/> }
  ].filter(Boolean); 


  return (
    <>
    <div className="p-3 md:p-4 max-w-full mx-auto" style={{ paddingBottom: '80px', maxHeight: 'calc(100vh - 60px)', overflowY: 'auto' }}> 
      <h1 className="text-2xl font-bold text-center mb-3 text-gray-800">SELECT DEVICES</h1>
      <p className="text-center text-base text-gray-600 mb-4">Select measurement and display devices.</p>
      <div className={`grid grid-cols-1 ${availableDeviceCategories.length === 3 ? 'sm:grid-cols-3' : (availableDeviceCategories.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1')} gap-4 mb-4`}> 
        {availableDeviceCategories.map(cat => (
            <DeviceCategory key={cat.key} title={cat.title} devices={cat.devices} selectedDevice={cat.selected} onSelect={cat.onSelect} icon={cat.icon} />
        ))}
      </div>
    </div>
    <BottomNavBar>
        <Button onClick={() => onNavigate('SELECT_EVENT_MODE')} variant="secondary" icon={ChevronLeft} size="lg">Back</Button>
        <Button onClick={() => onNavigate('CALIBRATE_TEST_DEVICES')} icon={ChevronRight} size="lg">Next</Button>
    </BottomNavBar>
    </>
  );
};

// Screen 4: Calibrate & Test Devices
const CalibrateTestDevicesScreen = ({ onNavigate, appState, setAppState }) => {
    const [windTestResult, setWindTestResult] = useState('');
    const [isTestingWind, setIsTestingWind] = useState(false);
    const [windCountdown, setWindCountdown] = useState(0);
    const [scoreboardTestValue, setScoreboardTestValue] = useState('1234');
    const [scoreboardStatus, setScoreboardStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [isCalibratingEDM, setIsCalibratingEDM] = useState(false); 

    const calibrationData = appState.calibrationData || {};
    const {
        selectedCircleType = 'SHOT', 
        targetRadius = UKA_RADII[selectedCircleType] || UKA_RADII.SHOT,
        isCentreSet = calibrationData.isCentreReferenceEstablished === true, 
        isEdgeMeasured = calibrationData.isEdgeMeasured || false, 
        edgeMeasurement = calibrationData.edgeMeasurement || null,
        edgeDifference = calibrationData.edgeDifference || null,
        isEdgeInTolerance = calibrationData.isEdgeInTolerance || false,
        checkMarkStartValue = calibrationData.checkMarkStartValue || null,
        calibrationStep = calibrationData.isCentreReferenceEstablished ? (calibrationData.isEdgeMeasured ? 3 : 2) : 1,
    } = calibrationData;

    // Log to see initial values and how they change
    useEffect(() => {
        console.log("[CalibrateTestDevicesScreen] Initial or Updated calibrationData in appState:", appState.calibrationData);
        console.log("[CalibrateTestDevicesScreen] Derived isCentreSet:", isCentreSet, "derived calibrationStep:", calibrationStep);
    }, [appState.calibrationData, isCentreSet, calibrationStep]);


    const isThrowsEvent = appState.eventType === 'Throws';

    const updateCalibrationDataAndSave = async (newData) => {
        const currentEventId = appState.eventModeConfig?.selectedEventId || 'global_throws'; 
        const currentDeviceId = appState.devices.edm?.id;

        if (!currentDeviceId) {
            console.error("No EDM device selected for calibration update.");
            setModalMessage("EDM device not selected. Cannot save calibration.");
            setShowModal(true);
            return;
        }
        
        const baseCalibrationData = appState.calibrationData || { 
            selectedCircleType: 'SHOT', 
            targetRadius: UKA_RADII.SHOT, 
            isCentreSet: false, 
            isCentreReferenceEstablished: false,
            isEdgeMeasured: false,
            calibrationStep: 1 
        };
        
        const updatedCalData = {
            ...baseCalibrationData,
            ...newData, 
            eventId: currentEventId, 
            deviceId: currentDeviceId 
        };

        console.log("[CalibrateTestDevicesScreen] updateCalibrationDataAndSave - updatedCalData to be set:", updatedCalData);

        setAppState(prev => ({
            ...prev,
            calibrationData: updatedCalData
        }));
        try {
            await apiService.updateCalibrationData(updatedCalData.eventId, updatedCalData.deviceId, updatedCalData);
            console.log("Calibration data saved to server.");
        } catch (error) {
            console.error("Failed to save calibration data to server:", error);
            setModalMessage(`Failed to save calibration: ${error.message}`);
            setShowModal(true);
        }
    };


    useEffect(() => { 
        const loadInitialCalibration = async () => {
            if (isThrowsEvent && appState.devices.edm?.id && (appState.eventModeConfig.selectedEventId || appState.eventMode === 'standalone')) {
                const eventKey = appState.eventModeConfig.selectedEventId || 'global_throws'; 
                try {
                    console.log(`[CalibrateTestDevicesScreen] Loading initial calibration for event: ${eventKey}, device: ${appState.devices.edm.id}`);
                    const existingCal = await apiService.getCalibrationData(eventKey, appState.devices.edm.id);
                    if (existingCal) {
                        console.log("[CalibrateTestDevicesScreen] Loaded existing calibration:", existingCal);
                        const clientFriendlyCalData = {
                            ...existingCal,
                            isCentreSet: existingCal.isCentreReferenceEstablished === true,
                            calibrationStep: existingCal.isCentreReferenceEstablished ? (existingCal.isEdgeMeasured ? 3 : 2) : 1, 
                        };
                        setAppState(prev => ({...prev, calibrationData: clientFriendlyCalData})); 
                    } else if (!appState.calibrationData || !appState.calibrationData.selectedCircleType) { 
                        console.log("[CalibrateTestDevicesScreen] No existing calibration, initializing and saving defaults.");
                        updateCalibrationDataAndSave({ 
                            selectedCircleType: 'SHOT', 
                            targetRadius: UKA_RADII.SHOT,
                            isCentreSet: false, isEdgeMeasured: false, edgeMeasurement: null, edgeDifference: null, isEdgeInTolerance: false,
                            checkMarkStartValue: null, calibrationStep: 1, isCentreReferenceEstablished: false,
                        });
                    }
                } catch (error) {
                    console.error("Error loading initial calibration data:", error);
                    setModalMessage(`Error loading calibration: ${error.message}`); // Show modal on load error
                    setShowModal(true);
                    if (!appState.calibrationData || !appState.calibrationData.selectedCircleType) {
                         updateCalibrationDataAndSave({
                            selectedCircleType: 'SHOT', 
                            targetRadius: UKA_RADII.SHOT,
                            isCentreSet: false, isEdgeMeasured: false, edgeMeasurement: null, edgeDifference: null, isEdgeInTolerance: false,
                            checkMarkStartValue: null, calibrationStep: 1, isCentreReferenceEstablished: false,
                        });
                    }
                }
            }
        };
        loadInitialCalibration();
    }, [isThrowsEvent, appState.devices.edm?.id, appState.eventModeConfig.selectedEventId, appState.eventMode]);


    const handleCircleTypeChange = (e) => {
        const type = e.target.value;
        updateCalibrationDataAndSave({
            selectedCircleType: type, targetRadius: UKA_RADII[type] || 0,
            isCentreSet: false, isEdgeMeasured: false, edgeMeasurement: null, edgeDifference: null, isEdgeInTolerance: false,
            calibrationStep: 1, isCentreReferenceEstablished: false, 
        });
    };

    const handleTargetRadiusChange = (e) => {
        const radius = parseFloat(e.target.value);
        if (!isNaN(radius)) {
            updateCalibrationDataAndSave({ targetRadius: radius });
        }
    };

    const handleSetCentre = async () => {
        if (!appState.devices.edm?.id) {
            setModalMessage("EDM device not selected."); setShowModal(true); return;
        }
        const currentEventId = appState.eventModeConfig?.selectedEventId || 'global_throws';
        setIsCalibratingEDM(true);
        setModalMessage("Sighting EDM on Circle Centre..."); 
        setShowModal(true);
        try {
            const serverResponse = await apiService.establishCircleCentre(
                currentEventId, 
                appState.devices.edm.id, 
                { edmZeroReferenceHAR: 0.0 } // Example payload
            );
            console.log("[CalibrateTestDevicesScreen] Server response from establishCircleCentre:", serverResponse);
            
            const clientSideIsCentreSet = serverResponse.isCentreReferenceEstablished === true;
            const newCalibrationStep = clientSideIsCentreSet ? 2 : 1;

            setAppState(prev => ({ 
                ...prev,
                calibrationData: {
                    ...(prev.calibrationData || {}), 
                    ...serverResponse, 
                    isCentreSet: clientSideIsCentreSet, // Update client-side isCentreSet based on server
                    calibrationStep: newCalibrationStep 
                }
            }));
            
            if (clientSideIsCentreSet) {
                setModalMessage("Circle centre reference established with EDM.");
            } else {
                setModalMessage("Failed to establish centre reference. Server response: " + JSON.stringify(serverResponse));
            }

        } catch (error) {
            console.error("Error setting centre reference:", error);
            setModalMessage(`Error establishing centre: ${error.message}`);
        }
        setIsCalibratingEDM(false);
    };

    const retrySetCentre = () => {
        updateCalibrationDataAndSave({ isCentreSet: false, isCentreReferenceEstablished: false, calibrationStep: 1, isEdgeMeasured: false, edgeMeasurement: null, edgeDifference: null, isEdgeInTolerance: false, checkMarkStartValue: null });
    };


    const handleMeasureEdge = async () => {
        if (!appState.devices.edm?.id) {
            setModalMessage("EDM device not selected."); setShowModal(true); return;
        }
        setIsCalibratingEDM(true);
        setModalMessage("Sighting EDM on Circle Edge & Measuring..."); setShowModal(true);
        try {
            const response = await apiService.triggerServerEDMRead(appState.devices.edm.id, { context: "edge_measurement" });
            const measuredValueString = String(response.value).replace(/\s*m$/, '') || "0"; 
            const measured = parseFloat(measuredValueString);

            if (isNaN(measured)) throw new Error("Invalid measurement value received from EDM.");

            const currentTargetRadius = appState.calibrationData?.targetRadius || UKA_RADII[selectedCircleType] || 0;
            const diff = measured - currentTargetRadius;
            const currentTolerance = getEdgeTolerance(selectedCircleType);
            const inTolerance = Math.abs(diff) <= currentTolerance;
            
            updateCalibrationDataAndSave({
                isEdgeMeasured: true, edgeMeasurement: measured.toFixed(3), edgeDifference: diff.toFixed(3), isEdgeInTolerance: inTolerance, calibrationStep: 3,
            });
            setModalMessage(`Edge: ${measured.toFixed(3)}m. Diff: ${(diff*1000).toFixed(1)}mm. ${inTolerance ? 'In tolerance.' : 'OUT OF TOLERANCE.'}`);
        } catch (error) {
            console.error("Error measuring edge:", error);
            setModalMessage(`Error measuring edge: ${error.message}`);
        }
        setIsCalibratingEDM(false);
    };
    const retryMeasureEdge = () => {
        updateCalibrationDataAndSave({ isEdgeMeasured: false, edgeMeasurement: null, edgeDifference: null, isEdgeInTolerance: false, calibrationStep: 2 });
    };
    
    const handleMeasureCheckMark = async () => {
        if (!appState.devices.edm?.id) {
            setModalMessage("EDM device not selected."); setShowModal(true); return;
        }
        setIsCalibratingEDM(true);
        setModalMessage("Sighting EDM on Check Mark & Measuring..."); setShowModal(true);
        try {
            const response = await apiService.triggerServerEDMRead(appState.devices.edm.id, { context: "check_mark" });
            const checkMarkValue = response.value || "Error"; 

            updateCalibrationDataAndSave({ checkMarkStartValue: String(checkMarkValue), calibrationStep: 4 });
            setModalMessage(`Check mark recorded: ${checkMarkValue}.`);
        } catch (error) {
            console.error("Error measuring check mark:", error);
            setModalMessage(`Error measuring check mark: ${error.message}`);
        }
        setIsCalibratingEDM(false);
    };
    const retryMeasureCheckMark = () => {
        updateCalibrationDataAndSave({ checkMarkStartValue: null, calibrationStep: 3 });
    };


    const testWindGauge = () => { /* ... */ };
    const sendToScoreboard = () => { /* ... */ };

    const DevicePanel = ({ title, deviceName, children, isConfigured, icon, available = true }) => {
        if (!available || !isConfigured) return null; 
        return (
            <div className="bg-gray-50 p-3 rounded-lg shadow-sm border border-gray-200"> 
                <h3 className="text-base font-semibold text-blue-700 mb-2 flex items-center">{icon} {title}: <span className="text-gray-600 font-normal ml-1">{deviceName || "Not Selected"}</span></h3> 
                {children}
            </div>
        );
    };
    
    const ModalComponent = ({ message, onClose }) => ( 
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-5 rounded-lg shadow-xl max-w-xs w-full">
                <h3 className="text-base font-semibold mb-3 text-gray-800">Device Action</h3>
                <p className="text-xs text-gray-600 mb-4">{message}</p>
                <Button onClick={onClose} className="w-full" size="md">OK</Button>
            </div>
        </div>
    );

    return (
        <>
            <div className="p-2 md:p-3 max-w-full mx-auto" style={{ paddingBottom: '80px', maxHeight: 'calc(100vh - 60px)', overflowY: 'auto' }}>
                {showModal && <ModalComponent message={modalMessage} onClose={() => setShowModal(false)} />}
                <h1 className="text-xl font-bold text-center mb-3 text-gray-800">CALIBRATE & TEST DEVICES</h1>
                
                {appState.devices.edm && (
                    <div className="bg-gray-50 p-3 rounded-lg shadow-sm border border-gray-200 mb-3">
                        <h3 className="text-lg font-semibold text-blue-700 mb-2 flex items-center">
                            <Target size={18} className="mr-1.5"/> EDM: {appState.devices.edm.name || "EDM"}
                        </h3>
                        {isThrowsEvent ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                                <div className="space-y-2"> 
                                    <div className={`p-2 border rounded-md ${calibrationStep >= 1 ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
                                        <h4 className="font-semibold text-sm mb-1.5">Step 1: Set Circle Radius</h4>
                                        <Select
                                            label="Circle Type:"
                                            value={selectedCircleType}
                                            onChange={handleCircleTypeChange}
                                            options={[ 
                                                { value: 'SHOT', label: `Shot Put (${UKA_RADII.SHOT}m)` }, 
                                                { value: 'DISCUS', label: `Discus (${UKA_RADII.DISCUS}m)` },
                                                { value: 'HAMMER', label: `Hammer (${UKA_RADII.HAMMER}m)` }, 
                                                { value: 'JAVELIN_ARC', label: `Javelin Arc (${UKA_RADII.JAVELIN_ARC}m)` },
                                                { value: 'CUSTOM', label: 'Custom' },
                                            ]}
                                        />
                                        {selectedCircleType === 'CUSTOM' && (
                                            <InputField label="Target Radius (m):" type="number" value={targetRadius} onChange={handleTargetRadiusChange} step="0.001" />
                                        )}
                                        {selectedCircleType !== 'CUSTOM' && (
                                            <p className="text-sm text-gray-700 mt-1">Selected Radius: <span className="font-semibold">{targetRadius.toFixed(4)}m</span></p>
                                        )}
                                    </div>
                                    {targetRadius > 0 && (
                                    <div className={`p-2 border rounded-md ${calibrationStep >= 2 ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <h4 className="font-semibold text-sm">Step 2: Mark Centre</h4>
                                            {isCentreSet && <Button onClick={retrySetCentre} icon={RotateCcw} size="sm" variant="secondary" className="text-xs !px-2 !py-1">Retry</Button>}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Button onClick={handleSetCentre} size="sm" disabled={calibrationStep !== 1 || !targetRadius || isCentreSet || isCalibratingEDM}>{isCalibratingEDM && calibrationStep === 1 ? "Measuring..." : "Set Centre"}</Button>
                                            {isCentreSet && <CheckCircle size={18} className="text-green-500"/>}
                                        </div>
                                    </div>
                                    )}
                                    {isCentreSet && (
                                    <div className={`p-2 border rounded-md ${calibrationStep >= 3 ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
                                         <div className="flex justify-between items-center mb-1.5">
                                            <h4 className="font-semibold text-sm">Step 3: Measure Edge</h4>
                                            {isEdgeMeasured && <Button onClick={retryMeasureEdge} icon={RotateCcw} size="sm" variant="secondary" className="text-xs !px-2 !py-1">Retry</Button>}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Button onClick={handleMeasureEdge} size="sm" disabled={calibrationStep !== 2 || isEdgeMeasured || isCalibratingEDM}>{isCalibratingEDM && calibrationStep === 2 ? "Measuring..." : "Measure Edge"}</Button>
                                            {isEdgeMeasured && (
                                                <div className="text-base ml-2"> 
                                                    <span>{edgeMeasurement}m ({(edgeDifference * 1000).toFixed(1)}mm)</span>
                                                    {isEdgeInTolerance ? <Check size={18} className="inline ml-1 text-green-500"/> : <AlertTriangle size={18} className="inline ml-1 text-red-500"/>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    )}
                                    {isEdgeMeasured && (
                                     <div className={`p-2 border rounded-md ${calibrationStep === 4 || checkMarkStartValue ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <h4 className="font-semibold text-sm">Step 4: Check Mark (Opt.)</h4>
                                            {checkMarkStartValue && <Button onClick={retryMeasureCheckMark} icon={RotateCcw} size="sm" variant="secondary" className="text-xs !px-2 !py-1">Retry</Button>}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Button onClick={handleMeasureCheckMark} size="sm" disabled={(calibrationStep !==3 && !checkMarkStartValue) || isCalibratingEDM}>{isCalibratingEDM && calibrationStep === 3 ? "Measuring..." : "Measure Check Mark"}</Button>
                                            {checkMarkStartValue && <span className="text-base font-semibold ml-2">{checkMarkStartValue} <CheckCircle size={18} className="inline text-green-500"/></span>}
                                        </div>
                                    </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-center row-span-2 md:row-span-auto"> 
                                    <CalibrationCircleVisual radiusSet={targetRadius > 0} centreSet={isCentreSet} edgeMeasured={isEdgeMeasured} checkMarkSet={!!checkMarkStartValue} />
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">Standard EDM test/calibration for non-throws event (if applicable).</p>
                        )}
                    </div>
                )}
                
                <DevicePanel title="Wind Gauge" deviceName={appState.devices.windGauge?.name} isConfigured={!!appState.devices.windGauge} icon={<Wind size={18} className="mr-1.5"/>} available={!isThrowsEvent && !!appState.devices.windGauge}>
                    <Button onClick={testWindGauge} icon={PlayCircle} size="sm" disabled={isTestingWind}>
                        {isTestingWind ? `Testing... (${windCountdown}s)` : 'Test Wind Gauge'}
                    </Button>
                    {windTestResult && !isTestingWind && <p className="mt-2 text-lg font-bold text-blue-700">{windTestResult}</p>}
                    {isTestingWind && <p className="mt-2 text-lg font-semibold text-blue-600">{windTestResult}</p>}
                </DevicePanel>

                <DevicePanel title="Scoreboard" deviceName={appState.devices.scoreboard?.name} isConfigured={!!appState.devices.scoreboard} icon={<Speaker size={18} className="mr-1.5"/>} available={!!appState.devices.scoreboard}>
                    <InputField label="Test Value (4 digits):" type="text" value={scoreboardTestValue} onChange={(e) => setScoreboardTestValue(e.target.value.slice(0,4))} />
                    <Button onClick={sendToScoreboard} icon={PlayCircle} size="sm">Send to Scoreboard</Button>
                    {scoreboardStatus && <p className="mt-1.5 text-xs text-blue-600">{scoreboardStatus}</p>}
                </DevicePanel>
            </div>
            <BottomNavBar>
                <Button onClick={() => onNavigate('SELECT_DEVICES')} variant="secondary" icon={ChevronLeft} size="lg">Back</Button>
                <Button onClick={() => onNavigate(appState.eventMode === 'standalone' ? 'STAND_ALONE_MODE' : 'EVENT_MODE_ATHLETE_LIST')} icon={ChevronRight} size="lg" 
                        disabled={isThrowsEvent && appState.devices.edm && (!isCentreSet || !isEdgeMeasured)}>
                    Next
                </Button>
            </BottomNavBar>
        </>
    );
};


// Screen 5: Stand Alone Mode
const StandAloneModeScreen = ({ onNavigate, appState }) => { /* ... */ };
// Screen 6: Event Mode - Athlete List
const EventModeAthleteListScreen = ({ onNavigate, appState, setAppState }) => { /* ... */ };
// Screen 7: Event Mode - Athlete Detail / Measurement
const EventModeAthleteDetailScreen = ({ onNavigate, appState, setAppState }) => { /* ... */ };

// Main App Component
export default function App() {
  const [currentScreen, setCurrentScreen] = useState('SELECT_EVENT_TYPE');
  const [appState, setAppState] = useState({
    eventType: null, 
    eventMode: null, 
    eventModeConfig: { attempts: 6, cut: 8, reorder: false, selectedEventId: null }, 
    devices: { edm: null, windGauge: null, scoreboard: null }, 
    athletes: [], 
    selectedAthleteId: null, 
    calibrationData: null, 
    serverIP: SERVER_IP, 
    serverPort: SERVER_PORT, 
  });

  const handleServerIPChange = (e) => {
    const newIP = e.target.value;
    setAppState(prev => ({...prev, serverIP: newIP}));
    SERVER_IP = newIP; 
    console.log("Server IP updated to:", newIP);
  };

  const handleServerPortChange = (e) => {
    const newPort = e.target.value;
    setAppState(prev => ({...prev, serverPort: newPort}));
    SERVER_PORT = newPort; 
    console.log("Server Port updated to:", newPort);
  };


  const navigate = (screen) => {
    setCurrentScreen(screen);
  };
  
  useEffect(() => {
    document.body.className = 'bg-gray-100 font-sans overflow-hidden'; 
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.name = "viewport";
        viewportMeta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"; 
        document.getElementsByTagName('head')[0].appendChild(viewportMeta);
    } else {
        if (!viewportMeta.content.includes('user-scalable=no')) {
            viewportMeta.content += ", user-scalable=no";
        }
        if (!viewportMeta.content.includes('maximum-scale=1.0')) {
            viewportMeta.content += ", maximum-scale=1.0";
        }
    }
  }, []);


  const renderScreen = () => {
    switch (currentScreen) {
      case 'SELECT_EVENT_TYPE':
        return <SelectEventTypeScreen 
                    onNavigate={navigate} 
                    setAppState={setAppState} 
                    serverIP={appState.serverIP}
                    serverPort={appState.serverPort}
                    handleServerIPChange={handleServerIPChange}
                    handleServerPortChange={handleServerPortChange}
                />;
      case 'SELECT_EVENT_MODE':
        return <SelectEventModeScreen onNavigate={navigate} appState={appState} setAppState={setAppState} />;
      case 'SELECT_DEVICES':
        return <SelectDevicesScreen onNavigate={navigate} appState={appState} setAppState={setAppState} />;
      case 'CALIBRATE_TEST_DEVICES':
        return <CalibrateTestDevicesScreen onNavigate={navigate} appState={appState} setAppState={setAppState} />; 
      case 'STAND_ALONE_MODE':
        return <StandAloneModeScreen onNavigate={navigate} appState={appState} />;
      case 'EVENT_MODE_ATHLETE_LIST':
        return <EventModeAthleteListScreen onNavigate={navigate} appState={appState} setAppState={setAppState} />; 
      case 'EVENT_MODE_ATHLETE_DETAIL':
        return <EventModeAthleteDetailScreen onNavigate={navigate} appState={appState} setAppState={setAppState} />;
      default:
        return <SelectEventTypeScreen 
                    onNavigate={navigate} 
                    setAppState={setAppState} 
                    serverIP={appState.serverIP}
                    serverPort={appState.serverPort}
                    handleServerIPChange={handleServerIPChange}
                    handleServerPortChange={handleServerPortChange}
                />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100"> 
      <header className="bg-blue-700 text-white p-2.5 shadow-md sticky top-0 z-40 flex-shrink-0"> 
        <h1 className="text-lg font-bold text-center">PolyField by KACPH</h1> 
      </header>
      
      <main className="flex-grow overflow-hidden p-1.5 sm:p-2 w-full max-w-full">  
        <div className="bg-white shadow-lg rounded-lg h-full overflow-hidden"> 
            {renderScreen()}
        </div>
      </main>
    </div>
  );
}
