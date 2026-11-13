#!/usr/bin/env bash
# Render długiej rolki w kawałkach (odporny na restart serwera): gotowe kawałki są pomijane przy ponownym uruchomieniu.
# Użycie (w folderze video/): bash skrypty/render-czesci.sh <odcinek> <liczba_klatek> [klatek_na_kawalek]
set -euo pipefail
SLUG="$1"
KLATEK="$2"
KAWALEK="${3:-450}"
B=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
PRZ=()
[ -x "$B" ] && PRZ=(--browser-executable="$B" --gl=swangle)
PROPS="{\"odcinek\":\"$SLUG\"}"
DIR="out/czesci/$SLUG"
mkdir -p "$DIR"

for ((od = 0; od < KLATEK; od += KAWALEK)); do
  do_=$((od + KAWALEK - 1))
  [ "$do_" -ge "$KLATEK" ] && do_=$((KLATEK - 1))
  plik="$DIR/v-$(printf %05d "$od").mp4"
  if [ -s "$plik" ]; then echo "pomijam $plik"; continue; fi
  npx remotion render RolkaOSP "$plik.tmp.mp4" --props="$PROPS" --frames="$od-$do_" --muted --crf=24 --concurrency="$(nproc)" "${PRZ[@]}" >/dev/null
  mv "$plik.tmp.mp4" "$plik"
  echo "gotowe $plik"
done

# dźwięk całości osobno (szybko)
if [ ! -s "$DIR/dzwiek.aac" ]; then
  npx remotion render RolkaOSP "$DIR/dzwiek.tmp.aac" --props="{\"odcinek\":\"$SLUG\",\"tylkoDzwiek\":true}" --codec=aac "${PRZ[@]}" >/dev/null
  mv "$DIR/dzwiek.tmp.aac" "$DIR/dzwiek.aac"
fi

ls "$DIR"/v-*.mp4 | sort | sed "s|^|file '$PWD/|; s|$|'|" > "$DIR/lista.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$DIR/lista.txt" -i "$DIR/dzwiek.aac" -map 0:v -map 1:a -c:v copy -c:a copy -movflags +faststart "out/$SLUG.mp4"
npx remotion still RolkaOSP "out/$SLUG-okladka.png" --props="$PROPS" --frame=0 "${PRZ[@]}" >/dev/null
echo "Gotowe: video/out/$SLUG.mp4"
