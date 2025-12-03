# Cosmo Jumpers

A tiny kid-friendly 3D platformer prototype inspired by Mario 64. It features a playful hero (randomly chosen from a roster of silly names), collectible "Sprinkle Stars," and a bright title screen crediting **Designed by Kai Nava**.

The game is written in Python using the [Ursina](https://www.ursinaengine.org/) engine and can be packaged into a single executable so kids can launch it with a double-click.

## Running the prototype

1. Install Python 3.10+.
2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Launch the game:

   ```bash
   python src/galaxy_glide.py
   ```

Controls: **WASD** + mouse to move, **space** to jump.

## Creating a single-file executable

Use PyInstaller to bundle everything into one click-to-run file. The `--onefile` flag produces a single executable that does not require users to install Python separately.

```bash
pyinstaller --onefile --name "CosmoJumpers" src/galaxy_glide.py
```

After the build completes, look for the executable in the `dist/` folder (for example, `dist/CosmoJumpers.exe` on Windows or `dist/CosmoJumpers` on macOS/Linux). Share that file directly; no additional installs are needed for players.

## Assets

The prototype relies on built-in Ursina assets (skyboxes and textures). If you add custom sounds or textures, place them in `src/assets/` and update the PyInstaller command with `--add-data "src/assets:assets"` so they are bundled into the single-file build.
