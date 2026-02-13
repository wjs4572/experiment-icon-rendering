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

### Quick Start

1. **Clone the repository**:
   ```bash
   git clone https://github.com/wjs4572/experiment-icon-rendering.git
   cd experiment-icon-rendering
   ```

2. **Open in browser**:
   Open `src/index.html` in a web browser to view the icon rendering tests.

3. **View performance metrics**:
   Open browser developer tools to monitor rendering performance, paint times, and resource loading.

### Testing Methodology

1. **CSS Reference**: Start with the CSS-defined icon as the visual reference
2. **SVG Creation**: Create an SVG that matches the CSS implementation exactly
3. **Format Generation**: Generate raster formats (PNG, GIF, JPEG, WebP, AVIF) from the SVG
4. **Performance Testing**: Measure loading and rendering times across all formats
5. **Comparison**: Compare visual fidelity and performance metrics

### Adding New Icons

1. Add CSS implementation in the HTML file
2. Create matching SVG version
3. Generate corresponding raster formats
4. Add performance measurement code
5. Update documentation with findings

### Development

- Use any modern web browser with developer tools
- No build process required - edit files directly
- Test across different browsers for comprehensive results
- Use performance profiling tools to measure rendering times

## Licensing

This project uses dual licensing:

- **Software Code**: Licensed under BSD-3-Clause (see [LICENSE-BSD3](LICENSE-BSD3))
- **Data, Results & Documentation**: Licensed under CC BY 4.0 (see [LICENSE-CC-BY-4.0](LICENSE-CC-BY-4.0))

### What This Means

- **Code** (HTML, CSS, JavaScript): You can use, modify, and redistribute under BSD-3-Clause terms
- **Research Data** (performance measurements, findings, documentation): You can use and share under CC BY 4.0 with attribution

## Contributing

When adding new icon formats or tests:
1. Ensure visual output matches the CSS reference implementation
2. Document performance findings
3. Follow the established testing methodology
4. Update documentation as needed

Contributions are welcome under the respective licenses.