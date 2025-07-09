package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"math"
	"math/rand"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"

	"go.bug.st/serial"
)

// --- Constants ---
var edmReadCommand = []byte{0x11, 0x0d, 0x0a}

const (
	sdToleranceMm           = 3.0
	delayBetweenReadsInPair = 250 * time.Millisecond
	edmReadTimeout          = 10 * time.Second
	UkaRadiusShot           = 1.0675
	UkaRadiusDiscus         = 1.250
	UkaRadiusHammer         = 1.0675
	UkaRadiusJavelinArc     = 8.000
	ToleranceThrowsCircleMm = 5.0
	ToleranceJavelinMm      = 10.0
)

// --- Data Structures ---
type Device struct {
	Conn           io.ReadWriteCloser
	ConnectionType string
	Address        string
}
type EDMPoint struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}
type AveragedEDMReading struct {
	SlopeDistanceMm float64 `json:"slopeDistanceMm"`
	VAzDecimal      float64 `json:"vAzDecimal"`
	HARDecimal      float64 `json:"harDecimal"`
}
type EdgeVerificationResult struct {
	MeasuredRadius     float64 `json:"measuredRadius"`
	DifferenceMm       float64 `json:"differenceMm"`
	IsInTolerance      bool    `json:"isInTolerance"`
	ToleranceAppliedMm float64 `json:"toleranceAppliedMm"`
}
type EDMCalibrationData struct {
	DeviceID               string                  `json:"deviceId"`
	Timestamp              time.Time               `json:"timestamp"`
	SelectedCircleType     string                  `json:"selectedCircleType"`
	TargetRadius           float64                 `json:"targetRadius"`
	StationCoordinates     EDMPoint                `json:"stationCoordinates"`
	IsCentreSet            bool                    `json:"isCentreSet"`
	EdgeVerificationResult *EdgeVerificationResult `json:"edgeVerificationResult,omitempty"`
}
type ParsedEDMReading struct {
	SlopeDistanceMm float64
	VAzDecimal      float64
	HARDecimal      float64
}
type App struct {
	ctx              context.Context
	stateMux         sync.Mutex
	devices          map[string]*Device
	demoMode         bool
	CalibrationStore map[string]*EDMCalibrationData
}

// --- App Lifecycle & Helpers ---
func NewApp() *App {
	return &App{
		devices:          make(map[string]*Device),
		CalibrationStore: make(map[string]*EDMCalibrationData),
		demoMode:         false,
	}
}
func (a *App) wailsStartup(ctx context.Context) { a.ctx = ctx }
func (a *App) wailsShutdown(ctx context.Context) {
	a.stateMux.Lock()
	defer a.stateMux.Unlock()
	for _, dev := range a.devices {
		if dev.Conn != nil {
			dev.Conn.Close()
		}
	}
}
func parseDDDMMSSAngle(angleStr string) (float64, error) {
	if len(angleStr) < 6 || len(angleStr) > 7 {
		return 0, fmt.Errorf("invalid angle string length: got %d for '%s'", len(angleStr), angleStr)
	}
	if len(angleStr) == 6 {
		angleStr = "0" + angleStr
	}
	ddd, err := strconv.Atoi(angleStr[0:3])
	if err != nil {
		return 0, err
	}
	mm, err := strconv.Atoi(angleStr[3:5])
	if err != nil {
		return 0, err
	}
	ss, err := strconv.Atoi(angleStr[5:7])
	if err != nil {
		return 0, err
	}
	if mm >= 60 || ss >= 60 {
		return 0, fmt.Errorf("invalid angle values (MM or SS >= 60) in '%s'", angleStr)
	}
	return float64(ddd) + (float64(mm) / 60.0) + (float64(ss) / 3600.0), nil
}
func parseEDMResponseString(raw string) (*ParsedEDMReading, error) {
	parts := strings.Fields(strings.TrimSpace(raw))
	if len(parts) < 4 {
		return nil, fmt.Errorf("malformed response, got %d parts", len(parts))
	}
	sd, err := strconv.ParseFloat(parts[0], 64)
	if err != nil {
		return nil, err
	}
	vaz, err := parseDDDMMSSAngle(parts[1])
	if err != nil {
		return nil, err
	}
	har, err := parseDDDMMSSAngle(parts[2])
	if err != nil {
		return nil, err
	}
	return &ParsedEDMReading{SlopeDistanceMm: sd, VAzDecimal: vaz, HARDecimal: har}, nil
}

// --- Wails Bindable Functions ---
func (a *App) SetDemoMode(enabled bool)           { a.stateMux.Lock(); a.demoMode = enabled; a.stateMux.Unlock() }
func (a *App) ListSerialPorts() ([]string, error) { return serial.GetPortsList() }
func (a *App) ConnectSerialDevice(devType, portName string) (string, error) {
	a.stateMux.Lock()
	defer a.stateMux.Unlock()
	if d, ok := a.devices[devType]; ok && d.Conn != nil {
		d.Conn.Close()
	}
	mode := &serial.Mode{BaudRate: 9600}
	port, err := serial.Open(portName, mode)
	if err != nil {
		return "", err
	}
	a.devices[devType] = &Device{Conn: port, ConnectionType: "serial", Address: portName}
	return fmt.Sprintf("Connected to %s on %s", devType, portName), nil
}
func (a *App) ConnectNetworkDevice(devType, ipAddress string, port int) (string, error) {
	a.stateMux.Lock()
	defer a.stateMux.Unlock()
	if d, ok := a.devices[devType]; ok && d.Conn != nil {
		d.Conn.Close()
	}
	address := fmt.Sprintf("%s:%d", ipAddress, port)
	conn, err := net.DialTimeout("tcp", address, 5*time.Second)
	if err != nil {
		return "", err
	}
	a.devices[devType] = &Device{Conn: conn, ConnectionType: "network", Address: address}
	return fmt.Sprintf("Connected to %s at %s", devType, address), nil
}
func (a *App) DisconnectDevice(devType string) (string, error) {
	a.stateMux.Lock()
	defer a.stateMux.Unlock()
	if dev, ok := a.devices[devType]; ok && dev.Conn != nil {
		dev.Conn.Close()
		delete(a.devices, devType)
		return fmt.Sprintf("Disconnected %s", devType), nil
	}
	return "", fmt.Errorf("%s not connected", devType)
}
func (a *App) GetCalibration(devType string) (*EDMCalibrationData, error) {
	a.stateMux.Lock()
	defer a.stateMux.Unlock()
	if cal, exists := a.CalibrationStore[devType]; exists {
		return cal, nil
	}
	return &EDMCalibrationData{DeviceID: devType, SelectedCircleType: "SHOT", TargetRadius: UkaRadiusShot}, nil
}
func (a *App) SaveCalibration(devType string, data EDMCalibrationData) error {
	a.stateMux.Lock()
	defer a.stateMux.Unlock()
	data.Timestamp = time.Now().UTC()
	a.CalibrationStore[devType] = &data
	return nil
}
func (a *App) ResetCalibration(devType string) error {
	a.stateMux.Lock()
	defer a.stateMux.Unlock()
	delete(a.CalibrationStore, devType)
	return nil
}
func (a *App) _triggerSingleEDMRead(dev *Device) (*ParsedEDMReading, error) {
	if _, err := dev.Conn.Write(edmReadCommand); err != nil {
		return nil, err
	}
	if dev.ConnectionType == "network" {
		if conn, ok := dev.Conn.(net.Conn); ok {
			conn.SetReadDeadline(time.Now().Add(edmReadTimeout))
			defer conn.SetReadDeadline(time.Time{})
		}
	}
	r := bufio.NewReader(dev.Conn)
	resp, err := r.ReadString('\n')
	if err != nil {
		return nil, err
	}
	return parseEDMResponseString(resp)
}

func (a *App) GetReliableEDMReading(devType string) (*AveragedEDMReading, error) {
	a.stateMux.Lock()
	if a.demoMode {
		a.stateMux.Unlock()
		return &AveragedEDMReading{SlopeDistanceMm: 10000 + rand.Float64()*15000, VAzDecimal: 92.0 + rand.Float64()*5.0, HARDecimal: rand.Float64() * 360.0}, nil
	}
	device, ok := a.devices[devType]
	a.stateMux.Unlock()
	if !ok || device.Conn == nil {
		return nil, fmt.Errorf("EDM device type '%s' not connected", devType)
	}

	r1, e1 := a._triggerSingleEDMRead(device)
	if e1 != nil {
		return nil, fmt.Errorf("first read failed: %w", e1)
	}

	time.Sleep(delayBetweenReadsInPair)

	r2, e2 := a._triggerSingleEDMRead(device)
	if e2 != nil {
		return nil, fmt.Errorf("second read failed: %w", e2)
	}

	if math.Abs(r1.SlopeDistanceMm-r2.SlopeDistanceMm) <= sdToleranceMm {
		return &AveragedEDMReading{
			SlopeDistanceMm: (r1.SlopeDistanceMm + r2.SlopeDistanceMm) / 2.0,
			VAzDecimal:      (r1.VAzDecimal + r2.VAzDecimal) / 2.0,
			HARDecimal:      (r1.HARDecimal + r2.HARDecimal) / 2.0,
		}, nil
	}

	return nil, fmt.Errorf("failed to get consistent readings. R1(SD): %.0fmm, R2(SD): %.0fmm", r1.SlopeDistanceMm, r2.SlopeDistanceMm)
}

func (a *App) SetCircleCentre(devType string) (*EDMCalibrationData, error) {
	reading, err := a.GetReliableEDMReading(devType)
	if err != nil {
		return nil, fmt.Errorf("could not get centre reading: %w", err)
	}
	a.stateMux.Lock()
	defer a.stateMux.Unlock()
	cal, _ := a.CalibrationStore[devType]
	if cal == nil {
		cal = &EDMCalibrationData{DeviceID: devType}
	}
	sdMeters := reading.SlopeDistanceMm / 1000.0
	vazRad := reading.VAzDecimal * math.Pi / 180.0
	harRad := reading.HARDecimal * math.Pi / 180.0
	hd := sdMeters * math.Sin(vazRad)
	cal.StationCoordinates = EDMPoint{X: -hd * math.Cos(harRad), Y: -hd * math.Sin(harRad)}
	cal.IsCentreSet = true
	cal.EdgeVerificationResult = nil
	cal.Timestamp = time.Now().UTC()
	a.CalibrationStore[devType] = cal
	return cal, nil
}

func (a *App) VerifyCircleEdge(devType string) (*EDMCalibrationData, error) {
	a.stateMux.Lock()
	cal, exists := a.CalibrationStore[devType]
	if !exists || !cal.IsCentreSet {
		a.stateMux.Unlock()
		return nil, fmt.Errorf("must set circle centre first")
	}
	if a.demoMode {
		a.stateMux.Unlock()
		diffMm := (rand.Float64() * 12.0) - 6.0
		toleranceMm := ToleranceThrowsCircleMm
		if cal.SelectedCircleType == "JAVELIN_ARC" {
			toleranceMm = ToleranceJavelinMm
		}
		cal.EdgeVerificationResult = &EdgeVerificationResult{MeasuredRadius: cal.TargetRadius + (diffMm / 1000.0), DifferenceMm: diffMm, IsInTolerance: math.Abs(diffMm) <= toleranceMm, ToleranceAppliedMm: toleranceMm}
		return cal, nil
	}
	a.stateMux.Unlock()
	reading, err := a.GetReliableEDMReading(devType)
	if err != nil {
		return nil, fmt.Errorf("could not get edge reading: %w", err)
	}
	sdMeters := reading.SlopeDistanceMm / 1000.0
	vazRad := reading.VAzDecimal * math.Pi / 180.0
	harRad := reading.HARDecimal * math.Pi / 180.0
	hd := sdMeters * math.Sin(vazRad)
	xPrime := hd * math.Cos(harRad)
	yPrime := hd * math.Sin(harRad)
	measuredX := cal.StationCoordinates.X + xPrime
	measuredY := cal.StationCoordinates.Y + yPrime
	measuredRadius := math.Sqrt(math.Pow(measuredX, 2) + math.Pow(measuredY, 2))
	diffMm := (measuredRadius - cal.TargetRadius) * 1000.0
	toleranceMm := ToleranceThrowsCircleMm
	if cal.SelectedCircleType == "JAVELIN_ARC" {
		toleranceMm = ToleranceJavelinMm
	}
	cal.EdgeVerificationResult = &EdgeVerificationResult{MeasuredRadius: measuredRadius, DifferenceMm: diffMm, IsInTolerance: math.Abs(diffMm) <= toleranceMm, ToleranceAppliedMm: toleranceMm}
	a.stateMux.Lock()
	a.CalibrationStore[devType] = cal
	a.stateMux.Unlock()
	return cal, nil
}

func (a *App) MeasureThrow(devType string) (string, error) {
	a.stateMux.Lock()
	cal, exists := a.CalibrationStore[devType]
	if !exists || !cal.IsCentreSet {
		a.stateMux.Unlock()
		return "", fmt.Errorf("EDM is not calibrated")
	}
	if a.demoMode {
		a.stateMux.Unlock()
		var min, max float64
		switch cal.SelectedCircleType {
		case "SHOT":
			min, max = 6.00, 15.00
		default:
			min, max = 15.00, 60.00
		}
		return fmt.Sprintf("%.2f m", min+rand.Float64()*(max-min)), nil
	}
	a.stateMux.Unlock()
	reading, err := a.GetReliableEDMReading(devType)
	if err != nil {
		return "", fmt.Errorf("could not get throw reading: %w", err)
	}
	sdMeters := reading.SlopeDistanceMm / 1000.0
	vazRad := reading.VAzDecimal * math.Pi / 180.0
	harRad := reading.HARDecimal * math.Pi / 180.0
	hd := sdMeters * math.Sin(vazRad)
	xPrime := hd * math.Cos(harRad)
	yPrime := hd * math.Sin(harRad)
	measuredX := cal.StationCoordinates.X + xPrime
	measuredY := cal.StationCoordinates.Y + yPrime
	distFromCenter := math.Sqrt(math.Pow(measuredX, 2) + math.Pow(measuredY, 2))
	finalThrowDist := distFromCenter - cal.TargetRadius
	return fmt.Sprintf("%.2f m", finalThrowDist), nil
}
