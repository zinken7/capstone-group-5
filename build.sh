#!/usr/bin/env bash
set -e

DIR="${1:-docs/d1}"
NAME="$(basename "$DIR")"
OUT="build/${NAME}.pdf"

mkdir -p build

pandoc "$DIR"/[0-9][0-9]-*.md \
  -o "$OUT" \
  --include-in-header="$DIR/preamble.tex" \
  --include-before-body="$DIR/titlepage.tex" \
  --toc \
  --toc-depth=2 \
  --number-sections \
  -V documentclass=report \
  --resource-path="$DIR:$(dirname "$DIR")" \
  -V geometry:margin=2.2cm \
  -V fontsize=10pt \
  -V colorlinks=true \
  -V linkcolor=blue \
  -V urlcolor=blue

echo "Built $OUT"
