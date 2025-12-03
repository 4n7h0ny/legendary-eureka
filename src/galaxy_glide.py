"""Cosmo Jumpers: a kid-friendly 3D platformer prototype.

Run directly with Python or package into a single executable with PyInstaller.
"""
from pathlib import Path
import random
import time as py_time

from ursina import (
    Audio,
    Button,
    camera,
    Color,
    Entity,
    Sky,
    Text,
    Ursina,
    Vec3,
    application,
    camera,
    color,
    destroy,
    invoke,
    lerp,
    load_texture,
    time,
    window,
)
from ursina.prefabs.first_person_controller import FirstPersonController


class GalaxyGlideGame(Ursina):
    """A tiny 3D playground inspired by classic mascot platformers."""

    def __init__(self):
        super().__init__()
        self.menu_root: Entity | None = None
        self.player: FirstPersonController | None = None
        self.collectibles: list[Entity] = []
        self.score = 0
        self.character_name = random.choice(
            [
                "Captain Bubbleboots",
                "Princess Pancake",
                "Astro Sprinkle",
                "Gizmo Gigglebeard",
                "Zoomer Noodle",
            ]
        )
        self.ui_score: Text | None = None
        self.ui_hint: Text | None = None

        self._build_title_screen()

    def _build_title_screen(self) -> None:
        window.color = Color(0.09, 0.09, 0.16)
        Sky(color=Color(0.1, 0.12, 0.18))

        self.menu_root = Entity(parent=camera.ui, scale=1.0)
        Text(
            "Cosmo Jumpers",
            parent=self.menu_root,
            y=0.35,
            scale=2,
            color=color.azure,
            origin=(0, 0),
            shadow=True,
        )
        Text(
            "Designed by Kai Nava",
            parent=self.menu_root,
            y=0.26,
            scale=1,
            color=color.orange,
            origin=(0, 0),
        )
        Text(
            f"Starring {self.character_name}!",
            parent=self.menu_root,
            y=0.18,
            scale=1,
            color=color.lime,
            origin=(0, 0),
        )

        Button(
            text="Play",
            color=color.azure,
            scale=(0.35, 0.1),
            y=0.05,
            parent=self.menu_root,
            on_click=self.start_game,
        )
        Button(
            text="Quit",
            color=color.gray,
            scale=(0.35, 0.1),
            y=-0.08,
            parent=self.menu_root,
            on_click=lambda: application.quit(),
        )

        Text(
            "Use WASD + mouse to move. Space to jump.",
            parent=self.menu_root,
            y=-0.25,
            scale=0.8,
            color=color.light_gray,
            origin=(0, 0),
        )

    def start_game(self) -> None:
        if self.menu_root:
            destroy(self.menu_root)
        window.color = color.rgb(180, 240, 255)
        self._build_world()
        self._build_ui()

    def _build_world(self) -> None:
        Sky(texture=load_texture("sky_sunset"))
        ground_texture = load_texture("grass")
        for x in range(-4, 5):
            for z in range(-4, 5):
                Entity(
                    model="cube",
                    texture=ground_texture,
                    color=color.lime.tint(-0.1 if (x + z) % 2 else 0.05),
                    scale=(1, 0.2, 1),
                    position=(x, -1, z),
                    collider="box",
                )

        self.player = FirstPersonController(
            model="cube",
            color=color.azure,
            origin_y=-0.5,
            speed=6,
            jump_height=2,
        )
        self.player.y = 1
        Camera.fov = 100

        self._spawn_platforms()
        self._spawn_collectibles()

    def _build_ui(self) -> None:
        self.ui_score = Text(
            text="Sprinkle Stars: 0",
            parent=camera.ui,
            position=(-0.85, 0.45),
            origin=(0, 0),
            color=color.white,
        )
        self.ui_hint = Text(
            text="Collect all the Sprinkle Stars!",
            parent=camera.ui,
            position=(0, 0.45),
            origin=(0, 0),
            color=color.yellow,
        )

    def _spawn_platforms(self) -> None:
        colors = [color.orange, color.violet, color.pink, color.azure]
        for i in range(10):
            pos = Vec3(random.uniform(-5, 5), random.uniform(0.5, 3), random.uniform(-5, 5))
            Entity(
                model="cube",
                color=random.choice(colors).tint(random.uniform(-0.1, 0.1)),
                texture="white_cube",
                position=pos,
                scale=(random.uniform(1, 2), 0.3, random.uniform(1, 2)),
                collider="box",
            )

    def _spawn_collectibles(self) -> None:
        sparkle_tex = load_texture("ursina_wink")
        for i in range(8):
            pos = Vec3(random.uniform(-4, 4), random.uniform(0.6, 3), random.uniform(-4, 4))
            star = Entity(
                model="sphere",
                texture=sparkle_tex,
                color=color.yellow.tint(0.2),
                scale=0.3,
                position=pos,
                collider="sphere",
                rotation=Vec3(random.uniform(0, 360), 0, random.uniform(0, 360)),
            )
            self.collectibles.append(star)

    def update(self) -> None:  # type: ignore[override]
        if not self.player:
            return
        for star in list(self.collectibles):
            star.rotation_y += time.dt * 60
            star.y += lerp(-0.05, 0.05, (py_time.time() % 1)) * time.dt
            if star.intersects(self.player).hit:
                self.collectibles.remove(star)
                destroy(star)
                self.score += 1
                if self.ui_score:
                    self.ui_score.text = f"Sprinkle Stars: {self.score}"
                Audio("assets/pickup.wav", autoplay=True, loop=False) if (Path(__file__).parent / "assets" / "pickup.wav").exists() else None
                invoke(self._flash_hint, delay=0.05)
        if not self.collectibles and self.ui_hint:
            self.ui_hint.text = "Great job! Dance party time!"

    def _flash_hint(self) -> None:
        if not self.ui_hint:
            return
        original_color = self.ui_hint.color
        self.ui_hint.color = color.gold
        invoke(setattr, self.ui_hint, "color", original_color, delay=0.4)


game = GalaxyGlideGame()


def update() -> None:
    game.update()


if __name__ == "__main__":
    game.run()
