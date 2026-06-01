# Enhanced Picture Elements Card

A Home Assistant HACS Lovelace custom card that supercharges the built-in picture-elements card with:

- **Visual drag-and-drop positioning** — drag entity icons directly on the image preview inside the card editor
- **Per-entity icon colors** — set distinct colors for ON and OFF states
- **State & label display** — optionally show state value or a custom label beneath each icon
- **Ambience light circle** — a beautiful glowing halo that reacts to entity state, color temperature, and RGB color

---

## Installation via HACS

1. Open **HACS → Frontend**
2. Click **⊕ Explore & Download Repositories**
3. Search for **Enhanced Picture Elements Card**
4. Click **Download**
5. Reload your browser

Or add this repository manually:

1. In HACS go to **⋮ → Custom Repositories**
2. Add `https://github.com/pakkardkaw/kcw-hass-addons` as **Frontend**
3. Find and download **Enhanced Picture Elements Card**

---

## Usage

Add the card via the Lovelace UI card picker (**+ Add Card → Enhanced Picture Elements**), or paste YAML directly:

```yaml
type: custom:enhanced-picture-elements
image: /local/floorplan.png
title: Ground Floor
elements:
  - entity: light.living_room
    label: Living Room
    icon: mdi:ceiling-light
    icon_size: 32
    color_on: "#FFD700"
    color_off: "#555555"
    show_label: true
    show_state: false
    tap_action: toggle
    ambience: true
    ambience_color: auto
    ambience_radius: 60
    ambience_opacity: 0.55
    position:
      x: 42.5
      y: 38.0

  - entity: sensor.living_room_temperature
    label: Temp
    icon: mdi:thermometer
    icon_size: 26
    color: "#FF6B6B"
    show_state: true
    show_label: true
    tap_action: more-info
    ambience: false
    position:
      x: 70.0
      y: 55.0
```

---

## Card Options

| Option  | Type   | Default | Description |
|---------|--------|---------|-------------|
| `image` | string | —       | URL of the background image (e.g. `/local/floorplan.png`) |
| `title` | string | —       | Optional text label overlaid in the top-left corner |
| `elements` | list | `[]` | List of entity overlays (see below) |

---

## Element Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | — | Entity ID (e.g. `light.living_room`) |
| `label` | string | — | Display label shown beneath the icon |
| `icon` | string | `mdi:help-circle` | MDI icon name |
| `icon_size` | number | `30` | Icon size in pixels |
| `color_on` | string | `#FFD700` | Icon color when entity is **on/active** |
| `color_off` | string | `#888888` | Icon color when entity is **off/inactive** |
| `color` | string | — | Static color regardless of state |
| `show_state` | boolean | `false` | Show the entity's state value under the icon |
| `show_label` | boolean | `true` | Show the label under the icon |
| `tap_action` | string | `toggle` | Action on tap: `toggle`, `turn_on`, `turn_off`, `more-info`, `none` |
| `position.x` | number | `50` | Horizontal position as % of image width |
| `position.y` | number | `50` | Vertical position as % of image height |
| `ambience` | boolean | `false` | Enable the ambient glow circle |
| `ambience_color` | string | `auto` | Glow color — `auto` uses the entity's RGB/color-temp, or provide a hex like `#FFD700` |
| `ambience_radius` | number | `55` | Glow radius in pixels |
| `ambience_opacity` | number | `0.55` | Glow opacity (0.0–1.0) |

---

## Visual Editor Features

When you open the card in the Lovelace editor:

1. **Preview canvas** — the background image is shown with entity icons overlaid at their configured positions.
2. **Drag to reposition** — grab any entity icon on the preview and drag it to update its X/Y position instantly. The sliders in the property panel sync automatically.
3. **Click to select** — click an entity icon (without dragging) or click its row in the entity list to open its property panel.
4. **Add Entity** — click the *+ Add Entity* button to insert a new element with default settings, then configure it in the property panel.
5. **Delete** — click the trash icon next to any entity row to remove it.

---

## Ambience Light Circle

The ambience effect renders a soft radial glow behind each entity's icon.

- When the entity turns **on**, the glow fades in with a subtle pulsing animation.
- When the entity turns **off**, the glow fades out smoothly.
- With `ambience_color: auto`, the glow automatically matches:
  - The entity's `rgb_color` attribute (for RGB lights)
  - The entity's `color_temp` attribute (converted to warm/cool white)
  - Falls back to warm white (`#FFCC66`) for all other entities

---

## Tips

- Store your floorplan image in `config/www/` and reference it as `/local/filename.png`.
- Use the visual editor's drag handle to position entities precisely — no need to guess percentages.
- For a clean look, set `show_label: false` and `show_state: false` and rely on ambience color alone to convey state.
- Combine with the [Mushroom Cards](https://github.com/piitaya/lovelace-mushroom) stack for a polished dashboard.
