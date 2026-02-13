# Icon Rendering Performance Test

This project is designed to test the rendering times of icons across different formats and implementation methods.

## Purpose

The goal is to compare rendering performance across various icon formats:

- **CSS** - Icons defined purely with CSS (gradients, shapes, etc.)
- **SVG** - Scalable Vector Graphics
- **PNG** - Portable Network Graphics (raster)
- **GIF** - Graphics Interchange Format (raster) 
- **JPEG** - Joint Photographic Experts Group (raster)
- **WebP** - Modern raster format with better compression
- **AVIF** - AV1 Image File Format (modern raster)

## Format Categorization

Icons will be grouped by format type:
- **Vector**: SVG
- **Raster**: PNG, GIF, JPEG, WebP, AVIF
- **CSS**: Pure CSS implementations

## Source of Truth

- **SVG** serves as the source of truth for all image formats
- All generated images must visually match the CSS-defined icon
- SVG versions will be created to replicate what the CSS defines
- Other formats will be generated from the SVG source

## Implementation Philosophy

This project maintains a minimal approach:
- **Plain HTML, CSS, and JavaScript only**
- No build tools, frameworks, or complex dependencies
- Focused on raw loading and rendering performance
- Simple, direct implementation to avoid performance overhead from tooling

## Usage

Open `src/index.html` in a web browser to view the icon rendering tests.

## Contributing

When adding new icon formats or tests, ensure they match the visual output of the CSS reference implementation.