# Notification and Sound System

This document covers the notification system for session events, permission requests, and user alerts.

## Notification Types

The extension emits notifications for the following events:

| Event | Trigger | Priority | Sound |
|---|---|---|---|
| `session.completed` | Agent finishes generation | Low | Completion sound |
| `session.error` | Generation encounters error | High | Error sound |
| `permission.asked` | Permission needs user attention | Medium | Attention sound |
| `question.asked` | Interactive question needs input | Medium | Attention sound |
| `config.error` | Config file has errors | High | Error sound |

## Architecture

```
Backend SSE Event
        │
        ▼
Extension receives event
        │
        ▼
┌─────────────────────────┐
│  AttentionService       │
│  ├── Check if enabled   │
│  ├── Determine sound    │
│  ├── Play sound         │
│  └── Show notification  │
└─────────────────────────┘
        │
        ▼
VS Code Notification API
        │
        ▼
User sees notification in VS Code
```

## Sound System

### Sound Files

Bundled WAV files in `assets/audio/`:

```
assets/audio/
├── default.wav          // Default notification sound
├── completion.wav       // Session completed
├── error.wav            // Error occurred
├── attention.wav        // Needs attention
└── question.wav         // Question needs input
```

### Sound Configuration

```jsonc
{
  "attention": {
    "enabled": true,
    "sound": "default"  // "default" | "completion" | "error" | "attention" | "question"
  }
}
```

### Sound Playback

```typescript
class AttentionService {
  private enabled: boolean
  private soundName: string
  
  async play(eventType: NotificationEvent) {
    if (!this.enabled) return
    
    const soundFile = this.getSoundFile(eventType)
    const audio = new Audio(soundFile)
    audio.volume = 0.5
    await audio.play().catch(() => {}) // Ignore if autoplay blocked
  }
  
  private getSoundFile(eventType: NotificationEvent): string {
    const mapping: Record<NotificationEvent, string> = {
      "session.completed": "completion.wav",
      "session.error": "error.wav",
      "permission.asked": "attention.wav",
      "question.asked": "question.wav",
    }
    return this.soundName === "default" 
      ? mapping[eventType] 
      : `${this.soundName}.wav`
  }
}
```

## VS Code Notifications

### Notification API

The extension uses VS Code's notification API for system-level alerts:

```typescript
import * as vscode from "vscode"

function showNotification(
  type: "info" | "warning" | "error",
  message: string,
  options?: vscode.NotificationOptions
) {
  vscode.window.showInformationMessage(message, ...options)
}

// Examples:
showNotification("info", "Session completed successfully")
showNotification("warning", "Session approaching token limit")
showNotification("error", "Provider connection failed: ECONNREFUSED")
```

### Notification with Actions

Some notifications include actionable buttons:

```typescript
vscode.window.showInformationMessage(
  "Permission request needs your attention",
  { modal: true },
  "Approve",
  "Deny"
).then(selection => {
  if (selection === "Approve") {
    // Handle approve
  } else if (selection === "Deny") {
    // Handle deny
  }
})
```

## Notification Settings UI

```
┌─────────────────────────────────────────┐
│  Notifications                          │
├─────────────────────────────────────────┤
│                                         │
│  ☑ Enable notification sounds           │
│                                         │
│  Sound: [default ▼]                     │
│  ┌───────────────────────────────────┐  │
│  │ default     -                     │  │
│  │ completion  ✓ Session done        │  │
│  │ error       ! Error occurred      │  │
│  │ attention   ! Needs attention     │  │
│  │ question    ? Question asked      │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Event Sounds:                          │
│  ┌───────────────────────────────────┐  │
│  │ Session completed   [completion]  │  │
│  │ Session error       [error]       │  │
│  │ Permission request  [attention]   │  │
│  │ Question asked      [question]    │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ☑ Show VS Code notifications           │
│  ☑ Play sound in background             │
│                                         │
│  [Test Sound]  [Save]                   │
│                                         │
└─────────────────────────────────────────┘
```

## Visual Notifications (In-UI)

In addition to system notifications, the webview shows inline indicators:

### Status Bar in Chat Header

```
┌─────────────────────────────────────────────┐
│ Fix login bug  ● Running  ▮▮▮ 85%  [Abort] │
└─────────────────────────────────────────────┘
   ↑              ↑         ↑        ↑
   Title       Status    Progress  Button
```

**Status Indicators:**

| Status | Indicator | Color |
|---|---|---|
| Idle | ○ | Gray |
| Running | ● spinning | Blue |
| Paused | ⏸ | Yellow |
| Error | ✕ | Red |
| Completed | ✓ | Green |

### Error Banner

When an error occurs, a red banner appears at the top of the chat:

```
┌─────────────────────────────────────────┐
│ ⚠ Connection to provider lost.          │
│   [Retry] [Settings] [Dismiss]          │
└─────────────────────────────────────────┘
```

### Completion Banner

When a session completes:

```
┌─────────────────────────────────────────┐
│ ✓ Session completed (2.3k tokens)       │
│   [New Session] [Continue] [Dismiss]    │
└─────────────────────────────────────────┘
```

## Notification Queue

Multiple notifications can accumulate. They are displayed in order:

```
Queue:
  1. [info] Session completed
  2. [warning] Permission needs attention
  3. [error] Provider timeout

Display:
  - Show most recent as modal/persistent
  - Stack older ones as toast notifications
  - Auto-dismiss info notifications after 5 seconds
  - Keep warning/error until dismissed
```

## Platform Considerations

### Windows

- Sound playback uses Windows audio API
- Notifications appear in the VS Code notification center
- Background sound works even when VS Code is minimized

### macOS

- Sound playback uses AVAudioPlayer
- Notifications can use macOS native notifications (if enabled)
- Sound works in background

### Linux

- Sound playback uses PulseAudio/PipeWire
- Notifications appear in VS Code notification center
- May require user to grant audio permissions

## Accessibility

- Sound notifications can be disabled for accessibility
- Visual indicators (colors, icons) convey the same information
- Screen readers announce notification events via VS Code's accessibility API
- Color contrast meets WCAG AA standards for all status indicators
