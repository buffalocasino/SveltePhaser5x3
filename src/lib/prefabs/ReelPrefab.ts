import Phaser from "phaser";

export default class ReelPrefab {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private container: Phaser.GameObjects.Container;
  private symbols: Phaser.GameObjects.Image[] = [];
  private mask?: Phaser.Display.Masks.BitmapMask | Phaser.Display.Masks.GeometryMask;
  private isSpinning = false;
  private readonly windowHeight = 384;
  private symbolSize = 128;
  private startOffset = -this.windowHeight / 2 + 64; // updated per layout (setStrip)
  private frames: string[] = [];
  private backdrop?: Phaser.GameObjects.Rectangle;

  // These keys match the ones preloaded in MainScene.preload()
  private readonly keys = [
    "h1","h2","h3","h4",
    "l1","l2","l3","l4",
    "wild","scatter"
  ];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.container = this.scene.add.container(this.x, this.y);
  }

  // Build a static column of symbols
  initSymbols(rows: number = 3, symbolSize = 128) {
    // Clear prior symbols if re-initializing
    this.symbols.forEach(s => s.destroy());
    this.symbols = [];

    // Center the column vertically around the container origin
    const totalHeight = rows * symbolSize;
    const startY = -totalHeight / 2 + symbolSize / 2;

    for (let i = 0; i < rows; i++) {
      const key = this.keys[Math.floor(Math.random() * this.keys.length)];
      const img = this.scene.add.image(0, startY + i * symbolSize, key);
      img.setOrigin(0.5, 0.5);

      // Scale to fit within the symbolSize box (optional)
      const tw = img.width || this.scene.textures.get(key).getSourceImage().width;
      const th = img.height || this.scene.textures.get(key).getSourceImage().height;
      const scale = Math.min(symbolSize / tw, symbolSize / th);
      img.setScale(scale);

      this.container.add(img);
      this.symbols.push(img);
    }

    if (this.mask) {
      this.container.setMask(this.mask);
    }
  }

  // Build a long strip from atlas frames (e.g., 80-100 symbols)
  setStrip(frames: string[], symbolSize = 128) {
    // Reset
    this.symbols.forEach(s => s.destroy());
    this.symbols = [];
    this.frames = frames.slice();
    this.symbolSize = symbolSize;
    this.startOffset = -this.windowHeight / 2 + symbolSize / 2;

    // Create/update a backdrop panel behind the symbols (masked together)
    const panelWidth = symbolSize; // 128
    const panelHeight = this.windowHeight; // 384
    if (!this.backdrop) {
      this.backdrop = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x000000, 0.35).setOrigin(0.5);
      // Add as first child so it renders behind symbols
      this.container.addAt(this.backdrop, 0);
    } else {
      this.backdrop.setSize(panelWidth, panelHeight);
      this.backdrop.setFillStyle(0x000000, 0.35);
      this.backdrop.setPosition(0, 0);
    }

    for (let i = 0; i < this.frames.length; i++) {
      const frame = this.frames[i];
      const y = this.startOffset + i * symbolSize;
      const img = this.scene.add.image(0, y, "reel", frame).setOrigin(0.5);
      // Normalize to exact cell size (128x128)
      img.setDisplaySize(symbolSize, symbolSize);
      this.container.add(img);
      this.symbols.push(img);
    }

    if (this.mask) {
      this.container.setMask(this.mask);
    }
  }

  stripLength() {
    return this.frames.length;
  }

  // Apply the provided bitmap mask to the container
  setMask(mask: Phaser.Display.Masks.BitmapMask | Phaser.Display.Masks.GeometryMask) {
    this.mask = mask;
    this.container.setMask(mask);
  }

  // Parameterized spin used by MainScene to orchestrate staggered spins
  spin(options: { duration: number; delay?: number; spins?: number; ease?: string }): Phaser.Tweens.Tween | undefined {
    if (this.isSpinning) return;
    this.isSpinning = true;

    const { duration, delay = 0, spins = 1, ease = "Cubic.easeInOut" } = options;
    const distance = spins * this.windowHeight;

    return this.scene.tweens.add({
      targets: this.container,
      y: this.y + distance,
      duration,
      delay,
      ease,
      onUpdate: () => this.wrapContainerY(),
      onComplete: () => {
        // Snap back and refresh symbols
        this.container.y = this.y;
        this.isSpinning = false;
      }
    });
  }

  // Spin to a specific frame index so that it lands centered in the window
  spinTo(finalIndex: number, options: { duration: number; delay?: number; spins?: number; ease?: string }): Phaser.Tweens.Tween | undefined {
    if (this.isSpinning) return;
    this.isSpinning = true;

    const { duration, delay = 0, spins = 1, ease = "Cubic.easeInOut" } = options;

    const stripHeight = this.frames.length * this.symbolSize;
    const finalChildY = this.startOffset + finalIndex * this.symbolSize; // position of final symbol relative to container
    const targetY = this.y - finalChildY; // place final symbol at container origin (center of window)

    return this.scene.tweens.add({
      targets: this.container,
      y: targetY - spins * stripHeight,
      duration,
      delay,
      ease,
      onUpdate: () => this.wrapContainerY(),
      onComplete: () => {
        // Snap to the exact target position
        this.container.y = targetY;
        this.isSpinning = false;
      }
    });
  }

  // Convenience: single quick spin
  startSpin() {
    this.spin({ duration: 500, spins: 1 });
  }

  // Keep container y within a looping band so symbols are always present
  private wrapContainerY() {
    const stripHeight = this.frames.length * this.symbolSize;
    if (stripHeight <= 0) return;

    // Keep y within [y - stripHeight, y]
    while (this.container.y < this.y - stripHeight) {
      this.container.y += stripHeight;
    }
    while (this.container.y > this.y) {
      this.container.y -= stripHeight;
    }
  }
}