#!/usr/bin/env python3
"""Generuje kafelki ziarna filmowego (public/wyglad/ziarno-N.jpg) nakładane na cały film."""
import os

import numpy as np
from PIL import Image

KATALOG = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "wyglad"))
rng = np.random.default_rng(3)

os.makedirs(KATALOG, exist_ok=True)
for i in range(4):
    szum = rng.normal(128, 30, (640, 360))
    Image.fromarray(np.clip(szum, 0, 255).astype(np.uint8), "L").save(os.path.join(KATALOG, f"ziarno-{i}.jpg"), quality=72)
print("Gotowe: 4 kafelki ziarna")
