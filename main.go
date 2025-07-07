package main

import (
	"embed" // Used to embed frontend assets

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

// This directive tells Go to embed the contents of the 'frontend/dist' directory
// (which is the output of your 'npm run build' command) into the compiled binary.
//
//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the App structure.
	// It's assumed you have an 'app.go' file in the same directory
	// defining the 'App' struct and a 'NewApp()' function.
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "PolyField by KACPH",
		Width:  1280, // Your target width
		Height: 750,  // Your target height
		AssetServer: &assetserver.Options{
			Assets: assets, // Serve the embedded frontend assets
		},
		// BackgroundColour is the initial window background.
		// Useful if your frontend takes a moment to load.
		// This is Tailwind's gray-100: R:243, G:244, B:246
		BackgroundColour: &options.RGBA{R: 243, G: 244, B: 246, A: 1},
		OnStartup:        app.startup,  // Method called when the app starts
		OnDomReady:       app.domReady, // Method called when the frontend DOM is ready
		OnShutdown:       app.shutdown, // Method called when the app is closing
		Bind: []interface{}{
			app, // Bind the App struct instance so its public methods are callable from JS
		},
		// --- Optional Platform Specific Options ---
		// Frameless: true, // Example: For a frameless window
		// Mac: &mac.Options{
		// 	TitleBar: mac.TitleBarHidden(),
		// 	Appearance: mac.NSAppearanceNameDarkAqua,
		// 	WebviewIsTransparent: true,
		// 	WindowIsTranslucent:  true,
		// 	About: &mac.AboutInfo{
		// 		Title:   "PolyField by KACPH",
		// 		Message: "© 2025 Kingston Athletic Club & Polytechnic Harriers",
		// 		// Icon:    iconBytes, // You'd load your icon data here
		// 	},
		// },
		// Windows: &windows.Options{
		// 	WebviewIsTransparent: false,
		// 	WindowIsTranslucent:  false,
		// 	DisableWindowIcon:    false,
		// },
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
