package main

import (
	"context"
	"fmt"
	// "math/rand" // Uncomment if you use rand for simulations
	// "time"      // Uncomment if you use time for simulations
	// "math"      // Uncomment if you use math for simulations
)

// App struct holds application context and methods
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call runtime methods from Go.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	fmt.Println("PolyField Wails App Started Up!")
}

// domReady is called after the DOM has been loaded for the frontend.
// You can Wails runtime API calls here to interact with the frontend.
func (a *App) domReady(ctx context.Context) {
	fmt.Println("DOM Ready!")
	// Example: runtime.WindowSetTitle(a.ctx, "PolyField - DOM Ready")
}

// shutdown is called at application termination
func (a *App) shutdown(ctx context.Context) {
	fmt.Println("PolyField Wails App Shutting Down")
}

// --- Example Backend Methods ---
// Replace these with your actual hardware interaction logic.

// GetAppName is a simple example method.
func (a *App) GetAppName() string {
	return "PolyField by KACPH"
}

// TriggerEDM simulates an EDM trigger
func (a *App) TriggerEDM() (string, error) {
	fmt.Println("Go Backend: TriggerEDM called")
	// TODO: Implement actual EDM device interaction
	// time.Sleep(1500 * time.Millisecond) // Simulate delay
	// measurement := fmt.Sprintf("%.2f m", 60.0 + (rand.Float64() * 10.0))
	// return measurement, nil
	return "EDM: 77.77 m (Go Simulated)", nil
}

// TriggerWind simulates a Wind Gauge trigger
func (a *App) TriggerWind() (string, error) {
	fmt.Println("Go Backend: TriggerWind called")
	// TODO: Implement actual Wind device interaction
	// time.Sleep(1000 * time.Millisecond) // Simulate delay
	// val := (rand.Float64() * 4.0) - 2.0
	// sign := "+"
	// if val < 0 {
	// 	sign = "-"
	// }
	// measurement := fmt.Sprintf("%s%.1f m/s", sign, math.Abs(val))
	// return measurement, nil
	return "Wind: -0.5 m/s (Go Simulated)", nil
}

// SendToScoreboard simulates sending data to a scoreboard
func (a *App) SendToScoreboard(value string) error {
	fmt.Printf("Go Backend: SendToScoreboard called with value: %s\n", value)
	// TODO: Implement actual Scoreboard interaction
	// time.Sleep(1500 * time.Millisecond)
	return nil
}

// You would also move your mock data loading or any persistent data handling here.
// For example, to serve mockEvents:
func (a *App) GetMockEvents() []map[string]interface{} {
	// In a real app, this might load from a file or embedded data
	return []map[string]interface{}{
		{"id": "event1-shotput", "name": "Men's Shot Put Championship", "type": "Throws"},
		{"id": "event2-longjump", "name": "Women's Long Jump Qualifiers", "type": "Horizontal Jumps"},
		{"id": "event3-javelin", "name": "U18 Javelin Open", "type": "Throws"},
		{"id": "event5-triplejump", "name": "U20 Triple Jump", "type": "Horizontal Jumps"},
	}
}
