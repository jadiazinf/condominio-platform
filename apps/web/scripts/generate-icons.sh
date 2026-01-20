#!/bin/bash

# Script para generar iconos desde el SVG base
# Requiere: ImageMagick (convert) o Inkscape

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/../public"
SVG_SOURCE="$PUBLIC_DIR/icon.svg"

echo "Generando iconos desde $SVG_SOURCE..."

# Verificar si existe el SVG
if [ ! -f "$SVG_SOURCE" ]; then
    echo "Error: No se encontró $SVG_SOURCE"
    exit 1
fi

# Intentar con Inkscape primero (mejor calidad)
if command -v inkscape &> /dev/null; then
    echo "Usando Inkscape..."
    inkscape "$SVG_SOURCE" -w 192 -h 192 -o "$PUBLIC_DIR/icon-192.png"
    inkscape "$SVG_SOURCE" -w 512 -h 512 -o "$PUBLIC_DIR/icon-512.png"
    inkscape "$SVG_SOURCE" -w 180 -h 180 -o "$PUBLIC_DIR/apple-touch-icon.png"
    inkscape "$SVG_SOURCE" -w 32 -h 32 -o "$PUBLIC_DIR/favicon-32.png"

    # Crear favicon.ico (requiere ImageMagick para combinar)
    if command -v convert &> /dev/null; then
        inkscape "$SVG_SOURCE" -w 16 -h 16 -o "$PUBLIC_DIR/favicon-16.png"
        convert "$PUBLIC_DIR/favicon-16.png" "$PUBLIC_DIR/favicon-32.png" "$PUBLIC_DIR/favicon.ico"
        rm "$PUBLIC_DIR/favicon-16.png" "$PUBLIC_DIR/favicon-32.png"
    fi

# Fallback a ImageMagick
elif command -v convert &> /dev/null; then
    echo "Usando ImageMagick..."
    convert -background none "$SVG_SOURCE" -resize 192x192 "$PUBLIC_DIR/icon-192.png"
    convert -background none "$SVG_SOURCE" -resize 512x512 "$PUBLIC_DIR/icon-512.png"
    convert -background none "$SVG_SOURCE" -resize 180x180 "$PUBLIC_DIR/apple-touch-icon.png"
    convert -background none "$SVG_SOURCE" -resize 32x32 -resize 16x16 "$PUBLIC_DIR/favicon.ico"

else
    echo "Error: Necesitas Inkscape o ImageMagick instalado."
    echo ""
    echo "Instalar en Ubuntu/Debian:"
    echo "  sudo apt install inkscape"
    echo "  o"
    echo "  sudo apt install imagemagick"
    echo ""
    echo "Alternativa online:"
    echo "  1. Ve a https://realfavicongenerator.net/"
    echo "  2. Sube el archivo public/icon.svg"
    echo "  3. Descarga el paquete de iconos generado"
    echo "  4. Copia los archivos a la carpeta public/"
    exit 1
fi

echo "Iconos generados exitosamente en $PUBLIC_DIR"
ls -la "$PUBLIC_DIR"/*.png "$PUBLIC_DIR"/*.ico 2>/dev/null
